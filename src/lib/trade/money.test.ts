import { describe, it, expect } from "vitest";
import {
  toCents,
  fromCents,
  toCentsNullable,
  fromCentsNullable,
} from "./money";

// NOTE: BigInt literals (`10_000n`) need ES2020+; this repo's tsconfig targets
// ES2017, so we use the `BigInt(...)` constructor form throughout (same runtime
// value, no TS2737).

describe("toCents", () => {
  it("converts whole euros to cents", () => {
    expect(toCents(100)).toBe(BigInt(10_000));
    expect(toCents(0)).toBe(BigInt(0));
    expect(toCents(1)).toBe(BigInt(100));
  });

  it("rounds to the nearest cent, absorbing float noise", () => {
    // 19.99 * 100 = 1998.9999999999998 in IEEE-754 → must round to 1999
    expect(toCents(19.99)).toBe(BigInt(1999));
    expect(toCents(0.1 + 0.2)).toBe(BigInt(30)); // classic 0.30000000000000004
    expect(toCents(1234567.89)).toBe(BigInt(123_456_789));
  });

  it("throws on non-finite input", () => {
    expect(() => toCents(NaN)).toThrow(/finite/);
    expect(() => toCents(Infinity)).toThrow(/finite/);
  });
});

describe("fromCents", () => {
  it("converts cents back to euros", () => {
    expect(fromCents(BigInt(10_000))).toBe(100);
    expect(fromCents(BigInt(1999))).toBe(19.99);
    expect(fromCents(BigInt(0))).toBe(0);
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
    let cents = BigInt(0);
    for (let i = 0; i < 1000; i++) cents += toCents(0.1);
    expect(cents).toBe(BigInt(10_000)); // exactly 100.00 EUR
    expect(fromCents(cents)).toBe(100);
  });
});

describe("nullable variants", () => {
  it("toCentsNullable passes null/undefined through", () => {
    expect(toCentsNullable(null)).toBeNull();
    expect(toCentsNullable(undefined)).toBeNull();
    expect(toCentsNullable(50)).toBe(BigInt(5000));
  });
  it("fromCentsNullable passes null/undefined through", () => {
    expect(fromCentsNullable(null)).toBeNull();
    expect(fromCentsNullable(undefined)).toBeNull();
    expect(fromCentsNullable(BigInt(5000))).toBe(50);
  });
});
