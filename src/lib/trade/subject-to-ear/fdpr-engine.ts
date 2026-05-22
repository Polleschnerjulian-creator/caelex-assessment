/**
 * Caelex Trade — Foreign Direct Product Rule (FDPR) engine.
 *
 * Sprint Z20a. Tier 1 per the Living Execution Plan.
 *
 * 15 CFR § 734.9 codifies 8 FDPR scenarios. Each scenario defines a
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
 * This sprint (Z20a) implements the 3 simplest scenarios — all
 * destination-gated, no knowledge predicates needed:
 *
 *   § 734.9(b) — NS-FDP        → D:1, E:1, E:2
 *   § 734.9(c) — 9x515-FDP     → D:5, E:1, E:2
 *   § 734.9(d) — 600-series    → D:1, D:3, D:4, D:5, E:1, E:2
 *
 * The remaining 5 scenarios are stubbed pending Z20b-d:
 *
 *   § 734.9(e) — Entity List FDP (footnotes 1, 4, 5)  → Z20b
 *   § 734.9(f) — Russia / Belarus / Crimea FDPR        → Z20c
 *   § 734.9(g) — MEU / Procurement (footnote 3)        → Z20c
 *   § 734.9(h) — Advanced Computing FDP                → Z20d
 *   § 734.9(i) — Supercomputer FDP                     → Z20d
 *
 * Source: Blueprint 2 § 3 + § 9.1 steps 3-5. 15 CFR § 734.9.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { resolveCountryGroups } from "./country-groups";

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

// Pure list of "not yet evaluated" rules for Z20a release.
const Z20A_NOT_YET_EVALUATED: FDPRRuleId[] = [
  "734.9(e)-entity-list-fn1",
  "734.9(e)-entity-list-fn4",
  "734.9(e)-entity-list-fn5",
  "734.9(f)-russia-belarus-crimea",
  "734.9(g)-meu-procurement-fn3",
  "734.9(h)-advanced-computing",
  "734.9(i)-supercomputer",
];

const FDPR_DISCLAIMER =
  "FDPR engine output is SCREENING-LEVEL guidance only. Three of the eight FDPR scenarios are evaluated in this release: § 734.9(b) NS-FDP, § 734.9(c) 9x515-FDP, § 734.9(d) 600-series-FDP. The remaining five (Entity-List footnotes 1/4/5, Russia/Belarus/Crimea, MEU/Procurement footnote 3, Advanced Computing, Supercomputer) are NOT YET evaluated — operator MUST perform these manually for any transaction with knowledge of an Entity-List party, Russia/Belarus destination, or advanced-computing end-use. Final determination requires qualified export-control counsel.";

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

  return {
    fdprApplicable: hits.length > 0,
    hits,
    notYetEvaluatedRules: Z20A_NOT_YET_EVALUATED,
    disclaimer: FDPR_DISCLAIMER,
  };
}
