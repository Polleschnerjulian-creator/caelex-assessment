/**
 * License Exception Matrix (Sprint B3 + Sprint D3).
 *
 * Maps an item + destination + end-use → eligible license exceptions,
 * with their conditions and the reasoning that justifies eligibility.
 *
 * Two authorities covered today:
 *
 *   BIS (US — 15 CFR Part 740):
 *     STA   — Strategic Trade Authorization (§740.20)
 *     ENC   — Encryption Commodities, Software and Technology (§740.17)
 *     CSA   — Commercial Space Activities (§740.X, NEW Oct 23 2024 IFR
 *             89 FR 84713) — Sprint D3 addition
 *     GOV   — Governments and International Organizations (§740.11)
 *     TMP   — Temporary Imports, Exports, Re-exports (§740.9)
 *
 *   BAFA (DE — Allgemeine Genehmigungen):
 *     AGG_12, AGG_27 (sprint B3)
 *     EUGEA EU001 (sprint B3)
 *     AGG_16, AGG_47, EUGEA EU002 still pending — enum values exist
 *
 * Out of scope (need further sprints):
 *   - BIS TSU (§740.13) — software/technology unrestricted; partial overlap
 *     with ENC but distinct enough to warrant its own evaluator
 *   - DDTC license exemptions (§125.4 / §126.4 etc.) — different
 *     mental model; come in a future Trade sprint
 *   - UK Open General Export Licences (OGELs) — 71 in force as of 2024;
 *     planned for Phase D / E
 *   - FR / IT / ES / JP national general authorisations
 *
 * Architecture: pure data + pure functions. No DB calls, no async.
 * Inputs are normalized facts; output is a list of ApplicableException
 * records the caller (license-determination.ts) can fold into its
 * RequirementStatus = EXCEPTION_MAY_APPLY result.
 *
 * Critical caveat: this matrix produces SCREENING-level guidance only.
 * Every exception has fine print (e.g. STA Country Group A:5+A:6 lists,
 * end-user certifications, prior-government-authorization carve-outs)
 * that an exporter MUST verify against the live CFR text — we surface
 * the citation so the operator knows where to look.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Public types ─────────────────────────────────────────────────────

export type ExceptionAuthority = "BIS" | "BAFA";

export type Jurisdiction = "US" | "DE" | "EU";

/** Reasons an exception was *rejected* — surfaces to the operator. */
export type RejectReason =
  | "DESTINATION_NOT_ELIGIBLE"
  | "ITEM_NOT_ELIGIBLE"
  | "END_USE_NOT_ELIGIBLE"
  | "EMBARGOED_DESTINATION"
  | "VALUE_CAP_EXCEEDED"
  | "MILITARY_END_USER";

export interface ApplicableException {
  /** Stable id, e.g. "BIS_LICENSE_EXCEPTION_STA". */
  code: string;
  /** Display label, e.g. "License Exception STA". */
  label: string;
  authority: ExceptionAuthority;
  jurisdiction: Jurisdiction;
  /** Live CFR or BAFA citation. Always present. */
  citation: string;
  /** One-line summary of the reason this exception is applicable. */
  reason: string;
  /** Specific conditions the exporter must satisfy before relying on this. */
  conditions: string[];
}

export interface RejectedException {
  code: string;
  label: string;
  reasons: RejectReason[];
  detail: string;
}

export interface ExceptionMatchInput {
  /** Item classification — at least one ECCN/USML/AL field set. */
  classification: {
    eccnUS?: string | null;
    eccnEU?: string | null;
    usmlCategory?: string | null;
    germanAlEntry?: string | null;
    mtcrCategory?: string | null;
  };
  /** Destination ISO-2 country code (uppercase). */
  destinationCountry: string;
  /** Optional ship-from / re-export origin. */
  shipFromCountry?: string;
  /** Declared end-use category. Free-text fallback OK. */
  endUse?: string;
  /** True if the end-user is known to be a government/intl org. */
  isGovernmentEndUser?: boolean;
  /** True if there is a US person involved (affects deemed-export carveouts). */
  hasUSPerson?: boolean;
  /** Operation value in EUR (rough — used for value-cap exceptions). */
  valueEur?: number;
}

export interface ExceptionMatchResult {
  applicable: ApplicableException[];
  /** Exceptions we considered but rejected, with reasons. */
  rejected: RejectedException[];
}

// ─── Country groups ───────────────────────────────────────────────────

