"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Markdown content renderer (Sprint 6, 2026-05-12).
 *
 * Tiny markdown subset for assistant responses. Rather than pulling
 * in react-markdown (~30 KB + plugins), we parse the two patterns
 * that matter most for lawyer-grade outputs:
 *
 *   1. Markdown tables  (| col | col |\n|---|---|\n| cell | cell |)
 *      → rendered as a real <table> with sticky header + zebra rows.
 *   2. Paragraphs       (everything else)
 *      → rendered as <p>, with bold/italic inline markdown stripped
 *        but preserved as visible markers.
 *
 * Bullet lists, headings, code blocks etc. are intentionally left as
 * plain text — they're rare in our LLM outputs and adding a real
 * markdown parser adds bundle weight + risk.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { Fragment, type ReactNode } from "react";

/**
 * Minimal citation shape MarkdownContent needs to render inline pills.
 * Kept as a structural interface so we don't drag the full CitationsPanel
 * type through (which has many more fields). The chat-view passes the
 * subset it has from message.citations.
 */
export interface InlineCitation {
  index: number;
  sourceId: string;
  citation: string;
  /** Validity status from the corpus check — drives the inline pill
   *  color (Hallucination-Verifier UX, 2026-05-13). When undefined or
   *  set to "unknown", the pill renders in a neutral slate (the
   *  Atlas-Korpus had no match for the cited source-id, which is itself
   *  a yellow-flag for the lawyer). */
  badge?:
    | "in_force"
    | "needs_review"
    | "pending"
    | "amended"
    | "repealed"
    | "unknown";
  /** Optional metadata for the hover-tooltip — when missing, the
   *  tooltip falls back to just the raw citation string. */
  title?: string | null;
  status?: string | null;
  lastVerified?: string | null;
}

interface Props {
  text: string;
  /** Optional — when provided, `[ATLAS:source-id]` tokens render as
   *  numbered clickable pills (¹ ² ³) that scroll to the matching
   *  citation row. When undefined or empty (e.g. during streaming
   *  before citations are extracted), tokens render as a fallback
   *  source-id text. */
  citations?: InlineCitation[];
}

export function MarkdownContent({ text, citations }: Props) {
  const blocks = parseBlocks(text);
  /* Build a lookup: source-id → index. Used by renderInline to turn
     [ATLAS:xx] into the right pill number. */
  const sourceMap = new Map<string, InlineCitation>();
  if (citations) {
    for (const c of citations) sourceMap.set(c.sourceId, c);
  }
  return <>{blocks.map((b, i) => renderBlock(b, i, sourceMap))}</>;
}

/* ── Block parsing ─────────────────────────────────────────────────────
 * Block kinds we render:
 *   - table       Markdown pipe-tables   ("| col | col |\n|---|---|\n…")
 *   - heading     #/##/### lines         ("# Heading")
 *   - list        - or * or 1.           consecutive list items
 *   - blockquote  > line(s)              consecutive '> ' prefixed
 *   - paragraph   everything else
 *
 * Lists support unordered (- / *) and ordered (1.) styles. Nested
 * lists are NOT supported on this round — we surface a flat list.
 * Most lawyer-grade responses use shallow lists; deep nesting would
 * need a heavier parser.
 * --------------------------------------------------------------------*/

type Block =
  | { kind: "table"; rows: string[][]; header: string[] }
  | { kind: "heading"; level: 1 | 2 | 3; text: string }
  | { kind: "list"; ordered: boolean; items: string[] }
  | { kind: "blockquote"; text: string }
  | { kind: "paragraph"; text: string };

