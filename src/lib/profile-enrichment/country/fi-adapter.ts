/**
 * Finland PRH/YTJ Adapter (Sprint A2, Tier-2 country)
 *
 * Patentti- ja rekisterihallitus (PRH) — Finnish Patent and Registration Office.
 * YTJ — Yritys- ja yhteisötietojärjestelmä — Business Information System.
 *
 * Endpoint: avoindata.prh.fi/opendata-ytj-api/v3
 * - Free, no auth, JSON-API
 * - Covers all Finnish registered businesses
 * - Documented at avoindata.prh.fi/ytj_en.html
 *
 * Returns: legal name, business ID (Y-tunnus), addresses, company form,
 * status, founded date.
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { type AdapterOutput, type EntityStatus, makeField } from "../types";

// ─── Configuration ─────────────────────────────────────────────────────────

const PRH_BASE = "https://avoindata.prh.fi/opendata-ytj-api/v3";
const PRH_TIMEOUT_MS = 8_000;
const PRH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const PRH_CONFIDENCE_DIRECT = 0.95;
const PRH_CONFIDENCE_NAME_SEARCH = 0.7;

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: PrhCompany | null;
  fetchedAt: number;
}

const businessIdCache = new Map<string, CacheEntry>();
const nameCache = new Map<string, CacheEntry>();

// ─── Raw PRH response shape ────────────────────────────────────────────────

interface PrhListResponse {
  companies?: PrhCompany[];
  totalResults?: number;
}

interface PrhAddress {
  street?: string;
  postCode?: string;
  postOffices?: Array<{ city?: string }>;
  type?: number;
  registrationDate?: string;
  endDate?: string | null;
}

interface PrhCompany {
  businessId?: { value?: string };
  names?: Array<{
    name?: string;
    type?: number; // 1 = main, 2 = parallel, etc.
    registrationDate?: string;
    endDate?: string | null;
  }>;
  addresses?: PrhAddress[];
  companyForms?: Array<{
    type?: string;
    descriptions?: Array<{ languageCode?: string; description?: string }>;
    registrationDate?: string;
    endDate?: string | null;
  }>;
  registrationDate?: string;
  endDate?: string | null;
  status?: string; // "Aktiivinen" | "Lakannut" | etc.
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function lookupPrhByBusinessId(
  businessId: string,
): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // FI business ID format: NNNNNNN-N (7 digits + dash + check digit)
  if (!/^\d{7}-\d$/.test(businessId)) {
    return softFail(
      startedAt,
      t0,
      "Invalid Finnish business ID — expected format NNNNNNN-N",
    );
  }

  const cached = businessIdCache.get(businessId);
  if (cached && Date.now() - cached.fetchedAt < PRH_CACHE_TTL_MS) {
    return mapPrhRecord(cached.data, PRH_CONFIDENCE_DIRECT, startedAt, t0);
  }

  const company = await fetchPrh(
    `?businessId=${encodeURIComponent(businessId)}`,
  );
  businessIdCache.set(businessId, { data: company, fetchedAt: Date.now() });
  return mapPrhRecord(company, PRH_CONFIDENCE_DIRECT, startedAt, t0);
}

export async function searchPrhByName(name: string): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  if (!name || name.trim().length < 3) {
    return softFail(
      startedAt,
      t0,
      "Name search requires at least 3 characters",
    );
  }

  const key = name.trim().toLowerCase();
  const cached = nameCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < PRH_CACHE_TTL_MS) {
    return mapPrhRecord(cached.data, PRH_CONFIDENCE_NAME_SEARCH, startedAt, t0);
  }

  const company = await fetchPrh(`?name=${encodeURIComponent(name.trim())}`);
  nameCache.set(key, { data: company, fetchedAt: Date.now() });
  return mapPrhRecord(company, PRH_CONFIDENCE_NAME_SEARCH, startedAt, t0);
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function fetchPrh(query: string): Promise<PrhCompany | null> {
  try {
    const url = `${PRH_BASE}/companies${query}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), PRH_TIMEOUT_MS);

    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      safeLog("PRH fetch non-200", { status: res.status });
      return null;
    }

    const json = (await res.json()) as PrhListResponse;
    return json.companies?.[0] ?? null;
  } catch (error) {
    safeLog("PRH fetch error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function mapPrhRecord(
  company: PrhCompany | null,
  baseConfidence: number,
  startedAt: string,
  t0: number,
): AdapterOutput {
  if (!company) {
    return {
      source: "country-fi",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: "No PRH record found",
    };
  }

  const businessId = company.businessId?.value ?? "unknown";
  const upstreamUrl = `https://avoindata.prh.fi/en/ytj_en.html?businessId=${businessId}`;
  const note = `PRH businessId=${businessId}`;

  const fields: AdapterOutput["fields"] = {
    registrationNumber: makeField(
      businessId,
      "country-fi",
      businessId,
      baseConfidence,
      { upstreamUrl, note },
    ),
    countryCode: makeField("FI", "country-fi", businessId, baseConfidence, {
      upstreamUrl,
      note,
    }),
  };

  // Current name = name with no endDate and lowest type number (1 = main).
  const currentName = pickCurrent(company.names ?? [], (n) =>
    typeof n.type === "number" ? n.type : 99,
  );
  if (currentName?.name) {
    fields.legalName = makeField(
      currentName.name,
      "country-fi",
      businessId,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  const currentAddress = pickCurrent(
    company.addresses ?? [],
    (a) => a.type ?? 99,
  );
  const flat = flattenPrhAddress(currentAddress ?? null);
  if (flat) {
    fields.headquartersAddress = makeField(
      flat,
      "country-fi",
      businessId,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  const currentForm = pickCurrent(company.companyForms ?? [], () => 0);
  const formDesc =
    currentForm?.descriptions?.find((d) => d.languageCode === "en")
      ?.description ??
    currentForm?.descriptions?.[0]?.description ??
    currentForm?.type;
  if (formDesc) {
    fields.legalForm = makeField(
      formDesc,
      "country-fi",
      businessId,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  if (company.status) {
    fields.entityStatus = makeField<EntityStatus>(
      mapPrhStatus(company.status),
      "country-fi",
      businessId,
      baseConfidence,
      { upstreamUrl, note: `PRH status=${company.status}` },
    );
  }

  if (company.registrationDate) {
    const year = Number(company.registrationDate.slice(0, 4));
    if (
      Number.isInteger(year) &&
      year > 1800 &&
      year <= new Date().getFullYear()
    ) {
      fields.foundedYear = makeField(
        year,
        "country-fi",
        businessId,
        baseConfidence,
        { upstreamUrl, note },
      );
    }
  }

  return {
    source: "country-fi",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function pickCurrent<T extends { endDate?: string | null }>(
  items: T[],
  rank: (item: T) => number,
): T | null {
  const active = items.filter((i) => !i.endDate);
  if (active.length === 0) return items[0] ?? null;
  return active.slice().sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

function mapPrhStatus(s: string): EntityStatus {
  const u = s.toLowerCase();
  if (u.includes("aktiivinen") || u === "active") return "ACTIVE";
  if (u.includes("lakannut") || u.includes("ceased")) return "DISSOLVED";
  if (u.includes("fuusio") || u.includes("merged")) return "MERGED";
  return "UNKNOWN";
}

function flattenPrhAddress(a: PrhAddress | null): string | null {
  if (!a) return null;
  const city = a.postOffices?.[0]?.city;
  const parts = [
    a.street,
    [a.postCode, city].filter(Boolean).join(" "),
    "Finland",
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function softFail(startedAt: string, t0: number, error: string): AdapterOutput {
  return {
    source: "country-fi",
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error,
  };
}

// ─── Test hooks ────────────────────────────────────────────────────────────

export function __resetPrhCaches(): void {
  businessIdCache.clear();
  nameCache.clear();
}