/**
 * BIS Country Group A:5 + A:6 (15 CFR Part 740 Supplement No. 1) —
 * destinations eligible for License Exception STA. The list moves
 * over time; we keep it as a data constant so updates are one edit
 * away.
 *
 * As of 2026-05-22 (verify against the live Federal Register):
 *   A:5 — most NATO + close allies
 *   A:6 — a narrower subset for sensitive controls
 */
const STA_COUNTRY_GROUP_A5_A6: ReadonlySet<string> = new Set([
  // A:5 (broad NATO + allies)
  "AR",
  "AT",
  "AU",
  "BE",
  "BG",
  "CA",
  "HR",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IS",
  "IE",
  "IT",
  "JP",
  "KR",
  "LV",
  "LT",
  "LU",
  "NL",
  "NZ",
  "NO",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "CH",
  "TR",
  "UA",
  "GB",
  // A:6 subset for sensitive controls — currently same allies minus a
  // few outliers (Ukraine, Turkey treated separately for some controls).
  // Operators should verify the live A:6 list per item.
]);

/** US embargoed destinations (Cuba, Iran, North Korea, Syria, Crimea region). */
const US_EMBARGOED: ReadonlySet<string> = new Set(["CU", "IR", "KP", "SY"]);

/** EU/UN embargo destinations (a non-exhaustive defensive list). */
const EU_UN_EMBARGOED: ReadonlySet<string> = new Set([
  "BY",
  "CU",
  "IR",
  "KP",
  "MM",
  "RU",
  "SY",
  "VE",
  "ZW",
]);

/**
 * AUKUS-partner destinations — license-exception CSA eligibility scope.
 *
 * Per Federal Register 89 FR 84713 (October 23, 2024 IFR), BIS created
 * the new **License Exception CSA (Commercial Space Activities)** at
 * 15 CFR §740.X. CSA authorizes most 9A515 / 9E515 spacecraft items
 * to AUKUS partners (Australia + United Kingdom — US is the exporter
 * so doesn't appear in the destination list) plus Canada under the
 * same logic — collectively Five-Eyes minus New Zealand.
 *
 * The IFR explicitly removed license-requirements for "certain
 * spacecraft and related items" to AU/CA/UK, codifying the close-ally
 * carve-out demanded by industry since 2014 ECR.
 *
 * Operators MUST verify that the specific 9A515 sub-paragraph is
 * within CSA scope — not every .x sub-paragraph qualifies (some .y
 * are CSA-eligible, certain .e components retain their NS controls).
 * The conditions field captures this.
 */
const CSA_AUKUS_DESTINATIONS: ReadonlySet<string> = new Set([
  "AU", // Australia
  "CA", // Canada — included via the parallel "removal of license requirements
  // for certain spacecraft to AU/CA/UK" rule (89 FR 2024-23932)
  "GB", // United Kingdom
]);

/**
 * Five-Eyes intelligence-sharing alliance — extended pool for future
 * License-Exception-CSA expansion. NZ is in Five-Eyes but the Oct 2024
 * IFR did NOT include it in the AUKUS-spacecraft carve-out. We track
 * the set separately so a future rule can expand without touching
 * evaluator code.
 */
const FIVE_EYES_DESTINATIONS: ReadonlySet<string> = new Set([
  "AU",
  "CA",
  "GB",
  "NZ",
]);

/** EU + EEA + Switzerland — destinations where intra-EU AGG-12 applies. */
const EU_EEA_CH: ReadonlySet<string> = new Set([
  "AT",
  "BE",
  "BG",
  "HR",
  "CY",
  "CZ",
  "DK",
  "EE",
  "FI",
  "FR",
  "DE",
  "GR",
  "HU",
  "IE",
  "IT",
  "LV",
  "LT",
  "LU",
  "MT",
  "NL",
  "PL",
  "PT",
  "RO",
  "SK",
  "SI",
  "ES",
  "SE",
  "IS",
  "LI",
  "NO",
  "CH",
]);

/** EU General Export Authorisation EU001 destinations (low-risk allies). */
const EUGEA_EU001_DESTINATIONS: ReadonlySet<string> = new Set([
  "AU",
  "CA",
  "JP",
  "NZ",
  "NO",
  "CH",
  "GB",
  "US",
  "IS",
  "LI",
]);

// ─── ECCN classifiers ────────────────────────────────────────────────

/**
 * Match against ECCN prefix (e.g. "5A002.a" matches prefix "5A002").
 * Used by STA + ENC eligibility rules.
 */
function eccnMatchesPrefix(
  eccn: string | null | undefined,
  prefix: string,
): boolean {
  if (!eccn) return false;
  return eccn.toUpperCase().startsWith(prefix.toUpperCase());
}

