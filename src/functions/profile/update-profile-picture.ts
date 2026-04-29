import {
  updateProfilePictureSchema,
  UpdateProfilePictureUseCase,
} from "@/application/usecases/profile/update-profile-picture-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(updateProfilePictureSchema)],
  useCase: UpdateProfilePictureUseCase,
}).build();
