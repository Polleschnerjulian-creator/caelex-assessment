"use client";

import { jsPDF } from "jspdf";
import {
  ComplianceResult,
  ModuleStatus,
  ChecklistItem,
  KeyDate,
} from "./types";

// Colors
const BLUE = "#3B82F6";
const DARK = "#0F172A";
const GRAY = "#64748B";
const LIGHT_GRAY = "#94A3B8";
const BG_LIGHT = "#F8FAFC";
const WHITE = "#ffffff";

// Status colors for module badges
const statusColors: Record<string, { bg: string; text: string }> = {
  required: { bg: "#FEE2E2", text: "#DC2626" },
  simplified: { bg: "#FEF3C7", text: "#D97706" },
  recommended: { bg: "#DBEAFE", text: "#2563EB" },
  not_applicable: { bg: "#F1F5F9", text: "#64748B" },
};

// Helper to convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16),
      ]
    : [0, 0, 0];
}

// Helper to set text color from hex
function setColor(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setTextColor(r, g, b);
}

// Helper to set fill color from hex
function setFill(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setFillColor(r, g, b);
}

// Helper to set draw color from hex
function setDraw(doc: jsPDF, hex: string) {
  const [r, g, b] = hexToRgb(hex);
  doc.setDrawColor(r, g, b);
}

// Draw a rounded rectangle
function roundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillHex: string,
) {
  setFill(doc, fillHex);
  doc.roundedRect(x, y, w, h, r, r, "F");
}

// Page dimensions (A4)
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 25;
const CONTENT_W = PAGE_W - 2 * MARGIN;

