import { dynamoClient } from "@/infra/clients/dynamo";
import { MealItem } from "@/infra/database/dynamo/items/meal-item";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Meal } from "../entities/meal";

@Injectable()
export class ListMealsByDateQuery {
  constructor(private readonly appConfig: AppConfig) {}

  async execute({
    accountId,
    date,
  }: ListMealsByDateQuery.Input): Promise<ListMealsByDateQuery.Output> {
    const command = new QueryCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      IndexName: "GSI1",
      ProjectionExpression: "#GSI1PK, #type, #createdAt, #name, #icon, #foods",
      KeyConditionExpression: "#GSI1PK = :GSI1PK",
      FilterExpression: "#status = :status",
      ScanIndexForward: false,
      ExpressionAttributeNames: {
        "#GSI1PK": "GSI1PK",
        "#type": "type",
        "#createdAt": "createdAt",
        "#name": "name",
        "#icon": "icon",
        "#foods": "foods",
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":GSI1PK": MealItem.getGSI1PK({
          accountId,
          createdAt: date,
        }),
        ":status": Meal.Status.SUCCESS,
      },
    });

    const { Items = [] } = await dynamoClient.send(command);
    const items = Items as ListMealsByDateQuery.MealItemType[];

    return {
      meals: items.map((item) => ({
        id: item.id,
        foods: item.foods,
        name: item.name,
        icon: item.icon,
        createdAt: item.createdAt,
      })),
    };
  }
}

export namespace ListMealsByDateQuery {
  export type Input = {
    accountId: string;
    date: Date;
  };

  export type MealItemType = Pick<
    MealItem.ItemType,
    "GSI1PK" | "type" | "id" | "createdAt" | "name" | "icon" | "foods"
  >;

  export type Output = {
    meals: {
      id: string;
      createdAt: string;
      name: string;
      icon: string;
      foods: Meal.Food[];
    }[];
  };
}
