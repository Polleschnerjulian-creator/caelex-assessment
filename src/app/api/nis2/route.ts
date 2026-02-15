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
import { decrypt, isEncrypted } from "@/lib/encryption";
import {
  calculateNIS2Compliance,
  classifyNIS2Entity,
} from "@/lib/nis2-engine.server";
import { generateAutoAssessments } from "@/lib/nis2-auto-assessment.server";
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

    // Decrypt sensitive fields in requirements
    const decryptedAssessments = await Promise.all(
      assessments.map(async (assessment) => ({
        ...assessment,
        requirements: await Promise.all(
          assessment.requirements.map(async (req) => ({
            ...req,
            notes:
              req.notes && isEncrypted(req.notes)
                ? await decrypt(req.notes)
                : req.notes,
            evidenceNotes:
              req.evidenceNotes && isEncrypted(req.evidenceNotes)
                ? await decrypt(req.evidenceNotes)
                : req.evidenceNotes,
          })),
        ),
      })),
    );

    return NextResponse.json({ assessments: decryptedAssessments });
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

    // Create assessment then bulk-insert requirement statuses.
    // Uses sequential queries instead of interactive $transaction because
    // Neon serverless pooled connections can drop mid-transaction.
    const assessment = await prisma.nIS2Assessment.create({
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

    // Bulk-create requirement status entries for applicable requirements
    if (complianceResult.applicableRequirements.length > 0) {
      await prisma.nIS2RequirementStatus.createMany({
        data: complianceResult.applicableRequirements.map((req) => ({
          assessmentId: assessment.id,
          requirementId: req.id,
          status: "not_assessed",
        })),
      });

      // Auto-assess requirements based on wizard answers (ISO 27001, CSIRT, risk mgmt)
      const autoAssessments = generateAutoAssessments(
        complianceResult.applicableRequirements,
        answers,
      );
      let autoAssessedCount = 0;
      for (const auto of autoAssessments) {
        if (auto.suggestedStatus === "partial" && auto.reason) {
          const result = await prisma.nIS2RequirementStatus.updateMany({
            where: {
              assessmentId: assessment.id,
              requirementId: auto.requirementId,
              status: "not_assessed",
            },
            data: {
              status: auto.suggestedStatus,
              notes: auto.reason,
            },
          });
          if (result.count > 0) autoAssessedCount++;
        }
      }

      // Recalculate maturity score after auto-assessment
      if (autoAssessedCount > 0) {
        const updatedReqs = await prisma.nIS2RequirementStatus.findMany({
          where: { assessmentId: assessment.id },
        });
        const total = updatedReqs.length;
        const compliant = updatedReqs.filter(
          (r) => r.status === "compliant",
        ).length;
        const partial = updatedReqs.filter(
          (r) => r.status === "partial",
        ).length;
        const maturityScore =
          total > 0
            ? Math.round(((compliant + 0.5 * partial) / total) * 100)
            : 0;
        await prisma.nIS2Assessment.update({
          where: { id: assessment.id },
          data: { maturityScore },
        });
      }
    }

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

    // Decrypt sensitive fields in requirements for response
    const decryptedAssessment = assessmentWithRequirements
      ? {
          ...assessmentWithRequirements,
          requirements: await Promise.all(
            assessmentWithRequirements.requirements.map(async (req) => ({
              ...req,
              notes:
                req.notes && isEncrypted(req.notes)
                  ? await decrypt(req.notes)
                  : req.notes,
              evidenceNotes:
                req.evidenceNotes && isEncrypted(req.evidenceNotes)
                  ? await decrypt(req.evidenceNotes)
                  : req.evidenceNotes,
            })),
          ),
        }
      : null;

    return NextResponse.json({
      assessment: decryptedAssessment,
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
