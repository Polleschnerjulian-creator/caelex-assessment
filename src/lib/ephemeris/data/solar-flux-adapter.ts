import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { F107_REFERENCE } from "../core/constants";
import type { PrismaClient } from "@prisma/client";

/**
 * NOAA F10.7 Solar Flux Adapter
 *
 * Fetches the latest F10.7 solar flux index from NOAA's public JSON endpoint.
 * Used by the orbital decay model to scale atmospheric density.
 *
 * Endpoint: https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json
 * Free, no API key required. Cached for 24 hours.
 */

interface SolarFluxCache {
  f107: number;
  fetchedAt: number;
}

let solarFluxCache: SolarFluxCache | null = null;
const SOLAR_FLUX_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface NOAASolarCycleRecord {
  "time-tag": string;
  ssn: number;
  smoothed_ssn: number;
  observed_swpc_ssn: number;
  smoothed_swpc_ssn: number;
  f10_7: number;
  "smoothed_f10.7": number;
}

/**
 * Get the current F10.7 solar flux value.
 * Falls back to reference value (150 SFU) on fetch failure.
 */
export async function getCurrentF107(): Promise<number> {
  // Check cache
  if (
    solarFluxCache &&
    Date.now() - solarFluxCache.fetchedAt < SOLAR_FLUX_CACHE_TTL
  ) {
    return solarFluxCache.f107;
  }

  try {
    const url =
      "https://services.swpc.noaa.gov/json/solar-cycle/observed-solar-cycle-indices.json";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      safeLog("NOAA F10.7 fetch failed", { status: res.status });
      return getCachedOrDefault();
    }

    const records: NOAASolarCycleRecord[] = await res.json();
    if (!records || records.length === 0) {
      safeLog("NOAA F10.7 empty response");
      return getCachedOrDefault();
    }

    // Get the most recent record with a valid f10.7 value
    // Records are sorted by time-tag ascending
    let latestF107: number | null = null;
    for (let i = records.length - 1; i >= 0; i--) {
      const f107 = records[i]!.f10_7;
      if (typeof f107 === "number" && f107 > 0) {
        latestF107 = f107;
        break;
      }
    }

    if (latestF107 === null) {
      safeLog("NOAA F10.7 no valid records");
      return getCachedOrDefault();
    }

    // Update cache
    solarFluxCache = { f107: latestF107, fetchedAt: Date.now() };
    safeLog("NOAA F10.7 updated", { f107: latestF107 });

    return latestF107;
  } catch (error) {
    safeLog("NOAA F10.7 fetch error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return getCachedOrDefault();
  }
}

function getCachedOrDefault(): number {
  if (solarFluxCache) return solarFluxCache.f107;
  return F107_REFERENCE; // Fallback: 150 SFU (average solar conditions)
}

/**
 * Get the latest F10.7 value from the database.
 * Used as a fallback when NOAA is unreachable and the in-memory cache is cold
 * (e.g., after a serverless cold start).
 *
 * Returns the reference value (150 SFU) if no DB records exist.
 */
export async function getLatestF107FromDB(db: PrismaClient): Promise<number> {
  try {
    const latest = await db.solarFluxRecord.findFirst({
      orderBy: { observedAt: "desc" },
      select: { f107: true },
    });

    if (latest) {
      // Also warm the in-memory cache
      solarFluxCache = { f107: latest.f107, fetchedAt: Date.now() };
      return latest.f107;
    }
  } catch (error) {
    safeLog("DB F10.7 fallback failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return F107_REFERENCE;
}
