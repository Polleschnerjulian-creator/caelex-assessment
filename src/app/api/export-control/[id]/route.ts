/**
 * ITAR/EAR Export Control Assessment API - Individual Assessment
 *
 * LEGAL DISCLAIMER: This API provides compliance tracking tools only.
 * It does NOT constitute legal advice. Always consult qualified export control counsel.
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
  getRequiredRegistrations,
  getRequiredLicenseTypes,
  determineOverallRisk,
  calculateMaxPenaltyExposure,
} from "@/data/itar-ear-requirements";
import {
  performAssessment,
  calculateComplianceScore,
  generateGapAnalysis,
  type RequirementAssessment,
} from "@/lib/export-control-engine.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/export-control/[id] - Get a specific assessment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const assessment = await prisma.exportControlAssessment.findFirst({
      where: {
        id,
        userId,
      },
      include: {
        requirementStatuses: true,
      },
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Parse stored JSON fields
    const companyTypes = JSON.parse(
      assessment.companyTypes,
    ) as ExportControlApplicability[];
    const foreignNationalCountries = assessment.foreignNationalCountries
      ? JSON.parse(assessment.foreignNationalCountries)
      : [];
    const exportsToCountries = assessment.exportsToCountries
      ? JSON.parse(assessment.exportsToCountries)
      : [];

    // Build profile
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

    // Get applicable requirements
    const applicableRequirements =
      getApplicableExportControlRequirements(profile);

    // Map requirement statuses
    const assessments: RequirementAssessment[] =
      assessment.requirementStatuses.map((rs) => ({
        requirementId: rs.requirementId,
        status: rs.status as ComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
        assessedAt: rs.updatedAt,
        targetDate: rs.targetDate ?? undefined,
        responsibleParty: rs.responsibleParty ?? undefined,
      }));

    // Calculate scores
    const score = calculateComplianceScore(applicableRequirements, assessments);

    // Generate gap analysis
    const gapAnalysis = generateGapAnalysis(
      applicableRequirements,
      assessments,
    );

    // Get required registrations and licenses
    const requiredRegistrations = getRequiredRegistrations(profile);
    const requiredLicenses = getRequiredLicenseTypes(profile);

    // Calculate penalty exposure
    const penaltyExposure = calculateMaxPenaltyExposure(profile);

    return NextResponse.json({
      assessment,
      profile,
      applicableRequirements,
      score,
      gapAnalysis,
      requiredRegistrations,
      requiredLicenses,
      penaltyExposure,
      disclaimer:
        "This assessment is for compliance tracking purposes only and does not constitute legal advice.",
    });
  } catch (error) {
    console.error("Error fetching Export Control assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/export-control/[id] - Update an assessment
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
    const existingAssessment = await prisma.exportControlAssessment.findFirst({
      where: { id, userId },
    });

    if (!existingAssessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Extract updateable fields
    const {
      assessmentName,
      status,
      companyTypes,
      hasITARItems,
      hasEARItems,
      hasForeignNationals,
      foreignNationalCountries,
      exportsToCountries,
      hasTechnologyTransfer,
      hasDefenseContracts,
      hasManufacturingAbroad,
      hasJointVentures,
      annualExportValue,
      registeredWithDDTC,
      ddtcRegistrationNo,
      ddtcRegistrationExpiry,
      hasTCP,
      tcpLastReviewDate,
      hasECL,
      hasAutomatedScreening,
      screeningVendor,
      empoweredOfficialName,
      empoweredOfficialEmail,
      empoweredOfficialTitle,
      jurisdictionDetermination,
      hasCJRequest,
      cjRequestDate,
      cjDeterminationDate,
      cjDetermination,
      activeITARLicenses,
      pendingITARLicenses,
      activeTAAs,
      activeMLAs,
      activeEARLicenses,
      pendingEARLicenses,
      usesLicenseExceptions,
      licenseExceptionsUsed,
      lastTrainingDate,
      nextTrainingDue,
      trainingCompletionRate,
      lastAuditDate,
      nextAuditDue,
      lastAuditFindings,
      hasVoluntaryDisclosures,
      voluntaryDisclosureCount,
      lastVoluntaryDisclosureDate,
    } = body;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (assessmentName !== undefined)
      updateData.assessmentName = assessmentName;
    if (status !== undefined) updateData.status = status;
    if (companyTypes !== undefined)
      updateData.companyTypes = JSON.stringify(companyTypes);
    if (hasITARItems !== undefined) updateData.hasITARItems = hasITARItems;
    if (hasEARItems !== undefined) updateData.hasEARItems = hasEARItems;
    if (hasForeignNationals !== undefined)
      updateData.hasForeignNationals = hasForeignNationals;
    if (foreignNationalCountries !== undefined)
      updateData.foreignNationalCountries = JSON.stringify(
        foreignNationalCountries,
      );
    if (exportsToCountries !== undefined)
      updateData.exportsToCountries = JSON.stringify(exportsToCountries);
    if (hasTechnologyTransfer !== undefined)
      updateData.hasTechnologyTransfer = hasTechnologyTransfer;
    if (hasDefenseContracts !== undefined)
      updateData.hasDefenseContracts = hasDefenseContracts;
    if (hasManufacturingAbroad !== undefined)
      updateData.hasManufacturingAbroad = hasManufacturingAbroad;
    if (hasJointVentures !== undefined)
      updateData.hasJointVentures = hasJointVentures;
    if (annualExportValue !== undefined)
      updateData.annualExportValue = annualExportValue;
    if (registeredWithDDTC !== undefined)
      updateData.registeredWithDDTC = registeredWithDDTC;
    if (ddtcRegistrationNo !== undefined)
      updateData.ddtcRegistrationNo = ddtcRegistrationNo;
    if (ddtcRegistrationExpiry !== undefined)
      updateData.ddtcRegistrationExpiry = new Date(ddtcRegistrationExpiry);
    if (hasTCP !== undefined) updateData.hasTCP = hasTCP;
    if (tcpLastReviewDate !== undefined)
      updateData.tcpLastReviewDate = new Date(tcpLastReviewDate);
    if (hasECL !== undefined) updateData.hasECL = hasECL;
    if (hasAutomatedScreening !== undefined)
      updateData.hasAutomatedScreening = hasAutomatedScreening;
    if (screeningVendor !== undefined)
      updateData.screeningVendor = screeningVendor;
    if (empoweredOfficialName !== undefined)
      updateData.empoweredOfficialName = empoweredOfficialName;
    if (empoweredOfficialEmail !== undefined)
      updateData.empoweredOfficialEmail = empoweredOfficialEmail;
    if (empoweredOfficialTitle !== undefined)
      updateData.empoweredOfficialTitle = empoweredOfficialTitle;
    if (jurisdictionDetermination !== undefined) {
      updateData.jurisdictionDetermination = jurisdictionDetermination;
      updateData.jurisdictionDeterminationDate = new Date();
    }
    if (hasCJRequest !== undefined) updateData.hasCJRequest = hasCJRequest;
    if (cjRequestDate !== undefined)
      updateData.cjRequestDate = new Date(cjRequestDate);
    if (cjDeterminationDate !== undefined)
      updateData.cjDeterminationDate = new Date(cjDeterminationDate);
    if (cjDetermination !== undefined)
      updateData.cjDetermination = cjDetermination;
    if (activeITARLicenses !== undefined)
      updateData.activeITARLicenses = activeITARLicenses;
    if (pendingITARLicenses !== undefined)
      updateData.pendingITARLicenses = pendingITARLicenses;
    if (activeTAAs !== undefined) updateData.activeTAAs = activeTAAs;
    if (activeMLAs !== undefined) updateData.activeMLAs = activeMLAs;
    if (activeEARLicenses !== undefined)
      updateData.activeEARLicenses = activeEARLicenses;
    if (pendingEARLicenses !== undefined)
      updateData.pendingEARLicenses = pendingEARLicenses;
    if (usesLicenseExceptions !== undefined)
      updateData.usesLicenseExceptions = usesLicenseExceptions;
    if (licenseExceptionsUsed !== undefined)
      updateData.licenseExceptionsUsed = JSON.stringify(licenseExceptionsUsed);
    if (lastTrainingDate !== undefined)
      updateData.lastTrainingDate = new Date(lastTrainingDate);
    if (nextTrainingDue !== undefined)
      updateData.nextTrainingDue = new Date(nextTrainingDue);
    if (trainingCompletionRate !== undefined)
      updateData.trainingCompletionRate = trainingCompletionRate;
    if (lastAuditDate !== undefined)
      updateData.lastAuditDate = new Date(lastAuditDate);
    if (nextAuditDue !== undefined)
      updateData.nextAuditDue = new Date(nextAuditDue);
    if (lastAuditFindings !== undefined)
      updateData.lastAuditFindings = lastAuditFindings;
    if (hasVoluntaryDisclosures !== undefined)
      updateData.hasVoluntaryDisclosures = hasVoluntaryDisclosures;
    if (voluntaryDisclosureCount !== undefined)
      updateData.voluntaryDisclosureCount = voluntaryDisclosureCount;
    if (lastVoluntaryDisclosureDate !== undefined)
      updateData.lastVoluntaryDisclosureDate = new Date(
        lastVoluntaryDisclosureDate,
      );

    // Update assessment
    const updatedAssessment = await prisma.exportControlAssessment.update({
      where: { id },
      data: updateData,
      include: { requirementStatuses: true },
    });

    // Recalculate risk level if profile changed
    const newCompanyTypes = companyTypes
      ? companyTypes
      : JSON.parse(existingAssessment.companyTypes);

    const profile: ExportControlProfile = {
      companyType: newCompanyTypes,
      hasITARItems: hasITARItems ?? existingAssessment.hasITARItems,
      hasEARItems: hasEARItems ?? existingAssessment.hasEARItems,
      hasForeignNationals:
        hasForeignNationals ?? existingAssessment.hasForeignNationals,
      foreignNationalCountries: foreignNationalCountries ?? [],
      exportsToCountries: exportsToCountries ?? [],
      hasTechnologyTransfer:
        hasTechnologyTransfer ?? existingAssessment.hasTechnologyTransfer,
      hasDefenseContracts:
        hasDefenseContracts ?? existingAssessment.hasDefenseContracts,
      hasManufacturingAbroad:
        hasManufacturingAbroad ?? existingAssessment.hasManufacturingAbroad,
      hasJointVentures: hasJointVentures ?? existingAssessment.hasJointVentures,
      annualExportValue:
        annualExportValue ?? existingAssessment.annualExportValue ?? undefined,
      registeredWithDDTC:
        registeredWithDDTC ?? existingAssessment.registeredWithDDTC,
      hasTCP: hasTCP ?? existingAssessment.hasTCP,
      hasECL: hasECL ?? existingAssessment.hasECL,
    };

    const riskLevel = determineOverallRisk(profile);
    const penaltyExposure = calculateMaxPenaltyExposure(profile);

    // Update calculated fields
    await prisma.exportControlAssessment.update({
      where: { id },
      data: {
        riskLevel,
        maxCivilPenalty: penaltyExposure.civil,
        maxCriminalPenalty: penaltyExposure.criminal,
        maxImprisonment: penaltyExposure.imprisonment,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "EXPORT_CONTROL_ASSESSMENT_UPDATED",
      entityType: "ExportControlAssessment",
      entityId: id,
      metadata: {
        updatedFields: Object.keys(updateData),
        riskLevel,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: updatedAssessment,
      riskLevel,
      penaltyExposure,
    });
  } catch (error) {
    console.error("Error updating Export Control assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/export-control/[id] - Delete an assessment
export async function DELETE(request: Request, { params }: RouteParams) {
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
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete assessment (cascades to requirement statuses)
    await prisma.exportControlAssessment.delete({
      where: { id },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "EXPORT_CONTROL_ASSESSMENT_DELETED",
      entityType: "ExportControlAssessment",
      entityId: id,
      metadata: {
        assessmentName: assessment.assessmentName,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Export Control assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
