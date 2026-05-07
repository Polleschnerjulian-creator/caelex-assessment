/**
 * Sprint B3 — Property-Trigger Engine.
 *
 * Maps a TradeItem's physical and technical properties to a set of
 * classification code *suggestions* across the 5 jurisdictions.
 *
 * This engine is PURE — no database calls, no LLM calls, no async.
 * Input: `ItemSignals` (a subset of TradeItem fields).
 * Output: `TriggerResult[]` — each triggered rule with reasons,
 *         suggested codes, and a confidence tier.
 *
 * The results feed Sprint B4 (Astra tool) and Sprint B7 (UI).
 * Sprint B6 (License-Determination Engine) reads the MTCR Cat. I
 * flag emitted here to apply the strong-presumption-of-denial gate.
 *
 * Design principles:
 *   1. Each rule is self-contained: `TriggerRule.check()` returns
 *      true/false; the matched result is deterministic.
 *   2. Rules are declarative — the array is the contract.
 *      Adding a new rule requires NO changes to `evaluate()`.
 *   3. A single item CAN and SHOULD trigger multiple rules (e.g. a
 *      rad-hard, mil-spec EO satellite triggers at least 4 rules).
 *   4. Confidence tiers mirror defensibility:
 *        HIGH   = threshold definitively met; auditable numeric check
 *        MEDIUM = boolean flag set by user; flag alone is not auditable
 *        LOW    = heuristic or indirect inference; requires human review
 *
 * Source authority: CLAUDE.md § Export Control + cross-reference-topics.ts
 */

import type { ClassificationJurisdiction } from "@/data/trade/schema";
import {
  isTopicMtcrCategoryI,
  findEntriesByTopic,
  hasItarEntry,
} from "./classification-lookup";

// ─── Input type ───────────────────────────────────────────────────────

/**
 * The subset of TradeItem fields the trigger engine evaluates.
 * Uses `number | null` and `boolean` to decouple from Prisma types.
 */
export interface ItemSignals {
  // Physical properties
  /** Optical aperture in metres. Threshold: 0.50 m → USML XV(a)(7)(i). */
  apertureMeters: number | null;
  /** Maximum range in km. Threshold: 300 km → MTCR Cat. I territory. */
  rangeKm: number | null;
  /** Maximum payload in kg. Threshold: 500 kg → MTCR Cat. I. */
  payloadKg: number | null;

  // Boolean flags (set by user at item-creation time)
  isRadHardened: boolean | null;
  isMilSpec: boolean | null;
  isAntiJam: boolean | null;

  // Free-text description (used for low-confidence keyword heuristics)
  description?: string;

  // Existing classifications (trigger engine uses these for consistency checks)
  eccnEU?: string | null;
  eccnUS?: string | null;
  usmlCategory?: string | null;
}

// ─── Output types ─────────────────────────────────────────────────────

export type TriggerConfidence = "HIGH" | "MEDIUM" | "LOW";

/**
 * A single suggested classification code: jurisdiction + code string.
 */
export interface SuggestedCode {
  jurisdiction: ClassificationJurisdiction;
  code: string;
  /**
   * Whether this code triggers the MTCR strong-presumption-of-denial gate.
   * Sprint B6 checks this flag — items with ANY mtcrCatI=true code require
   * a license even to MTCR partner nations except in exceptional cases.
   */
  mtcrCatI: boolean;
  /**
   * Whether this code is ITAR-controlled (USML jurisdiction).
   * ITAR jurisdiction: De-minimis rule does NOT apply; requires DDTC auth.
   */
  itar: boolean;
}

/**
 * The result of a single triggered rule.
 */
export interface TriggerResult {
  /** Stable identifier for this rule (for persistence + test assertions). */
  ruleId: string;

  /** Human-readable explanation of why this rule fired. */
  reason: string;

  /** The cross-reference topic that clusters the suggested codes. */
  topicSlug: string;

  /** Suggested classification codes across jurisdictions. */
  suggestedCodes: SuggestedCode[];

