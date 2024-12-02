import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersGet } from '../../../wrapper/response-wrapper';
import {handlerWrapper} from "../../../wrapper/handler-wrapper";

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.MENTOR_PACKAGES_TABLE_NAME || '';
const userIdIndex = 'UserIdIndex';

export async function ListPackagesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

        if (!userId) {
            return clientError(400, 'Invalid ID token: missing UserId');
        }

        try {
            const queryResult = await dynamoDBClient.send(
                new QueryCommand({
                    TableName: tableName,
                    IndexName: userIdIndex,
                    KeyConditionExpression: 'UserId = :userId',
                    ExpressionAttributeValues: {
                        ':userId': { S: userId },
                    },
                })
            );

            const packages = queryResult.Items?.map((item) => ({
                PackageId: item.PackageId?.S,
                Name: item.Name?.S,
                Description: item.Description?.S,
                Price: item.Price?.N,
                CreatedAt: item.CreatedAt?.S,
            })) || [];

            return {
                statusCode: 200,
                headers: setHeadersGet(),
                body: JSON.stringify({ packages }),
            };
        } catch (err: any) {
            console.error('Failed to fetch packages:', err);
            return serverError('Failed to fetch packages');
        }
    } catch (err: any) {
        console.error('Unexpected error in ListPackagesHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

export const handler = handlerWrapper(ListPackagesHandler, '#packages', 'ListPackagesHandler');
