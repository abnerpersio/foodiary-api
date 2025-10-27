import {
  resetPasswordSchema,
  ResetPasswordUseCase,
} from "@/domain/auth/reset-password-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(resetPasswordSchema)],
  useCase: ResetPasswordUseCase,
}).build();
