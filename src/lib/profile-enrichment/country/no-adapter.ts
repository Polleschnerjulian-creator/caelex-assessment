/**
 * Norway Brønnøysundregistrene Adapter (Sprint A2, Tier-2 country)
 *
 * Brønnøysundregistrene (BRREG) — Norway's central business registry.
 *
 * Endpoint: data.brreg.no/enhetsregisteret/api/enheter
 * - Free, no auth, JSON
 * - Well-documented at data.brreg.no/enhetsregisteret/api/dokumentasjon
 * - Covers all Norwegian registered entities
 *
 * Returns: legal name, org number, business address, organization form,
 * status, founded date.
 */

import "server-only";
import { safeLog } from "@/lib/verity/utils/redaction";
import { type AdapterOutput, type EntityStatus, makeField } from "../types";

// ─── Configuration ─────────────────────────────────────────────────────────

const BRREG_BASE = "https://data.brreg.no/enhetsregisteret/api/enheter";
const BRREG_TIMEOUT_MS = 8_000;
const BRREG_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const BRREG_CONFIDENCE_DIRECT = 0.95;
const BRREG_CONFIDENCE_NAME_SEARCH = 0.7;

// ─── Cache ─────────────────────────────────────────────────────────────────

interface CacheEntry {
  data: BrregEntity | null;
  fetchedAt: number;
}

const orgnrCache = new Map<string, CacheEntry>();
const nameCache = new Map<string, CacheEntry>();

// ─── Raw BRREG response shapes ─────────────────────────────────────────────

interface BrregSearchResponse {
  _embedded?: {
    enheter?: BrregEntity[];
  };
  page?: { totalElements?: number };
}

interface BrregEntity {
  organisasjonsnummer?: string;
  navn?: string;
  organisasjonsform?: { kode?: string; beskrivelse?: string };
  registreringsdatoEnhetsregisteret?: string;
  konkurs?: boolean;
  underAvvikling?: boolean;
  underTvangsavviklingEllerTvangsopplosning?: boolean;
  slettedato?: string | null;
  forretningsadresse?: BrregAddress;
  postadresse?: BrregAddress;
}

interface BrregAddress {
  adresse?: string[];
  postnummer?: string;
  poststed?: string;
  kommune?: string;
  land?: string; // "Norge"
}

// ─── Public API ────────────────────────────────────────────────────────────

export async function lookupBrregByOrgNumber(
  orgNumber: string,
): Promise<AdapterOutput> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const cleaned = orgNumber.replace(/\s+/g, "");
  // Norwegian org number = exactly 9 digits.
  if (!/^\d{9}$/.test(cleaned)) {
    return softFail(
      startedAt,
      t0,
      "Invalid Norwegian org number — expected 9 digits",
    );
  }

  const cached = orgnrCache.get(cleaned);
  if (cached && Date.now() - cached.fetchedAt < BRREG_CACHE_TTL_MS) {
    return mapBrregEntity(cached.data, BRREG_CONFIDENCE_DIRECT, startedAt, t0);
  }

  const entity = await fetchBrregById(cleaned);
  orgnrCache.set(cleaned, { data: entity, fetchedAt: Date.now() });
  return mapBrregEntity(entity, BRREG_CONFIDENCE_DIRECT, startedAt, t0);
}

export async function searchBrregByName(name: string): Promise<AdapterOutput> {
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
  if (cached && Date.now() - cached.fetchedAt < BRREG_CACHE_TTL_MS) {
    return mapBrregEntity(
      cached.data,
      BRREG_CONFIDENCE_NAME_SEARCH,
      startedAt,
      t0,
    );
  }

  const entity = await fetchBrregByName(name.trim());
  nameCache.set(key, { data: entity, fetchedAt: Date.now() });
  return mapBrregEntity(entity, BRREG_CONFIDENCE_NAME_SEARCH, startedAt, t0);
}

// ─── Internals ─────────────────────────────────────────────────────────────

async function fetchBrregById(orgnr: string): Promise<BrregEntity | null> {
  return await brregFetchSingle(`${BRREG_BASE}/${encodeURIComponent(orgnr)}`);
}

async function fetchBrregByName(name: string): Promise<BrregEntity | null> {
  const url = `${BRREG_BASE}?navn=${encodeURIComponent(name)}&size=1`;
  return await brregFetchFirst(url);
}

