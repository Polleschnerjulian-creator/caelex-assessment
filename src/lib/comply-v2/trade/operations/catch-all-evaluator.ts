/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Catch-all evaluation engine for TradeOperation (Wave C Sprint C3d).
 *
 * The "catch-all" articles in EU/DE export-control law trigger a
 * licensing requirement EVEN for items that are NOT on Annex I /
 * Anlage AL — based on the END-USE, the END-USER, or the
 * destination context. They are the most operator-trap-laden parts
 * of export law because they require continuous due diligence even
 * for items the operator thought were "uncontrolled".
 *
 * This engine is INFORMATIONAL — it flags operations for review
 * based on heuristics matching the catch-all triggers. It does NOT
 * make a final legal determination (that requires qualified counsel).
 *
 * Catch-all articles modeled:
 *
 *   Art. 4 EU 2021/821 — WMD/Military catch-all
 *     Triggers when operator KNOWS or has reason to suspect that the
 *     items are intended for WMD or military end-use, regardless of
 *     whether items are on Annex I.
 *
 *   Art. 5 EU 2021/821 — Cyber-surveillance / Human Rights
 *     Triggers when items could be used for internal repression or
 *     serious violations of human rights / international humanitarian
 *     law. Especially relevant for cyber-surveillance items (5A001.f,
 *     5A001.j, 5D001).
 *
 *   §8 AWV (DE National) — German national catch-all
 *     Conservative German add-on to Art. 4. Triggers more readily for
 *     DE-shipping operations to high-risk destinations.
 *
 *   Art. 10 EU 2021/821 — Intra-EU sensitive transfers
 *     Triggers for intra-EU transfers of Annex IV items (most
 *     sensitive nuclear / missile / dual-use technologies).
 *
 *   §8 AWV Anzeigepflicht — Notification duty
 *     Triggers when any catch-all fires AND no covering license is
 *     yet attached. The operator MUST notify BAFA before shipment.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { TradeEndUseClass, TradeOperationType } from "@prisma/client";

// ─── Reference data ─────────────────────────────────────────────────

/**
 * Countries with active WMD-proliferation concerns. Triggers Art. 4
 * even for items with no specific WMD-end-use declared.
 *
 * Source: BAFA "Länder mit Proliferationsbezug" + EU dual-use guidance.
 */
const WMD_CONCERN_COUNTRIES = new Set<string>([
  "IR", // Iran (nuclear + missile)
  "KP", // North Korea (nuclear + missile + chem-bio)
  "SY", // Syria (chem)
  "PK", // Pakistan (nuclear + missile, non-NPT)
  "IL", // Israel (nuclear, non-NPT)
  "IN", // India (nuclear + missile, non-NPT historically)
  "RU", // Russia (recent expansion)
  "CN", // China (significant programs)
]);

/**
 * Countries with documented human-rights or cyber-surveillance
 * concerns. Triggers Art. 5 catch-all.
 *
 * Source: EU restrictive measures lists + UN human rights reports +
 * Freedom House / Amnesty country index. Conservative inclusion.
 */
const HUMAN_RIGHTS_CONCERN_COUNTRIES = new Set<string>([
  "CN", // Mass surveillance (Xinjiang, Hong Kong)
  "RU", // Internal repression
  "IR", // Internal repression
  "BY", // Internal repression
  "MM", // Junta + Rohingya
  "VE", // State surveillance
  "SA", // Surveillance + dissident targeting
  "AE", // Surveillance industry
  "EG", // Surveillance + civil society
  "TR", // Journalist surveillance
  "VN", // Activist monitoring
  "ET", // Conflict + surveillance
  "RW", // Dissident targeting
  "KZ", // Recent surveillance expansion
  "AZ", // Pegasus targeting
]);

/**
 * Sector keywords that trigger end-user-based catch-all consideration.
 * Substring match (case-insensitive).
 */
const MILITARY_KEYWORDS = [
  "military",
  "armed forces",
  "ministry of defense",
  "ministry of defence",
  "ministry of war",
  "intelligence service",
  "intelligence agency",
  "secret service",
  "police",
  "law enforcement",
  "border guard",
  "national guard",
];

const WMD_PROLIFERATION_KEYWORDS = [
  "nuclear",
  "missile",
  "rocket forces",
  "ballistic",
  "atomic energy",
  "chemical weapons",
  "biological weapons",
  "weapons of mass",
  "wmd",
];

const SURVEILLANCE_KEYWORDS = [
  "surveillance",
  "intercept",
  "lawful interception",
  "monitoring center",
  "cyber operations",
  "signals intelligence",
  "spyware",
];

