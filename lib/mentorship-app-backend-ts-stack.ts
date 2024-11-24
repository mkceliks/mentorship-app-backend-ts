import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Config } from '../config/config';
import { InitializeBucket } from '../components/s3-bucket/initializer';
import { InitializeProfileTable } from '../components/dynamo-db/initializer';
import { InitializeLambda } from '../components/lambda/initializer';
import { InitializeUserPool } from '../components/cognito/pool';
import { InitializeCognitoAuthorizer } from '../components/cognito/authorizer';
import {
  ConfirmLambdaName,
  DeleteLambdaName,
  DownloadLambdaName,
  InitializeAPI,
  ListLambdaName,
  LoginLambdaName, MeLambdaName,
  RegisterLambdaName, ResendLambdaName, UploadLambdaName
} from '../api/router';
import { CreateCloudFrontDistribution } from '../components/cloudfront/initializer';

export class MentorshipAppBackendTsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: cdk.StackProps, config: Config) {
    super(scope, id, props);

    console.log(`Initializing stack for environment: ${config.environment}`);

    const s3Bucket = InitializeBucket(this, config.bucketName);
    console.log(`Bucket Name: ${s3Bucket.bucketName}`);

    const removalPolicy = config.environment === 'staging' ? cdk.RemovalPolicy.DESTROY : cdk.RemovalPolicy.RETAIN;
    const profileTable = InitializeProfileTable(this, config.userProfileDDBTableName, removalPolicy);

    const uploadLambda = InitializeLambda(this, s3Bucket, profileTable, UploadLambdaName,{}, config);
    const lambdas = {
      upload: uploadLambda,
      register: InitializeLambda(this, s3Bucket, profileTable, RegisterLambdaName,{ uploadLambda }, config, ),
      login: InitializeLambda(this, s3Bucket, profileTable, LoginLambdaName,{}, config),
      download: InitializeLambda(this, s3Bucket, profileTable, DownloadLambdaName,{}, config),
      list: InitializeLambda(this, s3Bucket, profileTable, ListLambdaName,{}, config),
      delete: InitializeLambda(this, s3Bucket, profileTable, DeleteLambdaName,{}, config),
      me: InitializeLambda(this, s3Bucket, profileTable, MeLambdaName,{}, config),
      confirm: InitializeLambda(this, s3Bucket, profileTable, ConfirmLambdaName,{}, config),
      resend: InitializeLambda(this, s3Bucket, profileTable, ResendLambdaName,{}, config),
    };

    const userPool = InitializeUserPool(this, config.userPoolName, config.cognitoPoolArn);
    const cognitoAuthorizer = InitializeCognitoAuthorizer(this, config.cognitoAuthorizer, userPool);

    const apiInstance = InitializeAPI(this, lambdas, cognitoAuthorizer, config.environment);

    CreateCloudFrontDistribution(this, apiInstance, config.environment);

    console.log('Stack initialization complete.');
  }
}
