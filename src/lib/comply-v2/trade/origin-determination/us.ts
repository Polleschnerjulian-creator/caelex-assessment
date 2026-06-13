/**
 * US origin module (Spec 2026-06-13 §4.2) — WRAP of the existing EAR/ITAR/
 * de-minimis decision, NOT a rewrite.
 *
 * ─── Why this is a wrapper, not new logic ─────────────────────────────────
 * The US EAR/ITAR/de-minimis verdict is produced ENTIRELY by the engine's
 * Gates 2 (ITAR), 3 (de-minimis / EAR), and 3.5 (declared-code backstop) in
 * `determineLicenseRequirements`. US's origin routing is `dualUsePrimary =
 * EAR_CCL → US_CCL` (REGIME_MATURITY 2) and `militaryPrimary = USML`
 * (maturity 1) — BOTH below tier 3 — so Gate 4.5 (the thin-origin fail-closed
 * REVIEW) NEVER fires for a US seat. The US leg is already fully decided by the
 * time the origin-determination stage runs.
 *
 * This module therefore READS the engine's own already-computed requirements
 * (`input.priorRequirements`) and re-expresses the US posture as an
 * `OriginLicenceVerdict` — the architecture proof on the most mature existing
 * logic. It rewrites nothing and duplicates nothing.
 *
 * ─── Behaviour-identity ───────────────────────────────────────────────────
 * Because the EAR/ITAR/de-minimis requirements are already present, the
 * module's verdict folds to NOTHING net-new (outcome NONE) — guaranteeing the
 * engine's US-origin output stays byte-identical after wiring (snapshot-proven
 * in `us.test.ts`). The verdict's `outcome`/`licenceType` still faithfully
 * MIRROR the existing decision (BLOCKED when a hard prohibition fired, REVIEW
 * when a US licence is required, GO when only a licence-exception/NLR path
 * remains) so the Phase-W AVA line can surface the US licence detail.
 *
 * Authority is reported as the existing engine authorities BIS (EAR) + DDTC
 * (ITAR); the EAR License Exceptions (STA/GBS/…) and ITAR exemptions the engine
 * already encodes are the module's "general licences" — surfaced via the
 * existing `applicableException` data the engine attaches, not re-modelled here.
 *
 * Pure — no I/O.
 */

import type { LicenseRequirement } from "../license-determination";
import type { OriginDeterminationInput, OriginLicenceVerdict } from "./types";

/** US authorities for the verdict label (EAR=BIS, ITAR=DDTC). */
const US_AUTHORITY = "BIS/DDTC";

/**
 * Map the US-leg `RequirementStatus` values present in the engine's own output
 * to a single origin outcome (the strictest wins, mirroring the gate
 * aggregation): PROHIBITED/DENIED → BLOCKED; REQUIRED/LIKELY_REQUIRED/UNKNOWN →
 * REVIEW; otherwise GO.
 */
function summariseUsPosture(
  reqs: readonly LicenseRequirement[],
): Pick<OriginLicenceVerdict, "outcome" | "licenceType" | "reasons"> {
  const hasBlocked = reqs.some(
    (r) => r.status === "DENIED" || r.status === "PROHIBITED",
  );
  if (hasBlocked) {
    return {
      outcome: "BLOCKED",
      licenceType: "PROHIBITED",
      reasons: [
        "US-Recht (EAR/ITAR) verbietet bzw. versagt diese Ausfuhr — vorgelagerte Hartverbots-/Versagungs-Gates greifen.",
      ],
    };
  }
  const hasReview = reqs.some(
    (r) =>
      r.status === "REQUIRED" ||
      r.status === "LIKELY_REQUIRED" ||
      r.status === "UNKNOWN",
  );
  if (hasReview) {
    return {
      outcome: "REVIEW",
      licenceType: "INDIVIDUAL",
      reasons: [
        "US-Genehmigung (BIS-Lizenz bzw. DDTC-Autorisierung) erforderlich oder weitere EAR-Analyse nötig.",
      ],
    };
  }
  return {
    outcome: "GO",
    licenceType: "NONE",
    reasons: [
      "Keine US-Genehmigungspflicht offen (NLR / greifende Lizenzausnahme / de-minimis-konform).",
    ],
  };
}

/**
 * US `OriginLicenceModule`. Wraps the engine's already-computed EAR/ITAR/
 * de-minimis decision. Returns a verdict that:
 *   • mirrors the US posture (for the AVA detail line), AND
 *   • folds to NOTHING net-new (so wiring stays behaviour-identical) — see the
 *     `foldOriginVerdict` no-op invariant. To enforce that, the verdict is
 *     always typed so its fold is empty: when the US leg is already covered
 *     (which it always is), licenceType collapses to NONE for the fold, while
 *     `outcome` preserves the human-facing posture.
 */
export const usOriginModule = (
  input: OriginDeterminationInput,
): OriginLicenceVerdict => {
  const prior = input.priorRequirements ?? [];
  const posture = summariseUsPosture(prior);
  return {
    // Human-facing posture (AVA line, Phase W).
    outcome: posture.outcome,
    // FOLD CONTRACT: NONE → foldOriginVerdict returns [] → byte-identical.
    // The EAR/ITAR/de-minimis requirements are already in `prior`; re-folding
    // them would duplicate. The US wrap is intentionally additive-zero.
    licenceType: "NONE",
    authority: US_AUTHORITY,
    reasons: posture.reasons,
    citations: [
      "https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-740", // EAR License Exceptions
      "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-126", // ITAR exemptions
    ],
  };
};
