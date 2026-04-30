import { Meal } from "@/application/entities/meal";

export class MealItem {
  static readonly type = "Meal";
  private readonly keys: MealItem.Keys;

  constructor(private readonly attrs: MealItem.Attributes) {
    this.keys = {
      PK: MealItem.getPK(this.attrs),
      SK: MealItem.getSK(this.attrs),
      GSI1PK: MealItem.getGSI1PK(this.attrs),
      GSI1SK: MealItem.getGSI1SK(this.attrs),
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
      ...mealItem,
      createdAt: new Date(mealItem.createdAt),
    });
  }

  static getPK(
    attrs: Pick<MealItem.Attributes, "accountId" | "id">,
  ): MealItem.Keys["PK"] {
    return `ACCOUNT#${attrs.accountId}#MEAL#${attrs.id}`;
  }

  static getSK(
    attrs: Pick<MealItem.Attributes, "accountId" | "id">,
  ): MealItem.Keys["SK"] {
    return `ACCOUNT#${attrs.accountId}#MEAL#${attrs.id}`;
  }

  static getGSI1PK(
    attrs: Pick<MealItem.Attributes, "accountId"> & {
      createdAt: string | Date;
    },
  ): MealItem.Keys["GSI1PK"] {
    const createdAt = new Date(attrs.createdAt);
    const year = createdAt.getFullYear();
    const month = (createdAt.getMonth() + 1).toString().padStart(2, "0");
    const day = createdAt.getDate().toString().padStart(2, "0");
    return `MEALS#${attrs.accountId}#${year}-${month}-${day}`;
  }

  static getGSI1SK(
    attrs: Pick<MealItem.Attributes, "id">,
  ): MealItem.Keys["GSI1SK"] {
    return `MEAL#${attrs.id}`;
  }
}

export namespace MealItem {
  export type Keys = {
    PK: `ACCOUNT#${string}#MEAL#${string}`;
    SK: `ACCOUNT#${string}#MEAL#${string}`;
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
    icon: string;
    foods: Meal.Food[];
    id: string;
    createdAt: string;
  };

  export type ItemType = Keys & Attributes & { type: "Meal" };
}
