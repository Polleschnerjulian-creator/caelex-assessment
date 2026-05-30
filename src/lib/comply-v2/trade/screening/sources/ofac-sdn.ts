/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * OFAC SDN (Specially Designated Nationals) parser.
 *
 * Source: US Treasury Office of Foreign Assets Control
 * URL:    https://www.treasury.gov/ofac/downloads/sdn.csv
 * Format: CSV, ~12K rows, ~3 MB. Update cadence: daily.
 * Docs:   https://ofac.treasury.gov/specially-designated-nationals-list-data-formats-data-schemas
 *
 * Format columns (positional, no header row in OFAC CSV):
 *   0:  ent_num       SDN identifier (stable across snapshots)
 *   1:  SDN_Name      Full canonical name
 *   2:  SDN_Type      "individual" | "vessel" | "aircraft" | "entity" | "-0-"
 *   3:  Program       Sanctions programs, semicolon-separated (e.g. "SDGT; IRAN-EO13599")
 *   4:  Title         Title for individuals (e.g. "President of...")
 *   5:  Call_Sign     Vessel callsign (vessels only)
 *   6:  Vess_type     Vessel type (vessels only)
 *   7:  Tonnage       Vessel tonnage
 *   8:  GRT           Vessel gross registered tonnage
 *   9:  Vess_flag     Vessel flag country
 *   10: Vess_owner    Vessel owner
 *   11: Remarks       Free-text remarks (often contains DOB, POB, IDs)
 *
 * Companion files (NOT in this MVP — covered by future sprint):
 *   - alt.csv:  Aliases (AKAs) linked to ent_num
 *   - add.csv:  Addresses linked to ent_num
 *
 * For Sprint A2 we parse SDN.CSV directly. AKAs+addresses pulled in
 * a future sprint (or via the consolidated JSON which bundles them).
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import {
  type CanonicalSanctionsEntry,
  type SanctionsSourceParser,
  canonicalizeName,
} from "./types";

const DEFAULT_URL = "https://www.treasury.gov/ofac/downloads/sdn.csv";

/**
 * OFAC encodes "missing field" as the literal string "-0-" instead of
 * empty. This sentinel must be normalized to null/empty before use.
 */
const OFAC_NULL = "-0-";

/**
 * Parse one OFAC SDN CSV row (12 fields, comma-separated, RFC 4180 quoting)
 * into a canonical entry.
 *
 * Parsing rules:
 *   - Quoted fields: double-quoted with embedded double-quote escaped as ""
 *   - "-0-" literal → empty/missing
 *   - Programs split on ";" and trimmed
 *   - Names: primary name only at this stage. AKAs come from alt.csv
 *     in a follow-up sprint (or via consolidated JSON).
 *
 * Returns null if the row is malformed (caller filters nulls).
 */
function parseRow(row: string[]): CanonicalSanctionsEntry | null {
  if (row.length < 4) return null;

  const entNum = row[0]?.trim();
  const sdnName = row[1]?.trim();
  const sdnType = row[2]?.trim().toLowerCase();
  const program = row[3]?.trim();

  if (!entNum || !sdnName || sdnName === OFAC_NULL) return null;

  const canonical = canonicalizeName(sdnName);
  if (!canonical) return null;

  const programs =
    program && program !== OFAC_NULL
      ? program
          .split(";")
          .map((p) => p.trim())
          .filter(Boolean)
      : [];

  // Vessel-specific data (only meaningful for SDN_Type === "vessel")
  const vesselFields: Record<string, string> = {};
  if (sdnType === "vessel") {
    const callSign = row[5]?.trim();
    const vessType = row[6]?.trim();
    const flag = row[9]?.trim();
    if (callSign && callSign !== OFAC_NULL) vesselFields.callSign = callSign;
    if (vessType && vessType !== OFAC_NULL) vesselFields.type = vessType;
    if (flag && flag !== OFAC_NULL) vesselFields.flag = flag;
  }

  const remarks = row[11]?.trim();
  const title = row[4]?.trim();

  return {
    entryId: entNum,
    names: [canonical],
    addresses: [], // populated by add.csv merge in follow-up sprint
    identifiers: [], // populated by extracting from remarks in follow-up
    listMetadata: {
      sdnType: sdnType ?? "unknown",
      programs,
      ...(title && title !== OFAC_NULL ? { title } : {}),
      ...(remarks && remarks !== OFAC_NULL ? { remarks } : {}),
      ...vesselFields,
    },
  };
}

/**
 * Parse the OFAC SDN CSV into canonical entries.
 *
 * OFAC CSV uses RFC 4180 quoting: fields with commas/quotes/newlines
 * are wrapped in double quotes; embedded double quotes are doubled ("").
 * No header row — first row is data.
 */
