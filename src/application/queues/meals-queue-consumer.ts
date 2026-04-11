import { MealRepository } from "@/infra/database/dynamo/repositories/meal-repository";
import { MealsQueueGateway } from "@/infra/gateways/meals-queue-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import { QueueConsumer } from "../contracts/queue-consumer";
import { Meal } from "../entities/meal";
import { NotFound } from "../errors/not-found";

const MAX_ATTEMPTS = 2;

@Injectable()
export class MealsQueueConsumer implements QueueConsumer<MealsQueueGateway.Message> {
  constructor(private readonly mealRepo: MealRepository) {}

  async process({ accountId, mealId }: MealsQueueGateway.Message) {
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

      //
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
