import { GetMeUseCase } from "@/application/usecases/account/get-me-use-case";
import { HttpAdapter } from "@/infra/adapters/http";

export const handler = new HttpAdapter({
  useCase: GetMeUseCase,
}).build();
