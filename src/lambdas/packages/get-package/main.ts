import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand, QueryCommandOutput } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersGet } from '../../../wrapper/response-wrapper';
import { handlerWrapper } from '../../../wrapper/handler-wrapper';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.PACKAGES_TABLE_NAME || '';

export async function GetPackagesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const authorizationHeader = event.headers['Authorization'] || event.headers['authorization'];
        const userIdHeader = event.headers['x-user-id'] || event.headers['X-User-Id'];

        if (!authorizationHeader) {
            return clientError(401, 'Missing Authorization header');
        }

        if (!userIdHeader) {
            return clientError(400, 'Missing x-user-id header');
        }

        const idToken = validateAuthorizationHeader(authorizationHeader);
        if (!idToken) {
            return clientError(401, 'Invalid Authorization header');
        }

        const payload = decodeAndValidateIDToken(idToken);
        const role = payload['custom:role'];

        if (role !== 'Mentor') {
            console.error('Unauthorized role:', role);
            return clientError(403, 'Only mentors can retrieve packages');
        }

        try {
            console.log(`Querying packages for MentorId: ${userIdHeader}`);
            const queryResult: QueryCommandOutput = await dynamoDBClient.send(
                new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'MentorId = :mentorId',
                    ExpressionAttributeValues: {
                        ':mentorId': { S: userIdHeader },
                    },
                })
            );

            console.log('Query result:', queryResult);

            const packages = queryResult.Items?.map((item) => ({
                packageId: item?.PackageId?.S || 'N/A',
                packageName: item?.PackageName?.S || 'N/A',
                description: item?.Description?.S || 'N/A',
                price: item?.Price?.N ? Number(item.Price.N) : 0,
                createdAt: item?.CreatedAt?.S || 'N/A',
                updatedAt: item?.UpdatedAt?.S || 'N/A',
            })) || [];

            return {
                statusCode: 200,
                headers: setHeadersGet(''),
                body: JSON.stringify({ packages }),
            };
        } catch (err: any) {
            console.error('DynamoDB Query Error:', {
                TableName: tableName,
                KeyConditionExpression: 'MentorId = :mentorId',
                ExpressionAttributeValues: { ':mentorId': { S: userIdHeader } },
                Error: err,
            });
            return serverError('Failed to retrieve packages');
        }
    } catch (err: any) {
        console.error('Unexpected error in GetPackagesHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

export const handler = handlerWrapper(GetPackagesHandler, '#packages', 'GetPackagesHandler');
