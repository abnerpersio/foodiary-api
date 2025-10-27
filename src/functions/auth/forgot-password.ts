import {
  forgotPasswordSchema,
  ForgotPasswordUseCase,
} from "@/domain/auth/forgot-password-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(forgotPasswordSchema)],
  useCase: ForgotPasswordUseCase,
}).build();
