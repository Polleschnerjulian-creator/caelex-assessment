/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Caelex Trade — Order-of-Review Auto-Trump Engine (Sprint Z28, Tier 3).
 *
 * When a single item matches multiple control lists across jurisdictions,
 * regulatory practice imposes a precedence order. This engine resolves
 * that precedence and tells the operator which list governs.
 *
 * ─── Precedence hierarchy ────────────────────────────────────────────
 *
 *   1. ITAR / USML — exclusive jurisdiction (22 CFR § 120.5)
 *      An item described in the USML is subject to the licensing
 *      authority of the Department of State (DDTC), regardless of any
 *      parallel EAR/EU dual-use classification. EAR § 734.3(a)(1)
 *      explicitly excludes ITAR-controlled items from the EAR.
 *
 *   2. EU Reg. 833/2014 Annex IV (sanctions PROHIBITION)
 *      Annex IV (and the related Art. 2/2a/2b prohibitions) is not a
 *      licensing list — it is a hard prohibition keyed to Russia and
 *      Belarus destinations. When matched WITH a relevant destination
 *      it trumps all licensing regimes because no licence is available.
 *      Note: this engine flags the Annex-IV match as primary; the
 *      destination check happens at the license-determination layer.
 *
 *   3. EAR / CCL (15 CFR Part 774)
 *      Applies when ITAR does not. § 734.3(a) sets the scope. The EAR
 *      is the primary US dual-use control list.
 *
 *   4. EU Annex I (EU Reg. 2021/821 Art. 3 + Annex I)
 *      Primary EU dual-use control list. Applies to EU exports when the
 *      item is not subject to ITAR (which is non-derogable U.S. law for
 *      U.S.-origin items) or Annex IV.
 *
 *   5. National lists (DE Ausfuhrliste Teil I A/B, UK Strategic Export
 *      Control List, etc.)
 *      Member-state supplemental lists. Sit ON TOP OF the EU regime as
 *      "national controls" under EU Reg. 2021/821 Art. 9 / Art. 10.
 *      They are supplemental, not superseding.
 *
 *   6. Wassenaar Arrangement / MTCR / NSG / AG (multilateral baseline)
 *      Informational. Multilateral regimes are implemented through the
 *      national regulations above; they are NEVER a standalone control
 *      authority. When only multilateral matches exist, the engine
 *      flags "no primary authority" — operator must trace through to a
 *      jurisdiction's implementing regulation.
 *
 * ─── What this engine does NOT do ────────────────────────────────────
 *
 *   - Counterparty screening (handled by `screening/` engines)
 *   - Destination check for Annex IV trump (handled by
 *     `license-determination.ts` Gate 0)
 *   - License-exception evaluation (handled by `license-exception-matrix.ts`)
 *   - Parametric matching against the control-list cross-walk (Z3c)
 *
 * This engine consumes the OUTPUT of those engines — a flat list of
 * `ListMatch` records — and reduces it to a single primary authority
 * plus the rationale.
 *
 * ─── Architecture notes ──────────────────────────────────────────────
 *
 *   - Pure function. No I/O, no Prisma, no async. Inputs in, result out.
 *   - Deterministic — given the same input set, returns the same output.
 *   - Order-insensitive — `[USML, EAR]` and `[EAR, USML]` yield the
 *     same `primaryAuthority`.
 *   - Defensive — empty input returns a defensible "no matches" result
 *     rather than throwing.
 *
 * ─── Sources ─────────────────────────────────────────────────────────
 *
 *   - 22 CFR § 120.5  — ITAR / EAR overlap & ITAR exclusive jurisdiction
 *   - 15 CFR § 734.3  — Scope of the EAR / ITAR carve-out
 *   - 15 CFR Part 774 Supplement No. 4 — CCL Order of Review (BIS)
 *   - EU Reg. 2021/821 Art. 11 — EU-wide dual-use control framework
 *   - Council Reg. (EU) 833/2014 Annex IV — Russia sanctions prohibition list
 *   - WA Plenary documents / MTCR Annex / NSG Trigger List / AG Common Control List
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Imports ────────────────────────────────────────────────────────

