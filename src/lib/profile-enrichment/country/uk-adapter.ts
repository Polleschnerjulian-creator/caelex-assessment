/**
 * UK Companies House Adapter (Sprint A2.2, Tier-2 country)
 *
 * UK Companies House — the United Kingdom's central business registry.
 *
 * Endpoint: api.company-information.service.gov.uk
 * Auth:     HTTP Basic with the API key as username and empty password.
 *           Free tier (600 requests / 5 min) requires registration at
 *           developer.company-information.service.gov.uk.
 *
 * Env var:  COMPANIES_HOUSE_API_KEY
 *
 * If the key is missing the adapter soft-fails with an explanatory
 * error — it never throws. This matches the established pattern for
 * other env-var-gated adapters (Space-Track via SPACETRACK_IDENTITY).
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { type AdapterOutput, type EntityStatus, makeField } from "../types";

const CH_BASE = "https://api.company-information.service.gov.uk";
const CH_TIMEOUT_MS = 8_000;
const CH_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const CH_CONFIDENCE_DIRECT = 0.95;
const CH_CONFIDENCE_NAME_SEARCH = 0.7;

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: ChCompany | null;
  fetchedAt: number;
}

const numberCache = new Map<string, CacheEntry>();
const searchCache = new Map<string, CacheEntry>();

// ─── Raw Companies House response shapes ───────────────────────────────────

interface ChCompany {
  company_number?: string;
  company_name?: string;
  company_status?: string;
  type?: string;
  registered_office_address?: ChAddress;
  date_of_creation?: string;
  date_of_cessation?: string;
  jurisdiction?: string;
}

interface ChAddress {
  address_line_1?: string;
  address_line_2?: string;
  locality?: string;
  region?: string;
  country?: string;
  postal_code?: string;
}

interface ChSearchResponse {
  items?: ChSearchItem[];
  total_results?: number;
}

interface ChSearchItem {
  company_number?: string;
  title?: string;
  company_status?: string;
  date_of_creation?: string;
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function lookupCompaniesHouseByNumber(
  companyNumber: string,
): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const cleaned = companyNumber.trim().toUpperCase().replace(/\s+/g, "");
  // UK company numbers are 8 characters: digits or 2 prefix letters + 6 digits.
  if (!/^[A-Z0-9]{8}$/.test(cleaned)) {
    return softFail(
      startedAt,
      t0,
      "Invalid UK company number — expected 8-char alphanumeric",
    );
  }

  const cached = numberCache.get(cleaned);
  if (cached && Date.now() - cached.fetchedAt < CH_CACHE_TTL_MS) {
    return mapChCompany(cached.data, CH_CONFIDENCE_DIRECT, startedAt, t0);
  }

  const company = await fetchByNumber(cleaned);
  numberCache.set(cleaned, { data: company, fetchedAt: Date.now() });
  return mapChCompany(company, CH_CONFIDENCE_DIRECT, startedAt, t0);
}

export async function searchCompaniesHouseByName(
  name: string,
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

  const key = name.trim().toLowerCase();
  const cached = searchCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CH_CACHE_TTL_MS) {
    return mapChCompany(cached.data, CH_CONFIDENCE_NAME_SEARCH, startedAt, t0);
  }

  const top = await searchByName(name.trim());
  if (!top) {
    searchCache.set(key, { data: null, fetchedAt: Date.now() });
    return softFail(startedAt, t0, "No Companies House match for name");
  }

  // Search results are summary-only; fetch the full record by number for
  // the address + jurisdiction fields.
  const full = top.company_number
    ? await fetchByNumber(top.company_number)
    : null;
  const data = full ?? {
    company_number: top.company_number,
    company_name: top.title,
    company_status: top.company_status,
    date_of_creation: top.date_of_creation,
  };
  searchCache.set(key, { data, fetchedAt: Date.now() });
  return mapChCompany(data, CH_CONFIDENCE_NAME_SEARCH, startedAt, t0);
}

// ─── Internals ─────────────────────────────────────────────────────────────

function getAuthHeader(): string | null {
  const key = process.env.COMPANIES_HOUSE_API_KEY;
  if (!key) return null;
  // Basic auth with API key as username, empty password.
  const token = Buffer.from(`${key}:`, "utf8").toString("base64");
  return `Basic ${token}`;
}

async function fetchByNumber(number: string): Promise<ChCompany | null> {
  const auth = getAuthHeader();
  if (!auth) {
    safeLog("Companies House skipped", {
      reason: "COMPANIES_HOUSE_API_KEY not set",
    });
    return null;
  }
  return chFetch<ChCompany>(
    `${CH_BASE}/company/${encodeURIComponent(number)}`,
    auth,
  );
}

async function searchByName(name: string): Promise<ChSearchItem | null> {
  const auth = getAuthHeader();
  if (!auth) return null;
  const url = `${CH_BASE}/search/companies?q=${encodeURIComponent(name)}&items_per_page=1`;
  const res = await chFetch<ChSearchResponse>(url, auth);
  return res?.items?.[0] ?? null;
}

async function chFetch<T>(url: string, auth: string): Promise<T | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CH_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: "application/json", Authorization: auth },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 404) return null;
    if (!res.ok) {
      safeLog("Companies House non-200", { status: res.status });
      return null;
    }
    return (await res.json()) as T;
  } catch (error) {
    safeLog("Companies House fetch error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function mapChCompany(
  c: ChCompany | null,
  baseConfidence: number,
  startedAt: string,
  t0: number,
): AdapterOutput {
  if (!c) {
    return {
      source: "country-uk",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error:
        "No Companies House record (either not found or COMPANIES_HOUSE_API_KEY missing)",
    };
  }

  const num = c.company_number ?? "unknown";
  const upstreamUrl = `https://find-and-update.company-information.service.gov.uk/company/${num}`;
  const note = `CH ${num}`;

  const fields: AdapterOutput["fields"] = {
    registrationNumber: makeField(num, "country-uk", num, baseConfidence, {
      upstreamUrl,
      note,
    }),
    countryCode: makeField("GB", "country-uk", num, baseConfidence, {
      upstreamUrl,
      note,
    }),
  };

  if (c.company_name) {
    fields.legalName = makeField(
      c.company_name,
      "country-uk",
      num,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  const flatAddress = flattenChAddress(c.registered_office_address);
  if (flatAddress) {
    fields.headquartersAddress = makeField(
      flatAddress,
      "country-uk",
      num,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  if (c.type) {
    fields.legalForm = makeField(c.type, "country-uk", num, baseConfidence, {
      upstreamUrl,
      note,
    });
  }

  if (c.company_status) {
    fields.entityStatus = makeField<EntityStatus>(
      mapChStatus(c.company_status),
      "country-uk",
      num,
      baseConfidence,
      { upstreamUrl, note: `CH status=${c.company_status}` },
    );
  }

  if (c.date_of_creation) {
    const year = Number(c.date_of_creation.slice(0, 4));
    if (
      Number.isInteger(year) &&
      year > 1800 &&
      year <= new Date().getFullYear()
    ) {
      fields.foundedYear = makeField(year, "country-uk", num, baseConfidence, {
        upstreamUrl,
        note,
      });
    }
  }

  return {
    source: "country-uk",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function mapChStatus(s: string): EntityStatus {
  const u = s.toLowerCase();
  if (u === "active") return "ACTIVE";
  if (u.includes("dissolved") || u.includes("liquidation")) return "DISSOLVED";
  if (u.includes("converted") || u.includes("closed")) return "MERGED";
  if (u === "open" || u === "registered") return "ACTIVE";
  if (u.includes("voluntary")) return "INACTIVE";
  return "UNKNOWN";
}

function flattenChAddress(a: ChAddress | undefined): string | null {
  if (!a) return null;
  const parts = [
    a.address_line_1,
    a.address_line_2,
    [a.postal_code, a.locality].filter(Boolean).join(" "),
    a.region,
    a.country ?? "United Kingdom",
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function softFail(startedAt: string, t0: number, error: string): AdapterOutput {
  return {
    source: "country-uk",
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error,
  };
}

export function __resetCompaniesHouseCaches(): void {
  numberCache.clear();
  searchCache.clear();
}
