/**
 * Client-side PDF Generator
 *
 * Uses @react-pdf/renderer's pdf().toBlob() to generate PDFs in the browser.
 * Dynamically imported from DocumentExportPanel — never loaded until user clicks download.
 */

import React from "react";
import { pdf, Document, Page, Text, View } from "@react-pdf/renderer";
import type { ReportSection } from "./types";

// ─── Styles (plain objects — StyleSheet.create has issues in browser mode) ───

const s = {
  page: {
    padding: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
    backgroundColor: "#FFFFFF",
  },
  header: {
    marginBottom: 25,
    borderBottom: "2pt solid #1E3A5F",
    paddingBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold" as const,
    color: "#1E3A5F",
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 11,
    color: "#4A5568",
    marginBottom: 6,
  },
  headerMeta: {
    fontSize: 9,
    color: "#718096",
  },
  disclaimer: {
    fontSize: 7,
    color: "#E53E3E",
    fontWeight: "bold" as const,
    textAlign: "center" as const,
    marginBottom: 15,
    textTransform: "uppercase" as const,
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold" as const,
    color: "#1E3A5F",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: "1pt solid #E2E8F0",
  },
  sectionBody: { paddingLeft: 4 },
  text: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#2D3748",
    marginBottom: 7,
  },
  h2: {
    fontSize: 12,
    fontWeight: "bold" as const,
    color: "#2D3748",
    marginTop: 10,
    marginBottom: 6,
  },
  h3: {
    fontSize: 11,
    fontWeight: "bold" as const,
    color: "#4A5568",
    marginTop: 8,
    marginBottom: 5,
  },
  listItem: { flexDirection: "row" as const, marginBottom: 3 },
  bullet: { width: 14, fontSize: 10, color: "#4A5568" },
  listNum: { width: 18, fontSize: 10, color: "#4A5568" },
  listText: { flex: 1, fontSize: 10, lineHeight: 1.4, color: "#2D3748" },
  table: { marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  thRow: {
    flexDirection: "row" as const,
    backgroundColor: "#F7FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E0",
  },
  trRow: {
    flexDirection: "row" as const,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    fontWeight: "bold" as const,
    color: "#1E3A5F",
  },
  td: { flex: 1, padding: 6, fontSize: 9, color: "#2D3748" },
  kvRow: {
    flexDirection: "row" as const,
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  kvKey: {
    width: "35%",
    fontSize: 9,
    fontWeight: "bold" as const,
    color: "#4A5568",
  },
  kvVal: { width: "65%", fontSize: 10, color: "#2D3748" },
  alertInfo: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 3,
    borderLeftWidth: 3,
    backgroundColor: "#EBF8FF",
    borderLeftColor: "#3182CE",
  },
  alertWarn: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 3,
    borderLeftWidth: 3,
    backgroundColor: "#FFFAF0",
    borderLeftColor: "#DD6B20",
  },
  alertErr: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 3,
    borderLeftWidth: 3,
    backgroundColor: "#FFF5F5",
    borderLeftColor: "#E53E3E",
  },
  alertInfoT: { fontSize: 10, color: "#2B6CB0" },
  alertWarnT: { fontSize: 10, color: "#C05621" },
  alertErrT: { fontSize: 10, color: "#C53030" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginVertical: 12,
  },
  footer: {
    position: "absolute" as const,
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1pt solid #E2E8F0",
    paddingTop: 8,
    flexDirection: "row" as const,
    justifyContent: "space-between" as const,
  },
  footerText: { fontSize: 8, color: "#A0AEC0" },
  footerConf: { fontSize: 7, color: "#E53E3E", fontWeight: "bold" as const },
};

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

// ─── Content Renderer (plain function, not a component) ───

