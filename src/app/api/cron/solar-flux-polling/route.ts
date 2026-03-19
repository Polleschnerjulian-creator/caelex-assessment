import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import { getCurrentF107 } from "@/lib/ephemeris/data/solar-flux-adapter";
import {
  fetchLatestKpIndex,
  fetchNOAAScales,
  fetchPredictedSolarCycle,
  processSpaceWeatherData,
} from "@/lib/services/space-weather-service.server";
import { fetchSpaceWeatherWithFallback } from "@/lib/data-sources/router.server";

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
 * Cron endpoint for NOAA F10.7 solar flux polling.
 * Schedule: Daily at 4:00 AM UTC (earliest in chain, before CelesTrak and Ephemeris)
 *
 * Fetches the latest F10.7 solar flux index from NOAA SWPC and persists
 * to SolarFluxRecord for historical tracking and DB fallback.
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
    logger.warn("Unauthorized solar-flux-polling cron request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    logger.info("[Solar Flux] Starting F10.7 + space weather polling...");

    // Try EU-first data source (ESA SWE → NOAA fallback)
    const routerResult = await fetchSpaceWeatherWithFallback();
    if (routerResult.data) {
      console.info(
        `[solar-flux-cron] Source: ${routerResult.source.name} (${routerResult.source.region}), fallback: ${routerResult.fallbackUsed}`,
      );
    }

    // Router provides EU-first F10.7. Full space weather processing (scales, events, alerts)
    // still uses NOAA directly until ESA SWE coverage expands.

    // Fetch all data sources in parallel
    const [f107, kpIndex, scales, predictions] = await Promise.all([
      getCurrentF107(),
      fetchLatestKpIndex(),
      fetchNOAAScales(),
      fetchPredictedSolarCycle(),
    ]);

    // Use start of current month as observedAt (NOAA reports monthly values)
    const now = new Date();
    const observedAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );

    // Upsert F10.7 to dedup by observedAt + source
    await prisma.solarFluxRecord.upsert({
      where: {
        observedAt_source: {
          observedAt,
          source: "NOAA_SWPC",
        },
      },
      update: {
        f107,
        kpIndex,
      },
      create: {
        f107,
        kpIndex,
        observedAt,
        source: "NOAA_SWPC",
      },
    });

    // Process space weather: events, alerts, predicted solar cycle
    const weatherResult = await processSpaceWeatherData(
      prisma,
      kpIndex,
      scales,
      predictions,
    );

    const duration = Date.now() - startTime;

    logger.info("[Solar Flux] Polling complete", {
      f107,
      kpIndex,
      scales,
      weatherResult,
      observedAt: observedAt.toISOString(),
      duration: `${duration}ms`,
    });

    return NextResponse.json({
      success: true,
      f107,
      kpIndex,
      scales,
      weatherResult,
      observedAt: observedAt.toISOString(),
      duration: `${duration}ms`,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[Solar Flux] Cron job failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "Processing failed",
        message: getSafeErrorMessage(error, "Solar flux polling failed"),
        processedAt: new Date().toISOString(),
      },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  return GET(req);
}
