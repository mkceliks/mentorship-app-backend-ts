import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export const UploadLambdaName = 'upload';
export const DownloadLambdaName = 'download';
export const ListLambdaName = 'list';
export const DeleteLambdaName = 'delete';
export const LoginLambdaName = 'login';
export const RegisterLambdaName = 'register';
export const MeLambdaName = 'me';
export const ConfirmLambdaName = 'confirm';
export const ResendLambdaName = 'resend';

export function InitializeAPI(
    scope: Construct,
    lambdas: Record<string, lambda.Function>,
    cognitoAuthorizer: apigateway.IAuthorizer,
    environment: string
): apigateway.RestApi {
    const api = new apigateway.RestApi(scope, `api-gateway-${environment}`, {
        restApiName: `api-gateway-${environment}`,
        defaultCorsPreflightOptions: {
            allowOrigins: apigateway.Cors.ALL_ORIGINS,
            allowMethods: apigateway.Cors.ALL_METHODS,
            allowHeaders: ['Content-Type', 'Authorization', 'x-file-content-type'],
        },
        deployOptions: {
            stageName: environment,
        },
    });

    SetupPublicEndpoints(api, lambdas);
    SetupProtectedEndpoints(api, lambdas, cognitoAuthorizer);

    return api;
}

function SetupPublicEndpoints(api: apigateway.RestApi, lambdas: Record<string, lambda.Function>): void {
    addApiResource(api, 'POST', RegisterLambdaName, lambdas[RegisterLambdaName], null);
    addApiResource(api, 'POST', LoginLambdaName, lambdas[LoginLambdaName], null);
    addApiResource(api, 'POST', UploadLambdaName, lambdas[UploadLambdaName], null);
    addApiResource(api, 'POST', ConfirmLambdaName, lambdas[ConfirmLambdaName], null);
    addApiResource(api, 'GET', ResendLambdaName, lambdas[ResendLambdaName], null);
}

function SetupProtectedEndpoints(
    api: apigateway.RestApi,
    lambdas: Record<string, lambda.Function>,
    cognitoAuthorizer: apigateway.IAuthorizer
): void {
    addApiResource(api, 'GET', DownloadLambdaName, lambdas[DownloadLambdaName], cognitoAuthorizer);
    addApiResource(api, 'GET', ListLambdaName, lambdas[ListLambdaName], cognitoAuthorizer);
    addApiResource(api, 'DELETE', DeleteLambdaName, lambdas[DeleteLambdaName], cognitoAuthorizer);
    addApiResource(api, 'GET', MeLambdaName, lambdas[MeLambdaName], cognitoAuthorizer);
}

function addApiResource(
    api: apigateway.RestApi,
    method: string,
    resourceName: string,
    lambdaFunction: lambda.Function,
    cognitoAuthorizer: apigateway.IAuthorizer | null
): void {
    const resource = api.root.addResource(resourceName);

    const methodOptions: apigateway.MethodOptions = cognitoAuthorizer
        ? {
            authorizationType: apigateway.AuthorizationType.COGNITO,
            authorizer: cognitoAuthorizer,
        }
        : {};

    resource.addMethod(method, new apigateway.LambdaIntegration(lambdaFunction), methodOptions);
}
