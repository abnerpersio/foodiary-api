import {
  updateGoalSchema,
  UpdateGoalsUseCase,
} from "@/application/usecases/goals/update-goals-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(updateGoalSchema)],
  useCase: UpdateGoalsUseCase,
});
