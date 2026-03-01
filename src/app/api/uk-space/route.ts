import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
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

    // Rate limiting
    const rateLimitResult = await checkRateLimit("assessment", session.user.id);
    if (!rateLimitResult.success) {
      return createRateLimitResponse(rateLimitResult);
    }

    const userId = session.user.id;
    const body = await request.json();

    const createSchema = z.object({
      assessmentName: z.string().optional(),
      operatorType: z.enum([
        "launch_operator",
        "return_operator",
        "satellite_operator",
        "spaceport_operator",
        "range_control",
      ]),
      activityTypes: z
        .array(
          z.enum([
            "launch",
            "return",
            "orbital_operations",
            "suborbital",
            "spaceport_operations",
            "range_services",
          ]),
        )
        .min(1),
      launchFromUk: z.boolean().optional().default(false),
      launchToOrbit: z.boolean().optional().default(false),
      isSuborbital: z.boolean().optional().default(false),
      hasUkNexus: z.boolean().optional().default(true),
      involvesPeople: z.boolean().optional().default(false),
      isCommercial: z.boolean().optional().default(true),
      spacecraftName: z.string().optional(),
      spacecraftMassKg: z.number().optional(),
      plannedLaunchSite: z.string().optional(),
      targetOrbit: z.string().optional(),
      missionDurationYears: z.number().optional(),
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
      operatorType,
      activityTypes,
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
    } = parsed.data;

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
