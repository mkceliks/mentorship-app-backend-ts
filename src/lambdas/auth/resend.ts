import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProvider, ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AppConfig } from '../../../config/config';
import { ResendRequest } from '../../../entity/resend';
import { validateEmail } from '../../validator/validator';
import { clientError, serverError } from '../../errors/error';
import { setHeadersPost } from '../../wrapper/response-wrapper';

// Initialize Config and Cognito Client
const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const cognitoClient = new CognitoIdentityProvider({ region: config.region });

export async function ResendHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const requestBody: ResendRequest = JSON.parse(event.body || '{}');

        // Validate Email
        if (!requestBody.email) {
            return clientError(400, 'Email is required');
        }

        const emailValidationError = validateEmail(requestBody.email);
        if (emailValidationError) {
            return clientError(400, 'Email validation failed');
        }

        // Resend Confirmation Code via Cognito
        try {
            await cognitoClient.send(
                new ResendConfirmationCodeCommand({
                    ClientId: config.cognitoClientId,
                    Username: requestBody.email,
                })
            );
        } catch (err: any) {
            console.error('Failed to resend confirmation code:', err);
            return serverError(`Failed to resend confirmation code: ${err.message}`);
        }

        // Success Response
        const responseBody = {
            message: 'Confirmation code resent successfully',
        };

        return {
            statusCode: 200,
            headers: setHeadersPost(),
            body: JSON.stringify(responseBody),
        };
    } catch (err: any) {
        console.error('Unexpected error in ResendHandler:', err);
        return serverError('An unexpected error occurred');
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return ResendHandler(event);
}
