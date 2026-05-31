import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  toCentsNullable,
  fromCentsNullable,
} from "./money";

describe("toCents", () => {
  it("converts whole euros to cents", () => {
    expect(toCents(100)).toBe(10_000n);
    expect(toCents(0)).toBe(0n);
    expect(toCents(1)).toBe(100n);
  });

  it("rounds to the nearest cent, absorbing float noise", () => {
    // 19.99 * 100 = 1998.9999999999998 in IEEE-754 → must round to 1999
    expect(toCents(19.99)).toBe(1999n);
    expect(toCents(0.1 + 0.2)).toBe(30n); // classic 0.30000000000000004
    expect(toCents(1234567.89)).toBe(123_456_789n);
  });

  it("throws on non-finite input", () => {
    expect(() => toCents(NaN)).toThrow(/finite/);
    expect(() => toCents(Infinity)).toThrow(/finite/);
  });
});

describe("fromCents", () => {
  it("converts cents back to euros", () => {
    expect(fromCents(10_000n)).toBe(100);
    expect(fromCents(1999n)).toBe(19.99);
    expect(fromCents(0n)).toBe(0);
  });
});

describe("round-trip", () => {
  it("toCents/fromCents round-trips exactly for cent-precise values", () => {
    for (const eur of [0, 1, 19.99, 1234567.89, 0.01, 999999.99]) {
      expect(fromCents(toCents(eur))).toBe(eur);
    }
  });

  it("accumulation in cents does not drift (the T-H12 motivation)", () => {
    // Adding 0.10 a thousand times in float drifts; in cents it's exact.
    let cents = 0n;
    for (let i = 0; i < 1000; i++) cents += toCents(0.1);
    expect(cents).toBe(10_000n); // exactly 100.00 EUR
    expect(fromCents(cents)).toBe(100);
  });
});

describe("nullable variants", () => {
  it("toCentsNullable passes null/undefined through", () => {
    expect(toCentsNullable(null)).toBeNull();
    expect(toCentsNullable(undefined)).toBeNull();
    expect(toCentsNullable(50)).toBe(5000n);
  });
  it("fromCentsNullable passes null/undefined through", () => {
    expect(fromCentsNullable(null)).toBeNull();
    expect(fromCentsNullable(undefined)).toBeNull();
    expect(fromCentsNullable(5000n)).toBe(50);
  });
});
