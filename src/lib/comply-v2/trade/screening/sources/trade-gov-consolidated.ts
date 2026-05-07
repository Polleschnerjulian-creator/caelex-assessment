/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Shared parser for the US trade.gov Consolidated Screening List.
 *
 * Source: International Trade Administration (Department of Commerce)
 * URL:    https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv
 * Format: CSV with header row, ~25 K rows, ~10 MB. Daily updates.
 *
 * Single canonical source that bundles 11+ US government sanctions /
 * denial / debarment lists from Treasury, Commerce, and State —
 * each row tagged with a `source` column identifying which list it
 * belongs to. We extract the three we currently model:
 *
 *   OFAC_SDN       ← "Specially Designated Nationals (SDN) - Treasury Department"
 *   BIS_ENTITY     ← "Entity List (EL) - Bureau of Industry and Security"
 *   DDTC_DEBARRED  ← "ITAR Debarred (DTC) - Bureau of Political Military Affairs"
 *
 * Future sprint can add more (Sectoral Sanctions, Denied Persons,
 * Military End User, Nonproliferation, etc.) — each is one mapping
 * line + one TradeSanctionsList enum value.
 *
 * Format columns (header row position-stable):
 *   source, entity_number, type, programs, name, title, addresses,
 *   federal_register_notice, start_date, end_date, standard_order,
 *   license_requirement, license_policy, call_sign, vessel_type,
 *   gross_tonnage, gross_registered_tonnage, vessel_flag, vessel_owner,
 *   remarks, source_list_url, alt_names, citizenships,
 *   dates_of_birth, nationalities, places_of_birth, ids
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import { parseCsv } from "./ofac-sdn";
import { type CanonicalSanctionsEntry, canonicalizeName } from "./types";

export const CONSOLIDATED_URL =
  "https://data.trade.gov/downloadable_consolidated_screening_list/v1/consolidated.csv";

/**
 * Map from upstream `source` string → our TradeSanctionsList enum.
 * Anything not in this map is silently dropped — we only persist
 * lists we have a Prisma enum value for.
 *
 * Add a row to extend coverage: { upstream-source-string: enum-value }.
 */
export const SOURCE_TO_LIST: Record<string, TradeSanctionsList> = {
  "Specially Designated Nationals (SDN) - Treasury Department":
    TradeSanctionsList.OFAC_SDN,
  "Entity List (EL) - Bureau of Industry and Security":
    TradeSanctionsList.BIS_ENTITY,
  "ITAR Debarred (DTC) - Bureau of Political Military Affairs":
    TradeSanctionsList.DDTC_DEBARRED,
};

/**
 * Column indices for the consolidated CSV. Derived from the header row
 * at parse time so we don't depend on positional stability — but
 * trade.gov has kept this layout for years. Header-row lookup means a
 * future column reorder doesn't silently break us.
 */
interface ColumnIndices {
  source: number;
  entityNumber: number;
  type: number;
  programs: number;
  name: number;
  title: number;
  addresses: number;
  altNames: number;
  citizenships: number;
  nationalities: number;
  ids: number;
  remarks: number;
}

function buildColumnIndices(header: string[]): ColumnIndices | null {
  const idx = (name: string) =>
    header.findIndex((h) => h.trim().toLowerCase() === name);
  const required = {
    source: idx("source"),
    entityNumber: idx("entity_number"),
    type: idx("type"),
    programs: idx("programs"),
    name: idx("name"),
    title: idx("title"),
    addresses: idx("addresses"),
    altNames: idx("alt_names"),
    citizenships: idx("citizenships"),
    nationalities: idx("nationalities"),
    ids: idx("ids"),
    remarks: idx("remarks"),
  };
  // Required columns: source, name, entity_number. Without these we
  // can't produce a useful canonical entry.
  if (
    required.source === -1 ||
    required.name === -1 ||
    required.entityNumber === -1
  ) {
    return null;
  }
  return required;
}

/**
 * Convert one CSV row to a CanonicalSanctionsEntry.
 *
 * Aliases (alt_names) and primary name go into the `names` array, all
 * canonicalized via the shared canonicalizeName(). Country codes are
 * extracted from addresses (last comma-separated segment, ISO-2 lookup
 * in a small map). Identifiers (passport, national_id) come from the
 * `ids` field, which is itself a sub-CSV per row.
 *
 * Returns null if the row lacks a name or entity_number (skipped).
 */
