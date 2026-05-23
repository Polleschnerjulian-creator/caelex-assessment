/**
 * Sprint Z33 (Tier 6) — Training Corpus barrel.
 *
 * Re-exports the BAFA AzG + DDTC CJ datasets plus a unified
 * similarity-ranking helper. The Astra Trade copilot consumes the
 * `rankSimilarCases` API to surface "cases similar to your item +
 * destination" prompts in classification flows.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  BAFA_AZG_CORPUS,
  BAFA_AZG_CORPUS_COVERAGE,
  filterBafaByDecision,
  filterBafaByDestination,
  filterBafaByEccnPrefix,
  findBafaEntry,
  type AzGDecision,
  type BafaAzgEntry,
} from "./bafa-azg";
import {
  DDTC_CJ_CORPUS,
  DDTC_CJ_CORPUS_COVERAGE,
  filterDdtcByDecision,
  filterDdtcByDestination,
  filterDdtcByEccnPrefix,
  findDdtcEntry,
  type CjOutcome,
  type DdtcCjEntry,
} from "./ddtc-cj";

// ─── Re-exports ────────────────────────────────────────────────────

export {
  BAFA_AZG_CORPUS,
  BAFA_AZG_CORPUS_COVERAGE,
  filterBafaByDecision,
  filterBafaByDestination,
  filterBafaByEccnPrefix,
  findBafaEntry,
  DDTC_CJ_CORPUS,
  DDTC_CJ_CORPUS_COVERAGE,
  filterDdtcByDecision,
  filterDdtcByDestination,
  filterDdtcByEccnPrefix,
  findDdtcEntry,
};

export type { AzGDecision, BafaAzgEntry, CjOutcome, DdtcCjEntry };

// ─── Unified types ─────────────────────────────────────────────────

export type CorpusJurisdiction = "BAFA" | "DDTC";

/**
 * Discriminated union for unified rendering. The `jurisdiction` field
 * lets components fan out to specialised badges; the `entry` field
 * keeps the original typed record so we never lose information.
 */
export type CorpusEntry =
  | { jurisdiction: "BAFA"; entry: BafaAzgEntry }
  | { jurisdiction: "DDTC"; entry: DdtcCjEntry };

/**
 * Flatten the two corpora into a single list, tagged with jurisdiction.
 * Order: BAFA entries first (in dataset order), then DDTC.
 */
export const UNIFIED_CORPUS: ReadonlyArray<CorpusEntry> = [
  ...BAFA_AZG_CORPUS.map<CorpusEntry>((entry) => ({
    jurisdiction: "BAFA" as const,
    entry,
  })),
  ...DDTC_CJ_CORPUS.map<CorpusEntry>((entry) => ({
    jurisdiction: "DDTC" as const,
    entry,
  })),
];

// ─── Similarity ranking ────────────────────────────────────────────

export interface SimilarityQuery {
  /**
   * ECCN or USML reference the operator is researching. Examples:
   *   "9A515.b", "XV(e)(13)", "9A011".
   */
  eccnOrUsml: string;
  /** ISO-3166 alpha-2 destination country. */
  destination: string;
  /**
   * Optional jurisdiction filter — when set, ranking only considers
   * the named source. When null, both BAFA and DDTC entries compete.
   */
  jurisdiction?: CorpusJurisdiction | null;
}

export interface SimilarityResult {
  entry: CorpusEntry;
  /** 0..1 inclusive — higher is more similar. */
  score: number;
  /**
   * Breakdown of how the score was reached. Useful for the UI
   * "why was this case suggested?" tooltip.
   */
  reasons: {
    /** Exact ECCN/USML match scores 0.6; first-character class match
     *  ("9" / "X") scores 0.25; otherwise 0. */
    eccnScore: number;
    /** Exact destination match scores 0.3; otherwise 0. */
    destinationScore: number;
    /** Shared filter-tags add up to 0.1 (capped). */
    tagScore: number;
  };
}

const ECCN_FIRST_CHAR_SCORE = 0.25;
const ECCN_EXACT_SCORE = 0.6;
const DESTINATION_EXACT_SCORE = 0.3;
const TAG_BONUS_CAP = 0.1;

