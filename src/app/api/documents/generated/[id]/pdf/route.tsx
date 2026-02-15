/**
 * PDF Export for Generated Documents
 *
 * POST /api/documents/generated/[id]/pdf
 *
 * Builds a ReportConfig from the generated content and renders to PDF.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { ReportSection, ReportSectionContent } from "@/lib/pdf/types";

export const maxDuration = 60;

// ─── Styles ───

const s = StyleSheet.create({
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
    fontWeight: "bold",
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
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 15,
    textTransform: "uppercase",
  },
  section: { marginBottom: 18 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
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
    fontWeight: "bold",
    color: "#2D3748",
    marginTop: 10,
    marginBottom: 6,
  },
  h3: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#4A5568",
    marginTop: 8,
    marginBottom: 5,
  },
  listItem: { flexDirection: "row", marginBottom: 3 },
  bullet: { width: 14, fontSize: 10, color: "#4A5568" },
  listNum: { width: 18, fontSize: 10, color: "#4A5568" },
  listText: { flex: 1, fontSize: 10, lineHeight: 1.4, color: "#2D3748" },
  table: { marginBottom: 12, borderWidth: 1, borderColor: "#E2E8F0" },
  thRow: {
    flexDirection: "row",
    backgroundColor: "#F7FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#CBD5E0",
  },
  trRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    flex: 1,
    padding: 6,
    fontSize: 9,
    fontWeight: "bold",
    color: "#1E3A5F",
  },
  td: { flex: 1, padding: 6, fontSize: 9, color: "#2D3748" },
  kvRow: {
    flexDirection: "row",
    marginBottom: 4,
    paddingBottom: 3,
    borderBottomWidth: 1,
    borderBottomColor: "#EDF2F7",
  },
  kvKey: { width: "35%", fontSize: 9, fontWeight: "bold", color: "#4A5568" },
  kvVal: { width: "65%", fontSize: 10, color: "#2D3748" },
  alertBox: {
    padding: 10,
    marginBottom: 10,
    borderRadius: 3,
    borderLeftWidth: 3,
  },
  alertInfo: { backgroundColor: "#EBF8FF", borderLeftColor: "#3182CE" },
  alertWarn: { backgroundColor: "#FFFAF0", borderLeftColor: "#DD6B20" },
  alertErr: { backgroundColor: "#FFF5F5", borderLeftColor: "#E53E3E" },
  alertInfoT: { fontSize: 10, color: "#2B6CB0" },
  alertWarnT: { fontSize: 10, color: "#C05621" },
  alertErrT: { fontSize: 10, color: "#C53030" },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    marginVertical: 12,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    borderTop: "1pt solid #E2E8F0",
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  footerText: { fontSize: 8, color: "#A0AEC0" },
  footerConf: { fontSize: 7, color: "#E53E3E", fontWeight: "bold" },
  pageNum: { fontSize: 9, color: "#4A5568" },
});

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

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

// ─── Content Renderer ───

function ContentBlock({ block }: { block: ReportSectionContent }) {
  if (!block || typeof block !== "object") return null;

  switch (block.type) {
    case "text":
      return <Text style={s.text}>{str(block.value)}</Text>;

    case "heading":
      return (
        <Text style={block.level === 3 ? s.h3 : s.h2}>{str(block.value)}</Text>
      );

    case "list":
      return (
        <View style={{ marginBottom: 8 }}>
          {safeArr<string>(block.items).map((item, i) => (
            <View key={i} style={s.listItem}>
              <Text style={block.ordered ? s.listNum : s.bullet}>
                {block.ordered ? `${i + 1}.` : "\u2022"}
              </Text>
              <Text style={s.listText}>{str(item)}</Text>
            </View>
          ))}
        </View>
      );

    case "table":
      return (
        <View style={s.table}>
          <View style={s.thRow}>
            {safeArr<string>(block.headers).map((h, i) => (
              <Text key={i} style={s.th}>
                {str(h)}
              </Text>
            ))}
          </View>
          {safeArr<string[]>(block.rows).map((row, ri) => (
            <View key={ri} style={s.trRow}>
              {safeArr<string>(row).map((cell, ci) => (
                <Text key={ci} style={s.td}>
                  {str(cell)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );

    case "keyValue":
      return (
        <View style={{ marginBottom: 8 }}>
          {safeArr<{ key: unknown; value: unknown }>(block.items).map(
            (item, i) => (
              <View key={i} style={s.kvRow}>
                <Text style={s.kvKey}>{str(item?.key)}</Text>
                <Text style={s.kvVal}>{str(item?.value)}</Text>
              </View>
            ),
          )}
        </View>
      );

    case "alert": {
      const sev = block.severity;
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
        <View style={[s.alertBox, boxStyle]}>
          <Text style={txtStyle}>{str(block.message)}</Text>
        </View>
      );
    }

    case "divider":
      return <View style={s.divider} />;

    case "spacer":
      return <View style={{ marginBottom: block.height || 16 }} />;

    default:
      return null;
  }
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
      <Page size="A4" style={s.page} wrap>
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
          <View key={si} style={s.section} wrap={false}>
            <Text style={s.sectionTitle}>{str(section.title)}</Text>
            <View style={s.sectionBody}>
              {safeArr<ReportSectionContent>(section.content).map(
                (block, bi) => (
                  <ContentBlock key={bi} block={block} />
                ),
              )}
            </View>
          </View>
        ))}

        {/* Footer */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            Generated by Caelex (caelex.eu). Not legal advice.
          </Text>
          <Text style={s.footerConf}>CONFIDENTIAL</Text>
          <Text
            style={s.pageNum}
            render={({ pageNumber, totalPages }) =>
              `Page ${pageNumber} of ${totalPages}`
            }
          />
        </View>
      </Page>
    </Document>
  );
}

// ─── Sanitize sections from DB ───

function sanitizeSections(raw: unknown): ReportSection[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (s): s is Record<string, unknown> => s != null && typeof s === "object",
    )
    .map((sec) => ({
      title: str(sec.title),
      content: safeArr<Record<string, unknown>>(sec.content)
        .filter(
          (c) =>
            c != null && typeof c === "object" && typeof c.type === "string",
        )
        .map((c) => c as unknown as ReportSectionContent),
    }));
}

// ─── Route Handler ───

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const doc = await prisma.generatedDocument.findFirst({
      where: { id, userId: session.user.id, status: "COMPLETED" },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found or not yet completed" },
        { status: 404 },
      );
    }

    const rawSections =
      doc.isEdited && doc.editedContent ? doc.editedContent : doc.content;

    const sections = sanitizeSections(rawSections);

    if (sections.length === 0) {
      return NextResponse.json(
        { error: "No content available for PDF generation" },
        { status: 400 },
      );
    }

    const subtitle = `Generated by ASTRA AI — ${new Date().toLocaleDateString("en-GB")}`;

    // Render PDF using JSX directly (matching pattern of working routes)
    const pdfBuffer = await renderToBuffer(
      <GeneratedDocumentPDF
        title={doc.title}
        subtitle={subtitle}
        sections={sections}
      />,
    );

    // Update document record
    await prisma.generatedDocument.update({
      where: { id },
      data: {
        pdfGenerated: true,
        pdfGeneratedAt: new Date(),
      },
    });

    const filename = doc.title.replace(/[^a-zA-Z0-9-_ ]/g, "");

    // Return PDF matching pattern of working routes
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}.pdf"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    const message =
      error instanceof Error ? error.message : "PDF generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
