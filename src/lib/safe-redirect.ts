/**
 * safeInternalUrl — whitelist a user-controlled redirect target.
 *
 * Returns the input only if it's a same-origin relative path (starts
 * with a single "/", no scheme, no protocol-relative "//"). Anything
 * else — including absolute URLs to trusted domains — falls back to
 * the provided default.
 *
 * Used on every redirect after authentication where the destination
 * comes from a query-string `callbackUrl`. Middleware validates
 * server-issued redirects, but `router.push(callbackUrl)` on the
 * client bypasses middleware entirely — Next.js treats an external
 * URL as a full-document navigation, and the browser never hits our
 * server. Without this helper, `?callbackUrl=https://evil.com` would
 * land a just-authenticated user on an attacker-controlled page.
 *
 * Audit: docs/security/atlas-audit-2026-04-22.md (C-2).
 */
export function safeInternalUrl(
  raw: string | null | undefined,
  fallback: string,
): string {
  if (!raw) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  if (!raw.startsWith("/")) return fallback;
  return raw;
}