/**
 * EU Annex IV item code prefixes — most sensitive dual-use items
 * that require authorization even for intra-EU transfers.
 *
 * Common categories:
 *   0E001-0E002  Nuclear technology
 *   1E002.e      Toxic gas testing
 *   2E001-2E002  Machine tools (advanced)
 *   3E001-3E003  Microelectronics (high-grade)
 *   5A001.f      Cyber-surveillance
 *   6E001-6E002  Sensors / lasers
 *   9E001-9E003  Aerospace propulsion
 */
const ANNEX_IV_PREFIXES = [
  "0E0",
  "1E002.e",
  "2E001",
  "2E002",
  "3E001",
  "3E002",
  "3E003",
  "5A001.f",
  "5A001.j",
  "5D001",
  "6E001",
  "6E002",
  "9E001",
  "9E002",
  "9E003",
];

/**
 * Item ECCN code prefixes that signal cyber-surveillance use. Triggers
 * Art. 5 with an extra-high confidence.
 */
const CYBER_SURVEILLANCE_ECCN_PREFIXES = [
  "5A001.f", // Telecommunications interception
  "5A001.j", // Internet surveillance
  "5D001", // Software supporting 5A001
];

// ─── Types ──────────────────────────────────────────────────────────

export interface CatchAllOperationInput {
  operationType: TradeOperationType;
  shipFromCountry: string;
  shipToCountry: string;
  endUseCountry?: string | null;
  declaredEndUse: TradeEndUseClass;
  endUserName?: string | null;
  endUserSector?: string | null;
}

export interface CatchAllLineInput {
  /** ECCN/USML codes attached to the item (any jurisdiction). */
  codes: string[];
}

export interface CatchAllInput {
  operation: CatchAllOperationInput;
  lines: CatchAllLineInput[];
  /** Are licenses already attached that might cover the operation? */
  hasAttachedLicenses: boolean;
}

export interface CatchAllTrigger {
  /** Reference to the regulation that triggered. */
  regulation: string;
  /** Plain-language explanation for the operator. */
  reason: string;
  /**
   * Confidence tier:
   *   high     — multiple strong signals; operator should treat as
   *              license-required unless rebutted with evidence
   *   medium   — single signal; operator should investigate
   *   low      — weak signal; informational, document the analysis
   */
  confidence: "high" | "medium" | "low";
}

export interface CatchAllResult {
  /** True if any Art. 4 signal fires (WMD/military catch-all). */
  art4: boolean;
  /** True if any Art. 5 signal fires (cyber/human rights). */
  art5: boolean;
  /** True if any §8 AWV (DE national) signal fires. */
  art9: boolean;
  /** True if Art. 10 (intra-EU Annex IV) fires. */
  art10: boolean;
  /**
   * §8 AWV Anzeigepflicht (notification duty) — true if ANY catch-all
   * triggered AND no covering license attached yet.
   */
  notificationDuty: boolean;
  /** Detailed triggers for the UI breakdown. */
  triggers: CatchAllTrigger[];
}

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Evaluate catch-all article triggers for a TradeOperation. Pure
 * function — no side effects.
 */
