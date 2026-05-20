/**
 * Czech ARES Adapter (Sprint A2.4, Tier-2 country)
 *
 * Administrativní registr ekonomických subjektů (ARES) — the Czech
 * Republic's central register of economic subjects, run by the
 * Ministry of Finance.
 *
 * Endpoint: ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty
 * Auth:     None. Public open data, no quota.
 *
 * Returns: legal name, ICO (registration number), business address,
 * legal form, founded date, entity status.
 *
 * Pattern: matches dk-adapter / fi-adapter / no-adapter / ee-adapter.
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { type AdapterOutput, type EntityStatus, makeField } from "../types";

const ARES_BASE =
  "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty";
const ARES_TIMEOUT_MS = 8_000;
const ARES_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ARES_CONFIDENCE_DIRECT = 0.95;
const ARES_CONFIDENCE_NAME_SEARCH = 0.7;

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: AresCompany | null;
  fetchedAt: number;
}

const icoCache = new Map<string, CacheEntry>();
const nameCache = new Map<string, CacheEntry>();

// ─── Raw ARES response ─────────────────────────────────────────────────────

interface AresCompany {
  ico?: string;
  obchodniJmeno?: string;
  sidlo?: AresAddress;
  pravniForma?: string; // legal form code
  datumVzniku?: string; // ISO date
  datumZaniku?: string | null; // dissolution date
  stavSubjektu?: string; // status
}

interface AresAddress {
  ulice?: string;
  cisloDomovni?: number;
  cisloOrientacni?: string;
  obec?: string;
  obecKod?: number;
  psc?: number;
  okres?: string;
  textovaAdresa?: string; // pre-flattened address line
}

interface AresSearchResponse {
  ekonomickeSubjekty?: AresCompany[];
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function lookupAresByIco(ico: string): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const cleaned = ico.replace(/\D/g, "");
  // Czech ICO is exactly 8 digits.
  if (cleaned.length !== 8) {
    return softFail(startedAt, t0, "Invalid Czech ICO — expected 8 digits");
  }

  const cached = icoCache.get(cleaned);
  if (cached && Date.now() - cached.fetchedAt < ARES_CACHE_TTL_MS) {
    return mapAresCompany(cached.data, ARES_CONFIDENCE_DIRECT, startedAt, t0);
  }

  const company = await fetchAres(
    `${ARES_BASE}/${encodeURIComponent(cleaned)}`,
  );
  icoCache.set(cleaned, { data: company, fetchedAt: Date.now() });
  return mapAresCompany(company, ARES_CONFIDENCE_DIRECT, startedAt, t0);
}

export async function searchAresByName(name: string): Promise<AdapterOutput> {
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
  if (cached && Date.now() - cached.fetchedAt < ARES_CACHE_TTL_MS) {
    return mapAresCompany(
      cached.data,
      ARES_CONFIDENCE_NAME_SEARCH,
      startedAt,
      t0,
    );
  }

  // ARES search uses POST with a JSON body in v3 of the API. Build a
  // minimal filter that matches by obchodniJmeno (legal name).
  const company = await searchAres(name.trim());
  nameCache.set(key, { data: company, fetchedAt: Date.now() });
  return mapAresCompany(company, ARES_CONFIDENCE_NAME_SEARCH, startedAt, t0);
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function fetchAres(url: string): Promise<AresCompany | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ARES_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.status === 404) return null;
    if (!res.ok) {
      safeLog("ARES non-200", { status: res.status });
      return null;
    }
    return (await res.json()) as AresCompany;
  } catch (error) {
    safeLog("ARES fetch error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function searchAres(name: string): Promise<AresCompany | null> {
  try {
    const url = `${ARES_BASE}/vyhledat`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), ARES_TIMEOUT_MS);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        obchodniJmeno: name,
        start: 0,
        pocet: 1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) {
      safeLog("ARES search non-200", { status: res.status });
      return null;
    }
    const json = (await res.json()) as AresSearchResponse;
    return json.ekonomickeSubjekty?.[0] ?? null;
  } catch (error) {
    safeLog("ARES search error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function mapAresCompany(
  c: AresCompany | null,
  baseConfidence: number,
  startedAt: string,
  t0: number,
): AdapterOutput {
  if (!c) {
    return {
      source: "country-cz",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: "No ARES record found",
    };
  }

  const ico = c.ico ?? "unknown";
  const upstreamUrl = `https://ares.gov.cz/ekonomicke-subjekty/${ico}`;
  const note = `ARES ICO=${ico}`;

  const fields: AdapterOutput["fields"] = {
    registrationNumber: makeField(ico, "country-cz", ico, baseConfidence, {
      upstreamUrl,
      note,
    }),
    countryCode: makeField("CZ", "country-cz", ico, baseConfidence, {
      upstreamUrl,
      note,
    }),
  };

  if (c.obchodniJmeno) {
    fields.legalName = makeField(
      c.obchodniJmeno,
      "country-cz",
      ico,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  const flat = flattenAresAddress(c.sidlo);
  if (flat) {
    fields.headquartersAddress = makeField(
      flat,
      "country-cz",
      ico,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  if (c.pravniForma) {
    fields.legalForm = makeField(
      c.pravniForma,
      "country-cz",
      ico,
      baseConfidence,
      { upstreamUrl, note: `Legal form code: ${c.pravniForma}` },
    );
  }

  fields.entityStatus = makeField<EntityStatus>(
    inferAresStatus(c),
    "country-cz",
    ico,
    baseConfidence,
    {
      upstreamUrl,
      note: c.datumZaniku ? `Dissolved on ${c.datumZaniku}` : undefined,
    },
  );

  if (c.datumVzniku) {
    const year = Number(c.datumVzniku.slice(0, 4));
    if (
      Number.isInteger(year) &&
      year > 1800 &&
      year <= new Date().getFullYear()
    ) {
      fields.foundedYear = makeField(year, "country-cz", ico, baseConfidence, {
        upstreamUrl,
        note,
      });
    }
  }

  return {
    source: "country-cz",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function inferAresStatus(c: AresCompany): EntityStatus {
  if (c.datumZaniku) return "DISSOLVED";
  const s = (c.stavSubjektu ?? "").toLowerCase();
  if (s.includes("aktivní") || s === "active") return "ACTIVE";
  if (s.includes("zaniklý") || s.includes("zrušený")) return "DISSOLVED";
  // No dissolution date + no explicit status → assume active.
  return c.datumVzniku ? "ACTIVE" : "UNKNOWN";
}

function flattenAresAddress(a: AresAddress | undefined): string | null {
  if (!a) return null;
  // Prefer the pre-flattened textovaAdresa if ARES provides it.
  if (a.textovaAdresa && a.textovaAdresa.trim().length > 0) {
    return a.textovaAdresa.trim();
  }
  const street = [a.ulice, a.cisloDomovni, a.cisloOrientacni]
    .filter((p) => p !== undefined && p !== null && p !== "")
    .join(" ");
  const cityLine = [a.psc, a.obec].filter(Boolean).join(" ");
  const parts = [street, cityLine, a.okres, "Czech Republic"]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function softFail(startedAt: string, t0: number, error: string): AdapterOutput {
  return {
    source: "country-cz",
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error,
  };
}

export function __resetAresCaches(): void {
  icoCache.clear();
  nameCache.clear();
}
