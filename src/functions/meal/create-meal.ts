import "reflect-metadata";

import {
  createMealSchema,
  CreateMealUseCase,
} from "@/domain/meal/create-meal-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(createMealSchema)],
  useCase: CreateMealUseCase,
}).build();
