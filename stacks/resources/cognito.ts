import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import type { Construct } from "constructs";
import { createFunctionAsset } from "stacks/utils";
import { stackConfig } from "../config";

type CognitoProps = {
  environment: Record<string, string>;
};

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(
    scope: Construct,
    id: string,
    private readonly cognitoProps: CognitoProps
  ) {
    super(scope, id, {
      stackName: stackConfig.stackName.concat("-cognito"),
    });

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
          stackConfig.google.clientSecret
        ),
        attributeMapping: {
          email: cognito.ProviderAttribute.GOOGLE_EMAIL,
          givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
          familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
        },
        scopes: ["profile", "email", "openid"],
      }
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
          (domain) => `${domain}/auth/callback`
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
      (trigger) => trigger.type === "pre-sign-up"
    );

    if (config?.fnPath) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_SIGN_UP,
        this.createLambda(config.fnPath, "pre-sign-up")
      );
    }
  }

  private createPreTokenTrigger() {
    const config = stackConfig.cognito.triggers.find(
      (trigger) => trigger.type === "pre-token"
    );

    if (config?.fnPath) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_TOKEN_GENERATION_CONFIG,
        this.createLambda(config.fnPath, "pre-token"),
        cognito.LambdaVersion.V2_0
      );
    }
  }

  private createCustomMessageTrigger() {
    const config = stackConfig.cognito.triggers.find(
      (trigger) => trigger.type === "custom-message"
    );

    if (config?.fnPath) {
      this.userPool.addTrigger(
        cognito.UserPoolOperation.CUSTOM_MESSAGE,
        this.createLambda(config.fnPath, "custom-message")
      );
    }
  }

  private createLambda(fnPath: string, fnName: string) {
    const { handler, asset } = createFunctionAsset(fnPath);

    const logGroup = new logs.LogGroup(
      this,
      `${stackConfig.stackName}-${fnName}-logs`,
      {
        logGroupName: `/aws/lambda/${stackConfig.stackName}-${fnName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      }
    );

    const functionName = `${stackConfig.projectName}-${fnName}`;
    return new lambda.Function(this, fnName, {
      functionName,
      runtime: stackConfig.lambda.runtime,
      handler,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(asset),
      logGroup,
      environment: {
        ...this.cognitoProps.environment,
        ENV_IGNORE_SETUP: "true",
      },
    });
  }
}
