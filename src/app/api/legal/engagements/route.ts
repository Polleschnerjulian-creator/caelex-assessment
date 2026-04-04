import { getLegalContext } from "@/lib/legal-auth";
import { prisma } from "@/lib/prisma";
import {
  createSuccessResponse,
  createErrorResponse,
  ErrorCode,
} from "@/lib/api-response";

export async function GET() {
  try {
    const ctx = await getLegalContext();
    if (!ctx) {
      return createErrorResponse("Unauthorized", ErrorCode.UNAUTHORIZED, 401);
    }

    // Fetch all engagements this attorney is assigned to
    const assignments = await prisma.legalEngagementAttorney.findMany({
      where: { attorneyId: ctx.attorneyId },
      include: {
        engagement: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { engagement: { createdAt: "desc" } },
    });

    const engagements = assignments.map((a) => ({
      id: a.engagement.id,
      organizationId: a.engagement.organizationId,
      organizationName: a.engagement.organization.name,
      engagementType: a.engagement.engagementType,
      title: a.engagement.title,
      description: a.engagement.description,
      status: a.engagement.status,
      scopedModules: a.engagement.scopedModules,
      expiresAt: a.engagement.expiresAt.toISOString(),
      createdAt: a.engagement.createdAt.toISOString(),
      allowExport: a.engagement.allowExport,
      accepted: !!a.acceptedAt,
    }));

    return createSuccessResponse(engagements);
  } catch (error) {
    console.error("Failed to fetch legal engagements:", error);
    return createErrorResponse(
      "Failed to fetch engagements",
      ErrorCode.ENGINE_ERROR,
      500,
    );
  }
}
