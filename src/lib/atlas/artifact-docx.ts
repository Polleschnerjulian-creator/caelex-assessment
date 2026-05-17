"use client";

/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Atlas v2 — Artifact → DOCX Export.
 *
 * Mirror of artifact-pdf.ts but produces a REAL Microsoft-Word .docx
 * file (Office Open XML) instead of the older .doc-as-Word-HTML trick.
 * Why both? Lawyers send drafts to clients in DOCX for native review +
 * track-changes. The HTML-trick .doc opens in Word but doesn't survive
 * round-tripping through LibreOffice / Pages / Google Docs cleanly,
 * has wonky table cells, and chokes on Unicode.
 *
 * The `docx` package (~200KB) is dynamic-imported on click so the chat
 * bundle stays lean. Same pattern as MarkdownTableExport's PDF button.
 *
 * Detects GFM pipe-tables in the Markdown body and renders them as
 * native Word tables (proper column widths, borders, header row). Non-
 * table prose detects `#` headings + `-/*` bullets and renders as
 * Word headings + bullet lists.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

export type ArtifactKind =
  | "memo"
  | "schriftsatz"
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
}

const KIND_LABELS: Record<ArtifactKind, string> = {
  memo: "Memo",
  schriftsatz: "Schriftsatz",
  email: "Email",
  checklist: "Checkliste",
  summary: "Zusammenfassung",
};

/* ── Segment parsing (mirror of artifact-pdf.ts) ───────────────────── */

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
    if (
      line.includes("|") &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:-]+\|[\s:-|]+/.test(lines[i + 1])
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

function splitRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((s) => s.trim());
}

function stripInlineMd(s: string): string {
  return s
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\[ATLAS:[^\]]+\]/g, "");
}

/* Slugify for filename (mirrors artifact-pdf). */
function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .replace(/[äÄ]/g, "ae")
      .replace(/[öÖ]/g, "oe")
      .replace(/[üÜ]/g, "ue")
      .replace(/ß/g, "ss")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "dokument"
  );
}

/* ── DOCX builder (dynamic-import to keep chat bundle lean) ────────── */

/* The docx package types are huge; we pull what we need via dynamic
   import and use a structural type for the doc-builder callsite. */
type DocxMod = typeof import("docx");

