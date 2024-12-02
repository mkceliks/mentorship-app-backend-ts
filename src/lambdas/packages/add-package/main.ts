import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersPost } from '../../../wrapper/response-wrapper';
import { v4 as uuidv4 } from 'uuid';
import {handlerWrapper} from "../../../wrapper/handler-wrapper";

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.PACKAGES_TABLE_NAME || '';

export async function CreatePackageHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
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
        const mentorId = payload.sub;
        const role = payload['custom:role'];

        if (!mentorId || role !== 'Mentor') {
            return clientError(403, 'Only mentors can create packages');
        }

        const requestBody = JSON.parse(event.body || '{}');
        const { packageName, description, price } = requestBody;

        if (!packageName || !price) {
            return clientError(400, 'PackageName and Price are required');
        }

        const now = new Date().toISOString();
        const packageId = uuidv4();

        try {
            await dynamoDBClient.send(
                new PutItemCommand({
                    TableName: tableName,
                    Item: {
                        MentorId: { S: mentorId },
                        PackageId: { S: packageId },
                        PackageName: { S: packageName },
                        Description: { S: description || '' },
                        Price: { N: price.toString() },
                        CreatedAt: { S: now },
                        UpdatedAt: { S: now },
                    },
                })
            );
        } catch (err: any) {
            console.error('Failed to create package:', err);
            return serverError('Failed to create package');
        }

        return {
            statusCode: 201,
            headers: setHeadersPost(),
            body: JSON.stringify({ message: 'Package created successfully', packageId }),
        };
    } catch (err: any) {
        console.error('Unexpected error in CreatePackageHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

export const handler = handlerWrapper(CreatePackageHandler, '#packages', 'CreatePackageHandler');
