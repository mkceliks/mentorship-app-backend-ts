import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProvider } from '@aws-sdk/client-cognito-identity-provider';
import { AppConfig } from '../../../config/config';
import { ConfirmRequest } from '../../../entity/confirm';
import { validateEmail } from '../../validator/validator';
import { clientError, serverError } from '../../errors/error';
import { setHeadersPost } from '../../wrapper/response-wrapper';

// Initialize Config and Cognito Client
const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const cognitoClient = new CognitoIdentityProvider({ region: config.region });

export async function ConfirmHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const requestBody: ConfirmRequest = JSON.parse(event.body || '{}');

        if (!requestBody.email || !requestBody.code) {
            return clientError(400, 'Email and confirmation code are required');
        }

        // Email Validation
        const emailValidationError = validateEmail(requestBody.email);
        if (emailValidationError) {
            return clientError(400, emailValidationError);
        }


        // Confirm Sign Up with Cognito
        try {
            await cognitoClient.confirmSignUp({
                ClientId: config.cognitoClientId,
                Username: requestBody.email,
                ConfirmationCode: requestBody.code,
            });
        } catch (err: any) {
            if (err.name === 'InvalidParameterException' && err.message.includes('Invalid code')) {
                return clientError(400, 'Invalid confirmation code');
            }
            if (err.name === 'ExpiredCodeException') {
                return clientError(400, 'Confirmation code expired');
            }
            return serverError(`Failed to confirm sign-up with Cognito: ${err.message}`);
        }

        // Success Response
        return {
            statusCode: 200,
            headers: setHeadersPost(),
            body: JSON.stringify({ message: 'Email confirmed successfully' }),
        };
    } catch (err: any) {
        console.error('Unexpected error:', err);
        return serverError('An unexpected error occurred');
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log(`Loading configuration for environment: ${process.env.ENVIRONMENT}`);
    return ConfirmHandler(event);
}