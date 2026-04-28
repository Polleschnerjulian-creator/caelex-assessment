/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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

import { getLegalSourceById } from "@/data/legal-sources";

export interface Citation {
  /** Lower-cased label, used for de-duping a Citation across re-renders. */
  key: string;
  /** Display label shown to the user (e.g. "BWRG §3", "NIS2 Art. 21"). */
  label: string;
  /** Optional one-line context (e.g. "Deutsches Gesetz", "EU-Direktive"). */
  hint?: string;
  /** ISO date string of the last time Caelex verified the catalogue
   *  entry against the official source. Populated only when the
   *  citation regex resolves to a known `LegalSource` via the
   *  `catalogueSourceId` mapping in `CITATION_RULES`. The chip uses
   *  this to render a "Caelex-Quelle zuletzt geprüft am …" hint. */
  lastVerified?: string;
  /** Direct URL to the official source text (EUR-Lex, Bundesgesetzblatt,
   *  UNOOSA, etc.). Comes from the same catalogue lookup as
   *  `lastVerified`. Rendered in the popover as "Am offiziellen Text
   *  prüfen ↗" so the lawyer gets a one-click verify path. */
  sourceUrl?: string;
}

interface CitationRule {
  re: RegExp;
  label: (m: RegExpMatchArray) => string;
  hint?: (m: RegExpMatchArray) => string;
  /** Optional resolver that returns a `LegalSource.id` (matching
   *  `@/data/legal-sources` `ALL_SOURCES`) when the rule fires. The
   *  match array is provided so a single rule can dispatch on the
   *  captured law-shortname (e.g. "TKG" → "DE-TKG-2021"). Returns
   *  `undefined` when no catalogue entry exists for this hit, in
   *  which case the chip falls back to the always-shown verify-hint
   *  without a source-specific timestamp. */
  catalogueSourceId?: (m: RegExpMatchArray) => string | undefined;
}

/**
 * Maps the captured law-shortname in the German-laws regex (group 1
 * of the first rule) to the canonical `LegalSource.id` from
 * `@/data/legal-sources`. Lower-cased lookup so casing in the source
 * answer doesn't matter ("tkg" vs "TKG"). Add new entries here when
 * a German statute that the rule already matches gets imported into
 * the catalogue with a fresh `last_verified` timestamp. */
const DE_LAW_SOURCE_IDS: Record<string, string> = {
  tkg: "DE-TKG-2021",
  luftvg: "DE-LUFTVG",
};

export const CITATION_RULES: CitationRule[] = [
  {
    re: /\b(BWRG|BDSG|TKG|LuftVG|AZG)\s*§\s*(\d+[a-z]?)/gi,
    label: (m) => `${m[1].toUpperCase()} §${m[2]}`,
    hint: () => "Deutsches Gesetz",
    catalogueSourceId: (m) => DE_LAW_SOURCE_IDS[m[1].toLowerCase()],
  },
  {
    re: /\b(NIS2|NIS-2)\s*Art\.\s*(\d+)/gi,
    label: (m) => `NIS2 Art. ${m[2]}`,
    hint: () => "EU-Direktive 2022/2555",
    // The citation references the EU directive directly (Art. 21 of the
    // directive, not the German BSIG transposition). Point at the source
    // text in EUR-Lex so the lawyer's verify-link lands on the canonical
    // article number, not a German section reference.
    catalogueSourceId: () => "EU-NIS2-2022",
  },
  {
    re: /\bArt\.\s*(I{1,3}|IV|V|VI{0,3}|IX|X{0,3})\s*(OST|Outer Space Treaty)/gi,
    label: (m) => `OST Art. ${m[1]}`,
    hint: () => "Weltraumvertrag 1967",
    catalogueSourceId: () => "INT-OST-1967",
  },
  {
    re: /\bArt\.\s*(\d+)\s*(EU Space Act|Space Act EU)/gi,
    label: (m) => `EU Space Act Art. ${m[1]}`,
    hint: () => "EU-Verordnung COM(2025) 335",
    catalogueSourceId: () => "EU-SPACE-ACT",
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
 * Resolve a `LegalSource.id` against the static catalogue and pull
 * the two fields we surface in the citation popover. Returns `{}`
 * when the id doesn't resolve, in which case the chip falls back
 * to the always-shown generic verify hint without source-specific
 * metadata.
 *
 * Static import is safe: `@/data/legal-sources` is already part
 * of the Atlas client bundle (AtlasMarkdown, ContextPanel,
 * CommandPaletteModal all import it), so the byte-cost has
 * already been paid. A lazy require would add complexity without
 * shrinking anything. */
function resolveCatalogueSource(sourceId: string | undefined): {
  lastVerified?: string;
  sourceUrl?: string;
} {
  if (!sourceId) return {};
  const src = getLegalSourceById(sourceId);
  if (!src) return {};
  return {
    lastVerified: src.last_verified,
    sourceUrl: src.source_url,
  };
}

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
        const sourceId = rule.catalogueSourceId
          ? rule.catalogueSourceId(m)
          : undefined;
        const { lastVerified, sourceUrl } = resolveCatalogueSource(sourceId);
        seen.set(key, {
          key,
          label,
          hint: rule.hint ? rule.hint(m) : undefined,
          lastVerified,
          sourceUrl,
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
      const sourceId = rule.catalogueSourceId
        ? rule.catalogueSourceId(m)
        : undefined;
      const { lastVerified, sourceUrl } = resolveCatalogueSource(sourceId);
      // Pipe-separated, URI-encoded payload. Order is fixed so older
      // chips that only know key|label|hint still parse — additional
      // fields are appended at the end and ignored when missing.
      const payload = [
        encodeURIComponent(key),
        encodeURIComponent(label),
        encodeURIComponent(hint),
        encodeURIComponent(lastVerified ?? ""),
        encodeURIComponent(sourceUrl ?? ""),
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
 *
 * Tolerates older 3-field payloads (key|label|hint) for backward
 * compatibility — the additional `lastVerified` and `sourceUrl`
 * fields default to `undefined` when absent.
 */
export function parseCitationHref(href: string): Citation | null {
  if (!href.startsWith("atlas-citation:")) return null;
  const payload = href.slice("atlas-citation:".length);
  const parts = payload.split("|");
  const [keyEnc, labelEnc, hintEnc, lastVerifiedEnc, sourceUrlEnc] = parts;
  if (!keyEnc || !labelEnc) return null;
  try {
    const hint = hintEnc ? decodeURIComponent(hintEnc) : "";
    const lastVerified = lastVerifiedEnc
      ? decodeURIComponent(lastVerifiedEnc)
      : "";
    const sourceUrl = sourceUrlEnc ? decodeURIComponent(sourceUrlEnc) : "";
    return {
      key: decodeURIComponent(keyEnc),
      label: decodeURIComponent(labelEnc),
      hint: hint || undefined,
      lastVerified: lastVerified || undefined,
      sourceUrl: sourceUrl || undefined,
    };
  } catch {
    return null;
  }
}
