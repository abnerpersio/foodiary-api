import type { Account } from "@/application/entities/account";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import type { AppConfig } from "@/shared/config/app-config";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

@Injectable()
export class AccountRepository {
  constructor(private readonly appConfig: AppConfig) {}

  async create(account: Account) {
    const command = new PutCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Item: {},
    });

    await dynamoClient.send(command);
  }
}
