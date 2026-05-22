/**
 * UK OFSI (Office of Financial Sanctions Implementation) parser.
 *
 * Source: HM Treasury Office of Financial Sanctions Implementation
 * URL:    https://ofsistorage.blob.core.windows.net/publishedlists/ConList.csv
 * Format: CSV with header, ~5K rows, ~1.5 MB. Update cadence: ≥ weekly,
 *         often daily when sanctions activity is high.
 * Docs:   https://www.gov.uk/government/publications/financial-sanctions-consolidated-list-of-targets
 *
 * Key columns (UK OFSI publishes a 2-line preamble before the header
 * row, so we detect the header by signature rather than fixed offset):
 *   Name 6                  Primary full name OR composite-name marker
 *   Name 1..Name 5          Additional name parts (UK breaks names into
 *                            "first", "middle", "last" etc. across these)
 *   Title                   Honorific
 *   DOB                     Date of Birth (individuals)
 *   POB                     Place of Birth
 *   Nationality
 *   Passport Details
 *   National Identification Number
 *   Position
 *   Address 1..Address 6    Address lines
 *   Post/Zip Code
 *   Country
 *   Other Information       Free-text
 *   Group Type              "Individual" | "Entity"
 *   Listed On               Designation date (e.g. "08/06/2007")
 *   Last Updated            Last amendment date
 *   Group ID                STABLE designation ID across snapshots. This
 *                            is the entryId we use for delta detection.
 *   Regime                  Sanctions regime name (e.g. "Russia",
 *                            "Cyber" — used in listMetadata.programs).
 *   UK Statement of Reasons
 *
 * Aliases are NOT a separate file — a single Group ID may appear in
 * multiple rows when OFSI lists aliases. We aggregate by Group ID and
 * collect every distinct full name across the rows as `names[]`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { TradeSanctionsList } from "@prisma/client";
import {
  type CanonicalSanctionsEntry,
  type SanctionsSourceParser,
  canonicalizeName,
  type SanctionsAddress,
  type SanctionsIdentifier,
} from "./types";

const DEFAULT_URL =
  "https://ofsistorage.blob.core.windows.net/publishedlists/ConList.csv";

/** Header columns we read out by name. Robust to OFSI column reordering. */
type HeaderIndex = Partial<
  Record<
    | "name1"
    | "name2"
    | "name3"
    | "name4"
    | "name5"
    | "name6"
    | "title"
    | "dob"
    | "pob"
    | "nationality"
    | "passport"
    | "nationalId"
    | "position"
    | "address1"
    | "address2"
    | "address3"
    | "address4"
    | "address5"
    | "address6"
    | "postcode"
    | "country"
    | "otherInformation"
    | "groupType"
    | "listedOn"
    | "lastUpdated"
    | "groupId"
    | "regime"
    | "statementOfReasons",
    number
  >
>;

/**
 * Locate the OFSI header row. OFSI prepends 1-2 preamble rows
 * ("Designations Last Updated: …" + a blank line). The header row is
 * the first row that contains "Group ID" or "Group Type".
 */
function findHeaderRow(rows: string[][]): number {
  for (let i = 0; i < Math.min(rows.length, 5); i += 1) {
    const row = rows[i];
    if (!row) continue;
    const joined = row.map((c) => c.trim().toLowerCase()).join("|");
    if (joined.includes("group id") || joined.includes("group type")) {
      return i;
    }
  }
  return 0;
}

/**
 * Build the header→index map. OFSI sometimes prefixes columns with the
 * entry-type marker (e.g. "Name 6" vs "Name 6 ") — we lower-case and
 * trim before matching, and we tolerate minor renames over time.
 */
