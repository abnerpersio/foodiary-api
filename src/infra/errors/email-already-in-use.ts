import { AppError } from "./app-error";
import { ErrorCode } from "./error-code";

export class EmailAlreadyInUse extends AppError {
  constructor() {
    super(400, "This email is already in use", ErrorCode.EMAIL_ALREADY_IN_USE);
    this.name = "EmailAlreadyInUse";
  }
}
