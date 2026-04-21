/**
 * Feature flags — "on by default, off if explicitly disabled".
 *
 * Philosophy: features that ship are ON for everyone the moment the
 * commit lands. The env var is a KILL SWITCH, not an opt-in. If a
 * production issue surfaces, set the var to "0"/"false" and redeploy
 * to turn the feature off without reverting code.
 *
 * Recognised values (case-insensitive):
 *   - "0" | "false" | "no" | "off"   → feature DISABLED
 *   - anything else (incl. unset)    → feature ENABLED
 *
 * Why this default polarity (not the usual "off unless on"):
 *   - This repo is a solo build, not a 100-person product org needing
 *     staged rollout. Ship = live.
 *   - Preview deploys still match prod behaviour without extra env
 *     setup — no more "works in preview but not prod" confusion.
 *   - Rollback is still possible: set one env var + redeploy.
 *
 * Env vars recognised:
 *   NEXT_PUBLIC_FEAT_PROVENANCE_V1   — provenance chips, snapshots, side-peek
 *   NEXT_PUBLIC_FEAT_WORKFLOW_V2     — Tier-C workflow route
 */

export type FeatureFlag = "provenance_v1" | "workflow_v2";

const FLAG_ENV_MAP: Record<FeatureFlag, string | undefined> = {
  // Read at module-eval time. Vercel injects NEXT_PUBLIC_* into the
  // client bundle at build time, so this is safe on both sides.
  provenance_v1: process.env.NEXT_PUBLIC_FEAT_PROVENANCE_V1,
  workflow_v2: process.env.NEXT_PUBLIC_FEAT_WORKFLOW_V2,
};

/**
 * Explicit-falsy check. Everything not in the disabled set resolves
 * to true. Accepts common English + numeric disabled tokens.
 */
function isExplicitlyDisabled(v: string | undefined): boolean {
  if (v === undefined) return false;
  const lower = v.trim().toLowerCase();
  if (lower === "") return false; // empty string treated as "not set"
  return (
    lower === "0" ||
    lower === "false" ||
    lower === "no" ||
    lower === "off" ||
    lower === "disabled"
  );
}

/**
 * Returns true unless the flag has been explicitly disabled via its
 * env var. Unknown flag keys resolve to true (fail-open).
 */
export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return !isExplicitlyDisabled(FLAG_ENV_MAP[flag]);
}

/**
 * Explicit opposite — handy when a caller wants to express "only if
 * explicitly disabled" without inverting the polarity at the call site.
 */
export function isFeatureDisabled(flag: FeatureFlag): boolean {
  return isExplicitlyDisabled(FLAG_ENV_MAP[flag]);
}
