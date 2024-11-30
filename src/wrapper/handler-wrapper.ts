import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetSecretValue } from '../../components/secrets/get_secret';
import { NotifySlack } from '../../components/notifier/slack_notifier';

const slackWebhookARN = process.env.SLACK_WEBHOOK_SECRET_ARN || '';
const environment = process.env.ENVIRONMENT || 'production';

/**
 * Wrapper for Lambda handlers to manage common tasks such as Slack notifications.
 * @param handler - The Lambda handler function.
 * @param baseChannel - Base Slack channel for notifications.
 * @param handlerName - Name of the handler (used for logging and notifications).
 * @returns Wrapped Lambda handler.
 */
export const handlerWrapper = (
    handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>,
    baseChannel: string,
    handlerName: string
) => {
    return async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
        try {
            const response = await handler(event);

            const slackToken = await GetSecretValue(slackWebhookARN);
            if (!slackToken) {
                console.error('Failed to retrieve Slack webhook token.');
                throw new Error('Internal server error: Unable to retrieve Slack token.');
            }

            console.log("slackToken:", slackToken);

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
            ];

            await NotifySlack(slackToken, channel, message, fields, level);

            return response;
        } catch (error) {
            console.error(`Error in ${handlerName}:`, error);

            try {
                const slackToken = await GetSecretValue(slackWebhookARN);
                const channel = getEnvironmentChannel(baseChannel, 'error');
                console.log('Resolved Slack channel:', channel);
                const message = `${handlerName} execution failed`;
                const fields = [
                    { title: 'Handler', value: handlerName, short: true },
                    { title: 'Status', value: 'Failure', short: true },
                    { title: 'Environment', value: environment, short: true },
                    { title: 'Error', value: (error as Error).message, short: false },
                ];

                await NotifySlack(slackToken, channel, message, fields, 'error');
            } catch (notifyError) {
                console.error('Failed to notify Slack:', notifyError);
            }

            throw error;
        }
    };
};

/**
 * Determines the appropriate Slack channel based on the environment.
 * @param baseChannel - Base channel name.
 * @param level - Notification level (info or error).
 * @returns Full Slack channel name.
 */
const getEnvironmentChannel = (baseChannel: string, level: string): string => {
    return environment === 'staging'
        ? `${baseChannel}-staging`
        : level === 'error'
            ? `${baseChannel}-alerts`
            : baseChannel;
};
