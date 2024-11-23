import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { AppConfig } from '../../../config/config';
import { clientError, serverError } from '../../errors/error';
import { setHeadersPost } from '../../wrapper/response-wrapper';
import { UploadRequest } from '../../../entity/file';
import * as base64 from 'base64-js';
import * as crypto from 'crypto';

// Initialize Config and S3 Client
const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const s3Client = new S3Client({ region: config.region });

export async function UploadHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        console.log('Received payload in UploadHandler:', event.body);

        const bucketName = config.bucketName;

        // Parse and validate the request body
        if (!event.body) {
            return clientError(400, 'Request body is missing');
        }

        const uploadReq: UploadRequest = JSON.parse(event.body);

        if (!uploadReq.file_content || !uploadReq.file_name) {
            return clientError(400, 'Invalid request payload: fileContent or filename is missing');
        }

        // Decode Base64 file content
        let fileData: Buffer;
        try {
            fileData = Buffer.from(uploadReq.file_content, 'base64');
        } catch (err) {
            return clientError(400, 'Invalid Base64-encoded file content');
        }

        // Determine content type from headers or default to application/octet-stream
        const contentType = event.headers['x-file-content-type'] || 'application/octet-stream';

        // Upload the file to S3
        const uniqueKey = `${crypto.randomUUID()}_${uploadReq.file_name}`;
        try {
            await s3Client.send(
                new PutObjectCommand({
                    Bucket: bucketName,
                    Key: uniqueKey,
                    Body: fileData,
                    ContentType: contentType,
                })
            );
        } catch (err) {
            console.error('Error uploading file to S3:', err);
            return serverError('Failed to upload file to S3');
        }

        // Generate file URL
        const fileURL = `https://${bucketName}.s3.amazonaws.com/${uniqueKey}`;

        return {
            statusCode: 200,
            body: JSON.stringify({ FileURL: fileURL }),
            headers: setHeadersPost(),
        };
    } catch (err: any) {
        console.error('Unexpected error in UploadHandler:', err);
        return serverError('An unexpected error occurred');
    }
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return UploadHandler(event);
}
