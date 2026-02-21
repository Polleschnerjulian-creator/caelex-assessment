/**
 * URL Validation — SSRF Protection
 * Blocks requests to private/internal IP ranges and suspicious hostnames
 */

const PRIVATE_IP_PATTERNS = [
  /^127\./, // 127.0.0.0/8 loopback
  /^10\./, // 10.0.0.0/8 private
  /^192\.168\./, // 192.168.0.0/16 private
  /^172\.(1[6-9]|2[0-9]|3[01])\./, // 172.16.0.0/12 private
  /^169\.254\./, // 169.254.0.0/16 link-local (AWS metadata)
  /^0\./, // 0.0.0.0/8
  /^::1$/, // IPv6 loopback
  /^fe80:/i, // IPv6 link-local
  /^fc00:/i, // IPv6 unique local
  /^fd/i, // IPv6 unique local
  /^localhost$/i, // localhost
  /^\[::1\]$/, // IPv6 loopback in brackets
  /\.local$/i, // mDNS local domains
  /\.internal$/i, // internal domains
  /\.localhost$/i, // *.localhost
];

/**
 * Blocked URL schemes that could be abused for SSRF
 */
const BLOCKED_PROTOCOLS = new Set([
  "file:",
  "ftp:",
  "gopher:",
  "data:",
  "dict:",
]);

/**
 * Check if a URL points to a private/internal network address.
 * Returns true if the URL is unsafe (internal).
 */
export function isInternalUrl(urlString: string): boolean {
  try {
    const url = new URL(urlString);

    // Block non-HTTP(S) protocols
    if (BLOCKED_PROTOCOLS.has(url.protocol)) {
      return true;
    }

    // Only allow http/https
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return true;
    }

    const hostname = url.hostname;

    // Block empty hostname
    if (!hostname) return true;

    // Block hostnames that are IP addresses in non-standard formats
    // e.g., decimal IP (2130706433 = 127.0.0.1), octal (0177.0.0.1)
    if (/^\d+$/.test(hostname)) {
      return true; // Decimal IP encoding
    }
    if (/^0[0-7]/.test(hostname)) {
      return true; // Octal IP encoding
    }
    if (/^0x/i.test(hostname)) {
      return true; // Hex IP encoding
    }

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
