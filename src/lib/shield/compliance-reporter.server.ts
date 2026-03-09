/**
 * SHIELD — Compliance Reporter
 *
 * Generates professional PDF reports for Collision Avoidance events.
 * Documents the conjunction, CDM history, decisions, and escalation log
 * for regulatory compliance (EU Space Act).
 *
 * Exports:
 *   - formatPcScientific(pc)       — format Pc in scientific notation
 *   - buildCAReportSections(...)   — pure data builder (testable)
 *   - generateCAReportPDF(...)     — renders PDF, returns Buffer
 */
import "server-only";

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

// ─── Input Interfaces (local, not exported) ─────────────────────────────────

interface EventInput {
  id: string;
  conjunctionId: string;
  noradId: string;
  threatNoradId: string;
  threatObjectName: string | null;
  threatObjectType: string;
  status: string;
  riskTier: string;
  peakPc: number;
  latestPc: number;
  latestMissDistance: number;
  tca: Date;
  relativeSpeed: number | null;
  decision: string | null;
  decisionBy: string | null;
  decisionAt: Date | null;
  decisionRationale: string | null;
  createdAt: Date;
}

interface CDMInput {
  cdmId: string;
  creationDate: Date;
  collisionProbability: number;
  missDistance: number;
  riskTier: string;
}

interface EscalationInput {
  previousTier: string;
  newTier: string;
  previousStatus: string;
  newStatus: string;
  triggeredBy: string;
  createdAt: Date;
}

// ─── Report Section Types ───────────────────────────────────────────────────

export interface ReportSection {
  title: string;
  content: Array<Record<string, unknown>>;
}

// ─── Layout Constants (mm) ──────────────────────────────────────────────────

const PAGE_W = 210;
const MARGIN_L = 20;
const MARGIN_R = 20;
const MARGIN_T = 25;
const MARGIN_B = 35;
const CONTENT_W = PAGE_W - MARGIN_L - MARGIN_R;
const PAGE_H = 297;
const MAX_Y = PAGE_H - MARGIN_B;

// ─── Colors ─────────────────────────────────────────────────────────────────

