/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Token-set name similarity helper for sanctions screening.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { jaroWinkler } from "./fuzzy-match";

/**
 * Tokenize a string: trim, split on whitespace runs, drop empty tokens.
 */
function tokenize(s: string): string[] {
  return s
    .trim()
    .split(/\s+/)
    .filter((t) => t.length > 0);
}

/**
 * Jaccard similarity over token sets: |A∩B| / |A∪B|.
 */
function jaccard(a: string[], b: string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Token-sort Jaro-Winkler: sort each side's tokens alphabetically,
 * join with a single space, then apply jaroWinkler to the resulting strings.
 * This is order-invariant for identical token sets.
 */
function tokenSortJaroWinkler(a: string[], b: string[]): number {
  const sortedA = [...a].sort().join(" ");
  const sortedB = [...b].sort().join(" ");
  return jaroWinkler(sortedA, sortedB);
}

/**
 * Compute a token-set similarity score between two pre-canonicalized strings.
 *
 * Returns a value in [0.0, 1.0]:
 * - 0  if either input tokenizes to zero tokens
 * - max(Jaccard over token sets, token-sort Jaro-Winkler)
 *
 * Token-sort Jaro-Winkler is included only when the two sides share at
 * least one token (Jaccard > 0). Without that guard, character-level JW
 * would score completely unrelated token sets (e.g. "global spire" vs
 * "labs planet") above 0.5, producing false positives.
 *
 * Inputs are assumed to be pre-canonicalized (lowercased etc.) upstream;
 * this function only collapses whitespace runs and does NOT lowercase.
 */
export function tokenSetRatio(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const jaccardScore = jaccard(tokensA, tokensB);

  // Only blend token-sort JW when the two names share at least one token.
  // For zero-overlap sets, Jaccard (= 0) is the correct signal; adding a
  // character-level score on the sorted join would create false positives.
  if (jaccardScore === 0) return 0;

  const tokenSortScore = tokenSortJaroWinkler(tokensA, tokensB);
  return Math.max(jaccardScore, tokenSortScore);
}