function buildHeaderIndex(header: string[]): HeaderIndex {
  const idx: HeaderIndex = {};
  header.forEach((rawName, i) => {
    const h = rawName.trim().toLowerCase();
    switch (h) {
      case "name 1":
        idx.name1 = i;
        break;
      case "name 2":
        idx.name2 = i;
        break;
      case "name 3":
        idx.name3 = i;
        break;
      case "name 4":
        idx.name4 = i;
        break;
      case "name 5":
        idx.name5 = i;
        break;
      case "name 6":
        idx.name6 = i;
        break;
      case "title":
        idx.title = i;
        break;
      case "dob":
      case "date of birth":
        idx.dob = i;
        break;
      case "pob":
      case "country of birth":
      case "place of birth":
        idx.pob = i;
        break;
      case "nationality":
        idx.nationality = i;
        break;
      case "passport details":
      case "passport number":
        idx.passport = i;
        break;
      case "national identification number":
      case "national id no.":
        idx.nationalId = i;
        break;
      case "position":
        idx.position = i;
        break;
      case "address 1":
        idx.address1 = i;
        break;
      case "address 2":
        idx.address2 = i;
        break;
      case "address 3":
        idx.address3 = i;
        break;
      case "address 4":
        idx.address4 = i;
        break;
      case "address 5":
        idx.address5 = i;
        break;
      case "address 6":
        idx.address6 = i;
        break;
      case "post/zip code":
      case "postcode":
        idx.postcode = i;
        break;
      case "country":
        idx.country = i;
        break;
      case "other information":
        idx.otherInformation = i;
        break;
      case "group type":
        idx.groupType = i;
        break;
      case "listed on":
        idx.listedOn = i;
        break;
      case "last updated":
        idx.lastUpdated = i;
        break;
      case "group id":
      case "reg.ref.":
        idx.groupId = i;
        break;
      case "regime":
        idx.regime = i;
        break;
      case "uk statement of reasons":
      case "statement of reasons":
        idx.statementOfReasons = i;
        break;
    }
  });
  return idx;
}

function get(row: string[], i: number | undefined): string {
  if (i === undefined) return "";
  return (row[i] ?? "").trim();
}

/**
 * Combine OFSI's split-name columns into a single human-readable name.
 * Their convention places the full canonical name in "Name 6", but
 * historical entries sometimes only populate Name 1..Name 5 (and Name 6
 * is empty). Falls back to joining the populated parts in order.
 */
function buildFullName(row: string[], idx: HeaderIndex): string {
  const name6 = get(row, idx.name6);
  if (name6) return name6;
  const parts = [
    get(row, idx.name1),
    get(row, idx.name2),
    get(row, idx.name3),
    get(row, idx.name4),
    get(row, idx.name5),
  ].filter(Boolean);
  return parts.join(" ");
}

function buildAddress(
  row: string[],
  idx: HeaderIndex,
): SanctionsAddress | null {
  const lines = [
    get(row, idx.address1),
    get(row, idx.address2),
    get(row, idx.address3),
    get(row, idx.address4),
    get(row, idx.address5),
    get(row, idx.address6),
    get(row, idx.postcode),
  ].filter(Boolean);
  const country = get(row, idx.country);
  if (lines.length === 0 && !country) return null;
  return {
    country: country.length === 2 ? country.toUpperCase() : "XX",
    lines,
  };
}

function buildIdentifiers(
  row: string[],
  idx: HeaderIndex,
): SanctionsIdentifier[] {
  const ids: SanctionsIdentifier[] = [];
  const passport = get(row, idx.passport);
  if (passport) {
    ids.push({ type: "passport", value: passport });
  }
  const nationalId = get(row, idx.nationalId);
  if (nationalId) {
    ids.push({ type: "national_id", value: nationalId });
  }
  return ids;
}

/**
 * Parse one OFSI CSV row into a partial canonical entry. Returns null
 * if the row is malformed (no group ID and no name).
 *
 * Partial because a single group ID may span multiple rows (aliases);
 * the aggregator below merges them.
 */
function parseRow(
  row: string[],
  idx: HeaderIndex,
): CanonicalSanctionsEntry | null {
  const groupId = get(row, idx.groupId);
  const fullName = buildFullName(row, idx);
  if (!fullName) return null;

  const canonical = canonicalizeName(fullName);
  if (!canonical) return null;

  const stableId = groupId || `OFSI-${canonical}`;

  const address = buildAddress(row, idx);
  const identifiers = buildIdentifiers(row, idx);

  const regime = get(row, idx.regime);
  const groupType = get(row, idx.groupType).toLowerCase();
  const listedOn = get(row, idx.listedOn);
  const lastUpdated = get(row, idx.lastUpdated);
  const dob = get(row, idx.dob);
  const pob = get(row, idx.pob);
  const nationality = get(row, idx.nationality);
  const position = get(row, idx.position);
  const otherInformation = get(row, idx.otherInformation);
  const statementOfReasons = get(row, idx.statementOfReasons);
  const title = get(row, idx.title);

  return {
    entryId: stableId,
    names: [canonical],
    addresses: address ? [address] : [],
    identifiers,
    listMetadata: {
      groupType: groupType || "unknown",
      ...(regime ? { programs: [regime] } : { programs: [] }),
      ...(listedOn ? { listedOn } : {}),
      ...(lastUpdated ? { lastUpdated } : {}),
      ...(title ? { title } : {}),
      ...(dob ? { dob } : {}),
      ...(pob ? { pob } : {}),
      ...(nationality ? { nationality } : {}),
      ...(position ? { position } : {}),
      ...(otherInformation ? { otherInformation } : {}),
      ...(statementOfReasons ? { statementOfReasons } : {}),
    },
  };
}

