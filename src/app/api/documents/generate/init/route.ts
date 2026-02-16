/**
 * Document Generation Init API
 *
 * POST /api/documents/generate/init
 *
 * Initializes a chunked document generation:
 * collects assessment data, stores prompt context, returns section list.
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
import { initChunkedGeneration } from "@/lib/astra/document-generator";
import type { DocumentGenerationType } from "@/lib/astra/document-generator/types";

const VALID_TYPES: DocumentGenerationType[] = [
  "DEBRIS_MITIGATION_PLAN",
  "CYBERSECURITY_FRAMEWORK",
  "ENVIRONMENTAL_FOOTPRINT",
  "INSURANCE_COMPLIANCE",
  "NIS2_ASSESSMENT",
  "AUTHORIZATION_APPLICATION",
];

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
        organization: {
          select: { id: true, name: true, isActive: true },
        },
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
      assessmentId,
      language = "en",
    } = body as {
      documentType: string;
      assessmentId?: string;
      language?: string;
    };

    if (
      !documentType ||
      !VALID_TYPES.includes(documentType as DocumentGenerationType)
    ) {
      return NextResponse.json(
        { error: `Invalid documentType` },
        { status: 400 },
      );
    }

    if (!["en", "de", "fr", "es"].includes(language)) {
      return NextResponse.json({ error: "Invalid language" }, { status: 400 });
    }

    const result = await initChunkedGeneration({
      userId,
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      documentType: documentType as DocumentGenerationType,
      assessmentId,
      language,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Document generation init error:", error);

    if (
      error instanceof Error &&
      error.message.includes("No") &&
      error.message.includes("found")
    ) {
      return NextResponse.json(
        {
          error:
            "No assessment data found. Please complete the relevant assessment first.",
        },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Initialization failed",
      },
      { status: 500 },
    );
  }
}
