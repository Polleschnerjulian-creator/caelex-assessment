/**
 * PDF Generator using jsPDF — Premium Edition
 *
 * Pure JavaScript — zero React dependency.
 * Generates Palantir/Apple-grade compliance documents from ReportSection[] data.
 *
 * Features:
 *   - Dedicated cover page with emerald accent branding
 *   - Auto-generated Table of Contents with page numbers
 *   - Running header/footer on every content page
 *   - "Page X of Y" via putTotalPages two-pass
 *   - Emerald accent color system with navy typography
 *   - Section numbering, left accent bars on headings
 */

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ReportSection } from "./types";

// ─── Layout Constants (mm, A4) ───

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 22;
const MARGIN_R = 22;
const MARGIN_T = 30;
const MARGIN_B = 28;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MAX_Y = PAGE_H - MARGIN_B;

const TOTAL_PAGES_PLACEHOLDER = "{totalPages}";

// ─── Color Palette ───

const COL = {
  navy: [15, 23, 42] as [number, number, number], // #0F172A — titles, table headers
  slate800: [30, 41, 59] as [number, number, number], // #1E293B — section headings
  slate700: [51, 65, 85] as [number, number, number], // #334155 — body text
  slate500: [100, 116, 139] as [number, number, number], // #64748B — secondary text
  slate400: [148, 163, 184] as [number, number, number], // #94A3B8 — muted text
  slate200: [226, 232, 240] as [number, number, number], // #E2E8F0 — borders, lines
  slate50: [248, 250, 252] as [number, number, number], // #F8FAFC — subtle backgrounds
  emerald: [16, 185, 129] as [number, number, number], // #10B981 — accent, brand
  emeraldDark: [5, 150, 105] as [number, number, number], // #059669 — darker accent
  white: [255, 255, 255] as [number, number, number],
  red: [239, 68, 68] as [number, number, number], // #EF4444 — errors, confidential
  amber: [245, 158, 11] as [number, number, number], // #F59E0B — warnings
  blue: [59, 130, 246] as [number, number, number], // #3B82F6 — info
  // Alert backgrounds (subtle)
  redBg: [254, 242, 242] as [number, number, number],
  amberBg: [255, 251, 235] as [number, number, number],
  blueBg: [239, 246, 255] as [number, number, number],
};

// ─── Public API Types ───

export interface PDFGenerationOptions {
  title: string;
  documentCode?: string; // e.g. "A1-DMP"
  preparedFor?: string; // e.g. "CNES (France)"
  version?: string; // e.g. "1.0"
  classification?: string; // e.g. "NCA Confidential"
  organizationName?: string; // Operator name for cover
}

// ─── Helpers ───

function str(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  try {
    return JSON.stringify(v);
  } catch {
    return "";
  }
}

/**
 * Insert spaces into words that are too wide for the given maxWidth (mm).
 * jsPDF's splitTextToSize only breaks at whitespace, so long URLs, compound
 * German words, or any unbroken string will overflow the right margin.
 */
function breakLongWords(doc: jsPDF, text: string, maxWidth: number): string {
  const tokens = text.split(/(\s+)/);
  const result: string[] = [];

  for (const token of tokens) {
    if (/^\s+$/.test(token)) {
      result.push(token);
      continue;
    }
    if (doc.getTextWidth(token) <= maxWidth) {
      result.push(token);
      continue;
    }
    let remaining = token;
    while (remaining.length > 0) {
      let end = remaining.length;
      while (
        end > 1 &&
        doc.getTextWidth(remaining.substring(0, end)) > maxWidth
      ) {
        end--;
      }
      result.push(remaining.substring(0, end));
      remaining = remaining.substring(end);
    }
  }

  return result.join(" ");
}

