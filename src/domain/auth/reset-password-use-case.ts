import { type HttpUseCase } from "@/application/contracts/use-case";
import { InvalidResetPassword } from "@/infra/errors/invalid-reset-password";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.email("Invalid"),
    code: z.string().min(1, "Required"),
    password: z.string().min(8, "Should be at least 8 characters long"),
  }),
});

export namespace ResetPasswordUseCase {
  export type Body = z.infer<typeof resetPasswordSchema>["body"];
}

@Injectable()
export class ResetPasswordUseCase implements HttpUseCase<"public"> {
  constructor(private readonly authGateway: AuthGateway) {}

  async execute(
    request: HttpUseCase.Request<"public", ResetPasswordUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    try {
      const { email, code, password } = request.body;

      await this.authGateway.resetPassword({ email, code, password });

      return { status: 204 };
    } catch {
      throw new InvalidResetPassword();
    }
  }
}
