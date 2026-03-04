/**
 * CSRF Protection - Session-Bound Double Submit Cookie Pattern
 *
 * How it works:
 * 1. Middleware generates a CSRF token that includes a hash binding to the session
 * 2. Token format: <random>.<session-hash> — set in a non-HttpOnly cookie (readable by JS)
 * 3. Client-side reads the cookie and sends the token as X-CSRF-Token header
 * 4. Middleware validates header matches cookie AND session hash is correct
 *
 * This prevents CSRF because:
 * - A cross-origin attacker can trigger requests with cookies (cookie auto-sent)
 * - But they cannot read the cookie value (same-origin policy)
 * - So they cannot set the matching header
 * - Session binding prevents token reuse across sessions
 *
 * Combined with the existing origin validation, this provides defense-in-depth.
 */

// Cookie and header names
export const CSRF_COOKIE_NAME = "csrf-token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Hash a session identifier for CSRF binding.
 * Uses SHA-256 via Web Crypto API (Edge Runtime compatible).
 */
export async function hashSessionId(sessionId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(sessionId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = new Uint8Array(hashBuffer);
  return Array.from(hashArray.slice(0, 8))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a cryptographically secure random CSRF token, bound to the session.
 * Uses Web Crypto API (available in Edge Runtime).
 *
 * @param sessionId - The session token value (if available) to bind the CSRF token to
 */
export async function generateCsrfToken(sessionId?: string): Promise<string> {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const random = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (sessionId) {
    const sessionHash = await hashSessionId(sessionId);
    return `${random}.${sessionHash}`;
  }

  return random;
}

/**
 * Validate that the CSRF header matches the CSRF cookie,
 * and optionally that the token is bound to the current session.
 * Returns true if validation passes.
 */
export async function validateCsrfToken(
  cookieValue: string | undefined,
  headerValue: string | null,
  sessionId?: string,
): Promise<boolean> {
  if (!cookieValue || !headerValue) return false;
  if (cookieValue.length !== headerValue.length) return false;

  // Constant-time comparison to prevent timing attacks
  let mismatch = 0;
  for (let i = 0; i < cookieValue.length; i++) {
    mismatch |= cookieValue.charCodeAt(i) ^ headerValue.charCodeAt(i);
  }
  if (mismatch !== 0) return false;

  // If session binding is present, verify the token is bound to the current session
  if (sessionId && cookieValue.includes(".")) {
    const tokenSessionHash = cookieValue.split(".")[1];
    const expectedHash = await hashSessionId(sessionId);
    if (tokenSessionHash.length !== expectedHash.length) return false;
    let hashMismatch = 0;
    for (let i = 0; i < tokenSessionHash.length; i++) {
      hashMismatch |=
        tokenSessionHash.charCodeAt(i) ^ expectedHash.charCodeAt(i);
    }
    if (hashMismatch !== 0) return false;
  }

  return true;
}
