import { Meal } from "@/application/entities/meal";

export class MealItem {
  static readonly type = "Meal";
  private readonly keys: MealItem.Keys;

  constructor(private readonly attrs: MealItem.Attributes) {
    this.keys = {
      PK: MealItem.getPK(this.attrs.id),
      SK: MealItem.getSK(this.attrs.id),
      GSI1PK: MealItem.getGSI1PK({
        accountId: this.attrs.accountId,
        createdAt: new Date(this.attrs.createdAt),
      }),
      GSI1SK: MealItem.getGSI1SK(this.attrs.id),
    };
  }

  toItem(): MealItem.ItemType {
    return {
      type: MealItem.type,
      ...this.keys,
      ...this.attrs,
    };
  }

  static fromEntity(meal: Meal) {
    return new MealItem({
      ...meal,
      createdAt: meal.createdAt.toISOString(),
    });
  }

  static toEntity(mealItem: MealItem.ItemType) {
    return new Meal({
      id: mealItem.id,
      accountId: mealItem.accountId,
      status: mealItem.status,
      name: mealItem.name,
      attempts: mealItem.attempts,
      inputType: mealItem.inputType,
      inputFileKey: mealItem.inputFileKey,
      foods: mealItem.foods,
      createdAt: new Date(mealItem.createdAt),
    });
  }

  static getPK(mealId: string): MealItem.Keys["PK"] {
    return `MEAL#${mealId}`;
  }

  static getSK(mealId: string): MealItem.Keys["SK"] {
    return `MEAL#${mealId}`;
  }

  static getGSI1PK({
    accountId,
    createdAt,
  }: MealItem.GSI1PKParams): MealItem.Keys["GSI1PK"] {
    const year = createdAt.getFullYear();
    const month = (createdAt.getMonth() + 1).toString().padStart(2, "0");
    const day = createdAt.getDate().toString().padStart(2, "0");
    return `MEALS#${accountId}#${year}-${month}-${day}`;
  }

  static getGSI1SK(mealId: string): MealItem.Keys["GSI1SK"] {
    return `MEAL#${mealId}`;
  }
}

export namespace MealItem {
  export type Keys = {
    PK: `MEAL#${string}`;
    SK: `MEAL#${string}`;
    GSI1PK: `MEALS#${string}#${string}-${string}-${string}`;
    GSI1SK: `MEAL#${string}`;
  };

  export type Attributes = {
    accountId: string;
    status: Meal.Status;
    attempts?: number;
    inputType: Meal.InputType;
    inputFileKey: string;
    name: string;
    foods: Meal.Food[];
    id: string;
    createdAt: string;
  };

  export type ItemType = Keys & Attributes & { type: "Meal" };

  export type GSI1PKParams = { accountId: string; createdAt: Date };
}
