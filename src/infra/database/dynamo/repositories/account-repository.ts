import type { Account } from "@/application/entities/account";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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

  getPutCommandInput(account: Account) {
    const item = AccountItem.fromEntity(account);

    return {
      TableName: this.appConfig.db.dynamodb.mainTable,
      Item: item.toItem(),
    };
  }

  async create(account: Account) {
    await dynamoClient.send(new PutCommand(this.getPutCommandInput(account)));
  }

  async findById(id: string): Promise<Account | null> {
    const command = new GetCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: AccountItem.getPK(id),
        SK: AccountItem.getSK(id),
      },
    });

    const { Item } = await dynamoClient.send(command);
    if (!Item) return null;

    return AccountItem.toEntity(Item as AccountItem.ItemType);
  }

  async save(account: Account): Promise<void> {
    const command = new UpdateCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: AccountItem.getPK(account.id),
        SK: AccountItem.getSK(account.id),
      },
      UpdateExpression: "SET profileImage = :profileImage",
      ExpressionAttributeValues: {
        ":profileImage": account.profileImage,
      },
    });

    await dynamoClient.send(command);
  }
}
