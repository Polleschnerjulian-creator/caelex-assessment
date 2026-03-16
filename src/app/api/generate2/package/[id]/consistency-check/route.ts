/**
 * POST /api/generate2/package/[id]/consistency-check
 * Runs cross-document consistency checks on all documents in a package.
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
    const { id: packageId } = await params;

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

    // Get all completed documents in the package
    const docs = await prisma.nCADocument.findMany({
      where: {
        packageId,
        userId,
        organizationId: membership.organizationId,
        status: { in: ["COMPLETED", "EXPORTED"] },
      },
      select: { id: true, content: true, documentType: true, title: true },
    });

    if (docs.length === 0) {
      return NextResponse.json(
        { error: "No documents found" },
        { status: 404 },
      );
    }

    const startTime = Date.now();
    const allFindings = [];

    // Run checks on each document
    for (const doc of docs) {
      const sections = (doc.content || []) as unknown as ParsedSection[];
      const findings = runDeterministicChecks(sections, doc.documentType);
      allFindings.push(...findings);
    }

    const durationMs = Date.now() - startTime;

    const check = await prisma.nCAConsistencyCheck.create({
      data: {
        packageId,
        userId,
        organizationId: membership.organizationId,
        findings: JSON.parse(JSON.stringify(allFindings)),
        findingCount: allFindings.length,
        errorCount: allFindings.filter((f) => f.severity === "error").length,
        warningCount: allFindings.filter((f) => f.severity === "warning")
          .length,
        infoCount: allFindings.filter((f) => f.severity === "info").length,
        durationMs,
      },
    });

    return NextResponse.json({ checkId: check.id, findings: allFindings });
  } catch (error) {
    logger.error("Package consistency check error", error);
    return NextResponse.json({ error: "Check failed" }, { status: 500 });
  }
}
