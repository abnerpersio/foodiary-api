import "reflect-metadata";

import "@/shared/config/sentry";

import { FileEventHandler } from "@/application/contracts/file-event-handler";

import { Registry } from "@/kernel/di/registry";
import { Constructor } from "@/shared/types/constructor";
import * as Sentry from "@sentry/node";
import { S3Handler } from "aws-lambda";

export class LambdaS3Adapter {
  constructor(
    private readonly eventHandlerImpl: Constructor<FileEventHandler>,
  ) {}

  build(): S3Handler {
    return async (event) => {
      const eventHandler = Registry.getInstance().resolve(
        this.eventHandlerImpl,
      );

      await Promise.allSettled(
        event.Records.map(async (record) => {
          try {
            return await eventHandler.handle({
              fileKey: record.s3.object.key,
            });
          } catch (error) {
            console.warn("[Lambda S3 adapter] unhandled error", error);
            Sentry.captureException(error, {
              extra: {
                fileKey: record.s3.object.key,
              },
            });
            throw error;
          }
        }),
      );
    };
  }
}
