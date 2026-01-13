import { Construct } from "constructs";
import {
  Stack,
  StackProps,
  Duration,
  CfnOutput,
  RemovalPolicy,
} from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import {
  RestApi,
  DomainName,
  EndpointType,
  SecurityPolicy,
  LambdaIntegration,
} from "aws-cdk-lib/aws-apigateway";
import { HostedZone, ARecord, AaaaRecord, RecordTarget } from "aws-cdk-lib/aws-route53";
import { ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

interface ImageApiStackProps extends StackProps {
  domainName?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  apiSubdomain?: string;
}

export class ImageApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ImageApiStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId, hostedZoneName, apiSubdomain } = props;

    if (!hostedZoneName || !hostedZoneId || !domainName) {
      throw new Error(
        "Unexpected missing hostedZone || hostedZoneId || domainName"
      );
    }

    const apiDomainName = `${apiSubdomain}.${domainName}`;

    const zone = HostedZone.fromHostedZoneAttributes(
      this,
      "ImportedHostedZone",
      {
        hostedZoneId,
        zoneName: hostedZoneName,
      }
    );

    // Create certificate for API subdomain
    const certificate = new Certificate(this, "ApiCertificate", {
      domainName: apiDomainName,
      validation: CertificateValidation.fromDns(zone),
    });
    // Retain certificate on stack deletion to avoid deletion failures
    // when it's still attached to API Gateway domain
    certificate.applyRemovalPolicy(RemovalPolicy.RETAIN);

    // Create Lambda function using NodejsFunction for automatic bundling
    const lambdaFunction = new NodejsFunction(this, "ImageServiceFunction", {
      entry: "../image/src/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: false,
        target: "es2021",
      },
    });

    // Create API Gateway
    const api = new RestApi(this, "ImageApi", {
      restApiName: "Image Service API",
      description: "API Gateway for Image Service",
      endpointConfiguration: {
        types: [EndpointType.REGIONAL],
      },
    });

    // Create custom domain
    const apiDomain = new DomainName(this, "ApiDomain", {
      domainName: apiDomainName,
      certificate: certificate,
      securityPolicy: SecurityPolicy.TLS_1_2,
      endpointType: EndpointType.REGIONAL,
    });

    // Create base path mapping
    apiDomain.addBasePathMapping(api, {
      basePath: "",
    });

    // Create Route53 records
    new ARecord(this, "ApiARecord", {
      zone,
      recordName: apiSubdomain,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(apiDomain)),
    });

    new AaaaRecord(this, "ApiAaaaRecord", {
      zone,
      recordName: apiSubdomain,
      target: RecordTarget.fromAlias(new ApiGatewayDomain(apiDomain)),
    });

    // Add Lambda integration to API Gateway
    const lambdaIntegration = new LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    api.root.addProxy({
      defaultIntegration: lambdaIntegration,
    });

    new CfnOutput(this, "ApiUrl", {
      value: `https://${apiDomainName}`,
    });

    new CfnOutput(this, "ApiGatewayUrl", {
      value: api.url,
    });
  }
}
