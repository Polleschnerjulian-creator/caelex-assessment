import "server-only";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { SentinelTimeSeries, TimeSeriesPoint } from "../core/types";
import { METRIC_RANGES } from "../core/constants";

/**
 * Request-scoped cache for Sentinel agent IDs.
 * Avoids repeating the same findMany query 6-8 times per satellite calculation.
 * Cache key: orgId → agentIds array. Cleared automatically after 30 seconds.
 */
const agentIdCache = new Map<string, { ids: string[]; fetchedAt: number }>();
const AGENT_CACHE_TTL = 30_000; // 30 seconds (request-scoped, short TTL)

/** Clear the agent ID cache (used in tests). */
export function clearAgentIdCache(): void {
  agentIdCache.clear();
}

async function getAgentIds(
  prisma: PrismaClient,
  orgId: string,
): Promise<string[]> {
  const cached = agentIdCache.get(orgId);
  if (cached && Date.now() - cached.fetchedAt < AGENT_CACHE_TTL) {
    return cached.ids;
  }

  const agents = await prisma.sentinelAgent.findMany({
    where: { organizationId: orgId, status: "ACTIVE" },
    select: { id: true },
  });

  const ids = agents.map((a) => a.id);
  agentIdCache.set(orgId, { ids, fetchedAt: Date.now() });
  return ids;
}

// ─── Metric → Packet Mapping ─────────────────────────────────────────────────
// The Sentinel agent sends broad data_point types (e.g. "orbital_parameters")
// with individual metrics as fields inside the values JSON. This map resolves
// which data_point types to query and which field names (aliases) to extract
// for each logical metric that the compliance engine requests.
//
// Format: metricName → { dataPoints: [...], aliases: [...] }
//   - dataPoints: DB dataPoint values to query (OR condition)
//   - aliases: field names to look for inside values JSON (tried in order)

const METRIC_FIELD_MAP: Record<
  string,
  { dataPoints: string[]; aliases: string[] }
> = {
  remaining_fuel_pct: {
    dataPoints: ["remaining_fuel_pct", "orbital_parameters"],
    aliases: ["remaining_fuel_pct"],
  },
  thruster_status: {
    dataPoints: ["thruster_status", "orbital_parameters"],
    aliases: ["thruster_status"],
  },
  battery_state_of_charge: {
    dataPoints: ["battery_state_of_charge", "orbital_parameters"],
    aliases: ["battery_state_of_charge", "battery_soc_pct"],
  },
  solar_array_power_pct: {
    dataPoints: ["solar_array_power_pct", "orbital_parameters"],
    aliases: ["solar_array_power_pct", "solar_array_power_w"],
  },
  patch_compliance_pct: {
    dataPoints: ["patch_compliance_pct", "cyber_posture"],
    aliases: ["patch_compliance_pct"],
  },
  mfa_adoption_pct: {
    dataPoints: ["mfa_adoption_pct", "cyber_posture"],
    aliases: ["mfa_adoption_pct"],
  },
};

// Metrics where the value is a status string, not a number.
// Mapped to numeric: "NOMINAL"→1, anything else→0
const STRING_METRIC_MAP: Record<string, Record<string, number>> = {
  thruster_status: {
    NOMINAL: 1,
    DEGRADED: 0.5,
    FAILED: 0,
  },
};

// solar_array_power_w is in watts — normalize to percentage (max ~1000W typical)
const UNIT_CONVERSIONS: Record<string, (value: number) => number> = {
  solar_array_power_w: (w) => Math.min(100, (w / 1000) * 100),
};

/**
 * Transform SentinelPackets into time series for fuel, subsystems, cyber metrics.
 *
 * Queries the latest N days of SentinelPacket data for a given satellite + metric,
 * returns validated, sorted time series points.
 *
 * Key behaviors:
 * - Searches across multiple data_point types (e.g. "remaining_fuel_pct" is found
 *   inside "orbital_parameters" packets)
 * - Resolves field name aliases (e.g. "battery_soc_pct" → "battery_state_of_charge")
 * - Converts string statuses to numeric (e.g. "NOMINAL" → 1)
 * - Converts units where needed (e.g. watts → percentage)
 * - Tolerates chain breaks: requires signatureValid=true but accepts chainValid=false
 *   with a trust score penalty
 */
