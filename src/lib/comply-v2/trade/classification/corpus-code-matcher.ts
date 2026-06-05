/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Corpus code/keyword matcher (DCW-1 / P0-A).
 *
 * The parametric matcher (matchAgainstCrossWalk) reasons over numeric/boolean
 * predicates and REFUTES any predicate-less entry — so a bare declared control
 * code (USML XV(e)(17), Wassenaar 6.A.2.a.1, DE Ausfuhrliste 0010j, ...) or a
 * free-text keyword matches nothing there. This module is the complementary
 * path: it looks codes + keywords up against NORMALIZED_CORPUS_UNION so the
 * classifier can (a) recognise/validate a declared code as controlled and
 * (b) surface a control list hit from a datasheet keyword.
 *
 * Pure + deterministic — no I/O, no Claude, zero external cost. SCREENING-
 * LEVEL guidance only; a non-match here never means "uncontrolled" (the union
 * is broad but not exhaustive).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  NORMALIZED_CORPUS_UNION,
  type NormalizedCorpusEntry,
} from "@/data/trade/normalized-corpus";

export interface CorpusCodeMatch {
  entry: NormalizedCorpusEntry;
  matchKind: "exact-code" | "code-prefix" | "keyword";
  confidence: "HIGH" | "MEDIUM" | "LOW";
  rationale: string;
}

/** Canonicalize a control code for comparison: trim, upper, drop whitespace. */
function normCode(s: string): string {
  return s.trim().toUpperCase().replace(/\s+/g, "");
}

const MIN_PREFIX_LEN = 4; // avoid trivial "9"/"XV" matching everything

/**
 * Resolve a single declared/queried control code against the union.
 * Exact normalized matches (HIGH) win; if none, code-family prefix matches
 * (MEDIUM) — e.g. declared "XV(a)(7)" resolves the finer "XV(a)(7)(i)".
 * Returns [] for an empty/too-short code with no exact hit.
 */
export function matchByCode(code: string): CorpusCodeMatch[] {
  const q = normCode(code);
  if (!q) return [];
  const exact: CorpusCodeMatch[] = [];
  const prefix: CorpusCodeMatch[] = [];
  for (const entry of NORMALIZED_CORPUS_UNION) {
    const ec = normCode(entry.code);
    if (ec === q) {
      exact.push({
        entry,
        matchKind: "exact-code",
        confidence: "HIGH",
        rationale: `Exact match to ${entry.list} ${entry.code}`,
      });
    } else if (
      q.length >= MIN_PREFIX_LEN &&
      ec.length >= MIN_PREFIX_LEN &&
      (ec.startsWith(q) || q.startsWith(ec))
    ) {
      prefix.push({
        entry,
        matchKind: "code-prefix",
        confidence: "MEDIUM",
        rationale: `Code-family match: declared "${code}" relates to ${entry.list} ${entry.code}`,
      });
    }
  }
  return exact.length > 0 ? exact : prefix;
}

/**
 * Keyword scan over title + description. LOW confidence by design — a hint
 * for the human classifier, never an automatic determination. Ranked by the
 * number of distinct query tokens (>=3 chars) that appear.
 */
export function matchByKeyword(text: string, limit = 10): CorpusCodeMatch[] {
  const tokens = Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => t.length >= 3),
    ),
  );
  if (tokens.length === 0) return [];
  const scored: Array<{ entry: NormalizedCorpusEntry; hits: number }> = [];
  for (const entry of NORMALIZED_CORPUS_UNION) {
    const hay = `${entry.title} ${entry.description}`.toLowerCase();
    let hits = 0;
    for (const t of tokens) if (hay.includes(t)) hits++;
    if (hits > 0) scored.push({ entry, hits });
  }
  scored.sort((a, b) => b.hits - a.hits);
  return scored.slice(0, limit).map(({ entry, hits }) => ({
    entry,
    matchKind: "keyword" as const,
    confidence: "LOW" as const,
    rationale: `Keyword hint: ${hits} term(s) match ${entry.list} ${entry.code}`,
  }));
}

export interface DeclaredCodes {
  eccnUS?: string | null;
  eccnEU?: string | null;
  usmlCategory?: string | null;
  mtcrCategory?: string | null;
  germanAlEntry?: string | null;
}

/**
 * Resolve every declared control code on an item against the union, de-duped
 * by canonicalId. The leak-closer: a declared USML/Wassenaar/etc code that
 * the parametric matcher cannot see is recognised here.
 */
export function matchDeclaredCodes(codes: DeclaredCodes): CorpusCodeMatch[] {
  const declared = [
    codes.usmlCategory,
    codes.eccnUS,
    codes.eccnEU,
    codes.mtcrCategory,
    codes.germanAlEntry,
  ].filter((c): c is string => !!c && c.trim().length > 0);

  const out: CorpusCodeMatch[] = [];
  const seen = new Set<string>();
  for (const code of declared) {
    for (const m of matchByCode(code)) {
      if (seen.has(m.entry.canonicalId)) continue;
      seen.add(m.entry.canonicalId);
      out.push(m);
    }
  }
  return out;
}

/** True if any declared code resolves to an ITAR (USML / USML-XV) entry. */
export function declaredCodesImplyItar(codes: DeclaredCodes): boolean {
  return matchDeclaredCodes(codes).some((m) => m.entry.isItar);
}
