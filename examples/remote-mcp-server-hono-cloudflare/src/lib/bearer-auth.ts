import { Context, MiddlewareHandler } from "hono";
import {
    InsufficientScopeError,
    InvalidTokenError,
    OAuthError,
    ServerError,
} from "./errors.js";
import { importJWK, JWK, jwtVerify } from 'jose'
import { AuthInfo, AuthInfoSchema } from "./schemas.js";

declare module "hono" {
    interface ContextVariableMap {
        auth: AuthInfo;
    }
}

// Type definitions
interface JwtHeader {
    kid: string;
    [key: string]: unknown;
}

interface JwtPayload {
    aud: string | string[];
    sub: string;
    exp: number;
    scope?: string;
    [key: string]: unknown;
}

interface JwtVerificationResult {
    header: JwtHeader;
    payload: JwtPayload;
}

// Helper functions
function decodeBase64Url(base64Url: string): string {
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    return atob(base64 + padding);
}

function parseJwtHeader(token: string): JwtHeader {
    const [headerB64] = token.split('.');
    const headerStr = decodeBase64Url(headerB64);
    return JSON.parse(headerStr);
}

async function fetchJwks(jwksUrl: string): Promise<JWK[]> {
    const keysResponse = await fetch(jwksUrl);
    if (!keysResponse.ok) {
        throw new Error(`Failed to fetch JWKS: ${keysResponse.status}`);
    }

    const { keys } = await keysResponse.json() as { keys: JWK[] };
    if (!keys || !Array.isArray(keys) || keys.length === 0) {
        throw new Error('No valid keys found in JWKS');
    }

    return keys;
}

function findMatchingKey(keys: JWK[], kid: string): JWK {
    const key = keys.find(k => k.kid === kid);
    if (!key) {
        throw new Error('No matching key found for token');
    }
    return key;
}

function validateRequiredClaims(payload: JwtPayload): void {
    if (!payload.aud || !payload.sub || !payload.exp) {
        throw new Error('Token missing required claims');
    }
}

function validateAudience(payload: JwtPayload, audience?: string[]): void {
    if (!audience?.length) return;

    const tokenAudience = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
    const hasValidAudience = audience.some(aud => tokenAudience.includes(aud));
    if (!hasValidAudience) {
        throw new InvalidTokenError(`Invalid token audience. Expected one of: ${audience.join(', ')}`);
    }
}

function extractAndValidateScopes(payload: JwtPayload, requiredScopes?: string[]): string[] {
    const scopes = payload.scope ? payload.scope.split(' ').filter(Boolean) : [];

    if (requiredScopes?.length) {
        const missingScopes = requiredScopes.filter(scope => !scopes.includes(scope));
        if (missingScopes.length > 0) {
            throw new InsufficientScopeError(`Missing required scopes: ${missingScopes.join(', ')}`);
        }
    }

    return scopes;
}

async function verifyJwt(token: string, key: JWK): Promise<JwtVerificationResult> {
    const importedKey = await importJWK(key);
    const { payload } = await jwtVerify(token, importedKey) as { payload: JwtPayload };
    const header = parseJwtHeader(token);
    return { header, payload };
}

// Main token verification function
async function verifyAccessToken(
    token: string,
    jwksUrl: string,
    audience?: string[],
    requiredScopes?: string[],
): Promise<AuthInfo> {
    try {
        // Fetch and validate JWKS
        const keys = await fetchJwks(jwksUrl);

        // Parse and verify JWT
        const header = parseJwtHeader(token);
        const key = findMatchingKey(keys, header.kid);
        const { payload } = await verifyJwt(token, key);

        // Validate claims
        validateRequiredClaims(payload);
        validateAudience(payload, audience);
        const scopes = extractAndValidateScopes(payload, requiredScopes);

        return AuthInfoSchema.parse({
            token,
            clientId: payload.sub,
            scopes,
            expiresAt: payload.exp,
        });

    } catch (error) {
        if (error instanceof OAuthError) {
            throw error;
        }
        throw new InvalidTokenError('Failed to validate token');
    }
}

/**
 * Middleware that requires a valid Bearer token in the Authorization header.
 *
 * This will validate the token with the auth provider and add the resulting auth info to the request object.
 * The middleware performs several validations:
 * - Presence and format of Authorization header
 * - Required scopes (if specified)
 * - Token audience (if specified)
 */
export function descopeMcpBearerAuth(audience?: string[], requiredScopes?: string[]): MiddlewareHandler {
    return async (c: Context, next) => {

        try {
            const authHeader = c.req.header("Authorization");
            if (!authHeader) {
                console.log("Missing Authorization header");
                throw new InvalidTokenError("Missing Authorization header");
            }

            const [type, token] = authHeader.split(" ");
            if (type.toLowerCase() !== "bearer" || !token) {
                throw new InvalidTokenError(
                    "Invalid Authorization header format, expected 'Bearer TOKEN'",
                );
            }

            const baseUrl = c.env.DESCOPE_BASE_URL || "https://api.descope.com";
            const jwksUrl = `${baseUrl}/v2/keys/${c.env.DESCOPE_PROJECT_ID}`;

            const authInfo = await verifyAccessToken(token, jwksUrl, audience, requiredScopes);

            // @ts-expect-error
            c.executionCtx.props = {
                auth: authInfo,
            };
            await next();
        } catch (error) {
            console.log("Error in descopeMcpBearerAuth middleware", error);
            return handleAuthError(error, c);
        }
    };
}

function handleAuthError(error: unknown, c: Context) {
    if (error instanceof InvalidTokenError) {
        c.header(
            "WWW-Authenticate",
            `Bearer error="${error.errorCode}", error_description="${error.message}"`,
        );
        return c.json(error.toResponseObject(), 401);
    } else if (error instanceof InsufficientScopeError) {
        c.header(
            "WWW-Authenticate",
            `Bearer error="${error.errorCode}", error_description="${error.message}"`,
        );
        return c.json(error.toResponseObject(), 403);
    } else if (error instanceof ServerError) {
        return c.json(error.toResponseObject(), 500);
    } else if (error instanceof OAuthError) {
        return c.json(error.toResponseObject(), 400);
    } else {
        console.error("Unexpected error authenticating bearer token:", error);
        const serverError = new ServerError("Internal Server Error");
        return c.json(serverError.toResponseObject(), 500);
    }
}
