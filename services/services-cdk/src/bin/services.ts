#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { UserApiStack } from "../lib/userApiStack";
import { ImageApiStack } from "../lib/imageApiStack";
import { CognitoPostConfirmationStack } from "../lib/cognitoPostConfirmationStack";
import { CognitoStack } from "../lib/cognitoStack";

const app = new cdk.App();

const domainName: string | undefined = process.env.CDK_UPTICK_DOMAIN_NAME;
const hostedZoneName = process.env.CDK_UPTICK_ZONE_NAME;
const hostedZoneId = process.env.CDK_UPTICK_ZONE_ID;
const userApiSubdomain = process.env.CDK_UPTICK_USER_API_SUBDOMAIN;
const imageApiSubdomain = process.env.CDK_UPTICK_IMAGE_API_SUBDOMAIN;
const dbname = process.env.CDK_UPTICK_DB_NAME;

if (
  !hostedZoneId ||
  !hostedZoneName ||
  !domainName ||
  !userApiSubdomain ||
  !imageApiSubdomain ||
  !dbname
) {
  throw new Error(
    "Missing environment variable(s): CDK_UPTICK_ZONE_ID CDK_UPTICK_ZONE_NAME CDK_UPTICK_DOMAIN_NAME CDK_UPTICK_USER_API_SUBDOMAIN CDK_UPTICK_IMAGE_API_SUBDOMAIN CDK_UPTICK_DB_NAME must be set."
  );
}

// Derive frontend URL from domain name (e.g., if domain is uptickart.com, frontend is https://uptickart.com)
const cloudfrontUrl = `https://www.${domainName}`;

const systemName = "uptickart";

// Create Cognito PostConfirmation stack
// This stack will automatically look up RDS secret ARN from SSM parameter /rds/secret-arn
const postConfirmationStack = new CognitoPostConfirmationStack(
  app,
  "user-cognito-post-confirmation-stack",
  {
    systemName,
    dbname,
  }
);

// Create Cognito stack first (needed for both UserApiStack and ImageApiStack)
// This stack will automatically look up RDS secret ARN from SSM parameter /rds/secret-arn
const cognitoStack = new CognitoStack(app, "user-cognito-stack", {
  systemName,
  postConfirmationLambda: postConfirmationStack.postConfirmationLambda,
  apiUrl: `https://${userApiSubdomain}.${domainName}`, // Temporary URL, will be updated after UserApiStack is created
  cloudfrontUrl,
});

// Create User API stack
new UserApiStack(app, "user-api", {
  domainName,
  hostedZoneName,
  hostedZoneId,
  apiSubdomain: userApiSubdomain,
  userPool: cognitoStack.userPool,
});

// Create Image API stack (using the same userPool from cognitoStack)
new ImageApiStack(app, "image-api", {
  domainName,
  hostedZoneName,
  hostedZoneId,
  apiSubdomain: imageApiSubdomain,
  userPool: cognitoStack.userPool,
});
