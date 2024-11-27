import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import {
    CognitoIdentityProvider,
    AdminDeleteUserCommand,
    SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';
import { AppConfig } from '../../../../config/config';
import { AuthRequest } from '../../../../entity/auth';
import { validateFields } from '../../../validator/validator';
import { clientError, serverError } from '../../../errors/error';
import { setHeadersPost } from '../../../wrapper/response-wrapper';
import { Client } from '../../../../pkg/client';
import { UploadService } from '../../../../pkg/upload/upload';
import { v4 as uuidv4 } from 'uuid';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const cognitoClient = new CognitoIdentityProvider({ region: config.region });
const dynamoDBClient = new DynamoDBClient({ region: config.region });
const tableName = process.env.DDB_TABLE_NAME || '';
const apiClient = new Client(config);
const uploadService = new UploadService(apiClient);

export async function RegisterHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        console.log('Lambda invoked');
        const requestBody: AuthRequest = JSON.parse(event.body || '{}');

        const validationError = validateFields(requestBody.name, requestBody.email, requestBody.password, requestBody.role);
        if (validationError) {
            return clientError(400, validationError);
        }

        try {
            await cognitoClient.send(
                new SignUpCommand({
                    ClientId: config.cognitoClientId,
                    Username: requestBody.email,
                    Password: requestBody.password,
                    UserAttributes: [
                        { Name: 'email', Value: requestBody.email },
                        { Name: 'name', Value: requestBody.name },
                        { Name: 'custom:role', Value: requestBody.role },
                    ],
                })
            );
        } catch (err: any) {
            console.error('Failed to register user in Cognito:', err);
            return serverError(`Failed to register user: ${err.message}`);
        }

        let uploadResponse;
        try {
            uploadResponse = await uploadService.uploadProfilePicture(
                requestBody.email,
                requestBody.file_name,
                requestBody.profile_picture,
                event.headers['x-file-content-type'] || '',
            );
        } catch (err: any) {
            console.error('Failed to upload profile picture:', err);
            await deleteUserFromCognito(requestBody.email);
            return serverError(`Failed to upload profile picture: ${err.message}`);
        }

        try {
            await saveUserProfile(requestBody.email, requestBody.name, requestBody.role, uploadResponse.file_url);
        } catch (err: any) {
            console.error('Failed to save user profile:', err);
            await deleteUserFromCognito(requestBody.email);
            return serverError(`Failed to save user profile: ${err.message}`);
        }

        return {
            statusCode: 201,
            headers: setHeadersPost(),
            body: JSON.stringify({ message: 'User registered and profile created successfully' }),
        };
    } catch (err: any) {
        console.error('Unexpected error in RegisterHandler:', err);
        return serverError(err.message || 'An unexpected error occurred');
    }
}

async function saveUserProfile(email: string, name: string, role: string, profilePicURL: string): Promise<void> {
    const now = new Date().toISOString();

    const profile = {
        UserId: { S: uuidv4() },
        Name: { S: name },
        ProfileType: { S: role },
        Email: { S: email },
        ProfilePicURL: { S: profilePicURL },
        CreatedAt: { S: now },
        UpdatedAt: { S: now },
        DeletedAt: { NULL: true },
    };

    await dynamoDBClient.send(
        new PutItemCommand({
            TableName: tableName,
            Item: profile,
            ConditionExpression: 'attribute_not_exists(Email)',
        })
    );
}

async function deleteUserFromCognito(email: string): Promise<void> {
    try {
        await cognitoClient.send(
            new AdminDeleteUserCommand({
                UserPoolId: extractUserPoolID(config.cognitoPoolArn),
                Username: email,
            })
        );
    } catch (err: any) {
        console.error(`Failed to delete user from Cognito: ${email}`, err);
    }
}

function extractUserPoolID(cognitoPoolArn: string): string {
    const parts = cognitoPoolArn.split('/');
    return parts[parts.length - 1];
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return RegisterHandler(event);
}