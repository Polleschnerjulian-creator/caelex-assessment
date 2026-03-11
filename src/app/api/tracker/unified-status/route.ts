export const dynamic = "force-dynamic";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET /api/tracker/unified-status — Returns compliance scores for all regulations
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Fetch all assessment data in parallel
    const [
      articleStatuses,
      debrisAssessment,
      cybersecurityAssessment,
      nis2Assessment,
      insuranceAssessment,
      environmentalAssessment,
      copuosAssessment,
      ukSpaceAssessment,
      usRegulatoryAssessment,
      exportControlAssessment,
      spectrumAssessment,
    ] = await Promise.all([
      // EU Space Act — from ArticleStatus records
      prisma.articleStatus.findMany({
        where: { userId },
        select: { status: true },
      }),
      // Debris
      prisma.debrisAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, complianceScore: true, updatedAt: true },
      }),
      // Cybersecurity
      prisma.cybersecurityAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, maturityScore: true, updatedAt: true },
      }),
      // NIS2
      prisma.nIS2Assessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, complianceScore: true, updatedAt: true },
      }),
      // Insurance
      prisma.insuranceAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, complianceScore: true, updatedAt: true },
      }),
      // Environmental
      prisma.environmentalAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, complianceScore: true, updatedAt: true },
      }),
      // COPUOS
      prisma.copuosAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, complianceScore: true, updatedAt: true },
      }),
      // UK Space
      prisma.ukSpaceAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, complianceScore: true, updatedAt: true },
      }),
      // US Regulatory
      prisma.usRegulatoryAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, overallComplianceScore: true, updatedAt: true },
      }),
      // Export Control
      prisma.exportControlAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, overallComplianceScore: true, updatedAt: true },
      }),
      // Spectrum
      prisma.spectrumAssessment.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        select: { id: true, overallComplianceScore: true, updatedAt: true },
      }),
    ]);

    // Calculate EU Space Act score from article statuses
    let euTotal = 0;
    let euCompliant = 0;
    let euInProgress = 0;
    let euUnderReview = 0;
    let euNotStarted = 0;
    for (const a of articleStatuses) {
      if (a.status === "not_applicable") continue;
      euTotal++;
      if (a.status === "compliant") euCompliant++;
      else if (a.status === "in_progress") euInProgress++;
      else if (a.status === "under_review") euUnderReview++;
      else euNotStarted++;
    }
    const euScore = euTotal > 0 ? Math.round((euCompliant / euTotal) * 100) : 0;

    // Build regulation status map
    const helper = (
      assessment: { id: string; updatedAt: Date } | null,
      score: number | null | undefined,
    ) => ({
      hasAssessment: !!assessment,
      score: score != null ? Math.round(score) : null,
      lastAssessedAt: assessment?.updatedAt?.toISOString() ?? null,
    });

    const regulations = {
      "eu-space-act": {
        hasAssessment: articleStatuses.length > 0,
        score: euScore,
        lastAssessedAt: null,
        details: {
          total: euTotal,
          compliant: euCompliant,
          inProgress: euInProgress,
          underReview: euUnderReview,
          notStarted: euNotStarted,
        },
      },
      nis2: helper(nis2Assessment, nis2Assessment?.complianceScore),
      cybersecurity: helper(
        cybersecurityAssessment,
        cybersecurityAssessment?.maturityScore,
      ),
      debris: helper(debrisAssessment, debrisAssessment?.complianceScore),
      environmental: helper(
        environmentalAssessment,
        environmentalAssessment?.complianceScore,
      ),
      insurance: helper(
        insuranceAssessment,
        insuranceAssessment?.complianceScore,
      ),
      copuos: helper(copuosAssessment, copuosAssessment?.complianceScore),
      "export-control": helper(
        exportControlAssessment,
        exportControlAssessment?.overallComplianceScore,
      ),
      spectrum: helper(
        spectrumAssessment,
        spectrumAssessment?.overallComplianceScore,
      ),
      "uk-space": helper(ukSpaceAssessment, ukSpaceAssessment?.complianceScore),
      "us-regulatory": helper(
        usRegulatoryAssessment,
        usRegulatoryAssessment?.overallComplianceScore,
      ),
    };

    // Calculate overall score (weighted average of assessed regulations)
    const assessed = Object.values(regulations).filter(
      (r) => r.hasAssessment && r.score != null,
    );
    const overallScore =
      assessed.length > 0
        ? Math.round(
            assessed.reduce((sum, r) => sum + (r.score ?? 0), 0) /
              assessed.length,
          )
        : 0;

    return NextResponse.json({
      regulations,
      overallScore,
      assessedCount: assessed.length,
      totalRegulations: Object.keys(regulations).length,
    });
  } catch (error) {
    console.error("Unified status error:", error);
    return NextResponse.json(
      { error: "Failed to fetch unified status" },
      { status: 500 },
    );
  }
}
