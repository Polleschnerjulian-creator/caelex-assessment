/**
 * ITAR/EAR Export Control Assessment API
 *
 * LEGAL DISCLAIMER: This API provides compliance tracking tools only.
 * It does NOT constitute legal advice. Violations of ITAR/EAR can result
 * in criminal penalties up to 20 years imprisonment and $1M per violation.
 * Always consult qualified export control counsel.
 */

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import { z } from "zod";
import {
  type ExportControlProfile,
  type ExportControlApplicability,
  getApplicableExportControlRequirements,
  getRequiredRegistrations,
  getRequiredLicenseTypes,
  determineOverallRisk,
} from "@/data/itar-ear-requirements";

// GET /api/export-control - Get user's Export Control assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.exportControlAssessment.findMany({
      where: { userId },
      include: {
        requirementStatuses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching Export Control assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/export-control - Create a new Export Control assessment
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

    const postSchema = z.object({
      assessmentName: z.string().optional(),
      companyTypes: z
        .array(
          z.enum([
            "spacecraft_manufacturer",
            "satellite_operator",
            "launch_provider",
            "component_supplier",
            "software_developer",
            "technology_provider",
            "defense_contractor",
            "research_institution",
            "university",
            "foreign_subsidiary",
            "all",
          ]),
        )
        .min(1, "At least one company type is required"),
      hasITARItems: z.boolean().optional().default(false),
      hasEARItems: z.boolean().optional().default(false),
      hasForeignNationals: z.boolean().optional().default(false),
      foreignNationalCountries: z.array(z.string()).optional().default([]),
      exportsToCountries: z.array(z.string()).optional().default([]),
      hasTechnologyTransfer: z.boolean().optional().default(false),
      hasDefenseContracts: z.boolean().optional().default(false),
      hasManufacturingAbroad: z.boolean().optional().default(false),
      hasJointVentures: z.boolean().optional().default(false),
      annualExportValue: z.number().optional(),
      registeredWithDDTC: z.boolean().optional().default(false),
      ddtcRegistrationNo: z.string().optional(),
      ddtcRegistrationExpiry: z.string().optional(),
      hasTCP: z.boolean().optional().default(false),
      hasECL: z.boolean().optional().default(false),
      hasAutomatedScreening: z.boolean().optional().default(false),
      screeningVendor: z.string().optional(),
      empoweredOfficialName: z.string().optional(),
      empoweredOfficialEmail: z.string().optional(),
      empoweredOfficialTitle: z.string().optional(),
    });

    const parsed = postSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      assessmentName,
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
      hasECL,
      hasAutomatedScreening,
      screeningVendor,
      empoweredOfficialName,
      empoweredOfficialEmail,
      empoweredOfficialTitle,
    } = parsed.data;

    // Create profile for getting applicable requirements
    const profile: ExportControlProfile = {
      companyType: companyTypes,
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
      hasTCP,
      hasECL,
    };

    // Get applicable requirements
    const applicableRequirements =
      getApplicableExportControlRequirements(profile);

    // Determine required registrations and licenses
    const requiredRegistrations = getRequiredRegistrations(profile);
    const requiredLicenses = getRequiredLicenseTypes(profile);

    // Determine jurisdiction
    let jurisdictionDetermination = "ear99";
    if (hasITARItems && !hasEARItems) {
      jurisdictionDetermination = "itar_only";
    } else if (hasITARItems && hasEARItems) {
      jurisdictionDetermination = "itar_with_ear_parts";
    } else if (hasEARItems && !hasITARItems) {
      jurisdictionDetermination = "ear_only";
    }

    // Determine initial risk level
    const riskLevel = determineOverallRisk(profile);

    // Create assessment with requirement statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.exportControlAssessment.create({
        data: {
          userId,
          assessmentName,
          companyTypes: JSON.stringify(companyTypes),
          hasITARItems,
          hasEARItems,
          hasForeignNationals,
          foreignNationalCountries:
            foreignNationalCountries.length > 0
              ? JSON.stringify(foreignNationalCountries)
              : null,
          exportsToCountries:
            exportsToCountries.length > 0
              ? JSON.stringify(exportsToCountries)
              : null,
          hasTechnologyTransfer,
          hasDefenseContracts,
          hasManufacturingAbroad,
          hasJointVentures,
          annualExportValue,
          registeredWithDDTC,
          ddtcRegistrationNo,
          ddtcRegistrationExpiry: ddtcRegistrationExpiry
            ? new Date(ddtcRegistrationExpiry)
            : null,
          hasTCP,
          hasECL,
          hasAutomatedScreening,
          screeningVendor,
          empoweredOfficialName,
          empoweredOfficialEmail,
          empoweredOfficialTitle,
          jurisdictionDetermination,
          jurisdictionDeterminationDate: new Date(),
          riskLevel,
          status: "draft",
          overallComplianceScore: 0,
          itarComplianceScore: 0,
          earComplianceScore: 0,
        },
      });

      // Create requirement status entries for applicable requirements
      await Promise.all(
        applicableRequirements.map((requirement) =>
          tx.exportControlRequirementStatus.create({
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
    const assessmentWithStatuses =
      await prisma.exportControlAssessment.findUnique({
        where: { id: assessment.id },
        include: { requirementStatuses: true },
      });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "EXPORT_CONTROL_ASSESSMENT_CREATED",
      entityType: "ExportControlAssessment",
      entityId: assessment.id,
      metadata: {
        companyTypes,
        hasITARItems,
        hasEARItems,
        applicableRequirementsCount: applicableRequirements.length,
        requiredRegistrations,
        requiredLicenses,
        jurisdictionDetermination,
        riskLevel,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: assessmentWithStatuses,
      applicableRequirementsCount: applicableRequirements.length,
      requiredRegistrations,
      requiredLicenses,
      jurisdictionDetermination,
      riskLevel,
      disclaimer:
        "This assessment is for compliance tracking purposes only and does not constitute legal advice. " +
        "Export control violations can result in criminal penalties including imprisonment up to 20 years " +
        "and fines up to $1,000,000 per violation. Always consult qualified export control counsel.",
    });
  } catch (error) {
    console.error("Error creating Export Control assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
