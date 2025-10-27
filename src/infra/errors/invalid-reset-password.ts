import { AppError } from "./app-error";
import { ErrorCode } from "./error-code";

export class InvalidResetPassword extends AppError {
  constructor() {
    super(400, "Invalid reset password", ErrorCode.INVALID_RESET_PASSWORD);
    this.name = "InvalidResetPassword";
  }
}
