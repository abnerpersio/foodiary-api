import type { Goal } from "@/application/entities/goal";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { GoalItem } from "../items/goal-item";

@Injectable()
export class GoalRepository {
  constructor(private readonly appConfig: AppConfig) {}

  getPutCommandInput(profile: Goal): PutCommandInput {
    const item = GoalItem.fromEntity(profile);

    return {
      TableName: this.appConfig.db.dynamodb.mainTable,
      Item: item.toItem(),
    };
  }

  async create(goal: Goal) {
    await dynamoClient.send(new PutCommand(this.getPutCommandInput(goal)));
  }
}
