/**
 * CSRF Protection - Double Submit Cookie Pattern
 *
 * How it works:
 * 1. Middleware sets a random CSRF token in a non-HttpOnly cookie (readable by JS)
 * 2. Client-side reads the cookie and sends the token as X-CSRF-Token header
 * 3. Middleware validates that the header value matches the cookie value
 *
 * This prevents CSRF because:
 * - A cross-origin attacker can trigger requests with cookies (cookie auto-sent)
 * - But they cannot read the cookie value (same-origin policy)
 * - So they cannot set the matching header
 *
 * Combined with the existing origin validation, this provides defense-in-depth.
 */

// Cookie and header names
export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically secure random CSRF token.
 * Uses Web Crypto API (available in Edge Runtime).
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate that the CSRF header matches the CSRF cookie.
 * Returns true if validation passes.
 */
export function validateCsrfToken(
  cookieValue: string | undefined,
  headerValue: string | null,
): boolean {
  if (!cookieValue || !headerValue) return false;
  if (cookieValue.length !== headerValue.length) return false;

  // Constant-time comparison to prevent timing attacks
  let mismatch = 0;
  for (let i = 0; i < cookieValue.length; i++) {
    mismatch |= cookieValue.charCodeAt(i) ^ headerValue.charCodeAt(i);
  }
  return mismatch === 0;
}
