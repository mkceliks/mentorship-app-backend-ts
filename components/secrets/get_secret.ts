import * as aws from 'aws-sdk';

export async function GetSecretValue(secretARN: string): Promise<string> {
    const client = new aws.SecretsManager();

    try {
        const data = await client
            .getSecretValue({ SecretId: secretARN })
            .promise();

        console.log('Secrets Manager response:', JSON.stringify(data));

        if (!data.SecretString) {
            throw new Error('SecretString is empty');
        }

        const secretData = JSON.parse(data.SecretString);
        console.log('Parsed secret data:', secretData);

        if (!secretData.slack_token) {
            throw new Error('slack_token key not found in secret');
        }

        return secretData.slack_token;
    } catch (err) {
        console.error(`Failed to retrieve secret from ARN ${secretARN}:`, err);
        throw err;
    }

}
