/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
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

// Pre-compute lookup sets at module load. ALL_SOURCES has ~620
// entries, ATLAS_CASES ~44 — both fit easily in memory and the
// Set.has() lookups are O(1).
const SOURCE_IDS: ReadonlySet<string> = new Set(ALL_SOURCES.map((s) => s.id));
const CASE_IDS: ReadonlySet<string> = new Set(ATLAS_CASES.map((c) => c.id));

// Bracket-citation pattern. Matches [ATLAS-FOO-BAR-2024] and
// [CASE-COSMOS-954-1981]. Same regex shape as the citation-pill
// renderer in src/components/atlas/CitationPill.tsx — kept in
// step deliberately so what renders as a pill is what we validate.
const ATLAS_PILL_RE = /\[ATLAS-[A-Z0-9-]+\]/g;
const CASE_PILL_RE = /\[CASE-[A-Z0-9-]+\]/g;

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
  const sourceMatches = text.match(ATLAS_PILL_RE) ?? [];
  const caseMatches = text.match(CASE_PILL_RE) ?? [];
  const verified: string[] = [];
  const unverified: string[] = [];

  for (const match of sourceMatches) {
    // Strip the surrounding brackets to recover the raw ID.
    const id = match.slice(1, -1);
    if (SOURCE_IDS.has(id)) {
      verified.push(match);
    } else {
      unverified.push(match);
    }
  }

  for (const match of caseMatches) {
    const id = match.slice(1, -1);
    if (CASE_IDS.has(id)) {
      verified.push(match);
    } else {
      unverified.push(match);
    }
  }

  return {
    total: verified.length + unverified.length,
    verified,
    unverified,
  };
}
