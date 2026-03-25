import "server-only";

/**
 * EU-First Data Source Router
 *
 * Routing strategy:
 *
 *   Orbital elements (TLEs):
 *     CelesTrak is the ONLY source with current TLE/GP data in this stack.
 *     ESA DISCOS holds catalog metadata (mass, dimensions, COSPAR IDs) but does
 *     NOT publish Two-Line Element sets or General Perturbation (GP) elements.
 *     Therefore CelesTrak is primary here regardless of EU preference — no
 *     meaningful EU fallback exists for live TLE data at this time.
 *
 *   Conjunction data (CDMs):
 *     EU SST (primary) → Space-Track (fallback).
 *     EU SST stub will return empty until institutional registration is complete.
 *
 *   Space weather:
 *     ESA SWE HAPI (primary, EU) → NOAA SWPC (fallback, US).
 *
 *   Object catalog:
 *     ESA DISCOS (primary, EU). No US fallback needed for catalog metadata.
 */

import type {
  DataFetchResult,
  ObjectCatalogEntry,
  SpaceWeatherData,
} from "@/lib/data-sources/types";
import type { OrbitalElements } from "@/lib/ephemeris/core/types";
import type { ParsedCDM } from "@/lib/shield/types";

import { celestrakProvider } from "./providers/celestrak-provider.server";
import { discosProvider } from "./providers/discos-provider.server";
import { esaSweProvider } from "./providers/esa-swe-provider.server";
import { euSstProvider } from "./providers/eu-sst-provider.server";
import { noaaProvider } from "./providers/noaa-provider.server";
import { spaceTrackProvider } from "./providers/spacetrack-provider.server";

// ─── Internal Helpers ────────────────────────────────────────────────────────

function now(): string {
  return new Date().toISOString();
}

// ─── Orbital Elements ────────────────────────────────────────────────────────

/**
 * Fetch orbital elements for a NORAD catalog ID.
 *
 * CelesTrak is the sole TLE source in this stack — DISCOS provides catalog
 * metadata only (no TLEs). CelesTrak is therefore always primary for orbital
 * elements regardless of the EU-first policy. This is noted as a known gap
 * until an EU TLE feed (e.g. EU SST TLE service) becomes accessible.
 */
