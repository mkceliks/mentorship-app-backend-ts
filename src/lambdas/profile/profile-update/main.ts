import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, UpdateItemCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersPost } from '../../../wrapper/response-wrapper';
import { handlerWrapper } from '../../../wrapper/handler-wrapper';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.DDB_TABLE_NAME || '';
const emailIndexName = 'EmailIndex';

/**
 * Handles updating the user profile in DynamoDB.
 * @param event - The API Gateway event.
 * @returns APIGatewayProxyResult
 */
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

        if (updateExpressionParts.length === 0) {
            return clientError(400, 'At least one updatable field must be provided');
        }

        const updateExpression = `SET ${updateExpressionParts.join(', ')}, UpdatedAt = :updatedAt`;

        let userId: string | undefined;
        let profileType: string | undefined;

        try {
            const queryResult = await dynamoDBClient.send(
                new QueryCommand({
                    TableName: tableName,
                    IndexName: emailIndexName,
                    KeyConditionExpression: 'Email = :email',
                    ExpressionAttributeValues: {
                        ':email': { S: email },
                    },
                })
            );

            if (!queryResult.Items || queryResult.Items.length === 0) {
                return clientError(404, 'User profile not found');
            }

            userId = queryResult.Items[0].UserId?.S;
            profileType = queryResult.Items[0].ProfileType?.S;

            if (!userId || !profileType) {
                return clientError(500, 'Failed to extract UserId and ProfileType from query result');
            }
        } catch (err: any) {
            console.error('Failed to query user profile:', err);
            return serverError('Failed to query user profile');
        }

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

        const responseBody = {
            email: payload.email,
        };

        return {
            statusCode: 200,
            headers: setHeadersPost(),
            body: JSON.stringify(responseBody),
        };
    } catch (err: any) {
        console.error('Unexpected error in UpdateProfileHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

/**
 * The main handler function wrapped with handlerWrapper for Slack notifications and logging.
 */
export const handler = handlerWrapper(UpdateProfileHandler, '#profile', 'UpdateProfileHandler');
