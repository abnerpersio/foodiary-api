import { type HttpUseCase } from "@/application/contracts/use-case";
import { AppError } from "@/application/errors/app-error";
import { InvalidCredentials } from "@/application/errors/invalid-credentials";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const signInSchema = z.object({
  body: z.object({
    email: z.email("Invalid"),
    password: z.string().min(8, "Should be at least 8 characters long"),
  }),
});

export namespace SignInUseCase {
  export type Body = z.infer<typeof signInSchema>["body"];
}

@Injectable()
export class SignInUseCase implements HttpUseCase<"public"> {
  constructor(private readonly authGateway: AuthGateway) {}

  async execute(
    request: HttpUseCase.Request<"public", SignInUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    try {
      const { email, password } = request.body;

      const result = await this.authGateway.signIn({
        email,
        password,
      });

      return {
        status: 200,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      };
    } catch {
      throw new InvalidCredentials();
    }
  }
}
