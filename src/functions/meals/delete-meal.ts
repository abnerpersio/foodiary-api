import { DeleteMealUseCase } from "@/application/usecases/meals/delete-meal-use-case";
import { HttpAdapter } from "@/infra/adapters/http";

export const handler = new HttpAdapter({
  useCase: DeleteMealUseCase,
}).build();
