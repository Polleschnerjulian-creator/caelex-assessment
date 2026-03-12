import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  getDefaultDetector,
  AnomalyDetector,
  type SatelliteHistory,
  type HistoryPoint,
} from "@/lib/ephemeris/anomaly/anomaly-detector";
import type { ModuleKey } from "@/lib/ephemeris/core/types";
import { generateAnomalyAlerts } from "./alerts";

// ─── History Model Access ─────────────────────────────────────────────────────

interface HistoryRecord {
  noradId: string;
  overallScore: number;
  moduleScores: unknown;
  forecastP10: number | null;
  forecastP50: number | null;
  forecastP90: number | null;
  calculatedAt: Date;
}

function toHistoryPoint(record: HistoryRecord): HistoryPoint {
  const moduleScores: Partial<Record<ModuleKey, number>> = {};
  if (record.moduleScores && typeof record.moduleScores === "object") {
    const ms = record.moduleScores as Record<
      string,
      { score?: number } | number
    >;
    for (const [key, val] of Object.entries(ms)) {
      if (typeof val === "number") {
        moduleScores[key as ModuleKey] = val;
      } else if (
        val &&
        typeof val === "object" &&
        "score" in val &&
        val.score !== undefined
      ) {
        moduleScores[key as ModuleKey] = val.score;
      }
    }
  }

  return {
    calculatedAt: record.calculatedAt,
    overallScore: record.overallScore,
    moduleScores,
    forecastP10: record.forecastP10,
    forecastP50: record.forecastP50,
    forecastP90: record.forecastP90,
  };
}

// ─── GET: Active Anomalies ────────────────────────────────────────────────────

/**
 * GET /api/v1/ephemeris/anomalies?lookback_days=30
 *
 * Runs anomaly detection on the organization's satellites
 * using historical compliance state data.
 *
 * Query params:
 *   lookback_days: number (default 30, max 90)
 */
export async function GET(request: NextRequest) {
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

    const lookbackDays = Math.min(
      parseInt(request.nextUrl.searchParams.get("lookback_days") ?? "30", 10) ||
        30,
      90,
    );

    // Fetch org's spacecraft
    const spacecraft = await prisma.spacecraft.findMany({
      where: {
        organizationId: membership.organizationId,
        noradId: { not: null },
      },
      select: { noradId: true, name: true },
    });

    const noradIds = spacecraft
      .map((sc) => sc.noradId)
      .filter((id): id is string => id !== null);

    if (noradIds.length === 0) {
      return NextResponse.json({
        data: {
          anomalies: [],
          scannedSatellites: 0,
          scannedDataPoints: 0,
          summary: {
            totalAnomalies: 0,
            criticalCount: 0,
            highCount: 0,
            mediumCount: 0,
            lowCount: 0,
            byType: {},
            byMethod: {},
          },
          generatedAt: new Date().toISOString(),
        },
      });
    }

    // Load compliance history
    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const records = await prisma.satelliteComplianceStateHistory.findMany({
      where: {
        operatorId: membership.organizationId,
        noradId: { in: noradIds },
        calculatedAt: { gte: since },
      },
      orderBy: { calculatedAt: "asc" },
    });

    // Group by satellite
    const nameMap = new Map(
      spacecraft
        .filter(
          (sc): sc is typeof sc & { noradId: string } => sc.noradId !== null,
        )
        .map((sc) => [sc.noradId, sc.name]),
    );

    const byNorad = new Map<string, HistoryRecord[]>();
    for (const record of records) {
      let arr = byNorad.get(record.noradId);
      if (!arr) {
        arr = [];
        byNorad.set(record.noradId, arr);
      }
      arr.push(record);
    }

    const satellites: SatelliteHistory[] = [];
    for (const [noradId, history] of Array.from(byNorad)) {
      satellites.push({
        noradId,
        name: nameMap.get(noradId) ?? noradId,
        history: history.map(toHistoryPoint),
      });
    }

    // Run detection
    const detector = getDefaultDetector();
    const report = detector.detect(satellites);

    logger.info("[Anomaly] Detection complete", {
      satellites: satellites.length,
      dataPoints: report.scannedDataPoints,
      anomalies: report.summary.totalAnomalies,
    });

    return NextResponse.json({ data: report });
  } catch (error) {
    logger.error("[Anomaly] API error", error);
    return NextResponse.json(
      {
        error: "Anomaly detection failed",
        message: getSafeErrorMessage(error, "Anomaly detection failed"),
      },
      { status: 500 },
    );
  }
}

