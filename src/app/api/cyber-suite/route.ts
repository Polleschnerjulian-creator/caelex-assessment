import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { logger } from "@/lib/logger";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const orgContext = await getCurrentOrganization(userId);
    const organizationId = orgContext?.organizationId || undefined;

    // Dynamic imports to keep server-only modules out of any client bundle
    const { calculateCyberSuiteScore } =
      await import("@/lib/services/cyber-suite-score.server");
    const { generateSmartActions } =
      await import("@/lib/services/cyber-suite-actions.server");

    // 1. Calculate the unified score (themes, module breakdowns, evidence)
    const score = await calculateCyberSuiteScore(userId, organizationId);

    // 2. Build a flat requirementId → status map for the action generator
    //    by fetching the latest statuses from all three assessment modules.
    const whereClause: Record<string, string> = { userId };
    if (organizationId) {
      whereClause.organizationId = organizationId;
    }

    const [enisaAssessment, nis2Assessment, craAssessment] = await Promise.all([
      prisma.cybersecurityAssessment.findFirst({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        include: {
          requirements: { select: { requirementId: true, status: true } },
        },
      }),
      prisma.nIS2Assessment.findFirst({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        include: {
          requirements: { select: { requirementId: true, status: true } },
        },
      }),
      prisma.cRAAssessment.findFirst({
        where: whereClause,
        orderBy: { updatedAt: "desc" },
        include: {
          requirements: { select: { requirementId: true, status: true } },
        },
      }),
    ]);

    const statusMap = new Map<string, string>();
    for (const req of enisaAssessment?.requirements ?? []) {
      statusMap.set(req.requirementId, req.status);
    }
    for (const req of nis2Assessment?.requirements ?? []) {
      statusMap.set(req.requirementId, req.status);
    }
    for (const req of craAssessment?.requirements ?? []) {
      statusMap.set(req.requirementId, req.status);
    }

    // 3. Generate prioritised smart actions from the combined status map
    const actions = await generateSmartActions(statusMap);

    return createSuccessResponse({
      score,
      actions,
      lastCalculated: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Error calculating cyber suite", error);
    return createErrorResponse(
      "Failed to calculate cyber suite",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
