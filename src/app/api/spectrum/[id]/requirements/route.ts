/**
 * Spectrum Assessment Requirements API
 *
 * Handles GET and PUT for individual requirement statuses within a spectrum assessment.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  type SpectrumProfile,
  type ServiceType,
  type FrequencyBand,
  type OrbitType,
  type ComplianceStatus,
  type SpectrumSource,
  getApplicableSpectrumRequirements,
  spectrumRequirements,
} from "@/data/spectrum-itu-requirements";
import {
  calculateComplianceScore,
  type RequirementAssessment,
} from "@/lib/spectrum-engine.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/spectrum/[id]/requirements - Get all requirement statuses
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    // Verify ownership
    const assessment = await prisma.spectrumAssessment.findFirst({
      where: { id, userId },
      include: { requirementStatuses: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Parse profile data
    const serviceTypes = JSON.parse(assessment.serviceTypes) as ServiceType[];
    const frequencyBands = JSON.parse(
      assessment.frequencyBands,
    ) as FrequencyBand[];
    const additionalJurisdictions = assessment.additionalJurisdictions
      ? JSON.parse(assessment.additionalJurisdictions)
      : [];

    const profile: SpectrumProfile = {
      serviceTypes,
      frequencyBands,
      orbitType: assessment.orbitType as OrbitType,
      numberOfSatellites: assessment.satelliteCount,
      isConstellation: assessment.isConstellation,
      primaryJurisdiction: (assessment.primaryJurisdiction ||
        "ITU") as SpectrumSource,
      additionalJurisdictions,
      hasExistingFilings: assessment.apiStatus !== "not_started",
      targetLaunchDate: assessment.biuDeadline ?? undefined,
      uplinkBands: frequencyBands,
      downlinkBands: frequencyBands,
      intersatelliteLinks: false,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableSpectrumRequirements(profile);

    // Map statuses to requirements
    const statusMap = new Map(
      assessment.requirementStatuses.map((rs) => [rs.requirementId, rs]),
    );

    const requirementsWithStatus = applicableRequirements.map((req) => ({
      requirement: req,
      status: statusMap.get(req.id) ?? null,
    }));

    // Calculate current score
    const assessments: RequirementAssessment[] =
      assessment.requirementStatuses.map((rs) => ({
        requirementId: rs.requirementId,
        status: rs.status as ComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
        assessedAt: rs.updatedAt,
        targetDate: rs.targetDate ?? undefined,
      }));

    const score = calculateComplianceScore(applicableRequirements, assessments);

    return NextResponse.json({
      requirements: requirementsWithStatus,
      score,
      totalRequirements: applicableRequirements.length,
    });
  } catch (error) {
    console.error("Error fetching Spectrum requirement statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/spectrum/[id]/requirements - Update requirement statuses
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const { updates } = body as {
      updates: Array<{
        requirementId: string;
        status?: ComplianceStatus;
        notes?: string;
        evidenceNotes?: string;
        targetDate?: string;
        responsibleParty?: string;
        filingReference?: string;
      }>;
    };

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Missing required field: updates array" },
        { status: 400 },
      );
    }

    // Verify ownership
    const assessment = await prisma.spectrumAssessment.findFirst({
      where: { id, userId },
      include: { requirementStatuses: true },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Validate requirement IDs
    const validRequirementIds = new Set(spectrumRequirements.map((r) => r.id));
    for (const update of updates) {
      if (!validRequirementIds.has(update.requirementId)) {
        return NextResponse.json(
          { error: `Invalid requirement ID: ${update.requirementId}` },
          { status: 400 },
        );
      }
    }

    // Validate status values
    const validStatuses: ComplianceStatus[] = [
      "compliant",
      "partial",
      "non_compliant",
      "not_assessed",
      "not_applicable",
    ];
    for (const update of updates) {
      if (update.status && !validStatuses.includes(update.status)) {
        return NextResponse.json(
          { error: `Invalid status: ${update.status}` },
          { status: 400 },
        );
      }
    }

    // Create status entries for requirements that don't exist yet
    const existingStatusIds = new Set(
      assessment.requirementStatuses.map((rs) => rs.requirementId),
    );
    const newStatuses = updates.filter(
      (u) => !existingStatusIds.has(u.requirementId),
    );

    // Update in transaction
    const updatedStatuses = await prisma.$transaction(async (tx) => {
      // Create new status entries
      for (const newStatus of newStatuses) {
        await tx.spectrumRequirementStatus.create({
          data: {
            assessmentId: id,
            requirementId: newStatus.requirementId,
            status: newStatus.status ?? "not_assessed",
            notes: newStatus.notes,
            evidenceNotes: newStatus.evidenceNotes,
            targetDate: newStatus.targetDate
              ? new Date(newStatus.targetDate)
              : null,
            responsibleParty: newStatus.responsibleParty,
            filingReference: newStatus.filingReference,
          },
        });
      }

      // Update existing status entries
      for (const update of updates.filter((u) =>
        existingStatusIds.has(u.requirementId),
      )) {
        const updateData: Record<string, unknown> = {};
        if (update.status !== undefined) updateData.status = update.status;
        if (update.notes !== undefined) updateData.notes = update.notes;
        if (update.evidenceNotes !== undefined)
          updateData.evidenceNotes = update.evidenceNotes;
        if (update.targetDate !== undefined)
          updateData.targetDate = new Date(update.targetDate);
        if (update.responsibleParty !== undefined)
          updateData.responsibleParty = update.responsibleParty;
        if (update.filingReference !== undefined)
          updateData.filingReference = update.filingReference;

        await tx.spectrumRequirementStatus.updateMany({
          where: {
            assessmentId: id,
            requirementId: update.requirementId,
          },
          data: updateData,
        });
      }

      // Fetch updated statuses
      return tx.spectrumRequirementStatus.findMany({
        where: { assessmentId: id },
      });
    });

    // Recalculate compliance score
    const serviceTypes = JSON.parse(assessment.serviceTypes) as ServiceType[];
    const frequencyBands = JSON.parse(
      assessment.frequencyBands,
    ) as FrequencyBand[];
    const additionalJurisdictions = assessment.additionalJurisdictions
      ? JSON.parse(assessment.additionalJurisdictions)
      : [];

    const profile: SpectrumProfile = {
      serviceTypes,
      frequencyBands,
      orbitType: assessment.orbitType as OrbitType,
      numberOfSatellites: assessment.satelliteCount,
      isConstellation: assessment.isConstellation,
      primaryJurisdiction: (assessment.primaryJurisdiction ||
        "ITU") as SpectrumSource,
      additionalJurisdictions,
      hasExistingFilings: assessment.apiStatus !== "not_started",
      targetLaunchDate: assessment.biuDeadline ?? undefined,
      uplinkBands: frequencyBands,
      downlinkBands: frequencyBands,
      intersatelliteLinks: false,
    };

    const applicableRequirements = getApplicableSpectrumRequirements(profile);
    const assessmentData: RequirementAssessment[] = updatedStatuses.map(
      (rs) => ({
        requirementId: rs.requirementId,
        status: rs.status as ComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
        assessedAt: rs.updatedAt,
        targetDate: rs.targetDate ?? undefined,
      }),
    );

    const score = calculateComplianceScore(
      applicableRequirements,
      assessmentData,
    );

    // Count gaps by risk level
    const criticalGaps = applicableRequirements.filter((req) => {
      const status = assessmentData.find(
        (a) => a.requirementId === req.id,
      )?.status;
      return (
        req.riskLevel === "critical" &&
        (status === "non_compliant" || status === "not_assessed")
      );
    }).length;

    const highGaps = applicableRequirements.filter((req) => {
      const status = assessmentData.find(
        (a) => a.requirementId === req.id,
      )?.status;
      return (
        req.riskLevel === "high" &&
        (status === "non_compliant" || status === "not_assessed")
      );
    }).length;

    // Update assessment with new scores
    await prisma.spectrumAssessment.update({
      where: { id },
      data: {
        overallComplianceScore: score.overall,
        ituComplianceScore: score.bySource?.ITU ?? score.overall,
        nationalComplianceScore:
          score.bySource?.FCC ?? score.bySource?.OFCOM ?? score.overall,
        mandatoryScore: score.mandatory,
        criticalGaps,
        highGaps,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "SPECTRUM_REQUIREMENTS_UPDATED",
      entityType: "SpectrumAssessment",
      entityId: id,
      metadata: {
        updatedCount: updates.length,
        newScore: score.overall,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      statuses: updatedStatuses,
      score,
    });
  } catch (error) {
    console.error("Error updating Spectrum requirement statuses:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
