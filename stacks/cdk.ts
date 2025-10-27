import * as cdk from "aws-cdk-lib";
import { stackConfig } from "./config";
import { MainStack } from "./stack";

const app = new cdk.App();

new MainStack(app, stackConfig.stackName, {
  stackName: stackConfig.stackName,
});
