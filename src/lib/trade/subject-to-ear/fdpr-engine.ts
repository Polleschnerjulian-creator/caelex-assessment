/**
 * Caelex Trade — Foreign Direct Product Rule (FDPR) engine.
 *
 * Sprints Z20a / Z20b / Z20c / Z20d. Tier 1 per the Living Execution Plan.
 *
 * 15 CFR § 734.9 codifies 8 FDPR scenarios across 10 distinct rules
 * (because (e) is split into (e)(1)/(2)/(3)). Each rule defines a
 * product scope (paragraph .1) and a country/end-user/end-use scope
 * (paragraph .2). A foreign-produced item is "subject to the EAR" if
 * it is either:
 *
 *   (i)  the "direct product" of specified U.S.-origin technology/
 *        software, OR
 *   (ii) produced by a complete plant or "major component" of a
 *        plant that is itself the direct product of specified U.S.-
 *        origin technology/software.
 *
 * **Critical property: FDPR has NO de minimis.** A foreign item with
 * 0% physical US content can still be subject to the EAR via FDPR if
 * produced on US-direct-product tooling. The cascade (Z18) treats
 * FDPR and de-minimis as orthogonal channels (Blueprint 2 § Caveat #6).
 *
 * All 10 distinct FDPR rules are now evaluated (Z20a/b/c/d complete):
 *
 *   § 734.9(b) — NS-FDP                 → D:1, E:1, E:2          [Z20a]
 *   § 734.9(c) — 9x515-FDP              → D:5, E:1, E:2          [Z20a]
 *   § 734.9(d) — 600-series             → D:1, D:3, D:4, D:5, E  [Z20a]
 *   § 734.9(e)(1) — Footnote 1 (Huawei) → knowledge-gated         [Z20b]
 *   § 734.9(e)(2) — Footnote 4 (HikVision) → knowledge-gated      [Z20b]
 *   § 734.9(e)(3) — Footnote 5 + adv-node-IC → knowledge-gated   [Z20b]
 *   § 734.9(f) — Russia/Belarus/Crimea  → destination-gated      [Z20c]
 *   § 734.9(g) — MEU/Procurement (fn3)  → knowledge-gated (fn3)  [Z20c]
 *   § 734.9(h) — Advanced Computing     → Macau/D:5 or adv-IC    [Z20d]
 *   § 734.9(i) — Supercomputer          → worldwide on knowledge [Z20d]
 *
 * Source: Blueprint 2 § 3 + § 9.1 steps 3-5. 15 CFR § 734.9.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { resolveCountryGroups } from "./country-groups";
import {
  anyPartyHasFootnote,
  partyRolesWithFootnote,
  type KnowledgeFacts,
} from "./knowledge-facts";

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Subset of BOMComponent fields the FDPR engine consults. Each line
 * carries the standard ECCN + value plus FDPR-specific provenance
 * tracking the foreign manufacturer's use of US-origin tech/software/
 * production equipment.
 */
export interface FDPRBOMComponent {
  /** Stable id of the line. */
  nodeId: string;
  /** Display name. */
  description?: string;
  /**
   * The foreign-made item's classification (e.g. "9A515.a.1",
   * "9A610", "0A919"). FDPR (c) and (d) match on this — they capture
   * foreign items whose own ECCN is 9x515 or 600-series.
   *
   * For BOM lines this is typically the line's own ECCN; the cascade
   * may also supply a top-level "foreignItemEccn" on the input for
   * the finished foreign-made end-item.
   */
  eccn: string;
  /**
   * True if the foreign manufacturer used US-origin technology in
   * developing or producing this line. Triggers FDP if combined with
   * the right technology ECCN + foreign-item ECCN + destination.
   */
  madeWithUSTechnology?: boolean;
  /**
   * The specific US technology ECCNs used. Matters because each FDPR
   * scenario gates on a specific tech-ECCN range:
   *   - NS-FDP    → any NS-controlled tech requiring written assurance
   *                  for license or License Exception TSR
   *   - 9x515-FDP → 9D515 software or 9E515 technology
   *   - 600-FDP   → any 600-series technology
   */
  usTechnologyEccns?: string[];
  /** True if the foreign manufacturer used US-origin software. */
  madeWithUSSoftware?: boolean;
  /** The specific US software ECCNs used. */
  usSoftwareEccns?: string[];
  /**
   * True if the foreign manufacturer's plant (or a "major component"
   * of it — equipment essential to production, including testing
   * equipment per § 734.9(a)(1)(i)) is itself the direct product of
   * US-origin technology/software.
   */
  producedByPlantThatIsUSDirectProduct?: boolean;
  /**
   * The US technology ECCNs that the plant (or major component) is a
   * direct product of. Same matching semantics as usTechnologyEccns.
   */
  plantTechEccns?: string[];
}

export interface FDPREvaluationInput {
  /** ISO-3166 alpha-2 destination country code. */
  destinationCountry: string;
  /**
   * The finished foreign-made end-item's own ECCN. If null, the
   * engine matches FDPR (c)/(d) against the BOM lines instead.
   * Caller should populate this when the foreign item has a known
   * classification (e.g. the cascade's input.foreignItemEccn).
   */
  foreignItemEccn?: string | null;
  /** BOM lines for the foreign-made item, with FDPR provenance. */
  bom: FDPRBOMComponent[];
  /**
   * Knowledge facts about the transaction (Z20b). Triggers the
   * Entity-List FDPR scenarios in § 734.9(e)(1)/(2)/(3) when a
   * transaction party carries a footnote-1/4/5 designation.
   */
  knowledgeFacts?: KnowledgeFacts;
}

