import "reflect-metadata";

import "@/shared/config/sentry";

import { FileEventHandler } from "@/application/contracts/file-event-handler";

import { Registry } from "@/kernel/di/registry";
import { Constructor } from "@/shared/types/constructor";
import * as Sentry from "@sentry/node";
import { S3Handler } from "aws-lambda";

export class LambdaS3Adapter {
  private readonly eventHandler: FileEventHandler;

  constructor(eventHandlerImpl: Constructor<FileEventHandler>) {
    this.eventHandler = Registry.getInstance().resolve(eventHandlerImpl);
  }

  build(): S3Handler {
    return async (event) => {
      await Promise.allSettled(
        event.Records.map(async (record) => {
          try {
            return await this.eventHandler.handle({
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
