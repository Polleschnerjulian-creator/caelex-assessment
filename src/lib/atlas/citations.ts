/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * Atlas Citation Parser — shared utility for detecting legal citations
 * in plaintext (Atlas-streamed answers, lawyer-typed memos, etc.) and
 * turning them into structured tokens that downstream components can
 * render as clickable chips.
 *
 * Originally lived in ContextPanel; extracted here for Phase 3 (inline
 * Citation Highlighter in atlas messages). Both consumers — the right-
 * side ContextPanel chip list AND the in-message AtlasMarkdown chips —
 * share the same rule table so a citation is recognised identically
 * wherever it appears.
 *
 * Design notes
 *   - Patterns are deliberately conservative — we look for the textual
 *     forms lawyers actually write: "BWRG §3", "Art. VI OST", "NIS2
 *     Art. 21". False-negatives (missed matches) are far better than
 *     false-positives (highlighting non-citations).
 *   - No LLM round-trip. The parser is regex-only so it runs every
 *     render during streaming without latency cost.
 *   - `injectCitationsAsLinks` rewrites the plaintext into Markdown
 *     where each citation becomes a pseudo-link with an
 *     `atlas-citation:` href. Markdown renderers (AtlasMarkdown) can
 *     intercept that href in their `a` component override and render
 *     a chip instead.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface Citation {
  /** Lower-cased label, used for de-duping a Citation across re-renders. */
  key: string;
  /** Display label shown to the user (e.g. "BWRG §3", "NIS2 Art. 21"). */
  label: string;
  /** Optional one-line context (e.g. "Deutsches Gesetz", "EU-Direktive"). */
  hint?: string;
}

interface CitationRule {
  re: RegExp;
  label: (m: RegExpMatchArray) => string;
  hint?: (m: RegExpMatchArray) => string;
}

export const CITATION_RULES: CitationRule[] = [
  {
    re: /\b(BWRG|BDSG|TKG|LuftVG|AZG)\s*§\s*(\d+[a-z]?)/gi,
    label: (m) => `${m[1].toUpperCase()} §${m[2]}`,
    hint: () => "Deutsches Gesetz",
  },
  {
    re: /\b(NIS2|NIS-2)\s*Art\.\s*(\d+)/gi,
    label: (m) => `NIS2 Art. ${m[2]}`,
    hint: () => "EU-Direktive 2022/2555",
  },
  {
    re: /\bArt\.\s*(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*(OST|Outer Space Treaty)/gi,
    label: (m) => `OST Art. ${m[1]}`,
    hint: () => "Weltraumvertrag 1967",
  },
  {
    re: /\bArt\.\s*(\d+)\s*(EU Space Act|Space Act EU)/gi,
    label: (m) => `EU Space Act Art. ${m[1]}`,
    hint: () => "EU-Verordnung COM(2025) 335",
  },
  {
    re: /\b(FCC|FAA|ITAR|EAR)\s*(?:Part|§|Rule)?\s*([\d.]+)/gi,
    label: (m) => `${m[1].toUpperCase()} ${m[2]}`,
    hint: () => "US-Regelung",
  },
  {
    re: /\b(Liability Convention|Registration Convention|Rescue Agreement|Moon Agreement)\s*Art\.\s*([IVX]+|\d+)/gi,
    label: (m) => `${m[1]} Art. ${m[2]}`,
    hint: () => "UN-Weltraumvertrag",
  },
];

/**
 * Extract all unique citations from a block of plaintext. Used by
 * ContextPanel to render the right-side citation chip list.
 */
export function extractCitations(text: string): Citation[] {
  const seen = new Map<string, Citation>();
  for (const rule of CITATION_RULES) {
    const matches = text.matchAll(rule.re);
    for (const m of matches) {
      const label = rule.label(m);
      const key = label.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, {
          key,
          label,
          hint: rule.hint ? rule.hint(m) : undefined,
        });
      }
    }
  }
  return Array.from(seen.values());
}

/**
 * Rewrite plaintext so that every citation match becomes a Markdown
 * pseudo-link of the form `[label](atlas-citation:key|encodedLabel|encodedHint)`.
 *
 * Downstream Markdown renderers (AtlasMarkdown) intercept the
 * `atlas-citation:` prefix in their `a` component override and render
 * an interactive chip instead of a real anchor.
 *
 * The encoded payload after the colon uses pipe-separated URI-encoded
 * fields so the Markdown renderer can recover the original key, label
 * and hint without re-running the regex.
 *
 * Streaming-safe: if the input ends mid-pattern (e.g. "BWRG §" without
 * a number yet), the regex won't match and the partial text passes
 * through untouched. When the next token arrives ("BWRG §3"), the
 * subsequent render injects the link cleanly. No stale state.
 */
export function injectCitationsAsLinks(text: string): string {
  let result = text;
  for (const rule of CITATION_RULES) {
    result = result.replace(rule.re, (...args) => {
      // .replace passes (match, group1, group2, ..., offset, string).
      // Reconstruct a RegExpMatchArray-shaped object so the rule's
      // label/hint functions can read m[1], m[2] just like in matchAll.
      const groups = args.slice(0, args.length - 2);
      const m = groups as unknown as RegExpMatchArray;
      const match = groups[0] as string;
      const label = rule.label(m);
      const key = label.toLowerCase();
      const hint = rule.hint ? rule.hint(m) : "";
      const payload = [
        encodeURIComponent(key),
        encodeURIComponent(label),
        encodeURIComponent(hint),
      ].join("|");
      // Escape brackets that might appear in the matched text — rare
      // for citations but defensive. The label inside [...] keeps the
      // ORIGINAL match text so visual continuity is preserved during
      // streaming (no flash from "BWRG §3" → "BWRG §3" via different
      // codepoints).
      const safeMatch = match.replace(/\[/g, "\\[").replace(/\]/g, "\\]");
      return `[${safeMatch}](atlas-citation:${payload})`;
    });
  }
  return result;
}

/**
 * Decode the pipe-separated payload from an `atlas-citation:` href.
 * Returns null if the href doesn't match the expected shape (so the
 * Markdown renderer falls through to normal `<a>` behaviour).
 */
export function parseCitationHref(href: string): Citation | null {
  if (!href.startsWith("atlas-citation:")) return null;
  const payload = href.slice("atlas-citation:".length);
  const [keyEnc, labelEnc, hintEnc] = payload.split("|");
  if (!keyEnc || !labelEnc) return null;
  try {
    const hint = hintEnc ? decodeURIComponent(hintEnc) : "";
    return {
      key: decodeURIComponent(keyEnc),
      label: decodeURIComponent(labelEnc),
      hint: hint || undefined,
    };
  } catch {
    return null;
  }
}
