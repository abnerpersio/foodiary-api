import { Profile } from "@/application/entities/profile";
import { dynamoClient } from "@/infra/clients/dynamo";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { PutCommand, PutCommandInput } from "@aws-sdk/lib-dynamodb";
import { ProfileItem } from "../items/profile-item";

@Injectable()
export class ProfileRepository {
  constructor(private readonly appConfig: AppConfig) {}

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
