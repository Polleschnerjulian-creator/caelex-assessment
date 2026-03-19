import "server-only";

// TODO: Verify HAPI dataset IDs — catalog may have changed

import type {
  SpaceWeatherProvider,
  SpaceWeatherData,
  ProviderInfo,
} from "@/lib/data-sources/types";

// ─── Configuration ──────────────────────────────────────────────────────────

const ESA_SWE_HAPI_BASE = "https://swe.ssa.esa.int/hapi";
const TIMEOUT_MS = 8000;

// Known dataset IDs for ESA SWE HAPI — verify in catalog if these change
const F107_DATASET_ID = "SIDC_SOLARDISK_FLUX_F107D";
const KP_DATASET_ID = "GFZ_KPINDEX_KPAP";

const PROVIDER_INFO: ProviderInfo = {
  name: "ESA Space Weather Service (HAPI)",
  region: "EU",
  baseUrl: ESA_SWE_HAPI_BASE,
  legalBasis:
    "ESA Space Weather Service Network — public HAPI endpoint, no auth required",
  requiresInstitutionalAccess: false,
};

// ─── HAPI Response Types ─────────────────────────────────────────────────────

interface HAPICatalogEntry {
  id: string;
  title?: string;
}

interface HAPICatalogResponse {
  catalog?: HAPICatalogEntry[];
}

interface HAPIDataResponse {
  // HAPI data responses have a "data" field; the format varies by dataset.
  // We request JSON format, so it's a JSON array of arrays.
  data?: unknown[][];
  parameters?: Array<{ name: string; units?: string }>;
  startDate?: string;
  stopDate?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchWithTimeout<T>(url: string): Promise<T | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);

    if (!res.ok) {
      console.warn(`[ESA-SWE] HTTP error: ${res.status} for ${url}`);
      return null;
    }

    return (await res.json()) as T;
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "unknown error";
    console.warn(`[ESA-SWE] Fetch failed for ${url}: ${message}`);
    return null;
  }
}

/**
 * Query the HAPI catalog to check if a given dataset ID exists.
 * Returns true if the dataset is present, false otherwise.
 */
async function datasetExistsInCatalog(datasetId: string): Promise<boolean> {
  const url = `${ESA_SWE_HAPI_BASE}/catalog`;
  const catalog = await fetchWithTimeout<HAPICatalogResponse>(url);
  if (!catalog?.catalog) return false;
  return catalog.catalog.some((entry) => entry.id === datasetId);
}

/**
 * Fetch the latest data point from a HAPI dataset.
 * Uses a 2-day look-back window to maximise chances of finding a recent value.
 * Returns the raw data rows or null on failure.
 */
async function fetchLatestHAPIData(
  datasetId: string,
): Promise<HAPIDataResponse | null> {
  const stop = new Date();
  const start = new Date(stop.getTime() - 2 * 24 * 60 * 60 * 1000); // 2 days back

  const params = new URLSearchParams();
  params.set("id", datasetId);
  params.set("time.min", start.toISOString());
  params.set("time.max", stop.toISOString());
  params.set("format", "json");

  const url = `${ESA_SWE_HAPI_BASE}/data?${params.toString()}`;
  return fetchWithTimeout<HAPIDataResponse>(url);
}

/**
 * Extract a numeric value from HAPI JSON data rows.
 * Rows are arrays of [time, v1, v2, ...]; we take the last row's first value column.
 */
function extractLastValue(
  response: HAPIDataResponse,
  columnIndex = 1,
): number | null {
  if (!response.data || response.data.length === 0) return null;
  const lastRow = response.data[response.data.length - 1];
  if (!lastRow || lastRow.length <= columnIndex) return null;
  const val = lastRow[columnIndex];
  const num = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(num) ? null : num;
}

/**
 * Extract the timestamp from the last HAPI data row (column 0).
 */
function extractLastTimestamp(response: HAPIDataResponse): string {
  if (!response.data || response.data.length === 0)
    return new Date().toISOString();
  const lastRow = response.data[response.data.length - 1];
  if (!lastRow || lastRow.length === 0) return new Date().toISOString();
  return String(lastRow[0]);
}

// ─── Provider Implementation ─────────────────────────────────────────────────

export const esaSweProvider: SpaceWeatherProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  isConfigured(): boolean {
    // No auth needed — always available
    return true;
  },

  async fetchCurrentConditions(): Promise<SpaceWeatherData | null> {
    try {
      // Step 1: Verify F10.7 dataset exists in HAPI catalog
      const f107DatasetFound = await datasetExistsInCatalog(F107_DATASET_ID);
      if (!f107DatasetFound) {
        console.warn(
          `[ESA-SWE] F10.7 dataset "${F107_DATASET_ID}" not found in HAPI catalog. ` +
            `The catalog may have changed — see TODO at top of file.`,
        );
        return null;
      }

      // Step 2: Fetch latest F10.7 data point
      const f107Response = await fetchLatestHAPIData(F107_DATASET_ID);
      if (!f107Response) {
        console.warn("[ESA-SWE] Failed to fetch F10.7 data from HAPI");
        return null;
      }

      const f107 = extractLastValue(f107Response, 1);
      if (f107 === null) {
        console.warn("[ESA-SWE] No valid F10.7 value found in HAPI response");
        return null;
      }

      const observedAt = extractLastTimestamp(f107Response);

      // Step 3: Attempt Kp index (best-effort, not required)
      let kpIndex: number | null = null;
      try {
        const kpDatasetFound = await datasetExistsInCatalog(KP_DATASET_ID);
        if (kpDatasetFound) {
          const kpResponse = await fetchLatestHAPIData(KP_DATASET_ID);
          if (kpResponse) {
            kpIndex = extractLastValue(kpResponse, 1);
          }
        }
      } catch {
        // Kp is optional — swallow error gracefully
        console.warn("[ESA-SWE] Kp index fetch failed (non-critical)");
      }

      console.info(
        `[ESA-SWE] Fetched space weather: F10.7=${f107}, Kp=${kpIndex ?? "n/a"}, ` +
          `observedAt=${observedAt}`,
      );

      return {
        f107,
        kpIndex,
        observedAt,
        source: "ESA Space Weather Service (HAPI)",
        predictions: null, // HAPI historical data only; no prediction endpoint mapped
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown error";
      console.warn(
        `[ESA-SWE] fetchCurrentConditions failed gracefully: ${message}`,
      );
      return null;
    }
  },
};
