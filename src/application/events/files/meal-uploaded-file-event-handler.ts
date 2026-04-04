import { FileEventHandler } from "@/application/contracts/file-event-handler";
import { MealUploadedUseCase } from "@/application/usecases/meals/meal-uploaded-use-case";
import { Injectable } from "@/kernel/decorators/injectable";

@Injectable()
export class MealUploadedFileEventHandler implements FileEventHandler {
  constructor(private readonly mealUploadedUseCase: MealUploadedUseCase) {}

  async handle({ fileKey }: FileEventHandler.Input) {
    await this.mealUploadedUseCase.execute({ fileKey });
  }
}
