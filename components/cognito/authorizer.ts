import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export function InitializeCognitoAuthorizer(
    scope: Construct,
    id: string,
    userPool: cognito.IUserPool
): apigateway.CognitoUserPoolsAuthorizer {
    return new apigateway.CognitoUserPoolsAuthorizer(scope, id, {
        cognitoUserPools: [userPool],
    });
}
