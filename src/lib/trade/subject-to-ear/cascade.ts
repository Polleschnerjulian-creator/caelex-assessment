/**
 * Caelex Trade — Three-Gate Cascade Orchestrator (Subject-to-the-EAR).
 *
 * Sprint Z18. Tier 1 per the Living Execution Plan.
 *
 * Composes the three operational gates Blueprint 2 § TL;DR mandates,
 * in strict sequential order:
 *
 *   Gate 1 — ITAR see-through (any USML in BOM → STOP)
 *   Gate 2 — Foreign Direct Product Rule (FDPR § 734.9 — 8 scenarios)
 *   Gate 3 — De Minimis (§ 734.4):
 *            Gate 3a — § 734.4(a) hard carve-outs (no percentage math)
 *            Gate 3b — Percentage threshold (25% / 10%)
 *
 * Gates 1 and 2 stop the cascade on first hit. Gate 3a stops before
 * percentage math if a carve-out fires. Only items passing all three
 * gates are NOT subject to the EAR.
 *
 * This sprint ships the orchestrator with Gate 1 (Z3o) and Gate 3a
 * (Z19) fully wired. Gate 2 (Z20 — FDPR 8 scenarios) is stubbed; the
 * cascade still runs end-to-end and produces a determination, but
 * the FDPR analysis returns a "not-yet-evaluated" flag that the UI
 * must surface as a known-incomplete gate.
 *
 * Gate 3b (percentage math) wraps the existing B5 de-minimis-
 * calculator output — caller supplies the calculated percentage and
 * the cascade applies the correct threshold given the carve-out
 * results and destination.
 *
 * Source: Blueprint 2 § TL;DR + § 9.1 decision flow.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  checkNoDeMinimisCarveOuts,
  type BOMComponentForCarveOut,
  type CarveOutHit,
  type NoDeMinimisCheckResult,
} from "./no-de-minimis-carve-outs";
import { resolveCountryGroups } from "./country-groups";

// ─── Input shape ────────────────────────────────────────────────────

/**
 * BOM component shape consumed by the cascade. Superset of the
 * carve-out checker's shape (which only needs ECCN + value) plus the
 * USML hit + carve-out routing fields.
 */
export interface CascadeBOMComponent extends BOMComponentForCarveOut {
  /**
   * True if the upstream classifier (Z3 matcher) flagged this line as
   * USML-controlled. Drives Gate 1 (ITAR see-through stop).
   */
  isUSML?: boolean;
  /**
   * True if this USML line falls within a published USML→EAR carve-out
   * (e.g. USML XV(c)(3) / XV(e) certain paragraphs when integrated
   * into 9A610 aircraft). When true, the line does NOT trigger
   * Gate 1 stop — the foreign item proceeds to Gates 2/3.
   */
  usmlCarveOutToEar?: boolean;
}

export interface CascadeInput {
  /** ISO-3166 alpha-2 destination country code. */
  destinationCountry: string;
  /**
   * BOM lines for the foreign-made item. Pre-classified by the
   * upstream matcher (Z3).
   */
  bom: CascadeBOMComponent[];
  /**
   * Total fair-market value of the foreign-made item (EUR). Used
   * downstream by Gate 3b percentage math.
   */
  totalValueEur: number;
  /**
   * Optional: end-use hints used by Gate 3a (a)(3) advanced-node-IC
   * fabrication.
   */
  endUseHints?: {
    advancedNodeIcFabrication?: boolean;
  };
  /**
   * Optional: pre-computed US-controlled-content percentage from the
   * existing B5 de-minimis-calculator. If provided AND no carve-out
   * fires, the cascade applies the percentage threshold rule.
   * Caller is responsible for computing this per Supplement No. 2
   * methodology (essential / customary / re-exported with).
   */
  usControlledContentPercent?: number;
}

// ─── Output shape ───────────────────────────────────────────────────

export type CascadeJurisdiction = "ITAR" | "EAR" | "NONE";

export type CascadeGateFired =
  | "ITAR_SEE_THROUGH"
  | "FDPR_NOT_YET_EVALUATED" // stub until Z20 lands
  | "DE_MINIMIS_CARVE_OUT"
  | "DE_MINIMIS_PERCENTAGE_EXCEEDED"
  | "NONE";

