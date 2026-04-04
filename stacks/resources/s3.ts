import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as logs from "aws-cdk-lib/aws-logs";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3Notification from "aws-cdk-lib/aws-s3-notifications";
import type { Construct } from "constructs";
import { createFunctionAsset } from "stacks/utils";
import { stackConfig } from "../config";

type S3Props = {
  environment: Record<string, string>;
  tableArn: string;
};

export class S3Stack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly cdn: cloudfront.Distribution;
  public readonly cdnDomainName: string;

  private readonly role: iam.Role;

  constructor(
    scope: Construct,
    id: string,
    private readonly s3Props: S3Props,
  ) {
    super(scope, id, {
      stackName: stackConfig.stackName.concat("-s3"),
    });

    this.bucket = new s3.Bucket(this, "StorageBucket", {
      bucketName: stackConfig.storage.bucketName,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
          id: "auto-delete-mpus-after-1-day",
        },
      ],
    });

    const hasCustomDomain =
      !!stackConfig.cdn?.domainName &&
      !!stackConfig.route53?.hostedZoneId &&
      !!stackConfig.route53?.hostedZoneName;

    this.cdn = new cloudfront.Distribution(this, "StorageBucketCDN", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket),
        compress: true,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      certificate: this.getCertificate(),
    });
    cdk.Tags.of(this.cdn).add("Name", stackConfig.stackName.concat("-cdn"));

    this.cdnDomainName = hasCustomDomain
      ? stackConfig.cdn.domainName!
      : this.cdn.domainName;

    this.role = this.createRole();
    this.createTriggers();
  }

  private createTriggers() {
    this.bucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3Notification.LambdaDestination(
        this.createLambda(
          stackConfig.storage.mealsFileUpdloadedFnPath,
          "on-meal-file-uploaded",
        ),
      ),
    );
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
      timeout: cdk.Duration.seconds(30),
      code: lambda.Code.fromAsset(asset),
      logGroup,
      environment: {
        ...this.s3Props.environment,
        STORAGE_BUCKET_NAME: this.bucket.bucketName,
        CDN_DOMAIN_NAME: this.cdnDomainName,
        ENV_IGNORE_SETUP: "true",
      },
    });
  }

  private createRole() {
    const role = new iam.Role(this, `${stackConfig.projectName}-lambda-role`, {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      description: `Role used by ${stackConfig.projectName} S3 Trigger Lambda functions`,
    });

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:Query",
        ],
        resources: [this.s3Props.tableArn, `${this.s3Props.tableArn}/index/*`],
      }),
    );

    role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:GetObject"],
        resources: [this.bucket.bucketArn, `${this.bucket.bucketArn}/*`],
      }),
    );

    role.addManagedPolicy(
      cdk.aws_iam.ManagedPolicy.fromAwsManagedPolicyName(
        "service-role/AWSLambdaBasicExecutionRole",
      ),
    );

    return role;
  }

  private getCertificate() {
    const hasCustomDomain =
      !!stackConfig.cdn?.domainName &&
      !!stackConfig.route53?.hostedZoneId &&
      !!stackConfig.route53?.hostedZoneName;

    if (!hasCustomDomain) return undefined;

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "CustomCDNDomainHostedZone",
      {
        hostedZoneId: stackConfig.route53.hostedZoneId,
        zoneName: stackConfig.route53.hostedZoneName,
      },
    );

    return new acm.Certificate(this, "CustomDomainCertificate", {
      domainName: stackConfig.cdn.domainName!,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });
  }
}