  /**
   * Confidence in the suggestion:
   *   HIGH   = numeric threshold definitively met
   *   MEDIUM = boolean flag set; flag alone is not auditable
   *   LOW    = keyword/heuristic inference
   */
  confidence: TriggerConfidence;

  /**
   * True when this result requires a human compliance officer to verify
   * before the TradeItem status advances to CLASSIFIED.
   * Always true for ITAR-controlled codes and MTCR Cat. I.
   */
  requiresHumanReview: boolean;

  /**
   * Optional advisory note surfaced in the UI classification panel.
   */
  advisory?: string;
}

// ─── Rule type ────────────────────────────────────────────────────────

interface TriggerRule {
  ruleId: string;
  /** Returns true if this rule applies to the given signals. */
  check: (s: ItemSignals) => boolean;
  /** Builds the TriggerResult when check() returns true. */
  result: (s: ItemSignals) => Omit<TriggerResult, "ruleId">;
}

// ─── Rule implementations ─────────────────────────────────────────────

const RULES: TriggerRule[] = [
  // ─────────────────────────────────────────────────────────────────
  // Rule 1: MTCR Cat. I — Complete Launch Vehicles
  // Threshold: range ≥ 300 km AND payload ≥ 500 kg
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "MTCR_CAT_I_LAUNCH_VEHICLE",
    check: (s) =>
      s.rangeKm !== null &&
      s.payloadKg !== null &&
      s.rangeKm >= 300 &&
      s.payloadKg >= 500,
    result: (s) => ({
      reason: `Range ≥ 300 km (${s.rangeKm} km) AND payload ≥ 500 kg (${s.payloadKg} kg) — MTCR Cat. I thresholds met.`,
      topicSlug: "complete-launch-vehicles",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "9A004",
          mtcrCatI: true,
          itar: false,
        },
        {
          jurisdiction: "EU_ANNEX_I",
          code: "9A104",
          mtcrCatI: true,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "9A004", mtcrCatI: true, itar: false },
        { jurisdiction: "USML", code: "IV(a)(1)", mtcrCatI: true, itar: true },
        {
          jurisdiction: "MTCR_ANNEX",
          code: "1.A.1",
          mtcrCatI: true,
          itar: false,
        },
        {
          jurisdiction: "DE_ANLAGE_AL",
          code: "0009",
          mtcrCatI: true,
          itar: false,
        },
      ],
      confidence: "HIGH",
      requiresHumanReview: true,
      advisory:
        "MTCR Cat. I: strong presumption of denial applies. ITAR jurisdiction (USML IV(a)(1)) also triggered — DDTC license required for export from the US. Always seek legal counsel for SLV-level items.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 2: MTCR — Sub-Cat-I range (≥ 300 km but payload < 500 kg)
  // Cat. II — case-by-case licensing
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "MTCR_RANGE_SUB_CAT_I",
    check: (s) =>
      s.rangeKm !== null &&
      s.rangeKm >= 300 &&
      (s.payloadKg === null || s.payloadKg < 500),
    result: (s) => ({
      reason: `Range ≥ 300 km (${s.rangeKm} km) but payload < 500 kg — MTCR Cat. II (propulsion/sounding-rocket scope).`,
      topicSlug: "rocket-propulsion-liquid-engines",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "9A005",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "EU_ANNEX_I",
          code: "9A105",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "9A005", mtcrCatI: false, itar: false },
        {
          jurisdiction: "MTCR_ANNEX",
          code: "2.A.1",
          mtcrCatI: false,
          itar: false,
        },
      ],
      confidence: "HIGH",
      requiresHumanReview: true,
      advisory:
        "MTCR Cat. II — case-by-case analysis. No presumption of denial but license required for most destinations outside MTCR partner nations. Verify payload capacity — if 500 kg is achievable in any configuration, escalate to Cat. I.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 3: High-Resolution EO — Aperture ≥ 0.50 m → USML threshold
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "USML_EO_HIGH_RES",
    check: (s) => s.apertureMeters !== null && s.apertureMeters >= 0.5,
    result: (s) => ({
      reason: `Optical aperture ≥ 0.50 m (${s.apertureMeters} m) — meets USML XV(a)(7)(i) EO threshold. BIS 2024 Interim Final Rule retained this cutoff.`,
      topicSlug: "high-resolution-eo-payloads",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "6A002",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "EU_ANNEX_I",
          code: "6A003",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "6A002", mtcrCatI: false, itar: false },
        { jurisdiction: "US_CCL", code: "6A003", mtcrCatI: false, itar: false },
        {
          jurisdiction: "USML",
          code: "XV(a)(7)(i)",
          mtcrCatI: false,
          itar: true,
        },
      ],
      confidence: "HIGH",
      requiresHumanReview: true,
      advisory:
        "USML XV(a)(7)(i) — aperture ≥ 0.50 m. ITAR-controlled: requires DDTC DSP-5 or TAA for export. De-minimis rule does NOT apply to USML items. Recommend DDTC Commodity Jurisdiction (CJ) determination if aperture is within ± 0.05 m of threshold.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 4: Commercial EO — Aperture below USML threshold
  // → CCL 9A515.g or EU 6A002/6A003
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "CCL_EO_COMMERCIAL",
    check: (s) => s.apertureMeters !== null && s.apertureMeters < 0.5,
    result: (s) => ({
      reason: `Optical aperture < 0.50 m (${s.apertureMeters} m) — below USML XV(a)(7)(i) threshold, likely CCL 9A515.g or EU 6A002/6A003.`,
      topicSlug: "high-resolution-eo-payloads",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "6A002",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "EU_ANNEX_I",
          code: "6A003",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "6A002", mtcrCatI: false, itar: false },
        {
          jurisdiction: "US_CCL",
          code: "9A515.g",
          mtcrCatI: false,
          itar: false,
        },
      ],
      confidence: "HIGH",
      requiresHumanReview: false,
      advisory:
        "Below USML aperture threshold. Verify sensor performance (NETD, quantum efficiency) against 6A002 sub-parameters — sensor quality can still trigger control even at sub-0.50 m aperture.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 5: Radiation-hardened electronics flag
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "RAD_HARD_ELECTRONICS",
    check: (s) => s.isRadHardened === true,
    result: () => ({
      reason:
        "Radiation-hardened designation set — item likely meets 3A001.a.1 TID/SEU thresholds.",
      topicSlug: "spacecraft-rad-hard-electronics",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "3A001.a.1",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "US_CCL",
          code: "3A001.a.1",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "US_CCL",
          code: "9A515.d",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "DE_ANLAGE_AL",
          code: "3A001.a.1",
          mtcrCatI: false,
          itar: false,
        },
      ],
      confidence: "MEDIUM",
      requiresHumanReview: true,
      advisory:
        "Rad-hard flag requires verified TID rating ≥ 5×10⁴ rad(Si) and SEU/SEL thresholds. US-origin rad-hard ICs trigger De-minimis calculations. Confirm manufacturer data sheet before ECCN self-classification.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 6: Mil-spec flag → spacecraft bus check
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "MIL_SPEC_SPACECRAFT",
    check: (s) => s.isMilSpec === true,
    result: () => ({
      reason:
        "Mil-spec flag set — spacecraft with military-specification components may be USML XV(a)(1).",
      topicSlug: "spacecraft-bus-platforms",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "9A515",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "US_CCL",
          code: "9A515.a",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "USML", code: "XV(a)(1)", mtcrCatI: false, itar: true },
        {
          jurisdiction: "DE_ANLAGE_AL",
          code: "9A515",
          mtcrCatI: false,
          itar: false,
        },
      ],
      confidence: "MEDIUM",
      requiresHumanReview: true,
      advisory:
        "Mil-spec items often remain USML XV(a)(1) post-ECR 2014. Verify: does the item have anti-jam, anti-spoof, COMSEC, LPI/LPD, or hardened ECCM capabilities? If yes, strong USML XV indication.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 7: Anti-jam flag → GNSS / TT&C
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "ANTI_JAM_SYSTEM",
    check: (s) => s.isAntiJam === true,
    result: () => ({
      reason:
        "Anti-jam/anti-spoof flag set — triggers USML XII(d) for GNSS or USML XI(c)(2) for TT&C systems.",
      topicSlug: "gnss-receivers-imus-star-trackers",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "7A005",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "7A005", mtcrCatI: false, itar: false },
        { jurisdiction: "USML", code: "XII(d)", mtcrCatI: false, itar: true },
        { jurisdiction: "USML", code: "XI(c)(2)", mtcrCatI: false, itar: true },
      ],
      confidence: "MEDIUM",
      requiresHumanReview: true,
      advisory:
        "Anti-jam GNSS receivers are controlled under USML XII(d). Anti-jam TT&C / MILSATCOM waveforms are USML XI(c)(2). Distinguish the system type to choose the correct category. Both require DDTC license for export.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 8: Keyword — Electric propulsion (description heuristic)
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "KEYWORD_ELECTRIC_PROPULSION",
    check: (s) => {
      if (!s.description) return false;
      const d = s.description.toLowerCase();
      return (
        d.includes("hall thruster") ||
        d.includes("hall-effect") ||
        d.includes("ion thruster") ||
        d.includes("gridded ion") ||
        d.includes("electric propulsion") ||
        d.includes("feep") ||
        d.includes("ppt thruster")
      );
    },
    result: () => ({
      reason:
        "Description contains electric-propulsion keywords (Hall thruster, ion thruster, FEEP, PPT).",
      topicSlug: "hall-thrusters-electric-propulsion",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "9A011",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "9A011", mtcrCatI: false, itar: false },
        { jurisdiction: "USML", code: "XV(e)(2)", mtcrCatI: false, itar: true },
        {
          jurisdiction: "MTCR_ANNEX",
          code: "9A106",
          mtcrCatI: false,
          itar: false,
        },
      ],
      confidence: "LOW",
      requiresHumanReview: true,
      advisory:
        "Low confidence — keyword match only. Verify Isp and thrust thresholds against 9A011 parameters. PCU/PPU (power-conditioning unit) is often the ITAR-controlled component. US-origin PCUs trigger De-minimis rule.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 9: Keyword — SAR / radar (description heuristic)
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "KEYWORD_SAR_RADAR",
    check: (s) => {
      if (!s.description) return false;
      const d = s.description.toLowerCase();
      return (
        d.includes("synthetic aperture") ||
        d.includes(" sar ") ||
        d.includes("sar payload") ||
        d.includes("radar payload") ||
        d.includes("spaceborne radar")
      );
    },
    result: () => ({
      reason: "Description contains SAR/spaceborne-radar keywords.",
      topicSlug: "synthetic-aperture-radar-payloads",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "6A008",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "6A008", mtcrCatI: false, itar: false },
        {
          jurisdiction: "US_CCL",
          code: "9A515.j",
          mtcrCatI: false,
          itar: false,
        },
        {
          jurisdiction: "USML",
          code: "XV(a)(7)(ii)",
          mtcrCatI: false,
          itar: true,
        },
      ],
      confidence: "LOW",
      requiresHumanReview: true,
      advisory:
        "Low confidence — keyword match only. SAR boundary depends on resolution, PRF, and bandwidth thresholds. High-resolution interferometric SAR remains USML XV(a)(7)(ii). Commercial low-resolution SAR may qualify for CCL 9A515.j.",
    }),
  },

  // ─────────────────────────────────────────────────────────────────
  // Rule 10: Keyword — Launch vehicle (description heuristic)
  // ─────────────────────────────────────────────────────────────────
  {
    ruleId: "KEYWORD_LAUNCH_VEHICLE",
    check: (s) => {
      if (!s.description) return false;
      const d = s.description.toLowerCase();
      return (
        d.includes("launch vehicle") ||
        d.includes("rocket stage") ||
        d.includes("upper stage") ||
        d.includes("space launch system") ||
        d.includes("orbital launch")
      );
    },
    result: () => ({
      reason: "Description contains launch-vehicle keywords.",
      topicSlug: "complete-launch-vehicles",
      suggestedCodes: [
        {
          jurisdiction: "EU_ANNEX_I",
          code: "9A004",
          mtcrCatI: false,
          itar: false,
        },
        { jurisdiction: "US_CCL", code: "9A004", mtcrCatI: false, itar: false },
      ],
      confidence: "LOW",
      requiresHumanReview: true,
      advisory:
        "Low confidence — keyword match only. Provide range and payload capacity to determine MTCR Cat. I vs. II threshold. Complete SLVs are always ITAR (USML IV(a)(1)) and require DDTC authorization.",
    }),
  },
];

