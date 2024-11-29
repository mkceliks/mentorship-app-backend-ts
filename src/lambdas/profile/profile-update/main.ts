import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersPost } from '../../../wrapper/response-wrapper';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.DDB_TABLE_NAME || '';

export async function UpdateProfileHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
        const email = payload.email;
        if (!email) {
            return clientError(400, 'Invalid ID token: missing email');
        }

        const requestBody = JSON.parse(event.body || '{}');
        const { name, profilePicURL, role } = requestBody;

        if (!name && !profilePicURL && !role) {
            return clientError(400, 'At least one field (name, profilePicURL, role) must be provided for profile-update.');
        }

        const now = new Date().toISOString();
        const updateExpressionParts = [];
        const expressionAttributeValues: Record<string, any> = { ':updatedAt': { S: now } };

        if (name) {
            updateExpressionParts.push('Name = :name');
            expressionAttributeValues[':name'] = { S: name };
        }
        if (profilePicURL) {
            updateExpressionParts.push('ProfilePicURL = :profilePicURL');
            expressionAttributeValues[':profilePicURL'] = { S: profilePicURL };
        }
        if (role) {
            updateExpressionParts.push('ProfileType = :role');
            expressionAttributeValues[':role'] = { S: role };
        }

        const updateExpression = `SET ${updateExpressionParts.join(', ')}, UpdatedAt = :updatedAt`;

        try {
            await dynamoDBClient.send(
                new UpdateItemCommand({
                    TableName: tableName,
                    Key: {
                        Email: { S: email },
                    },
                    UpdateExpression: updateExpression,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ConditionExpression: 'attribute_exists(Email)',
                })
            );
        } catch (err: any) {
            console.error('Failed to update user profile:', err);
            return serverError(`Failed to update user profile: ${err.message}`);
        }

        return {
            statusCode: 200,
            headers: setHeadersPost(),
            body: JSON.stringify({ message: 'User profile updated successfully' }),
        };
    } catch (err: any) {
        console.error('Unexpected error in UpdateProfileHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return UpdateProfileHandler(event);
}
