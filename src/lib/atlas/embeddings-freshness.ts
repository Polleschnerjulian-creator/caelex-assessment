/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * src/lib/atlas/embeddings-freshness.ts
 *
 * Pure utility for computing the gap between the expected corpus
 * embedding IDs (derived from the live data sources the same way
 * atlas-embed.ts derives them) and the IDs actually present in
 * src/data/atlas/embeddings.json.
 *
 * Kept dependency-free on purpose so it can run in CI, in tests, and
 * at runtime without touching the Vercel AI Gateway or the DB.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface EmbeddingGap {
  /** Number of unique expected IDs (full corpus size). */
  total: number;
  /** Number of expected IDs that are present in the embeddings file. */
  embedded: number;
  /** Number of expected IDs missing from the embeddings file. */
  missing: number;
  /**
   * First (up to 50) missing IDs for logging/debugging.
   * Capped to avoid bloated output in CI logs.
   */
  missingIds: string[];
}

const MISSING_IDS_CAP = 50;

/**
 * Compute the set-difference between expectedIds and embeddedIds.
 *
 * - Deduplicates both input arrays before comparison.
 * - `total`    = |unique(expectedIds)|
 * - `embedded` = |unique(expectedIds) ∩ unique(embeddedIds)|
 * - `missing`  = |unique(expectedIds) \ unique(embeddedIds)|
 * - `missingIds` = first MISSING_IDS_CAP elements of that difference (stable, sorted)
 *
 * Extra IDs in embeddedIds that are NOT in expectedIds (stale/deleted
 * corpus entries) are silently ignored here — the embedder already
 * handles that case by not including them in the output.
 */
export function computeEmbeddingGap(
  expectedIds: string[],
  embeddedIds: string[],
): EmbeddingGap {
  const expected = new Set(expectedIds);
  const embedded = new Set(embeddedIds);

  const allMissing: string[] = [];
  for (const id of expected) {
    if (!embedded.has(id)) {
      allMissing.push(id);
    }
  }

  // Sort for stable, deterministic output across runs.
  allMissing.sort();

  const total = expected.size;
  const missing = allMissing.length;

  return {
    total,
    embedded: total - missing,
    missing,
    missingIds: allMissing.slice(0, MISSING_IDS_CAP),
  };
}
