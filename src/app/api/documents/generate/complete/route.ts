/**
 * Document Generation Complete API
 *
 * POST /api/documents/generate/complete
 *
 * Finalizes a chunked document generation.
 * Assembles sections, parses to structured format, marks as COMPLETED.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { finalizeChunkedGeneration } from "@/lib/astra/document-generator";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      documentId,
      sectionContents,
      totalInputTokens,
      totalOutputTokens,
      generationTimeMs,
    } = body as {
      documentId: string;
      sectionContents: string[];
      totalInputTokens: number;
      totalOutputTokens: number;
      generationTimeMs: number;
    };

    if (!documentId || !sectionContents?.length) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Verify the document belongs to this user
    const doc = await prisma.generatedDocument.findFirst({
      where: { id: documentId, userId: session.user.id },
      select: { id: true, status: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    await finalizeChunkedGeneration(
      documentId,
      session.user.id,
      sectionContents,
      totalInputTokens || 0,
      totalOutputTokens || 0,
      generationTimeMs || 0,
    );

    // Fetch the completed document
    const completed = await prisma.generatedDocument.findUniqueOrThrow({
      where: { id: documentId },
    });

    return NextResponse.json({
      id: completed.id,
      status: completed.status,
      content: completed.content,
    });
  } catch (error) {
    console.error("Document completion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Document completion failed",
      },
      { status: 500 },
    );
  }
}
