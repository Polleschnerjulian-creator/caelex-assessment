/**
 * GLEIF Adapter (Sprint A1, Pre-Knowledge Engine)
 *
 * Global Legal Entity Identifier Foundation public API.
 * - Endpoint: api.gleif.org/api/v1/
 * - Free, no auth, JSON-API specification (jsonapi.org)
 * - Returns: LEI, legal name, jurisdiction, HQ address, entity status,
 *   parent + ultimate-parent LEI (ownership chain).
 *
 * Strengths vs VIES:
 * - Global coverage (not just EU)
 * - Includes ownership structure (parent / ultimate parent LEI)
 * - Stable JSON-API response shape
 *
 * Limits:
 * - Only entities with an issued LEI (smaller-cap companies often don't).
 * - Name search is fuzzy — multiple matches possible.
 *
 * Pattern follows vies-adapter.ts (same cache + timeout + soft-fail).
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import {
  type AdapterOutput,
  type CompanySize,
  type EntityStatus,
  makeField,
} from "./types";

// ─── Configuration ─────────────────────────────────────────────────────────

const GLEIF_BASE = "https://api.gleif.org/api/v1";
const GLEIF_TIMEOUT_MS = 10_000;
const GLEIF_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d — LEI records change slowly

/** Confidence for direct LEI lookups — authoritative, ISO 17442 standard. */
const GLEIF_DIRECT_CONFIDENCE = 0.95;
/** Confidence for name-based fuzzy matches (lower; multiple candidates possible). */
const GLEIF_FUZZY_CONFIDENCE = 0.6;
/** Confidence for inferred parent/ultimate-parent relations. */
const GLEIF_OWNERSHIP_CONFIDENCE = 0.9;

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  data: T | null;
  fetchedAt: number;
}

const leiCache = new Map<string, CacheEntry<GleifLeiRecord>>();
const nameCache = new Map<string, CacheEntry<GleifLeiRecord[]>>();
const ownershipCache = new Map<string, CacheEntry<GleifOwnership>>();

// ─── Raw GLEIF JSON-API shapes ─────────────────────────────────────────────

interface GleifLeiRecord {
  type: "lei-records";
  id: string; // the LEI itself
  attributes: {
    lei: string;
    entity: {
      legalName: { name: string; language?: string };
      otherNames?: Array<{ name: string; type?: string }>;
      legalAddress: GleifAddress;
      headquartersAddress: GleifAddress;
      registeredAt?: { id: string; other?: string };
      jurisdiction: string; // ISO 3166 country code or sub-jurisdiction
      legalForm?: { id?: string; other?: string };
      status:
        | "ACTIVE"
        | "INACTIVE"
        | "ANNULLED"
        | "MERGED"
        | "DUPLICATE"
        | string;
      creationDate?: string; // ISO date
      subCategory?: string;
    };
    registration: {
      initialRegistrationDate: string;
      lastUpdateDate: string;
      status: "ISSUED" | "LAPSED" | "ANNULLED" | string;
      nextRenewalDate?: string;
    };
  };
}

interface GleifAddress {
  language?: string;
  addressLines: string[];
  city: string;
  region?: string;
  country: string;
  postalCode?: string;
}

interface GleifOwnership {
  directParentLei?: string;
  ultimateParentLei?: string;
}

interface GleifSearchResponse {
  data: GleifLeiRecord[];
  meta?: { pagination?: { total?: number } };
}

interface GleifDirectResponse {
  data: GleifLeiRecord;
}

interface GleifRelationshipResponse {
  data?: {
    type: string;
    relationships?: {
      "lei-record"?: { data?: { id?: string } };
    };
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

/** Direct lookup by 20-character LEI. */
export async function lookupGleifByLei(lei: string): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const cleaned = lei.toUpperCase().replace(/\s+/g, "");
  if (!isValidLei(cleaned)) {
    return softFail(
      startedAt,
      t0,
      `Invalid LEI format: expected 20 alphanumeric chars`,
    );
  }

  const record = await fetchLeiRecord(cleaned);
  if (!record) {
    return softFail(startedAt, t0, `LEI ${cleaned} not found in GLEIF`);
  }

  const ownership = await fetchOwnership(cleaned);
  return mapGleifRecord(
    record,
    ownership,
    GLEIF_DIRECT_CONFIDENCE,
    startedAt,
    t0,
  );
}

/**
 * Search GLEIF by legal name.
 *
 * Returns the best match (first ACTIVE record); if multiple candidates exist
 * the adapter still returns one but at lower confidence so the orchestrator
 * can de-prioritize this source. Returns empty fields if no match.
 */
export async function searchGleifByName(
  name: string,
  countryCode?: string,
): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  if (!name || name.trim().length < 3) {
    return softFail(
      startedAt,
      t0,
      "Name search requires at least 3 characters",
    );
  }

  const records = await searchByName(name.trim(), countryCode);
  if (!records || records.length === 0) {
    return softFail(startedAt, t0, "No GLEIF match for name");
  }

