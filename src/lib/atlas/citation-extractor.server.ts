import "server-only";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Citation Extractor (Sprint 4, 2026-05-12).
 *
 * Post-processes streamed assistant text into a structured citations
 * array attached to AtlasMessage.citations. Pattern: every
 * `[ATLAS:source-id]` reference in the text is parsed, deduplicated,
 * resolved against the corpus, and decorated with a validity badge.
 *
 * The chat-engine writes the result into AtlasMessage.citations
 * before returning the `done` event. The chat-view's MessageRow then
 * reads this JSON to render the "Quellen"-Panel + inline badges.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { checkValidity, type ValidityCheck } from "./validity-tools.server";

/* The canonical Atlas-citation pattern, e.g. [ATLAS:DE-WeltraumG-§1]
   or [ATLAS:EU-NIS2-Art.21]. Matches IDs containing letters, digits,
   dashes, dots, slashes, and § signs. */
const ATLAS_CITATION_RE = /\[ATLAS:([\w\-§\.\/]+)\]/g;

export interface ExtractedCitation extends ValidityCheck {
  /** 1-indexed display order in the answer (first occurrence wins). */
  index: number;
  /** Total occurrences across the answer. */
  occurrences: number;
}

/**
 * Extract all [ATLAS:...] citations from an assistant text. Order by
 * first appearance; deduplicate by sourceId. Returns an empty array if
 * no citations are found.
 */
export function extractCitations(text: string): ExtractedCitation[] {
  if (!text) return [];

  const seen = new Map<
    string,
    { citationLiteral: string; firstAt: number; count: number }
  >();

  let m: RegExpExecArray | null;
  /* Reset lastIndex so subsequent calls don't share state. */
  ATLAS_CITATION_RE.lastIndex = 0;
  while ((m = ATLAS_CITATION_RE.exec(text)) !== null) {
    const literal = m[1];
    const at = m.index;
    const existing = seen.get(literal);
    if (existing) {
      existing.count += 1;
    } else {
      seen.set(literal, { citationLiteral: literal, firstAt: at, count: 1 });
    }
  }

  if (seen.size === 0) return [];

  const ordered = [...seen.values()].sort((a, b) => a.firstAt - b.firstAt);
  return ordered.map((entry, i) => {
    const validity = checkValidity(entry.citationLiteral);
    return {
      ...validity,
      index: i + 1,
      occurrences: entry.count,
    };
  });
}
