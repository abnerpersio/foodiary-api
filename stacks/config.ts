import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "node:path";

const environment = process.env.ENVIRONMENT || "prod";

export const BUILD_BASE_PATH = path.join(__dirname, "..", "lambda-pkg");

const projectName = "foodiary-api";
const projectNameWithEnv = `${projectName}-${environment}`;

namespace StackConfig {
  export type Config = {
    stackName: string;
    apiDomain: {
      name: string;
      hostedZoneName: string;
      hostedZoneId: string;
      disableDefaultApiDomain: boolean;
    };
    environment: string;
    projectName: string;
    lambda: {
      runtime: lambda.Runtime;
    };
    apiGateway: {
      apiName: string;
      apiKeyRequired: boolean;
    };
    storage: {
      bucketName: string;
    };
    google: {
      clientId: string;
      clientSecret: string;
    };
    cognito: {
      userPoolName: string;
      userPoolDomainName: string;
      oauthBaseCallbacks: string[];
      triggers: {
        type: "pre-sign-up" | "pre-token" | "custom-message";
        fnPath: string;
      }[];
      customEmailProvider?: {
        fromEmail: string;
        fromName: string;
        sesRegion: string;
        sesVerifiedDomain: string;
      };
    };
    dynamo: {
      tableName: string;
      pointInTimeRecoveryEnabled: boolean;
      recoveryPeriodInDays: undefined;
    };
    baseEnvironment: Record<string, string>;
  };
}

export const stackConfig = {
  stackName: `${projectNameWithEnv}-stack`,
  apiDomain: {
    name: process.env.API_DOMAIN_NAME,
    hostedZoneId: process.env.ROUTE53_HOSTED_ZONE_ID,
    hostedZoneName: process.env.ROUTE53_HOSTED_ZONE_NAME,
    disableDefaultApiDomain: process.env.DISABLE_DEFAULT_API_DOMAIN === "true",
  },
  environment,
  projectName: projectNameWithEnv,
  lambda: {
    runtime: lambda.Runtime.NODEJS_22_X,
  },
  apiGateway: {
    apiName: projectNameWithEnv,
    apiKeyRequired: true,
  },
  storage: {
    bucketName: `${projectNameWithEnv}-storage`,
  },
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID as string,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
  },
  cognito: {
    userPoolName: `${projectNameWithEnv}-pool`,
    userPoolDomainName: projectName,
    oauthBaseCallbacks: ["http://localhost:5173"],
    triggers: [
      {
        type: "pre-sign-up",
        fnPath: "auth/cognito/pre-sign-up-trigger",
      },
      {
        type: "pre-token",
        fnPath: "auth/cognito/pre-token-trigger",
      },
      {
        type: "custom-message",
        fnPath: "auth/cognito/custom-message-trigger",
      },
    ],
    customEmailProvider: {
      fromEmail: process.env.COGNITO_EMAIL_FROM,
      fromName: process.env.COGNITO_EMAIL_FROM_NAME,
      replyTo: process.env.COGNITO_EMAIL_REPLY_TO,
      sesRegion: process.env.SES_REGION,
      sesVerifiedDomain: process.env.SES_VERIFIED_DOMAIN,
    },
  },
  dynamo: {
    tableName: `${projectNameWithEnv}-MainTable`,
    pointInTimeRecoveryEnabled: false,
    recoveryPeriodInDays: undefined,
  },
  baseEnvironment: {
    NODE_OPTIONS: process.env.NODE_OPTIONS || "",
    SENTRY_AUTH_TOKEN: process.env.SENTRY_AUTH_TOKEN || "",
    SENTRY_ORG: process.env.SENTRY_ORG || "",
    SENTRY_PROJECT: process.env.SENTRY_PROJECT || "",
    SENTRY_DSN: process.env.SENTRY_DSN || "",
    SENTRY_ENV: process.env.SENTRY_ENV || "",
    ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "*",
    API_DOMAIN_NAME: process.env.API_DOMAIN_NAME || "",
    SES_REGION: process.env.SES_REGION || "",
    SES_VERIFIED_DOMAIN: process.env.SES_VERIFIED_DOMAIN || "",
  },
} as StackConfig.Config;
