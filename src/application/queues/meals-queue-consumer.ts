import { MealsQueueGateway } from "@/infra/gateways/meals-queue-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import { QueueConsumer } from "../contracts/queue-consumer";
import { ProcessMealUseCase } from "../usecases/meals/process-meal-use-case";

@Injectable()
export class MealsQueueConsumer implements QueueConsumer<MealsQueueGateway.Message> {
  constructor(private readonly processMealUseCase: ProcessMealUseCase) {}

  async process({ accountId, mealId }: MealsQueueGateway.Message) {
    await this.processMealUseCase.execute({ accountId, mealId });
  }
}