export function evaluateCatchAll(input: CatchAllInput): CatchAllResult {
  const triggers: CatchAllTrigger[] = [];
  let art4 = false;
  let art5 = false;
  let art9 = false;
  let art10 = false;

  const sectorLc = (input.operation.endUserSector ?? "").toLowerCase();
  const userLc = (input.operation.endUserName ?? "").toLowerCase();
  const shipTo = input.operation.shipToCountry;
  const endUse = input.operation.endUseCountry ?? shipTo;

  // ── Art. 4 — WMD/Military catch-all ──
  if (
    input.operation.declaredEndUse === "WMD_RELATED" ||
    input.operation.declaredEndUse === "MILITARY"
  ) {
    art4 = true;
    triggers.push({
      regulation: "Art. 4 EU 2021/821",
      reason: `Declared end-use is ${input.operation.declaredEndUse} — Art. 4 catch-all applies regardless of item Annex-I status`,
      confidence: "high",
    });
  }
  for (const kw of MILITARY_KEYWORDS) {
    if (sectorLc.includes(kw) || userLc.includes(kw)) {
      art4 = true;
      triggers.push({
        regulation: "Art. 4 EU 2021/821",
        reason: `End-user sector/name contains "${kw}" — Art. 4 catch-all (military end-use indicator)`,
        confidence: "medium",
      });
      break; // one match enough; avoid duplicate triggers
    }
  }
  for (const kw of WMD_PROLIFERATION_KEYWORDS) {
    if (sectorLc.includes(kw) || userLc.includes(kw)) {
      art4 = true;
      triggers.push({
        regulation: "Art. 4 EU 2021/821",
        reason: `End-user sector/name contains "${kw}" — Art. 4 catch-all (WMD/proliferation indicator)`,
        confidence: "high",
      });
      break;
    }
  }
  if (WMD_CONCERN_COUNTRIES.has(shipTo) || WMD_CONCERN_COUNTRIES.has(endUse)) {
    art4 = true;
    triggers.push({
      regulation: "Art. 4 EU 2021/821",
      reason: `Destination ${WMD_CONCERN_COUNTRIES.has(shipTo) ? shipTo : endUse} on BAFA proliferation-concern list — heightened due-diligence duty`,
      confidence: "medium",
    });
  }

  // ── Art. 5 — Cyber-surveillance / Human Rights ──
  if (
    HUMAN_RIGHTS_CONCERN_COUNTRIES.has(shipTo) ||
    HUMAN_RIGHTS_CONCERN_COUNTRIES.has(endUse)
  ) {
    // Country-only match is a medium-confidence signal alone
    triggers.push({
      regulation: "Art. 5 EU 2021/821",
      reason: `Destination ${HUMAN_RIGHTS_CONCERN_COUNTRIES.has(shipTo) ? shipTo : endUse} on human-rights / cyber-surveillance concern list`,
      confidence: "medium",
    });
    art5 = true;
  }
  for (const kw of SURVEILLANCE_KEYWORDS) {
    if (sectorLc.includes(kw) || userLc.includes(kw)) {
      art5 = true;
      triggers.push({
        regulation: "Art. 5 EU 2021/821",
        reason: `End-user sector/name contains "${kw}" — Art. 5 catch-all (surveillance use indicator)`,
        confidence: "high",
      });
      break;
    }
  }
  // Cyber-surveillance ECCN-coded items are a strong Art. 5 signal
  for (const line of input.lines) {
    for (const code of line.codes) {
      if (CYBER_SURVEILLANCE_ECCN_PREFIXES.some((p) => code.startsWith(p))) {
        art5 = true;
        triggers.push({
          regulation: "Art. 5 EU 2021/821",
          reason: `Item code ${code} is in cyber-surveillance category — Art. 5 license required (or AGG/EUGEA EU012 for some destinations)`,
          confidence: "high",
        });
        break; // de-duplicate
      }
    }
  }

  // ── §8 AWV (DE National catch-all) ──
  // German-specific add-on: more readily triggered when DE is the
  // export country.
  if (input.operation.shipFromCountry === "DE") {
    if (
      art4 ||
      WMD_CONCERN_COUNTRIES.has(shipTo) ||
      input.operation.declaredEndUse === "MILITARY" ||
      input.operation.declaredEndUse === "WMD_RELATED"
    ) {
      art9 = true;
      triggers.push({
        regulation: "§8 AWV (DE)",
        reason:
          "DE-export with WMD/military proliferation concern — §8 AWV national catch-all may require Einzelausfuhrgenehmigung even for non-listed items",
        confidence: "medium",
      });
    }
  }

  // ── Art. 10 — Intra-EU sensitive transfers (Annex IV) ──
  if (input.operation.operationType === "INTRA_EU") {
    for (const line of input.lines) {
      for (const code of line.codes) {
        if (ANNEX_IV_PREFIXES.some((p) => code.startsWith(p))) {
          art10 = true;
          triggers.push({
            regulation: "Art. 10 EU 2021/821",
            reason: `Item code ${code} is in EU Annex IV — intra-EU transfer requires authorization (Anlage Ia of AWV)`,
            confidence: "high",
          });
          break;
        }
      }
    }
  }

  // ── §8 AWV Anzeigepflicht (notification duty) ──
  // If any catch-all fires AND no license yet covers the operation,
  // operator MUST notify BAFA before shipment. License attachment
  // resolves the duty (because then the operation has explicit
  // authorization).
  const anyCatchAll = art4 || art5 || art9 || art10;
  const notificationDuty = anyCatchAll && !input.hasAttachedLicenses;

  if (notificationDuty) {
    triggers.push({
      regulation: "§8 AWV Anzeigepflicht",
      reason:
        "One or more catch-all articles triggered AND no covering license attached — BAFA notification due before shipment",
      confidence: "high",
    });
  }

  // De-dupe triggers by regulation+reason (one entry per unique signal)
  const seen = new Set<string>();
  const dedupedTriggers = triggers.filter((t) => {
    const key = `${t.regulation}|${t.reason}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    art4,
    art5,
    art9,
    art10,
    notificationDuty,
    triggers: dedupedTriggers,
  };
}

/**
 * Helper: extract codes from a TradeItem for catch-all evaluation.
 */
export function lineInputFromItem(item: {
  eccnEU: string | null;
  eccnUS: string | null;
  usmlCategory: string | null;
  mtcrCategory: string | null;
  germanAlEntry: string | null;
}): CatchAllLineInput {
  return {
    codes: [
      item.eccnEU,
      item.eccnUS,
      item.usmlCategory,
      item.mtcrCategory,
      item.germanAlEntry,
    ].filter((c): c is string => !!c),
  };
}
