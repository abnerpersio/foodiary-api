import type { Account } from "@/application/entities/account";
import { Env } from "@/config/env";
import { dynamoClient } from "@/infra/clients/dynamo";
import { PutCommand } from "@aws-sdk/lib-dynamodb";

export class AccountRepository {
  async create(account: Account) {
    const command = new PutCommand({
      TableName: Env.mainTableName,
      Item: {},
    });

    await dynamoClient.send(command);
  }
}
