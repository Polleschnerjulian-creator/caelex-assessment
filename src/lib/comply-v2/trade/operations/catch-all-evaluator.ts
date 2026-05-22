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
 * §9(1) AWV nuclear catch-all destinations.
 * Nine countries enumerated in §9(1) AWV: a license is REQUIRED for
 * export of non-listed items to these destinations if the operator
 * has been notified by BAFA OR has positive knowledge that the item
 * is intended for nuclear-related end-use under Annex I Category 0.
 *
 * Source: §9(1) AWV (Außenwirtschaftsverordnung) — German national
 * extension of the EU Art. 4 catch-all, with a tighter country
 * scope and explicit nuclear-end-use focus.
 *
 * The country list is fixed by statute and has not changed since
 * the AWV recast — these are countries that the German legislator
 * specifically identified as nuclear-proliferation concerns:
 *   DZ Algeria, IQ Iraq, IR Iran, IL Israel, JO Jordan,
 *   LY Libya, KP North Korea, PK Pakistan, SY Syria
 */
const NUCLEAR_PARA9_COUNTRIES = new Set<string>([
  "DZ",
  "IQ",
  "IR",
  "IL",
  "JO",
  "LY",
  "KP",
  "PK",
  "SY",
]);

/**
 * Keywords that indicate possible nuclear-related end-use even when
 * the item itself is not Annex I Cat. 0 controlled. Substring match,
 * case-insensitive. Conservative list — false positives are
 * acceptable for a catch-all (operator reviews; legal risk lives in
 * misses, not in over-flagging).
 */
const NUCLEAR_END_USE_KEYWORDS = [
  "centrifuge",
  "enrichment",
  "uranium hexafluoride",
  "uranium conversion",
  "plutonium",
  "isotope separation",
  "reprocessing",
  "yellowcake",
  "heavy water",
  "tritium",
  "uf6",
  "fuel fabrication",
  "fissile material",
  "nuclear reactor",
  "reactor fuel",
  "nuclear fuel cycle",
];

/**
 * Sprint Z10 — §9(2) AWV "extended military-end-use" catch-all.
 *
 * Germany's national catch-all for conventional military end-use is
 * wider than the EU Art. 4(1)(b) reading. § 9(2) AWV requires a
 * licence for non-listed items when shipping to a country subject to
 * an EU or UN arms embargo (or a German national arms-concern
 * declaration) AND the operator has notification / positive knowledge
 * / sectoral indicator of military end-use.
 *
 * The country list is the union of:
 *   - UN Security Council arms embargoes (1267 / various country-
 *     specific resolutions)
 *   - EU Council CFSP arms-embargo decisions
 *   - German national arms-embargo declarations
 *
 * Source: BAFA "Embargoländerliste" + AWV § 9(2). The list below is
 * the active set as of 2026-05; legacy entries that are now lifted
 * (e.g. historical Ivory Coast embargo) are not included. The
 * Russian embargo is comprehensive since 2022, Belarus since 2022 in
 * lockstep, Iran's regime is multi-layered (UN 2231 plus EU+national).
 *
 * Note: this overlaps with Art. 4 (EU 2021/821) keyword matching, but
 * § 9(2) AWV is the operative legal basis for German exporters even
 * when Art. 4 would also fire — BAFA notification and the German
 * licence requirement attach to § 9(2), not Art. 4.
 */