// ─── POST: Trigger Anomaly Scan with Alerts ───────────────────────────────────

/**
 * POST /api/v1/ephemeris/anomalies
 *
 * Trigger anomaly scan with custom parameters and generate alerts.
 *
 * Body: {
 *   lookbackDays?: number (default 30, max 90)
 *   zScoreWarning?: number (default 2.0)
 *   zScoreCritical?: number (default 3.0)
 *   generateAlerts?: boolean (default true)
 * }
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json().catch(() => null);
    const {
      lookbackDays: rawLookback,
      zScoreWarning,
      zScoreCritical,
      generateAlerts: shouldGenerateAlerts,
    } = (body ?? {}) as {
      lookbackDays?: number;
      zScoreWarning?: number;
      zScoreCritical?: number;
      generateAlerts?: boolean;
    };

    const lookbackDays = Math.min(
      typeof rawLookback === "number" ? rawLookback : 30,
      90,
    );

    // Fetch org's spacecraft
    const spacecraft = await prisma.spacecraft.findMany({
      where: {
        organizationId: membership.organizationId,
        noradId: { not: null },
      },
      select: { noradId: true, name: true },
    });

    const noradIds = spacecraft
      .map((sc) => sc.noradId)
      .filter((id): id is string => id !== null);

    if (noradIds.length === 0) {
      return NextResponse.json({
        data: {
          anomalies: [],
          scannedSatellites: 0,
          scannedDataPoints: 0,
          summary: {
            totalAnomalies: 0,
            criticalCount: 0,
            highCount: 0,
            mediumCount: 0,
            lowCount: 0,
            byType: {},
            byMethod: {},
          },
          generatedAt: new Date().toISOString(),
        },
        alerts: { generated: 0 },
      });
    }

    const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

    const records = await prisma.satelliteComplianceStateHistory.findMany({
      where: {
        operatorId: membership.organizationId,
        noradId: { in: noradIds },
        calculatedAt: { gte: since },
      },
      orderBy: { calculatedAt: "asc" },
    });

    // Group by satellite
    const nameMap = new Map(
      spacecraft
        .filter(
          (sc): sc is typeof sc & { noradId: string } => sc.noradId !== null,
        )
        .map((sc) => [sc.noradId, sc.name]),
    );

    const byNorad = new Map<string, HistoryRecord[]>();
    for (const record of records) {
      let arr = byNorad.get(record.noradId);
      if (!arr) {
        arr = [];
        byNorad.set(record.noradId, arr);
      }
      arr.push(record);
    }

    const satellites: SatelliteHistory[] = [];
    for (const [noradId, history] of Array.from(byNorad)) {
      satellites.push({
        noradId,
        name: nameMap.get(noradId) ?? noradId,
        history: history.map(toHistoryPoint),
      });
    }

    // Build detector with custom config
    const detector = new AnomalyDetector({
      ...(typeof zScoreWarning === "number" ? { zScoreWarning } : {}),
      ...(typeof zScoreCritical === "number" ? { zScoreCritical } : {}),
    });

    const report = detector.detect(satellites);

    // Generate alerts
    let alertsGenerated = 0;
    if (shouldGenerateAlerts !== false) {
      alertsGenerated = await generateAnomalyAlerts(
        membership.organizationId,
        report,
      );
    }

    logger.info("[Anomaly] Scan complete", {
      satellites: satellites.length,
      dataPoints: report.scannedDataPoints,
      anomalies: report.summary.totalAnomalies,
      alertsGenerated,
    });

    return NextResponse.json({
      data: report,
      alerts: { generated: alertsGenerated },
    });
  } catch (error) {
    logger.error("[Anomaly] API error", error);
    return NextResponse.json(
      {
        error: "Anomaly scan failed",
        message: getSafeErrorMessage(error, "Anomaly scan failed"),
      },
      { status: 500 },
    );
  }
}
