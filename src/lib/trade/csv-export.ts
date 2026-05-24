/**
 * Caelex Trade — client-side CSV export utility.
 *
 * Used by the bulk-actions bar on list pages to export selected rows
 * to a CSV file the operator downloads directly — no server round-
 * trip, no temporary blob URLs lingering on the server.
 *
 * Why a dedicated module:
 *   - CSV escaping is fiddly (quotes, commas, newlines in values).
 *     Co-locating it here keeps every list page consistent.
 *   - Tests live next to it in `csv-export.test.ts`.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

/** A column definition: header label + value-extractor function. */
export interface CsvColumn<Row> {
  header: string;
  /** Returns the cell value as a string-like primitive. Nulls
   *  become empty strings. Dates are formatted ISO. */
  get: (row: Row) => string | number | boolean | null | undefined | Date;
}

/**
 * Build a CSV string from a list of rows and a column definition.
 * Always RFC 4180 — values containing commas, quotes, or newlines
 * are quoted; embedded quotes are doubled.
 */
export function buildCsv<Row>(
  rows: ReadonlyArray<Row>,
  columns: ReadonlyArray<CsvColumn<Row>>,
): string {
  const lines: string[] = [];
  // Header row first
  lines.push(columns.map((c) => escapeCell(c.header)).join(","));
  for (const row of rows) {
    lines.push(
      columns
        .map((c) => {
          const raw = c.get(row);
          return escapeCell(formatCell(raw));
        })
        .join(","),
    );
  }
  // CRLF per RFC 4180 — Excel + Numbers both honour this.
  return lines.join("\r\n");
}

/**
 * Trigger a browser download for the given CSV content. No-op in
 * server contexts. The filename is stamped with an ISO date suffix
 * so multiple exports from the same view sort chronologically.
 */
export function downloadCsv(filename: string, csv: string): void {
  if (typeof window === "undefined") return;
  const stamped = stampFilename(filename);
  // Prepend BOM so Excel (Windows) correctly detects UTF-8.
  const blob = new Blob(["﻿", csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = stamped;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Release the blob — important on long-lived SPAs.
  URL.revokeObjectURL(url);
}

// ─── Internals — exported for tests ───────────────────────────────────

export function stampFilename(name: string): string {
  // YYYY-MM-DD suffix so files sort lexicographically by export date.
  const today = new Date().toISOString().slice(0, 10);
  if (name.endsWith(".csv")) {
    return name.replace(/\.csv$/, `-${today}.csv`);
  }
  return `${name}-${today}.csv`;
}

export function formatCell(
  value: string | number | boolean | null | undefined | Date,
): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

export function escapeCell(raw: string): string {
  // RFC 4180 — quote if the value contains a comma, quote, CR, or LF.
  if (/[",\r\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

// SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
