import type { HandlerWithMetadata, HttpMetadata } from "@/shared/types/http";
import { toKebabCase } from "@/shared/utils/lambda";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import type * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type { StackProps } from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import * as fs from "node:fs";
import * as path from "node:path";
import { BUILD_BASE_PATH, stackConfig } from "../config";
import { createFunctionAsset } from "../utils";

type Env = Record<string, string>;

type GatewayProps = {
  environment: Env;
  role: iam.IRole;
  authorizer: apigateway.CognitoUserPoolsAuthorizer;
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
    const files = this.listLambdaFiles();

    for (const file of files) {
      this.createLambdaFunction(file);
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

    new cdk.CfnOutput(this, "ApiKeyId", {
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

  private listLambdaFiles() {
    const list = fs
      .readdirSync(BUILD_BASE_PATH, { recursive: true })
      .filter((file) => typeof file === "string" && file.endsWith(".js"));
    return Array.from(list as string[]);
  }

  private createLambdaFunction(file: string) {
    const filePath = path.join(BUILD_BASE_PATH, file);
    const module = require(filePath);

    const moduleHandler = module.handler as HandlerWithMetadata;
    if (!moduleHandler?.metadata) return;
    const metadata = moduleHandler.metadata;

    const name = toKebabCase(file.replace(".js", ""));
    const { handler, asset } = createFunctionAsset(file);

    const lambdaFn = new lambda.Function(this, name, {
      runtime: stackConfig.lambda.runtime,
      handler,
      code: lambda.Code.fromAsset(asset),
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      logGroup: this.logGroup,
      environment: this.gatewayProps.environment,
      role: this.gatewayProps.role,
    });

    const resource = this.getResource(metadata);

    resource.addMethod(
      metadata.method || "ANY",
      new apigateway.LambdaIntegration(lambdaFn),
      this.mountLambdaOptions(metadata)
    );
  }

  private getResource(metadata: HttpMetadata) {
    const routeParts = metadata.route.split("/").filter((part) => part);
    let currentResource = this.api.root;

    for (const part of routeParts) {
      const existingResource = currentResource.getResource(part);
      currentResource = existingResource || currentResource.addResource(part);
    }

    return currentResource;
  }

  private mountLambdaOptions(metadata: HttpMetadata) {
    let options: apigateway.MethodOptions = {
      apiKeyRequired: stackConfig.apiGateway.apiKeyRequired,
    };

    if (metadata.authorizer === "jwt") {
      options = {
        ...options,
        authorizer: this.gatewayProps.authorizer,
        authorizationType: apigateway.AuthorizationType.COGNITO,
      };
    }

    return options;
  }
}
