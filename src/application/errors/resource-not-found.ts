import { AppError } from "./app-error";
import { ErrorCode } from "./error-code";

export class ResourceNotFound extends AppError {
  constructor(message?: string) {
    super(404, message ?? "Resource not found", ErrorCode.RESOURCE_NOT_FOUND);
    this.name = "ResourceNotFound";
  }
}
