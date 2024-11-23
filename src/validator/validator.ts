import { IDTokenPayload } from '../../entity/token';
import { clientError } from '../errors/error';

/**
 * Validates an S3 object key.
 * @param key - The object key to validate.
 * @returns Error if the key is invalid, undefined otherwise.
 */
export function validateKey(key: string): void {
    if (!key) {
        throw new Error('NoSuchKey');
    }
}

/**
 * Validates an email address.
 * @param email - The email address to validate.
 * @returns Error if the email is invalid, undefined otherwise.
 */
export function validateEmail(email: string): string | null {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return 'Invalid email format';
    }
    return null; // No error
}
/**
 * Validates a name.
 * @param name - The name to validate.
 * @returns Error if the name is invalid, undefined otherwise.
 */
export function validateName(name: string): void {
    if (!name) {
        throw new Error('Name is required');
    }
    if (name.length < 2) {
        throw new Error('Name must be at least 2 characters long');
    }
}

/**
 * Validates a password.
 * @param password - The password to validate.
 * @returns Error if the password is invalid, undefined otherwise.
 */
export function validatePassword(password: string): void {
    if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long');
    }
    if (!/[a-z]/.test(password)) {
        throw new Error('Password must contain at least one lowercase letter');
    }
    if (!/[A-Z]/.test(password)) {
        throw new Error('Password must contain at least one uppercase letter');
    }
    if (!/\d/.test(password)) {
        throw new Error('Password must contain at least one number');
    }
}

/**
 * Validates a role.
 * @param role - The role to validate.
 * @returns Error if the role is invalid, undefined otherwise.
 */
export function validateRole(role: string): void {
    if (role !== 'mentor' && role !== 'mentee') {
        throw new Error("Invalid role; must be either 'mentor' or 'mentee'");
    }
}

/**
 * Validates all required fields for a user.
 * @param name - The name of the user.
 * @param email - The email of the user.
 * @param password - The password of the user.
 * @param role - The role of the user.
 * @returns Error if any field is invalid, undefined otherwise.
 */
export function validateFields(name: string, email: string, password: string, role: string): string | null {
    try {
        validateName(name);
        validateEmail(email);
        validatePassword(password);
        validateRole(role);
        return null; // No validation errors
    } catch (error) {
        return (error as Error).message; // Return the validation error message
    }
}


/**
 * Validates an authorization header and extracts the token.
 * @param authHeader - The authorization header to validate.
 * @returns The extracted token if valid.
 */
export function validateAuthorizationHeader(authHeader: string): string {
    if (!authHeader) {
        throw clientError(401, 'Authorization header is missing');
    }

    const match = authHeader.match(/^Bearer (.+)$/);
    if (!match || !match[1]) {
        throw clientError(401, 'Invalid authorization token format');
    }

    return match[1];
}

/**
 * Decodes and validates an ID token.
 * @param idToken - The ID token to decode and validate.
 * @returns The decoded payload if valid.
 */
export function decodeAndValidateIDToken(idToken: string): IDTokenPayload {
    const parts = idToken.split('.');
    if (parts.length !== 3) {
        throw new Error('Invalid ID token format');
    }

    try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf-8')) as IDTokenPayload;

        if (!payload.email) {
            throw new Error('Email not found in ID token');
        }
        if (!payload.customRole) {
            throw new Error('Custom role (custom:role) is missing in the token');
        }

        return payload;
    } catch (err) {
        throw new Error('Failed to decode or parse ID token payload');
    }
}
