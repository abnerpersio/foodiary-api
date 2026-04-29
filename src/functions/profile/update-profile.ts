import {
  updateProfileSchema,
  UpdateProfileUseCase,
} from "@/application/usecases/profile/update-profile-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(updateProfileSchema)],
  useCase: UpdateProfileUseCase,
}).build();