const COL = {
  primary: [30, 58, 95] as [number, number, number],
  body: [45, 55, 72] as [number, number, number],
  secondary: [74, 85, 104] as [number, number, number],
  muted: [113, 128, 150] as [number, number, number],
  light: [160, 174, 192] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  red: [229, 62, 62] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  headerBg: [247, 250, 252] as [number, number, number],
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDate(d: Date): string {
  return d.toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function displayStr(s: string): string {
  return s.replace(/_/g, " ");
}

/**
 * Format collision probability in scientific notation.
 * e.g. 1.5e-5 → "1.50e-5", 0 → "0.00e+0"
 */
export function formatPcScientific(pc: number): string {
  if (pc === 0) return "0.00e+0";
  const exp = Math.floor(Math.log10(Math.abs(pc)));
  const mantissa = pc / Math.pow(10, exp);
  const sign = exp >= 0 ? "+" : "";
  return `${mantissa.toFixed(2)}e${sign}${exp}`;
}

// ─── Section Builder (pure, testable) ───────────────────────────────────────

/**
 * Build structured report data for a CA event.
 * Returns 5 sections ready for PDF rendering.
 */
export function buildCAReportSections(
  event: EventInput,
  cdms: CDMInput[],
  escalationLog: EscalationInput[],
): ReportSection[] {
  // 1. Event Summary
  const summaryItems = [
    { key: "Conjunction ID", value: event.conjunctionId },
    { key: "Primary NORAD ID", value: event.noradId },
    { key: "Threat NORAD ID", value: event.threatNoradId },
    {
      key: "Threat Object",
      value: event.threatObjectName
        ? `${event.threatObjectName} (${displayStr(event.threatObjectType)})`
        : displayStr(event.threatObjectType),
    },
    { key: "TCA", value: fmtDate(event.tca) },
    { key: "Risk Tier", value: displayStr(event.riskTier) },
    { key: "Status", value: displayStr(event.status) },
    { key: "Peak Pc", value: formatPcScientific(event.peakPc) },
    { key: "Latest Pc", value: formatPcScientific(event.latestPc) },
    {
      key: "Miss Distance",
      value: `${event.latestMissDistance.toFixed(1)} m`,
    },
    {
      key: "Relative Speed",
      value:
        event.relativeSpeed !== null
          ? `${event.relativeSpeed.toFixed(1)} m/s`
          : "N/A",
    },
    { key: "Created", value: fmtDate(event.createdAt) },
  ];

  const eventSummary: ReportSection = {
    title: "1. Event Summary",
    content: [{ type: "keyValue", items: summaryItems }],
  };

  // 2. CDM History
  const cdmRows = cdms.map((c) => [
    c.cdmId,
    fmtDate(c.creationDate),
    formatPcScientific(c.collisionProbability),
    c.missDistance.toFixed(1),
    displayStr(c.riskTier),
  ]);

  const cdmHistory: ReportSection = {
    title: "2. CDM History",
    content: [
      { type: "text", value: `${cdms.length} CDM(s) received.` },
      {
        type: "table",
        headers: ["CDM ID", "Date", "Pc", "Miss (m)", "Tier"],
        rows: cdmRows,
      },
    ],
  };

  // 3. Decision Record
  const decisionContent: Array<Record<string, unknown>> = [];
  if (event.decision) {
    decisionContent.push({
      type: "keyValue",
      items: [
        { key: "Decision", value: displayStr(event.decision) },
        { key: "Decided By", value: event.decisionBy ?? "N/A" },
        {
          key: "Decided At",
          value: event.decisionAt ? fmtDate(event.decisionAt) : "N/A",
        },
        { key: "Rationale", value: event.decisionRationale ?? "N/A" },
      ],
    });
  } else {
    decisionContent.push({
      type: "text",
      value: "No decision recorded.",
    });
  }

  const decisionRecord: ReportSection = {
    title: "3. Decision Record",
    content: decisionContent,
  };

  // 4. Escalation History
  const escalationRows = escalationLog.map((e) => [
    fmtDate(e.createdAt),
    `${displayStr(e.previousTier)} → ${displayStr(e.newTier)}`,
    `${displayStr(e.previousStatus)} → ${displayStr(e.newStatus)}`,
    e.triggeredBy,
  ]);

  const escalationHistory: ReportSection = {
    title: "4. Escalation History",
    content: [
      {
        type: "text",
        value: `${escalationLog.length} escalation(s) recorded.`,
      },
      {
        type: "table",
        headers: ["Date", "Tier Change", "Status Change", "Trigger"],
        rows: escalationRows,
      },
    ],
  };

  // 5. Compliance Note
  const complianceNote: ReportSection = {
    title: "5. Compliance Note",
    content: [
      {
        type: "text",
        value:
          "This report is generated for regulatory compliance purposes under the EU Space Act " +
          "(COM(2025) 335). It documents the conjunction event, CDM data received, risk assessments " +
          "performed, and decisions taken by the operator. This report should be retained for a " +
          "minimum of 5 years and made available to the relevant National Competent Authority (NCA) " +
          "upon request. The collision probability values and risk classifications contained herein " +
          "are based on publicly available conjunction data messages (CDMs) and may be subject to " +
          "revision as new data becomes available.",
      },
    ],
  };

  return [
    eventSummary,
    cdmHistory,
    decisionRecord,
    escalationHistory,
    complianceNote,
  ];
}

// ─── PDF Generator ──────────────────────────────────────────────────────────

/**
 * Generate a professional CA Report PDF.
 * Calls buildCAReportSections internally, renders with jsPDF, returns Buffer.
 */
export function generateCAReportPDF(
  event: EventInput,
  cdms: CDMInput[],
  escalationLog: EscalationInput[],
): Buffer {
  const sections = buildCAReportSections(event, cdms, escalationLog);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  doc.setFont("helvetica", "normal");

  let y = MARGIN_T;
  let pageNum = 1;

  // ── Helpers ───────────────────────────────────────────────────────────

  function checkPageBreak(needed: number) {
    if (y + needed > MAX_Y) {
      addFooter();
      doc.addPage();
      pageNum++;
      y = MARGIN_T;
    }
  }

  function addFooter() {
    const footerY = PAGE_H - 20;
    // Divider
    doc.setDrawColor(...COL.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, footerY, PAGE_W - MARGIN_R, footerY);

    // Left
    doc.setFontSize(7);
    doc.setTextColor(...COL.light);
    doc.setFont("helvetica", "normal");
    doc.text("Generated by Caelex Shield (caelex.eu)", MARGIN_L, footerY + 4);

    // Center — CONFIDENTIAL
    doc.setFontSize(6);
    doc.setTextColor(...COL.red);
    doc.setFont("helvetica", "bold");
    doc.text("CONFIDENTIAL", PAGE_W / 2, footerY + 4, { align: "center" });

    // Right — page number
    doc.setFontSize(8);
    doc.setTextColor(...COL.secondary);
    doc.setFont("helvetica", "normal");
    doc.text(`Page ${pageNum}`, PAGE_W - MARGIN_R, footerY + 4, {
      align: "right",
    });
  }

  // ── Header ────────────────────────────────────────────────────────────

  // Title
  doc.setFontSize(18);
  doc.setTextColor(...COL.primary);
  doc.setFont("helvetica", "bold");
  doc.text("Collision Avoidance Report", MARGIN_L, y);
  y += 9;

  // Subtitle
  doc.setFontSize(11);
  doc.setTextColor(...COL.secondary);
  doc.setFont("helvetica", "normal");
  doc.text(`Conjunction: ${event.conjunctionId}`, MARGIN_L, y);
  y += 6;

  // Report date
  doc.setFontSize(9);
  doc.setTextColor(...COL.muted);
  const dateStr = `Report Date: ${new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })}`;
  doc.text(dateStr, MARGIN_L, y);
  y += 4;

  // Divider line
  doc.setDrawColor(...COL.primary);
  doc.setLineWidth(0.8);
  doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
  y += 10;

  // ── Sections ──────────────────────────────────────────────────────────

  for (const section of sections) {
    // Section title
    checkPageBreak(15);
    doc.setFontSize(13);
    doc.setTextColor(...COL.primary);
    doc.setFont("helvetica", "bold");
    doc.text(section.title, MARGIN_L, y);
    y += 5;

    // Section underline
    doc.setDrawColor(...COL.border);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
    y += 6;

    // Content blocks
    for (const block of section.content) {
      const type = block.type as string;

      if (type === "text") {
        const value = block.value as string;
        doc.setFontSize(10);
        doc.setTextColor(...COL.body);
        doc.setFont("helvetica", "normal");
        const lines = doc.splitTextToSize(value, CONTENT_W);
        const lineH = 4.5;
        const totalH = lines.length * lineH;
        checkPageBreak(totalH);
        doc.text(lines, MARGIN_L, y);
        y += totalH + 3;
      }

      if (type === "keyValue") {
        const items = block.items as Array<{ key: string; value: string }>;
        doc.setFontSize(9);
        for (const item of items) {
          const valLines = doc.splitTextToSize(item.value, CONTENT_W - 50);
          const h = Math.max(valLines.length * 4, 5);
          checkPageBreak(h + 2);

          // Key (bold)
          doc.setFont("helvetica", "bold");
          doc.setTextColor(...COL.secondary);
          doc.text(item.key, MARGIN_L, y);

          // Value (normal)
          doc.setFont("helvetica", "normal");
          doc.setTextColor(...COL.body);
          doc.text(valLines, MARGIN_L + 50, y);

          y += h;

          // Separator
          doc.setDrawColor(...COL.border);
          doc.setLineWidth(0.1);
          doc.line(MARGIN_L, y, PAGE_W - MARGIN_R, y);
          y += 3;
        }
        y += 2;
      }

      if (type === "table") {
        const headers = block.headers as string[];
        const rows = block.rows as string[][];
        checkPageBreak(20);

        autoTable(doc, {
          startY: y,
          head: [headers],
          body: rows,
          margin: { left: MARGIN_L, right: MARGIN_R },
          styles: {
            fontSize: 8,
            cellPadding: 3,
            textColor: COL.body,
            lineColor: COL.border,
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: COL.primary,
            textColor: COL.white,
            fontStyle: "bold",
            lineWidth: 0.2,
          },
          alternateRowStyles: {
            fillColor: [252, 252, 253],
          },
        });

        const finalY = (doc as any).lastAutoTable?.finalY;
        if (finalY) {
          y = finalY + 5;
        } else {
          y += 15;
        }
      }
    }

    y += 4;
  }

  // ── Final footer ──────────────────────────────────────────────────────

  addFooter();

  return Buffer.from(doc.output("arraybuffer"));
}
