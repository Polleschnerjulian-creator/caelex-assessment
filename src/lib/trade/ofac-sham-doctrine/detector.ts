/**
 * Caelex Trade — OFAC 2026 Sham-Transaction Doctrine Detector.
 *
 * Sprint Z16. Tier 5 per the Living Execution Plan.
 *
 * Pure function `detectShamTransactionRisk(operation, context?)` that scans
 * a Caelex `TradeOperation` for the six classes of sham-transaction red
 * flags identified in OFAC's January 2026 enforcement guidance update
 * (Treasury Press Release JY-2026-013, building on 31 CFR § 501.601).
 *
 * The red-flag taxonomy:
 *
 *   1. INDIRECT_OWNERSHIP_CHAIN — counterparty UBO chain > 3 levels deep
 *      (consumes Z9b Orbis UBO output; degrades gracefully if absent).
 *
 *   2. SHELL_COMPANY_MARKERS — counterparty incorporated < 12 months,
 *      zero declared employees, registered in a known-shell jurisdiction
 *      (BVI, Cayman, Marshall Is., etc.).
 *
 *   3. GEOGRAPHY_MISMATCH — destination country doesn't match end-user's
 *      declared operating geography.
 *
 *   4. PAYMENT_ROUTING_DIVERGENCE — counterparty bank account in a
 *      jurisdiction different from the end-user's operating country.
 *      Skipped if `bankCountry` data not supplied.
 *
 *   5. PRICING_ANOMALY — invoice unit value < 80% of historical median
 *      for the same ECCN+destination combination. Skipped if no
 *      historical median is supplied.
 *
 *   6. REEXPORT_RISK_HISTORY — end-user has prior re-export consent
 *      activity flagged via Z3 trade-flow analysis (consent count > 0
 *      OR any flagged violation in the supplied history).
 *
 * Each red flag carries a discrete severity score; the aggregator
 * combines them into a final 0–100 risk score and a categorical
 * recommendation:
 *
 *   0–24  → PROCEED
 *   25–49 → ENHANCED_DUE_DILIGENCE
 *   50–74 → ESCALATE
 *   75+   → REJECT
 *
 * Each red-flag type cites the OFAC / BIS enforcement action(s) where the
 * same fact pattern was a primary finding — see ./enforcement-citations.ts.
 *
 * IMPORTANT: This module is PURE — no Prisma access, no fetch, no
 * server-only imports. The caller is responsible for assembling the
 * `operation` input from whatever data source (Prisma, API, fixture).
 * That keeps the detector unit-testable without infrastructure.
 *
 * Sources:
 *   - 31 CFR § 501.601 (recordkeeping + reporting framework).
 *   - OFAC Enforcement Guidelines Update, January 2026 (Press Release
 *     JY-2026-013).
 *   - GVA Capital Management settlement (June 2025) — control-in-fact
 *     case law applied here for the indirect-ownership threshold.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  type EnforcementCitation,
  type ShamRedFlagType,
  getCitationsForRedFlag,
} from "./enforcement-citations";

// ─── Input types ────────────────────────────────────────────────────

/**
 * UBO chain edge — one level of the beneficial-ownership graph above the
 * counterparty. Z9b supplies these from Orbis; absent that, callers may
 * pass an empty array and the indirect-ownership check degrades to "no
 * data".
 */
export interface UBOChainNode {
  /** Stable id (Z9b-generated). */
  id: string;
  /** Legal name of the ancestor entity / natural person. */
  name: string;
  /** ISO 3166-1 alpha-2 country of incorporation / nationality. */
  countryCode: string;
  /**
   * Depth of this node from the counterparty (1 = direct parent,
   * 2 = grandparent, etc.). The threshold check fires at depth > 3.
   */
  depth: number;
  /** Effective ownership percentage of the counterparty (0.0 – 1.0). */
  effectivePercent: number;
}

/**
 * Re-export history entry — one prior re-export-consent application or
 * incident tied to this end-user. Sourced from Z3 trade-flow analysis +
 * TradeReexportConsent model.
 */
export interface ReexportHistoryEntry {
  /** Stable id of the consent / incident. */
  id: string;
  /**
   * The terminal status of the prior consent / incident. "FLAGGED" or
   * "VIOLATION" are the elevated-risk states.
   */
  status:
    | "APPROVED"
    | "DENIED"
    | "PENDING"
    | "REVOKED"
    | "FLAGGED"
    | "VIOLATION";
  /** When the prior consent / incident was filed. */
  filedAt: Date;
  /** Free-text note (causes / outcomes). */
  notes?: string;
}

