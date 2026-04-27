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

/**
 * Atlas-scoped variant — only accepts paths that live inside the
 * Atlas brand surface. Rejects `/dashboard`, `/assure`, etc. so a
 * `?callbackUrl=/dashboard` on /atlas-login can't smuggle the user
 * into the Caelex dashboard mid-Atlas-flow (brand-isolation breach).
 */
export function safeAtlasUrl(
  raw: string | null | undefined,
  fallback = "/atlas",
): string {
  if (!raw) return fallback;
  if (raw.startsWith("//")) return fallback;
  if (raw.includes("://")) return fallback;
  if (!raw.startsWith("/")) return fallback;
  // Allow /atlas, /atlas/*, and the Atlas auth surfaces themselves so
  // a sign-out → re-login flow keeps the user inside Atlas. Anything
  // else falls through to the fallback.
  if (
    raw === "/atlas" ||
    raw.startsWith("/atlas/") ||
    raw.startsWith("/atlas-")
  ) {
    return raw;
  }
  return fallback;
}
