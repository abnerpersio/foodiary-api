import { ErrorCode } from "./error-code";

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message?: string,
    public readonly code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR
  ) {
    super(message || "Http error");
    this.name = "HttpError";
  }
}
