import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  getApplicableRequirements,
  isEligibleForSimplifiedRegime,
  calculateMaturityScore,
  type CybersecurityProfile,
  type OrganizationSize,
  type SpaceSegmentComplexity,
  type DataSensitivityLevel,
} from "@/data/cybersecurity-requirements";

// GET /api/cybersecurity - Get all assessments for user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.cybersecurityAssessment.findMany({
      where: { userId },
      include: {
        requirements: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching cybersecurity assessments:", error);
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

    const {
      assessmentName,
      organizationSize,
      employeeCount,
      annualRevenue,
      spaceSegmentComplexity,
      satelliteCount,
      hasGroundSegment = true,
      groundStationCount,
      dataSensitivityLevel,
      processesPersonalData = false,
      handlesGovData = false,
      existingCertifications = [],
      hasSecurityTeam = false,
      securityTeamSize,
      hasIncidentResponsePlan = false,
      hasBCP = false,
      criticalSupplierCount,
      supplierSecurityAssessed = false,
    } = body;

    // Validate required fields
    if (!organizationSize || !spaceSegmentComplexity || !dataSensitivityLevel) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: organizationSize, spaceSegmentComplexity, dataSensitivityLevel",
        },
        { status: 400 },
      );
    }

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

    // Create assessment with requirement statuses in transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.cybersecurityAssessment.create({
        data: {
          userId,
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
    console.error("Error creating cybersecurity assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
