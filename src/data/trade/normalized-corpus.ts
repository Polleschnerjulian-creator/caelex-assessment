/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Normalized control-list corpus union (DCW-1 / P0-A).
 *
 * The Passage classifier reasons over the parametric CONTROL_LIST_CROSS_WALK
 * (predicate-driven) plus EU Annex I / NSG / Russia-833. The richer control
 * lists below have NO classifier consumer, so a declared ITAR USML XV(e)
 * paragraph, a Wassenaar ML code, a Japan METI / India SCOMET code, or a
 * German Ausfuhrliste position resolves to NOTHING in the classification
 * layer.
 *
 * This file is the data-model BRIDGE: it normalizes every such corpus into a
 * single flat `NormalizedCorpusEntry` shape so a code/keyword matcher
 * (corpus-code-matcher.ts) can look codes up across all of them. It does NOT
 * feed the parametric matcher — entries here have no predicates, and the
 * parametric matcher refutes any predicate-less entry by design. The matcher
 * built on this union is a SEPARATE, code/keyword path that the classifier
 * merges alongside the parametric candidates.
 *
 * Pure data transformation — no I/O, no Claude, zero external cost.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { ClassificationEntry } from "./schema";
import { US_CCL_ENTRIES } from "./us-ccl";
import { USML_ENTRIES } from "./usml";
import { MTCR_ANNEX_ENTRIES } from "./mtcr";
import { DE_ANLAGE_AL_ENTRIES } from "./de-anlage-al";
import { USML_XV_E_ENUMERATION, USML_XV_E_AS_OF_DATE } from "./usml-xv-e";
import {
  USML_XV_BCDF_ENUMERATION,
  USML_XV_BCDF_AS_OF_DATE,
} from "./usml-xv-bcdf";
import { USML_XV_GH_ENTRIES, USML_XV_GH_AS_OF } from "./usml-xv-gh";
import { USML_XV_I_ENTRIES, USML_XV_I_AS_OF } from "./usml-xv-i";
import { USML_IV_ENUMERATION, USML_IV_AS_OF_DATE } from "./usml-iv";
import { WASSENAAR_CAT6_9_ENTRIES } from "./wassenaar-cat6-9";
import { JAPAN_METI_ENTRIES } from "./japan-meti";
import { INDIA_SCOMET_ENTRIES, INDIA_SCOMET_AS_OF } from "./india-scomet";
import {
  DE_AUSFUHRLISTE_ENTRIES,
  DE_AUSFUHRLISTE_AS_OF,
} from "./de-ausfuhrliste";
import {
  UK_STRATEGIC_ENTRIES,
  UK_STRATEGIC_AS_OF,
  type UkStrategicEntry,
} from "./uk-strategic";
import { EU_CML_ENTRIES, EU_CML_AS_OF, type EuCmlEntry } from "./eu-cml";
import type { MirrorEntry } from "./mirror-entry";
import { CH_GKV_ENTRIES } from "./ch-gkv";
import { EU_ANNEX_I_ENTRIES } from "./eu-annex-i";
import { EU_ANNEX_I_CAT1_2_ENTRIES } from "./eu-annex-i-cat1-2";
import { EU_ANNEX_I_CAT3_ENTRIES } from "./eu-annex-i-cat3";
import {
  EU_ANNEX_I_CAT4_ENTRIES,
  EU_ANNEX_I_CAT7_ENTRIES,
} from "./eu-annex-i-cat4-7";
import { EU_ANNEX_I_CAT5_ENTRIES } from "./eu-annex-i-cat5";
import { EU_ANNEX_I_CAT6_ENTRIES } from "./eu-annex-i-cat6";
import {
  NSG_TRIGGER_LIST_ENTRIES,
  NSG_DUAL_USE_ENTRIES,
  type NsgEntry,
} from "./nsg-trigger-dual-use";
import {
  RUSSIA_833_ANNEX_VII_ENTRIES,
  RUSSIA_833_ANNEX_XXIII_ENTRIES,
  RUSSIA_833_ANNEX_XXIX_ENTRIES,
  type Russia833Entry,
} from "./russia-833-deep-annexes";

// ─── Types ──────────────────────────────────────────────────────────

