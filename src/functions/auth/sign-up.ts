import { signUpSchema, SignUpUseCase } from "@/domain/auth/sign-up-use-case";
import { httpAdapt } from "@/infra/adapters/http";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { validator } from "@/infra/middlewares/validator";

export const handler = httpAdapt(
  { method: "POST", route: "/sign-up" },
  validator(signUpSchema),
  new SignUpUseCase(new AuthGateway())
);
