import * as aws from 'aws-sdk';

export async function GetSecretValue(secretARN: string): Promise<string> {
    const client = new aws.SecretsManager();

    try {
        console.log(`Fetching secret from ARN: ${secretARN}`);
        const data = await client.getSecretValue({ SecretId: secretARN }).promise();

        if (!data.SecretString) {
            throw new Error('SecretString is missing from Secrets Manager response');
        }

        console.log('Secrets Manager response received:', JSON.stringify(data));

        let secretData: Record<string, any>;
        try {
            secretData = JSON.parse(data.SecretString);
        } catch (parseError) {
            throw new Error('Failed to parse SecretString as JSON');
        }

        console.log('Parsed secret data:', secretData);

        if (!secretData.slack_token) {
            throw new Error('Missing slack_token key in parsed secret data');
        }

        return secretData.slack_token;
    } catch (err) {
        console.error(`Error retrieving secret from Secrets Manager (ARN: ${secretARN}):`, err);
        throw new Error(`Unable to fetch secret: ${err}`);
    }
}
