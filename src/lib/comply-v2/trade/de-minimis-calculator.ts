/**
 * Sprint B5 — De-minimis & FDPR Calculator.
 *
 * Implements the US EAR De-minimis Rule (15 CFR § 734.4) and the
 * Foreign Direct Product Rule (FDPR, 15 CFR § 734.9) calculation logic.
 *
 * ─── De-minimis Rule (§ 734.4) ────────────────────────────────────────
 * A foreign-made item incorporating US-origin EAR-controlled content MAY
 * be exported without EAR authorization if the US-origin controlled
 * content does not exceed the threshold by value:
 *
 *   - 25% threshold: standard destinations AND Country Group D:1 (§ 734.4(d))
 *   - 10% threshold: Country Group E:1 / E:2 only (§ 734.4(c)) — NOT D:1
 *   - 0% threshold:  ITAR-controlled (USML) items — no de-minimis applies
 *
 * IMPORTANT EXCEPTIONS (rule does NOT apply):
 *   - Items subject to ITAR (22 CFR 120-130) → zero de-minimis
 *   - EAR99 items generally don't count toward the threshold
 *   - Anti-tamper, crypto, satellite items have special rules
 *
 * ─── FDPR (§ 734.9) ───────────────────────────────────────────────────
 * A foreign-produced item is subject to EAR if it is the direct product of:
 *   (a) US-origin technology or software; OR
 *   (b) A plant or major component thereof that is a direct product of
 *       US-origin technology or software;
 * AND the item meets certain destination or end-use criteria.
 *
 * The Russia/Belarus FDPR (added 2022) and the Advanced Computing FDPR
 * (2022) lowered effective thresholds significantly.
 *
 * ─── Scope ────────────────────────────────────────────────────────────
 * This calculator is a FIRST-PASS screening tool. It produces a risk
 * indicator, not a binding legal determination. All results MUST be
 * reviewed by qualified export-control counsel before licensing decisions.
 *
 * Source: 15 CFR Part 734 (accessed 2026-05-07)
 * https://www.ecfr.gov/current/title-15/subtitle-B/chapter-VII/subchapter-C/part-734
 *
 * Pure — no database calls, no async, no side-effects.
 */

// ─── Types ────────────────────────────────────────────────────────────

/**
 * Destination-country risk tier for de-minimis threshold selection.
 *
 *   STANDARD  — most countries → 25% threshold (§ 734.4(d))
 *   RESTRICTED — Country Group D:1 countries → 25% threshold (§ 734.4(d))
 *                Note: D:1 does NOT get a reduced threshold; only E:1/E:2
 *                get the 10% reduced level under § 734.4(c).
 *   EMBARGOED  — Country Group E:1 (Cuba, Iran, North Korea, Syria)
 *                → EAR authorization required regardless of percentage
 *                Note: Sudan was removed from E:1 in 2020 and is NOT embargoed.
 */
export type DestinationTier = "STANDARD" | "RESTRICTED" | "EMBARGOED";

/**
 * Input to the De-minimis calculator.
 */
export interface DeMinimisInput {
  /**
   * US-controlled content as a percentage of total item value (0–100).
   * Should represent EAR-controlled content only (not EAR99/NLR items).
   */
  usControlledContentPercent: number;

  /**
   * Whether the item contains any USML (ITAR) content.
   * If true, de-minimis CANNOT apply — result is always ITAR_CONTROLLED.
   */
  hasItarContent: boolean;

  /**
   * Whether the item was designed using US-origin technology or software
   * (triggers FDPR § 734.9(a) analysis).
   */
  designedWithUSTech: boolean;

  /**
   * Whether the item was manufactured using US-origin equipment or in a
   * plant built using US-origin equipment (triggers FDPR § 734.9(b)).
   */
  manufacturedWithUSEquipment: boolean;

  /**
   * Destination country tier (drives threshold selection).
   */
  destinationTier: DestinationTier;

  /**
   * Optional: destination country ISO-2 code (for advisory messages).
   */
  destinationCountry?: string;

  /**
   * Optional: The ECCN(s) of the US-origin controlled content.
   * Used to check for satellite / crypto / anti-tamper exceptions.
   */
  usContentEccns?: string[];
}

/**
 * Result of the De-minimis / FDPR calculation.
 */
