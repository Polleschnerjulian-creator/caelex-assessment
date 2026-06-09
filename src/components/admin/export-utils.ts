/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Admin/Analytics Center — pure CSV + date-range helpers (P2 interactivity).
 * ════════════════════════════════════════════════════════════════════════════
 *
 * The arithmetic + string-munging behind the two interactivity primitives
 * (ExportButton, DateRangePicker) lives here as a PURE module — no React, no
 * "use client", no DOM, no I/O — so the parts that are easy to get subtly wrong
 * (CSV escaping, ISO date clamping) are unit-tested in isolation. The components
 * themselves stay thin: they only wire these results into a Blob / an <input>.
 *
 * CSV dialect (RFC-4180-ish, spreadsheet-safe):
 *   - Fields are comma-separated, rows are CRLF-separated.
 *   - A field is double-quoted iff it contains a comma, a double-quote, a CR, or
 *     an LF; embedded double-quotes are doubled ("" ).
 *   - A leading =, +, -, @, TAB or CR in a field is prefixed with a single quote
 *     to neutralise spreadsheet formula injection (a value like "=cmd()" pasted
 *     into Excel would otherwise execute). This is a security measure, not
 *     cosmetic — admin exports can contain attacker-influenced strings.
 *
 * Everything is deterministic + locale-independent so a CSV generated on the
 * server and on the client is byte-identical.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─────────────────────────────────────────────────────────────────────────────
// CSV SERIALISATION
// ─────────────────────────────────────────────────────────────────────────────

/** A single exportable row: column key → cell value. */
export type CsvRow = Record<string, CsvValue>;
/** The cell value kinds we know how to render deterministically. */
export type CsvValue = string | number | boolean | null | undefined;

/** Field separator + record separator. CRLF is the safest cross-tool newline. */
const FIELD_SEP = ",";
const RECORD_SEP = "\r\n";

/**
 * Render one cell to its raw (un-quoted) string form. `null`/`undefined` → empty
 * string; numbers that are non-finite (NaN/±Infinity) → empty string too, so an
 * export never prints "NaN" or "Infinity"; booleans → "true"/"false". Everything
 * else is `String(value)`.
 */
function rawCell(value: CsvValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

/**
 * Characters that, when LEADING a cell, let a spreadsheet interpret the cell as a
 * formula. We defang by prefixing a single quote (the standard mitigation). TAB
 * (\t) and CR (\r) are included because some tools strip leading whitespace and
 * then re-detect a formula trigger underneath.
 */
const FORMULA_TRIGGERS = new Set(["=", "+", "-", "@", "\t", "\r"]);

/**
 * Escape one already-stringified cell for CSV output:
 *   1. neutralise a leading formula-trigger char with a `'` prefix, then
 *   2. wrap in double-quotes + double any embedded quote IFF the (now possibly
 *      prefixed) text contains a separator, a quote, or a newline.
 * Pure + total. Exported for direct unit-testing of the escaping rules.
 */
export function escapeCsvField(raw: string): string {
  // Formula-injection guard FIRST so the prefixed value is what gets quoted.
  let value = raw;
  if (value.length > 0 && FORMULA_TRIGGERS.has(value[0])) {
    value = `'${value}`;
  }

  const mustQuote =
    value.includes(FIELD_SEP) ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r");

  if (!mustQuote) return value;
  // Double every embedded quote, then wrap.
  return `"${value.replace(/"/g, '""')}"`;
}

/**
 * Serialise an array of row objects into a CSV string with a header line.
 *
 * Column order + the header come from the `columns` arg when given; otherwise
 * they are derived from the UNION of keys across all rows, in first-seen order
 * (so a sparse later row can't reorder or drop columns). Each column may be a
 * bare key (header === key) or `{ key, header }` to relabel.
 *
 * Pure + total: returns "" for an empty dataset with no explicit columns (there
 * is nothing to head); with explicit columns it still emits the header row so a
 * downstream import sees the schema even with zero data rows. Never mutates input.
 */
export function toCsv(
  rows: readonly CsvRow[],
  columns?: ReadonlyArray<string | { key: string; header: string }>,
): string {
  // Normalise the column spec to { key, header } pairs.
  const cols = (columns ?? deriveColumns(rows)).map((c) =>
    typeof c === "string" ? { key: c, header: c } : c,
  );

  if (cols.length === 0) return "";

  const headerLine = cols.map((c) => escapeCsvField(c.header)).join(FIELD_SEP);

  const bodyLines = rows.map((row) =>
    cols.map((c) => escapeCsvField(rawCell(row[c.key]))).join(FIELD_SEP),
  );

  return [headerLine, ...bodyLines].join(RECORD_SEP);
}

/**
 * Derive the column key list as the union of all row keys in first-seen order.
 * Stable + deterministic so two equal datasets always yield the same header.
 */
function deriveColumns(rows: readonly CsvRow[]): string[] {
  const seen = new Set<string>();
  const order: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        order.push(key);
      }
    }
  }
  return order;
}

