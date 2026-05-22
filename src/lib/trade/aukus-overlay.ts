/**
 * Z31 — AUKUS + Canada 9A515 License-Free Overlay.
 *
 * Per 89 FR 84766 (Oct 23, 2024) — the BIS final rule "Implementation
 * of Additional Export Controls Pursuant to AUKUS Partnership" —
 * most 9A515-classified items shipped to Australia, the United
 * Kingdom, and (separately treated by ECCN-paragraph carve-outs)
 * Canada can move WITHOUT a license under either:
 *
 *   - License Exception AUS  (15 CFR § 740.27)         — AU + UK
 *   - License Exception STA-AUKUS (15 CFR § 740.20(c)) — AU + UK + CA
 *
 * For Caelex Trade we treat both as "license-free under the AUKUS
 * overlay" because the operator decision is the same: file an AES
 * record with the AUS/STA citation rather than apply for a licence.
 * The specific citation chosen below depends on destination + ECCN
 * paragraph:
 *
 *   - AU, GB                     → "AUS"        (740.27 is broader)
 *   - CA                         → "STA-AUKUS"  (740.27 excludes CA for
 *                                                 most 9A515 paragraphs;
 *                                                 STA-AUKUS at 740.20(c)
 *                                                 covers CA)
 *
 * ─── Scope ──────────────────────────────────────────────────────────
 *
 * In scope: 9A515.a (.1, .2, .3, .4), 9A515.b, .c, .d, .g, .h, .x
 * Out of scope (carved out by the rule):
 *   - 9A515.e — technology related to certain spacecraft
 *   - 9A515.f — specially-designed software
 *   These remain license-controlled to AU/GB/CA.
 *
 * ─── End-use exclusions (15 CFR § 740.27(b)) ───────────────────────
 *
 * License Exception AUS is unavailable when the shipment goes to:
 *   - A military-intelligence end-user (§ 744.22)
 *   - A cyber-surveillance end-user (§ 744.9)
 *   - An entity-listed party with a relevant licence-requirement footnote
 *
 * If the input flags any of these, the overlay refuses to fire.
 *
 * ─── What this overlay does NOT do ─────────────────────────────────
 *
 *   - Counterparty screening (the screen-party engine does that)
 *   - Re-export downstream analysis (handled by re-export-service)
 *   - End-user statement collection (handled by EUC service)
 *
 * It is a PURE evaluator: in → out, no IO, no async.
 *
 * Sources:
 *   - 89 FR 84766 (October 23, 2024)
 *     "Implementation of Additional Export Controls: Australia,
 *     United Kingdom, and the United States Trilateral Security
 *     Partnership (AUKUS)"
 *   - 15 CFR § 740.27 — License Exception AUS
 *   - 15 CFR § 740.20(c) — License Exception STA, AUKUS sub-paragraph
 *   - 15 CFR § 744.9   — Cyber-surveillance items
 *   - 15 CFR § 744.22  — Restrictions on certain military-intelligence
 *                        end-uses and end-users
 */

// ─── Constants ────────────────────────────────────────────────────────

/**
 * AUKUS-eligible destination countries (ISO-3166-1 alpha-2).
 *
 * Defined locally instead of importing from
 * `src/lib/trade/subject-to-ear/country-groups.ts` because the main
 * thread owns that file. When that file gains AUKUS support, this
 * constant should be migrated.
 */
const AUKUS_COUNTRIES: ReadonlySet<string> = new Set(["AU", "GB", "CA"]);

/**
 * ECCN paragraphs explicitly carved out of the AUKUS exception per
 * 89 FR 84766. These remain license-required regardless of destination.
 *
 * - .e — technology
 * - .f — specially-designed software
 *
 * We match these as suffixes so e.g. "9A515.e.1" is also excluded.
 */
const EXCLUDED_PARAGRAPHS: ReadonlySet<string> = new Set(["e", "f"]);

/**
 * End-use categories that disqualify the shipment from AUS / STA-AUKUS
 * per 15 CFR §§ 744.9, 744.22 (cross-referenced from § 740.27(b)).
 *
 * The check is case-insensitive substring matching against the
 * `endUseCategory` input. A real downstream classification engine
 * should pass canonical category keys; this list is the safety net.
 */
