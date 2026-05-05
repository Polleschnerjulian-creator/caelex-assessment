import { describe, it, expect } from "vitest";
import { computeComplianceScore, type AttestationInput } from "./calculator";

// ─── Helpers ────────────────────────────────────────────────────────────────

function future(daysAhead = 90): Date {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  return d;
}

function past(daysAgo = 1): Date {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("computeComplianceScore", () => {
  it("returns zeroed score for empty input", () => {
    const score = computeComplianceScore([]);
    expect(score.overall).toBe(0);
    expect(score.attestationCount).toBe(0);
    expect(score.passingCount).toBe(0);
    expect(score.failingCount).toBe(0);
    expect(score.expiredCount).toBe(0);
    expect(score.coveragePercent).toBe(0);
    expect(score.breakdown.debris).toBe(0);
    expect(score.breakdown.cybersecurity).toBe(0);
  });

  it("returns 100 overall when all attestations pass with HIGH trust", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
      {
        regulationRef: "nis2_incident",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.overall).toBe(100);
    expect(score.breakdown.debris).toBe(100);
    expect(score.breakdown.cybersecurity).toBe(100);
    expect(score.passingCount).toBe(2);
    expect(score.failingCount).toBe(0);
  });

  it("penalises failed attestations (result=false → 0)", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: false,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.breakdown.debris).toBe(0);
    expect(score.overall).toBe(0);
    expect(score.failingCount).toBe(1);
  });

  it("applies trust level weight to the score", () => {
    // LOW trust, passing → 0.4 * 100 = 40
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: true,
        trustLevel: "LOW",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.breakdown.debris).toBe(40);
    expect(score.overall).toBe(40);
  });

  it("applies MEDIUM trust level weight (0.7 * 100 = 70)", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "nis2_cyber",
        result: true,
        trustLevel: "MEDIUM",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.breakdown.cybersecurity).toBe(70);
    expect(score.overall).toBe(70);
  });

  it("excludes expired attestations from the score", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: true,
        trustLevel: "HIGH",
        expiresAt: past(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.overall).toBe(0);
    expect(score.expiredCount).toBe(1);
    expect(score.passingCount).toBe(0);
  });

  it("mixes active and expired correctly", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
      {
        regulationRef: "eu_art68_deorbit",
        result: true,
        trustLevel: "HIGH",
        expiresAt: past(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.attestationCount).toBe(2);
    expect(score.expiredCount).toBe(1);
    expect(score.passingCount).toBe(1);
    expect(score.breakdown.debris).toBe(100);
  });

  it("maps nis2_ prefix to cybersecurity category", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "nis2_logging",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.breakdown.cybersecurity).toBe(100);
    expect(score.breakdown.debris).toBe(0);
  });

  it("maps iadc_ prefix to debris category", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "iadc_guidelines",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.breakdown.debris).toBe(100);
  });

  it("maps unknown prefix to authorization category", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art60_auth",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.breakdown.authorization).toBe(100);
  });

  it("averages multiple attestations within a category", () => {
    // Two debris: one passing HIGH, one failing HIGH → (100 + 0) / 2 = 50
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
      {
        regulationRef: "eu_art70_debris_2",
        result: false,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.breakdown.debris).toBe(50);
  });

  it("computes coverage as unique refs / 9", () => {
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
      {
        regulationRef: "nis2_incident",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
      {
        regulationRef: "eu_art68_deorbit",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    // 3 unique refs / 9 * 100 = 33%
    expect(score.coveragePercent).toBe(33);
  });

  it("sets computedAt to a recent ISO timestamp", () => {
    const score = computeComplianceScore([]);
    const computedAt = new Date(score.computedAt);
    const now = new Date();
    expect(computedAt.getTime()).toBeLessThanOrEqual(now.getTime() + 1000);
    expect(computedAt.getTime()).toBeGreaterThan(now.getTime() - 5000);
  });

  // T2-9 (audit fix 2026-05-05): drift-detection regression for L-4.
  // calculator.ts hardcodes `KNOWN_REGULATION_COUNT = 9` while
  // REGULATION_THRESHOLDS lives in evaluation/regulation-thresholds.ts.
  // If a new threshold is added without updating the constant, the
  // coveragePercent silently overshoots (or undershoots). T5-6 will
  // replace the literal with `REGULATION_THRESHOLDS.length`. Until
  // then, this test fails loudly when they diverge.
  it("[L-4 DRIFT GUARD] KNOWN_REGULATION_COUNT must equal REGULATION_THRESHOLDS.length", async () => {
    // Read the constant via parsing the source — we deliberately do
    // NOT export it from calculator.ts since coupling that constant
    // to scope is the bug. The test file does the cross-check.
    const fs = await import("node:fs");
    const path = await import("node:path");
    const calculatorSrc = fs.readFileSync(
      path.resolve(__dirname, "calculator.ts"),
      "utf8",
    );
    const m = calculatorSrc.match(/KNOWN_REGULATION_COUNT\s*=\s*(\d+)/);
    expect(m).not.toBeNull();
    const knownCount = Number.parseInt(m![1]!, 10);

    const { REGULATION_THRESHOLDS } =
      await import("../evaluation/regulation-thresholds");
    expect(knownCount).toBe(REGULATION_THRESHOLDS.length);
  });

  it("hardcodes 'stable' as trend (placeholder, not actual computation)", () => {
    // Documents the IST-Zustand: trend is always 'stable' regardless
    // of the input. T5-6 follow-up may replace this with an actual
    // historical-comparison computation. Until then, the
    // hardcoded value is deliberate (not a bug, but worth a test
    // so a future change is visible).
    const attestations: AttestationInput[] = [
      {
        regulationRef: "eu_art70_debris",
        result: true,
        trustLevel: "HIGH",
        expiresAt: future(),
      },
    ];
    const score = computeComplianceScore(attestations);
    expect(score.trend).toBe("stable");
  });
});
