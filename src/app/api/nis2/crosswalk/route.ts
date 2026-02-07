/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * NIS2 Cross-Regulation Crosswalk API
 *
 * GET /api/nis2/crosswalk?assessmentId=xxx — Get cross-regulation analysis
 *
 * Returns the unified compliance matrix, overlap savings, and
 * overlapping requirements between NIS2 and EU Space Act.
 * This is the core differentiator of the Caelex platform.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { calculateNIS2Compliance } from "@/lib/nis2-engine.server";
import {
  buildUnifiedComplianceMatrix,
  calculateOverlapSavings,
  getOverlappingRequirements,
  getCrossRegulationSummary,
} from "@/lib/services/cross-regulation-service";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

// GET /api/nis2/crosswalk?assessmentId=xxx
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const assessmentId = request.nextUrl.searchParams.get("assessmentId");

    if (!assessmentId) {
      return NextResponse.json(
        { error: "assessmentId query parameter is required" },
        { status: 400 },
      );
    }

    // Verify ownership
    const assessment = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Reconstruct answers from assessment
    const answers: NIS2AssessmentAnswers = {
      sector: assessment.sector as NIS2AssessmentAnswers["sector"],
      spaceSubSector:
        (assessment.subSector as NIS2AssessmentAnswers["spaceSubSector"]) ||
        null,
      operatesGroundInfra: assessment.operatesGroundInfra,
      operatesSatComms: assessment.operatesSatComms,
      manufacturesSpacecraft: assessment.manufacturesSpacecraft,
      providesLaunchServices: assessment.providesLaunchServices,
      providesEOData: assessment.providesEOData,
      entitySize:
        assessment.organizationSize as NIS2AssessmentAnswers["entitySize"],
      employeeCount: assessment.employeeCount,
      annualRevenue: assessment.annualRevenue,
      memberStateCount: assessment.memberStateCount,
      isEUEstablished: true,
      hasISO27001: assessment.hasISO27001,
      hasExistingCSIRT: assessment.hasExistingCSIRT,
      hasRiskManagement: assessment.hasRiskManagement,
    };

    // Calculate compliance to get applicable requirements
    const complianceResult = await calculateNIS2Compliance(answers);

    // Build crosswalk data in parallel
    const [unifiedMatrix, overlapSavings, overlappingRequirements, summary] =
      await Promise.all([
        buildUnifiedComplianceMatrix(complianceResult.applicableRequirements),
        calculateOverlapSavings(complianceResult.applicableRequirements),
        getOverlappingRequirements(complianceResult.applicableRequirements),
        getCrossRegulationSummary(),
      ]);

    return NextResponse.json({
      assessmentId,
      entityClassification: complianceResult.entityClassification,
      unifiedMatrix,
      overlapSavings,
      overlappingRequirements,
      summary,
    });
  } catch (error) {
    console.error("Error fetching NIS2 crosswalk:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