export type FDPRRuleId =
  | "734.9(b)-NS"
  | "734.9(c)-9x515"
  | "734.9(d)-600-series"
  | "734.9(e)-entity-list-fn1"
  | "734.9(e)-entity-list-fn4"
  | "734.9(e)-entity-list-fn5"
  | "734.9(f)-russia-belarus-crimea"
  | "734.9(g)-meu-procurement-fn3"
  | "734.9(h)-advanced-computing"
  | "734.9(i)-supercomputer";

export interface FDPRRuleHit {
  ruleId: FDPRRuleId;
  /** Plain-language title. */
  title: string;
  /** CFR citation. */
  citation: string;
  /** BOM line ids that triggered this rule. */
  matchingComponentNodeIds: string[];
  /** Plain-language rationale combining product scope + country scope. */
  rationale: string;
  /** License authority — which BIS section governs. */
  licenseAuthority: string;
}

export interface FDPREvaluationResult {
  /** True if ANY FDPR rule fired. */
  fdprApplicable: boolean;
  /** All matching FDPR rules. */
  hits: FDPRRuleHit[];
  /**
   * FDPR rules NOT YET implemented (Z20b-d). The cascade UI must
   * surface this so the operator knows the gate is partial.
   */
  notYetEvaluatedRules: FDPRRuleId[];
  disclaimer: string;
}

// ─── Constants ──────────────────────────────────────────────────────

/** § 734.9(c) — foreign item must be 9x515 to qualify. */
function isForeignItem9x515(eccn: string | null | undefined): boolean {
  if (!eccn) return false;
  return /^9[A-E]515\b/i.test(eccn.replace(/^ECCN:/, ""));
}

/** § 734.9(d) — foreign item must be 600-series or 0A919. */
function isForeignItem600SeriesOr0A919(
  eccn: string | null | undefined,
): boolean {
  if (!eccn) return false;
  const normalised = eccn.replace(/^ECCN:/, "");
  return /^[0-9][A-E]6\d\d\b/i.test(normalised) || /^0A919\b/i.test(normalised);
}

/** Match 9D515 or 9E515 — the 9x515-FDPR tech-ECCN range. */
function is9x515TechOrSoftwareEccn(eccn: string): boolean {
  return /^9[DE]515\b/i.test(eccn.replace(/^ECCN:/, ""));
}

/** Match any 600-series tech (9E6XX, 0E6XX) or software (9D6XX, 0D6XX). */
function is600SeriesTechOrSoftwareEccn(eccn: string): boolean {
  return /^[0-9][DE]6\d\d\b/i.test(eccn.replace(/^ECCN:/, ""));
}

/**
 * Match NS-controlled tech that would require written assurance for
 * license or License Exception TSR. Per the NS-FDPR scope this
 * includes most 9E0XX, 9E1XX, 3E001, 3E002, 4E001, 5E001, 6E001, 7E001
 * and similar D/E entries. Conservative implementation: any
 * D/E entry that's NOT EAR99 and NOT explicitly an AT-only entry
 * counts as potentially NS-controlled.
 */
function isNSControlledTechEccn(eccn: string): boolean {
  if (!eccn) return false;
  const normalised = eccn.replace(/^ECCN:/, "");
  // Exclude common non-NS entries first
  if (/^EAR99$/i.test(normalised)) return false;
  // Any D/E ECCN not in the AT-only common space
  return /^[0-9][DE]\d{3}/i.test(normalised);
}

/**
 * § 734.9(e)(1) Footnote-1 product scope (Huawei-style): foreign item
 * is the direct product of EAR-subject tech/sw in 3D001/3D9xx, 3E001/
 * 3E9xx, 4D001/4D99x, 4E001/4E99x, 5D001/5D991, 5E001/5E991.
 */
function isFootnote1TechEccn(eccn: string): boolean {
  if (!eccn) return false;
  const n = eccn.replace(/^ECCN:/, "");
  return (
    /^3D001\b/i.test(n) ||
    /^3D9\d\d\b/i.test(n) ||
    /^3E001\b/i.test(n) ||
    /^3E9\d\d\b/i.test(n) ||
    /^4D001\b/i.test(n) ||
    /^4D99\d\b/i.test(n) ||
    /^4E001\b/i.test(n) ||
    /^4E99\d\b/i.test(n) ||
    /^5D001\b/i.test(n) ||
    /^5D991\b/i.test(n) ||
    /^5E001\b/i.test(n) ||
    /^5E991\b/i.test(n)
  );
}

/**
 * § 734.9(e)(2) Footnote-4 product scope: same as fn1 PLUS 5D002 and
 * 5E002 (encryption).
 */
function isFootnote4TechEccn(eccn: string): boolean {
  if (!eccn) return false;
  const n = eccn.replace(/^ECCN:/, "");
  if (isFootnote1TechEccn(eccn)) return true;
  return /^5D002\b/i.test(n) || /^5E002\b/i.test(n);
}

/**
 * § 734.9(e)(3) Footnote-5 product scope — foreign item ECCNs:
 * 3B001/3B002/3B903/3B991/3B992/3B993/3B994 (with specific carve-outs
 * we don't enumerate here — operator review).
 */
