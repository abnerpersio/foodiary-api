import {
  createProfileSchema,
  CreateProfileUseCase,
} from "@/application/usecases/profiles/create-profile-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(createProfileSchema)],
  useCase: CreateProfileUseCase,
}).build();
