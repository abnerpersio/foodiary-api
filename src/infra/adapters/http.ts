import "@/config/sentry";

import { corsConfig } from "@/config/cors";
import { errorHandler } from "@/infra/middlewares/error-handler";
import type {
  HandlerWithMetadata,
  HttpMetadata,
  HttpResponse,
  HttpUseCase,
  MiddyContext,
  MiddyEvent,
} from "@/types/http";
import middy, { type MiddlewareObj } from "@middy/core";
import httpCors from "@middy/http-cors";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpResponseSerializer from "@middy/http-response-serializer";
import * as Sentry from "@sentry/node";
import { HttpError } from "../errors/http-error";

function prepareResponseBody(result: HttpResponse) {
  if (!result.data && !result.message) return undefined;

  if (result.message) {
    return { message: result.message };
  }

  return { ...result.data };
}

type Middleware = MiddlewareObj<MiddyEvent>;

export function httpAdapt(
  metadata: HttpMetadata,
  ...params: [...Middleware[], HttpUseCase]
) {
  const middlewares = params.slice(0, -1) as Middleware[];
  const useCase = params[params.length - 1] as HttpUseCase;

  const handler = middy()
    .use(errorHandler())
    .use(httpJsonBodyParser({ disableContentTypeError: true }))
    .use(
      httpResponseSerializer({
        defaultContentType: "application/json",
        serializers: [
          {
            regex: /^application\/json$/,
            serializer: ({ body }) => JSON.stringify(body),
          },
        ],
      })
    )
    .use(
      httpCors({
        origins: corsConfig.origins,
        headers: corsConfig.headers,
        requestMethods: corsConfig.methods,
      })
    )
    .use([...middlewares])
    .handler(async (event: MiddyEvent, context: MiddyContext) => {
      try {
        const { body, queryStringParameters, pathParameters, requestContext } =
          event;
        const userId =
          (requestContext.authorizer?.jwt?.claims?.username as string | null) ??
          null;

        const result = await useCase.execute({
          query: queryStringParameters || {},
          params: pathParameters,
          body: body ?? {},
          userId,
          internal: context.internal,
        } as any);

        return {
          statusCode: result.status,
          body: prepareResponseBody(result),
        };
      } catch (error) {
        if (!(error instanceof HttpError)) {
          console.warn("[Error handler] unhandled error", error);

          Sentry.captureException(error, (scope) => {
            scope.setTag("path", event.rawPath);
            scope.setTag("routeKey", event.routeKey);
            const body = JSON.stringify(event.body, null, 2);
            scope.setContext("Request", { body });
            return scope;
          });
        }

        const statusCode = error instanceof HttpError ? error.statusCode : 500;
        const message =
          error instanceof HttpError ? error.message : "Internal server error";

        return {
          statusCode,
          body: { message },
        };
      }
    });

  (handler as HandlerWithMetadata).metadata = metadata;
  return handler;
}
