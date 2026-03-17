import "server-only";
import type { RiskTier, ConjunctionStatus } from "@prisma/client";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FleetRiskSummary {
  totalSatellites: number;
  satellitesWithActiveEvents: number;
  totalActiveEvents: number;
  emergencyCount: number;
  highCount: number;
  overdueDecisions: number;
  satellites: FleetSatelliteStatus[];
}

export interface FleetSatelliteStatus {
  noradId: string;
  name: string;
  activeEventCount: number;
  highestTier: RiskTier | null;
  oldestUnresolvedTca: Date | null;
  maneuversThisMonth: number;
}

export interface SatelliteForecast {
  noradId: string;
  satelliteName: string;
  expectedConjunctions7d: number;
  dailyAverage: number;
  confidence: "high" | "medium" | "low" | "insufficient_data";
  trend: "increasing" | "stable" | "decreasing";
  dataWindowDays: number;
}

export interface ConjunctionAnomaly {
  noradId: string;
  satelliteName: string;
  type: "fleet_anomaly" | "critical_anomaly" | "surge";
  message: string;
  currentFrequency: number;
  baselineFrequency: number;
  zScore: number | null;
}

export interface PrioritizedEvent {
  eventId: string;
  priorityScore: number;
  conjunctionId: string;
  satelliteName: string;
  tier: RiskTier;
  status: ConjunctionStatus;
  tca: Date;
  hoursToTca: number;
  hoursWithoutDecision: number | null;
  pc: number;
}

export interface FleetManeuverSummary {
  period: "week" | "month";
  totalEvents: number;
  maneuversExecuted: number;
  risksAccepted: number;
  autoClosedEvents: number;
  totalDeltaV: number;
  averageResponseTimeHours: number;
}

interface EventInput {
  eventId: string;
  tier: RiskTier;
  status: ConjunctionStatus;
  tca: Date;
  pc: number;
  conjunctionId: string;
  satelliteName: string;
  decisionMadeAt?: Date | null;
  statusChangedAt?: Date | null;
}

interface SatelliteFreqInput {
  noradId: string;
  name: string;
  cdmsPerDay: number;
}

// ─── Pure Functions ───────────────────────────────────────────────────────────

const TIER_WEIGHTS: Record<RiskTier, number> = {
  EMERGENCY: 100,
  HIGH: 50,
  ELEVATED: 20,
  MONITOR: 5,
  INFORMATIONAL: 1,
};

