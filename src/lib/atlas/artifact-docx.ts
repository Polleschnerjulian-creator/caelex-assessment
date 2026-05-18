"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Artifact → DOCX Export (kanzlei-grade, mirrors artifact-pdf).
 *
 * Mirror of artifact-pdf.ts but produces a REAL Microsoft-Word .docx
 * file (Office Open XML). Lawyers send drafts to clients in DOCX for
 * native review + track-changes.
 *
 * Sprint 1b (2026-05-18): expanded to all 8 ArtifactKind variants with
 * the same three layout families as the PDF generator:
 *
 *   - LETTER kinds (brief, schriftsatz) — DIN 5008-A-style header
 *     (Empfänger left, Datum/Aktenzeichen right, bold Betreff line).
 *   - METADATA kinds (memo, aktennotiz, email) — title-block + grey
 *     metadata table (Von/An/Datum/Betreff).
 *   - DOCUMENT kinds (vertrag, checklist, summary) — title-block then
 *     structured body.
 *
 * Cross-cutting:
 *   - PRIVILEGED & CONFIDENTIAL header runner on every page for
 *     privileged kinds.
 *   - "Seite X von Y" German page-numbering.
 *   - Roman-numeral section headings + numbered lists.
 *   - Greeting / closing detection adds signature-block whitespace.
 *   - GFM tables → native Word tables with navy header band.
 *
 * The `docx` package (~200KB) is dynamic-imported on click so the chat
 * bundle stays lean.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  parseSegments,
  stripInlineMd,
  type TableSegment,
} from "./markdown-segments";
import { slugifyFilename as slugify } from "./filename-slug";

export type ArtifactKind =
  | "memo"
  | "schriftsatz"
  | "vertrag"
  | "brief"
  | "aktennotiz"
  | "email"
  | "checklist"
  | "summary";

