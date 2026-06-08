/**
 * Copyright 2026 Caelex (Inhaber: Julian Polleschner), Berlin. All rights reserved.
 *
 * Unit tests for the admin compact-number formatters. These pin the exact
 * "1.2k / 3.4M / €3.4k / 42%" rendering rules the cockpit depends on (a drift
 * here would silently change every KPI tile), and the NaN/negative guards.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import { compactNumber, eur, pctLabel } from "./format";

describe("compactNumber", () => {
  it("passes through sub-1000 values as rounded integers", () => {
    expect(compactNumber(0)).toBe("0");
    expect(compactNumber(7)).toBe("7");
    expect(compactNumber(999)).toBe("999");
    expect(compactNumber(12.6)).toBe("13"); // rounds
  });

  it("formats thousands with one decimal, stripping a trailing .0", () => {
    expect(compactNumber(1000)).toBe("1k");
    expect(compactNumber(1234)).toBe("1.2k");
    expect(compactNumber(9999)).toBe("10k"); // 9.999k → 10.0k → "10k"
  });

  it("formats millions and billions", () => {
    expect(compactNumber(3_400_000)).toBe("3.4M");
    expect(compactNumber(1_000_000)).toBe("1M");
    expect(compactNumber(2_500_000_000)).toBe("2.5B");
  });

  it("keeps the sign for negatives", () => {
    expect(compactNumber(-1234)).toBe("-1.2k");
    expect(compactNumber(-5)).toBe("-5");
  });

  it("degrades non-finite input to '0'", () => {
    expect(compactNumber(NaN)).toBe("0");
    expect(compactNumber(Infinity)).toBe("0");
    expect(compactNumber(-Infinity)).toBe("0");
  });
});

describe("eur", () => {
  it("prefixes the euro symbol and scales like compactNumber", () => {
    expect(eur(12)).toBe("€12");
    expect(eur(3400)).toBe("€3.4k");
    expect(eur(2_500_000)).toBe("€2.5M");
  });

  it("places the sign before the symbol for negatives", () => {
    expect(eur(-3400)).toBe("-€3.4k");
  });

  it("degrades non-finite input to '€0'", () => {
    expect(eur(NaN)).toBe("€0");
  });
});

describe("pctLabel", () => {
  it("renders a 0..1 ratio as a whole-percent label", () => {
    expect(pctLabel(0)).toBe("0%");
    expect(pctLabel(0.42)).toBe("42%");
    expect(pctLabel(1)).toBe("100%");
  });

  it("rounds to the nearest whole percent", () => {
    expect(pctLabel(0.005)).toBe("1%"); // 0.5% → rounds up to 1%
    expect(pctLabel(0.004)).toBe("0%");
  });

  it("accepts ratios above 1 (growth)", () => {
    expect(pctLabel(1.5)).toBe("150%");
  });

  it("degrades non-finite input to '0%'", () => {
    expect(pctLabel(NaN)).toBe("0%");
  });
});
