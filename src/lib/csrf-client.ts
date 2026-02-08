/**
 * Client-side CSRF utilities.
 *
 * Reads the CSRF token from the cookie and provides it
 * for inclusion in API request headers.
 */

import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "./csrf";

/**
 * Get the current CSRF token from the cookie.
 * Returns undefined if the cookie is not set.
 */
export function getCsrfToken(): string | undefined {
  if (typeof document === "undefined") return undefined;

  const match = document.cookie.match(
    new RegExp(`(?:^|;\\s*)${CSRF_COOKIE_NAME}=([^;]*)`),
  );
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Get headers object with CSRF token included.
 * Merge this with your fetch headers for mutating requests.
 *
 * @example
 * ```ts
 * fetch("/api/documents", {
 *   method: "POST",
 *   headers: {
 *     "Content-Type": "application/json",
 *     ...csrfHeaders(),
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */
export function csrfHeaders(): Record<string, string> {
  const token = getCsrfToken();
  if (!token) return {};
  return { [CSRF_HEADER_NAME]: token };
}

export { CSRF_HEADER_NAME };
