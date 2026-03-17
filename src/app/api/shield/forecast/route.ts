/**
 * Shield Conjunction Forecast API
 *
 * GET /api/shield/forecast
 * Returns SatelliteForecast[]: per-satellite expected conjunction frequency over next 7 days.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { computeConjunctionForecast } from "@/lib/shield/fleet-intelligence.server";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      include: { organization: { select: { id: true, isActive: true } } },
    });

    if (!membership?.organization?.isActive) {
      return NextResponse.json(
        { error: "No active organization" },
        { status: 403 },
      );
    }

    const forecasts = await computeConjunctionForecast(
      membership.organization.id,
    );
    return NextResponse.json(forecasts);
  } catch (error) {
    logger.error("Failed to compute conjunction forecast", error);
    return NextResponse.json(
      { error: "Failed to compute conjunction forecast" },
      { status: 500 },
    );
  }
}
