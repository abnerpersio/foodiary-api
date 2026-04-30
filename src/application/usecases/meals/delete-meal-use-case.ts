import { type HttpUseCase } from "@/application/contracts/use-case";
import { ResourceNotFound } from "@/application/errors/resource-not-found";
import { MealRepository } from "@/infra/database/dynamo/repositories/meal-repository";
import { Injectable } from "@/kernel/decorators/injectable";

export namespace DeleteMealUseCase {
  export type Params = {
    mealId: string;
  };
}

@Injectable()
export class DeleteMealUseCase implements HttpUseCase<"private"> {
  constructor(private readonly mealRepository: MealRepository) {}

  async execute(
    request: HttpUseCase.Request<"private", undefined, DeleteMealUseCase.Params>,
  ): Promise<HttpUseCase.Response> {
    const { accountId } = request;
    const { mealId } = request.params;

    const meal = await this.mealRepository.findById({ accountId, mealId });
    if (!meal) throw new ResourceNotFound("Meal not found");

    await this.mealRepository.delete({ accountId, mealId });

    return { status: 204 };
  }
}