export type CorpusRegime =
  | "US_CCL"
  | "USML"
  | "MTCR_ANNEX"
  | "DE_ANLAGE_AL"
  | "USML_XV"
  | "WASSENAAR"
  | "JP_METI"
  | "IN_SCOMET"
  | "DE_AUSFUHRLISTE"
  | "EU_ANNEX_I"
  | "NSG"
  | "RU_833"
  | "UK_STRATEGIC"
  | "EU_CML"
  | "CA_ECL"
  | "AU_DSGL"
  | "KR_STRATEGIC"
  | "CH_GKV"
  | "NO_LIST";

/**
 * Kuratierungs-Reife je Regime. 3 = headline/leer ⇒ Fail-Closed-Regel 4.3a (REVIEW).
 * Jeder Daten-Sprint (S1–S6) hebt sein Regime und passt den Test an — der Test
 * dokumentiert den Reifegrad bewusst.
 */
export const REGIME_MATURITY: Record<CorpusRegime, 1 | 2 | 3> = {
  USML_XV: 1,
  // MTCR Annex curated at item/sub-item level (Items 1–20) against the
  // 2024-03-14 Annex — Data-Sprint S1 lifted it from headline (3) to Tier 1.
  MTCR_ANNEX: 1,
  // Data-Sprint S2 lifted USML 2 → 1: the two space-relevant USML categories
  // are now both at paragraph depth — Cat XV (spacecraft) across the
  // `usml-xv-*` files (already Tier 1) and Cat IV (launch vehicles / rocket
  // propulsion / parts) via `usml-iv.ts` (66 paragraphs, eCFR 2026-06-09).
  // The remaining `USML`-regime rows (coarse Cat XI/XII cross-references in
  // `usml.ts`) are peripheral military-electronics/navigation entries, not the
  // space launch+spacecraft spine. SAFETY: no circle-A origin has
  // `dualUsePrimary === "USML"` (US's dual-use leg is EAR_CCL→US_CCL, Tier 2),
  // so `isThinOrigin` (which reads dualUsePrimary only) is unaffected — this
  // lift cannot flip any golden-set thin-origin cell.
  USML: 1,
  US_CCL: 2,
  EU_ANNEX_I: 2,
  RU_833: 2,
  NSG: 2,
  WASSENAAR: 2,
  DE_ANLAGE_AL: 3,
  DE_AUSFUHRLISTE: 3,
  JP_METI: 3,
  IN_SCOMET: 3,
  // Data-Sprint S3 curated the UK Strategic Export Control List space slice
  // (123 verified entries: 109 dual-use + 8 ML + 6 PL, edition 2025-12-16) — yet UK_STRATEGIC is
  // DELIBERATELY KEPT AT TIER 3, overriding the plan's "→ 2" parameter.
  //
  // WHY (fail-closed safety, not a data gap): the curated corpus makes UK
  // codes RESOLVABLE (a declared 9A004 from a GB seat now yields
  // `UK_STRATEGIC:9A004` chips in classification), but the determination
  // engine has NO UK-origin LICENCE logic yet. Post-Brexit, a UK→EU dual-use
  // export REQUIRES a UK (ECJU) licence in its own right; Gate 4.5
  // (thin-origin REVIEW) is currently the ONLY guard that produces a review
  // for a GB-seat controlled export. Lifting maturity to 2 would silence
  // Gate 4.5, and — because Gate 3.5's dual-use leg does not fire for an
  // intra-EU destination — a GB→DE declared-9A004 cell would silently become
  // GO: a false-CLEARED-class bug. Keeping Tier 3 means GB customers get
  // precise UK ratings/chips in classification while their verdicts stay
  // fail-closed REVIEW until the licence engine exists.
  //
  // LIFT-CONDITION: raise to 2 only once UK-origin licence determination is
  // modelled (engine phase, post-S7). The golden-set EXACT pin
  // `sat-bus|GB|DE = REVIEW` guards this invariant against a premature lift.
  UK_STRATEGIC: 3,
  // Data-Sprint S4 curated the EU Common Military List space slice (25 verified
  // entries across 10 ML positions, edition OJ C/2026/1640 adopted 2026-02-23)
  // and LIFTS EU_CML 3 → 2 — the plan's parameter, PROVEN safe (unlike the UK
  // corpus, which stays Tier 3 because GB-origin licence logic does not exist).
  //
  // WHY THE LIFT IS SAFE (golden spike byte-identical 74/396/274 GO/REVIEW/
  // BLOCKED, before == after):
  //   • Gate 4.5 (thin-origin REVIEW) consults EU_CML only on its MILITARY leg,
  //     and only when `exporterOrigin.militaryPrimary === "EU_CML"` (i.e. an EU
  //     seat) AND the item has USML/ITAR signals (declared usmlCategory OR the
  //     ITAR heuristic fired). ML codes are NOT a declared-code field, so no
  //     verdict path keys on an EU_CML code match alone.
  //   • Those exact trigger items are INDEPENDENTLY guarded: (a) a declared
  //     usmlCategory ⇒ Gate 3.5 adds a DDTC review for ANY destination (no
  //     intra-EU exemption); (b) an ITAR-heuristic item ⇒ AVA `itarBlock`
  //     hard-BLOCKs it. Either dominates the thin-origin REVIEW that the lift
  //     removes, so the lift cannot turn a REVIEW into GO or a BLOCKED into
  //     anything lower.
  //   • `isThinOrigin` reads `dualUsePrimary` ONLY; for EU seats that is
  //     EU_ANNEX_I (Tier 2, unchanged), so the golden thin-set is untouched.
  // The maturity test's "new tier-3" set drops from 7 to 6 (EU_CML leaves it).
  EU_CML: 2,
  CA_ECL: 3,
  AU_DSGL: 3,
  KR_STRATEGIC: 3,
  // CH_GKV is dualUsePrimary for CH-origin items; the engine has NO Swiss (SECO)
  // origin-licence logic yet, so Gate 4.5 (thin-origin REVIEW) is the ONLY guard
  // for a CH-seat controlled export. Lifting to 2 would silently turn CH→friendly-
  // dest dual-use into GO — the same false-CLEARED-class bug the UK S3 lesson documents.
  // LIFT-CONDITION: raise to 2 once CH-origin SECO licence determination is modelled.
  CH_GKV: 3,
  NO_LIST: 3,
};

