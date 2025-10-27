import { type HttpUseCase } from "@/application/contracts/use-case";
import { Injectable } from "@/kernel/decorators/injectable";
import KSUID from "ksuid";
import z from "zod";

export const createMealSchema = z.object({
  body: z.object({}),
});

export namespace CreateMealUseCase {
  export type Body = z.infer<typeof createMealSchema>["body"];
}

@Injectable()
export class CreateMealUseCase implements HttpUseCase<"private"> {
  constructor() {}

  async execute(
    request: HttpUseCase.Request<"private", CreateMealUseCase.Body>
  ): Promise<HttpUseCase.Response> {
    return {
      status: 201,
      data: {
        id: KSUID.randomSync().string,
      },
    };
  }
}
