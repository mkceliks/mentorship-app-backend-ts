import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { AppConfig } from '../../../config/config';
import { clientError, serverError } from '../../errors/error';
import { setHeadersGet } from '../../wrapper/response-wrapper';

// Initialize Config and S3 Client
const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const s3Client = new S3Client({ region: config.region });

export async function DownloadHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const bucketName = config.bucketName;
        const fileName = event.queryStringParameters?.file_name;

        // Validate file_name parameter
        if (!fileName) {
            return clientError(400, 'Invalid or missing key parameter');
        }

        // Get object from S3
        let fileContent: Buffer;
        let contentType: string | undefined;

        try {
            const response = await s3Client.send(
                new GetObjectCommand({
                    Bucket: bucketName,
                    Key: fileName,
                })
            );

            contentType = response.ContentType || 'application/octet-stream';
            fileContent = await streamToBuffer(response.Body as Readable);
        } catch (err: any) {
            console.error('Error fetching object from S3:', err);
            return serverError('Failed to fetch object from S3');
        }

        // Encode file content to Base64
        const base64File = fileContent.toString('base64');

        // Return file content
        return {
            statusCode: 200,
            body: base64File,
            isBase64Encoded: true,
            headers: setHeadersGet(contentType),
        };
    } catch (err: any) {
        console.error('Unexpected error in DownloadHandler:', err);
        return serverError('An unexpected error occurred');
    }
}

// Utility function to convert Readable stream to Buffer
async function streamToBuffer(readable: Readable): Promise<Buffer> {
    const chunks: Uint8Array[] = [];
    for await (const chunk of readable) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks);
}

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    return DownloadHandler(event);
}
