import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { notifyOrganization } from "@/lib/services/notification-service";
import type { CascadeResult } from "@/lib/ephemeris/cascade/dependency-graph";

/**
 * Generate alerts from a cascade simulation result.
 * Only creates alerts for satellites with WARNING or CRITICAL severity impacts.
 *
 * Uses the existing SatelliteAlert model with dedupeKey pattern to prevent
 * duplicate alerts from repeated cascade simulations.
 *
 * @returns Number of alerts generated
 */
export async function generateCascadeAlerts(
  orgId: string,
  cascade: CascadeResult,
): Promise<number> {
  const db = prisma as unknown as Record<string, unknown>;
  const alertModel = db["satelliteAlert"] as
    | {
        findFirst: (
          args: Record<string, unknown>,
        ) => Promise<{ id: string } | null>;
        create: (args: Record<string, unknown>) => Promise<unknown>;
      }
    | undefined;

  if (!alertModel) return 0;

  let generated = 0;
  const propagationSummary = cascade.propagationPath
    .map((level, i) => `L${i}: ${level.join(", ")}`)
    .join(" → ");

  for (const sat of cascade.affectedSatellites) {
    // Only alert on HIGH+ severity
    if (sat.severity !== "CRITICAL" && sat.severity !== "HIGH") continue;

    const dedupeKey = `${sat.noradId}_CASCADE_${cascade.trigger}`;

    // Check if active alert already exists for this cascade trigger
    const existing = await alertModel.findFirst({
      where: {
        noradId: sat.noradId,
        operatorId: orgId,
        dedupeKey,
        resolvedAt: null,
      },
    });

    if (existing) continue; // Already alerted

    const affectedModulesStr = sat.affectedModules.join(", ");
    const title =
      sat.severity === "CRITICAL"
        ? `Regulatory cascade: critical impact on ${sat.name}`
        : `Regulatory cascade: warning for ${sat.name}`;

    const message = [
      `Trigger: ${cascade.trigger} (${cascade.changeType})`,
      `Affected modules: ${affectedModulesStr}`,
      `Score impact: ${sat.scoreDelta > 0 ? "+" : ""}${sat.scoreDelta} points`,
      sat.currentScore !== null && sat.projectedScore !== null
        ? `Projected score: ${sat.currentScore} → ${sat.projectedScore}`
        : null,
      `Cascade path: ${propagationSummary}`,
      `${cascade.affectedNodes.length} regulatory nodes affected across ${new Set(cascade.propagationPath.flat()).size} frameworks`,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await alertModel.create({
        data: {
          noradId: sat.noradId,
          operatorId: orgId,
          type: "REGULATORY_CHANGE",
          severity: sat.severity,
          title,
          description: message,
          regulationRef: cascade.trigger,
          dedupeKey,
        },
      });

      // Send notification
      await notifyOrganization(
        orgId,
        sat.severity === "CRITICAL"
          ? "COMPLIANCE_ACTION_REQUIRED"
          : "COMPLIANCE_SCORE_DROPPED",
        `[${sat.name}] ${title}`,
        message,
        {
          entityType: "spacecraft",
          entityId: sat.noradId,
          severity: sat.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
          actionUrl: `/dashboard/ephemeris/${sat.noradId}`,
        },
      );

      generated++;
    } catch (error) {
      logger.error(
        `[Cascade Alert] Failed for ${sat.noradId}: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }
  }

  if (generated > 0) {
    logger.info(`[Cascade Alert] Generated ${generated} alerts`, {
      trigger: cascade.trigger,
      changeType: cascade.changeType,
    });
  }

  return generated;
}
