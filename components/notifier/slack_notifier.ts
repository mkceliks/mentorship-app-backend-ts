import { WebClient } from '@slack/web-api';

export async function NotifySlack(
    token: string,
    baseChannel: string,
    message: string,
    fields: { title: string; value: string; short?: boolean }[],
    level: 'info' | 'warning' | 'error'
): Promise<void> {
    const colorMap = {
        info: '#36a64f',
        warning: '#FFA500',
        error: '#FF0000',
    };

    const slackClient = new WebClient(token);

    const attachments = [
        {
            color: colorMap[level],
            text: message,
            fields: fields.map((field) => ({
                title: field.title,
                value: field.value,
                short: field.short || false,
            })),
        },
    ];

    console.log('Sending message to Slack:', { baseChannel, message, fields, level });

    try {
        await slackClient.conversations.join({ channel: baseChannel });

        await slackClient.chat.postMessage({
            channel: baseChannel,
            attachments,
        });

        console.log(`Message sent successfully to Slack channel ${baseChannel}`);
    } catch (err) {
        console.error(`Failed to send message to Slack channel ${baseChannel}:`, err);
    }
}