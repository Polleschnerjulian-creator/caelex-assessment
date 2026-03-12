import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { notifyOrganization } from "@/lib/services/notification-service";
import type { AnomalyReport } from "@/lib/ephemeris/anomaly/anomaly-detector";

/**
 * Generate alerts from an anomaly detection report.
 * Only creates alerts for WARNING (HIGH) or CRITICAL anomalies.
 *
 * Uses the existing SatelliteAlert model with dedupeKey pattern to prevent
 * duplicate alerts from repeated anomaly scans.
 *
 * @returns Number of alerts generated
 */
export async function generateAnomalyAlerts(
  orgId: string,
  report: AnomalyReport,
): Promise<number> {
  let generated = 0;

  for (const anomaly of report.anomalies) {
    // Only alert on HIGH+ severity
    if (anomaly.severity !== "CRITICAL" && anomaly.severity !== "HIGH")
      continue;

    const dedupeKey = `${anomaly.noradId}_ANOMALY_${anomaly.type}`;

    // Check if active alert already exists for this anomaly type
    const existing = await prisma.satelliteAlert.findFirst({
      where: {
        noradId: anomaly.noradId,
        operatorId: orgId,
        dedupeKey,
        resolvedAt: null,
      },
    });

    if (existing) continue; // Already alerted

    const title =
      anomaly.severity === "CRITICAL"
        ? `Anomaly detected: critical — ${anomaly.satelliteName}`
        : `Anomaly detected: warning — ${anomaly.satelliteName}`;

    const message = [
      `Type: ${anomaly.type} (${anomaly.method})`,
      `Expected: ${anomaly.expected}, Observed: ${anomaly.observed}`,
      `Deviation: ${anomaly.deviation}`,
      anomaly.module ? `Module: ${anomaly.module}` : null,
      anomaly.relatedSatellites?.length
        ? `Related satellites: ${anomaly.relatedSatellites.join(", ")}`
        : null,
      anomaly.description,
    ]
      .filter(Boolean)
      .join("\n");

    try {
      await prisma.satelliteAlert.create({
        data: {
          noradId: anomaly.noradId,
          operatorId: orgId,
          type: "ANOMALY",
          severity: anomaly.severity,
          title,
          description: message,
          regulationRef: null,
          dedupeKey,
        },
      });

      // Send notification
      await notifyOrganization(
        orgId,
        anomaly.severity === "CRITICAL"
          ? "COMPLIANCE_ACTION_REQUIRED"
          : "COMPLIANCE_SCORE_DROPPED",
        `[${anomaly.satelliteName}] ${title}`,
        message,
        {
          entityType: "spacecraft",
          entityId: anomaly.noradId,
          severity: anomaly.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
          actionUrl: `/dashboard/ephemeris/${anomaly.noradId}`,
        },
      );

      generated++;
    } catch (error) {
      logger.error(
        `[Anomaly Alert] Failed for ${anomaly.noradId}: ${error instanceof Error ? error.message : "Unknown"}`,
      );
    }
  }

  if (generated > 0) {
    logger.info(`[Anomaly Alert] Generated ${generated} alerts`, {
      totalAnomalies: report.summary.totalAnomalies,
      criticalCount: report.summary.criticalCount,
    });
  }

  return generated;
}
