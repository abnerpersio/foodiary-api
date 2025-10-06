import { type HttpUseCase } from "@/application/contracts/use-case";
import { Account } from "@/application/entities/account";
import type { AccountRepository } from "@/infra/database/dynamo/repositories/account-repository";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const signUpSchema = z.object({
  body: z.object({
    account: z.object({
      email: z.email("Invalid"),
      password: z.string().min(8, "Should be at least 8 characters long"),
    }),
  }),
});

export namespace SignUpUseCase {
  export type Body = {
    email: string;
    password: string;
  };
}

@Injectable()
export class SignUpUseCase implements HttpUseCase<"public"> {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly accountRepository: AccountRepository
  ) {}

  async execute(
    request: HttpUseCase.Request<"public", SignUpUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    const { email, password } = request.body;

    const { externalId } = await this.authGateway.signUp({ email, password });

    const account = new Account({ externalId, email });

    const { accessToken, refreshToken } = await this.authGateway.signIn({
      email,
      password,
    });

    return {
      status: 201,
      data: {
        accessToken,
        refreshToken,
      },
    };
  }
}
