import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { stackConfig } from "../config";

export class S3Stack extends cdk.Stack {
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string) {
    super(scope, id, {
      stackName: stackConfig.stackName.concat("-s3"),
    });

    this.bucket = new s3.Bucket(this, "StorageBucket", {
      bucketName: stackConfig.storage.bucketName,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          id: "auto-delete-mpus-after-1-day",
        },
      ],
    });
  }
}
