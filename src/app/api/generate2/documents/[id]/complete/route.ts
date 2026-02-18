/**
 * Generate 2.0 — Finalize Generation API
 *
 * POST /api/generate2/documents/[id]/complete
 *
 * Receives pre-parsed sections from the client and saves to DB.
 * All heavy processing (markdown parsing, marker counting) is done client-side.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id: documentId } = await params;

    // Verify the document belongs to this user
    const doc = await prisma.nCADocument.findFirst({
      where: { id: documentId, userId: session.user.id },
      select: { id: true, status: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const {
      parsedSections,
      rawContent,
      actionRequiredCount,
      evidencePlaceholderCount,
      totalInputTokens,
      totalOutputTokens,
      generationTimeMs,
    } = body as {
      parsedSections: unknown[];
      rawContent: string;
      actionRequiredCount: number;
      evidencePlaceholderCount: number;
      totalInputTokens: number;
      totalOutputTokens: number;
      generationTimeMs: number;
    };

    if (!parsedSections || !Array.isArray(parsedSections)) {
      return NextResponse.json(
        { error: "Missing parsedSections" },
        { status: 400 },
      );
    }

    await prisma.nCADocument.update({
      where: { id: documentId },
      data: {
        status: "COMPLETED",
        content: JSON.parse(JSON.stringify(parsedSections)),
        rawContent: rawContent || "",
        modelUsed: "claude-sonnet-4-6",
        inputTokens: totalInputTokens || 0,
        outputTokens: totalOutputTokens || 0,
        generationTimeMs: generationTimeMs || 0,
        actionRequiredCount: actionRequiredCount || 0,
        evidencePlaceholderCount: evidencePlaceholderCount || 0,
      },
    });

    // Non-blocking audit log
    logAuditEvent({
      action: "DOCUMENT_GENERATED",
      userId: session.user.id,
      entityType: "NCADocument",
      entityId: documentId,
      metadata: {
        inputTokens: totalInputTokens || 0,
        outputTokens: totalOutputTokens || 0,
        generationTimeMs: generationTimeMs || 0,
        sectionCount: parsedSections.length,
        actionRequiredCount: actionRequiredCount || 0,
        evidencePlaceholderCount: evidencePlaceholderCount || 0,
        phase: "complete",
      },
    }).catch(() => {});

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Finalize generation error:", error);
    const message =
      error instanceof Error ? error.message : "Finalization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
