import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { getOrbitalElements } from "@/lib/ephemeris/data/celestrak-adapter";

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

/**
 * Cron endpoint for CelesTrak TLE/GP data polling.
 * Schedule: Daily at 5:00 AM UTC (after solar flux, before ephemeris-daily)
 *
 * For each spacecraft with a NORAD ID:
 * 1. Fetch latest GP data from CelesTrak
 * 2. Create OrbitalData record (time-series history)
 * 3. Update Spacecraft.altitudeKm / inclinationDeg (denormalized for quick reads)
 */
export async function GET(req: Request) {
  const startTime = Date.now();

  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    logger.error("CRON_SECRET not configured");
    return NextResponse.json({ error: "Service unavailable" }, { status: 503 });
  }

  if (!isValidCronSecret(authHeader || "", cronSecret)) {
    logger.warn("Unauthorized celestrak-polling cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // NOTE: CelesTrak remains the primary orbital data source.
    // Neither ESA DISCOS nor EU SST provide current TLEs via API.
    // DISCOS provides catalog data (mass, dimensions) only.
    // See docs/DATASOURCES.md for the full routing strategy.
    logger.info("[CelesTrak] Starting TLE/GP polling...");

    const result = await processAllSpacecraft();

    const duration = Date.now() - startTime;

    logger.info("[CelesTrak] Polling complete", {
      processed: result.processed,
      errors: result.errors.length,
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      processed: result.processed,
      errors: result.errors.slice(0, 20),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[CelesTrak] Cron job failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(error, "CelesTrak polling failed"),
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

async function processAllSpacecraft(): Promise<{
  processed: number;
  errors: string[];
}> {
  let processed = 0;
  const errors: string[] = [];

  // Find all spacecraft with a NORAD ID
  const spacecraft = await prisma.spacecraft.findMany({
    where: {
      noradId: { not: null },
      organization: { isActive: true },
    },
    select: {
      id: true,
      noradId: true,
      name: true,
    },
  });

  logger.info(
    `[CelesTrak] Found ${spacecraft.length} spacecraft with NORAD IDs`,
  );

  for (const sc of spacecraft) {
    const noradId = sc.noradId!;

    try {
      const orbital = await getOrbitalElements(noradId);

      if (!orbital) {
        logger.warn(
          `[CelesTrak] No data for ${sc.name} (NORAD ${noradId}) — CelesTrak may be down or ID invalid`,
        );
        continue;
      }

      // Create OrbitalData record (time-series)
      await prisma.orbitalData.create({
        data: {
          spacecraftId: sc.id,
          noradId,
          altitude: orbital.altitudeKm,
          inclination: orbital.inclinationDeg,
          eccentricity: orbital.eccentricity,
          period: orbital.periodMinutes,
          epoch: new Date(orbital.epoch),
          rawGp: {
            semiMajorAxisKm: orbital.semiMajorAxisKm,
            raanDeg: orbital.raanDeg,
            argPerigeeDeg: orbital.argPerigeeDeg,
            meanAnomalyDeg: orbital.meanAnomalyDeg,
            meanMotion: orbital.meanMotion,
            bstar: orbital.bstar,
          },
        },
      });

      // Update denormalized fields on Spacecraft
      await prisma.spacecraft.update({
        where: { id: sc.id },
        data: {
          altitudeKm: orbital.altitudeKm,
          inclinationDeg: orbital.inclinationDeg,
        },
      });

      processed++;
    } catch (error) {
      const msg = `Failed for ${sc.name} (NORAD ${noradId}): ${error instanceof Error ? error.message : "Unknown"}`;
      errors.push(msg);
      logger.error(`[CelesTrak] ${msg}`);
    }
  }

  return { processed, errors };
}
