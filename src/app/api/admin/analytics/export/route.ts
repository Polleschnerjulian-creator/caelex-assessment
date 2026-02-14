import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, subMonths, format } from "date-fns";

/**
 * GET /api/admin/analytics/export?type=overview|revenue|customers|product&format=csv
 * Export analytics data as CSV
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "overview";
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

    let csv = "";
    const filename = `caelex-analytics-${type}-${format(now, "yyyy-MM-dd")}.csv`;

    switch (type) {
      case "events": {
        const events = await prisma.analyticsEvent.findMany({
          where: { timestamp: { gte: startDate } },
          orderBy: { timestamp: "desc" },
          take: 10000,
          select: {
            timestamp: true,
            eventType: true,
            eventCategory: true,
            userId: true,
            path: true,
            durationMs: true,
            ipCountry: true,
          },
        });

        csv =
          "Timestamp,Event Type,Category,User ID,Path,Duration (ms),Country\n";
        csv += events
          .map((e) =>
            [
              format(e.timestamp, "yyyy-MM-dd HH:mm:ss"),
              e.eventType,
              e.eventCategory,
              e.userId || "",
              e.path || "",
              e.durationMs || "",
              e.ipCountry || "",
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");
        break;
      }

      case "customers": {
        const orgs = await prisma.organization.findMany({
          include: {
            subscription: true,
            _count: { select: { members: true, spacecraft: true } },
            healthScore: true,
          },
        });

        csv =
          "Organization,Plan,Status,Members,Spacecraft,Health Score,Risk Level,Created At\n";
        csv += orgs
          .map((o) =>
            [
              o.name,
              o.plan,
              o.subscription?.status || "N/A",
              o._count.members,
              o._count.spacecraft,
              o.healthScore?.score || "N/A",
              o.healthScore?.riskLevel || "N/A",
              format(o.createdAt, "yyyy-MM-dd"),
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");
        break;
      }

      case "revenue": {
        const entries = await prisma.financialEntry.findMany({
          where: { date: { gte: startDate } },
          orderBy: { date: "desc" },
        });

        csv = "Date,Type,Category,Amount,Currency,Source,Description\n";
        csv += entries
          .map((e) =>
            [
              format(e.date, "yyyy-MM-dd"),
              e.type,
              e.category,
              e.amount,
              e.currency,
              e.source,
              e.description || "",
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");
        break;
      }

      case "aggregates": {
        const aggregates = await prisma.analyticsDailyAggregate.findMany({
          where: { date: { gte: startDate } },
          orderBy: { date: "asc" },
        });

        csv = "Date,Metric,Value,Change %\n";
        csv += aggregates
          .map((a) =>
            [
              format(a.date, "yyyy-MM-dd"),
              a.metricType,
              a.metricValue,
              a.changePercent || "",
            ]
              .map((v) => `"${String(v).replace(/"/g, '""')}"`)
              .join(","),
          )
          .join("\n");
        break;
      }

      default:
        return NextResponse.json(
          { error: "Invalid export type" },
          { status: 400 },
        );
    }

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[Analytics Export] Error:", error);
    return NextResponse.json(
      { error: "Failed to export analytics data" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
