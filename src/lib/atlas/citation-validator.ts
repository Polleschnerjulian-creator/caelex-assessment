/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Citation-ID validator for Astra-streamed text.
 *
 * Astra's HARD RULE 2 ("never invent IDs") is a system-prompt
 * instruction — the audit (T13) flagged that nothing on the server
 * actually verifies the model didn't hallucinate a [ATLAS-…] or
 * [CASE-…] reference. This module extracts every bracket-citation
 * from the assistant's accumulated text and checks each against the
 * static catalogues.
 *
 * The result is reported to the client as a meta-event (NOT by
 * rewriting the streamed text — destructive edits would surprise
 * the user mid-conversation). The client renders a discreet
 * "1 of 5 citations could not be verified — please cross-check"
 * footer on the message bubble. This makes hallucinated citations
 * VISIBLE rather than erased.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ALL_SOURCES } from "@/data/legal-sources";
import { ATLAS_CASES } from "@/data/legal-cases";

// Pre-compute lookup sets at module load. Both catalogues fit easily
// in memory and the Set.has() lookups are O(1).
const SOURCE_IDS: ReadonlySet<string> = new Set(ALL_SOURCES.map((s) => s.id));
const CASE_IDS: ReadonlySet<string> = new Set(ATLAS_CASES.map((c) => c.id));

// Bracket-citation pattern. Real catalogue IDs are jurisdiction- or
// category-prefixed: [DE-VVG], [INT-OST-1967], [EU-NIS2-2022],
// [CASE-COSMOS-954-1981]. The previous `[ATLAS-…]` shape matched NONE
// of them — no real ID starts with "ATLAS-" — so source citations went
// completely unvalidated and hallucinated ones slipped through (BUG
// C1). We now match any `[PREFIX-…]` token and resolve it against the
// catalogue. The ≥1-hyphen requirement skips prose footnotes ([1]) and
// the V2 colon format ([ATLAS:…], validated by citation-extractor).
const CITATION_RE = /\[([A-Z][A-Z0-9]*(?:-[A-Z0-9]+)+)\]/g;

export interface CitationCheck {
  /** Total bracket-citations encountered in the text. */
  total: number;
  /** Bracket-citations whose ID does NOT match the catalogue. */
  unverified: string[];
  /** Bracket-citations whose ID MATCHES the catalogue. Returned for
   *  test/debug visibility — the UI ignores it. */
  verified: string[];
}

/**
 * Scan `text` for bracket-citations and partition them into verified
 * vs. unverified. The check is conservative — anything that doesn't
 * match an entry in the catalogue is flagged, even if it's a real
 * statute we haven't indexed yet (better a false positive than a
 * silent hallucination).
 */
export function validateCitations(text: string): CitationCheck {
  const verified: string[] = [];
  const unverified: string[] = [];

  // matchAll() returns a fresh iterator per call, so the shared
  // module-level /g regex stays concurrency-safe under warm-start
  // serverless (mirrors the citation-extractor BUG-T1-3 fix).
  for (const m of text.matchAll(CITATION_RE)) {
    const literal = m[0];
    const id = m[1];
    if (SOURCE_IDS.has(id) || CASE_IDS.has(id)) {
      verified.push(literal);
    } else {
      unverified.push(literal);
    }
  }

  return {
    total: verified.length + unverified.length,
    verified,
    unverified,
  };
}
