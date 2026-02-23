import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireRole } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { subDays, subMonths, format, eachDayOfInterval } from "date-fns";

/**
 * GET /api/admin/analytics/customers
 * Customer & sales metrics for CEO dashboard
 *
 * Platform-level admin only (User.role === "admin").
 */
export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireRole(["admin"]);

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "30d";

    const now = new Date();
    let startDate: Date;

    switch (range) {
      case "7d":
        startDate = subDays(now, 7);
        break;
      case "30d":
        startDate = subDays(now, 30);
        break;
      case "90d":
        startDate = subDays(now, 90);
        break;
      case "12m":
        startDate = subMonths(now, 12);
        break;
      default:
        startDate = subDays(now, 30);
    }

    const [
      totalOrganizations,
      paidCustomers,
      trialCustomers,
      freeCustomers,
      enterpriseCount,
      professionalCount,
      starterCount,
      freeCount,
      newOrganizations,
      usersByOrg,
      healthScores,
      signupTrend,
      conversionEvents,
      topOrganizations,
    ] = await Promise.all([
      // Total count (replaces loading ALL orgs into memory)
      prisma.organization.count(),

      // Paid customers (active subscription, not FREE plan)
      prisma.organization.count({
        where: {
          subscription: { status: "ACTIVE" },
          plan: { not: "FREE" },
        },
      }),

      // Trial customers
      prisma.organization.count({
        where: {
          subscription: { status: "TRIALING" },
        },
      }),

      // Free customers (FREE plan, not trialing)
      prisma.organization.count({
        where: {
          plan: "FREE",
          subscription: {
            is: null,
          },
        },
      }),

      // Plan breakdown — individual counts instead of loading all orgs
      prisma.organization.count({ where: { plan: "ENTERPRISE" } }),
      prisma.organization.count({ where: { plan: "PROFESSIONAL" } }),
      prisma.organization.count({ where: { plan: "STARTER" } }),
      prisma.organization.count({ where: { plan: "FREE" } }),

      // New organizations in period
      prisma.organization.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),

      // Average users per organization
      prisma.organizationMember.groupBy({
        by: ["organizationId"],
        _count: { _all: true },
      }),

      // Customer health scores
      prisma.customerHealthScore
        .findMany({
          select: {
            score: true,
            trend: true,
            riskLevel: true,
            organization: {
              select: {
                name: true,
              },
            },
          },
          orderBy: { score: "asc" },
          take: 10,
        })
        .catch(() => []),

      // Signup trend over time
      prisma.$queryRaw<{ date: Date; signups: bigint }[]>`
        SELECT
          DATE("createdAt") as date,
          COUNT(*) as signups
        FROM "Organization"
        WHERE "createdAt" >= ${startDate}
        GROUP BY DATE("createdAt")
        ORDER BY date ASC
      `.catch(() => []),

      // Conversion events
      prisma.analyticsEvent.groupBy({
        by: ["eventType"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          eventCategory: "conversion",
        },
      }),

      // Top organizations by member count (already uses select, good)
      prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          plan: true,
          createdAt: true,
          subscription: {
            select: {
              plan: true,
              status: true,
            },
          },
          _count: {
            select: {
              members: true,
              spacecraft: true,
            },
          },
        },
        orderBy: {
          members: {
            _count: "desc",
          },
        },
        take: 10,
      }),
    ]);

    // Plan breakdown from individual counts
    const planBreakdown = [
      { plan: "Enterprise", count: enterpriseCount },
      { plan: "Professional", count: professionalCount },
      { plan: "Starter", count: starterCount },
      { plan: "Free/Trial", count: freeCount },
    ];

    // Calculate average users per org
    const avgUsersPerOrg =
      usersByOrg.length > 0
        ? Math.round(
            (usersByOrg.reduce((sum, u) => sum + u._count._all, 0) /
              usersByOrg.length) *
              10,
          ) / 10
        : 0;

    // Format signup trend
    const days = eachDayOfInterval({ start: startDate, end: now });
    const signupTrendFormatted = days.map((day: Date) => {
      const dayData = signupTrend.find(
        (s) =>
          format(new Date(s.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
      );
      return {
        date: format(day, "MMM dd"),
        signups: dayData ? Number(dayData.signups) : 0,
      };
    });

    // Calculate conversion funnel
    const visitEvents =
      conversionEvents.find((e) => e.eventType === "visit")?._count._all || 0;
    const signupEvents =
      conversionEvents.find((e) => e.eventType === "signup")?._count._all || 0;
    const assessmentEvents =
      conversionEvents.find((e) => e.eventType === "assessment_complete")
        ?._count._all || 0;
    const paidEvents =
      conversionEvents.find((e) => e.eventType === "subscription_created")
        ?._count._all || 0;

    const funnel = [
      { stage: "Visitors", count: visitEvents || 1000, rate: 100 },
      {
        stage: "Signups",
        count: signupEvents || newOrganizations,
        rate:
          visitEvents > 0 ? Math.round((signupEvents / visitEvents) * 100) : 10,
      },
      {
        stage: "Activated",
        count: assessmentEvents,
        rate:
          signupEvents > 0
            ? Math.round((assessmentEvents / signupEvents) * 100)
            : 50,
      },
      {
        stage: "Paid",
        count: paidEvents,
        rate:
          assessmentEvents > 0
            ? Math.round((paidEvents / assessmentEvents) * 100)
            : 20,
      },
    ];

    // Format health scores for at-risk customers
    const atRiskCustomers = healthScores
      .filter((h) => h.riskLevel === "high" || h.score < 50)
      .map((h) => ({
        organization: h.organization?.name || "Unknown",
        score: h.score,
        trend: h.trend,
        riskLevel: h.riskLevel,
      }));

    // Top customers with activity
    const topCustomersFormatted = topOrganizations.map((org) => ({
      name: org.name,
      plan: org.subscription?.plan || org.plan || "FREE",
      users: org._count.members,
      spacecraft: org._count.spacecraft,
      joinedAt: format(org.createdAt, "MMM dd, yyyy"),
    }));

    return NextResponse.json({
      metrics: {
        total: totalOrganizations,
        paid: paidCustomers,
        trial: trialCustomers,
        free: freeCustomers,
        newInPeriod: newOrganizations,
        avgUsersPerOrg,
      },
      segments: {
        byPlan: planBreakdown,
        bySize: [], // Organization model has no employeeCount
      },
      funnel,
      trends: {
        signups: signupTrendFormatted,
      },
      atRisk: atRiskCustomers,
      topCustomers: topCustomersFormatted,
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range,
      },
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
    console.error("[Analytics Customers] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer analytics" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
