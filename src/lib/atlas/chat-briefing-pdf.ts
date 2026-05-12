"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat → "Mandanten-Briefing" PDF generator.
 *
 * Produces a polished PDF deliverable from any Atlas chat that the
 * lawyer can email to a client, file in a matter folder, or print.
 *
 * Design conventions follow the Caelex compliance-document style
 * (navy + emerald palette, A4 margins, page footer with "Atlas").
 *
 * Layout:
 *   - Cover-style header: "Mandanten-Briefing" + chat title +
 *     mandate name + date
 *   - Per Q&A pair:
 *       Frage N        (slate800 heading)
 *       [user text]    (slate700 body)
 *       Antwort N      (emerald accent heading)
 *       [assistant text + structured headings preserved]
 *       Quellen        (small list at the end of each turn)
 *   - Footer disclaimer: "Atlas ist ein Recherchewerkzeug; ersetzt
 *     keine anwaltliche Beratung."
 *   - Page numbers + Atlas logotype on every page
 *
 * Pure client-side via jsPDF — no API hop, instant download.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { jsPDF } from "jspdf";
import type { ChatMessageBlock, ChatRecord } from "@/components/atlas/v2/types";

/* ── Layout constants (mm, A4 portrait) ─────────────────────────────── */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 22;
const MARGIN_R = 22;
const MARGIN_T = 28;
const MARGIN_B = 24;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MAX_Y = PAGE_H - MARGIN_B;

/* ── Caelex palette (RGB tuples for jsPDF) ──────────────────────────── */
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

interface CitationLite {
  index: number;
  citation: string;
  title?: string | null;
  sourceUrl?: string | null;
  lastVerified?: string | null;
}

/**
 * Strip [ATLAS:source-id] tokens from text (the PDF doesn't render
 * them as pills — instead, citations land in the Quellen list per
 * answer). Keeps any visible text adjacent to the token intact.
 */
