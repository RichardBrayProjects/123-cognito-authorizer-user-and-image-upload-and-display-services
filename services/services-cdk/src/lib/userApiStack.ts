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
  CognitoUserPoolsAuthorizer,
  AuthorizationType,
} from "aws-cdk-lib/aws-apigateway";
import { UserPool } from "aws-cdk-lib/aws-cognito";
import {
  HostedZone,
  ARecord,
  AaaaRecord,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { ApiGatewayDomain } from "aws-cdk-lib/aws-route53-targets";
import {
  Certificate,
  CertificateValidation,
} from "aws-cdk-lib/aws-certificatemanager";

interface UserApiStackProps extends StackProps {
  domainName?: string;
  hostedZoneId?: string;
  hostedZoneName?: string;
  apiSubdomain?: string;
  userPool: UserPool;
}

export class UserApiStack extends Stack {
  public readonly apiUrl: string;

  constructor(scope: Construct, id: string, props: UserApiStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId, hostedZoneName, apiSubdomain } = props;

    if (!hostedZoneName || !hostedZoneId || !domainName) {
      throw new Error(
        "Unexpected missing hostedZone || hostedZoneId || domainName"
      );
    }

    const apiDomainName = `${apiSubdomain}.${domainName}`;
    this.apiUrl = `https://${apiDomainName}`;

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
    const lambdaFunction = new NodejsFunction(this, "UserServiceFunction", {
      entry: "../user/src/index.ts",
      handler: "handler",
      runtime: Runtime.NODEJS_20_X,
      timeout: Duration.seconds(30),
      memorySize: 256,
      bundling: {
        minify: true,
        sourceMap: false,
        target: "es2021",
        nodeModules: ["express", "cors"],
      },
      environment: {
        API_URL: this.apiUrl,
        // Note: AWS_REGION is automatically set by Lambda runtime, don't set it manually
      },
    });

    // Create API Gateway
    const api = new RestApi(this, "UserApi", {
      restApiName: "User Service API",
      description: "API Gateway for User Service",
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

    // Create Cognito authorizer
    const authorizer = new CognitoUserPoolsAuthorizer(
      this,
      "CognitoAuthorizer",
      {
        cognitoUserPools: [props.userPool],
        identitySource: "method.request.header.Authorization",
      }
    );

    const lambdaIntegration = new LambdaIntegration(lambdaFunction, {
      proxy: true,
    });

    const v1Resource = api.root.addResource("v1");

    // Public /v1/config endpoint
    v1Resource.addResource("config").addMethod("GET", lambdaIntegration, {
      authorizationType: AuthorizationType.NONE,
    });

    // All other /v1/* routes require Cognito authentication
    v1Resource.addResource("{proxy+}").addMethod("ANY", lambdaIntegration, {
      authorizationType: AuthorizationType.COGNITO,
      authorizer: authorizer,
    });

    // Public /health endpoint
    api.root.addResource("health").addMethod("GET", lambdaIntegration, {
      authorizationType: AuthorizationType.NONE,
    });

    new CfnOutput(this, "ApiUrl", {
      value: `https://${apiDomainName}`,
    });

    new CfnOutput(this, "ApiGatewayUrl", {
      value: api.url,
    });
  }
}
