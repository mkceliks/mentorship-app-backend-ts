import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, QueryCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersGet } from '../../../wrapper/response-wrapper';
import {handlerWrapper} from "../../../wrapper/handler-wrapper";
import {DeletePackageHandler} from "../delete-package/main";

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.PACKAGES_TABLE_NAME || '';

export async function GetPackagesHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const authorizationHeader = event.headers['Authorization'];
        const userIdHeader = event.headers['x-user-id'];

        if (!authorizationHeader) {
            return clientError(401, 'Missing Authorization header');
        }

        const idToken = validateAuthorizationHeader(authorizationHeader);
        if (!idToken) {
            return clientError(401, 'Invalid Authorization header');
        }

        if (!userIdHeader) {
            return clientError(400, 'Missing x-user-id header');
        }

        const payload = decodeAndValidateIDToken(idToken);
        const role = payload['custom:role'];

        if (role !== 'Mentor') {
            return clientError(403, 'Only mentors can retrieve packages');
        }

        try {
            const queryResult = await dynamoDBClient.send(
                new QueryCommand({
                    TableName: tableName,
                    KeyConditionExpression: 'MentorId = :mentorId',
                    ExpressionAttributeValues: {
                        ':mentorId': { S: userIdHeader },
                    },
                })
            );

            const packages = queryResult.Items?.map((item) => ({
                packageId: item.PackageId.S,
                packageName: item.PackageName.S,
                description: item.Description.S,
                price: Number(item.Price.N),
                createdAt: item.CreatedAt.S,
                updatedAt: item.UpdatedAt.S,
            }));

            return {
                statusCode: 200,
                headers: setHeadersGet(''),
                body: JSON.stringify({ packages }),
            };
        } catch (err: any) {
            console.error('Failed to retrieve packages:', err);
            return serverError('Failed to retrieve packages');
        }
    } catch (err: any) {
        console.error('Unexpected error in GetPackagesHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

export const handler = handlerWrapper(GetPackagesHandler, '#packages', 'GetPackagesHandler');
