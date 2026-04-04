import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getCurrentOrganization } from "@/lib/middleware/organization-guard";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { getOrganizationRiskOverview } from "@/lib/nexus/asset-service.server";

export async function GET(_req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const orgContext = await getCurrentOrganization(session.user.id);
    if (!orgContext?.organizationId) {
      return NextResponse.json(
        { error: "Organization required" },
        { status: 403 },
      );
    }

    const organizationId = orgContext.organizationId;
    const raw = await getOrganizationRiskOverview(organizationId);

    // Count open vulnerabilities across the org's assets
    const openVulnerabilities = await prisma.assetVulnerability.count({
      where: {
        asset: { organizationId, isDeleted: false },
        status: "OPEN",
      },
    });

    // Transform to match the dashboard's OverviewData interface
    const transformed = {
      metrics: {
        totalAssets: raw.totalAssets,
        avgComplianceScore: raw.averageComplianceScore,
        criticalRiskCount: raw.topRiskAssets?.length ?? 0,
        openVulnerabilities,
      },
      riskDistribution: Object.entries(raw.byCriticality)
        .map(([criticality, count]) => ({
          criticality,
          count,
        }))
        .sort((a, b) => {
          const order: Record<string, number> = {
            CRITICAL: 0,
            HIGH: 1,
            MEDIUM: 2,
            LOW: 3,
          };
          return (order[a.criticality] ?? 4) - (order[b.criticality] ?? 4);
        }),
    };

    return NextResponse.json(transformed);
  } catch (error) {
    logger.error("Error fetching NEXUS overview", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Internal server error") },
      { status: 500 },
    );
  }
}
