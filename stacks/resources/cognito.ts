import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
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
    super(scope, id);

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

    this.createPreSignUpLambda();
  }

  private createPreSignUpLambda() {
    if (
      !stackConfig.cognito.preSignUpFnPath ||
      !stackConfig.cognito.preSignUpEnabled
    ) {
      return;
    }

    const preSignUpFnPath = stackConfig.cognito.preSignUpFnPath!;
    const { handler, asset } = createFunctionAsset(preSignUpFnPath);

    const functionName = `${stackConfig.projectName}-pre-sign-up-trigger`;
    const lambdaFn = new lambda.Function(this, "PreSignUpTrigger", {
      functionName,
      runtime: stackConfig.lambda.runtime,
      handler,
      memorySize: 128,
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(asset),
      environment: {
        ...this.cognitoProps.environment,
        ENV_IGNORE_SETUP: "true",
      },
    });

    this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, lambdaFn);
  }
}