/** ECCNs eligible for STA (a substantial subset; full list in 15 CFR §740.20). */
function isStaEligibleEccn(eccn: string | null | undefined): boolean {
  if (!eccn) return false;
  // STA covers most "600 series" military-derived items + most non-"y" suffix
  // entries in categories 1-9. Reject obvious exclusions first. We match
  // case-insensitively so "5A002.a.4.y" and "5A002.a.4.Y" both reject.
  // ".y" / ".ys" must be the terminal suffix — bare end-of-string anchor
  // (not \b) because the ".y" itself is the suffix marker the regulation
  // uses to flag STA-ineligible items.
  if (/\.y$/i.test(eccn)) return false;
  if (/\.ys$/i.test(eccn)) return false;
  return true;
}

/** Category-5 Part 2 = encryption-controlled items. */
function isEncryptionEccn(eccn: string | null | undefined): boolean {
  if (!eccn) return false;
  return /^5[AD]002\b/i.test(eccn);
}

/**
 * 9A515 / 9E515 / 9D515 family — the post-2014-ECR commercial-spacecraft
 * series, eligible for License Exception CSA. Matches 9A515, 9B515,
 * 9C515, 9D515, 9E515 series and any sub-paragraph (.a / .b / .d /
 * .g / .h / .x / .y etc).
 */
function isCsaEligibleEccn(eccn: string | null | undefined): boolean {
  if (!eccn) return false;
  return /^9[ABCDE]515\b/i.test(eccn);
}

// ─── BIS exception evaluators ─────────────────────────────────────────

function evaluateSta(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const eccnUS = input.classification.eccnUS;
  const dest = input.destinationCountry.toUpperCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (US_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is US-embargoed`);
  }
  if (!STA_COUNTRY_GROUP_A5_A6.has(dest)) {
    reasons.push("DESTINATION_NOT_ELIGIBLE");
    details.push(
      `Destination ${dest} not in Country Group A:5 / A:6 (15 CFR Part 740 Supplement No. 1)`,
    );
  }
  if (!isStaEligibleEccn(eccnUS)) {
    reasons.push("ITEM_NOT_ELIGIBLE");
    details.push(
      eccnUS
        ? `ECCN ${eccnUS} carries an exclusion (".y" / ".ys" suffix or other STA-ineligible flag)`
        : "No US ECCN classified yet",
    );
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BIS_LICENSE_EXCEPTION_STA",
        label: "License Exception STA",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BIS_LICENSE_EXCEPTION_STA",
      label: "License Exception STA",
      authority: "BIS",
      jurisdiction: "US",
      citation: "15 CFR §740.20",
      reason: `ECCN ${eccnUS} to ${dest} is in Country Group A:5/A:6 and the ECCN carries no STA exclusion suffix.`,
      conditions: [
        "Obtain end-user written statement per §740.20(c)(2) before shipment",
        "Notify the consignee of all applicable conditions",
        "Maintain records per §740.20(d) for 5 years (file retention)",
        "Do not use STA if any party to the transaction is on the Entity List",
      ],
    },
  };
}

function evaluateEnc(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const eccnUS = input.classification.eccnUS;
  const dest = input.destinationCountry.toUpperCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (US_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is US-embargoed`);
  }
  if (!isEncryptionEccn(eccnUS)) {
    reasons.push("ITEM_NOT_ELIGIBLE");
    details.push(
      eccnUS
        ? `ECCN ${eccnUS} is not category 5A002/5D002 (encryption-controlled)`
        : "No US ECCN classified yet — ENC requires 5A002 or 5D002",
    );
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BIS_LICENSE_EXCEPTION_ENC",
        label: "License Exception ENC",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BIS_LICENSE_EXCEPTION_ENC",
      label: "License Exception ENC",
      authority: "BIS",
      jurisdiction: "US",
      citation: "15 CFR §740.17",
      reason: `Encryption item ${eccnUS} shipped to a non-embargoed destination — ENC §740.17 paragraphs (a)/(b) apply depending on counterparty type.`,
      conditions: [
        "File classification request with BIS if required per §740.17(b)(2)(i)(A)",
        "Submit semi-annual reporting for non-Government end-users",
        "Restricted exporters (gov / military) require §740.17(b)(2)(ii) authorization first",
        "Confirm the encryption is 'mass-market' or 'restricted' to pick the right paragraph",
      ],
    },
  };
}

