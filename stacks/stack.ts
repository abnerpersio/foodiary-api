import "dotenv/config";

import * as cdk from "aws-cdk-lib";
import type { Construct } from "constructs";
import { stackConfig } from "./config";
import { ApiGatewayStack } from "./resources/api-gateway";
import { CognitoStack } from "./resources/cognito";
import { DynamoDBStack } from "./resources/dynamodb";
import { S3Stack } from "./resources/s3";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const cognito = new CognitoStack(this, "CognitoStack");
    const s3 = new S3Stack(this, "S3Stack");
    const dynamo = new DynamoDBStack(this, "DynamoStack");

    const environment = {
      COGNITO_CLIENT_ID: cognito.userPoolClient.userPoolClientId,
      COGNITO_CLIENT_SECRET:
        cognito.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
      COGNITO_POOL_ID: cognito.userPool.userPoolId,
      COGNITO_POOL_DOMAIN: cognito.userPoolDomain.domainName,
      MAIN_TABLE_NAME: dynamo.table.tableName,
      NODE_ENV: stackConfig.environment,
      NODE_OPTIONS: process.env.NODE_OPTIONS || "",
      STORAGE_BUCKET_NAME: s3.bucket.bucketName,
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || "",
      SENTRY_ORG: process.env.SENTRY_ORG || "",
      SENTRY_PROJECT: process.env.SENTRY_PROJECT || "",
      SENTRY_DSN: process.env.SENTRY_DSN || "",
      SENTRY_ENV: process.env.SENTRY_ENV || "",
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
    };

    new ApiGatewayStack(this, "api-gateway-stack", undefined, {
      environment,
      table: dynamo.table,
      userPool: cognito.userPool,
      bucket: s3.bucket,
    });
  }
}
