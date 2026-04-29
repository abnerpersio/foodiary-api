import { UpdateProfilePictureUseCase } from "@/application/usecases/accounts/update-profile-picture-use-case";
import { HttpAdapter } from "@/infra/adapters/http";

export const handler = new HttpAdapter({
  useCase: UpdateProfilePictureUseCase,
}).build();
