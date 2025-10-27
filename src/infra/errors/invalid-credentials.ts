import { AppError } from "./app-error";
import { ErrorCode } from "./error-code";

export class InvalidCredentials extends AppError {
  constructor() {
    super(401, "Invalid credentials", ErrorCode.INVALID_CREDENTIALS);
    this.name = "InvalidCredentials";
  }
}
