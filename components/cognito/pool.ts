import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export function InitializeUserPool(
    scope: Construct,
    id: string,
    userPoolArn: string
): cognito.IUserPool {
    return cognito.UserPool.fromUserPoolArn(scope, id, userPoolArn);
}
