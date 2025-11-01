import { type HttpUseCase } from "@/application/contracts/use-case";
import { Account } from "@/application/entities/account";
import { Goal } from "@/application/entities/goal";
import { Profile } from "@/application/entities/profile";
import { EmailAlreadyInUse } from "@/application/errors/email-already-in-use";
import { GoalCalculator } from "@/application/services/goal-calculator";
import { AccountRepository } from "@/infra/database/dynamo/repositories/account-repository";
import { SignUpUnitOfWork } from "@/infra/database/dynamo/uow/sign-up-unit-of-work";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import { Saga } from "@/shared/saga/saga";
import z from "zod";

export const signUpSchema = z.object({
  body: z.object({
    account: z.object({
      email: z.email("Invalid"),
      password: z.string().min(8, "Should be at least 8 characters long"),
    }),
    profile: z.object({
      name: z.string().min(1, "Required"),
      birthDate: z.iso.date().transform((date) => new Date(date)),
      height: z.number(),
      weight: z.number(),
      gender: z.enum(Profile.Gender),
      activityLevel: z.enum(Profile.ActivityLevel),
      goal: z.enum(Profile.Goal),
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
    private readonly accountRepository: AccountRepository,
    private readonly signUpUow: SignUpUnitOfWork,
    private readonly saga: Saga
  ) {}

  async execute(
    request: HttpUseCase.Request<"public", SignUpUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    const {
      account: { email, password },
      profile: profileInfo,
    } = request.body;

    const alreadyInUse = await this.accountRepository.findByEmail(email);
    if (alreadyInUse) throw new EmailAlreadyInUse();

    const account = new Account({ email });
    const profile = new Profile({ ...profileInfo, accountId: account.id });
    const goal = new Goal({
      ...GoalCalculator.calculate(profile),
      accountId: account.id,
    });

    const { externalId } = await this.authGateway.signUp({
      internalId: account.id,
      email,
      password,
    });
    account.externalId = externalId;

    this.saga.addCompensation(() =>
      this.authGateway.deleteUser({ externalId })
    );

    return this.saga.run(async () => {
      await this.signUpUow.run({ account, goal, profile });

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
    });
  }
}
