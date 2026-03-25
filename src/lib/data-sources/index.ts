/**
 * Data Sources — Barrel Exports
 *
 * EU-first data architecture:
 *   EU primary:  ESA DISCOS, ESA SWE HAPI, EU SST, Copernicus Sentinel-5P
 *   US fallback: CelesTrak, NOAA SWPC, Space-Track
 *
 * Import the router for high-level EU-first fetching with automatic fallback.
 * Import individual providers only when you need direct access.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export type {
  ProviderRegion,
  ProviderInfo,
  SpaceWeatherData,
  ObjectCatalogEntry,
  DataFetchResult,
  OrbitalDataProvider,
  ConjunctionDataProvider,
  SpaceWeatherProvider,
  ObjectCatalogProvider,
  DataSourceConfig,
} from "./types";

export { DEFAULT_DATA_SOURCE_CONFIG } from "./types";

// ─── Environmental Data Types ─────────────────────────────────────────────

export type {
  AtmosphericStats,
  AtmosphericData,
  VerificationResult,
  CopernicusVerificationReport,
  EnvironmentalDataProvider,
} from "./types-environmental";

export {
  SENTINEL5P_VARIABLES,
  DEFAULT_ATMOSPHERIC_VARIABLES,
} from "./types-environmental";

// ─── Router (EU-first with fallback) ─────────────────────────────────────────

export {
  fetchOrbitalElementsWithFallback,
  fetchCDMsWithFallback,
  fetchSpaceWeatherWithFallback,
  fetchObjectCatalog,
  fetchAtmosphericData,
} from "./router.server";

// ─── EU Providers ────────────────────────────────────────────────────────

export { discosProvider } from "./providers/discos-provider.server";
export { esaSweProvider } from "./providers/esa-swe-provider.server";
export { euSstProvider } from "./providers/eu-sst-provider.server";
export { copernicusProvider } from "./providers/copernicus-cams-provider.server";

// ─── US Providers ────────────────────────────────────────────────────────

export { celestrakProvider } from "./providers/celestrak-provider.server";
export { noaaProvider } from "./providers/noaa-provider.server";
export { spaceTrackProvider } from "./providers/spacetrack-provider.server";