async function buildDocument(
  input: ArtifactDocxInput,
  docxMod: DocxMod,
): Promise<import("docx").Document> {
  const {
    Document,
    Packer: _Packer, // eslint-disable-line @typescript-eslint/no-unused-vars
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
  } = docxMod;

  const children: (import("docx").Paragraph | import("docx").Table)[] = [];

  /* ── Header block ── */
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: KIND_LABELS[input.kind].toUpperCase(),
          bold: true,
          size: 18, // half-points → 9pt
          color: "10B981", // emerald
        }),
      ],
      spacing: { after: 100 },
    }),
  );
  children.push(
    new Paragraph({
      children: [
        new TextRun({
          text: input.title,
          bold: true,
          size: 36, // 18pt
          color: "0F172A", // navy
        }),
      ],
      spacing: { after: 80 },
    }),
  );
  if (input.kind === "schriftsatz") {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: "PRIVILEGED & CONFIDENTIAL",
            bold: true,
            size: 16, // 8pt
            color: "64748B", // slate-500
          }),
        ],
        spacing: { after: 120 },
      }),
    );
  }
  /* Divider — empty paragraph with bottom border. */
  children.push(
    new Paragraph({
      children: [],
      border: {
        bottom: {
          color: "E2E8F0", // slate-200
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 200 },
    }),
  );

  /* ── Body segments ── */
  const segments = parseSegments(input.body);
  for (const seg of segments) {
    if (seg.type === "text") {
      const textBlocks = renderTextSegment(seg.content, {
        Paragraph,
        TextRun,
        HeadingLevel,
      });
      children.push(...textBlocks);
    } else {
      children.push(
        renderTableSegment(seg, {
          Paragraph,
          TextRun,
          Table,
          TableRow,
          TableCell,
          WidthType,
          BorderStyle,
        }),
      );
      /* Spacing after table. */
      children.push(new Paragraph({ children: [], spacing: { after: 200 } }));
    }
  }

  const footerText = input.mandateName
    ? `${input.mandateName} · Atlas`
    : "Atlas";

  return new Document({
    creator: "Atlas",
    title: input.title,
    description: `${KIND_LABELS[input.kind]} — exportiert aus Atlas`,
    styles: {
      default: {
        document: {
          run: { font: "Calibri", size: 22 }, // 11pt body
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch in twips
              right: 1440,
              bottom: 1440,
              left: 1440,
            },
          },
        },
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun({
                    text: KIND_LABELS[input.kind],
                    color: "94A3B8", // slate-400
                    size: 16, // 8pt
                  }),
                ],
              }),
            ],
          }),
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.LEFT,
                children: [
                  new TextRun({
                    text: footerText,
                    color: "94A3B8",
                    size: 16,
                  }),
                  new TextRun({
                    text: "\t\t",
                  }),
                  new TextRun({
                    text: "Seite ",
                    color: "94A3B8",
                    size: 16,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    color: "94A3B8",
                    size: 16,
                  }),
                  new TextRun({
                    text: "/",
                    color: "94A3B8",
                    size: 16,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    color: "94A3B8",
                    size: 16,
                  }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
}

/* ── Text segment → Paragraph[] ─────────────────────────────────────── */

function renderTextSegment(
  text: string,
  {
    Paragraph,
    TextRun,
    HeadingLevel,
  }: Pick<DocxMod, "Paragraph" | "TextRun" | "HeadingLevel">,
): import("docx").Paragraph[] {
  const out: import("docx").Paragraph[] = [];
  const lines = text.split("\n");
  for (const raw of lines) {
    if (raw.trim().length === 0) {
      out.push(new Paragraph({ children: [] }));
      continue;
    }
    if (/^### /.test(raw)) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_3,
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^### /, "")),
              bold: true,
              color: "1E293B",
            }),
          ],
          spacing: { before: 200, after: 80 },
        }),
      );
    } else if (/^## /.test(raw)) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_2,
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^## /, "")),
              bold: true,
              color: "0F172A",
            }),
          ],
          spacing: { before: 240, after: 120 },
        }),
      );
    } else if (/^# /.test(raw)) {
      out.push(
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^# /, "")),
              bold: true,
              color: "0F172A",
            }),
          ],
          spacing: { before: 280, after: 140 },
        }),
      );
    } else if (/^[-*+]\s+/.test(raw)) {
      out.push(
        new Paragraph({
          bullet: { level: 0 },
          children: [
            new TextRun({
              text: stripInlineMd(raw.replace(/^[-*+]\s+/, "")),
              color: "334155",
            }),
          ],
          spacing: { after: 60 },
        }),
      );
    } else {
      out.push(
        new Paragraph({
          children: [
            new TextRun({
              text: stripInlineMd(raw),
              color: "334155",
            }),
          ],
          spacing: { after: 120 },
        }),
      );
    }
  }
  return out;
}

/* ── Table segment → docx.Table ─────────────────────────────────────── */

function renderTableSegment(
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
    color: "E2E8F0",
  } as const;
  const cellBorders = {
    top: cellBorder,
    bottom: cellBorder,
    left: cellBorder,
    right: cellBorder,
  };

  /* Header row */
  const headerRow = new TableRow({
    tableHeader: true,
    children: seg.headers.map(
      (h) =>
        new TableCell({
          shading: { fill: "F8FAFC" }, // slate-50
          borders: cellBorders,
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: h,
                  bold: true,
                  color: "0F172A",
                  size: 18, // 9pt
                }),
              ],
            }),
          ],
        }),
    ),
  });

  /* Body rows */
  const bodyRows = seg.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell) =>
            new TableCell({
              borders: cellBorders,
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: stripInlineMd(cell),
                      color: "334155",
                      size: 18,
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

/* ── Public API ─────────────────────────────────────────────────────── */

/**
 * Build a Word .docx Blob from the given artifact.
 * Dynamic-imports `docx` so the chat bundle isn't burdened until the
 * user actually clicks the DOCX button.
 */
export async function buildArtifactDocxBlob(
  input: ArtifactDocxInput,
): Promise<Blob> {
  const docxMod = await import("docx");
  const doc = await buildDocument(input, docxMod);
  return docxMod.Packer.toBlob(doc);
}

/**
 * Build the .docx and trigger a browser download. The file-name follows
 * the same `atlas-${kind}-${slug}.docx` convention as the PDF export.
 */
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
