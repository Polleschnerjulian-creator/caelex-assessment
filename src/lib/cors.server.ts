/**
 * CORS Utility for Public API and Widget Endpoints
 *
 * Handles Cross-Origin Resource Sharing headers for:
 * - Public API endpoints (allow all origins)
 * - Widget endpoints (restrict to registered domains)
 */

import "server-only";

import { NextResponse } from "next/server";

const CORS_METHODS = "GET, POST, OPTIONS";
const CORS_HEADERS = "Content-Type, Authorization, X-Widget-Key";
const CORS_MAX_AGE = "86400"; // 24 hours

/**
 * Apply CORS headers to a response.
 *
 * @param response - The NextResponse to add headers to
 * @param requestOrigin - The Origin header from the incoming request
 * @param allowedOrigins - Array of allowed origins, or "*" for public
 */
export function applyCorsHeaders(
  response: NextResponse,
  requestOrigin: string | null,
  allowedOrigins: string[] | "*",
): NextResponse {
  if (allowedOrigins === "*") {
    response.headers.set("Access-Control-Allow-Origin", "*");
  } else if (requestOrigin && allowedOrigins.includes(requestOrigin)) {
    response.headers.set("Access-Control-Allow-Origin", requestOrigin);
    response.headers.set("Vary", "Origin");
  }

  response.headers.set("Access-Control-Allow-Methods", CORS_METHODS);
  response.headers.set("Access-Control-Allow-Headers", CORS_HEADERS);
  response.headers.set("Access-Control-Max-Age", CORS_MAX_AGE);

  return response;
}

/**
 * Handle CORS preflight (OPTIONS) requests.
 *
 * @param requestOrigin - The Origin header from the incoming request
 * @param allowedOrigins - Array of allowed origins, or "*" for public
 * @returns 204 No Content response with CORS headers
 */
export function handleCorsPreflightResponse(
  requestOrigin: string | null,
  allowedOrigins: string[] | "*",
): NextResponse {
  const response = new NextResponse(null, { status: 204 });
  return applyCorsHeaders(response, requestOrigin, allowedOrigins);
}