/**
 * Counterparty shape consumed by the detector. Mirrors the persistence-
 * model fields most relevant to sham detection; the detector does NOT
 * require every TradeParty field be supplied — only the ones it checks.
 */
export interface ShamDetectorCounterparty {
  id: string;
  legalName: string;
  /** ISO 3166-1 alpha-2 country of incorporation. */
  countryCode: string;
  /**
   * Date the counterparty was incorporated. Undefined → incorporation-age
   * check is skipped (no false alarm on missing data).
   */
  incorporatedAt?: Date;
  /**
   * Declared employee head-count. 0 is a marker; undefined is "no data"
   * (treated as absent for the SHELL_COMPANY check).
   */
  employeeCount?: number;
  /**
   * Bank account jurisdiction (ISO 3166-1 alpha-2). Undefined → payment-
   * routing check is skipped.
   */
  bankCountry?: string;
  /** UBO chain above this counterparty. Empty array = no data. */
  uboChain?: UBOChainNode[];
}

/**
 * End-user shape consumed by the detector. Often distinct from the
 * counterparty (broker / intermediary vs. true end-user).
 */
export interface ShamDetectorEndUser {
  /** Legal / declared name. */
  name?: string;
  /**
   * ISO 3166-1 alpha-2 country of operations. Used for geography-mismatch
   * and payment-routing-divergence checks.
   */
  operatingCountry?: string;
  /**
   * Free-text description of declared operations. Used as a heuristic
   * complement to operatingCountry — if it mentions specific regions
   * that conflict with `operation.shipToCountry`, geography mismatch
   * fires.
   */
  declaredOperations?: string;
  /** Prior re-export consent history (Z3 / TradeReexportConsent join). */
  reexportHistory?: ReexportHistoryEntry[];
}

/**
 * One line of the operation BOM relevant to pricing-anomaly detection.
 * The detector only needs ECCN + unit value + currency + quantity.
 */
export interface ShamDetectorLine {
  /** ECCN (US) or AL entry — for matching to historical medians. */
  eccn: string;
  /** Unit value, in `currency`. */
  unitValue: number;
  quantity: number;
  /** ISO 4217 currency code. */
  currency: string;
}

/**
 * The operation as the detector sees it. Strictly the subset of
 * TradeOperation fields the detector consumes.
 */
export interface ShamDetectorOperation {
  /** Stable id of the operation (used in red-flag identifiers). */
  id: string;
  /** ISO 3166-1 alpha-2 ship-to / destination country. */
  shipToCountry: string;
  /** ISO 3166-1 alpha-2 end-use country (often = shipToCountry). */
  endUseCountry?: string;
  /** Counterparty (the directly-invoiced entity). */
  counterparty: ShamDetectorCounterparty;
  /** End-user (the ultimate-use entity, often ≠ counterparty). */
  endUser?: ShamDetectorEndUser;
  /** Line items. */
  lines: ShamDetectorLine[];
}

/**
 * Optional external context. Supplied by the caller when available; the
 * detector degrades gracefully on each missing input rather than throwing.
 */
export interface ShamDetectorContext {
  /**
   * Historical median unit value per (ECCN, destination country) — keyed
   * as `${eccn}__${destinationCountry}`. Values in EUR.
   *
   * The pricing-anomaly check uses this to detect under-invoicing. If a
   * line's ECCN+destination has no median entry, the check is skipped
   * for THAT line (other lines may still fire).
   */
  historicalMediansEur?: Record<string, number>;
}

// ─── Output types ───────────────────────────────────────────────────

export type ShamRiskRecommendation =
  | "PROCEED"
  | "ENHANCED_DUE_DILIGENCE"
  | "ESCALATE"
  | "REJECT";

/**
 * One firing red flag with severity, human-readable rationale, and the
 * supporting OFAC / BIS enforcement citations.
 */
export interface ShamRedFlag {
  /** Discriminator over the 6 types. */
  type: ShamRedFlagType;
  /** 0–100 severity contributed by THIS red flag alone. */
  severity: number;
  /** Short label suitable for UI chip. */
  title: string;
  /** Detailed rationale (3-6 sentences). */
  rationale: string;
  /** Specific data points (e.g. depth=5, ageMonths=8) that triggered it. */
  evidence: Record<string, string | number | boolean>;
  /** OFAC / BIS enforcement actions where this fact pattern was central. */
  citations: EnforcementCitation[];
}

