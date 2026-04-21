/**
 * Feature flags — tiny env-backed toggle system for Context-Omnipresence
 * rollout. Deliberately minimal: a map of `key → NEXT_PUBLIC_*` env var,
 * read once at module load, exposed via a pure function.
 *
 * Keeping this minimal (no DB, no provider, no hook) because:
 *   1. Provenance v1 rolls out by git branch / Vercel env — not per-user.
 *   2. A per-user flag table can be added later without changing this API.
 *   3. Using `NEXT_PUBLIC_*` means both client and server read the same value.
 *
 * Usage:
 *   import { isFeatureEnabled } from "@/lib/feature-flags";
 *   if (isFeatureEnabled("provenance_v1")) { ... }
 *
 * Env vars recognised:
 *   NEXT_PUBLIC_FEAT_PROVENANCE_V1 = "1" | "true" → enables Phase 4 UI.
 */

export type FeatureFlag = "provenance_v1";

const FLAG_ENV_MAP: Record<FeatureFlag, string | undefined> = {
  // Read at module-eval time. Vercel injects NEXT_PUBLIC_* into the
  // client bundle at build time, so this is safe on both sides.
  provenance_v1: process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1,
};

function truthy(v: string | undefined): boolean {
  if (!v) return false;
  const lower = v.toLowerCase();
  return lower === "1" || lower === "true" || lower === "yes" || lower === "on";
}

/**
 * True if the flag's env var is a truthy value.
 * Any unrecognised flag returns false.
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return truthy(FLAG_ENV_MAP[flag]);
}
