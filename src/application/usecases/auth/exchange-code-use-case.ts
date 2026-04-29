import { type HttpUseCase } from "@/application/contracts/use-case";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const exchangeCodeSchema = z.object({
  query: z.object({
    code: z.string().min(1, "Required"),
    redirect_uri: z.string().min(1, "Required"),
  }),
});

export namespace ExchangeCodeUseCase {
  export type Query = z.infer<typeof exchangeCodeSchema>["query"];
}

@Injectable()
export class ExchangeCodeUseCase implements HttpUseCase<"public"> {
  constructor(private readonly authGateway: AuthGateway) {}

  async execute(
    request: HttpUseCase.Request<"public", undefined, Record<string, unknown>, ExchangeCodeUseCase.Query>
  ): Promise<HttpUseCase.Response> {
    const { code, redirect_uri } = request.query;

    const { accessToken, refreshToken } = await this.authGateway.exchangeCode({
      code,
      redirectUri: redirect_uri,
    });

    return {
      status: 200,
      data: { accessToken, refreshToken },
    };
  }
}
