/**
 * Generate 2.0 — Impact Analysis API
 *
 * POST /api/generate2/impact-analysis — Compute impact of data changes
 * Supports "what-if" queries without actually changing data.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { computeImpact } from "@/lib/generate/impact-analysis";
import type { NCADocumentType } from "@/lib/generate/types";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      include: { organization: { select: { id: true, isActive: true } } },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const rateLimitResult = await checkRateLimit(
      "generate2",
      getIdentifier(request, userId),
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429 },
      );
    }

    const body = await request.json();
    const { changes } = body as {
      changes: Array<{
        field: string;
        source: string;
        oldValue: unknown;
        newValue: unknown;
      }>;
    };

    if (!changes || !Array.isArray(changes) || changes.length === 0) {
      return NextResponse.json(
        { error: "Missing or empty changes array" },
        { status: 400 },
      );
    }

    // Get existing completed documents for this user's org
    const existingDocs = await prisma.nCADocument.findMany({
      where: {
        userId,
        organizationId: membership.organization.id,
        status: { in: ["COMPLETED", "EXPORTED"] },
      },
      select: { documentType: true },
      distinct: ["documentType"],
    });
    const existingDocTypes = new Set(
      existingDocs.map((d) => d.documentType as NCADocumentType),
    );

    const impacts = computeImpact(changes, existingDocTypes);

    return NextResponse.json({ impacts });
  } catch (error) {
    logger.error("Impact analysis error", error);
    return NextResponse.json(
      { error: "Impact analysis failed" },
      { status: 500 },
    );
  }
}
