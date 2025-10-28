import * as cdk from "aws-cdk-lib";
import * as apigatewayv2 from "aws-cdk-lib/aws-apigatewayv2";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as targets from "aws-cdk-lib/aws-route53-targets";
import type { Construct } from "constructs";
import { stackConfig } from "../config";

type ApiCustomDomainProps = {
  api: apigatewayv2.IHttpApi;
};

export class ApiCustomDomainStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    apiCustomDomainProps: ApiCustomDomainProps
  ) {
    super(scope, id, {
      stackName: stackConfig.stackName.concat("-apigateway-customdomain"),
    });

    const hostedZone = route53.HostedZone.fromHostedZoneAttributes(
      this,
      "CustomDomainHostedZone",
      {
        hostedZoneId: stackConfig.apiDomain.hostedZoneId,
        zoneName: stackConfig.apiDomain.hostedZoneName,
      }
    );

    const certificate = new acm.Certificate(this, "CustomDomainCertificate", {
      domainName: stackConfig.apiDomain.name,
      validation: acm.CertificateValidation.fromDns(hostedZone),
    });

    const domainName = new apigatewayv2.DomainName(
      this,
      "ApiCustomDomainName",
      {
        certificate,
        domainName: stackConfig.apiDomain.name,
      }
    );

    new apigatewayv2.ApiMapping(this, "ApiMapping", {
      api: apiCustomDomainProps.api,
      domainName,
    });

    const aliasTarget = new targets.ApiGatewayv2DomainProperties(
      domainName.regionalDomainName,
      domainName.regionalHostedZoneId
    );
    new route53.RecordSet(this, "ApiCustomDomainDNSRecord", {
      zone: hostedZone,
      recordType: route53.RecordType.A,
      recordName: stackConfig.apiDomain.name,
      target: route53.RecordTarget.fromAlias(aliasTarget),
    });
  }
}
