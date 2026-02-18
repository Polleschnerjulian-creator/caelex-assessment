/**
 * Generate 2.0 — Package API
 *
 * POST /api/generate2/package — Create a full NCA submission package (16 docs)
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
import { collectGenerate2Data } from "@/lib/generate/data-collector";
import { computeAllReadiness } from "@/lib/generate/readiness";
import { ALL_NCA_DOC_TYPES } from "@/lib/generate/types";

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
    const { language = "en" } = body as { language?: string };

    // Compute readiness for overview
    const dataBundle = await collectGenerate2Data(
      userId,
      membership.organization.id,
    );
    const readiness = computeAllReadiness(dataBundle);
    const overallReadiness = Math.round(
      readiness.reduce((sum, r) => sum + r.score, 0) / readiness.length,
    );

    // Create the package
    const pkg = await prisma.nCADocPackage.create({
      data: {
        userId,
        organizationId: membership.organization.id,
        name: `NCA Submission Package — ${new Date().toISOString().split("T")[0]}`,
        status: "CREATED",
        overallReadiness,
        documentsTotal: ALL_NCA_DOC_TYPES.length,
      },
    });

    return NextResponse.json({
      packageId: pkg.id,
      overallReadiness,
      documentsTotal: ALL_NCA_DOC_TYPES.length,
      documentTypes: ALL_NCA_DOC_TYPES,
      language,
    });
  } catch (error) {
    console.error("Package creation error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Package creation failed",
      },
      { status: 500 },
    );
  }
}
