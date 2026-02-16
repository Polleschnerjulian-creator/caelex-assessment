/**
 * Document Section Generation API
 *
 * POST /api/documents/generate/section
 *
 * Generates a single section of a chunked document.
 * Each call is ~15-20 seconds, well within Vercel's 60s limit.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDocumentSection } from "@/lib/astra/document-generator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { documentId, sectionIndex, sectionTitle, sectionNumber } = body as {
      documentId: string;
      sectionIndex: number;
      sectionTitle: string;
      sectionNumber: number;
    };

    if (!documentId || sectionIndex === undefined || !sectionTitle) {
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

    if (doc.status !== "GENERATING") {
      return NextResponse.json(
        { error: "Document is not in generating state" },
        { status: 400 },
      );
    }

    const result = await generateDocumentSection(
      documentId,
      sectionIndex,
      sectionTitle,
      sectionNumber,
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error("Section generation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Section generation failed",
      },
      { status: 500 },
    );
  }
}
