import { Account } from "@/application/entities/account";
import type { AccountRepository } from "@/infra/database/dynamo/repositories/account-repository";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import type {
  HttpRequest,
  HttpResponse,
  HttpUseCase,
} from "@/shared/types/http";
import z from "zod";

export const signUpSchema = z.object({
  body: z.object({
    account: z.object({
      email: z.email("Invalid"),
      password: z.string().min(8, "Should be at least 8 characters long"),
    }),
  }),
});

export class SignUpUseCase implements HttpUseCase {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly accountRepository: AccountRepository
  ) {}

  async execute(
    input: HttpRequest<SignUpUseCase.Input>
  ): Promise<HttpResponse> {
    const { email, password } = input.body;

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

export namespace SignUpUseCase {
  export type Input = {
    email: string;
    password: string;
  };
}
