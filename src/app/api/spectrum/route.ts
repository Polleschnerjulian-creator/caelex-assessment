/**
 * Spectrum Management & ITU Compliance API
 *
 * This API provides spectrum/ITU compliance tracking for satellite operators.
 * Covers ITU Radio Regulations, frequency filings, and multi-jurisdiction licensing.
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
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

    // Rate limiting
    const rateLimitResult = await checkRateLimit("assessment", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const userId = session.user.id;
    const body = await request.json();

    const createSchema = z.object({
      assessmentName: z.string().optional(),
      networkName: z.string().optional(),
      operatorName: z.string().optional(),
      orbitType: z.enum(["GEO", "NGSO", "LEO", "MEO", "HEO"]),
      altitudeKm: z.number().optional(),
      inclinationDeg: z.number().optional(),
      satelliteCount: z.number().int().min(1).optional().default(1),
      isConstellation: z.boolean().optional().default(false),
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
        .min(1),
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
        .min(1),
      frequencyDetails: z.unknown().optional(),
      requiresEPFD: z.boolean().optional().default(false),
      primaryJurisdiction: z
        .enum(["ITU", "FCC", "OFCOM", "BNETZA", "CEPT", "WRC"])
        .optional(),
      additionalJurisdictions: z
        .array(z.enum(["ITU", "FCC", "OFCOM", "BNETZA", "CEPT", "WRC"]))
        .optional()
        .default([]),
      hasExistingFilings: z.boolean().optional().default(false),
      targetLaunchDate: z.string().optional(),
      uplinkBands: z
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
      downlinkBands: z
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
      intersatelliteLinks: z.boolean().optional().default(false),
    });

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      assessmentName,
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
      primaryJurisdiction,
      additionalJurisdictions,
      hasExistingFilings,
      targetLaunchDate,
      uplinkBands,
      downlinkBands,
      intersatelliteLinks,
    } = parsed.data;

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
