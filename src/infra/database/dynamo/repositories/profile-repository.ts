import { Profile } from "@/application/entities/profile";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import {
  GetCommand,
  PutCommand,
  PutCommandInput,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";
import { ProfileItem } from "../items/profile-item";

@Injectable()
export class ProfileRepository {
  constructor(private readonly appConfig: AppConfig) {}

  async findByAccountId(accountId: string): Promise<Profile | null> {
    const command = new GetCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: ProfileItem.getPK(accountId),
        SK: ProfileItem.getSK(accountId),
      },
    });

    const { Item: profileItem } = await dynamoClient.send(command);

    if (!profileItem) return null;

    return ProfileItem.toEntity(profileItem as ProfileItem.ItemType);
  }

  async save(profile: Profile) {
    const profileItem = ProfileItem.fromEntity(profile).toItem();
    const updateFields = [
      "name",
      "birthDate",
      "gender",
      "height",
      "weight",
    ] as (keyof ProfileItem.ItemType)[];

    const command = new UpdateCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Key: {
        PK: profileItem.PK,
        SK: profileItem.SK,
      },
      UpdateExpression: `SET ${updateFields.map(
        (field) => `#${field} = :${field}`
      )}`,
      ExpressionAttributeNames: Object.fromEntries(
        updateFields.map((field) => [`#${field}`, field])
      ),
      ExpressionAttributeValues: Object.fromEntries(
        updateFields.map((field) => [`:${field}`, profileItem[field]])
      ),
      ReturnValues: 'NONE'
    });

    await dynamoClient.send(command);
  }

  getPutCommandInput(profile: Profile): PutCommandInput {
    const item = ProfileItem.fromEntity(profile);

    return {
      TableName: this.appConfig.db.dynamodb.mainTable,
      Item: item.toItem(),
    };
  }

  async create(profile: Profile) {
    await dynamoClient.send(new PutCommand(this.getPutCommandInput(profile)));
  }
}
