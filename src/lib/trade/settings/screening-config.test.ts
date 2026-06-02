import { describe, it, expect } from "vitest";
import {
  SCREENING_DEFAULTS,
  SCREENING_LIST_KEYS,
  CRITICAL_LIST_KEYS,
  THRESHOLD_MIN,
  THRESHOLD_MAX,
  isCriticalList,
  withCriticalLists,
  clampThreshold,
  sanitizeLists,
  sanitizeInterval,
  normalizeScreeningConfig,
} from "./screening-config";

describe("screening-config defaults", () => {
  it("ships all lists on, threshold 0.75 (engine WEAK_MATCH), auto-block, 30d", () => {
    expect(SCREENING_DEFAULTS.matchThreshold).toBe(0.75);
    expect(SCREENING_DEFAULTS.enabledLists).toHaveLength(
      SCREENING_LIST_KEYS.length,
    );
    expect(SCREENING_DEFAULTS.autoBlockOnConfirmedHit).toBe(true);
    expect(SCREENING_DEFAULTS.reScreenIntervalDays).toBe(30);
  });
  it("only references real list keys by default", () => {
    for (const k of SCREENING_DEFAULTS.enabledLists) {
      expect(SCREENING_LIST_KEYS).toContain(k);
    }
  });
});

describe("critical lists (fail-closed gate)", () => {
  it("the four primary designated-party lists are critical", () => {
    expect([...CRITICAL_LIST_KEYS].sort()).toEqual(
      ["BIS_ENTITY", "EU_FSF", "OFAC_SDN", "UN_CONSOLIDATED"].sort(),
    );
  });
  it("isCriticalList reflects membership", () => {
    expect(isCriticalList("OFAC_SDN")).toBe(true);
    expect(isCriticalList("UK_OFSI")).toBe(false);
  });
  it("withCriticalLists always unions the critical lists, canonical order", () => {
    expect(withCriticalLists([])).toEqual([
      "OFAC_SDN",
      "BIS_ENTITY",
      "EU_FSF",
      "UN_CONSOLIDATED",
    ]);
    expect(withCriticalLists(["UK_OFSI"])).toEqual([
      "OFAC_SDN",
      "BIS_ENTITY",
      "EU_FSF",
      "UN_CONSOLIDATED",
      "UK_OFSI",
    ]);
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
    expect(out).not.toBe(SCREENING_DEFAULTS);
    expect(out.enabledLists).not.toBe(SCREENING_DEFAULTS.enabledLists);
  });

  it("FAIL-CLOSED: critical lists survive even if the input omits them", () => {
    const out = normalizeScreeningConfig({ enabledLists: ["UK_OFSI"] });
    for (const c of CRITICAL_LIST_KEYS) {
      expect(out.enabledLists).toContain(c);
    }
    expect(out.enabledLists).toContain("UK_OFSI");
  });

  it("clamps the threshold and coerces the cadence", () => {
    const out = normalizeScreeningConfig({
      matchThreshold: 0.4,
      reScreenIntervalDays: 0,
    });
    expect(out.matchThreshold).toBe(THRESHOLD_MIN);
    expect(out.reScreenIntervalDays).toBeNull();
    expect(out.autoBlockOnConfirmedHit).toBe(true);
  });

  it("drops unknown list keys but keeps valid + critical ones", () => {
    const out = normalizeScreeningConfig({
      enabledLists: ["OPEN_SANCTIONS", "NOPE"],
    });
    expect(out.enabledLists).toContain("OPEN_SANCTIONS");
    expect(out.enabledLists).not.toContain("NOPE");
    for (const c of CRITICAL_LIST_KEYS) {
      expect(out.enabledLists).toContain(c);
    }
  });

  it("preserves a valid explicit autoBlock=false", () => {
    expect(
      normalizeScreeningConfig({ autoBlockOnConfirmedHit: false })
        .autoBlockOnConfirmedHit,
    ).toBe(false);
  });
});
