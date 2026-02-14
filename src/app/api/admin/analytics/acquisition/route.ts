import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { subDays, subMonths, format, eachDayOfInterval } from "date-fns";

/**
 * GET /api/admin/analytics/acquisition
 * Marketing & acquisition metrics for CEO dashboard
 */
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
      acquisitionEvents,
      trafficBySource,
      trafficByCountry,
      landingPagePerformance,
      campaignPerformance,
      dailyTraffic,
      referrerBreakdown,
    ] = await Promise.all([
      prisma.acquisitionEvent.groupBy({
        by: ["eventType"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
        },
      }),

      prisma.acquisitionEvent.groupBy({
        by: ["source"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
        },
        orderBy: {
          _count: {
            source: "desc",
          },
        },
        take: 10,
      }),

      prisma.acquisitionEvent.groupBy({
        by: ["country"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          country: { not: null },
        },
        orderBy: {
          _count: {
            country: "desc",
          },
        },
        take: 10,
      }),

      prisma.acquisitionEvent.groupBy({
        by: ["landingPage"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          landingPage: { not: null },
        },
        orderBy: {
          _count: {
            landingPage: "desc",
          },
        },
        take: 10,
      }),

      prisma.acquisitionEvent.groupBy({
        by: ["campaign", "source", "medium"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          campaign: { not: null },
        },
        orderBy: {
          _count: {
            campaign: "desc",
          },
        },
        take: 10,
      }),

      prisma.$queryRaw<{ date: Date; visits: bigint; signups: bigint }[]>`
        SELECT
          DATE("timestamp") as date,
          COUNT(*) FILTER (WHERE "eventType" = 'visit') as visits,
          COUNT(*) FILTER (WHERE "eventType" = 'signup') as signups
        FROM "AcquisitionEvent"
        WHERE "timestamp" >= ${startDate}
        GROUP BY DATE("timestamp")
        ORDER BY date ASC
      `.catch(() => []),

      prisma.acquisitionEvent.groupBy({
        by: ["referrerUrl"],
        _count: { _all: true },
        where: {
          timestamp: { gte: startDate },
          referrerUrl: { not: null },
        },
        orderBy: {
          _count: {
            referrerUrl: "desc",
          },
        },
        take: 15,
      }),
    ]);

    const totalVisits =
      acquisitionEvents.find((e) => e.eventType === "visit")?._count._all || 0;
    const totalSignups =
      acquisitionEvents.find((e) => e.eventType === "signup")?._count._all || 0;
    const totalConversions =
      acquisitionEvents.find((e) => e.eventType === "conversion")?._count
        ._all || 0;

    const conversionRate =
      totalVisits > 0 ? (totalSignups / totalVisits) * 100 : 0;

    const sourceLabels: Record<string, { name: string; color: string }> = {
      google: { name: "Google", color: "#4285F4" },
      bing: { name: "Bing", color: "#00897B" },
      linkedin: { name: "LinkedIn", color: "#0A66C2" },
      twitter: { name: "Twitter/X", color: "#1DA1F2" },
      direct: { name: "Direct", color: "#6B7280" },
      referral: { name: "Referral", color: "#8B5CF6" },
      email: { name: "Email", color: "#F59E0B" },
      producthunt: { name: "Product Hunt", color: "#DA552F" },
      hackernews: { name: "Hacker News", color: "#FF6600" },
      spacenews: { name: "SpaceNews", color: "#1E3A8A" },
    };

    const trafficSourcesFormatted = trafficBySource.map((s) => ({
      source: sourceLabels[s.source]?.name || s.source || "Unknown",
      visits: s._count._all,
      color: sourceLabels[s.source]?.color || "#9CA3AF",
      percentage:
        totalVisits > 0 ? Math.round((s._count._all / totalVisits) * 100) : 0,
    }));

    const countryNames: Record<string, string> = {
      DE: "Germany",
      FR: "France",
      NL: "Netherlands",
      BE: "Belgium",
      LU: "Luxembourg",
      AT: "Austria",
      GB: "United Kingdom",
      US: "United States",
      IT: "Italy",
      ES: "Spain",
      CH: "Switzerland",
      NO: "Norway",
      SE: "Sweden",
      DK: "Denmark",
    };

    const countriesFormatted = trafficByCountry.map((c) => ({
      country: countryNames[c.country || ""] || c.country || "Unknown",
      code: c.country,
      visits: c._count._all,
      percentage:
        totalVisits > 0 ? Math.round((c._count._all / totalVisits) * 100) : 0,
    }));

    const landingPagesFormatted = landingPagePerformance.map((p) => ({
      page: p.landingPage || "/",
      visits: p._count._all,
      percentage:
        totalVisits > 0 ? Math.round((p._count._all / totalVisits) * 100) : 0,
    }));

    const campaignsFormatted = campaignPerformance.map((c) => ({
      campaign: c.campaign || "Uncategorized",
      source: c.source || "Unknown",
      medium: c.medium || "Unknown",
      visits: c._count._all,
    }));

    const days = eachDayOfInterval({ start: startDate, end: now });
    const trafficTrend = days.map((day: Date) => {
      const dayData = dailyTraffic.find(
        (d) =>
          format(new Date(d.date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd"),
      );
      return {
        date: format(day, "MMM dd"),
        visits: dayData ? Number(dayData.visits) : 0,
        signups: dayData ? Number(dayData.signups) : 0,
      };
    });

    const referrersFormatted = referrerBreakdown
      .filter((r) => r.referrerUrl)
      .map((r) => {
        let domain = "Unknown";
        try {
          domain = new URL(r.referrerUrl!).hostname;
        } catch {
          domain = r.referrerUrl || "Unknown";
        }
        return {
          referrer: domain,
          fullUrl: r.referrerUrl,
          visits: r._count._all,
        };
      });

    const organicTraffic = trafficBySource
      .filter((s) =>
        ["google", "bing", "duckduckgo", "yahoo"].includes(s.source),
      )
      .reduce((sum, s) => sum + s._count._all, 0);

    const socialTraffic = trafficBySource
      .filter((s) =>
        ["linkedin", "twitter", "facebook", "instagram", "reddit"].includes(
          s.source,
        ),
      )
      .reduce((sum, s) => sum + s._count._all, 0);

    const directTraffic = trafficBySource
      .filter((s) => s.source === "direct")
      .reduce((sum, s) => sum + s._count._all, 0);

    const referralTraffic = trafficBySource
      .filter(
        (s) =>
          ![
            "google",
            "bing",
            "duckduckgo",
            "yahoo",
            "linkedin",
            "twitter",
            "facebook",
            "instagram",
            "reddit",
            "direct",
          ].includes(s.source),
      )
      .reduce((sum, s) => sum + s._count._all, 0);

    const channelAttribution = [
      {
        channel: "Organic Search",
        visits: organicTraffic,
        percentage:
          totalVisits > 0
            ? Math.round((organicTraffic / totalVisits) * 100)
            : 0,
      },
      {
        channel: "Social",
        visits: socialTraffic,
        percentage:
          totalVisits > 0 ? Math.round((socialTraffic / totalVisits) * 100) : 0,
      },
      {
        channel: "Direct",
        visits: directTraffic,
        percentage:
          totalVisits > 0 ? Math.round((directTraffic / totalVisits) * 100) : 0,
      },
      {
        channel: "Referral",
        visits: referralTraffic,
        percentage:
          totalVisits > 0
            ? Math.round((referralTraffic / totalVisits) * 100)
            : 0,
      },
    ];

    return NextResponse.json({
      metrics: {
        totalVisits,
        totalSignups,
        totalConversions,
        conversionRate: Math.round(conversionRate * 100) / 100,
      },
      sources: trafficSourcesFormatted,
      channels: channelAttribution,
      geography: countriesFormatted,
      landingPages: landingPagesFormatted,
      campaigns: campaignsFormatted,
      referrers: referrersFormatted,
      trends: {
        traffic: trafficTrend,
      },
      period: {
        start: startDate.toISOString(),
        end: now.toISOString(),
        range,
      },
    });
  } catch (error) {
    console.error("[Analytics Acquisition] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch acquisition analytics" },
      { status: 500 },
    );
  }
}

export const dynamic = "force-dynamic";