async function brregFetchSingle(url: string): Promise<BrregEntity | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BRREG_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 404) return null;
    if (!res.ok) {
      safeLog("BRREG fetch non-200", { status: res.status });
      return null;
    }
    return (await res.json()) as BrregEntity;
  } catch (error) {
    safeLog("BRREG fetch error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

async function brregFetchFirst(url: string): Promise<BrregEntity | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), BRREG_TIMEOUT_MS);
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!res.ok) {
      safeLog("BRREG search non-200", { status: res.status });
      return null;
    }
    const json = (await res.json()) as BrregSearchResponse;
    return json._embedded?.enheter?.[0] ?? null;
  } catch (error) {
    safeLog("BRREG search error", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

function mapBrregEntity(
  entity: BrregEntity | null,
  baseConfidence: number,
  startedAt: string,
  t0: number,
): AdapterOutput {
  if (!entity) {
    return {
      source: "country-no",
      fields: {},
      startedAt,
      durationMs: Date.now() - t0,
      error: "No BRREG record found",
    };
  }

  const orgnr = entity.organisasjonsnummer ?? "unknown";
  const upstreamUrl = `https://w2.brreg.no/enhet/sok/detalj.jsp?orgnr=${orgnr}`;
  const note = `BRREG orgnr=${orgnr}`;

  const fields: AdapterOutput["fields"] = {
    registrationNumber: makeField(orgnr, "country-no", orgnr, baseConfidence, {
      upstreamUrl,
      note,
    }),
    countryCode: makeField("NO", "country-no", orgnr, baseConfidence, {
      upstreamUrl,
      note,
    }),
  };

  if (entity.navn) {
    fields.legalName = makeField(
      entity.navn,
      "country-no",
      orgnr,
      baseConfidence,
      {
        upstreamUrl,
        note,
      },
    );
  }

  const flat = flattenBrregAddress(
    entity.forretningsadresse ?? entity.postadresse ?? null,
  );
  if (flat) {
    fields.headquartersAddress = makeField(
      flat,
      "country-no",
      orgnr,
      baseConfidence,
      { upstreamUrl, note },
    );
  }

  if (entity.organisasjonsform?.beskrivelse) {
    fields.legalForm = makeField(
      entity.organisasjonsform.beskrivelse,
      "country-no",
      orgnr,
      baseConfidence,
      { upstreamUrl, note: `Form code: ${entity.organisasjonsform.kode}` },
    );
  }

  fields.entityStatus = makeField<EntityStatus>(
    inferBrregStatus(entity),
    "country-no",
    orgnr,
    baseConfidence,
    {
      upstreamUrl,
      note: "Derived from konkurs/underAvvikling/slettedato flags",
    },
  );

  if (entity.registreringsdatoEnhetsregisteret) {
    const year = Number(entity.registreringsdatoEnhetsregisteret.slice(0, 4));
    if (
      Number.isInteger(year) &&
      year > 1800 &&
      year <= new Date().getFullYear()
    ) {
      fields.foundedYear = makeField(
        year,
        "country-no",
        orgnr,
        baseConfidence,
        { upstreamUrl, note },
      );
    }
  }

  return {
    source: "country-no",
    fields,
    startedAt,
    durationMs: Date.now() - t0,
  };
}

function inferBrregStatus(e: BrregEntity): EntityStatus {
  if (e.slettedato) return "DISSOLVED";
  if (e.konkurs || e.underTvangsavviklingEllerTvangsopplosning)
    return "DISSOLVED";
  if (e.underAvvikling) return "INACTIVE";
  return "ACTIVE";
}

function flattenBrregAddress(a: BrregAddress | null): string | null {
  if (!a) return null;
  const street = (a.adresse ?? []).join(", ");
  const postCity = [a.postnummer, a.poststed].filter(Boolean).join(" ");
  const parts = [street, postCity, a.kommune, a.land ?? "Norge"]
    .map((p) => (typeof p === "string" ? p.trim() : ""))
    .filter((p) => p.length > 0);
  return parts.length > 0 ? parts.join(", ") : null;
}

function softFail(startedAt: string, t0: number, error: string): AdapterOutput {
  return {
    source: "country-no",
    fields: {},
    startedAt,
    durationMs: Date.now() - t0,
    error,
  };
}

// ─── Test hooks ────────────────────────────────────────────────────────────

export function __resetBrregCaches(): void {
  orgnrCache.clear();
  nameCache.clear();
}
