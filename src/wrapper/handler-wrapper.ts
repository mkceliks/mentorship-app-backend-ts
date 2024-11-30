import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { NotifySlack } from '../../components/notifier/slack_notifier';
import { GetSecretValue } from '../../components/secrets/get_secret';

const slackWebhookARN = process.env.SLACK_WEBHOOK_SECRET_ARN || '';
const environment = process.env.ENVIRONMENT || 'staging';

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
            console.error(`[${handlerName}] Handler execution failed:`, err);
        }

        try {
            const slackToken = await GetSecretValue(slackWebhookARN);
            if (!slackToken) {
                throw new Error('Slack token not found in Secrets Manager');
            }

            const level = response.statusCode >= 200 && response.statusCode < 300 ? 'info' : 'error';
            const channel = getEnvironmentChannel(baseChannel, level);
            const message = `${handlerName} ${level === 'info' ? 'executed successfully' : 'execution failed'}`;
            const fields = prepareSlackFields(handlerName, response, level, error);

            await NotifySlack(slackToken, channel, message, fields, level);
        } catch (notifyError) {
            console.error(`[${handlerName}] Failed to send notification to Slack:`, notifyError);
        }

        if (error) {
            throw error;
        }

        return response;
    };
};

const getEnvironmentChannel = (baseChannel: string, level: string): string => {
    if (!baseChannel) {
        throw new Error('Base channel is not defined');
    }

    const environmentSuffix = environment ? `-${environment}` : '';
    const alertSuffix = level === 'error' ? '-alerts' : '';

    return `${baseChannel}${alertSuffix}${environmentSuffix}`;
};


const prepareSlackFields = (
    handlerName: string,
    response: APIGatewayProxyResult,
    level: string,
    error: Error | null
): Array<{ title: string; value: string; short: boolean }> => {
    const fields = [
        { title: 'Handler', value: handlerName, short: true },
        { title: 'Status', value: level === 'info' ? 'Success' : 'Failure', short: true },
        { title: 'Environment', value: environment, short: true },
    ];

    if (level === 'info' && response.body) {
        fields.push({ title: 'Response', value: JSON.stringify(response.body), short: false });
    }

    if (error) {
        fields.push({ title: 'Error', value: error.message, short: false });
    }

    return fields;
};
