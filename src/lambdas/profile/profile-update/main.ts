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
        const userId = payload.sub;
        const profileType = payload['custom:role'];

        if (!userId || !profileType) {
            return clientError(400, 'Invalid ID token: missing UserId or ProfileType');
        }

        const requestBody = JSON.parse(event.body || '{}');
        const allowedFields = {
            Name: '#Name',
            ProfilePicURL: 'ProfilePicURL',
            ProfileType: 'ProfileType',
        };

        const updateExpressionParts: string[] = [];
        const expressionAttributeValues: Record<string, any> = { ':updatedAt': { S: new Date().toISOString() } };
        const expressionAttributeNames: Record<string, string> = { '#Name': 'Name' };

        if (requestBody.Name) {
            updateExpressionParts.push('#Name = :name');
            expressionAttributeValues[':name'] = { S: requestBody.Name };
        }
        if (requestBody.ProfilePicURL) {
            updateExpressionParts.push('ProfilePicURL = :profilePicURL');
            expressionAttributeValues[':profilePicURL'] = { S: requestBody.ProfilePicURL };
        }
        if (requestBody.ProfileType) {
            updateExpressionParts.push('ProfileType = :profileType');
            expressionAttributeValues[':profileType'] = { S: requestBody.ProfileType };
        }

        if (updateExpressionParts.length === 0) {
            return clientError(400, 'At least one updatable field must be provided');
        }

        const updateExpression = `SET ${updateExpressionParts.join(', ')}, UpdatedAt = :updatedAt`;

        try {
            await dynamoDBClient.send(
                new UpdateItemCommand({
                    TableName: tableName,
                    Key: {
                        UserId: { S: userId },
                        ProfileType: { S: profileType },
                    },
                    UpdateExpression: updateExpression,
                    ExpressionAttributeNames: expressionAttributeNames,
                    ExpressionAttributeValues: expressionAttributeValues,
                    ConditionExpression: 'attribute_exists(UserId)',
                })
            );
        } catch (err: any) {
            console.error('Failed to update user profile:', err);
            if (err.name === 'ConditionalCheckFailedException') {
                return clientError(404, 'User profile not found');
            }
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
