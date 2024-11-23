import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as sqs from 'aws-cdk-lib/aws-sqs';

export function GrantAccessForBucket(lambdaFunction: lambda.Function, bucket: s3.Bucket, functionName: string): void {
    if (functionName === 'upload' || functionName === 'delete') {
        bucket.grantReadWrite(lambdaFunction);
    } else if (functionName === 'download' || functionName === 'list') {
        bucket.grantRead(lambdaFunction);
    }
}

export function GrantCognitoConfirmationPermissions(lambdaFunction: lambda.Function, cognitoPoolArn: string): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['cognito-idp:ConfirmSignUp', 'cognito-idp:DescribeUserPool'],
            resources: [cognitoPoolArn],
        })
    );
}

export function GrantPublicReadAccess(bucket: s3.Bucket): void {
    bucket.addToResourcePolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['s3:GetObject'],
            resources: [`${bucket.bucketArn}/*`],
            principals: [new iam.AnyPrincipal()],
        })
    );
}

export function GrantLambdaInvokePermission(
    sourceLambda: lambda.Function,
    targetLambda: lambda.Function
): void {
    sourceLambda.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['lambda:InvokeFunction'],
            resources: [targetLambda.functionArn],
        })
    );
}

export function GrantCognitoRegisterPermissions(lambdaFunction: lambda.Function): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            actions: [
                'cognito-idp:SignUp',
                'cognito-idp:AdminCreateUser',
                'cognito-idp:AdminDeleteUser',
                'cognito-idp:AdminUpdateUserAttributes',
            ],
            resources: ['*'],
        })
    );
}

export function GrantCognitoLoginPermissions(lambdaFunction: lambda.Function, cognitoPoolArn: string): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['cognito-idp:AdminInitiateAuth', 'cognito-idp:AdminGetUser'],
            resources: [cognitoPoolArn],
        })
    );
}

export function GrantCognitoResendPermissions(lambdaFunction: lambda.Function, cognitoPoolArn: string): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cognito-idp:ResendConfirmationCode'],
            resources: [cognitoPoolArn],
        })
    );
}

export function GrantSecretManagerReadWritePermissions(lambdaFunction: lambda.Function, secretArn: string): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['secretsmanager:GetSecretValue', 'secretsmanager:PutSecretValue'],
            resources: [secretArn],
        })
    );
}

export function GrantDynamoDBPermissions(lambdaFunction: lambda.Function, table: dynamodb.Table): void {
    table.grantReadWriteData(lambdaFunction);
}

export function GrantDynamoDBStreamPermissions(lambdaFunction: lambda.Function, table: dynamodb.Table): void {
    table.grantStreamRead(lambdaFunction);
}

export function GrantCognitoDescribePermissions(lambdaFunction: lambda.Function, userPoolArn: string): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            effect: iam.Effect.ALLOW,
            actions: ['cognito-idp:DescribeUserPool', 'cognito-idp:ListUsers'],
            resources: [userPoolArn],
        })
    );
}

export function GrantCognitoTokenValidationPermissions(
    lambdaFunction: lambda.Function,
    userPoolArn: string
): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['cognito-idp:AdminGetUser', 'cognito-idp:GetSigningCertificate'],
            resources: [userPoolArn],
        })
    );
}

export function GrantSNSPublishPermissions(lambdaFunction: lambda.Function, topicArn: string): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['sns:Publish'],
            resources: [topicArn],
        })
    );
}

export function GrantSQSPermissions(lambdaFunction: lambda.Function, queue: sqs.Queue): void {
    queue.grantConsumeMessages(lambdaFunction);
    queue.grantSendMessages(lambdaFunction);
}

export function GrantCloudWatchLogsPermissions(lambdaFunction: lambda.Function): void {
    lambdaFunction.addToRolePolicy(
        new iam.PolicyStatement({
            actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
            resources: ['*'],
        })
    );
}
