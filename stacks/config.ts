import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "node:path";

const environment = process.env.ENVIRONMENT || "prod";

export const BUILD_BASE_PATH = path.join(__dirname, "..", "lambda-pkg");

const projectName = "foodiary-api";
const projectNameWithEnv = `${projectName}-${environment}`;

namespace StackConfig {
  export type Config = {
    stackName: string;
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
      preSignUpEnabled: boolean;
      preSignUpFnPath?: string;
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
    preSignUpEnabled: true,
    preSignUpFnPath: "auth/cognito/pre-sign-up-trigger",
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
  },
} satisfies StackConfig.Config;
