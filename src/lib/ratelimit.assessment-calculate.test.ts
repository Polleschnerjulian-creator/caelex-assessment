/**
 * Regression pin for the quick-check funnel 429 (2026-06-10, live report):
 * one wizard run makes ~6 interim forming-counter calls + 1 final submit,
 * so the 10/hr "assessment" tier rejected a SINGLE legitimate run-through
 * at "See my results". The quick calculate endpoint now uses the dedicated
 * "assessment_calculate" tier (60/hr Redis, 30/hr in-memory fallback).
 */
import { describe, it, expect } from "vitest";
import { checkRateLimit } from "./ratelimit";

describe("assessment_calculate rate-limit tier", () => {
  it("allows more than 10 calls per hour from one identifier (one run ≈ 7 calls + retries)", async () => {
    // No Upstash env in tests → the in-memory fallback (30/hr) is exercised.
    // 12 consecutive calls prove the old 10/hr budget no longer applies.
    for (let i = 0; i < 12; i++) {
      const result = await checkRateLimit(
        "assessment_calculate",
        "vitest-quick-funnel",
      );
      expect(result.success, `call ${i + 1} must pass`).toBe(true);
    }
  });

  it("still enforces a ceiling (the tier is bounded, not unlimited)", async () => {
    let firstRejected: number | null = null;
    for (let i = 0; i < 40; i++) {
      const result = await checkRateLimit(
        "assessment_calculate",
        "vitest-quick-funnel-ceiling",
      );
      if (!result.success) {
        firstRejected = i + 1;
        break;
      }
    }
    // In-memory fallback caps at 30/hr — the 31st call must be rejected.
    expect(firstRejected).toBe(31);
  });
});