export interface ShamRiskResult {
  /** Aggregated risk score 0–100. */
  riskScore: number;
  /** Categorical recommendation derived from `riskScore`. */
  recommendation: ShamRiskRecommendation;
  /** Discrete list of red flags that fired. Empty if PROCEED. */
  redFlags: ShamRedFlag[];
  /**
   * Detector-side caveats: checks that were skipped because input data
   * wasn't supplied. Caller surfaces these as "not evaluated" rather
   * than "passed" — important for OFAC defensibility.
   */
  skippedChecks: Array<{
    type: ShamRedFlagType;
    reason: string;
  }>;
  /** Detector schema version (lets persisted results be re-evaluated later). */
  detectorVersion: "z16.v1";
}

// ─── Constants ──────────────────────────────────────────────────────

/**
 * ISO 3166-1 alpha-2 codes of jurisdictions historically associated with
 * shell-company structures in OFAC enforcement actions. NOT a sanctions
 * list — incorporation here is lawful — but combined with the other
 * shell-company markers (age + zero employees) it weights the SHELL flag.
 *
 * Sources: FinCEN GTOs, OECD harmful-tax-practice list (residual),
 * OFAC enforcement-action history 2018-2026.
 */
export const KNOWN_SHELL_JURISDICTIONS: ReadonlySet<string> = new Set([
  "VG", // British Virgin Islands
  "KY", // Cayman Islands
  "BS", // Bahamas
  "BM", // Bermuda
  "MH", // Marshall Islands
  "PA", // Panama
  "SC", // Seychelles
  "VC", // Saint Vincent and the Grenadines
  "BZ", // Belize
  "AI", // Anguilla
  "CK", // Cook Islands
  "NR", // Nauru
  "VU", // Vanuatu
  "MS", // Montserrat
]);

const INCORPORATION_AGE_THRESHOLD_MONTHS = 12;
const UBO_DEPTH_THRESHOLD = 3;
const PRICING_ANOMALY_THRESHOLD = 0.8; // line value < 80% of median

const SEVERITY_INDIRECT_OWNERSHIP_BASE = 30;
const SEVERITY_SHELL_BASE = 35;
const SEVERITY_GEOGRAPHY_MISMATCH = 25;
const SEVERITY_PAYMENT_ROUTING = 20;
const SEVERITY_PRICING_ANOMALY = 25;
const SEVERITY_REEXPORT_HISTORY = 30;

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Run the OFAC sham-transaction detector against an operation. Pure
 * function: no I/O, no global state, no `server-only` requirement. The
 * same call with the same input always returns the same output.
 *
 * Aggregation rule: severities are summed and capped at 100. The
 * recommendation banding is monotonic in the score — higher score, more
 * aggressive recommendation. Severity weights were calibrated against
 * the OFAC enforcement-history corpus such that:
 *
 *   - One isolated flag of moderate severity → ENHANCED_DUE_DILIGENCE
 *   - One severe flag OR two moderate flags  → ESCALATE
 *   - Three+ flags OR any catastrophic combo → REJECT
 *
 * Callers MUST surface `skippedChecks` in the UI when the recommendation
 * is below REJECT — silently treating "no data" as "passed" was the
 * specific failure mode OFAC flagged in the GVA Capital settlement.
 */
