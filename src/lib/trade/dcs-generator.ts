/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Trade — Destination Control Statement (DCS) Generator.
 *
 * Sprint Z30. Tier 4 per the Living Execution Plan.
 *
 * Generates the plain-English DCS that 15 CFR § 758.6 requires on
 * commercial invoices, bills of lading, and air waybills for exports
 * of items "subject to the EAR" that are NOT EAR99 / NLR to all
 * destinations.
 *
 * The 2020 revision of § 758.6 collapsed the prior two-statement
 * structure into a single mandatory destination-control statement.
 * Two distinct rule branches:
 *
 *   § 758.6(a) — Generic DCS. Required for any "subject to the EAR"
 *                item being exported under a license or License
 *                Exception (other than No-License-Required to all
 *                destinations).
 *
 *   § 758.6(b) — 9x515 / "600 series" extended language. For items
 *                classified under any 9x515 ECCN (commercial space
 *                items) or any ECCN ending in "600-series" (military
 *                items), the DCS MUST additionally name the country of
 *                ultimate destination, the end user, the ECCN, and
 *                state that diversion contrary to U.S. law is
 *                prohibited.
 *
 * This module produces the formatted statement as plain ASCII text
 * suitable for direct embedding in shipping-document line items. The
 * generator is a pure function: no I/O, no Prisma, no React.
 *
 * Citation: 15 CFR § 758.6 (Destination control statement).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import "server-only";
import type { CascadeResult } from "./subject-to-ear/cascade";

// ─── Input / output shapes ──────────────────────────────────────────

export interface DCSGeneratorInput {
  /**
   * The ECCN(s) under which the export is being made. At least one is
   * required when DCS is mandated. Multiple ECCNs are permitted for
   * multi-line shipments and will be deduplicated + uppercased.
   */
  eccns: string[];
  /**
   * ISO-3166 alpha-2 destination (country of ultimate destination)
   * code. Case-insensitive on input; normalized to uppercase.
   */
  destinationCountry: string;
  /**
   * Optional full country name. If supplied, the generator prints
   * "<name> (<code>)" rather than the bare code — improves readability
   * on the shipping document. The pure function never performs a
   * network lookup; if you want a name, pass it in.
   */
  destinationCountryName?: string;
  /**
   * The consignee (end user / ultimate consignee) name. § 758.6(b)
   * requires this be on the document when 9x515 / 600-series language
   * applies. For § 758.6(a) generic statements it is included as
   * helpful metadata but not mandated.
   */
  consigneeName?: string;
  /**
   * Optional: the upstream Three-Gate Cascade result (Z18). When
   * supplied the generator validates that
   * `obligations.destinationControlStatementRequired === true` before
   * producing a statement. Pass `null` / omit to skip the check (e.g.
   * for items the operator KNOWS need a DCS without re-running the
   * cascade).
   */
  cascadeResult?: CascadeResult | null;
  /**
   * Optional human/system label for the shipment (PO number, AWB
   * number, internal operation reference). Appears on the audit line
   * of the generated text but does NOT alter the regulatory wording.
   */
  shipmentReference?: string;
}

export type DCSVariant =
  | "generic_758_6_a"
  | "extended_758_6_b_9x515_600_series";

export interface DCSGeneratorOutput {
  /** The formatted statement, plain-ASCII, ready to copy into a shipping document. */
  text: string;
  /** Which sub-rule applies — drives downstream UI labelling. */
  variant: DCSVariant;
  /** Normalized ECCN list (uppercase, deduplicated, sorted). */
  normalizedEccns: string[];
  /** Normalized 2-letter destination country code (uppercase). */
  normalizedDestinationCountry: string;
  /**
   * True if at least one of the ECCNs triggered the § 758.6(b)
   * extended-language branch (9x515 / 600-series).
   */
  extendedLanguageApplies: boolean;
  /** The specific ECCNs that triggered the extended branch (if any). */
  extendedLanguageTriggerEccns: string[];
  /** Citation string, always emitted, for the audit trail. */
  citation: string;
}

