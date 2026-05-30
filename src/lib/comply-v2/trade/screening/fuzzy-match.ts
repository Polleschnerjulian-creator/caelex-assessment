/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Fuzzy-match engine for sanctions screening (Wave A Sprint A5).
 *
 * Pure functions. No I/O, no async, no external deps. Inputs:
 * canonicalized name strings (already lowercased, suffixes stripped,
 * see `canonicalizeName()` in sources/types.ts). Output: a score
 * 0.0–1.0 where 1.0 = identical and 0.0 = no similarity at all.
 *
 * Algorithm: **Jaro-Winkler**, the industry standard for personal/company
 * name matching in sanctions screening (used internally by World-Check,
 * Refinitiv, OpenSanctions, OFAC's own list-management tools).
 *
 * Why Jaro-Winkler over Levenshtein:
 *   - Designed for SHORT strings (typical name length 5-30 chars)
 *   - Native handling of TRANSPOSITIONS (Jhon ↔ John = high score)
 *   - PREFIX BONUS: matching first 4 chars boosts score (catches
 *     "John Smithson" vs "Jon Smithson")
 *   - Levenshtein over-penalizes prefix variations and would miss
 *     these critical cases.
 *
 * Industry score thresholds (from FATF/Wolfsberg guidance):
 *   ≥ 0.95  CONFIRMED_HIT — block, escalate
 *   ≥ 0.85  POTENTIAL_MATCH — human review required
 *   ≥ 0.75  WEAK_MATCH — log, surface as informational
 *   < 0.75  CLEAR — no action
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import type { CanonicalSanctionsEntry } from "./sources/types";
import { tokenSetRatio } from "./token-set";

// ─── Score thresholds (exported for use across screening engine) ───

export const SCORE_CONFIRMED_HIT = 0.95;
export const SCORE_POTENTIAL_MATCH = 0.85;
export const SCORE_WEAK_MATCH = 0.75;

/**
 * Standard Jaro similarity between two strings.
 *
 * Range: 0.0 (no similarity) … 1.0 (identical)
 *
 * Algorithm:
 *   1. Define matching window = floor(max(len_s1, len_s2) / 2) - 1
 *   2. A character matches if equal AND within `window` positions
 *   3. m = number of matching characters
 *   4. t = number of transpositions (matched chars in different order) / 2
 *   5. jaro = (m/|s1| + m/|s2| + (m-t)/m) / 3
 *
 * Returns 0 immediately if either string empty (avoid /0).
 * Returns 1 if both strings identical (fast path).
 */
export function jaroSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return s1.length === 0 ? 0 : 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matchWindow = Math.max(0, Math.floor(Math.max(len1, len2) / 2) - 1);

  const s1Matches = new Array<boolean>(len1).fill(false);
  const s2Matches = new Array<boolean>(len2).fill(false);

  let matches = 0;
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(i + matchWindow + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j]) continue;
      if (s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  // Count transpositions
  let transpositions = 0;
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }
  const halfTranspositions = transpositions / 2;

  return (
    (matches / len1 +
      matches / len2 +
      (matches - halfTranspositions) / matches) /
    3
  );
}

/**
 * Jaro-Winkler similarity: Jaro plus a prefix bonus that rewards
 * common prefixes up to 4 characters.
 *
 *   jw = jaro + (prefixLen × scalingFactor × (1 - jaro))
 *
 * Standard scalingFactor = 0.1 (Winkler's original recommendation).
 * Prefix length capped at 4. The bonus only applies when jaro is
 * already above a threshold (typically 0.7) to avoid boosting
 * essentially-non-matching strings just because they happen to share
 * the same first letter.
 */
export function jaroWinkler(s1: string, s2: string): number {
  const jaro = jaroSimilarity(s1, s2);
  // Don't apply prefix bonus to weak matches — would falsely boost
  // "Adani" vs "Apple" just because both start with "A".
  if (jaro < 0.7) return jaro;

  const prefixLen = commonPrefixLength(s1, s2, 4);
  return jaro + prefixLen * 0.1 * (1 - jaro);
}

/**
 * Length of common prefix between s1 and s2, capped at maxLen.
 * Pure helper for jaroWinkler — exported for testability.
 */
export function commonPrefixLength(
  s1: string,
  s2: string,
  maxLen: number,
): number {
  const limit = Math.min(s1.length, s2.length, maxLen);
  for (let i = 0; i < limit; i++) {
    if (s1[i] !== s2[i]) return i;
  }
  return limit;
}

// ─── Hit-scoring against a sanctions entry ──────────────────────────

export interface FuzzyHit {
  /** entryId from the matched sanctions entry. */
  entryId: string;
  /** The sanctions-entry name that produced the highest score. */
  matchedName: string;
  /** Score 0.0-1.0. */
  score: number;
  /** Field(s) that contributed: "name" always; identifiers/address in future. */
  matchedFields: string[];
}