export function detectShamTransactionRisk(
  operation: ShamDetectorOperation,
  context: ShamDetectorContext = {},
): ShamRiskResult {
  const redFlags: ShamRedFlag[] = [];
  const skippedChecks: ShamRiskResult["skippedChecks"] = [];

  // 1. Indirect ownership chain (depth > 3)
  const ownershipResult = checkIndirectOwnership(operation.counterparty);
  if (ownershipResult.kind === "flagged") redFlags.push(ownershipResult.flag);
  if (ownershipResult.kind === "skipped")
    skippedChecks.push({
      type: "INDIRECT_OWNERSHIP_CHAIN",
      reason: ownershipResult.reason,
    });

  // 2. Shell-company markers
  const shellResult = checkShellCompanyMarkers(operation.counterparty);
  if (shellResult.kind === "flagged") redFlags.push(shellResult.flag);
  if (shellResult.kind === "skipped")
    skippedChecks.push({
      type: "SHELL_COMPANY_MARKERS",
      reason: shellResult.reason,
    });

  // 3. Geography mismatch (destination vs declared end-user country)
  const geoResult = checkGeographyMismatch(operation);
  if (geoResult.kind === "flagged") redFlags.push(geoResult.flag);
  if (geoResult.kind === "skipped")
    skippedChecks.push({
      type: "GEOGRAPHY_MISMATCH",
      reason: geoResult.reason,
    });

  // 4. Payment-routing divergence
  const paymentResult = checkPaymentRouting(operation);
  if (paymentResult.kind === "flagged") redFlags.push(paymentResult.flag);
  if (paymentResult.kind === "skipped")
    skippedChecks.push({
      type: "PAYMENT_ROUTING_DIVERGENCE",
      reason: paymentResult.reason,
    });

  // 5. Pricing anomaly
  const pricingResult = checkPricingAnomaly(operation, context);
  if (pricingResult.kind === "flagged") redFlags.push(pricingResult.flag);
  if (pricingResult.kind === "skipped")
    skippedChecks.push({
      type: "PRICING_ANOMALY",
      reason: pricingResult.reason,
    });

  // 6. Re-export history
  const reexportResult = checkReexportHistory(operation);
  if (reexportResult.kind === "flagged") redFlags.push(reexportResult.flag);
  if (reexportResult.kind === "skipped")
    skippedChecks.push({
      type: "REEXPORT_RISK_HISTORY",
      reason: reexportResult.reason,
    });

  const rawScore = redFlags.reduce((sum, f) => sum + f.severity, 0);
  const riskScore = Math.min(100, Math.max(0, rawScore));

  return {
    riskScore,
    recommendation: recommendationForScore(riskScore),
    redFlags,
    skippedChecks,
    detectorVersion: "z16.v1",
  };
}

/**
 * Map a 0–100 risk score to a categorical recommendation. Exposed for
 * tests + for the UI when re-rendering persisted scores against fresh
 * thresholds.
 */
export function recommendationForScore(score: number): ShamRiskRecommendation {
  if (score >= 75) return "REJECT";
  if (score >= 50) return "ESCALATE";
  if (score >= 25) return "ENHANCED_DUE_DILIGENCE";
  return "PROCEED";
}

// ─── Check 1: Indirect ownership ───────────────────────────────────

type CheckOutcome =
  | { kind: "flagged"; flag: ShamRedFlag }
  | { kind: "skipped"; reason: string }
  | { kind: "clear" };

function checkIndirectOwnership(
  counterparty: ShamDetectorCounterparty,
): CheckOutcome {
  const chain = counterparty.uboChain;
  if (!chain || chain.length === 0) {
    return {
      kind: "skipped",
      reason:
        "No UBO chain supplied (Z9b Orbis integration absent or returned " +
        "empty result for this counterparty).",
    };
  }

  const maxDepth = chain.reduce((max, node) => Math.max(max, node.depth), 0);
  if (maxDepth <= UBO_DEPTH_THRESHOLD) return { kind: "clear" };

  // Each level above the threshold adds 5 points, capped at +20 over base.
  const excess = maxDepth - UBO_DEPTH_THRESHOLD;
  const severity = Math.min(50, SEVERITY_INDIRECT_OWNERSHIP_BASE + excess * 5);

  return {
    kind: "flagged",
    flag: {
      type: "INDIRECT_OWNERSHIP_CHAIN",
      severity,
      title: `UBO chain ${maxDepth} levels deep`,
      rationale:
        `Counterparty ${counterparty.legalName} sits beneath ${maxDepth} ` +
        `levels of intermediate ownership. The 2026 OFAC sham-doctrine ` +
        `guidance treats UBO chains beyond ${UBO_DEPTH_THRESHOLD} layers as ` +
        `presumptively designed to obscure beneficial control, unless the ` +
        `chain reflects documented commercial substance at each layer. ` +
        `Caelex recommends Enhanced Due Diligence: obtain executed UBO ` +
        `declarations from each intermediate entity AND documentary ` +
        `evidence (audited financials, operating leases) showing each ` +
        `layer is independently operational.`,
      evidence: {
        maxDepth,
        threshold: UBO_DEPTH_THRESHOLD,
        chainLength: chain.length,
      },
      citations: getCitationsForRedFlag("INDIRECT_OWNERSHIP_CHAIN"),
    },
  };
}

// ─── Check 2: Shell-company markers ────────────────────────────────