export async function fetchOrbitalElementsWithFallback(
  noradId: string,
): Promise<DataFetchResult<OrbitalElements>> {
  const start = Date.now();
  const provider = celestrakProvider;

  console.info(
    `[DataRouter] fetchOrbitalElements noradId=${noradId} ` +
      `source=${provider.getInfo().name} (CelesTrak is sole TLE source; ` +
      `DISCOS has catalog metadata only — no EU TLE fallback currently available)`,
  );

  try {
    const data = await provider.fetchOrbitalElements(noradId);
    const durationMs = Date.now() - start;

    console.info(
      `[DataRouter] fetchOrbitalElements noradId=${noradId} ` +
        `source=${provider.getInfo().name} found=${data !== null} durationMs=${durationMs}`,
    );

    return {
      data,
      source: provider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason: null,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const reason = err instanceof Error ? err.message : "unknown error";

    console.info(
      `[DataRouter] fetchOrbitalElements noradId=${noradId} ` +
        `source=${provider.getInfo().name} failed: ${reason} durationMs=${durationMs}`,
    );

    return {
      data: null,
      source: provider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason: reason,
      durationMs,
    };
  }
}

// ─── Conjunction Data (CDMs) ─────────────────────────────────────────────────

/**
 * Fetch CDMs for a list of NORAD IDs.
 *
 * Primary:  EU SST (stub — requires institutional registration under EU 2021/696)
 * Fallback: Space-Track (US)
 *
 * EU SST will return an empty array until registration is complete, which
 * triggers automatic fallback to Space-Track.
 */
export async function fetchCDMsWithFallback(
  noradIds: string[],
  sinceDays?: number,
): Promise<DataFetchResult<ParsedCDM[]>> {
  const start = Date.now();

  // ── Try EU SST first ──────────────────────────────────────────────────────
  if (euSstProvider.isConfigured()) {
    console.info(
      `[DataRouter] fetchCDMs primarySource=${euSstProvider.getInfo().name} ` +
        `noradIds=${noradIds.length} sinceDays=${sinceDays ?? 7}`,
    );

    try {
      const data = await euSstProvider.fetchCDMs(noradIds, sinceDays);
      const durationMs = Date.now() - start;

      // EU SST returning a non-empty result — use it
      if (data.length > 0) {
        console.info(
          `[DataRouter] fetchCDMs source=${euSstProvider.getInfo().name} ` +
            `cdms=${data.length} durationMs=${durationMs}`,
        );
        return {
          data,
          source: euSstProvider.getInfo(),
          fetchedAt: now(),
          fallbackUsed: false,
          primaryFailureReason: null,
          durationMs,
        };
      }

      // EU SST returned empty (expected until registration) — fall through to Space-Track
      console.info(
        `[DataRouter] fetchCDMs EU SST returned empty (registration pending), ` +
          `falling back to Space-Track durationMs=${durationMs}`,
      );
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown error";
      console.info(
        `[DataRouter] fetchCDMs EU SST error: ${reason}, falling back to Space-Track`,
      );
    }
  } else {
    console.info(
      `[DataRouter] fetchCDMs EU SST not configured (EU_SST_API_KEY missing), ` +
        `using Space-Track fallback`,
    );
  }

  // ── Fallback: Space-Track ─────────────────────────────────────────────────
  const primaryFailureReason = euSstProvider.isConfigured()
    ? "EU SST returned empty result — institutional registration pending (EU Reg 2021/696)"
    : "EU SST not configured — EU_SST_API_KEY not set";

  const fallbackStart = Date.now();

  console.info(
    `[DataRouter] fetchCDMs fallbackSource=${spaceTrackProvider.getInfo().name} ` +
      `noradIds=${noradIds.length} sinceDays=${sinceDays ?? 7}`,
  );

  try {
    const data = await spaceTrackProvider.fetchCDMs(noradIds, sinceDays);
    const durationMs = Date.now() - start;

    console.info(
      `[DataRouter] fetchCDMs fallback=${spaceTrackProvider.getInfo().name} ` +
        `cdms=${data.length} fallbackDurationMs=${Date.now() - fallbackStart} totalMs=${durationMs}`,
    );

    return {
      data,
      source: spaceTrackProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: true,
      primaryFailureReason,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const reason = err instanceof Error ? err.message : "unknown error";

    console.info(
      `[DataRouter] fetchCDMs fallback=${spaceTrackProvider.getInfo().name} ` +
        `also failed: ${reason} durationMs=${durationMs}`,
    );

    return {
      data: [],
      source: spaceTrackProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: true,
      primaryFailureReason,
      durationMs,
    };
  }
}

// ─── Space Weather ───────────────────────────────────────────────────────────

/**
 * Fetch current space weather conditions.
 *
 * Primary:  ESA Space Weather Service HAPI (EU)
 * Fallback: NOAA SWPC Solar Cycle Indices (US)
 */
export async function fetchSpaceWeatherWithFallback(): Promise<
  DataFetchResult<SpaceWeatherData>
> {
  const start = Date.now();

  // ── Try ESA SWE first (EU primary) ───────────────────────────────────────
  console.info(
    `[DataRouter] fetchSpaceWeather primarySource=${esaSweProvider.getInfo().name}`,
  );

  try {
    const data = await esaSweProvider.fetchCurrentConditions();
    const durationMs = Date.now() - start;

    if (data !== null) {
      console.info(
        `[DataRouter] fetchSpaceWeather source=${esaSweProvider.getInfo().name} ` +
          `f107=${data.f107} kp=${data.kpIndex ?? "n/a"} durationMs=${durationMs}`,
      );
      return {
        data,
        source: esaSweProvider.getInfo(),
        fetchedAt: now(),
        fallbackUsed: false,
        primaryFailureReason: null,
        durationMs,
      };
    }

    console.info(
      `[DataRouter] fetchSpaceWeather ESA SWE returned null (HAPI unavailable or dataset changed), ` +
        `falling back to NOAA durationMs=${durationMs}`,
    );
  } catch (err) {
    const reason = err instanceof Error ? err.message : "unknown error";
    console.info(
      `[DataRouter] fetchSpaceWeather ESA SWE error: ${reason}, falling back to NOAA`,
    );
  }

  // ── Fallback: NOAA SWPC ────────────────────────────────────────────────────
  const primaryFailureReason =
    "ESA SWE HAPI returned null — endpoint may be unavailable or dataset IDs changed";

  console.info(
    `[DataRouter] fetchSpaceWeather fallbackSource=${noaaProvider.getInfo().name}`,
  );

  try {
    const data = await noaaProvider.fetchCurrentConditions();
    const durationMs = Date.now() - start;

    console.info(
      `[DataRouter] fetchSpaceWeather fallback=${noaaProvider.getInfo().name} ` +
        `f107=${data?.f107 ?? "n/a"} durationMs=${durationMs}`,
    );

    return {
      data,
      source: noaaProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: true,
      primaryFailureReason,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const reason = err instanceof Error ? err.message : "unknown error";

    console.info(
      `[DataRouter] fetchSpaceWeather NOAA fallback also failed: ${reason} durationMs=${durationMs}`,
    );

    return {
      data: null,
      source: noaaProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: true,
      primaryFailureReason,
      durationMs,
    };
  }
}

// ─── Object Catalog ──────────────────────────────────────────────────────────

/**
 * Fetch object catalog metadata for a NORAD catalog ID.
 *
 * Primary: ESA DISCOS (EU).
 * No US fallback — DISCOS is the authoritative EU source for object metadata.
 * If unconfigured or fetch fails, returns null data with failure reason noted.
 */
export async function fetchObjectCatalog(
  noradId: string,
): Promise<DataFetchResult<ObjectCatalogEntry>> {
  const start = Date.now();

  console.info(
    `[DataRouter] fetchObjectCatalog noradId=${noradId} ` +
      `source=${discosProvider.getInfo().name}`,
  );

  if (!discosProvider.isConfigured()) {
    const durationMs = Date.now() - start;
    const reason =
      "ESA DISCOS not configured — EU_DISCOS_API_KEY not set. " +
      "Register at https://cosmos.esa.int for API access.";

    console.info(
      `[DataRouter] fetchObjectCatalog DISCOS not configured durationMs=${durationMs}`,
    );

    return {
      data: null,
      source: discosProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason: reason,
      durationMs,
    };
  }

  try {
    const data = await discosProvider.fetchObject(noradId);
    const durationMs = Date.now() - start;

    console.info(
      `[DataRouter] fetchObjectCatalog noradId=${noradId} ` +
        `source=${discosProvider.getInfo().name} found=${data !== null} durationMs=${durationMs}`,
    );

    return {
      data,
      source: discosProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason: null,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const reason = err instanceof Error ? err.message : "unknown error";

    console.info(
      `[DataRouter] fetchObjectCatalog noradId=${noradId} ` +
        `source=${discosProvider.getInfo().name} failed: ${reason} durationMs=${durationMs}`,
    );

    return {
      data: null,
      source: discosProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason: reason,
      durationMs,
    };
  }
}

// ─── Atmospheric Data (Copernicus Sentinel-5P) ──────────────────────────────

import { copernicusProvider } from "./providers/copernicus-cams-provider.server";
import type { AtmosphericData } from "./types-environmental";

/**
 * Fetch atmospheric data from Copernicus Sentinel-5P TROPOMI.
 *
 * EU-only source — no US fallback exists for satellite atmospheric composition.
 * Returns NO2, CO, aerosol index statistics for a given area and time range.
 */
export async function fetchAtmosphericData(
  lat: number,
  lon: number,
  radiusKm: number,
  dateRange: { from: string; to: string },
): Promise<DataFetchResult<AtmosphericData>> {
  const start = Date.now();

  if (!copernicusProvider.isConfigured()) {
    return {
      data: null,
      source: copernicusProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason:
        "COPERNICUS_CLIENT_ID / COPERNICUS_CLIENT_SECRET not configured",
      durationMs: Date.now() - start,
    };
  }

  try {
    const data = await copernicusProvider.fetchAtmosphericStats(
      lat,
      lon,
      radiusKm,
      dateRange,
    );
    const durationMs = Date.now() - start;

    console.info(
      `[DataRouter] fetchAtmosphericData lat=${lat} lon=${lon} ` +
        `source=${copernicusProvider.getInfo().name} ` +
        `measurements=${data?.measurements.length ?? 0} durationMs=${durationMs}`,
    );

    return {
      data,
      source: copernicusProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason: null,
      durationMs,
    };
  } catch (err) {
    const durationMs = Date.now() - start;
    const reason = err instanceof Error ? err.message : "unknown error";

    console.error(
      `[DataRouter] fetchAtmosphericData failed: ${reason} durationMs=${durationMs}`,
    );

    return {
      data: null,
      source: copernicusProvider.getInfo(),
      fetchedAt: now(),
      fallbackUsed: false,
      primaryFailureReason: reason,
      durationMs,
    };
  }
}
