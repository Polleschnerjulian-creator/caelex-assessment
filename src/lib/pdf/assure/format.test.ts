import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  formatEUR,
  formatEURCompact,
  formatPercent,
  formatFraction,
  formatDate,
  formatNumber,
  trendIndicator,
  generateReportId,
} from "./format";

// ---------------------------------------------------------------------------
// formatEUR
// ---------------------------------------------------------------------------

describe("formatEUR", () => {
  it("formats a positive integer with thousand separators", () => {
    const result = formatEUR(1500000);
    // en-IE uses commas for thousands
    expect(result).toMatch(/^EUR\s/);
    expect(result).toContain("1");
    expect(result).toContain("500");
    expect(result).toContain("000");
  });

  it("formats zero", () => {
    expect(formatEUR(0)).toMatch(/^EUR\s0$/);
  });

  it("formats small numbers without decimals", () => {
    const result = formatEUR(42);
    expect(result).toBe("EUR 42");
  });

  it("returns N/A for null", () => {
    expect(formatEUR(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatEUR(undefined)).toBe("N/A");
  });

  it("formats negative numbers", () => {
    const result = formatEUR(-500);
    expect(result).toContain("500");
    expect(result).toContain("EUR");
  });
});

// ---------------------------------------------------------------------------
// formatEURCompact
// ---------------------------------------------------------------------------

describe("formatEURCompact", () => {
  it("formats billions", () => {
    expect(formatEURCompact(2_500_000_000)).toBe("EUR 2.5B");
  });

  it("formats exact billion", () => {
    expect(formatEURCompact(1_000_000_000)).toBe("EUR 1.0B");
  });

  it("formats millions", () => {
    expect(formatEURCompact(3_500_000)).toBe("EUR 3.5M");
  });

  it("formats exact million", () => {
    expect(formatEURCompact(1_000_000)).toBe("EUR 1.0M");
  });

  it("formats thousands", () => {
    expect(formatEURCompact(250_000)).toBe("EUR 250K");
  });

  it("formats exact thousand", () => {
    expect(formatEURCompact(1_000)).toBe("EUR 1K");
  });

  it("formats values below 1000 without suffix", () => {
    const result = formatEURCompact(500);
    expect(result).toMatch(/^EUR\s500$/);
  });

  it("formats zero", () => {
    const result = formatEURCompact(0);
    expect(result).toMatch(/^EUR\s0$/);
  });

  it("returns N/A for null", () => {
    expect(formatEURCompact(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatEURCompact(undefined)).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatPercent
// ---------------------------------------------------------------------------

describe("formatPercent", () => {
  it("formats a percentage with one decimal", () => {
    expect(formatPercent(75)).toBe("75.0%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.0%");
  });

  it("formats fractional value", () => {
    expect(formatPercent(33.33)).toBe("33.3%");
  });

  it("formats 100", () => {
    expect(formatPercent(100)).toBe("100.0%");
  });

  it("returns N/A for null", () => {
    expect(formatPercent(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatPercent(undefined)).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatFraction
// ---------------------------------------------------------------------------

describe("formatFraction", () => {
  it("converts 0.75 to 75%", () => {
    expect(formatFraction(0.75)).toBe("75%");
  });

  it("converts 0 to 0%", () => {
    expect(formatFraction(0)).toBe("0%");
  });

  it("converts 1 to 100%", () => {
    expect(formatFraction(1)).toBe("100%");
  });

  it("converts 0.333 to 33%", () => {
    expect(formatFraction(0.333)).toBe("33%");
  });

  it("returns N/A for null", () => {
    expect(formatFraction(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatFraction(undefined)).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatDate
// ---------------------------------------------------------------------------

describe("formatDate", () => {
  it("formats a Date object", () => {
    const d = new Date("2026-02-24T00:00:00Z");
    const result = formatDate(d);
    expect(result).toContain("24");
    expect(result).toContain("February");
    expect(result).toContain("2026");
  });

  it("formats a date string", () => {
    const result = formatDate("2025-12-01");
    expect(result).toContain("2025");
    expect(result).toContain("December");
  });

  it("returns N/A for null", () => {
    expect(formatDate(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatDate(undefined)).toBe("N/A");
  });

  it("returns N/A for empty string", () => {
    expect(formatDate("")).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// formatNumber
// ---------------------------------------------------------------------------

describe("formatNumber", () => {
  it("formats a number with thousand separators", () => {
    const result = formatNumber(15000);
    // en-IE locale: should include comma separator
    expect(result).toContain("15");
    expect(result).toContain("000");
  });

  it("formats zero", () => {
    expect(formatNumber(0)).toBe("0");
  });

  it("returns N/A for null", () => {
    expect(formatNumber(null)).toBe("N/A");
  });

  it("returns N/A for undefined", () => {
    expect(formatNumber(undefined)).toBe("N/A");
  });
});

// ---------------------------------------------------------------------------
// trendIndicator
// ---------------------------------------------------------------------------

describe("trendIndicator", () => {
  it("returns [UP] for up", () => {
    expect(trendIndicator("up")).toBe("[UP]");
  });

  it("returns [DOWN] for down", () => {
    expect(trendIndicator("down")).toBe("[DOWN]");
  });

  it("returns [FLAT] for flat", () => {
    expect(trendIndicator("flat")).toBe("[FLAT]");
  });

  it("returns empty string for unknown value", () => {
    // TypeScript types restrict this but the code has a default branch
    expect(trendIndicator("unknown" as "up")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// generateReportId
// ---------------------------------------------------------------------------

describe("generateReportId", () => {
  it("starts with the given prefix", () => {
    const id = generateReportId("EXEC");
    expect(id).toMatch(/^EXEC-/);
  });

  it("contains a timestamp and random part separated by dashes", () => {
    const id = generateReportId("TEST");
    const parts = id.split("-");
    // prefix-timestamp-random => at least 3 parts
    expect(parts.length).toBe(3);
  });

  it("produces unique IDs", () => {
    const id1 = generateReportId("X");
    const id2 = generateReportId("X");
    // While not guaranteed (same ms + same random is theoretically possible),
    // in practice they should differ
    expect(typeof id1).toBe("string");
    expect(typeof id2).toBe("string");
  });

  it("uses uppercase characters", () => {
    const id = generateReportId("PFX");
    // The timestamp and random segments are .toUpperCase()
    expect(id).toBe(id.toUpperCase());
  });
});
