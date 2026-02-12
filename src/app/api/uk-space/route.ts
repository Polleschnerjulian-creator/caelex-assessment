import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import {
  getApplicableRequirements,
  type UkSpaceProfile,
  type UkOperatorType,
  type UkActivityType,
} from "@/data/uk-space-industry-act";
import { determineRequiredLicenses } from "@/lib/uk-space-engine.server";

// GET /api/uk-space - Get user's UK Space assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    const assessments = await prisma.ukSpaceAssessment.findMany({
      where: { userId },
      include: {
        requirementStatuses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ assessments });
  } catch (error) {
    console.error("Error fetching UK Space assessments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST /api/uk-space - Create a new UK Space assessment
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
      operatorType,
      activityTypes,
      launchFromUk = false,
      launchToOrbit = false,
      isSuborbital = false,
      hasUkNexus = true,
      involvesPeople = false,
      isCommercial = true,
      spacecraftName,
      spacecraftMassKg,
      plannedLaunchSite,
      targetOrbit,
      missionDurationYears,
    } = body;

    // Validate required fields
    if (!operatorType || !activityTypes || activityTypes.length === 0) {
      return NextResponse.json(
        {
          error: "Missing required fields: operatorType, activityTypes",
        },
        { status: 400 },
      );
    }

    // Validate operator type
    const validOperatorTypes: UkOperatorType[] = [
      "launch_operator",
      "return_operator",
      "satellite_operator",
      "spaceport_operator",
      "range_control",
    ];
    if (!validOperatorTypes.includes(operatorType)) {
      return NextResponse.json(
        { error: "Invalid operator type" },
        { status: 400 },
      );
    }

    // Validate activity types
    const validActivityTypes: UkActivityType[] = [
      "launch",
      "return",
      "orbital_operations",
      "suborbital",
      "spaceport_operations",
      "range_services",
    ];
    for (const activity of activityTypes) {
      if (!validActivityTypes.includes(activity)) {
        return NextResponse.json(
          { error: `Invalid activity type: ${activity}` },
          { status: 400 },
        );
      }
    }

    // Create profile for getting applicable requirements
    const profile: UkSpaceProfile = {
      operatorType: operatorType as UkOperatorType,
      activityTypes: activityTypes as UkActivityType[],
      launchFromUk,
      launchToOrbit,
      isSuborbital,
      hasUkNexus,
      involvesPeople,
      isCommercial,
      spacecraftMassKg,
      plannedLaunchSite,
      targetOrbit,
      missionDurationYears,
    };

    // Get applicable requirements
    const applicableRequirements = getApplicableRequirements(profile);

    // Determine required licenses
    const requiredLicenses = determineRequiredLicenses(profile);

    // Create assessment with requirement statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.ukSpaceAssessment.create({
        data: {
          userId,
          assessmentName,
          operatorType,
          activityTypes: JSON.stringify(activityTypes),
          launchFromUk,
          launchToOrbit,
          isSuborbital,
          hasUkNexus,
          involvesPeople,
          isCommercial,
          spacecraftName,
          spacecraftMassKg,
          plannedLaunchSite,
          targetOrbit,
          missionDurationYears,
          requiredLicenses: JSON.stringify(requiredLicenses),
          status: "draft",
          complianceScore: 0,
        },
      });

      // Create requirement status entries for applicable requirements
      await Promise.all(
        applicableRequirements.map((requirement) =>
          tx.ukRequirementStatus.create({
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
    const assessmentWithStatuses = await prisma.ukSpaceAssessment.findUnique({
      where: { id: assessment.id },
      include: { requirementStatuses: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "UK_SPACE_ASSESSMENT_CREATED",
      entityType: "UkSpaceAssessment",
      entityId: assessment.id,
      metadata: {
        operatorType,
        activityTypes,
        applicableRequirementsCount: applicableRequirements.length,
        requiredLicenses,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      assessment: assessmentWithStatuses,
      applicableRequirementsCount: applicableRequirements.length,
      requiredLicenses,
    });
  } catch (error) {
    console.error("Error creating UK Space assessment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