  // Prefer ACTIVE entity status, then ISSUED registration status,
  // then most-recently-updated record.
  const ranked = [...records].sort((a, b) => {
    const aActive = a.attributes.entity.status === "ACTIVE" ? 1 : 0;
    const bActive = b.attributes.entity.status === "ACTIVE" ? 1 : 0;
    if (aActive !== bActive) return bActive - aActive;
    const aIssued = a.attributes.registration.status === "ISSUED" ? 1 : 0;
    const bIssued = b.attributes.registration.status === "ISSUED" ? 1 : 0;
    if (aIssued !== bIssued) return bIssued - aIssued;
    return (
      Date.parse(b.attributes.registration.lastUpdateDate) -
      Date.parse(a.attributes.registration.lastUpdateDate)
    );
  });

  const best = ranked[0]!;
  // Lower confidence: fuzzy. If only 1 candidate total, bump confidence a bit.
  const confidence =
    records.length === 1
      ? GLEIF_FUZZY_CONFIDENCE + 0.15
      : GLEIF_FUZZY_CONFIDENCE;

  const ownership = await fetchOwnership(best.id);
  return mapGleifRecord(best, ownership, confidence, startedAt, t0);
}

/** Stand-alone ownership-chain fetch (direct + ultimate parent LEIs). */
export async function getGleifOwnershipChain(
  lei: string,
): Promise<GleifOwnership> {
  return (await fetchOwnership(lei)) ?? {};
}

// ─── Internals ─────────────────────────────────────────────────────────────

function isValidLei(lei: string): boolean {
  return /^[A-Z0-9]{20}$/.test(lei);
}

async function fetchLeiRecord(lei: string): Promise<GleifLeiRecord | null> {
  const cached = leiCache.get(lei);
  if (cached && Date.now() - cached.fetchedAt < GLEIF_CACHE_TTL_MS) {
    return cached.data;
  }
  const url = `${GLEIF_BASE}/lei-records/${encodeURIComponent(lei)}`;
  const json = await gleifFetch<GleifDirectResponse>(url, "lei-direct", {
    lei,
  });
  const data = json?.data ?? null;
  leiCache.set(lei, { data, fetchedAt: Date.now() });
  return data;
}

async function searchByName(
  name: string,
  countryCode?: string,
): Promise<GleifLeiRecord[] | null> {
  const key = `${name.toLowerCase()}|${countryCode ?? ""}`;
  const cached = nameCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < GLEIF_CACHE_TTL_MS) {
    return cached.data;
  }

  const params = new URLSearchParams({
    "filter[entity.legalName]": name,
    "page[size]": "5",
  });
  if (countryCode) {
    params.set(
      "filter[entity.legalAddress.country]",
      countryCode.toUpperCase(),
    );
  }
  const url = `${GLEIF_BASE}/lei-records?${params.toString()}`;
  const json = await gleifFetch<GleifSearchResponse>(url, "lei-search", {
    name,
    countryCode,
  });
  const data = json?.data ?? null;
  nameCache.set(key, { data, fetchedAt: Date.now() });
  return data;
}

async function fetchOwnership(lei: string): Promise<GleifOwnership | null> {
  const cached = ownershipCache.get(lei);
  if (cached && Date.now() - cached.fetchedAt < GLEIF_CACHE_TTL_MS) {
    return cached.data;
  }

  // GLEIF exposes parent relationships via separate endpoints.
  const directUrl = `${GLEIF_BASE}/lei-records/${encodeURIComponent(lei)}/direct-parent`;
  const ultimateUrl = `${GLEIF_BASE}/lei-records/${encodeURIComponent(lei)}/ultimate-parent`;

  const [direct, ultimate] = await Promise.all([
    gleifFetch<GleifRelationshipResponse>(directUrl, "lei-direct-parent", {
      lei,
    }),
    gleifFetch<GleifRelationshipResponse>(ultimateUrl, "lei-ultimate-parent", {
      lei,
    }),
  ]);

  const directParentLei = direct?.data?.relationships?.["lei-record"]?.data?.id;
  const ultimateParentLei =
    ultimate?.data?.relationships?.["lei-record"]?.data?.id;

  const result: GleifOwnership = {};
  if (directParentLei) result.directParentLei = directParentLei;
  if (ultimateParentLei) result.ultimateParentLei = ultimateParentLei;

  ownershipCache.set(lei, { data: result, fetchedAt: Date.now() });
  return result;
}

async function gleifFetch<T>(
  url: string,
  op: string,
  context: Record<string, unknown>,
): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), GLEIF_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: "application/vnd.api+json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    // 404 on parent-lookup means "no parent" — not an error.
    if (res.status === 404) return null;
    if (!res.ok) {
      safeLog("GLEIF fetch non-200", { op, status: res.status, ...context });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    safeLog("GLEIF fetch error", {
      op,
      error: error instanceof Error ? error.message : "unknown",
      ...context,
    });
    return null;
  }
}

