import { toKebabCase } from "@/lib/utils/lambda";
import type { HandlerWithMetadata } from "@/types/http";
import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import type * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type { StackProps } from "aws-cdk-lib/core";
import type { Construct } from "constructs";
import * as fs from "node:fs";
import * as path from "node:path";
import { BUILD_BASE_PATH, stackConfig } from "./config";

type Env = Record<string, string>;

type GatewayProps = {
  environment: Env;
  role: iam.IRole;
  // authorizer: apigateway.CognitoUserPoolsAuthorizer;
};

export class ApiGatewayStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    stackProps: StackProps | undefined,
    gatewayProps: GatewayProps
  ) {
    super(scope, id, stackProps);

    const api = new apigateway.RestApi(this, "api-gateway", {
      restApiName: stackConfig.apiName,
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

    const apiKey = new apigateway.ApiKey(this, "api-key", {
      apiKeyName: `${stackConfig.apiName}-key`,
      description: `API Key for ${stackConfig.apiName}`,
    });

    const usagePlan = new apigateway.UsagePlan(this, "usage-plan", {
      name: `${stackConfig.apiName}-usage-plan`,
      description: `Usage plan for ${stackConfig.apiName}`,
      throttle: {
        rateLimit: 100,
        burstLimit: 200,
      },
      quota: {
        limit: 10000,
        period: apigateway.Period.MONTH,
      },
      apiStages: [{ api, stage: api.deploymentStage }],
    });

    usagePlan.addApiKey(apiKey);

    const logGroup = new logs.LogGroup(this, `${stackConfig.apiName}-logs`, {
      logGroupName: `/aws/lambda/${stackConfig.apiName}`,
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const basePath = path.join(__dirname, "..", BUILD_BASE_PATH);
    const files = Array.from(fs.readdirSync(basePath)).filter((file) =>
      file.endsWith(".js")
    );

    for (const file of files) {
      const filePath = path.join(basePath, file);
      const module = require(filePath);

      const handler = module.handler as HandlerWithMetadata;
      if (!handler?.metadata) continue;
      const metadata = handler.metadata;

      const name = toKebabCase(file);
      const asset = this.createFunctionAsset(basePath, filePath, name);
      const lambdaFn = new lambda.Function(this, name, {
        runtime: stackConfig.runtime,
        handler: "index.handler",
        code: lambda.Code.fromAsset(asset),
        memorySize: 128,
        timeout: cdk.Duration.seconds(30),
        logGroup,
        environment: gatewayProps.environment,
        role: gatewayProps.role,
      });

      const routeParts = metadata.route.split("/").filter((part) => part);
      let currentResource = api.root;

      for (const part of routeParts) {
        const existingResource = currentResource.getResource(part);
        currentResource = existingResource || currentResource.addResource(part);
      }

      const integration = new apigateway.LambdaIntegration(lambdaFn);

      let options: apigateway.MethodOptions = {
        apiKeyRequired: true,
      };

      if (metadata.authorizer === "jwt") {
        options = {
          ...options,
          // authorizer: gatewayProps.authorizer,
          authorizationType: apigateway.AuthorizationType.COGNITO,
        };
      }

      currentResource.addMethod(metadata.method || "ANY", integration, options);
    }

    new cdk.CfnOutput(this, "ApiUrl", {
      value: api.url,
      description: "API Gateway URL",
    });

    new cdk.CfnOutput(this, "ApiKeyId", {
      value: apiKey.keyId,
      description: "API Key ID (use AWS CLI to get the actual key value)",
    });
  }

  private createFunctionAsset(
    baseDir: string,
    filePath: string,
    functionName: string
  ): string {
    const tempDir = path.join(baseDir, "tmp", functionName);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const wrapperContent = fs.readFileSync(filePath, "utf-8");
    fs.writeFileSync(path.join(tempDir, "index.js"), wrapperContent);
    return tempDir;
  }
}
