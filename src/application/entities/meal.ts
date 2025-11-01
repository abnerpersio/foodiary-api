import KSUID from "ksuid";

export class Meal {
  readonly id: string;
  readonly accountId: string;
  readonly createdAt: Date;

  icon: string;
  status: Meal.Status;
  attempts: number | undefined;
  inputType: Meal.InputType;
  inputFileKey: string;
  name: string;

  foods: Meal.Food[];

  constructor(attr: Meal.Attributes) {
    this.id = attr.id ?? KSUID.randomSync().string;
    this.accountId = attr.accountId;
    this.createdAt = attr.createdAt ?? new Date();
    this.status = attr.status;
    this.inputType = attr.inputType;
    this.inputFileKey = attr.inputFileKey;
    this.attempts = attr.attempts ?? 0;
    this.icon = attr.icon ?? "";
    this.name = attr.name ?? "";
    this.foods = attr.foods ?? [];
  }
}

export namespace Meal {
  export type Attributes = {
    accountId: string;
    status: Meal.Status;
    inputType: Meal.InputType;
    inputFileKey: string;
    icon?: string;
    attempts?: number;
    name?: string;
    foods?: Meal.Food[];
    id?: string;
    createdAt?: Date;
  };

  export enum Status {
    UPLOADING = "UPLOADING",
    QUEUED = "QUEUED",
    PROCESSING = "PROCESSING",
    SUCCESS = "SUCCESS",
    FAILED = "FAILED",
  }

  export enum InputType {
    AUDIO = "AUDIO",
    PICTURE = "PICTURE",
  }

  export type Food = {
    name: string;
    quantity: string;
    calories: number;
    proteins: number;
    carbohydrates: number;
    fats: number;
  };
}
