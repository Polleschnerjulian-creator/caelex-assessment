/**
 * RRS (Regulatory Readiness Score) engine — pure-export tests.
 *
 * `rrs-engine.server.ts` is dominated by Prisma-backed data
 * fetchers (`computeRRS`, `computeAndSaveRRS`, `getRRSHistory`),
 * but it also exports two pure values that the rest of the platform
 * relies on:
 *
 *   - `RRS_SCORING_CONFIG` — the source of truth for component
 *     weights and per-factor budgets. The RCR engine, the methodology
 *     PDF generator, and the dashboard "Why this score?" panel all
 *     read from this object.
 *   - `getRRSMethodologyAppendix()` — the formatted text appendix
 *     embedded in compliance reports and PDFs.
 *
 * Pinning the structure of these exports is the highest-leverage
 * unit test we can add for this engine without spinning up an
 * integration suite. If the weights ever stop summing to 1.0 or the
 * appendix loses a section, the live RCR scoring drifts and customer
 * reports become inconsistent.
 */

import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get() {
        throw new Error("Prisma was not expected to be called in this test");
      },
    },
  ),
  isDatabaseConfigured: false,
}));

const { RRS_SCORING_CONFIG, getRRSMethodologyAppendix } =
  await import("@/lib/rrs-engine.server");

// ─── RRS_SCORING_CONFIG sanity ───────────────────────────────────────
describe("RRS engine — RRS_SCORING_CONFIG", () => {
  it("declares the six expected components", () => {
    const keys = Object.keys(RRS_SCORING_CONFIG.components).sort();
    expect(keys).toEqual(
      [
        "authorizationReadiness",
        "cybersecurityPosture",
        "governanceProcess",
        "jurisdictionalCoverage",
        "operationalCompliance",
        "regulatoryTrajectory",
      ].sort(),
    );
  });

  it("component weights sum to 1.0 (within rounding)", () => {
    const sum = Object.values(RRS_SCORING_CONFIG.components).reduce(
      (acc, c) => acc + c.weight,
      0,
    );
    // Use a tight tolerance since the weights are hand-set integers
    // expressed as decimals.
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.001);
  });

  it("every component carries a non-empty rationale", () => {
    for (const [key, component] of Object.entries(
      RRS_SCORING_CONFIG.components,
    )) {
      expect(component.weight).toBeGreaterThan(0);
      expect(component.weight).toBeLessThan(1);
      expect(
        component.rationale,
        `${key} should have a rationale`,
      ).toBeTruthy();
    }
  });

  it("authorizationReadiness factor budgets cap below the component max", () => {
    // The component weight (0.25) is multiplied against a normalised
    // 0-100 component score. The factor budgets sum to 100 (the cap).
    const auth = RRS_SCORING_CONFIG.components.authorizationReadiness;
    expect("factors" in auth).toBe(true);
    if ("factors" in auth) {
      const factorTotal = Object.values(auth.factors).reduce(
        (acc, f) => acc + f.maxPoints,
        0,
      );
      expect(factorTotal).toBeLessThanOrEqual(100);
      // Each factor must declare a non-empty rationale.
      for (const [name, f] of Object.entries(auth.factors)) {
        expect(f.maxPoints, `${name} should be > 0`).toBeGreaterThan(0);
        expect(f.rationale, `${name} should have a rationale`).toBeTruthy();
      }
    }
  });
});

// ─── Methodology appendix ────────────────────────────────────────────
describe("RRS engine — getRRSMethodologyAppendix", () => {
  it("returns a non-empty string", () => {
    const appendix = getRRSMethodologyAppendix();
    expect(typeof appendix).toBe("string");
    expect(appendix.length).toBeGreaterThan(100);
  });

  it("includes all six component names so the report renders correctly", () => {
    const appendix = getRRSMethodologyAppendix();
    expect(appendix).toContain("Authorization Readiness");
    expect(appendix).toContain("Cybersecurity Posture");
    expect(appendix).toContain("Operational Compliance");
    expect(appendix).toContain("Multi-Jurisdictional Coverage");
    expect(appendix).toContain("Regulatory Trajectory");
    expect(appendix).toContain("Governance & Process");
  });

  it("documents the six required sections", () => {
    const appendix = getRRSMethodologyAppendix();
    for (const section of [
      "OVERVIEW",
      "COMPONENTS AND WEIGHTS",
      "SCORING METHOD",
      "GRADING SCALE",
      "DETERMINISM",
      "COMPUTATION FREQUENCY",
    ]) {
      expect(appendix).toContain(section);
    }
  });

  it("uses the correct percentage formatting for component weights", () => {
    // The appendix lists each component with its weight as a
    // percentage (e.g. "25%"). We don't assert exact text but the
    // five distinct percentages must all appear at least once.
    const appendix = getRRSMethodologyAppendix();
    expect(appendix).toMatch(/25%/);
    expect(appendix).toMatch(/20%/);
    expect(appendix).toMatch(/15%/);
    expect(appendix).toMatch(/10%/);
  });

  it("includes the methodology version", () => {
    const appendix = getRRSMethodologyAppendix();
    expect(appendix).toMatch(/METHODOLOGY v/);
  });
});
