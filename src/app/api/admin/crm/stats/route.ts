/**
 * Admin CRM: Aggregate Stats API
 *
 * GET /api/admin/crm/stats
 *
 * Returns KPI metrics for the CRM hub header:
 *   - Pipeline value (sum of open deal values, with weighted forecast)
 *   - Deals by stage
 *   - New leads this week
 *   - Lifecycle distribution
 *   - MRR proxy (sum of active subscription plan values)
 */

import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { DEAL_STAGE_PROBABILITY, KANBAN_STAGES } from "@/lib/crm/types";
import type { CrmDealStage } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    await requireRole(["admin"]);

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      openDeals,
      dealsByStageRaw,
      newLeadsThisWeek,
      newLeadsThisMonth,
      totalContacts,
      totalCompanies,
      lifecycleCounts,
      recentActivityCount,
      topScoringContacts,
    ] = await Promise.all([
      prisma.crmDeal.findMany({
        where: { status: "OPEN", deletedAt: null },
        select: { valueCents: true, stage: true },
      }),
      prisma.crmDeal.groupBy({
        by: ["stage"],
        where: { deletedAt: null },
        _count: true,
        _sum: { valueCents: true },
      }),
      prisma.crmContact.count({
        where: {
          deletedAt: null,
          createdAt: { gte: sevenDaysAgo },
        },
      }),
      prisma.crmContact.count({
        where: {
          deletedAt: null,
          createdAt: { gte: thirtyDaysAgo },
        },
      }),
      prisma.crmContact.count({ where: { deletedAt: null } }),
      prisma.crmCompany.count({ where: { deletedAt: null } }),
      prisma.crmContact.groupBy({
        by: ["lifecycleStage"],
        where: { deletedAt: null },
        _count: true,
      }),
      prisma.crmActivity.count({
        where: { occurredAt: { gte: sevenDaysAgo } },
      }),
      prisma.crmContact.findMany({
        where: { deletedAt: null, leadScore: { gt: 0 } },
        orderBy: { leadScore: "desc" },
        take: 5,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          leadScore: true,
          lifecycleStage: true,
          company: { select: { name: true, operatorType: true } },
        },
      }),
    ]);

    // Pipeline value — sum of open deals' value, unweighted and weighted
    const pipelineValue = openDeals.reduce(
      (sum, d) => sum + (d.valueCents ? Number(d.valueCents) : 0),
      0,
    );
    const weightedPipelineValue = openDeals.reduce((sum, d) => {
      const value = d.valueCents ? Number(d.valueCents) : 0;
      const probability = DEAL_STAGE_PROBABILITY[d.stage] / 100;
      return sum + value * probability;
    }, 0);

    // Normalize deals by stage into a dense array (include empty stages)
    const dealsByStage = KANBAN_STAGES.map((stage) => {
      const row = dealsByStageRaw.find((r) => r.stage === stage);
      return {
        stage,
        count: row?._count || 0,
        value: row?._sum.valueCents ? Number(row._sum.valueCents) : 0,
      };
    });

    // Add Won/Lost summary
    const wonRow = dealsByStageRaw.find(
      (r) => (r.stage as CrmDealStage) === "CLOSED_WON",
    );
    const lostRow = dealsByStageRaw.find(
      (r) => (r.stage as CrmDealStage) === "CLOSED_LOST",
    );

    return NextResponse.json({
      pipelineValue,
      weightedPipelineValue,
      dealsByStage,
      wonCount: wonRow?._count || 0,
      wonValue: wonRow?._sum.valueCents ? Number(wonRow._sum.valueCents) : 0,
      lostCount: lostRow?._count || 0,
      newLeadsThisWeek,
      newLeadsThisMonth,
      totalContacts,
      totalCompanies,
      lifecycleCounts: lifecycleCounts.map((l) => ({
        stage: l.lifecycleStage,
        count: l._count,
      })),
      recentActivityCount,
      topScoringContacts,
    });
  } catch (error: unknown) {
    const errName = error instanceof Error ? error.name : "";
    if (errName === "UnauthorizedError") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (errName === "ForbiddenError") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 },
      );
    }
    logger.error("Failed to fetch CRM stats", error);
    return NextResponse.json(
      { error: getSafeErrorMessage(error, "Failed to fetch CRM stats") },
      { status: 500 },
    );
  }
}
