/**
 * URL Validation — SSRF Protection
 * Blocks requests to private/internal IP ranges
 */

const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8 private
  /^192\.168\./, // 192.168.0.0/16 private
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12 private
  /^169\.254\./, // 169.254.0.0/16 link-local
  /^0\./, // 0.0.0.0/8
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique local
  /^fd/i, // IPv6 unique local
  /^localhost$/i, // localhost
  /^\[::1\]$/, // IPv6 loopback in brackets
];

/**
 * Check if a URL points to a private/internal network address.
 * Returns true if the URL is unsafe (internal).
 */
export function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname;
    return PRIVATE_IP_PATTERNS.some((pattern) => pattern.test(hostname));
  } catch {
    return true; // Invalid URL = unsafe
  }
}

/**
 * Validate a URL is safe for server-side requests (not internal).
 * Throws an error if the URL points to an internal address.
 */
export function validateExternalUrl(urlString: string, context: string): void {
  if (isInternalUrl(urlString)) {
    throw new Error(
      `${context} URL cannot point to an internal network address`,
    );
  }
}