// ─── Engine ───────────────────────────────────────────────────────────

/**
 * Summary emitted alongside the rule results.
 */
export interface TriggerEvaluation {
  /** Results from all triggered rules. */
  results: TriggerResult[];

  /** True if ANY result has an ITAR-controlled code (USML jurisdiction). */
  hasItarFlag: boolean;

  /** True if ANY result has an MTCR Cat. I code. */
  hasMtcrCatIFlag: boolean;

  /** True if ANY result requires human review. */
  requiresHumanReview: boolean;

  /**
   * Highest confidence tier across all results.
   * Used to show a single badge in the UI when multiple rules fire.
   */
  maxConfidence: TriggerConfidence | null;

  /** Number of rules that fired. */
  triggeredRuleCount: number;
}

/**
 * Run all trigger rules against the given signals and return a
 * `TriggerEvaluation` with the full result set.
 *
 * @example
 * const ev = evaluateItemSignals({
 *   apertureMeters: 0.8,
 *   rangeKm: null,
 *   payloadKg: null,
 *   isRadHardened: true,
 *   isMilSpec: false,
 *   isAntiJam: false,
 * });
 * // ev.results[0].ruleId === "USML_EO_HIGH_RES"
 * // ev.hasItarFlag === true
 */
export function evaluateItemSignals(signals: ItemSignals): TriggerEvaluation {
  const results: TriggerResult[] = [];

  for (const rule of RULES) {
    if (rule.check(signals)) {
      results.push({ ruleId: rule.ruleId, ...rule.result(signals) });
    }
  }

  const hasItarFlag = results.some((r) => r.suggestedCodes.some((c) => c.itar));
  const hasMtcrCatIFlag = results.some((r) =>
    r.suggestedCodes.some((c) => c.mtcrCatI),
  );
  const requiresHumanReview = results.some((r) => r.requiresHumanReview);

  const confidenceOrder: Record<TriggerConfidence, number> = {
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };
  const maxConfidence: TriggerConfidence | null =
    results.length > 0
      ? results.reduce((best, r) =>
          confidenceOrder[r.confidence] > confidenceOrder[best.confidence]
            ? r
            : best,
        ).confidence
      : null;

  return {
    results,
    hasItarFlag,
    hasMtcrCatIFlag,
    requiresHumanReview,
    maxConfidence,
    triggeredRuleCount: results.length,
  };
}

