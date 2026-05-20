/**
 * Denmark CVR Adapter (Sprint A2, Tier-2 country)
 *
 * Centralt Virksomhedsregister (CVR) — Denmark's central business registry.
 *
 * Endpoint: distribution.virk.dk/cvr-permanent/_search
 * - Public Elasticsearch index over CVR-permanent data
 * - Free, no auth required
 * - ~1.5M companies, updated daily
 * - Documented at datacvr.virk.dk
 *
 * Returns: legal name, CVR number, headquarters address, foundedDate,
 * legalForm, entity status.
 *
 * Pattern follows vies-adapter.ts / gleif-adapter.ts.
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { type AdapterOutput, type EntityStatus, makeField } from "../types";

// ─── Configuration ─────────────────────────────────────────────────────────

const CVR_BASE = "https://distribution.virk.dk/cvr-permanent/_search";
const CVR_TIMEOUT_MS = 8_000;
const CVR_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7d — registry data changes slowly

/** Confidence: CVR is Denmark's authoritative business registry. */
const CVR_CONFIDENCE_DIRECT = 0.95;
const CVR_CONFIDENCE_NAME_SEARCH = 0.7;

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: CvrCompanyRecord | null;
  fetchedAt: number;
}

const cvrNumberCache = new Map<string, CacheEntry>();
const nameCache = new Map<string, CacheEntry>();

// ─── Raw CVR Elasticsearch response shapes ─────────────────────────────────

interface CvrEsResponse {
  hits?: {
    total?: number | { value: number };
    hits?: Array<{
      _source?: {
        Vrvirksomhed?: CvrCompanyRecord;
      };
    }>;
  };
}

interface CvrCompanyRecord {
  cvrNummer: number;
  virksomhedMetadata?: {
    nyesteNavn?: { navn?: string };
    nyesteBeliggenhedsadresse?: CvrAddress;
    nyesteVirksomhedsform?: {
      langBeskrivelse?: string;
      kortBeskrivelse?: string;
    };
    nyesteStatus?: { status?: string; statustekst?: string };
    stiftelsesDato?: string; // ISO date
  };
}

interface CvrAddress {
  vejnavn?: string;
  husnummerFra?: number;
  husnummerTil?: number;
  bogstavFra?: string;
  postnummer?: number;
  postdistrikt?: string;
  kommune?: { kommuneNavn?: string };
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function lookupCvrByNumber(
  cvrNumber: string | number,
): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const numeric = Number(cvrNumber);
  if (!Number.isInteger(numeric) || numeric <= 0) {
    return softFail(
      startedAt,
      t0,
      "Invalid CVR number — expected positive integer",
    );
  }

  const cached = cvrNumberCache.get(String(numeric));
  if (cached && Date.now() - cached.fetchedAt < CVR_CACHE_TTL_MS) {
    return mapCvrRecord(cached.data, CVR_CONFIDENCE_DIRECT, startedAt, t0);
  }

  const record = await fetchCvr({
    query: {
      bool: {
        must: [{ term: { "Vrvirksomhed.cvrNummer": numeric } }],
      },
    },
  });

  cvrNumberCache.set(String(numeric), { data: record, fetchedAt: Date.now() });
  return mapCvrRecord(record, CVR_CONFIDENCE_DIRECT, startedAt, t0);
}