export interface DeMinimisResult {
  /**
   * Overall outcome:
   *   DE_MINIMIS_ELIGIBLE   — US content below threshold; EAR may not apply
   *   DE_MINIMIS_EXCEEDED   — US content exceeds threshold; EAR controls apply
   *   ITAR_CONTROLLED       — ITAR applies; de-minimis cannot save this item
   *   FDPR_TRIGGERED        — FDPR applies; EAR controls even if de-minimis met
   *   EMBARGOED_DESTINATION — destination restrictions apply regardless
   *   REQUIRES_LEGAL_REVIEW — calculator cannot determine; flag for counsel
   */
  outcome:
    | "DE_MINIMIS_ELIGIBLE"
    | "DE_MINIMIS_EXCEEDED"
    | "ITAR_CONTROLLED"
    | "FDPR_TRIGGERED"
    | "EMBARGOED_DESTINATION"
    | "REQUIRES_LEGAL_REVIEW";

  /** The threshold that was applied (25%, 10%, 0%, or N/A for ITAR). */
  appliedThresholdPercent: number | null;

  /** The actual US controlled content percentage provided. */
  usControlledContentPercent: number;

  /** True if the FDPR analysis flagged a potential EAR hook. */
  fdprFlag: boolean;

  /** Risk level for the UI severity badge. */
  riskLevel: "HIGH" | "MEDIUM" | "LOW" | "CLEAR";

  /** Ordered list of reasons explaining the outcome. */
  reasons: string[];

  /** Ordered list of recommended next steps. */
  recommendations: string[];

  /**
   * Mandatory disclaimer — must be displayed in UI alongside result.
   */
  disclaimer: string;
}

// ─── Threshold constants ──────────────────────────────────────────────

const THRESHOLD_STANDARD = 25; // 15 CFR § 734.4(d) — standard destinations AND Country Group D:1
const THRESHOLD_RESTRICTED = 25; // 15 CFR § 734.4(d) — Country Group D:1 uses the standard 25% threshold
//                                    (the 10% reduced threshold is E:1/E:2 only, per § 734.4(c))
const THRESHOLD_ITAR = 0; // No de-minimis for ITAR

/**
 * Country Group E:1 — comprehensive embargo; EAR auth always required.
 * Note: This is NOT exhaustive. Country groups change. Always verify
 * against the current Supplement 1 to EAR Part 740.
 *
 * Sudan ("SD") was removed from Country Group E:1 in 2020 and is NOT
 * included here. Verify against the current BIS country group tables.
 */
// Exported so the licence-determination engine can apply the SAME embargo
// set in its standalone destination gate (single source of truth — avoids
// the two engines diverging on which destinations are embargoed).
export const EMBARGOED_COUNTRIES = new Set([
  "CU", // Cuba (E:2, treated as embargoed for de-minimis purposes)
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria
]);

/**
 * Country Group D:1 — 25% standard threshold applies (§ 734.4(d)).
 * The 10% reduced threshold is for E:1/E:2 only (§ 734.4(c)), NOT D:1.
 * Includes countries of concern for national security.
 * NOT exhaustive — verify against current BIS Supplement 1 to Part 740.
 */
const RESTRICTED_COUNTRIES = new Set([
  "CN", // China
  "RU", // Russia
  "BY", // Belarus (post-2022 FDPR)
  "VE", // Venezuela (D:1 subset)
]);

// ─── ECCN exceptions ─────────────────────────────────────────────────

/**
 * ECCNs that have SPECIAL de-minimis rules and CANNOT be included in a
 * de-minimis calculation without additional analysis:
 *   - 9A515.* — commercial spacecraft (satellite-specific restrictions)
 *   - 5E002   — crypto technology (license exception restrictions)
 *   - 0A501   — firearms (different country group analysis)
 *
 * If any of these appear in usContentEccns, the calculator returns
 * REQUIRES_LEGAL_REVIEW.
 */
const SPECIAL_ECCN_PREFIXES = ["9A515", "5E002", "0A501", "0E001"];

// ─── Calculator ───────────────────────────────────────────────────────

/**
 * Calculate de-minimis eligibility and FDPR exposure for a trade item.
 *
 * This function is PURE — deterministic, no IO, no async.
 *
 * @param input  De-minimis inputs from the TradeItem model + destination.
 * @returns      Structured result with outcome, reasons, and recommendations.
 *
 * @example
 * const result = calculateDeMinimis({
 *   usControlledContentPercent: 12,
 *   hasItarContent: false,
 *   designedWithUSTech: false,
 *   manufacturedWithUSEquipment: false,
 *   destinationTier: "RESTRICTED", // Country Group D:1
 * });
 * // result.outcome === "DE_MINIMIS_ELIGIBLE" — 12% ≤ 25% D:1 threshold (§ 734.4(d))
 */
