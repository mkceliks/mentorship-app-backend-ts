import { WebClient } from '@slack/web-api';

export async function NotifySlack(
    token: string,
    baseChannel: string,
    message: string,
    fields: { title: string; value: string; short?: boolean }[],
    level: 'info' | 'warning' | 'error'
): Promise<void> {
    if (!token) {
        console.error('Slack token is missing.');
        throw new Error('Slack token is required');
    }

    if (!baseChannel) {
        console.error('Base channel is missing.');
        throw new Error('Base channel is required');
    }

    if (!message) {
        console.error('Message is missing.');
        throw new Error('Message is required');
    }

    if (!fields || !Array.isArray(fields)) {
        console.error('Fields are missing or invalid.');
        throw new Error('Fields must be an array');
    }

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
                short: field.short ?? false,
            })),
        },
    ];

    console.log('Preparing to send message to Slack:', { baseChannel, message, fields, level });

    try {
        try {
            console.log(`Joining channel ${baseChannel} if not already joined.`);
            await slackClient.conversations.join({ channel: baseChannel });
        } catch (joinError) {
            console.warn(`Failed to join channel ${baseChannel}. This might be expected for public channels.`, joinError);
        }

        const response = await slackClient.chat.postMessage({
            channel: baseChannel,
            attachments,
        });

        if (!response.ok) {
            throw new Error(`Slack API returned an error: ${response.error}`);
        }

        console.log(`Message sent successfully to Slack channel ${baseChannel}`);
    } catch (err) {
        console.error(`Failed to send message to Slack channel ${baseChannel}:`, err);
        throw new Error(`Slack notification failed: ${err}`);
    }
}
