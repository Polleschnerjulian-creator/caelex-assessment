/**
 * Sprint B6 — License-Determination Engine.
 *
 * Given the outputs of the Property-Trigger Engine (Sprint B3),
 * the De-minimis Calculator (Sprint B5), and the destination/end-user
 * context, this engine determines the overall licensing posture.
 *
 * ─── What this engine does ────────────────────────────────────────────
 * It answers: "For this item going to this destination, what license or
 * authorization do I need from which jurisdiction?"
 *
 * Output:
 *   - `LicenseRequirement` per jurisdiction that controls the item
 *   - Overall risk gate (MTCR Cat. I strong-presumption-of-denial)
 *   - Recommended next steps ordered by urgency
 *
 * ─── What this engine does NOT do ────────────────────────────────────
 * - Determine the specific license exception that applies (too fact-specific)
 * - Screen counterparties against sanctions lists (Sprint Wave A)
 * - Replace qualified legal counsel
 *
 * ─── Architecture notes ───────────────────────────────────────────────
 * This engine is PURE — no DB calls, no HTTP, no async.
 * Inputs come from the previously computed evaluation objects.
 *
 * Source: EAR 15 CFR Parts 730-774, ITAR 22 CFR Parts 120-130,
 *         EU Reg. 2021/821 Art. 3/4/5, AWV § 8/9/10
 */

import type { TriggerEvaluation } from "./property-trigger-engine";
import type { DeMinimisResult } from "./de-minimis-calculator";

// ─── Types ────────────────────────────────────────────────────────────

export type LicenseAuthority =
  | "BIS" // US Bureau of Industry and Security (EAR)
  | "DDTC" // US Directorate of Defense Trade Controls (ITAR)
  | "BAFA" // German Federal Office for Economic Affairs (DE)
  | "EU_COMPETENT_AUTHORITY" // National competent authority under EU 2021/821
  | "MTCR_REVIEW"; // MTCR multilateral — each partner nation reviews separately

export type LicenseType =
  | "SPECIFIC_LICENSE" // Individual application to licensing authority
  | "LICENSE_EXCEPTION" // Applicable exception (STA, TMP, ENC, etc.)
  | "GENERAL_LICENSE" // EU-style general/global license
  | "NLR" // No License Required (self-classification)
  | "TAA" // Technical Assistance Agreement (DDTC for ITAR tech)
  | "DSP5" // DDTC individual export license (physical articles)
  | "BAFA_ANTRAG"; // German individual export license (BAFA Antrag)

export type RequirementStatus =
  | "REQUIRED" // License/auth required before export
  | "LIKELY_REQUIRED" // Likely required — further analysis needed
  | "EXCEPTION_MAY_APPLY" // A license exception may be applicable
  | "NLR" // No License Required — item not controlled here
  | "DENIED" // Strong presumption of denial (MTCR Cat. I or embargo)
  | "UNKNOWN"; // Cannot determine without additional info

export interface LicenseRequirement {
  jurisdiction: string;
  authority: LicenseAuthority;
  status: RequirementStatus;
  licenseType: LicenseType | null;
  /** Short reason for this requirement. */
  reason: string;
  /** Specific action the exporter should take. */
  recommendedAction: string;
  /** Reference code from the underlying classification. */
  triggerCode?: string;
}

export type OverallGate = "CLEARED" | "REVIEW_NEEDED" | "BLOCKED";

export interface LicenseDetermination {
  /** Per-jurisdiction requirements. */
  requirements: LicenseRequirement[];

  /** Overall gating decision. */
  gate: OverallGate;

  /**
   * True if MTCR Cat. I strong-presumption-of-denial applies to any code.
   * This gate effectively blocks the export path for most destinations.
   */
  mtcrCatIBlock: boolean;

  /**
   * True if the item is ITAR-controlled. ITAR requires DDTC authorization;
   * De-minimis rule does not apply.
   */
  itarBlock: boolean;

  /**
   * True if the destination is embargoed under US/EU/UN sanctions.
   */
  embargoBlock: boolean;

  /** Ordered list of recommended next steps (most urgent first). */
  nextSteps: string[];

  /** Mandatory disclaimer. */
  disclaimer: string;
}

// ─── Engine ───────────────────────────────────────────────────────────

const DISCLAIMER =
  "License determinations from Caelex Trade are screening-level guidance only. They are NOT legal opinions and NOT a substitute for qualified export-control counsel. Always verify with BAFA (DE), BIS (US), or the relevant EU National Competent Authority before proceeding with any controlled export.";

/**
 * Determine licensing requirements based on trigger engine output and
 * de-minimis calculator result.
 *
 * @param triggerEval  Output of `evaluateItemSignals()` from Sprint B3.
 * @param deMinimis    Output of `calculateDeMinimis()` from Sprint B5.
 *                     Pass null if de-minimis has not been calculated yet.
 * @param destinationCountry  ISO-2 destination country code (for embargo check).
 */
