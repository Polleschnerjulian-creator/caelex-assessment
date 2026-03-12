import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  getFleetIntelligence,
  type SatelliteSnapshot,
  type SatelliteHistoryData,
} from "@/lib/ephemeris/fleet/fleet-intelligence";
import {
  getDefaultBenchmarkEngine,
  type OperatorData,
} from "@/lib/ephemeris/fleet/benchmark";
import type { ModuleKey } from "@/lib/ephemeris/core/types";

// ─── DB Model Access ──────────────────────────────────────────────────────────

interface ComplianceStateRecord {
  noradId: string;
  operatorId: string;
  overallScore: number;
  moduleScores: unknown;
  horizonDays: number | null;
  horizonRegulation: string | null;
  satelliteName: string | null;
}

interface HistoryRecord {
  noradId: string;
  overallScore: number;
  calculatedAt: Date;
}

function parseModuleScores(raw: unknown): Partial<Record<ModuleKey, number>> {
  const result: Partial<Record<ModuleKey, number>> = {};
  if (!raw || typeof raw !== "object") return result;

  const ms = raw as Record<string, { score?: number } | number>;
  for (const [key, val] of Object.entries(ms)) {
    if (typeof val === "number") {
      result[key as ModuleKey] = val;
    } else if (
      val &&
      typeof val === "object" &&
      "score" in val &&
      val.score !== undefined
    ) {
      result[key as ModuleKey] = val.score;
    }
  }
  return result;
}

// ─── GET /api/v1/ephemeris/fleet/intelligence ─────────────────────────────────