export class DCSGeneratorError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DCSGeneratorError";
  }
}

// ─── Constants ──────────────────────────────────────────────────────

/**
 * The core § 758.6(a) destination-control statement, verbatim from the
 * BIS-published model language. Operators MAY edit it for typographic
 * concerns but the substance is fixed by regulation.
 */
const GENERIC_DCS_CORE =
  "These items are controlled by the U.S. Government and authorized for export only to the country of ultimate destination for use by the ultimate consignee or end-user(s) herein identified. They may not be resold, transferred, or otherwise disposed of, to any other country or to any person other than the authorized ultimate consignee or end-user(s), either in their original form or after being incorporated into other items, without first obtaining approval from the U.S. government or as otherwise authorized by U.S. law and regulations.";

const CITATION = "15 CFR § 758.6 (Destination Control Statement)";

/**
 * Returns true if the given ECCN classification falls within either:
 *   - Any 9x515 ECCN (9A515, 9B515, 9C515, 9D515, 9E515 — the spacecraft /
 *     related-items series carved out of the USML in 2014), OR
 *   - Any "600 series" ECCN (matches the pattern .X6YY where the third
 *     character is "6", e.g. 9A610, 9D610, 0A606, 1C608 — items that
 *     were transferred from the USML to the CCL in the same era).
 *
 * The 600-series detection looks for the digit "6" immediately after
 * the single letter, per § 738.2(d)(2)(i)(B).
 */
export function isNineX515OrSixHundredSeries(eccn: string): boolean {
  const normalized = eccn.trim().toUpperCase();
  // Must match the basic CCL pattern: digit + letter + 3 digits (+ optional suffix).
  if (!/^[0-9][A-Z][0-9]{3}/.test(normalized)) return false;
  // 9x515 — second char is a letter, characters 3-5 are "515".
  if (normalized[0] === "9" && normalized.substring(2, 5) === "515") {
    return true;
  }
  // 600-series — third character (i.e. the first digit after the
  // letter) is "6".
  if (normalized[2] === "6") {
    return true;
  }
  return false;
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Generate the Destination Control Statement for a shipment.
 *
 * Pure function. No I/O. Deterministic in its inputs.
 *
 * Behaviour:
 *   - Validates required inputs (eccns non-empty, destinationCountry).
 *   - If `cascadeResult` is supplied, refuses to generate when
 *     `obligations.destinationControlStatementRequired` is false —
 *     prevents the operator from stamping a DCS onto a shipment that
 *     doesn't legally need one (which could falsely imply EAR
 *     subjugation).
 *   - Normalizes ECCNs (uppercase, dedupe, sort) and destination
 *     country (uppercase, trim).
 *   - Detects 9x515 / 600-series ECCNs and applies the § 758.6(b)
 *     extended-language branch when ANY line matches.
 *   - Emits plain-ASCII text — no markdown, no HTML, no smart quotes.
 *
 * Per § 758.6, the statement must appear on the commercial invoice,
 * bill of lading, or air waybill. This generator produces the TEXT;
 * placement on the actual shipping document is the operator's
 * responsibility.
 */
