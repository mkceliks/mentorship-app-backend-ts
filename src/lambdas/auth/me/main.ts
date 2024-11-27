import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken, validateEmail } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersGet } from '../../../wrapper/response-wrapper';

// Initialize Config and DynamoDB Client
const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.DDB_TABLE_NAME || '';

export async function MeHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
// Ensure the Authorization header is provided
        const authorizationHeader = event.headers['Authorization'];
        if (!authorizationHeader) {
            return clientError(401, 'Missing Authorization header');
        }

// Validate the Authorization header
        const idToken = validateAuthorizationHeader(authorizationHeader);
        if (!idToken) {
            return clientError(401, 'Invalid Authorization header');
        }


        const payload = decodeAndValidateIDToken(idToken);
        if (!payload.email || validateEmail(payload.email)) {
            return clientError(400, 'Invalid email format');
        }

        const profileType = payload["custom:role"];
        if (!profileType) {
            return clientError(400, 'ProfileType (custom:role) is missing in the token');
        }

        const userDetails = await fetchUserProfile(payload.email, profileType);
        if (!userDetails) {
            return clientError(404, 'User profile not found');
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

async function fetchUserProfile(email: string, profileType: string): Promise<Record<string, string>> {
    if (!email || !profileType) {
        throw new Error('Email or profileType is empty');
    }

    console.log(`Fetching user profile for UserId: ${email} and ProfileType: ${profileType} from table: ${tableName}`);

    try {
        const result = await dynamoDBClient.send(
            new GetItemCommand({
                TableName: tableName,
                Key: {
                    UserId: { S: email },
                    ProfileType: { S: profileType },
                },
            })
        );

        if (!result.Item) {
            console.log(`No item found for UserId: ${email} and ProfileType: ${profileType}`);
            return {};
        }

        const userDetails: Record<string, string> = {};
        for (const [key, value] of Object.entries(result.Item)) {
            if (value.S) {
                userDetails[key] = value.S;
            }
        }

        console.log(`Fetched user details:`, userDetails);
        return userDetails;
    } catch (err: any) {
        console.error('DynamoDB GetItem error:', err);
        throw err;
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return MeHandler(event);
}
