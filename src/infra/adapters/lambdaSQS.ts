import "reflect-metadata";

import "@/shared/config/sentry";

import { QueueConsumer } from "@/application/contracts/queue-consumer";
import { Registry } from "@/kernel/di/registry";
import { Constructor } from "@/shared/types/constructor";
import * as Sentry from "@sentry/node";
import { SQSHandler } from "aws-lambda";

export class LambdaSQSAdapter {
  private readonly consumer: QueueConsumer<any>;

  constructor(consumerImpl: Constructor<QueueConsumer<any>>) {
    this.consumer = Registry.getInstance().resolve(consumerImpl);
  }

  build(): SQSHandler {
    return async (event) => {
      // Suggetion: use SQS batch ID failure
      await Promise.all(
        event.Records.map(async (record) => {
          try {
            const message = JSON.parse(record.body);
            return await this.consumer.process(message);
          } catch (error) {
            console.warn("[Lambda SQS adapter] unhandled error", error);
            Sentry.captureException(error, {
              extra: {
                messageId: record.messageId,
              },
            });
            throw error;
          }
        }),
      );
    };
  }
}
