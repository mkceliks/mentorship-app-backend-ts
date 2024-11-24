import * as s3 from 'aws-cdk-lib/aws-s3';
import { Construct } from 'constructs';
import { GrantPublicReadAccess } from '../../permissions/access';

export function InitializeBucket(scope: Construct, bucketName: string): s3.Bucket {
    const bucket = new s3.Bucket(scope, bucketName, {
        bucketName,
        versioned: false,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
        publicReadAccess: true,
    });

    GrantPublicReadAccess(bucket);

    return bucket;
}
