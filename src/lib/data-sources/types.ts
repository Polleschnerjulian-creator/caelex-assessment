/**
 * Unified Data Source Provider Interface
 *
 * Abstraction layer for space data providers. EU sources are primary,
 * US sources are fallback. Every data fetch is logged with source
 * provenance for compliance audit trail.
 *
 * Provider families:
 *   EU: ESA DISCOS (catalog), ESA SWE HAPI (space weather), EU SST (conjunctions)
 *   US: CelesTrak (TLEs), NOAA SWPC (space weather), Space-Track (CDMs)
 *   Commercial: LeoLabs (CDMs, operator BYOK)
 */

import type { OrbitalElements } from "@/lib/ephemeris/core/types";
import type { ParsedCDM } from "@/lib/shield/types";

// ─── Provider Metadata ──────────────────────────────────────────────────────

export type ProviderRegion = "EU" | "US" | "COMMERCIAL";

export interface ProviderInfo {
  name: string;
  region: ProviderRegion;
  /** Base URL of the data source */
  baseUrl: string;
  /** Legal basis / regulation enabling this data source */
  legalBasis: string | null;
  /** Whether this provider requires registration/approval beyond an API key */
  requiresInstitutionalAccess: boolean;
}

// ─── Data Types ─────────────────────────────────────────────────────────────

export interface SpaceWeatherData {
  f107: number;
  kpIndex: number | null;
  observedAt: string;
  source: string;
  /** Predicted F10.7 values for next N months (if available) */
  predictions: Array<{ month: string; f107: number }> | null;
}

export interface ObjectCatalogEntry {
  noradId: string;
  cosparId: string | null;
  name: string;
  objectClass: "Payload" | "Rocket Body" | "Debris" | "Unknown";
  mass: number | null;
  launchDate: string | null;
  decayDate: string | null;
  orbitType: string | null;
  source: string;
}

export interface DataFetchResult<T> {
  data: T | null;
  source: ProviderInfo;
  fetchedAt: string;
  fallbackUsed: boolean;
  /** If fallback was used, why did primary fail? */
  primaryFailureReason: string | null;
  /** Duration in ms */
  durationMs: number;
}

// ─── Provider Interfaces ────────────────────────────────────────────────────

/** Provider for orbital element data (TLEs, GP elements) */
export interface OrbitalDataProvider {
  getInfo(): ProviderInfo;
  fetchOrbitalElements(noradId: string): Promise<OrbitalElements | null>;
  isConfigured(): boolean;
}

/** Provider for conjunction / CDM data */
export interface ConjunctionDataProvider {
  getInfo(): ProviderInfo;
  fetchCDMs(noradIds: string[], sinceDays?: number): Promise<ParsedCDM[]>;
  isConfigured(): boolean;
}

/** Provider for space weather data */
export interface SpaceWeatherProvider {
  getInfo(): ProviderInfo;
  fetchCurrentConditions(): Promise<SpaceWeatherData | null>;
  isConfigured(): boolean;
}

/** Provider for space object catalog data */
export interface ObjectCatalogProvider {
  getInfo(): ProviderInfo;
  fetchObject(noradId: string): Promise<ObjectCatalogEntry | null>;
  searchObjects(query: string): Promise<ObjectCatalogEntry[]>;
  isConfigured(): boolean;
}

// ─── Router Configuration ───────────────────────────────────────────────────

export interface DataSourceConfig {
  /** Which region to prefer as primary */
  primaryRegion: ProviderRegion;
  /** Timeout before falling back to secondary (ms) */
  fallbackTimeoutMs: number;
  /** Log all data source usage to audit trail */
  auditLogging: boolean;
}

export const DEFAULT_DATA_SOURCE_CONFIG: DataSourceConfig = {
  primaryRegion: "EU",
  fallbackTimeoutMs: 8000,
  auditLogging: true,
};
