"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas V2 — Chat → "Mandanten-Briefing" Word (DOCX) generator.
 *
 * Produces an editable .docx the lawyer can open in Word/LibreOffice
 * and tweak before sending to the client. Mirrors the PDF version
 * structurally (cover header, Q&A pairs, citations per turn,
 * disclaimer footer) but uses Word semantics (Heading1, Heading2,
 * paragraph styles) so the lawyer can re-style with one click.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/* AUDIT-FIX C04 (2026-05-17): docx is ~200KB. Previously imported
   statically into the Atlas chat bundle. Now type-only at module-
   scope, dynamic-imported at first call. Module-cached so subsequent
   exports skip the load. */
import type { Paragraph as ParagraphType } from "docx";
import type { ChatMessageBlock, ChatRecord } from "@/components/atlas/v2/types";

type DocxMod = typeof import("docx");
let docxModCache: DocxMod | null = null;
async function loadDocx(): Promise<DocxMod> {
  if (docxModCache) return docxModCache;
  docxModCache = await import("docx");
  return docxModCache;
}

interface CitationLite {
  index: number;
  citation: string;
  title?: string | null;
  sourceUrl?: string | null;
  lastVerified?: string | null;
}

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

/* Caelex emerald (RRGGBB hex without the leading #). */
const EMERALD = "10B981";
const NAVY = "0F172A";
const SLATE_700 = "334155";
const SLATE_500 = "64748B";

/**
 * Build the Word document children — cover header, all Q&A pairs,
 * footer disclaimer.
 *
 * AUDIT-FIX C04: takes docxMod as a param so the heavy `docx` library
 * is only loaded at the entry-point (generateChatDocxBlob). The local
 * destructuring at the top lets the body keep its readable
 * `new Paragraph(...)` / `HeadingLevel.HEADING_2` style without
 * threading `docxMod.X` through every line.
 */