export function prioritizeEvents(events: EventInput[]): PrioritizedEvent[] {
  if (events.length === 0) return [];

  const now = Date.now();

  return events
    .map((e) => {
      const hoursToTca = Math.max(0, (e.tca.getTime() - now) / 3600000);
      const urgencyFactor =
        hoursToTca < 24 ? 10 : hoursToTca < 48 ? 5 : hoursToTca < 168 ? 2 : 1;

      let stalenessFactor = 1;
      if (e.status === "ASSESSMENT_REQUIRED" && !e.decisionMadeAt) {
        const waitingHours = e.statusChangedAt
          ? (now - e.statusChangedAt.getTime()) / 3600000
          : 0;
        stalenessFactor =
          waitingHours > 24
            ? 3
            : waitingHours > 12
              ? 2
              : waitingHours > 6
                ? 1.5
                : 1;
      }

      const priorityScore =
        TIER_WEIGHTS[e.tier] * urgencyFactor * stalenessFactor;

      return {
        eventId: e.eventId,
        priorityScore,
        conjunctionId: e.conjunctionId,
        satelliteName: e.satelliteName,
        tier: e.tier,
        status: e.status,
        tca: e.tca,
        hoursToTca,
        hoursWithoutDecision:
          e.statusChangedAt && !e.decisionMadeAt
            ? (now - e.statusChangedAt.getTime()) / 3600000
            : null,
        pc: e.pc,
      };
    })
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

export function detectAnomaliesFromData(
  satelliteFreqs: SatelliteFreqInput[],
): ConjunctionAnomaly[] {
  if (satelliteFreqs.length < 2) return [];

  const freqs = satelliteFreqs.map((s) => s.cdmsPerDay);
  const mean = freqs.reduce((a, b) => a + b, 0) / freqs.length;
  const variance =
    freqs.reduce((sum, f) => sum + (f - mean) ** 2, 0) / freqs.length;
  const stddev = Math.sqrt(variance);

  if (stddev === 0) return [];

  const anomalies: ConjunctionAnomaly[] = [];

  for (const sat of satelliteFreqs) {
    const z = (sat.cdmsPerDay - mean) / stddev;
    // Use relative deviation as primary signal; Z-score provides additional context.
    // A satellite is anomalous when its rate is > 2x the fleet average (relative anomaly)
    // or extremely high by absolute Z-score (> 3). This handles small-fleet cases where
    // a single outlier dominates the mean and Z-scores are compressed.
    const relDev = mean > 0 ? sat.cdmsPerDay / mean : 0;

    if (relDev > 4.0 || z > 3.0) {
      anomalies.push({
        noradId: sat.noradId,
        satelliteName: sat.name,
        type: "critical_anomaly",
        message: `${sat.name} has extreme conjunction frequency: ${sat.cdmsPerDay.toFixed(1)} CDMs/day (fleet avg: ${mean.toFixed(1)})`,
        currentFrequency: sat.cdmsPerDay,
        baselineFrequency: mean,
        zScore: z,
      });
    } else if (relDev > 2.0 || z > 2.0) {
      anomalies.push({
        noradId: sat.noradId,
        satelliteName: sat.name,
        type: "fleet_anomaly",
        message: `${sat.name} is significantly above fleet average: ${sat.cdmsPerDay.toFixed(1)} CDMs/day (fleet avg: ${mean.toFixed(1)})`,
        currentFrequency: sat.cdmsPerDay,
        baselineFrequency: mean,
        zScore: z,
      });
    }
  }

  return anomalies;
}

// ─── DB-Dependent Functions ───────────────────────────────────────────────────

import { prisma } from "@/lib/prisma";

export async function computeFleetRiskSummary(
  orgId: string,
): Promise<FleetRiskSummary> {
  const tierOrder: RiskTier[] = [
    "EMERGENCY",
    "HIGH",
    "ELEVATED",
    "MONITOR",
    "INFORMATIONAL",
  ];

  const [spacecraft, events] = await Promise.all([
    prisma.spacecraft.findMany({
      where: { organizationId: orgId, noradId: { not: null } },
      select: { noradId: true, name: true },
    }),
    prisma.conjunctionEvent.findMany({
      where: {
        organizationId: orgId,
        status: { notIn: ["CLOSED"] },
      },
      select: {
        id: true,
        conjunctionId: true,
        riskTier: true,
        status: true,
        tca: true,
        noradId: true,
        threatNoradId: true,
        decisionAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const noradIds = new Set(spacecraft.map((s) => s.noradId!));
  const satMap = new Map<string, { events: typeof events; name: string }>();
  for (const sc of spacecraft) {
    satMap.set(sc.noradId!, { events: [], name: sc.name });
  }

  for (const event of events) {
    const ourNorad = noradIds.has(event.noradId)
      ? event.noradId
      : noradIds.has(event.threatNoradId)
        ? event.threatNoradId
        : null;
    if (ourNorad && satMap.has(ourNorad)) {
      satMap.get(ourNorad)!.events.push(event);
    }
  }

  const satellites: FleetSatelliteStatus[] = Array.from(satMap.entries())
    .map(([noradId, data]) => {
      const highestTier =
        data.events.length > 0
          ? (tierOrder.find((t) => data.events.some((e) => e.riskTier === t)) ??
            null)
          : null;
      const unresolved = data.events.filter((e) => e.tca).map((e) => e.tca!);
      const oldest =
        unresolved.length > 0
          ? new Date(Math.min(...unresolved.map((d) => d.getTime())))
          : null;

      return {
        noradId,
        name: data.name,
        activeEventCount: data.events.length,
        highestTier,
        oldestUnresolvedTca: oldest,
        maneuversThisMonth: 0,
      };
    })
    .sort((a, b) => {
      const aIdx = a.highestTier ? tierOrder.indexOf(a.highestTier) : 999;
      const bIdx = b.highestTier ? tierOrder.indexOf(b.highestTier) : 999;
      return aIdx - bIdx;
    });

  return {
    totalSatellites: spacecraft.length,
    satellitesWithActiveEvents: satellites.filter((s) => s.activeEventCount > 0)
      .length,
    totalActiveEvents: events.length,
    emergencyCount: events.filter((e) => e.riskTier === "EMERGENCY").length,
    highCount: events.filter((e) => e.riskTier === "HIGH").length,
    overdueDecisions: events.filter(
      (e) =>
        e.status === "ASSESSMENT_REQUIRED" &&
        !e.decisionAt &&
        e.updatedAt &&
        Date.now() - e.updatedAt.getTime() > 24 * 3600000,
    ).length,
    satellites,
  };
}

export async function computeConjunctionForecast(
  orgId: string,
): Promise<SatelliteForecast[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600000);
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600000);

  const spacecraft = await prisma.spacecraft.findMany({
    where: { organizationId: orgId, noradId: { not: null } },
    select: { noradId: true, name: true },
  });

  const forecasts: SatelliteForecast[] = [];

  for (const sc of spacecraft) {
    const cdmCount30d = await prisma.cDMRecord.count({
      where: {
        conjunctionEvent: { organizationId: orgId },
        OR: [
          { conjunctionEvent: { noradId: sc.noradId! } },
          { conjunctionEvent: { threatNoradId: sc.noradId! } },
        ],
        createdAt: { gte: thirtyDaysAgo },
      },
    });

    const cdmCount7d = await prisma.cDMRecord.count({
      where: {
        conjunctionEvent: { organizationId: orgId },
        OR: [
          { conjunctionEvent: { noradId: sc.noradId! } },
          { conjunctionEvent: { threatNoradId: sc.noradId! } },
        ],
        createdAt: { gte: sevenDaysAgo },
      },
    });

    const firstCdm = await prisma.cDMRecord.findFirst({
      where: {
        conjunctionEvent: { organizationId: orgId },
        OR: [
          { conjunctionEvent: { noradId: sc.noradId! } },
          { conjunctionEvent: { threatNoradId: sc.noradId! } },
        ],
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    });

    const dataWindowDays = firstCdm
      ? Math.ceil((Date.now() - firstCdm.createdAt.getTime()) / (24 * 3600000))
      : 0;

    if (dataWindowDays < 1) {
      forecasts.push({
        noradId: sc.noradId!,
        satelliteName: sc.name,
        expectedConjunctions7d: 0,
        dailyAverage: 0,
        confidence: "insufficient_data",
        trend: "stable",
        dataWindowDays: 0,
      });
      continue;
    }

    const effectiveDays = Math.min(dataWindowDays, 30);
    const dailyAvg = cdmCount30d / effectiveDays;
    const recentDailyAvg = cdmCount7d / Math.min(dataWindowDays, 7);
    const expected7d = dailyAvg * 7;

    const confidence =
      dataWindowDays >= 21 ? "high" : dataWindowDays >= 7 ? "medium" : "low";
    const trend =
      dataWindowDays >= 7
        ? recentDailyAvg > dailyAvg * 1.3
          ? "increasing"
          : recentDailyAvg < dailyAvg * 0.7
            ? "decreasing"
            : "stable"
        : "stable";

    forecasts.push({
      noradId: sc.noradId!,
      satelliteName: sc.name,
      expectedConjunctions7d: Math.round(expected7d * 10) / 10,
      dailyAverage: Math.round(dailyAvg * 100) / 100,
      confidence,
      trend,
      dataWindowDays,
    });
  }

  return forecasts.sort(
    (a, b) => b.expectedConjunctions7d - a.expectedConjunctions7d,
  );
}

export async function computeFleetManeuverSummary(
  orgId: string,
  period: "week" | "month",
): Promise<FleetManeuverSummary> {
  const since = new Date(
    Date.now() - (period === "week" ? 7 : 30) * 24 * 3600000,
  );

  const events = await prisma.conjunctionEvent.findMany({
    where: {
      organizationId: orgId,
      updatedAt: { gte: since },
    },
    select: {
      status: true,
      decision: true,
      fuelConsumedPct: true,
      updatedAt: true,
      decisionAt: true,
      createdAt: true,
    },
  });

  const maneuvers = events.filter((e) => e.decision === "MANEUVER");
  const accepted = events.filter((e) => e.decision === "ACCEPT_RISK");
  const autoClosed = events.filter((e) => e.status === "CLOSED" && !e.decision);

  const totalDeltaV = maneuvers.reduce(
    (sum, e) => sum + (e.fuelConsumedPct || 0),
    0,
  );

  const responseTimes = events
    .filter((e) => e.decisionAt && e.createdAt)
    .map((e) => (e.decisionAt!.getTime() - e.createdAt.getTime()) / 3600000);
  const avgResponse =
    responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

  return {
    period,
    totalEvents: events.length,
    maneuversExecuted: maneuvers.length,
    risksAccepted: accepted.length,
    autoClosedEvents: autoClosed.length,
    totalDeltaV: Math.round(totalDeltaV * 100) / 100,
    averageResponseTimeHours: Math.round(avgResponse * 10) / 10,
  };
}
