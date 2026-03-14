import "server-only";

import type { PrismaClient } from "@prisma/client";
import { logger } from "@/lib/logger";

// ─── Types ────────────────────────────────────────────────────────────────────

interface KpIndexRecord {
  time_tag: string;
  kp_index: number;
  estimated_kp: number;
  kp: string;
}

interface NOAAScalesResponse {
  "0": {
    DateStamp: string;
    TimeStamp: string;
    G: { Scale: string; Text: string };
    S: { Scale: string; Text: string };
    R: { Scale: string; Text: string };
  };
}

interface PredictedSolarCycleRecord {
  "time-tag": string;
  predicted_ssn: number;
  "predicted_f10.7": number;
  high_ssn: number;
  "high_f10.7": number;
  low_ssn: number;
  "low_f10.7": number;
}

export interface SpaceWeatherStatus {
  kpIndex: number | null;
  geomagneticScale: string;
  solarRadiationScale: string;
  radioBlackoutScale: string;
  fetchedAt: string;
}

// ─── NOAA Endpoints ───────────────────────────────────────────────────────────

const NOAA_KP_URL =
  "https://services.swpc.noaa.gov/json/planetary_k_index_1m.json";
const NOAA_SCALES_URL =
  "https://services.swpc.noaa.gov/products/noaa-scales.json";
const NOAA_PREDICTED_CYCLE_URL =
  "https://services.swpc.noaa.gov/json/solar-cycle/predicted-solar-cycle.json";

const FETCH_TIMEOUT_MS = 8000;

// ─── Fetch Helpers ────────────────────────────────────────────────────────────

