import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { NotifySlack } from '../../components/notifier/slack_notifier';
import { GetSecretValue } from '../../components/secrets/get_secret';

const slackWebhookARN = process.env.SLACK_WEBHOOK_SECRET_ARN || '';
const environment = process.env.ENVIRONMENT || 'production';

export const handlerWrapper = (
    handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
    baseChannel: string,
    handlerName: string
): ((event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>) => {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        let response: APIGatewayProxyResult;
        let error: Error | null = null;

        try {
            response = await handler(event);
        } catch (err: any) {
            error = err;
            response = {
                statusCode: 500,
                body: JSON.stringify({ message: 'Internal Server Error' }),
            };
        }

        try {
            const slackToken = await GetSecretValue(slackWebhookARN);
            if (!slackToken) {
                throw new Error('Slack token not found in Secrets Manager');
            }

            const level = response.statusCode >= 200 && response.statusCode < 300 ? 'info' : 'error';
            const channel = getEnvironmentChannel(baseChannel, level);
            const message = `${handlerName} ${level === 'info' ? 'executed successfully' : 'execution failed'}`;
            const fields = [
                { title: 'Handler', value: handlerName, short: true },
                { title: 'Status', value: level === 'info' ? 'Success' : 'Failure', short: true },
                { title: 'Environment', value: environment, short: true },
                ...(level === 'info'
                    ? [{ title: 'Response', value: JSON.stringify(response.body || {}), short: true }]
                    : []),
                ...(error
                    ? [{ title: 'Error', value: error.message, short: false }]
                    : []),
            ];

            await NotifySlack(slackToken, channel, message, fields, level);
        } catch (notifyError) {
            console.error('Failed to send notification to Slack:', notifyError);
        }

        if (error) {
            throw error;
        }

        return response;
    };
};

const getEnvironmentChannel = (baseChannel: string, level: string): string => {
    return environment === 'staging'
        ? `${baseChannel}-staging`
        : level === 'error'
            ? `${baseChannel}-alerts`
            : baseChannel;
};