function stripAtlasTokens(text: string): string {
  return text
    .replace(/\[ATLAS:[^\]]+\]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractText(content: ChatMessageBlock[] | string): string {
  if (typeof content === "string") return content;
  return content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("\n");
}

/**
 * Generate the PDF without triggering download. Returns the Blob +
 * suggested filename. Used by callers that need the bytes for
 * something other than direct download — e.g. uploading to the
 * mandate vault.
 */
export function generateChatPdfBlob(chat: ChatRecord): {
  blob: Blob;
  filename: string;
} {
  const doc = buildChatPdf(chat);
  const filename = chatPdfFilename(chat);
  /* jsPDF's `output("blob")` returns the bytes as a Blob without
     hitting the browser's download flow. */
  const blob = doc.output("blob");
  return { blob, filename };
}

/**
 * Public entry-point. Builds the PDF + triggers browser download.
 * Returns the suggested filename so callers can echo it in toasts.
 */
export function downloadChatAsPdf(chat: ChatRecord): string {
  const doc = buildChatPdf(chat);
  const filename = chatPdfFilename(chat);
  doc.save(filename);
  return filename;
}

function chatPdfFilename(chat: ChatRecord): string {
  const slug =
    chat.title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chat";
  const date = new Date(chat.updatedAt).toISOString().slice(0, 10);
  return `atlas-briefing-${slug}-${date}.pdf`;
}

/* Internal: build the jsPDF doc + return it. Both `download` and
   `generateBlob` paths share this so the visual output stays in lock-
   step. */
function buildChatPdf(chat: ChatRecord): jsPDF {
  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  let y = MARGIN_T;

  /* ── Header ─────────────────────────────────────────────────────── */
  /* Tiny "Caelex Atlas" topline + emerald rule, then the chat title.
     Sets the document apart from a generic LLM-export. */
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...COL.emerald);
  doc.text("CAELEX · ATLAS · MANDANTEN-BRIEFING", MARGIN_L, y);
  y += 1.5;
  doc.setDrawColor(...COL.emerald);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, y, MARGIN_L + 26, y);
  y += 8;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...COL.navy);
  const titleLines = doc.splitTextToSize(chat.title, CONTENT_W);
  doc.text(titleLines, MARGIN_L, y);
  y += 7 * titleLines.length;

  /* Metadata line — mandate, dates */
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...COL.slate500);
  const meta: string[] = [];
  if (chat.mandate) meta.push(`Mandat: ${chat.mandate.name}`);
  meta.push(
    `Erstellt: ${new Date(chat.createdAt).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
  );
  meta.push(
    `Aktualisiert: ${new Date(chat.updatedAt).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
  );
  doc.text(meta.join("  ·  "), MARGIN_L, y);
  y += 8;

  /* Soft separator */
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
  y += 6;

  /* ── Q&A pairs ───────────────────────────────────────────────────── */
  let qNum = 0;
  for (const m of chat.messages) {
    const text = extractText(m.content);
    if (!text.trim()) continue;

    if (m.role === "user") {
      qNum++;
      y = ensureRoom(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COL.slate800);
      doc.text(`Frage ${qNum}`, MARGIN_L, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...COL.slate700);
      y = writeWrapped(doc, text, MARGIN_L, y, CONTENT_W, 5);
      y += 4;
    } else {
      y = ensureRoom(doc, y, 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...COL.emerald);
      doc.text(`Antwort`, MARGIN_L, y);
      y += 5;

      /* Render the assistant text. Headings (## / ###) get visual
         emphasis; everything else is body. We strip [ATLAS:…]
         tokens — citations are listed below per turn. */
      const lines = stripAtlasTokens(text).split("\n");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10.5);
      doc.setTextColor(...COL.slate700);

      for (const ln of lines) {
        const trimmed = ln.trim();
        if (!trimmed) {
          y += 2;
          continue;
        }
        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          y += 2;
          y = ensureRoom(doc, y, 8);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(level === 1 ? 12 : level === 2 ? 11 : 10);
          doc.setTextColor(...COL.slate800);
          y = writeWrapped(doc, headingMatch[2], MARGIN_L, y, CONTENT_W, 5);
          y += 1;
          doc.setFont("helvetica", "normal");
          doc.setFontSize(10.5);
          doc.setTextColor(...COL.slate700);
          continue;
        }
        const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          y = ensureRoom(doc, y, 5);
          doc.text("•", MARGIN_L + 1, y);
          y = writeWrapped(
            doc,
            bulletMatch[1],
            MARGIN_L + 5,
            y,
            CONTENT_W - 5,
            5,
          );
          continue;
        }
        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (orderedMatch) {
          y = ensureRoom(doc, y, 5);
          doc.text(`${orderedMatch[1]}.`, MARGIN_L + 1, y);
          y = writeWrapped(
            doc,
            orderedMatch[2],
            MARGIN_L + 7,
            y,
            CONTENT_W - 7,
            5,
          );
          continue;
        }
        /* Bold inline (**text**) — strip markers, render bold span. */
        const boldStripped = trimmed.replace(/\*\*(.+?)\*\*/g, "$1");
        y = writeWrapped(doc, boldStripped, MARGIN_L, y, CONTENT_W, 5);
      }
      y += 2;

      /* Quellen list per assistant turn */
      const citations = Array.isArray(m.citations)
        ? (m.citations as CitationLite[])
        : [];
      if (citations.length > 0) {
        y = ensureRoom(doc, y, 8);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.setTextColor(...COL.slate500);
        doc.text("QUELLEN", MARGIN_L, y);
        y += 4;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        doc.setTextColor(...COL.slate700);
        for (const c of citations) {
          y = ensureRoom(doc, y, 5);
          const verified = c.lastVerified
            ? ` (verified ${c.lastVerified})`
            : "";
          const title = c.title ? ` — ${c.title}` : "";
          const url = c.sourceUrl ? ` ${c.sourceUrl}` : "";
          y = writeWrapped(
            doc,
            `${c.index}. ${c.citation}${title}${verified}${url}`,
            MARGIN_L + 4,
            y,
            CONTENT_W - 4,
            4.2,
          );
        }
        y += 4;
      }

      /* Soft separator after each Q&A */
      y = ensureRoom(doc, y, 6);
      doc.setDrawColor(...COL.slate200);
      doc.setLineWidth(0.15);
      doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
      y += 5;
    }
  }

  /* ── Footer disclaimer (last page, just before page-number bar) ─── */
  y = ensureRoom(doc, y, 18);
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.2);
  doc.line(MARGIN_L, y, MARGIN_L + CONTENT_W, y);
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(...COL.slate500);
  const disclaimerLines = doc.splitTextToSize(
    "Atlas ist ein Recherche- und Drafting-Werkzeug. Die Ausgaben sind nicht als anwaltliche Beratung zu verstehen und ersetzen keine eigenständige Prüfung durch eine zugelassene Anwältin / einen zugelassenen Anwalt. Quellen sind zum Stand der Verifikation korrekt; verbindlich ist immer die offizielle Verlautbarung der jeweiligen Behörde.",
    CONTENT_W,
  );
  for (const dl of disclaimerLines) {
    doc.text(dl, MARGIN_L, y);
    y += 3.5;
  }

  /* ── Page numbers (footer, all pages) ───────────────────────────── */
  const total = doc.getNumberOfPages();
  for (let i = 1; i <= total; i++) {
    doc.setPage(i);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...COL.slate400);
    doc.text("Caelex · Atlas", MARGIN_L, PAGE_H - 10);
    doc.text(`Seite ${i} von ${total}`, PAGE_W - MARGIN_R, PAGE_H - 10, {
      align: "right",
    });
  }

  /* `buildChatPdf` returns the doc to its caller — the public
     `download` and `generateBlob` wrappers handle the byte-output. */
  return doc;
}

/* ── Layout helpers ─────────────────────────────────────────────────── */

function ensureRoom(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > MAX_Y) {
    doc.addPage();
    return MARGIN_T;
  }
  return y;
}

function writeWrapped(
  doc: jsPDF,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const lines = doc.splitTextToSize(text, maxWidth);
  for (const ln of lines) {
    y = ensureRoom(doc, y, lineHeight);
    doc.text(ln, x, y);
    y += lineHeight;
  }
  return y;
}