export async function searchCvrByName(name: string): Promise<AdapterOutput> {
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
  if (cached && Date.now() - cached.fetchedAt < CVR_CACHE_TTL_MS) {
    return mapCvrRecord(cached.data, CVR_CONFIDENCE_NAME_SEARCH, startedAt, t0);
  }

  const record = await fetchCvr({
    size: 1,
    query: {
      match: {
        "Vrvirksomhed.virksomhedMetadata.nyesteNavn.navn": name.trim(),
      },
    },
  });

  nameCache.set(key, { data: record, fetchedAt: Date.now() });
  return mapCvrRecord(record, CVR_CONFIDENCE_NAME_SEARCH, startedAt, t0);
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function fetchCvr(
  query: Record<string, unknown>,
): Promise<CvrCompanyRecord | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CVR_TIMEOUT_MS);

    const res = await fetch(CVR_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(query),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      safeLog("CVR fetch non-200", { status: res.status });
      return null;
    }

    const json = (await res.json()) as CvrEsResponse;
    const hits = json.hits?.hits ?? [];
    if (hits.length === 0) return null;
    return hits[0]?._source?.Vrvirksomhed ?? null;
  } catch (error) {
    safeLog("CVR fetch error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function mapCvrRecord(
  record: CvrCompanyRecord | null,
  baseConfidence: number,
  startedAt: string,
  t0: number,
): AdapterOutput {
  if (!record) {
    return {
      source: "country-dk",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: "No CVR record found",
    };
  }

  const cvr = String(record.cvrNummer);
  const meta = record.virksomhedMetadata;
  const upstreamUrl = `https://datacvr.virk.dk/enhed/virksomhed/${cvr}`;
  const note = `CVR ${cvr}`;

  const fields: AdapterOutput["fields"] = {
    registrationNumber: makeField(cvr, "country-dk", cvr, baseConfidence, {
      upstreamUrl,
      note,
    }),
    countryCode: makeField("DK", "country-dk", cvr, baseConfidence, {
      upstreamUrl,
      note,
    }),
  };

  const name = meta?.nyesteNavn?.navn;
  if (name && name.trim().length > 0) {
    fields.legalName = makeField(
      name.trim(),
      "country-dk",
      cvr,
      baseConfidence,
      {
        upstreamUrl,
        note,
      },
    );
  }

  const flatAddress = flattenCvrAddress(meta?.nyesteBeliggenhedsadresse);
  if (flatAddress) {
    fields.headquartersAddress = makeField(
      flatAddress,
      "country-dk",
      cvr,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  const form =
    meta?.nyesteVirksomhedsform?.langBeskrivelse ??
    meta?.nyesteVirksomhedsform?.kortBeskrivelse;
  if (form) {
    fields.legalForm = makeField(form, "country-dk", cvr, baseConfidence, {
      upstreamUrl,
      note,
    });
  }

  const statusRaw = meta?.nyesteStatus?.status;
  if (statusRaw) {
    fields.entityStatus = makeField<EntityStatus>(
      mapCvrStatus(statusRaw),
      "country-dk",
      cvr,
      baseConfidence,
      { upstreamUrl, note: `CVR status=${statusRaw}` },
    );
  }

  if (meta?.stiftelsesDato) {
    const year = Number(meta.stiftelsesDato.slice(0, 4));
    if (
      Number.isInteger(year) &&
      year > 1800 &&
      year <= new Date().getFullYear()
    ) {
      fields.foundedYear = makeField(year, "country-dk", cvr, baseConfidence, {
        upstreamUrl,
        note,
      });
    }
  }

  return {
    source: "country-dk",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function mapCvrStatus(s: string): EntityStatus {
  const u = s.toUpperCase();
  if (u === "AKTIV" || u === "NORMAL") return "ACTIVE";
  if (u.includes("OPHØRT") || u.includes("OPLOEST")) return "DISSOLVED";
  if (u.includes("KONKURS")) return "DISSOLVED";
  if (u.includes("FUSIONERET")) return "MERGED";
  if (u === "INAKTIV") return "INACTIVE";
  return "UNKNOWN";
}

function flattenCvrAddress(a: CvrAddress | undefined): string | null {
  if (!a) return null;
  const street =
    [
      a.vejnavn,
      a.husnummerFra,
      a.bogstavFra,
      a.husnummerTil ? `-${a.husnummerTil}` : undefined,
    ]
      .filter((p) => p !== undefined && p !== null && p !== "")
      .join(" ") || null;
  const postCity = [a.postnummer, a.postdistrikt].filter(Boolean).join(" ");
  const region = a.kommune?.kommuneNavn;
  const parts = [street, postCity, region, "Denmark"].filter((p): p is string =>
    Boolean(p && String(p).trim().length > 0),
  );
  return parts.length > 0 ? parts.join(", ") : null;
}

function softFail(startedAt: string, t0: number, error: string): AdapterOutput {
  return {
    source: "country-dk",
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error,
  };
}

// ─── Test hooks ────────────────────────────────────────────────────────────

export function __resetCvrCaches(): void {
  cvrNumberCache.clear();
  nameCache.clear();
}
