/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Risk-score aggregation engine for TradeOperation (Wave C Sprint C3c).
 *
 * Pure function. No I/O. Inputs: operation properties + counterparty
 * summary + line summaries. Output: { score: 0-100, factors[] }
 * where factors is an explainable list of "+15 high-risk shipping
 * country" entries that the UI can render as a breakdown.
 *
 * Design principles:
 *   - Decision-support, not decision-making. Score is informational;
 *     a high score doesn't auto-block anything (that's catch-all
 *     engine's domain in a future sprint).
 *   - Explainable. Every score contribution carries a reason string
 *     and the contributing weight. Auditors and operators can see
 *     WHY the system flagged a given operation.
 *   - Conservative. When unsure, weight UP. False positives waste
 *     operator review time but false negatives cost millions in
 *     fines and prison time.
 *
 * Score buckets (matched in UI):
 *   0-39   green/low — proceed with normal review
 *   40-69  amber/medium — careful review, document reasoning
 *   70-100 red/high — escalate to qualified counsel
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type {
  TradeEndUseClass,
  TradeOperationType,
  TradeScreeningStatus,
  TradePartyStatus,
} from "@prisma/client";

// ─── Inputs ─────────────────────────────────────────────────────────

/**
 * High-risk countries for export-control purposes. NIS2 Annex II +
 * OFAC Country Sanctions + EU Russia-Belarus-Iran restrictive measures.
 *
 * This list is intentionally broader than just OFAC's "comprehensively
 * sanctioned" list because export-control risk extends to countries
 * with proliferation concerns (CN for dual-use), cyber-norm violations
 * (RU, KP), or active conflicts (SY, MM, AF).
 */
const HIGH_RISK_COUNTRIES = new Set<string>([
  "CN",
  "RU",
  "IR",
  "KP",
  "BY",
  "SY",
  "VE",
  "CU",
  "MM",
  "AF",
]);

/**
 * Comprehensively sanctioned destinations — operations to these are
 * legally blocked unless under specific OFAC general licenses or EU
 * humanitarian exemptions. Distinct from HIGH_RISK above.
 */
const COMPREHENSIVE_SANCTIONED = new Set<string>([
  "IR", // Iran
  "KP", // North Korea
  "SY", // Syria (US comprehensive)
  "CU", // Cuba (US comprehensive)
]);

/**
 * Sectors that elevate end-user risk via name matching (case-insensitive
 * substring). Used to detect military / defense / nuclear / missile
 * end-users without requiring exact-name lookups against deny lists.
 */
const HIGH_RISK_SECTORS = [
  "military",
  "defense",
  "defence",
  "armed forces",
  "ministry of defense",
  "ministry of defence",
  "intelligence",
  "nuclear",
  "missile",
  "rocket forces",
  "weapon",
  "war",
  "armament",
];

export interface RiskOperationInput {
  operationType: TradeOperationType;
  shipFromCountry: string;
  shipToCountry: string;
  endUseCountry?: string | null;
  declaredEndUse: TradeEndUseClass;
  endUserSector?: string | null;
}

export interface RiskCounterpartyInput {
  screeningStatus: TradeScreeningStatus;
  status: TradePartyStatus;
  isHighRiskCountry: boolean;
}

export interface RiskLineInput {
  /**
   * The presence of any classification code per jurisdiction.
   * The risk engine doesn't need the actual code values — just whether
   * the line is on EACH jurisdiction's control list.
   */
  hasEccnEU: boolean;
  hasEccnUS: boolean;
  hasUsml: boolean;
  hasMtcr: boolean;
  hasGermanAl: boolean;
  /**
   * If known: the actual codes. Used for MTCR Cat. I detection
   * (9A101, 9A102, 9A104) which carries a stronger presumption of
   * denial.
   */
  mtcrCategory?: string | null;
}

export interface RiskScoreInput {
  operation: RiskOperationInput;
  counterparty: RiskCounterpartyInput;
  lines: RiskLineInput[];
}

// ─── Output ─────────────────────────────────────────────────────────

export interface RiskFactor {
  /** Code/key used for grouping similar factors in the UI. */
  key: string;
  /** Human-readable explanation shown to the operator. */
  reason: string;
  /** Points added to the score by this factor. */
  weight: number;
  /** Severity tier — drives UI color of this row. */
  severity: "low" | "medium" | "high" | "critical";
}

