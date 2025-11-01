import {
  refreshTokenSchema,
  RefreshTokenUseCase,
} from "@/application/usecases/auth/refresh-token-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(refreshTokenSchema)],
  useCase: RefreshTokenUseCase,
}).build();