/**
 * The one flat shape every control-list corpus normalizes to. Only fields
 * that a code/keyword matcher + a UI chip need — NOT a full re-modelling.
 */
export interface NormalizedCorpusEntry {
  /** Stable union key: `${regime}:${code}` (guaranteed unique in the union). */
  canonicalId: string;
  /** The corpus-native code / paragraph / position string. */
  code: string;
  regime: CorpusRegime;
  /** Human list label for UI ("USML Cat. XV(e)", "Wassenaar DUL", ...). */
  list: string;
  title: string;
  description: string;
  /**
   * EAR/EU control-reason codes (NS/MT/...) when the corpus carries them;
   * [] when it does not. We never fabricate a reason a corpus lacks.
   */
  controlReason: string[];
  sourceUrl: string;
  asOfDate: string;
  /** True for USML / USML-XV (ITAR). Drives the determination-side ITAR flag. */
  isItar: boolean;
  /** MTCR category when known. */
  mtcrCategory?: "I" | "II" | null;
  /** ITAR Significant Military Equipment (USML XV(g)/(h)/(i)). */
  itarSME?: boolean;
  /** 22 CFR 123.1(b) see-through trigger (only USML XV(e)(17)). */
  isSeeThroughTrigger?: boolean;
  /** Cross-walk hooks already present on some corpora. */
  euAnnexIRef?: string;
  earCclRef?: string;
  usmlRef?: string;
  /** Kuratierungs-Tiefe dieses Eintrags (Spec 2026-06-12 §4.1): 1=Paragraph+Prädikate, 2=Code-Ebene, 3=Headline. */
  depthTier?: 1 | 2 | 3;
  /** Mirror-Architektur: canonicalId des Quell-Eintrags (z. B. "WASSENAAR:9A004"), wenn dieser Eintrag eine nationale Spiegelung ist. */
  mirrorsCanonicalId?: string;
  /** Delta-Typ der Spiegelung; Pflichtfeld-Beschreibung bei MODIFIED/NATIONAL_ONLY wird im Mirror-Adapter erzwungen (S5). */
  mirrorDelta?: "NONE" | "MODIFIED" | "NATIONAL_ONLY";
}

// Shared USML eCFR source for the paragraph-keyed XV files (their file-level
// SOURCE_URL const is module-private; the entries themselves carry no url).
const USML_ECFR_URL =
  "https://www.ecfr.gov/current/title-22/chapter-I/subchapter-M/part-121/section-121.1";
