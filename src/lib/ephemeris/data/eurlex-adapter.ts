import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { PrismaClient } from "@prisma/client";
import type { RegulatoryChangeImpact, AlertSeverity } from "../core/types";

/**
 * EUR-Lex Regulatory Change Adapter
 *
 * Reads recent RegulatoryUpdate records from the database (populated by
 * the regulatory-feed cron at 7 AM UTC) and transforms them into
 * RegulatoryChangeImpact objects for the Ephemeris compliance engine.
 */

const SEVERITY_MAP: Record<string, AlertSeverity> = {
  CRITICAL: "CRITICAL",
  HIGH: "HIGH",
  MEDIUM: "MEDIUM",
  LOW: "LOW",
};

/**
 * Get recent regulatory changes affecting space operations.
 * Reads from the RegulatoryUpdate table (last 30 days).
 */
export async function getRegulatoryChanges(
  db: PrismaClient,
): Promise<RegulatoryChangeImpact[]> {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const updates = await db.regulatoryUpdate.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { publishedAt: "desc" },
    });

    if (updates.length === 0) {
      safeLog("EUR-Lex adapter: no recent regulatory updates");
      return [];
    }

    safeLog("EUR-Lex adapter: found regulatory updates", {
      count: updates.length,
    });

    return updates.map((update) => toRegulatoryChangeImpact(update));
  } catch (error) {
    safeLog("EUR-Lex adapter: DB read failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return [];
  }
}

/**
 * Check if there are pending regulatory changes that affect a specific satellite.
 */
export async function hasPendingRegulatoryChanges(
  db: PrismaClient,
  _noradId: string,
): Promise<boolean> {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const count = await db.regulatoryUpdate.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        severity: { in: ["CRITICAL", "HIGH"] },
      },
    });

    return count > 0;
  } catch {
    return false;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function toRegulatoryChangeImpact(update: {
  id: string;
  celexNumber: string;
  title: string;
  sourceUrl: string;
  publishedAt: Date;
  severity: string;
  affectedModules: string[];
}): RegulatoryChangeImpact {
  return {
    event: {
      id: update.id,
      title: update.title,
      eurLexUrl: update.sourceUrl,
      publishedAt: update.publishedAt.toISOString(),
      severity: SEVERITY_MAP[update.severity] ?? "LOW",
    },
    affectedSatellites: [], // Populated downstream by the compliance engine
    totalAffected: 0,
    worstCaseImpact: getWorstCaseDescription(
      update.severity,
      update.affectedModules,
    ),
  };
}

function getWorstCaseDescription(
  severity: string,
  affectedModules: string[],
): string {
  const modules =
    affectedModules.length > 0
      ? affectedModules.join(", ")
      : "general compliance";

  switch (severity) {
    case "CRITICAL":
      return `Critical regulatory change affecting ${modules} — immediate compliance review required`;
    case "HIGH":
      return `High-priority regulatory change affecting ${modules} — compliance reassessment recommended`;
    case "MEDIUM":
      return `New regulatory requirements for ${modules} — review within 30 days`;
    default:
      return `Minor regulatory update for ${modules} — informational`;
  }
}