import type { OriginRegimeRouting } from "./origin-regime-map";

// ─── Types ──────────────────────────────────────────────────────────

/**
 * Identifier for a regulatory list that an item may match against.
 *
 * Aligned with `RegimeName` in the cross-walk (Z3b) but carries the
 * BAFA/BIS/DDTC list-identification convention rather than the
 * cross-walk's regime tag. The mapping is intentional — callers that
 * already produce `RegimeName` values can adapt via `normalizeListId()`.
 */
export type ListId =
  /** US Munitions List, 22 CFR Part 121. Sits under ITAR. */
  | "USML"
  /** Council Reg. (EU) 833/2014 Annex IV (Russia/Belarus prohibition). */
  | "EU_ANNEX_IV"
  /** US Commerce Control List, 15 CFR Part 774. Sits under EAR. */
  | "EAR_CCL"
  /** EU Reg. 2021/821 Annex I (dual-use control list). */
  | "EU_ANNEX_I"
  /** German Ausfuhrliste Teil I A (Kriegswaffenliste) + Teil I B (national dual-use). */
  | "DE_AUSFUHRLISTE"
  /** Japan METI Schedule 1 (Goods) + Schedule 2 (Technology) under FEFTA + Export Trade Control Order. */
  | "JP_METI"
  /** UK Strategic Export Control Lists. */
  | "UK_STRATEGIC"
  /** Wassenaar Arrangement — multilateral baseline. */
  | "WASSENAAR"
  /** Missile Technology Control Regime Annex — multilateral baseline. */
  | "MTCR"
  /** Nuclear Suppliers Group Trigger List — multilateral baseline. */
  | "NSG"
  /** Australia Group Common Control List (CBW precursors) — multilateral baseline. */
  | "AG"
  /** EU Common Military List (Council Common Position 2008/944/CFSP). */
  | "EU_CML"
  /** Canada Export Control List, SOR/89-202. */
  | "CA_ECL"
  /** Australia Defence and Strategic Goods List (DSGL). */
  | "AU_DSGL"
  /** Korea Strategic Items list (MOTIE Strategic Trade Act). */
  | "KR_STRATEGIC"
  /** Switzerland Güterkontrollverordnung (GKV, SR 946.202.1). */
  | "CH_GKV"
  /** Norway List I / List II (Norwegian Export Control Regulations). */
  | "NO_LIST"
  /** India SCOMET Appendix 3 (Special Chemicals, Organisms, Materials, Equipment and Technologies). */
  | "IN_SCOMET";

/**
 * A single regulatory-list match. Produced upstream by the parametric
 * matcher (Z3c), the cross-walk lookup, screening engines, etc.
 */
export type ListMatch = {
  /** Which list the item matched. */
  list: ListId;
  /** The matched code (e.g. "9A515.a.1", "XV(a)(7)(i)", "9A001"). */
  entry: string;
  /** Citation for the match (regulation + section). */
  citation: string;
};

/**
 * Resolved order-of-review result.
 *
 * `primaryAuthority` is the SINGLE list that governs. When no
 * jurisdictional list matched (only multilateral baselines), it is
 * `null` — the operator must trace through to a national implementing
 * regulation.
 *
 * `supersededLists` contains lists that were superseded by the
 * precedence rule (e.g. EAR matched but USML wins → EAR is superseded).
 *
 * `parallelLists` contains lists that apply in PARALLEL with the
 * primary — they are not trumped, just supplemental. National lists on
 * top of EU Annex I, for example.
 *
 * `multilateralBaseline` always carries the matched multilateral
 * regimes; they are NEVER primary on their own (see Z28 spec).
 */