function toCanonicalEntry(
  row: string[],
  cols: ColumnIndices,
): CanonicalSanctionsEntry | null {
  const entryId = row[cols.entityNumber]?.trim();
  const rawName = row[cols.name]?.trim();
  if (!entryId || !rawName) return null;

  // Names: primary + alt_names (semicolon-separated).
  // Each alt_name may itself contain commas (e.g. "Smith, John") — we
  // keep them whole because canonicalize handles punctuation.
  const altNamesRaw = row[cols.altNames]?.trim() ?? "";
  const allNames = [rawName, ...altNamesRaw.split(";")]
    .map((n) => canonicalizeName(n.trim()))
    .filter(Boolean);

  // Deduplicate while preserving primary as first
  const dedupedNames = Array.from(new Set(allNames));
  if (dedupedNames.length === 0) return null;

  // Programs: semicolon-separated. -0- (legacy OFAC sentinel) → empty.
  const programsRaw = row[cols.programs]?.trim() ?? "";
  const programs =
    programsRaw && programsRaw !== "-0-"
      ? programsRaw
          .split(";")
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

  // Addresses: pipe-separated rows in trade.gov format. Last segment
  // of each is usually the country. We extract a country code per
  // address (best-effort — names like "United States" stay as-is for
  // now; A5 enhancement can map to ISO-2).
  const addressesRaw = row[cols.addresses]?.trim() ?? "";
  const addresses = addressesRaw
    ? addressesRaw
        .split(/\s*;\s*/)
        .filter(Boolean)
        .map((line) => {
          const parts = line.split(",").map((p) => p.trim());
          // Heuristic: last comma-separated part is the country
          const country =
            parts.length > 1 ? (parts[parts.length - 1] ?? "XX") : "XX";
          return {
            country: country.length === 2 ? country.toUpperCase() : "XX",
            lines: parts,
          };
        })
    : [];

  // Identifiers (ids field). Format: semicolon-separated, each id is
  // "type|value|country|expiry|issuing_country" (variable). We parse
  // best-effort and normalize the type.
  const idsRaw = row[cols.ids]?.trim() ?? "";
  const identifiers = idsRaw
    ? idsRaw
        .split(/\s*;\s*/)
        .filter(Boolean)
        .map((entry) => {
          const parts = entry.split("|").map((p) => p.trim());
          const [rawType, value, , , issuingCountry] = parts;
          if (!rawType || !value) return null;
          const type = normalizeIdType(rawType);
          return {
            type,
            value,
            ...(issuingCountry && issuingCountry.length === 2
              ? { issuingCountry: issuingCountry.toUpperCase() }
              : {}),
          };
        })
        .filter((x): x is { type: string; value: string } => x !== null)
    : [];

  const sdnType = row[cols.type]?.trim().toLowerCase() ?? "unknown";
  const title = row[cols.title]?.trim();
  const remarks = row[cols.remarks]?.trim();

  return {
    entryId,
    names: dedupedNames,
    addresses,
    identifiers,
    listMetadata: {
      sdnType,
      programs,
      ...(title ? { title } : {}),
      ...(remarks ? { remarks } : {}),
    },
  };
}

/**
 * Normalize upstream identifier type strings to our stable enum values.
 * Conservative: anything we don't recognize maps to "other" rather
 * than dropping (we'd rather over-collect than miss a hit).
 */
function normalizeIdType(raw: string): string {
  const t = raw.toLowerCase();
  if (t.includes("passport")) return "passport";
  if (t.includes("national id")) return "national_id";
  if (t.includes("vat") || t.includes("rfc")) return "vat";
  if (t.includes("lei")) return "lei";
  if (t.includes("d-u-n-s") || t.includes("duns")) return "duns";
  if (t.includes("cage")) return "cage";
  if (t.includes("imo")) return "imo";
  if (t.includes("swift") || t.includes("bic")) return "swift_bic";
  if (t.includes("tax")) return "tax_id";
  if (t.includes("registration")) return "registration_number";
  return "other";
}

export interface ConsolidatedParseResult {
  /** Map keyed by TradeSanctionsList enum, values are the canonical entries. */
  byList: Map<TradeSanctionsList, CanonicalSanctionsEntry[]>;
  /** Total rows processed (across all sources, before mapping/dropping). */
  totalRows: number;
  /** Rows that had source values not in SOURCE_TO_LIST — counted, not lost. */
  unmappedSources: Map<string, number>;
}

/**
 * Parse the trade.gov consolidated CSV into per-list canonical entries.
 *
 * Returns a map from TradeSanctionsList → CanonicalSanctionsEntry[]
 * for each source we recognize. Unrecognized sources are counted in
 * `unmappedSources` for diagnostic logging — they're not dropped
 * silently in the cron output.
 */
export function parseConsolidatedCsv(raw: string): ConsolidatedParseResult {
  const empty: ConsolidatedParseResult = {
    byList: new Map(),
    totalRows: 0,
    unmappedSources: new Map(),
  };

  if (!raw || typeof raw !== "string") return empty;

  const rows = parseCsv(raw);
  if (rows.length < 2) return empty; // need header + at least one data row

  const cols = buildColumnIndices(rows[0]);
  if (!cols) {
    throw new Error(
      "trade.gov consolidated CSV: required columns missing (source/name/entity_number)",
    );
  }

  const byList = new Map<TradeSanctionsList, CanonicalSanctionsEntry[]>();
  const unmappedSources = new Map<string, number>();
  let totalRows = 0;

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (row.length < cols.entityNumber + 1) continue;
    totalRows++;

    const sourceStr = row[cols.source]?.trim() ?? "";
    const list = SOURCE_TO_LIST[sourceStr];
    if (!list) {
      // Track for diagnostics but don't fail
      unmappedSources.set(sourceStr, (unmappedSources.get(sourceStr) ?? 0) + 1);
      continue;
    }

    const entry = toCanonicalEntry(row, cols);
    if (!entry) continue;

    let bucket = byList.get(list);
    if (!bucket) {
      bucket = [];
      byList.set(list, bucket);
    }
    bucket.push(entry);
  }

  return { byList, totalRows, unmappedSources };
}
