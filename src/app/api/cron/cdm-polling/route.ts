import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  fetchCDMs,
  isSpaceTrackConfigured,
} from "@/lib/shield/space-track-client.server";
import {
  classifyRisk,
  thresholdsFromConfig,
} from "@/lib/shield/risk-classifier.server";
import {
  computeNextStatus,
  shouldAutoEscalate,
  shouldAutoClose,
} from "@/lib/shield/conjunction-tracker.server";
import type { CDMPollingResult } from "@/lib/shield/types";

export const runtime = "nodejs";
export const maxDuration = 60;

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

/**
 * Cron endpoint for CDM polling from Space-Track.
 * Schedule: Every 30 minutes
 *
 * For each active org with spacecraft that have NORAD IDs:
 * 1. Fetches CDMs from Space-Track (last 24h)
 * 2. Classifies risk, finds/creates ConjunctionEvent, creates CDMRecord
 * 3. Logs escalation/de-escalation changes
 * 4. Auto-closes stale MONITORING events past TCA
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("[Shield] CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isSpaceTrackConfigured()) {
    logger.info(
      "[Shield] Space-Track credentials not configured, skipping CDM poll",
    );
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: "SPACETRACK_IDENTITY/SPACETRACK_PASSWORD not set",
      processedAt: new Date().toISOString(),
    });
  }

  try {
    logger.info("[Shield] Starting CDM polling...");
    const result = await pollCDMs();

    logger.info("[Shield] CDM polling complete", {
      cdmsProcessed: result.cdmsProcessed,
      newEvents: result.newEvents,
      updatedEvents: result.updatedEvents,
      escalations: result.escalations,
      autoClosures: result.autoClosures,
      errors: result.errors.length,
      duration: `${result.durationMs}ms`,
    });

    return NextResponse.json({
      success: true,
      ...result,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Shield] CDM polling failed", error);
    return NextResponse.json(
      {
        success: false,
        error: getSafeErrorMessage(error, "CDM polling failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}

// ─── Core Polling Logic ──────────────────────────────────────────────────────

async function pollCDMs(): Promise<CDMPollingResult> {
  const startTime = Date.now();
  let cdmsProcessed = 0;
  let newEvents = 0;
  let updatedEvents = 0;
  let escalations = 0;
  let autoClosures = 0;
  const errors: string[] = [];

  // Find all organizations with spacecraft that have NORAD IDs
  const orgs = await prisma.organization.findMany({
    where: {
      isActive: true,
      spacecraft: { some: { noradId: { not: null } } },
    },
    select: {
      id: true,
      spacecraft: {
        where: { noradId: { not: null } },
        select: { id: true, noradId: true, name: true },
      },
      caConfig: true,
    },
  });

  for (const org of orgs) {
    try {
      const noradIds = org.spacecraft.map((sc) => sc.noradId!).filter(Boolean);

      if (noradIds.length === 0) continue;

      // Build NORAD ID -> spacecraft mapping
      const scByNorad = new Map(org.spacecraft.map((sc) => [sc.noradId!, sc]));

      // Fetch CDMs from Space-Track
      const cdms = await fetchCDMs(noradIds, 1); // Last 24h

      // Build thresholds from org config
      const thresholds = org.caConfig
        ? thresholdsFromConfig(org.caConfig)
        : undefined;

      const autoCloseHours = org.caConfig?.autoCloseAfterTcaHours ?? 24;

      // Process each CDM
      for (const cdm of cdms) {
        try {
          // Determine which of our satellites this CDM involves
          const ourNoradId = noradIds.includes(cdm.sat1NoradId)
            ? cdm.sat1NoradId
            : noradIds.includes(cdm.sat2NoradId)
              ? cdm.sat2NoradId
              : null;

          if (!ourNoradId) continue;

          const threatNoradId =
            ourNoradId === cdm.sat1NoradId ? cdm.sat2NoradId : cdm.sat1NoradId;
          const threatName =
            ourNoradId === cdm.sat1NoradId ? cdm.sat2Name : cdm.sat1Name;
          const threatType =
            ourNoradId === cdm.sat1NoradId
              ? cdm.sat2ObjectType
              : cdm.sat1ObjectType;

          const sc = scByNorad.get(ourNoradId);
          if (!sc) continue;

          // Classify risk
          const tier = classifyRisk(
            cdm.collisionProbability,
            cdm.missDistanceMeters,
            thresholds,
          );

          // Check for duplicate CDM
          const existingCDM = await prisma.cDMRecord.findUnique({
            where: { cdmId: cdm.cdmId },
          });
          if (existingCDM) continue;

          // Find or create conjunction event
          const conjunctionId = `${ourNoradId}-${threatNoradId}-${cdm.tca.toISOString().split("T")[0]}`;

          let event = await prisma.conjunctionEvent.findUnique({
            where: {
              organizationId_conjunctionId: {
                organizationId: org.id,
                conjunctionId,
              },
            },
          });

          if (!event) {
            // Create new event
            const initialStatus = computeNextStatus("NEW", tier);
            event = await prisma.conjunctionEvent.create({
              data: {
                organizationId: org.id,
                spacecraftId: sc.id,
                noradId: ourNoradId,
                threatNoradId,
                threatObjectName: threatName,
                threatObjectType: threatType,
                conjunctionId,
                status: initialStatus,
                riskTier: tier,
                peakPc: cdm.collisionProbability,
                peakPcAt: cdm.creationDate,
                latestPc: cdm.collisionProbability,
                latestMissDistance: cdm.missDistanceMeters,
                tca: cdm.tca,
                relativeSpeed: cdm.relativeSpeedMs,
              },
            });
            newEvents++;
          } else {
            // Update existing event with new CDM data
            const previousTier = event.riskTier;
            const previousStatus = event.status;
            const newStatus = computeNextStatus(event.status, tier);

            // Check auto-escalation
            const autoEscalate =
              shouldAutoEscalate(event.status, tier, cdm.tca) &&
              newStatus !== "ASSESSMENT_REQUIRED";

            const finalStatus = autoEscalate
              ? "ASSESSMENT_REQUIRED"
              : newStatus;

            const updatePeakPc = cdm.collisionProbability > event.peakPc;

            await prisma.conjunctionEvent.update({
              where: { id: event.id },
              data: {
                latestPc: cdm.collisionProbability,
                latestMissDistance: cdm.missDistanceMeters,
                tca: cdm.tca,
                relativeSpeed: cdm.relativeSpeedMs,
                riskTier: tier,
                status: finalStatus,
                ...(updatePeakPc && {
                  peakPc: cdm.collisionProbability,
                  peakPcAt: cdm.creationDate,
                }),
              },
            });

            // Log escalation/de-escalation if tier changed
            if (tier !== previousTier || finalStatus !== previousStatus) {
              await prisma.cAEscalationLog.create({
                data: {
                  conjunctionEventId: event.id,
                  previousTier: previousTier,
                  newTier: tier,
                  previousStatus: previousStatus,
                  newStatus: finalStatus,
                  triggeredBy: autoEscalate ? "TCA_APPROACHING" : "CDM_UPDATE",
                  details: `Pc: ${cdm.collisionProbability.toExponential(2)}, Miss: ${Math.round(cdm.missDistanceMeters)}m`,
                },
              });
              escalations++;
            }

            updatedEvents++;
          }

          // Create CDM record
          await prisma.cDMRecord.create({
            data: {
              conjunctionEventId: event.id,
              cdmId: cdm.cdmId,
              creationDate: cdm.creationDate,
              tca: cdm.tca,
              missDistance: cdm.missDistanceMeters,
              relativeSpeed: cdm.relativeSpeedMs,
              collisionProbability: cdm.collisionProbability,
              probabilityMethod: cdm.probabilityMethod,
              sat2Maneuverable: cdm.sat2Maneuverable,
              rawCdm:
                cdm.rawCdm as unknown as import("@prisma/client").Prisma.InputJsonValue,
              riskTier: tier,
            },
          });

          cdmsProcessed++;
        } catch (error) {
          const msg = `CDM ${cdm.cdmId}: ${error instanceof Error ? error.message : "Unknown"}`;
          errors.push(msg);
          logger.error(`[Shield] ${msg}`);
        }
      }

      // Auto-close stale events
      const openEvents = await prisma.conjunctionEvent.findMany({
        where: {
          organizationId: org.id,
          status: { in: ["NEW", "MONITORING"] },
          closedAt: null,
        },
      });

      for (const evt of openEvents) {
        if (
          shouldAutoClose(evt.status, evt.riskTier, evt.tca, autoCloseHours)
        ) {
          await prisma.conjunctionEvent.update({
            where: { id: evt.id },
            data: {
              status: "CLOSED",
              closedAt: new Date(),
              closedReason: "TCA_PASSED",
            },
          });
          autoClosures++;
        }
      }
    } catch (error) {
      const msg = `Org ${org.id}: ${error instanceof Error ? error.message : "Unknown"}`;
      errors.push(msg);
      logger.error(`[Shield] ${msg}`);
    }
  }

  return {
    cdmsProcessed,
    newEvents,
    updatedEvents,
    escalations,
    autoClosures,
    errors: errors.slice(0, 20),
    durationMs: Date.now() - startTime,
  };
}