function renderBlock(block: Record<string, unknown>, index: number) {
  if (!block || typeof block !== "object" || typeof block.type !== "string") {
    return null;
  }

  const type = block.type;

  if (type === "text") {
    return (
      <Text key={index} style={s.text}>
        {str(block.value)}
      </Text>
    );
  }

  if (type === "heading") {
    return (
      <Text key={index} style={block.level === 3 ? s.h3 : s.h2}>
        {str(block.value)}
      </Text>
    );
  }

  if (type === "list") {
    const items = Array.isArray(block.items) ? block.items : [];
    const ordered = block.ordered === true;
    return (
      <View key={index} style={{ marginBottom: 8 }}>
        {items.map((item: unknown, i: number) => (
          <View key={i} style={s.listItem}>
            <Text style={ordered ? s.listNum : s.bullet}>
              {ordered ? `${i + 1}.` : "\u2022"}
            </Text>
            <Text style={s.listText}>{str(item)}</Text>
          </View>
        ))}
      </View>
    );
  }

  if (type === "table") {
    const headers = Array.isArray(block.headers) ? block.headers : [];
    const rows = Array.isArray(block.rows) ? block.rows : [];
    return (
      <View key={index} style={s.table}>
        <View style={s.thRow}>
          {headers.map((h: unknown, i: number) => (
            <Text key={i} style={s.th}>
              {str(h)}
            </Text>
          ))}
        </View>
        {rows
          .filter((r: unknown) => Array.isArray(r))
          .map((row: unknown[], ri: number) => (
            <View key={ri} style={s.trRow}>
              {row.map((cell: unknown, ci: number) => (
                <Text key={ci} style={s.td}>
                  {str(cell)}
                </Text>
              ))}
            </View>
          ))}
      </View>
    );
  }

  if (type === "keyValue") {
    const items = Array.isArray(block.items) ? block.items : [];
    return (
      <View key={index} style={{ marginBottom: 8 }}>
        {items
          .filter(
            (it: unknown): it is Record<string, unknown> =>
              it != null && typeof it === "object",
          )
          .map((item: Record<string, unknown>, i: number) => (
            <View key={i} style={s.kvRow}>
              <Text style={s.kvKey}>{str(item.key)}</Text>
              <Text style={s.kvVal}>{str(item.value)}</Text>
            </View>
          ))}
      </View>
    );
  }

  if (type === "alert") {
    const sev = String(block.severity || "info");
    const boxStyle =
      sev === "warning"
        ? s.alertWarn
        : sev === "error"
          ? s.alertErr
          : s.alertInfo;
    const txtStyle =
      sev === "warning"
        ? s.alertWarnT
        : sev === "error"
          ? s.alertErrT
          : s.alertInfoT;
    return (
      <View key={index} style={boxStyle}>
        <Text style={txtStyle}>{str(block.message)}</Text>
      </View>
    );
  }

  if (type === "divider") {
    return <View key={index} style={s.divider} />;
  }

  if (type === "spacer") {
    const height = typeof block.height === "number" ? block.height : 16;
    return <View key={index} style={{ marginBottom: height }} />;
  }

  return null;
}

// ─── PDF Document ───

function GeneratedDocumentPDF({
  title,
  subtitle,
  sections,
}: {
  title: string;
  subtitle: string;
  sections: ReportSection[];
}) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.headerTitle}>{title}</Text>
          <Text style={s.headerSubtitle}>{subtitle}</Text>
          <Text style={s.headerMeta}>
            {`Report Date: ${new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" })}`}
          </Text>
        </View>

        <Text style={s.disclaimer}>
          For informational purposes only — not legal advice
        </Text>

        {/* Sections */}
        {sections.map((section, si) => (
          <View key={si} style={s.section}>
            <Text style={s.sectionTitle}>{str(section.title)}</Text>
            <View style={s.sectionBody}>
              {(Array.isArray(section.content) ? section.content : []).map(
                (block: unknown, bi: number) =>
                  renderBlock(block as Record<string, unknown>, bi),
              )}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer}>
          <Text style={s.footerText}>
            Generated by Caelex (caelex.eu). Not legal advice.
          </Text>
          <Text style={s.footerConf}>CONFIDENTIAL</Text>
        </View>
      </Page>
    </Document>
  );
}

// ─── Public API ───

export async function generateDocumentPDFBlob(
  title: string,
  sections: ReportSection[],
): Promise<Blob> {
  const subtitle = `Generated by ASTRA AI — ${new Date().toLocaleDateString("en-GB")}`;
  const doc = (
    <GeneratedDocumentPDF
      title={title}
      subtitle={subtitle}
      sections={sections}
    />
  );
  return pdf(doc).toBlob();
}
