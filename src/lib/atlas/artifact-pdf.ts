"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Artifact → PDF Export.
 *
 * Converts a single agent-mode artifact (memo / schriftsatz / email /
 * checklist / summary) from its Markdown body into a polished A4 PDF.
 *
 * Detects markdown tables (GFM pipe-syntax) and renders them via
 * jspdf-autotable for proper column-aligned output. Non-table prose
 * renders as wrapped body text with simple heading-detection (lines
 * starting with #, ##, ###).
 *
 * Client-side — uses jsPDF, no API hop, instant download.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

/* ── Layout constants (mm, A4 portrait) ─────────────────────────── */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 22;
const MARGIN_R = 22;
const MARGIN_T = 28;
const MARGIN_B = 24;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MAX_Y = PAGE_H - MARGIN_B;

/* ── Atlas palette (navy + emerald, matches chat-briefing-pdf) ──── */
const COL = {
  navy: [15, 23, 42] as [number, number, number],
  slate800: [30, 41, 59] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export type ArtifactKind =
  | "memo"
  | "schriftsatz"
  | "email"
  | "checklist"
  | "summary";

export interface ArtifactInput {
  kind: ArtifactKind;
  title: string;
  /** Markdown body. Tables detected and rendered via autoTable. */
  body: string;
  /** Optional mandate-name shown in footer for context. */
  mandateName?: string;
}

const KIND_LABELS: Record<ArtifactKind, string> = {
  memo: "Memo",
  schriftsatz: "Schriftsatz",
  email: "Email",
  checklist: "Checkliste",
  summary: "Zusammenfassung",
};

/* GFM pipe-table detection: a header line + separator line (|---|---|) +
   body lines. We split body into segments: alternating text-blocks and
   table-blocks. */
interface TextSegment {
  type: "text";
  content: string;
}
interface TableSegment {
  type: "table";
  headers: string[];
  rows: string[][];
}
type Segment = TextSegment | TableSegment;

function parseSegments(body: string): Segment[] {
  const lines = body.split("\n");
  const segments: Segment[] = [];
  let textBuffer: string[] = [];

  const flushText = () => {
    if (textBuffer.length > 0) {
      segments.push({ type: "text", content: textBuffer.join("\n").trim() });
      textBuffer = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    /* Detect table start: a line with pipes followed by separator. */
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s:-|]+/.test(lines[i + 1])
    ) {
      /* Parse table. */
      flushText();
      const headers = splitRow(line);
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].includes("|")) {
        rows.push(splitRow(lines[i]));
        i++;
      }
      i--; // re-process this line on next iteration
      segments.push({ type: "table", headers, rows });
    } else {
      textBuffer.push(line);
    }
  }
  flushText();
  return segments;
}

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((s) => s.trim());
}

/* Markdown stripping for text segments (simple — keep headings detected
   by leading #). */
function stripInlineMd(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[ATLAS:[^\]]+\]/g, "");
}

function ensureRoom(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > MAX_Y) {
    doc.addPage();
    return MARGIN_T;
  }
  return y;
}

function drawHeader(doc: jsPDF, artifact: ArtifactInput, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...COL.emerald);
  doc.text(KIND_LABELS[artifact.kind].toUpperCase(), MARGIN_L, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COL.navy);
  const titleLines = doc.splitTextToSize(artifact.title, CONTENT_W);
  for (const line of titleLines) {
    doc.text(line, MARGIN_L, y);
    y += 7;
  }
  y += 2;
  /* Privilege stamp for Schriftsatz (matches chat-briefing convention). */
  if (artifact.kind === "schriftsatz") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...COL.slate500);
    doc.text("PRIVILEGED & CONFIDENTIAL", MARGIN_L, y);
    y += 6;
  }
  /* Divider line. */
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
  y += 6;
  return y;
}

function drawText(doc: jsPDF, text: string, y: number): number {
  const lines = text.split("\n");
  for (const raw of lines) {
    if (raw.trim().length === 0) {
      y += 3;
      continue;
    }
    /* Heading detection. */
    if (/^### /.test(raw)) {
      y = ensureRoom(doc, y, 8);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...COL.slate800);
      doc.text(stripInlineMd(raw.replace(/^### /, "")), MARGIN_L, y);
      y += 5;
    } else if (/^## /.test(raw)) {
      y = ensureRoom(doc, y, 10);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setTextColor(...COL.navy);
      doc.text(stripInlineMd(raw.replace(/^## /, "")), MARGIN_L, y);
      y += 6;
    } else if (/^# /.test(raw)) {
      y = ensureRoom(doc, y, 12);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...COL.navy);
      doc.text(stripInlineMd(raw.replace(/^# /, "")), MARGIN_L, y);
      y += 7;
    } else if (/^[-*+]\s+/.test(raw)) {
      y = ensureRoom(doc, y, 5);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COL.slate700);
      const bullet = stripInlineMd(raw.replace(/^[-*+]\s+/, ""));
      const wrapped = doc.splitTextToSize(`• ${bullet}`, CONTENT_W - 2);
      for (const w of wrapped) {
        y = ensureRoom(doc, y, 5);
        doc.text(w, MARGIN_L + 2, y);
        y += 4.5;
      }
    } else {
      /* Body paragraph. */
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COL.slate700);
      const wrapped = doc.splitTextToSize(stripInlineMd(raw), CONTENT_W);
      for (const w of wrapped) {
        y = ensureRoom(doc, y, 5);
        doc.text(w, MARGIN_L, y);
        y += 4.5;
      }
    }
  }
  return y + 2;
}

function drawTable(doc: jsPDF, table: TableSegment, y: number): number {
  /* jspdf-autotable handles pagination internally. We provide a
     startY and let it run; it returns the final-y in the result. */
  autoTable(doc, {
    head: [table.headers],
    body: table.rows,
    startY: y,
    margin: { left: MARGIN_L, right: MARGIN_R },
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 2.5,
      textColor: COL.slate700,
      lineColor: COL.slate200,
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: COL.slate50,
      textColor: COL.navy,
      fontStyle: "bold",
    },
    alternateRowStyles: {
      fillColor: [255, 255, 255],
    },
  });
  /* jsPDF v4 attaches autotable's final-y via type-extended `lastAutoTable`. */
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y;
  return finalY + 4;
}

function drawFooter(doc: jsPDF, artifact: ArtifactInput): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COL.slate400);
    const left = artifact.mandateName
      ? `${artifact.mandateName} · Atlas`
      : "Atlas";
    doc.text(left, MARGIN_L, PAGE_H - 10);
    doc.text(`Seite ${i}/${total}`, PAGE_W - MARGIN_R, PAGE_H - 10, {
      align: "right",
    });
  }
}

export function buildArtifactPdf(artifact: ArtifactInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  let y = MARGIN_T;
  y = drawHeader(doc, artifact, y);
  const segments = parseSegments(artifact.body);
  for (const seg of segments) {
    if (seg.type === "text") {
      y = drawText(doc, seg.content, y);
    } else {
      y = drawTable(doc, seg, y);
    }
  }
  drawFooter(doc, artifact);
  return doc;
}

export function downloadArtifactAsPdf(artifact: ArtifactInput): void {
  const doc = buildArtifactPdf(artifact);
  const slug = artifact.title
    .toLowerCase()
    .replace(/[^a-z0-9äöüß]+/g, "-")
    .slice(0, 60);
  doc.save(`atlas-${artifact.kind}-${slug}.pdf`);
}
