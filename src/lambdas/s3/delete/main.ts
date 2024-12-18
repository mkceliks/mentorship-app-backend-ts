import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { S3Client, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { AppConfig } from '../../../../config/config';
import { validateKey } from '../../../validator/validator';
import { setHeadersDelete } from '../../../wrapper/response-wrapper';
import { ErrNoSuchKey } from '../../../errors/error';
import { handlerWrapper } from '../../../wrapper/handler-wrapper';

const config = AppConfig.loadConfig(process.env.ENVIRONMENT || 'staging');
const s3Client = new S3Client({ region: config.region });

/**
 * Handles deleting an object from an S3 bucket.
 * @param event - The API Gateway event.
 * @returns APIGatewayProxyResult
 */
export async function DeleteHandler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
        const bucketName = config.bucketName;
        const key = event.queryStringParameters?.key;

        if (!key || validateKey(key)) {
            return {
                statusCode: 400,
                headers: setHeadersDelete(),
                body: JSON.stringify({ error: 'Invalid or missing key parameter' }),
            };
        }

        try {
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: bucketName,
                    Key: key,
                })
            );
            return {
                statusCode: 200,
                headers: setHeadersDelete(),
                body: JSON.stringify({ message: 'Object deleted successfully' }),
            };
        } catch (err: any) {
            if (err.name === ErrNoSuchKey) {
                return {
                    statusCode: 404,
                    headers: setHeadersDelete(),
                    body: JSON.stringify({ error: 'Object not found' }),
                };
            }
            console.error('Error deleting object from S3:', err);
            return {
                statusCode: 500,
                headers: setHeadersDelete(),
                body: JSON.stringify({ error: 'Failed to delete object from S3' }),
            };
        }
    } catch (err: any) {
        console.error('Unexpected error in DeleteHandler:', err);
        return {
            statusCode: 500,
            headers: setHeadersDelete(),
            body: JSON.stringify({ error: 'An unexpected error occurred' }),
        };
    }
}

/**
 * The main handler function wrapped with handlerWrapper for Slack notifications and logging.
 */
export const handler = handlerWrapper(DeleteHandler, '#s3-bucket', 'DeleteHandler');
