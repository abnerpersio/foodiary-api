import { FileEventHandler } from "@/application/contracts/file-event-handler";
import { Injectable } from "@/kernel/decorators/injectable";

@Injectable()
export class MealUploadedFileEventHandler implements FileEventHandler {
  async handle(input: FileEventHandler.Input) {
    console.log("filekey", input.fileKey);
  }
}