function isFootnote5ForeignItem(eccn: string | null | undefined): boolean {
  if (!eccn) return false;
  const n = eccn.replace(/^ECCN:/, "");
  return /^3B(001|002|903|991|992|993|994)\b/i.test(n);
}

/**
 * § 734.9(e)(3) Footnote-5 production-tech scope: 3D001/3D901/3D991/
 * 3D993/3D994/3E001/3E901/3E991/3E993/3E994.
 */
function isFootnote5TechEccn(eccn: string): boolean {
  if (!eccn) return false;
  const n = eccn.replace(/^ECCN:/, "");
  return (
    /^3D001\b/i.test(n) ||
    /^3D9(0[1]|9[134])\b/i.test(n) || // 3D901, 3D991, 3D993, 3D994
    /^3E001\b/i.test(n) ||
    /^3E9(0[1]|9[134])\b/i.test(n)
  );
}

/**
 * § 734.9(f) and (g) — Product scope test: foreign item is the direct
 * product of US-origin technology or software specified in ANY ECCN
 * in product groups D or E in Categories 3-9 of the CCL.
 *
 * This is the broadest FDPR product scope on the CCL — it covers
 * essentially every NS-controlled and dual-use technology in Categories
 * 3 (Electronics) through 9 (Propulsion/Aerospace).
 *
 * Excludes Categories 0/1/2 (Nuclear/Materials/Materials-Processing).
 * Includes the entire D (software) and E (technology) product groups.
 *
 * Source: 15 CFR § 734.9(f)(1)(i), § 734.9(g)(1)(i).
 */
function isCat39DEEccn(eccn: string): boolean {
  if (!eccn) return false;
  const n = eccn.replace(/^ECCN:/, "");
  return /^[3-9][DE]\d{3}/i.test(n);
}

/**
 * § 734.9(f) — Country scope test: destination is Russia (RU), Belarus
 * (BY), or in one of the temporarily occupied Ukrainian regions
 * (Crimea, Donetsk, Luhansk, Kherson, Zaporizhzhia).
 *
 * The occupied-region trigger requires an explicit knowledge fact
 * because ISO 3166 has no codes for them; operators flag this via
 * `knowledgeFacts.destinationIsOccupiedUkraineRegion`.
 *
 * Source: 15 CFR § 734.9(f)(2).
 */
function isRussiaBelarusOrOccupiedUkraine(
  destinationIso: string,
  knowledgeFacts: KnowledgeFacts | undefined,
): boolean {
  const iso = destinationIso.toUpperCase();
  if (iso === "RU" || iso === "BY") return true;
  return knowledgeFacts?.destinationIsOccupiedUkraineRegion === true;
}

/**
 * § 734.9(h)/(i) — Advanced-computing foreign-item scope. Foreign item
 * must be classified under ECCN 3A090, 4A090, 4D090, or one of the
 * `.z` paragraphs of 3A001/3A002/4A003/4A004/4A005/4A090/5A002/5A992/
 * 5D002/5D992/5E002/5E992 (the "advanced-computing chip and related
 * software/tech" classifications added by Oct 2022 IFR + amendments).
 *
 * Conservative implementation: match the explicit .090 classifications
 * plus any 3A001/3A002/4A003/4A004/4A005/5A002 entries — operator
 * confirms the .z designation in their classification.
 *
 * Source: 15 CFR § 734.9(h)(1), (i)(1). 87 FR 62186 (Oct 13, 2022).
 */
function isAdvancedComputingForeignItem(
  eccn: string | null | undefined,
): boolean {
  if (!eccn) return false;
  const n = eccn.replace(/^ECCN:/, "");
  // Direct .090 hits
  if (/^3A090\b|^4A090\b|^4D090\b/i.test(n)) return true;
  // Advanced-computing parent ECCNs with .z paragraphs (operator
  // confirms .z scope via parametric matcher upstream)
  if (
    /^3A001\b/i.test(n) ||
    /^3A002\b/i.test(n) ||
    /^4A003\b/i.test(n) ||
    /^4A004\b/i.test(n) ||
    /^4A005\b/i.test(n) ||
    /^5A002\b/i.test(n)
  ) {
    return true;
  }
  return false;
}

/**
 * § 734.9(h)/(i) — Product scope tech test: US-origin tech/sw in any
 * of the advanced-computing-tech ECCNs that produce direct products
 * within § 734.9(h)/(i) reach. This is the union of fn5 production
 * tech + 4D090/4E001 explicitly named in the rule.
 *
 * Source: 15 CFR § 734.9(h)(1)(i)/(ii), § 734.9(i)(1)(i)/(ii).
 */
function isAdvancedComputingTechEccn(eccn: string): boolean {
  if (!eccn) return false;
  const n = eccn.replace(/^ECCN:/, "");
  if (isFootnote5TechEccn(eccn)) return true;
  return (
    /^3D001\b|^3D002\b|^3D991\b/i.test(n) ||
    /^3E001\b|^3E002\b|^3E003\b|^3E991\b/i.test(n) ||
    /^4D001\b|^4D090\b/i.test(n) ||
    /^4E001\b/i.test(n) ||
    /^5D001\b/i.test(n) ||
    /^5E001\b/i.test(n)
  );
}

// All 10 distinct FDPR rules now evaluated (Z20a/b/c/d complete).
// notYetEvaluatedRules returns empty.
const NOT_YET_EVALUATED: FDPRRuleId[] = [];

