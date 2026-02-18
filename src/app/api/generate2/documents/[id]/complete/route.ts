/**
 * Generate 2.0 — Finalize Generation API
 *
 * POST /api/generate2/documents/[id]/complete
 *
 * Assembles all sections, counts markers, marks document as COMPLETED.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeGeneration } from "@/lib/generate";

export const maxDuration = 300;

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

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch (parseErr) {
      console.error("Finalize: failed to parse request body:", parseErr);
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const {
      sectionContents,
      totalInputTokens,
      totalOutputTokens,
      generationTimeMs,
    } = body as {
      sectionContents: string[];
      totalInputTokens: number;
      totalOutputTokens: number;
      generationTimeMs: number;
    };

    if (!sectionContents || !Array.isArray(sectionContents)) {
      return NextResponse.json(
        { error: "Missing sectionContents" },
        { status: 400 },
      );
    }

    console.log(
      `Finalize: docId=${documentId}, sections=${sectionContents.length}, ` +
        `totalChars=${sectionContents.reduce((a, s) => a + (s?.length || 0), 0)}`,
    );

    const result = await finalizeGeneration(
      documentId,
      session.user.id,
      sectionContents,
      totalInputTokens || 0,
      totalOutputTokens || 0,
      generationTimeMs || 0,
    );

    console.log(
      `Finalize: success, parsedSections=${result.content.length}, ` +
        `actions=${result.actionRequiredCount}, evidence=${result.evidencePlaceholderCount}`,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Finalize generation error:", error);
    const message =
      error instanceof Error ? error.message : "Finalization failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
