import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {
    GrantAccessForBucket,
    GrantCognitoConfirmationPermissions,
    GrantCognitoDescribePermissions,
    GrantCognitoLoginPermissions,
    GrantCognitoRegisterPermissions,
    GrantCognitoResendPermissions,
    GrantCognitoTokenValidationPermissions,
    GrantDynamoDBPermissions,
    GrantLambdaInvokePermission,
    GrantSecretManagerReadWritePermissions
} from '../../permissions/access';
import { Config } from '../../config/config';
import {
    ConfirmLambdaName,
    LoginLambdaName,
    RegisterLambdaName,
    ResendLambdaName,
    UploadLambdaName
} from "../../api/router";

export function InitializeLambda(
    scope: Construct,
    bucket: s3.Bucket,
    table: dynamodb.Table,
    functionName: string,
    dependentLambdas: Record<string, lambda.Function>,
    config: Config
): lambda.Function {
    const fullFunctionName = `${functionName}-${config.environment}`;

    const envVars = getLambdaEnvironmentVars(
        config.cognitoClientId,
        config.cognitoPoolArn,
        config.environment,
        bucket.bucketName,
        table.tableName,
        config
    );

    console.log(`Creating Lambda function: ${fullFunctionName} with environment variables:`, envVars);

    const lambdaFunction = new lambda.Function(scope, fullFunctionName, {
        runtime: lambda.Runtime.NODEJS_18_X,
        handler: `${functionName}.handler`,
        functionName: fullFunctionName,
        code: lambda.Code.fromAsset(`./output/${functionName}_function.zip`),
        environment: envVars,
        timeout: cdk.Duration.seconds(15),
    });

    grantPermissions(lambdaFunction, dependentLambdas, functionName, bucket, table, config);

    return lambdaFunction;
}

function getLambdaEnvironmentVars(
    cognitoClientID: string,
    arn: string,
    environment: string,
    bucketName: string,
    tableName: string,
    config: Config
): { [key: string]: string } {
    return {
        BUCKET_NAME: bucketName,
        ENVIRONMENT: environment,
        COGNITO_CLIENT_ID: cognitoClientID,
        COGNITO_POOL_ARN: arn,
        ACCOUNT: config.account,
        REGION: config.region,
        SLACK_WEBHOOK_SECRET_ARN: config.slackWebhookSecretArn,
        DDB_TABLE_NAME: tableName,
    };
}

export function grantPermissions(
    lambdaFunction: lambda.Function,
    dependentLambdas: Record<string, lambda.Function>,
    functionName: string,
    bucket: s3.Bucket,
    table: dynamodb.Table,
    config: Config
) {
    switch (functionName) {
        case RegisterLambdaName:
            GrantCognitoRegisterPermissions(lambdaFunction);
            if (dependentLambdas[UploadLambdaName]) {
                GrantLambdaInvokePermission(lambdaFunction, dependentLambdas[UploadLambdaName]);
            }
            break;
        case LoginLambdaName:
            GrantCognitoLoginPermissions(lambdaFunction, config.cognitoPoolArn);
            break;
        case ConfirmLambdaName:
            GrantCognitoConfirmationPermissions(lambdaFunction, config.cognitoPoolArn);
            break;
        case ResendLambdaName:
            GrantCognitoResendPermissions(lambdaFunction, config.cognitoPoolArn);
            break;
        default:
            GrantAccessForBucket(lambdaFunction, bucket, functionName);
            GrantCognitoDescribePermissions(lambdaFunction, config.cognitoPoolArn);
            GrantCognitoTokenValidationPermissions(lambdaFunction, config.cognitoPoolArn);
    }

    GrantDynamoDBPermissions(lambdaFunction, table);
    GrantSecretManagerReadWritePermissions(lambdaFunction, config.slackWebhookSecretArn);
}
