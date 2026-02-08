/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * NIS2 Assessment Collection API
 *
 * GET  /api/nis2 — List all NIS2 assessments for the authenticated user
 * POST /api/nis2 — Create a new NIS2 assessment
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateNIS2Compliance,
  classifyNIS2Entity,
} from "@/lib/nis2-engine.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

// GET /api/nis2 - Get all NIS2 assessments for user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.nIS2Assessment.findMany({
      where: { userId },
      include: {
        requirements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching NIS2 assessments:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/nis2 - Create new NIS2 assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const {
      assessmentName,
      sector,
      subSector,
      entitySize,
      employeeCount,
      annualRevenue,
      memberStateCount = 1,
      isEUEstablished = true,
      operatesGroundInfra = false,
      operatesSatComms = false,
      manufacturesSpacecraft = false,
      providesLaunchServices = false,
      providesEOData = false,
      hasISO27001 = false,
      hasExistingCSIRT = false,
      hasRiskManagement = false,
    } = body;

    // Validate required fields
    if (!entitySize) {
      return NextResponse.json(
        {
          error: "Missing required fields: entitySize",
        },
        { status: 400 },
      );
    }

    // Build answers for classification — Caelex is space-only
    const answers: NIS2AssessmentAnswers = {
      sector: "space",
      spaceSubSector: subSector || null,
      operatesGroundInfra,
      operatesSatComms,
      manufacturesSpacecraft,
      providesLaunchServices,
      providesEOData,
      entitySize,
      employeeCount: employeeCount || null,
      annualRevenue: annualRevenue || null,
      memberStateCount,
      isEUEstablished,
      hasISO27001,
      hasExistingCSIRT,
      hasRiskManagement,
    };

    // Classify entity
    const classification = classifyNIS2Entity(answers);

    // Calculate full compliance result for overlap counts
    const complianceResult = await calculateNIS2Compliance(answers);

    // Create assessment with requirement statuses in transaction
    const assessment = await prisma.$transaction(async (tx) => {
      const newAssessment = await tx.nIS2Assessment.create({
        data: {
          userId,
          assessmentName,
          entityClassification: classification.classification,
          classificationReason: classification.reason,
          sector: "space",
          subSector: subSector || null,
          organizationSize: entitySize,
          employeeCount: employeeCount || null,
          annualRevenue: annualRevenue || null,
          memberStateCount,
          operatesGroundInfra,
          operatesSatComms,
          manufacturesSpacecraft,
          providesLaunchServices,
          providesEOData,
          hasISO27001,
          hasExistingCSIRT,
          hasRiskManagement,
          complianceScore: 0,
          maturityScore: 0,
          riskLevel:
            classification.classification === "essential"
              ? "high"
              : classification.classification === "important"
                ? "medium"
                : "low",
          euSpaceActOverlapCount: complianceResult.euSpaceActOverlap.count,
        },
      });

      // Create requirement status entries for applicable requirements
      if (complianceResult.applicableRequirements.length > 0) {
        await Promise.all(
          complianceResult.applicableRequirements.map((req) =>
            tx.nIS2RequirementStatus.create({
              data: {
                assessmentId: newAssessment.id,
                requirementId: req.id,
                status: "not_assessed",
              },
            }),
          ),
        );
      }

      return newAssessment;
    });

    // Fetch with requirements
    const assessmentWithRequirements = await prisma.nIS2Assessment.findUnique({
      where: { id: assessment.id },
      include: { requirements: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nis2_assessment_created",
      entityType: "nis2_assessment",
      entityId: assessment.id,
      newValue: {
        entityClassification: classification.classification,
        sector: "space",
        subSector,
        entitySize,
        applicableRequirements: complianceResult.applicableRequirements.length,
      },
      description: `Created NIS2 assessment (${classification.classification} entity)`,
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: assessmentWithRequirements,
      entityClassification: classification.classification,
      classificationReason: classification.reason,
      applicableRequirements: complianceResult.applicableRequirements.map(
        (r) => r.id,
      ),
    });
  } catch (error) {
    console.error("Error creating NIS2 assessment:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
