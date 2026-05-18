"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Artifact → PDF Export (kanzlei-grade, DIN 5008-inspired).
 *
 * Produces production-quality A4 PDFs that look like real German legal
 * documents. Eight document kinds, three layout families:
 *
 *   - LETTER kinds (brief, schriftsatz) — DIN 5008-A inspired layout:
 *     sender mini-line above an address-block window (Empfänger left),
 *     info-block right (Datum, Aktenzeichen), bold "Betreff:" line,
 *     then body. Greeting/closing detection adds proper white-space.
 *
 *   - METADATA kinds (memo, aktennotiz, email) — title-block + grey
 *     metadata box (Von/An/Datum/Betreff) above the body.
 *
 *   - DOCUMENT kinds (vertrag, checklist, summary) — title-block then
 *     structured body.
 *
 * Cross-cutting:
 *   - "PRIVILEGED & CONFIDENTIAL · Anwaltsgeheimnis · § 43a BRAO" stamp
 *     on every page (top-right) for privileged kinds.
 *   - Continuation pages get a slim header bar: doc title (truncated)
 *     left, divider, body starts at MARGIN_T_BODY.
 *   - Footer on every page: mandate + Atlas-attribution left, "Seite
 *     X von Y" right (German conventional format), thin divider above.
 *   - Body typography: 11pt helvetica with 5.6mm line-height (~1.45)
 *     for legal-document readability. Paragraph aggregation across
 *     soft-breaks. Numbered lists (1. 2. 3.) + Roman section headings
 *     (I. II. III.) get dedicated rendering.
 *   - GFM tables via jspdf-autotable with a dark-navy header band so
 *     tables read as structured data rather than as decoration.
 *
 * Client-side — uses jsPDF, no API hop, instant download.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { slugifyFilename } from "./filename-slug";
import {
  parseSegments,
  stripInlineMd,
  type TableSegment,
} from "./markdown-segments";

/* ── DIN 5008-A Layout (mm, A4 portrait) ─────────────────────────── */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 25; /* DIN 5008-A standard */
const MARGIN_R = 20;
const MARGIN_T_HEAD = 12; /* page-header band starts */
const MARGIN_T_BODY = 30; /* continuation-page body starts */
const MARGIN_B = 18;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R; /* 165mm */
const FOOTER_BASELINE = PAGE_H - 10;
const MAX_Y = PAGE_H - MARGIN_B;

/* Body typography */
const BODY_SIZE = 11;
const BODY_LH = 5.6; /* ~1.45 line-height for 11pt = comfy legal-doc reading */
const PARA_GAP = 3;

/* ── Atlas + legal-document palette ──────────────────────────────── */
const COL = {
  navy: [15, 23, 42] as [number, number, number],
  slate800: [30, 41, 59] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate600: [71, 85, 105] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate300: [203, 213, 225] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  slate50: [248, 250, 252] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  emerald700: [4, 120, 87] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

export type ArtifactKind =
  | "memo"
  | "schriftsatz"
  | "vertrag"
  | "brief"
  | "aktennotiz"
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
  /** Optional date — defaults to today. Rendered as TT.MM.JJJJ. */
  date?: Date;
  /** Optional Kanzlei name shown as sender mini-line on letter kinds. */
  kanzleiName?: string;
}

const KIND_LABELS: Record<ArtifactKind, string> = {
  memo: "Memo",
  schriftsatz: "Schriftsatz",
  vertrag: "Vertrag",
  brief: "Brief",
  aktennotiz: "Aktennotiz",
  email: "E-Mail",
  checklist: "Checkliste",
  summary: "Zusammenfassung",
};

const LETTER_KINDS: ReadonlySet<ArtifactKind> = new Set<ArtifactKind>([
  "brief",
  "schriftsatz",
]);
const METADATA_KINDS: ReadonlySet<ArtifactKind> = new Set<ArtifactKind>([
  "memo",
  "aktennotiz",
  "email",
]);
const PRIVILEGED_KINDS: ReadonlySet<ArtifactKind> = new Set<ArtifactKind>([
  "schriftsatz",
  "vertrag",
  "brief",
  "memo",
  "aktennotiz",
]);

/* ─────────────────────────────────────────────────────────────────── */

function formatGermanDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/** Spaced-out uppercase for kind-labels (emulates letter-spacing). */
function trackedUpper(s: string): string {
  return s.toUpperCase().split("").join(" ");
}

/** Top-of-page header for continuation pages (page 2+). Privilege
 *  stamp + thin title strip. Returns y where body can resume. */
function drawContinuationHeader(doc: jsPDF, artifact: ArtifactInput): number {
  let y = MARGIN_T_HEAD;
  if (PRIVILEGED_KINDS.has(artifact.kind)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COL.slate500);
    doc.text(
      "PRIVILEGED & CONFIDENTIAL · Anwaltsgeheimnis · § 43a BRAO",
      PAGE_W - MARGIN_R,
      y,
      { align: "right" },
    );
  }
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...COL.slate500);
  const trunc =
    artifact.title.length > 75
      ? `${artifact.title.slice(0, 72)}…`
      : artifact.title;
  doc.text(trunc, MARGIN_L, y);
  doc.text(KIND_LABELS[artifact.kind], PAGE_W - MARGIN_R, y, {
    align: "right",
  });
  y += 3;
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
  y = MARGIN_T_BODY;
  return y;
}

function ensureRoom(
  doc: jsPDF,
  y: number,
  needed: number,
  artifact: ArtifactInput,
): number {
  if (y + needed > MAX_Y) {
    doc.addPage();
    return drawContinuationHeader(doc, artifact);
  }
  return y;
}

/* ── Letter-style first-page header (brief / schriftsatz) ────────── */

interface ParsedLetterHeader {
  empfaenger?: string[];
  aktenzeichen?: string;
  betreff?: string;
  remainingBody: string;
}

function parseLetterHeader(body: string): ParsedLetterHeader {
  const lines = body.split("\n");
  let empfaenger: string[] | undefined;
  let aktenzeichen: string | undefined;
  let betreff: string | undefined;
  const consumed = new Set<number>();

  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const line = lines[i].trim();
    const az = line.match(
      /^(?:Aktenzeichen|Az\.?|AZ|Geschäftszeichen|GZ)[:\s]+(.+)$/i,
    );
    if (az) {
      aktenzeichen = az[1].trim();
      consumed.add(i);
      continue;
    }
    const bt = line.match(/^(?:Betreff|Re|RE|In Sachen)[:\s]+(.+)$/i);
    if (bt) {
      betreff = bt[1].trim();
      consumed.add(i);
      continue;
    }
    /* "An:" block — either inline "An: Empfänger\nStraße\n..." or
       header-only "An:\n..." */
    if (/^An:\s*$/i.test(line) || /^An\s+(das|die|den|Herr|Frau)/i.test(line)) {
      const block: string[] = [];
      const startsOnSameLine = !/^An:\s*$/i.test(line);
      if (startsOnSameLine) block.push(line);
      consumed.add(i);
      let j = i + 1;
      while (
        j < lines.length &&
        lines[j].trim().length > 0 &&
        block.length < 6
      ) {
        const t = lines[j].trim();
        if (
          /^(?:Aktenzeichen|Betreff|Az\.?|AZ|Re|RE|GZ|Geschäftszeichen|In Sachen):/i.test(
            t,
          )
        ) {
          break;
        }
        block.push(t);
        consumed.add(j);
        j++;
      }
      if (block.length > 0) empfaenger = block;
    }
  }

  const remainingBody = lines
    .filter((_, i) => !consumed.has(i))
    .join("\n")
    .replace(/^\n+/, "");
  return { empfaenger, aktenzeichen, betreff, remainingBody };
}

