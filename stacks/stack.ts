import "dotenv/config";

import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";
import { stackConfig } from "./config";
import { ApiGatewayStack } from "./resources/api-gateway";
import { CognitoStack } from "./resources/cognito";
import { DynamoDBStack } from "./resources/dynamodb";
import { S3Stack } from "./resources/s3";
import { createFunctionAsset } from "./utils";

export class MainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const s3 = new S3Stack(this, "S3Stack");
    const dynamo = new DynamoDBStack(this, "DynamoStack");
    const cognito = new CognitoStack(this, "CognitoStack", undefined);

    const environment = {
      ...stackConfig.baseEnvironment,
      MAIN_TABLE_NAME: dynamo.table.tableName,
      NODE_ENV: stackConfig.environment,
      STORAGE_BUCKET_NAME: s3.bucket.bucketName,
      COGNITO_CLIENT_ID: cognito.userPoolClient.userPoolClientId,
      COGNITO_CLIENT_SECRET:
        cognito.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
      COGNITO_POOL_ID: cognito.userPool.userPoolId,
      COGNITO_POOL_DOMAIN: cognito.userPoolDomain.domainName,
    };

    new ApiGatewayStack(this, "api-gateway-stack", undefined, {
      environment,
      table: dynamo.table,
      userPool: cognito.userPool,
      bucket: s3.bucket,
    });

    this.addPreSignUpTrigger(cognito.userPool, environment);
  }

  private addPreSignUpTrigger(
    userPool: cdk.aws_cognito.UserPool,
    environment: Record<string, string>
  ) {
    const preSignUpFnPath = stackConfig.cognito.preSignUpFnPath;
    if (!preSignUpFnPath || !stackConfig.cognito.preSignUpEnabled) {
      return;
    }

    const { handler, asset } = createFunctionAsset(preSignUpFnPath);

    const functionName = `${stackConfig.projectName}-pre-sign-up-trigger`;
    const lambdaFn = new lambda.Function(this, functionName, {
      functionName,
      runtime: stackConfig.lambda.runtime,
      handler,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(asset),
      environment,
    });

    userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, lambdaFn);
  }
}
