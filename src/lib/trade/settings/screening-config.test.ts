import { describe, it, expect } from "vitest";
import {
  SCREENING_DEFAULTS,
  SCREENING_LIST_KEYS,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
  clampThreshold,
  sanitizeLists,
  sanitizeInterval,
  normalizeScreeningConfig,
} from "./screening-config";

describe("screening-config defaults", () => {
  it("ships the audited defaults (0.85, 5 lists, auto-block, 30d)", () => {
    expect(SCREENING_DEFAULTS.matchThreshold).toBe(0.85);
    expect(SCREENING_DEFAULTS.enabledLists).toHaveLength(5);
    expect(SCREENING_DEFAULTS.autoBlockOnConfirmedHit).toBe(true);
    expect(SCREENING_DEFAULTS.reScreenIntervalDays).toBe(30);
  });
  it("only enables real list keys by default", () => {
    for (const k of SCREENING_DEFAULTS.enabledLists) {
      expect(SCREENING_LIST_KEYS).toContain(k);
    }
  });
});

describe("clampThreshold", () => {
  it("clamps below the floor up to THRESHOLD_MIN", () => {
    expect(clampThreshold(0.5)).toBe(THRESHOLD_MIN);
  });
  it("clamps above the ceiling down to THRESHOLD_MAX", () => {
    expect(clampThreshold(0.999)).toBe(THRESHOLD_MAX);
  });
  it("passes through an in-range value", () => {
    expect(clampThreshold(0.85)).toBe(0.85);
  });
  it("falls back to the default on NaN", () => {
    expect(clampThreshold(Number.NaN)).toBe(SCREENING_DEFAULTS.matchThreshold);
  });
});

describe("sanitizeLists", () => {
  it("drops unknown keys and returns canonical order", () => {
    expect(sanitizeLists(["UK_OFSI", "BOGUS", "OFAC_SDN"])).toEqual([
      "OFAC_SDN",
      "UK_OFSI",
    ]);
  });
  it("dedupes repeated keys", () => {
    expect(sanitizeLists(["OFAC_SDN", "OFAC_SDN"])).toEqual(["OFAC_SDN"]);
  });
  it("returns empty for an all-invalid input", () => {
    expect(sanitizeLists(["x", "y"])).toEqual([]);
  });
});

describe("sanitizeInterval", () => {
  it("treats 0 / negative / NaN as off (null)", () => {
    expect(sanitizeInterval(0)).toBeNull();
    expect(sanitizeInterval(-5)).toBeNull();
    expect(sanitizeInterval(Number.NaN)).toBeNull();
  });
  it("keeps null as off", () => {
    expect(sanitizeInterval(null)).toBeNull();
  });
  it("rounds a positive value to an integer", () => {
    expect(sanitizeInterval(30.7)).toBe(31);
    expect(sanitizeInterval(30)).toBe(30);
  });
});

describe("normalizeScreeningConfig", () => {
  it("returns a fresh copy of defaults for null input", () => {
    const out = normalizeScreeningConfig(null);
    expect(out).toEqual(SCREENING_DEFAULTS);
    expect(out).not.toBe(SCREENING_DEFAULTS); // copy, not the same ref
  });
  it("clamps + sanitises a raw/partial input", () => {
    const out = normalizeScreeningConfig({
      enabledLists: ["OFAC_SDN", "NOPE"],
      matchThreshold: 0.4,
      reScreenIntervalDays: 0,
    });
    expect(out.enabledLists).toEqual(["OFAC_SDN"]);
    expect(out.matchThreshold).toBe(THRESHOLD_MIN);
    expect(out.reScreenIntervalDays).toBeNull();
    // unspecified field falls back to default
    expect(out.autoBlockOnConfirmedHit).toBe(true);
  });
  it("preserves a valid explicit autoBlock=false", () => {
    expect(
      normalizeScreeningConfig({ autoBlockOnConfirmedHit: false })
        .autoBlockOnConfirmedHit,
    ).toBe(false);
  });
});
