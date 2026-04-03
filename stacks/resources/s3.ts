import * as cdk from "aws-cdk-lib";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as s3 from "aws-cdk-lib/aws-s3";
import type { Construct } from "constructs";
import { stackConfig } from "../config";

export class S3Stack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly cdn: cloudfront.Distribution;

  constructor(scope: Construct, id: string) {
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
