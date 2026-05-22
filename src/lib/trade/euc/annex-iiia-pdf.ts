import "server-only";
import { jsPDF } from "jspdf";
import type {
  AnnexDocument,
  AnnexField,
  AnnexSection,
} from "./annex-iiia-template";

/**
 * Render an `AnnexDocument` to a PDF (A4) using jsPDF.
 *
 * jsPDF is chosen over `@react-pdf/renderer` because the rest of the
 * server-side PDF stack (jspdf-generator.ts, section203, dpa-cover)
 * already uses it, so we get consistent typography + no extra DOM
 * dependency. The output is a `Buffer` ready to stream from a route
 * handler with `Content-Type: application/pdf`.
 */

// ─── Layout constants (mm, A4 portrait) ─────────────────────────────

const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_L = 22;
const MARGIN_R = 22;
const MARGIN_T = 30;
const MARGIN_B = 28;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const MAX_Y = PAGE_H - MARGIN_B;

// ─── Palette ────────────────────────────────────────────────────────

const COL = {
  navy: [15, 23, 42] as [number, number, number], // #0F172A
  slate800: [30, 41, 59] as [number, number, number],
  slate700: [51, 65, 85] as [number, number, number],
  slate500: [100, 116, 139] as [number, number, number],
  slate400: [148, 163, 184] as [number, number, number],
  slate200: [226, 232, 240] as [number, number, number],
  emerald: [16, 185, 129] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  red: [239, 68, 68] as [number, number, number],
};

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Render the given Annex IIIa document and return a Node `Buffer`.
 *
 * The function is pure — it does not touch the filesystem, it just
 * builds an in-memory PDF. Callers (e.g. the route handler) are
 * responsible for setting headers + streaming the body.
 */
export function renderAnnexIIIaPdf(document: AnnexDocument): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");

  const ctx: RenderContext = { doc, y: MARGIN_T };

  renderHeader(ctx, document);
  for (const section of document.sections) {
    renderSection(ctx, section);
  }
  renderFooter(ctx.doc, document);

  const arrayBuffer = ctx.doc.output("arraybuffer");
  return Buffer.from(arrayBuffer);
}

// ─── Internal helpers ───────────────────────────────────────────────

interface RenderContext {
  doc: jsPDF;
  y: number;
}

function renderHeader(ctx: RenderContext, document: AnnexDocument): void {
  const { doc } = ctx;

  // Emerald accent bar.
  doc.setFillColor(...COL.emerald);
  doc.rect(MARGIN_L, MARGIN_T - 12, 40, 2, "F");

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate500);
  doc.setFontSize(9);
  doc.text("END-USE CERTIFICATE", MARGIN_L, MARGIN_T - 4);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.navy);
  doc.setFontSize(20);
  doc.text(document.title, MARGIN_L, MARGIN_T + 6);
  ctx.y = MARGIN_T + 10;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COL.slate500);
  doc.setFontSize(9);
  doc.text(document.documentCode, MARGIN_L, ctx.y + 4);
  ctx.y += 8;

  // Metadata block.
  doc.setFontSize(8);
  doc.setTextColor(...COL.slate500);
  const meta: string[] = [
    `Prepared on: ${document.preparedOn}`,
    document.validUntil
      ? `Valid until: ${document.validUntil}`
      : "Validity: open-ended",
  ];
  doc.text(meta.join("  ·  "), MARGIN_L, ctx.y + 4);
  ctx.y += 6;

  // Separator.
  doc.setDrawColor(...COL.slate200);
  doc.setLineWidth(0.4);
  doc.line(MARGIN_L, ctx.y + 4, PAGE_W - MARGIN_R, ctx.y + 4);
  ctx.y += 12;
}

function renderSection(ctx: RenderContext, section: AnnexSection): void {
  ensureSpace(ctx, 18);
  const { doc } = ctx;

  // Section ordinal + title.
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.navy);
  doc.setFontSize(12);
  const heading =
    section.ordinal.length > 0
      ? `${section.ordinal} ${section.title}`
      : section.title;
  doc.text(heading, MARGIN_L, ctx.y);
  ctx.y += 5;

  // Thin emerald rule beneath each section heading.
  doc.setDrawColor(...COL.emerald);
  doc.setLineWidth(0.6);
  doc.line(MARGIN_L, ctx.y, MARGIN_L + 24, ctx.y);
  ctx.y += 4;

  // Optional paragraph.
  if (section.paragraph) {
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate700);
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(section.paragraph, CONTENT_W);
    for (const line of lines) {
      ensureSpace(ctx, 5);
      doc.text(line, MARGIN_L, ctx.y);
      ctx.y += 5;
    }
    ctx.y += 2;
  }

  // Fields.
  for (const field of section.fields) {
    renderField(ctx, field);
  }

  // Bullets (used for goods list + prohibition clauses).
  if (section.bullets && section.bullets.length > 0) {
    ctx.y += 1;
    for (const bullet of section.bullets) {
      renderBullet(ctx, bullet);
    }
  }

  ctx.y += 4;
}

function renderField(ctx: RenderContext, field: AnnexField): void {
  ensureSpace(ctx, 8);
  const { doc } = ctx;

  const labelText = field.required ? `${field.label} *` : field.label;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.slate500);
  doc.setFontSize(8.5);
  doc.text(labelText, MARGIN_L, ctx.y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COL.slate800);
  doc.setFontSize(10);
  const value = field.value ?? "________________________";
  const lines = doc.splitTextToSize(value, CONTENT_W);
  ctx.y += 4;
  for (const line of lines) {
    ensureSpace(ctx, 5);
    doc.text(line, MARGIN_L, ctx.y);
    ctx.y += 5;
  }
  ctx.y += 1;
}

function renderBullet(ctx: RenderContext, text: string): void {
  ensureSpace(ctx, 6);
  const { doc } = ctx;

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...COL.emerald);
  doc.setFontSize(10);
  doc.text("•", MARGIN_L + 2, ctx.y);

  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COL.slate700);
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, CONTENT_W - 6);
  for (let i = 0; i < lines.length; i++) {
    ensureSpace(ctx, 5);
    doc.text(lines[i], MARGIN_L + 6, ctx.y);
    ctx.y += 5;
  }
  ctx.y += 1;
}

function renderFooter(doc: jsPDF, document: AnnexDocument): void {
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Bottom rule.
    doc.setDrawColor(...COL.slate200);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, PAGE_H - 20, PAGE_W - MARGIN_R, PAGE_H - 20);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COL.slate400);
    doc.setFontSize(8);
    doc.text(`Caelex Trade — ${document.documentCode}`, MARGIN_L, PAGE_H - 14);
    doc.text(`Page ${i} of ${totalPages}`, PAGE_W - MARGIN_R, PAGE_H - 14, {
      align: "right",
    });

    doc.setTextColor(...COL.red);
    doc.setFontSize(7);
    doc.text(
      "DRAFT — TO BE COMPLETED AND SIGNED BY THE FOREIGN END-USER. NOT LEGAL ADVICE.",
      PAGE_W / 2,
      PAGE_H - 8,
      { align: "center" },
    );
  }
}

function ensureSpace(ctx: RenderContext, needed: number): void {
  if (ctx.y + needed > MAX_Y) {
    ctx.doc.addPage();
    ctx.y = MARGIN_T;
  }
}
