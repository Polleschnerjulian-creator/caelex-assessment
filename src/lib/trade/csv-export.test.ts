/**
 * Tests for the CSV export utility (U-CRIT-5).
 *
 * Covers the RFC 4180 escaping rules (quotes/commas/newlines), the
 * filename stamping, and the cell formatter for the various input
 * types the table data uses (string, number, boolean, null, Date).
 */

import { describe, it, expect, vi } from "vitest";
import {
  buildCsv,
  escapeCell,
  formatCell,
  stampFilename,
  type CsvColumn,
} from "./csv-export";

describe("escapeCell", () => {
  it("returns plain values untouched", () => {
    expect(escapeCell("plain")).toBe("plain");
    expect(escapeCell("123")).toBe("123");
    expect(escapeCell("")).toBe("");
  });

  it("quotes values containing commas", () => {
    expect(escapeCell("a,b")).toBe('"a,b"');
  });

  it("quotes values containing double-quotes and doubles the quote", () => {
    expect(escapeCell('say "hi"')).toBe('"say ""hi"""');
  });

  it("quotes values containing CR or LF", () => {
    expect(escapeCell("line\nbreak")).toBe('"line\nbreak"');
    expect(escapeCell("line\rreturn")).toBe('"line\rreturn"');
  });
});

describe("formatCell", () => {
  it("returns the empty string for null and undefined", () => {
    expect(formatCell(null)).toBe("");
    expect(formatCell(undefined)).toBe("");
  });

  it("renders booleans as 'true' / 'false'", () => {
    expect(formatCell(true)).toBe("true");
    expect(formatCell(false)).toBe("false");
  });

  it("renders dates as ISO timestamps", () => {
    expect(formatCell(new Date("2026-05-24T12:00:00Z"))).toBe(
      "2026-05-24T12:00:00.000Z",
    );
  });

  it("renders numbers as their decimal string", () => {
    expect(formatCell(42)).toBe("42");
    expect(formatCell(3.14)).toBe("3.14");
  });

  it("renders strings unchanged", () => {
    expect(formatCell("hello")).toBe("hello");
  });
});

describe("stampFilename", () => {
  it("appends today's ISO date and .csv suffix when missing", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T08:00:00Z"));
    expect(stampFilename("items")).toBe("items-2026-05-24.csv");
    vi.useRealTimers();
  });

  it("inserts the date before an existing .csv suffix", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-24T08:00:00Z"));
    expect(stampFilename("export.csv")).toBe("export-2026-05-24.csv");
    vi.useRealTimers();
  });
});

describe("buildCsv", () => {
  interface Row {
    id: string;
    name: string;
    qty: number;
    classified: boolean;
  }
  const cols: CsvColumn<Row>[] = [
    { header: "ID", get: (r) => r.id },
    { header: "Name", get: (r) => r.name },
    { header: "Qty", get: (r) => r.qty },
    { header: "Classified", get: (r) => r.classified },
  ];

  it("emits a header row + one CRLF-separated row per data row", () => {
    const csv = buildCsv(
      [
        { id: "1", name: "Item A", qty: 3, classified: true },
        { id: "2", name: "Item B", qty: 5, classified: false },
      ],
      cols,
    );
    expect(csv).toBe(
      ["ID,Name,Qty,Classified", "1,Item A,3,true", "2,Item B,5,false"].join(
        "\r\n",
      ),
    );
  });

  it("escapes special characters per column", () => {
    const csv = buildCsv(
      [{ id: "1", name: 'name, with "quotes"', qty: 0, classified: false }],
      cols,
    );
    expect(csv).toContain('"name, with ""quotes"""');
  });

  it("emits only headers when rows are empty", () => {
    expect(buildCsv<Row>([], cols)).toBe("ID,Name,Qty,Classified");
  });
});
