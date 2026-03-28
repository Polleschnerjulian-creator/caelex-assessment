/**
 * GET /api/v1/compliance/modules
 *
 * Per-module compliance score breakdown.
 * Requires API key with `read:compliance` scope.
 */

import { NextRequest, NextResponse } from "next/server";
import { withApiAuth, apiSuccess, ApiContext } from "@/lib/api-auth";
import { MODULES } from "@/data/modules";
import { prisma } from "@/lib/prisma";

export const GET = withApiAuth(
  async (_request: NextRequest, context: ApiContext) => {
    try {
      const orgId = context.organizationId;

      // Get article status counts for this org's users
      const articleStatuses = await prisma.articleStatus.groupBy({
        by: ["status"],
        where: {
          user: {
            organizationMemberships: { some: { organizationId: orgId } },
          },
        },
        _count: true,
      });

      const totalTracked = articleStatuses.reduce(
        (sum, s) => sum + s._count,
        0,
      );
      const compliantCount =
        articleStatuses.find((s) => s.status === "compliant")?._count || 0;

      const modules = MODULES.map((mod) => ({
        id: mod.id,
        name: mod.name,
        icon: mod.icon,
        description: mod.description,
        articleRange: mod.articleRange,
      }));

      return apiSuccess(
        {
          modules,
          overallProgress: {
            totalTracked,
            compliantCount,
            complianceRate:
              totalTracked > 0
                ? Math.round((compliantCount / totalTracked) * 100)
                : 0,
          },
        },
        200,
        { timestamp: new Date().toISOString() },
      );
    } catch (error) {
      console.error("[compliance/modules]", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 },
      );
    }
  },
  { requiredScopes: ["read:compliance"] },
);
