#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { UserApiStack } from "../lib/userApiStack";

const app = new cdk.App();

const domainName: string | undefined = process.env.CDK_UPTICK_DOMAIN_NAME;
const hostedZoneName = process.env.CDK_UPTICK_ZONE_NAME;
const hostedZoneId = process.env.CDK_UPTICK_ZONE_ID;

if (!hostedZoneId || !hostedZoneName || !domainName) {
  throw new Error(
    "Missing environment variable(s): CDK_UPTICK_ZONE_ID CDK_UPTICK_ZONE_NAME CDK_UPTICK_DOMAIN_NAME must be set."
  );
}

// Create User API stack
// This stack will read the UserPool ARN from SSM parameter /cognito/user-pool-arn
new UserApiStack(app, "user-api", {
  domainName,
  hostedZoneName,
  hostedZoneId,
  apiSubdomain: "user-api",
});
