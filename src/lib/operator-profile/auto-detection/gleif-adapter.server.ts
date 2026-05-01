/**
 * GLEIF Adapter — Sprint 2C (ADR-011)
 *
 * GLEIF (Global Legal Entity Identifier Foundation) is the G20/ISO-mandated
 * authoritative registry for Legal Entity Identifiers. Each LEI is a 20-char
 * code uniquely identifying a legal entity globally. Issued by Local
 * Operating Units (LOUs) — for Germany the LOU is Bundesanzeiger Verlag,
 * for France Banque de France, etc. So GLEIF data is essentially the
 * normalised version of national-registry data.
 *
 * **Source URL:**
 *   https://api.gleif.org/api/v1/lei-records
 *
 * **Free / no auth / no API key.** GLEIF API is JSON:API-conformant.
 * Search by name returns up to 200 records by default.
 *
 * **Response shape (one record):**
 *   {
 *     "data": [{
 *       "type": "lei-records",
 *       "id": "5299009N55YRQC69CN08",
 *       "attributes": {
 *         "lei": "5299009N55YRQC69CN08",
 *         "entity": {
 *           "legalName": { "name": "ACME GMBH", "language": "de" },
 *           "legalForm": { "id": "QJUD" },         // ELF code (ISO 20275)
 *           "status": "ACTIVE" | "INACTIVE",
 *           "jurisdiction": "DE",
 *           "category": "GENERAL",
 *           "legalAddress": { ... },
 *           "headquartersAddress": { ... }
 *         },
 *         "registration": {
 *           "status": "ISSUED" | "LAPSED" | "PENDING_TRANSFER" | ...,
 *           "managingLou": "...",
 *           "validatedAs": "FULLY_CORROBORATED" | "ENTITY_SUPPLIED_ONLY"
 *         }
 *       }
 *     }]
 *   }
 *
 * **What we extract:**
 *   - `establishment` (T2, conf 0.95) — from `entity.jurisdiction`
 *   - Status warning if entity is inactive/dissolved/lapsed
 *   - Legal form surfaced via `warnings` (e.g. "QJUD = GmbH"), real
 *     promotion to a writable field happens in Sprint 5 when we extend
 *     WritableVerifiedField.
 *
 * **Caveats:**
 *   - Name search is exact-substring; "Acme" won't match "ACME GMBH"
 *     (case-sensitive). We normalise to UPPERCASE before sending.
 *   - GLEIF returns multiple records for common names (e.g. "BANK") —
 *     we treat that as "needs disambiguation" and surface a warning.
 *   - LEI-record `validatedAs: "ENTITY_SUPPLIED_ONLY"` means GLEIF
 *     hasn't cross-checked with a national registry — slightly lower
 *     confidence (0.85 vs 0.95).
 *
 * Reference: https://www.gleif.org/en/lei-data/gleif-api
 */

import "server-only";

import type {
  AdapterInput,
  AdapterOutcome,
  AutoDetectionAdapter,
  DetectedField,
} from "./types";

const GLEIF_ENDPOINT = "https://api.gleif.org/api/v1/lei-records";

const DEFAULT_TIMEOUT_MS = 10_000;

/** Minimum legalName length before we hit GLEIF (avoid trivial false positives). */
const MIN_NAME_LENGTH = 4;

/** Page size — GLEIF supports up to 200 per page; we read 50. */
const PAGE_SIZE = 50;

/** ELF (Entity Legal Form) code → human-readable label. Subset of ISO 20275 covering the
 * EU forms we care about. Full list: https://www.gleif.org/en/about-lei/code-lists/iso-20275-entity-legal-forms-code-list */
const ELF_LABELS: Record<string, string> = {
  // Germany
  QJUD: "Gesellschaft mit beschränkter Haftung (GmbH)",
  AXSB: "Aktiengesellschaft (AG)",
  "8888": "Unternehmergesellschaft (haftungsbeschränkt) (UG)",
  G3W4: "Kommanditgesellschaft (KG)",
  // France
  V8VL: "Société Anonyme (SA)",
  "8N3B": "Société par Actions Simplifiée (SAS)",
  "5WWO": "Société à Responsabilité Limitée (SARL)",
  // Netherlands
  "54M6": "Besloten Vennootschap (BV)",
  // United Kingdom
  H0PO: "Private Limited Company (Ltd)",
  "8888GB": "Public Limited Company (PLC)",
  // Italy / Spain (sample)
  "9NV6": "Società per Azioni (SpA)",
  // Multinational / generic
  XTIQ: "Other",
};

