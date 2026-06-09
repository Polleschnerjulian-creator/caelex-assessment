/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the admin export + date-range helpers. These pin the CSV
 * dialect (separators, quoting, formula-injection defang), filename
 * sanitisation, and the inclusive date-range clamp/swap/bounds math the two
 * interactivity primitives depend on. A drift in any of these would silently
 * break every admin export or the custom range picker.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  escapeCsvField,
  toCsv,
  csvFilename,
  isValidISODate,
  clampRange,
  rangeDays,
  isoDaysAgo,
} from "./export-utils";

describe("escapeCsvField", () => {
  it("leaves a plain field untouched", () => {
    expect(escapeCsvField("hello")).toBe("hello");
    expect(escapeCsvField("")).toBe("");
    expect(escapeCsvField("123")).toBe("123");
  });

  it("quotes fields containing a comma", () => {
    expect(escapeCsvField("a,b")).toBe('"a,b"');
  });

  it("quotes and doubles embedded double-quotes", () => {
    expect(escapeCsvField('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("quotes fields containing newlines (LF or CRLF)", () => {
    expect(escapeCsvField("line1\nline2")).toBe('"line1\nline2"');
    // CR triggers BOTH the formula-prefix (leading) and quoting; here CR is
    // internal so only quoting applies.
    expect(escapeCsvField("a\r\nb")).toBe('"a\r\nb"');
  });

  it("defangs leading formula triggers with a single quote", () => {
    expect(escapeCsvField("=SUM(A1:A2)")).toBe("'=SUM(A1:A2)");
    expect(escapeCsvField("+1")).toBe("'+1");
    expect(escapeCsvField("-cmd")).toBe("'-cmd");
    expect(escapeCsvField("@x")).toBe("'@x");
  });

  it("quotes a defanged value that also contains a comma", () => {
    // leading "=" → prefixed to "'=a,b", which now contains a comma → quoted.
    expect(escapeCsvField("=a,b")).toBe('"\'=a,b"');
  });

  it("does not defang a trigger char that is not leading", () => {
    expect(escapeCsvField("a=b")).toBe("a=b");
    expect(escapeCsvField("3-1")).toBe("3-1");
  });
});

describe("toCsv", () => {
  it("derives columns from the union of keys in first-seen order", () => {
    const rows = [
      { a: 1, b: 2 },
      { a: 3, c: 4 }, // introduces c; b is missing → empty
    ];
    expect(toCsv(rows)).toBe("a,b,c\r\n1,2,\r\n3,,4");
  });

  it("honours an explicit string column list (order + subset)", () => {
    const rows = [{ a: 1, b: 2, c: 3 }];
    expect(toCsv(rows, ["c", "a"])).toBe("c,a\r\n3,1");
  });

  it("relabels headers via {key, header} columns", () => {
    const rows = [{ product: "atlas", outcomes: 5 }];
    expect(
      toCsv(rows, [
        { key: "product", header: "Product" },
        { key: "outcomes", header: "Outcomes" },
      ]),
    ).toBe("Product,Outcomes\r\natlas,5");
  });

  it("renders null/undefined/non-finite as empty and booleans as words", () => {
    const rows = [{ x: null, y: undefined, z: NaN, b: true, n: 0 }] as const;
    expect(toCsv(rows as never, ["x", "y", "z", "b", "n"])).toBe(
      "x,y,z,b,n\r\n,,,true,0",
    );
  });

  it("emits just a header row for an empty dataset with explicit columns", () => {
    expect(toCsv([], ["a", "b"])).toBe("a,b");
  });

  it("returns an empty string for an empty dataset with no columns", () => {
    expect(toCsv([])).toBe("");
  });

  it("escapes header and body cells consistently", () => {
    const rows = [{ "a,b": "=danger", plain: "ok" }];
    // header "a,b" → quoted; body "=danger" → formula-defanged.
    expect(toCsv(rows)).toBe('"a,b",plain\r\n\'=danger,ok');
  });
});

describe("csvFilename", () => {
  it("appends .csv and lower-cases + hyphenates", () => {
    expect(csvFilename("Cockpit Export")).toBe("cockpit-export.csv");
  });

  it("strips path separators and reserved characters", () => {
    expect(csvFilename("../etc/passwd")).toBe("etcpasswd.csv");
    expect(csvFilename("a/b\\c:d*e?")).toBe("abcde.csv");
  });

  it("does not double the extension", () => {
    expect(csvFilename("report.csv")).toBe("report.csv");
    expect(csvFilename("report.CSV")).toBe("report.csv");
  });

  it("collapses whitespace + repeated hyphens and trims edges", () => {
    expect(csvFilename("  steering   v2 -- final  ")).toBe(
      "steering-v2-final.csv",
    );
  });

  it("falls back to 'export' for empty / fully-stripped input", () => {
    expect(csvFilename("")).toBe("export.csv");
    expect(csvFilename("///")).toBe("export.csv");
    expect(csvFilename("***")).toBe("export.csv");
  });
});

describe("isValidISODate", () => {
  it("accepts a real yyyy-mm-dd date", () => {
    expect(isValidISODate("2026-06-09")).toBe(true);
    expect(isValidISODate("2024-02-29")).toBe(true); // leap day
  });

  it("rejects malformed shapes", () => {
    expect(isValidISODate("2026-6-9")).toBe(false);
    expect(isValidISODate("06/09/2026")).toBe(false);
    expect(isValidISODate("2026-06-09T00:00:00Z")).toBe(false);
    expect(isValidISODate("")).toBe(false);
    expect(isValidISODate(null)).toBe(false);
    expect(isValidISODate(undefined)).toBe(false);
  });

  it("rejects impossible calendar dates that would roll over", () => {
    expect(isValidISODate("2026-02-30")).toBe(false);
    expect(isValidISODate("2026-13-01")).toBe(false);
    expect(isValidISODate("2026-00-10")).toBe(false);
    expect(isValidISODate("2023-02-29")).toBe(false); // not a leap year
  });
});

describe("clampRange", () => {
  it("returns an ascending range for already-ordered valid input", () => {
    expect(clampRange("2026-06-01", "2026-06-09")).toEqual({
      fromISO: "2026-06-01",
      toISO: "2026-06-09",
    });
  });

  it("swaps an inverted pair so the window is always ascending", () => {
    expect(clampRange("2026-06-09", "2026-06-01")).toEqual({
      fromISO: "2026-06-01",
      toISO: "2026-06-09",
    });
  });

  it("accepts a single-day range (from === to)", () => {
    expect(clampRange("2026-06-09", "2026-06-09")).toEqual({
      fromISO: "2026-06-09",
      toISO: "2026-06-09",
    });
  });

  it("returns null when either end is invalid", () => {
    expect(clampRange("2026-06-31", "2026-06-09")).toBeNull();
    expect(clampRange("2026-06-01", "nope")).toBeNull();
    expect(clampRange(null, "2026-06-09")).toBeNull();
  });

  it("clamps each end into an inclusive [min,max] bound", () => {
    expect(
      clampRange("2026-05-01", "2026-12-31", {
        min: "2026-06-01",
        max: "2026-06-30",
      }),
    ).toEqual({ fromISO: "2026-06-01", toISO: "2026-06-30" });
  });

  it("returns null when the requested window lies wholly outside the bounds", () => {
    expect(
      clampRange("2020-01-01", "2020-02-01", { max: "2019-12-31" }),
    ).toBeNull();
    expect(
      clampRange("2030-01-01", "2030-02-01", { min: "2031-01-01" }),
    ).toBeNull();
  });

  it("ignores malformed bound strings rather than throwing", () => {
    expect(
      clampRange("2026-06-01", "2026-06-09", { min: "garbage", max: "" }),
    ).toEqual({ fromISO: "2026-06-01", toISO: "2026-06-09" });
  });
});

describe("rangeDays", () => {
  it("counts inclusively (single day = 1)", () => {
    expect(rangeDays({ fromISO: "2026-06-09", toISO: "2026-06-09" })).toBe(1);
    expect(rangeDays({ fromISO: "2026-06-01", toISO: "2026-06-09" })).toBe(9);
  });

  it("spans month + year boundaries correctly", () => {
    expect(rangeDays({ fromISO: "2026-01-01", toISO: "2026-12-31" })).toBe(365);
    expect(rangeDays({ fromISO: "2024-01-01", toISO: "2024-12-31" })).toBe(366); // leap
  });

  it("is DST-stable across a spring-forward boundary (US, March)", () => {
    // 2026-03-08 is the US DST switch; a naive local-time diff could drop an hour
    // and miscount. Inclusive day count must still be exactly 2.
    expect(rangeDays({ fromISO: "2026-03-08", toISO: "2026-03-09" })).toBe(2);
  });

  it("returns 0 for null/invalid/descending input", () => {
    expect(rangeDays(null)).toBe(0);
    expect(rangeDays(undefined)).toBe(0);
    expect(rangeDays({ fromISO: "bad", toISO: "2026-06-09" })).toBe(0);
    expect(rangeDays({ fromISO: "2026-06-09", toISO: "2026-06-01" })).toBe(0);
  });
});

describe("isoDaysAgo", () => {
  it("computes a date N days before a given anchor", () => {
    expect(isoDaysAgo(0, "2026-06-09")).toBe("2026-06-09");
    expect(isoDaysAgo(1, "2026-06-09")).toBe("2026-06-08");
    expect(isoDaysAgo(30, "2026-06-09")).toBe("2026-05-10");
  });

  it("crosses a year boundary", () => {
    expect(isoDaysAgo(1, "2026-01-01")).toBe("2025-12-31");
  });

  it("floors negative / non-finite daysAgo at 0", () => {
    expect(isoDaysAgo(-5, "2026-06-09")).toBe("2026-06-09");
    expect(isoDaysAgo(NaN, "2026-06-09")).toBe("2026-06-09");
  });

  it("falls back to today (UTC) for a missing/invalid anchor", () => {
    const today = new Date().toISOString().slice(0, 10);
    expect(isoDaysAgo(0)).toBe(today);
    expect(isoDaysAgo(0, "not-a-date")).toBe(today);
  });
});
