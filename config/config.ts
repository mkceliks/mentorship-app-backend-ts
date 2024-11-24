import * as fs from 'fs';
import * as yaml from 'js-yaml';

export interface Config {
    environment: string;
    account: string;
    appName: string;
    region: string;
    cognitoAuthorizer: string;
    cognitoPoolArn: string;
    cognitoClientId: string;
    userProfileDDBTableName: string;
    userPoolName: string;
    bucketName: string;
    slackWebhookSecretArn: string;
    endpointBaseUrl: string;
    allowUnconfirmedLogin: boolean;
}

export class AppConfig {
    private static instance: Config;

    static loadConfig(environment: string, filePath = './config/config.yaml'): Config {
        if (!environment) {
            throw new Error(
                'Environment variable is empty. Please specify the environment (e.g., "staging" or "production").'
            );
        }

        const configFile = fs.readFileSync(filePath, 'utf8');
        const configData = yaml.load(configFile) as Record<string, Config>;

        if (!configData[environment]) {
            throw new Error(`Environment '${environment}' not found in config file.`);
        }

        this.instance = configData[environment];
        return this.instance;
    }

    static getConfig(): Config {
        if (!this.instance) {
            throw new Error('Config not initialized. Call loadConfig first.');
        }
        return this.instance;
    }
}