const FDPR_DISCLAIMER =
  "FDPR engine output is SCREENING-LEVEL guidance only. All ten distinct FDPR rules are now evaluated: § 734.9(b) NS-FDP, (c) 9x515-FDP, (d) 600-series-FDP, (e)(1) Entity-List Footnote 1, (e)(2) Entity-List Footnote 4, (e)(3) Entity-List Footnote 5, (f) Russia/Belarus/Crimea, (g) MEU/Procurement Footnote 3, (h) Advanced Computing, (i) Supercomputer. Coverage of § 734.9 is complete to the rule-citation level — however, the parametric details of each rule (notably the .z-paragraph scope on advanced-computing classifications and the supercomputer FLOPS thresholds) require human compliance-officer review against the operator's specific item characterization. Final determination requires qualified export-control counsel.";

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Evaluate the foreign-made item against the 8 FDPR scenarios.
 * Returns every rule that fires + an explicit "not yet evaluated"
 * list for sub-sprints still queued.
 *
 * Pure function — no I/O.
 */
export function evaluateFDPR(input: FDPREvaluationInput): FDPREvaluationResult {
  const groups = resolveCountryGroups(input.destinationCountry);
  const hits: FDPRRuleHit[] = [];

  const inD1 = groups.groups.has("D:1");
  const inD3 = groups.groups.has("D:3");
  const inD4 = groups.groups.has("D:4");
  const inD5 = groups.groups.has("D:5");
  const inE1 = groups.groups.has("E:1");
  const inE2 = groups.groups.has("E:2");

  // ── § 734.9(b) — NS-FDP ──────────────────────────────────────────
  // Trigger: foreign item is the direct product of US-origin NS-
  // controlled tech/sw AND the resulting foreign item is itself NS-
  // controlled in its applicable ECCN AND destination ∈ {D:1, E:1, E:2}.
  //
  // For simplification: we fire when destination ∈ {D:1, E:1, E:2}
  // AND at least one BOM line has madeWithUSTechnology=true or
  // madeWithUSSoftware=true with an NS-controlled tech ECCN OR
  // producedByPlantThatIsUSDirectProduct=true with NS-controlled
  // plant tech.
  //
  // Conservative: if destination is in scope AND any FDPR-trigger
  // signal fires, surface the rule. Operator confirms the
  // foreign-item NS-control status via their classification.
  if (inD1 || inE1 || inE2) {
    const nsMatchLines = input.bom.filter((line) => {
      const techNS = (line.usTechnologyEccns ?? []).some(
        isNSControlledTechEccn,
      );
      const swNS = (line.usSoftwareEccns ?? []).some(isNSControlledTechEccn);
      const plantNS = (line.plantTechEccns ?? []).some(isNSControlledTechEccn);
      return (
        (line.madeWithUSTechnology === true && techNS) ||
        (line.madeWithUSSoftware === true && swNS) ||
        (line.producedByPlantThatIsUSDirectProduct === true && plantNS)
      );
    });
    if (nsMatchLines.length > 0) {
      hits.push({
        ruleId: "734.9(b)-NS",
        title: "National Security FDP (§ 734.9(b))",
        citation:
          "15 CFR § 734.9(b) — Foreign item that is direct product of US-origin NS-controlled tech/sw, NS-controlled itself, destined for D:1/E:1/E:2",
        matchingComponentNodeIds: nsMatchLines.map((l) => l.nodeId),
        rationale: `Destination ${input.destinationCountry} is in D:1/E:1/E:2. ${nsMatchLines.length} BOM line(s) used US-origin NS-controlled technology / software / production-plant. Foreign item is subject to the EAR via § 734.9(b) NS-FDP. License required under § 742 (NS reasons-for-control).`,
        licenseAuthority:
          "15 CFR § 742 (CCL-based license requirement, NS column)",
      });
    }
  }

  // ── § 734.9(c) — 9x515-FDP ───────────────────────────────────────
  // Trigger: foreign item is itself 9x515 AND its production used
  // US-origin 9D515/9E515 technology OR plant is direct product of
  // 9E515 AND destination ∈ {D:5, E:1, E:2}.
  if (inD5 || inE1 || inE2) {
    // First check: is the FOREIGN ITEM itself 9x515? Check both the
    // top-level foreignItemEccn AND any BOM line. The cascade
    // typically supplies the foreignItemEccn for the finished
    // foreign-made end-item; we fire if either matches.
    const foreignItemIs9x515 =
      isForeignItem9x515(input.foreignItemEccn) ||
      input.bom.some((line) => isForeignItem9x515(line.eccn));

    if (foreignItemIs9x515) {
      const matching9x515Tech = input.bom.filter((line) => {
        const tech9x515 = (line.usTechnologyEccns ?? []).some(
          is9x515TechOrSoftwareEccn,
        );
        const sw9x515 = (line.usSoftwareEccns ?? []).some(
          is9x515TechOrSoftwareEccn,
        );
        const plant9x515 = (line.plantTechEccns ?? []).some(
          is9x515TechOrSoftwareEccn,
        );
        return (
          (line.madeWithUSTechnology === true && tech9x515) ||
          (line.madeWithUSSoftware === true && sw9x515) ||
          (line.producedByPlantThatIsUSDirectProduct === true && plant9x515)
        );
      });

      if (matching9x515Tech.length > 0) {
        hits.push({
          ruleId: "734.9(c)-9x515",
          title: "9x515 FDP (§ 734.9(c))",
          citation:
            "15 CFR § 734.9(c) — Foreign item that is itself 9x515 + produced using US-origin 9D515/9E515, destined for D:5/E:1/E:2",
          matchingComponentNodeIds: matching9x515Tech.map((l) => l.nodeId),
          rationale: `Foreign item is itself 9x515 (foreignItemEccn=${input.foreignItemEccn ?? "from BOM"}). ${matching9x515Tech.length} BOM line(s) used US-origin 9D515/9E515 technology. Destination ${input.destinationCountry} is in D:5/E:1/E:2. Subject to the EAR via § 734.9(c) 9x515-FDP. License required under § 742.6 (RS), policy of denial to D:5.`,
          licenseAuthority:
            "15 CFR § 742.6 (RS reasons-for-control; policy of denial to D:5)",
        });
      }
    }
  }

  // ── § 734.9(d) — 600-series-FDP ──────────────────────────────────
  // Trigger: foreign item is 600-series or 0A919 AND (direct product
  // of US-origin 600-series tech/sw OR plant is direct product) AND
  // destination ∈ {D:1, D:3, D:4, D:5, E:1, E:2}.
  if (inD1 || inD3 || inD4 || inD5 || inE1 || inE2) {
    const foreignItemIs600 =
      isForeignItem600SeriesOr0A919(input.foreignItemEccn) ||
      input.bom.some((line) => isForeignItem600SeriesOr0A919(line.eccn));

    if (foreignItemIs600) {
      const matching600Tech = input.bom.filter((line) => {
        const tech600 = (line.usTechnologyEccns ?? []).some(
          is600SeriesTechOrSoftwareEccn,
        );
        const sw600 = (line.usSoftwareEccns ?? []).some(
          is600SeriesTechOrSoftwareEccn,
        );
        const plant600 = (line.plantTechEccns ?? []).some(
          is600SeriesTechOrSoftwareEccn,
        );
        return (
          (line.madeWithUSTechnology === true && tech600) ||
          (line.madeWithUSSoftware === true && sw600) ||
          (line.producedByPlantThatIsUSDirectProduct === true && plant600)
        );
      });

      if (matching600Tech.length > 0) {
        hits.push({
          ruleId: "734.9(d)-600-series",
          title: "600-series FDP (§ 734.9(d))",
          citation:
            "15 CFR § 734.9(d) — Foreign item in 600-series ECCN or 0A919, direct product of US-origin 600-series tech/sw, destined for D:1/D:3/D:4/D:5/E:1/E:2",
          matchingComponentNodeIds: matching600Tech.map((l) => l.nodeId),
          rationale: `Foreign item is in a 600-series ECCN or 0A919. ${matching600Tech.length} BOM line(s) used US-origin 600-series technology / software / plant. Destination ${input.destinationCountry} is in D:1/D:3/D:4/D:5/E:1/E:2. Subject to the EAR via § 734.9(d) 600-series-FDP. License required under § 742.`,
          licenseAuthority:
            "15 CFR § 742 (CCL-based license requirement, NS column for 600-series)",
        });
      }
    }
  }

  // ── § 734.9(e)(1) — Entity-List FDP, Footnote 1 (Huawei) ─────────
  // Trigger: foreign item is direct product of EAR-subject tech/sw
  // in 3D001/3D9xx, 3E001/3E9xx, 4D001/4D99x, 4E001/4E99x,
  // 5D001/5D991, 5E001/5E991. ANY transaction party (incorporator/
  // purchaser/consignee/end-user) carries footnote 1.
  if (anyPartyHasFootnote(input.knowledgeFacts, 1)) {
    const matchingFn1Lines = input.bom.filter((line) => {
      const tech = (line.usTechnologyEccns ?? []).some(isFootnote1TechEccn);
      const sw = (line.usSoftwareEccns ?? []).some(isFootnote1TechEccn);
      const plant = (line.plantTechEccns ?? []).some(isFootnote1TechEccn);
      return (
        (line.madeWithUSTechnology === true && tech) ||
        (line.madeWithUSSoftware === true && sw) ||
        (line.producedByPlantThatIsUSDirectProduct === true && plant)
      );
    });
    if (matchingFn1Lines.length > 0) {
      const roles = partyRolesWithFootnote(input.knowledgeFacts, 1);
      hits.push({
        ruleId: "734.9(e)-entity-list-fn1",
        title: "Entity List FDP — Footnote 1 (Huawei-style) (§ 734.9(e)(1))",
        citation:
          "15 CFR § 734.9(e)(1) — Foreign item is direct product of EAR-subject Cat 3/4/5 D/E tech/sw, transaction includes footnote-1 entity",
        matchingComponentNodeIds: matchingFn1Lines.map((l) => l.nodeId),
        rationale: `Footnote-1 Entity-List party in transaction (roles: ${roles.join(", ")}). ${matchingFn1Lines.length} BOM line(s) used US-origin Cat 3/4/5 D/E technology/software/plant. Foreign item subject to the EAR via § 734.9(e)(1) Footnote-1 FDP. Policy of denial for items above 5G capability.`,
        licenseAuthority:
          "15 CFR § 744.11(a)(2)(i) — License required; policy of denial above 5G",
      });
    }
  }

  // ── § 734.9(e)(2) — Entity-List FDP, Footnote 4 (HikVision) ──────
  // Same as fn1 PLUS 5D002 / 5E002 (encryption).
  if (anyPartyHasFootnote(input.knowledgeFacts, 4)) {
    const matchingFn4Lines = input.bom.filter((line) => {
      const tech = (line.usTechnologyEccns ?? []).some(isFootnote4TechEccn);
      const sw = (line.usSoftwareEccns ?? []).some(isFootnote4TechEccn);
      const plant = (line.plantTechEccns ?? []).some(isFootnote4TechEccn);
      return (
        (line.madeWithUSTechnology === true && tech) ||
        (line.madeWithUSSoftware === true && sw) ||
        (line.producedByPlantThatIsUSDirectProduct === true && plant)
      );
    });
    if (matchingFn4Lines.length > 0) {
      const roles = partyRolesWithFootnote(input.knowledgeFacts, 4);
      hits.push({
        ruleId: "734.9(e)-entity-list-fn4",
        title: "Entity List FDP — Footnote 4 (HikVision-style) (§ 734.9(e)(2))",
        citation:
          "15 CFR § 734.9(e)(2) — Same as (e)(1) PLUS 5D002/5E002 encryption tech, transaction includes footnote-4 entity",
        matchingComponentNodeIds: matchingFn4Lines.map((l) => l.nodeId),
        rationale: `Footnote-4 Entity-List party in transaction (roles: ${roles.join(", ")}). ${matchingFn4Lines.length} BOM line(s) used US-origin Cat 3/4/5 D/E or 5D002/5E002 (encryption) tech. Foreign item subject to the EAR via § 734.9(e)(2) Footnote-4 FDP.`,
        licenseAuthority:
          "15 CFR § 744.11(a)(2)(iv) — License required; policy of denial",
      });
    }
  }

  // ── § 734.9(e)(3) — Entity-List FDP, Footnote 5 + Advanced-Node-IC ─
  // Trigger: foreign item is 3B001/3B002/3B903/3B991/3B992/3B993/3B994
  // AND direct product of 3D001/3D901/3D991/3D993/3D994/3E001/3E901/
  // 3E991/3E993/3E994 AND ( ANY transaction party carries footnote 5
  // OR knowledge that the destination is at a facility in Macau/D:5
  // producing logic or DRAM advanced-node ICs ).
  const isMacauOrD5 = groups.isMacau || groups.groups.has("D:5");
  const fn5KnowledgeTrigger =
    anyPartyHasFootnote(input.knowledgeFacts, 5) ||
    (input.knowledgeFacts?.advancedNodeIcFacility === true && isMacauOrD5);

  if (fn5KnowledgeTrigger) {
    // First check: foreign item must be 3B001-3B994.
    const foreignItemIsFn5Scope =
      isFootnote5ForeignItem(input.foreignItemEccn) ||
      input.bom.some((line) => isFootnote5ForeignItem(line.eccn));

    if (foreignItemIsFn5Scope) {
      const matchingFn5Lines = input.bom.filter((line) => {
        const tech = (line.usTechnologyEccns ?? []).some(isFootnote5TechEccn);
        const sw = (line.usSoftwareEccns ?? []).some(isFootnote5TechEccn);
        const plant = (line.plantTechEccns ?? []).some(isFootnote5TechEccn);
        return (
          (line.madeWithUSTechnology === true && tech) ||
          (line.madeWithUSSoftware === true && sw) ||
          (line.producedByPlantThatIsUSDirectProduct === true && plant)
        );
      });
      if (matchingFn5Lines.length > 0) {
        const fn5Roles = partyRolesWithFootnote(input.knowledgeFacts, 5);
        const triggerDesc =
          fn5Roles.length > 0
            ? `Footnote-5 Entity-List party (roles: ${fn5Roles.join(", ")})`
            : `Advanced-node IC fabrication facility in ${input.destinationCountry} (Macau/D:5)`;
        hits.push({
          ruleId: "734.9(e)-entity-list-fn5",
          title:
            "Entity List FDP — Footnote 5 + Advanced-Node IC (§ 734.9(e)(3))",
          citation:
            "15 CFR § 734.9(e)(3) — Foreign item in 3B001-3B994, direct product of US 3D/3E tech, transaction includes footnote-5 entity OR advanced-node-IC facility in Macau/D:5",
          matchingComponentNodeIds: matchingFn5Lines.map((l) => l.nodeId),
          rationale: `${triggerDesc}. Foreign item in 3B001-3B994 scope. ${matchingFn5Lines.length} BOM line(s) used US-origin 3D001/3D901/3D991/3D993/3D994/3E001/3E901/3E991/3E993/3E994. Subject to the EAR via § 734.9(e)(3) Footnote-5 FDP.`,
          licenseAuthority:
            "15 CFR § 744.11(a)(2)(v) — License required; advanced-node IC scope",
        });
      }
    }
  }

  // ── § 734.9(f) — Russia / Belarus / Crimea FDPR ──────────────────
  // Trigger: foreign item is the direct product of US-origin tech/sw
  // in ANY ECCN in product groups D or E of CCL Categories 3-9
  // (Electronics through Propulsion/Aerospace) — OR produced by a
  // plant or major component that is itself the direct product of
  // such tech — AND destination is Russia, Belarus, or one of the
  // temporarily occupied Ukrainian regions.
  //
  // No knowledge predicate beyond destination. The broadest product
  // scope of all FDPR rules — Cat 3-9 D/E spans essentially every
  // NS-controlled and dual-use technology.
  //
  // Source: 15 CFR § 734.9(f). Final rule 87 FR 12226 (Mar 3, 2022),
  // amended multiple times including 87 FR 12856 (Apr 12, 2022) and
  // 88 FR 12174 (Feb 27, 2023).
  if (
    isRussiaBelarusOrOccupiedUkraine(
      input.destinationCountry,
      input.knowledgeFacts,
    )
  ) {
    const matchingFLines = input.bom.filter((line) => {
      const tech = (line.usTechnologyEccns ?? []).some(isCat39DEEccn);
      const sw = (line.usSoftwareEccns ?? []).some(isCat39DEEccn);
      const plant = (line.plantTechEccns ?? []).some(isCat39DEEccn);
      return (
        (line.madeWithUSTechnology === true && tech) ||
        (line.madeWithUSSoftware === true && sw) ||
        (line.producedByPlantThatIsUSDirectProduct === true && plant)
      );
    });
    if (matchingFLines.length > 0) {
      const destDesc =
        input.knowledgeFacts?.destinationIsOccupiedUkraineRegion === true
          ? `${input.destinationCountry} (flagged as occupied Ukrainian region)`
          : input.destinationCountry;
      hits.push({
        ruleId: "734.9(f)-russia-belarus-crimea",
        title: "Russia/Belarus/Crimea FDP (§ 734.9(f))",
        citation:
          "15 CFR § 734.9(f) — Foreign item direct product of US-origin Cat 3-9 D/E tech/sw, destined for Russia, Belarus, or occupied Ukrainian regions",
        matchingComponentNodeIds: matchingFLines.map((l) => l.nodeId),
        rationale: `Destination ${destDesc} is in Russia/Belarus/occupied-Ukraine scope per § 734.9(f)(2). ${matchingFLines.length} BOM line(s) used US-origin Cat 3-9 D/E technology / software / production-plant. Foreign item is subject to the EAR via § 734.9(f) Russia/Belarus FDPR. License required under § 746.8; policy of denial except for limited humanitarian / news-media / safety exceptions.`,
        licenseAuthority:
          "15 CFR § 746.8 (Russia/Belarus sanctions; policy of denial)",
      });
    }
  }

  // ── § 734.9(g) — MEU / Procurement FDPR (Footnote 3) ─────────────
  // Trigger: foreign item is the direct product of US-origin tech/sw
  // in ANY ECCN in product groups D or E of CCL Categories 3-9 (same
  // product scope as (f)) AND ANY transaction party carries Entity-
  // List footnote 3 (Russian/Belarusian Military End-User per
  // § 744.21, or a § 744.21 procurement-pattern entity).
  //
  // CRITICAL: destination is WORLDWIDE. Unlike (f), (g) can fire on a
  // shipment to a friendly destination (e.g. Kazakhstan, Turkey, UAE,
  // Singapore) if a fn3 entity is anywhere in the transaction chain.
  // This catches Russia-procurement schemes that route through third
  // countries.
  //
  // Source: 15 CFR § 734.9(g). 87 FR 12226 (Mar 3, 2022).
  if (anyPartyHasFootnote(input.knowledgeFacts, 3)) {
    const matchingGLines = input.bom.filter((line) => {
      const tech = (line.usTechnologyEccns ?? []).some(isCat39DEEccn);
      const sw = (line.usSoftwareEccns ?? []).some(isCat39DEEccn);
      const plant = (line.plantTechEccns ?? []).some(isCat39DEEccn);
      return (
        (line.madeWithUSTechnology === true && tech) ||
        (line.madeWithUSSoftware === true && sw) ||
        (line.producedByPlantThatIsUSDirectProduct === true && plant)
      );
    });
    if (matchingGLines.length > 0) {
      const fn3Roles = partyRolesWithFootnote(input.knowledgeFacts, 3);
      hits.push({
        ruleId: "734.9(g)-meu-procurement-fn3",
        title: "MEU / Procurement FDP — Footnote 3 (§ 734.9(g))",
        citation:
          "15 CFR § 734.9(g) — Foreign item direct product of US-origin Cat 3-9 D/E tech/sw, transaction includes Footnote-3 entity (Russian/Belarusian MEU or § 744.21 procurement scheme)",
        matchingComponentNodeIds: matchingGLines.map((l) => l.nodeId),
        rationale: `Footnote-3 Entity-List party (Russian/Belarusian Military End-User or § 744.21 procurement-pattern entity) in transaction (roles: ${fn3Roles.join(", ")}). Destination ${input.destinationCountry} — § 734.9(g) applies WORLDWIDE, not only to Russia/Belarus. ${matchingGLines.length} BOM line(s) used US-origin Cat 3-9 D/E technology. Foreign item subject to the EAR via § 734.9(g) MEU/Procurement FDP. License required under § 744.21; policy of denial.`,
        licenseAuthority:
          "15 CFR § 744.21 — License required for MEU; policy of denial",
      });
    }
  }

  // ── § 734.9(h) — Advanced Computing FDPR ─────────────────────────
  // Trigger: foreign item is in advanced-computing scope (3A090,
  // 4A090, 4D090, or .z paragraph of 3A001/3A002/4A003/4A004/4A005/
  // 5A002) AND (destination is Macau or D:5, OR operator has
  // knowledge of advanced-computing-IC development end-use) AND
  // direct product of US-origin tech/sw in the advanced-computing
  // tech scope.
  //
  // Source: 15 CFR § 734.9(h). 87 FR 62186 (Oct 13, 2022) — Advanced
  // Computing IFR. Amended 88 FR 73430 (Oct 25, 2023).
  const advCompDestinationInScope =
    isMacauOrD5 ||
    input.knowledgeFacts?.advancedComputingEndUse === true ||
    input.knowledgeFacts?.advancedNodeIcFacility === true;

  if (advCompDestinationInScope) {
    const foreignItemAdvComp =
      isAdvancedComputingForeignItem(input.foreignItemEccn) ||
      input.bom.some((line) => isAdvancedComputingForeignItem(line.eccn));

    if (foreignItemAdvComp) {
      const matchingHLines = input.bom.filter((line) => {
        const tech = (line.usTechnologyEccns ?? []).some(
          isAdvancedComputingTechEccn,
        );
        const sw = (line.usSoftwareEccns ?? []).some(
          isAdvancedComputingTechEccn,
        );
        const plant = (line.plantTechEccns ?? []).some(
          isAdvancedComputingTechEccn,
        );
        return (
          (line.madeWithUSTechnology === true && tech) ||
          (line.madeWithUSSoftware === true && sw) ||
          (line.producedByPlantThatIsUSDirectProduct === true && plant)
        );
      });
      if (matchingHLines.length > 0) {
        const triggerDesc = isMacauOrD5
          ? `Destination ${input.destinationCountry} is Macau/D:5`
          : input.knowledgeFacts?.advancedComputingEndUse === true
            ? "Knowledge of advanced-computing-IC development end-use"
            : "Knowledge of advanced-node-IC facility";
        hits.push({
          ruleId: "734.9(h)-advanced-computing",
          title: "Advanced Computing FDP (§ 734.9(h))",
          citation:
            "15 CFR § 734.9(h) — Foreign item in 3A090/4A090/4D090 (or .z paragraphs of 3A001/3A002/4A003/4A004/4A005/5A002), direct product of US-origin advanced-computing tech, destined for Macau/D:5 or advanced-computing-IC end-use",
          matchingComponentNodeIds: matchingHLines.map((l) => l.nodeId),
          rationale: `${triggerDesc}. Foreign item is in advanced-computing ECCN scope (3A090/4A090/4D090 or .z paragraph). ${matchingHLines.length} BOM line(s) used US-origin advanced-computing tech/software/plant. Foreign item is subject to the EAR via § 734.9(h) Advanced Computing FDPR. License required under § 742.6 / § 744.23; policy of denial.`,
          licenseAuthority:
            "15 CFR § 742.6 + § 744.23 (Advanced Computing / Semiconductor Manufacturing; policy of denial)",
        });
      }
    }
  }

  // ── § 734.9(i) — Supercomputer FDPR ──────────────────────────────
  // Trigger: knowledge that the foreign item will be incorporated
  // into a supercomputer (§ 772.1 definition: ≥ 100 double-precision
  // PetaFLOPS in 41,674 ft² / ~3,872 m² or smaller). Foreign item
  // must be in advanced-computing scope. Product scope: US-origin
  // advanced-computing tech.
  //
  // Destination is WORLDWIDE on knowledge — like (g), this catches
  // third-country procurement schemes routing to a supercomputer
  // build-out anywhere.
  //
  // Source: 15 CFR § 734.9(i). 87 FR 62186 (Oct 13, 2022). § 772.1
  // for the supercomputer definition.
  if (input.knowledgeFacts?.supercomputerEndUse === true) {
    const foreignItemAdvComp =
      isAdvancedComputingForeignItem(input.foreignItemEccn) ||
      input.bom.some((line) => isAdvancedComputingForeignItem(line.eccn));

    if (foreignItemAdvComp) {
      const matchingILines = input.bom.filter((line) => {
        const tech = (line.usTechnologyEccns ?? []).some(
          isAdvancedComputingTechEccn,
        );
        const sw = (line.usSoftwareEccns ?? []).some(
          isAdvancedComputingTechEccn,
        );
        const plant = (line.plantTechEccns ?? []).some(
          isAdvancedComputingTechEccn,
        );
        return (
          (line.madeWithUSTechnology === true && tech) ||
          (line.madeWithUSSoftware === true && sw) ||
          (line.producedByPlantThatIsUSDirectProduct === true && plant)
        );
      });
      if (matchingILines.length > 0) {
        hits.push({
          ruleId: "734.9(i)-supercomputer",
          title: "Supercomputer FDP (§ 734.9(i))",
          citation:
            "15 CFR § 734.9(i) — Foreign item destined for incorporation into supercomputer (≥ 100 PetaFLOPS DP per § 772.1), direct product of US-origin advanced-computing tech",
          matchingComponentNodeIds: matchingILines.map((l) => l.nodeId),
          rationale: `Knowledge that the foreign item will be incorporated into a "supercomputer" per § 772.1 (≥ 100 double-precision PetaFLOPS in ≤ 41,674 ft² floor area). Destination ${input.destinationCountry} — § 734.9(i) applies WORLDWIDE on knowledge. ${matchingILines.length} BOM line(s) used US-origin advanced-computing technology. Foreign item subject to the EAR via § 734.9(i) Supercomputer FDPR. License required under § 744.23; policy of denial.`,
          licenseAuthority:
            "15 CFR § 744.23 (Supercomputer end-use; policy of denial)",
        });
      }
    }
  }

  return {
    fdprApplicable: hits.length > 0,
    hits,
    notYetEvaluatedRules: NOT_YET_EVALUATED,
    disclaimer: FDPR_DISCLAIMER,
  };
}
