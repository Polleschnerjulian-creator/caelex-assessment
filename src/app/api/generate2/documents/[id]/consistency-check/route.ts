/**
 * POST /api/generate2/documents/[id]/consistency-check
 * Runs deterministic consistency checks on a completed document.
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getIdentifier } from "@/lib/ratelimit";
import { runDeterministicChecks } from "@/lib/generate/consistency-check";
import type { ParsedSection } from "@/lib/generate/parse-sections";
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
      select: { id: true, content: true, documentType: true },
    });

    if (!doc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 },
      );
    }

    const startTime = Date.now();
    const sections = (doc.content || []) as unknown as ParsedSection[];
    const findings = runDeterministicChecks(sections, doc.documentType);
    const durationMs = Date.now() - startTime;

    // Store check result
    const check = await prisma.nCAConsistencyCheck.create({
      data: {
        documentId,
        userId,
        organizationId: membership.organizationId,
        findings: structuredClone(findings),
        findingCount: findings.length,
        errorCount: findings.filter((f) => f.severity === "error").length,
        warningCount: findings.filter((f) => f.severity === "warning").length,
        infoCount: findings.filter((f) => f.severity === "info").length,
        durationMs,
      },
    });

    return NextResponse.json({ checkId: check.id, findings });
  } catch (error) {
    logger.error("Consistency check error", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
