#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { ImageApiStack } from "../lib/imageApiStack";

const app = new cdk.App();

const domainName: string | undefined = process.env.CDK_UPTICK_DOMAIN_NAME;
const hostedZoneName = process.env.CDK_UPTICK_ZONE_NAME;
const hostedZoneId = process.env.CDK_UPTICK_ZONE_ID;
const dbname = process.env.CDK_UPTICK_DB_NAME;
const imagesS3BucketName = process.env.CDK_UPTICK_IMAGES_S3_BUCKET_NAME;

if (
  !hostedZoneId ||
  !hostedZoneName ||
  !domainName ||
  !dbname ||
  !imagesS3BucketName
) {
  throw new Error(
    "Missing environment variable(s): CDK_UPTICK_ZONE_ID CDK_UPTICK_ZONE_NAME CDK_UPTICK_DOMAIN_NAME CDK_UPTICK_DB_NAME CDK_UPTICK_IMAGES_S3_BUCKET_NAME must be set."
  );
}

// Images CloudFront domain (images.uptickart.com)
const imagesCloudFrontDomain = `images.${domainName}`;

// Create Image API stack
// This stack will read the UserPool ARN from SSM parameter /cognito/user-pool-arn
new ImageApiStack(app, "image-api", {
  domainName,
  hostedZoneName,
  hostedZoneId,
  apiSubdomain: "image-api",
  dbname,
  imagesS3BucketName,
  imagesCloudFrontDomain,
});
