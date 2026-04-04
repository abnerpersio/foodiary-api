import { MealUploadedFileEventHandler } from "@/application/events/files/meal-uploaded-file-event-handler";
import { LambdaS3Adapter } from "@/infra/adapters/lambdaS3";

export const handler = new LambdaS3Adapter(
  MealUploadedFileEventHandler,
).build();