const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export async function getSentinelTimeSeries(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
  dataPoint: string,
  days: number = 365,
): Promise<SentinelTimeSeries> {
  if (FORBIDDEN_KEYS.has(dataPoint)) {
    return { metric: dataPoint, noradId, points: [] };
  }

  safeLog("Fetching Sentinel time series", { orgId, noradId, dataPoint, days });

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  try {
    // Find active Sentinel agents for this org (cached within request)
    const agentIds = await getAgentIds(prisma, orgId);

    if (agentIds.length === 0) {
      return { metric: dataPoint, noradId, points: [] };
    }

    // Resolve which dataPoint types and field aliases to search
    const mapping = METRIC_FIELD_MAP[dataPoint];
    const queryDataPoints = mapping ? mapping.dataPoints : [dataPoint];
    const fieldAliases = mapping ? mapping.aliases : [dataPoint];

    // Fetch packets — search across all relevant dataPoint types.
    // Require signatureValid but tolerate chainValid=false (chain breaks
    // are common during initial agent setup and don't indicate tampering).
    const packets = await prisma.sentinelPacket.findMany({
      where: {
        agentId: { in: agentIds },
        satelliteNorad: noradId,
        dataPoint: { in: queryDataPoints },
        collectedAt: { gte: cutoff },
        signatureValid: true, // SVA-64: exclude tampered packets
      },
      orderBy: { collectedAt: "asc" },
      select: {
        values: true,
        collectedAt: true,
        sourceSystem: true,
        crossVerified: true,
        trustScore: true,
        chainValid: true,
      },
    });

    const range = METRIC_RANGES[dataPoint];
    const stringMap = STRING_METRIC_MAP[dataPoint];
    const points: TimeSeriesPoint[] = [];

    for (const packet of packets) {
      const values = packet.values as Record<string, unknown>;

      // Try each field alias in order until we find a value
      let rawValue: unknown = undefined;
      let matchedAlias: string | null = null;
      for (const alias of fieldAliases) {
        if (alias in values) {
          rawValue = values[alias];
          matchedAlias = alias;
          break;
        }
      }

      if (rawValue === undefined) continue;

      let numericValue: number;

      // Handle string metric values (e.g. thruster_status: "NOMINAL" → 1)
      if (typeof rawValue === "string" && stringMap) {
        const mapped = stringMap[rawValue];
        if (mapped === undefined) continue;
        numericValue = mapped;
      } else if (typeof rawValue === "number") {
        numericValue = rawValue;
      } else {
        continue;
      }

      // Apply unit conversion if the matched alias has one (e.g. watts → pct)
      if (matchedAlias && UNIT_CONVERSIONS[matchedAlias]) {
        numericValue = UNIT_CONVERSIONS[matchedAlias](numericValue);
      }

      // Validate range if defined
      if (range && (numericValue < range.min || numericValue > range.max)) {
        safeLog("Sentinel value out of range, skipping", {
          dataPoint,
          noradId,
        });
        continue;
      }

      // Map sourceSystem to collector category
      const source = mapSourceSystem(packet.sourceSystem);

      // Trust score penalty for broken chain (data is genuine but chain
      // integrity cannot be verified — reduce trust but still include)
      const baseTrust = packet.trustScore ?? 0.5;
      const trustScore = packet.chainValid ? baseTrust : baseTrust * 0.7;

      points.push({
        timestamp: packet.collectedAt.toISOString(),
        value: numericValue,
        source,
        verified: packet.crossVerified,
        trustScore,
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
    const agentIds = await getAgentIds(prisma, orgId);

    if (agentIds.length === 0) return null;

    // Resolve dataPoint types and field aliases
    const mapping = METRIC_FIELD_MAP[dataPoint];
    const queryDataPoints = mapping ? mapping.dataPoints : [dataPoint];
    const fieldAliases = mapping ? mapping.aliases : [dataPoint];
    const stringMap = STRING_METRIC_MAP[dataPoint];

    const packet = await prisma.sentinelPacket.findFirst({
      where: {
        agentId: { in: agentIds },
        satelliteNorad: noradId,
        dataPoint: { in: queryDataPoints },
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

    // Try each alias
    let rawValue: unknown = undefined;
    let matchedAlias: string | null = null;
    for (const alias of fieldAliases) {
      if (alias in values) {
        rawValue = values[alias];
        matchedAlias = alias;
        break;
      }
    }

    let numericValue: number;
    if (typeof rawValue === "string" && stringMap) {
      const mapped = stringMap[rawValue];
      if (mapped === undefined) return null;
      numericValue = mapped;
    } else if (typeof rawValue === "number") {
      numericValue = rawValue;
    } else {
      return null;
    }

    if (matchedAlias && UNIT_CONVERSIONS[matchedAlias]) {
      numericValue = UNIT_CONVERSIONS[matchedAlias](numericValue);
    }

    return {
      value: numericValue,
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
    const agentIds = await getAgentIds(prisma, orgId);

    if (agentIds.length === 0) {
      return { connected: false, lastPacket: null, packetsLast24h: 0 };
    }

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
