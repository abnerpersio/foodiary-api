import "dotenv/config";

import { ROUTES, type Route } from "@/routes";
import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import { HttpJwtAuthorizer } from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notification from "aws-cdk-lib/aws-s3-notifications";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { stackConfig } from "./config";
import { createFunctionAsset, toKebabCase } from "./utils";

export class MainStack extends cdk.Stack {
  private table!: dynamodb.Table;
  private bucket!: s3.Bucket;
  private cdn!: cloudfront.Distribution;
  private cdnDomainName!: string;
  private mealsQueue!: sqs.Queue;
  private mealsQueueDLQ!: sqs.Queue;
  private userPool!: cognito.UserPool;
  private userPoolClient!: cognito.UserPoolClient;
  private userPoolDomain!: cognito.UserPoolDomain;
  private api!: apigatewayv2.HttpApi;
  private role!: iam.Role;
  private logGroup!: logs.LogGroup;
  private authorizer!: HttpJwtAuthorizer;
  private lambdaEnvironment!: Record<string, string>;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.createDynamoDB();
    this.createS3();
    this.createSQS();

    this.lambdaEnvironment = {
      ...stackConfig.baseEnvironment,
      MAIN_TABLE_NAME: this.table.tableName,
      NODE_ENV: stackConfig.environment,
      STORAGE_BUCKET_NAME: this.bucket.bucketName,
      CDN_DOMAIN_NAME: this.cdnDomainName,
    };

    this.createCognito();

    this.lambdaEnvironment = {
      ...this.lambdaEnvironment,
      COGNITO_CLIENT_ID: this.userPoolClient.userPoolClientId,
      COGNITO_CLIENT_SECRET:
        this.userPoolClient.userPoolClientSecret.unsafeUnwrap(),
      COGNITO_POOL_ID: this.userPool.userPoolId,
      COGNITO_POOL_DOMAIN: this.userPoolDomain.domainName,
    };

    this.createLambdaRole();
    this.createApiGateway();
    this.createS3Triggers();
    this.createQueueListeners();

