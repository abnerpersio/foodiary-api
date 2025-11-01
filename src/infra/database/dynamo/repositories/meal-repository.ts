import { Meal } from "@/application/entities/meal";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { MealItem } from "../items/meal-item";

@Injectable()
export class MealRepository {
  constructor(private readonly appConfig: AppConfig) {}

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
