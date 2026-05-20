/**
 * Estonia RIK Adapter (Sprint A2.3, Tier-2 country)
 *
 * Estonia's Registrite ja Infosüsteemide Keskus (RIK) — Centre of
 * Registers and Information Systems — runs the e-Business Register
 * with a fully open public dataset.
 *
 * Open-data endpoint: avaandmed.ariregister.rik.ee/sites/default/files
 *   (full bulk dumps) — too heavy for live lookup.
 *
 * Public single-record query endpoint (no auth, no quota):
 *   https://ariregister.rik.ee/eng/api/company/{registryCode}
 *
 * Returns: legal name, registry code, business address, status,
 * founded date, legal form.
 *
 * Pattern: identical to dk-adapter / fi-adapter / no-adapter.
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { type AdapterOutput, type EntityStatus, makeField } from "../types";

const RIK_BASE = "https://ariregister.rik.ee/eng/api";
const RIK_TIMEOUT_MS = 8_000;
const RIK_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const RIK_CONFIDENCE_DIRECT = 0.95;
const RIK_CONFIDENCE_NAME_SEARCH = 0.7;

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: RikCompany | null;
  fetchedAt: number;
}

const codeCache = new Map<string, CacheEntry>();
const nameCache = new Map<string, CacheEntry>();

// ─── Raw RIK response shape ────────────────────────────────────────────────

interface RikCompany {
  registry_code?: string | number;
  name?: string;
  legal_form?: string;
  status?: string;
  registration_date?: string;
  address?: {
    street?: string;
    city?: string;
    county?: string;
    postal_code?: string;
    country?: string;
  };
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function lookupRikByRegistryCode(
  code: string,
): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  // Estonian registry codes are exactly 8 digits.
  const cleaned = code.toString().replace(/\D/g, "");
  if (cleaned.length !== 8) {
    return softFail(
      startedAt,
      t0,
      "Invalid Estonian registry code — expected 8 digits",
    );
  }

  const cached = codeCache.get(cleaned);
  if (cached && Date.now() - cached.fetchedAt < RIK_CACHE_TTL_MS) {
    return mapRikCompany(cached.data, RIK_CONFIDENCE_DIRECT, startedAt, t0);
  }

  const company = await fetchRik(`${RIK_BASE}/company/${cleaned}`);
  codeCache.set(cleaned, { data: company, fetchedAt: Date.now() });
  return mapRikCompany(company, RIK_CONFIDENCE_DIRECT, startedAt, t0);
}

export async function searchRikByName(name: string): Promise<AdapterOutput> {
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
  if (cached && Date.now() - cached.fetchedAt < RIK_CACHE_TTL_MS) {
    return mapRikCompany(
      cached.data,
      RIK_CONFIDENCE_NAME_SEARCH,
      startedAt,
      t0,
    );
  }

  const url = `${RIK_BASE}/search?name=${encodeURIComponent(name.trim())}&limit=1`;
  const result = await fetchRikSearch(url);
  const top = result?.[0] ?? null;
  nameCache.set(key, { data: top, fetchedAt: Date.now() });
  return mapRikCompany(top, RIK_CONFIDENCE_NAME_SEARCH, startedAt, t0);
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function fetchRik(url: string): Promise<RikCompany | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RIK_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 404) return null;
    if (!res.ok) {
      safeLog("RIK non-200", { status: res.status });
      return null;
    }
    return (await res.json()) as RikCompany;
  } catch (error) {
    safeLog("RIK fetch error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function fetchRikSearch(url: string): Promise<RikCompany[] | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RIK_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      safeLog("RIK search non-200", { status: res.status });
      return null;
    }
    const json = (await res.json()) as
      | { companies?: RikCompany[] }
      | RikCompany[];
    if (Array.isArray(json)) return json;
    return json.companies ?? null;
  } catch (error) {
    safeLog("RIK search error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function mapRikCompany(
  c: RikCompany | null,
  baseConfidence: number,
  startedAt: string,
  t0: number,
): AdapterOutput {
  if (!c) {
    return {
      source: "country-ee",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: "No RIK record found",
    };
  }

  const code = c.registry_code != null ? String(c.registry_code) : "unknown";
  const upstreamUrl = `https://ariregister.rik.ee/eng/company/${code}`;
  const note = `RIK ${code}`;

  const fields: AdapterOutput["fields"] = {
    registrationNumber: makeField(code, "country-ee", code, baseConfidence, {
      upstreamUrl,
      note,
    }),
    countryCode: makeField("EE", "country-ee", code, baseConfidence, {
      upstreamUrl,
      note,
    }),
  };

  if (c.name) {
    fields.legalName = makeField(c.name, "country-ee", code, baseConfidence, {
      upstreamUrl,
      note,
    });
  }

  const flat = flattenRikAddress(c.address);
  if (flat) {
    fields.headquartersAddress = makeField(
      flat,
      "country-ee",
      code,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  if (c.legal_form) {
    fields.legalForm = makeField(
      c.legal_form,
      "country-ee",
      code,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  if (c.status) {
    fields.entityStatus = makeField<EntityStatus>(
      mapRikStatus(c.status),
      "country-ee",
      code,
      baseConfidence,
      { upstreamUrl, note: `RIK status=${c.status}` },
    );
  }

  if (c.registration_date) {
    const year = Number(c.registration_date.slice(0, 4));
    if (
      Number.isInteger(year) &&
      year > 1800 &&
      year <= new Date().getFullYear()
    ) {
      fields.foundedYear = makeField(year, "country-ee", code, baseConfidence, {
        upstreamUrl,
        note,
      });
    }
  }

  return {
    source: "country-ee",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function mapRikStatus(s: string): EntityStatus {
  const u = s.toLowerCase();
  if (u.includes("registered") || u === "r") return "ACTIVE";
  if (u.includes("deleted") || u.includes("liquidated")) return "DISSOLVED";
  if (u.includes("bankrupt")) return "DISSOLVED";
  if (u.includes("merged")) return "MERGED";
  return "UNKNOWN";
}

function flattenRikAddress(
  a: RikCompany["address"] | undefined,
): string | null {
  if (!a) return null;
  const parts = [
    a.street,
    [a.postal_code, a.city].filter(Boolean).join(" "),
    a.county,
    a.country ?? "Estonia",
  ]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function softFail(startedAt: string, t0: number, error: string): AdapterOutput {
  return {
    source: "country-ee",
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error,
  };
}

export function __resetRikCaches(): void {
  codeCache.clear();
  nameCache.clear();
}
