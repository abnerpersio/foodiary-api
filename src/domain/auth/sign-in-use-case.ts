import { type HttpUseCase } from "@/application/contracts/use-case";
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
    const { email, password } = request.body;

    const { accessToken, refreshToken } = await this.authGateway.signIn({
      email,
      password,
    });

    return {
      status: 200,
      data: {
        accessToken,
        refreshToken,
      },
    };
  }
}
