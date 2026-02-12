/**
 * ITAR/EAR Export Control Requirement Status API
 *
 * LEGAL DISCLAIMER: This API provides compliance tracking tools only.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  type ExportControlProfile,
  type ExportControlApplicability,
  type ComplianceStatus,
  getApplicableExportControlRequirements,
  calculateMaxPenaltyExposure,
  determineOverallRisk,
} from "@/data/itar-ear-requirements";
import {
  calculateComplianceScore,
  type RequirementAssessment,
} from "@/lib/export-control-engine.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/export-control/[id]/requirements - Get all requirement statuses
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify ownership
    const assessment = await prisma.exportControlAssessment.findFirst({
      where: { id, userId },
      include: {
        requirementStatuses: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Build profile to get full requirement details
    const companyTypes = JSON.parse(
      assessment.companyTypes,
    ) as ExportControlApplicability[];
    const foreignNationalCountries = assessment.foreignNationalCountries
      ? JSON.parse(assessment.foreignNationalCountries)
      : [];
    const exportsToCountries = assessment.exportsToCountries
      ? JSON.parse(assessment.exportsToCountries)
      : [];

    const profile: ExportControlProfile = {
      companyType: companyTypes,
      hasITARItems: assessment.hasITARItems,
      hasEARItems: assessment.hasEARItems,
      hasForeignNationals: assessment.hasForeignNationals,
      foreignNationalCountries,
      exportsToCountries,
      hasTechnologyTransfer: assessment.hasTechnologyTransfer,
      hasDefenseContracts: assessment.hasDefenseContracts,
      hasManufacturingAbroad: assessment.hasManufacturingAbroad,
      hasJointVentures: assessment.hasJointVentures,
      annualExportValue: assessment.annualExportValue ?? undefined,
      registeredWithDDTC: assessment.registeredWithDDTC,
      hasTCP: assessment.hasTCP,
      hasECL: assessment.hasECL,
    };

    // Get applicable requirements with full details
    const applicableRequirements =
      getApplicableExportControlRequirements(profile);

    // Create a map for quick lookup
    const requirementMap = new Map(
      applicableRequirements.map((r) => [r.id, r]),
    );

    // Merge requirement statuses with requirement details
    const requirementsWithStatus = assessment.requirementStatuses.map((rs) => {
      const requirement = requirementMap.get(rs.requirementId);
      return {
        ...rs,
        requirement: requirement ?? null,
      };
    });

    // Calculate summary stats
    const stats = {
      total: requirementsWithStatus.length,
      compliant: requirementsWithStatus.filter((r) => r.status === "compliant")
        .length,
      partial: requirementsWithStatus.filter((r) => r.status === "partial")
        .length,
      nonCompliant: requirementsWithStatus.filter(
        (r) => r.status === "non_compliant",
      ).length,
      notAssessed: requirementsWithStatus.filter(
        (r) => r.status === "not_assessed",
      ).length,
      notApplicable: requirementsWithStatus.filter(
        (r) => r.status === "not_applicable",
      ).length,
    };

    return NextResponse.json({
      requirements: requirementsWithStatus,
      stats,
    });
  } catch (error) {
    console.error("Error fetching requirement statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/export-control/[id]/requirements - Update requirement status(es)
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const body = await request.json();

    // Verify ownership
    const assessment = await prisma.exportControlAssessment.findFirst({
      where: { id, userId },
      include: { requirementStatuses: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Handle both single and batch updates
    const updates = Array.isArray(body) ? body : [body];

    // Validate statuses
    const validStatuses: ComplianceStatus[] = [
      "compliant",
      "partial",
      "non_compliant",
      "not_assessed",
      "not_applicable",
    ];

    for (const update of updates) {
      if (!update.requirementId) {
        return NextResponse.json(
          { error: "Missing requirementId" },
          { status: 400 },
        );
      }
      if (update.status && !validStatuses.includes(update.status)) {
        return NextResponse.json(
          { error: `Invalid status: ${update.status}` },
          { status: 400 },
        );
      }
    }

    // Update each requirement status
    const updatedStatuses = await prisma.$transaction(
      updates.map((update) =>
        prisma.exportControlRequirementStatus.upsert({
          where: {
            assessmentId_requirementId: {
              assessmentId: id,
              requirementId: update.requirementId,
            },
          },
          create: {
            assessmentId: id,
            requirementId: update.requirementId,
            status: update.status ?? "not_assessed",
            notes: update.notes,
            evidenceNotes: update.evidenceNotes,
            targetDate: update.targetDate ? new Date(update.targetDate) : null,
            responsibleParty: update.responsibleParty,
          },
          update: {
            status: update.status,
            notes: update.notes,
            evidenceNotes: update.evidenceNotes,
            targetDate: update.targetDate
              ? new Date(update.targetDate)
              : undefined,
            responsibleParty: update.responsibleParty,
          },
        }),
      ),
    );

    // Recalculate scores
    const allStatuses = await prisma.exportControlRequirementStatus.findMany({
      where: { assessmentId: id },
    });

    // Build profile
    const companyTypes = JSON.parse(
      assessment.companyTypes,
    ) as ExportControlApplicability[];
    const foreignNationalCountries = assessment.foreignNationalCountries
      ? JSON.parse(assessment.foreignNationalCountries)
      : [];
    const exportsToCountries = assessment.exportsToCountries
      ? JSON.parse(assessment.exportsToCountries)
      : [];

    const profile: ExportControlProfile = {
      companyType: companyTypes,
      hasITARItems: assessment.hasITARItems,
      hasEARItems: assessment.hasEARItems,
      hasForeignNationals: assessment.hasForeignNationals,
      foreignNationalCountries,
      exportsToCountries,
      hasTechnologyTransfer: assessment.hasTechnologyTransfer,
      hasDefenseContracts: assessment.hasDefenseContracts,
      hasManufacturingAbroad: assessment.hasManufacturingAbroad,
      hasJointVentures: assessment.hasJointVentures,
      annualExportValue: assessment.annualExportValue ?? undefined,
      registeredWithDDTC: assessment.registeredWithDDTC,
      hasTCP: assessment.hasTCP,
      hasECL: assessment.hasECL,
    };

    const applicableRequirements =
      getApplicableExportControlRequirements(profile);

    const assessments: RequirementAssessment[] = allStatuses.map((rs) => ({
      requirementId: rs.requirementId,
      status: rs.status as ComplianceStatus,
      notes: rs.notes ?? undefined,
      evidenceNotes: rs.evidenceNotes ?? undefined,
      assessedAt: rs.updatedAt,
      targetDate: rs.targetDate ?? undefined,
      responsibleParty: rs.responsibleParty ?? undefined,
    }));

    const score = calculateComplianceScore(applicableRequirements, assessments);
    const riskLevel = determineOverallRisk(profile);
    const penaltyExposure = calculateMaxPenaltyExposure(profile);

    // Calculate gap counts
    const criticalGaps = assessments.filter((a) => {
      const req = applicableRequirements.find((r) => r.id === a.requirementId);
      return (
        req?.riskLevel === "critical" &&
        (a.status === "non_compliant" || a.status === "not_assessed")
      );
    }).length;

    const highGaps = assessments.filter((a) => {
      const req = applicableRequirements.find((r) => r.id === a.requirementId);
      return (
        req?.riskLevel === "high" &&
        (a.status === "non_compliant" || a.status === "not_assessed")
      );
    }).length;

    // Update assessment with new scores
    await prisma.exportControlAssessment.update({
      where: { id },
      data: {
        overallComplianceScore: score.overall,
        mandatoryScore: score.mandatory,
        criticalScore: score.critical,
        itarComplianceScore: score.byRegulation.ITAR,
        earComplianceScore: score.byRegulation.EAR,
        riskLevel,
        criticalGaps,
        highGaps,
        maxCivilPenalty: penaltyExposure.civil,
        maxCriminalPenalty: penaltyExposure.criminal,
        maxImprisonment: penaltyExposure.imprisonment,
        status:
          assessment.status === "draft" &&
          assessments.some((a) => a.status !== "not_assessed")
            ? "in_progress"
            : assessment.status,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "EXPORT_CONTROL_REQUIREMENTS_UPDATED",
      entityType: "ExportControlAssessment",
      entityId: id,
      metadata: {
        updatedCount: updates.length,
        requirementIds: updates.map((u) => u.requirementId),
        newOverallScore: score.overall,
        riskLevel,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      updatedStatuses,
      score,
      riskLevel,
      criticalGaps,
      highGaps,
    });
  } catch (error) {
    console.error("Error updating requirement statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
