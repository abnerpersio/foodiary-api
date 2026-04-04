import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import type { Construct } from "constructs";
import { createFunctionAsset } from "stacks/utils";
import { stackConfig } from "../config";

type SQSProps = {
  environment: Record<string, string>;
};

export class SQSStack extends cdk.Stack {
  public readonly mealsQueue: sqs.Queue;
  public readonly mealsQueueDLQ: sqs.Queue;

  private readonly role: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    private readonly sqsProps: SQSProps,
  ) {
    super(scope, id, {
      stackName: stackConfig.stackName.concat("-sqs"),
    });

    this.role = this.createRole();

    this.mealsQueueDLQ = new sqs.Queue(this, "ProcessMealQueueDLQ", {
      retentionPeriod: cdk.Duration.days(5),
    });

    this.mealsQueue = new sqs.Queue(this, "ProcessMealQueue", {
      visibilityTimeout: cdk.Duration.seconds(130),
      receiveMessageWaitTime: cdk.Duration.seconds(20),
      deadLetterQueue: {
        queue: this.mealsQueueDLQ,
        maxReceiveCount: 2,
      },
    });
  }

  private createLambda(fnPath: string, fnName: string) {
    const { handler, asset } = createFunctionAsset(fnPath);

    const logGroup = new logs.LogGroup(
      this,
      `${stackConfig.stackName}-${fnName}-logs`,
      {
        logGroupName: `/aws/lambda/${stackConfig.stackName}-${fnName}`,
        retention: logs.RetentionDays.ONE_WEEK,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    const functionName = `${stackConfig.projectName}-${fnName}`;
    return new lambda.Function(this, fnName, {
      functionName,
      runtime: stackConfig.lambda.runtime,
      handler,
      memorySize: 128,
      role: this.role,
      timeout: cdk.Duration.seconds(120),
      code: lambda.Code.fromAsset(asset),
      logGroup,
      environment: {
        ...this.sqsProps.environment,
        ENV_IGNORE_SETUP: "true",
      },
    });
  }

  private createRole() {
    const role = new iam.Role(this, `${stackConfig.projectName}-lambda-role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: `Role used by ${stackConfig.projectName} SQS Trigger Lambda functions`,
    });

    // role.addToPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: [
    //       "dynamodb:PutItem",
    //       "dynamodb:GetItem",
    //       "dynamodb:UpdateItem",
    //       "dynamodb:DeleteItem",
    //       "dynamodb:Query",
    //     ],
    //     resources: [this.s3Props.tableArn, `${this.s3Props.tableArn}/index/*`],
    //   }),
    // );

    // role.addToPolicy(
    //   new iam.PolicyStatement({
    //     effect: iam.Effect.ALLOW,
    //     actions: ["s3:GetObject"],
    //     resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
    //   }),
    // );

    role.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole",
      ),
    );

    return role;
  }
}
