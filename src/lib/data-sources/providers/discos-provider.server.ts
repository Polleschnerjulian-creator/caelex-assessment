import "server-only";

// Registered at https://cosmos.esa.int — EU_DISCOS_API_KEY env var required

import type {
  ObjectCatalogProvider,
  ObjectCatalogEntry,
  ProviderInfo,
} from "@/lib/data-sources/types";
import { logger } from "@/lib/logger";

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

// ─── JSON:API Response Types (from OpenAPI v2 spec) ─────────────────────────

/** /objects attributes — per openapi-v2.yml #/components/schemas/object */
interface DISCOSObjectAttributes {
  cosparId: string | null;
  satno: number | null;
  vimpelId: number | null;
  name: string | null;
  objectClass: string | null;
  mass: number | null;
  shape: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  diameter: number | null;
  span: number | null;
  xSectMax: number | null;
  xSectMin: number | null;
  xSectAvg: number | null;
  firstEpoch: string | null;
  mission: string | null;
  predDecayDate: string | null;
  active: boolean | null;
  cataloguedFragments?: number | null;
  onOrbitCataloguedFragments?: number | null;
}

/** /launches attributes — per openapi-v2.yml #/components/schemas/launch */
interface DISCOSLaunchAttributes {
  epoch: string | null;
  flightNo: string | null;
  cosparLaunchNo: string | null;
  failure: boolean;
}

/** /reentries attributes — per openapi-v2.yml #/components/schemas/reentry */
interface DISCOSReentryAttributes {
  epoch: string;
}

/** /fragmentations attributes — per openapi-v2.yml #/components/schemas/fragmentation */
interface DISCOSFragmentationAttributes {
  epoch: string;
  comment: string | null;
  latitude: string | null;
  longitude: string | null;
  altitude: number | null;
}

/** Generic JSON:API data item */
interface DISCOSDataItem<T> {
  id: string;
  type: string;
  attributes: T;
  relationships?: Record<
    string,
    { links?: { self?: string; related?: string } }
  >;
}

/** JSON:API collection response */
interface DISCOSCollectionResponse<T> {
  data: DISCOSDataItem<T>[];
  meta?: {
    pagination?: {
      totalPages: number;
      currentPage: number;
      pageSize: number;
      totalElements: number;
    };
  };
}

/** JSON:API single-item response */
interface DISCOSSingleResponse<T> {
  data: DISCOSDataItem<T>;
}

// ─── Exported Result Types ──────────────────────────────────────────────────

export interface DISCOSObject extends ObjectCatalogEntry {
  discosId: string;
  shape: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  diameter: number | null;
  span: number | null;
  xSectMax: number | null;
  xSectMin: number | null;
  xSectAvg: number | null;
  active: boolean | null;
  mission: string | null;
  cataloguedFragments: number | null;
  onOrbitFragments: number | null;
}

export interface DISCOSLaunch {
  id: string;
  epoch: string | null;
  flightNo: string | null;
  cosparLaunchNo: string | null;
  failure: boolean;
  source: string;
}

export interface DISCOSReentry {
  id: string;
  epoch: string;
  source: string;
}

export interface DISCOSFragmentation {
  id: string;
  epoch: string;
  comment: string | null;
  latitude: string | null;
  longitude: string | null;
  altitude: number | null;
  source: string;
}

// ─── Core Fetch ─────────────────────────────────────────────────────────────

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

interface RateLimitInfo {
  limit: number | null;
  remaining: number | null;
  reset: number | null;
}

