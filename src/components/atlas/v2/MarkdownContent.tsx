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

import type { ReactNode } from "react";

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

  return (
    <p key={key} className="mb-3 last:mb-0 whitespace-pre-wrap">
      {renderInline(b.text, sourceMap)}
    </p>
  );
}

/* ── Inline rendering ────────────────────────────────────────────────── */

/**
 * Smooth-scroll a citation anchor into view. Used by inline pills.
 * Falls back to instant-scroll on browsers without `behavior: smooth`.
 * Highlights the row briefly so the user sees what was clicked.
 */
function scrollToCitation(sourceId: string) {
  if (typeof document === "undefined") return;
  const target = document.getElementById(`citation-${sourceId}`);
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
  let key = 0;

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
      /* [ATLAS:source-id] → clickable numbered pill. The pill shows
         the citation index (1, 2, 3…) instead of the raw source-id
         so the answer text reads cleanly. Clicking scrolls to the
         matching CitationsPanel row + briefly highlights it. When
         citations aren't loaded yet (streaming), we render a
         non-interactive fallback showing a short source-id label. */
      re: /\[ATLAS:([^\]]+)\]/,
      wrap: (m) => {
        const sourceId = m[1];
        const hit = sourceMap.get(sourceId);
        if (hit) {
          return (
            <a
              href={`#citation-${hit.sourceId}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToCitation(hit.sourceId);
              }}
              title={hit.citation}
              className="mx-0.5 inline-flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-slate-200 px-1 align-baseline text-[10px] font-semibold text-slate-700 no-underline transition-colors hover:bg-slate-300 hover:text-slate-900 dark:bg-white/[0.10] dark:text-slate-200 dark:hover:bg-white/[0.18] dark:hover:text-white"
            >
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
      parts.push(remaining);
      break;
    }
    if (earliest.start > 0) {
      parts.push(remaining.slice(0, earliest.start));
    }
    parts.push(<span key={key++}>{earliest.wrap}</span>);
    remaining = remaining.slice(earliest.end);
  }
  return parts;
}
