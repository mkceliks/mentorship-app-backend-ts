import { APIGatewayProxyResult } from 'aws-lambda';

// Error constants
export const ErrNoSuchKey = new Error('NoSuchKey');
export const ErrUserAlreadyExists = new Error('user already exists');
export const ErrInvalidCredentials = new Error('invalid credentials');
export const ErrMissingAuthorization = new Error('authorization header is missing');
export const ErrMissingToken = new Error('ID token is missing');
export const ErrInvalidTokenFormat = new Error('invalid ID token format');
export const ErrEmailNotFound = new Error('email not found in ID token');

// Handle S3 errors
export function handleS3Error(err: Error): APIGatewayProxyResult {
    if (err === ErrNoSuchKey) {
        return clientError(404, 'File not found');
    }
    console.error('S3 error:', err);
    return serverError('Internal server error');
}

// Server error response
export function serverError(message: string): APIGatewayProxyResult {
    console.error(`Server error: ${message}`);
    return {
        statusCode: 500,
        body: JSON.stringify({ error: message }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    };
}

// Client error response
export function clientError(status: number, message: string): APIGatewayProxyResult {
    console.error(`Client error: ${message}`);
    return {
        statusCode: status,
        body: JSON.stringify({ error: message }),
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    };
}

// Error type checks
export function isInvalidConfirmationCodeError(err: Error | null): boolean {
    return !!err && err.message.includes('InvalidParameterException') && err.message.includes('Invalid code');
}

export function isExpiredConfirmationCodeError(err: Error | null): boolean {
    return !!err && err.message.includes('ExpiredCodeException');
}

export function isUserAlreadyExistsError(err: Error | null): boolean {
    return err === ErrUserAlreadyExists;
}

export function isInvalidCredentialsError(err: Error | null): boolean {
    return err === ErrInvalidCredentials;
}

export function isDynamoDBNotFoundError(err: Error | null): boolean {
    return err === ErrNoSuchKey;
}
