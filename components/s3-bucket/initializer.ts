import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { GrantPublicReadAccess } from '../../permissions/access';

export function InitializeBucket(scope: Construct, bucketName: string): s3.Bucket {
    // Create the S3 bucket
    const bucket = new s3.Bucket(scope, bucketName, {
        bucketName,
        versioned: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
        publicReadAccess: true,
    });

    // Grant public read access
    GrantPublicReadAccess(bucket);

    return bucket;
}