export interface OrderOfReviewResult {
  /** The list that governs. `null` when only multilateral matches exist. */
  primaryAuthority: ListMatch | null;
  /**
   * Lists that matched but are trumped by the precedence rule. Carries
   * the reason as a string suffix on each entry's citation in the
   * normalized form — but the original `ListMatch.citation` is
   * preserved unchanged. Reasons appear in the top-level `rationale`.
   */
  supersededLists: ListMatch[];
  /**
   * Lists that apply IN PARALLEL with the primary authority. They are
   * not trumped — they supplement. Example: EU Annex I primary +
   * DE_AUSFUHRLISTE parallel (national supplements EU dual-use).
   */
  parallelLists: ListMatch[];
  /**
   * Multilateral regimes that matched. ALWAYS informational; the
   * national implementing regulation is what binds. Empty when no
   * multilateral list matched.
   */
  multilateralBaseline: ListMatch[];
  /**
   * Plain-language explanation of WHY this primary was chosen and
   * which lists were trumped. Always present, even when no matches.
   */
  rationale: string;
  /** Standard screening-only disclaimer. */
  disclaimer: string;
}

// ─── Constants ──────────────────────────────────────────────────────

const DISCLAIMER =
  "Order-of-review output is SCREENING-LEVEL GUIDANCE only. The precedence rules implemented here follow public-source regulations (22 CFR §120.5, 15 CFR §734.3, EU Reg. 2021/821 Art. 11). Final jurisdictional analysis must be confirmed by qualified export-control counsel.";

/**
 * Lists that ALWAYS go to `multilateralBaseline` — they are
 * informational and never primary.
 */
const MULTILATERAL_LISTS: ReadonlySet<ListId> = new Set<ListId>([
  "WASSENAAR",
  "MTCR",
  "NSG",
  "AG",
]);

/**
 * Lists that are SUPPLEMENTAL to a higher-tier regime (e.g. EU Annex I).
 * They never trump on their own when the EU primary is in scope; they
 * stack as parallel controls.
 */
const NATIONAL_SUPPLEMENTAL: ReadonlySet<ListId> = new Set<ListId>([
  "DE_AUSFUHRLISTE",
  "JP_METI",
  "UK_STRATEGIC",
  "EU_CML",
  "CA_ECL",
  "AU_DSGL",
  "KR_STRATEGIC",
  "CH_GKV",
  "NO_LIST",
  "IN_SCOMET",
]);

// ─── Engine ─────────────────────────────────────────────────────────

/**
 * Resolve the order-of-review precedence over a set of list matches.
 *
 * Algorithm:
 *
 *   1. Bucket inputs into jurisdictional vs. multilateral.
 *   2. If USML present → USML wins. All other jurisdictional lists are
 *      superseded (ITAR exclusive jurisdiction, 22 CFR § 120.5).
 *   3. Else if EU_ANNEX_IV present → Annex IV wins (sanctions trump
 *      licensing). All other jurisdictional lists are superseded.
 *   4. Origin-promotion (additive): when `opts.origin` is supplied and
 *      `origin.supported` is true, any match whose `list` equals
 *      `origin.dualUsePrimary` or `origin.militaryPrimary` is elevated
 *      to primary-eligible BEFORE tiers 3–5 run. A MULTILATERAL_LISTS
 *      member can never become primary even if it somehow equals an
 *      origin regime. This only applies when no USML or EU_ANNEX_IV
 *      match is present (those still outrank origin-promotion).
 *   5. Else if EAR_CCL present → EAR is primary; parallel EU/national
 *      lists remain in scope (each jurisdiction binds its own export).
 *   6. Else if EU_ANNEX_I present → EU Annex I is primary; national
 *      supplemental lists are parallel.
 *   7. Else if a national list present (no EU primary) → that national
 *      list is primary on its own.
 *   8. Else if only multilateral matches → `primaryAuthority` = null,
 *      multilateral surfaced for trace-through.
 *   9. Empty input → `primaryAuthority` = null, no rationale beyond
 *      "no matches".
 *
 * The function is order-insensitive over the input array. Duplicate
 * matches (same `list` + same `entry`) are deduplicated to keep the
 * output stable and avoid double-counting.
 *
 * @param matches  All matches that upstream engines produced for the item.
 * @param opts     Optional parameters. `opts.origin` enables origin-seat
 *                 promotion — the exporter's jurisdiction's national list
 *                 is preferred as primary over foreign national lists when
 *                 a higher-tier list (USML, EU_ANNEX_IV, EAR_CCL, EU_ANNEX_I)
 *                 does not already govern.
 * @returns A resolved `OrderOfReviewResult` with primary, superseded,
 *          parallel, multilateral, rationale, and disclaimer.
 */
