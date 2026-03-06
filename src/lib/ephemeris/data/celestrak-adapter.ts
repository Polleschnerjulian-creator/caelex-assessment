import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import type { CelesTrakGPRecord } from "@/lib/satellites/types";
import type { OrbitalElements } from "../core/types";
import { EARTH_RADIUS_KM } from "../core/constants";

/**
 * CelesTrak GP Data Adapter
 *
 * Loads CelesTrak General Perturbations data for orbital parameters.
 * Reuses the same fetch pattern as cross-verification.server.ts with 4h cache.
 */

interface GPCache {
  data: Map<string, CelesTrakGPRecord>;
  fetchedAt: number;
}

let gpCache: GPCache | null = null;
const GP_CACHE_TTL = 4 * 60 * 60 * 1000; // 4 hours

/**
 * Fetch and transform CelesTrak GP data into OrbitalElements.
 * Returns null if satellite not found or fetch fails.
 */
export async function getOrbitalElements(
  noradId: string,
): Promise<OrbitalElements | null> {
  const gp = await fetchGP(noradId);
  if (!gp) return null;

  return transformGPToOrbitalElements(gp, noradId);
}

/**
 * Get CelesTrak data freshness info.
 */
export async function getCelesTrakStatus(noradId: string): Promise<{
  lastTle: string | null;
  tleAge: number | null;
}> {
  const gp = await fetchGP(noradId);
  if (!gp) return { lastTle: null, tleAge: null };

  const epoch = new Date(gp.EPOCH);
  const ageMinutes = (Date.now() - epoch.getTime()) / (60 * 1000);

  return {
    lastTle: gp.EPOCH,
    tleAge: Math.round(ageMinutes),
  };
}

async function fetchGP(noradId: string): Promise<CelesTrakGPRecord | null> {
  // Check cache
  if (gpCache && Date.now() - gpCache.fetchedAt < GP_CACHE_TTL) {
    return gpCache.data.get(noradId) ?? null;
  }

  try {
    const url = `https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(noradId)}&FORMAT=json`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!res.ok) {
      safeLog("CelesTrak GP fetch failed", { noradId, status: res.status });
      return null;
    }

    const records: CelesTrakGPRecord[] = await res.json();
    if (!records || records.length === 0) return null;

    // Cache the record
    if (!gpCache) {
      gpCache = { data: new Map(), fetchedAt: Date.now() };
    }
    gpCache.data.set(noradId, records[0]!);
    gpCache.fetchedAt = Date.now();

    return records[0]!;
  } catch (error) {
    safeLog("CelesTrak GP fetch error", {
      noradId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function transformGPToOrbitalElements(
  gp: CelesTrakGPRecord,
  noradId: string,
): OrbitalElements {
  // Semi-major axis in km (CelesTrak provides it directly)
  const semiMajorAxisKm = gp.SEMIMAJOR_AXIS;
  const altitudeKm = semiMajorAxisKm - EARTH_RADIUS_KM;

  return {
    noradId,
    epoch: gp.EPOCH,
    semiMajorAxisKm,
    eccentricity: gp.ECCENTRICITY,
    inclinationDeg: gp.INCLINATION,
    raanDeg: gp.RA_OF_ASC_NODE,
    argPerigeeDeg: gp.ARG_OF_PERICENTER,
    meanAnomalyDeg: gp.MEAN_ANOMALY,
    meanMotion: gp.MEAN_MOTION,
    bstar: gp.BSTAR,
    altitudeKm,
    periodMinutes: gp.PERIOD,
  };
}
