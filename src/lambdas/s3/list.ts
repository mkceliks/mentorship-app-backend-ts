import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { AppConfig } from '../../../config/config';
import { setAccessControl, setHeadersGet } from '../../wrapper/response-wrapper';
import { File } from '../../../entity/file';

// Initialize Config and S3 Client
const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const s3Client = new S3Client({ region: config.region });

export async function ListHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const bucketName = config.bucketName;
        console.log(`S3 bucket name: ${bucketName}`);

        // Fetch the list of objects from the S3 bucket
        const response = await s3Client.send(
            new ListObjectsV2Command({
                Bucket: bucketName,
            })
        );

        // Map the S3 response to the File entity
        const files: File[] = (response.Contents || []).map((item) => ({
            key: item.Key || '',
            size: item.Size || 0,
        }));

        // Convert the file list to JSON
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
            body: 'Error listing files',
            headers: setAccessControl(),
        };
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return ListHandler(event);
}