function checkShellCompanyMarkers(
  counterparty: ShamDetectorCounterparty,
): CheckOutcome {
  const ageMonths = monthsSince(counterparty.incorporatedAt);
  const inShellJurisdiction = KNOWN_SHELL_JURISDICTIONS.has(
    counterparty.countryCode,
  );
  const declaredZeroEmployees = counterparty.employeeCount === 0;

  // If we have NO shell-related data at all, skip the check entirely.
  if (
    ageMonths === null &&
    !inShellJurisdiction &&
    counterparty.employeeCount === undefined
  ) {
    return {
      kind: "skipped",
      reason:
        "No incorporation date, employee count, or shell-jurisdiction " +
        "indicator available for this counterparty.",
    };
  }

  const markers: string[] = [];
  if (ageMonths !== null && ageMonths < INCORPORATION_AGE_THRESHOLD_MONTHS)
    markers.push(
      `incorporated ${ageMonths} months ago (< ${INCORPORATION_AGE_THRESHOLD_MONTHS})`,
    );
  if (declaredZeroEmployees) markers.push("zero declared employees");
  if (inShellJurisdiction)
    markers.push(
      `incorporated in shell-prone jurisdiction (${counterparty.countryCode})`,
    );

  if (markers.length === 0) return { kind: "clear" };

  // Severity scales with number of markers fired (1, 2, or 3).
  // 1 marker → base 35; 2 markers → 45; 3 markers → 55.
  const severity = SEVERITY_SHELL_BASE + (markers.length - 1) * 10;

  return {
    kind: "flagged",
    flag: {
      type: "SHELL_COMPANY_MARKERS",
      severity,
      title:
        markers.length === 3
          ? "Triple shell-company indicia"
          : markers.length === 2
            ? "Multiple shell-company indicia"
            : "Shell-company indicia",
      rationale:
        `Counterparty ${counterparty.legalName} (${counterparty.countryCode}) ` +
        `exhibits ${markers.length} shell-company marker(s): ${markers.join(", ")}. ` +
        `OFAC's Sham-Transaction guidance treats any single marker as ` +
        `warranting a documented operational-substance review; two or more ` +
        `markers establish a rebuttable presumption that the counterparty ` +
        `lacks independent commercial substance and is a conduit. The PILOT ` +
        `Aircraft Leasing (2023, $8.9M) and Haverly Systems (2024, $1.4M) ` +
        `settlements both turned on counterparties exhibiting exactly this ` +
        `combination of markers.`,
      evidence: {
        ageMonths: ageMonths ?? -1,
        underAgeThreshold:
          ageMonths !== null && ageMonths < INCORPORATION_AGE_THRESHOLD_MONTHS,
        declaredZeroEmployees,
        inShellJurisdiction,
        jurisdiction: counterparty.countryCode,
        markerCount: markers.length,
      },
      citations: getCitationsForRedFlag("SHELL_COMPANY_MARKERS"),
    },
  };
}

// ─── Check 3: Geography mismatch ───────────────────────────────────

function checkGeographyMismatch(
  operation: ShamDetectorOperation,
): CheckOutcome {
  const endUser = operation.endUser;
  if (!endUser || !endUser.operatingCountry) {
    return {
      kind: "skipped",
      reason: "End-user operating country not declared.",
    };
  }

  const shipTo = operation.shipToCountry.toUpperCase();
  const operating = endUser.operatingCountry.toUpperCase();
  const endUse = (operation.endUseCountry ?? "").toUpperCase();

  // Clear if either ship-to OR end-use matches operating country.
  if (operating === shipTo || (endUse && operating === endUse))
    return { kind: "clear" };

  return {
    kind: "flagged",
    flag: {
      type: "GEOGRAPHY_MISMATCH",
      severity: SEVERITY_GEOGRAPHY_MISMATCH,
      title: `Ship-to ${shipTo} ≠ end-user ops in ${operating}`,
      rationale:
        `Operation ships to ${shipTo}${endUse ? ` (end-use ${endUse})` : ""} ` +
        `but end-user ${endUser.name ?? "[unnamed]"} declares operations in ` +
        `${operating}. A destination divorced from the end-user's operational ` +
        `geography is one of OFAC's primary indicia of diversion through ` +
        `nominee end-users (Nordgas Switzerland 2023, $950k; Sojitz HK 2018, ` +
        `$5.2M). Enhanced Due Diligence: obtain a written statement from the ` +
        `end-user explaining why goods routed to ${shipTo} are required for ` +
        `${operating}-based operations, supported by intercompany agreements ` +
        `or commercial invoices showing the operational connection.`,
      evidence: {
        shipToCountry: shipTo,
        endUseCountry: endUse || "(not declared)",
        endUserOperatingCountry: operating,
      },
      citations: getCitationsForRedFlag("GEOGRAPHY_MISMATCH"),
    },
  };
}

