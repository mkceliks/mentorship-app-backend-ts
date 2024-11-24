import * as cdk from 'aws-cdk-lib';
import { MentorshipAppBackendTsStack } from '../lib/mentorship-app-backend-ts-stack';
import { AppConfig } from '../config/config';

function getEnvironment(): string {
    const env = process.env.TARGET_ENV;
    if (!env) {
        throw new Error("Environment not specified. Please set TARGET_ENV environment variable.");
    }
    return env;
}

async function main() {
    const environment = getEnvironment();
    const config = AppConfig.loadConfig(environment);

    const app = new cdk.App();

    const awsContext: cdk.Environment = {
        account: config.account,
        region: config.region,
    };

    new MentorshipAppBackendTsStack(app, `${config.appName}-${environment}`, { env: awsContext }, config);

    // Synthesize the app
    app.synth();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
