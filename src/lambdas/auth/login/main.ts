import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProvider, AuthFlowType, AdminGetUserCommand, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AppConfig } from '../../../../config/config';
import { AuthRequest } from '../../../../entity/auth';
import { validateEmail } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersPost } from '../../../wrapper/response-wrapper';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const cognitoClient = new CognitoIdentityProvider({ region: config.region });

export async function LoginHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const requestBody: AuthRequest = JSON.parse(event.body || '{}');

        if (!requestBody.email || !requestBody.password) {
            return clientError(400, 'Email and password are required');
        }

        const emailValidationError = validateEmail(requestBody.email);
        if (emailValidationError) {
            return clientError(400, 'Email validation failed');
        }

        try {
            const authResponse = await cognitoClient.send(
                new InitiateAuthCommand({
                    AuthFlow: AuthFlowType.USER_PASSWORD_AUTH,
                    ClientId: config.cognitoClientId,
                    AuthParameters: {
                        USERNAME: requestBody.email,
                        PASSWORD: requestBody.password,
                    },
                })
            );

            if (!authResponse.AuthenticationResult) {
                return serverError('Authentication failed: empty authentication result from Cognito');
            }

            const userPoolId = extractUserPoolID(config.cognitoPoolArn);

            const userDetails = await cognitoClient.send(
                new AdminGetUserCommand({
                    UserPoolId: userPoolId,
                    Username: requestBody.email,
                })
            );

            const isConfirmed = userDetails.UserAttributes?.some(
                (attr) => attr.Name === 'email_verified' && attr.Value === 'true'
            ) || false;

            const tokens: Record<string, any> = {
                email: requestBody.email,
                isConfirmed,
                access_token: authResponse.AuthenticationResult.AccessToken,
            };

            if (authResponse.AuthenticationResult.IdToken) {
                tokens.id_token = authResponse.AuthenticationResult.IdToken;
            }
            if (authResponse.AuthenticationResult.RefreshToken) {
                tokens.refresh_token = authResponse.AuthenticationResult.RefreshToken;
            }

            return {
                statusCode: 200,
                headers: setHeadersPost(),
                body: JSON.stringify(tokens),
            };
        } catch (authError: any) {
            if (authError.name === 'NotAuthorizedException') {
                return clientError(401, 'Invalid credentials');
            }
            return serverError(`Failed to authenticate with Cognito provider: ${authError.message}`);
        }
    } catch (err: any) {
        console.error('Unexpected error:', err);
        return serverError('An unexpected error occurred');
    }
}

function extractUserPoolID(cognitoPoolArn: string): string {
    const parts = cognitoPoolArn.split('/');
    return parts[parts.length - 1];
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Loading configuration for environment: ${process.env.ENVIRONMENT}`);
    return LoginHandler(event);
}
