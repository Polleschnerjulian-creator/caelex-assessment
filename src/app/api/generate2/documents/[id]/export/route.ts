/**
 * Generate 2.0 — Export API
 *
 * POST /api/generate2/documents/[id]/export
 *
 * Exports document as PDF. DOCX support will be added in Phase 2.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ReportSection } from "@/lib/pdf/types";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // H-1: Rate limiting
    const rateLimitResult = await checkRateLimit(
      "generate2",
      `generate2:${userId}`,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // C-2: Organization membership check
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No Organization" }, { status: 403 });
    }

    const { id: documentId } = await params;

    const body = await request.json();
    const { format = "pdf" } = body as { format?: "pdf" | "docx" };

    // C-2: Add organizationId to where clause
    const doc = await prisma.nCADocument.findFirst({
      where: {
        id: documentId,
        userId,
        organizationId: membership.organizationId,
      },
      select: {
        id: true,
        title: true,
        content: true,
        editedContent: true,
        isEdited: true,
        status: true,
        documentType: true,
      },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    if (doc.status !== "COMPLETED" && doc.status !== "EXPORTED") {
      return NextResponse.json(
        { error: "Document is not completed" },
        { status: 400 },
      );
    }

    // L-1: Fix dead code — use `sections` variable instead of `_sections`
    const sections = (doc.isEdited && doc.editedContent
      ? doc.editedContent
      : doc.content) as unknown as ReportSection[];

    if (format === "docx") {
      return NextResponse.json(
        {
          error: "DOCX export is not yet available. Please use PDF format.",
          supportedFormats: ["pdf"],
        },
        { status: 501 },
      );
    }

    // Mark as exported
    await prisma.nCADocument.update({
      where: { id: documentId },
      data: {
        status: "EXPORTED",
        pdfGenerated: true,
        pdfGeneratedAt: new Date(),
      },
    });

    // Return the sections for client-side PDF generation
    return NextResponse.json({
      title: doc.title,
      sections,
      documentType: doc.documentType,
      exportedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Export error", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