export interface RiskScoreResult {
  /** 0-100. Capped at 100 even if raw factor sum exceeds. */
  score: number;
  /** Bucket for UI color: low (0-39), medium (40-69), high (70-100). */
  band: "low" | "medium" | "high";
  /**
   * Explainable contributors, sorted by weight descending. Empty array
   * is possible (a fully-clear operation should show 0 score + 0 factors).
   */
  factors: RiskFactor[];
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Compute risk score for a TradeOperation. Pure function — no side
 * effects.
 */
export function computeRiskScore(input: RiskScoreInput): RiskScoreResult {
  const factors: RiskFactor[] = [];

  // ── 1. Destination country risk ──
  if (COMPREHENSIVE_SANCTIONED.has(input.operation.shipToCountry)) {
    factors.push({
      key: "shipto-comprehensive",
      reason: `Ship-to ${input.operation.shipToCountry} is comprehensively sanctioned (${
        input.operation.shipToCountry === "IR"
          ? "OFAC Iran + EU 833/2014"
          : input.operation.shipToCountry === "KP"
            ? "OFAC + UN 1718"
            : input.operation.shipToCountry === "SY"
              ? "OFAC Syria + EU 36/2012"
              : "OFAC Cuba"
      })`,
      weight: 60,
      severity: "critical",
    });
  } else if (HIGH_RISK_COUNTRIES.has(input.operation.shipToCountry)) {
    factors.push({
      key: "shipto-high-risk",
      reason: `Ship-to ${input.operation.shipToCountry} is high-risk (export-control / cyber / proliferation)`,
      weight: 30,
      severity: "high",
    });
  }

  // ── 2. End-use country differs from ship-to (re-export risk) ──
  if (
    input.operation.endUseCountry &&
    input.operation.endUseCountry !== input.operation.shipToCountry
  ) {
    if (HIGH_RISK_COUNTRIES.has(input.operation.endUseCountry)) {
      factors.push({
        key: "enduse-high-risk",
        reason: `Declared end-use country ${input.operation.endUseCountry} differs from ship-to and is high-risk`,
        weight: 25,
        severity: "high",
      });
    } else {
      factors.push({
        key: "enduse-different",
        reason: `Declared end-use country ${input.operation.endUseCountry} differs from ship-to ${input.operation.shipToCountry} — re-export route`,
        weight: 10,
        severity: "medium",
      });
    }
  }

  // ── 3. Re-export of US-origin items (FDPR concerns) ──
  if (input.operation.operationType === "REEXPORT") {
    factors.push({
      key: "reexport-us-origin",
      reason:
        "Re-export of US-origin items triggers FDPR (15 CFR § 734.9) + de-minimis analysis",
      weight: 15,
      severity: "medium",
    });
  }

  // ── 4. Declared end-use class ──
  if (input.operation.declaredEndUse === "WMD_RELATED") {
    factors.push({
      key: "enduse-wmd",
      reason:
        "End-use declared as WMD-related — Art. 4 EU 2021/821 catch-all triggers, presumption of denial",
      weight: 60,
      severity: "critical",
    });
  } else if (input.operation.declaredEndUse === "MILITARY") {
    factors.push({
      key: "enduse-military",
      reason:
        "End-use declared as military — Art. 4 EU 2021/821 catch-all + national licensing required",
      weight: 30,
      severity: "high",
    });
  } else if (input.operation.declaredEndUse === "UNKNOWN") {
    factors.push({
      key: "enduse-unknown",
      reason:
        "End-use undeclared — operator must clarify before shipment (no good-faith defense without due diligence)",
      weight: 25,
      severity: "high",
    });
  } else if (input.operation.declaredEndUse === "DUAL_USE") {
    factors.push({
      key: "enduse-dual",
      reason: "Declared dual-use — verify against EU Annex I + US CCL controls",
      weight: 10,
      severity: "medium",
    });
  }

  // ── 5. End-user sector (military/defense/nuclear keyword match) ──
  if (input.operation.endUserSector) {
    const sectorLc = input.operation.endUserSector.toLowerCase();
    const matched = HIGH_RISK_SECTORS.find((s) => sectorLc.includes(s));
    if (matched) {
      factors.push({
        key: "sector-high-risk",
        reason: `End-user sector contains "${matched}" — verify against §8 AWV catch-all + Art. 4`,
        weight: 25,
        severity: "high",
      });
    }
  }

  // ── 6. Counterparty status ──
  if (
    input.counterparty.status === "BLOCKED" ||
    input.counterparty.screeningStatus === "CONFIRMED_HIT"
  ) {
    factors.push({
      key: "counterparty-blocked",
      reason:
        "Counterparty is BLOCKED or has confirmed sanctions hit — operation must not proceed",
      weight: 80,
      severity: "critical",
    });
  } else if (input.counterparty.screeningStatus === "POTENTIAL_MATCH") {
    factors.push({
      key: "counterparty-potential",
      reason:
        "Counterparty has unresolved POTENTIAL_MATCH — triage required before proceeding",
      weight: 30,
      severity: "high",
    });
  } else if (input.counterparty.screeningStatus === "NOT_SCREENED") {
    factors.push({
      key: "counterparty-not-screened",
      reason: "Counterparty has never been screened against sanctions lists",
      weight: 25,
      severity: "high",
    });
  } else if (input.counterparty.screeningStatus === "STALE") {
    factors.push({
      key: "counterparty-stale",
      reason:
        "Counterparty's last screening is >30 days old — refresh before shipment",
      weight: 15,
      severity: "medium",
    });
  }

  if (
    input.counterparty.isHighRiskCountry &&
    !HIGH_RISK_COUNTRIES.has(input.operation.shipToCountry)
  ) {
    // Counterparty in high-risk country but ship-to is somewhere else —
    // suggests possible trans-shipment route. Mild risk add.
    factors.push({
      key: "counterparty-hr-different",
      reason:
        "Counterparty registered in high-risk country (potential transshipment vector)",
      weight: 15,
      severity: "medium",
    });
  }

  // ── 7. Line classifications ──
  if (input.lines.length === 0) {
    factors.push({
      key: "no-lines",
      reason: "Operation has no lines — cannot assess item-level risk",
      weight: 5,
      severity: "low",
    });
  } else {
    const usmlCount = input.lines.filter((l) => l.hasUsml).length;
    if (usmlCount > 0) {
      factors.push({
        key: "lines-usml",
        reason: `${usmlCount} ${usmlCount === 1 ? "line" : "lines"} controlled under USML — ITAR jurisdiction (DDTC license required)`,
        weight: Math.min(usmlCount * 8, 30),
        severity: "high",
      });
    }

    const mtcrCatI = input.lines.filter(
      (l) =>
        l.mtcrCategory &&
        ["9A101", "9A102", "9A104", "9A106", "9A108", "9A110"].some((p) =>
          l.mtcrCategory?.startsWith(p),
        ),
    ).length;
    if (mtcrCatI > 0) {
      factors.push({
        key: "lines-mtcr-cat-i",
        reason: `${mtcrCatI} ${mtcrCatI === 1 ? "line" : "lines"} controlled under MTCR Category I — strong presumption of denial`,
        weight: Math.min(mtcrCatI * 12, 40),
        severity: "critical",
      });
    } else {
      const mtcrCount = input.lines.filter((l) => l.hasMtcr).length;
      if (mtcrCount > 0) {
        factors.push({
          key: "lines-mtcr",
          reason: `${mtcrCount} ${mtcrCount === 1 ? "line" : "lines"} controlled under MTCR Annex (Cat. II)`,
          weight: Math.min(mtcrCount * 5, 20),
          severity: "high",
        });
      }
    }

    const eccnCount = input.lines.filter(
      (l) => l.hasEccnEU || l.hasEccnUS,
    ).length;
    if (eccnCount > 0) {
      factors.push({
        key: "lines-eccn",
        reason: `${eccnCount} ${eccnCount === 1 ? "line is" : "lines are"} controlled under EU Annex I / US CCL — license needed`,
        weight: Math.min(eccnCount * 3, 15),
        severity: "medium",
      });
    }

    // Multi-jurisdiction items — suggests defense/strategic relevance
    const multiJuris = input.lines.filter((l) => {
      const codes = [
        l.hasEccnEU,
        l.hasEccnUS,
        l.hasUsml,
        l.hasMtcr,
        l.hasGermanAl,
      ].filter(Boolean).length;
      return codes >= 3;
    }).length;
    if (multiJuris > 0) {
      factors.push({
        key: "lines-multi-juris",
        reason: `${multiJuris} ${multiJuris === 1 ? "line covers" : "lines cover"} 3+ jurisdictions (strategic dual-use indicator)`,
        weight: 10,
        severity: "medium",
      });
    }

    // Unclassified lines (red flag — can't proceed past AWAITING_CLASSIFICATION)
    const unclassified = input.lines.filter(
      (l) =>
        !l.hasEccnEU &&
        !l.hasEccnUS &&
        !l.hasUsml &&
        !l.hasMtcr &&
        !l.hasGermanAl,
    ).length;
    if (unclassified > 0) {
      factors.push({
        key: "lines-unclassified",
        reason: `${unclassified} ${unclassified === 1 ? "line is" : "lines are"} unclassified — required before any further movement`,
        weight: 5 * unclassified,
        severity: "medium",
      });
    }
  }

  // Compute total + cap at 100
  const rawTotal = factors.reduce((sum, f) => sum + f.weight, 0);
  const score = Math.min(rawTotal, 100);
  const band: RiskScoreResult["band"] =
    score >= 70 ? "high" : score >= 40 ? "medium" : "low";

  // Sort factors by weight desc (most impactful first)
  factors.sort((a, b) => b.weight - a.weight);

  return { score, band, factors };
}

/**
 * Helper: derive line-input shape from a TradeItem record. The risk
 * engine doesn't care about the actual code values, just presence.
 */
export function lineInputFromItem(item: {
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
  mtcrCategory: string | null;
  germanAlEntry: string | null;
}): RiskLineInput {
  return {
    hasEccnEU: !!item.eccnEU,
    hasEccnUS: !!item.eccnUS,
    hasUsml: !!item.usmlCategory,
    hasMtcr: !!item.mtcrCategory,
    hasGermanAl: !!item.germanAlEntry,
    mtcrCategory: item.mtcrCategory,
  };
}
