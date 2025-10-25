import { signUpSchema, SignUpUseCase } from "@/domain/auth/sign-up-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(signUpSchema)],
  useCase: SignUpUseCase,
}).build();
