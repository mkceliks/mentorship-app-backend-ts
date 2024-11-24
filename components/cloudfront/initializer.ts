import * as cdk from 'aws-cdk-lib';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export function CreateCloudFrontDistribution(
    scope: Construct,
    api: apigateway.RestApi,
    environment: string
): cloudfront.Distribution {
    const apiDomain = getDomainName(api);

    const distribution = new cloudfront.Distribution(scope, `CloudFrontDistribution-${environment}`, {
        defaultBehavior: {
            origin: new origins.HttpOrigin(apiDomain),
            allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
            cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
        },
        additionalBehaviors: {
            '/public/*': {
                origin: new origins.HttpOrigin(apiDomain),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
            },
            '/protected/*': {
                origin: new origins.HttpOrigin(apiDomain),
                allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
                cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
            },
        },
    });

    new cdk.CfnOutput(scope, `CloudFrontDistributionUrl-${environment}`, {
        value: distribution.distributionDomainName,
        description: 'CloudFront Distribution URL',
        exportName: `CloudFrontDistributionUrl-${environment}`,
    });

    return distribution;
}

function getDomainName(api: apigateway.RestApi): string {
    return `${api.restApiId}.execute-api.${cdk.Stack.of(api).region}.amazonaws.com`;
}
