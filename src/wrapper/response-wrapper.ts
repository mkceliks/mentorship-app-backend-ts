export type Headers = Record<string, string>;
export type AccessControl = Record<string, string>;

/**
 * Returns default access control headers.
 */
export const setAccessControl = (): AccessControl => {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-file-content-type',
    };
};

/**
 * Returns headers for DELETE requests.
 */
export const setHeadersDelete = (): Headers => {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-file-content-type',
    };
};

/**
 * Returns headers for GET requests, with a customizable content type.
 * @param contentType - The content type to set (defaults to "application/json").
 */
export const setHeadersGet = (contentType: string = 'application/json'): Headers => {
    return {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-file-content-type',
    };
};

/**
 * Returns headers for POST requests.
 */
export const setHeadersPost = (): Headers => {
    return {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-file-content-type',
    };
};