function buildChildren(chat: ChatRecord, docxMod: DocxMod): ParagraphType[] {
  const { Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } =
    docxMod;
  const children: ParagraphType[] = [];

  /* Topline pill */
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: "CAELEX · ATLAS · MANDANTEN-BRIEFING",
          bold: true,
          size: 16, // half-points → 8pt
          color: EMERALD,
        }),
      ],
      spacing: { after: 120 },
    }),
  );

  /* Title */
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: chat.title, bold: true, size: 36, color: NAVY }),
      ],
      spacing: { after: 200 },
    }),
  );

  /* Metadata */
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
  children.push(
    new Paragraph({
      children: [
        new TextRun({ text: meta.join("  ·  "), size: 18, color: SLATE_500 }),
      ],
      spacing: { after: 240 },
      border: {
        bottom: {
          color: "E2E8F0",
          space: 8,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
    }),
  );

  /* Q&A pairs */
  let qNum = 0;
  for (const m of chat.messages) {
    const text = extractText(m.content);
    if (!text.trim()) continue;

    if (m.role === "user") {
      qNum++;
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [new TextRun({ text: `Frage ${qNum}`, bold: true })],
          spacing: { before: 200, after: 80 },
        }),
      );
      children.push(
        new Paragraph({
          children: [new TextRun({ text, size: 22, color: SLATE_700 })],
          spacing: { after: 160 },
        }),
      );
    } else {
      children.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({ text: `Antwort`, bold: true, color: EMERALD }),
          ],
          spacing: { before: 80, after: 80 },
        }),
      );

      /* Render assistant body — preserve markdown semantics where
         we can. Each paragraph processes one logical line. */
      const stripped = stripAtlasTokens(text);
      for (const ln of stripped.split("\n")) {
        const trimmed = ln.trim();
        if (!trimmed) {
          children.push(
            new Paragraph({ children: [], spacing: { after: 80 } }),
          );
          continue;
        }

        const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/);
        if (headingMatch) {
          const level = headingMatch[1].length;
          children.push(
            new Paragraph({
              heading:
                level === 1
                  ? HeadingLevel.HEADING_3
                  : level === 2
                    ? HeadingLevel.HEADING_4
                    : HeadingLevel.HEADING_5,
              children: [new TextRun({ text: headingMatch[2], bold: true })],
              spacing: { before: 160, after: 80 },
            }),
          );
          continue;
        }

        const bulletMatch = trimmed.match(/^[-*]\s+(.+)$/);
        if (bulletMatch) {
          children.push(
            new Paragraph({
              bullet: { level: 0 },
              children: [
                new TextRun({
                  text: bulletMatch[1],
                  size: 22,
                  color: SLATE_700,
                }),
              ],
            }),
          );
          continue;
        }

        const orderedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
        if (orderedMatch) {
          /* docx@^9 has numbering primitives but they need a config
             at Document-level; for now render as a plain paragraph
             with the number in front. Word users can re-style as
             "Numbered List" with one click. */
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${orderedMatch[1]}. ${orderedMatch[2]}`,
                  size: 22,
                  color: SLATE_700,
                }),
              ],
              indent: { left: 360 },
            }),
          );
          continue;
        }

        /* Paragraph with possible bold spans. Walk **…** segments. */
        const parts: TextRun[] = [];
        let i = 0;
        while (i < trimmed.length) {
          const boldStart = trimmed.indexOf("**", i);
          if (boldStart === -1) {
            parts.push(
              new TextRun({
                text: trimmed.slice(i),
                size: 22,
                color: SLATE_700,
              }),
            );
            break;
          }
          if (boldStart > i) {
            parts.push(
              new TextRun({
                text: trimmed.slice(i, boldStart),
                size: 22,
                color: SLATE_700,
              }),
            );
          }
          const boldEnd = trimmed.indexOf("**", boldStart + 2);
          if (boldEnd === -1) {
            parts.push(
              new TextRun({
                text: trimmed.slice(boldStart),
                size: 22,
                color: SLATE_700,
              }),
            );
            break;
          }
          parts.push(
            new TextRun({
              text: trimmed.slice(boldStart + 2, boldEnd),
              bold: true,
              size: 22,
              color: NAVY,
            }),
          );
          i = boldEnd + 2;
        }
        children.push(
          new Paragraph({ children: parts, spacing: { after: 80 } }),
        );
      }

      /* Citations per turn */
      const citations = Array.isArray(m.citations)
        ? (m.citations as CitationLite[])
        : [];
      if (citations.length > 0) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({
                text: "QUELLEN",
                bold: true,
                size: 16,
                color: SLATE_500,
              }),
            ],
            spacing: { before: 160, after: 60 },
          }),
        );
        for (const c of citations) {
          const verified = c.lastVerified
            ? ` (verified ${c.lastVerified})`
            : "";
          const title = c.title ? ` — ${c.title}` : "";
          const url = c.sourceUrl ? ` ${c.sourceUrl}` : "";
          children.push(
            new Paragraph({
              children: [
                new TextRun({
                  text: `${c.index}. ${c.citation}${title}${verified}${url}`,
                  size: 18,
                  color: SLATE_700,
                }),
              ],
              indent: { left: 240 },
              spacing: { after: 40 },
            }),
          );
        }
      }
    }
  }

  /* Disclaimer */
  children.push(
    new Paragraph({
      children: [],
      border: {
        bottom: {
          color: "E2E8F0",
          space: 8,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { before: 320, after: 120 },
    }),
  );
  children.push(
    new Paragraph({
      alignment: AlignmentType.LEFT,
      children: [
        new TextRun({
          text: "Atlas ist ein Recherche- und Drafting-Werkzeug. Die Ausgaben sind nicht als anwaltliche Beratung zu verstehen und ersetzen keine eigenständige Prüfung durch eine zugelassene Anwältin / einen zugelassenen Anwalt. Quellen sind zum Stand der Verifikation korrekt; verbindlich ist immer die offizielle Verlautbarung der jeweiligen Behörde.",
          italics: true,
          size: 16,
          color: SLATE_500,
        }),
      ],
    }),
  );

  return children;
}

function chatDocxFilename(chat: ChatRecord): string {
  const slug =
    chat.title
      .toLowerCase()
      .replace(/[^a-z0-9äöüß]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "chat";
  const date = new Date(chat.updatedAt).toISOString().slice(0, 10);
  return `atlas-briefing-${slug}-${date}.docx`;
}

/**
 * Generate the DOCX without triggering download. Returns the Blob +
 * suggested filename. Used by callers that need the bytes for
 * uploading to the mandate vault.
 */
export async function generateChatDocxBlob(chat: ChatRecord): Promise<{
  blob: Blob;
  filename: string;
}> {
  /* AUDIT-FIX C04: dynamic-loaded docx module — module-cached so a
     second export within the same session skips the network round-trip
     to the chunk. */
  const docxMod = await loadDocx();
  const doc = new docxMod.Document({
    creator: "Caelex Atlas",
    title: chat.title,
    description: "Mandanten-Briefing",
    sections: [{ properties: {}, children: buildChildren(chat, docxMod) }],
  });
  const blob = await docxMod.Packer.toBlob(doc);
  return { blob, filename: chatDocxFilename(chat) };
}

/**
 * Public entry-point. Builds the DOCX + triggers browser download.
 */
export async function downloadChatAsDocx(chat: ChatRecord): Promise<string> {
  const { blob, filename } = await generateChatDocxBlob(chat);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return filename;
}
