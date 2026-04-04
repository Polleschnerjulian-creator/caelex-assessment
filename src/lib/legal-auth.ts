import "server-only";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export interface LegalContext {
  attorneyId: string;
  firmId: string;
  userId: string;
  firmName: string;
  isAdmin: boolean;
}

/**
 * Verify the current session belongs to a registered LegalAttorney.
 * Returns attorney context or null.
 */
export async function getLegalContext(): Promise<LegalContext | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const attorney = await prisma.legalAttorney.findUnique({
    where: { userId: session.user.id },
    include: { firm: { select: { id: true, name: true } } },
  });

  if (!attorney) return null;

  return {
    attorneyId: attorney.id,
    firmId: attorney.firmId,
    userId: session.user.id,
    firmName: attorney.firm.name,
    isAdmin: attorney.isAdmin,
  };
}

/**
 * Verify the attorney has access to a specific engagement.
 * Checks: engagement exists, attorney is assigned, engagement is active, not expired, not revoked.
 */
export async function verifyEngagementAccess(
  attorneyId: string,
  engagementId: string,
): Promise<{
  success: boolean;
  engagement?: {
    id: string;
    organizationId: string;
    engagementType: string;
    scopedModules: string[];
    scopedDataTypes: string[];
    scopedAssessmentIds: string[];
    includeNIS2Overlap: boolean;
    allowExport: boolean;
  };
  error?: string;
}> {
  const assignment = await prisma.legalEngagementAttorney.findUnique({
    where: {
      engagementId_attorneyId: { engagementId, attorneyId },
    },
    include: {
      engagement: true,
    },
  });

  if (!assignment) {
    return { success: false, error: "Not assigned to this engagement" };
  }

  if (!assignment.acceptedAt) {
    return { success: false, error: "Invitation not yet accepted" };
  }

  const eng = assignment.engagement;

  if (eng.status === "revoked") {
    return { success: false, error: "Engagement has been revoked" };
  }

  if (eng.status !== "active") {
    return { success: false, error: `Engagement is ${eng.status}` };
  }

  if (new Date() > eng.expiresAt) {
    return { success: false, error: "Engagement has expired" };
  }

  if (eng.revokedAt) {
    return { success: false, error: "Engagement has been revoked" };
  }

  return {
    success: true,
    engagement: {
      id: eng.id,
      organizationId: eng.organizationId,
      engagementType: eng.engagementType,
      scopedModules: eng.scopedModules,
      scopedDataTypes: eng.scopedDataTypes,
      scopedAssessmentIds: eng.scopedAssessmentIds,
      includeNIS2Overlap: eng.includeNIS2Overlap,
      allowExport: eng.allowExport,
    },
  };
}

/**
 * Log an access event for audit trail.
 */
export async function logLegalAccess(
  engagementId: string,
  attorneyId: string,
  action: string,
  resource: string,
  request?: Request,
): Promise<void> {
  try {
    await prisma.legalAccessLog.create({
      data: {
        engagementId,
        attorneyId,
        action,
        resource,
        ipAddress:
          request?.headers.get("x-forwarded-for")?.split(",").pop()?.trim() ||
          null,
        userAgent: request?.headers.get("user-agent")?.slice(0, 200) || null,
      },
    });
  } catch (err) {
    logger.warn("Failed to log legal access", err);
  }
}