export interface CascadeResult {
  jurisdiction: CascadeJurisdiction;
  /**
   * True if the foreign-made item is subject to the EAR. Operator must
   * obtain a BIS authorization (or qualify for a License Exception)
   * before export. If true, a Destination Control Statement (§ 758.6)
   * is required — see Z30.
   */
  subjectToEar: boolean;
  /** Which gate stopped the cascade (or NONE if all gates passed). */
  gateFired: CascadeGateFired;
  /**
   * Gate-1 detail: USML lines that triggered the ITAR see-through stop.
   */
  itarSeeThroughHits: string[];
  /**
   * Gate-2 detail: FDPR analysis (currently STUBBED; will populate
   * post-Z20). The cascade returns subjectToEar based on Gates 1 + 3
   * alone today; the FDPR gate is a known-incomplete TODO that the
   * UI must surface.
   */
  fdprNotYetImplemented: true;
  /** Gate-3a detail: matching § 734.4(a) carve-outs. */
  deMinimisCarveOuts: CarveOutHit[];
  /** Gate-3b detail: percentage threshold applied. */
  appliedThresholdPercent: number | null;
  /** Gate-3b detail: caller-supplied US content percentage (if any). */
  usControlledContentPercent: number | null;
  /**
   * Plain-language rationale: every gate evaluation in order, with
   * citation + outcome. The audit trail.
   */
  rationale: string[];
  /**
   * Operational obligations (DCS, recordkeeping, etc.) that attach
   * when subject_to_ear=true.
   */
  obligations: {
    recordkeepingYears: number;
    destinationControlStatementRequired: boolean;
    recordkeepingBasis: string;
  };
  /** Always emitted — operator review is required. */
  disclaimer: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const THRESHOLD_STANDARD_PCT = 25; // § 734.4(d)
const THRESHOLD_E1_E2_PCT = 10; // § 734.4(c)

const CASCADE_DISCLAIMER =
  "Three-Gate Cascade output is SCREENING-LEVEL guidance. Gate 1 (ITAR see-through) and Gate 3 (§ 734.4 De Minimis) are fully evaluated. Gate 2 (FDPR § 734.9) is currently a known-incomplete stub — the engine does NOT yet check the 8 FDPR scenarios. Until Z20 ships, FDPR analysis must be performed manually for any transaction destined to D:1/D:4/D:5/E:1/E:2 or where US-origin technology / production-equipment was used. Final determination requires qualified export-control counsel.";

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Run the Three-Gate Cascade against a foreign-made item's BOM +
 * destination. Returns a determination of whether the foreign item is
 * subject to the EAR + the full audit trail.
 *
 * Pure function — no I/O. The upstream Z3 classifier produces the
 * ECCN/USML tags; this orchestrator consumes them.
 *
 * Per Blueprint 2 § 9.1, gates fire in strict order; first hit wins.
 */
export function evaluateSubjectToEAR(input: CascadeInput): CascadeResult {
  const rationale: string[] = [];
  const groups = resolveCountryGroups(input.destinationCountry);

  rationale.push(
    `Destination ${input.destinationCountry} resolves to country groups: ${
      Array.from(groups.groups).join(", ") || "(none)"
    }.`,
  );

  // ── Gate 1 — ITAR see-through ────────────────────────────────────
  const itarLines = input.bom.filter(
    (line) => line.isUSML === true && line.usmlCarveOutToEar !== true,
  );
  if (itarLines.length > 0) {
    rationale.push(
      `Gate 1 ITAR see-through: ${itarLines.length} USML defense article(s) in BOM with no USML→EAR carve-out. Per ITAR § 123.1(b), the entire foreign item is ITAR-controlled. EAR analysis halts.`,
    );
    return {
      jurisdiction: "ITAR",
      subjectToEar: false, // ITAR is NOT "subject to the EAR" — different jurisdiction
      gateFired: "ITAR_SEE_THROUGH",
      itarSeeThroughHits: itarLines.map((l) => l.nodeId),
      fdprNotYetImplemented: true,
      deMinimisCarveOuts: [],
      appliedThresholdPercent: null,
      usControlledContentPercent: null,
      rationale,
      obligations: {
        recordkeepingYears: 5,
        destinationControlStatementRequired: false, // ITAR has its own marking req
        recordkeepingBasis: "22 CFR § 122.5 (ITAR 5-year retention)",
      },
      disclaimer: CASCADE_DISCLAIMER,
    };
  }
  rationale.push(
    "Gate 1 ITAR see-through: no USML defense articles in BOM (or all USML lines fall within published USML→EAR carve-outs). Proceeds to Gate 2.",
  );

  // ── Gate 2 — FDPR (STUBBED until Z20 lands) ──────────────────────
  // Per Blueprint 2 § 3 + § 9.1 step 3-9, this evaluates 8 FDPR
  // scenarios in order: NS-FDP (734.9(b)), 9x515-FDP (734.9(c)),
  // 600-series-FDP (734.9(d)), Entity-List FDP footnotes 1/4/5
  // (734.9(e)), Russia/Belarus (734.9(f)), MEU/Procurement (734.9(g)),
  // Advanced Computing (734.9(h)), Supercomputer (734.9(i)).
  //
  // Until Z20 lands, we proceed PAST Gate 2 without analyzing it.
  // The cascade still produces a Gate-3 determination but the
  // `fdprNotYetImplemented` flag in the result MUST be surfaced by
  // the UI so the operator knows Gate 2 is not yet covered.
  rationale.push(
    "Gate 2 FDPR (§ 734.9 — 8 scenarios): NOT YET EVALUATED (Z20 queued). Operator MUST manually evaluate FDPR for any transaction destined to D:1/D:4/D:5/E:1/E:2 or where US-origin technology / production-equipment was used. Proceeds to Gate 3.",
  );

  // ── Gate 3a — § 734.4(a) hard carve-outs ─────────────────────────
  const carveOutResult: NoDeMinimisCheckResult = checkNoDeMinimisCarveOuts({
    destinationCountry: input.destinationCountry,
    countryGroups: groups.groups,
    isMacau: groups.isMacau,
    bom: input.bom,
    endUseHints: input.endUseHints,
  });

  if (carveOutResult.hit) {
    rationale.push(
      `Gate 3a § 734.4(a) hard carve-outs: ${carveOutResult.hits.length} carve-out(s) fired (${carveOutResult.hits.map((h) => h.carveOutId).join(", ")}). Percentage threshold (25%/10%) does not apply — the foreign item is subject to the EAR regardless of US-content percentage. EAR analysis halts.`,
    );
    for (const hit of carveOutResult.hits) {
      rationale.push(`  - ${hit.carveOutId}: ${hit.rationale}`);
    }
    return {
      jurisdiction: "EAR",
      subjectToEar: true,
      gateFired: "DE_MINIMIS_CARVE_OUT",
      itarSeeThroughHits: [],
      fdprNotYetImplemented: true,
      deMinimisCarveOuts: carveOutResult.hits,
      appliedThresholdPercent: 0,
      usControlledContentPercent: input.usControlledContentPercent ?? null,
      rationale,
      obligations: {
        recordkeepingYears: 5,
        destinationControlStatementRequired: true,
        recordkeepingBasis:
          "15 CFR § 762.6 (5-year retention) + 15 CFR § 758.6 (DCS required for foreign-made EAR-controlled items)",
      },
      disclaimer: CASCADE_DISCLAIMER,
    };
  }
  rationale.push(
    "Gate 3a § 734.4(a) hard carve-outs: no carve-out fired. Proceeds to Gate 3b percentage threshold.",
  );

  // ── Gate 3b — Percentage threshold ────────────────────────────────
  // Threshold selection per § 734.4(c)/(d):
  //   - 10% if destination ∈ E:1 or E:2
  //   - 25% otherwise
  const threshold =
    groups.groups.has("E:1") || groups.groups.has("E:2")
      ? THRESHOLD_E1_E2_PCT
      : THRESHOLD_STANDARD_PCT;
  const usPct = input.usControlledContentPercent ?? null;

  if (usPct === null) {
    rationale.push(
      `Gate 3b: no usControlledContentPercent supplied. Threshold ${threshold}% applies for ${input.destinationCountry} but engine cannot make the percentage determination — operator must compute per Supplement No. 2 to Part 734 and re-run.`,
    );
    return {
      jurisdiction: "NONE",
      subjectToEar: false,
      gateFired: "NONE",
      itarSeeThroughHits: [],
      fdprNotYetImplemented: true,
      deMinimisCarveOuts: [],
      appliedThresholdPercent: threshold,
      usControlledContentPercent: null,
      rationale,
      obligations: {
        recordkeepingYears: 5,
        destinationControlStatementRequired: false,
        recordkeepingBasis: "15 CFR § 762.6",
      },
      disclaimer: CASCADE_DISCLAIMER,
    };
  }

  if (usPct > threshold) {
    rationale.push(
      `Gate 3b percentage threshold: US-controlled content ${usPct.toFixed(2)}% EXCEEDS the ${threshold}% threshold for ${input.destinationCountry}. Foreign item IS subject to the EAR.`,
    );
    return {
      jurisdiction: "EAR",
      subjectToEar: true,
      gateFired: "DE_MINIMIS_PERCENTAGE_EXCEEDED",
      itarSeeThroughHits: [],
      fdprNotYetImplemented: true,
      deMinimisCarveOuts: [],
      appliedThresholdPercent: threshold,
      usControlledContentPercent: usPct,
      rationale,
      obligations: {
        recordkeepingYears: 5,
        destinationControlStatementRequired: true,
        recordkeepingBasis: "15 CFR § 762.6 + § 758.6",
      },
      disclaimer: CASCADE_DISCLAIMER,
    };
  }

  // All gates passed — foreign item is NOT subject to the EAR.
  rationale.push(
    `Gate 3b percentage threshold: US-controlled content ${usPct.toFixed(2)}% is at or below the ${threshold}% threshold. Foreign item is NOT subject to the EAR (subject to FDPR caveat — Gate 2 not yet evaluated). Document and retain calculation per Supplement No. 2 + § 762.6 for 5 years.`,
  );
  return {
    jurisdiction: "NONE",
    subjectToEar: false,
    gateFired: "NONE",
    itarSeeThroughHits: [],
    fdprNotYetImplemented: true,
    deMinimisCarveOuts: [],
    appliedThresholdPercent: threshold,
    usControlledContentPercent: usPct,
    rationale,
    obligations: {
      recordkeepingYears: 5,
      destinationControlStatementRequired: false,
      recordkeepingBasis: "15 CFR § 762.6 (de-minimis calculation retention)",
    },
    disclaimer: CASCADE_DISCLAIMER,
  };
}
