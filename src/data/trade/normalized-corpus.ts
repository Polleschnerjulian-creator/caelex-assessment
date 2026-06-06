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
import { WASSENAAR_CAT6_9_ENTRIES } from "./wassenaar-cat6-9";
import { JAPAN_METI_ENTRIES } from "./japan-meti";
import { INDIA_SCOMET_ENTRIES, INDIA_SCOMET_AS_OF } from "./india-scomet";
import {
  DE_AUSFUHRLISTE_ENTRIES,
  DE_AUSFUHRLISTE_AS_OF,
} from "./de-ausfuhrliste";
import { EU_ANNEX_I_ENTRIES } from "./eu-annex-i";
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
  | "RU_833";

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

/** Paragraph-keyed USML XV enumerations (e / b-c-d-f / g-h / i). */
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
): NormalizedCorpusEntry[] {
  return entries.map((e) => ({
    canonicalId: `USML_XV:${e.paragraph}`,
    code: e.paragraph,
    regime: "USML_XV" as const,
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

// ─── The union ──────────────────────────────────────────────────────

/**
 * Every control-list corpus, normalized + concatenated. De-duplicated by
 * canonicalId (regime+code makes collisions impossible across regimes, but
 * we de-dup defensively; the test asserts uniqueness).
 */
export const NORMALIZED_CORPUS_UNION: NormalizedCorpusEntry[] = (() => {
  const all: NormalizedCorpusEntry[] = [
    ...adaptClassificationEntries(US_CCL_ENTRIES, "US_CCL", "EAR CCL"),
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
    ...adaptDeAusfuhrliste(),
    // EU Annex I (Reg. 2021/821) — the core EU dual-use list, all categories.
    ...adaptClassificationEntries(EU_ANNEX_I_ENTRIES, "EU_ANNEX_I", "EU Annex I"),
    ...adaptClassificationEntries(
      EU_ANNEX_I_CAT3_ENTRIES,
      "EU_ANNEX_I",
      "EU Annex I Cat. 3",
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
  const seen = new Set<string>();
  const deduped: NormalizedCorpusEntry[] = [];
  for (const entry of all) {
    if (seen.has(entry.canonicalId)) continue;
    seen.add(entry.canonicalId);
    deduped.push(entry);
  }
  return deduped;
})();
