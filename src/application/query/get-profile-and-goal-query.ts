import { dynamoClient } from "@/infra/clients/dynamo";
import { AccountItem } from "@/infra/database/dynamo/items/account-item";
import { GoalItem } from "@/infra/database/dynamo/items/goal-item";
import { ProfileItem } from "@/infra/database/dynamo/items/profile-item";
import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { QueryCommand } from "@aws-sdk/lib-dynamodb";
import { Profile } from "../entities/profile";
import { ResourceNotFound } from "../errors/resource-not-found";

@Injectable()
export class GetProfileAndGoalQuery {
  constructor(private readonly appConfig: AppConfig) {}

  async execute({
    accountId,
  }: GetProfileAndGoalQuery.Input): Promise<GetProfileAndGoalQuery.Output> {
    const command = new QueryCommand({
      TableName: this.appConfig.db.dynamodb.mainTable,
      Limit: 2,
      ProjectionExpression:
        "#PK, #SK, #type, #name, #birthDate, #gender, #height, #weight, #calories, #proteins, #carbohydrates, #fats",
      KeyConditionExpression: "#PK = :PK AND BEGINS_WITH(#SK, :SK)",
      ExpressionAttributeNames: {
        "#PK": "PK",
        "#SK": "SK",
        "#type": "type",
        "#name": "name",
        "#birthDate": "birthDate",
        "#gender": "gender",
        "#height": "height",
        "#weight": "weight",
        "#calories": "calories",
        "#proteins": "proteins",
        "#carbohydrates": "carbohydrates",
        "#fats": "fats",
      },
      ExpressionAttributeValues: {
        ":PK": AccountItem.getPK(accountId),
        ":SK": `${AccountItem.getPK(accountId)}#`,
      },
    });

    const { Items = [] } = await dynamoClient.send(command);
    const profile = Items.find(
      (item): item is GetProfileAndGoalQuery.ProfileItemType =>
        item.type === ProfileItem.type
    );
    const goal = Items.find(
      (item): item is GetProfileAndGoalQuery.GoalItemType =>
        item.type === GoalItem.type
    );

    if (!profile || !goal) {
      throw new ResourceNotFound("Account not found");
    }

    return {
      profile: {
        name: profile.name,
        birthDate: profile.birthDate,
        gender: profile.gender,
        height: profile.height,
        weight: profile.weight,
      },
      goal: {
        calories: goal.calories,
        proteins: goal.proteins,
        carbohydrates: goal.carbohydrates,
        fats: goal.fats,
      },
    };
  }
}

export namespace GetProfileAndGoalQuery {
  export type Input = {
    accountId: string;
  };

  export type ProfileItemType = Pick<
    ProfileItem.ItemType,
    "type" | "name" | "birthDate" | "gender" | "height" | "weight"
  >;
  export type GoalItemType = Pick<
    GoalItem.ItemType,
    "type" | "calories" | "proteins" | "carbohydrates" | "fats"
  >;

  export type Output = {
    profile: {
      name: string;
      birthDate: string;
      gender: Profile.Gender;
      height: number;
      weight: number;
    };
    goal: {
      calories: number;
      proteins: number;
      carbohydrates: number;
      fats: number;
    };
  };
}