function drawLetterHeader(
  doc: jsPDF,
  artifact: ArtifactInput,
  parsed: ParsedLetterHeader,
): number {
  let y = MARGIN_T_HEAD;
  if (PRIVILEGED_KINDS.has(artifact.kind)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COL.slate500);
    doc.text(
      "PRIVILEGED & CONFIDENTIAL · Anwaltsgeheimnis · § 43a BRAO",
      PAGE_W - MARGIN_R,
      y,
      { align: "right" },
    );
  }
  y = 30;

  /* Sender mini-line above address-block window (DIN 5008-A "Absender­
     ergänzung"). Kanzlei-name preferred, falls back to "Atlas · Mandat". */
  const sender =
    artifact.kanzleiName ??
    (artifact.mandateName ? `Atlas · ${artifact.mandateName}` : "Atlas");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(...COL.slate500);
  doc.text(sender, MARGIN_L, y);
  doc.setDrawColor(...COL.slate300);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_L, y + 1.2, MARGIN_L + 85, y + 1.2);
  y += 7;

  /* Address-block window (left, 4–6 lines of recipient address). */
  const empf = parsed.empfaenger ?? ["[Empfänger – Adresse]"];
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  doc.setTextColor(...COL.navy);
  const addrStartY = y;
  for (const line of empf) {
    doc.text(line, MARGIN_L, y);
    y += 5.2;
  }

  /* Info-block right (Datum + Aktenzeichen) — DIN-style label/value. */
  const date = formatGermanDate(artifact.date ?? new Date());
  let rightY = addrStartY;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL.slate500);
  if (parsed.aktenzeichen) {
    doc.text("AKTENZEICHEN", PAGE_W - MARGIN_R, rightY, { align: "right" });
    rightY += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...COL.navy);
    doc.text(parsed.aktenzeichen, PAGE_W - MARGIN_R, rightY, {
      align: "right",
    });
    rightY += 6;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COL.slate500);
  doc.text("DATUM", PAGE_W - MARGIN_R, rightY, { align: "right" });
  rightY += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...COL.navy);
  doc.text(date, PAGE_W - MARGIN_R, rightY, { align: "right" });
  rightY += 5;

  y = Math.max(y, rightY) + 14;

  /* Betreff — bold navy, wraps for long subjects. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11.5);
  doc.setTextColor(...COL.navy);
  const betreff = parsed.betreff ?? artifact.title;
  const betreffLines = doc.splitTextToSize(`Betreff: ${betreff}`, CONTENT_W);
  for (const line of betreffLines) {
    doc.text(line, MARGIN_L, y);
    y += 6;
  }
  y += 6;

  return y;
}

/* ── Memo / Aktennotiz / Email first-page header ─────────────────── */

interface ParsedMemoHeader {
  metadata: [string, string][];
  remainingBody: string;
}

const META_KEY_RE =
  /^(Von|An|From|To|Datum|Date|Betreff|Subject|Re|RE|Aktenzeichen|Az\.?|AZ|Bearbeiter|Mandant|Mandantin|CC|BCC|Priorität|Anlagen)$/i;

function parseMemoHeader(body: string): ParsedMemoHeader {
  const lines = body.split("\n");
  const metadata: [string, string][] = [];
  const consumed = new Set<number>();
  for (let i = 0; i < Math.min(15, lines.length); i++) {
    const line = lines[i].trim();
    if (line === "") {
      if (consumed.size > 0) consumed.add(i);
      continue;
    }
    const m = line.match(/^([A-Za-zÄÖÜäöü\.]+):\s*(.+)$/);
    if (m && META_KEY_RE.test(m[1])) {
      metadata.push([m[1], m[2].trim()]);
      consumed.add(i);
    } else if (consumed.size > 0) {
      break;
    }
  }
  const remainingBody = lines
    .filter((_, i) => !consumed.has(i))
    .join("\n")
    .replace(/^\n+/, "");
  return { metadata, remainingBody };
}

