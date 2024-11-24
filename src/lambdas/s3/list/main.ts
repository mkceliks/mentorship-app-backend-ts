import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { AppConfig } from '../../../../config/config';
import { setAccessControl, setHeadersGet } from '../../../wrapper/response-wrapper';
import { validateAuthorizationHeader, decodeAndValidateIDToken } from '../../../validator/validator';
import { File } from '../../../../entity/file';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const s3Client = new S3Client({ region: config.region });

export async function ListHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const bucketName = config.bucketName;
        console.log(`S3 bucket name: ${bucketName}`);

        const authorizationHeader = event.headers['Authorization'];
        if (!authorizationHeader) {
            return {
                statusCode: 401,
                body: JSON.stringify({ message: 'Missing Authorization header' }),
                headers: setAccessControl(),
            };
        }

        const idToken = validateAuthorizationHeader(authorizationHeader);
        const userPayload = decodeAndValidateIDToken(idToken);

        if (!userPayload.sub) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Invalid token: User ID (sub) is missing' }),
                headers: setAccessControl(),
            };
        }

        const userFolder = userPayload.sub;
        console.log(`Fetching files for user: ${userFolder}`);

        const response = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
                Prefix: `${userFolder}/`,
            })
        );

        const files: File[] = (response.Contents || []).map((item) => {
            const key = item.Key || '';
            const fullFileName = key.replace(`${userFolder}/`, '');
            const fileName = fullFileName.replace(/^[^_]+_/, '');
            return {
                key,
                item_name: fileName,
                size: item.Size || 0,
            };
        });

        const filesJSON = JSON.stringify(files);

        return {
            statusCode: 200,
            body: filesJSON,
            headers: setHeadersGet('application/json'),
        };
    } catch (err: any) {
        console.error(`Failed to list files in bucket ${config.bucketName}:`, err);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Error listing files' }),
            headers: setAccessControl(),
        };
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return ListHandler(event);
}