function entryEccnOrUsml(corpusEntry: CorpusEntry): string | null {
  return corpusEntry.jurisdiction === "BAFA"
    ? corpusEntry.entry.eccnOrUsmlGuess
    : corpusEntry.entry.eccnOrUsmlGuess;
}

function entryDestination(corpusEntry: CorpusEntry): string {
  return corpusEntry.entry.destination;
}

function entryTags(corpusEntry: CorpusEntry): string[] {
  return corpusEntry.entry.tags;
}

function scoreSingleEntry(
  query: SimilarityQuery,
  corpusEntry: CorpusEntry,
): SimilarityResult {
  const targetEccn = entryEccnOrUsml(corpusEntry);
  let eccnScore = 0;
  if (targetEccn !== null) {
    if (targetEccn === query.eccnOrUsml) {
      eccnScore = ECCN_EXACT_SCORE;
    } else if (
      targetEccn.length > 0 &&
      query.eccnOrUsml.length > 0 &&
      targetEccn[0] === query.eccnOrUsml[0]
    ) {
      eccnScore = ECCN_FIRST_CHAR_SCORE;
    }
  }

  const destinationScore =
    entryDestination(corpusEntry) === query.destination
      ? DESTINATION_EXACT_SCORE
      : 0;

  // Tag bonus: ECCN class prefix tag matches give a small bump. We
  // look for tags that share the ECCN's leading character (e.g. "9A"
  // payloads tend to tag "RF-payload", "AOCS", "thruster"). Lightweight
  // signal; capped at TAG_BONUS_CAP so it can't dominate.
  const queryTagHints = inferQueryTags(query.eccnOrUsml);
  const overlap = entryTags(corpusEntry).filter((t) =>
    queryTagHints.includes(t),
  ).length;
  const tagScore = Math.min(TAG_BONUS_CAP, overlap * 0.05);

  return {
    entry: corpusEntry,
    score: eccnScore + destinationScore + tagScore,
    reasons: { eccnScore, destinationScore, tagScore },
  };
}

function inferQueryTags(eccn: string): string[] {
  // Tiny rule-set — does not need to be exhaustive; tagScore is a
  // small tiebreaker on top of the deterministic ECCN/destination
  // scoring. Mirrors the tag conventions used in the dataset.
  const hints: string[] = [];
  if (eccn.startsWith("9A011") || eccn.startsWith("9A105")) {
    hints.push("thruster");
  }
  if (eccn.startsWith("9A515.b") || eccn.startsWith("6A003")) {
    hints.push("imaging");
  }
  if (
    eccn.startsWith("9A515.e") ||
    eccn.startsWith("9A004") ||
    eccn.startsWith("XV(e)(6)") ||
    eccn.startsWith("XV(e)(7)")
  ) {
    hints.push("RF-payload");
  }
  if (eccn.startsWith("9A515.d") || eccn.startsWith("3A001")) {
    hints.push("semiconductor");
  }
  if (eccn.startsWith("9D") || eccn.startsWith("XV(f)")) {
    hints.push("software");
  }
  if (eccn.startsWith("6A002")) {
    hints.push("IR-payload");
  }
  if (eccn.startsWith("XII")) {
    hints.push("INS");
  }
  return hints;
}

/**
 * Rank the corpus by similarity to a query. Results are sorted by
 * score descending; ties broken by decisionDate descending (so the
 * most recent precedent surfaces first when scores are equal).
 *
 * Returns up to `limit` results. Pass `limit = Infinity` to get the
 * full ranked list.
 */
export function rankSimilarCases(
  query: SimilarityQuery,
  limit = 10,
): SimilarityResult[] {
  const pool: CorpusEntry[] = query.jurisdiction
    ? UNIFIED_CORPUS.filter((c) => c.jurisdiction === query.jurisdiction)
    : [...UNIFIED_CORPUS];

  const scored = pool.map((c) => scoreSingleEntry(query, c));

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.entry.entry.decisionDate.localeCompare(a.entry.entry.decisionDate);
  });

  return scored.slice(0, limit);
}

/**
 * Total entries across both corpora.
 */
export function corpusSize(): { bafa: number; ddtc: number; total: number } {
  return {
    bafa: BAFA_AZG_CORPUS.length,
    ddtc: DDTC_CJ_CORPUS.length,
    total: BAFA_AZG_CORPUS.length + DDTC_CJ_CORPUS.length,
  };
}
