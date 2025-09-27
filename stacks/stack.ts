import "dotenv/config";

import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
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
        cognito.userPoolClient.userPoolClientSecret.toString(),
      COGNITO_POOL_ID: cognito.userPool.userPoolId,
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

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "cognito-authorizer",
      { cognitoUserPools: [cognito.userPool] }
    );

    new ApiGatewayStack(this, "api-gateway-stack", undefined, {
      environment,
      authorizer,
      role: this.createLambdaRole(),
    });
  }

  private createLambdaRole() {
    const role = new iam.Role(this, `${stackConfig.projectName}-lambda-role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: `Role used by ${stackConfig.projectName} Lambda functions`,
    });

    const tableName = cdk.Fn.getAtt("MainTable", "Arn").toString();

    // DynamoDB
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
        ],
        resources: [tableName, cdk.Fn.join("/", [tableName, "index", "*"])],
      })
    );

    // Cognito
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsers",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminLinkProviderForUser",
        ],
        resources: [cdk.Fn.getAtt("UserPool", "Arn").toString()],
      })
    );

    const bucketArn = cdk.Fn.getAtt("StorageBucket", "Arn").toString();

    // S3
    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [bucketArn, cdk.Fn.join("/", [bucketArn, "*"])],
      })
    );

    role.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    return role;
  }
}
