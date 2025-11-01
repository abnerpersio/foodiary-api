import { AppError } from "./app-error";
import { ErrorCode } from "./error-code";

export class InvalidRefreshToken extends AppError {
  constructor() {
    super(401, "Invalid refresh token", ErrorCode.INVALID_REFRESH_TOKEN);
    this.name = "InvalidRefreshToken";
  }
}