const SENSITIVE_END_USE_KEYWORDS: ReadonlyArray<string> = [
  "military intelligence",
  "military-intelligence",
  "milint",
  "cyber surveillance",
  "cyber-surveillance",
  "cybersurveillance",
  "intrusion software",
  "ip network communications surveillance",
];

/** Pattern matching any 9A515 ECCN (paragraph optional). */
const ECCN_9A515_PATTERN = /^9A515\b/i;

// ─── Types ────────────────────────────────────────────────────────────

export type AukusEndUserType =
  | "government"
  | "commercial"
  | "academic"
  | "unknown";

export interface AukusOverlayInput {
  /** ECCN classification — typically "9A515.a.1", "9A515.b", etc. */
  eccn: string;
  /** ISO-3166-1 alpha-2 destination country code. */
  destinationCountry: string;
  /** Type of end-user receiving the item. */
  endUserType: AukusEndUserType;
  /**
   * End-use description or canonical category key. Used to detect
   * sensitive end-uses (military intelligence, cyber-surveillance).
   * Empty string / undefined means "no information" — the overlay
   * will still fire because § 740.27 does not require a positive
   * end-use declaration (only the absence of disqualifying ones).
   */
  endUseCategory?: string;
  /**
   * Optional: explicit list of regulatory flags the upstream party-
   * screening engine attached. Used to detect entity-list-with-
   * AUS-restriction footnote scenarios without needing the overlay
   * to do its own screening.
   *
   * Recognized flags (case-insensitive):
   *   - "MILITARY_INTELLIGENCE_END_USER"
   *   - "CYBER_SURVEILLANCE_END_USER"
   *   - "ENTITY_LIST_AUS_RESTRICTED"
   */
  partyFlags?: ReadonlyArray<string>;
}

export type AukusLicenseException = "AUS" | "STA-AUKUS";

export interface AukusOverlayResult {
  /** True if the overlay determines the export is license-free. */
  applies: boolean;
  /**
   * Which exception applies when `applies = true`. Null when the
   * overlay does not fire (regardless of reason).
   */
  licenseException: AukusLicenseException | null;
  /**
   * Reasons the overlay was rejected. Empty when `applies = true`.
   * Each entry is a short human-readable explanation suitable for
   * surfacing in the operator UI.
   */
  excludedReasons: string[];
  /** Concise rationale, always populated, for audit-trail logging. */
  rationale: string;
  /**
   * Regulatory citation for traceability. Set whenever the overlay
   * makes a determination — null only on inputs that don't reach
   * the AUKUS scope at all (wrong ECCN family).
   */
  citation: string | null;
}

// ─── Engine ───────────────────────────────────────────────────────────

/**
 * Evaluate whether a 9A515 shipment qualifies for license-free
 * treatment under the AUKUS overlay (License Exception AUS or
 * STA-AUKUS).
 *
 * Pure function: same input → same output, no side effects.
 *
 * @example
 *   evaluateAukusOverlay({
 *     eccn: "9A515.a.1",
 *     destinationCountry: "AU",
 *     endUserType: "commercial",
 *     endUseCategory: "earth observation",
 *   })
 *   // → { applies: true, licenseException: "AUS", ... }
 */
