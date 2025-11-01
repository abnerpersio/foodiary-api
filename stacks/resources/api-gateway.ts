import { ROUTES, type Route } from "@/routes";
import { toKebabCase } from "@/shared/utils/lambda";
import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { stackConfig } from "../config";
import { createFunctionAsset } from "../utils";

type Env = Record<string, string>;

type GatewayProps = {
  environment: Env;
  userPool: cdk.aws_cognito.UserPool;
  userPoolClient: cdk.aws_cognito.UserPoolClient;
  role: iam.Role;
};

export class ApiGatewayStack extends cdk.Stack {
  api: apigatewayv2.HttpApi;
  private logGroup: cdk.aws_logs.LogGroup;
  private authorizer: HttpJwtAuthorizer;

  constructor(
    scope: Construct,
    id: string,
    private readonly gatewayProps: GatewayProps
  ) {
    super(scope, id, {
      stackName: stackConfig.stackName.concat("-apigateway"),
    });

    this.logGroup = this.createLogGroup();

    const issuerUrl = gatewayProps.userPool.userPoolProviderUrl;
    this.authorizer = new HttpJwtAuthorizer("JwtAuthorizer", issuerUrl, {
      jwtAudience: [gatewayProps.userPoolClient.userPoolClientId],
      identitySource: ["$request.header.Authorization"],
    });

    this.api = new apigatewayv2.HttpApi(this, "ApiGateway", {
      apiName: stackConfig.apiGateway.apiName,
      corsPreflight: {
        allowOrigins: ["*"],
        allowMethods: [
          apigatewayv2.CorsHttpMethod.GET,
          apigatewayv2.CorsHttpMethod.POST,
          apigatewayv2.CorsHttpMethod.PUT,
          apigatewayv2.CorsHttpMethod.DELETE,
          apigatewayv2.CorsHttpMethod.PATCH,
          apigatewayv2.CorsHttpMethod.OPTIONS,
        ],
        allowHeaders: ["Authorization", "Content-Type", "X-API-Key"],
      },
      defaultAuthorizer: undefined,
      disableExecuteApiEndpoint: stackConfig.apiDomain.disableDefaultApiDomain,
    });

    for (const route of ROUTES) {
      this.createLambdaFunction(route);
    }

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.api.url!,
      description: "API Gateway URL",
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

  private createLambdaFunction(route: Route) {
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
      role: this.gatewayProps.role,
    });

    const integration = new HttpLambdaIntegration(
      `${name}-integration`,
      lambdaFn
    );

    const routePath = route.route;
    const method = this.getHttpMethod(route.method);

    this.api.addRoutes({
      path: routePath,
      methods: [method],
      integration,
      authorizer: route.private ? this.authorizer : undefined,
    });
  }

  private getHttpMethod(method?: string): apigatewayv2.HttpMethod {
    const methodMap: Record<string, apigatewayv2.HttpMethod> = {
      GET: apigatewayv2.HttpMethod.GET,
      POST: apigatewayv2.HttpMethod.POST,
      PUT: apigatewayv2.HttpMethod.PUT,
      DELETE: apigatewayv2.HttpMethod.DELETE,
      PATCH: apigatewayv2.HttpMethod.PATCH,
      OPTIONS: apigatewayv2.HttpMethod.OPTIONS,
      HEAD: apigatewayv2.HttpMethod.HEAD,
      ANY: apigatewayv2.HttpMethod.ANY,
    };

    return (
      methodMap[method?.toUpperCase() || "ANY"] || apigatewayv2.HttpMethod.ANY
    );
  }
}
