/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Astra citation validator — Sprint 6A
 *
 * Astra's system prompt orders it to "ALWAYS cite specific article
 * numbers when referencing regulations". Without server-side
 * verification, nothing actually checks the model didn't hallucinate
 * a non-existent EU Space Act Art. 247 or NIS2 Art. 9999.
 *
 * # Design
 *
 * Ported pattern-for-pattern from `src/lib/atlas/citation-validator.ts`
 * (the Atlas equivalent that scans `[ATLAS-…]` and `[CASE-…]` pills).
 * Caelex Comply citations are textual — "EU Space Act Art. 14" —
 * rather than bracket pills, so the regexes differ; the partition
 * shape (verified / unverified) and the result-as-meta-event design
 * are identical.
 *
 * Two regulation surfaces are validated in this iteration:
 *
 *   1. **EU Space Act** — `articles.ts` provides every Article.number;
 *      we accept any citation whose extracted article number matches.
 *   2. **NIS2** — `nis2-requirements.ts` contains entries with
 *      `articleRef: "NIS2 Art. 21(2)(a)"`. We extract the leading
 *      article number once at module-load.
 *
 * Validation is article-level — paragraph and subparagraph specifiers
 * (e.g. `Art. 21(2)(a)`) are captured for reporting but not validated.
 * Empirically, hallucinations invent the *article number itself*; the
 * sub-structure tends to be accurate when the article is real, so
 * checking the article alone catches the high-value failures without
 * shipping a brittle paragraph index.
 *
 * # Reporting model
 *
 * The validator returns a partition (verified / unverified). The
 * caller surfaces unverified citations as a discreet footer on the
 * message bubble — NEVER rewriting Astra's streamed text. Destructive
 * edits would surprise the user mid-conversation, and real statutes
 * we haven't indexed yet would be silently erased.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { articles } from "@/data/articles";
import { NIS2_REQUIREMENTS } from "@/data/nis2-requirements";

// ─── Pre-computed lookup sets ─────────────────────────────────────────────

/**
 * Expand a stored article-number string into the individual numbers
 * it covers. The articles data file groups consecutive articles into
 * ranges (e.g. "14-15", "11-13", "20-23") so a single entry can
 * represent multiple articles. We expand each range so `Set.has("14")`
 * works for entries stored as "14-15".
 */
function expandArticleNumber(stored: string): string[] {
  const m = stored.match(/^(\d+)-(\d+)$/);
  if (!m) return [stored];
  const start = parseInt(m[1], 10);
  const end = parseInt(m[2], 10);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) {
    return [stored];
  }
  return Array.from({ length: end - start + 1 }, (_, i) => String(start + i));
}

/** Set of every EU Space Act article number known to Comply (~119). */
const EU_SPACE_ACT_ARTICLES: ReadonlySet<string> = new Set(
  articles.flatMap((a) => expandArticleNumber(a.number)),
);

/** Set of every NIS2 article number referenced by at least one
 *  requirement. NIS2 has many fewer cited articles (mostly Art. 20-23)
 *  in our space-sector mapping. */
const NIS2_ARTICLES: ReadonlySet<string> = new Set(
  NIS2_REQUIREMENTS.map((r) => {
    const m = r.articleRef.match(/Art\.?\s+(\d+)/i);
    return m?.[1] ?? "";
  }).filter(Boolean),
);

// ─── Regexes ──────────────────────────────────────────────────────────────

/**
 * EU Space Act citations. Accepts:
 *   - "EU Space Act Art. 14"
 *   - "EU Space Act Article 21(2)(a)"
 *   - "Article 6 of the EU Space Act"
 *   - "Art. 14 EU Space Act"
 *
 * Captures: 1 = article number, 2 = paragraph (optional), 3 = subparagraph (optional).
 *
 * Two patterns merged with alternation — the regulation-name can come
 * before OR after the article reference.
 */
