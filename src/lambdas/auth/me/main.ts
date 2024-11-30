import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken, validateEmail } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersGet } from '../../../wrapper/response-wrapper';
import { handlerWrapper } from '../../../wrapper/handler-wrapper';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.DDB_TABLE_NAME || '';
const emailIndexName = 'EmailIndex';

/**
 * Handles fetching the user profile based on the ID token.
 * @param event - The API Gateway event.
 * @returns APIGatewayProxyResult
 */
export async function MeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const authorizationHeader = event.headers['Authorization'];
        if (!authorizationHeader) {
            return clientError(401, 'Missing Authorization header');
        }

        const idToken = validateAuthorizationHeader(authorizationHeader);
        if (!idToken) {
            return clientError(401, 'Invalid Authorization header');
        }

        const payload = decodeAndValidateIDToken(idToken);
        if (!payload.email || validateEmail(payload.email)) {
            return clientError(400, 'Invalid email format');
        }

        const profileType = payload['custom:role'];
        if (!profileType) {
            return clientError(400, 'ProfileType (custom:role) is missing in the token');
        }

        const userDetails = await fetchUserProfileByEmail(payload.email);
        if (!userDetails) {
            return clientError(404, 'User profile not found');
        }

        if (userDetails.DeletedAt && userDetails.DeletedAt !== 'NULL') {
            return clientError(410, 'User profile is marked as deleted');
        }

        const responseBody = {
            email: payload.email,
            profile_type: profileType,
            is_verified: payload.email_verified,
            details: userDetails,
        };

        return {
            statusCode: 200,
            headers: setHeadersGet(''),
            body: JSON.stringify(responseBody),
        };
    } catch (err: any) {
        console.error('Error in MeHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

/**
 * Fetches the user profile by email using DynamoDB.
 * @param email - The email of the user.
 * @returns The user profile details or null if not found.
 */
async function fetchUserProfileByEmail(email: string): Promise<Record<string, string> | null> {
    if (!email) {
        throw new Error('Email is empty');
    }

    console.log(`Querying user profile by Email: ${email} from index: ${emailIndexName}`);

    try {
        const result = await dynamoDBClient.send(
            new QueryCommand({
                TableName: tableName,
                IndexName: emailIndexName,
                KeyConditionExpression: 'Email = :email',
                ExpressionAttributeValues: {
                    ':email': { S: email },
                },
            })
        );

        if (!result.Items || result.Items.length === 0) {
            console.log(`No user found for Email: ${email}`);
            return null;
        }

        const userDetails: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.Items[0])) {
            if (value.S) {
                userDetails[key] = value.S;
            }
        }

        console.log(`Fetched user details:`, userDetails);
        return userDetails;
    } catch (err: any) {
        console.error('DynamoDB Query error:', err);
        throw err;
    }
}

/**
 * The main handler function wrapped with handlerWrapper for Slack notifications and logging.
 */
export const handler = handlerWrapper(MeHandler, 'auth-cognito', 'MeHandler');
