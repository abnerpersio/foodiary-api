import "reflect-metadata";

import "@/shared/config/sentry";

import type { HttpUseCase } from "@/application/contracts/use-case";
import {
  errorHandle,
  errorHandlerMiddleware,
} from "@/infra/middlewares/error-handler";
import { Registry } from "@/kernel/di/registry";
import { corsConfig } from "@/shared/config/cors";
import type { Constructor } from "@/shared/types/constructor";
import type { JWTClaims, MiddyContext, MiddyEvent } from "@/shared/types/http";
import middy, { type MiddlewareObj } from "@middy/core";
import httpCors from "@middy/http-cors";
import httpJsonBodyParser from "@middy/http-json-body-parser";
import httpResponseSerializer from "@middy/http-response-serializer";

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
    this.middlewares = middlewares || [];
    this.useCase = Registry.getInstance().resolve(useCaseImpl);
  }

  build() {
    return middy()
      .use(errorHandlerMiddleware())
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
      .use(this.middlewares)
      .handler(async (event: MiddyEvent, context: MiddyContext) => {
        try {
          const {
            body,
            queryStringParameters,
            pathParameters,
            requestContext,
          } = event;
          const jwtClaims = requestContext.authorizer?.jwt?.claims as JWTClaims;

          const result = await this.useCase.execute({
            query: queryStringParameters || {},
            params: pathParameters,
            body: body ?? {},
            accountId: jwtClaims?.internalId ?? null,
            internal: context.internal,
          } as HttpUseCase.Request<"private", any>);

          return {
            statusCode: result.status,
            body: prepareResponseBody(result),
          };
        } catch (error) {
          const { body, statusCode } = errorHandle(error, event);
          return { statusCode, body };
        }
      });
  }
}
