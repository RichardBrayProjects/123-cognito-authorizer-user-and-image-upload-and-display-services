#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { CognitoPostConfirmationStack } from "../lib/cognitoPostConfirmationStack";
import { CognitoStack } from "../lib/cognitoStack";

const app = new cdk.App();

const domainName: string | undefined = process.env.CDK_UPTICK_DOMAIN_NAME;
const dbname = process.env.CDK_UPTICK_DB_NAME;

if (!domainName || !dbname) {
  throw new Error(
    "Missing environment variable(s): CDK_UPTICK_DOMAIN_NAME CDK_UPTICK_DB_NAME must be set."
  );
}

// Derive frontend URL from domain name (UI CloudFront is on www.uptickart.com)
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

// Create Cognito stack
// This stack will automatically look up RDS secret ARN from SSM parameter /rds/secret-arn
// It will store the UserPool ARN in SSM parameter /cognito/user-pool-arn for other stacks to use
new CognitoStack(app, "user-cognito-stack", {
  systemName,
  postConfirmationLambda: postConfirmationStack.postConfirmationLambda,
  apiUrl: `https://user-api.${domainName}`, // User API URL
  cloudfrontUrl,
});
