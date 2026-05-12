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

interface Props {
  text: string;
}

export function MarkdownContent({ text }: Props) {
  const blocks = parseBlocks(text);
  return <>{blocks.map((b, i) => renderBlock(b, i))}</>;
}

/* ── Block parsing ───────────────────────────────────────────────────── */

type Block =
  | { kind: "table"; rows: string[][]; header: string[] }
  | { kind: "paragraph"; text: string };

function parseBlocks(text: string): Block[] {
  const lines = text.split("\n");
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isTableStart(lines, i)) {
      const result = consumeTable(lines, i);
      if (result) {
        blocks.push(result.block);
        i = result.end;
        continue;
      }
    }
    if (lines[i].trim() === "") {
      i++;
      continue;
    }
    /* Collect consecutive non-empty lines into one paragraph. */
    const start = i;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !isTableStart(lines, i)
    ) {
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

function renderBlock(b: Block, key: number): ReactNode {
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
                  {renderInline(h)}
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
                    {renderInline(row[ci] ?? "")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  return (
    <p key={key} className="mb-3 last:mb-0 whitespace-pre-wrap">
      {renderInline(b.text)}
    </p>
  );
}

/* ── Inline rendering ────────────────────────────────────────────────── */

/* Tiny inline-markdown handling: **bold**, *italic*, `code`, and
   [ATLAS:…] citations get a subtle visual marker. We do this without
   regex-heavy parsers — split on the strong patterns, wrap in spans. */
function renderInline(text: string): ReactNode[] {
  if (!text) return [];

  const parts: ReactNode[] = [];
  let remaining = text;
  let key = 0;

  /* Greedy split on the first matched pattern; recurse on the
     remainder. Order matters: bold (**) before italic (*) so we
     don't split inside bold. */
  const patterns: Array<{
    re: RegExp;
    wrap: (m: string) => ReactNode;
  }> = [
    {
      re: /\*\*(.+?)\*\*/,
      wrap: (m) => (
        <strong className="font-semibold text-slate-900 dark:text-slate-100">
          {m}
        </strong>
      ),
    },
    {
      re: /`([^`]+)`/,
      wrap: (m) => (
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[11.5px] text-slate-800 dark:bg-white/[0.06] dark:text-slate-200">
          {m}
        </code>
      ),
    },
    {
      re: /\[ATLAS:([^\]]+)\]/,
      wrap: (m) => (
        <sup className="ml-0.5 inline-flex items-center rounded-full bg-slate-100 px-1.5 py-0 font-mono text-[10px] font-medium text-slate-700 dark:bg-white/[0.06] dark:text-slate-300">
          {m}
        </sup>
      ),
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
          earliest = { start, end, wrap: p.wrap(m[1]) };
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