export function parseOfacSdn(raw: string): CanonicalSanctionsEntry[] {
  if (!raw || typeof raw !== "string") return [];

  const rows = parseCsv(raw);
  const entries: CanonicalSanctionsEntry[] = [];

  for (const row of rows) {
    const entry = parseRow(row);
    if (entry) entries.push(entry);
  }

  return entries;
}

/**
 * Minimal RFC 4180 CSV parser sufficient for OFAC's well-formed format.
 * Handles: quoted fields, embedded commas inside quotes, "" → " escape,
 * \r\n and \n line endings. Does NOT handle: malformed quoting (would
 * throw — fine, the cron will retry).
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let current: string[] = [];
  let field = "";
  let i = 0;
  let inQuotes = false;

  while (i < text.length) {
    const c = text[i];

    if (inQuotes) {
      if (c === '"') {
        // Escaped quote: ""
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        // Closing quote
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }

    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }

    if (c === ",") {
      current.push(field);
      field = "";
      i += 1;
      continue;
    }

    if (c === "\r") {
      // Treat \r\n and lone \r as row terminators
      current.push(field);
      field = "";
      if (current.length > 0) rows.push(current);
      current = [];
      i += text[i + 1] === "\n" ? 2 : 1;
      continue;
    }

    if (c === "\n") {
      current.push(field);
      field = "";
      if (current.length > 0) rows.push(current);
      current = [];
      i += 1;
      continue;
    }

    field += c;
    i += 1;
  }

  // Final field/row if no trailing newline
  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

/**
 * URL for the OFAC alt.csv file containing AKA/FKA/NKA aliases.
 * Each row links an ent_num to an alternate name for the same SDN entry.
 */
export const OFAC_ALT_URL = "https://www.treasury.gov/ofac/downloads/alt.csv";

/**
 * Parse the OFAC alt.csv into a Map of ent_num → canonicalized alias names.
 *
 * alt.csv columns (positional, no header row):
 *   0: ent_num      — SDN uid (links to sdn.csv column 0)
 *   1: alt_num      — alias ordinal (ignored)
 *   2: alt_type     — "aka" | "fka" | "nka" (ignored for matching purposes)
 *   3: alt_name     — the alias name
 *   4: alt_remarks  — free text (ignored)
 *
 * Rows with missing ent_num, missing/empty alt_name, or alt_name equal
 * to the OFAC null sentinel "-0-" are dropped. Aliases that canonicalize
 * to an empty string are dropped. Duplicates (same canonical form for the
 * same uid) are deduped.
 *
 * PURE — no I/O, no side effects.
 */
export function parseOfacAltAliases(altCsv: string): Map<string, string[]> {
  const result = new Map<string, string[]>();
  if (!altCsv || typeof altCsv !== "string") return result;

  const rows = parseCsv(altCsv);
  for (const row of rows) {
    if (row.length < 4) continue;

    const entNum = row[0]?.trim();
    const altName = row[3]?.trim();

    if (!entNum || !altName || altName === OFAC_NULL) continue;

    const canonical = canonicalizeName(altName);
    if (!canonical) continue;

    const existing = result.get(entNum);
    if (existing) {
      if (!existing.includes(canonical)) {
        existing.push(canonical);
      }
    } else {
      result.set(entNum, [canonical]);
    }
  }

  return result;
}

/**
 * Merge alias names from an alt.csv alias map into canonical SDN entries.
 *
 * For each entry whose entryId appears as a key in aliasMap, the aliases
 * are appended to entry.names (primary name first, deduped). Entries with
 * no corresponding alias map key are returned unchanged.
 *
 * PURE — returns a new array; input entries are not mutated.
 */
export function mergeAliasesIntoEntries(
  entries: CanonicalSanctionsEntry[],
  aliasMap: Map<string, string[]>,
): CanonicalSanctionsEntry[] {
  if (aliasMap.size === 0) return [...entries];

  return entries.map((entry) => {
    const aliases = aliasMap.get(entry.entryId);
    if (!aliases || aliases.length === 0) return entry;

    // Dedupe: only append aliases not already in names
    const existingSet = new Set(entry.names);
    const newAliases = aliases.filter((a) => !existingSet.has(a));
    if (newAliases.length === 0) return entry;

    return {
      ...entry,
      names: [...entry.names, ...newAliases],
    };
  });
}

export const ofacSdnParser: SanctionsSourceParser = {
  list: TradeSanctionsList.OFAC_SDN,
  defaultSourceUrl: DEFAULT_URL,
  parse: parseOfacSdn,
};
