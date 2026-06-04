/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Event-driven auto-classification (Passage automation).
 *
 * When a TradeItem is created with parametric attributes (aperture, range,
 * payload, rad-hardening, mil-spec, anti-jam) but NO human-declared control
 * code, run the deterministic parametric matcher and propose the top candidate
 * as a SUGGESTION — written to the regime-appropriate field and marked
 * `classificationSource: ASTRA_SUGGESTED` + `status: REQUIRES_REVIEW` so it
 * surfaces in the review queue and the human confirms it in the classify
 * copilot (which flips it to USER_DECLARED / CLASSIFIED).
 *
 * Pure + synchronous + zero external cost — the matcher is deterministic
 * parametric logic (no Claude). Never overrides a human classification.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  attributesToCandidateCodes,
  type SuggestInputAttribute,
} from "@/lib/trade/classify-suggest";

export interface AutoClassifyInput {
  // Human-declared codes — presence of ANY means "do not auto-suggest".
  eccnEU?: string | null;
  eccnUS?: string | null;
  usmlCategory?: string | null;
  mtcrCategory?: string | null;
  // Parametric attributes the matcher reads.
  apertureMeters?: number | null;
  rangeKm?: number | null;
  payloadKg?: number | null;
  isRadHardened?: boolean | null;
  isMilSpec?: boolean | null;
  isAntiJam?: boolean | null;
}

type ClassificationField =
  | "eccnEU"
  | "eccnUS"
  | "usmlCategory"
  | "mtcrCategory";

export interface AutoClassification {
  /** Patch to merge into the TradeItem create (overrides the DRAFT default). */
  patch: Partial<Record<ClassificationField, string>> & {
    classificationSource: "ASTRA_SUGGESTED";
    status: "REQUIRES_REVIEW";
  };
  /** The underlying suggestion (for an optional UI toast / audit note). */
  suggestion: {
    code: string;
    canonicalId: string;
    regime: string;
    confidence: "HIGH" | "MEDIUM" | "LOW";
    rationale: string;
  };
}

/**
 * Map a canonicalId regime prefix to the TradeItem classification field.
 * The prefix (e.g. "ECCN" in "ECCN:9A515.a.1") is the stable corpus key —
 * NOT the freeform `regime` prose. Unknown prefix → null (never mis-route).
 */
export function fieldForCanonicalId(
  canonicalId: string,
): ClassificationField | null {
  const colon = canonicalId.indexOf(":");
  if (colon === -1) return null;
  switch (canonicalId.slice(0, colon)) {
    case "USML":
      return "usmlCategory";
    case "MTCR":
      return "mtcrCategory";
    case "ECCN":
      return "eccnUS"; // US Commerce Control List (EAR)
    case "EU":
      return "eccnEU"; // EU dual-use Annex I
    default:
      return null;
  }
}

const PARAMETRIC_FIELDS: ReadonlyArray<
  keyof Pick<
    AutoClassifyInput,
    | "apertureMeters"
    | "rangeKm"
    | "payloadKg"
    | "isRadHardened"
    | "isMilSpec"
    | "isAntiJam"
  >
> = [
  "apertureMeters",
  "rangeKm",
  "payloadKg",
  "isRadHardened",
  "isMilSpec",
  "isAntiJam",
];

/**
 * Pure: derive a single auto-classification SUGGESTION from an item's
 * parametric attributes. Returns null when there is nothing safe to suggest:
 *  - the user already declared any control code (never override a human),
 *  - no parametric attribute is present,
 *  - the matcher's top candidate is below MEDIUM confidence, or
 *  - the top candidate's regime maps to no known field.
 * Never throws; no I/O.
 */
export function deriveAutoClassification(
  input: AutoClassifyInput,
): AutoClassification | null {
  // 1. Never override a human-declared classification.
  if (
    input.eccnEU ||
    input.eccnUS ||
    input.usmlCategory ||
    input.mtcrCategory
  ) {
    return null;
  }

  // 2. Fold present parametric fields into matcher attributes (declared item
  //    facts are high-confidence inputs). Skip undefined/null + false booleans.
  const attributes: SuggestInputAttribute[] = [];
  for (const field of PARAMETRIC_FIELDS) {
    const v = input[field];
    if (typeof v === "number" && Number.isFinite(v)) {
      attributes.push({ attribute: field, value: v, confidence: "high" });
    } else if (v === true) {
      attributes.push({ attribute: field, value: true, confidence: "high" });
    }
  }
  if (attributes.length === 0) return null;

  // 3. Deterministic matcher. Candidates are ranked HIGH→MEDIUM→LOW; take the
  //    top one that is at least MEDIUM (LOW is too speculative to auto-write).
  const top = attributesToCandidateCodes(attributes).find(
    (c) => c.confidence === "HIGH" || c.confidence === "MEDIUM",
  );
  if (!top) return null;

  const field = fieldForCanonicalId(top.canonicalId);
  if (!field) return null;

  return {
    patch: {
      [field]: top.code,
      classificationSource: "ASTRA_SUGGESTED",
      status: "REQUIRES_REVIEW",
    },
    suggestion: {
      code: top.code,
      canonicalId: top.canonicalId,
      regime: top.regime,
      confidence: top.confidence,
      rationale: top.rationale,
    },
  };
}
