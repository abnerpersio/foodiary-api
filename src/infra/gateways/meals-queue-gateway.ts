import { Injectable } from "@/kernel/decorators/injectable";
import { AppConfig } from "@/shared/config/app-config";
import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { sqsClient } from "../clients/sqs";

@Injectable()
export class MealsQueueGateway {
  constructor(private readonly appConfig: AppConfig) {}

  async publish(message: MealsQueueGateway.Message) {
    const command = new SendMessageCommand({
      QueueUrl: this.appConfig.queues.mealsQueueUrl,
      MessageBody: JSON.stringify(message),
    });

    await sqsClient.send(command);
  }
}

export namespace MealsQueueGateway {
  export type Message = {
    accountId: string;
    mealId: string;
  };
}
