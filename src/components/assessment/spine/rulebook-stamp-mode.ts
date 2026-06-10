/**
 * Task 4.4 — the stale-verdict CTA decision, as a PURE function so the
 * entitlement gate is node-testable without jsdom.
 *
 * Founder §11.2: the living tier (re-run against a newer rulebook) is PAID.
 *  - not stale            → null (no banner)
 *  - stale + entitled     → "rerun"  (the button POSTs /api/assessment/v2/reassess;
 *                           the server-side 403 remains the enforcement backstop)
 *  - stale + NOT entitled → "upgrade" (link to /pricing; NO reassess call may
 *                           be reachable from the DOM in this mode)
 */
export type StaleCtaMode = "rerun" | "upgrade" | null;

export function staleCtaMode(
  snapshotVersion: string,
  currentVersion: string,
  livingEntitled: boolean,
): StaleCtaMode {
  if (snapshotVersion === currentVersion) return null;
  return livingEntitled ? "rerun" : "upgrade";
}
