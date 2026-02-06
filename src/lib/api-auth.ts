/**
 * API Authentication Middleware
 * Handles API key validation for public API endpoints
 */

import { NextRequest, NextResponse } from "next/server";
import { ApiKey } from "@prisma/client";
import {
  validateApiKey,
  hasScope,
  hasAnyScope,
  checkRateLimit,
  logApiRequest,
} from "./services/api-key-service";

// ─── Types ───

export interface ApiAuthResult {
  authenticated: boolean;
  apiKey?: ApiKey;
  error?: string;
  statusCode?: number;
}

export interface ApiContext {
  apiKey: ApiKey;
  organizationId: string;
  startTime: number;
}

// ─── Authentication ───

/**
 * Authenticate an API request
 */
export async function authenticateApiRequest(
  request: NextRequest,
): Promise<ApiAuthResult> {
  // Get API key from header
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      authenticated: false,
      error: "Missing Authorization header",
      statusCode: 401,
    };
  }

  // Support both "Bearer <key>" and just "<key>"
  const apiKeyString = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  // Validate the key
  const result = await validateApiKey(apiKeyString);

  if (!result.valid || !result.apiKey) {
    return {
      authenticated: false,
      error: result.error || "Invalid API key",
      statusCode: 401,
    };
  }

  // Check rate limit
  const rateLimitResult = await checkRateLimit(
    result.apiKey.id,
    result.apiKey.rateLimit,
  );

  if (!rateLimitResult.allowed) {
    return {
      authenticated: false,
      error: "Rate limit exceeded",
      statusCode: 429,
    };
  }

  return {
    authenticated: true,
    apiKey: result.apiKey,
  };
}

/**
 * Require specific scope(s) for an API request
 */
export function requireScope(apiKey: ApiKey, scope: string): boolean {
  return hasScope(apiKey, scope);
}

/**
 * Require any of the specified scopes
 */
export function requireAnyScope(apiKey: ApiKey, scopes: string[]): boolean {
  return hasAnyScope(apiKey, scopes);
}

// ─── Response Helpers ───

/**
 * Create an API error response
 */
export function apiError(
  message: string,
  statusCode: number = 400,
  details?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {
      error: {
        message,
        code: statusCode,
        ...details,
      },
    },
    {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Create an API success response
 */
export function apiSuccess<T>(
  data: T,
  statusCode: number = 200,
  meta?: Record<string, unknown>,
): NextResponse {
  return NextResponse.json(
    {
      data,
      ...(meta && { meta }),
    },
    {
      status: statusCode,
      headers: {
        "Content-Type": "application/json",
      },
    },
  );
}

/**
 * Add rate limit headers to response
 */
export function addRateLimitHeaders(
  response: NextResponse,
  remaining: number,
  limit: number,
  resetAt: Date,
): NextResponse {
  response.headers.set("X-RateLimit-Limit", limit.toString());
  response.headers.set("X-RateLimit-Remaining", remaining.toString());
  response.headers.set(
    "X-RateLimit-Reset",
    Math.floor(resetAt.getTime() / 1000).toString(),
  );
  return response;
}

// ─── Request Logging ───

/**
 * Log an API request (call after response is ready)
 */
export async function logRequest(
  apiKeyId: string,
  request: NextRequest,
  statusCode: number,
  startTime: number,
  error?: string,
): Promise<void> {
  const responseTimeMs = Date.now() - startTime;

  await logApiRequest(apiKeyId, {
    method: request.method,
    path: new URL(request.url).pathname,
    statusCode,
    responseTimeMs,
    ipAddress:
      request.headers.get("x-forwarded-for")?.split(",")[0] ||
      request.headers.get("x-real-ip") ||
      undefined,
    userAgent: request.headers.get("user-agent") || undefined,
    errorCode: error ? statusCode.toString() : undefined,
    errorMessage: error,
  });
}

// ─── Wrapper Function ───

/**
 * Wrap an API handler with authentication and logging
 */
export function withApiAuth(
  handler: (request: NextRequest, context: ApiContext) => Promise<NextResponse>,
  options?: {
    requiredScopes?: string[];
    anyScopes?: string[];
  },
) {
  return async (request: NextRequest): Promise<NextResponse> => {
    const startTime = Date.now();

    // Authenticate
    const authResult = await authenticateApiRequest(request);

    if (!authResult.authenticated || !authResult.apiKey) {
      return apiError(
        authResult.error || "Unauthorized",
        authResult.statusCode || 401,
      );
    }

    // Check required scopes
    if (options?.requiredScopes) {
      const hasAllScopes = options.requiredScopes.every((scope) =>
        hasScope(authResult.apiKey!, scope),
      );
      if (!hasAllScopes) {
        await logRequest(
          authResult.apiKey.id,
          request,
          403,
          startTime,
          "Insufficient permissions",
        );
        return apiError("Insufficient permissions", 403, {
          requiredScopes: options.requiredScopes,
        });
      }
    }

    if (options?.anyScopes) {
      if (!hasAnyScope(authResult.apiKey, options.anyScopes)) {
        await logRequest(
          authResult.apiKey.id,
          request,
          403,
          startTime,
          "Insufficient permissions",
        );
        return apiError("Insufficient permissions", 403, {
          requiredScopes: options.anyScopes,
        });
      }
    }

    // Execute handler
    try {
      const response = await handler(request, {
        apiKey: authResult.apiKey,
        organizationId: authResult.apiKey.organizationId,
        startTime,
      });

      // Log successful request
      await logRequest(
        authResult.apiKey.id,
        request,
        response.status,
        startTime,
      );

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Internal server error";

      await logRequest(
        authResult.apiKey.id,
        request,
        500,
        startTime,
        errorMessage,
      );

      return apiError(errorMessage, 500);
    }
  };
}