function evaluateGov(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const dest = input.destinationCountry.toUpperCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (US_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is US-embargoed`);
  }
  if (!input.isGovernmentEndUser) {
    reasons.push("END_USE_NOT_ELIGIBLE");
    details.push("End-user is not a government or international organization");
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BIS_LICENSE_EXCEPTION_GOV",
        label: "License Exception GOV",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BIS_LICENSE_EXCEPTION_GOV",
      label: "License Exception GOV",
      authority: "BIS",
      jurisdiction: "US",
      citation: "15 CFR §740.11",
      reason: `End-user is a government / international organization in ${dest}; GOV paragraphs (a)-(d) cover diplomatic/military/IGO scenarios.`,
      conditions: [
        "Verify end-user falls within one of GOV's enumerated categories (US gov, cooperating gov, IGO)",
        "GOV does NOT cover 600-series items unless paragraph (b)(2)(iii) applies",
        "Items destined for foreign police/intelligence may require additional review",
      ],
    },
  };
}

function evaluateTmp(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const dest = input.destinationCountry.toUpperCase();
  const endUse = (input.endUse ?? "").toLowerCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (US_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is US-embargoed`);
  }
  const isTemporaryUse =
    endUse.includes("temp") ||
    endUse.includes("demo") ||
    endUse.includes("trade show") ||
    endUse.includes("repair") ||
    endUse.includes("test");
  if (!isTemporaryUse) {
    reasons.push("END_USE_NOT_ELIGIBLE");
    details.push(
      'End-use does not match TMP categories ("temporary", "demo", "trade show", "repair", "test")',
    );
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BIS_LICENSE_EXCEPTION_TMP",
        label: "License Exception TMP",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BIS_LICENSE_EXCEPTION_TMP",
      label: "License Exception TMP",
      authority: "BIS",
      jurisdiction: "US",
      citation: "15 CFR §740.9",
      reason: `Temporary export/re-export to ${dest} for ${input.endUse}.`,
      conditions: [
        "Item must return to the US within 1 year (or be destroyed in place)",
        "Cannot be used for development/production by the consignee",
        "Records: maintain the temporary-export log for the duration plus 5 years",
        "TMP does NOT apply to 600-series items beyond limited carve-outs in §740.9(b)(4)",
      ],
    },
  };
}

function evaluateCsa(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const eccnUS = input.classification.eccnUS;
  const dest = input.destinationCountry.toUpperCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (US_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is US-embargoed`);
  }
  if (!CSA_AUKUS_DESTINATIONS.has(dest)) {
    reasons.push("DESTINATION_NOT_ELIGIBLE");
    details.push(
      `Destination ${dest} not in CSA scope (AU / CA / GB only per 89 FR 84713 + 2024-23932)`,
    );
  }
  if (!isCsaEligibleEccn(eccnUS)) {
    reasons.push("ITEM_NOT_ELIGIBLE");
    details.push(
      eccnUS
        ? `ECCN ${eccnUS} is not in the 9A/9B/9C/9D/9E-515 commercial-spacecraft family`
        : "No US ECCN classified yet — CSA requires 9x515 series",
    );
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BIS_LICENSE_EXCEPTION_CSA",
        label: "License Exception CSA",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BIS_LICENSE_EXCEPTION_CSA",
      label: "License Exception CSA",
      authority: "BIS",
      jurisdiction: "US",
      citation: "15 CFR §740.X (89 FR 84713, Oct 23, 2024 IFR)",
      reason: `9x515 commercial-spacecraft ECCN ${eccnUS} to AUKUS partner ${dest} is eligible under License Exception CSA. The Oct 23 2024 IFR removed license requirements for spacecraft / related items to AU / CA / GB.`,
      conditions: [
        "Verify specific 9x515 sub-paragraph remains in CSA scope (not every .x / .y is eligible — confirm against §740.X(b) item list)",
        "Cannot use CSA if any party is on the Entity / MEU / MIEU / DPL list (incl. 50% Affiliate Rule effective Sept 29 2025)",
        "End-user written statement per §740.X(c) before shipment",
        "Records per §740.X(d) for 5 years",
        "CSA does NOT cover 600-series items integrated into the spacecraft",
      ],
    },
  };
}

// ─── BAFA exception evaluators ────────────────────────────────────────

function evaluateAgg12(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const dest = input.destinationCountry.toUpperCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (!EU_EEA_CH.has(dest)) {
    reasons.push("DESTINATION_NOT_ELIGIBLE");
    details.push(`Destination ${dest} not in EU/EEA + Switzerland`);
  }
  if (EU_UN_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is under EU/UN sanctions`);
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BAFA_AGG_12",
        label: "Allgemeine Genehmigung Nr. 12",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BAFA_AGG_12",
      label: "Allgemeine Genehmigung Nr. 12",
      authority: "BAFA",
      jurisdiction: "EU",
      citation: "AWV §22a / BAFA AGG Nr. 12",
      reason: `Intra-EU dual-use transfer to ${dest} (EU/EEA + CH).`,
      conditions: [
        "Operator must be registered with BAFA before the first use",
        "Quarterly reporting to BAFA per the AGG-12 reporting schema",
        "Does NOT cover Annex IV items — those need AGG-47 or single license",
        "Operator must retain shipping records for 5 years (AWV §22)",
      ],
    },
  };
}

