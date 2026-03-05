import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { z } from "zod";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import {
  getApplicableRequirements,
  isEligibleForSimplifiedRegime,
  calculateMaturityScore,
  type CybersecurityProfile,
  type OrganizationSize,
  type SpaceSegmentComplexity,
  type DataSensitivityLevel,
} from "@/data/cybersecurity-requirements";
import { logger } from "@/lib/logger";

// GET /api/cybersecurity - Get all assessments for user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Resolve organization context for multi-tenant scoping
    const orgContext = await getCurrentOrganization(userId);
    const where: Record<string, unknown> = { userId };
    if (orgContext?.organizationId) {
      where.organizationId = orgContext.organizationId;
    }

    const assessments = await prisma.cybersecurityAssessment.findMany({
      where,
      include: {
        requirements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    logger.error("Error fetching cybersecurity assessments", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/cybersecurity - Create new assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await request.json();

    const schema = z.object({
      assessmentName: z.string().optional(),
      organizationSize: z.enum(["micro", "small", "medium", "large"]),
      employeeCount: z.number().optional(),
      annualRevenue: z.number().optional(),
      spaceSegmentComplexity: z.enum([
        "ground_only",
        "single_satellite",
        "small_constellation",
        "large_constellation",
      ]),
      satelliteCount: z.number().optional(),
      hasGroundSegment: z.boolean().optional().default(true),
      groundStationCount: z.number().optional(),
      dataSensitivityLevel: z.enum([
        "public",
        "internal",
        "confidential",
        "classified",
      ]),
      processesPersonalData: z.boolean().optional().default(false),
      handlesGovData: z.boolean().optional().default(false),
      existingCertifications: z.array(z.string()).optional().default([]),
      hasSecurityTeam: z.boolean().optional().default(false),
      securityTeamSize: z.number().optional(),
      hasIncidentResponsePlan: z.boolean().optional().default(false),
      hasBCP: z.boolean().optional().default(false),
      criticalSupplierCount: z.number().optional(),
      supplierSecurityAssessed: z.boolean().optional().default(false),
    });

    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const {
      assessmentName,
      organizationSize,
      employeeCount,
      annualRevenue,
      spaceSegmentComplexity,
      satelliteCount,
      hasGroundSegment,
      groundStationCount,
      dataSensitivityLevel,
      processesPersonalData,
      handlesGovData,
      existingCertifications,
      hasSecurityTeam,
      securityTeamSize,
      hasIncidentResponsePlan,
      hasBCP,
      criticalSupplierCount,
      supplierSecurityAssessed,
    } = parsed.data;

    // Build profile for requirement calculation
    const profile: CybersecurityProfile = {
      organizationSize: organizationSize as OrganizationSize,
      employeeCount,
      annualRevenue,
      spaceSegmentComplexity: spaceSegmentComplexity as SpaceSegmentComplexity,
      satelliteCount,
      hasGroundSegment,
      groundStationCount,
      dataSensitivityLevel: dataSensitivityLevel as DataSensitivityLevel,
      processesPersonalData,
      handlesGovData,
      existingCertifications,
      hasSecurityTeam,
      securityTeamSize,
      hasIncidentResponsePlan,
      hasBCP,
      criticalSupplierCount,
      supplierSecurityAssessed,
    };

    // Determine simplified regime eligibility
    const isSimplified = isEligibleForSimplifiedRegime(profile);

    // Get applicable requirements
    const applicableRequirements = getApplicableRequirements(profile);

    // Resolve organization context for multi-tenant scoping
    const orgCtx = await getCurrentOrganization(userId);

    // Create assessment with requirement statuses in transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.cybersecurityAssessment.create({
        data: {
          userId,
          organizationId: orgCtx?.organizationId || null,
          assessmentName,
          organizationSize,
          employeeCount,
          annualRevenue,
          spaceSegmentComplexity,
          satelliteCount,
          hasGroundSegment,
          groundStationCount,
          dataSensitivityLevel,
          processesPersonalData,
          handlesGovData,
          existingCertifications: JSON.stringify(existingCertifications),
          hasSecurityTeam,
          securityTeamSize,
          hasIncidentResponsePlan,
          hasBCP,
          criticalSupplierCount,
          supplierSecurityAssessed,
          isSimplifiedRegime: isSimplified,
          maturityScore: 0,
        },
      });

      // Create requirement status entries
      await Promise.all(
        applicableRequirements.map((req) =>
          tx.cybersecurityRequirementStatus.create({
            data: {
              assessmentId: newAssessment.id,
              requirementId: req.id,
              status: "not_assessed",
            },
          }),
        ),
      );

      return newAssessment;
    });

    // Fetch with requirements
    const assessmentWithRequirements =
      await prisma.cybersecurityAssessment.findUnique({
        where: { id: assessment.id },
        include: { requirements: true },
      });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "cybersecurity_assessment_created",
      entityType: "cybersecurity_assessment",
      entityId: assessment.id,
      newValue: {
        organizationSize,
        spaceSegmentComplexity,
        isSimplifiedRegime: isSimplified,
        applicableRequirements: applicableRequirements.length,
      },
      description: `Created cybersecurity assessment (${isSimplified ? "Simplified" : "Standard"} regime)`,
      ipAddress,
      userAgent,
    });

    // Log simplified regime determination if applicable
    if (isSimplified) {
      await logAuditEvent({
        userId,
        action: "simplified_regime_determined",
        entityType: "cybersecurity_assessment",
        entityId: assessment.id,
        newValue: {
          eligible: true,
          reason: "Meets criteria for simplified regime (Art. 86-88)",
        },
        description: "Operator eligible for Simplified Regime",
        ipAddress,
        userAgent,
      });
    }

    return NextResponse.json({
      assessment: assessmentWithRequirements,
      isSimplifiedRegime: isSimplified,
      applicableRequirements: applicableRequirements.map((r) => r.id),
    });
  } catch (error) {
    logger.error("Error creating cybersecurity assessment", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