function drawDocumentHeader(
  doc: jsPDF,
  artifact: ArtifactInput,
  parsedMeta: ParsedMemoHeader | null,
): number {
  let y = MARGIN_T_HEAD;
  if (PRIVILEGED_KINDS.has(artifact.kind)) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(...COL.slate500);
    doc.text(
      "PRIVILEGED & CONFIDENTIAL · Anwaltsgeheimnis · § 43a BRAO",
      PAGE_W - MARGIN_R,
      y,
      { align: "right" },
    );
  }
  y = 26;

  /* Kind label (emerald, letter-spaced) + date right. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COL.emerald700);
  doc.text(trackedUpper(KIND_LABELS[artifact.kind]), MARGIN_L, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COL.slate500);
  doc.text(
    formatGermanDate(artifact.date ?? new Date()),
    PAGE_W - MARGIN_R,
    y,
    { align: "right" },
  );
  y += 4;
  doc.setDrawColor(...COL.emerald);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, y, MARGIN_L + 18, y);
  y += 8;

  /* Title — large navy, multi-line aware. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(...COL.navy);
  const titleLines = doc.splitTextToSize(artifact.title, CONTENT_W);
  for (const line of titleLines) {
    doc.text(line, MARGIN_L, y);
    y += 9;
  }
  y += 3;

  /* Mandate sub-line. */
  if (artifact.mandateName) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.setTextColor(...COL.slate600);
    doc.text(`Mandat: ${artifact.mandateName}`, MARGIN_L, y);
    y += 7;
  }

  /* Metadata box for memo/aktennotiz/email when ≥2 keys detected. */
  if (parsedMeta && parsedMeta.metadata.length >= 2) {
    const rowH = 6.5;
    const padTop = 4.5;
    const padBot = 3;
    const boxH = padTop + parsedMeta.metadata.length * rowH + padBot;
    doc.setFillColor(...COL.slate50);
    doc.setDrawColor(...COL.slate200);
    doc.setLineWidth(0.25);
    doc.roundedRect(MARGIN_L, y, CONTENT_W, boxH, 1.8, 1.8, "FD");
    /* Subtle left accent bar */
    doc.setFillColor(...COL.emerald);
    doc.rect(MARGIN_L, y, 1.2, boxH, "F");
    let metaY = y + padTop + 3;
    for (const [k, v] of parsedMeta.metadata) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...COL.slate500);
      doc.text(`${k.toUpperCase()}`, MARGIN_L + 4, metaY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(...COL.navy);
      const vWrapped = doc.splitTextToSize(v, CONTENT_W - 38);
      doc.text(vWrapped[0], MARGIN_L + 32, metaY);
      metaY += rowH;
    }
    y += boxH + 7;
  }

  /* Divider */
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.3);
  doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
  y += 8;

  return y;
}

/* ── Body rendering ──────────────────────────────────────────────── */