export function determineLicenseRequirements(
  triggerEval: TriggerEvaluation,
  deMinimis: DeMinimisResult | null,
  destinationCountry?: string,
): LicenseDetermination {
  const requirements: LicenseRequirement[] = [];
  const nextSteps: string[] = [];

  // ─── Gate 1: MTCR Cat. I ──────────────────────────────────────────
  const mtcrCatIBlock = triggerEval.hasMtcrCatIFlag;
  if (mtcrCatIBlock) {
    requirements.push({
      jurisdiction: "MTCR",
      authority: "MTCR_REVIEW",
      status: "DENIED",
      licenseType: null,
      reason:
        "Item triggers MTCR Category I threshold (≥ 500 kg / ≥ 300 km). Strong presumption of denial applies under MTCR partner-nation guidelines.",
      recommendedAction:
        "Do not proceed. Consult specialized export-control legal counsel with MTCR experience. MTCR Cat. I exports are effectively banned except in extraordinary circumstances (government-to-government with guarantees).",
      triggerCode: "MTCR Cat. I",
    });
    nextSteps.unshift(
      "URGENT: MTCR Cat. I strong-presumption-of-denial gate triggered. Halt export planning and seek specialized legal counsel immediately.",
    );
  }

  // ─── Gate 2: ITAR / USML ──────────────────────────────────────────
  const itarBlock = triggerEval.hasItarFlag;
  if (itarBlock) {
    requirements.push({
      jurisdiction: "US (ITAR)",
      authority: "DDTC",
      status: "REQUIRED",
      licenseType: "DSP5",
      reason:
        "Item is ITAR-controlled (USML jurisdiction). DDTC export authorization (DSP-5 physical export license or TAA for technology) is required. De-minimis rule does NOT apply.",
      recommendedAction:
        "File a DSP-5 export license application with DDTC at dtrade.state.gov. Or, if transferring technical data, negotiate a TAA. Consider requesting a Commodity Jurisdiction (CJ) determination if borderline.",
      triggerCode: triggerEval.results
        .flatMap((r) =>
          r.suggestedCodes.filter((c) => c.itar).map((c) => c.code),
        )
        .join(", "),
    });
    nextSteps.push(
      "File DDTC DSP-5 or negotiate TAA for ITAR-controlled article/technology.",
    );
  }

  // ─── Gate 3: De-minimis / EAR result ──────────────────────────────
  if (deMinimis) {
    switch (deMinimis.outcome) {
      case "ITAR_CONTROLLED":
        // Already handled above — add BIS note
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "NLR",
          licenseType: "NLR",
          reason:
            "ITAR controls take precedence. BIS (EAR) jurisdiction does not apply separately to USML items.",
          recommendedAction: "See DDTC requirement above.",
        });
        break;

      case "EMBARGOED_DESTINATION":
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "DENIED",
          licenseType: "SPECIFIC_LICENSE",
          reason: `Destination (${destinationCountry ?? "embargoed"}) is subject to comprehensive US embargo. BIS-specific license required; most applications denied.`,
          recommendedAction:
            "Do not proceed. US comprehensive embargo destinations require BIS-specific license; denial is the presumptive outcome. Legal review required.",
        });
        nextSteps.push(
          "BLOCKED: Destination is on embargoed country list. BIS license required; presumptive denial.",
        );
        break;

      case "DE_MINIMIS_EXCEEDED":
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "REQUIRED",
          licenseType: "SPECIFIC_LICENSE",
          reason: `US-origin EAR content (${deMinimis.usControlledContentPercent}%) exceeds de-minimis threshold (${deMinimis.appliedThresholdPercent}%). EAR controls apply to the foreign-made item.`,
          recommendedAction:
            "Apply for BIS license or identify applicable license exception (STA, ENC, TMP, etc.) at bis.doc.gov. Do not export without authorization.",
        });
        nextSteps.push(
          `US EAR license required: US content ${deMinimis.usControlledContentPercent}% > ${deMinimis.appliedThresholdPercent}% threshold.`,
        );
        break;

      case "FDPR_TRIGGERED":
        requirements.push({
          jurisdiction: "US (EAR / FDPR)",
          authority: "BIS",
          status: "LIKELY_REQUIRED",
          licenseType: "SPECIFIC_LICENSE",
          reason:
            "Foreign Direct Product Rule (FDPR) may subject this item to EAR. Item was made using US-origin technology or equipment.",
          recommendedAction:
            "Conduct full FDPR analysis per 15 CFR § 734.9. Determine if the item is a 'direct product' of US technology and whether destination/end-use criteria apply.",
        });
        nextSteps.push(
          "Complete FDPR analysis (15 CFR § 734.9) before shipping. Check Russia/Belarus FDPR and Advanced Computing FDPR if applicable.",
        );
        break;

      case "DE_MINIMIS_ELIGIBLE":
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "EXCEPTION_MAY_APPLY",
          licenseType: "NLR",
          reason: `US-origin EAR content (${deMinimis.usControlledContentPercent}%) is within de-minimis threshold (${deMinimis.appliedThresholdPercent}%). EAR may not apply solely on de-minimis grounds.`,
          recommendedAction:
            "Document de-minimis calculation with BoM cost data. Retain records for 5 years. Ensure all other conditions (end-use, end-user, country) are also clear.",
        });
        nextSteps.push(
          "Document de-minimis calculation and retain for 5 years per EAR recordkeeping requirements.",
        );
        break;

      case "REQUIRES_LEGAL_REVIEW":
        requirements.push({
          jurisdiction: "US (EAR)",
          authority: "BIS",
          status: "UNKNOWN",
          licenseType: null,
          reason:
            "De-minimis calculation could not be completed — special ECCN or missing data. Manual legal review required.",
          recommendedAction:
            "Engage qualified US export-control counsel for a full EAR jurisdiction analysis.",
        });
        nextSteps.push(
          "EAR jurisdiction unclear: engage qualified US export-control counsel.",
        );
        break;
    }
  } else {
    // No de-minimis result provided
    if (triggerEval.triggeredRuleCount > 0 && !itarBlock) {
      requirements.push({
        jurisdiction: "US (EAR)",
        authority: "BIS",
        status: "UNKNOWN",
        licenseType: null,
        reason:
          "Trigger engine fired but de-minimis analysis not yet completed. Cannot determine EAR licensing requirement.",
        recommendedAction:
          "Run the De-minimis Calculator (Sprint B5) with US content percentage and destination country.",
      });
      nextSteps.push(
        "Complete de-minimis analysis before determining EAR licensing requirement.",
      );
    }
  }

  // ─── Gate 4: EU / DE licensing ───────────────────────────────────
  const hasEuCodes = triggerEval.results.some((r) =>
    r.suggestedCodes.some(
      (c) =>
        c.jurisdiction === "EU_ANNEX_I" || c.jurisdiction === "DE_ANLAGE_AL",
    ),
  );
  if (hasEuCodes) {
    const hasMtcr = triggerEval.results.some((r) =>
      r.suggestedCodes.some((c) => c.mtcrCatI),
    );
    if (hasMtcr) {
      requirements.push({
        jurisdiction: "EU / DE",
        authority: "BAFA",
        status: "DENIED",
        licenseType: "BAFA_ANTRAG",
        reason:
          "Item meets MTCR Cat. I criteria — EU Reg. 2021/821 Art. 4(2) catch-all / MTCR presumption-of-denial applies. BAFA will not issue a license for Cat. I items without extraordinary justification.",
        recommendedAction:
          "Do not apply for BAFA export license without obtaining BAFA Auskunft zur Güterliste first. Consult BAFA's Beratungsstelle.",
      });
    } else {
      requirements.push({
        jurisdiction: "EU / DE",
        authority: "BAFA",
        status: "REQUIRED",
        licenseType: "BAFA_ANTRAG",
        reason:
          "Item is listed in EU Annex I or DE Anlage AL. BAFA individual export license (Antrag) required for non-EU destinations, or EU General Export Authorizations (EU001-EU006) may apply.",
        recommendedAction:
          "Check applicable EU General Export Authorizations (Reg. 2021/821 Annex II) for the destination. If none applies, file BAFA Antrag via ELAN-K2.",
      });
      nextSteps.push(
        "File BAFA export license application via ELAN-K2 (elan.bafa.bund.de) or confirm applicable EU General Authorization.",
      );
    }
  }

  // ─── Determine overall gate ───────────────────────────────────────
  const hasBlocked = requirements.some((r) => r.status === "DENIED");
  const hasRequired = requirements.some((r) => r.status === "REQUIRED");
  const hasLikely = requirements.some(
    (r) => r.status === "LIKELY_REQUIRED" || r.status === "UNKNOWN",
  );

  let gate: OverallGate;
  if (hasBlocked || mtcrCatIBlock) {
    gate = "BLOCKED";
  } else if (hasRequired || hasLikely) {
    gate = "REVIEW_NEEDED";
  } else if (triggerEval.triggeredRuleCount === 0) {
    gate = "CLEARED";
  } else {
    gate = "REVIEW_NEEDED";
  }

  // ─── Generic next steps ───────────────────────────────────────────
  if (nextSteps.length === 0) {
    nextSteps.push(
      "Conduct end-user and end-use screening against OFAC, BIS, DDTC, and EU/UN denial lists before shipping.",
    );
    nextSteps.push(
      "Retain export records (EEI, license, shipping docs) for 5 years.",
    );
  }

  const embargoBlock =
    deMinimis?.outcome === "EMBARGOED_DESTINATION" ||
    requirements.some(
      (r) => r.status === "DENIED" && r.jurisdiction.includes("embargo"),
    );

  return {
    requirements,
    gate,
    mtcrCatIBlock,
    itarBlock,
    embargoBlock,
    nextSteps,
    disclaimer: DISCLAIMER,
  };
}

/**
 * Shorthand: is this determination fully blocked (cannot export)?
 */
export function isExportBlocked(det: LicenseDetermination): boolean {
  return det.gate === "BLOCKED";
}

/**
 * Count how many jurisdictions require explicit authorization.
 */
export function countRequiredLicenses(det: LicenseDetermination): number {
  return det.requirements.filter(
    (r) => r.status === "REQUIRED" || r.status === "DENIED",
  ).length;
}