interface GleifResponse {
  data?: GleifRecord[];
  meta?: { pagination?: { currentPage: number; totalPages: number } };
}

interface GleifRecord {
  type?: string;
  id?: string;
  attributes?: {
    lei?: string;
    entity?: {
      legalName?: { name?: string; language?: string };
      legalForm?: { id?: string };
      status?: string;
      jurisdiction?: string;
      category?: string;
      legalAddress?: Record<string, unknown>;
      headquartersAddress?: Record<string, unknown>;
    };
    registration?: {
      status?: string;
      managingLou?: string;
      validatedAs?: string;
    };
  };
}

// ─── Adapter ───────────────────────────────────────────────────────────────

export const gleifAdapter: AutoDetectionAdapter = {
  source: "gleif-lei",
  displayName: "GLEIF (Global LEI Registry)",

  canDetect(input: AdapterInput): boolean {
    if (!input.legalName) return false;
    return input.legalName.trim().length >= MIN_NAME_LENGTH;
  },

  async detect(input: AdapterInput): Promise<AdapterOutcome> {
    const name = input.legalName?.trim();
    if (!name || name.length < MIN_NAME_LENGTH) {
      return {
        ok: false,
        source: "gleif-lei",
        errorKind: "missing-input",
        message: `GLEIF adapter requires legalName ≥ ${MIN_NAME_LENGTH} chars`,
      };
    }

    const fetchImpl = input.fetchImpl ?? globalThis.fetch;
    const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // GLEIF's filter[entity.legalName] is case-sensitive substring. Most LEI
    // records store names UPPER-CASE, so we normalise before query.
    const url =
      `${GLEIF_ENDPOINT}?` +
      `filter[entity.legalName]=${encodeURIComponent(name.toUpperCase())}` +
      `&page[size]=${PAGE_SIZE}`;

    let payload: GleifResponse;

    try {
      const response = await fetchImpl(url, {
        method: "GET",
        headers: {
          accept: "application/vnd.api+json",
          "user-agent": "Caelex/1.0 (+https://caelex.eu)",
        },
        signal: input.signal ?? controller.signal,
      });

      if (response.status === 429) {
        const retryAfter = response.headers.get("retry-after");
        return {
          ok: false,
          source: "gleif-lei",
          errorKind: "rate-limited",
          message: "GLEIF rate-limited the request",
          retryAfterMs: retryAfter ? Number(retryAfter) * 1000 : 60_000,
        };
      }

      if (!response.ok) {
        return {
          ok: false,
          source: "gleif-lei",
          errorKind: "remote-error",
          message: `GLEIF returned HTTP ${response.status}`,
        };
      }

      const text = await response.text();
      try {
        payload = JSON.parse(text) as GleifResponse;
      } catch (e) {
        return {
          ok: false,
          source: "gleif-lei",
          errorKind: "parse-error",
          message: `GLEIF response was not JSON: ${(e as Error).message}`,
        };
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return {
          ok: false,
          source: "gleif-lei",
          errorKind: "timeout",
          message: `GLEIF request timed out after ${timeoutMs}ms`,
        };
      }
      return {
        ok: false,
        source: "gleif-lei",
        errorKind: "network",
        message: `GLEIF network error: ${(err as Error).message ?? String(err)}`,
      };
    } finally {
      clearTimeout(timer);
    }

    return buildResult(payload, name, url);
  },
};

// ─── Result Construction ───────────────────────────────────────────────────