const ARMS_EMBARGO_PARA9_2_COUNTRIES = new Set<string>([
  "BY", // Belarus (EU 2022-)
  "CF", // Central African Republic (UN + EU)
  "CN", // China (EU 1989; selective military equipment)
  "CD", // DR Congo (UN partial + EU)
  "CU", // Cuba (US comprehensive; EU watch)
  "IR", // Iran (UN + EU + national)
  "IQ", // Iraq (UN partial; mostly lifted but listed)
  "LB", // Lebanon (UN non-state + EU)
  "LY", // Libya (UN + EU)
  "MM", // Myanmar (EU 2021-)
  "KP", // North Korea (UN comprehensive + EU + national)
  "RU", // Russia (EU + national, comprehensive 2022-)
  "SO", // Somalia (UN partial + EU)
  "SS", // South Sudan (UN + EU)
  "SD", // Sudan (UN partial + EU)
  "SY", // Syria (UN + EU)
  "VE", // Venezuela (EU)
  "YE", // Yemen (UN non-state Houthis + EU)
  "ZW", // Zimbabwe (EU selective)
]);

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
  /**
   * Sprint Z1 — §9(1) AWV nuclear catch-all.
   *
   * True when BAFA has notified the operator about a nuclear-end-use
   * concern for the items in this operation. BAFA notification is
   * the strongest §9(1) trigger — the operator MUST obtain a licence
   * regardless of whether the items are Annex I Cat. 0.
   */
  bafaNuclearNotification?: boolean;
  /**
   * Sprint Z1 — §9(1) AWV nuclear catch-all (positive knowledge).
   *
   * True when the operator has positive knowledge of intended
   * nuclear-related end-use. Self-attested; software cannot verify.
   * Triggers §9(1) the same as a BAFA notification.
   */
  nuclearEndUseAware?: boolean;
  /**
   * Sprint Z10 — §9(2) AWV extended military-end-use catch-all.
   *
   * True when BAFA has notified the operator about a military-end-use
   * concern for the items in this operation. BAFA notification is the
   * strongest §9(2) trigger — the operator MUST obtain a licence
   * regardless of whether the items are AL-listed.
   */
  bafaMilitaryNotification?: boolean;
  /**
   * Sprint Z10 — §9(2) AWV (positive knowledge).
   *
   * True when the operator has positive knowledge of intended
   * conventional-military end-use. Self-attested; software cannot
   * verify. Triggers §9(2) the same as a BAFA notification.
   */
  militaryEndUseAware?: boolean;
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
   * Sprint Z1 — true if §9(1) AWV nuclear catch-all fires
   * (destination ∈ 9-country list AND BAFA-notified OR nuclear-aware
   * OR nuclear-keyword match in end-user / sector).
   */
  para9Nuclear: boolean;
  /**
   * Sprint Z10 — true if §9(2) AWV military catch-all fires
   * (destination ∈ arms-embargo country list AND BAFA-notified OR
   * military-aware OR military-keyword match in end-user / sector).
   */
  para9Military: boolean;
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
  let para9Nuclear = false;
  let para9Military = false;

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

  // ── §9(1) AWV — Nuclear end-use catch-all to 9 specified countries ──
  // Triggered when EITHER:
  //   (a) destination ∈ {DZ, IQ, IR, IL, JO, LY, KP, PK, SY}, AND
  //   (b) one of:
  //       - BAFA has notified the operator (highest-confidence signal),
  //       - operator self-attests positive knowledge of nuclear end-use,
  //       - end-user / sector / declared end-use contains a nuclear
  //         keyword (centrifuge, enrichment, uranium hexafluoride, …)
  //
  // §9(1) AWV is one of the few catch-alls that applies to NON-LISTED
  // items — a regular dual-use item with no Annex I match can still
  // require a licence if the destination + end-use combination fires
  // this rule. The 9-country list is statutory and exhaustive.
  const destinationCheckCountry = shipTo;
  const inNuclearCountryList =
    NUCLEAR_PARA9_COUNTRIES.has(destinationCheckCountry) ||
    NUCLEAR_PARA9_COUNTRIES.has(endUse);

  if (inNuclearCountryList) {
    const matchedCountry = NUCLEAR_PARA9_COUNTRIES.has(destinationCheckCountry)
      ? destinationCheckCountry
      : endUse;

    if (input.operation.bafaNuclearNotification) {
      para9Nuclear = true;
      triggers.push({
        regulation: "§9(1) AWV",
        reason: `BAFA has notified the operator of nuclear-end-use concern for destination ${matchedCountry} — licence REQUIRED for any item, regardless of Annex I status`,
        confidence: "high",
      });
    } else if (input.operation.nuclearEndUseAware) {
      para9Nuclear = true;
      triggers.push({
        regulation: "§9(1) AWV",
        reason: `Operator self-attested positive knowledge of intended nuclear end-use for destination ${matchedCountry} — licence REQUIRED`,
        confidence: "high",
      });
    } else {
      // Look for nuclear keywords in end-user name / sector / declared
      // end-use. Each hit is a separate trigger so the operator can
      // see exactly which signal fired.
      for (const kw of NUCLEAR_END_USE_KEYWORDS) {
        if (sectorLc.includes(kw) || userLc.includes(kw)) {
          para9Nuclear = true;
          triggers.push({
            regulation: "§9(1) AWV",
            reason: `End-user sector/name contains "${kw}" AND destination ${matchedCountry} is on the §9(1) nuclear-concern list — review for licence requirement on non-listed items`,
            confidence: "medium",
          });
          break;
        }
      }
    }
  }

  // ── §9(2) AWV — Extended military-end-use catch-all (Sprint Z10) ──
  // Triggered when EITHER:
  //   (a) destination ∈ arms-embargo country set, AND
  //   (b) one of:
  //       - BAFA has notified the operator (highest-confidence),
  //       - operator self-attests positive knowledge of military
  //         end-use,
  //       - end-user / sector contains a military keyword.
  //
  // §9(2) AWV is the German national extension of the Art. 4(1)(b) EU
  // military catch-all. Unlike Art. 4 (which is keyword-based and
  // doesn't require a specific destination), §9(2) attaches to the
  // arms-embargo country list as a hard precondition. This gives the
  // operator a cleaner legal hook — if shipping to an embargo country,
  // the operator must investigate end-use even for non-listed goods.
  //
  // Overlap with Art. 4: when both fire, the German licence requirement
  // attaches to §9(2) AWV, not Art. 4. We emit BOTH triggers so the
  // operator sees the full picture, and the UI can de-emphasise Art. 4
  // when §9(2) is already active.
  const inArmsEmbargoCountryList =
    ARMS_EMBARGO_PARA9_2_COUNTRIES.has(destinationCheckCountry) ||
    ARMS_EMBARGO_PARA9_2_COUNTRIES.has(endUse);

  if (inArmsEmbargoCountryList) {
    const matchedCountry = ARMS_EMBARGO_PARA9_2_COUNTRIES.has(
      destinationCheckCountry,
    )
      ? destinationCheckCountry
      : endUse;

    if (input.operation.bafaMilitaryNotification) {
      para9Military = true;
      triggers.push({
        regulation: "§9(2) AWV",
        reason: `BAFA has notified the operator of military-end-use concern for arms-embargo destination ${matchedCountry} — licence REQUIRED for any item, regardless of AL-listing`,
        confidence: "high",
      });
    } else if (input.operation.militaryEndUseAware) {
      para9Military = true;
      triggers.push({
        regulation: "§9(2) AWV",
        reason: `Operator self-attested positive knowledge of intended military end-use for arms-embargo destination ${matchedCountry} — licence REQUIRED`,
        confidence: "high",
      });
    } else if (
      input.operation.declaredEndUse === "MILITARY" ||
      input.operation.declaredEndUse === "WMD_RELATED"
    ) {
      // Declared MILITARY/WMD end-use to an arms-embargo country is
      // an automatic high-confidence §9(2) trigger — strongest signal
      // short of explicit BAFA notification.
      para9Military = true;
      triggers.push({
        regulation: "§9(2) AWV",
        reason: `Declared end-use is ${input.operation.declaredEndUse} for arms-embargo destination ${matchedCountry} — §9(2) AWV licence REQUIRED`,
        confidence: "high",
      });
    } else {
      // Sectoral / end-user keyword indicators. Lower confidence — the
      // operator should investigate, but the legal duty isn't automatic
      // without a knowledge signal.
      for (const kw of MILITARY_KEYWORDS) {
        if (sectorLc.includes(kw) || userLc.includes(kw)) {
          para9Military = true;
          triggers.push({
            regulation: "§9(2) AWV",
            reason: `End-user sector/name contains "${kw}" AND destination ${matchedCountry} is on the arms-embargo list — review for §9(2) licence requirement on non-listed items`,
            confidence: "medium",
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
  const anyCatchAll =
    art4 || art5 || art9 || art10 || para9Nuclear || para9Military;
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
    para9Nuclear,
    para9Military,
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