const BLOCK_BREAK_RE = /^(#{1,3}\s|>\s*|[-*+]\s|\d+\.\s|[IVX]+\.\s)/;
const GREETING_RE = /^(Sehr geehrte|Hallo|Liebe[r]?|Guten Tag)/i;
const CLOSING_RE =
  /^(Mit freundlichen Grüßen|Mit besten Grüßen|Hochachtungsvoll|Mit freundlichem Gruß|Beste Grüße|Mit kollegialen Grüßen)/i;

function drawBody(
  doc: jsPDF,
  text: string,
  y: number,
  artifact: ArtifactInput,
): number {
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim().length === 0) {
      y += PARA_GAP;
      i++;
      continue;
    }

    /* H1 */
    if (/^# /.test(raw)) {
      y = ensureRoom(doc, y, 16, artifact);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(...COL.navy);
      const heading = stripInlineMd(raw.replace(/^# /, ""));
      const wrapped = doc.splitTextToSize(heading, CONTENT_W);
      for (const w of wrapped) {
        doc.text(w, MARGIN_L, y);
        y += 7;
      }
      y += 3;
      i++;
      continue;
    }
    /* H2 */
    if (/^## /.test(raw)) {
      y = ensureRoom(doc, y, 14, artifact);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12.5);
      doc.setTextColor(...COL.navy);
      const heading = stripInlineMd(raw.replace(/^## /, ""));
      const wrapped = doc.splitTextToSize(heading, CONTENT_W);
      for (const w of wrapped) {
        doc.text(w, MARGIN_L, y);
        y += 6;
      }
      y += 2;
      i++;
      continue;
    }
    /* H3 */
    if (/^### /.test(raw)) {
      y = ensureRoom(doc, y, 11, artifact);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...COL.slate800);
      const heading = stripInlineMd(raw.replace(/^### /, ""));
      const wrapped = doc.splitTextToSize(heading, CONTENT_W);
      for (const w of wrapped) {
        doc.text(w, MARGIN_L, y);
        y += 5.5;
      }
      y += 1.5;
      i++;
      continue;
    }
    /* Roman numeral section (I., II., III.) — Schriftsatz convention. */
    if (/^[IVX]+\.\s/.test(raw)) {
      y = ensureRoom(doc, y, 14, artifact);
      y += 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...COL.navy);
      const text = stripInlineMd(raw);
      const wrapped = doc.splitTextToSize(text, CONTENT_W);
      for (const w of wrapped) {
        doc.text(w, MARGIN_L, y);
        y += 6;
      }
      /* Thin emerald underline accent (10mm). */
      doc.setDrawColor(...COL.emerald);
      doc.setLineWidth(0.5);
      doc.line(MARGIN_L, y - 1, MARGIN_L + 10, y - 1);
      y += 3;
      i++;
      continue;
    }
    /* Numbered list (1. 2. 3.) — preserve numbering, hanging indent. */
    if (/^\d+\.\s+/.test(raw)) {
      const match = raw.match(/^(\d+)\.\s+(.+)$/);
      y = ensureRoom(doc, y, BODY_LH, artifact);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(...COL.slate800);
      if (match) {
        const num = match[1];
        const content = stripInlineMd(match[2]);
        const indent = 8;
        doc.setFont("helvetica", "bold");
        doc.text(`${num}.`, MARGIN_L, y);
        doc.setFont("helvetica", "normal");
        const wrapped = doc.splitTextToSize(content, CONTENT_W - indent);
        for (let k = 0; k < wrapped.length; k++) {
          if (k > 0) y = ensureRoom(doc, y, BODY_LH, artifact);
          doc.text(wrapped[k], MARGIN_L + indent, y);
          y += BODY_LH;
        }
      } else {
        doc.text(stripInlineMd(raw), MARGIN_L, y);
        y += BODY_LH;
      }
      i++;
      continue;
    }
    /* Bullet list */
    if (/^[-*+]\s+/.test(raw)) {
      y = ensureRoom(doc, y, BODY_LH, artifact);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(...COL.slate800);
      const bullet = stripInlineMd(raw.replace(/^[-*+]\s+/, ""));
      const indent = 5.5;
      doc.text("•", MARGIN_L + 1, y);
      const wrapped = doc.splitTextToSize(bullet, CONTENT_W - indent);
      for (let k = 0; k < wrapped.length; k++) {
        if (k > 0) y = ensureRoom(doc, y, BODY_LH, artifact);
        doc.text(wrapped[k], MARGIN_L + indent, y);
        y += BODY_LH;
      }
      i++;
      continue;
    }
    /* Blockquote — emerald accent bar + italic */
    if (/^>\s*/.test(raw)) {
      y = ensureRoom(doc, y, BODY_LH, artifact);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(...COL.slate600);
      const text = stripInlineMd(raw.replace(/^>\s*/, ""));
      const indent = 7;
      const wrapped = doc.splitTextToSize(text, CONTENT_W - indent);
      const startY = y - 4;
      doc.setDrawColor(...COL.emerald);
      doc.setLineWidth(1);
      doc.line(
        MARGIN_L + 1.5,
        startY,
        MARGIN_L + 1.5,
        startY + wrapped.length * BODY_LH,
      );
      for (const w of wrapped) {
        doc.text(w, MARGIN_L + indent, y);
        y += BODY_LH;
      }
      i++;
      continue;
    }
    /* Greeting line — single line + breathing room. */
    if (GREETING_RE.test(raw)) {
      y = ensureRoom(doc, y, BODY_LH * 2, artifact);
      y += 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(...COL.navy);
      doc.text(stripInlineMd(raw), MARGIN_L, y);
      y += BODY_LH + 3;
      i++;
      continue;
    }
    /* Closing — leave space for handwritten signature (3 line-heights). */
    if (CLOSING_RE.test(raw)) {
      y = ensureRoom(doc, y, BODY_LH * 5, artifact);
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(BODY_SIZE);
      doc.setTextColor(...COL.navy);
      doc.text(stripInlineMd(raw), MARGIN_L, y);
      y += BODY_LH * 4;
      i++;
      continue;
    }
    /* Body paragraph — aggregate consecutive non-block lines so soft
       line-breaks in the source don't fragment paragraphs in the PDF. */
    const para: string[] = [raw];
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j];
      if (next.trim().length === 0) break;
      if (BLOCK_BREAK_RE.test(next)) break;
      if (GREETING_RE.test(next) || CLOSING_RE.test(next)) break;
      para.push(next);
      j++;
    }
    const paraText = stripInlineMd(para.join(" ").replace(/\s+/g, " ").trim());
    doc.setFont("helvetica", "normal");
    doc.setFontSize(BODY_SIZE);
    doc.setTextColor(...COL.slate800);
    const wrapped = doc.splitTextToSize(paraText, CONTENT_W);
    for (const w of wrapped) {
      y = ensureRoom(doc, y, BODY_LH, artifact);
      doc.text(w, MARGIN_L, y);
      y += BODY_LH;
    }
    y += PARA_GAP;
    i = j;
  }
  return y;
}

