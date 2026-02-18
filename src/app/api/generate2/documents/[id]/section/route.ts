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
import { generateSection } from "@/lib/generate";

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

    if (doc.status !== "GENERATING") {
      return NextResponse.json(
        { error: "Document is not in generating state" },
        { status: 400 },
      );
    }

    const result = await generateSection(
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
