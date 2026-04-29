import {
  exchangeCodeSchema,
  ExchangeCodeUseCase,
} from "@/application/usecases/auth/exchange-code-use-case";
import { HttpAdapter } from "@/infra/adapters/http";
import { validator } from "@/infra/middlewares/validator";

export const handler = new HttpAdapter({
  middlewares: [validator(exchangeCodeSchema)],
  useCase: ExchangeCodeUseCase,
}).build();
