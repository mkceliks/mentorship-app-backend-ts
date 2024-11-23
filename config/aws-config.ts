import * as AWS from 'aws-sdk';
import { AppConfig } from './config';

export class AWSConfig {
    private static awsConfig: AWS.Config;

    static initAWSConfig(): void {
        const config = AppConfig.getConfig();

        this.awsConfig = new AWS.Config({
            region: config.region,
        });
    }

    static getCognitoClient(): AWS.CognitoIdentityServiceProvider {
        return new AWS.CognitoIdentityServiceProvider(this.awsConfig);
    }

    static getDynamoDBClient(): AWS.DynamoDB {
        return new AWS.DynamoDB(this.awsConfig);
    }
}