async function discosFetch<T>(
  path: string,
  params?: Record<string, string>,
): Promise<{ data: T | null; rateLimit: RateLimitInfo }> {
  const url = new URL(`${DISCOS_BASE_URL}${path}`);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url.toString(), {
      headers: buildHeaders(),
      signal: controller.signal,
    });
    clearTimeout(timer);

    const rateLimit: RateLimitInfo = {
      limit: res.headers.get("X-RateLimit-Limit")
        ? Number(res.headers.get("X-RateLimit-Limit"))
        : null,
      remaining: res.headers.get("X-RateLimit-Remaining")
        ? Number(res.headers.get("X-RateLimit-Remaining"))
        : null,
      reset: res.headers.get("X-RateLimit-Reset")
        ? Number(res.headers.get("X-RateLimit-Reset"))
        : null,
    };

    if (res.status === 429) {
      logger.warn(
        `[DISCOS] Rate limited (429). Remaining: ${rateLimit.remaining}, Reset: ${rateLimit.reset}`,
      );
      return { data: null, rateLimit };
    }

    if (res.status === 401 || res.status === 403) {
      logger.warn(
        `[DISCOS] Auth error: ${res.status}. Check EU_DISCOS_API_KEY.`,
      );
      return { data: null, rateLimit };
    }

    if (res.status === 400) {
      const body = await res.json().catch(() => null);
      logger.warn(
        `[DISCOS] Bad request (400): ${JSON.stringify(body?.errors ?? body)}`,
      );
      return { data: null, rateLimit };
    }

    if (!res.ok) {
      logger.warn(`[DISCOS] HTTP ${res.status} for ${path}`);
      return { data: null, rateLimit };
    }

    const json = (await res.json()) as T;
    return { data: json, rateLimit };
  } catch (err) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : "unknown";
    logger.warn(`[DISCOS] Fetch failed for ${path}: ${msg}`);
    return {
      data: null,
      rateLimit: { limit: null, remaining: null, reset: null },
    };
  }
}

// ─── Mappers ────────────────────────────────────────────────────────────────

function mapObjectClass(raw: string | null): ObjectCatalogEntry["objectClass"] {
  if (!raw) return "Unknown";
  const lower = raw.toLowerCase();
  if (lower.includes("payload")) return "Payload";
  if (lower.includes("rocket")) return "Rocket Body";
  if (lower.includes("debris")) return "Debris";
  return "Unknown";
}

function mapObject(item: DISCOSDataItem<DISCOSObjectAttributes>): DISCOSObject {
  const a = item.attributes;
  return {
    discosId: item.id,
    noradId: a.satno != null ? String(a.satno) : item.id,
    cosparId: a.cosparId ?? null,
    name: a.name ?? "Unknown",
    objectClass: mapObjectClass(a.objectClass),
    mass: a.mass ?? null,
    launchDate: a.firstEpoch ?? null,
    decayDate: a.predDecayDate ?? null,
    orbitType: null,
    source: "ESA DISCOS",
    shape: a.shape ?? null,
    width: a.width ?? null,
    height: a.height ?? null,
    depth: a.depth ?? null,
    diameter: a.diameter ?? null,
    span: a.span ?? null,
    xSectMax: a.xSectMax ?? null,
    xSectMin: a.xSectMin ?? null,
    xSectAvg: a.xSectAvg ?? null,
    active: a.active ?? null,
    mission: a.mission ?? null,
    cataloguedFragments: a.cataloguedFragments ?? null,
    onOrbitFragments: a.onOrbitCataloguedFragments ?? null,
  };
}

function mapLaunch(item: DISCOSDataItem<DISCOSLaunchAttributes>): DISCOSLaunch {
  return {
    id: item.id,
    epoch: item.attributes.epoch ?? null,
    flightNo: item.attributes.flightNo ?? null,
    cosparLaunchNo: item.attributes.cosparLaunchNo ?? null,
    failure: item.attributes.failure,
    source: "ESA DISCOS",
  };
}

function mapReentry(
  item: DISCOSDataItem<DISCOSReentryAttributes>,
): DISCOSReentry {
  return {
    id: item.id,
    epoch: item.attributes.epoch,
    source: "ESA DISCOS",
  };
}

function mapFragmentation(
  item: DISCOSDataItem<DISCOSFragmentationAttributes>,
): DISCOSFragmentation {
  return {
    id: item.id,
    epoch: item.attributes.epoch,
    comment: item.attributes.comment ?? null,
    latitude: item.attributes.latitude ?? null,
    longitude: item.attributes.longitude ?? null,
    altitude: item.attributes.altitude ?? null,
    source: "ESA DISCOS",
  };
}

// ─── Public API Functions ───────────────────────────────────────────────────

/**
 * Fetch objects with optional filter.
 * Filter syntax: "eq(objectClass,Payload)", "gt(mass,1000)", "contains(name,'Sentinel')"
 */