/**
 * Convenience: given a subset of a TradeItem, evaluate its signals.
 * The Prisma model uses `Boolean? @default(false)` which may be null
 * — this handles null → false coercion for the engine.
 */
export function evaluateTradeItemSubset(item: {
  apertureMeters?: number | null;
  rangeKm?: number | null;
  payloadKg?: number | null;
  isRadHardened?: boolean | null;
  isMilSpec?: boolean | null;
  isAntiJam?: boolean | null;
  description?: string | null;
  eccnEU?: string | null;
  eccnUS?: string | null;
  usmlCategory?: string | null;
}): TriggerEvaluation {
  return evaluateItemSignals({
    apertureMeters: item.apertureMeters ?? null,
    rangeKm: item.rangeKm ?? null,
    payloadKg: item.payloadKg ?? null,
    isRadHardened: item.isRadHardened ?? null,
    isMilSpec: item.isMilSpec ?? null,
    isAntiJam: item.isAntiJam ?? null,
    description: item.description ?? undefined,
    eccnEU: item.eccnEU,
    eccnUS: item.eccnUS,
    usmlCategory: item.usmlCategory,
  });
}

// ─── Rule registry (exported for introspection / tests) ───────────────

/** All rule IDs in declaration order. */
export const RULE_IDS = RULES.map((r) => r.ruleId) as readonly string[];