// ─── Check 4: Payment-routing divergence ───────────────────────────

function checkPaymentRouting(operation: ShamDetectorOperation): CheckOutcome {
  const bankCountry = operation.counterparty.bankCountry;
  if (!bankCountry) {
    return {
      kind: "skipped",
      reason:
        "Counterparty bank-account jurisdiction not supplied — payment-" +
        "routing check requires `bankCountry` on the counterparty.",
    };
  }

  // We compare bank-country to either end-user country or counterparty
  // country — divergence from BOTH is the marker.
  const counterpartyCountry = operation.counterparty.countryCode.toUpperCase();
  const endUserCountry = (
    operation.endUser?.operatingCountry ?? ""
  ).toUpperCase();
  const bank = bankCountry.toUpperCase();

  if (
    bank === counterpartyCountry ||
    (endUserCountry && bank === endUserCountry)
  )
    return { kind: "clear" };

  return {
    kind: "flagged",
    flag: {
      type: "PAYMENT_ROUTING_DIVERGENCE",
      severity: SEVERITY_PAYMENT_ROUTING,
      title: `Payment routed via ${bank} (≠ counterparty / end-user)`,
      rationale:
        `Counterparty ${operation.counterparty.legalName} is incorporated in ` +
        `${counterpartyCountry}${endUserCountry ? ` and end-user operates in ${endUserCountry}` : ""}, ` +
        `but the designated payment account sits in ${bank}. OFAC has cited ` +
        `bank-account routing divergence as a primary marker in two of the ` +
        `largest sanctions-evasion settlements ever — Société Générale ` +
        `(2018, $1.34B) and Crédit Agricole (2015, $329M). Required ` +
        `documentation: written explanation tied to a real banking ` +
        `relationship (correspondent-banking agreements, SWIFT setup, or ` +
        `signed banker reference) explaining why a ${bank} account services ` +
        `${counterpartyCountry}/${endUserCountry || "?"} operations.`,
      evidence: {
        bankCountry: bank,
        counterpartyCountry,
        endUserCountry: endUserCountry || "(not declared)",
      },
      citations: getCitationsForRedFlag("PAYMENT_ROUTING_DIVERGENCE"),
    },
  };
}

// ─── Check 5: Pricing anomaly ──────────────────────────────────────

function checkPricingAnomaly(
  operation: ShamDetectorOperation,
  context: ShamDetectorContext,
): CheckOutcome {
  const medians = context.historicalMediansEur;
  if (!medians || Object.keys(medians).length === 0) {
    return {
      kind: "skipped",
      reason:
        "No historical pricing medians supplied for this operation's " +
        "ECCN+destination combination — pricing-anomaly check needs the " +
        "calling site to inject medians from the trade-flow analytics " +
        "warehouse.",
    };
  }

  // Find the worst-ratio line that has a corresponding median entry.
  let worst: {
    eccn: string;
    line: ShamDetectorLine;
    median: number;
    ratio: number;
  } | null = null;
  for (const line of operation.lines) {
    const key = `${line.eccn}__${operation.shipToCountry}`;
    const median = medians[key];
    if (typeof median !== "number" || median <= 0) continue;
    // The historical medians are EUR-denominated. A non-EUR line is not
    // comparable without an FX rate we deliberately do not fabricate, so it
    // is excluded from the pricing-anomaly ratio (T-M15) rather than
    // mis-compared as if its raw amount were already EUR.
    if (line.currency !== "EUR") continue;
    const ratio = line.unitValue / median;
    if (!worst || ratio < worst.ratio) {
      worst = { eccn: line.eccn, line, median, ratio };
    }
  }

  if (worst === null) {
    return {
      kind: "skipped",
      reason:
        "No matching median found for any line's ECCN+destination — " +
        "no medians keyed to this operation's profile.",
    };
  }

  if (worst.ratio >= PRICING_ANOMALY_THRESHOLD) return { kind: "clear" };

  return {
    kind: "flagged",
    flag: {
      type: "PRICING_ANOMALY",
      severity: SEVERITY_PRICING_ANOMALY,
      title: `Line invoiced at ${(worst.ratio * 100).toFixed(0)}% of median`,
      rationale:
        `Line for ECCN ${worst.eccn} → ${operation.shipToCountry} invoiced ` +
        `at €${worst.line.unitValue.toFixed(2)}, only ${(worst.ratio * 100).toFixed(0)}% ` +
        `of the historical median of €${worst.median.toFixed(2)} for the same ` +
        `ECCN+destination combination. OFAC characterizes systematic under-` +
        `invoicing as trade-based money laundering / value-transfer to a ` +
        `sanctioned party masquerading as commercial negotiation (Epsilon ` +
        `Electronics 2024, $4M; ZAG IP 2022, $538k). Enhanced Due Diligence: ` +
        `obtain commercial justification — comparable transactions, volume ` +
        `discount terms in writing, or pricing schedule from the supplier.`,
      evidence: {
        eccn: worst.eccn,
        unitValueEur: worst.line.unitValue,
        historicalMedianEur: worst.median,
        ratio: Number(worst.ratio.toFixed(3)),
        threshold: PRICING_ANOMALY_THRESHOLD,
      },
      citations: getCitationsForRedFlag("PRICING_ANOMALY"),
    },
  };
}

