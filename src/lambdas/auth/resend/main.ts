import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CognitoIdentityProvider, ResendConfirmationCodeCommand } from '@aws-sdk/client-cognito-identity-provider';
import { AppConfig } from '../../../../config/config';
import { ResendRequest } from '../../../../entity/resend';
import { validateEmail } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersPost } from '../../../wrapper/response-wrapper';
import { handlerWrapper } from '../../../wrapper/handler-wrapper';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const cognitoClient = new CognitoIdentityProvider({ region: config.region });

/**
 * Handles resending confirmation codes to users via Cognito.
 * @param event - The API Gateway event.
 * @returns APIGatewayProxyResult
 */
export async function ResendHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const requestBody: ResendRequest = JSON.parse(event.body || '{}');

        if (!requestBody.email) {
            return clientError(400, 'Email is required');
        }

        const emailValidationError = validateEmail(requestBody.email);
        if (emailValidationError) {
            return clientError(400, 'Email validation failed');
        }

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

/**
 * The main handler function wrapped with handlerWrapper for Slack notifications and logging.
 */
export const handler = handlerWrapper(ResendHandler, '#auth-cognito', 'ResendHandler');
