import "reflect-metadata";

import {
  listMealsByDateSchema,
  ListMealsByDateUseCase,
} from "@/application/usecases/meal/list-meals-by-date-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(listMealsByDateSchema)],
  useCase: ListMealsByDateUseCase,
}).build();