/**
 * GET /api/v1/ephemeris/fleet/intelligence?lookback_days=30&include_benchmark=true
 *
 * Returns fleet intelligence report with:
 * - Fleet score, risk distribution, weakest links
 * - Correlation matrix (if history available)
 * - Fleet compliance horizon
 * - Fleet trend (7-day and 30-day)
 * - Industry benchmark (if include_benchmark=true and sufficient operators)
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
    const includeBenchmark =
      request.nextUrl.searchParams.get("include_benchmark") !== "false";

    // ── Load current compliance states ──────────────────────────────────

    let snapshots: SatelliteSnapshot[] = [];

    {
      const states = await prisma.satelliteComplianceState.findMany({
        where: { operatorId: membership.organizationId },
      });

      // Load spacecraft for orbit type
      const spacecraft = await prisma.spacecraft.findMany({
        where: {
          organizationId: membership.organizationId,
          noradId: { not: null },
        },
        select: { noradId: true, name: true, orbitType: true },
      });

      const orbitMap = new Map(
        spacecraft
          .filter(
            (sc): sc is typeof sc & { noradId: string } => sc.noradId !== null,
          )
          .map((sc) => [sc.noradId, sc.orbitType]),
      );

      // Count alerts per satellite
      const alertCounts = new Map<string, number>();
      try {
        const noradIds = states.map((s) => s.noradId);
        const grouped = await prisma.satelliteAlert.groupBy({
          by: ["noradId"],
          where: {
            noradId: { in: noradIds },
            operatorId: membership.organizationId,
            resolvedAt: null,
          },
          _count: { id: true },
        });
        for (const g of grouped) {
          alertCounts.set(g.noradId, g._count.id);
        }
      } catch {
        // groupBy may not be available — skip alert counts
      }

      snapshots = states.map((state) => ({
        noradId: state.noradId,
        name: state.satelliteName ?? state.noradId,
        overallScore: state.overallScore,
        moduleScores: parseModuleScores(state.moduleScores),
        horizonDays: state.horizonDays,
        horizonRegulation: state.horizonRegulation,
        activeAlertCount: alertCounts.get(state.noradId) ?? 0,
        orbitType: orbitMap.get(state.noradId) ?? undefined,
      }));
    }

    // ── Load history for trend/correlation ───────────────────────────────

    let historyData: SatelliteHistoryData[] | undefined;

    if (snapshots.length > 0) {
      const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);
      const noradIds = snapshots.map((s) => s.noradId);

      const records = await prisma.satelliteComplianceStateHistory.findMany({
        where: {
          operatorId: membership.organizationId,
          noradId: { in: noradIds },
          calculatedAt: { gte: since },
        },
        orderBy: { calculatedAt: "asc" },
      });

      // Group by satellite
      const byNorad = new Map<string, number[]>();
      for (const record of records) {
        let arr = byNorad.get(record.noradId);
        if (!arr) {
          arr = [];
          byNorad.set(record.noradId, arr);
        }
        arr.push(record.overallScore);
      }

      const nameMap = new Map(snapshots.map((s) => [s.noradId, s.name]));
      historyData = Array.from(byNorad).map(([noradId, scores]) => ({
        noradId,
        name: nameMap.get(noradId) ?? noradId,
        scores,
      }));
    }

    // ── Run fleet intelligence ──────────────────────────────────────────

    const intelligence = getFleetIntelligence();
    const report = intelligence.analyze(snapshots, historyData);

    // ── Optional: Industry Benchmark ────────────────────────────────────

    let benchmark = null;

    if (includeBenchmark) {
      try {
        // Load aggregated data from ALL operators (anonymized)
        const allStates = await prisma.satelliteComplianceState.findMany({
          where: {}, // All operators
        });

        // Group by operator
        const operatorMap = new Map<
          string,
          { scores: number[]; horizons: number[]; alerts: number }
        >();

        for (const state of allStates) {
          let entry = operatorMap.get(state.operatorId);
          if (!entry) {
            entry = { scores: [], horizons: [], alerts: 0 };
            operatorMap.set(state.operatorId, entry);
          }
          entry.scores.push(state.overallScore);
          if (state.horizonDays && state.horizonDays > 0) {
            entry.horizons.push(state.horizonDays);
          }
        }

        // Load spacecraft counts and orbit types per org
        const allSpacecraft = await prisma.spacecraft.findMany({
          where: { noradId: { not: null } },
          select: {
            organizationId: true,
            orbitType: true,
          },
        });

        const orgSpacecraft = new Map<
          string,
          { count: number; orbits: string[] }
        >();
        for (const sc of allSpacecraft) {
          let entry = orgSpacecraft.get(sc.organizationId);
          if (!entry) {
            entry = { count: 0, orbits: [] };
            orgSpacecraft.set(sc.organizationId, entry);
          }
          entry.count++;
          if (sc.orbitType) entry.orbits.push(sc.orbitType);
        }

        const operatorData: OperatorData[] = Array.from(operatorMap).map(
          ([opId, data]) => {
            const avgScore =
              data.scores.length > 0
                ? data.scores.reduce((s, v) => s + v, 0) / data.scores.length
                : 0;
            const avgHorizon =
              data.horizons.length > 0
                ? Math.round(
                    data.horizons.reduce((s, v) => s + v, 0) /
                      data.horizons.length,
                  )
                : null;

            const scData = orgSpacecraft.get(opId);
            // Determine primary orbit (most common)
            const orbitCounts = new Map<string, number>();
            for (const orbit of scData?.orbits ?? []) {
              orbitCounts.set(orbit, (orbitCounts.get(orbit) ?? 0) + 1);
            }
            let primaryOrbit: string | null = null;
            let maxOrbitCount = 0;
            for (const [orbit, count] of Array.from(orbitCounts)) {
              if (count > maxOrbitCount) {
                primaryOrbit = orbit;
                maxOrbitCount = count;
              }
            }

            return {
              operatorId: opId,
              fleetScore: Math.round(avgScore * 10) / 10,
              horizonDays: avgHorizon,
              activeAlerts: data.alerts,
              satelliteCount: scData?.count ?? data.scores.length,
              primaryOrbit,
            };
          },
        );

        const benchmarkEngine = getDefaultBenchmarkEngine();
        benchmark = benchmarkEngine.generateReport(
          operatorData,
          membership.organizationId,
        );
      } catch (error) {
        logger.error("[Fleet Intelligence] Benchmark error", error);
        // Non-fatal — return fleet intelligence without benchmark
      }
    }

    logger.info("[Fleet Intelligence] Report generated", {
      fleetSize: report.fleetSize,
      fleetScore: report.fleetScore,
      anomalies: report.correlationMatrix.length,
      hasBenchmark: benchmark !== null,
    });

    return NextResponse.json({
      data: report,
      ...(benchmark ? { benchmark } : {}),
    });
  } catch (error) {
    logger.error("[Fleet Intelligence] API error", error);
    return NextResponse.json(
      {
        error: "Fleet intelligence failed",
        message: getSafeErrorMessage(error, "Fleet intelligence failed"),
      },
      { status: 500 },
    );
  }
}