const BAFA_AL_URL =
  "https://www.bafa.de/DE/Aussenwirtschaft/Ausfuhrkontrolle/Gueterlisten/gueterlisten_node.html";

// ─── Adapters (one per corpus shape family) ─────────────────────────

/** B2 ClassificationEntry corpora (US CCL / USML / MTCR / DE Anlage AL). */
function adaptClassificationEntries(
  entries: readonly ClassificationEntry[],
  regime: CorpusRegime,
  list: string,
): NormalizedCorpusEntry[] {
  return entries.map((e) => ({
    canonicalId: `${regime}:${e.code}`,
    code: e.code,
    regime,
    list,
    title: e.title,
    description: e.description,
    controlReason: [...e.controlReasons],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate,
    isItar: regime === "USML",
    mtcrCategory: e.mtcrCategory ?? null,
  }));
}

/**
 * Paragraph-keyed USML enumerations (XV: e / b-c-d-f / g-h / i — and, since
 * Data-Sprint S2, Category IV).
 *
 * `opts.regime` defaults to `"USML_XV"` so the four existing XV call-sites are
 * byte-identical. Category IV passes `regime: "USML"` (it is a different USML
 * category, not the post-ECR XV remainder) — the canonicalId prefix follows
 * the regime, giving `USML:IV(...)` keys that intentionally collide with the
 * coarse `usml.ts` Cat IV entries so the richer paragraph-depth entries can
 * win the union's de-dup when ordered first (see the union assembly).
 */
function adaptUsmlXv(
  entries: ReadonlyArray<{
    paragraph: string;
    title: string;
    description: string;
    ear600SeriesCounterpart?: string;
    itarSME?: boolean;
    isSeeThroughTrigger?: boolean;
    sourceUrl?: string;
  }>,
  list: string,
  asOfDate: string,
  opts: {
    regime?: Extract<CorpusRegime, "USML" | "USML_XV">;
    depthTier?: 1 | 2 | 3;
  } = {},
): NormalizedCorpusEntry[] {
  const regime = opts.regime ?? "USML_XV";
  return entries.map((e) => ({
    canonicalId: `${regime}:${e.paragraph}`,
    code: e.paragraph,
    regime,
    list,
    title: e.title,
    description: e.description,
    controlReason: [],
    sourceUrl: e.sourceUrl ?? USML_ECFR_URL,
    asOfDate,
    isItar: true,
    itarSME: e.itarSME,
    isSeeThroughTrigger: e.isSeeThroughTrigger,
    earCclRef: e.ear600SeriesCounterpart,
    depthTier: opts.depthTier,
  }));
}

function adaptWassenaar(): NormalizedCorpusEntry[] {
  return WASSENAAR_CAT6_9_ENTRIES.map((e) => ({
    canonicalId: `WASSENAAR:${e.code}`,
    code: e.code,
    regime: "WASSENAAR" as const,
    list: e.list === "ML" ? "Wassenaar Munitions (ML)" : "Wassenaar Dual-Use",
    title: e.title,
    description: e.description,
    controlReason: [],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate,
    isItar: false,
    euAnnexIRef: e.euAnnexIRef,
    earCclRef: e.earCclRef,
  }));
}

function adaptJapanMeti(): NormalizedCorpusEntry[] {
  return JAPAN_METI_ENTRIES.map((e) => ({
    canonicalId: `JP_METI:${e.code}`,
    code: e.code,
    regime: "JP_METI" as const,
    list: `Japan METI Schedule ${e.schedule}`,
    title: e.title,
    description: e.description,
    controlReason: [],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate,
    isItar: false,
    euAnnexIRef: e.euAnnexIRef,
    earCclRef: e.earCclRef,
  }));
}

function adaptIndiaScomet(): NormalizedCorpusEntry[] {
  return INDIA_SCOMET_ENTRIES.map((e) => ({
    canonicalId: `IN_SCOMET:${e.code}`,
    code: e.code,
    regime: "IN_SCOMET" as const,
    list: `India SCOMET Cat. ${e.category}`,
    title: e.title,
    description: e.description,
    controlReason: [],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate ?? INDIA_SCOMET_AS_OF,
    isItar: false,
    euAnnexIRef: e.euAnnexIRef,
    earCclRef: e.earCclRef,
  }));
}

