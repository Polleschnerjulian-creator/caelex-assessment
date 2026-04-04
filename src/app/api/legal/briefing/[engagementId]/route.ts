import {
  getLegalContext,
  verifyEngagementAccess,
  logLegalAccess,
} from "@/lib/legal-auth";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";
import { generateLegalBriefing } from "@/lib/services/legal-briefing-service.server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ engagementId: string }> },
) {
  try {
    const ctx = await getLegalContext();
    if (!ctx) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const { engagementId } = await params;

    // Verify this attorney has access to the engagement
    const access = await verifyEngagementAccess(ctx.attorneyId, engagementId);
    if (!access.success || !access.engagement) {
      return createErrorResponse(
        access.error ?? "Access denied",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    const eng = access.engagement;

    // Generate the briefing
    const briefing = await generateLegalBriefing(eng.organizationId, {
      modules: eng.scopedModules,
      dataTypes: eng.scopedDataTypes,
      assessmentIds: eng.scopedAssessmentIds,
      includeNIS2Overlap: eng.includeNIS2Overlap,
    });

    // Log the access
    await logLegalAccess(
      engagementId,
      ctx.attorneyId,
      "view_briefing",
      `/api/legal/briefing/${engagementId}`,
      request,
    );

    return createSuccessResponse(briefing);
  } catch (error) {
    console.error("Failed to generate legal briefing:", error);
    return createErrorResponse(
      "Failed to generate briefing",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
