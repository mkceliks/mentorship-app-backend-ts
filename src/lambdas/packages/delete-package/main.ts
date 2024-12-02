import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, DeleteItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersDelete } from '../../../wrapper/response-wrapper';
import {handlerWrapper} from "../../../wrapper/handler-wrapper";
import {CreatePackageHandler} from "../add-package/main";

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.MENTOR_PACKAGES_TABLE_NAME || '';

export async function DeletePackageHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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

        const packageId = event.pathParameters?.packageId;
        if (!packageId) {
            return clientError(400, 'PackageId is required in the URL');
        }

        try {
            // Ensure the package belongs to the user before deletion
            const getResult = await dynamoDBClient.send(
                new GetItemCommand({
                    TableName: tableName,
                    Key: {
                        PackageId: { S: packageId },
                    },
                })
            );

            if (!getResult.Item || getResult.Item.UserId?.S !== userId) {
                return clientError(403, 'You are not authorized to delete this package');
            }

            // Proceed with deletion
            await dynamoDBClient.send(
                new DeleteItemCommand({
                    TableName: tableName,
                    Key: {
                        PackageId: { S: packageId },
                    },
                    ConditionExpression: 'attribute_exists(PackageId)',
                })
            );

            return {
                statusCode: 200,
                headers: setHeadersDelete(),
                body: JSON.stringify({ message: 'Package deleted successfully' }),
            };
        } catch (err: any) {
            console.error('Failed to delete package:', err);
            if (err.name === 'ConditionalCheckFailedException') {
                return clientError(404, 'Package not found');
            }
            return serverError(`Failed to delete package: ${err.message}`);
        }
    } catch (err: any) {
        console.error('Unexpected error in DeletePackageHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

export const handler = handlerWrapper(DeletePackageHandler, '#packages', 'DeletePackageHandler');
