import { AppError } from "@/infra/errors/app-error";
import type { MiddyEvent } from "@/shared/types/http";
import type { MiddlewareObj } from "@middy/core";
import * as Sentry from "@sentry/node";
import { ErrorCode } from "../errors/error-code";

export function errorHandle(error: any, request: MiddyEvent) {
  if (!(error instanceof AppError)) {
    console.warn("[Error handler] unhandled error", error);

    Sentry.captureException(error, (scope) => {
      scope.setTag("path", request.rawPath);
      scope.setTag("routeKey", request.routeKey);
      const body = JSON.stringify(request.body, null, 2);
      scope.setContext("Request", { body });
      return scope;
    });
  }

  const statusCode = error instanceof AppError ? error.statusCode : 500;
  const code =
    error instanceof AppError ? error.code : ErrorCode.INTERNAL_SERVER_ERROR;
  const message =
    error instanceof AppError ? error.message : "Internal server error";

  return { statusCode, body: { code, message } };
}

export function errorHandlerMiddleware(): MiddlewareObj<MiddyEvent> {
  return {
    onError: async (event) => {
      const { error, event: request } = event;
      const { body, statusCode } = errorHandle(error, request);

      event.response = event.response ?? {};
      const headers = {
        ...event.response?.headers,
        "Content-Type": "application/json",
      };

      event.response.statusCode = statusCode;
      event.response.body = JSON.stringify(body);
      event.response.headers = headers;
      return event.response;
    },
  };
}