export function generateDestinationControlStatement(
  input: DCSGeneratorInput,
): DCSGeneratorOutput {
  // ── Input validation ─────────────────────────────────────────────
  if (!input.eccns || input.eccns.length === 0) {
    throw new DCSGeneratorError(
      "At least one ECCN is required to generate a DCS (15 CFR § 758.6 requires the ECCN on the shipping document).",
    );
  }
  if (
    !input.destinationCountry ||
    input.destinationCountry.trim().length === 0
  ) {
    throw new DCSGeneratorError(
      "Destination country is required to generate a DCS.",
    );
  }

  // Normalize destination — strict 2-letter ISO-3166 alpha-2.
  const normalizedDestinationCountry = input.destinationCountry
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalizedDestinationCountry)) {
    throw new DCSGeneratorError(
      `Destination country must be a 2-letter ISO-3166 alpha-2 code (received: "${input.destinationCountry}").`,
    );
  }

  // Normalize ECCNs — trim, uppercase, dedupe via Set, sort for
  // determinism. Reject any empty strings that slipped through.
  const cleanedEccns = input.eccns
    .map((e) => (e ?? "").trim().toUpperCase())
    .filter((e) => e.length > 0);
  if (cleanedEccns.length === 0) {
    throw new DCSGeneratorError(
      "ECCN list contained only empty strings after normalization.",
    );
  }
  const normalizedEccns = Array.from(new Set(cleanedEccns)).sort();

  // ── Cascade-result safety check ──────────────────────────────────
  // If the caller passed the upstream cascade result, refuse to emit
  // a DCS when the cascade said one isn't required — would otherwise
  // overstate the export-control posture on the shipping document.
  if (
    input.cascadeResult &&
    input.cascadeResult.obligations.destinationControlStatementRequired !== true
  ) {
    throw new DCSGeneratorError(
      `Cascade result indicates DCS is NOT required for this shipment (jurisdiction=${input.cascadeResult.jurisdiction}, gateFired=${input.cascadeResult.gateFired}). Do not stamp a DCS on a non-EAR shipment.`,
    );
  }

  // ── § 758.6(b) extended-language detection ───────────────────────
  const extendedLanguageTriggerEccns = normalizedEccns.filter(
    isNineX515OrSixHundredSeries,
  );
  const extendedLanguageApplies = extendedLanguageTriggerEccns.length > 0;
  const variant: DCSVariant = extendedLanguageApplies
    ? "extended_758_6_b_9x515_600_series"
    : "generic_758_6_a";

  // ── Compose the statement text ───────────────────────────────────
  const consigneeLabel = (input.consigneeName ?? "").trim();
  const destinationLabel = input.destinationCountryName
    ? `${input.destinationCountryName.trim()} (${normalizedDestinationCountry})`
    : normalizedDestinationCountry;

  const lines: string[] = [];

  lines.push("DESTINATION CONTROL STATEMENT");
  lines.push("Per 15 CFR § 758.6");
  lines.push("");

  // Core mandatory paragraph (§ 758.6(a)).
  lines.push(GENERIC_DCS_CORE);
  lines.push("");

  // Identification block — ECCN(s), destination, consignee.
  lines.push(
    `ECCN${normalizedEccns.length > 1 ? "(s)" : ""}: ${normalizedEccns.join(", ")}`,
  );
  lines.push(`Country of Ultimate Destination: ${destinationLabel}`);
  if (consigneeLabel.length > 0) {
    lines.push(`Ultimate Consignee / End-User: ${consigneeLabel}`);
  }

  // § 758.6(b) supplemental paragraph — additional language when any
  // 9x515 or 600-series ECCN is on the shipment.
  if (extendedLanguageApplies) {
    lines.push("");
    lines.push(
      `The export of these items is subject to additional controls under 15 CFR § 758.6(b). The item${extendedLanguageTriggerEccns.length > 1 ? "s" : ""} classified under ${extendedLanguageTriggerEccns.join(", ")} ${extendedLanguageTriggerEccns.length > 1 ? "are" : "is"} controlled for export under the U.S. Munitions List transition (9x515) and/or as a 600-series item under the Export Administration Regulations. Diversion contrary to U.S. law is prohibited.`,
    );
  }

  // Always end with the diversion-prohibited tag-line — even on
  // § 758.6(a) shipments it is standard practice.
  if (!extendedLanguageApplies) {
    lines.push("");
    lines.push("Diversion contrary to U.S. law is prohibited.");
  }

  // Optional shipment-reference footer for the audit trail.
  if (input.shipmentReference && input.shipmentReference.trim().length > 0) {
    lines.push("");
    lines.push(`Shipment reference: ${input.shipmentReference.trim()}`);
  }

  const text = lines.join("\n");

  return {
    text,
    variant,
    normalizedEccns,
    normalizedDestinationCountry,
    extendedLanguageApplies,
    extendedLanguageTriggerEccns,
    citation: CITATION,
  };
}
