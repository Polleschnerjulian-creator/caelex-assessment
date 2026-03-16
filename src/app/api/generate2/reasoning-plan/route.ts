/**
 * Generate 2.0 — Reasoning Plan API
 *
 * POST /api/generate2/reasoning-plan — Compute and store a reasoning plan
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { collectGenerate2Data } from "@/lib/generate/data-collector";
import { computeReasoningPlan } from "@/lib/generate/reasoning-plan";
import { ALL_NCA_DOC_TYPES } from "@/lib/generate/types";
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
    const { documentType, targetNCA } = body as {
      documentType: string;
      targetNCA?: string;
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

    const organizationId = membership.organization.id;

    // Collect assessment data
    const dataBundle = await collectGenerate2Data(userId, organizationId);

    // Get existing completed document types for cross-reference awareness
    const existingDocs = await prisma.nCADocument.findMany({
      where: {
        userId,
        organizationId,
        status: { in: ["COMPLETED", "EXPORTED"] },
      },
      select: { documentType: true },
      distinct: ["documentType"],
    });
    const existingDocTypes = existingDocs.map(
      (d) => d.documentType as NCADocumentType,
    );

    // Compute plan
    const plan = computeReasoningPlan(
      documentType as NCADocumentType,
      dataBundle,
      existingDocTypes,
    );

    // Store plan
    const stored = await prisma.nCAReasoningPlan.create({
      data: {
        userId,
        organizationId,
        documentType: documentType as NCADocumentType,
        targetNCA: targetNCA || null,
        overallStrategy: plan.overallStrategy,
        estimatedComplianceLevel: plan.estimatedComplianceLevel,
        sections: JSON.parse(JSON.stringify(plan.sections)),
        crossReferences: JSON.parse(JSON.stringify(plan.crossReferences)),
        userModified: false,
      },
    });

    return NextResponse.json({ plan: { ...plan, id: stored.id } });
  } catch (error) {
    logger.error("Reasoning plan computation error", error);
    return NextResponse.json(
      { error: "Plan computation failed" },
      { status: 500 },
    );
  }
}
