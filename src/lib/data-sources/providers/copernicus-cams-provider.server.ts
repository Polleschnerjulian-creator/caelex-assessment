import "server-only";

/**
 * Copernicus Atmosphere Monitoring — Sentinel Hub Provider
 *
 * EU-primary atmospheric data source using Sentinel-5P TROPOMI instrument
 * via the Copernicus Data Space Ecosystem (CDSE) Sentinel Hub APIs.
 *
 * APIs used:
 *   Statistical API — mean/min/max/stDev for NO2, CO, aerosol over a polygon
 *   Process API    — rendered map image (PNG) of atmospheric concentrations
 *
 * Auth: OAuth2 client credentials via CDSE Identity Server
 * Free tier: 10,000 requests/month (no credit card)
 * Legal basis: EU Regulation 2021/696 (Space Programme Regulation)
 */

import type { ProviderInfo } from "@/lib/data-sources/types";
import type {
  EnvironmentalDataProvider,
  AtmosphericData,
  AtmosphericStats,
} from "@/lib/data-sources/types-environmental";
import {
  SENTINEL5P_VARIABLES,
  DEFAULT_ATMOSPHERIC_VARIABLES,
} from "@/lib/data-sources/types-environmental";
import { polygonFromCenter } from "@/data/launch-sites";

// ─── Configuration ──────────────────────────────────────────────────────────

const IDENTITY_URL =
  "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token";
const SH_BASE = "https://sh.dataspace.copernicus.eu/api/v1";
const TIMEOUT_MS = 15_000;

const PROVIDER_INFO: ProviderInfo = {
  name: "Copernicus Sentinel-5P TROPOMI (CDSE Sentinel Hub)",
  region: "EU",
  baseUrl: "https://sh.dataspace.copernicus.eu",
  legalBasis:
    "Regulation (EU) 2021/696 — EU Space Programme; Copernicus free & open data policy",
  requiresInstitutionalAccess: false,
};

