import { GetMeUseCase } from "@/application/usecases/accounts/get-me-use-case";
import { HttpAdapter } from "@/infra/adapters/http";

export const handler = new HttpAdapter({
  useCase: GetMeUseCase,
});
