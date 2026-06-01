/**
 * Caelex Trade — "BLOCKED → what now" licence-application path.
 *
 * PURE module: no React, no DB, no I/O, no Anthropic. It is a POST-PROCESSOR
 * over the verdict engine's existing per-line `LicenseDetermination` output.
 * It answers, for a non-GO verdict: which single licence application is the
 * actionable next step, which fine-grained TradeLicenseType it maps to, which
 * documents it needs, and a pre-filled DRAFT create-payload the human confirms
 * + files themselves. It NEVER submits and is NOT legal advice.
 *
 * Mirrors the Phase-3B renewal discipline (license-renewal.ts):
 * clone/prefill, blank the authority number + dates, stamp lineage in
 * conditions, return status "DRAFT" + verbatim disclaimer.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  LicenseDetermination,
  LicenseRequirement,
  LicenseAuthority,
  LicenseType as EngineLicenseType,
} from "@/lib/comply-v2/trade/license-determination";
import type { TradeLicenseType } from "@prisma/client";

export type EngineDetermination = LicenseDetermination;

// ─── Severity + authority ordering (deterministic selection) ──────────

// Higher = more severe / higher priority to surface.
const STATUS_SEVERITY: Record<LicenseRequirement["status"], number> = {
  PROHIBITED: 60,
  DENIED: 50,
  REQUIRED: 40,
  LIKELY_REQUIRED: 30,
  UNKNOWN: 20,
  EXCEPTION_MAY_APPLY: 10,
  NLR: 0,
};

// When statuses tie, this authority order breaks the tie (most
// "no-derogation / item-intrinsic" first). DDTC (ITAR) cannot be
// derogated intra-EU; BIS next; then BAFA/EU.
const AUTHORITY_ORDER: Record<LicenseAuthority, number> = {
  DDTC: 4,
  BIS: 3,
  BAFA: 2,
  EU_COMPETENT_AUTHORITY: 1,
  MTCR_REVIEW: 0,
};

/** A requirement is "actionable enough to surface" if it isn't a pure NLR. */
function isSurfaceable(r: LicenseRequirement): boolean {
  return r.status !== "NLR";
}

/** A surfaced target is "blocked" (no application path) for these statuses. */
function isBlockedStatus(status: LicenseRequirement["status"]): boolean {
  return status === "DENIED" || status === "PROHIBITED";
}

export interface ApplicationTarget {
  /** The single strongest requirement across all lines. */
  requirement: LicenseRequirement;
  /** True when no application is possible (DENIED/PROHIBITED/MTCR) → stop state. */
  blocked: boolean;
}

/**
 * Pick the single strongest actionable LicenseRequirement across every
 * classified line's determination. Most-severe status wins; ties broken
 * by authority order; null when nothing is surfaceable (e.g. all NLR / GO).
 */
export function selectApplicationTarget(
  determinations: EngineDetermination[],
): ApplicationTarget | null {
  let best: LicenseRequirement | null = null;
  for (const det of determinations) {
    for (const r of det.requirements) {
      if (!isSurfaceable(r)) continue;
      if (best === null) {
        best = r;
        continue;
      }
      const sevDelta = STATUS_SEVERITY[r.status] - STATUS_SEVERITY[best.status];
      if (sevDelta > 0) best = r;
      else if (
        sevDelta === 0 &&
        AUTHORITY_ORDER[r.authority] > AUTHORITY_ORDER[best.authority]
      ) {
        best = r;
      }
    }
  }
  if (best === null) return null;
  // MTCR_REVIEW is inherently a stop even if mislabelled — treat as blocked.
  const blocked =
    isBlockedStatus(best.status) || best.authority === "MTCR_REVIEW";
  return { requirement: best, blocked };
}

// ─── Engine type → fine-grained TradeLicenseType (conservative) ───────

export interface MappedLicenseType {
  tradeLicenseType: TradeLicenseType;
  /**
   * True when the mapping is a best-guess (the engine type is coarser than
   * the enum). The UI MUST hedge ("wahrscheinliche Einstufung — bestätigen")
   * when this is set.
   */
  approximate: boolean;
}

/**
 * Map the engine's coarse (authority, licenseType) onto the fileable
 * TradeLicenseType enum. TOTAL (never throws, never null) and CONSERVATIVE:
 * when ambiguous, pick the safest *individual/specific* licence of that
 * authority and flag `approximate` so the UI hedges.
 *
 * CONSERVATIVE BIAS (deliberate, novice-safe): we NEVER auto-select a
 * general authorisation / licence exception (BAFA AGG/EUGEA, BIS STA/CSA/ENC)
 * even when the engine hints one — the operator is a novice who must confirm
 * eligibility for any general authorisation themselves.
 */
export function mapToTradeLicenseType(
  authority: LicenseAuthority,
  engineLicenseType: EngineLicenseType | null,
): MappedLicenseType {
  switch (authority) {
    case "DDTC":
      if (engineLicenseType === "TAA")
        return { tradeLicenseType: "DDTC_TAA", approximate: false };
      // DSP5 / SPECIFIC_LICENSE / null → individual DSP-5 export licence.
      return {
        tradeLicenseType: "DDTC_DSP5",
        approximate: engineLicenseType !== "DSP5",
      };
    case "BIS":
      // EAR specific licence is the safe default; STA/ENC etc. are exceptions
      // the operator confirms, so we do NOT auto-pick an exception type here.
      return { tradeLicenseType: "BIS_EAR", approximate: true };
    case "BAFA":
      // Einzelausfuhrgenehmigung is the safe default; AGG/EUGEA are
      // general authorisations the operator confirms eligibility for.
      return { tradeLicenseType: "BAFA_EINZEL", approximate: true };
    case "EU_COMPETENT_AUTHORITY":
      // EU national competent authority for a DE operator → route via BAFA.
      return { tradeLicenseType: "BAFA_EINZEL", approximate: true };
    case "MTCR_REVIEW":
      // No fileable individual licence — caller treats as blocked; OTHER as
      // a non-misleading placeholder (a draft is never built for this).
      return { tradeLicenseType: "OTHER", approximate: true };
    default:
      return { tradeLicenseType: "OTHER", approximate: true };
  }
}
