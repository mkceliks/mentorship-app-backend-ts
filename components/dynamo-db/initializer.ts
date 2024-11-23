import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export function InitializeProfileTable(
    scope: Construct,
    tableName: string,
    removalPolicy: cdk.RemovalPolicy
): dynamodb.Table {
    return new dynamodb.Table(scope, tableName, {
        tableName: tableName,
        partitionKey: {
            name: 'UserId',
            type: dynamodb.AttributeType.STRING,
        },
        sortKey: {
            name: 'ProfileType',
            type: dynamodb.AttributeType.STRING,
        },
        billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
        removalPolicy: removalPolicy,
    });
}
