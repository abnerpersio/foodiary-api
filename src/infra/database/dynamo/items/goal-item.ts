import { Goal } from "@/application/entities/goal";
import { AccountItem } from "./account-item";

export class GoalItem {
  static readonly type = "Goal";
  private readonly keys: GoalItem.Keys;

  constructor(private readonly attrs: GoalItem.Attributes) {
    this.keys = {
      PK: GoalItem.getPK(this.attrs),
      SK: GoalItem.getSK(this.attrs),
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
      ...profileItem,
      createdAt: new Date(profileItem.createdAt),
    });
  }

  static getPK(
    attrs: Pick<GoalItem.Attributes, "accountId">,
  ): GoalItem.Keys["PK"] {
    return `ACCOUNT#${attrs.accountId}`;
  }

  static getSK(
    attrs: Pick<GoalItem.Attributes, "accountId">,
  ): GoalItem.Keys["SK"] {
    return `ACCOUNT#${attrs.accountId}#GOAL`;
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