/**
 * UK Strategic Export Control List (consolidated edition 2025-12-16) — the
 * space slice across the three UK component schemes (dual-use Annex I, the
 * UK Military List ML positions, and UK national PL ratings). Data-Sprint S3.
 *
 * `depthTier: 2` (code-level) on every entry — the corpus is curated at code
 * depth, not paragraph+predicate depth. The UK control-reason letters
 * (NS/MT/NP/CB and the UK-only NAT for PL ratings) pass straight onto the
 * flat `controlReason` array (no fabrication — they come from the source's
 * bracketed regime letters). The `list` label is uniform so the UI chips read
 * "UK Strategic Export Control List" regardless of which component scheme a
 * code came from; the scheme itself is recoverable from the code shape.
 *
 * NOTE ON MATURITY: this corpus is RESOLVABLE in the matcher (a declared
 * 9A004 from a GB seat now yields `UK_STRATEGIC:9A004` chips), but
 * `REGIME_MATURITY.UK_STRATEGIC` stays 3 on purpose — see the comment block
 * on REGIME_MATURITY above (Gate 4.5 must keep producing fail-closed REVIEW
 * for GB-seat exports until UK-origin licence logic exists).
 */
function adaptUkStrategic(
  entries: readonly UkStrategicEntry[],
): NormalizedCorpusEntry[] {
  return entries.map((e) => ({
    canonicalId: `UK_STRATEGIC:${e.code}`,
    code: e.code,
    regime: "UK_STRATEGIC" as const,
    list: "UK Strategic Export Control List",
    title: e.title,
    description: e.description,
    controlReason: [...e.controlReason],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate ?? UK_STRATEGIC_AS_OF,
    isItar: false,
    mtcrCategory: e.mtcrCategory ?? null,
    euAnnexIRef: e.euAnnexIRef,
    depthTier: 2,
  }));
}

/**
 * EU Common Military List (Data-Sprint S4). Mirrors `adaptUkStrategic`: an own
 * slim source type (`EuCmlEntry`, since `ClassificationEntry.jurisdiction` has
 * no EU-CML member), normalized to the flat corpus shape. The control-reason
 * tags (MIL / MT) pass straight onto `controlReason` (no fabrication — derived
 * from each position's subject matter). The `list` label is uniform so UI chips
 * read "EU Gemeinsame Militärgüterliste" regardless of ML position; `isItar`
 * is false (this is the EU, not ITAR).
 *
 * NOTE ON MATURITY: unlike the UK corpus (kept Tier 3), EU_CML is lifted to
 * Tier 2 — see the REGIME_MATURITY comment block above for the safety proof
 * (the military leg's only fail-closed dropper is independently guarded by
 * Gate 3.5 DDTC + AVA itarBlock; golden spike byte-identical 74/396/274).
 */
function adaptEuCml(entries: readonly EuCmlEntry[]): NormalizedCorpusEntry[] {
  return entries.map((e) => ({
    canonicalId: `EU_CML:${e.code}`,
    code: e.code,
    regime: "EU_CML" as const,
    list: "EU Gemeinsame Militärgüterliste",
    title: e.title,
    description: e.description,
    controlReason: [...e.controlReason],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate ?? EU_CML_AS_OF,
    isItar: false,
    depthTier: 2,
  }));
}

function adaptDeAusfuhrliste(): NormalizedCorpusEntry[] {
  return DE_AUSFUHRLISTE_ENTRIES.map((e) => ({
    canonicalId: `DE_AUSFUHRLISTE:${e.position}`,
    code: e.position,
    regime: "DE_AUSFUHRLISTE" as const,
    list:
      e.section === "A"
        ? "DE Ausfuhrliste Teil I A"
        : "DE Ausfuhrliste Teil I B",
    title: e.title,
    description: e.description,
    controlReason: [],
    sourceUrl: BAFA_AL_URL,
    asOfDate: DE_AUSFUHRLISTE_AS_OF,
    isItar: false,
    euAnnexIRef: e.euAnnexIRef,
    earCclRef: e.earRef,
    usmlRef: e.usmlRef,
  }));
}

/** NSG Trigger List (Part 1) + Dual-Use (Part 2) — INFCIRC/254. */
function adaptNsg(entries: readonly NsgEntry[]): NormalizedCorpusEntry[] {
  return entries.map((e) => ({
    canonicalId: `NSG:${e.code}`,
    code: e.code,
    regime: "NSG" as const,
    list:
      e.list === "TRIGGER"
        ? "NSG Trigger List (Part 1)"
        : "NSG Dual-Use (Part 2)",
    title: e.title,
    description: e.description,
    controlReason: [],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate,
    isItar: false,
    euAnnexIRef: e.euAnnexIRef,
    earCclRef: e.earCclRef,
  }));
}

