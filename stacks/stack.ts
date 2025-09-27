import "dotenv/config";

import * as cdk from "aws-cdk-lib";
// import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { ApiGatewayStack } from "./api-gateway";
import { stackConfig } from "./config";

export class RelatorioEnsaiosStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // const cognito = new CognitoStack(this, "cognito-stack");
    const bucket = s3.Bucket.fromBucketName(
      this,
      "storage-bucket",
      stackConfig.storageBucketName
    );

    const environment = {
      // COGNITO_CLIENT_ID: cognito.userPoolClient.userPoolClientId,
      // COGNITO_POOL_ID: cognito.userPool.userPoolId,
      // CLIENT_APP_URL: process.env.CLIENT_APP_URL || "",
      NODE_ENV: stackConfig.environment,
      NODE_OPTIONS: process.env.NODE_OPTIONS || "",
      STORAGE_BUCKET_NAME: bucket.bucketName,
      SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || "",
      SENTRY_ORG: process.env.SENTRY_ORG || "",
      SENTRY_PROJECT: process.env.SENTRY_PROJECT || "",
      SENTRY_DSN: process.env.SENTRY_DSN || "",
      SENTRY_ENV: process.env.SENTRY_ENV || "",
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
    };

    // const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
    //   this,
    //   "cognito-authorizer",
    //   {
    //     cognitoUserPools: [cognito.userPool],
    //   }
    // );

    const lambdaRole = this.createLambdaRole({ bucket });

    new ApiGatewayStack(this, "api-gateway-stack", undefined, {
      environment,
      // authorizer,
      role: lambdaRole,
    });
  }

  private createLambdaRole({ bucket }: { bucket: cdk.aws_s3.IBucket }) {
    const lambdaRole = new iam.Role(
      this,
      `${stackConfig.projectName}-lambda-role`,
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        description: `Role used by ${stackConfig.projectName} Lambda functions`,
      }
    );

    // Cognito
    // lambdaRole.addToPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: [
    //       "cognito-idp:AdminGetUser",
    //       "cognito-idp:ListUsers",
    //       "cognito-idp:AdminCreateUser",
    //       "cognito-idp:AdminLinkProviderForUser",
    //     ],
    //     resources: [cdk.Fn.getAtt("UserPool", "Arn").toString()],
    //   })
    // );

    // const bucketArn = cdk.Fn.getAtt("StorageBucket", "Arn").toString();
    const bucketArn = bucket.bucketArn;

    // S3
    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [bucketArn, cdk.Fn.join("/", [bucketArn, "*"])],
      })
    );

    lambdaRole.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole"
      )
    );

    return lambdaRole;
  }
}
