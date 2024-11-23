import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export function InitializeUserPoolClient(
    scope: Construct,
    id: string,
    clientID: string
): cognito.IUserPoolClient {
    return cognito.UserPoolClient.fromUserPoolClientId(scope, id, clientID);
}