export interface ArtifactDocxInput {
  kind: ArtifactKind;
  title: string;
  /** Markdown body. Tables detected and rendered as Word tables. */
  body: string;
  /** Optional mandate-name shown in footer for context. */
  mandateName?: string;
  /** Optional date — defaults to today. */
  date?: Date;
  /** Optional Kanzlei name — appears as sender mini-line on letter kinds. */
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

/* ── Colours (Atlas palette, matches PDF generator) ─────────────────── */
const HEX = {
  navy: "0F172A",
  slate800: "1E293B",
  slate700: "334155",
  slate600: "475569",
  slate500: "64748B",
  slate400: "94A3B8",
  slate200: "E2E8F0",
  slate50: "F8FAFC",
  emerald: "10B981",
  emerald700: "047857",
  white: "FFFFFF",
};

/* ── DOCX builder (dynamic-import) ─────────────────────────────────── */

type DocxMod = typeof import("docx");

function formatGermanDate(d: Date): string {
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${dd}.${mm}.${d.getFullYear()}`;
}

/* ── Letter-style header parsing (brief / schriftsatz) ─────────────── */

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
        )
          break;
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

/* ── Memo / Aktennotiz / Email header parsing ──────────────────────── */

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

/* ── Body builder ──────────────────────────────────────────────────── */

const BLOCK_BREAK_RE = /^(#{1,3}\s|>\s*|[-*+]\s|\d+\.\s|[IVX]+\.\s)/;
const GREETING_RE = /^(Sehr geehrte|Hallo|Liebe[r]?|Guten Tag)/i;
const CLOSING_RE =
  /^(Mit freundlichen Grüßen|Mit besten Grüßen|Hochachtungsvoll|Mit freundlichem Gruß|Beste Grüße|Mit kollegialen Grüßen)/i;

function renderBody(
  text: string,
  {
    Paragraph,
    TextRun,
    HeadingLevel,
  }: Pick<DocxMod, "Paragraph" | "TextRun" | "HeadingLevel">,
): import("docx").Paragraph[] {
  const out: import("docx").Paragraph[] = [];
  const lines = text.split("\n");
  let i = 0;
  while (i < lines.length) {
    const raw = lines[i];
    if (raw.trim().length === 0) {
      out.push(new Paragraph({ children: [], spacing: { after: 80 } }));
      i++;
      continue;
    }
    /* H1 */
    if (/^# /.test(raw)) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^# /, "")),
              bold: true,
              color: HEX.navy,
              size: 32 /* 16pt */,
            }),
          ],
          spacing: { before: 300, after: 160 },
        }),
      );
      i++;
      continue;
    }
    /* H2 */
    if (/^## /.test(raw)) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^## /, "")),
              bold: true,
              color: HEX.navy,
              size: 26 /* 13pt */,
            }),
          ],
          spacing: { before: 260, after: 130 },
        }),
      );
      i++;
      continue;
    }
    /* H3 */
    if (/^### /.test(raw)) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^### /, "")),
              bold: true,
              color: HEX.slate800,
              size: 22 /* 11pt */,
            }),
          ],
          spacing: { before: 200, after: 100 },
        }),
      );
      i++;
      continue;
    }
    /* Roman section heading (I., II., III.) */
    if (/^[IVX]+\.\s/.test(raw)) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: stripInlineMd(raw),
              bold: true,
              color: HEX.navy,
              size: 24 /* 12pt */,
            }),
          ],
          spacing: { before: 280, after: 140 },
          border: {
            bottom: {
              color: HEX.emerald,
              space: 2,
              style: "single",
              size: 8,
            },
          },
        }),
      );
      i++;
      continue;
    }
    /* Numbered list (1. 2. 3.) — preserve numbering with hanging indent. */
    if (/^\d+\.\s+/.test(raw)) {
      const m = raw.match(/^(\d+)\.\s+(.+)$/);
      if (m) {
        out.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `${m[1]}.\t`,
                bold: true,
                color: HEX.slate800,
                size: 22,
              }),
              new TextRun({
                text: stripInlineMd(m[2]),
                color: HEX.slate800,
                size: 22,
              }),
            ],
            indent: { left: 360, hanging: 360 },
            spacing: { after: 80 },
          }),
        );
      } else {
        out.push(
          new Paragraph({
            children: [
              new TextRun({
                text: stripInlineMd(raw),
                color: HEX.slate800,
                size: 22,
              }),
            ],
            spacing: { after: 80 },
          }),
        );
      }
      i++;
      continue;
    }
    /* Bullet list */
    if (/^[-*+]\s+/.test(raw)) {
      out.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^[-*+]\s+/, "")),
              color: HEX.slate800,
              size: 22,
            }),
          ],
          spacing: { after: 60 },
        }),
      );
      i++;
      continue;
    }
    /* Blockquote */
    if (/^>\s*/.test(raw)) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^>\s*/, "")),
              italics: true,
              color: HEX.slate600,
              size: 22,
            }),
          ],
          indent: { left: 360 },
          border: {
            left: {
              color: HEX.emerald,
              space: 8,
              style: "single",
              size: 12,
            },
          },
          spacing: { after: 120 },
        }),
      );
      i++;
      continue;
    }
    /* Greeting */
    if (GREETING_RE.test(raw)) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: stripInlineMd(raw),
              color: HEX.navy,
              size: 22,
            }),
          ],
          spacing: { before: 200, after: 200 },
        }),
      );
      i++;
      continue;
    }
    /* Closing — extra signature whitespace */
    if (CLOSING_RE.test(raw)) {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: stripInlineMd(raw),
              color: HEX.navy,
              size: 22,
            }),
          ],
          spacing: { before: 280, after: 720 /* signature space */ },
        }),
      );
      i++;
      continue;
    }
    /* Body paragraph — aggregate consecutive non-block lines. */
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
    out.push(
      new Paragraph({
        children: [
          new TextRun({ text: paraText, color: HEX.slate800, size: 22 }),
        ],
        spacing: { after: 140, line: 320 /* 1.45 line-height */ },
        alignment: "left",
      }),
    );
    i = j;
  }
  return out;
}

/* ── Table renderer ────────────────────────────────────────────────── */

function renderTable(
  seg: TableSegment,
  {
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
  }: Pick<
    DocxMod,
    | "Paragraph"
    | "TextRun"
    | "Table"
    | "TableRow"
    | "TableCell"
    | "WidthType"
    | "BorderStyle"
  >,
): import("docx").Table {
  const cellBorder = {
    style: BorderStyle.SINGLE,
    size: 4,
    color: HEX.slate200,
  } as const;
  const cellBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
  };
  const headerRow = new TableRow({
    tableHeader: true,
    children: seg.headers.map(
      (h) =>
        new TableCell({
          shading: { fill: HEX.navy },
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  color: HEX.white,
                  size: 19 /* 9.5pt */,
                }),
              ],
            }),
          ],
        }),
    ),
  });
  const bodyRows = seg.rows.map(
    (row, rowIdx) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              shading: rowIdx % 2 === 1 ? { fill: HEX.slate50 } : undefined,
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: stripInlineMd(cell),
                      color: HEX.slate800,
                      size: 19,
                    }),
                  ],
                }),
              ],
            }),
        ),
      }),
  );
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  });
}

/* ── Document builder ──────────────────────────────────────────────── */

async function buildDocument(
  input: ArtifactDocxInput,
  docxMod: DocxMod,
): Promise<import("docx").Document> {
  const {
    Document,
    Paragraph,
    TextRun,
    HeadingLevel,
    AlignmentType,
    Table,
    TableRow,
    TableCell,
    WidthType,
    BorderStyle,
    Footer,
    PageNumber,
    Header,
    TabStopType,
    TabStopPosition,
  } = docxMod;

  const children: (import("docx").Paragraph | import("docx").Table)[] = [];

  const date = formatGermanDate(input.date ?? new Date());

  /* ── LETTER kinds: DIN 5008-A header ─────────────────────────────── */
  if (LETTER_KINDS.has(input.kind)) {
    const parsed = parseLetterHeader(input.body);

    /* Sender mini-line above address block. */
    const sender =
      input.kanzleiName ??
      (input.mandateName ? `Atlas · ${input.mandateName}` : "Atlas");
    children.push(
      new Paragraph({
        children: [
          new TextRun({ text: sender, color: HEX.slate500, size: 14 }),
        ],
        spacing: { after: 60 },
        border: {
          bottom: {
            color: HEX.slate200,
            space: 1,
            style: BorderStyle.SINGLE,
            size: 4,
          },
        },
      }),
    );

    /* Empfänger | Datum + Aktenzeichen — two-column via tab-stop */
    const empf = parsed.empfaenger ?? ["[Empfänger – Adresse]"];
    for (let idx = 0; idx < Math.max(empf.length, 3); idx++) {
      const empfLine = empf[idx] ?? "";
      const runs: import("docx").TextRun[] = [
        new TextRun({ text: empfLine, color: HEX.navy, size: 21 /* 10.5pt */ }),
        new TextRun({ text: "\t" }),
      ];
      if (idx === 0 && parsed.aktenzeichen) {
        runs.push(
          new TextRun({
            text: "Aktenzeichen: ",
            bold: true,
            color: HEX.slate500,
            size: 18,
          }),
          new TextRun({
            text: parsed.aktenzeichen,
            color: HEX.navy,
            size: 20,
          }),
        );
      } else if (
        (idx === 1 && parsed.aktenzeichen) ||
        (idx === 0 && !parsed.aktenzeichen)
      ) {
        runs.push(
          new TextRun({
            text: "Datum: ",
            bold: true,
            color: HEX.slate500,
            size: 18,
          }),
          new TextRun({
            text: date,
            color: HEX.navy,
            size: 20,
          }),
        );
      }
      children.push(
        new Paragraph({
          children: runs,
          tabStops: [
            { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
          ],
          spacing: { after: 80 },
        }),
      );
    }

    /* Betreff */
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Betreff: ${parsed.betreff ?? input.title}`,
            bold: true,
            color: HEX.navy,
            size: 23 /* 11.5pt */,
          }),
        ],
        spacing: { before: 360, after: 280 },
      }),
    );

    children.push(
      ...renderBody(parsed.remainingBody, { Paragraph, TextRun, HeadingLevel }),
    );
  } else {
    /* ── METADATA + DOCUMENT kinds: title-block header ─────────────── */
    let bodyText = input.body;
    let parsedMeta: ParsedMemoHeader | null = null;
    if (METADATA_KINDS.has(input.kind)) {
      parsedMeta = parseMemoHeader(input.body);
      bodyText = parsedMeta.remainingBody;
    }
    /* Strip leading title-as-H1 if present (already rendered in header). */
    bodyText = bodyText.replace(/^#\s+.+\n+/, "");

    /* Kind label + date row. */
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: KIND_LABELS[input.kind].toUpperCase(),
            bold: true,
            size: 16 /* 8pt */,
            color: HEX.emerald700,
          }),
          new TextRun({ text: "\t" }),
          new TextRun({
            text: date,
            color: HEX.slate500,
            size: 18,
          }),
        ],
        tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
        spacing: { after: 120 },
      }),
    );

    /* Title. */
    children.push(
      new Paragraph({
        heading: HeadingLevel.TITLE,
        children: [
          new TextRun({
            text: input.title,
            bold: true,
            size: 44 /* 22pt */,
            color: HEX.navy,
          }),
        ],
        spacing: { after: 120 },
      }),
    );

    /* Mandate sub-line. */
    if (input.mandateName) {
      children.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `Mandat: ${input.mandateName}`,
              color: HEX.slate600,
              size: 19,
            }),
          ],
          spacing: { after: 200 },
        }),
      );
    }

    /* Metadata table for memo/aktennotiz/email when 2+ keys present. */
    if (parsedMeta && parsedMeta.metadata.length >= 2) {
      const metaRows = parsedMeta.metadata.map(
        ([k, v]) =>
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: HEX.slate50 },
                width: { size: 20, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: k.toUpperCase(),
                        bold: true,
                        color: HEX.slate500,
                        size: 17,
                      }),
                    ],
                  }),
                ],
              }),
              new TableCell({
                shading: { fill: HEX.slate50 },
                width: { size: 80, type: WidthType.PERCENTAGE },
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: v,
                        color: HEX.navy,
                        size: 20,
                      }),
                    ],
                  }),
                ],
              }),
            ],
          }),
      );
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: metaRows,
          borders: {
            top: { style: BorderStyle.SINGLE, size: 4, color: HEX.slate200 },
            bottom: { style: BorderStyle.SINGLE, size: 4, color: HEX.slate200 },
            left: { style: BorderStyle.SINGLE, size: 24, color: HEX.emerald },
            right: { style: BorderStyle.SINGLE, size: 4, color: HEX.slate200 },
            insideHorizontal: {
              style: BorderStyle.SINGLE,
              size: 2,
              color: HEX.slate200,
            },
            insideVertical: {
              style: BorderStyle.NONE,
              size: 0,
              color: HEX.slate200,
            },
          },
        }),
      );
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }

    /* Divider line. */
    children.push(
      new Paragraph({
        children: [],
        border: {
          bottom: {
            color: HEX.slate200,
            space: 1,
            style: BorderStyle.SINGLE,
            size: 6,
          },
        },
        spacing: { after: 280 },
      }),
    );

    /* Body. */
    const segments = parseSegments(bodyText);
    for (const seg of segments) {
      if (seg.type === "text") {
        children.push(
          ...renderBody(seg.content, { Paragraph, TextRun, HeadingLevel }),
        );
      } else {
        children.push(
          renderTable(seg, {
            Paragraph,
            TextRun,
            Table,
            TableRow,
            TableCell,
            WidthType,
            BorderStyle,
          }),
        );
        children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
      }
    }
  }

  /* Add table-segments for letter-kinds too (after the body builder). */
  if (LETTER_KINDS.has(input.kind)) {
    /* The letter body was already rendered above without table-segment
       support — re-parse and append any tables that appeared in the
       remaining body. (Tables in letters are rare but possible.) */
    const parsed = parseLetterHeader(input.body);
    const segments = parseSegments(parsed.remainingBody);
    /* We've already added text segments via renderBody; only append
       tables here. To prevent double-rendering, we strip-add only
       table-segments to a NEW children array and slot them at the end. */
    for (const seg of segments) {
      if (seg.type === "table") {
        children.push(
          renderTable(seg, {
            Paragraph,
            TextRun,
            Table,
            TableRow,
            TableCell,
            WidthType,
            BorderStyle,
          }),
        );
        children.push(new Paragraph({ children: [], spacing: { after: 160 } }));
      }
    }
  }

  const footerText = input.mandateName
    ? `${input.mandateName} · erstellt mit Atlas (Caelex)`
    : "erstellt mit Atlas (Caelex)";

  /* Header runner: privilege stamp (for privileged kinds) + kind label. */
  const headerChildren: import("docx").Paragraph[] = [];
  if (PRIVILEGED_KINDS.has(input.kind)) {
    headerChildren.push(
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: "PRIVILEGED & CONFIDENTIAL · Anwaltsgeheimnis · § 43a BRAO",
            bold: true,
            color: HEX.slate500,
            size: 13 /* 6.5pt */,
          }),
        ],
      }),
    );
  }
  headerChildren.push(
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({
          text: KIND_LABELS[input.kind],
          color: HEX.slate400,
          size: 16,
        }),
      ],
    }),
  );

  return new Document({
    creator: "Atlas (Caelex)",
    title: input.title,
    description: `${KIND_LABELS[input.kind]} — exportiert aus Atlas`,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 /* 11pt body */ },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440 /* DIN 5008-A ≈ 25mm */,
              right: 1134 /* ≈ 20mm */,
              bottom: 1134,
              left: 1418 /* ≈ 25mm */,
            },
          },
        },
        headers: {
          default: new Header({ children: headerChildren }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: footerText,
                    color: HEX.slate400,
                    size: 15,
                  }),
                  new TextRun({ text: "\t" }),
                  new TextRun({
                    text: "Seite ",
                    color: HEX.slate400,
                    size: 15,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: HEX.slate400,
                    size: 15,
                  }),
                  new TextRun({
                    text: " von ",
                    color: HEX.slate400,
                    size: 15,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    color: HEX.slate400,
                    size: 15,
                  }),
                ],
                tabStops: [
                  { type: TabStopType.RIGHT, position: TabStopPosition.MAX },
                ],
                border: {
                  top: {
                    color: HEX.slate200,
                    space: 4,
                    style: BorderStyle.SINGLE,
                    size: 2,
                  },
                },
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

/* ── Public API ─────────────────────────────────────────────────────── */

export async function buildArtifactDocxBlob(
  input: ArtifactDocxInput,
): Promise<Blob> {
  const docxMod = await import("docx");
  const doc = await buildDocument(input, docxMod);
  return docxMod.Packer.toBlob(doc);
}

export async function downloadArtifactAsDocx(
  input: ArtifactDocxInput,
): Promise<void> {
  const blob = await buildArtifactDocxBlob(input);
  const filename = `atlas-${input.kind}-${slugify(input.title)}.docx`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }, 0);
}