/**
 * Aggregate rows by groupId. OFSI duplicates rows when an entry has
 * multiple aliases or multiple addresses — each duplicate row carries
 * the same Group ID but a different name/address slot. We merge them
 * into a single canonical entry so the fuzzy-match engine sees one
 * sanctioned party, not N copies.
 */
function aggregateByGroupId(
  partials: CanonicalSanctionsEntry[],
): CanonicalSanctionsEntry[] {
  const byId = new Map<string, CanonicalSanctionsEntry>();
  for (const partial of partials) {
    const existing = byId.get(partial.entryId);
    if (!existing) {
      byId.set(partial.entryId, partial);
      continue;
    }
    // Merge names (dedup)
    for (const n of partial.names) {
      if (!existing.names.includes(n)) existing.names.push(n);
    }
    // Merge addresses (dedup on country + first line)
    for (const a of partial.addresses) {
      const key = `${a.country}|${a.lines[0] ?? ""}`;
      const seen = existing.addresses.some(
        (x) => `${x.country}|${x.lines[0] ?? ""}` === key,
      );
      if (!seen) existing.addresses.push(a);
    }
    // Merge identifiers (dedup on type+value)
    for (const id of partial.identifiers) {
      const seen = existing.identifiers.some(
        (x) => x.type === id.type && x.value === id.value,
      );
      if (!seen) existing.identifiers.push(id);
    }
    // listMetadata: programs union, last-write-wins for the rest
    const existingPrograms = (existing.listMetadata.programs as string[]) ?? [];
    const newPrograms = (partial.listMetadata.programs as string[]) ?? [];
    const merged = Array.from(new Set([...existingPrograms, ...newPrograms]));
    existing.listMetadata = {
      ...existing.listMetadata,
      ...partial.listMetadata,
      programs: merged,
    };
  }
  return Array.from(byId.values());
}

/**
 * Parse the UK OFSI ConList CSV into canonical entries.
 *
 * OFSI CSV format: RFC 4180 quoted CSV with a multi-row preamble before
 * the actual header row. We detect the header by scanning the first 5
 * rows for "Group ID" or "Group Type".
 */
export function parseUkOfsi(raw: string): CanonicalSanctionsEntry[] {
  if (!raw || typeof raw !== "string") return [];

  const rows = parseCsv(raw);
  if (rows.length === 0) return [];

  const headerRow = findHeaderRow(rows);
  const header = rows[headerRow] ?? [];
  const idx = buildHeaderIndex(header);
  if (idx.groupId === undefined && idx.name6 === undefined) {
    // Header detection failed — file format may have changed upstream.
    // Return empty rather than throwing so the cron logs zero and moves on.
    return [];
  }

  const partials: CanonicalSanctionsEntry[] = [];
  for (let i = headerRow + 1; i < rows.length; i += 1) {
    const entry = parseRow(rows[i] ?? [], idx);
    if (entry) partials.push(entry);
  }

  return aggregateByGroupId(partials);
}

/**
 * Extract upstream version from the OFSI preamble. The first non-empty
 * row typically reads "Designations Last Updated: 05/05/2026" or similar.
 * Returns the raw date string for the orchestrator to embed in the
 * snapshot row. Returns undefined if not found.
 */
export function extractOfsiVersion(raw: string): string | undefined {
  if (!raw) return undefined;
  // Read just the first kilobyte to avoid scanning the whole file.
  const head = raw.slice(0, 2048);
  const m = head.match(/Last\s+Updated[:\s]+([0-9/.-]+)/i);
  return m?.[1];
}

/**
 * Minimal RFC 4180 CSV parser. Same shape as the OFAC SDN parser's —
 * accepts quoted fields, embedded commas inside quotes, "" → " escape,
 * \r\n and \n line endings. Throws nothing — falls through on malformed
 * input so the orchestrator can log + retry.
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
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
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

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    rows.push(current);
  }

  return rows;
}

export const ukOfsiParser: SanctionsSourceParser = {
  list: TradeSanctionsList.UK_OFSI,
  defaultSourceUrl: DEFAULT_URL,
  parse: parseUkOfsi,
  extractUpstreamVersion: extractOfsiVersion,
};