// ─── OAuth2 Token Cache ─────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const clientId = process.env.COPERNICUS_CLIENT_ID;
  const clientSecret = process.env.COPERNICUS_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("COPERNICUS_CLIENT_ID or COPERNICUS_CLIENT_SECRET not set");
  }

  const res = await fetch(IDENTITY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`CDSE OAuth failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = json.access_token;
  tokenExpiresAt = Date.now() + json.expires_in * 1000;
  return cachedToken;
}

// ─── Evalscripts ────────────────────────────────────────────────────────────

function statsEvalscript(band: string): string {
  return `//VERSION=3
function setup() {
  return {
    input: [{ bands: ["${band}", "dataMask"] }],
    output: [
      { id: "output", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  if (s.dataMask === 0) return { output: [NaN], dataMask: [0] };
  return { output: [s.${band}], dataMask: [1] };
}`;
}

const MAP_EVALSCRIPT_NO2 = `//VERSION=3
function setup() {
  return {
    input: ["NO2", "dataMask"],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(s) {
  if (s.dataMask === 0) return [0, 0, 0, 0];
  let v = Math.max(0, s.NO2 * 1e5);
  let r = Math.min(1, v * 4);
  let g = Math.min(1, Math.max(0, 0.8 - Math.abs(v - 0.3) * 3));
  let b = Math.min(1, Math.max(0, 0.9 - v * 2));
  let a = Math.min(1, v * 8 + 0.15);
  return [r * 255, g * 255, b * 255, a * 255];
}`;

const MAP_EVALSCRIPT_CO = `//VERSION=3
function setup() {
  return {
    input: ["CO", "dataMask"],
    output: { bands: 4, sampleType: "AUTO" }
  };
}
function evaluatePixel(s) {
  if (s.dataMask === 0) return [0, 0, 0, 0];
  let v = Math.max(0, s.CO * 30);
  let r = Math.min(1, v * 2);
  let g = Math.min(1, Math.max(0, 1 - v * 1.5));
  let b = Math.min(1, Math.max(0, 0.3 - v));
  let a = Math.min(1, v * 5 + 0.15);
  return [r * 255, g * 255, b * 255, a * 255];
}`;

const MAP_EVALSCRIPTS: Record<string, string> = {
  NO2: MAP_EVALSCRIPT_NO2,
  CO: MAP_EVALSCRIPT_CO,
};

// ─── Statistical API ────────────────────────────────────────────────────────

async function fetchStats(
  token: string,
  polygon: number[][],
  dateRange: { from: string; to: string },
  band: string,
): Promise<{
  mean: number;
  min: number;
  max: number;
  stDev: number;
  count: number;
} | null> {
  const body = {
    input: {
      bounds: {
        geometry: {
          type: "Polygon",
          coordinates: [polygon],
        },
      },
      data: [
        {
          type: "sentinel-5p-l2",
          dataFilter: {
            timeRange: { from: dateRange.from, to: dateRange.to },
          },
          processing: { minQa: 50 },
        },
      ],
    },
    aggregation: {
      timeRange: { from: dateRange.from, to: dateRange.to },
      aggregationInterval: { of: "P1D" },
      evalscript: statsEvalscript(band),
      resx: 0.01,
      resy: 0.01,
    },
  };

  const res = await fetch(`${SH_BASE}/statistics`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[copernicus] Statistics API error for ${band} (${res.status}): ${text}`,
    );
    return null;
  }

  const json = (await res.json()) as {
    data: Array<{
      outputs: {
        output: {
          bands: {
            B0: {
              stats: {
                mean: number;
                min: number;
                max: number;
                stDev: number;
                sampleCount: number;
              };
            };
          };
        };
      };
    }>;
  };

  const entries = json.data;
  if (!entries || entries.length === 0) return null;

  // Aggregate across all daily intervals
  let totalMean = 0;
  let globalMin = Infinity;
  let globalMax = -Infinity;
  let totalStDev = 0;
  let totalCount = 0;
  let validDays = 0;

  for (const entry of entries) {
    const stats = entry.outputs?.output?.bands?.B0?.stats;
    if (!stats || stats.sampleCount === 0) continue;
    totalMean += stats.mean;
    globalMin = Math.min(globalMin, stats.min);
    globalMax = Math.max(globalMax, stats.max);
    totalStDev += stats.stDev;
    totalCount += stats.sampleCount;
    validDays++;
  }

  if (validDays === 0) return null;

  return {
    mean: totalMean / validDays,
    min: globalMin === Infinity ? 0 : globalMin,
    max: globalMax === -Infinity ? 0 : globalMax,
    stDev: totalStDev / validDays,
    count: totalCount,
  };
}

// ─── Process API (Map Image) ────────────────────────────────────────────────

async function fetchProcessImage(
  token: string,
  polygon: number[][],
  variable: string,
  dateRange: { from: string; to: string },
  width: number,
  height: number,
): Promise<Buffer | null> {
  const evalscript = MAP_EVALSCRIPTS[variable] ?? MAP_EVALSCRIPT_NO2;

  // Calculate bbox from polygon
  const lons = polygon.map((p) => p[0]);
  const lats = polygon.map((p) => p[1]);
  const bbox = [
    Math.min(...lons),
    Math.min(...lats),
    Math.max(...lons),
    Math.max(...lats),
  ];

  const body = {
    input: {
      bounds: {
        bbox,
        properties: { crs: "http://www.opengis.net/def/crs/EPSG/0/4326" },
      },
      data: [
        {
          type: "sentinel-5p-l2",
          dataFilter: {
            timeRange: { from: dateRange.from, to: dateRange.to },
          },
          processing: { minQa: 50 },
        },
      ],
    },
    output: {
      width,
      height,
      responses: [{ identifier: "default", format: { type: "image/png" } }],
    },
    evalscript,
  };

  const res = await fetch(`${SH_BASE}/process`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "image/png",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(20_000),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error(
      `[copernicus] Process API error for ${variable} (${res.status}): ${text}`,
    );
    return null;
  }

  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

// ─── Provider Implementation ────────────────────────────────────────────────

export const copernicusProvider: EnvironmentalDataProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  isConfigured(): boolean {
    return !!(
      process.env.COPERNICUS_CLIENT_ID && process.env.COPERNICUS_CLIENT_SECRET
    );
  },

  async fetchAtmosphericStats(
    lat: number,
    lon: number,
    radiusKm: number,
    dateRange: { from: string; to: string },
    variables?: string[],
  ): Promise<AtmosphericData | null> {
    if (!this.isConfigured()) return null;

    const token = await getAccessToken();
    const polygon = polygonFromCenter(lat, lon, radiusKm);
    const vars = variables ?? DEFAULT_ATMOSPHERIC_VARIABLES;

    const measurements: AtmosphericStats[] = [];

    // Fetch each variable in parallel
    const results = await Promise.allSettled(
      vars.map(async (varKey) => {
        const varDef = SENTINEL5P_VARIABLES[varKey];
        if (!varDef) return null;

        const raw = await fetchStats(token, polygon, dateRange, varDef.band);
        if (!raw) return null;

        return {
          variable: varKey,
          displayName: varDef.displayName,
          unit: varDef.unit,
          mean: raw.mean * varDef.scaleFactor,
          min: raw.min * varDef.scaleFactor,
          max: raw.max * varDef.scaleFactor,
          stDev: raw.stDev * varDef.scaleFactor,
          sampleCount: raw.count,
        } satisfies AtmosphericStats;
      }),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value) {
        measurements.push(r.value);
      }
    }

    if (measurements.length === 0) return null;

    return {
      launchSite: `${lat.toFixed(2)}°, ${lon.toFixed(2)}°`,
      lat,
      lon,
      radiusKm,
      dateRange,
      measurements,
      fetchedAt: new Date().toISOString(),
      source: PROVIDER_INFO,
    };
  },

  async fetchMapImage(
    lat: number,
    lon: number,
    radiusKm: number,
    variable: string,
    dateRange: { from: string; to: string },
    width = 512,
    height = 512,
  ): Promise<Buffer | null> {
    if (!this.isConfigured()) return null;

    const token = await getAccessToken();
    const polygon = polygonFromCenter(lat, lon, radiusKm);

    return fetchProcessImage(
      token,
      polygon,
      variable,
      dateRange,
      width,
      height,
    );
  },
};
