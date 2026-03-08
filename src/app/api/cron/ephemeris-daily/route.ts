import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { calculateSatelliteComplianceState } from "@/lib/ephemeris/core/satellite-compliance-state";
import { toPublicState } from "@/lib/ephemeris/core/types";
import type { AlertSeverity } from "@/lib/ephemeris/core/types";
import { notifyOrganization } from "@/lib/services/notification-service";
import { propagateImpact } from "@/lib/ephemeris/cross-type/impact-propagation";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 minutes for fleet processing

function isValidCronSecret(header: string, secret: string): boolean {
  try {
    const headerBuffer = Buffer.from(header);
    const expectedBuffer = Buffer.from(`Bearer ${secret}`);
    if (headerBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(headerBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

interface CronResult {
  processed: number;
  alertsCreated: number;
  alertsResolved: number;
  crossTypeImpacts: number;
  errors: string[];
  durationMs: number;
}

/**
 * Cron endpoint for daily Ephemeris recalculation.
 * Schedule: Daily at 6:00 AM UTC
 *
 * For each org's satellites:
 * 1. Recalculate compliance state
 * 2. Persist SatelliteComplianceState (upsert)
 * 3. Append to SatelliteComplianceStateHistory
 * 4. Generate/resolve alerts with hysteresis
 * 5. Notify on new/upgraded alerts
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Service unavailable: cron authentication not configured" },
      { status: 503 },
    );
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized ephemeris cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("Starting daily Ephemeris recalculation...");

    const result = await processAllSatellites();

    logger.info("Ephemeris daily processing complete:", {
      processed: result.processed,
      alertsCreated: result.alertsCreated,
      alertsResolved: result.alertsResolved,
      crossTypeImpacts: result.crossTypeImpacts,
      errors: result.errors.length,
      duration: `${result.durationMs}ms`,
    });

    return NextResponse.json({
      success: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("Ephemeris cron job failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(
          error,
          "Ephemeris daily processing failed",
        ),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}

// ─── Core Processing ────────────────────────────────────────────────────────

async function processAllSatellites(): Promise<CronResult> {
  const startTime = Date.now();
  let processed = 0;
  let alertsCreated = 0;
  let alertsResolved = 0;
  let crossTypeImpacts = 0;
  const errors: string[] = [];

  // Track score changes for cross-type propagation
  const scoreChanges: Array<{
    orgId: string;
    entityId: string;
    noradId: string;
    previousScore: number;
    newScore: number;
    delta: number;
    affectedModules: string[];
  }> = [];

  // Find all organizations with spacecraft
  const orgs = await prisma.organization.findMany({
    where: {
      isActive: true,
      spacecraft: { some: {} },
    },
    select: {
      id: true,
      spacecraft: {
        select: { noradId: true, name: true, launchDate: true },
      },
    },
  });

  for (const org of orgs) {
    const satellites = org.spacecraft.filter(
      (sc): sc is typeof sc & { noradId: string } => sc.noradId !== null,
    );

    for (const sc of satellites) {
      try {
        // Fetch previous score for delta comparison
        const previousState = await fetchPreviousScore(org.id, sc.noradId);

        const state = await calculateSatelliteComplianceState({
          prisma,
          orgId: org.id,
          noradId: sc.noradId,
          satelliteName: sc.name,
          launchDate: sc.launchDate,
        });

        // Persist current state (upsert)
        await persistState(org.id, sc.noradId, sc.name, state);

        // Append to history
        await appendHistory(org.id, sc.noradId, state);

        // Process alerts with hysteresis
        const alertResult = await processAlerts(
          org.id,
          sc.noradId,
          sc.name,
          state,
        );
        alertsCreated += alertResult.created;
        alertsResolved += alertResult.resolved;

        // Track significant score changes for cross-type propagation
        if (previousState !== null) {
          const delta = state.overallScore - previousState.score;
          if (Math.abs(delta) >= 5) {
            // Identify which modules changed
            const changedModules: string[] = [];
            for (const [key, mod] of Object.entries(state.modules)) {
              if (mod.status !== "COMPLIANT") {
                changedModules.push(key);
              }
            }

            scoreChanges.push({
              orgId: org.id,
              entityId: previousState.entityId ?? sc.noradId,
              noradId: sc.noradId,
              previousScore: previousState.score,
              newScore: state.overallScore,
              delta,
              affectedModules: changedModules,
            });
          }
        }

        processed++;
      } catch (error) {
        const msg = `Failed for ${sc.noradId}: ${error instanceof Error ? error.message : "Unknown"}`;
        errors.push(msg);
        logger.error(msg);
      }
    }

    // ─── Cross-Type Impact Propagation ─────────────────────────────────
    // For significant score drops, propagate impacts through dependencies
    for (const change of scoreChanges.filter((c) => c.orgId === org.id)) {
      if (change.delta >= 0) continue; // Only propagate degradations

      try {
        const impactResult = await propagateImpact(
          change.entityId,
          change.orgId,
          change.delta,
          change.affectedModules,
          prisma,
          `Daily score change: ${change.previousScore} → ${change.newScore}`,
        );

        if (impactResult.totalEntitiesAffected > 0) {
          crossTypeImpacts += impactResult.totalEntitiesAffected;
          logger.info(
            `Cross-type impact from ${change.noradId}: ${impactResult.totalEntitiesAffected} entities affected`,
          );

          // Create DEPENDENCY_IMPACT alerts for directly impacted entities
          for (const impact of impactResult.directImpacts) {
            if (Math.abs(impact.propagatedScoreDelta) >= 5) {
              await notifyOrganization(
                change.orgId,
                "COMPLIANCE_SCORE_DROPPED",
                `[Dependency Impact] ${impact.sourceEntityName} affected`,
                impact.narrative,
                {
                  entityType: "operator_entity",
                  entityId: impact.sourceEntityId,
                  severity:
                    Math.abs(impact.propagatedScoreDelta) >= 15
                      ? "CRITICAL"
                      : "WARNING",
                  actionUrl: `/dashboard/ephemeris`,
                },
              );
            }
          }
        }
      } catch (error) {
        const msg = `Impact propagation failed for ${change.noradId}: ${error instanceof Error ? error.message : "Unknown"}`;
        errors.push(msg);
        logger.error(msg);
      }
    }
  }

  return {
    processed,
    alertsCreated,
    alertsResolved,
    crossTypeImpacts,
    errors: errors.slice(0, 20), // Limit error list
    durationMs: Date.now() - startTime,
  };
}

/**
 * Fetch the previous compliance score for a satellite to detect changes.
 */
async function fetchPreviousScore(
  orgId: string,
  noradId: string,
): Promise<{ score: number; entityId: string | null } | null> {
  const db = prisma as unknown as Record<string, unknown>;
  const stateModel = db["satelliteComplianceState"] as
    | {
        findUnique: (
          args: Record<string, unknown>,
        ) => Promise<{ overallScore: number; noradId: string } | null>;
      }
    | undefined;

  if (!stateModel) return null;

  const result = await stateModel.findUnique({
    where: { noradId_operatorId: { noradId, operatorId: orgId } },
  });

  if (!result) return null;

  // Try to find the corresponding OperatorEntity
  const entity = await prisma.operatorEntity.findFirst({
    where: { organizationId: orgId },
    select: { id: true },
  });

  return { score: result.overallScore, entityId: entity?.id ?? null };
}

// ─── Persistence ────────────────────────────────────────────────────────────

async function persistState(
  orgId: string,
  noradId: string,
  satelliteName: string,
  state: Awaited<ReturnType<typeof calculateSatelliteComplianceState>>,
): Promise<void> {
  const db = prisma as unknown as Record<string, unknown>;
  const stateModel = db["satelliteComplianceState"] as
    | {
        upsert: (args: Record<string, unknown>) => Promise<unknown>;
      }
    | undefined;

  if (!stateModel) return;

  const stateJson = JSON.parse(JSON.stringify(toPublicState(state)));

  const moduleScores = JSON.parse(JSON.stringify(state.modules));
  const dataSources = JSON.parse(JSON.stringify(state.dataSources));

  await stateModel.upsert({
    where: {
      noradId_operatorId: { noradId, operatorId: orgId },
    },
    update: {
      stateJson,
      satelliteName,
      overallScore: state.overallScore,
      moduleScores,
      dataSources,
      horizonDays: state.complianceHorizon.daysUntilFirstBreach,
      horizonRegulation: state.complianceHorizon.firstBreachRegulation,
      horizonConfidence: state.complianceHorizon.confidence,
      dataFreshness: state.dataFreshness,
      calculatedAt: new Date(),
    },
    create: {
      noradId,
      satelliteName,
      operatorId: orgId,
      stateJson,
      overallScore: state.overallScore,
      moduleScores,
      dataSources,
      horizonDays: state.complianceHorizon.daysUntilFirstBreach,
      horizonRegulation: state.complianceHorizon.firstBreachRegulation,
      horizonConfidence: state.complianceHorizon.confidence,
      dataFreshness: state.dataFreshness,
    },
  });
}

async function appendHistory(
  orgId: string,
  noradId: string,
  state: Awaited<ReturnType<typeof calculateSatelliteComplianceState>>,
): Promise<void> {
  const db = prisma as unknown as Record<string, unknown>;
  const historyModel = db["satelliteComplianceStateHistory"] as
    | {
        create: (args: Record<string, unknown>) => Promise<unknown>;
      }
    | undefined;

  if (!historyModel) return;

  const stateJson = JSON.parse(JSON.stringify(toPublicState(state)));

  // Serialize active alerts
  const alerts =
    state.activeAlerts.length > 0
      ? JSON.parse(JSON.stringify(state.activeAlerts))
      : null;

  // Derive forecast percentiles from compliance horizon confidence
  const horizonDays = state.complianceHorizon.daysUntilFirstBreach;
  const { forecastP10, forecastP50, forecastP90 } = deriveForecastPercentiles(
    horizonDays,
    state.complianceHorizon.confidence,
  );

  const moduleScores = JSON.parse(JSON.stringify(state.modules));

  await historyModel.create({
    data: {
      noradId,
      operatorId: orgId,
      stateJson,
      alerts,
      overallScore: state.overallScore,
      moduleScores,
      horizonDays,
      horizonRegulation: state.complianceHorizon.firstBreachRegulation,
      dataFreshness: state.dataFreshness,
      forecastP10,
      forecastP50,
      forecastP90,
    },
  });
}

/**
 * Derive P10/P50/P90 forecast percentiles from compliance horizon.
 * Uses confidence-based multipliers:
 *   HIGH   → ±10% band around nominal
 *   MEDIUM → ±30% band
 *   LOW    → ±50% band
 */
function deriveForecastPercentiles(
  horizonDays: number | null,
  confidence: string,
): {
  forecastP10: number | null;
  forecastP50: number | null;
  forecastP90: number | null;
} {
  if (horizonDays === null) {
    return { forecastP10: null, forecastP50: null, forecastP90: null };
  }

  let spread: number;
  switch (confidence) {
    case "HIGH":
      spread = 0.1;
      break;
    case "MEDIUM":
      spread = 0.3;
      break;
    default:
      spread = 0.5;
      break;
  }

  return {
    forecastP10: Math.round(horizonDays * (1 - spread)),
    forecastP50: horizonDays,
    forecastP90: Math.round(horizonDays * (1 + spread)),
  };
}

// ─── Alert Hysteresis ───────────────────────────────────────────────────────

interface AlertProcessResult {
  created: number;
  resolved: number;
}

async function processAlerts(
  orgId: string,
  noradId: string,
  satelliteName: string,
  state: Awaited<ReturnType<typeof calculateSatelliteComplianceState>>,
): Promise<AlertProcessResult> {
  const db = prisma as unknown as Record<string, unknown>;
  const alertModel = db["satelliteAlert"] as
    | {
        findMany: (args: Record<string, unknown>) => Promise<
          Array<{
            id: string;
            dedupeKey: string;
            severity: string;
            type: string;
          }>
        >;
        create: (args: Record<string, unknown>) => Promise<unknown>;
        update: (args: Record<string, unknown>) => Promise<unknown>;
      }
    | undefined;

  if (!alertModel) return { created: 0, resolved: 0 };

  let created = 0;
  let resolved = 0;

  // Get current active alerts for this satellite
  const activeAlerts = await alertModel.findMany({
    where: { noradId, operatorId: orgId, resolvedAt: null },
  });

  const activeByKey = new Map(activeAlerts.map((a) => [a.dedupeKey, a]));

  // Generate alerts from current state
  const newAlertConditions = generateAlertConditions(noradId, state);

  // Process new/upgraded alerts
  for (const condition of newAlertConditions) {
    const existing = activeByKey.get(condition.dedupeKey);

    if (!existing) {
      // New alert
      await alertModel.create({
        data: {
          noradId,
          operatorId: orgId,
          type: condition.type,
          severity: condition.severity,
          title: condition.title,
          message: condition.message,
          regulationRef: condition.regulationRef,
          dedupeKey: condition.dedupeKey,
        },
      });
      created++;

      // Notify org
      await notifyOrganization(
        orgId,
        condition.severity === "CRITICAL"
          ? "COMPLIANCE_ACTION_REQUIRED"
          : "COMPLIANCE_SCORE_DROPPED",
        `[${satelliteName}] ${condition.title}`,
        condition.message,
        {
          entityType: "spacecraft",
          entityId: noradId,
          severity: condition.severity === "CRITICAL" ? "CRITICAL" : "WARNING",
          actionUrl: `/dashboard/ephemeris/${noradId}`,
        },
      );
    } else if (
      severityRank(condition.severity) >
      severityRank(existing.severity as AlertSeverity)
    ) {
      // Severity upgrade
      await alertModel.update({
        where: { id: existing.id },
        data: {
          severity: condition.severity,
          message: condition.message,
          updatedAt: new Date(),
        },
      });
    }

    // Remove from active set (remaining ones may need resolution)
    activeByKey.delete(condition.dedupeKey);
  }

  // Resolve alerts that no longer apply
  // Only resolve if the condition is significantly better (hysteresis)
  for (const [, alert] of activeByKey) {
    await alertModel.update({
      where: { id: alert.id },
      data: { resolvedAt: new Date() },
    });
    resolved++;
  }

  return { created, resolved };
}

function severityRank(severity: AlertSeverity): number {
  switch (severity) {
    case "CRITICAL":
      return 4;
    case "HIGH":
      return 3;
    case "MEDIUM":
      return 2;
    case "LOW":
      return 1;
    default:
      return 0;
  }
}

interface AlertCondition {
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  regulationRef: string | null;
  dedupeKey: string;
}

function generateAlertConditions(
  noradId: string,
  state: Awaited<ReturnType<typeof calculateSatelliteComplianceState>>,
): AlertCondition[] {
  const conditions: AlertCondition[] = [];

  // Check each module for non-compliance
  for (const [key, mod] of Object.entries(state.modules)) {
    if (mod.status === "NON_COMPLIANT") {
      conditions.push({
        type: "COMPLIANCE_ACTION_REQUIRED",
        severity: "CRITICAL",
        title: `${key} module non-compliant`,
        message: `The ${key} module is NON_COMPLIANT with score ${mod.score}/100.`,
        regulationRef: mod.factors[0]?.regulationRef ?? null,
        dedupeKey: `${noradId}_NON_COMPLIANT_${key}`,
      });
    } else if (mod.status === "WARNING") {
      conditions.push({
        type: "COMPLIANCE_SCORE_DROPPED",
        severity: "HIGH",
        title: `${key} module warning`,
        message: `The ${key} module is in WARNING state with score ${mod.score}/100.`,
        regulationRef: mod.factors[0]?.regulationRef ?? null,
        dedupeKey: `${noradId}_WARNING_${key}`,
      });
    }
  }

  // Compliance horizon alerts
  const horizon = state.complianceHorizon.daysUntilFirstBreach;
  if (horizon !== null) {
    if (horizon < 30) {
      conditions.push({
        type: "HORIZON_SHORTENED",
        severity: "CRITICAL",
        title: "Compliance breach imminent",
        message: `First compliance breach in ${horizon} days (${state.complianceHorizon.firstBreachRegulation ?? "unknown"}).`,
        regulationRef: state.complianceHorizon.firstBreachRegulation,
        dedupeKey: `${noradId}_HORIZON_CRITICAL`,
      });
    } else if (horizon < 90) {
      conditions.push({
        type: "HORIZON_SHORTENED",
        severity: "HIGH",
        title: "Compliance horizon shortened",
        message: `First compliance breach in ${horizon} days (${state.complianceHorizon.firstBreachRegulation ?? "unknown"}).`,
        regulationRef: state.complianceHorizon.firstBreachRegulation,
        dedupeKey: `${noradId}_HORIZON_HIGH`,
      });
    }
  }

  // Data staleness alerts
  if (state.dataFreshness === "STALE" || state.dataFreshness === "NO_DATA") {
    conditions.push({
      type: "DATA_STALE",
      severity: state.dataFreshness === "NO_DATA" ? "HIGH" : "MEDIUM",
      title: "Telemetry data stale",
      message: `Satellite data freshness: ${state.dataFreshness}. Compliance state may be inaccurate.`,
      regulationRef: null,
      dedupeKey: `${noradId}_DATA_STALE`,
    });
  }

  return conditions;
}
