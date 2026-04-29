import { HttpUseCase } from "@/application/contracts/use-case";
import { Goal } from "@/application/entities/goal";
import { Profile } from "@/application/entities/profile";
import { GoalCalculator } from "@/application/services/goal-calculator";
import { CreateProfileUnitOfWork } from "@/infra/database/dynamo/uow/create-profile-unit-of-work";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const createProfileSchema = z.object({
  body: z.object({
    name: z.string().min(1, "Required"),
    birthDate: z.iso.date().transform((date) => new Date(date)),
    height: z.number(),
    weight: z.number(),
    gender: z.enum(Profile.Gender),
    activityLevel: z.enum(Profile.ActivityLevel),
    goal: z.enum(Profile.Goal),
  }),
});

export namespace CreateProfileUseCase {
  export type Body = z.infer<typeof createProfileSchema>["body"];
}

@Injectable()
export class CreateProfileUseCase implements HttpUseCase<"private"> {
  constructor(private readonly createProfileUow: CreateProfileUnitOfWork) {}

  async execute(
    request: HttpUseCase.Request<"private", CreateProfileUseCase.Body>,
  ): Promise<HttpUseCase.Response> {
    const { accountId, body } = request;

    const profile = new Profile({ ...body, accountId });
    const goal = new Goal({ ...GoalCalculator.calculate(profile), accountId });

    await this.createProfileUow.run({ goal, profile });

    return { status: 204 };
  }
}
