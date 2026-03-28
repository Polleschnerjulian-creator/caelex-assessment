/**
 * POST /api/generate2/documents/[id]/auto-fix
 * Applies auto-fixes for consistency findings.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyAutoFixes } from "@/lib/generate/auto-fix";
import { collectGenerate2Data } from "@/lib/generate/data-collector";
import type { ParsedSection } from "@/lib/generate/parse-sections";
import type { ConsistencyFinding } from "@/lib/generate/consistency-check";
import { logger } from "@/lib/logger";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const { id: documentId } = await params;

    const membership = await prisma.organizationMember.findFirst({
      where: { userId },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const doc = await prisma.nCADocument.findFirst({
      where: {
        id: documentId,
        userId,
        organizationId: membership.organizationId,
        status: { in: ["COMPLETED", "EXPORTED"] },
      },
      select: { id: true, content: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const body = await request.json();
    const { findingIds, findings } = body as {
      findingIds?: string[];
      findings: ConsistencyFinding[];
    };

    const sections = (doc.content || []) as unknown as ParsedSection[];

    // Get assessment data for canonical values
    const dataBundle = await collectGenerate2Data(
      userId,
      membership.organizationId,
    );
    const assessmentData: Record<string, unknown> = {};
    if (dataBundle.debris?.assessment) {
      Object.assign(assessmentData, dataBundle.debris.assessment);
    }
    if (dataBundle.cybersecurity?.assessment) {
      Object.assign(assessmentData, dataBundle.cybersecurity.assessment);
    }

    // Filter to requested findings
    const toFix = findingIds
      ? findings.filter((f) => findingIds.includes(f.id))
      : findings.filter((f) => f.autoFixable);

    const result = applyAutoFixes(sections, toFix, assessmentData);

    // Save updated content
    if (result.appliedFixes.length > 0) {
      await prisma.nCADocument.update({
        where: { id: documentId },
        data: {
          content: structuredClone(result.updatedSections),
          isEdited: true,
          editedContent: structuredClone(result.updatedSections),
        },
      });
    }

    return NextResponse.json({
      updatedSections: result.updatedSections,
      appliedFixes: result.appliedFixes,
    });
  } catch (error) {
    logger.error("Auto-fix error", error);
    return NextResponse.json({ error: "Auto-fix failed" }, { status: 500 });
  }
}
