import "reflect-metadata";

import { signUpSchema, SignUpUseCase } from "@/domain/auth/sign-up-use-case";
import { httpAdapt } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = httpAdapt(
  { method: "POST", route: "/sign-up" },
  validator(signUpSchema),
  SignUpUseCase
);