/** EU Reg. 833/2014 (Russia) deep-annex entries (VII / XXIII / XXIX). */
function adaptRussia833(
  entries: readonly Russia833Entry[],
): NormalizedCorpusEntry[] {
  return entries.map((e) => ({
    canonicalId: `RU_833:${e.code}`,
    code: e.code,
    regime: "RU_833" as const,
    list: "EU Reg. 833/2014 (Russia)",
    title: e.title,
    description: e.description,
    controlReason: [],
    sourceUrl: e.sourceUrl,
    asOfDate: e.asOfDate,
    isItar: false,
  }));
}

/**
 * Mirror adapter (Data-Sprint S5 — MIRROR ARCHITECTURE FOUNDATION).
 *
 * Resolves a per-country `MirrorEntry[]` against the ALREADY-BUILT union base
 * and produces `NormalizedCorpusEntry` rows under the country's own regime.
 * This is the architecture the S5 fan-out (NO_LIST, CA_ECL, AU_DSGL,
 * KR_STRATEGIC) follows: a national list that adopts the multilateral / EU
 * dual-use numbering verbatim declares each code as a MIRROR of an existing
 * union entry instead of re-typing the control text (wasteful + fabrication
 * risk).
 *
 * `baseByCanonicalId` MUST be the lookup map over the NON-mirror base
 * (constructed in the union assembly before any mirror adapter runs). The
 * union assembly is ordered base-first precisely so this resolution can never
 * see a half-built union.
 *
 *   • "NONE"          — inherits title/description/controlReason from the
 *                       resolved source; carries the NATIONAL code, list,
 *                       regime, sourceUrl + depthTier. Throws on a dangling
 *                       `mirrorsCanonicalId` (the fail-fast the invariant test
 *                       relies on).
 *   • "MODIFIED"      — like NONE but title/description come from the ENTRY's
 *                       own text (REQUIRED). Still resolves the source for
 *                       linkage; throws if dangling.
 *   • "NATIONAL_ONLY" — no source lookup; title + description REQUIRED on the
 *                       entry (throws if absent); no `mirrorsCanonicalId`.
 *
 * The optional `controlReason` on the entry REPLACES the inherited reasons when
 * present; otherwise NONE/MODIFIED inherit the source's reasons and
 * NATIONAL_ONLY defaults to [] (never fabricated).
 */
export function adaptMirrorEntries(
  entries: readonly MirrorEntry[],
  baseByCanonicalId: ReadonlyMap<string, NormalizedCorpusEntry>,
  opts: { regime: CorpusRegime; list: string; depthTier?: 1 | 2 | 3 },
): NormalizedCorpusEntry[] {
  const { regime, list, depthTier } = opts;
  return entries.map((e) => {
    const canonicalId = `${regime}:${e.nationalCode}`;

    if (e.mirrorDelta === "NATIONAL_ONLY") {
      if (!e.title || !e.description) {
        throw new Error(
          `Mirror NATIONAL_ONLY entry ${canonicalId} must carry its own title + description`,
        );
      }
      return {
        canonicalId,
        code: e.nationalCode,
        regime,
        list,
        title: e.title,
        description: e.description,
        controlReason: e.controlReason ? [...e.controlReason] : [],
        sourceUrl: e.sourceUrl,
        asOfDate: e.asOfDate,
        isItar: false,
        depthTier,
        mirrorDelta: e.mirrorDelta,
      };
    }

    // NONE + MODIFIED both require a resolvable source for linkage.
    if (!e.mirrorsCanonicalId) {
      throw new Error(
        `Mirror entry ${canonicalId} (${e.mirrorDelta}) must declare mirrorsCanonicalId`,
      );
    }
    const source = baseByCanonicalId.get(e.mirrorsCanonicalId);
    if (!source) {
      throw new Error(
        `Dangling mirror: ${canonicalId} mirrors "${e.mirrorsCanonicalId}", which does not exist in the corpus base`,
      );
    }

    if (e.mirrorDelta === "MODIFIED") {
      if (!e.title || !e.description) {
        throw new Error(
          `Mirror MODIFIED entry ${canonicalId} must carry its own title + description`,
        );
      }
    }

    const title = e.mirrorDelta === "MODIFIED" ? e.title! : source.title;
    const description =
      e.mirrorDelta === "MODIFIED" ? e.description! : source.description;
    const controlReason = e.controlReason
      ? [...e.controlReason]
      : [...source.controlReason];

    return {
      canonicalId,
      code: e.nationalCode,
      regime,
      list,
      title,
      description,
      controlReason,
      sourceUrl: e.sourceUrl,
      asOfDate: e.asOfDate,
      isItar: false,
      depthTier,
      mirrorsCanonicalId: e.mirrorsCanonicalId,
      mirrorDelta: e.mirrorDelta,
    };
  });
}

