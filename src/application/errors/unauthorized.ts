import { AppError } from "./app-error";
import { ErrorCode } from "./error-code";

export class Unauthorized extends AppError {
  constructor() {
    super(403, "Unauthorized", ErrorCode.UNAUTHORIZED);
    this.name = "Unauthorized";
  }
}
