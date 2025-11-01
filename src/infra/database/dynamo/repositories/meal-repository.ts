import { Meal } from "@/application/entities/meal";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { GetCommand, PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { MealItem } from "../items/meal-item";

@Injectable()
export class MealRepository {
  constructor(private readonly appConfig: AppConfig) {}

  async findById({
    accountId,
    mealId,
  }: MealRepository.FindByIdParams): Promise<Meal | null> {
    const command = new GetCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: MealItem.getPK({ accountId, mealId }),
        SK: MealItem.getSK({ accountId, mealId }),
      },
    });

    const { Item: mealItem } = await dynamoClient.send(command);

    if (!mealItem) return null;

    return MealItem.toEntity(mealItem as MealItem.ItemType);
  }

  getPutCommandInput(meal: Meal): PutCommandInput {
    const item = MealItem.fromEntity(meal);

    return {
      TableName: this.appConfig.db.dynamodb.mainTable,
      Item: item.toItem(),
    };
  }

  async create(meal: Meal) {
    await dynamoClient.send(new PutCommand(this.getPutCommandInput(meal)));
  }
}

export namespace MealRepository {
  export type FindByIdParams = {
    accountId: string;
    mealId: string;
  };
}
