import { Meal } from "@/application/entities/meal";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import {
  DeleteCommand,
  GetCommand,
  PutCommand,
  PutCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
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
        PK: MealItem.getPK({ accountId, id: mealId }),
        SK: MealItem.getSK({ accountId, id: mealId }),
      },
    });

    const { Item: mealItem } = await dynamoClient.send(command);

    if (!mealItem) return null;

    return MealItem.toEntity(mealItem as MealItem.ItemType);
  }

  async save(meal: Meal) {
    const mealItem = MealItem.fromEntity(meal).toItem();
    const updateFields = [
      "icon",
      "status",
      "name",
      "foods",
      "attempts",
    ] as (keyof MealItem.ItemType)[];

    const command = new UpdateCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: mealItem.PK,
        SK: mealItem.SK,
      },
      UpdateExpression: `SET ${updateFields.map(
        (field) => `#${field} = :${field}`,
      )}`,
      ExpressionAttributeNames: Object.fromEntries(
        updateFields.map((field) => [`#${field}`, field]),
      ),
      ExpressionAttributeValues: Object.fromEntries(
        updateFields.map((field) => [`:${field}`, mealItem[field]]),
      ),
      ReturnValues: "NONE",
    });

    await dynamoClient.send(command);
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

  async delete({ accountId, mealId }: MealRepository.FindByIdParams) {
    const command = new DeleteCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: MealItem.getPK({ accountId, id: mealId }),
        SK: MealItem.getSK({ accountId, id: mealId }),
      },
    });

    await dynamoClient.send(command);
  }
}

export namespace MealRepository {
  export type FindByIdParams = {
    accountId: string;
    mealId: string;
  };
}
