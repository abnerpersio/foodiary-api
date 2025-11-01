import { type HttpUseCase } from "@/application/contracts/use-case";

import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.email("Invalid"),
  }),
});

export namespace ForgotPasswordUseCase {
  export type Body = z.infer<typeof forgotPasswordSchema>["body"];
}

@Injectable()
export class ForgotPasswordUseCase implements HttpUseCase<"public"> {
  constructor(private readonly authGateway: AuthGateway) {}

  async execute(
    request: HttpUseCase.Request<"public", ForgotPasswordUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    try {
      const { email } = request.body;

      await this.authGateway.forgotPassword({ email });
    } catch {}

    return { status: 204 };
  }
}