/**
 * Sanitise a user-facing filename stem into a safe download name + ensure the
 * `.csv` extension. Strips path separators + control/reserved chars, collapses
 * whitespace to single hyphens, lower-cases, and trims to a sane length. Empty /
 * all-stripped input falls back to "export". Pure.
 */
export function csvFilename(stem: string): string {
  const cleaned = (stem || "")
    .normalize("NFKD")
    // drop anything that isn't a word char, space, dot or hyphen
    .replace(/[^\w \-.]+/g, "")
    .replace(/\.csv$/i, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "")
    .toLowerCase()
    .slice(0, 80);
  return `${cleaned || "export"}.csv`;
}

// ─────────────────────────────────────────────────────────────────────────────
// DATE-RANGE MATH  (DateRangePicker)
// ─────────────────────────────────────────────────────────────────────────────

/** The value a DateRangePicker emits: an inclusive [fromISO, toISO] day window. */
export interface DateRange {
  /** ISO yyyy-mm-dd (inclusive start). */
  fromISO: string;
  /** ISO yyyy-mm-dd (inclusive end). */
  toISO: string;
}

/** Strict yyyy-mm-dd shape check (does NOT validate calendar correctness). */
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * True iff `s` is a real calendar date in strict yyyy-mm-dd form. We re-format
 * the parsed UTC instant back to yyyy-mm-dd and compare, which rejects junk like
 * "2026-02-30" (rolls to March) or "2026-13-01" while staying timezone-stable
 * (parsing the bare date as UTC midnight). Pure.
 */
export function isValidISODate(s: string | null | undefined): s is string {
  if (!s || !ISO_DATE_RE.test(s)) return false;
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!Number.isFinite(t)) return false;
  return new Date(t).toISOString().slice(0, 10) === s;
}

/**
 * Clamp a raw {from,to} pair into a valid inclusive range, or return null when
 * it cannot be made valid.
 *
 * Rules (all timezone-stable, operating on the yyyy-mm-dd strings as UTC days):
 *   - both ends must be valid calendar dates → else null (caller keeps prior).
 *   - if from > to, the two are SWAPPED so the window is always ascending
 *     (a picker where the user sets the end before the start still yields a sane
 *     range rather than an empty one).
 *   - an optional inclusive [min,max] bound clamps each end into range; if the
 *     whole requested window lies entirely outside [min,max], returns null.
 *
 * Pure + total: never throws, never mutates. Returns a fresh object.
 */
export function clampRange(
  from: string | null | undefined,
  to: string | null | undefined,
  bounds?: { min?: string; max?: string },
): DateRange | null {
  if (!isValidISODate(from) || !isValidISODate(to)) return null;

  // Ascending: swap rather than reject so the control is forgiving.
  let lo = from <= to ? from : to;
  let hi = from <= to ? to : from;

  const min =
    bounds?.min && isValidISODate(bounds.min) ? bounds.min : undefined;
  const max =
    bounds?.max && isValidISODate(bounds.max) ? bounds.max : undefined;

  // If the window is wholly past the allowed bounds, there is no overlap.
  if (max && lo > max) return null;
  if (min && hi < min) return null;

  if (min && lo < min) lo = min;
  if (max && hi > max) hi = max;

  // After clamping the ends could cross only if bounds were themselves inverted;
  // guard so we never emit a descending range.
  if (lo > hi) return null;

  return { fromISO: lo, toISO: hi };
}

/**
 * Count of whole days in an inclusive [fromISO, toISO] window (1 for a single
 * day). Returns 0 for an invalid/null range. Computed from the UTC-midnight
 * instants so DST never adds/drops a day. Pure.
 */
export function rangeDays(range: DateRange | null | undefined): number {
  if (
    !range ||
    !isValidISODate(range.fromISO) ||
    !isValidISODate(range.toISO)
  ) {
    return 0;
  }
  const a = Date.parse(`${range.fromISO}T00:00:00Z`);
  const b = Date.parse(`${range.toISO}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return 0;
  const MS_PER_DAY = 86_400_000;
  return Math.round((b - a) / MS_PER_DAY) + 1; // inclusive of both endpoints
}

/**
 * The ISO yyyy-mm-dd for `daysAgo` days before an anchor (default: today, UTC).
 * Used to seed a DateRangePicker's default window (e.g. last-30-days) without
 * pulling a date library. `daysAgo` is floored at 0. Pure (given an anchor) and
 * timezone-stable (UTC slice).
 */
export function isoDaysAgo(daysAgo: number, anchorISO?: string): string {
  const base =
    anchorISO && isValidISODate(anchorISO)
      ? Date.parse(`${anchorISO}T00:00:00Z`)
      : Date.now();
  const n = Number.isFinite(daysAgo) && daysAgo > 0 ? Math.floor(daysAgo) : 0;
  const t = base - n * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}