function evaluateAgg27(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const eccnEU = input.classification.eccnEU;
  const dest = input.destinationCountry.toUpperCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (EU_UN_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is under EU/UN sanctions`);
  }
  // AGG-27 covers Category 5 software (computer software) — Annex I 4D or 5D.
  // We anchor on the "4D" / "5D" prefix without \b because the next char is
  // typically a digit (e.g. "4D001") which is a word char — \b would not
  // match between two word chars. Plain prefix check is sufficient.
  const isSoftware = !!eccnEU && (/^4D/i.test(eccnEU) || /^5D/i.test(eccnEU));
  if (!isSoftware) {
    reasons.push("ITEM_NOT_ELIGIBLE");
    details.push(
      eccnEU
        ? `ECCN ${eccnEU} is not Annex I 4D / 5D (computer software)`
        : "No EU classification yet — AGG-27 requires 4D or 5D",
    );
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BAFA_AGG_27",
        label: "Allgemeine Genehmigung Nr. 27",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BAFA_AGG_27",
      label: "Allgemeine Genehmigung Nr. 27",
      authority: "BAFA",
      jurisdiction: "EU",
      citation: "AWV §22a / BAFA AGG Nr. 27",
      reason: `Computer software ${eccnEU} export to ${dest}.`,
      conditions: [
        "Cryptography elements must be 'mass market' under Annex I Note 3",
        "Half-yearly reporting to BAFA",
        "Software must NOT have a primary military end-use",
      ],
    },
  };
}

function evaluateEugeaEu001(
  input: ExceptionMatchInput,
): { applicable: ApplicableException } | { rejected: RejectedException } {
  const dest = input.destinationCountry.toUpperCase();
  const reasons: RejectReason[] = [];
  const details: string[] = [];

  if (!EUGEA_EU001_DESTINATIONS.has(dest)) {
    reasons.push("DESTINATION_NOT_ELIGIBLE");
    details.push(
      `Destination ${dest} not in EU001 country list (AU/CA/JP/NZ/NO/CH/GB/US/IS/LI)`,
    );
  }
  if (EU_UN_EMBARGOED.has(dest)) {
    reasons.push("EMBARGOED_DESTINATION");
    details.push(`Destination ${dest} is under EU/UN sanctions`);
  }

  if (reasons.length > 0) {
    return {
      rejected: {
        code: "BAFA_EUGEA_EU001",
        label: "EU General Export Authorisation EU001",
        reasons,
        detail: details.join("; "),
      },
    };
  }

  return {
    applicable: {
      code: "BAFA_EUGEA_EU001",
      label: "EU General Export Authorisation EU001",
      authority: "BAFA",
      jurisdiction: "EU",
      citation: "EU Reg. 2021/821 Annex II.A",
      reason: `Export of dual-use goods to EU001 destination ${dest}.`,
      conditions: [
        "Notify the competent authority within 30 days of first use",
        "Annual reporting to BAFA",
        "Does NOT cover Annex IV or Annex II.G items",
        "End-use certification required from the importer",
      ],
    },
  };
}

// ─── Main entry point ─────────────────────────────────────────────────

/**
 * Match the input against all known license exceptions. Returns both
 * applicable and rejected exceptions so the operator can see which
 * exceptions were considered (and why they didn't apply) — important
 * for the audit trail.
 */
export function matchLicenseExceptions(
  input: ExceptionMatchInput,
): ExceptionMatchResult {
  const applicable: ApplicableException[] = [];
  const rejected: RejectedException[] = [];

  const evaluators = [
    evaluateSta,
    evaluateEnc,
    evaluateCsa, // Sprint D3 — Oct 2024 IFR (89 FR 84713)
    evaluateGov,
    evaluateTmp,
    evaluateAgg12,
    evaluateAgg27,
    evaluateEugeaEu001,
  ];

  for (const evaluate of evaluators) {
    const result = evaluate(input);
    if ("applicable" in result) {
      applicable.push(result.applicable);
    } else {
      rejected.push(result.rejected);
    }
  }

  return { applicable, rejected };
}