export function resolveOrderOfReview(
  matches: readonly ListMatch[],
  opts?: { origin?: OriginRegimeRouting },
): OrderOfReviewResult {
  const deduped = dedupeMatches(matches);

  // Empty input — defensible result.
  if (deduped.length === 0) {
    return {
      primaryAuthority: null,
      supersededLists: [],
      parallelLists: [],
      multilateralBaseline: [],
      rationale:
        "No control-list matches supplied. Item is not classified against any list in this evaluation.",
      disclaimer: DISCLAIMER,
    };
  }

  const multilateral = deduped.filter((m) => MULTILATERAL_LISTS.has(m.list));
  const jurisdictional = deduped.filter((m) => !MULTILATERAL_LISTS.has(m.list));

  // ─── Only multilateral matches ───────────────────────────────────
  if (jurisdictional.length === 0) {
    return {
      primaryAuthority: null,
      supersededLists: [],
      parallelLists: [],
      multilateralBaseline: multilateral,
      rationale: buildMultilateralOnlyRationale(multilateral),
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Tier 1: USML wins (ITAR exclusive jurisdiction) ──────────────
  const usmlMatch = jurisdictional.find((m) => m.list === "USML");
  if (usmlMatch) {
    const superseded = jurisdictional.filter((m) => m.list !== "USML");
    return {
      primaryAuthority: usmlMatch,
      supersededLists: superseded,
      parallelLists: [],
      multilateralBaseline: multilateral,
      rationale: buildUsmlRationale(usmlMatch, superseded, multilateral),
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Tier 2: EU Annex IV (sanctions prohibition) ──────────────────
  const annexIvMatch = jurisdictional.find((m) => m.list === "EU_ANNEX_IV");
  if (annexIvMatch) {
    const superseded = jurisdictional.filter((m) => m.list !== "EU_ANNEX_IV");
    return {
      primaryAuthority: annexIvMatch,
      supersededLists: superseded,
      parallelLists: [],
      multilateralBaseline: multilateral,
      rationale: buildAnnexIvRationale(annexIvMatch, superseded, multilateral),
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Tier 3: EAR / CCL ────────────────────────────────────────────
  const earMatch = jurisdictional.find((m) => m.list === "EAR_CCL");
  if (earMatch) {
    // Key on object identity (m !== earMatch) so that non-primary EAR_CCL
    // sibling matches (e.g. a second sub-paragraph like 9A515.x alongside
    // 9A515.g) are surfaced as parallel obligations rather than silently
    // dropped. EU Annex I and national lists are also parallel (T-M20).
    const parallel = jurisdictional.filter(
      (m) =>
        m !== earMatch &&
        // EU Annex I is parallel (different jurisdiction); same for
        // national lists. ITAR / Annex IV would have already trumped.
        // Non-primary EAR_CCL siblings are also parallel same-regime obligations.
        (m.list === "EAR_CCL" ||
          m.list === "EU_ANNEX_I" ||
          NATIONAL_SUPPLEMENTAL.has(m.list)),
    );
    return {
      primaryAuthority: earMatch,
      supersededLists: [],
      parallelLists: parallel,
      multilateralBaseline: multilateral,
      rationale: buildEarRationale(earMatch, parallel, multilateral),
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Origin-promotion (additive, between EAR and EU Annex I) ────────
  // When the caller supplies an origin regime (exporter's jurisdictional
  // seat), and a match exists for that origin's primary list (dual-use
  // or military), that match is promoted to primary BEFORE the EU Annex I
  // and national-only tiers. USML, EU_ANNEX_IV, and EAR_CCL are never
  // outranked — those higher-tier guards already returned above.
  //
  // MULTILATERAL_LISTS members are never promotable; they are informational
  // and must stay in the baseline bucket regardless of origin.
  //
  // Foreign national lists (not the exporter's own regime) stay in the
  // existing NATIONAL_SUPPLEMENTAL path as parallel — they are NOT promoted.
  if (opts?.origin?.supported === true) {
    const { dualUsePrimary, militaryPrimary } = opts.origin;
    const originPrimaryMatch = jurisdictional.find(
      (m) =>
        !MULTILATERAL_LISTS.has(m.list) &&
        (m.list === dualUsePrimary ||
          (militaryPrimary !== null && m.list === militaryPrimary)),
    );
    if (originPrimaryMatch) {
      const parallel = jurisdictional.filter(
        (m) =>
          m !== originPrimaryMatch &&
          (m.list === "EU_ANNEX_I" || NATIONAL_SUPPLEMENTAL.has(m.list)),
      );
      return {
        primaryAuthority: originPrimaryMatch,
        supersededLists: [],
        parallelLists: parallel,
        multilateralBaseline: multilateral,
        rationale: buildOriginPromotedRationale(
          originPrimaryMatch,
          opts.origin.dualUsePrimary,
          parallel,
          multilateral,
        ),
        disclaimer: DISCLAIMER,
      };
    }
  }

  // ─── Tier 4: EU Annex I ───────────────────────────────────────────
  const annexIMatch = jurisdictional.find((m) => m.list === "EU_ANNEX_I");
  if (annexIMatch) {
    // Key on object identity (m !== annexIMatch) so that non-primary
    // EU_ANNEX_I sibling matches (e.g. a second Annex I entry on the same
    // item) are surfaced as parallel obligations rather than silently
    // dropped. National lists are also parallel (T-M20).
    const parallel = jurisdictional.filter(
      (m) =>
        m !== annexIMatch &&
        (m.list === "EU_ANNEX_I" || NATIONAL_SUPPLEMENTAL.has(m.list)),
    );
    return {
      primaryAuthority: annexIMatch,
      supersededLists: [],
      parallelLists: parallel,
      multilateralBaseline: multilateral,
      rationale: buildAnnexIRationale(annexIMatch, parallel, multilateral),
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Tier 5: National list only ───────────────────────────────────
  const nationalMatch = jurisdictional.find((m) =>
    NATIONAL_SUPPLEMENTAL.has(m.list),
  );
  if (nationalMatch) {
    // If multiple national matches, the first one wins; the rest
    // become parallel (this is rare — most items hit one jurisdiction).
    const otherNational = jurisdictional.filter(
      (m) => m !== nationalMatch && NATIONAL_SUPPLEMENTAL.has(m.list),
    );
    return {
      primaryAuthority: nationalMatch,
      supersededLists: [],
      parallelLists: otherNational,
      multilateralBaseline: multilateral,
      rationale: buildNationalOnlyRationale(
        nationalMatch,
        otherNational,
        multilateral,
      ),
      disclaimer: DISCLAIMER,
    };
  }

  // ─── Fallthrough (unreachable when ListId is exhaustive, but defensive)
  // If we get here, the jurisdictional bucket contained a list that
  // isn't in any of the explicit tiers. Treat as no primary.
  return {
    primaryAuthority: null,
    supersededLists: [],
    parallelLists: [],
    multilateralBaseline: multilateral,
    rationale:
      "Unable to resolve primary authority — no list in input matches a known precedence tier.",
    disclaimer: DISCLAIMER,
  };
}

// ─── Soft-integration helper ────────────────────────────────────────

/**
 * Map a `RegimeName` from the cross-walk (Z3b) to a `ListId` used by
 * this engine. Useful when the parametric matcher's `CandidateMatch[]`
 * needs to be passed through the order-of-review engine — call this
 * for each candidate's `entry.regime` to construct the `ListMatch[]`.
 *
 * Returns `null` for `"OTHER"` and any unmapped regime tag, which the
 * caller should drop from the input (those matches don't carry
 * jurisdictional precedence anyway).
 *
 * @example
 *   import type { CandidateMatch } from "./parametric-matcher";
 *
 *   const matches: ListMatch[] = candidates
 *     .map((c) => {
 *       const list = normalizeListId(c.entry.regime);
 *       if (!list) return null;
 *       return {
 *         list,
 *         entry: c.entry.canonicalId,
 *         citation: c.entry.citation,
 *       };
 *     })
 *     .filter((m): m is ListMatch => m !== null);
 *
 *   const resolved = resolveOrderOfReview(matches);
 */
export function normalizeListId(regimeName: string): ListId | null {
  switch (regimeName) {
    case "ITAR-USML":
      return "USML";
    case "EAR-CCL":
      return "EAR_CCL";
    case "EU-ANNEX-I":
      return "EU_ANNEX_I";
    case "DE-AL-TEIL-IB":
    case "DE-AL-TEIL-IA":
    case "DE-AUSFUHRLISTE":
      return "DE_AUSFUHRLISTE";
    case "JP-METI":
      return "JP_METI";
    case "UK-STRATEGIC":
    case "UK-STRATEGIC-EXPORT":
      return "UK_STRATEGIC";
    case "MTCR-ANNEX":
    case "MTCR":
      return "MTCR";
    case "WASSENAAR":
      return "WASSENAAR";
    case "NSG":
    case "NSG-TRIGGER":
    case "NSG-DU":
      return "NSG";
    case "AG":
    case "AUSTRALIA-GROUP":
      return "AG";
    case "EU-ANNEX-IV":
      return "EU_ANNEX_IV";
    case "EU-CML":
      return "EU_CML";
    case "CA-ECL":
      return "CA_ECL";
    case "AU-DSGL":
      return "AU_DSGL";
    case "KR-STRATEGIC":
      return "KR_STRATEGIC";
    case "CH-GKV":
      return "CH_GKV";
    case "NO-LIST":
      return "NO_LIST";
    case "IN-SCOMET":
      return "IN_SCOMET";
    default:
      return null;
  }
}

/**
 * `seeAlso` cross-link for the license-determination layer. Given a
 * resolved order-of-review result, surface the *enforcement* jurisdiction
 * the operator should target. Returns a structured handoff:
 *
 *   - `USML` primary → DDTC (State Dept) is the authority
 *   - `EAR_CCL` primary → BIS is the authority
 *   - `EU_ANNEX_IV` primary → operator's national competent authority
 *     enforces the prohibition; sanctions desk consultation required
 *   - `EU_ANNEX_I` primary → national competent authority (BAFA for DE,
 *     ECJU for UK, etc.) — passes through to the EU framework
 *   - `DE_AUSFUHRLISTE` primary → BAFA
 *   - `JP_METI` primary → METI (Trade and Economic Cooperation Bureau)
 *   - `UK_STRATEGIC` primary → ECJU
 *   - `EU_CML` primary → null (licensing authority is the member state's —
 *     BAFA/DGA/etc.; no single EU hint)
 *   - `CA_ECL` primary → Global Affairs Canada
 *   - `AU_DSGL` primary → Defence Export Controls (Australia)
 *   - `KR_STRATEGIC` primary → MOTIE (Korea)
 *   - `CH_GKV` primary → SECO (Switzerland)
 *   - `NO_LIST` primary → Norwegian Ministry of Foreign Affairs
 *   - `IN_SCOMET` primary → DGFT (India)
 *   - `null` primary → operator must trace through multilateral to a
 *     national implementation; this helper returns `null` in that case.
 *   - Multilateral lists (WASSENAAR, MTCR, NSG, AG) cannot be primary —
 *     their cases are included for exhaustiveness only and return null.
 *
 * This is a SOFT integration — it does not call the license-
 * determination engine, just maps the precedence result onto its
 * authority taxonomy. Use it to enrich UI surfaces with the
 * "this routes to BIS / DDTC / BAFA / ..." breadcrumb.
 *
 * The switch is EXHAUSTIVE over ListId — adding a new ListId without a
 * case here is a compile error (satisfies never guard).
 */
export function deriveLicenseAuthorityHint(
  result: OrderOfReviewResult,
): string | null {
  if (!result.primaryAuthority) return null;
  const list = result.primaryAuthority.list;
  switch (list) {
    case "USML":
      return "DDTC";
    case "EAR_CCL":
      return "BIS";
    case "EU_ANNEX_IV":
    case "EU_ANNEX_I":
      return "EU_COMPETENT_AUTHORITY";
    case "DE_AUSFUHRLISTE":
      return "BAFA";
    case "JP_METI":
      return "METI";
    case "UK_STRATEGIC":
      return "ECJU";
    // EU_CML: licensing authority is the member state's (BAFA/DGA/etc.); no single EU hint
    case "EU_CML":
      return null;
    case "CA_ECL":
      return "Global Affairs Canada";
    case "AU_DSGL":
      return "Defence Export Controls (Australia)";
    case "KR_STRATEGIC":
      return "MOTIE (Korea)";
    case "CH_GKV":
      return "SECO (Switzerland)";
    case "NO_LIST":
      return "Norwegian Ministry of Foreign Affairs";
    case "IN_SCOMET":
      return "DGFT (India)";
    // Multilateral lists are informational and can never be primary.
    // These cases exist only for exhaustiveness (satisfies-never guard).
    case "WASSENAAR":
    case "MTCR":
    case "NSG":
    case "AG":
      return null;
    default: {
      // Exhaustiveness guard: if a new ListId is added without a case above,
      // this line becomes a compile error because `list` would not satisfy `never`.
      const _exhaustive: never = list;
      return _exhaustive;
    }
  }
}

// ─── Internal helpers ───────────────────────────────────────────────

/**
 * Deduplicate matches by (list, entry). The first occurrence wins —
 * its citation is preserved. Keeps the output deterministic when the
 * same item is matched by multiple upstream engines.
 */
function dedupeMatches(matches: readonly ListMatch[]): ListMatch[] {
  const seen = new Set<string>();
  const out: ListMatch[] = [];
  for (const m of matches) {
    const key = `${m.list}::${m.entry}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

function formatList(matches: readonly ListMatch[]): string {
  if (matches.length === 0) return "";
  return matches.map((m) => `${m.list} ${m.entry}`).join(", ");
}

function buildUsmlRationale(
  primary: ListMatch,
  superseded: readonly ListMatch[],
  multilateral: readonly ListMatch[],
): string {
  const parts = [
    `Item matches the US Munitions List (USML ${primary.entry}). Per 22 CFR § 120.5 and 15 CFR § 734.3(a)(1), ITAR has exclusive jurisdiction over USML-described articles. DDTC authorization is required regardless of any parallel dual-use classification.`,
  ];
  if (superseded.length > 0) {
    parts.push(
      `Superseded by ITAR: ${formatList(superseded)}. Those classifications do not authorize the export and cannot be relied upon while the USML description applies.`,
    );
  }
  if (multilateral.length > 0) {
    parts.push(
      `Multilateral baseline (informational): ${formatList(multilateral)}. These regimes are implemented through national regulations and do not control on their own.`,
    );
  }
  return parts.join(" ");
}

function buildAnnexIvRationale(
  primary: ListMatch,
  superseded: readonly ListMatch[],
  multilateral: readonly ListMatch[],
): string {
  const parts = [
    `Item matches Council Reg. (EU) 833/2014 Annex IV (entry ${primary.entry}). This is a sanctions PROHIBITION list — when the destination is Russia or Belarus, no licence is available; the export is prohibited outright. This trumps all licensing regimes for in-scope destinations.`,
  ];
  if (superseded.length > 0) {
    parts.push(
      `Superseded by sanctions: ${formatList(superseded)}. Licensing analysis under those regimes is moot while the Annex IV prohibition applies to the destination.`,
    );
  }
  if (multilateral.length > 0) {
    parts.push(
      `Multilateral baseline (informational): ${formatList(multilateral)}.`,
    );
  }
  parts.push(
    "Note: the Annex IV trump is destination-conditional. The license-determination layer must confirm the actual destination before applying the prohibition.",
  );
  return parts.join(" ");
}

function buildEarRationale(
  primary: ListMatch,
  parallel: readonly ListMatch[],
  multilateral: readonly ListMatch[],
): string {
  const parts = [
    `Item matches the EAR Commerce Control List (ECCN ${primary.entry}). Per 15 CFR § 734.3(a), the EAR governs US-origin dual-use items that are not described in the USML. BIS authorization (specific license, license exception, or NLR) is required for export to controlled destinations.`,
  ];
  if (parallel.length > 0) {
    parts.push(
      `Parallel jurisdictional classifications: ${formatList(parallel)}. Each jurisdiction binds its own export operation — the EAR governs the US re-export, while EU/national regimes govern the EU export. Both must be cleared.`,
    );
  }
  if (multilateral.length > 0) {
    parts.push(
      `Multilateral baseline (informational): ${formatList(multilateral)}.`,
    );
  }
  return parts.join(" ");
}

function buildAnnexIRationale(
  primary: ListMatch,
  parallel: readonly ListMatch[],
  multilateral: readonly ListMatch[],
): string {
  const parts = [
    `Item matches EU Reg. 2021/821 Annex I (entry ${primary.entry}). This is the primary EU dual-use control list (Art. 3). The national competent authority (BAFA for DE, ECJU for UK, etc.) issues the licence.`,
  ];
  if (parallel.length > 0) {
    parts.push(
      `Parallel national supplemental controls: ${formatList(parallel)}. National lists sit on top of the EU regime per EU Reg. 2021/821 Art. 9 / Art. 10. Both must be cleared.`,
    );
  }
  if (multilateral.length > 0) {
    parts.push(
      `Multilateral baseline (informational): ${formatList(multilateral)}.`,
    );
  }
  return parts.join(" ");
}

function buildNationalOnlyRationale(
  primary: ListMatch,
  otherNational: readonly ListMatch[],
  multilateral: readonly ListMatch[],
): string {
  const parts = [
    `Item matches ${primary.list} (entry ${primary.entry}). No higher-tier list (USML, Annex IV, EAR, Annex I) matched, so this national control governs on its own.`,
  ];
  if (otherNational.length > 0) {
    parts.push(
      `Additional national-list matches: ${formatList(otherNational)}. If the operation crosses multiple member-state borders, each national clearance applies.`,
    );
  }
  if (multilateral.length > 0) {
    parts.push(
      `Multilateral baseline (informational): ${formatList(multilateral)}.`,
    );
  }
  parts.push(
    "Note: in practice, national lists usually appear ALONGSIDE an EU Annex I primary. A national-only match should be reviewed — the EU-level scan may have under-classified.",
  );
  return parts.join(" ");
}

function buildMultilateralOnlyRationale(
  multilateral: readonly ListMatch[],
): string {
  return `Item matches only multilateral baseline lists: ${formatList(multilateral)}. These regimes (Wassenaar / MTCR / NSG / AG) are NEVER a standalone control authority — they are implemented through national regulations. No primary authority can be assigned from this input alone. The operator must trace each multilateral entry to the corresponding national implementing regulation (EAR / Annex I / DE Ausfuhrliste / etc.) before licensing analysis proceeds.`;
}

function buildOriginPromotedRationale(
  primary: ListMatch,
  originRegimePrimary: ListId,
  parallel: readonly ListMatch[],
  multilateral: readonly ListMatch[],
): string {
  const parts = [
    `Item matches ${primary.list} (entry ${primary.entry}). primary chosen because exporter seat regime ${originRegimePrimary} governs — the exporter's jurisdictional seat determines the applicable export law. Higher-tier lists (USML, Annex IV, EAR) are not present for this item.`,
  ];
  if (parallel.length > 0) {
    parts.push(
      `Parallel controls: ${formatList(parallel)}. These apply in addition to the origin-seat regime and must also be cleared.`,
    );
  }
  if (multilateral.length > 0) {
    parts.push(
      `Multilateral baseline (informational): ${formatList(multilateral)}.`,
    );
  }
  return parts.join(" ");
}
