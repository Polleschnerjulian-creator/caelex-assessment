/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Shared Markdown → segments parser (Q06 dedup, 2026-05-17).
 *
 * Splits a Markdown body into alternating text-segments and GFM-pipe-
 * table-segments. Used by both artifact-pdf.ts and artifact-docx.ts —
 * they were carrying identical parseSegments / splitRow implementations.
 *
 * GFM pipe-table format:
 *   | Header 1 | Header 2 |
 *   |----------|----------|
 *   | cell A   | cell B   |
 *
 * MarkdownContent.tsx + MarkdownTableExport.tsx use different parsers
 * (block-based for the custom React renderer, JSX-tree-walking for the
 * react-markdown variant) — those are not deduplicated here.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export interface TextSegment {
  type: "text";
  content: string;
}
export interface TableSegment {
  type: "table";
  headers: string[];
  rows: string[][];
}
export type MarkdownSegment = TextSegment | TableSegment;

/**
 * Parse a Markdown body into alternating text + table segments.
 * Table detection: a line with `|` followed by a separator line of
 * the form `|---|---|` (pipes, dashes, colons, optional whitespace).
 */
export function parseSegments(body: string): MarkdownSegment[] {
  const lines = body.split("\n");
  const segments: MarkdownSegment[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push({ type: "text", content: textBuffer.join("\n").trim() });
      textBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s:|-]+/.test(lines[i + 1])
    ) {
      flushText();
      const headers = splitRow(line);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--;
      segments.push({ type: "table", headers, rows });
    } else {
      textBuffer.push(line);
    }
  }
  flushText();
  return segments;
}

export function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((s) => s.trim());
}

/**
 * Strip inline-Markdown decorations (bold, italic, code, links,
 * [ATLAS:...] tokens) leaving plain text — used by PDF/DOCX
 * generators where these would not render anyway.
 */
export function stripInlineMd(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[ATLAS:[^\]]+\]/g, "");
}
