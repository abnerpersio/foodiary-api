import { type HttpUseCase } from "@/application/contracts/use-case";
import { AppError } from "@/infra/errors/app-error";
import { InvalidRefreshToken } from "@/infra/errors/invalid-refresh-token";
import { AuthGateway } from "@/infra/gateways/auth-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import z from "zod";

export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string(),
  }),
});

export namespace RefreshTokenUseCase {
  export type Body = z.infer<typeof refreshTokenSchema>["body"];
}

@Injectable()
export class RefreshTokenUseCase implements HttpUseCase<"public"> {
  constructor(private readonly authGateway: AuthGateway) {}

  async execute(
    request: HttpUseCase.Request<"public", RefreshTokenUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    try {
      const { refreshToken } = request.body;

      const result = await this.authGateway.refreshToken({ refreshToken });

      return {
        status: 200,
        data: {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken,
        },
      };
    } catch {
      throw new InvalidRefreshToken();
    }
  }
}