// ─── Identifier normalisation ────────────────────────────────────────

/**
 * Normalise an identifier value for exact matching:
 *   1. trim
 *   2. uppercase
 *   3. strip all spaces and non-alphanumeric characters
 *
 * "5299 00t8bm49aursdo55" → "529900T8BM49AURSDO55"
 * "12-3456789"             → "123456789"
 * ""                       → "" (empty stays empty — caller must guard)
 */
function normaliseIdentifierValue(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Exact-identifier pre-check for sanctions screening.
 *
 * If ANY query identifier's normalised value exactly matches ANY
 * identifier value on the sanctions entry (same normalisation), this is
 * a definitive hit — score 1.0, matchedFields: ["identifier"].
 *
 * Rules:
 *   - Empty / whitespace-only identifier values NEVER match (guards
 *     against the "" === "" false-positive edge-case).
 *   - Normalisation: trim → uppercase → strip spaces+punctuation, so
 *     "5299 00t8bm49aursdo55" matches "529900T8BM49AURSDO55" and
 *     "12-3456789" matches "123456789".
 *   - Pure: no I/O, no async, safe to call in hot screening loops.
 *
 * @param queryIdentifiers  Identifiers carried on the party being screened.
 * @param entry             A canonical sanctions entry.
 * @returns FuzzyHit with score 1.0 on match, null otherwise.
 */
export function matchByIdentifier(
  queryIdentifiers: { type: string; value: string }[],
  entry: CanonicalSanctionsEntry,
): FuzzyHit | null {
  if (queryIdentifiers.length === 0 || entry.identifiers.length === 0) {
    return null;
  }

  // Build normalised set of entry identifier values for O(1) lookup.
  const entryNormSet = new Set<string>();
  for (const id of entry.identifiers) {
    const norm = normaliseIdentifierValue(id.value);
    if (norm.length > 0) {
      entryNormSet.add(norm);
    }
  }

  for (const qId of queryIdentifiers) {
    const normQuery = normaliseIdentifierValue(qId.value);
    // Guard: empty/whitespace-only query values must not match.
    if (normQuery.length === 0) continue;
    if (entryNormSet.has(normQuery)) {
      return {
        entryId: entry.entryId,
        matchedName: entry.names[0] ?? "",
        score: 1.0,
        matchedFields: ["identifier"],
      };
    }
  }

  return null;
}

/**
 * Score a single canonicalized query name against ALL names of one
 * sanctions entry (primary + AKAs). Returns the best score.
 *
 * Pure function. Caller decides whether the score is above threshold.
 */
export function scoreEntry(
  queryCanonical: string,
  entry: CanonicalSanctionsEntry,
): FuzzyHit | null {
  if (!queryCanonical || entry.names.length === 0) return null;

  let bestScore = 0;
  let bestName = entry.names[0];
  for (const name of entry.names) {
    const s = Math.max(
      jaroWinkler(queryCanonical, name),
      tokenSetRatio(queryCanonical, name),
    );
    if (s > bestScore) {
      bestScore = s;
      bestName = name;
    }
  }

  return {
    entryId: entry.entryId,
    matchedName: bestName,
    score: bestScore,
    matchedFields: ["name"],
  };
}

/**
 * Screen one query (canonicalized name) against an entire list of
 * sanctions entries. Returns hits at or above `threshold`, sorted
 * descending by score.
 *
 * Default threshold = SCORE_WEAK_MATCH (0.75). Caller can pass
 * SCORE_POTENTIAL_MATCH (0.85) to filter more strictly.
 *
 * Linear scan — fine for ~15K entries (OFAC + BIS + DDTC combined).
 * If we ever reach >100K entries we'd add a candidate-prefilter step
 * (e.g. first-letter index) but YAGNI for MVP.
 */
export function screenAgainstEntries(
  queryCanonical: string,
  entries: CanonicalSanctionsEntry[],
  threshold: number = SCORE_WEAK_MATCH,
): FuzzyHit[] {
  const hits: FuzzyHit[] = [];
  for (const entry of entries) {
    const hit = scoreEntry(queryCanonical, entry);
    if (hit && hit.score >= threshold) hits.push(hit);
  }
  hits.sort((a, b) => b.score - a.score);
  return hits;
}

/**
 * Classify a top-hit score into the standard FATF/Wolfsberg buckets.
 * Used by the screening engine to set TradeScreeningStatus.
 */
export type ScoreBand = "confirmed" | "potential" | "weak" | "clear";

export function classifyScore(score: number): ScoreBand {
  if (score >= SCORE_CONFIRMED_HIT) return "confirmed";
  if (score >= SCORE_POTENTIAL_MATCH) return "potential";
  if (score >= SCORE_WEAK_MATCH) return "weak";
  return "clear";
}
