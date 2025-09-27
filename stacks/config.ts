import * as lambda from "aws-cdk-lib/aws-lambda";

const environment = process.env.ENVIRONMENT || "production";

export const BUILD_BASE_PATH = "lambda-pkg";

const projectName = "relatorio-ensaios";
const projectNameWithEnv = `${environment}-${projectName}`;

export const stackConfig = {
  // userPoolName: `${projectNameWithEnv}-pool`,
  // userPoolDomainName: projectName,
  // oauthBaseCallbacks: ["http://localhost:5173"],
  environment,
  projectName: `${projectNameWithEnv}`,
  apiName: "relatorio-ensaios-api",
  // storageBucketName: `${projectNameWithEnv}-storage`,
  storageBucketName: "relatorio-ensaios-storage",
  runtime: lambda.Runtime.NODEJS_22_X,
};
