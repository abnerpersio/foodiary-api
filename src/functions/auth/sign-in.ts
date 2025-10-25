import { signInSchema, SignInUseCase } from "@/domain/auth/sign-in-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(signInSchema)],
  useCase: SignInUseCase,
}).build();
