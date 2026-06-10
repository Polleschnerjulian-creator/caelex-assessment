/**
 * Client-side utm_source carry for lead attribution (ILA campaign).
 *
 * The visitor lands on /assessment/quick?utm_source=ila2026, but the
 * lead is captured screens later on the RESULTS page where the query
 * string is long gone. sessionStorage bridges the gap: the wizard
 * remembers the slug on mount, the email gate recalls it on submit.
 *
 * Slug-validated on BOTH ends (here and server-side in
 * lead-capture.server.ts) — junk never travels.
 */

const KEY = "caelex-utm-source";
const SLUG_RE = /^[a-z0-9_-]{2,40}$/;

/** Persist ?utm_source=… from the current URL, if present and slug-clean. */
export function rememberUtmSource(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = new URLSearchParams(window.location.search)
      .get("utm_source")
      ?.trim()
      .toLowerCase();
    if (raw && SLUG_RE.test(raw)) {
      window.sessionStorage.setItem(KEY, raw);
    }
  } catch {
    // sessionStorage unavailable (private mode quirks) — attribution is
    // best-effort, the lead itself must never depend on it.
  }
}

/** The remembered slug, or null. */
export function recallUtmSource(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.sessionStorage.getItem(KEY);
    return stored && SLUG_RE.test(stored) ? stored : null;
  } catch {
    return null;
  }
}
