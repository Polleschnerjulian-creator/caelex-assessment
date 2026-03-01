/**
 * Verification Dashboard API
 *
 * GET /api/dashboard/verification
 * Returns dual compliance score data: self-assessed vs verified evidence scores.
 * Used by the DualScoreWidget component.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve the user's organization
    const orgMember = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!orgMember) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const organizationId = orgMember.organizationId;
    const now = new Date();

    // ── Self-Assessed Score ──
    // Fetch from the existing compliance scoring service via the same approach
    // as /api/dashboard/compliance-score. We import the function directly since
    // it's a pure server function (no "server-only" guard).
    let selfAssessedScore = 0;
    try {
      const { calculateComplianceScore } =
        await import("@/lib/services/compliance-scoring-service");
      const complianceScore = await calculateComplianceScore(session.user.id);
      selfAssessedScore = complianceScore.overall;
    } catch {
      // If the scoring service fails (e.g., no assessments yet), default to 0
      selfAssessedScore = 0;
    }

    // ── Verified Evidence Score ──
    // Count requirements that have at least one ACCEPTED, non-expired evidence
    const [totalRequired, acceptedRequirements] = await Promise.all([
      prisma.regulatoryRequirement.count({
        where: { organizationId },
      }),
      prisma.regulatoryRequirement.count({
        where: {
          organizationId,
          evidenceMappings: {
            some: {
              evidence: {
                status: "ACCEPTED",
                OR: [{ validUntil: null }, { validUntil: { gte: now } }],
              },
            },
          },
        },
      }),
    ]);

    const verifiedScore =
      totalRequired > 0
        ? Math.round((acceptedRequirements / totalRequired) * 100)
        : 0;

    // ── Accepted Evidence Count ──
    const acceptedEvidence = await prisma.complianceEvidence.count({
      where: {
        organizationId,
        status: "ACCEPTED",
        OR: [{ validUntil: null }, { validUntil: { gte: now } }],
      },
    });

    // ── Last Verified Timestamp ──
    const lastEvidenceRecord = await prisma.complianceEvidence.findFirst({
      where: {
        organizationId,
        status: "ACCEPTED",
      },
      orderBy: { updatedAt: "desc" },
      select: { updatedAt: true },
    });

    return NextResponse.json(
      {
        selfAssessedScore,
        verifiedScore,
        verificationGap: Math.max(0, selfAssessedScore - verifiedScore),
        acceptedEvidence,
        totalRequired,
        lastVerified: lastEvidenceRecord?.updatedAt?.toISOString() || null,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=300, stale-while-revalidate=600",
        },
      },
    );
  } catch (error) {
    console.error("Error fetching verification data:", error);
    return NextResponse.json(
      { error: "Failed to fetch verification data" },
      { status: 500 },
    );
  }
}
