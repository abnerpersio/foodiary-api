import "@/config/sentry";

import { corsConfig } from "@/config/cors";
import { errorHandler } from "@/infra/middlewares/error-handler";
import type { HandlerWithMetadata, HttpMetadata } from "@/shared/types/http";
import middy from "@middy/core";
import httpCors from "@middy/http-cors";
import httpRouterHandler, { type Route } from "@middy/http-router";
import type {
  APIGatewayProxyEventV2,
  APIGatewayProxyResultV2,
} from "aws-lambda";

const optionsHandler: Route<APIGatewayProxyEventV2, APIGatewayProxyResultV2> = {
  method: "OPTIONS",
  path: "/{proxy+}",
  handler: async (
    event: APIGatewayProxyEventV2
  ): Promise<APIGatewayProxyResultV2> => {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": event.headers.origin as string,
        "Access-Control-Allow-Methods": corsConfig.methods,
        "Access-Control-Allow-Headers": corsConfig.headers,
      },
    };
  },
};

export function routesAdapt(metadata: HttpMetadata, routes: Route<any, any>[]) {
  const handler = middy()
    .use(errorHandler())
    .use(
      httpCors({
        // origins: corsConfig.origins,
        origins: ["*"],
        headers: corsConfig.headers,
        requestMethods: corsConfig.methods,
      })
    )
    .handler(httpRouterHandler([optionsHandler as Route<any, any>, ...routes]));

  (handler as HandlerWithMetadata).metadata = metadata;
  return handler;
}
