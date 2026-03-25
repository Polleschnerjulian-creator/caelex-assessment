// ─── Atmospheric / Environmental Data Types ─────────────────────────────────
// Types for Copernicus Sentinel-5P atmospheric data integration.

import type { ProviderInfo } from "./types";

/** Single variable statistics from Sentinel Hub Statistical API */
export interface AtmosphericStats {
  variable: string;
  displayName: string;
  unit: string;
  mean: number;
  min: number;
  max: number;
  stDev: number;
  sampleCount: number;
}

/** Complete atmospheric data response for a location */
export interface AtmosphericData {
  launchSite: string;
  lat: number;
  lon: number;
  radiusKm: number;
  dateRange: { from: string; to: string };
  measurements: AtmosphericStats[];
  fetchedAt: string;
  source: ProviderInfo;
}

/** Verification of declared vs. measured environmental values */
export interface VerificationResult {
  metric: string;
  displayName: string;
  declared: number | null;
  measured: number;
  unit: string;
  deviationPercent: number | null;
  status: "verified" | "warning" | "discrepancy" | "no_declaration";
}

/** Full verification report for the dashboard */
export interface CopernicusVerificationReport {
  launchSite: string;
  launchSiteCoords: { lat: number; lon: number };
  atmospheric: AtmosphericData;
  verifications: VerificationResult[];
  overallStatus: "verified" | "warning" | "discrepancy" | "pending";
  mapAvailable: boolean;
}

/** Provider interface for environmental data sources */
export interface EnvironmentalDataProvider {
  getInfo(): ProviderInfo;
  isConfigured(): boolean;
  fetchAtmosphericStats(
    lat: number,
    lon: number,
    radiusKm: number,
    dateRange: { from: string; to: string },
    variables?: string[],
  ): Promise<AtmosphericData | null>;
  fetchMapImage(
    lat: number,
    lon: number,
    radiusKm: number,
    variable: string,
    dateRange: { from: string; to: string },
    width?: number,
    height?: number,
  ): Promise<Buffer | null>;
}

/** Sentinel-5P variable definitions */
export const SENTINEL5P_VARIABLES: Record<
  string,
  { band: string; displayName: string; unit: string; scaleFactor: number }
> = {
  NO2: {
    band: "NO2",
    displayName: "Nitrogen Dioxide",
    unit: "µmol/m²",
    scaleFactor: 1e6, // mol/m² → µmol/m²
  },
  CO: {
    band: "CO",
    displayName: "Carbon Monoxide",
    unit: "mmol/m²",
    scaleFactor: 1e3, // mol/m² → mmol/m²
  },
  AER_AI: {
    band: "AER_AI_340_380",
    displayName: "Aerosol Index",
    unit: "index",
    scaleFactor: 1,
  },
  O3: {
    band: "O3",
    displayName: "Ozone",
    unit: "mmol/m²",
    scaleFactor: 1e3,
  },
  SO2: {
    band: "SO2",
    displayName: "Sulphur Dioxide",
    unit: "µmol/m²",
    scaleFactor: 1e6,
  },
};

/** Default variables to fetch for EFD verification */
export const DEFAULT_ATMOSPHERIC_VARIABLES = ["NO2", "CO", "AER_AI"];
