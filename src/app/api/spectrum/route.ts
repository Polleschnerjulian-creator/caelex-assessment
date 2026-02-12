/**
 * Spectrum Management & ITU Compliance API
 *
 * This API provides spectrum/ITU compliance tracking for satellite operators.
 * Covers ITU Radio Regulations, frequency filings, and multi-jurisdiction licensing.
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
  type SpectrumSource,
  getApplicableSpectrumRequirements,
  determineSpectrumRisk,
  getApplicableLicenses,
} from "@/data/spectrum-itu-requirements";

// Valid enum values for validation
const validServiceTypes: ServiceType[] = [
  "FSS",
  "MSS",
  "BSS",
  "EESS",
  "SRS",
  "RNS",
  "AMSS",
  "MMSS",
  "ISL",
];

const validFrequencyBands: FrequencyBand[] = [
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
];

const validOrbitTypes: OrbitType[] = ["GEO", "NGSO", "LEO", "MEO", "HEO"];

const validJurisdictions: SpectrumSource[] = [
  "ITU",
  "FCC",
  "OFCOM",
  "BNETZA",
  "CEPT",
  "WRC",
];

// GET /api/spectrum - Get user's Spectrum assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.spectrumAssessment.findMany({
      where: { userId },
      include: {
        requirementStatuses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching Spectrum assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/spectrum - Create a new Spectrum assessment
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
      networkName,
      operatorName,
      orbitType,
      altitudeKm,
      inclinationDeg,
      satelliteCount = 1,
      isConstellation = false,
      administrationCode,
      serviceTypes,
      frequencyBands,
      frequencyDetails,
      requiresEPFD = false,
      primaryJurisdiction,
      additionalJurisdictions = [],
      hasExistingFilings = false,
      targetLaunchDate,
      uplinkBands,
      downlinkBands,
      intersatelliteLinks = false,
    } = body;

    // Validate required fields
    if (!serviceTypes || serviceTypes.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: serviceTypes" },
        { status: 400 },
      );
    }

    if (!frequencyBands || frequencyBands.length === 0) {
      return NextResponse.json(
        { error: "Missing required field: frequencyBands" },
        { status: 400 },
      );
    }

    if (!orbitType) {
      return NextResponse.json(
        { error: "Missing required field: orbitType" },
        { status: 400 },
      );
    }

    // Validate service types
    for (const st of serviceTypes) {
      if (!validServiceTypes.includes(st)) {
        return NextResponse.json(
          { error: `Invalid service type: ${st}` },
          { status: 400 },
        );
      }
    }

    // Validate frequency bands
    for (const fb of frequencyBands) {
      if (!validFrequencyBands.includes(fb)) {
        return NextResponse.json(
          { error: `Invalid frequency band: ${fb}` },
          { status: 400 },
        );
      }
    }

    // Validate orbit type
    if (!validOrbitTypes.includes(orbitType)) {
      return NextResponse.json(
        { error: `Invalid orbit type: ${orbitType}` },
        { status: 400 },
      );
    }

    // Validate jurisdictions
    if (
      primaryJurisdiction &&
      !validJurisdictions.includes(primaryJurisdiction)
    ) {
      return NextResponse.json(
        { error: `Invalid jurisdiction: ${primaryJurisdiction}` },
        { status: 400 },
      );
    }

    // Create profile for getting applicable requirements
    const profile: SpectrumProfile = {
      serviceTypes,
      frequencyBands,
      orbitType: orbitType as OrbitType,
      numberOfSatellites: satelliteCount,
      isConstellation,
      primaryJurisdiction: (primaryJurisdiction || "ITU") as SpectrumSource,
      additionalJurisdictions: additionalJurisdictions as SpectrumSource[],
      hasExistingFilings,
      targetLaunchDate: targetLaunchDate
        ? new Date(targetLaunchDate)
        : undefined,
      uplinkBands: uplinkBands || frequencyBands,
      downlinkBands: downlinkBands || frequencyBands,
      intersatelliteLinks,
      gsoProximity: undefined,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableSpectrumRequirements(profile);

    // Determine risk level
    const riskLevel = determineSpectrumRisk(profile);

    // Get applicable licenses
    const applicableLicenses = getApplicableLicenses(profile);

    // Determine if EPFD is required (NGSO in shared bands)
    const effectiveRequiresEPFD =
      requiresEPFD ||
      ((orbitType === "LEO" || orbitType === "MEO" || orbitType === "NGSO") &&
        frequencyBands.some((b: FrequencyBand) =>
          ["Ku", "Ka", "C"].includes(b),
        ));

    // Create assessment with requirement statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.spectrumAssessment.create({
        data: {
          userId,
          assessmentName,
          networkName,
          operatorName,
          orbitType,
          altitudeKm,
          inclinationDeg,
          satelliteCount,
          isConstellation,
          administrationCode,
          serviceTypes: JSON.stringify(serviceTypes),
          frequencyBands: JSON.stringify(frequencyBands),
          frequencyDetails: frequencyDetails
            ? JSON.stringify(frequencyDetails)
            : null,
          requiresEPFD: effectiveRequiresEPFD,
          primaryJurisdiction,
          additionalJurisdictions:
            additionalJurisdictions.length > 0
              ? JSON.stringify(additionalJurisdictions)
              : null,
          status: "draft",
          riskLevel,
          overallComplianceScore: 0,
          ituComplianceScore: 0,
          nationalComplianceScore: 0,
        },
      });

      // Create requirement status entries for applicable requirements
      await Promise.all(
        applicableRequirements.map((requirement) =>
          tx.spectrumRequirementStatus.create({
            data: {
              assessmentId: newAssessment.id,
              requirementId: requirement.id,
              status: "not_assessed",
            },
          }),
        ),
      );

      return newAssessment;
    });

    // Fetch with requirement statuses
    const assessmentWithStatuses = await prisma.spectrumAssessment.findUnique({
      where: { id: assessment.id },
      include: { requirementStatuses: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "SPECTRUM_ASSESSMENT_CREATED",
      entityType: "SpectrumAssessment",
      entityId: assessment.id,
      metadata: {
        serviceTypes,
        frequencyBands,
        orbitType,
        applicableRequirementsCount: applicableRequirements.length,
        riskLevel,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: assessmentWithStatuses,
      applicableRequirementsCount: applicableRequirements.length,
      applicableLicensesCount: applicableLicenses.length,
      riskLevel,
    });
  } catch (error) {
    console.error("Error creating Spectrum assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
