import { type HttpUseCase } from "@/application/contracts/use-case";
import { Meal } from "@/application/entities/meal";
import { ResourceNotFound } from "@/application/errors/resource-not-found";
import { MealRepository } from "@/infra/database/dynamo/repositories/meal-repository";
import { MealsFileStorageGateway } from "@/infra/gateways/meals-file-storage-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";

export namespace GetMealUseCase {
  export type Params = {
    mealId: string;
  };

  export type Output = {
    id: string;
    status: Meal.Status;
    inputType: Meal.InputType;
    inputFileUrl: string;
    name: string;
    icon: string;
    foods: Meal.Food[];
    createdAt: string;
  };
}

@Injectable()
export class GetMealUseCase implements HttpUseCase<"private"> {
  constructor(
    private readonly mealsFileStorageGateway: MealsFileStorageGateway,
    private readonly mealRepository: MealRepository,
  ) {}

  async execute(
    request: HttpUseCase.Request<"private", undefined, GetMealUseCase.Params>,
  ): Promise<HttpUseCase.Response<GetMealUseCase.Output>> {
    const { accountId } = request;
    const { mealId } = request.params;

    const meal = await this.mealRepository.findById({ accountId, mealId });
    if (!meal) throw new ResourceNotFound("Meal not found");

    return {
      status: 200,
      data: {
        id: meal.id,
        status: meal.status,
        inputType: meal.inputType,
        inputFileUrl: this.mealsFileStorageGateway.getFileURL(
          meal.inputFileKey,
        ),
        foods: meal.foods,
        icon: meal.icon,
        name: meal.name,
        createdAt: meal.createdAt.toISOString(),
      },
    };
  }
}