export async function fetchObjects(params?: {
  filter?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
}): Promise<DISCOSObject[]> {
  const qp: Record<string, string> = {};
  if (params?.filter) qp.filter = params.filter;
  if (params?.sort) qp.sort = params.sort;
  if (params?.pageSize) qp["page[size]"] = String(params.pageSize);
  if (params?.pageNumber) qp["page[number]"] = String(params.pageNumber);

  const { data } = await discosFetch<
    DISCOSCollectionResponse<DISCOSObjectAttributes>
  >("/objects", qp);
  if (!data?.data) return [];
  return data.data.map(mapObject);
}

/** Fetch a single object by DISCOS ID */
export async function fetchObjectById(
  discosId: string,
): Promise<DISCOSObject | null> {
  const { data } = await discosFetch<
    DISCOSSingleResponse<DISCOSObjectAttributes>
  >(`/objects/${encodeURIComponent(discosId)}`);
  if (!data?.data) return null;
  return mapObject(data.data);
}

/** Fetch a single object by NORAD catalog number */
export async function fetchObjectByNorad(
  noradId: string,
): Promise<DISCOSObject | null> {
  const results = await fetchObjects({
    filter: `eq(satno,${noradId})`,
    pageSize: 1,
  });
  return results[0] ?? null;
}

/** Search objects by name */
export async function searchObjectsByName(
  query: string,
  pageSize = 20,
): Promise<DISCOSObject[]> {
  return fetchObjects({
    filter: `contains(name,'${query.replace(/'/g, "\\'")}')`,
    pageSize,
  });
}

/**
 * Fetch launches with optional filter.
 * Filter syntax: "eq(cosparLaunchNo,'2024-001')", "gt(epoch,epoch:'2024-01-01')"
 */
export async function fetchLaunches(params?: {
  filter?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
}): Promise<DISCOSLaunch[]> {
  const qp: Record<string, string> = {};
  if (params?.filter) qp.filter = params.filter;
  if (params?.sort) qp.sort = params.sort;
  if (params?.pageSize) qp["page[size]"] = String(params.pageSize);
  if (params?.pageNumber) qp["page[number]"] = String(params.pageNumber);

  const { data } = await discosFetch<
    DISCOSCollectionResponse<DISCOSLaunchAttributes>
  >("/launches", qp);
  if (!data?.data) return [];
  return data.data.map(mapLaunch);
}

/**
 * Fetch reentries with optional filter.
 * Filter syntax: "gt(epoch,epoch:'2024-01-01')"
 */
export async function fetchReentries(params?: {
  filter?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
}): Promise<DISCOSReentry[]> {
  const qp: Record<string, string> = {};
  if (params?.filter) qp.filter = params.filter;
  if (params?.sort) qp.sort = params.sort;
  if (params?.pageSize) qp["page[size]"] = String(params.pageSize);
  if (params?.pageNumber) qp["page[number]"] = String(params.pageNumber);

  const { data } = await discosFetch<
    DISCOSCollectionResponse<DISCOSReentryAttributes>
  >("/reentries", qp);
  if (!data?.data) return [];
  return data.data.map(mapReentry);
}

/**
 * Fetch fragmentation events with optional filter.
 */
export async function fetchFragmentations(params?: {
  filter?: string;
  sort?: string;
  pageSize?: number;
  pageNumber?: number;
}): Promise<DISCOSFragmentation[]> {
  const qp: Record<string, string> = {};
  if (params?.filter) qp.filter = params.filter;
  if (params?.sort) qp.sort = params.sort;
  if (params?.pageSize) qp["page[size]"] = String(params.pageSize);
  if (params?.pageNumber) qp["page[number]"] = String(params.pageNumber);

  const { data } = await discosFetch<
    DISCOSCollectionResponse<DISCOSFragmentationAttributes>
  >("/fragmentations", qp);
  if (!data?.data) return [];
  return data.data.map(mapFragmentation);
}

// ─── ObjectCatalogProvider Interface ────────────────────────────────────────

export const discosProvider: ObjectCatalogProvider = {
  getInfo(): ProviderInfo {
    return PROVIDER_INFO;
  },

  isConfigured(): boolean {
    return !!process.env.EU_DISCOS_API_KEY;
  },

  async fetchObject(noradId: string): Promise<ObjectCatalogEntry | null> {
    return fetchObjectByNorad(noradId);
  },

  async searchObjects(query: string): Promise<ObjectCatalogEntry[]> {
    return searchObjectsByName(query);
  },
};
