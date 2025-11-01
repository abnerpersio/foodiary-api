import "reflect-metadata";

import { GetMealUseCase } from "@/application/usecases/meals/get-meal-use-case";
import { HttpAdapter } from "@/infra/adapters/http";

export const handler = new HttpAdapter({
  useCase: GetMealUseCase,
}).build();
