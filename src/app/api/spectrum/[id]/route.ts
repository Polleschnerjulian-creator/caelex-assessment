/**
 * Spectrum Management & ITU Compliance API - Individual Assessment
 *
 * Handles GET, PUT, DELETE for individual spectrum assessments.
 */

import { z } from "zod";
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
  type FilingPhase,
  type FilingStatus,
  type CoordinationStatus,
  type SpectrumSource,
  getApplicableSpectrumRequirements,
  determineSpectrumRisk,
  getApplicableLicenses,
  getImpactingWRCDecisions,
} from "@/data/spectrum-itu-requirements";
import {
  performAssessment,
  calculateComplianceScore,
  generateGapAnalysis,
  analyzeFrequencyBands,
  generateFilingStatusSummary,
  generateCoordinationSummary,
  generateRecommendations,
  type RequirementAssessment,
} from "@/lib/spectrum-engine.server";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/spectrum/[id] - Get a specific assessment
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;

    const assessment = await prisma.spectrumAssessment.findFirst({
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
    const serviceTypes = JSON.parse(assessment.serviceTypes) as ServiceType[];
    const frequencyBands = JSON.parse(
      assessment.frequencyBands,
    ) as FrequencyBand[];
    const additionalJurisdictions = assessment.additionalJurisdictions
      ? JSON.parse(assessment.additionalJurisdictions)
      : [];

    // Build profile
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
      uplinkBands: frequencyBands, // Could be enhanced with separate storage
      downlinkBands: frequencyBands,
      intersatelliteLinks: false,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableSpectrumRequirements(profile);

    // Map requirement statuses
    const assessments: RequirementAssessment[] =
      assessment.requirementStatuses.map((rs) => ({
        requirementId: rs.requirementId,
        status: rs.status as ComplianceStatus,
        notes: rs.notes ?? undefined,
        evidenceNotes: rs.evidenceNotes ?? undefined,
        assessedAt: rs.updatedAt,
        targetDate: rs.targetDate ?? undefined,
      }));

    // Parse filing statuses from assessment
    const filingStatuses: Record<FilingPhase, FilingStatus> = {
      API: assessment.apiStatus as FilingStatus,
      CR_C: assessment.crCStatus as FilingStatus,
      NOTIFICATION: assessment.notificationStatus as FilingStatus,
      RECORDING: assessment.recordingStatus as FilingStatus,
    };

    // Parse coordination status
    let coordinationStatuses:
      | {
          ituStatus?: CoordinationStatus;
          bilateral?: { administration: string; status: CoordinationStatus }[];
        }
      | undefined;
    if (assessment.coordinationStatus) {
      try {
        coordinationStatuses = JSON.parse(assessment.coordinationStatus);
      } catch {
        coordinationStatuses = undefined;
      }
    }

    // Perform full assessment
    const fullAssessment = performAssessment(
      profile,
      assessments,
      filingStatuses,
      coordinationStatuses,
    );

    // Calculate scores
    const score = calculateComplianceScore(applicableRequirements, assessments);

    // Generate gap analysis
    const gapAnalysis = generateGapAnalysis(
      applicableRequirements,
      assessments,
    );

    // Analyze frequency bands
    const bandAnalysis = analyzeFrequencyBands(profile, applicableRequirements);

    // Generate filing status summary
    const filingStatusSummary = generateFilingStatusSummary(
      profile,
      filingStatuses,
    );

    // Generate coordination summary
    const coordinationSummary = generateCoordinationSummary(
      profile,
      coordinationStatuses,
    );

    // Get applicable licenses
    const applicableLicenses = getApplicableLicenses(profile);

    // Get impacting WRC decisions
    const wrcDecisions = getImpactingWRCDecisions(profile);

    // Generate recommendations
    const recommendations = generateRecommendations(
      profile,
      gapAnalysis,
      score,
      filingStatusSummary,
    );

    return NextResponse.json({
      assessment,
      profile,
      applicableRequirements,
      score,
      fullAssessment,
      gapAnalysis,
      bandAnalysis,
      filingStatusSummary,
      coordinationSummary,
      applicableLicenses,
      wrcDecisions,
      recommendations,
    });
  } catch (error) {
    console.error("Error fetching Spectrum assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// PUT /api/spectrum/[id] - Update an assessment
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const userId = session.user.id;
    const body = await request.json();

    const putSchema = z.object({
      assessmentName: z.string().optional(),
      status: z.string().optional(),
      networkName: z.string().optional(),
      operatorName: z.string().optional(),
      orbitType: z.enum(["GEO", "NGSO", "LEO", "MEO", "HEO"]).optional(),
      altitudeKm: z.number().optional(),
      inclinationDeg: z.number().optional(),
      satelliteCount: z.number().int().min(1).optional(),
      isConstellation: z.boolean().optional(),
      administrationCode: z.string().optional(),
      serviceTypes: z
        .array(
          z.enum([
            "FSS",
            "MSS",
            "BSS",
            "EESS",
            "SRS",
            "RNS",
            "AMSS",
            "MMSS",
            "ISL",
          ]),
        )
        .optional(),
      frequencyBands: z
        .array(
          z.enum([
            "L",
            "S",
            "C",
            "X",
            "Ku",
            "Ka",
            "V",
            "Q",
            "W",
            "O",
            "UHF",
            "VHF",
          ]),
        )
        .optional(),
      frequencyDetails: z.unknown().optional(),
      requiresEPFD: z.boolean().optional(),
      epfdCompliant: z.boolean().optional(),
      epfdStudyCompleted: z.boolean().optional(),
      epfdStudyDate: z.string().optional(),
      // Filing statuses
      apiStatus: z.string().optional(),
      apiFilingDate: z.string().optional(),
      apiPublicationDate: z.string().optional(),
      apiExpiryDate: z.string().optional(),
      apiReference: z.string().optional(),
      crCStatus: z.string().optional(),
      crCFilingDate: z.string().optional(),
      crCPublicationDate: z.string().optional(),
      crCReference: z.string().optional(),
      notificationStatus: z.string().optional(),
      notificationFilingDate: z.string().optional(),
      notificationExaminationDate: z.string().optional(),
      notificationReference: z.string().optional(),
      recordingStatus: z.string().optional(),
      recordingDate: z.string().optional(),
      recordingReference: z.string().optional(),
      mfrnReference: z.string().optional(),
      // Bringing into Use
      biuDeadline: z.string().optional(),
      biuAchieved: z.boolean().optional(),
      biuDate: z.string().optional(),
      biuEvidenceDocument: z.string().optional(),
      // NGSO Milestones
      milestone10Percent: z.string().optional(),
      milestone50Percent: z.string().optional(),
      milestone100Percent: z.string().optional(),
      milestone10Achieved: z.boolean().optional(),
      milestone50Achieved: z.boolean().optional(),
      milestone100Achieved: z.boolean().optional(),
      // Coordination
      coordinationStatus: z.unknown().optional(),
      hasCoordinationAgreements: z.boolean().optional(),
      coordinationAgreementsJson: z.unknown().optional(),
      // Jurisdictions
      jurisdictionLicenses: z.unknown().optional(),
      primaryJurisdiction: z
        .enum(["ITU", "FCC", "OFCOM", "BNETZA", "CEPT", "WRC"])
        .optional(),
      additionalJurisdictions: z
        .array(z.enum(["ITU", "FCC", "OFCOM", "BNETZA", "CEPT", "WRC"]))
        .optional(),
      // WRC
      wrcDecisionsApplicable: z.unknown().optional(),
      wrcCompliant: z.boolean().optional(),
      // Interference
      interferenceAnalysisComplete: z.boolean().optional(),
      interferenceAnalysisDate: z.string().optional(),
      identifiedInterferenceRisks: z.unknown().optional(),
      mitigationMeasures: z.unknown().optional(),
    });

    const parsed = putSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    // Verify ownership
    const existingAssessment = await prisma.spectrumAssessment.findFirst({
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
      networkName,
      operatorName,
      orbitType,
      altitudeKm,
      inclinationDeg,
      satelliteCount,
      isConstellation,
      administrationCode,
      serviceTypes,
      frequencyBands,
      frequencyDetails,
      requiresEPFD,
      epfdCompliant,
      epfdStudyCompleted,
      epfdStudyDate,
      // Filing statuses
      apiStatus,
      apiFilingDate,
      apiPublicationDate,
      apiExpiryDate,
      apiReference,
      crCStatus,
      crCFilingDate,
      crCPublicationDate,
      crCReference,
      notificationStatus,
      notificationFilingDate,
      notificationExaminationDate,
      notificationReference,
      recordingStatus,
      recordingDate,
      recordingReference,
      mfrnReference,
      // Bringing into Use
      biuDeadline,
      biuAchieved,
      biuDate,
      biuEvidenceDocument,
      // NGSO Milestones
      milestone10Percent,
      milestone50Percent,
      milestone100Percent,
      milestone10Achieved,
      milestone50Achieved,
      milestone100Achieved,
      // Coordination
      coordinationStatus,
      hasCoordinationAgreements,
      coordinationAgreementsJson,
      // Jurisdictions
      jurisdictionLicenses,
      primaryJurisdiction,
      additionalJurisdictions,
      // WRC
      wrcDecisionsApplicable,
      wrcCompliant,
      // Interference
      interferenceAnalysisComplete,
      interferenceAnalysisDate,
      identifiedInterferenceRisks,
      mitigationMeasures,
    } = parsed.data;

    // Build update data
    const updateData: Record<string, unknown> = {};

    if (assessmentName !== undefined)
      updateData.assessmentName = assessmentName;
    if (status !== undefined) updateData.status = status;
    if (networkName !== undefined) updateData.networkName = networkName;
    if (operatorName !== undefined) updateData.operatorName = operatorName;
    if (orbitType !== undefined) updateData.orbitType = orbitType;
    if (altitudeKm !== undefined) updateData.altitudeKm = altitudeKm;
    if (inclinationDeg !== undefined)
      updateData.inclinationDeg = inclinationDeg;
    if (satelliteCount !== undefined)
      updateData.satelliteCount = satelliteCount;
    if (isConstellation !== undefined)
      updateData.isConstellation = isConstellation;
    if (administrationCode !== undefined)
      updateData.administrationCode = administrationCode;
    if (serviceTypes !== undefined)
      updateData.serviceTypes = JSON.stringify(serviceTypes);
    if (frequencyBands !== undefined)
      updateData.frequencyBands = JSON.stringify(frequencyBands);
    if (frequencyDetails !== undefined)
      updateData.frequencyDetails = JSON.stringify(frequencyDetails);
    if (requiresEPFD !== undefined) updateData.requiresEPFD = requiresEPFD;
    if (epfdCompliant !== undefined) updateData.epfdCompliant = epfdCompliant;
    if (epfdStudyCompleted !== undefined)
      updateData.epfdStudyCompleted = epfdStudyCompleted;
    if (epfdStudyDate !== undefined)
      updateData.epfdStudyDate = new Date(epfdStudyDate);

    // Filing statuses
    if (apiStatus !== undefined) updateData.apiStatus = apiStatus;
    if (apiFilingDate !== undefined)
      updateData.apiFilingDate = new Date(apiFilingDate);
    if (apiPublicationDate !== undefined)
      updateData.apiPublicationDate = new Date(apiPublicationDate);
    if (apiExpiryDate !== undefined)
      updateData.apiExpiryDate = new Date(apiExpiryDate);
    if (apiReference !== undefined) updateData.apiReference = apiReference;
    if (crCStatus !== undefined) updateData.crCStatus = crCStatus;
    if (crCFilingDate !== undefined)
      updateData.crCFilingDate = new Date(crCFilingDate);
    if (crCPublicationDate !== undefined)
      updateData.crCPublicationDate = new Date(crCPublicationDate);
    if (crCReference !== undefined) updateData.crCReference = crCReference;
    if (notificationStatus !== undefined)
      updateData.notificationStatus = notificationStatus;
    if (notificationFilingDate !== undefined)
      updateData.notificationFilingDate = new Date(notificationFilingDate);
    if (notificationExaminationDate !== undefined)
      updateData.notificationExaminationDate = new Date(
        notificationExaminationDate,
      );
    if (notificationReference !== undefined)
      updateData.notificationReference = notificationReference;
    if (recordingStatus !== undefined)
      updateData.recordingStatus = recordingStatus;
    if (recordingDate !== undefined)
      updateData.recordingDate = new Date(recordingDate);
    if (recordingReference !== undefined)
      updateData.recordingReference = recordingReference;
    if (mfrnReference !== undefined) updateData.mfrnReference = mfrnReference;

    // Bringing into Use
    if (biuDeadline !== undefined)
      updateData.biuDeadline = new Date(biuDeadline);
    if (biuAchieved !== undefined) updateData.biuAchieved = biuAchieved;
    if (biuDate !== undefined) updateData.biuDate = new Date(biuDate);
    if (biuEvidenceDocument !== undefined)
      updateData.biuEvidenceDocument = biuEvidenceDocument;

    // NGSO Milestones
    if (milestone10Percent !== undefined)
      updateData.milestone10Percent = new Date(milestone10Percent);
    if (milestone50Percent !== undefined)
      updateData.milestone50Percent = new Date(milestone50Percent);
    if (milestone100Percent !== undefined)
      updateData.milestone100Percent = new Date(milestone100Percent);
    if (milestone10Achieved !== undefined)
      updateData.milestone10Achieved = milestone10Achieved;
    if (milestone50Achieved !== undefined)
      updateData.milestone50Achieved = milestone50Achieved;
    if (milestone100Achieved !== undefined)
      updateData.milestone100Achieved = milestone100Achieved;

    // Coordination
    if (coordinationStatus !== undefined)
      updateData.coordinationStatus = JSON.stringify(coordinationStatus);
    if (hasCoordinationAgreements !== undefined)
      updateData.hasCoordinationAgreements = hasCoordinationAgreements;
    if (coordinationAgreementsJson !== undefined)
      updateData.coordinationAgreementsJson = JSON.stringify(
        coordinationAgreementsJson,
      );

    // Jurisdictions
    if (jurisdictionLicenses !== undefined)
      updateData.jurisdictionLicenses = JSON.stringify(jurisdictionLicenses);
    if (primaryJurisdiction !== undefined)
      updateData.primaryJurisdiction = primaryJurisdiction;
    if (additionalJurisdictions !== undefined)
      updateData.additionalJurisdictions = JSON.stringify(
        additionalJurisdictions,
      );

    // WRC
    if (wrcDecisionsApplicable !== undefined)
      updateData.wrcDecisionsApplicable = JSON.stringify(
        wrcDecisionsApplicable,
      );
    if (wrcCompliant !== undefined) updateData.wrcCompliant = wrcCompliant;

    // Interference
    if (interferenceAnalysisComplete !== undefined)
      updateData.interferenceAnalysisComplete = interferenceAnalysisComplete;
    if (interferenceAnalysisDate !== undefined)
      updateData.interferenceAnalysisDate = new Date(interferenceAnalysisDate);
    if (identifiedInterferenceRisks !== undefined)
      updateData.identifiedInterferenceRisks = JSON.stringify(
        identifiedInterferenceRisks,
      );
    if (mitigationMeasures !== undefined)
      updateData.mitigationMeasures = JSON.stringify(mitigationMeasures);

    // Update assessment
    const updatedAssessment = await prisma.spectrumAssessment.update({
      where: { id },
      data: updateData,
      include: { requirementStatuses: true },
    });

    // Recalculate risk level if profile changed
    const newServiceTypes = serviceTypes
      ? serviceTypes
      : JSON.parse(existingAssessment.serviceTypes);
    const newFrequencyBands = frequencyBands
      ? frequencyBands
      : JSON.parse(existingAssessment.frequencyBands);

    const profile: SpectrumProfile = {
      serviceTypes: newServiceTypes,
      frequencyBands: newFrequencyBands,
      orbitType: (orbitType ?? existingAssessment.orbitType) as OrbitType,
      numberOfSatellites: satelliteCount ?? existingAssessment.satelliteCount,
      isConstellation: isConstellation ?? existingAssessment.isConstellation,
      primaryJurisdiction: (primaryJurisdiction ??
        existingAssessment.primaryJurisdiction ??
        "ITU") as SpectrumSource,
      additionalJurisdictions: additionalJurisdictions ?? [],
      hasExistingFilings:
        (apiStatus ?? existingAssessment.apiStatus) !== "not_started",
      targetLaunchDate: undefined,
      uplinkBands: newFrequencyBands,
      downlinkBands: newFrequencyBands,
      intersatelliteLinks: false,
    };

    const riskLevel = determineSpectrumRisk(profile);

    // Update calculated fields
    await prisma.spectrumAssessment.update({
      where: { id },
      data: {
        riskLevel,
      },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "SPECTRUM_ASSESSMENT_UPDATED",
      entityType: "SpectrumAssessment",
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
    });
  } catch (error) {
    console.error("Error updating Spectrum assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// DELETE /api/spectrum/[id] - Delete an assessment
export async function DELETE(request: Request, { params }: RouteParams) {
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
    });

    if (!assessment) {
      return NextResponse.json(
        { error: "Assessment not found" },
        { status: 404 },
      );
    }

    // Delete assessment (cascades to requirement statuses)
    await prisma.spectrumAssessment.delete({
      where: { id },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "SPECTRUM_ASSESSMENT_DELETED",
      entityType: "SpectrumAssessment",
      entityId: id,
      metadata: {
        assessmentName: assessment.assessmentName,
        networkName: assessment.networkName,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting Spectrum assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