/** Format current date as "17 March 2026" */
function formatDate(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

// ─── TOC Entry ───

interface TOCEntry {
  number: number;
  title: string;
  page: number; // page number in final doc (after TOC inserted)
}

// ─── Premium PDF Builder ───

class DocumentPDFBuilder {
  private doc: jsPDF;
  private y: number = MARGIN_T;
  private pageNum: number = 1;
  private title: string;
  private opts: PDFGenerationOptions;
  private sectionCounter: number = 0;
  private tocEntries: TOCEntry[] = [];
  private tocPageCount: number = 0; // how many pages the TOC occupies

  constructor(title: string, opts: PDFGenerationOptions) {
    this.title = title;
    this.opts = opts;
    this.doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    this.doc.setFont("helvetica", "normal");
  }

  // ═══════════════════════════════════════════════
  // COVER PAGE
  // ═══════════════════════════════════════════════

  renderCoverPage() {
    const doc = this.doc;
    const classification = this.opts.classification || "NCA Confidential";

    // ── Top emerald accent line ──
    doc.setFillColor(...COL.emerald);
    doc.rect(MARGIN_L, 28, 50, 2.5, "F");

    // ── Classification badge ──
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.slate500);
    doc.text(classification.toUpperCase(), MARGIN_L, 42);

    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate400);
    doc.text("AUTHORIZATION SUBMISSION", MARGIN_L, 48);

    // ── Document Title (large, navy) ──
    doc.setFontSize(24);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.navy);
    const safeTitle = breakLongWords(doc, this.title, CONTENT_W);
    const titleLines = doc.splitTextToSize(safeTitle, CONTENT_W);
    doc.text(titleLines, MARGIN_L, 80);
    const titleEndY = 80 + titleLines.length * 10;

    // ── Document Code ──
    if (this.opts.documentCode) {
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COL.slate400);
      doc.text(this.opts.documentCode, MARGIN_L, titleEndY + 6);
    }

    // ── Thin separator ──
    const separatorY = titleEndY + 20;
    doc.setDrawColor(...COL.slate200);
    doc.setLineWidth(0.4);
    doc.line(MARGIN_L, separatorY, MARGIN_L + 80, separatorY);

    // ── Metadata block ──
    const metaStartY = separatorY + 12;
    doc.setFontSize(9);
    const metaItems: [string, string][] = [];
    if (this.opts.preparedFor) {
      metaItems.push(["Prepared for", this.opts.preparedFor]);
    }
    metaItems.push(["Date", formatDate()]);
    metaItems.push(["Version", this.opts.version || "1.0"]);
    metaItems.push(["Classification", classification]);
    if (this.opts.organizationName) {
      metaItems.push(["Organization", this.opts.organizationName]);
    }

    let metaY = metaStartY;
    for (const [label, value] of metaItems) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COL.slate500);
      doc.text(`${label}:`, MARGIN_L, metaY);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COL.slate700);
      doc.text(value, MARGIN_L + 35, metaY);
      metaY += 6;
    }

    // ── Bottom emerald accent line ──
    doc.setFillColor(...COL.emerald);
    doc.rect(MARGIN_L, PAGE_H - 42, 50, 2.5, "F");

    // ── Caelex branding at bottom ──
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.slate500);
    doc.text("Generated by Caelex", MARGIN_L, PAGE_H - 32);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate400);
    doc.text("caelex.eu", MARGIN_L, PAGE_H - 26);

    // ── Disclaimer at very bottom right ──
    doc.setFontSize(7);
    doc.setTextColor(...COL.red);
    doc.setFont("helvetica", "bold");
    doc.text(
      "FOR INFORMATIONAL PURPOSES ONLY \u2014 NOT LEGAL ADVICE",
      PAGE_W - MARGIN_R,
      PAGE_H - 16,
      { align: "right" },
    );
  }

  // ═══════════════════════════════════════════════
  // TABLE OF CONTENTS
  // ═══════════════════════════════════════════════

  /**
   * Reserve placeholder page(s) for the TOC.
   * We start with 1 page and may add more later.
   */
  private reserveTOCPages() {
    this.doc.addPage();
    this.pageNum++;
    this.tocPageCount = 1;
  }

  /**
   * Fill in the TOC on the reserved page(s) after content rendering.
   * Called during finalize when we know all section page numbers.
   */
  private renderTOC() {
    const doc = this.doc;
    // Go to page 2 (first TOC page)
    doc.setPage(2);

    let y = MARGIN_T;

    // ── Title ──
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.navy);
    doc.text("Table of Contents", MARGIN_L, y);
    y += 8;

    // ── Thin line ──
    doc.setDrawColor(...COL.emerald);
    doc.setLineWidth(0.6);
    doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 10;

    // ── TOC entries ──
    doc.setFontSize(10);
    const lineHeight = 7;

    for (const entry of this.tocEntries) {
      // Check if we need another TOC page
      if (y + lineHeight > MAX_Y) {
        // We need an additional TOC page — for simplicity we just stop.
        // In practice, TOCs rarely exceed one page.
        break;
      }

      // Section number + title
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...COL.slate700);
      const label = `${entry.number}. ${entry.title}`;
      const safeLbl = breakLongWords(doc, label, CONTENT_W - 20);
      const truncated =
        doc.splitTextToSize(safeLbl, CONTENT_W - 20)[0] || label;
      doc.text(truncated, MARGIN_L, y);

      // Page number (right-aligned)
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...COL.navy);
      doc.text(String(entry.page), PAGE_W - MARGIN_R, y, { align: "right" });

      // Dot leader
      const textEndX = MARGIN_L + doc.getTextWidth(truncated) + 2;
      const pageNumStartX =
        PAGE_W - MARGIN_R - doc.getTextWidth(String(entry.page)) - 2;
      if (pageNumStartX > textEndX + 4) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(...COL.slate400);
        let dotX = textEndX;
        while (dotX < pageNumStartX) {
          doc.text(".", dotX, y);
          dotX += 1.8;
        }
      }

      y += lineHeight;
    }
  }

  // ═══════════════════════════════════════════════
  // RUNNING HEADER (every content page)
  // ═══════════════════════════════════════════════

  private addHeader() {
    const doc = this.doc;
    const classification = this.opts.classification || "NCA Confidential";
    const headerY = 16;

    // Left: document code + short title
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate500);
    const leftText = this.opts.documentCode
      ? `${this.opts.documentCode} \u2014 ${this.title}`
      : this.title;
    const safeLt = breakLongWords(doc, leftText, CONTENT_W * 0.6);
    const truncLeft =
      doc.splitTextToSize(safeLt, CONTENT_W * 0.6)[0] || leftText;
    doc.text(truncLeft, MARGIN_L, headerY);

    // Right: classification
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.slate500);
    doc.text(classification.toUpperCase(), PAGE_W - MARGIN_R, headerY, {
      align: "right",
    });

    // Emerald line under header
    doc.setDrawColor(...COL.emerald);
    doc.setLineWidth(0.5);
    doc.line(MARGIN_L, headerY + 3, PAGE_W - MARGIN_R, headerY + 3);
  }

  // ═══════════════════════════════════════════════
  // FOOTER (every content page)
  // ═══════════════════════════════════════════════

  private addFooter(pageNumber: number) {
    const doc = this.doc;
    const footerY = PAGE_H - 16;

    // Thin line
    doc.setDrawColor(...COL.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, footerY, PAGE_W - MARGIN_R, footerY);

    // Left: branding
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate400);
    doc.text("Caelex \u00B7 caelex.eu", MARGIN_L, footerY + 4);

    // Center: CONFIDENTIAL
    doc.setFontSize(6.5);
    doc.setTextColor(...COL.red);
    doc.setFont("helvetica", "bold");
    doc.text("CONFIDENTIAL", PAGE_W / 2, footerY + 4, { align: "center" });

    // Right: Page X of Y
    doc.setFontSize(7.5);
    doc.setTextColor(...COL.slate500);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Page ${pageNumber} of ${TOTAL_PAGES_PLACEHOLDER}`,
      PAGE_W - MARGIN_R,
      footerY + 4,
      { align: "right" },
    );
  }

  // ═══════════════════════════════════════════════
  // PAGE BREAK
  // ═══════════════════════════════════════════════

  private checkPageBreak(neededHeight: number) {
    if (this.y + neededHeight > MAX_Y) {
      this.doc.addPage();
      this.pageNum++;
      this.y = MARGIN_T;
    }
  }

  // ═══════════════════════════════════════════════
  // SECTION TITLE (with number + emerald bar)
  // ═══════════════════════════════════════════════

  renderSection(section: { title: string; content: unknown[] }) {
    this.sectionCounter++;
    const sectionNum = this.sectionCounter;
    const titleText = str(section.title);
    const numberedTitle = `${sectionNum}. ${titleText}`;

    // Track for TOC
    this.tocEntries.push({
      number: sectionNum,
      title: titleText,
      page: this.pageNum, // will be adjusted later for TOC offset
    });

    // Section title with emerald left bar
    this.checkPageBreak(16);
    this.y += 4;

    const doc = this.doc;
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...COL.navy);
    const safe = breakLongWords(doc, numberedTitle, CONTENT_W - 6);
    const lines = doc.splitTextToSize(safe, CONTENT_W - 6);
    const titleHeight = lines.length * 6;

    // Emerald accent bar (left side)
    doc.setFillColor(...COL.emerald);
    doc.rect(MARGIN_L, this.y - 4.5, 2.5, titleHeight + 2, "F");

    // Title text (offset right to make room for bar)
    doc.text(lines, MARGIN_L + 6, this.y);
    this.y += titleHeight + 4;

    // Content blocks
    const content = Array.isArray(section.content) ? section.content : [];
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      this.renderBlock(block as Record<string, unknown>);
    }

    this.y += 4;
  }

  // ═══════════════════════════════════════════════
  // BLOCK DISPATCHER
  // ═══════════════════════════════════════════════

  private renderBlock(block: Record<string, unknown>) {
    const type = String(block.type || "");

    switch (type) {
      case "text":
        this.renderText(str(block.value));
        break;
      case "heading":
        this.renderHeading(str(block.value), block.level === 3 ? 3 : 2);
        break;
      case "list":
        this.renderList(
          Array.isArray(block.items) ? block.items : [],
          block.ordered === true,
        );
        break;
      case "table":
        this.renderTable(
          Array.isArray(block.headers) ? block.headers : [],
          Array.isArray(block.rows) ? block.rows : [],
        );
        break;
      case "keyValue":
        this.renderKeyValue(Array.isArray(block.items) ? block.items : []);
        break;
      case "alert":
        this.renderAlert(str(block.message), String(block.severity || "info"));
        break;
      case "divider":
        this.renderDivider();
        break;
      case "spacer":
        this.y += typeof block.height === "number" ? block.height * 0.35 : 5;
        break;
    }
  }

  // ═══════════════════════════════════════════════
  // TEXT BLOCK
  // ═══════════════════════════════════════════════

  private renderText(text: string) {
    if (!text) return;
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COL.slate700);
    this.doc.setFont("helvetica", "normal");
    const safe = breakLongWords(this.doc, text, CONTENT_W);
    const lines = this.doc.splitTextToSize(safe, CONTENT_W);
    const lineHeight = 5;
    const totalHeight = lines.length * lineHeight;
    this.checkPageBreak(totalHeight);
    this.doc.text(lines, MARGIN_L, this.y, { lineHeightFactor: 1.4 });
    this.y += totalHeight + 3;
  }

  // ═══════════════════════════════════════════════
  // HEADING BLOCK (h2, h3)
  // ═══════════════════════════════════════════════

  private renderHeading(text: string, level: number) {
    if (!text) return;
    this.checkPageBreak(12);
    this.y += 3;
    const doc = this.doc;

    if (level === 2) {
      doc.setFontSize(12);
      doc.setTextColor(...COL.slate800);
    } else {
      doc.setFontSize(11);
      doc.setTextColor(...COL.slate500);
    }
    doc.setFont("helvetica", "bold");
    const safe = breakLongWords(doc, text, CONTENT_W);
    const lines = doc.splitTextToSize(safe, CONTENT_W);
    doc.text(lines, MARGIN_L, this.y);
    this.y += lines.length * 5 + 3;
  }

  // ═══════════════════════════════════════════════
  // LIST BLOCK
  // ═══════════════════════════════════════════════

  private renderList(items: unknown[], ordered: boolean) {
    if (items.length === 0) return;
    this.doc.setFontSize(10);
    this.doc.setTextColor(...COL.slate700);
    this.doc.setFont("helvetica", "normal");

    const indent = 8;
    const bulletWidth = ordered ? 8 : 5;
    const textWidth = CONTENT_W - indent - bulletWidth;

    for (let i = 0; i < items.length; i++) {
      const text = str(items[i]);
      const safe = breakLongWords(this.doc, text, textWidth);
      const lines = this.doc.splitTextToSize(safe, textWidth);
      const height = lines.length * 4.5;
      this.checkPageBreak(height);

      // Bullet/number
      this.doc.setTextColor(...COL.slate500);
      const bullet = ordered ? `${i + 1}.` : "\u2022";
      this.doc.text(bullet, MARGIN_L + indent, this.y);

      // Text
      this.doc.setTextColor(...COL.slate700);
      this.doc.text(lines, MARGIN_L + indent + bulletWidth, this.y);
      this.y += height + 1.5;
    }
    this.y += 2;
  }

  // ═══════════════════════════════════════════════
  // TABLE BLOCK
  // ═══════════════════════════════════════════════

  private renderTable(headers: unknown[], rows: unknown[]) {
    if (headers.length === 0 && rows.length === 0) return;

    const head = [headers.map((h) => str(h))];
    const body = rows
      .filter((r) => Array.isArray(r))
      .map((row) => (row as unknown[]).map((cell) => str(cell)));

    if (body.length === 0 && head[0].length === 0) return;

    this.checkPageBreak(20);

    autoTable(this.doc, {
      startY: this.y,
      head: head[0].length > 0 ? head : undefined,
      body,
      margin: { left: MARGIN_L, right: MARGIN_R },
      styles: {
        fontSize: 8.5,
        cellPadding: 3,
        textColor: COL.slate700,
        lineColor: COL.slate200,
        lineWidth: 0.15,
      },
      headStyles: {
        fillColor: COL.navy,
        textColor: COL.white,
        fontStyle: "bold",
        lineWidth: 0.15,
      },
      alternateRowStyles: {
        fillColor: COL.slate50,
      },
    });

    const finalY = (
      this.doc as unknown as { lastAutoTable?: { finalY: number } }
    ).lastAutoTable?.finalY;
    if (finalY) {
      this.y = finalY + 5;
    } else {
      this.y += 15;
    }
  }

  // ═══════════════════════════════════════════════
  // KEY-VALUE BLOCK
  // ═══════════════════════════════════════════════

  private renderKeyValue(items: unknown[]) {
    if (items.length === 0) return;

    this.doc.setFontSize(9);
    const keyWidth = CONTENT_W * 0.35;
    const valWidth = CONTENT_W * 0.65;

    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const key = str(rec.key);
      const value = str(rec.value);

      const safeVal = breakLongWords(this.doc, value, valWidth - 5);
      const valLines = this.doc.splitTextToSize(safeVal, valWidth - 5);
      const height = Math.max(valLines.length * 4, 5);
      this.checkPageBreak(height + 2);

      // Key
      this.doc.setFont("helvetica", "bold");
      this.doc.setTextColor(...COL.slate500);
      this.doc.text(key, MARGIN_L, this.y);

      // Value
      this.doc.setFont("helvetica", "normal");
      this.doc.setTextColor(...COL.slate700);
      this.doc.text(valLines, MARGIN_L + keyWidth, this.y);

      this.y += height;

      // Separator line
      this.doc.setDrawColor(...COL.slate200);
      this.doc.setLineWidth(0.1);
      this.doc.line(MARGIN_L, this.y, PAGE_W - MARGIN_R, this.y);
      this.y += 3;
    }
    this.y += 2;
  }

  // ═══════════════════════════════════════════════
  // ALERT BLOCK
  // ═══════════════════════════════════════════════

  private renderAlert(message: string, severity: string) {
    if (!message) return;

    const bgColor =
      severity === "warning"
        ? COL.amberBg
        : severity === "error"
          ? COL.redBg
          : COL.blueBg;
    const textColor =
      severity === "warning"
        ? COL.amber
        : severity === "error"
          ? COL.red
          : COL.blue;
    const borderColor = textColor;

    this.doc.setFontSize(9);
    const safe = breakLongWords(this.doc, message, CONTENT_W - 12);
    const lines = this.doc.splitTextToSize(safe, CONTENT_W - 12);
    const boxHeight = lines.length * 4 + 8;
    this.checkPageBreak(boxHeight);

    // Background
    this.doc.setFillColor(...bgColor);
    this.doc.roundedRect(
      MARGIN_L,
      this.y - 2,
      CONTENT_W,
      boxHeight,
      1.5,
      1.5,
      "F",
    );

    // Left accent border
    this.doc.setFillColor(...borderColor);
    this.doc.rect(MARGIN_L, this.y - 2, 2, boxHeight, "F");

    // Text
    this.doc.setTextColor(...textColor);
    this.doc.setFont("helvetica", "normal");
    this.doc.text(lines, MARGIN_L + 7, this.y + 3);

    this.y += boxHeight + 4;
  }

  // ═══════════════════════════════════════════════
  // DIVIDER BLOCK
  // ═══════════════════════════════════════════════

  private renderDivider() {
    this.checkPageBreak(8);
    this.y += 4;
    this.doc.setDrawColor(...COL.slate200);
    this.doc.setLineWidth(0.3);
    this.doc.line(MARGIN_L, this.y, PAGE_W - MARGIN_R, this.y);
    this.y += 6;
  }

  // ═══════════════════════════════════════════════
  // BUILD (orchestrator)
  // ═══════════════════════════════════════════════

  build(sections: ReportSection[]): Blob {
    const doc = this.doc;

    // ── 1. Cover page (page 1) ──
    this.renderCoverPage();

    // ── 2. Reserve TOC page(s) (page 2) ──
    this.reserveTOCPages();

    // ── 3. Start content on page 3 ──
    doc.addPage();
    this.pageNum++;
    this.y = MARGIN_T;

    // ── 4. Render all sections ──
    for (const section of sections) {
      this.renderSection({
        title: str(section.title),
        content: Array.isArray(section.content) ? section.content : [],
      });
    }

    // ── 5. Compute final page numbers ──
    // TOC occupies pages starting from page 2.
    // Content starts at page (2 + tocPageCount).
    // The TOC entries have page numbers relative to when they were rendered
    // (starting from page 3 = cover + 1 TOC page).
    // Since tocPageCount is 1 and we added the content page as page 3,
    // the recorded page numbers are already correct.

    // ── 6. Fill in TOC ──
    this.renderTOC();

    // ── 7. Add headers and footers to all content pages ──
    const totalPages = doc.getNumberOfPages();
    for (let p = 2; p <= totalPages; p++) {
      doc.setPage(p);
      this.addHeader();
      this.addFooter(p);
    }

    // ── 8. putTotalPages for "Page X of Y" ──
    doc.putTotalPages(TOTAL_PAGES_PLACEHOLDER);

    return doc.output("blob");
  }
}

// ─── Public API ───

export function generateDocumentPDF(
  title: string,
  sections: ReportSection[],
  options?: Partial<PDFGenerationOptions>,
): Blob {
  const opts: PDFGenerationOptions = {
    title,
    documentCode: options?.documentCode,
    preparedFor: options?.preparedFor,
    version: options?.version || "1.0",
    classification: options?.classification || "NCA Confidential",
    organizationName: options?.organizationName,
  };

  const builder = new DocumentPDFBuilder(title, opts);
  return builder.build(sections);
}
