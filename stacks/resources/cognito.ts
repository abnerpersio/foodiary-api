import * as cdk from "aws-cdk-lib";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as lambda from "aws-cdk-lib/aws-lambda";
import type { Construct } from "constructs";
import { stackConfig } from "../config";
import { createFunctionAsset } from "../utils";

export class CognitoStack extends cdk.Stack {
  public readonly userPool: cognito.UserPool;
  public readonly userPoolClient: cognito.UserPoolClient;
  public readonly userPoolDomain: cognito.UserPoolDomain;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.userPool = new cognito.UserPool(this, "UserPool", {
      userPoolName: stackConfig.cognito.userPoolName,
      mfa: cognito.Mfa.OFF,
      deletionProtection: true,
      selfSignUpEnabled: true,
      autoVerify: { email: true },
      passwordPolicy: {
        minLength: 10,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: false,
        requireSymbols: true,
        tempPasswordValidity: cdk.Duration.days(2),
      },
      accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
      standardAttributes: {
        givenName: { required: true, mutable: true },
        familyName: { required: true, mutable: true },
      },
    });

    if (
      stackConfig.cognito.preSignUpFnPath &&
      stackConfig.cognito.preSignUpEnabled
    ) {
      const { handler, asset } = createFunctionAsset(
        stackConfig.cognito.preSignUpFnPath
      );

      const functionName = `${stackConfig.projectName}-pre-sign-up-trigger`;
      const preSignUpTrigger = new lambda.Function(this, functionName, {
        runtime: stackConfig.lambda.runtime,
        functionName,
        handler,
        memorySize: 128,
        timeout: cdk.Duration.seconds(30),
        code: lambda.Code.fromAsset(asset),
      });

      this.userPool.addTrigger(
        cognito.UserPoolOperation.PRE_SIGN_UP,
        preSignUpTrigger
      );
    }

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
  }
}