const EU_SPACE_ACT_RE =
  /(?:(?:EU Space Act|Space Act|COM\(2025\)\s*335)\s+(?:Art(?:icle)?\.?)\s+(\d+)(?:\(([^)]+)\))?(?:\(([^)]+)\))?)|(?:(?:Art(?:icle)?\.?)\s+(\d+)(?:\(([^)]+)\))?(?:\(([^)]+)\))?\s+(?:of\s+)?(?:the\s+)?(?:EU\s+Space\s+Act|Space\s+Act))/gi;

/**
 * NIS2 citations. Accepts:
 *   - "NIS2 Art. 21(2)(a)"
 *   - "NIS2 Article 23"
 *   - "Art. 21 of NIS2"
 */
const NIS2_RE =
  /(?:NIS2\s+(?:Art(?:icle)?\.?)\s+(\d+)(?:\(([^)]+)\))?(?:\(([^)]+)\))?)|(?:(?:Art(?:icle)?\.?)\s+(\d+)(?:\(([^)]+)\))?(?:\(([^)]+)\))?\s+(?:of\s+)?NIS2)/gi;

// ─── Public API ────────────────────────────────────────────────────────────

export type Regulation = "eu_space_act" | "nis2";

export interface ParsedCitation {
  /** The full text matched, e.g. "EU Space Act Art. 21(2)(a)". */
  raw: string;
  /** Which regulation it cites. */
  regulation: Regulation;
  /** The article number, e.g. "21". */
  article: string;
  /** First parenthesised qualifier (paragraph), if any. */
  paragraph?: string;
  /** Second parenthesised qualifier (subparagraph), if any. */
  subparagraph?: string;
}

export interface CitationCheck {
  /** Total citations encountered. */
  total: number;
  /** Citations whose article number is in the canonical index. */
  verified: ParsedCitation[];
  /** Citations whose article number is NOT in the canonical index. */
  unverified: ParsedCitation[];
}

/**
 * Scan `text` for regulation citations and partition them into
 * verified vs. unverified. Conservative — anything we can't match
 * is flagged, even if it's a real statute we haven't indexed yet.
 */
export function validateCitations(text: string): CitationCheck {
  const all: ParsedCitation[] = [
    ...extractEuSpaceAct(text),
    ...extractNis2(text),
  ];
  const verified: ParsedCitation[] = [];
  const unverified: ParsedCitation[] = [];

  for (const citation of all) {
    const set =
      citation.regulation === "eu_space_act"
        ? EU_SPACE_ACT_ARTICLES
        : NIS2_ARTICLES;
    if (set.has(citation.article)) verified.push(citation);
    else unverified.push(citation);
  }

  return {
    total: all.length,
    verified,
    unverified,
  };
}

// ─── Internals ─────────────────────────────────────────────────────────────

function extractEuSpaceAct(text: string): ParsedCitation[] {
  const out: ParsedCitation[] = [];
  // RegExp.exec needs the regex object — clone via new RegExp to keep
  // module-level patterns reusable across calls.
  const re = new RegExp(EU_SPACE_ACT_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    // Two alternation branches: groups 1-3 vs groups 4-6.
    const article = m[1] ?? m[4];
    const paragraph = m[2] ?? m[5];
    const subparagraph = m[3] ?? m[6];
    if (!article) continue;
    out.push({
      raw: m[0].trim(),
      regulation: "eu_space_act",
      article,
      paragraph,
      subparagraph,
    });
  }
  return out;
}

function extractNis2(text: string): ParsedCitation[] {
  const out: ParsedCitation[] = [];
  const re = new RegExp(NIS2_RE);
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const article = m[1] ?? m[4];
    const paragraph = m[2] ?? m[5];
    const subparagraph = m[3] ?? m[6];
    if (!article) continue;
    out.push({
      raw: m[0].trim(),
      regulation: "nis2",
      article,
      paragraph,
      subparagraph,
    });
  }
  return out;
}
