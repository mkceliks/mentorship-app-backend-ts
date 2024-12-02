import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { Config } from '../config/config';
import { InitializeBucket } from '../components/s3-bucket/initializer';
import {InitializePackageTable, InitializeProfileTable} from '../components/dynamo-db/initializer';
import { InitializeLambda } from '../components/lambda/initializer';
import { InitializeUserPool } from '../components/cognito/pool';
import { InitializeCognitoAuthorizer } from '../components/cognito/authorizer';
import {
  ConfirmLambdaName,
  DeleteLambdaName,
  DownloadLambdaName,
  InitializeAPI,
  ListLambdaName,
  LoginLambdaName,
  MeLambdaName,
  RegisterLambdaName,
  ResendLambdaName,
  UploadLambdaName,
  ProfileUpdateLambdaName,
  AddPackageLambdaName,
  GetPackageLambdaName,
  DeletePackageLambdaName,
  ListMentorPackagesLambdaName
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
    const packageTable = InitializePackageTable(this, config.mentorPackagesDDBTableName, removalPolicy);

    const lambdas = {
      'upload': InitializeLambda(this, s3Bucket, profileTable, UploadLambdaName,{}, config),
      'register': InitializeLambda(this, null, profileTable, RegisterLambdaName,{}, config),
      'login': InitializeLambda(this, null, profileTable, LoginLambdaName,{}, config),
      'download': InitializeLambda(this, s3Bucket, profileTable, DownloadLambdaName,{}, config),
      'list': InitializeLambda(this, s3Bucket, profileTable, ListLambdaName,{}, config),
      'delete': InitializeLambda(this, s3Bucket, profileTable, DeleteLambdaName,{}, config),
      'me': InitializeLambda(this, null, profileTable, MeLambdaName,{}, config),
      'confirm': InitializeLambda(this, null, profileTable, ConfirmLambdaName,{}, config),
      'resend': InitializeLambda(this, null , profileTable, ResendLambdaName,{}, config),
      'profile-update': InitializeLambda(this, s3Bucket, profileTable, ProfileUpdateLambdaName, {}, config),
      'add-package': InitializeLambda(this, null, packageTable, AddPackageLambdaName, {}, config),
      'get-package': InitializeLambda(this, null, packageTable, GetPackageLambdaName, {}, config),
      'delete-package': InitializeLambda(this, null, packageTable, DeletePackageLambdaName, {}, config),
      'list-packages': InitializeLambda(this, null, packageTable, ListMentorPackagesLambdaName, {}, config),
    };

    const userPool = InitializeUserPool(this, config.userPoolName, config.cognitoPoolArn);
    const cognitoAuthorizer = InitializeCognitoAuthorizer(this, config.cognitoAuthorizer, userPool);

    const apiInstance = InitializeAPI(this, lambdas, cognitoAuthorizer, config.environment);

    CreateCloudFrontDistribution(this, apiInstance, config.environment);

    console.log('Stack initialization complete.');
  }
}
