import "dotenv/config";

import * as cdk from "aws-cdk-lib";
import * as awsCognito from "aws-cdk-lib/aws-cognito";
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

    const s3 = new S3Stack(this, "S3Stack");
    const dynamo = new DynamoDBStack(this, "DynamoStack");

    let environment = {
      ...stackConfig.baseEnvironment,
      MAIN_TABLE_NAME: dynamo.table.tableName,
      NODE_ENV: stackConfig.environment,
      STORAGE_BUCKET_NAME: s3.bucket.bucketName,
    } as Record<string, string>;

    const cognito = new CognitoStack(this, "CognitoStack", { environment });

    environment = {
      ...environment,
      COGNITO_CLIENT_ID: cognito.userPoolClient.userPoolClientId,
      COGNITO_CLIENT_SECRET:
        cognito.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
      COGNITO_POOL_ID: cognito.userPool.userPoolId,
      COGNITO_POOL_DOMAIN: cognito.userPoolDomain.domainName,
    };

    const role = this.createLambdaRole({
      table: dynamo.table,
      userPool: cognito.userPool,
      bucket: s3.bucket,
    });

    new ApiGatewayStack(this, "api-gateway-stack", {
      environment,
      userPool: cognito.userPool,
      userPoolClient: cognito.userPoolClient,
      role,
    });
  }

  private createLambdaRole({
    table,
    bucket,
    userPool,
  }: {
    table: cdk.aws_dynamodb.ITable;
    userPool: awsCognito.UserPool;
    bucket: cdk.aws_s3.IBucket;
  }) {
    const role = new iam.Role(this, `${stackConfig.projectName}-lambda-role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: `Role used by ${stackConfig.projectName} Lambda functions`,
    });

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
        resources: [table.tableArn, `${table.tableArn}/index/*`],
      })
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsers",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminLinkProviderForUser",
        ],
        resources: [userPool.userPoolArn],
      })
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [bucket.bucketArn, `${bucket.bucketArn}/*`],
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
