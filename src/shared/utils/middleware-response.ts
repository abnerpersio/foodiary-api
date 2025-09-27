import type { MiddyEvent } from "@/shared/types/http";
import type { Request } from "@middy/core";

export function middlewareResponse(
  request: Request<MiddyEvent>,
  statusCode: number,
  body?: Record<string, unknown>
) {
  request.response = request.response ?? {};
  const headers = {
    ...request.response?.headers,
    "Content-Type": "application/json",
  };
  request.response.statusCode = statusCode;
  request.response.body = JSON.stringify(body || {});
  request.response.headers = headers;
  return request.response;
}