// ─── The union ──────────────────────────────────────────────────────

/**
 * Every control-list corpus, normalized + concatenated. De-duplicated by
 * canonicalId (regime+code makes collisions impossible across regimes, but
 * we de-dup defensively; the test asserts uniqueness).
 */
export const NORMALIZED_CORPUS_UNION: NormalizedCorpusEntry[] = (() => {
  // ── BASE (all NON-mirror adapters) ──────────────────────────────────
  // Built + de-duped FIRST so the mirror adapters (S5) resolve their
  // `mirrorsCanonicalId` against a complete, stable base. Ordering matters:
  // a mirror entry that points at a base code which is not yet present would
  // throw a dangling-mirror Error — base-first guarantees the whole base
  // exists before any mirror resolution runs.
  const base: NormalizedCorpusEntry[] = [
    ...adaptClassificationEntries(US_CCL_ENTRIES, "US_CCL", "EAR CCL"),
    // Data-Sprint S2 — USML Category IV at paragraph depth (regime "USML",
    // `USML:IV(...)` keys). Ordered BEFORE the coarse `usml.ts` (USML_ENTRIES)
    // so the six overlapping Cat IV codes (IV(a)(1), IV(b), IV(c), IV(d)(1),
    // IV(d)(2), IV(h)(1)) resolve to THESE richer entries — the union's
    // `seen`-set de-dup keeps the first occurrence, dropping the coarse
    // duplicates. usml.ts is left intact (it still serves `findUsmlEntry` and
    // a coverage count); only its Cat IV rows go dead in the union.
    ...adaptUsmlXv(USML_IV_ENUMERATION, "USML Cat. IV", USML_IV_AS_OF_DATE, {
      regime: "USML",
      depthTier: 1,
    }),
    ...adaptClassificationEntries(USML_ENTRIES, "USML", "USML (ITAR)"),
    ...adaptClassificationEntries(
      MTCR_ANNEX_ENTRIES,
      "MTCR_ANNEX",
      "MTCR Annex",
    ),
    ...adaptClassificationEntries(
      DE_ANLAGE_AL_ENTRIES,
      "DE_ANLAGE_AL",
      "DE Anlage AL",
    ),
    ...adaptUsmlXv(
      USML_XV_E_ENUMERATION,
      "USML Cat. XV(e)",
      USML_XV_E_AS_OF_DATE,
    ),
    ...adaptUsmlXv(
      USML_XV_BCDF_ENUMERATION,
      "USML Cat. XV(b-f)",
      USML_XV_BCDF_AS_OF_DATE,
    ),
    ...adaptUsmlXv(USML_XV_GH_ENTRIES, "USML Cat. XV(g/h)", USML_XV_GH_AS_OF),
    ...adaptUsmlXv(USML_XV_I_ENTRIES, "USML Cat. XV(i)", USML_XV_I_AS_OF),
    ...adaptWassenaar(),
    ...adaptJapanMeti(),
    ...adaptIndiaScomet(),
    // Data-Sprint S3 — UK Strategic Export Control List (space slice).
    // Code-level (depthTier 2). UK dual-use codes share the EU Annex I scheme
    // (post-Brexit assimilation) but live under the distinct UK_STRATEGIC
    // regime, so canonicalIds (`UK_STRATEGIC:9A004`) never collide with the
    // EU_ANNEX_I rows — both resolve independently for a code/keyword match.
    ...adaptUkStrategic(UK_STRATEGIC_ENTRIES),
    // Data-Sprint S4 — EU Common Military List (space slice). Sub-position
    // depth (depthTier 2). The military counterpart to EU Annex I; codes are
    // `ML…` so canonicalIds (`EU_CML:ML11.c`) never collide with the dual-use
    // EU_ANNEX_I rows (numeric `9A004` codes). EU member states transpose this
    // into national military lists (DE: Ausfuhrliste Teil I A) — but the EU CML
    // is the harmonised CFSP source.
    ...adaptEuCml(EU_CML_ENTRIES),
    ...adaptDeAusfuhrliste(),
    // EU Annex I (Reg. 2021/821) — the core EU dual-use list, all categories.
    ...adaptClassificationEntries(
      EU_ANNEX_I_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I",
    ),
    ...adaptClassificationEntries(
      EU_ANNEX_I_CAT3_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I Cat. 3",
    ),
    // ILA review #7 — supplier-relevant Cat 1 (materials) + Cat 2
    // (manufacturing) so composites/machining suppliers stop falling
    // through the matcher's coverage.
    ...adaptClassificationEntries(
      EU_ANNEX_I_CAT1_2_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I Cat. 1+2",
    ),
    ...adaptClassificationEntries(
      EU_ANNEX_I_CAT4_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I Cat. 4",
    ),
    ...adaptClassificationEntries(
      EU_ANNEX_I_CAT5_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I Cat. 5",
    ),
    ...adaptClassificationEntries(
      EU_ANNEX_I_CAT6_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I Cat. 6",
    ),
    ...adaptClassificationEntries(
      EU_ANNEX_I_CAT7_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I Cat. 7",
    ),
    // NSG (INFCIRC/254) Trigger List + Dual-Use; EU Reg. 833/2014 (Russia).
    ...adaptNsg(NSG_TRIGGER_LIST_ENTRIES),
    ...adaptNsg(NSG_DUAL_USE_ENTRIES),
    ...adaptRussia833(RUSSIA_833_ANNEX_VII_ENTRIES),
    ...adaptRussia833(RUSSIA_833_ANNEX_XXIII_ENTRIES),
    ...adaptRussia833(RUSSIA_833_ANNEX_XXIX_ENTRIES),
  ];

  // De-dup the base by canonicalId (regime+code makes cross-regime collisions
  // impossible, but we de-dup defensively; the test asserts uniqueness) BEFORE
  // building the mirror-resolution map, so a mirror that targets a de-dup'd
  // duplicate resolves to the surviving (first) occurrence.
  const dedup = (rows: NormalizedCorpusEntry[]): NormalizedCorpusEntry[] => {
    const seen = new Set<string>();
    const out: NormalizedCorpusEntry[] = [];
    for (const entry of rows) {
      if (seen.has(entry.canonicalId)) continue;
      seen.add(entry.canonicalId);
      out.push(entry);
    }
    return out;
  };
  const baseDeduped = dedup(base);

  // ── MIRROR adapters (S5) — resolved against the de-duped base map ────
  const baseByCanonicalId = new Map<string, NormalizedCorpusEntry>(
    baseDeduped.map((e) => [e.canonicalId, e]),
  );
  // Mirror adapters run AGAINST the de-duped base map (S5).
  const mirrors: NormalizedCorpusEntry[] = [
    // Data-Sprint S5 — Switzerland Güterkontrollverordnung (SR 946.202.1)
    // space slice. The Swiss EKN (Exportkontrollnummer) scheme is byte-
    // identical to the EU/Wassenaar dual-use numbering (Anhang 2 Teil 2 is the
    // verbatim Wassenaar Dual-Use List under a Swiss cover), so each Swiss code
    // MIRRORS the best existing union target (EU_ANNEX_I where present).
    // depthTier 2 (code-level). REGIME_MATURITY.CH_GKV STAYS 3 — see the
    // REGIME_MATURITY comment block for the fail-closed rationale (no Swiss SECO
    // origin-licence logic exists yet; Gate 4.5 thin-coverage REVIEW is the only
    // guard for CH-origin controlled exports, identical to the UK S3 decision).
    ...adaptMirrorEntries(CH_GKV_ENTRIES, baseByCanonicalId, {
      regime: "CH_GKV",
      list: "Schweizer Güterkontrollverordnung (SR 946.202.1)",
      depthTier: 2,
    }),
  ];

  // Concat base + mirrors, then de-dup the whole union (mirror canonicalIds use
  // the CH_GKV regime prefix, so they never collide with the base).
  return dedup([...baseDeduped, ...mirrors]);
})();
