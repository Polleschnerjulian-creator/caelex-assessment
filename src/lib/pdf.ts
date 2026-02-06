"use client";

import { createElement } from "react";
import {
  ComplianceResult,
  ModuleStatus,
  ChecklistItem,
  KeyDate,
} from "./types";

// Lazy-load @react-pdf/renderer to avoid SSR/bundling issues
// The library is only needed when the user actually clicks "Download PDF"
let pdfModule: typeof import("@react-pdf/renderer") | null = null;

async function getPdfModule() {
  if (!pdfModule) {
    pdfModule = await import("@react-pdf/renderer");
  }
  return pdfModule;
}

// Status colors for module badges
const statusColors: Record<string, { bg: string; text: string }> = {
  required: { bg: "#FEE2E2", text: "#DC2626" },
  simplified: { bg: "#FEF3C7", text: "#D97706" },
  recommended: { bg: "#DBEAFE", text: "#2563EB" },
  not_applicable: { bg: "#F1F5F9", text: "#64748B" },
};

// Function to generate and download PDF
export async function generatePDF(result: ComplianceResult): Promise<void> {
  try {
    const { Document, Page, Text, View, StyleSheet, pdf } =
      await getPdfModule();

    // PDF Styles
    const styles = StyleSheet.create({
      page: {
        padding: 40,
        backgroundColor: "#ffffff",
        fontFamily: "Helvetica",
      },
      header: {
        marginBottom: 30,
        borderBottom: "2px solid #3B82F6",
        paddingBottom: 20,
      },
      logo: {
        fontSize: 24,
        fontWeight: "bold",
        color: "#0F172A",
        marginBottom: 4,
      },
      tagline: {
        fontSize: 10,
        color: "#64748B",
      },
      date: {
        fontSize: 10,
        color: "#64748B",
        marginTop: 8,
      },
      title: {
        fontSize: 20,
        fontWeight: "bold",
        color: "#0F172A",
        marginBottom: 20,
      },
      section: {
        marginBottom: 24,
      },
      sectionTitle: {
        fontSize: 14,
        fontWeight: "bold",
        color: "#0F172A",
        marginBottom: 12,
        paddingBottom: 6,
        borderBottom: "1px solid #E2E8F0",
      },
      profileGrid: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 12,
      },
      profileItem: {
        width: "48%",
        backgroundColor: "#F8FAFC",
        padding: 12,
        borderRadius: 4,
        marginBottom: 8,
      },
      profileLabel: {
        fontSize: 9,
        color: "#64748B",
        marginBottom: 4,
        textTransform: "uppercase" as const,
      },
      profileValue: {
        fontSize: 11,
        color: "#0F172A",
        fontWeight: "bold",
      },
      statsRow: {
        flexDirection: "row" as const,
        justifyContent: "space-between" as const,
        backgroundColor: "#F8FAFC",
        padding: 16,
        borderRadius: 4,
        marginBottom: 16,
      },
      statItem: {
        alignItems: "center" as const,
      },
      statValue: {
        fontSize: 18,
        fontWeight: "bold",
        color: "#3B82F6",
      },
      statLabel: {
        fontSize: 9,
        color: "#64748B",
        marginTop: 4,
      },
      moduleGrid: {
        flexDirection: "row" as const,
        flexWrap: "wrap" as const,
        gap: 8,
      },
      moduleItem: {
        width: "48%",
        padding: 10,
        borderRadius: 4,
        marginBottom: 8,
        border: "1px solid #E2E8F0",
      },
      moduleName: {
        fontSize: 10,
        fontWeight: "bold",
        color: "#0F172A",
        marginBottom: 4,
      },
      moduleStatus: {
        fontSize: 8,
        padding: "2px 6px",
        borderRadius: 2,
        marginBottom: 4,
      },
      moduleArticles: {
        fontSize: 8,
        color: "#64748B",
      },
      checklistItem: {
        flexDirection: "row" as const,
        marginBottom: 8,
        paddingBottom: 8,
        borderBottom: "1px solid #F1F5F9",
      },
      checklistNumber: {
        width: 20,
        fontSize: 10,
        color: "#3B82F6",
        fontWeight: "bold",
      },
      checklistContent: {
        flex: 1,
      },
      checklistText: {
        fontSize: 10,
        color: "#0F172A",
        marginBottom: 2,
      },
      checklistMeta: {
        fontSize: 8,
        color: "#64748B",
      },
      dateRow: {
        flexDirection: "row" as const,
        marginBottom: 8,
        paddingLeft: 12,
      },
      dateValue: {
        width: 100,
        fontSize: 10,
        fontWeight: "bold",
        color: "#0F172A",
      },
      dateDescription: {
        flex: 1,
        fontSize: 10,
        color: "#64748B",
      },
      disclaimer: {
        marginTop: 30,
        padding: 12,
        backgroundColor: "#FEF3C7",
        borderRadius: 4,
      },
      disclaimerText: {
        fontSize: 8,
        color: "#92400E",
        lineHeight: 1.5,
      },
      footer: {
        position: "absolute" as const,
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: "center" as const,
      },
      footerText: {
        fontSize: 8,
        color: "#94A3B8",
      },
    });

    const today = new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Build the PDF document using createElement
    const doc = createElement(
      Document,
      null,
      // Page 1: Profile and Stats
      createElement(
        Page,
        { size: "A4", style: styles.page },
        // Header
        createElement(
          View,
          { style: styles.header },
          createElement(Text, { style: styles.logo }, "Caelex"),
          createElement(
            Text,
            { style: styles.tagline },
            "Space Compliance, Simplified",
          ),
          createElement(
            Text,
            { style: styles.date },
            `Assessment Date: ${today}`,
          ),
        ),

        // Title
        createElement(
          Text,
          { style: styles.title },
          "EU Space Act Compliance Report",
        ),

        // Profile Section
        createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.sectionTitle },
            "Compliance Profile",
          ),
          createElement(
            View,
            { style: styles.profileGrid },
            ...[
              { label: "Operator Type", value: result.operatorTypeLabel },
              { label: "Regulatory Regime", value: result.regimeLabel },
              { label: "Entity Size", value: result.entitySizeLabel },
              {
                label: "Constellation",
                value: result.constellationTierLabel || "N/A",
              },
              { label: "Primary Orbit", value: result.orbitLabel },
              {
                label: "EU Market Services",
                value: result.offersEUServices ? "Yes" : "No",
              },
            ].map((item, i) =>
              createElement(
                View,
                { key: `profile-${i}`, style: styles.profileItem },
                createElement(Text, { style: styles.profileLabel }, item.label),
                createElement(Text, { style: styles.profileValue }, item.value),
              ),
            ),
          ),
        ),

        // Stats
        createElement(
          View,
          { style: styles.statsRow },
          createElement(
            View,
            { style: styles.statItem },
            createElement(
              Text,
              { style: styles.statValue },
              String(result.applicableCount),
            ),
            createElement(
              Text,
              { style: styles.statLabel },
              "Applicable Articles",
            ),
          ),
          createElement(
            View,
            { style: styles.statItem },
            createElement(
              Text,
              { style: styles.statValue },
              `${result.applicablePercentage}%`,
            ),
            createElement(
              Text,
              { style: styles.statLabel },
              "of Total Regulation",
            ),
          ),
          createElement(
            View,
            { style: styles.statItem },
            createElement(
              Text,
              { style: styles.statValue },
              String(result.checklist.length),
            ),
            createElement(Text, { style: styles.statLabel }, "Action Items"),
          ),
        ),

        // Authorization Info
        createElement(
          View,
          { style: styles.section },
          createElement(
            Text,
            { style: styles.sectionTitle },
            "Authorization Information",
          ),
          createElement(
            View,
            { style: styles.profileGrid },
            createElement(
              View,
              { style: styles.profileItem },
              createElement(
                Text,
                { style: styles.profileLabel },
                "Authorization Path",
              ),
              createElement(
                Text,
                { style: styles.profileValue },
                result.authorizationPath,
              ),
            ),
            createElement(
              View,
              { style: styles.profileItem },
              createElement(
                Text,
                { style: styles.profileLabel },
                "Estimated Cost",
              ),
              createElement(
                Text,
                { style: styles.profileValue },
                result.estimatedAuthorizationCost,
              ),
            ),
          ),
        ),

        // Key Dates
        createElement(
          View,
          { style: styles.section },
          createElement(Text, { style: styles.sectionTitle }, "Key Dates"),
          ...(result.keyDates || []).map((date: KeyDate, i: number) =>
            createElement(
              View,
              { key: `date-${i}`, style: styles.dateRow },
              createElement(Text, { style: styles.dateValue }, date.date),
              createElement(
                Text,
                { style: styles.dateDescription },
                date.description,
              ),
            ),
          ),
        ),

        // Footer
        createElement(
          View,
          { style: styles.footer },
          createElement(
            Text,
            { style: styles.footerText },
            "Generated by Caelex | caelex.eu",
          ),
        ),
      ),

      // Page 2: Modules
      createElement(
        Page,
        { size: "A4", style: styles.page },
        createElement(Text, { style: styles.title }, "Compliance Modules"),
        createElement(
          View,
          { style: styles.moduleGrid },
          ...(result.moduleStatuses || []).map(
            (mod: ModuleStatus, i: number) => {
              const colors =
                statusColors[mod.status] || statusColors.not_applicable;
              return createElement(
                View,
                { key: `mod-${i}`, style: styles.moduleItem },
                createElement(Text, { style: styles.moduleName }, mod.name),
                createElement(
                  Text,
                  {
                    style: {
                      ...styles.moduleStatus,
                      backgroundColor: colors.bg,
                      color: colors.text,
                    },
                  },
                  mod.status.replace("_", " ").toUpperCase(),
                ),
                createElement(
                  Text,
                  { style: styles.moduleArticles },
                  `${mod.articleCount} relevant articles`,
                ),
                createElement(
                  Text,
                  {
                    style: {
                      fontSize: 8,
                      color: "#64748B",
                      marginTop: 4,
                    },
                  },
                  mod.summary || "",
                ),
              );
            },
          ),
        ),
        createElement(
          View,
          { style: styles.footer },
          createElement(
            Text,
            { style: styles.footerText },
            "Generated by Caelex | caelex.eu",
          ),
        ),
      ),

      // Page 3: Checklist
      createElement(
        Page,
        { size: "A4", style: styles.page },
        createElement(Text, { style: styles.title }, "Compliance Checklist"),
        ...(result.checklist || [])
          .slice(0, 15)
          .map((item: ChecklistItem, i: number) =>
            createElement(
              View,
              { key: `check-${i}`, style: styles.checklistItem },
              createElement(
                Text,
                { style: styles.checklistNumber },
                `${i + 1}.`,
              ),
              createElement(
                View,
                { style: styles.checklistContent },
                createElement(
                  Text,
                  { style: styles.checklistText },
                  item.requirement || "",
                ),
                createElement(
                  Text,
                  { style: styles.checklistMeta },
                  `Art. ${item.articles || "N/A"} | ${(item.module || "").replace(/_/g, " ")}`,
                ),
              ),
            ),
          ),

        // Disclaimer
        createElement(
          View,
          { style: styles.disclaimer },
          createElement(
            Text,
            { style: styles.disclaimerText },
            "DISCLAIMER: This assessment is based on the EU Space Act proposal (COM(2025) 335). The regulation is subject to amendments during the legislative process. This does not constitute legal advice. For specific compliance questions, consult a qualified space law professional.",
          ),
        ),

        createElement(
          View,
          { style: styles.footer },
          createElement(
            Text,
            { style: styles.footerText },
            "Generated by Caelex | caelex.eu",
          ),
        ),
      ),
    );

    // Generate the PDF blob
    const blob = await pdf(doc as Parameters<typeof pdf>[0]).toBlob();

    // Create download link and trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `caelex-eu-space-act-assessment-${new Date().toISOString().split("T")[0]}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error("PDF generation error:", error);
    throw new Error(
      `PDF generation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