export function evaluateAukusOverlay(
  input: AukusOverlayInput,
): AukusOverlayResult {
  const excludedReasons: string[] = [];

  // ─── 1. ECCN scope ────────────────────────────────────────────────
  // Only 9A515 entries are in scope. Anything else exits early with
  // no determination — the overlay simply doesn't apply.
  if (!ECCN_9A515_PATTERN.test(input.eccn)) {
    return {
      applies: false,
      licenseException: null,
      excludedReasons: [
        `ECCN ${input.eccn} is not 9A515; AUKUS overlay does not apply to this classification.`,
      ],
      rationale:
        "Overlay out of scope: only 9A515 entries are eligible for AUS / STA-AUKUS treatment per 89 FR 84766.",
      citation: null,
    };
  }

  // ─── 2. Paragraph carve-out (.e technology, .f software) ──────────
  const paragraph = extractParagraph(input.eccn);
  if (paragraph && EXCLUDED_PARAGRAPHS.has(paragraph)) {
    excludedReasons.push(
      `9A515.${paragraph} is carved out of License Exception AUS / STA-AUKUS per 89 FR 84766 (technology and specially-designed software remain license-required).`,
    );
  }

  // ─── 3. Destination country ───────────────────────────────────────
  const country = input.destinationCountry.toUpperCase();
  if (!AUKUS_COUNTRIES.has(country)) {
    excludedReasons.push(
      `Destination ${country} is not an AUKUS partner (Australia, United Kingdom, or Canada).`,
    );
  }

  // ─── 4. End-user-type disqualifications ───────────────────────────
  // § 740.27(b) excludes shipments to military-intelligence and
  // cyber-surveillance end-users. We accept both an explicit
  // `endUserType` value (when the operator selected one) and the
  // `partyFlags` enrichment from party screening.
  const flagSet = new Set((input.partyFlags ?? []).map((f) => f.toUpperCase()));
  if (flagSet.has("MILITARY_INTELLIGENCE_END_USER")) {
    excludedReasons.push(
      "End-user is flagged as a military-intelligence end-user; License Exception AUS is unavailable per 15 CFR § 744.22.",
    );
  }
  if (flagSet.has("CYBER_SURVEILLANCE_END_USER")) {
    excludedReasons.push(
      "End-user is flagged as a cyber-surveillance end-user; License Exception AUS is unavailable per 15 CFR § 744.9.",
    );
  }
  if (flagSet.has("ENTITY_LIST_AUS_RESTRICTED")) {
    excludedReasons.push(
      "End-user appears on the BIS Entity List with an AUS-restriction footnote; License Exception AUS is unavailable.",
    );
  }

  // ─── 5. End-use disqualifications (free-text scan) ────────────────
  // Catches operator-entered descriptions that name a sensitive end-
  // use even when no party flag was attached upstream.
  if (input.endUseCategory) {
    const haystack = input.endUseCategory.toLowerCase();
    for (const needle of SENSITIVE_END_USE_KEYWORDS) {
      if (haystack.includes(needle)) {
        excludedReasons.push(
          `End-use description "${input.endUseCategory}" matches sensitive end-use category "${needle}"; License Exception AUS / STA-AUKUS is unavailable.`,
        );
        break;
      }
    }
  }

  // Per § 740.27, an unknown end-user type does not automatically
  // disqualify the shipment — the rule only excludes specifically
  // listed end-uses/users. We treat "unknown" as a soft signal that
  // the operator should later confirm, but the overlay still fires
  // for commercial-style shipments. This matches the conservative-
  // for-AUKUS-partners intent expressed in the test plan.

  // ─── 6. Final determination ───────────────────────────────────────
  if (excludedReasons.length > 0) {
    return {
      applies: false,
      licenseException: null,
      excludedReasons,
      rationale: `AUKUS overlay rejected: ${excludedReasons[0]}`,
      citation: "89 FR 84766; 15 CFR § 740.27",
    };
  }

  // Both AUS (740.27) and STA-AUKUS (740.20(c)) are available to AU
  // and GB. CA is most cleanly served by STA-AUKUS because the AUS
  // exception text in § 740.27 enumerates AU and UK explicitly while
  // CA is added by the STA-AUKUS sub-paragraph. We split accordingly
  // so the citation in the rationale matches the chosen pathway.
  const licenseException: AukusLicenseException =
    country === "CA" ? "STA-AUKUS" : "AUS";
  const citation =
    licenseException === "AUS"
      ? "15 CFR § 740.27 (89 FR 84766)"
      : "15 CFR § 740.20(c) STA-AUKUS (89 FR 84766)";

  return {
    applies: true,
    licenseException,
    excludedReasons: [],
    rationale: `Shipment of ${input.eccn} to ${country} qualifies for License Exception ${licenseException} (${citation}). No BIS export license is required for this transaction. Operator must still file an EEI/AES record with the exception citation and retain records for 5 years per § 762.6.`,
    citation,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────

/**
 * Extract the paragraph letter from a 9A515 ECCN string.
 * "9A515.a"    → "a"
 * "9A515.a.1"  → "a"
 * "9A515"      → null
 * "9a515.E.2"  → "e"
 */
function extractParagraph(eccn: string): string | null {
  const match = eccn.match(/^9A515\.([A-Za-z])/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Convenience predicate: does this destination potentially qualify
 * for any AUKUS treatment, ignoring ECCN and end-use checks? Useful
 * for UI hints ("this destination has AUKUS coverage — re-check
 * after classification finishes").
 */
export function isAukusDestination(countryCode: string): boolean {
  return AUKUS_COUNTRIES.has(countryCode.toUpperCase());
}

// ─── Integration helpers ──────────────────────────────────────────────
//
// The license-determination engine (src/lib/comply-v2/trade/
// license-determination.ts) takes a TriggerEvaluation + de-minimis
// result and produces a LicenseDetermination. It already supports an
// optional `exceptionContext` that downgrades REQUIRED → EXCEPTION_
// MAY_APPLY when the license-exception matrix matches.
//
// The AUKUS overlay sits ONE LAYER DOWN from that matrix: when an
// AUKUS-eligible 9A515 shipment arrives at the engine, we want the
// final answer to be "license-free under AUS / STA-AUKUS" instead
// of "license required". To keep the main-thread license-determination
// file untouched, we expose a post-processor that can be called by
// the consumer (e.g. classification-pipeline or a route handler)
// AFTER `determineLicenseRequirements()`. The processor mutates
// the determination object in-place via a clean returned copy.

/**
 * Apply the AUKUS overlay to a LicenseDetermination-like result.
 *
 * This is a pure transform: given a license-determination output and
 * an operation context (ECCN, destination, end-user/use), it returns
 * a new result where any BIS / EAR requirement is downgraded to
 * "license-free under AUS / STA-AUKUS" when the overlay fires.
 *
 * The function is intentionally untyped against the exact
 * LicenseDetermination shape so it remains usable from any caller
 * without pulling in license-determination's types — the main thread
 * owns that file and we don't want to create a cross-package
 * dependency.
 *
 * @param determination  The output of `determineLicenseRequirements()`.
 * @param context        Operation-level inputs for the overlay.
 * @returns A new determination object with AUKUS overlay applied,
 *          OR the original object unchanged if the overlay doesn't fire.
 */
export function applyAukusOverlayToDetermination<
  T extends { requirements: ReadonlyArray<LicenseRequirementShape> },
>(
  determination: T,
  context: AukusOverlayInput,
): T & { aukusOverlay: AukusOverlayResult } {
  const overlay = evaluateAukusOverlay(context);

  if (!overlay.applies) {
    return { ...determination, aukusOverlay: overlay };
  }

  // The overlay fires: rewrite the US/EAR (BIS) requirement to
  // EXCEPTION_MAY_APPLY with the AUKUS citation. We leave non-BIS
  // requirements untouched (e.g. an EU/BAFA leg is its own question).
  const newRequirements = determination.requirements.map((r) => {
    if (r.authority !== "BIS") return r;
    if (r.status === "DENIED" || r.status === "PROHIBITED") return r;
    return {
      ...r,
      status: "EXCEPTION_MAY_APPLY",
      licenseType: "LICENSE_EXCEPTION",
      reason: `${r.reason} However, License Exception ${overlay.licenseException} applies per ${overlay.citation ?? "89 FR 84766"} for this 9A515 shipment to an AUKUS partner.`,
      recommendedAction: `Ship under License Exception ${overlay.licenseException}. File an EEI/AES record citing ${overlay.licenseException} and retain records for 5 years per 15 CFR § 762.6.`,
      applicableException: {
        code: `BIS_LICENSE_EXCEPTION_${overlay.licenseException === "STA-AUKUS" ? "STA_AUKUS" : "AUS"}`,
        label: `License Exception ${overlay.licenseException}`,
        citation: overlay.citation ?? "89 FR 84766",
        conditions: [
          "Item is 9A515 (paragraphs a/b/c/d/g/h/x; .e tech and .f software excluded)",
          "Destination is an AUKUS partner (AU, GB, CA)",
          "End-user is not a military-intelligence end-user (§ 744.22)",
          "End-user is not a cyber-surveillance end-user (§ 744.9)",
          "EEI/AES filed with exception citation",
          "Records retained for 5 years (§ 762.6)",
        ],
      },
    } satisfies LicenseRequirementShape;
  });

  return {
    ...determination,
    requirements: newRequirements,
    aukusOverlay: overlay,
  };
}

/**
 * Minimal structural type for a license requirement that the overlay
 * may transform. Kept loose so the helper does not import from
 * `src/lib/comply-v2/trade/license-determination.ts`.
 */
interface LicenseRequirementShape {
  authority: string;
  status: string;
  licenseType: string | null;
  reason: string;
  recommendedAction: string;
  jurisdiction: string;
  triggerCode?: string;
  applicableException?: {
    code: string;
    label: string;
    citation: string;
    conditions: string[];
  };
}