async function fetchJSON<T>(url: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      logger.warn(`[space-weather] Fetch failed: ${url} status=${res.status}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (error) {
    logger.warn(`[space-weather] Fetch error: ${url}`, {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

// ─── Kp Index ─────────────────────────────────────────────────────────────────

export async function fetchLatestKpIndex(): Promise<number | null> {
  const records = await fetchJSON<KpIndexRecord[]>(NOAA_KP_URL);
  if (!records || records.length === 0) return null;

  const latest = records[records.length - 1]!;
  const kp = latest.kp_index ?? latest.estimated_kp;
  return typeof kp === "number" && kp >= 0 ? kp : null;
}

// ─── NOAA Scales ──────────────────────────────────────────────────────────────

export async function fetchNOAAScales(): Promise<{
  G: string;
  S: string;
  R: string;
} | null> {
  const data = await fetchJSON<NOAAScalesResponse>(NOAA_SCALES_URL);
  if (!data || !data["0"]) return null;

  const current = data["0"];
  return {
    G: current.G?.Scale || "G0",
    S: current.S?.Scale || "S0",
    R: current.R?.Scale || "R0",
  };
}

// ─── Predicted Solar Cycle ────────────────────────────────────────────────────

export async function fetchPredictedSolarCycle(): Promise<Array<{
  observedAt: Date;
  f107: number;
}> | null> {
  const records = await fetchJSON<PredictedSolarCycleRecord[]>(
    NOAA_PREDICTED_CYCLE_URL,
  );
  if (!records || records.length === 0) return null;

  const now = new Date();
  const predictions: Array<{ observedAt: Date; f107: number }> = [];

  for (const record of records) {
    const f107 = record["predicted_f10.7"];
    if (typeof f107 !== "number" || f107 <= 0) continue;

    const date = new Date(record["time-tag"]);
    if (isNaN(date.getTime())) continue;

    // Only future predictions (next 12 months)
    if (
      date > now &&
      date.getTime() - now.getTime() < 365 * 24 * 60 * 60 * 1000
    ) {
      predictions.push({ observedAt: date, f107 });
    }
  }

  return predictions.length > 0 ? predictions : null;
}

// ─── Event Detection ──────────────────────────────────────────────────────────

function parseScaleLevel(scale: string): number {
  const match = scale.match(/[GSR](\d)/);
  return match ? parseInt(match[1]!, 10) : 0;
}

export async function processSpaceWeatherData(
  prisma: PrismaClient,
  kpIndex: number | null,
  scales: { G: string; S: string; R: string } | null,
  predictions: Array<{ observedAt: Date; f107: number }> | null,
): Promise<{
  kpStored: boolean;
  eventsCreated: number;
  predictionsStored: number;
  alertsCreated: number;
}> {
  let eventsCreated = 0;
  let predictionsStored = 0;
  let alertsCreated = 0;

  // 1. Store Kp index on today's SolarFluxRecord
  if (kpIndex !== null) {
    const now = new Date();
    const observedAt = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    await prisma.solarFluxRecord.updateMany({
      where: { observedAt, source: "NOAA_SWPC" },
      data: { kpIndex },
    });
  }

  // 2. Detect and store space weather events from NOAA scales
  if (scales) {
    const scaleEntries = [
      {
        type: "GEOMAGNETIC_STORM",
        severity: scales.G,
        level: parseScaleLevel(scales.G),
      },
      {
        type: "SOLAR_RADIATION",
        severity: scales.S,
        level: parseScaleLevel(scales.S),
      },
      {
        type: "RADIO_BLACKOUT",
        severity: scales.R,
        level: parseScaleLevel(scales.R),
      },
    ];

    for (const entry of scaleEntries) {
      if (entry.level >= 1) {
        const existing = await prisma.spaceWeatherEvent.findFirst({
          where: {
            eventType: entry.type,
            severity: entry.severity,
            endedAt: null,
          },
        });

        if (!existing) {
          await prisma.spaceWeatherEvent.create({
            data: {
              eventType: entry.type,
              severity: entry.severity,
              kpIndex,
              startedAt: new Date(),
              description: `NOAA ${entry.severity} event detected`,
              source: "NOAA_SWPC",
            },
          });
          eventsCreated++;
        }
      }
    }

    // Close events that are no longer active
    for (const entry of scaleEntries) {
      if (entry.level === 0) {
        await prisma.spaceWeatherEvent.updateMany({
          where: {
            eventType: entry.type,
            endedAt: null,
          },
          data: { endedAt: new Date() },
        });
      }
    }

    // Auto-create SatelliteAlerts for G3+ storms
    if (parseScaleLevel(scales.G) >= 3) {
      const orgsWithSpacecraft = await prisma.spacecraft.findMany({
        select: { noradId: true, organizationId: true },
        distinct: ["organizationId"],
      });

      for (const sc of orgsWithSpacecraft) {
        if (!sc.noradId || !sc.organizationId) continue;

        const severity =
          parseScaleLevel(scales.G) >= 4 ? "CRITICAL" : "WARNING";
        const dedupeKey = `${sc.noradId}_SPACE_WEATHER_${scales.G}`;

        const existingAlert = await prisma.satelliteAlert.findFirst({
          where: { dedupeKey, resolvedAt: null },
        });

        if (!existingAlert) {
          await prisma.satelliteAlert.create({
            data: {
              noradId: sc.noradId,
              operatorId: sc.organizationId,
              type: "SPACE_WEATHER",
              severity,
              title: `${scales.G} Geomagnetic Storm Active`,
              description: `NOAA reports a ${scales.G} geomagnetic storm. Kp index: ${kpIndex ?? "N/A"}. Increased atmospheric drag may affect orbital predictions.`,
              dedupeKey,
            },
          });
          alertsCreated++;
        }
      }
    }
  }

  // 3. Store predicted solar cycle values
  if (predictions && predictions.length > 0) {
    for (const prediction of predictions) {
      await prisma.solarFluxRecord.upsert({
        where: {
          observedAt_source: {
            observedAt: prediction.observedAt,
            source: "NOAA_SWPC",
          },
        },
        update: {
          f107: prediction.f107,
          isPredicted: true,
        },
        create: {
          f107: prediction.f107,
          observedAt: prediction.observedAt,
          source: "NOAA_SWPC",
          isPredicted: true,
        },
      });
      predictionsStored++;
    }
  }

  return {
    kpStored: kpIndex !== null,
    eventsCreated,
    predictionsStored,
    alertsCreated,
  };
}

// ─── Dashboard Helper ─────────────────────────────────────────────────────────

export async function getCurrentSpaceWeatherStatus(): Promise<SpaceWeatherStatus> {
  const [kp, scales] = await Promise.all([
    fetchLatestKpIndex(),
    fetchNOAAScales(),
  ]);

  return {
    kpIndex: kp,
    geomagneticScale: scales?.G ?? "G0",
    solarRadiationScale: scales?.S ?? "S0",
    radioBlackoutScale: scales?.R ?? "R0",
    fetchedAt: new Date().toISOString(),
  };
}