function drawTable(
  doc: jsPDF,
  table: TableSegment,
  y: number,
  artifact: ArtifactInput,
): number {
  /* Reserve space for header row + 2 body rows before starting a table.
     Prevents tables from getting a single orphan row at page bottom. */
  y = ensureRoom(doc, y, 25, artifact);
  autoTable(doc, {
    head: [table.headers],
    body: table.rows,
    startY: y,
    margin: {
      left: MARGIN_L,
      right: MARGIN_R,
      top: MARGIN_T_BODY,
      bottom: MARGIN_B + 5,
    },
    styles: {
      font: "helvetica",
      fontSize: 9.5,
      cellPadding: 3,
      textColor: COL.slate800,
      lineColor: COL.slate200,
      lineWidth: 0.2,
      valign: "middle",
    },
    headStyles: {
      fillColor: COL.navy,
      textColor: COL.white,
      fontStyle: "bold",
      fontSize: 9.5,
      cellPadding: 3.5,
      halign: "left",
    },
    alternateRowStyles: { fillColor: COL.slate50 },
    /* When autoTable spawns a new page, re-paint our continuation
       header (privilege stamp + title strip) so the visual frame stays
       consistent across the whole document. */
    didDrawPage: (data) => {
      const pageNum = doc.getCurrentPageInfo().pageNumber;
      if (pageNum > 1 && data.cursor && data.cursor.y < MARGIN_T_BODY + 5) {
        drawContinuationHeader(doc, artifact);
      }
    },
  });
  const finalY =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y;
  return finalY + 6;
}

function drawFooter(doc: jsPDF, artifact: ArtifactInput): void {
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    /* Thin divider above footer. */
    doc.setDrawColor(...COL.slate200);
    doc.setLineWidth(0.2);
    doc.line(
      MARGIN_L,
      FOOTER_BASELINE - 4.5,
      MARGIN_L + CONTENT_W,
      FOOTER_BASELINE - 4.5,
    );
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...COL.slate400);
    const left = artifact.mandateName
      ? `${artifact.mandateName} · erstellt mit Atlas (Caelex)`
      : "erstellt mit Atlas (Caelex)";
    doc.text(left, MARGIN_L, FOOTER_BASELINE);
    doc.text(`Seite ${i} von ${total}`, PAGE_W - MARGIN_R, FOOTER_BASELINE, {
      align: "right",
    });
  }
}

/* ─────────────────────────────────────────────────────────────────── */

export function buildArtifactPdf(artifact: ArtifactInput): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  let y: number;
  let bodyText: string;

  if (LETTER_KINDS.has(artifact.kind)) {
    const parsed = parseLetterHeader(artifact.body);
    y = drawLetterHeader(doc, artifact, parsed);
    bodyText = parsed.remainingBody;
  } else if (METADATA_KINDS.has(artifact.kind)) {
    const parsed = parseMemoHeader(artifact.body);
    y = drawDocumentHeader(doc, artifact, parsed);
    bodyText = parsed.remainingBody;
  } else {
    y = drawDocumentHeader(doc, artifact, null);
    bodyText = artifact.body;
  }

  /* The body sometimes starts with the same title as the H1. We already
     rendered the title in the header — strip a leading "# Title" so it
     doesn't appear twice. */
  bodyText = bodyText.replace(/^#\s+.+\n+/, "");

  const segments = parseSegments(bodyText);
  for (const seg of segments) {
    if (seg.type === "text") {
      y = drawBody(doc, seg.content, y, artifact);
    } else {
      y = drawTable(doc, seg, y, artifact);
    }
  }
  drawFooter(doc, artifact);
  return doc;
}

export function downloadArtifactAsPdf(artifact: ArtifactInput): void {
  const doc = buildArtifactPdf(artifact);
  /* AUDIT-FIX Q04 (2026-05-17): shared slugifyFilename keeps PDF and
     DOCX filenames in lock-step for the same artifact title. */
  const slug = slugifyFilename(artifact.title);
  doc.save(`atlas-${artifact.kind}-${slug}.pdf`);
}
