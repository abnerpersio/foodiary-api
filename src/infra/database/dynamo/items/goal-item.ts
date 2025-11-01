import { Goal } from "@/application/entities/goal";
import { AccountItem } from "./account-item";

export class GoalItem {
  static readonly type = "Goal";
  private readonly keys: GoalItem.Keys;

  constructor(private readonly attrs: GoalItem.Attributes) {
    this.keys = {
      PK: GoalItem.getPK(this.attrs.accountId),
      SK: GoalItem.getSK(this.attrs.accountId),
    };
  }

  toItem(): GoalItem.ItemType {
    return {
      type: GoalItem.type,
      ...this.keys,
      ...this.attrs,
    };
  }

  static fromEntity(goal: Goal) {
    return new GoalItem({
      ...goal,
      createdAt: goal.createdAt.toISOString(),
    });
  }

  static toEntity(profileItem: GoalItem.ItemType) {
    return new Goal({
      accountId: profileItem.accountId,
      calories: profileItem.calories,
      proteins: profileItem.proteins,
      carbohydrates: profileItem.carbohydrates,
      fats: profileItem.fats,
      createdAt: new Date(profileItem.createdAt),
    });
  }

  static getPK(accountId: string): GoalItem.Keys["PK"] {
    return `ACCOUNT#${accountId}`;
  }

  static getSK(accountId: string): GoalItem.Keys["SK"] {
    return `ACCOUNT#${accountId}#GOAL`;
  }
}

export namespace GoalItem {
  export type Keys = {
    PK: AccountItem.Keys["PK"];
    SK: `ACCOUNT#${string}#GOAL`;
  };

  export type Attributes = {
    accountId: string;
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
    createdAt: string;
  };

  export type ItemType = Keys & Attributes & { type: "Goal" };
}
