import * as cognito from 'aws-cdk-lib/aws-cognito';
import { Construct } from 'constructs';

export function CreateUserPool(scope: Construct, id: string): cognito.UserPool {
    return new cognito.UserPool(scope, id, {
        userPoolName: `${id}-user-pool`,
        selfSignUpEnabled: true, // Allow users to sign themselves up
        signInAliases: {
            email: true, // Use email as a sign-in option
            username: true,
        },
        autoVerify: {
            email: true, // Automatically verify emails
        },
        passwordPolicy: {
            minLength: 8,
            requireDigits: true,
            requireSymbols: false,
            requireUppercase: true,
            requireLowercase: true,
        },
        accountRecovery: cognito.AccountRecovery.EMAIL_ONLY, // Recovery option
    });
}

export function CreateUserPoolClient(
    scope: Construct,
    id: string,
    userPool: cognito.UserPool
): cognito.UserPoolClient {
    return new cognito.UserPoolClient(scope, `${id}-client`, {
        userPool,
        generateSecret: false, // Avoid generating a secret for public apps
        authFlows: {
            userPassword: true,
            userSrp: true,
        },
    });
}

export function CreateUserPoolDomain(
    scope: Construct,
    id: string,
    userPool: cognito.UserPool
): cognito.UserPoolDomain {
    return new cognito.UserPoolDomain(scope, `${id}-domain`, {
        userPool,
        cognitoDomain: {
            domainPrefix: `${id}-auth`,
        },
    });
}
