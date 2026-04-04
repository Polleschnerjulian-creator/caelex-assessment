/**
 * Legal Engagement Invitation API
 *
 * POST /api/legal-engagements/[id]/invite — Send/resend invitation to attorney
 *
 * If the attorney has a User account + LegalAttorney record, creates the
 * LegalEngagementAttorney assignment directly.
 * If no account exists, logs a note that the invitation email should be sent
 * (email sending will be added in the client-side plan).
 */

import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { hasPermission } from "@/lib/permissions";
import {
  createSuccessResponse,
  createErrorResponse,
  createValidationError,
  ErrorCode,
} from "@/lib/api-response";
import { getEngagement } from "@/lib/services/legal-engagement-service.server";
import { logAuditEvent } from "@/lib/audit";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";

// ─── Validation ───

const InviteSchema = z.object({
  email: z.string().email(),
});

// ─── POST ───

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    const userId = session.user.id;
    const { id: engagementId } = await params;

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
    const parsed = InviteSchema.safeParse(body);
    if (!parsed.success) {
      return createValidationError(parsed.error);
    }

    const { email } = parsed.data;

    // Verify engagement exists and belongs to org
    const engagement = await getEngagement(
      engagementId,
      orgContext.organizationId,
    );
    if (!engagement) {
      return createErrorResponse(
        "Engagement not found",
        ErrorCode.NOT_FOUND,
        404,
      );
    }

    if (engagement.status === "revoked") {
      return createErrorResponse(
        "Cannot invite to a revoked engagement",
        ErrorCode.CONFLICT,
        409,
      );
    }

    // Look up user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, email: true },
    });

    if (user) {
      // Check if user has a LegalAttorney record
      const attorney = await prisma.legalAttorney.findUnique({
        where: { userId: user.id },
      });

      if (attorney) {
        // Check if already assigned to this engagement
        const existingAssignment =
          await prisma.legalEngagementAttorney.findUnique({
            where: {
              engagementId_attorneyId: {
                engagementId,
                attorneyId: attorney.id,
              },
            },
          });

        if (existingAssignment) {
          return createSuccessResponse({
            status: "already_assigned",
            message: `Attorney ${email} is already assigned to this engagement`,
            attorneyId: attorney.id,
          });
        }

        // Create the assignment
        const assignment = await prisma.legalEngagementAttorney.create({
          data: {
            engagementId,
            attorneyId: attorney.id,
            // acceptedAt is null — attorney must accept the invitation
          },
        });

        // If engagement is still pending, set to active now that an attorney is assigned
        if (engagement.status === "pending") {
          await prisma.legalEngagement.update({
            where: { id: engagementId },
            data: { status: "active" },
          });
        }

        await logAuditEvent({
          userId,
          action: "legal_attorney_invited",
          entityType: "legal_engagement",
          entityId: engagementId,
          organizationId: orgContext.organizationId,
          description: `Invited attorney ${email} to engagement "${engagement.title}"`,
          metadata: { attorneyId: attorney.id, email },
        });

        return createSuccessResponse(
          {
            status: "assigned",
            message: `Attorney ${email} has been assigned to this engagement`,
            assignmentId: assignment.id,
            attorneyId: attorney.id,
          },
          201,
        );
      }
    }

    // No User account or no LegalAttorney record — log that invitation email should be sent
    logger.info(
      "Attorney invitation pending — email sending not yet implemented",
      {
        engagementId,
        email,
        organizationId: orgContext.organizationId,
      },
    );

    await logAuditEvent({
      userId,
      action: "legal_attorney_invite_pending",
      entityType: "legal_engagement",
      entityId: engagementId,
      organizationId: orgContext.organizationId,
      description: `Invitation pending for ${email} — no existing account or attorney record`,
      metadata: { email, userFound: !!user },
    });

    return createSuccessResponse({
      status: "pending",
      message: `Invitation noted for ${email}. Email sending will be available in a future update.`,
      email,
    });
  } catch (error) {
    logger.error("Error inviting attorney to legal engagement", error);
    return createErrorResponse(
      getSafeErrorMessage(error, "Internal server error"),
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
