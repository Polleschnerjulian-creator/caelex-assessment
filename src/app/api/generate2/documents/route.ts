/**
 * Generate 2.0 — Documents API
 *
 * POST /api/generate2/documents — Initialize document generation
 * GET  /api/generate2/documents — List user's NCA documents
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { initGeneration } from "@/lib/generate";
import { ALL_NCA_DOC_TYPES } from "@/lib/generate/types";
import type { NCADocumentType } from "@/lib/generate/types";
import { logger } from "@/lib/logger";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: {
        organization: { select: { id: true, name: true, isActive: true } },
      },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    // Rate limit
    const rateLimitResult = await checkRateLimit(
      "document_generation",
      getIdentifier(request, userId),
    );
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await request.json();
    const {
      documentType,
      language = "en",
      packageId,
    } = body as {
      documentType: string;
      language?: string;
      packageId?: string;
    };

    if (
      !documentType ||
      !ALL_NCA_DOC_TYPES.includes(documentType as NCADocumentType)
    ) {
      return NextResponse.json(
        { error: "Invalid documentType" },
        { status: 400 },
      );
    }

    if (!["en", "de", "fr", "es"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    const result = await initGeneration(
      userId,
      membership.organization.id,
      documentType as NCADocumentType,
      language,
      packageId,
    );

    return NextResponse.json(result);
  } catch (error) {
    logger.error("Generate2 init error", error);
    return NextResponse.json(
      {
        error: "Initialization failed",
      },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const documents = await prisma.nCADocument.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        documentType: true,
        title: true,
        status: true,
        language: true,
        readinessScore: true,
        actionRequiredCount: true,
        evidencePlaceholderCount: true,
        pdfGenerated: true,
        docxGenerated: true,
        version: true,
        generationTimeMs: true,
        createdAt: true,
        updatedAt: true,
      },
      take: 50,
    });

    return NextResponse.json({ documents });
  } catch (error) {
    logger.error("Generate2 list error", error);
    return NextResponse.json(
      { error: "Failed to fetch documents" },
      { status: 500 },
    );
  }
}
