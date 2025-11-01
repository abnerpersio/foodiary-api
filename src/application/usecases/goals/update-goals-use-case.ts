import { HttpUseCase } from "@/application/contracts/use-case";
import { Profile } from "@/application/entities/profile";
import { ResourceNotFound } from "@/application/errors/resource-not-found";
import { GoalRepository } from "@/infra/database/dynamo/repositories/goal-repository";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const updateGoalSchema = z.object({
  body: z.object({
    calories: z.number().min(1, "Should be at least 1"),
    proteins: z.number().min(1, "Should be at least 1"),
    carbohydrates: z.number().min(1, "Should be at least 1"),
    fats: z.number().min(1, "Should be at least 1"),
  }),
});

export namespace UpdateGoalsUseCase {
  export type Body = z.infer<typeof updateGoalSchema>["body"];
}

@Injectable()
export class UpdateGoalsUseCase implements HttpUseCase<"private"> {
  constructor(private readonly goalRepository: GoalRepository) {}

  async execute(
    request: HttpUseCase.Request<"private", UpdateGoalsUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    const { accountId } = request;

    const goal = await this.goalRepository.findByAccountId(accountId);
    if (!goal) throw new ResourceNotFound("Goal not found");

    goal.calories = request.body.calories;
    goal.proteins = request.body.proteins;
    goal.carbohydrates = request.body.carbohydrates;
    goal.fats = request.body.fats;

    await this.goalRepository.save(goal);

    return { status: 204 };
  }
}
