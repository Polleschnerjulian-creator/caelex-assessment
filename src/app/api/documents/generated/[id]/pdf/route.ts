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
import React from "react";
import { BaseReport } from "@/lib/pdf/templates/base-report";
import type {
  ReportConfig,
  ReportSection,
  ReportSectionContent,
} from "@/lib/pdf/types";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Sanitize sections from DB JSON to ensure valid ReportSection[] structure.
 * AI-generated content may have edge cases that crash the PDF renderer.
 */
function sanitizeSections(raw: unknown): ReportSection[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (s): s is { title: unknown; content: unknown } =>
        s != null && typeof s === "object",
    )
    .map((s) => ({
      title: typeof s.title === "string" ? s.title : "Untitled Section",
      content: sanitizeContent(s.content),
    }));
}

function sanitizeContent(raw: unknown): ReportSectionContent[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (c): c is Record<string, unknown> =>
        c != null && typeof c === "object" && typeof c.type === "string",
    )
    .map((c): ReportSectionContent | null => {
      switch (c.type) {
        case "text":
          return { type: "text", value: String(c.value ?? "") };
        case "heading":
          return {
            type: "heading",
            value: String(c.value ?? ""),
            level: ([1, 2, 3].includes(c.level as number) ? c.level : 2) as
              | 1
              | 2
              | 3,
          };
        case "list":
          return {
            type: "list",
            items: Array.isArray(c.items)
              ? c.items.map((i: unknown) => String(i ?? ""))
              : [],
            ordered: Boolean(c.ordered),
          };
        case "table":
          return {
            type: "table",
            headers: Array.isArray(c.headers)
              ? c.headers.map((h: unknown) => String(h ?? ""))
              : [],
            rows: Array.isArray(c.rows)
              ? c.rows.map((r: unknown) =>
                  Array.isArray(r)
                    ? r.map((cell: unknown) => String(cell ?? ""))
                    : [],
                )
              : [],
          };
        case "keyValue":
          return {
            type: "keyValue",
            items: Array.isArray(c.items)
              ? c.items.map((i: unknown) => ({
                  key: String((i as Record<string, unknown>)?.key ?? ""),
                  value: String((i as Record<string, unknown>)?.value ?? ""),
                }))
              : [],
          };
        case "alert":
          return {
            type: "alert",
            severity: (["info", "warning", "error"].includes(
              c.severity as string,
            )
              ? c.severity
              : "info") as "info" | "warning" | "error",
            message: String(c.message ?? ""),
          };
        case "divider":
          return { type: "divider" };
        case "spacer":
          return {
            type: "spacer",
            height: typeof c.height === "number" ? c.height : undefined,
          };
        default:
          // Unknown content type — render as text
          return {
            type: "text",
            value: String(c.value ?? c.message ?? ""),
          };
      }
    })
    .filter((c): c is ReportSectionContent => c !== null);
}

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

    // Use editedContent if available, otherwise original content
    const rawSections =
      doc.isEdited && doc.editedContent ? doc.editedContent : doc.content;

    // Sanitize sections to ensure valid structure
    const sections = sanitizeSections(rawSections);

    if (sections.length === 0) {
      return NextResponse.json(
        { error: "No content available for PDF generation" },
        { status: 400 },
      );
    }

    // Build ReportConfig
    const config: ReportConfig = {
      metadata: {
        reportId: doc.id,
        reportType: "compliance_certificate",
        title: doc.title,
        generatedAt: new Date(),
        generatedBy: session.user.name || session.user.email || "User",
      },
      header: {
        title: doc.title,
        subtitle: `Generated by ASTRA AI — ${new Date().toLocaleDateString("en-GB")}`,
        date: new Date(),
      },
      footer: {
        pageNumbers: true,
        confidentialityNotice:
          "CONFIDENTIAL — For regulatory submission purposes only",
      },
      sections,
    };

    // Render PDF
    const element = React.createElement(BaseReport, { config });
    const buffer = await renderToBuffer(
      element as unknown as Parameters<typeof renderToBuffer>[0],
    );

    // Update document record
    await prisma.generatedDocument.update({
      where: { id },
      data: {
        pdfGenerated: true,
        pdfGeneratedAt: new Date(),
      },
    });

    // Return PDF — match the pattern of working routes (NextResponse + Buffer.from)
    const filename = doc.title.replace(/[^a-zA-Z0-9-_ ]/g, "");

    return new NextResponse(Buffer.from(buffer), {
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
