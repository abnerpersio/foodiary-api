import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "node:path";

const environment = process.env.ENVIRONMENT || "prod";

export const BUILD_BASE_PATH = path.join(__dirname, "..", "lambda-pkg");

const projectName = "foodiary-api";
const projectNameWithEnv = `${projectName}-${environment}`;

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
  cognito: {
    userPoolName: `${projectNameWithEnv}-pool`,
    userPoolDomainName: projectName,
    oauthBaseCallbacks: ["http://localhost:5173"],
    preSignUpEnabled: true,
    preSignUpPath: "cognito/pre-sign-up-trigger.js",
  },
  dynamo: {
    tableName: `${projectNameWithEnv}-MainTable`,
    pointInTimeRecoveryEnabled: false,
    recoveryPeriodInDays: undefined,
  },
};
