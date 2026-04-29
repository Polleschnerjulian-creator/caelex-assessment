/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Differential-Privacy Layer Tests.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import {
  COUNT_SENSITIVITY,
  DEFAULT_EPSILON,
  _resetBudgetForTests,
  chargeBudget,
  dpCount,
  getBudgetStatus,
  laplaceNoise,
  noisifyAggregate,
} from "@/lib/pharos/differential-privacy";

beforeEach(() => {
  _resetBudgetForTests();
});

describe("laplaceNoise", () => {
  it("returns numbers (not NaN, not Infinity)", () => {
    for (let i = 0; i < 100; i++) {
      const n = laplaceNoise(1.0);
      expect(Number.isFinite(n)).toBe(true);
    }
  });

  it("has roughly zero mean over many samples", () => {
    let sum = 0;
    const N = 5000;
    for (let i = 0; i < N; i++) sum += laplaceNoise(1.0);
    // Standard error of mean ~ sqrt(2)/sqrt(N) for Laplace(0, 1).
    expect(Math.abs(sum / N)).toBeLessThan(0.1);
  });

  it("scales correctly — larger scale → larger spread", () => {
    let sumAbsLow = 0,
      sumAbsHigh = 0;
    for (let i = 0; i < 1000; i++) {
      sumAbsLow += Math.abs(laplaceNoise(1.0));
      sumAbsHigh += Math.abs(laplaceNoise(10.0));
    }
    expect(sumAbsHigh / sumAbsLow).toBeGreaterThan(5);
  });
});

describe("dpCount", () => {
  it("returns non-negative integer", () => {
    for (let i = 0; i < 100; i++) {
      const r = dpCount({ realCount: 0 });
      expect(r.releasedCount).toBeGreaterThanOrEqual(0);
      expect(Number.isInteger(r.releasedCount)).toBe(true);
    }
  });

  it("noisy count is close to real count for moderate ε", () => {
    let totalDiff = 0;
    const N = 1000;
    const real = 100;
    for (let i = 0; i < N; i++) {
      const r = dpCount({ realCount: real, epsilon: 1.0 });
      totalDiff += r.releasedCount - real;
    }
    // Average bias should be near zero (we floor at 0 which biases up
    // slightly, but real=100 makes that effect negligible).
    expect(Math.abs(totalDiff / N)).toBeLessThan(2);
  });

  it("smaller ε produces wider confidence bounds", () => {
    const a = dpCount({ realCount: 100, epsilon: 0.1 });
    const b = dpCount({ realCount: 100, epsilon: 5.0 });
    const widthA = a.upperBound95 - a.lowerBound95;
    const widthB = b.upperBound95 - b.lowerBound95;
    expect(widthA).toBeGreaterThan(widthB);
  });

  it("rejects ε <= 0", () => {
    expect(() => dpCount({ realCount: 10, epsilon: 0 })).toThrow();
    expect(() => dpCount({ realCount: 10, epsilon: -1 })).toThrow();
  });
});

describe("budget accounting", () => {
  it("first charge starts the budget", () => {
    const r = chargeBudget("auth-1", 1.0);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(9);
  });

  it("subsequent charges accumulate", () => {
    chargeBudget("auth-2", 2.0);
    const r = chargeBudget("auth-2", 3.0);
    expect(r.ok).toBe(true);
    expect(r.remaining).toBe(5);
  });

  it("rejects when budget exceeded", () => {
    chargeBudget("auth-3", 9.0);
    const r = chargeBudget("auth-3", 2.0);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/budget exceeded/i);
  });

  it("budget tracking is per-authority isolated", () => {
    chargeBudget("auth-A", 9.5);
    const r = chargeBudget("auth-B", 5.0);
    expect(r.ok).toBe(true);
  });

  it("getBudgetStatus reflects spends", () => {
    chargeBudget("auth-status", 3.0);
    const s = getBudgetStatus("auth-status");
    expect(s.spent).toBe(3.0);
    expect(s.remaining).toBe(7.0);
  });
});

describe("noisifyAggregate", () => {
  it("returns an ok aggregate when budget is available", () => {
    const r = noisifyAggregate({
      authorityProfileId: "auth-aggregate-1",
      metric: "operators-with-open-incidents",
      realCount: 42,
    });
    expect(r.ok).toBe(true);
    expect(r.releasedCount).toBeGreaterThanOrEqual(0);
    expect(r.epsilon).toBe(DEFAULT_EPSILON);
  });

  it("returns abstention when budget exhausted", () => {
    const auth = "auth-budget-exhausted";
    chargeBudget(auth, 9.5);
    const r = noisifyAggregate({
      authorityProfileId: auth,
      metric: "operators-in-alert-tier",
      realCount: 5,
      epsilon: 1.0,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/budget/i);
  });

  it("uses default sensitivity = 1 for counts", () => {
    expect(COUNT_SENSITIVITY).toBe(1);
  });
});
