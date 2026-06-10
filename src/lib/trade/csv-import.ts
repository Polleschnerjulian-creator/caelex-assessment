/**
 * Caelex Trade — CSV item import, pure parsing layer (ILA review #8).
 *
 * Real customers arrive with ERP exports, not empty forms. This module
 * turns a CSV string into validated item rows:
 *   - minimal RFC-4180 parser (quoted fields, escaped quotes, CRLF) —
 *     no new dependency;
 *   - tolerant header mapping (German + English ERP column names);
 *   - per-row validation with honest skip reasons;
 *   - hard cap of 200 rows per import (the API enforces it again).
 *
 * Isomorphic on purpose: the client parses for preview, the server
 * re-validates the JSON rows it receives — the CSV itself never crosses
 * the wire.
 */

export const CSV_IMPORT_MAX_ROWS = 200;

export interface CsvItemRow {
  name: string;
  description: string;
  internalSku?: string;
  manufacturerName?: string;
  manufacturerPartNo?: string;
  countryOfOrigin?: string;
  eccnEU?: string;
}

export interface CsvParseResult {
  rows: CsvItemRow[];
  /** 1-based CSV line numbers that were skipped, with the reason. */
  skipped: Array<{ line: number; reason: string }>;
  /** Fatal problems (no header, unknown columns) — rows is empty then. */
  error?: string;
}

/** RFC-4180-ish: quotes, "" escapes, commas/semicolons, CRLF. Pure. */
export function parseCsv(text: string, delimiter?: string): string[][] {
  // Auto-detect the delimiter from the first line (German ERPs ♥ semicolons).
  const firstLine = text.slice(0, text.indexOf("\n") + 1 || text.length);
  const delim =
    delimiter ??
    ((firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0)
      ? ";"
      : ",");

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
    } else if (ch === delim) {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      field = "";
      rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((c) => c.trim().length > 0));
}

// Header → field mapping, lowercase, tolerant of German ERP exports.
const HEADER_ALIASES: Record<string, keyof CsvItemRow> = {
  name: "name",
  artikel: "name",
  artikelname: "name",
  bezeichnung: "name",
  produktname: "name",
  description: "description",
  beschreibung: "description",
  sku: "internalSku",
  artikelnummer: "internalSku",
  internalsku: "internalSku",
  "internal sku": "internalSku",
  manufacturer: "manufacturerName",
  hersteller: "manufacturerName",
  manufacturername: "manufacturerName",
  partno: "manufacturerPartNo",
  teilenummer: "manufacturerPartNo",
  manufacturerpartno: "manufacturerPartNo",
  "part number": "manufacturerPartNo",
  country: "countryOfOrigin",
  ursprungsland: "countryOfOrigin",
  countryoforigin: "countryOfOrigin",
  "country of origin": "countryOfOrigin",
  eccn: "eccnEU",
  eccneu: "eccnEU",
  "eccn eu": "eccnEU",
  "eu dual-use": "eccnEU",
  "eu dual use": "eccnEU",
};

export function parseCsvItems(text: string): CsvParseResult {
  const grid = parseCsv(text);
  if (grid.length === 0) {
    return { rows: [], skipped: [], error: "Die Datei ist leer." };
  }

  const header = grid[0].map((h) => h.trim().toLowerCase());
  const mapping = header.map((h) => HEADER_ALIASES[h] ?? null);
  if (!mapping.includes("name") || !mapping.includes("description")) {
    return {
      rows: [],
      skipped: [],
      error:
        "Spalten 'Name' und 'Beschreibung' (oder 'name'/'description') werden benötigt. " +
        `Gefundene Spalten: ${header.join(", ")}`,
    };
  }

  const rows: CsvItemRow[] = [];
  const skipped: Array<{ line: number; reason: string }> = [];

  for (let i = 1; i < grid.length; i++) {
    const line = i + 1; // 1-based incl. header
    if (rows.length >= CSV_IMPORT_MAX_ROWS) {
      skipped.push({
        line,
        reason: `Limit von ${CSV_IMPORT_MAX_ROWS} Zeilen pro Import erreicht.`,
      });
      continue;
    }
    const record: Partial<CsvItemRow> = {};
    grid[i].forEach((cell, col) => {
      const field = mapping[col];
      if (!field) return;
      const value = cell.trim();
      if (value.length > 0) record[field] = value;
    });

    if (!record.name) {
      skipped.push({ line, reason: "Name fehlt." });
      continue;
    }
    if (!record.description) {
      skipped.push({ line, reason: "Beschreibung fehlt." });
      continue;
    }
    if (record.name.length > 200 || record.description.length > 5000) {
      skipped.push({
        line,
        reason: "Feld zu lang (Name ≤200, Beschreibung ≤5000).",
      });
      continue;
    }
    rows.push(record as CsvItemRow);
  }

  return { rows, skipped };
}
