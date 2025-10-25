import { ROUTES, type Route } from "@/routes";
import { toKebabCase } from "@/shared/utils/lambda";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type { StackProps } from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import { stackConfig } from "../config";
import { createFunctionAsset } from "../utils";

type Env = Record<string, string>;

type GatewayProps = {
  environment: Env;
  table: cdk.aws_dynamodb.ITable;
  userPool: cdk.aws_cognito.IUserPool;
  bucket: cdk.aws_s3.IBucket;
};

export class ApiGatewayStack extends cdk.Stack {
  private api: cdk.aws_apigateway.RestApi;
  private apiKey: cdk.aws_apigateway.ApiKey;
  private logGroup: cdk.aws_logs.LogGroup;

  constructor(
    scope: Construct,
    id: string,
    stackProps: StackProps | undefined,
    private readonly gatewayProps: GatewayProps
  ) {
    super(scope, id, stackProps);

    this.api = new apigateway.RestApi(this, "ApiGateway", {
      restApiName: stackConfig.apiGateway.apiName,
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ["Authorization", "Content-Type", "X-API-Key"],
      },
      deployOptions: {
        stageName: "prod",
        loggingLevel: apigateway.MethodLoggingLevel.OFF,
        metricsEnabled: false,
        dataTraceEnabled: false,
      },
    });

    this.apiKey = this.createApiKey();
    this.logGroup = this.createLogGroup();
    const role = this.createLambdaRole(gatewayProps);
    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "cognito-authorizer",
      { cognitoUserPools: [gatewayProps.userPool] }
    );

    for (const route of ROUTES) {
      this.createLambdaFunction(route, role, authorizer);
    }

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.api.url,
      description: "API Gateway URL",
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: this.apiKey.keyId,
      description: "API Key ID (use AWS CLI to get the actual key value)",
    });
  }

  private createLogGroup() {
    const { apiName } = stackConfig.apiGateway;

    const logGroup = new logs.LogGroup(this, `${apiName}-logs`, {
      logGroupName: `/aws/lambda/${apiName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    new cdk.CfnOutput(this, "LogGroupName", {
      value: logGroup.logGroupName,
      description:
        "Log group name (add to .env so you can run 'pnpm run logs')",
    });

    return logGroup;
  }

  private createApiKey() {
    const { apiName } = stackConfig.apiGateway;

    const apiKey = new apigateway.ApiKey(this, "api-key", {
      apiKeyName: `${apiName}-key`,
      description: `API Key for ${apiName}`,
    });

    const usagePlan = new apigateway.UsagePlan(this, "usage-plan", {
      name: `${apiName}-usage-plan`,
      description: `Usage plan for ${apiName}`,
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
      apiStages: [{ api: this.api, stage: this.api.deploymentStage }],
    });

    usagePlan.addApiKey(apiKey);

    return apiKey;
  }

  private createLambdaRole({
    table,
    bucket,
    userPool,
  }: Pick<GatewayProps, "table" | "userPool" | "bucket">) {
    const role = new iam.Role(this, `${stackConfig.projectName}-lambda-role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: `Role used by ${stackConfig.projectName} Lambda functions`,
    });

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
        resources: [table.tableArn, `${table.tableArn}/index/*`],
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
        resources: [userPool.userPoolArn],
      })
    );

    // S3
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

  private createLambdaFunction(
    route: Route,
    role: iam.Role,
    authorizer: apigateway.CognitoUserPoolsAuthorizer
  ) {
    const name = toKebabCase(route.fnPath.replace(/\//g, "--"));
    const { handler, asset } = createFunctionAsset(route.fnPath);

    const lambdaFn = new lambda.Function(this, name, {
      functionName: `${stackConfig.projectName}-${name}`,
      runtime: stackConfig.lambda.runtime,
      handler,
      code: lambda.Code.fromAsset(asset),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      logGroup: this.logGroup,
      environment: this.gatewayProps.environment,
      role,
    });

    const resource = this.getResource(route);

    resource.addMethod(
      route.method || "ANY",
      new apigateway.LambdaIntegration(lambdaFn),
      this.mountLambdaOptions(route, authorizer)
    );
  }

  private getResource(metadata: Omit<Route, "fnPath">) {
    const routeParts = metadata.route.split("/").filter((part) => part);
    let currentResource = this.api.root;

    for (const part of routeParts) {
      const existingResource = currentResource.getResource(part);
      currentResource = existingResource || currentResource.addResource(part);
    }

    return currentResource;
  }

  private mountLambdaOptions(
    metadata: Omit<Route, "fnPath">,
    authorizer: apigateway.CognitoUserPoolsAuthorizer
  ) {
    let options: apigateway.MethodOptions = {
      apiKeyRequired: stackConfig.apiGateway.apiKeyRequired,
    };

    if (metadata.authorizer === "jwt") {
      options = {
        ...options,
        authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      };
    }

    return options;
  }
}
