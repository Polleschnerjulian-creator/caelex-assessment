import "server-only";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { SentinelTimeSeries, TimeSeriesPoint } from "../core/types";
import { METRIC_RANGES } from "../core/constants";

/**
 * Transform SentinelPackets into time series for fuel, subsystems, cyber metrics.
 *
 * Queries the latest N days of SentinelPacket data for a given satellite + metric,
 * returns validated, sorted time series points.
 */
export async function getSentinelTimeSeries(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
  dataPoint: string,
  days: number = 365,
): Promise<SentinelTimeSeries> {
  safeLog("Fetching Sentinel time series", { orgId, noradId, dataPoint, days });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  try {
    // Find active Sentinel agents for this org
    const agents = await prisma.sentinelAgent.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { id: true },
    });

    if (agents.length === 0) {
      return { metric: dataPoint, noradId, points: [] };
    }

    const agentIds = agents.map((a) => a.id);

    // Fetch packets for this satellite + dataPoint
    const packets = await prisma.sentinelPacket.findMany({
      where: {
        agentId: { in: agentIds },
        satelliteNorad: noradId,
        dataPoint,
        collectedAt: { gte: cutoff },
      },
      orderBy: { collectedAt: "asc" },
      select: {
        values: true,
        collectedAt: true,
        sourceSystem: true,
        crossVerified: true,
        trustScore: true,
      },
    });

    const range = METRIC_RANGES[dataPoint];
    const points: TimeSeriesPoint[] = [];

    for (const packet of packets) {
      const values = packet.values as Record<string, unknown>;
      const rawValue = values[dataPoint];

      if (typeof rawValue !== "number") continue;

      // Validate range if defined
      if (range && (rawValue < range.min || rawValue > range.max)) {
        safeLog("Sentinel value out of range, skipping", {
          dataPoint,
          noradId,
        });
        continue;
      }

      // Map sourceSystem to collector category
      const source = mapSourceSystem(packet.sourceSystem);

      points.push({
        timestamp: packet.collectedAt.toISOString(),
        value: rawValue,
        source,
        verified: packet.crossVerified,
        trustScore: packet.trustScore ?? 0.5,
      });
    }

    safeLog("Sentinel time series loaded", {
      noradId,
      dataPoint,
      pointCount: points.length,
    });

    return { metric: dataPoint, noradId, points };
  } catch (error) {
    safeLog("Error fetching Sentinel time series", {
      noradId,
      dataPoint,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { metric: dataPoint, noradId, points: [] };
  }
}

/**
 * Get the latest single value for a metric from Sentinel.
 * Returns null if no data available.
 */
export async function getLatestSentinelValue(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
  dataPoint: string,
): Promise<{ value: number; collectedAt: Date; trustScore: number } | null> {
  try {
    const agents = await prisma.sentinelAgent.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { id: true },
    });

    if (agents.length === 0) return null;

    const packet = await prisma.sentinelPacket.findFirst({
      where: {
        agentId: { in: agents.map((a) => a.id) },
        satelliteNorad: noradId,
        dataPoint,
      },
      orderBy: { collectedAt: "desc" },
      select: {
        values: true,
        collectedAt: true,
        trustScore: true,
      },
    });

    if (!packet) return null;

    const values = packet.values as Record<string, unknown>;
    const rawValue = values[dataPoint];

    if (typeof rawValue !== "number") return null;

    return {
      value: rawValue,
      collectedAt: packet.collectedAt,
      trustScore: packet.trustScore ?? 0.5,
    };
  } catch {
    return null;
  }
}

/**
 * Get Sentinel connection status for a satellite.
 */
export async function getSentinelStatus(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
): Promise<{
  connected: boolean;
  lastPacket: string | null;
  packetsLast24h: number;
}> {
  try {
    const agents = await prisma.sentinelAgent.findMany({
      where: { organizationId: orgId, status: "ACTIVE" },
      select: { id: true },
    });

    if (agents.length === 0) {
      return { connected: false, lastPacket: null, packetsLast24h: 0 };
    }

    const agentIds = agents.map((a) => a.id);
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const [lastPacket, recentCount] = await Promise.all([
      prisma.sentinelPacket.findFirst({
        where: { agentId: { in: agentIds }, satelliteNorad: noradId },
        orderBy: { collectedAt: "desc" },
        select: { collectedAt: true },
      }),
      prisma.sentinelPacket.count({
        where: {
          agentId: { in: agentIds },
          satelliteNorad: noradId,
          collectedAt: { gte: dayAgo },
        },
      }),
    ]);

    return {
      connected: recentCount > 0,
      lastPacket: lastPacket?.collectedAt.toISOString() ?? null,
      packetsLast24h: recentCount,
    };
  } catch {
    return { connected: false, lastPacket: null, packetsLast24h: 0 };
  }
}

function mapSourceSystem(
  sourceSystem: string,
): "orbit" | "cyber" | "ground" | "document" {
  const lower = sourceSystem.toLowerCase();
  if (lower.includes("orbit") || lower.includes("tle")) return "orbit";
  if (lower.includes("cyber") || lower.includes("nis2")) return "cyber";
  if (lower.includes("ground") || lower.includes("station")) return "ground";
  return "document";
}
