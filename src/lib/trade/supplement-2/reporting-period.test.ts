/**
 * Tests for src/lib/trade/supplement-2/reporting-period.ts (Z29, Tier 4).
 *
 * Coverage (7 cases):
 *   1. makeReportingPeriod H1 — Jan 1 .. Jul 1, due Jul 31
 *   2. makeReportingPeriod H2 — Jul 1 .. Jan 1 next year, due Jan 31 next year
 *   3. parseReportingPeriod round-trips
 *   4. parseReportingPeriod rejects malformed input
 *   5. getJustClosedPeriod on Jan 1 → H2 prior year; on Jul 1 → H1 same year
 *   6. dateIsInPeriod half-open semantics — start in, end excluded
 *   7. daysUntilDue positive before, zero on, negative after due date
 */

import { describe, it, expect } from "vitest";
import {
  makeReportingPeriod,
  parseReportingPeriod,
  getJustClosedPeriod,
  dateIsInPeriod,
  daysUntilDue,
} from "./reporting-period";

describe("makeReportingPeriod", () => {
  it("H1 covers Jan 1 .. Jul 1 with due Jul 31", () => {
    const p = makeReportingPeriod(2026, "H1");
    expect(p.id).toBe("2026-H1");
    expect(p.start.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(p.dueDate.toISOString()).toBe("2026-07-31T00:00:00.000Z");
  });

  it("H2 covers Jul 1 .. Jan 1 next year with due Jan 31 next year", () => {
    const p = makeReportingPeriod(2026, "H2");
    expect(p.id).toBe("2026-H2");
    expect(p.start.toISOString()).toBe("2026-07-01T00:00:00.000Z");
    expect(p.end.toISOString()).toBe("2027-01-01T00:00:00.000Z");
    expect(p.dueDate.toISOString()).toBe("2027-01-31T00:00:00.000Z");
  });

  it("rejects implausible years", () => {
    expect(() => makeReportingPeriod(1999, "H1")).toThrow();
    expect(() => makeReportingPeriod(2101, "H1")).toThrow();
  });
});

describe("parseReportingPeriod", () => {
  it("round-trips H1 and H2", () => {
    expect(parseReportingPeriod("2026-H1").id).toBe("2026-H1");
    expect(parseReportingPeriod("2027-H2").id).toBe("2027-H2");
  });

  it("rejects malformed input", () => {
    expect(() => parseReportingPeriod("2026")).toThrow();
    expect(() => parseReportingPeriod("2026-H3")).toThrow();
    expect(() => parseReportingPeriod("abc-H1")).toThrow();
    expect(() => parseReportingPeriod("")).toThrow();
  });
});

describe("getJustClosedPeriod", () => {
  it("returns H2 of prior year when called on Jan 1", () => {
    const result = getJustClosedPeriod(new Date("2026-01-01T00:00:00.000Z"));
    expect(result.id).toBe("2025-H2");
  });

  it("returns H1 of current year when called on Jul 1", () => {
    const result = getJustClosedPeriod(new Date("2026-07-01T00:00:00.000Z"));
    expect(result.id).toBe("2026-H1");
  });

  it("returns H2 of prior year for any date in Jan-Jun", () => {
    expect(getJustClosedPeriod(new Date("2026-03-15T12:00:00.000Z")).id).toBe(
      "2025-H2",
    );
  });

  it("returns H1 of current year for any date in Jul-Dec", () => {
    expect(getJustClosedPeriod(new Date("2026-11-30T23:00:00.000Z")).id).toBe(
      "2026-H1",
    );
  });
});

describe("dateIsInPeriod", () => {
  const period = makeReportingPeriod(2026, "H1");

  it("includes the start boundary", () => {
    expect(dateIsInPeriod(new Date("2026-01-01T00:00:00.000Z"), period)).toBe(
      true,
    );
  });

  it("includes mid-period dates", () => {
    expect(dateIsInPeriod(new Date("2026-04-15T00:00:00.000Z"), period)).toBe(
      true,
    );
  });

  it("EXCLUDES the end boundary (half-open)", () => {
    expect(dateIsInPeriod(new Date("2026-07-01T00:00:00.000Z"), period)).toBe(
      false,
    );
  });

  it("excludes dates outside the period", () => {
    expect(dateIsInPeriod(new Date("2025-12-31T00:00:00.000Z"), period)).toBe(
      false,
    );
    expect(dateIsInPeriod(new Date("2026-07-02T00:00:00.000Z"), period)).toBe(
      false,
    );
  });
});

describe("daysUntilDue", () => {
  const period = makeReportingPeriod(2026, "H1"); // due 2026-07-31

  it("returns positive days before the deadline", () => {
    expect(daysUntilDue(period, new Date("2026-07-17T00:00:00.000Z"))).toBe(14);
    expect(daysUntilDue(period, new Date("2026-07-28T00:00:00.000Z"))).toBe(3);
  });

  it("returns zero on the deadline date", () => {
    expect(daysUntilDue(period, new Date("2026-07-31T00:00:00.000Z"))).toBe(0);
  });

  it("returns negative when overdue", () => {
    expect(daysUntilDue(period, new Date("2026-08-05T00:00:00.000Z"))).toBe(-5);
  });
});
