import { type HttpUseCase } from "@/application/contracts/use-case";
import { Account } from "@/application/entities/account";
import { AccountRepository } from "@/infra/database/dynamo/repositories/account-repository";
import { EmailAlreadyInUse } from "@/infra/errors/email-already-in-use";
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
  export type Body = z.infer<typeof signUpSchema>["body"];
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
    const { email, password } = request.body.account;

    const alreadyInUse = await this.accountRepository.findByEmail(email);
    if (alreadyInUse) throw new EmailAlreadyInUse();

    const account = new Account({ email });
    const { externalId } = await this.authGateway.signUp({
      internalId: account.id,
      email,
      password,
    });
    account.externalId = externalId;
    await this.accountRepository.create(account);

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
