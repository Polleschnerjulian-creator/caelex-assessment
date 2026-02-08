/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * NIS2 Single Assessment API
 *
 * GET    /api/nis2/[assessmentId] — Get assessment details
 * PATCH  /api/nis2/[assessmentId] — Update assessment profile
 * DELETE /api/nis2/[assessmentId] — Delete assessment
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  calculateNIS2Compliance,
  classifyNIS2Entity,
} from "@/lib/nis2-engine.server";
import {
  generateAutoAssessments,
  generateRecommendations,
} from "@/lib/nis2-auto-assessment.server";
import type { NIS2AssessmentAnswers } from "@/lib/nis2-types";

// GET /api/nis2/[assessmentId] - Get assessment details with requirement metadata
export async function GET(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    const assessment = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
      include: {
        requirements: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Enrich requirements with metadata from the data file (title, article, category, etc.)
    // This data is server-only and cannot be loaded on the client.
    let requirementMeta: Record<
      string,
      {
        title: string;
        articleRef: string;
        category: string;
        severity: string;
        complianceQuestion: string;
        description: string;
        spaceSpecificGuidance: string;
        tips: string[];
        evidenceRequired: string[];
        euSpaceActRef?: string;
        iso27001Ref?: string;
        canBeSimplified?: boolean;
        implementationTimeWeeks?: number;
      }
    > = {};

    try {
      const { NIS2_REQUIREMENTS } = await import("@/data/nis2-requirements");
      const metaMap: typeof requirementMeta = {};
      for (const req of NIS2_REQUIREMENTS) {
        metaMap[req.id] = {
          title: req.title,
          articleRef: req.articleRef,
          category: req.category,
          severity: req.severity,
          complianceQuestion: req.complianceQuestion,
          description: req.description,
          spaceSpecificGuidance: req.spaceSpecificGuidance,
          tips: req.tips,
          evidenceRequired: req.evidenceRequired,
          euSpaceActRef: req.euSpaceActRef,
          iso27001Ref: req.iso27001Ref,
          canBeSimplified: req.canBeSimplified,
          implementationTimeWeeks: req.implementationTimeWeeks,
        };
      }
      requirementMeta = metaMap;
    } catch {
      // If requirements data file fails to load, return without enrichment
    }

    // Generate smart recommendations & gap analysis
    let recommendations = null;
    try {
      recommendations = generateRecommendations(
        {
          hasISO27001: assessment.hasISO27001,
          hasExistingCSIRT: assessment.hasExistingCSIRT,
          hasRiskManagement: assessment.hasRiskManagement,
          operatesGroundInfra: assessment.operatesGroundInfra,
          operatesSatComms: assessment.operatesSatComms,
          organizationSize: assessment.organizationSize,
          entityClassification: assessment.entityClassification,
          subSector: assessment.subSector,
        },
        assessment.requirements.map((r) => ({
          requirementId: r.requirementId,
          status: r.status,
          notes: r.notes,
        })),
        requirementMeta,
      );
    } catch (recError) {
      console.error("Error generating recommendations:", recError);
    }

    return NextResponse.json({ assessment, requirementMeta, recommendations });
  } catch (error) {
    console.error("Error fetching NIS2 assessment:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH /api/nis2/[assessmentId] - Update assessment profile
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;
    const body = await request.json();

    // Verify ownership
    const existing = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (body.assessmentName !== undefined)
      updateData.assessmentName = body.assessmentName;
    if (body.sector !== undefined) updateData.sector = body.sector;
    if (body.subSector !== undefined) updateData.subSector = body.subSector;
    if (body.organizationSize !== undefined)
      updateData.organizationSize = body.organizationSize;
    if (body.employeeCount !== undefined)
      updateData.employeeCount = body.employeeCount;
    if (body.annualRevenue !== undefined)
      updateData.annualRevenue = body.annualRevenue;
    if (body.memberStateCount !== undefined)
      updateData.memberStateCount = body.memberStateCount;
    if (body.operatesGroundInfra !== undefined)
      updateData.operatesGroundInfra = body.operatesGroundInfra;
    if (body.operatesSatComms !== undefined)
      updateData.operatesSatComms = body.operatesSatComms;
    if (body.manufacturesSpacecraft !== undefined)
      updateData.manufacturesSpacecraft = body.manufacturesSpacecraft;
    if (body.providesLaunchServices !== undefined)
      updateData.providesLaunchServices = body.providesLaunchServices;
    if (body.providesEOData !== undefined)
      updateData.providesEOData = body.providesEOData;
    if (body.hasISO27001 !== undefined)
      updateData.hasISO27001 = body.hasISO27001;
    if (body.hasExistingCSIRT !== undefined)
      updateData.hasExistingCSIRT = body.hasExistingCSIRT;
    if (body.hasRiskManagement !== undefined)
      updateData.hasRiskManagement = body.hasRiskManagement;
    if (body.maturityScore !== undefined)
      updateData.maturityScore = body.maturityScore;

    // Recalculate classification if profile fields changed
    const profileFields = [
      "sector",
      "subSector",
      "organizationSize",
      "operatesGroundInfra",
      "operatesSatComms",
      "isEUEstablished",
    ];
    const profileChanged = profileFields.some((f) => body[f] !== undefined);

    if (profileChanged) {
      // Build new answers from merged existing + new data
      const answers: NIS2AssessmentAnswers = {
        sector: body.sector || existing.sector,
        spaceSubSector: body.subSector ?? existing.subSector ?? null,
        operatesGroundInfra:
          body.operatesGroundInfra ?? existing.operatesGroundInfra,
        operatesSatComms: body.operatesSatComms ?? existing.operatesSatComms,
        manufacturesSpacecraft:
          body.manufacturesSpacecraft ?? existing.manufacturesSpacecraft,
        providesLaunchServices:
          body.providesLaunchServices ?? existing.providesLaunchServices,
        providesEOData: body.providesEOData ?? existing.providesEOData,
        entitySize: body.organizationSize || existing.organizationSize,
        employeeCount: body.employeeCount ?? existing.employeeCount ?? null,
        annualRevenue: body.annualRevenue ?? existing.annualRevenue ?? null,
        memberStateCount: body.memberStateCount ?? existing.memberStateCount,
        isEUEstablished: true, // Must be EU-established to be in scope
        hasISO27001: body.hasISO27001 ?? existing.hasISO27001,
        hasExistingCSIRT: body.hasExistingCSIRT ?? existing.hasExistingCSIRT,
        hasRiskManagement: body.hasRiskManagement ?? existing.hasRiskManagement,
      };

      // Reclassify
      const classification = classifyNIS2Entity(answers);
      updateData.entityClassification = classification.classification;
      updateData.classificationReason = classification.reason;

      // Recalculate compliance for updated requirements
      const complianceResult = await calculateNIS2Compliance(answers);
      updateData.euSpaceActOverlapCount =
        complianceResult.euSpaceActOverlap.count;
      updateData.riskLevel =
        classification.classification === "essential"
          ? "high"
          : classification.classification === "important"
            ? "medium"
            : "low";

      // Update applicable requirements
      const existingReqs = await prisma.nIS2RequirementStatus.findMany({
        where: { assessmentId },
      });

      const existingReqIds = new Set(existingReqs.map((r) => r.requirementId));
      const applicableReqIds = new Set(
        complianceResult.applicableRequirements.map((r) => r.id),
      );

      // Add new requirements
      const toAdd = complianceResult.applicableRequirements.filter(
        (r) => !existingReqIds.has(r.id),
      );
      if (toAdd.length > 0) {
        await prisma.nIS2RequirementStatus.createMany({
          data: toAdd.map((r) => ({
            assessmentId,
            requirementId: r.id,
            status: "not_assessed",
          })),
        });

        // Auto-assess newly added requirements based on updated answers
        const autoAssessments = generateAutoAssessments(toAdd, answers);
        for (const auto of autoAssessments) {
          if (auto.suggestedStatus === "partial" && auto.reason) {
            await prisma.nIS2RequirementStatus.updateMany({
              where: {
                assessmentId,
                requirementId: auto.requirementId,
                status: "not_assessed",
              },
              data: {
                status: auto.suggestedStatus,
                notes: auto.reason,
              },
            });
          }
        }
      }

      // Also auto-assess existing requirements that are still "not_assessed"
      // (e.g., user re-ran wizard with new ISO 27001 certification)
      const existingNotAssessed = existingReqs.filter(
        (r) =>
          r.status === "not_assessed" && applicableReqIds.has(r.requirementId),
      );
      if (existingNotAssessed.length > 0) {
        const existingApplicable =
          complianceResult.applicableRequirements.filter((r) =>
            existingNotAssessed.some((er) => er.requirementId === r.id),
          );
        const autoForExisting = generateAutoAssessments(
          existingApplicable,
          answers,
        );
        for (const auto of autoForExisting) {
          if (auto.suggestedStatus === "partial" && auto.reason) {
            await prisma.nIS2RequirementStatus.updateMany({
              where: {
                assessmentId,
                requirementId: auto.requirementId,
                status: "not_assessed",
              },
              data: {
                status: auto.suggestedStatus,
                notes: auto.reason,
              },
            });
          }
        }
      }

      // Recalculate maturity score
      const allReqs = await prisma.nIS2RequirementStatus.findMany({
        where: { assessmentId },
      });
      const total = allReqs.length;
      const compliant = allReqs.filter((r) => r.status === "compliant").length;
      const partial = allReqs.filter((r) => r.status === "partial").length;
      updateData.maturityScore =
        total > 0 ? Math.round(((compliant + 0.5 * partial) / total) * 100) : 0;

      // Remove requirements that are no longer applicable
      const toRemove = existingReqs.filter(
        (r) => !applicableReqIds.has(r.requirementId),
      );
      if (toRemove.length > 0) {
        await prisma.nIS2RequirementStatus.deleteMany({
          where: {
            id: { in: toRemove.map((r) => r.id) },
          },
        });
      }
    }

    const updated = await prisma.nIS2Assessment.update({
      where: { id: assessmentId },
      data: updateData,
      include: { requirements: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nis2_assessment_updated",
      entityType: "nis2_assessment",
      entityId: assessmentId,
      previousValue: { ...existing },
      newValue: body,
      description: "Updated NIS2 assessment profile",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ assessment: updated });
  } catch (error) {
    console.error("Error updating NIS2 assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/nis2/[assessmentId] - Delete assessment
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ assessmentId: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { assessmentId } = await params;
    const userId = session.user.id;

    // Verify ownership
    const existing = await prisma.nIS2Assessment.findFirst({
      where: {
        id: assessmentId,
        userId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete (cascades to requirements)
    await prisma.nIS2Assessment.delete({
      where: { id: assessmentId },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "nis2_assessment_deleted",
      entityType: "nis2_assessment",
      entityId: assessmentId,
      previousValue: {
        deleted: true,
        assessmentName: existing.assessmentName,
      },
      description: "Deleted NIS2 assessment",
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting NIS2 assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
