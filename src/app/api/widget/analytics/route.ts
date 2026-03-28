/**
 * GET /api/widget/analytics
 *
 * Widget analytics data (impressions, completions, CTA clicks).
 * Requires authenticated session.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });

    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    const config = await prisma.widgetConfig.findFirst({
      where: { organizationId: membership.organizationId },
      select: {
        id: true,
        impressions: true,
        completions: true,
        ctaClicks: true,
        createdAt: true,
      },
    });

    if (!config) {
      return NextResponse.json({
        data: {
          impressions: 0,
          completions: 0,
          ctaClicks: 0,
          conversionRate: 0,
          ctaRate: 0,
        },
      });
    }

    const conversionRate =
      config.impressions > 0
        ? Math.round((config.completions / config.impressions) * 100 * 10) / 10
        : 0;
    const ctaRate =
      config.completions > 0
        ? Math.round((config.ctaClicks / config.completions) * 100 * 10) / 10
        : 0;

    return NextResponse.json({
      data: {
        impressions: config.impressions,
        completions: config.completions,
        ctaClicks: config.ctaClicks,
        conversionRate,
        ctaRate,
        since: config.createdAt,
      },
    });
  } catch (error) {
    console.error("[widget/analytics]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
