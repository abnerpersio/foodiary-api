// import * as cdk from 'aws-cdk-lib';
// import * as cognito from 'aws-cdk-lib/aws-cognito';
// import * as lambda from 'aws-cdk-lib/aws-lambda';
// import type { Construct } from 'constructs';
// import * as path from 'node:path';
// import { stackConfig } from './config';

// export class CognitoStack extends cdk.Stack {
//   public readonly userPool: cognito.UserPool;
//   public readonly userPoolClient: cognito.UserPoolClient;
//   public readonly userPoolDomain: cognito.UserPoolDomain;

//   constructor(scope: Construct, id: string, props?: cdk.StackProps) {
//     super(scope, id, props);

//     this.userPool = new cognito.UserPool(this, 'UserPool', {
//       userPoolName: stackConfig.userPoolName,
//       mfa: cognito.Mfa.OFF,
//       deletionProtection: true,
//       selfSignUpEnabled: true,
//       autoVerify: { email: true },
//       passwordPolicy: {
//         minLength: 10,
//         requireLowercase: true,
//         requireUppercase: true,
//         requireDigits: false,
//         requireSymbols: true,
//         tempPasswordValidity: cdk.Duration.days(2),
//       },
//       accountRecovery: cognito.AccountRecovery.EMAIL_ONLY,
//       standardAttributes: {
//         givenName: { required: true, mutable: true },
//         familyName: { required: true, mutable: true },
//       },
//     });

//     const preSignUpTrigger = new lambda.Function(this, 'PreSignUpTrigger', {
//       runtime: stackConfig.runtime,
//       handler: 'pre-sign-up-trigger.handler',
//       code: lambda.Code.fromAsset(path.resolve(__dirname, '../dist/infra')),
//     });

//     this.userPool.addTrigger(cognito.UserPoolOperation.PRE_SIGN_UP, preSignUpTrigger);

//     this.userPoolClient = new cognito.UserPoolClient(this, 'UserPoolClient', {
//       userPool: this.userPool,
//       userPoolClientName: `${stackConfig.userPoolName}-client`,
//       generateSecret: true,
//       authFlows: {
//         userPassword: true,
//       },
//       oAuth: {
//         flows: {
//           authorizationCodeGrant: true,
//         },
//         scopes: [cognito.OAuthScope.EMAIL, cognito.OAuthScope.PROFILE, cognito.OAuthScope.OPENID],
//         callbackUrls: stackConfig.oauthBaseCallbacks.map((domain) => `${domain}/auth/callback`),
//       },
//       accessTokenValidity: cdk.Duration.hours(12),
//       refreshTokenValidity: cdk.Duration.days(60),
//       supportedIdentityProviders: [
//         cognito.UserPoolClientIdentityProvider.GOOGLE,
//         cognito.UserPoolClientIdentityProvider.COGNITO,
//       ],
//     });

//     new cognito.CfnUserPoolGroup(this, 'AdminsUserGroup', {
//       userPoolId: this.userPool.userPoolId,
//       groupName: 'superadmin',
//       description: 'Users from this group can access all features.',
//     });

//     this.userPoolDomain = new cognito.UserPoolDomain(this, 'UserPoolDomain', {
//       userPool: this.userPool,
//       cognitoDomain: {
//         domainPrefix: stackConfig.userPoolDomainName,
//       },
//     });

//     new cognito.UserPoolIdentityProviderGoogle(this, 'GoogleIdentityProvider', {
//       userPool: this.userPool,
//       clientId: process.env.GOOGLE_CLIENT_ID!,
//       clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
//       attributeMapping: {
//         email: cognito.ProviderAttribute.GOOGLE_EMAIL,
//         givenName: cognito.ProviderAttribute.GOOGLE_GIVEN_NAME,
//         familyName: cognito.ProviderAttribute.GOOGLE_FAMILY_NAME,
//       },
//     });
//   }
// }
