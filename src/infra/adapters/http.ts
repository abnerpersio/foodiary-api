import "reflect-metadata";

import "@/shared/config/sentry";

import type { HttpUseCase } from "@/application/contracts/use-case";
import { errorHandler } from "@/infra/middlewares/error-handler";
import { Registry } from "@/kernel/di/registry";
import { corsConfig } from "@/shared/config/cors";
import type { Constructor } from "@/shared/types/constructor";
import type { MiddyContext, MiddyEvent } from "@/shared/types/http";
import middy, { type MiddlewareObj } from "@middy/core";
import httpCors from "@middy/http-cors";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpResponseSerializer from "@middy/http-response-serializer";
import * as Sentry from "@sentry/node";
import { AppError } from "../errors/app-error";

function prepareResponseBody(result: HttpUseCase.Response) {
  if (!result.data && !result.message) return undefined;

  if (result.message) {
    return { message: result.message };
  }

  return { ...result.data };
}

type Middleware = MiddlewareObj<MiddyEvent>;

type HttpAdapterParams = {
  middlewares?: Middleware[];
  useCase: Constructor<HttpUseCase<any>>;
};

export class HttpAdapter {
  private readonly middlewares: Middleware[];
  private readonly useCase: HttpUseCase<any>;

  constructor({ middlewares = [], useCase: useCaseImpl }: HttpAdapterParams) {
    this.middlewares = middlewares;
    this.useCase = Registry.getInstance().resolve(useCaseImpl);
  }

  adapt() {
    return middy()
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
      .use([...this.middlewares])
      .handler(async (event: MiddyEvent, context: MiddyContext) => {
        try {
          const {
            body,
            queryStringParameters,
            pathParameters,
            requestContext,
          } = event;
          const userId =
            (requestContext.authorizer?.jwt?.claims?.username as
              | string
              | null) ?? null;

          const result = await this.useCase.execute({
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
          if (!(error instanceof AppError)) {
            console.warn("[Error handler] unhandled error", error);

            Sentry.captureException(error, (scope) => {
              scope.setTag("path", event.rawPath);
              scope.setTag("routeKey", event.routeKey);
              const body = JSON.stringify(event.body, null, 2);
              scope.setContext("Request", { body });
              return scope;
            });
          }

          const statusCode = error instanceof AppError ? error.statusCode : 500;
          const message =
            error instanceof AppError ? error.message : "Internal server error";

          return {
            statusCode,
            body: { message },
          };
        }
      });
  }
}