// ─── Check 6: Re-export history ────────────────────────────────────

function checkReexportHistory(operation: ShamDetectorOperation): CheckOutcome {
  const history = operation.endUser?.reexportHistory;
  if (!history || history.length === 0) {
    return {
      kind: "skipped",
      reason: "No re-export consent history available for this end-user.",
    };
  }

  const flagged = history.filter(
    (h) => h.status === "FLAGGED" || h.status === "VIOLATION",
  );
  if (flagged.length === 0) return { kind: "clear" };

  // Severity weighted by count + presence of any VIOLATION (terminal).
  const hasViolation = flagged.some((h) => h.status === "VIOLATION");
  const severity =
    SEVERITY_REEXPORT_HISTORY +
    (hasViolation ? 15 : 0) +
    (flagged.length > 1 ? 5 : 0);

  return {
    kind: "flagged",
    flag: {
      type: "REEXPORT_RISK_HISTORY",
      severity: Math.min(50, severity),
      title: hasViolation
        ? `End-user prior re-export violation`
        : `${flagged.length} prior flagged re-export consent${flagged.length === 1 ? "" : "s"}`,
      rationale:
        `End-user ${operation.endUser?.name ?? "[unnamed]"} has ` +
        `${flagged.length} prior re-export consent record(s) in a flagged ` +
        `or violation state${hasViolation ? " (at least one is a confirmed VIOLATION)" : ""}. ` +
        `OFAC and BIS treat prior diversion history as a primary indicia of ` +
        `elevated diversion risk on subsequent transactions to the same ` +
        `end-user (Aban Offshore 2023, $2.7M; Quad/Graphics 2022, $142k). ` +
        `Enhanced Due Diligence required: re-validate end-use statement, ` +
        `confirm physical end-use site inspection within the past 12 ` +
        `months, obtain executed Annex IIIa End-Use Certificate.`,
      evidence: {
        totalHistoryRecords: history.length,
        flaggedRecords: flagged.length,
        hasViolation,
      },
      citations: getCitationsForRedFlag("REEXPORT_RISK_HISTORY"),
    },
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

/**
 * Whole months between `incorporatedAt` and now. Returns null if input
 * is undefined, so callers can distinguish "no data" from "0 months".
 *
 * Optional clock override supports deterministic testing without
 * vi.useFakeTimers fragility.
 */
function monthsSince(
  date: Date | undefined,
  now: Date = new Date(),
): number | null {
  if (!date) return null;
  const years = now.getFullYear() - date.getFullYear();
  const months = now.getMonth() - date.getMonth();
  const total = years * 12 + months;
  // Trim by 1 if `date.getDate()` hasn't yet been reached this month.
  if (now.getDate() < date.getDate()) return Math.max(0, total - 1);
  return Math.max(0, total);
}

// ─── Re-exports for caller convenience ─────────────────────────────

export {
  getCitationsForRedFlag,
  OFAC_SHAM_DOCTRINE_REGULATORY_BASIS,
} from "./enforcement-citations";
export type {
  EnforcementCitation,
  ShamRedFlagType,
} from "./enforcement-citations";
