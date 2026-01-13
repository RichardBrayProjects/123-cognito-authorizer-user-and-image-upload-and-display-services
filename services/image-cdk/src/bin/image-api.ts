#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ImageApiStack } from "../lib/imageApiStack";

const app = new cdk.App();

const domainName: string | undefined = process.env.CDK_UPTICK_DOMAIN_NAME;
const hostedZoneName = process.env.CDK_UPTICK_ZONE_NAME;
const hostedZoneId = process.env.CDK_UPTICK_ZONE_ID;
const apiSubdomain = process.env.CDK_UPTICK_IMAGE_API_SUBDOMAIN;

if (!hostedZoneId || !hostedZoneName || !domainName || !apiSubdomain) {
  throw new Error(
    "Missing environment variable(s): CDK_UPTICK_ZONE_ID CDK_UPTICK_ZONE_NAME CDK_UPTICK_DOMAIN_NAME CDK_UPTICK_IMAGE_API_SUBDOMAIN must be set."
  );
}

// CDK will automatically use the default region from AWS config if env is not specified
new ImageApiStack(app, "image-api", {
  domainName,
  hostedZoneName,
  hostedZoneId,
  apiSubdomain,
});
