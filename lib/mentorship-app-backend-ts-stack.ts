import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
// @ts-ignore
import * as origins from '@aws-cdk/aws-cloudfront-origins';
import { Config } from '../config/config';
import { InitializeBucket } from '../components/s3-bucket/initializer';
import { InitializeProfileTable } from '../components/dynamo-db/initializer';
import { InitializeLambda } from '../components/lambda/initializer';
import { InitializeUserPool } from '../components/cognito/pool';
import { InitializeCognitoAuthorizer } from '../components/cognito/authorizer';
import { InitializeAPI } from '../api/router';
import { CreateCloudFrontDistribution } from '../components/cloudfront/initializer';

export class MentorshipAppBackendTsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps, config: Config) {
    super(scope, id, props);

    console.log(`Initializing stack for environment: ${config.environment}`);

    // S3 Bucket
    const s3Bucket = InitializeBucket(this, config.bucketName);
    console.log(`Bucket Name: ${s3Bucket.bucketName}`);

    // DynamoDB Table
    const removalPolicy = config.environment === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
    const profileTable = InitializeProfileTable(this, config.userProfileDDBTableName, removalPolicy);

    // Lambda Functions
    const uploadLambda = InitializeLambda(this, s3Bucket, profileTable, 'UploadLambda',{}, config);
    const lambdas = {
      upload: uploadLambda,
      register: InitializeLambda(this, s3Bucket, profileTable, 'RegisterLambda',{ uploadLambda }, config, ),
      login: InitializeLambda(this, s3Bucket, profileTable, 'LoginLambda',{}, config),
      download: InitializeLambda(this, s3Bucket, profileTable, 'DownloadLambda',{}, config),
      list: InitializeLambda(this, s3Bucket, profileTable, 'ListLambda',{}, config),
      delete: InitializeLambda(this, s3Bucket, profileTable, 'DeleteLambda',{}, config),
      me: InitializeLambda(this, s3Bucket, profileTable, 'MeLambda',{}, config),
      confirm: InitializeLambda(this, s3Bucket, profileTable, 'ConfirmLambda',{}, config),
      resend: InitializeLambda(this, s3Bucket, profileTable, 'ResendLambda',{}, config),
    };

    // Cognito User Pool and Authorizer
    const userPool = InitializeUserPool(this, config.userPoolName, config.cognitoPoolArn);
    const cognitoAuthorizer = InitializeCognitoAuthorizer(this, config.cognitoAuthorizer, userPool);

    // API Gateway
    const apiInstance = InitializeAPI(this, lambdas, cognitoAuthorizer, config.environment);

    // CloudFront Distribution
    CreateCloudFrontDistribution(this, apiInstance, config.environment);

    console.log('Stack initialization complete.');
  }
}