function buildResult(
  payload: GleifResponse,
  query: string,
  sourceUrl: string,
): AdapterOutcome {
  const records = payload.data ?? [];
  const fields: DetectedField[] = [];
  const warnings: string[] = [];

  if (records.length === 0) {
    warnings.push(
      `GLEIF has no LEI record matching "${query}". The operator may not have an LEI assigned, or the name needs to be exact-matched (try the legal-form suffix, e.g. "ACME GMBH" not just "Acme").`,
    );
    return successOutcome(fields, warnings, sourceUrl, payload);
  }

  if (records.length > 1) {
    // Multiple matches — disambiguation needed. We DON'T pick one; we surface
    // them to the operator for manual selection (Sprint 5 UI). For Sprint 2C,
    // we extract only fields where ALL matches agree (e.g. they all happen to
    // be DE jurisdiction even though the names differ).
    warnings.push(
      `GLEIF returned ${records.length} records matching "${query}". Operator should disambiguate via LEI; auto-detection will only promote fields where all matches agree.`,
    );
  }

  // Active records only (status ACTIVE; registration ISSUED). Inactive
  // entities are listed but should not be auto-promoted.
  const activeRecords = records.filter(isActiveRecord);
  if (activeRecords.length === 0) {
    const firstStatus = records[0]?.attributes?.entity?.status ?? "UNKNOWN";
    warnings.push(
      `GLEIF found records but none are ACTIVE+ISSUED. Most-relevant status: "${firstStatus}". Operator may have a dissolved or lapsed entity.`,
    );
    return successOutcome(fields, warnings, sourceUrl, payload);
  }

  // ── jurisdiction → establishment ─────────────────────────────────────
  const jurisdictions = new Set(
    activeRecords
      .map((r) => r.attributes?.entity?.jurisdiction?.toUpperCase())
      .filter((j): j is string => Boolean(j)),
  );
  if (jurisdictions.size === 1) {
    const jurisdiction = jurisdictions.values().next().value as string;
    // Confidence depends on whether GLEIF has cross-validated with the
    // national registry (FULLY_CORROBORATED) or only entity-supplied.
    const validatedAs = activeRecords[0].attributes?.registration?.validatedAs;
    const confidence = validatedAs === "FULLY_CORROBORATED" ? 0.95 : 0.85;
    fields.push({
      fieldName: "establishment",
      value: jurisdiction,
      confidence,
      evidenceText:
        `GLEIF jurisdiction "${jurisdiction}"` +
        (validatedAs ? ` (validatedAs: ${validatedAs})` : ""),
    });
  } else if (jurisdictions.size > 1) {
    warnings.push(
      `GLEIF matches span multiple jurisdictions (${[...jurisdictions].join(", ")}). Cannot auto-promote establishment; operator must disambiguate.`,
    );
  }

  // ── Legal form (warning-only for Sprint 2C; field promotion in Sprint 5) ─
  const legalForms = new Set(
    activeRecords
      .map((r) => r.attributes?.entity?.legalForm?.id)
      .filter((id): id is string => Boolean(id)),
  );
  if (legalForms.size === 1) {
    const elf = legalForms.values().next().value as string;
    const label = ELF_LABELS[elf] ?? elf;
    warnings.push(
      `GLEIF reports legal form "${elf}" (${label}). This will be auto-promoted to OperatorProfile.legalForm in Sprint 5.`,
    );
  } else if (legalForms.size > 1) {
    warnings.push(
      `GLEIF matches span multiple legal forms (${[...legalForms].join(", ")}). Cannot auto-promote legal form.`,
    );
  }

  // ── Surface LEI as a piece of evidence text on warnings ────────────
  if (activeRecords.length === 1) {
    const lei = activeRecords[0].attributes?.lei;
    const canonicalName = activeRecords[0].attributes?.entity?.legalName?.name;
    if (lei && canonicalName) {
      warnings.push(
        `GLEIF LEI "${lei}" assigned to canonical name "${canonicalName}".`,
      );
    }
  }

  return successOutcome(fields, warnings, sourceUrl, payload);
}

function successOutcome(
  fields: DetectedField[],
  warnings: string[],
  sourceUrl: string,
  payload: GleifResponse,
): AdapterOutcome {
  return {
    ok: true,
    result: {
      source: "gleif-lei",
      fetchedAt: new Date(),
      sourceUrl,
      // Truncate the raw payload — GLEIF responses can be 500 KB+
      rawArtifact: { records: (payload.data ?? []).slice(0, 50) },
      attestation: {
        kind: "public-source",
        source: "other",
        sourceUrl: GLEIF_ENDPOINT,
        fetchedAt: new Date().toISOString(),
      },
      fields,
      warnings,
    },
  };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function isActiveRecord(record: GleifRecord): boolean {
  const entity = record.attributes?.entity;
  const reg = record.attributes?.registration;
  return entity?.status === "ACTIVE" && reg?.status === "ISSUED";
}

export function elfLabel(elf: string): string {
  return ELF_LABELS[elf] ?? elf;
}

// ─── Test-Hook Exports ─────────────────────────────────────────────────────
export const __test = {
  GLEIF_ENDPOINT,
  isActiveRecord,
  elfLabel,
  ELF_LABELS,
};
