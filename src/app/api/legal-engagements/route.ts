/**
 * Legal Engagements Collection API
 *
 * GET  /api/legal-engagements — List all legal engagements for the authenticated user's org
 * POST /api/legal-engagements — Create a new legal engagement
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { roleHasPermission } from "@/lib/permissions";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import {
  createEngagement,
  getEngagements,
} from "@/lib/services/legal-engagement-service.server";
import { ENGAGEMENT_TYPES } from "@/lib/services/legal-scope-service.server";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

// ─── Validation ───

const validEngagementTypes: string[] = ENGAGEMENT_TYPES.map((t) => t.id);

const CreateEngagementSchema = z.object({
  engagementType: z.string().refine((v) => validEngagementTypes.includes(v), {
    message: `Must be one of: ${validEngagementTypes.join(", ")}`,
  }),
  title: z.string().min(1).max(200),
  firmId: z.string().optional(),
  firmName: z.string().min(1).max(200).optional(),
  firmCity: z.string().max(100).optional(),
  attorneyEmail: z.string().email(),
  expiresAt: z
    .string()
    .datetime()
    .transform((v) => new Date(v)),
  allowExport: z.boolean().optional().default(false),
  note: z.string().max(2000).optional(),
  customScope: z
    .object({
      modules: z.array(z.string()),
      dataTypes: z.array(z.string()),
      includeNIS2Overlap: z.boolean().optional(),
    })
    .optional(),
});

// ─── GET ───

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;

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
    if (!roleHasPermission(orgContext.role, "legal:read")) {
      return createErrorResponse(
        "Insufficient permissions",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    const engagements = await getEngagements(orgContext.organizationId);

    return createSuccessResponse({ engagements });
  } catch (error) {
    logger.error("Error fetching legal engagements", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}

// ─── POST ───

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;

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
    if (!roleHasPermission(orgContext.role, "legal:write")) {
      return createErrorResponse(
        "Insufficient permissions",
        ErrorCode.FORBIDDEN,
        403,
      );
    }

    const body = await request.json();
    const parsed = CreateEngagementSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const data = parsed.data;

    // Validate: either firmId or firmName must be provided
    if (!data.firmId && !data.firmName) {
      return createErrorResponse(
        "Either firmId or firmName is required",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    // Validate: custom engagement type requires custom scope
    if (data.engagementType === "custom" && !data.customScope) {
      return createErrorResponse(
        "Custom engagement type requires customScope",
        ErrorCode.VALIDATION_ERROR,
        400,
      );
    }

    const engagement = await createEngagement(
      {
        organizationId: orgContext.organizationId,
        engagementType: data.engagementType,
        title: data.title,
        firmId: data.firmId,
        firmName: data.firmName,
        firmCity: data.firmCity,
        attorneyEmail: data.attorneyEmail,
        expiresAt: data.expiresAt,
        allowExport: data.allowExport,
        note: data.note,
        customScope: data.customScope,
      },
      userId,
    );

    return createSuccessResponse({ engagement }, 201);
  } catch (error) {
    logger.error("Error creating legal engagement", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