const HEADING_RE = /^(#{1,3})\s+(.+)$/;
const UL_RE = /^[-*]\s+(.+)$/;
const OL_RE = /^\d+\.\s+(.+)$/;
const QUOTE_RE = /^>\s?(.*)$/;

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    /* Table — multi-line, leading row + separator + body. */
    if (isTableStart(lines, i)) {
      const result = consumeTable(lines, i);
      if (result) {
        blocks.push(result.block);
        i = result.end;
        continue;
      }
    }

    const trimmed = lines[i].trim();

    /* Blank line — block separator. */
    if (trimmed === "") {
      i++;
      continue;
    }

    /* Heading — one line, # / ## / ###. */
    const h = trimmed.match(HEADING_RE);
    if (h) {
      const level = h[1].length as 1 | 2 | 3;
      blocks.push({ kind: "heading", level, text: h[2].trim() });
      i++;
      continue;
    }

    /* List — consume consecutive bullet or numbered items. */
    if (UL_RE.test(trimmed) || OL_RE.test(trimmed)) {
      const ordered = OL_RE.test(trimmed);
      const items: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t === "") break;
        const ul = t.match(UL_RE);
        const ol = t.match(OL_RE);
        if (ul) items.push(ul[1]);
        else if (ol) items.push(ol[1]);
        else break;
        i++;
      }
      if (items.length > 0) blocks.push({ kind: "list", ordered, items });
      continue;
    }

    /* Blockquote — consecutive '> ' lines joined with newlines. */
    if (QUOTE_RE.test(trimmed)) {
      const quoteLines: string[] = [];
      while (i < lines.length) {
        const t = lines[i].trim();
        if (t === "") break;
        const q = t.match(QUOTE_RE);
        if (!q) break;
        quoteLines.push(q[1]);
        i++;
      }
      blocks.push({ kind: "blockquote", text: quoteLines.join("\n") });
      continue;
    }

    /* Paragraph — non-empty consecutive lines until next blank /
       table / heading / list / quote line. */
    const start = i;
    while (i < lines.length) {
      const t = lines[i].trim();
      if (
        t === "" ||
        isTableStart(lines, i) ||
        HEADING_RE.test(t) ||
        UL_RE.test(t) ||
        OL_RE.test(t) ||
        QUOTE_RE.test(t)
      )
        break;
      i++;
    }
    const para = lines.slice(start, i).join("\n").trim();
    if (para) blocks.push({ kind: "paragraph", text: para });
  }
  return blocks;
}

function isTableStart(lines: string[], i: number): boolean {
  /* A markdown table needs a header row (with |) followed by a
     separator row matching |---|---|... pattern. */
  if (i + 1 >= lines.length) return false;
  const header = lines[i].trim();
  const sep = lines[i + 1].trim();
  if (!header.includes("|")) return false;
  /* Separator row: only |, -, :, spaces. At least one - per cell. */
  if (!/^\|?[\s\-:|]+\|?$/.test(sep)) return false;
  /* And at least one --- group inside it. */
  return /---/.test(sep);
}

function consumeTable(
  lines: string[],
  start: number,
): { block: Block; end: number } | null {
  const headerCells = parseRow(lines[start]);
  if (headerCells.length === 0) return null;
  /* Skip the separator row. */
  let i = start + 2;
  const rows: string[][] = [];
  while (i < lines.length) {
    const trimmed = lines[i].trim();
    if (trimmed === "") break;
    if (!trimmed.includes("|")) break;
    rows.push(parseRow(lines[i]));
    i++;
  }
  if (rows.length === 0) return null;
  return {
    block: { kind: "table", header: headerCells, rows },
    end: i,
  };
}

function parseRow(line: string): string[] {
  /* Markdown rows often have leading + trailing |. Strip them, then
     split on |. Trim each cell. */
  let l = line.trim();
  if (l.startsWith("|")) l = l.slice(1);
  if (l.endsWith("|")) l = l.slice(0, -1);
  return l.split("|").map((c) => c.trim());
}

/* ── Block rendering ─────────────────────────────────────────────────── */