    const hasCustomDomain =
      !!stackConfig.apiDomain?.name &&
      !!stackConfig.route53?.hostedZoneId &&
      !!stackConfig.route53?.hostedZoneName;
    if (hasCustomDomain) {
      this.createApiCustomDomain();
    }
  }

  // !DynamoDB
  private createDynamoDB() {
    this.table = new dynamodb.Table(this, "MainTable", {
      tableName: stackConfig.dynamo.tableName,
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      partitionKey: { name: "PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "SK", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      pointInTimeRecoverySpecification: {
        pointInTimeRecoveryEnabled:
          stackConfig.dynamo.pointInTimeRecoveryEnabled,
        recoveryPeriodInDays: stackConfig.dynamo.recoveryPeriodInDays,
      },
    });

    this.table.addGlobalSecondaryIndex({
      indexName: "GSI1",
      partitionKey: { name: "GSI1PK", type: dynamodb.AttributeType.STRING },
      sortKey: { name: "GSI1SK", type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });
  }

  // !S3
  private createS3() {
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

    const hasCustomCdnDomain =
      !!stackConfig.cdn?.domainName &&
      !!stackConfig.route53?.hostedZoneId &&
      !!stackConfig.route53?.hostedZoneName;

    this.cdn = new cloudfront.Distribution(this, "StorageBucketCDN", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      certificate: this.getCdnCertificate(),
    });
    cdk.Tags.of(this.cdn).add("Name", stackConfig.stackName.concat("-cdn"));

    this.cdnDomainName = hasCustomCdnDomain
      ? stackConfig.cdn.domainName!
      : this.cdn.domainName;
  }

  private getCdnCertificate() {
    const hasCustomDomain =
      !!stackConfig.cdn?.domainName &&
      !!stackConfig.route53?.hostedZoneId &&
      !!stackConfig.route53?.hostedZoneName;

    if (!hasCustomDomain) return undefined;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "CustomCDNDomainHostedZone",
      {
        hostedZoneId: stackConfig.route53.hostedZoneId,
        zoneName: stackConfig.route53.hostedZoneName,
      },
    );

    return new acm.Certificate(this, "CustomDomainCertificate", {
      domainName: stackConfig.cdn.domainName!,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
  }

  // !SQS
  private createSQS() {
    this.mealsQueueDLQ = new sqs.Queue(this, "ProcessMealQueueDLQ", {
      retentionPeriod: cdk.Duration.days(5),
      queueName: stackConfig.stackName.concat("process-meal-queue-dlq"),
    });

    this.mealsQueue = new sqs.Queue(this, "ProcessMealQueue", {
      visibilityTimeout: cdk.Duration.seconds(130),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      queueName: stackConfig.stackName.concat("process-meal-queue"),
      deadLetterQueue: {
        queue: this.mealsQueueDLQ,
        maxReceiveCount: 2,
      },
    });
  }

  // !Cognito
  private createCognito() {
    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: stackConfig.cognito.userPoolName,
      mfa: cognito.Mfa.OFF,
      deletionProtection: true,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 8,
        requireLowercase: false,
        requireUppercase: false,
        requireDigits: false,
        requireSymbols: false,
        tempPasswordValidity: cdk.Duration.days(2),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        givenName: { required: false, mutable: true },
        familyName: { required: false, mutable: true },
      },
      customAttributes: {
        internalId: new cognito.StringAttribute({ mutable: true }),
      },
      email: stackConfig.cognito.customEmailProvider?.sesVerifiedDomain
        ? cognito.UserPoolEmail.withSES(stackConfig.cognito.customEmailProvider)
        : undefined,
    });

    const googleProvider = new cognito.UserPoolIdentityProviderGoogle(
      this,
      "GoogleIdentityProvider",
      {
        userPool: this.userPool,
        clientId: stackConfig.google.clientId,
        clientSecretValue: cdk.SecretValue.unsafePlainText(
          stackConfig.google.clientSecret,
        ),
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        },
        scopes: ["profile", "email", "openid"],
      },
    );

    this.userPool.registerIdentityProvider(googleProvider);

    this.userPoolClient = new cognito.UserPoolClient(this, "UserPoolClient", {
      userPool: this.userPool,
      userPoolClientName: `${stackConfig.cognito.userPoolName}-client`,
      generateSecret: true,
      authFlows: {
        userPassword: true,
      },
      refreshTokenRotationGracePeriod: cdk.Duration.minutes(0),
      oAuth: {
        flows: {
          authorizationCodeGrant: true,
        },
        scopes: [
          cognito.OAuthScope.EMAIL,
          cognito.OAuthScope.PROFILE,
          cognito.OAuthScope.OPENID,
        ],
        callbackUrls: stackConfig.cognito.oauthBaseCallbacks.map(
          (domain) => `${domain}/auth/callback`,
        ),
      },
      accessTokenValidity: cdk.Duration.hours(12),
      supportedIdentityProviders: [
        cognito.UserPoolClientIdentityProvider.GOOGLE,
        cognito.UserPoolClientIdentityProvider.COGNITO,
      ],
    });

    this.userPoolClient.node.addDependency(googleProvider);

    new cognito.CfnUserPoolGroup(this, "AdminsUserGroup", {
      userPoolId: this.userPool.userPoolId,
      groupName: "superadmin",
      description: "Users from this group can access all features.",
    });

    this.userPoolDomain = new cognito.UserPoolDomain(this, "UserPoolDomain", {
      userPool: this.userPool,
      cognitoDomain: {
        domainPrefix: stackConfig.cognito.userPoolDomainName,
      },
    });

    this.createPreSignUpTrigger();
    this.createPreTokenTrigger();
    this.createCustomMessageTrigger();
  }

  private createPreSignUpTrigger() {
    const config = stackConfig.cognito.triggers.find(
      (trigger) => trigger.type === "pre-sign-up",
    );
    if (config?.fnPath) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_SIGN_UP,
        this.createCognitoLambda(config.fnPath, "pre-sign-up"),
      );
    }
  }

  private createPreTokenTrigger() {
    const config = stackConfig.cognito.triggers.find(
      (trigger) => trigger.type === "pre-token",
    );
    if (config?.fnPath) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_TOKEN_GENERATION_CONFIG,
        this.createCognitoLambda(config.fnPath, "pre-token"),
        cognito.LambdaVersion.V2_0,
      );
    }
  }

  private createCustomMessageTrigger() {
    const config = stackConfig.cognito.triggers.find(
      (trigger) => trigger.type === "custom-message",
    );
    if (config?.fnPath) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.CUSTOM_MESSAGE,
        this.createCognitoLambda(config.fnPath, "custom-message"),
      );
    }
  }

  private createCognitoLambda(fnPath: string, fnName: string) {
    const { handler, asset } = createFunctionAsset(fnPath);

    const logGroup = new logs.LogGroup(
      this,
      `${stackConfig.stackName}-${fnName}-logs`,
      {
        logGroupName: `/aws/lambda/${stackConfig.stackName}-${fnName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    return new lambda.Function(this, fnName, {
      functionName: `${stackConfig.projectName}-${fnName}`,
      runtime: stackConfig.lambda.runtime,
      handler,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(asset),
      logGroup,
      environment: {
        ...this.lambdaEnvironment,
        ENV_IGNORE_SETUP: "true",
      },
    });
  }

  // !IAM
  private createLambdaRole() {
    this.role = new iam.Role(
      this,
      `${stackConfig.projectName}-lambda-role`,
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        description: `Role used by ${stackConfig.projectName} Lambda functions`,
      },
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
        ],
        resources: [this.table.tableArn, `${this.table.tableArn}/index/*`],
      }),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "cognito-idp:AdminGetUser",
          "cognito-idp:ListUsers",
          "cognito-idp:AdminCreateUser",
          "cognito-idp:AdminDeleteUser",
          "cognito-idp:AdminLinkProviderForUser",
        ],
        resources: [this.userPool.userPoolArn],
      }),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
      }),
    );

    this.role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sqs:SendMessage"],
        resources: [this.mealsQueue.queueArn],
      }),
    );

    this.role.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole",
      ),
    );
  }

  // !API Gateway
  private createApiGateway() {
    this.logGroup = new logs.LogGroup(
      this,
      `${stackConfig.apiGateway.apiName}-logs`,
      {
        logGroupName: `/aws/lambda/${stackConfig.apiGateway.apiName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    new cdk.CfnOutput(this, "LogGroupName", {
      value: this.logGroup.logGroupName,
      description:
        "Log group name (add to .env so you can run 'pnpm run logs')",
    });

    this.authorizer = new HttpJwtAuthorizer(
      "JwtAuthorizer",
      this.userPool.userPoolProviderUrl,
      {
        jwtAudience: [this.userPoolClient.userPoolClientId],
        identitySource: ["$request.header.Authorization"],
      },
    );

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
      this.createLambdaRoute(route);
    }

    new cdk.CfnOutput(this, "ApiUrl", {
      value: this.api.url!,
      description: "API Gateway URL",
    });
  }

  private createLambdaRoute(route: Route) {
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
      environment: this.lambdaEnvironment,
      role: this.role,
    });

    this.api.addRoutes({
      path: route.route,
      methods: [this.getHttpMethod(route.method)],
      integration: new HttpLambdaIntegration(`${name}-integration`, lambdaFn),
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

  // !S3 Triggers
  private createS3Triggers() {
    const { handler, asset } = createFunctionAsset(
      stackConfig.storage.mealsFileUpdloadedFnPath,
    );
    const fnName = "on-meal-file-uploaded";

    const logGroup = new logs.LogGroup(
      this,
      `${stackConfig.stackName}-${fnName}-logs`,
      {
        logGroupName: `/aws/lambda/${stackConfig.stackName}-${fnName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const lambdaFn = new lambda.Function(this, fnName, {
      functionName: `${stackConfig.projectName}-${fnName}`,
      runtime: stackConfig.lambda.runtime,
      handler,
      memorySize: 128,
      role: this.role,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(asset),
      logGroup,
      environment: {
        ...this.lambdaEnvironment,
        ENV_IGNORE_SETUP: "true",
      },
    });

    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notification.LambdaDestination(lambdaFn),
    );
  }

  // !Queue Listeners
  private createQueueListeners() {
    const { handler, asset } = createFunctionAsset(
      stackConfig.queue.processMealFnPath,
    );
    const fnName = "process-meal";

    const logGroup = new logs.LogGroup(
      this,
      `${stackConfig.stackName}-${fnName}-logs`,
      {
        logGroupName: `/aws/lambda/${stackConfig.stackName}-${fnName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const lambdaFn = new lambda.Function(this, fnName, {
      functionName: `${stackConfig.projectName}-${fnName}`,
      runtime: stackConfig.lambda.runtime,
      handler,
      memorySize: 128,
      role: this.role,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(asset),
      logGroup,
      environment: {
        ...this.lambdaEnvironment,
        ENV_IGNORE_SETUP: "true",
      },
    });

    lambdaFn.addEventSource(new eventsources.SqsEventSource(this.mealsQueue));
  }

  // !API Custom Domain
  private createApiCustomDomain() {
    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "CustomDomainHostedZone",
      {
        hostedZoneId: stackConfig.route53.hostedZoneId,
        zoneName: stackConfig.route53.hostedZoneName,
      },
    );

    const certificate = new acm.Certificate(this, "CustomDomainCertificate", {
      domainName: stackConfig.apiDomain.name,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const domainName = new apigatewayv2.DomainName(
      this,
      "ApiCustomDomainName",
      {
        certificate,
        domainName: stackConfig.apiDomain.name,
      },
    );

    new apigatewayv2.ApiMapping(this, "ApiMapping", {
      api: this.api,
      domainName,
    });

    const aliasTarget = new targets.ApiGatewayv2DomainProperties(
      domainName.regionalDomainName,
      domainName.regionalHostedZoneId,
    );
    new route53.RecordSet(this, "ApiCustomDomainDNSRecord", {
      zone: hostedZone,
      recordType: route53.RecordType.A,
      recordName: stackConfig.apiDomain.name,
      target: route53.RecordTarget.fromAlias(aliasTarget),
    });
  }
}
