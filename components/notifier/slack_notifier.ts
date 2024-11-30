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

    const web = new WebClient(token);

    console.log('Sending message to Slack:', {
        token: token,
        baseChannel,
        message,
        fields,
        level,
    });


    try {
        await web.conversations.join({ channel: baseChannel });

        const attachments = [
            {
                color: colorMap[level] || '#36a64f',
                text: message,
                fields: fields.map((field) => ({
                    title: field.title,
                    value: field.value,
                    short: field.short || false,
                })),
            },
        ];

        await web.chat.postMessage({
            channel: baseChannel,
            attachments,
        });

        console.log(`Message sent to Slack channel ${baseChannel}`);
    } catch (err) {
        console.error(`Failed to send message to Slack channel ${baseChannel}:`, err);
    }
}
