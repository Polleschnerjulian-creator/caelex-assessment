import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logAuditEvent, getRequestContext } from "@/lib/audit";
import { checkRateLimit, createRateLimitResponse } from "@/lib/ratelimit";
import {
  getApplicableGuidelines,
  getSatelliteCategory,
} from "@/data/copuos-iadc-requirements";
import type { CopuosMissionProfile } from "@/data/copuos-iadc-requirements";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

const OrbitRegimeEnum = z.enum([
  "LEO",
  "MEO",
  "GEO",
  "HEO",
  "GTO",
  "cislunar",
  "deep_space",
]);

const MissionTypeEnum = z.enum([
  "commercial",
  "scientific",
  "governmental",
  "educational",
  "military",
]);

// GET /api/copuos - Get user's COPUOS assessments
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;

    const assessments = await prisma.copuosAssessment.findMany({
      where: { userId },
      include: {
        guidelineStatuses: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return createSuccessResponse({ assessments });
  } catch (error) {
    logger.error("Error fetching COPUOS assessments", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// POST /api/copuos - Create a new COPUOS assessment
export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
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
      missionName: z.string().optional(),
      orbitRegime: OrbitRegimeEnum,
      altitudeKm: z.number().optional(),
      inclinationDeg: z.number().optional(),
      missionType: MissionTypeEnum,
      satelliteMassKg: z.number().positive(),
      hasManeuverability: z.boolean().optional().default(false),
      hasPropulsion: z.boolean().optional().default(false),
      plannedLifetimeYears: z.number().optional().default(5),
      isConstellation: z.boolean().optional().default(false),
      constellationSize: z.number().int().optional(),
      launchDate: z.string().optional(),
      countryOfRegistry: z.string().optional(),
      deorbitStrategy: z.string().optional(),
      deorbitTimelineYears: z.number().optional(),
      caServiceProvider: z.string().optional(),
    });

    const parsed = createSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const {
      assessmentName,
      missionName,
      orbitRegime,
      altitudeKm,
      inclinationDeg,
      missionType,
      satelliteMassKg,
      hasManeuverability,
      hasPropulsion,
      plannedLifetimeYears,
      isConstellation,
      constellationSize,
      launchDate,
      countryOfRegistry,
      deorbitStrategy,
      deorbitTimelineYears,
      caServiceProvider,
    } = parsed.data;

    // Determine satellite category
    const satelliteCategory = getSatelliteCategory(satelliteMassKg);

    // Create profile for getting applicable guidelines
    const profile: CopuosMissionProfile = {
      orbitRegime,
      altitudeKm,
      inclinationDeg,
      missionType,
      satelliteCategory,
      satelliteMassKg,
      hasManeuverability,
      hasPropulsion,
      plannedLifetimeYears,
      isConstellation,
      constellationSize,
      launchDate,
      countryOfRegistry,
    };

    // Get applicable guidelines
    const applicableGuidelines = getApplicableGuidelines(profile);

    // Create assessment with guideline statuses in a transaction
    const assessment = await prisma.$transaction(async (tx) => {
      // Create the assessment
      const newAssessment = await tx.copuosAssessment.create({
        data: {
          userId,
          assessmentName,
          missionName,
          orbitRegime,
          altitudeKm,
          inclinationDeg,
          missionType,
          satelliteCategory,
          satelliteMassKg,
          hasManeuverability,
          hasPropulsion,
          plannedLifetimeYears,
          isConstellation,
          constellationSize,
          launchDate: launchDate ? new Date(launchDate) : null,
          countryOfRegistry,
          deorbitStrategy,
          deorbitTimelineYears,
          caServiceProvider,
          status: "draft",
          complianceScore: 0,
        },
      });

      // Create guideline status entries for applicable guidelines
      await Promise.all(
        applicableGuidelines.map((guideline) =>
          tx.copuosGuidelineStatus.create({
            data: {
              assessmentId: newAssessment.id,
              guidelineId: guideline.id,
              status: "not_assessed",
            },
          }),
        ),
      );

      return newAssessment;
    });

    // Fetch with guideline statuses
    const assessmentWithStatuses = await prisma.copuosAssessment.findUnique({
      where: { id: assessment.id },
      include: { guidelineStatuses: true },
    });

    // Log audit event
    const { ipAddress, userAgent } = getRequestContext(request);
    await logAuditEvent({
      userId,
      action: "COPUOS_ASSESSMENT_CREATED",
      entityType: "CopuosAssessment",
      entityId: assessment.id,
      metadata: {
        orbitRegime,
        missionType,
        satelliteMassKg,
        applicableGuidelinesCount: applicableGuidelines.length,
      },
      ipAddress,
      userAgent,
    });

    return createSuccessResponse({
      assessment: assessmentWithStatuses,
      applicableGuidelinesCount: applicableGuidelines.length,
    });
  } catch (error) {
    logger.error("Error creating COPUOS assessment", error);
    return createErrorResponse(
      "Internal server error",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
