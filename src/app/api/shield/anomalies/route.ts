/**
 * Shield Conjunction Anomaly Detection API
 *
 * GET /api/shield/anomalies
 * Returns ConjunctionAnomaly[]: satellites with statistically anomalous CDM frequency.
 */

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  computeConjunctionForecast,
  detectAnomaliesFromData,
} from "@/lib/shield/fleet-intelligence.server";

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

    const freqs = forecasts
      .filter((f) => f.confidence !== "insufficient_data")
      .map((f) => ({
        noradId: f.noradId,
        name: f.satelliteName,
        cdmsPerDay: f.dailyAverage,
      }));

    const anomalies = detectAnomaliesFromData(freqs);
    return NextResponse.json({ anomalies });
  } catch (error) {
    logger.error("Failed to detect conjunction anomalies", error);
    return NextResponse.json(
      { error: "Failed to detect conjunction anomalies" },
      { status: 500 },
    );
  }
}
