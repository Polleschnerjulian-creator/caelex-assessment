import "server-only";

// Registered at https://cosmos.esa.int — EU_DISCOS_API_KEY env var required

import type {
  ObjectCatalogProvider,
  ObjectCatalogEntry,
  ProviderInfo,
} from "@/lib/data-sources/types";

// ─── Configuration ──────────────────────────────────────────────────────────

const DISCOS_BASE_URL = "https://discosweb.esoc.esa.int/api";
const TIMEOUT_MS = 8000;

const PROVIDER_INFO: ProviderInfo = {
  name: "ESA DISCOS",
  region: "EU",
  baseUrl: DISCOS_BASE_URL,
  legalBasis:
    "ESA Space Debris Office — public catalog data under ESA data policy",
  requiresInstitutionalAccess: false,
};

// ─── JSON:API Response Shape ─────────────────────────────────────────────────

interface DISCOSAttributes {
  satno: number | null;
  cosparId: string | null;
  name: string | null;
  objectClass: string | null;
  mass: number | null;
  shape: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  span: number | null;
  xSectMax: number | null;
  xSectAvg: number | null;
  firstEpoch: string | null;
  predDecayDate: string | null;
  mission: string | null;
  active: boolean | null;
  cataloguedFragments: number | null;
  onOrbitCataloguedFragments: number | null;
}

interface DISCOSDataItem {
  id: string;
  type: string;
  attributes: DISCOSAttributes;
}

interface DISCOSResponse {
  data: DISCOSDataItem[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getApiKey(): string | undefined {
  return process.env.EU_DISCOS_API_KEY;
}

function buildHeaders(): HeadersInit {
  const key = getApiKey();
  return {
    Authorization: `Bearer ${key ?? ""}`,
    Accept: "application/vnd.api+json",
    "DiscosWeb-Api-Version": "2",
  };
}

function mapObjectClass(raw: string | null): ObjectCatalogEntry["objectClass"] {
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("payload")) return "Payload";
  if (lower.includes("rocket") || lower.includes("debris body"))
    return "Rocket Body";
  if (lower.includes("debris")) return "Debris";
  return "Unknown";
}

function mapToEntry(item: DISCOSDataItem): ObjectCatalogEntry {
  const attr = item.attributes;
  return {
    noradId: attr.satno != null ? String(attr.satno) : item.id,
    cosparId: attr.cosparId ?? null,
    name: attr.name ?? "Unknown",
    objectClass: mapObjectClass(attr.objectClass),
    mass: attr.mass ?? null,
    launchDate: attr.firstEpoch ?? null,
    decayDate: attr.predDecayDate ?? null,
    orbitType: attr.mission ?? null,
    source: "ESA DISCOS",
  };
}

async function fetchWithTimeout(
  url: string,
  retryAfterFallbackMs = 60000,
): Promise<DISCOSResponse | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      headers: buildHeaders(),
      signal: controller.signal,
    });

    clearTimeout(timer);

    // Handle 429 with Retry-After
    if (res.status === 429) {
      const retryAfter = res.headers.get("Retry-After");
      const waitMs = retryAfter
        ? parseInt(retryAfter, 10) * 1000
        : retryAfterFallbackMs;
      console.warn(
        `[DISCOS] Rate limited (429). Retry-After: ${waitMs}ms. Not retrying automatically.`,
      );
      return null;
    }

    if (!res.ok) {
      console.warn(`[DISCOS] HTTP error: ${res.status} for ${url}`);
      return null;
    }

    return (await res.json()) as DISCOSResponse;
  } catch (err) {
    clearTimeout(timer);
    const message = err instanceof Error ? err.message : "unknown error";
    console.warn(`[DISCOS] Fetch failed for ${url}: ${message}`);
    return null;
  }
}

// ─── Provider Implementation ─────────────────────────────────────────────────

export const discosProvider: ObjectCatalogProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  isConfigured(): boolean {
    return !!process.env.EU_DISCOS_API_KEY;
  },

  async fetchObject(noradId: string): Promise<ObjectCatalogEntry | null> {
    const url = `${DISCOS_BASE_URL}/objects?filter=eq(satno,${encodeURIComponent(noradId)})`;
    const response = await fetchWithTimeout(url);
    if (!response || !response.data || response.data.length === 0) return null;
    return mapToEntry(response.data[0]!);
  },

  async searchObjects(query: string): Promise<ObjectCatalogEntry[]> {
    const url = `${DISCOS_BASE_URL}/objects?filter=contains(name,${encodeURIComponent(query)})&page[size]=20`;
    const response = await fetchWithTimeout(url);
    if (!response || !response.data) return [];
    return response.data.map(mapToEntry);
  },
};
