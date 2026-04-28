import { Meal } from "@/application/entities/meal";
import { NotFound } from "@/application/errors/not-found";
import { MealsAIGateway } from "@/infra/ai/gateways/meals-ai-gateway";
import { MealRepository } from "@/infra/database/dynamo/repositories/meal-repository";
import { Injectable } from "@/kernel/decorators/injectable";

const MAX_ATTEMPTS = 2;

@Injectable()
export class ProcessMealUseCase {
  constructor(
    private readonly mealRepo: MealRepository,
    private readonly mealsAIGateway: MealsAIGateway,
  ) {}

  async execute({
    accountId,
    mealId,
  }: ProcessMealUseCase.Input): Promise<ProcessMealUseCase.Output> {
    const meal = await this.mealRepo.findById({ accountId, mealId });
    if (!meal) throw new NotFound(`Meal "${mealId}"`);

    if (meal.status === Meal.Status.UPLOADING) {
      throw new Error(`Meal "${mealId}" is uploading`);
    }

    if (meal.status === Meal.Status.PROCESSING) {
      throw new Error(`Meal "${mealId}" is processing`);
    }

    if (meal.status === Meal.Status.SUCCESS) return;

    try {
      meal.status = Meal.Status.PROCESSING;
      meal.attempts += 1;
      await this.mealRepo.save(meal);

      const { icon, name, foods } = await this.mealsAIGateway.processMeal(meal);

      if (!foods.length) {
        meal.status = Meal.Status.FAILED;
        await this.mealRepo.save(meal);
        return;
      }

      meal.foods = foods;
      meal.name = name;
      meal.icon = icon;
      meal.status = Meal.Status.SUCCESS;

      await this.mealRepo.save(meal);
    } catch (error) {
      meal.status =
        meal.attempts >= MAX_ATTEMPTS ? Meal.Status.FAILED : Meal.Status.QUEUED;
      await this.mealRepo.save(meal);
      throw error;
    }
  }
}

export namespace ProcessMealUseCase {
  export type Input = {
    accountId: string;
    mealId: string;
  };

  export type Output = void;
}
