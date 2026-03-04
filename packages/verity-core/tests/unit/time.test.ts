/**
 * Unit tests for the Time Utilities module — Verity 2036
 */

import { describe, it, expect } from "vitest";
import {
  isExpired,
  isNotYetValid,
  isWithinValidityWindow,
  utcNow,
  utcFuture,
  isValidTimestamp,
  CLOCK_SKEW_TOLERANCE_S,
} from "../../src/time/index.js";

// ---------------------------------------------------------------------------
// isExpired
// ---------------------------------------------------------------------------

describe("isExpired", () => {
  it("returns false for future timestamp", () => {
    const future = new Date(Date.now() + 3_600_000).toISOString(); // +1 hour
    expect(isExpired(future)).toBe(false);
  });

  it("returns true for past timestamp", () => {
    const past = new Date(Date.now() - 3_600_000).toISOString(); // -1 hour
    expect(isExpired(past)).toBe(true);
  });

  it("accounts for clock skew (not expired within tolerance)", () => {
    // Expired by 100 seconds but within the 300s tolerance
    const now = new Date();
    const justPast = new Date(now.getTime() - 100_000).toISOString();
    expect(isExpired(justPast, now)).toBe(false);
  });

  it("expired when past tolerance window", () => {
    const now = new Date();
    // Expired by 400 seconds — beyond the 300s tolerance
    const farPast = new Date(now.getTime() - 400_000).toISOString();
    expect(isExpired(farPast, now)).toBe(true);
  });

  it("respects custom skew tolerance", () => {
    const now = new Date();
    // Expired by 10 seconds
    const justPast = new Date(now.getTime() - 10_000).toISOString();
    // With 0 tolerance, it should be expired
    expect(isExpired(justPast, now, 0)).toBe(true);
    // With 60s tolerance, it should NOT be expired
    expect(isExpired(justPast, now, 60)).toBe(false);
  });

  it("throws for invalid timestamp", () => {
    expect(() => isExpired("not-a-date")).toThrow(RangeError);
  });

  it("uses current time when now is not provided", () => {
    const farFuture = new Date(Date.now() + 86_400_000).toISOString();
    expect(isExpired(farFuture)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isNotYetValid
// ---------------------------------------------------------------------------

describe("isNotYetValid", () => {
  it("returns true for far future timestamp", () => {
    const farFuture = new Date(Date.now() + 86_400_000).toISOString(); // +24 hours
    expect(isNotYetValid(farFuture)).toBe(true);
  });

  it("returns false for past timestamp", () => {
    const past = new Date(Date.now() - 3_600_000).toISOString(); // -1 hour
    expect(isNotYetValid(past)).toBe(false);
  });

  it("accounts for clock skew", () => {
    const now = new Date();
    // 100 seconds in the future — within the 300s tolerance
    const nearFuture = new Date(now.getTime() + 100_000).toISOString();
    expect(isNotYetValid(nearFuture, now)).toBe(false);
  });

  it("not yet valid when before tolerance window", () => {
    const now = new Date();
    // 400 seconds in the future — beyond the 300s tolerance
    const farFuture = new Date(now.getTime() + 400_000).toISOString();
    expect(isNotYetValid(farFuture, now)).toBe(true);
  });

  it("respects custom skew tolerance", () => {
    const now = new Date();
    // 10 seconds in the future
    const nearFuture = new Date(now.getTime() + 10_000).toISOString();
    // With 0 tolerance, it should be not yet valid
    expect(isNotYetValid(nearFuture, now, 0)).toBe(true);
    // With 60s tolerance, it should be considered valid
    expect(isNotYetValid(nearFuture, now, 60)).toBe(false);
  });

  it("throws for invalid timestamp", () => {
    expect(() => isNotYetValid("invalid")).toThrow(RangeError);
  });

  it("returns false for exactly now minus tolerance", () => {
    const now = new Date();
    const exactBoundary = new Date(
      now.getTime() + CLOCK_SKEW_TOLERANCE_S * 1000,
    ).toISOString();
    // At exactly the boundary: nowMs < fromMs - tolerance => nowMs < fromMs - tolerance
    // fromMs = nowMs + tolerance => fromMs - tolerance = nowMs => not < so false
    expect(isNotYetValid(exactBoundary, now)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// isWithinValidityWindow
// ---------------------------------------------------------------------------

describe("isWithinValidityWindow", () => {
  it("returns true for current timestamp within window", () => {
    const now = new Date();
    const from = new Date(now.getTime() - 3_600_000).toISOString(); // -1 hour
    const until = new Date(now.getTime() + 3_600_000).toISOString(); // +1 hour
    expect(isWithinValidityWindow(from, until, now)).toBe(true);
  });

  it("returns false for expired timestamp", () => {
    const now = new Date();
    // Both from and until are far in the past (well beyond 300s tolerance)
    const from = new Date(now.getTime() - 86_400_000).toISOString(); // -24 hours
    const until = new Date(now.getTime() - 43_200_000).toISOString(); // -12 hours
    expect(isWithinValidityWindow(from, until, now)).toBe(false);
  });

  it("returns false when not yet valid", () => {
    const now = new Date();
    const from = new Date(now.getTime() + 86_400_000).toISOString(); // +24 hours
    const until = new Date(now.getTime() + 172_800_000).toISOString(); // +48 hours
    expect(isWithinValidityWindow(from, until, now)).toBe(false);
  });

  it("accounts for clock skew on both boundaries", () => {
    const now = new Date();
    // Start is 100s in the future (within 300s tolerance)
    const from = new Date(now.getTime() + 100_000).toISOString();
    // End is 100s in the past (within 300s tolerance)
    const until = new Date(now.getTime() - 100_000).toISOString();
    expect(isWithinValidityWindow(from, until, now)).toBe(true);
  });

  it("combines isNotYetValid and isExpired logic", () => {
    const now = new Date();
    const from = new Date(now.getTime() - 1000).toISOString();
    const until = new Date(now.getTime() + 1000).toISOString();
    const window = isWithinValidityWindow(from, until, now);
    const notYetValid = isNotYetValid(from, now);
    const expired = isExpired(until, now);
    expect(window).toBe(!notYetValid && !expired);
  });
});

// ---------------------------------------------------------------------------
// utcNow
// ---------------------------------------------------------------------------

describe("utcNow", () => {
  it("returns valid ISO 8601 timestamp ending in Z", () => {
    const ts = utcNow();
    expect(ts.endsWith("Z")).toBe(true);
  });

  it("can be parsed by Date constructor", () => {
    const ts = utcNow();
    const d = new Date(ts);
    expect(d.getTime()).not.toBeNaN();
  });

  it("is a valid timestamp per isValidTimestamp", () => {
    const ts = utcNow();
    expect(isValidTimestamp(ts)).toBe(true);
  });

  it("is close to the current time", () => {
    const before = Date.now();
    const ts = utcNow();
    const after = Date.now();
    const tsMs = new Date(ts).getTime();
    expect(tsMs).toBeGreaterThanOrEqual(before);
    expect(tsMs).toBeLessThanOrEqual(after);
  });

  it("returns string type", () => {
    expect(typeof utcNow()).toBe("string");
  });
});

// ---------------------------------------------------------------------------
// utcFuture
// ---------------------------------------------------------------------------

describe("utcFuture", () => {
  it("returns timestamp in the future for positive days", () => {
    const ts = utcFuture(1);
    const tsMs = new Date(ts).getTime();
    expect(tsMs).toBeGreaterThan(Date.now());
  });

  it("returns a valid ISO 8601 timestamp", () => {
    const ts = utcFuture(30);
    expect(isValidTimestamp(ts)).toBe(true);
  });

  it("is approximately correct number of days ahead", () => {
    const before = Date.now();
    const ts = utcFuture(7);
    const tsMs = new Date(ts).getTime();
    const diffMs = tsMs - before;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    // Allow 1 second tolerance for test execution time
    expect(diffDays).toBeGreaterThan(6.99);
    expect(diffDays).toBeLessThan(7.01);
  });

  it("handles integer days correctly", () => {
    const before = Date.now();
    const ts = utcFuture(2);
    const tsMs = new Date(ts).getTime();
    const diffDays = (tsMs - before) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThan(1.99);
    expect(diffDays).toBeLessThan(2.01);
  });

  it("zero days returns approximately now", () => {
    const before = Date.now();
    const ts = utcFuture(0);
    const tsMs = new Date(ts).getTime();
    // Should be within 1 second of now
    expect(Math.abs(tsMs - before)).toBeLessThan(1000);
  });
});

// ---------------------------------------------------------------------------
// isValidTimestamp
// ---------------------------------------------------------------------------

describe("isValidTimestamp", () => {
  it("returns true for valid ISO 8601", () => {
    expect(isValidTimestamp("2024-01-15T12:30:00.000Z")).toBe(true);
  });

  it("returns true for utcNow output", () => {
    expect(isValidTimestamp(utcNow())).toBe(true);
  });

  it("returns false for invalid strings", () => {
    expect(isValidTimestamp("not-a-date")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidTimestamp("")).toBe(false);
  });

  it("returns false for date-only string", () => {
    // Date-only strings are accepted by Date constructor but don't match
    // the canonical form returned by toISOString()
    expect(isValidTimestamp("2024-01-15")).toBe(false);
  });

  it("returns false for non-Z timezone offset", () => {
    expect(isValidTimestamp("2024-01-15T12:30:00.000+00:00")).toBe(false);
  });

  it("returns false for missing milliseconds", () => {
    // toISOString always includes milliseconds
    expect(isValidTimestamp("2024-01-15T12:30:00Z")).toBe(false);
  });

  it("returns true for epoch timestamp in ISO format", () => {
    expect(isValidTimestamp("1970-01-01T00:00:00.000Z")).toBe(true);
  });
});
