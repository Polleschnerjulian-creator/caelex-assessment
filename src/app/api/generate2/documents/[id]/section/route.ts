/**
 * Generate 2.0 — Section Generation API
 *
 * POST /api/generate2/documents/[id]/section
 *
 * Generates a single section of a chunked NCA document.
 * Each call is ~15-20s, within Vercel's 60s limit.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSection, markGenerationFailed } from "@/lib/generate";
import { logger } from "@/lib/logger";
import { checkRateLimit } from "@/lib/ratelimit";

export const maxDuration = 300;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  let documentId: string | undefined;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // H-1: Rate limiting — scoped per document so a single doc's 11+ sections
    // don't exhaust the limit. The POST /documents endpoint gates new documents.
    const { id: docId } = await params;
    const rateLimitResult = await checkRateLimit(
      "generate2",
      `generate2_section:${userId}:${docId}`,
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    // H-2: Organization membership check
    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No Organization" }, { status: 403 });
    }

    documentId = docId;

    const body = await request.json();
    const { sectionIndex, sectionTitle, sectionNumber } = body as {
      sectionIndex: number;
      sectionTitle: string;
      sectionNumber: number;
    };

    if (sectionIndex === undefined || !sectionTitle || !sectionNumber) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Validate bounds to prevent array index manipulation
    if (
      typeof sectionIndex !== "number" ||
      !Number.isInteger(sectionIndex) ||
      sectionIndex < 0 ||
      sectionIndex > 50
    ) {
      return NextResponse.json(
        { error: "Invalid sectionIndex" },
        { status: 400 },
      );
    }

    // Verify the document belongs to this user AND org AND is in GENERATING state (atomic check)
    // H-2: Add organizationId to where clause
    const doc = await prisma.nCADocument.findFirst({
      where: {
        id: documentId,
        userId,
        organizationId: membership.organizationId,
        status: "GENERATING",
      },
      select: { id: true, content: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found or not in generating state" },
        { status: 400 },
      );
    }

    // H-3: Concurrency guard — check if section already generated (optimistic lock)
    const existingContent = doc.content as unknown as Array<{
      sectionIndex: number;
      content: string;
      raw?: string;
      title?: string;
    }> | null;
    if (existingContent && existingContent[sectionIndex]?.raw) {
      return NextResponse.json({
        content: existingContent[sectionIndex].raw,
        cached: true,
      });
    }

    const result = await generateSection(
      documentId,
      sectionIndex,
      sectionTitle,
      sectionNumber,
    );

    // Save section content incrementally for error recovery
    const existingSections = Array.isArray(doc.content) ? doc.content : [];
    const updatedSections = [...existingSections];
    updatedSections[sectionIndex] = {
      raw: result.content,
      title: sectionTitle,
    };
    await prisma.nCADocument.update({
      where: { id: documentId },
      data: { content: updatedSections },
    });

    return NextResponse.json(result);
  } catch (error) {
    const safeMessage = "Section generation failed";
    const status = (error as { status?: number }).status;

    logger.error(
      `[section/route] Section generation error (doc=${documentId}):`,
      {
        message: error instanceof Error ? error.message : safeMessage,
        status,
        error,
      },
    );

    // Mark document as FAILED for permanent errors (not transient/retryable)
    const isPermanentFailure =
      status !== 429 && status !== 529 && status !== 503;
    if (documentId && isPermanentFailure) {
      markGenerationFailed(documentId, safeMessage).catch((e) =>
        logger.error("[section/route] Failed to mark doc as FAILED", e),
      );
    }

    return NextResponse.json(
      {
        error: safeMessage,
        code: status === 429 ? "RATE_LIMITED" : "GENERATION_FAILED",
        retryable: !isPermanentFailure,
      },
      { status: 500 },
    );
  }
}
