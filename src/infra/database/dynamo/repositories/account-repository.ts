import type { Account } from "@/application/entities/account";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { AccountItem } from "../items/account-item";

@Injectable()
export class AccountRepository {
  constructor(private readonly appConfig: AppConfig) {}

  async findByEmail(email: string): Promise<Account | null> {
    const command = new QueryCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      IndexName: "GSI1",
      Limit: 1,
      KeyConditionExpression: "#GSI1PK = :GSI1PK AND #GSI1SK = :GSI1SK",
      ExpressionAttributeNames: {
        "#GSI1PK": "GSI1PK",
        "#GSI1SK": "GSI1SK",
      },
      ExpressionAttributeValues: {
        ":GSI1PK": AccountItem.getGSI1PK(email),
        ":GSI1SK": AccountItem.getGSI1SK(email),
      },
    });

    const { Items = [] } = await dynamoClient.send(command);
    const account = Items[0] as AccountItem.ItemType;
    if (!account) return null;

    return AccountItem.toEntity(account);
  }

  async create(account: Account) {
    const item = AccountItem.fromEntity(account);

    const command = new PutCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Item: item.toItem(),
    });

    await dynamoClient.send(command);
  }
}
