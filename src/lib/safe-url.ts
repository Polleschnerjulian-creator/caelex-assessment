/**
 * Safe-URL validator for navigation targets from untrusted sources
 * (LLM output, user input, URL params, etc.).
 *
 * Only accepts:
 *   - Site-relative paths ("/dashboard", "/atlas/...")
 *   - Fragment-only (#section)
 *
 * Rejects:
 *   - javascript:, data:, vbscript:, file:, about: schemes
 *   - protocol-relative URLs ("//evil.com")
 *   - absolute URLs (even https://)
 *   - Anything else
 *
 * Use this before any `window.location.href = x` / `router.push(x)` call
 * where `x` could be influenced by LLM output, URL params, or stored
 * user content.
 */
export function isSafeInternalUrl(url: unknown): url is string {
  if (typeof url !== "string") return false;
  if (url.length === 0 || url.length > 2048) return false;

  // Trim common whitespace control chars that could smuggle schemes
  // through isomorphic whitespace handling (e.g. `\tjavascript:...`)
  const trimmed = url.trim();
  if (trimmed !== url) return false;

  // Fragment-only — always OK
  if (url.startsWith("#")) return true;

  // Must start with a single forward slash AND not a second slash
  // (`//evil.com` is a protocol-relative URL → absolute in practice)
  if (!url.startsWith("/")) return false;
  if (url.startsWith("//")) return false;

  // No control characters; no backslash path tricks
  if (/[\u0000-\u001f\u007f\\]/.test(url)) return false;

  // No inline scheme (extra-paranoid check — url already has to start
  // with "/" so this should never fire, but cheap insurance against
  // future refactors that relax the first check).
  if (/^\s*[a-z][a-z0-9+.-]*:/i.test(url)) return false;

  return true;
}

/**
 * Normalise an untrusted URL to a safe one. Falls back to the given
 * `fallback` (default `/`) when the input fails the safety check.
 */
export function safeInternalUrl(url: unknown, fallback: string = "/"): string {
  return isSafeInternalUrl(url) ? url : fallback;
}
