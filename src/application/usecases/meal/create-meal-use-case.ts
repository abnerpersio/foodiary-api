import { type HttpUseCase } from "@/application/contracts/use-case";
import { Meal } from "@/application/entities/meal";
import { MealRepository } from "@/infra/database/dynamo/repositories/meal-repository";
import { MealsFileStorageGateway } from "@/infra/gateways/meals-file-storage-gateway";
import { Injectable } from "@/kernel/decorators/injectable";
import { MB } from "@/shared/utils/file";
import z from "zod";

export const createMealSchema = z.object({
  body: z.object({
    file: z.object({
      type: z.enum(["audio/m4a", "image/jpeg", "image/png"]),
      size: z
        .number()
        .min(1, "Should have at least 1 byte")
        .max(10 * MB, "Max file size is 10MB"),
    }),
  }),
});

export namespace CreateMealUseCase {
  export type Body = z.infer<typeof createMealSchema>["body"];

  export type Output = {
    mealId: string;
    uploadSignature: string;
  };
}

@Injectable()
export class CreateMealUseCase implements HttpUseCase<"private"> {
  constructor(
    private readonly mealRepository: MealRepository,
    private readonly mealsFileStorageGateway: MealsFileStorageGateway
  ) {}

  async execute(
    request: HttpUseCase.Request<"private", CreateMealUseCase.Body>
  ): Promise<HttpUseCase.Response<CreateMealUseCase.Output>> {
    const { accountId } = request;
    const { file } = request.body;
    const inputType =
      file.type === "audio/m4a" ? Meal.InputType.AUDIO : Meal.InputType.PICTURE;

    const inputFileKey = MealsFileStorageGateway.generateFileKey({
      accountId,
      inputType,
    });

    const meal = new Meal({
      accountId,
      inputFileKey,
      inputType,
      status: Meal.Status.UPLOADING,
    });

    const [, { uploadSignature }] = await Promise.all([
      this.mealRepository.create(meal),
      this.mealsFileStorageGateway.createPOST({
        mealId: meal.id,
        file: {
          key: inputFileKey,
          inputType,
          size: file.size,
        },
      }),
    ]);

    return {
      status: 201,
      data: {
        mealId: meal.id,
        uploadSignature,
      },
    };
  }
}
