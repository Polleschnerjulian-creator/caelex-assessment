/**
 * Single Legal Engagement API
 *
 * GET    /api/legal-engagements/[id] — Get engagement detail with attorneys and access log count
 * PATCH  /api/legal-engagements/[id] — Update engagement (scope, expiry, export permission)
 * DELETE /api/legal-engagements/[id] — Revoke engagement
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasPermission } from "@/lib/permissions";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import {
  getEngagement,
  updateEngagement,
  revokeEngagement,
} from "@/lib/services/legal-engagement-service.server";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

// ─── Validation ───

const UpdateEngagementSchema = z.object({
  scopedModules: z.array(z.string()).optional(),
  scopedDataTypes: z.array(z.string()).optional(),
  includeNIS2Overlap: z.boolean().optional(),
  expiresAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v))
    .optional(),
  allowExport: z.boolean().optional(),
  note: z.string().max(2000).optional(),
});

// ─── GET ───

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const { id } = await params;

    // Resolve organization context
    const orgContext = await getCurrentOrganization(userId);
    if (!orgContext?.organizationId) {
      return createErrorResponse(
        "No organization context",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    // Permission check
    if (!hasPermission(orgContext.permissions, "legal:read")) {
      return createErrorResponse(
        "Insufficient permissions",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    const engagement = await getEngagement(id, orgContext.organizationId);

    if (!engagement) {
      return createErrorResponse(
        "Engagement not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    return createSuccessResponse({ engagement });
  } catch (error) {
    logger.error("Error fetching legal engagement", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// ─── PATCH ───

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const { id } = await params;

    // Resolve organization context
    const orgContext = await getCurrentOrganization(userId);
    if (!orgContext?.organizationId) {
      return createErrorResponse(
        "No organization context",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    // Permission check
    if (!hasPermission(orgContext.permissions, "legal:write")) {
      return createErrorResponse(
        "Insufficient permissions",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    const body = await request.json();
    const parsed = UpdateEngagementSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    // Verify engagement exists and belongs to org
    const existing = await getEngagement(id, orgContext.organizationId);
    if (!existing) {
      return createErrorResponse(
        "Engagement not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    if (existing.status === "revoked") {
      return createErrorResponse(
        "Cannot update a revoked engagement",
        ErrorCode.CONFLICT,
        409,
      );
    }

    const engagement = await updateEngagement(
      id,
      orgContext.organizationId,
      parsed.data,
      userId,
    );

    return createSuccessResponse({ engagement });
  } catch (error) {
    logger.error("Error updating legal engagement", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// ─── DELETE ───

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const { id } = await params;

    // Resolve organization context
    const orgContext = await getCurrentOrganization(userId);
    if (!orgContext?.organizationId) {
      return createErrorResponse(
        "No organization context",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    // Permission check
    if (!hasPermission(orgContext.permissions, "legal:write")) {
      return createErrorResponse(
        "Insufficient permissions",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    // Verify engagement exists and belongs to org
    const existing = await getEngagement(id, orgContext.organizationId);
    if (!existing) {
      return createErrorResponse(
        "Engagement not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    if (existing.status === "revoked") {
      return createErrorResponse(
        "Engagement is already revoked",
        ErrorCode.CONFLICT,
        409,
      );
    }

    const engagement = await revokeEngagement(
      id,
      orgContext.organizationId,
      userId,
    );

    return createSuccessResponse({ engagement });
  } catch (error) {
    logger.error("Error revoking legal engagement", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
