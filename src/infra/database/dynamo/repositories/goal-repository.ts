import type { Goal } from "@/application/entities/goal";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import {
  GetCommand,
  PutCommand,
  PutCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { GoalItem } from "../items/goal-item";

@Injectable()
export class GoalRepository {
  constructor(private readonly appConfig: AppConfig) {}

  async findByAccountId(accountId: string): Promise<Goal | null> {
    const command = new GetCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: GoalItem.getPK(accountId),
        SK: GoalItem.getSK(accountId),
      },
    });

    const { Item: goalItem } = await dynamoClient.send(command);

    if (!goalItem) return null;

    return GoalItem.toEntity(goalItem as GoalItem.ItemType);
  }

  async save(goal: Goal) {
    const goalItem = GoalItem.fromEntity(goal).toItem();
    const updateFields = [
      "calories",
      "proteins",
      "carbohydrates",
      "fats",
    ] as (keyof GoalItem.ItemType)[];

    const command = new UpdateCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: goalItem.PK,
        SK: goalItem.SK,
      },
      UpdateExpression: `SET ${updateFields.map(
        (field) => `#${field} = :${field}`
      )}`,
      ExpressionAttributeNames: Object.fromEntries(
        updateFields.map((field) => [`#${field}`, field])
      ),
      ExpressionAttributeValues: Object.fromEntries(
        updateFields.map((field) => [`:${field}`, goalItem[field]])
      ),
      ReturnValues: "NONE",
    });

    await dynamoClient.send(command);
  }

  getPutCommandInput(goal: Goal): PutCommandInput {
    const item = GoalItem.fromEntity(goal);

    return {
      TableName: this.appConfig.db.dynamodb.mainTable,
      Item: item.toItem(),
    };
  }

  async create(goal: Goal) {
    await dynamoClient.send(new PutCommand(this.getPutCommandInput(goal)));
  }
}