// ─── Mapping ───────────────────────────────────────────────────────────────

function mapGleifRecord(
  record: GleifLeiRecord,
  ownership: GleifOwnership | null,
  baseConfidence: number,
  startedAt: string,
  t0: number,
): AdapterOutput {
  const lei = record.attributes.lei;
  const entity = record.attributes.entity;
  const upstreamUrl = `https://www.gleif.org/lei/${encodeURIComponent(lei)}`;
  const note = `GLEIF status=${entity.status}, registration=${record.attributes.registration.status}`;

  const fields: AdapterOutput["fields"] = {
    lei: makeField(lei, "gleif", lei, baseConfidence, { upstreamUrl, note }),
    legalName: makeField(entity.legalName.name, "gleif", lei, baseConfidence, {
      upstreamUrl,
      note,
    }),
    countryCode: makeField(
      // GLEIF jurisdiction is usually ISO-2 (DE, FR, NL); sometimes sub-jurisdiction
      // like "US-CA". Strip everything after the dash for our purposes.
      entity.jurisdiction.split("-")[0]!,
      "gleif",
      lei,
      baseConfidence,
      { upstreamUrl, note },
    ),
    entityStatus: makeField<EntityStatus>(
      mapGleifStatusToEntityStatus(entity.status),
      "gleif",
      lei,
      baseConfidence,
      { upstreamUrl, note },
    ),
    headquartersAddress: makeField(
      flattenAddress(entity.headquartersAddress),
      "gleif",
      lei,
      baseConfidence,
      { upstreamUrl, note },
    ),
  };

  // Optional fields — only set if data exists.
  if (entity.legalForm?.id || entity.legalForm?.other) {
    fields.legalForm = makeField(
      entity.legalForm.other ?? entity.legalForm.id!,
      "gleif",
      lei,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  // creationDate is ISO; extract year if it parses cleanly.
  if (entity.creationDate) {
    const year = Number(entity.creationDate.slice(0, 4));
    if (
      Number.isInteger(year) &&
      year > 1800 &&
      year <= new Date().getFullYear()
    ) {
      fields.foundedYear = makeField(year, "gleif", lei, baseConfidence, {
        upstreamUrl,
        note,
      });
    }
  }

  // subCategory occasionally hints at company size; pass through if present.
  if (entity.subCategory) {
    const size = mapSubCategoryToCompanySize(entity.subCategory);
    if (size && size !== "UNKNOWN") {
      fields.companySize = makeField<CompanySize>(
        size,
        "gleif",
        lei,
        // company-size inference is weak — explicit lower confidence
        Math.min(baseConfidence, 0.5),
        {
          upstreamUrl,
          note: `Inferred from GLEIF subCategory=${entity.subCategory}`,
        },
      );
    }
  }

  // Ownership: separate sources but same upstream record.
  if (ownership?.directParentLei) {
    fields.parentLei = makeField(
      ownership.directParentLei,
      "gleif",
      lei,
      GLEIF_OWNERSHIP_CONFIDENCE,
      { upstreamUrl, note: "GLEIF direct-parent relationship" },
    );
  }
  if (ownership?.ultimateParentLei) {
    fields.ultimateParentLei = makeField(
      ownership.ultimateParentLei,
      "gleif",
      lei,
      GLEIF_OWNERSHIP_CONFIDENCE,
      { upstreamUrl, note: "GLEIF ultimate-parent relationship" },
    );
  }

  return {
    source: "gleif",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function mapGleifStatusToEntityStatus(s: string): EntityStatus {
  switch (s) {
    case "ACTIVE":
      return "ACTIVE";
    case "INACTIVE":
      return "INACTIVE";
    case "ANNULLED":
    case "MERGED":
      return "MERGED";
    case "DUPLICATE":
      return "DISSOLVED";
    default:
      return "UNKNOWN";
  }
}

function mapSubCategoryToCompanySize(sub: string): CompanySize {
  // GLEIF subCategory codes don't directly map to size, but a few common
  // values hint at scale. Conservative mapping — return UNKNOWN if unsure.
  const upper = sub.toUpperCase();
  if (upper.includes("FUND") || upper.includes("UCITS")) return "UNKNOWN";
  if (upper.includes("BRANCH")) return "UNKNOWN";
  return "UNKNOWN";
}

function flattenAddress(a: GleifAddress): string {
  const parts = [
    ...a.addressLines,
    [a.postalCode, a.city].filter(Boolean).join(" "),
    a.region,
    a.country,
  ].filter((p): p is string => Boolean(p && p.trim().length > 0));
  return parts.join(", ");
}

function softFail(startedAt: string, t0: number, error: string): AdapterOutput {
  return {
    source: "gleif",
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error,
  };
}

// ─── Test hooks ────────────────────────────────────────────────────────────

/** Drains in-memory caches. Test-only — do not call in production code. */
export function __resetGleifCaches(): void {
  leiCache.clear();
  nameCache.clear();
  ownershipCache.clear();
}
