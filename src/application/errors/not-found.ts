import { AppError } from "./app-error";
import { ErrorCode } from "./error-code";

export class NotFound extends AppError {
  constructor(entity = "") {
    super(404, `${entity} not found`, ErrorCode.RESOURCE_NOT_FOUND);
    this.name = "NotFound";
  }
}