function renderBlock(
  b: Block,
  key: number,
  sourceMap: Map<string, InlineCitation>,
): ReactNode {
  if (b.kind === "table") {
    return (
      <div
        key={key}
        className="my-4 overflow-x-auto rounded-xl bg-slate-50 dark:bg-white/[0.02]"
      >
        <table className="w-full border-collapse text-[12.5px]">
          <thead>
            <tr>
              {b.header.map((h, i) => (
                <th
                  key={i}
                  className="border-b border-slate-200 px-3 py-2 text-left font-medium text-slate-800 dark:border-white/[0.06] dark:text-slate-200"
                >
                  {renderInline(h, sourceMap)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {b.rows.map((row, ri) => (
              <tr key={ri}>
                {b.header.map((_, ci) => (
                  <td
                    key={ci}
                    className="border-t border-slate-200 px-3 py-2 align-top text-slate-700 dark:border-white/[0.04] dark:text-slate-300"
                  >
                    {renderInline(row[ci] ?? "", sourceMap)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (b.kind === "heading") {
    /* Headings use distinct sizes so a structured answer reads like
       a memo. We cap at h3 — h4+ would crowd the prose. */
    if (b.level === 1) {
      return (
        <h2
          key={key}
          className="mb-3 mt-5 text-[18px] font-semibold leading-tight text-slate-900 first:mt-0 dark:text-slate-100"
        >
          {renderInline(b.text, sourceMap)}
        </h2>
      );
    }
    if (b.level === 2) {
      return (
        <h3
          key={key}
          className="mb-2 mt-4 text-[15.5px] font-semibold leading-snug text-slate-900 first:mt-0 dark:text-slate-100"
        >
          {renderInline(b.text, sourceMap)}
        </h3>
      );
    }
    return (
      <h4
        key={key}
        className="mb-2 mt-3 text-[13.5px] font-semibold uppercase tracking-wide text-slate-700 first:mt-0 dark:text-slate-300"
      >
        {renderInline(b.text, sourceMap)}
      </h4>
    );
  }

  if (b.kind === "list") {
    /* Flat list — see parseBlocks for why we don't support nesting.
       We render ol/ul natively (vs paragraph + bullet glyphs) so
       browser semantics + accessibility tooling pick it up. */
    if (b.ordered) {
      return (
        <ol
          key={key}
          className="my-3 list-decimal space-y-1 pl-6 last:mb-0 marker:text-slate-400 dark:marker:text-slate-500"
        >
          {b.items.map((it, ii) => (
            <li key={ii}>{renderInline(it, sourceMap)}</li>
          ))}
        </ol>
      );
    }
    return (
      <ul
        key={key}
        className="my-3 list-disc space-y-1 pl-6 last:mb-0 marker:text-slate-400 dark:marker:text-slate-500"
      >
        {b.items.map((it, ii) => (
          <li key={ii}>{renderInline(it, sourceMap)}</li>
        ))}
      </ul>
    );
  }

  if (b.kind === "blockquote") {
    /* Subtle left-border accent. Quote text is one shade muter than
       paragraph text to read as commentary, not as the answer. */
    return (
      <blockquote
        key={key}
        className="my-3 border-l-2 border-slate-300 pl-3 text-slate-600 last:mb-0 dark:border-slate-600 dark:text-slate-400"
      >
        {renderInline(b.text, sourceMap)}
      </blockquote>
    );
  }

  /* Confidence-Heatmap (2026-05-13): every substantive paragraph
     carries a left-border accent that signals how grounded the claim
     is. Two visible states (we deliberately don't paint EVERY paragraph
     to keep noise low):
       - emerald-200 + faint left-border → paragraph contains 1+
         verified Atlas-corpus citations
       - amber-200 + faint left-border → paragraph is substantive
         (≥40 words) and contains ZERO citations (hallucination-flag)
       - no border → short transitional text or section headers

     Tooltip on the wrapper explains the signal so the lawyer knows
     why the indicator is there and what to do about it.

     AUDIT-FIX H29 (2026-05-14): on mobile/touch devices the title-
     attribute tooltip is invisible. Add a tiny visible glyph next to
     the paragraph so the encoded signal is perceivable without hover.
     The glyph is aria-hidden because the title (and the paragraph's
     left-border + colour) already convey the same info to AT users via
     the wrapper's title attribute. The glyph sits as a small inline
     marker at the start of the paragraph (left of the text) so it
     doesn't compete with the right-aligned reading flow. */
  const conf = paragraphConfidence(b.text);
  const wrapperCls = confidenceWrapperClasses(conf);
  const tooltip = confidenceTooltip(conf);
  const glyph = confidenceGlyph(conf);
  return (
    <p
      key={key}
      title={tooltip}
      className={`mb-3 last:mb-0 whitespace-pre-wrap ${wrapperCls}`}
    >
      {glyph}
      {renderInline(b.text, sourceMap)}
    </p>
  );
}

/* ── Inline-pill helpers (Hallucination-Verifier UX, 2026-05-13) ──── */

function inlinePillClasses(badge: InlineCitation["badge"]): string {
  switch (badge) {
    case "in_force":
      return "bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-200 dark:hover:bg-emerald-500/25";
    case "amended":
      return "bg-orange-100 text-orange-800 hover:bg-orange-200 dark:bg-orange-500/15 dark:text-orange-200 dark:hover:bg-orange-500/25";
    case "repealed":
      return "bg-red-100 text-red-800 hover:bg-red-200 dark:bg-red-500/15 dark:text-red-200 dark:hover:bg-red-500/25";
    case "needs_review":
    case "pending":
      return "bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-500/15 dark:text-amber-200 dark:hover:bg-amber-500/25";
    case "unknown":
    default:
      /* Slate-default fallback — used both when badge is missing
         (streaming, or older messages without the field) and when the
         corpus check explicitly returned "unknown". */
      return "bg-slate-200 text-slate-700 hover:bg-slate-300 dark:bg-white/[0.10] dark:text-slate-200 dark:hover:bg-white/[0.18]";
  }
}

/* AUDIT-FIX H30 (2026-05-14): pill glyph encodes badge status WITHOUT
   relying on colour, so a colour-blind reader or a greyscale-printout
   reader can still distinguish verified vs amended vs repealed vs
   unknown. Glyph sits inside the pill, prefixed before the index.

   Mapping:
     - in_force        → ""  (no glyph; pill stands clean for the common case)
     - needs_review    → "*" (pill content e.g. "*1" — stale verification)
     - pending         → "*" (same — draft/planned text, treat as stale)
     - amended         → "*" (same — newer fassung exists, citation drifted)
     - repealed        → "!" (pill content e.g. "!1" — norm no longer in force)
     - unknown         → "?" (pill content e.g. "?1" — not in corpus)

   Kept ASCII-only so the pill width stays predictable; glyph rendered
   inline without extra spacing so "?1" reads as one token. */
function inlinePillGlyph(badge: InlineCitation["badge"]): string {
  switch (badge) {
    case "needs_review":
    case "pending":
    case "amended":
      return "*";
    case "repealed":
      return "!";
    case "unknown":
      return "?";
    case "in_force":
    default:
      return "";
  }
}

function buildPillTooltip(c: InlineCitation): string {
  const lines: string[] = [];
  if (c.title) lines.push(c.title);
  if (c.badge) {
    const label =
      c.badge === "in_force"
        ? "Verifiziert · in Kraft"
        : c.badge === "needs_review"
          ? "In Kraft · letzte Verifikation veraltet"
          : c.badge === "pending"
            ? "Entwurf / geplant"
            : c.badge === "amended"
              ? "Geändert · neuere Fassung existiert"
              : c.badge === "repealed"
                ? "Aufgehoben"
                : "Nicht im Atlas-Korpus gefunden";
    lines.push(`Status: ${label}`);
  }
  if (c.lastVerified) {
    const d = new Date(c.lastVerified);
    if (!isNaN(d.getTime())) {
      lines.push(`Zuletzt geprüft: ${d.toLocaleDateString("de-DE")}`);
    }
  }
  if (lines.length === 0) {
    /* Streaming or sparse-metadata fallback — show the raw cited
       string so the user at least sees what was cited. */
    return c.citation;
  }
  lines.push("Klick öffnet die Quelle in der Quellenliste unten.");
  return lines.join("\n");
}

/* ── Paragraph-confidence helpers (Heatmap UX, 2026-05-13) ────────── */

type ConfidenceLevel = "grounded" | "ungrounded" | "neutral";

function paragraphConfidence(text: string): ConfidenceLevel {
  /* Cheap heuristic — count `[ATLAS:…]` tokens + word-count.
     - 1+ tokens   → grounded
     - 0 tokens && short paragraph (<40 words) → neutral (probably a
       transition / restated question / acknowledgement — not a
       substantive legal claim that needs grounding)
     - 0 tokens && substantive paragraph → ungrounded (the heatmap
       flags it as worth manual verification) */
  ATLAS_CITATION_RE.lastIndex = 0;
  const hasCitation = ATLAS_CITATION_RE.test(text);
  if (hasCitation) return "grounded";
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount < 40) return "neutral";
  return "ungrounded";
}

const ATLAS_CITATION_RE = /\[ATLAS:[^\]]+\]/g;

function confidenceWrapperClasses(c: ConfidenceLevel): string {
  switch (c) {
    case "grounded":
      return "border-l-2 border-emerald-200/80 pl-3 dark:border-emerald-500/25";
    case "ungrounded":
      return "border-l-2 border-amber-200/80 pl-3 dark:border-amber-500/25";
    case "neutral":
    default:
      return "";
  }
}

function confidenceTooltip(c: ConfidenceLevel): string | undefined {
  switch (c) {
    case "grounded":
      return "Diese Aussage stützt sich auf eine oder mehrere verifizierte Quellen (siehe Pille → Quellenpanel).";
    case "ungrounded":
      return "Substantielle Aussage ohne Quellenangabe im Atlas-Korpus. Bitte manuell prüfen.";
    case "neutral":
    default:
      return undefined;
  }
}

/* AUDIT-FIX H29 (2026-05-14): visible glyph that mirrors the left-border
   colour-coding for mobile/touch users (where `title` tooltip never
   surfaces). aria-hidden because the wrapper <p title=…> already carries
   the equivalent info for AT users.

   Glyph choices:
     - grounded   → ✓ in emerald — "Quelle vorhanden"
     - ungrounded → ⚠ in amber   — "Bitte manuell prüfen"
     - neutral    → null         — short transitions don't need a marker

   Sized text-[10px] so it sits inline without competing with body text;
   slight right-margin separates it from the first word. */
function confidenceGlyph(c: ConfidenceLevel): ReactNode {
  if (c === "grounded") {
    return (
      <span
        aria-hidden="true"
        className="mr-1 inline-block align-middle text-[10px] font-bold leading-none text-emerald-600 dark:text-emerald-400"
      >
        ✓
      </span>
    );
  }
  if (c === "ungrounded") {
    return (
      <span
        aria-hidden="true"
        className="mr-1 inline-block align-middle text-[10px] font-bold leading-none text-amber-600 dark:text-amber-400"
      >
        ⚠
      </span>
    );
  }
  return null;
}

/* ── Inline rendering ────────────────────────────────────────────────── */

/**
 * Smooth-scroll a citation anchor into view. Used by inline pills.
 * Falls back to instant-scroll on browsers without `behavior: smooth`.
 * Highlights the row briefly so the user sees what was clicked.
 */
function scrollToCitation(sourceId: string) {
  if (typeof document === "undefined") return;
  /* AUDIT-FIX C8: source-IDs come from the server presumably-safe but we
     use the raw value as both an HTML id (hereafter, on the panel side
     in CitationsPanel) and as part of an href attribute. encodeURIComponent
     on both sides keeps quotes / specials from breaking the attribute or
     the DOM lookup. */
  const target = document.getElementById(
    `citation-${encodeURIComponent(sourceId)}`,
  );
  if (!target) return;
  target.scrollIntoView({ behavior: "smooth", block: "center" });
  /* Brief highlight pulse — the row's normal style is restored via a
     short CSS class swap. The class is a Tailwind ring + animate-pulse
     applied for 1.2s. Self-clearing. */
  target.classList.add("ring-2", "ring-emerald-300", "ring-offset-1");
  setTimeout(
    () =>
      target.classList.remove("ring-2", "ring-emerald-300", "ring-offset-1"),
    1200,
  );
}

/* Tiny inline-markdown handling: **bold**, *italic*, `code`, and
   [ATLAS:…] citations get a subtle visual marker. We do this without
   regex-heavy parsers — split on the strong patterns, wrap in spans. */
function renderInline(
  text: string,
  sourceMap: Map<string, InlineCitation>,
): ReactNode[] {
  if (!text) return [];

  const parts: ReactNode[] = [];
  let remaining = text;
  /* AUDIT-FIX L13 (2026-05-15): unique-key generator. Previously the
     plain-text segments pushed at lines `parts.push(remaining.slice(...))`
     went in keyless, while only the wrapped `<span>`s carried keys via
     `key={key++}`. When adjacent matches landed without intervening text
     (e.g. `**bold**__more__` or `[ATLAS:a][ATLAS:b]`), React reconciled
     the wrapped spans by their numeric position in the array and could
     emit "two children with the same key" warnings if a downstream
     consumer mapped the array a second time. We now wrap EVERY pushed
     part — text and JSX alike — in a `<Fragment key=...>` so each part
     is unambiguously keyed by its own monotonically-increasing index.
     A counter is sufficient because keys only need to be unique among
     siblings of the same parent (renderInline returns one such array). */
  let nextKey = 0;
  const makeKey = () => `inline-${nextKey++}`;

  /* Greedy split on the first matched pattern; recurse on the
     remainder. Order matters: bold (**) before italic (*) so we
     don't split inside bold. Link pattern has TWO capture groups
     (text + url) so the wrap signature accepts the full match
     array — single-group patterns read match[1] as before. */
  const patterns: Array<{
    re: RegExp;
    wrap: (m: RegExpMatchArray) => ReactNode;
  }> = [
    {
      re: /\*\*(.+?)\*\*/,
      wrap: (m) => (
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          {m[1]}
        </strong>
      ),
    },
    {
      re: /`([^`]+)`/,
      wrap: (m) => (
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11.5px] text-slate-800 dark:bg-white/[0.06] dark:text-slate-200">
          {m[1]}
        </code>
      ),
    },
    {
      /* [text](url) → safe external link. We only allow http(s)://
         and mailto: — every other scheme (javascript:, data:, etc.)
         degrades to a plain-text span. Order matters: this MUST
         come before the [ATLAS:…] pattern. The pattern captures
         match[1]=text and match[2]=url. */
      re: /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/,
      wrap: (m) => {
        const linkText = m[1];
        const url = m[2];
        return (
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-slate-400 underline-offset-2 transition-colors hover:decoration-slate-700 dark:decoration-slate-500 dark:hover:decoration-slate-300"
          >
            {linkText}
          </a>
        );
      },
    },
    {
      /* [ATLAS:source-id] → status-colored numbered pill. The pill
         color encodes the corpus-validity check (Hallucination-
         Verifier UX, 2026-05-13):
           emerald = in_force (verified, current)
           amber   = needs_review / pending (verified but stale)
           orange  = amended (current text differs from cited version)
           red     = repealed (cited norm no longer in force)
           slate   = unknown (NOT in corpus — biggest red flag for the
                     lawyer, but rendered slate to look "neutral" rather
                     than alarming since the raw fact is "we couldn't
                     find this", not "this is wrong")
         Tooltip carries multi-line context: title, status, last-
         verified date. Click scrolls to the matching CitationsPanel
         row + flashes a ring-highlight. Streaming fallback shows a
         short source-id sup until citations are extracted. */
      re: /\[ATLAS:([^\]]+)\]/,
      wrap: (m) => {
        const sourceId = m[1];
        const hit = sourceMap.get(sourceId);
        if (hit) {
          const cls = inlinePillClasses(hit.badge);
          const tooltip = buildPillTooltip(hit);
          /* AUDIT-FIX H30 (2026-05-14): non-colour status indicator
             prepended to the index. When a glyph is present, widen the
             pill min-width slightly so the glyph + 2-digit index don't
             feel cramped (e.g. "*12" needs more room than "12"). */
          const glyph = inlinePillGlyph(hit.badge);
          const widthCls = glyph
            ? "h-[16px] min-w-[22px] px-1.5"
            : "h-[16px] min-w-[16px] px-1";
          return (
            <a
              href={`#citation-${encodeURIComponent(hit.sourceId)}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToCitation(hit.sourceId);
              }}
              title={tooltip}
              aria-label={`Quelle ${hit.index}: ${hit.title ?? hit.sourceId}`}
              className={`mx-0.5 inline-flex items-center justify-center rounded-full align-baseline text-[10px] font-semibold no-underline transition-colors ${widthCls} ${cls}`}
            >
              {glyph}
              {hit.index}
            </a>
          );
        }
        /* Streaming fallback — citations not yet extracted. */
        const shortId =
          sourceId.length > 16 ? sourceId.slice(0, 14) + "…" : sourceId;
        return (
          <sup className="ml-0.5 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0 font-mono text-[10px] font-medium text-slate-700 dark:bg-white/[0.06] dark:text-slate-300">
            {shortId}
          </sup>
        );
      },
    },
  ];

  while (remaining.length > 0) {
    let earliest: { start: number; end: number; wrap: ReactNode } | null = null;
    for (const p of patterns) {
      const m = remaining.match(p.re);
      if (m && m.index !== undefined) {
        const start = m.index;
        const end = start + m[0].length;
        if (!earliest || start < earliest.start) {
          earliest = { start, end, wrap: p.wrap(m) };
        }
      }
    }
    if (!earliest) {
      /* AUDIT-FIX L13: keyed Fragment for the trailing plain-text remainder. */
      parts.push(<Fragment key={makeKey()}>{remaining}</Fragment>);
      break;
    }
    if (earliest.start > 0) {
      /* AUDIT-FIX L13: keyed Fragment for the plain-text segment that
         precedes a match. Without a key this segment shared its slot
         with neighbouring matches when arrays got re-ordered upstream. */
      parts.push(
        <Fragment key={makeKey()}>
          {remaining.slice(0, earliest.start)}
        </Fragment>,
      );
    }
    /* AUDIT-FIX L13: route the wrapped match through the same generator
       so adjacent matches are guaranteed distinct keys regardless of
       how many were emitted before this one. */
    parts.push(<span key={makeKey()}>{earliest.wrap}</span>);
    remaining = remaining.slice(earliest.end);
  }
  return parts;
}
