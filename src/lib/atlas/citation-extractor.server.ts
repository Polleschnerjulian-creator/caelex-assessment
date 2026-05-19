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
   or [ATLAS:EU-NIS2-Art.21].
   AUDIT-FIX L6: Tightened from `[\w\-§\.\/]+` to a stricter shape
   `[A-Z][A-Z0-9-]+(-[A-Za-z0-9§.]+)?` that:
     1. Requires the source-id to begin with an uppercase letter and
        a hyphen-separated upper-case prefix (DE-, EU-, US-…).
     2. Forbids `/` (path separator) and `..` (path-traversal) so a
        malicious model output like `[ATLAS:../../etc/passwd]` cannot
        be persisted as a "citation" and rendered as a clickable link.
     3. Keeps §, `.`, alphanumerics for legitimate provision suffixes
        (e.g. `-§1`, `-Art.21`).
   The looser pattern leaked path-traversal chars into the rendered
   pill href + the validity-check store; tightening here defends in
   depth even though the upstream model is supposed to emit clean IDs. */
const ATLAS_CITATION_RE = /\[ATLAS:([A-Z][A-Z0-9-]+(?:-[A-Za-z0-9§.]+)?)\]/g;

/* AUDIT-FIX H6: Match fenced code blocks (``` ... ```) — non-greedy,
   multiline (the [\s\S] class crosses newlines without needing the
   `s` dotall flag). We REPLACE rather than just skip so positional
   indices for downstream "first occurrence" sorting stay aligned with
   the original text — replacing the inner content with whitespace of
   the same length preserves character offsets. */
const CODE_FENCE_RE = /```[\s\S]*?```/g;

/* AUDIT-FIX H6: Match inline-code spans (`...`) on a single line.
   Use a tempered class to forbid newlines + backticks inside, so a
   stray backtick on its own line doesn't accidentally consume the
   rest of the document. */
const INLINE_CODE_RE = /`[^`\n]*`/g;

/** AUDIT-FIX H6: Replace the matched span with whitespace of equal
 *  length. Keeping byte-offsets stable means citation `firstAt`
 *  positions still reflect the visible-text order in the rendered
 *  message. */
function blankOut(match: string): string {
  return " ".repeat(match.length);
}

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
 *
 * AUDIT-FIX H6: Citations inside markdown code-blocks (fenced ``` or
 * inline `...`) are NOT real citations — they're documentation /
 * examples / quoted error messages. Atlas's own answers regularly
 * include things like "Verwende das Format `[ATLAS:DE-WeltraumG-§1]`"
 * to teach the lawyer the citation syntax; before this fix those
 * literals leaked into the inline-pill renderer + validity-checker
 * as if they were real references, producing wrong "Quelle existiert
 * nicht"-warnings. Pre-process by blanking out code regions before
 * the citation regex runs.
 */
export function extractCitations(text: string): ExtractedCitation[] {
  if (!text) return [];

  /* Strip code regions FIRST: fenced (```...```) before inline (`...`)
     so a backtick triple inside a fence doesn't accidentally pair with
     a stray inline backtick later in the doc. Both replacements use
     whitespace of equal length to preserve indices. */
  const stripped = text
    .replace(CODE_FENCE_RE, blankOut)
    .replace(INLINE_CODE_RE, blankOut);

  const seen = new Map<
    string,
    { citationLiteral: string; firstAt: number; count: number }
  >();

  /* BUG-T1-3 (wave 11C): use matchAll() instead of the .exec() loop.
     The previous code did `ATLAS_CITATION_RE.lastIndex = 0` before
     looping — but that's NOT concurrency-safe. The module-level
     `const` regex with the `g` flag is a SHARED mutable object across
     all in-flight requests in the same Node.js process (warm-start
     serverless). Two interleaved calls can stomp on each other's
     lastIndex state mid-loop, causing silently-skipped or duplicated
     citations.

     matchAll() returns a fresh iterator with internal state on each
     call — no shared mutable state, fully concurrency-safe. The
     regex object itself is read-only; matchAll wraps it. */
  for (const m of stripped.matchAll(ATLAS_CITATION_RE)) {
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
