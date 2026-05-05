import "server-only";

/**
 * Verity feature flags — server-side only.
 *
 * Distinct from `src/lib/feature-flags.ts` (which uses NEXT_PUBLIC_*
 * vars that ship to the client bundle). Verity flags are evaluated
 * exclusively on the server because:
 *   - the value affects DB-write content (which commitment scheme the
 *     attestation persists), so the client cannot override it anyway
 *   - the v3 range proof is a 12 KB JSON payload — we don't want to
 *     bake the version string into the client bundle and leak it to
 *     people who shouldn't know we're rolling out v3
 *
 * # T3-2 (audit fix 2026-05-05): VERITY_CRYPTO_VERSION
 *
 * The Phase 2 / Phase 2.1 crypto upgrade ships v2 (Pedersen + Schnorr
 * proof-of-knowledge) and v3 (Pedersen + zero-knowledge range proof)
 * implementations behind a default-v1 fallback. This flag flips the
 * default for new attestations:
 *
 *   VERITY_CRYPTO_VERSION=v1   ← default (SHA-256 commitment, trusted issuer)
 *   VERITY_CRYPTO_VERSION=v2   ← Pedersen + Schnorr PoK
 *   VERITY_CRYPTO_VERSION=v3   ← Pedersen + range proof (trustless)
 *
 * Operator-supplied `commitment_scheme` API parameters take precedence
 * over the env-var default (see `resolveCommitmentScheme`). This is
 * intentional: an integrator running ahead of our default rollout can
 * opt into v3 immediately, and a regulator integration that requires
 * v1 for backwards compatibility can pin v1 at the call site.
 *
 * Migration plan: see `docs/VERITY-AUDIT-FIX-PLAN.md` Tier 3 step T3-4.
 *  1. Land this code (deployed default = v1, no behaviour change).
 *  2. Set VERITY_CRYPTO_VERSION=v2 in staging for one week. Watch
 *     attestation-throughput + verifier latency dashboards.
 *  3. If green, set VERITY_CRYPTO_VERSION=v2 in production.
 *  4. Wait one full attestation-cycle (90 days, the default expiry)
 *     so older v1 attestations age out naturally.
 *  5. Repeat (2)/(3) for v3.
 *
 * Existing attestations are NEVER rewritten — the version is fixed at
 * issue time. Verifiers detect the version from the signed bytes and
 * route to the correct verifier. So a tenant on v3 will still validate
 * an old v1 attestation it issued in 2026.
 */

export type CryptoVersion = "v1" | "v2" | "v3";

/**
 * Read the configured default crypto version from the env. Falls back
 * to "v1" on any unrecognised value (including empty / undefined) —
 * the conservative default never weakens trust.
 */
export function getDefaultCryptoVersion(): CryptoVersion {
  const raw = process.env.VERITY_CRYPTO_VERSION?.trim().toLowerCase();
  if (raw === "v2") return "v2";
  if (raw === "v3") return "v3";
  return "v1";
}

/**
 * Choose the commitment scheme for a given attestation issue request.
 *
 * Precedence:
 *   1. Operator-supplied `commitment_scheme` (API request body) — wins
 *      if it is one of "v1" | "v2" | "v3".
 *   2. Server default from VERITY_CRYPTO_VERSION env var.
 *   3. Hardcoded fallback "v1".
 *
 * Returns "v1" for any unrecognised input rather than throwing — the
 * caller-side Zod schema in API routes already rejects invalid strings
 * before they reach this helper, so this is the second line of defence.
 */
export function resolveCommitmentScheme(
  requested: string | undefined | null,
): CryptoVersion {
  if (requested === "v1" || requested === "v2" || requested === "v3") {
    return requested;
  }
  return getDefaultCryptoVersion();
}
