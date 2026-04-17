import { describe, it, expect } from "vitest";
import {
  LandingRightsProfileSchema,
  CategoryDeepDiveSchema,
  CaseStudySchema,
  OperatorMatrixRowSchema,
  ConductConditionSchema,
} from "./types";

describe("Landing Rights schemas", () => {
  it("accepts a minimal valid profile", () => {
    const profile = {
      jurisdiction: "DE",
      depth: "stub",
      last_verified: "2026-04-17",
      overview: { summary: "x", regime_type: "telecoms_only" },
      regulators: [],
      legal_basis: [],
      fees: {},
      timeline: { typical_duration_months: { min: 3, max: 6 } },
      foreign_ownership: {},
      renewal: {},
      security_review: { required: false },
      operator_snapshots: {},
    };
    expect(() => LandingRightsProfileSchema.parse(profile)).not.toThrow();
  });

  it("rejects a profile with invalid jurisdiction", () => {
    const bad = { jurisdiction: "XX" };
    expect(() => LandingRightsProfileSchema.parse(bad)).toThrow();
  });

  it("accepts a minimal valid case study", () => {
    const cs = {
      id: "test-case",
      title: "Test",
      jurisdiction: "DE",
      operator: "Starlink",
      categories: ["market_access"],
      date_range: { from: "2020-01-01" },
      narrative: "...",
      takeaways: [],
      outcome: "licensed",
      last_verified: "2026-04-17",
    };
    expect(() => CaseStudySchema.parse(cs)).not.toThrow();
  });

  it("accepts a minimal valid conduct condition", () => {
    const cc = {
      id: "test-cond",
      jurisdiction: "IN",
      type: "lawful_intercept",
      title: "Test",
      requirement: "...",
      applies_to: "all_operators",
      last_verified: "2026-04-17",
    };
    expect(() => ConductConditionSchema.parse(cc)).not.toThrow();
  });
});
