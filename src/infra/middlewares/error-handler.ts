import { HttpError } from "@/infra/errors/http-error";
import type { MiddyEvent } from "@/shared/types/http";
import type { MiddlewareObj } from "@middy/core";
import * as Sentry from "@sentry/node";

export function errorHandler(): MiddlewareObj<MiddyEvent> {
  return {
    onError: async (event) => {
      const { error, event: request } = event;

      if (!(error instanceof HttpError)) {
        console.warn("[Error handler] unhandled error", error);

        Sentry.captureException(error, (scope) => {
          scope.setTag("path", request.rawPath);
          scope.setTag("routeKey", request.routeKey);
          const body = JSON.stringify(request.body, null, 2);
          scope.setContext("Request", { body });
          return scope;
        });
      }

      event.response = event.response ?? {};
      const headers = {
        ...event.response?.headers,
        "Content-Type": "application/json",
      };
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      const message =
        error instanceof HttpError ? error.message : "Internal server error";

      event.response.statusCode = statusCode;
      event.response.body = JSON.stringify({ message });
      event.response.headers = headers;
      return event.response;
    },
  };
}