// Function to generate and download PDF
export async function generatePDF(result: ComplianceResult): Promise<void> {
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });
    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let y = MARGIN;

    // ========================================
    // PAGE 1: Profile and Stats
    // ========================================

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    setColor(doc, DARK);
    doc.text("Caelex", MARGIN, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    setColor(doc, GRAY);
    doc.text("Space Compliance, Simplified", MARGIN, y + 7);

    doc.setFontSize(9);
    doc.text(`Assessment Date: ${today}`, MARGIN, y + 13);

    // Blue line under header
    setDraw(doc, BLUE);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, y + 17, PAGE_W - MARGIN, y + 17);

    y += 28;

    // Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setColor(doc, DARK);
    doc.text("EU Space Act Compliance Report", MARGIN, y);
    y += 14;

    // Section: Compliance Profile
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setColor(doc, DARK);
    doc.text("Compliance Profile", MARGIN, y);
    y += 2;
    setDraw(doc, "#E2E8F0");
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    // Profile grid (2 columns)
    const profileItems = [
      { label: "OPERATOR TYPE", value: result.operatorTypeLabel },
      { label: "REGULATORY REGIME", value: result.regimeLabel },
      { label: "ENTITY SIZE", value: result.entitySizeLabel },
      {
        label: "CONSTELLATION",
        value: result.constellationTierLabel || "N/A",
      },
      { label: "PRIMARY ORBIT", value: result.orbitLabel },
      {
        label: "EU MARKET SERVICES",
        value: result.offersEUServices ? "Yes" : "No",
      },
    ];

    const colW = (CONTENT_W - 4) / 2;
    for (let i = 0; i < profileItems.length; i += 2) {
      const left = profileItems[i];
      const right = profileItems[i + 1];

      // Left card
      roundedRect(doc, MARGIN, y, colW, 16, 2, BG_LIGHT);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(doc, GRAY);
      doc.text(left.label, MARGIN + 4, y + 5);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(doc, DARK);
      doc.text(left.value, MARGIN + 4, y + 11);

      // Right card
      if (right) {
        const rx = MARGIN + colW + 4;
        roundedRect(doc, rx, y, colW, 16, 2, BG_LIGHT);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(7);
        setColor(doc, GRAY);
        doc.text(right.label, rx + 4, y + 5);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        setColor(doc, DARK);
        doc.text(right.value, rx + 4, y + 11);
      }

      y += 20;
    }

    y += 4;

    // Stats row
    roundedRect(doc, MARGIN, y, CONTENT_W, 20, 2, BG_LIGHT);
    const statsData = [
      { value: String(result.applicableCount), label: "Applicable Articles" },
      {
        value: `${result.applicablePercentage}%`,
        label: "of Total Regulation",
      },
      { value: String(result.checklist.length), label: "Action Items" },
    ];

    const statW = CONTENT_W / 3;
    statsData.forEach((stat, i) => {
      const sx = MARGIN + i * statW + statW / 2;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      setColor(doc, BLUE);
      doc.text(stat.value, sx, y + 10, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      setColor(doc, GRAY);
      doc.text(stat.label, sx, y + 16, { align: "center" });
    });

    y += 28;

    // Authorization Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setColor(doc, DARK);
    doc.text("Authorization Information", MARGIN, y);
    y += 2;
    setDraw(doc, "#E2E8F0");
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    // Auth grid
    roundedRect(doc, MARGIN, y, colW, 16, 2, BG_LIGHT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(doc, GRAY);
    doc.text("AUTHORIZATION PATH", MARGIN + 4, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(doc, DARK);
    doc.text(result.authorizationPath, MARGIN + 4, y + 11);

    const rx = MARGIN + colW + 4;
    roundedRect(doc, rx, y, colW, 16, 2, BG_LIGHT);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(doc, GRAY);
    doc.text("ESTIMATED COST", rx + 4, y + 5);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    setColor(doc, DARK);
    doc.text(result.estimatedAuthorizationCost, rx + 4, y + 11);

    y += 24;

    // Key Dates
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    setColor(doc, DARK);
    doc.text("Key Dates", MARGIN, y);
    y += 2;
    setDraw(doc, "#E2E8F0");
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;

    (result.keyDates || []).forEach((date: KeyDate) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(doc, DARK);
      doc.text(date.date, MARGIN + 4, y);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(doc, GRAY);
      doc.text(date.description, MARGIN + 40, y);
      y += 6;
    });

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(doc, LIGHT_GRAY);
    doc.text("Generated by Caelex | caelex.eu", PAGE_W / 2, PAGE_H - 15, {
      align: "center",
    });

    // ========================================
    // PAGE 2: Modules
    // ========================================
    doc.addPage();
    y = MARGIN;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setColor(doc, DARK);
    doc.text("Compliance Modules", MARGIN, y);
    y += 12;

    const modules = result.moduleStatuses || [];
    for (let i = 0; i < modules.length; i += 2) {
      const leftMod = modules[i];
      const rightMod = modules[i + 1];

      // Check page break
      if (y + 35 > PAGE_H - 25) {
        doc.addPage();
        y = MARGIN;
      }

      // Left module card
      drawModuleCard(doc, MARGIN, y, colW, leftMod);

      // Right module card
      if (rightMod) {
        drawModuleCard(doc, MARGIN + colW + 4, y, colW, rightMod);
      }

      y += 35;
    }

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(doc, LIGHT_GRAY);
    doc.text("Generated by Caelex | caelex.eu", PAGE_W / 2, PAGE_H - 15, {
      align: "center",
    });

    // ========================================
    // PAGE 3: Checklist
    // ========================================
    doc.addPage();
    y = MARGIN;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    setColor(doc, DARK);
    doc.text("Compliance Checklist", MARGIN, y);
    y += 12;

    const checklistItems = (result.checklist || []).slice(0, 15);
    checklistItems.forEach((item: ChecklistItem, i: number) => {
      // Check page break
      if (y + 14 > PAGE_H - 45) {
        doc.addPage();
        y = MARGIN;
      }

      // Number
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      setColor(doc, BLUE);
      doc.text(`${i + 1}.`, MARGIN, y);

      // Requirement text (with wrapping)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      setColor(doc, DARK);
      const lines = doc.splitTextToSize(item.requirement || "", CONTENT_W - 12);
      doc.text(lines, MARGIN + 10, y);

      y += lines.length * 4 + 1;

      // Meta
      doc.setFontSize(7);
      setColor(doc, GRAY);
      doc.text(
        `Art. ${item.articles || "N/A"} | ${(item.module || "").replace(/_/g, " ")}`,
        MARGIN + 10,
        y,
      );

      y += 4;

      // Separator line
      setDraw(doc, "#F1F5F9");
      doc.setLineWidth(0.2);
      doc.line(MARGIN, y, PAGE_W - MARGIN, y);
      y += 4;
    });

    // Disclaimer
    y += 6;
    if (y + 20 > PAGE_H - 25) {
      doc.addPage();
      y = MARGIN;
    }

    roundedRect(doc, MARGIN, y, CONTENT_W, 22, 2, "#FEF3C7");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(doc, "#92400E");
    const disclaimerText = doc.splitTextToSize(
      "DISCLAIMER: This assessment is based on the EU Space Act proposal (COM(2025) 335). The regulation is subject to amendments during the legislative process. This does not constitute legal advice. For specific compliance questions, consult a qualified space law professional.",
      CONTENT_W - 8,
    );
    doc.text(disclaimerText, MARGIN + 4, y + 5);

    // Footer
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    setColor(doc, LIGHT_GRAY);
    doc.text("Generated by Caelex | caelex.eu", PAGE_W / 2, PAGE_H - 15, {
      align: "center",
    });

    // ========================================
    // Download
    // ========================================
    const filename = `caelex-eu-space-act-assessment-${new Date().toISOString().split("T")[0]}.pdf`;
    doc.save(filename);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

// Draw a single module card
function drawModuleCard(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  mod: ModuleStatus,
) {
  // Card border
  setDraw(doc, "#E2E8F0");
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, w, 30, 2, 2, "S");

  // Module name
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  setColor(doc, DARK);
  doc.text(mod.name, x + 4, y + 6);

  // Status badge
  const colors = statusColors[mod.status] || statusColors.not_applicable;
  const statusText = mod.status.replace("_", " ").toUpperCase();
  const badgeW = doc.getTextWidth(statusText) + 4;
  roundedRect(doc, x + 4, y + 9, badgeW + 2, 5, 1, colors.bg);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6);
  setColor(doc, colors.text);
  doc.text(statusText, x + 6, y + 12.5);

  // Article count
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  setColor(doc, GRAY);
  doc.text(`${mod.articleCount} relevant articles`, x + 4, y + 20);

  // Summary (with wrapping)
  doc.setFontSize(7);
  const summaryLines = doc.splitTextToSize(mod.summary || "", w - 8);
  doc.text(summaryLines.slice(0, 2), x + 4, y + 25);
}
