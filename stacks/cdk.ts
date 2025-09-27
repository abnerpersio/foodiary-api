import * as cdk from "aws-cdk-lib";
import { RelatorioEnsaiosStack } from "./stack";

const app = new cdk.App();

new RelatorioEnsaiosStack(app, "RelatorioEnsaiosStack");