export function calculateDeMinimis(input: DeMinimisInput): DeMinimisResult {
  const reasons: string[] = [];
  const recommendations: string[] = [];

  const DISCLAIMER =
    "De-minimis and FDPR calculations are screening tools only. They are NOT a substitute for qualified export-control legal counsel. Country group classifications and ECCN parameters change; always verify against the current version of 15 CFR Part 734. Violations of EAR/ITAR can result in criminal penalties and denial of export privileges.";

  // ─── Gate 1: ITAR content → zero de-minimis ──────────────────────
  if (input.hasItarContent) {
    reasons.push(
      "Item contains USML (ITAR)-controlled content. The De-minimis Rule (15 CFR § 734.4) does NOT apply to items subject to ITAR.",
    );
    reasons.push(
      "Even a fraction of a percent of ITAR-controlled content requires DDTC authorization (DSP-5 or TAA) for re-export.",
    );
    recommendations.push(
      "Obtain a DDTC Commodity Jurisdiction (CJ) determination or TAA covering all ITAR-controlled sub-components.",
    );
    recommendations.push(
      "Consider ITAR-free design: replace US-origin USML sub-components with non-US-origin equivalents. Verify BoM origin at sub-assembly level.",
    );
    return {
      outcome: "ITAR_CONTROLLED",
      appliedThresholdPercent: THRESHOLD_ITAR,
      usControlledContentPercent: input.usControlledContentPercent,
      fdprFlag: false,
      riskLevel: "HIGH",
      reasons,
      recommendations,
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Gate 2: Embargoed destination ───────────────────────────────
  if (
    input.destinationTier === "EMBARGOED" ||
    (input.destinationCountry &&
      EMBARGOED_COUNTRIES.has(input.destinationCountry))
  ) {
    const country = input.destinationCountry ?? "embargoed destination";
    reasons.push(
      `Destination (${country}) is in Country Group E:1. Comprehensive US embargo applies. EAR authorization is required regardless of US content percentage.`,
    );
    recommendations.push(
      "Do not proceed without obtaining a BIS specific license or applicable license exception. Most E:1 transactions are denied.",
    );
    return {
      outcome: "EMBARGOED_DESTINATION",
      appliedThresholdPercent: null,
      usControlledContentPercent: input.usControlledContentPercent,
      fdprFlag: input.designedWithUSTech || input.manufacturedWithUSEquipment,
      riskLevel: "HIGH",
      reasons,
      recommendations,
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Gate 3: Special ECCN check ──────────────────────────────────
  if (input.usContentEccns && input.usContentEccns.length > 0) {
    const specialEccns = input.usContentEccns.filter((eccn) =>
      SPECIAL_ECCN_PREFIXES.some((prefix) => eccn.startsWith(prefix)),
    );
    if (specialEccns.length > 0) {
      reasons.push(
        `US content includes ECCNs with special de-minimis rules: ${specialEccns.join(", ")}. Standard de-minimis calculation cannot be applied.`,
      );
      recommendations.push(
        "Review the specific license exceptions and de-minimis rules applicable to these ECCNs. Seek legal review before proceeding.",
      );
      return {
        outcome: "REQUIRES_LEGAL_REVIEW",
        appliedThresholdPercent: null,
        usControlledContentPercent: input.usControlledContentPercent,
        fdprFlag: input.designedWithUSTech || input.manufacturedWithUSEquipment,
        riskLevel: "MEDIUM",
        reasons,
        recommendations,
        disclaimer: DISCLAIMER,
      };
    }
  }

  // ─── FDPR analysis ────────────────────────────────────────────────
  const fdprFlag =
    input.designedWithUSTech || input.manufacturedWithUSEquipment;
  if (fdprFlag) {
    if (input.designedWithUSTech) {
      reasons.push(
        "Item was designed using US-origin technology or software (FDPR § 734.9(a) trigger).",
      );
    }
    if (input.manufacturedWithUSEquipment) {
      reasons.push(
        "Item was manufactured using US-origin equipment (FDPR § 734.9(b) trigger).",
      );
    }
    recommendations.push(
      "Conduct a full FDPR analysis. If the FDPR applies to the destination country/end-use, EAR controls apply regardless of de-minimis percentage.",
    );
    recommendations.push(
      "Check if the Russia/Belarus FDPR (Feb 2022) or Advanced Computing FDPR (Oct 2022) applies — both have lower thresholds.",
    );
  }

  // ─── Threshold selection ──────────────────────────────────────────
  const isRestrictedCountry =
    input.destinationTier === "RESTRICTED" ||
    (input.destinationCountry &&
      RESTRICTED_COUNTRIES.has(input.destinationCountry));

  const threshold = isRestrictedCountry
    ? THRESHOLD_RESTRICTED
    : THRESHOLD_STANDARD;

  const thresholdLabel = isRestrictedCountry
    ? `25% (Country Group D:1 / ${input.destinationCountry ?? "restricted destination"} — standard threshold per § 734.4(d))`
    : `25% (standard destinations)`;

  // ─── De-minimis calculation ───────────────────────────────────────
  const pct = input.usControlledContentPercent;
  const exceedsThreshold = pct > threshold;

  if (exceedsThreshold) {
    reasons.push(
      `US-controlled EAR content (${pct}%) exceeds the ${thresholdLabel} de-minimis threshold.`,
    );
    reasons.push(
      "The item is subject to EAR regardless of where it was manufactured.",
    );
    recommendations.push(
      "Determine whether a BIS license exception (e.g. STA, TMP, ENC) applies, or apply for a specific license.",
    );
    recommendations.push(
      "Consider redesigning to reduce US-origin controlled content below the threshold. Conduct a BoM-level origin analysis.",
    );

    // FDPR elevates risk even when threshold not exceeded
    const outcome = fdprFlag ? "FDPR_TRIGGERED" : "DE_MINIMIS_EXCEEDED";
    return {
      outcome,
      appliedThresholdPercent: threshold,
      usControlledContentPercent: pct,
      fdprFlag,
      riskLevel: fdprFlag ? "HIGH" : "MEDIUM",
      reasons,
      recommendations,
      disclaimer: DISCLAIMER,
    };
  }

  // De-minimis threshold met
  reasons.push(
    `US-controlled EAR content (${pct}%) is at or below the ${thresholdLabel} de-minimis threshold.`,
  );
  reasons.push(
    "The item MAY be exported without EAR authorization solely on the basis of de-minimis content — subject to all other conditions being met.",
  );
  recommendations.push(
    "Document the de-minimis calculation with BoM-level cost data and keep it on file for 5 years.",
  );
  recommendations.push(
    "Verify that all other export conditions are met (end-use, end-user, transaction party screening, license exceptions).",
  );

  if (fdprFlag) {
    // De-minimis percentage is fine but FDPR may still apply
    reasons.push(
      "WARNING: Even though de-minimis threshold is met, FDPR may independently subject this item to EAR based on US-origin design/manufacturing inputs.",
    );
    recommendations.push(
      "Complete a separate FDPR analysis before concluding the item is EAR-exempt.",
    );
    return {
      outcome: "FDPR_TRIGGERED",
      appliedThresholdPercent: threshold,
      usControlledContentPercent: pct,
      fdprFlag: true,
      riskLevel: "MEDIUM",
      reasons,
      recommendations,
      disclaimer: DISCLAIMER,
    };
  }

  return {
    outcome: "DE_MINIMIS_ELIGIBLE",
    appliedThresholdPercent: threshold,
    usControlledContentPercent: pct,
    fdprFlag: false,
    riskLevel: "LOW",
    reasons,
    recommendations,
    disclaimer: DISCLAIMER,
  };
}

// ─── Convenience helpers ──────────────────────────────────────────────

/**
 * Infer the destination tier from an ISO-2 country code.
 * Used by the UI to auto-populate destinationTier.
 *
 * Note: Country group assignments change with regulatory updates.
 * This is a static first-pass lookup — verify against current BIS tables.
 */
export function getDestinationTier(countryIso2: string): DestinationTier {
  const code = countryIso2.toUpperCase();
  if (EMBARGOED_COUNTRIES.has(code)) return "EMBARGOED";
  if (RESTRICTED_COUNTRIES.has(code)) return "RESTRICTED";
  return "STANDARD";
}

/**
 * Format the de-minimis result for display in Astra chat or the UI panel.
 */
export function formatDeMinimisResultForDisplay(
  result: DeMinimisResult,
): string {
  const badge =
    {
      DE_MINIMIS_ELIGIBLE: "✓ De-minimis eligible",
      DE_MINIMIS_EXCEEDED: "⚠ De-minimis exceeded",
      ITAR_CONTROLLED: "✗ ITAR controlled",
      FDPR_TRIGGERED: "⚠ FDPR triggered",
      EMBARGOED_DESTINATION: "✗ Embargoed destination",
      REQUIRES_LEGAL_REVIEW: "⚠ Requires legal review",
    }[result.outcome] ?? result.outcome;

  const lines = [
    `**Outcome:** ${badge}`,
    `**US controlled content:** ${result.usControlledContentPercent}%`,
    result.appliedThresholdPercent !== null
      ? `**Applied threshold:** ${result.appliedThresholdPercent}%`
      : "",
    `**FDPR flag:** ${result.fdprFlag ? "Yes" : "No"}`,
    "",
    "**Reasons:**",
    ...result.reasons.map((r) => `- ${r}`),
    "",
    "**Recommended next steps:**",
    ...result.recommendations.map((r) => `- ${r}`),
    "",
    `*${result.disclaimer}*`,
  ].filter((l) => l !== undefined);

  return lines.join("\n");
}
