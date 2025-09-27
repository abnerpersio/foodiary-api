import * as lambda from "aws-cdk-lib/aws-lambda";
import path from "node:path";

const environment = process.env.ENVIRONMENT || "production";

export const BUILD_BASE_PATH = path.join(__dirname, "..", "lambda-pkg");

const projectName = "relatorio-ensaios";
const projectNameWithEnv = `${environment}-${projectName}`;

export const stackConfig = {
  userPoolName: `${projectNameWithEnv}-pool`,
  userPoolDomainName: projectName,
  oauthBaseCallbacks: ["http://localhost:5173"],
  environment,
  projectName: `${projectNameWithEnv}`,
  apiName: "relatorio-ensaios-api",
  storageBucketName: `${projectNameWithEnv}-storage`,
  runtime: lambda.Runtime.NODEJS_22_X,
  apiKeyRequired: true,
  preSignUpPath: "pre-sign-up-trigger.js",
};
