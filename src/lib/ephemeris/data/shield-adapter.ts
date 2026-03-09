import "server-only";
import type { PrismaClient } from "@prisma/client";

/**
 * Shield Ephemeris Data Adapter
 *
 * Feeds Shield conjunction assessment data into the Ephemeris compliance
 * scoring pipeline. Pure functions handle logic (unit-testable without DB),
 * database functions handle Prisma queries.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

type ComplianceStatus = "COMPLIANT" | "WARNING" | "NON_COMPLIANT" | "UNKNOWN";

interface CAComplianceFactor {
  key: string;
  label: string;
  status: ComplianceStatus;
  score: number; // 0-100
  detail: string;
  measuredAt: Date;
}

interface ShieldEventInput {
  riskTier: string;
  status: string;
  tca: Date;
  latestPc: number;
  decision: string | null;
}

interface ShieldStatusResult {
  connected: boolean;
  activeEvents: number;
  lastPollAt: string | null;
  source: string;
}

// ─── Tier severity ordering (higher index = worse) ───────────────────────────

const TIER_SEVERITY: Record<string, number> = {
  INFORMATIONAL: 0,
  MONITOR: 1,
  ELEVATED: 2,
  HIGH: 3,
  EMERGENCY: 4,
};

// ─── Pure Functions ───────────────────────────────────────────────────────────

/**
 * Map a Shield risk tier to an Ephemeris compliance status.
 */
export function mapTierToStatus(riskTier: string): ComplianceStatus {
  switch (riskTier) {
    case "EMERGENCY":
      return "NON_COMPLIANT";
    case "HIGH":
    case "ELEVATED":
      return "WARNING";
    case "MONITOR":
    case "INFORMATIONAL":
      return "COMPLIANT";
    default:
      return "UNKNOWN";
  }
}

/**
 * Compute a CA compliance factor from active conjunction events.
 *
 * Scoring logic:
 * - No events → COMPLIANT, score 100
 * - All events have decisions → COMPLIANT, score max(70, 100 - count*5)
 * - Otherwise: worst tier determines status; base score minus 5 per undecided event
 */
export function computeCAComplianceFactor(
  activeEvents: ShieldEventInput[],
): CAComplianceFactor {
  const now = new Date();

  // No active events — fully compliant
  if (activeEvents.length === 0) {
    return {
      key: "shield_ca",
      label: "Collision Avoidance",
      status: "COMPLIANT",
      score: 100,
      detail: "No active conjunction events",
      measuredAt: now,
    };
  }

  // Check if all events have decisions
  const allDecided = activeEvents.every((e) => e.decision !== null);

  if (allDecided) {
    const score = Math.max(70, 100 - activeEvents.length * 5);
    return {
      key: "shield_ca",
      label: "Collision Avoidance",
      status: "COMPLIANT",
      score,
      detail: `${activeEvents.length} event(s) with documented decisions`,
      measuredAt: now,
    };
  }

  // Find the worst tier among all active events
  let worstTier = "INFORMATIONAL";
  let undecidedCount = 0;

  for (const event of activeEvents) {
    const severity = TIER_SEVERITY[event.riskTier] ?? -1;
    const worstSeverity = TIER_SEVERITY[worstTier] ?? -1;
    if (severity > worstSeverity) {
      worstTier = event.riskTier;
    }
    if (event.decision === null) {
      undecidedCount++;
    }
  }

  const status = mapTierToStatus(worstTier);

  // Base score by compliance status
  let baseScore: number;
  switch (status) {
    case "NON_COMPLIANT":
      baseScore = 20;
      break;
    case "WARNING":
      baseScore = 60;
      break;
    case "COMPLIANT":
      baseScore = 90;
      break;
    default:
      baseScore = 50;
  }

  const score = Math.max(0, baseScore - undecidedCount * 5);

  return {
    key: "shield_ca",
    label: "Collision Avoidance",
    status,
    score,
    detail: `${activeEvents.length} active event(s), ${undecidedCount} pending decision`,
    measuredAt: now,
  };
}

/**
 * Build a Shield data-source status object.
 */
export function getShieldStatus(
  activeEventCount: number,
  configExists: boolean,
): ShieldStatusResult {
  return {
    connected: configExists,
    activeEvents: activeEventCount,
    lastPollAt: null,
    source: "Shield CDM Polling",
  };
}

// ─── Database Functions ───────────────────────────────────────────────────────

/**
 * Get the Shield CA compliance factor for a specific satellite.
 * Queries non-CLOSED conjunction events and computes the compliance factor.
 */
export async function getShieldComplianceFactors(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
): Promise<CAComplianceFactor> {
  try {
    const events = await prisma.conjunctionEvent.findMany({
      where: {
        organizationId: orgId,
        noradId,
        status: { not: "CLOSED" },
      },
      select: {
        riskTier: true,
        status: true,
        tca: true,
        latestPc: true,
        decision: true,
      },
    });

    const inputs: ShieldEventInput[] = events.map((e) => ({
      riskTier: e.riskTier,
      status: e.status,
      tca: e.tca,
      latestPc: e.latestPc,
      decision: e.decision,
    }));

    return computeCAComplianceFactor(inputs);
  } catch {
    // On error, return unknown status
    return {
      key: "shield_ca",
      label: "Collision Avoidance",
      status: "UNKNOWN",
      score: 0,
      detail: "Unable to fetch conjunction data",
      measuredAt: new Date(),
    };
  }
}

/**
 * Get Shield data source status for an organization.
 */
export async function getShieldDataSourceStatus(
  prisma: PrismaClient,
  orgId: string,
): Promise<ShieldStatusResult> {
  try {
    const [config, eventCount] = await Promise.all([
      prisma.cAConfig.findUnique({
        where: { organizationId: orgId },
        select: { id: true },
      }),
      prisma.conjunctionEvent.count({
        where: {
          organizationId: orgId,
          status: { not: "CLOSED" },
        },
      }),
    ]);

    return getShieldStatus(eventCount, config !== null);
  } catch {
    return getShieldStatus(0, false);
  }
}
