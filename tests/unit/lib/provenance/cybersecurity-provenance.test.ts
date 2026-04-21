/**
 * describeApplicabilityReason + describeModuleScope — pure-function tests.
 *
 * These helpers turn the deterministic requirement-filter logic into
 * human-readable reasons. No DB, no mocks — just input/output.
 */

import { describe, it, expect } from "vitest";
import {
  describeApplicabilityReason,
  describeModuleScope,
} from "@/lib/provenance/cybersecurity-provenance";
import type {
  CybersecurityProfile,
  CybersecurityRequirement,
} from "@/data/cybersecurity-requirements";

// ─── Fixtures ──────────────────────────────────────────────────────────

function baseProfile(
  overrides: Partial<CybersecurityProfile> = {},
): CybersecurityProfile {
  return {
    organizationSize: "medium",
    spaceSegmentComplexity: "moderate",
    dataSensitivityLevel: "confidential",
    hasGroundSegment: true,
    processesPersonalData: false,
    handlesGovData: false,
    existingCertifications: [],
    hasSecurityTeam: true,
    hasIncidentResponsePlan: true,
    hasBCP: false,
    supplierSecurityAssessed: false,
    ...overrides,
  };
}

function baseRequirement(
  overrides: Partial<CybersecurityRequirement> = {},
): CybersecurityRequirement {
  return {
    id: "r_1",
    articleRef: "NIS2 Art. 21(2)(a)",
    category: "governance",
    title: "Cybersecurity Policy",
    description: "…",
    complianceQuestion: "Do you have a cybersecurity policy?",
    applicableTo: {},
    tips: [],
    evidenceRequired: [],
    severity: "major",
    status: "not_assessed",
    ...overrides,
  } as CybersecurityRequirement;
}

// ─── describeApplicabilityReason ───────────────────────────────────────

describe("describeApplicabilityReason", () => {
  it("returns null when the profile's organizationSize doesn't match", () => {
    const req = baseRequirement({
      applicableTo: { organizationSizes: ["large"] },
    });
    const reason = describeApplicabilityReason(
      req,
      baseProfile({ organizationSize: "small" }),
      false,
    );
    expect(reason).toBeNull();
  });

  it("returns null when spaceSegmentComplexity doesn't match", () => {
    const req = baseRequirement({
      applicableTo: { spaceSegmentComplexities: ["complex"] },
    });
    const reason = describeApplicabilityReason(
      req,
      baseProfile({ spaceSegmentComplexity: "simple" }),
      false,
    );
    expect(reason).toBeNull();
  });

  it("returns null when data sensitivity doesn't match", () => {
    const req = baseRequirement({
      applicableTo: { dataSensitivities: ["classified"] },
    });
    const reason = describeApplicabilityReason(
      req,
      baseProfile({ dataSensitivityLevel: "public" }),
      false,
    );
    expect(reason).toBeNull();
  });

  it("returns null when simplified regime excludes the requirement", () => {
    const req = baseRequirement({
      applicableTo: { simplifiedRegimeExcluded: true },
    });
    const reason = describeApplicabilityReason(req, baseProfile(), true);
    expect(reason).toBeNull();
  });

  it("returns deterministic origin for every applicable requirement", () => {
    const req = baseRequirement();
    const reason = describeApplicabilityReason(req, baseProfile(), false);
    expect(reason?.origin).toBe("deterministic");
  });

  it("summary includes the article ref when present", () => {
    const req = baseRequirement({
      articleRef: "NIS2 Art. 21(2)(d)",
      applicableTo: { organizationSizes: ["medium", "large"] },
    });
    const reason = describeApplicabilityReason(req, baseProfile(), false);
    expect(reason?.summary).toContain("NIS2 Art. 21(2)(d)");
  });

  it("summary lists the matched profile dimensions", () => {
    const req = baseRequirement({
      applicableTo: {
        organizationSizes: ["medium", "large"],
        spaceSegmentComplexities: ["moderate", "complex"],
      },
    });
    const reason = describeApplicabilityReason(req, baseProfile(), false);
    expect(reason?.summary).toContain("medium");
    expect(reason?.summary).toContain("moderate");
  });

  it("matched array records each applicable dimension", () => {
    const req = baseRequirement({
      applicableTo: {
        organizationSizes: ["medium"],
        spaceSegmentComplexities: ["moderate"],
        dataSensitivities: ["confidential"],
      },
    });
    const reason = describeApplicabilityReason(req, baseProfile(), false);
    expect(reason?.matched.map((m) => m.dimension).sort()).toEqual([
      "dataSensitivity",
      "organizationSize",
      "spaceSegmentComplexity",
    ]);
  });

  it("falls back to 'applies to all operators' when no gate is set", () => {
    const req = baseRequirement({ applicableTo: {} });
    const reason = describeApplicabilityReason(req, baseProfile(), false);
    expect(reason?.summary).toMatch(/all operators/i);
  });

  it("adds regime dimension when standard-only requirement", () => {
    const req = baseRequirement({
      applicableTo: { simplifiedRegimeExcluded: true },
    });
    const reason = describeApplicabilityReason(req, baseProfile(), false);
    expect(reason?.matched.some((m) => m.dimension === "regime")).toBe(true);
  });
});

// ─── describeModuleScope ───────────────────────────────────────────────

describe("describeModuleScope", () => {
  it("headline states applicable vs total count", () => {
    const scope = describeModuleScope({
      profile: baseProfile(),
      isSimplified: false,
      applicableCount: 28,
      totalCount: 43,
    });
    expect(scope.headline).toContain("28");
    expect(scope.headline).toContain("43");
  });

  it("lists all four scope dimensions as bullets", () => {
    const scope = describeModuleScope({
      profile: baseProfile(),
      isSimplified: false,
      applicableCount: 10,
      totalCount: 10,
    });
    expect(scope.bullets.length).toBe(4);
    expect(scope.bullets.some((b) => b.includes("Regime"))).toBe(true);
    expect(
      scope.bullets.some((b) => b.toLowerCase().includes("organization size")),
    ).toBe(true);
    expect(
      scope.bullets.some((b) => b.toLowerCase().includes("space segment")),
    ).toBe(true);
    expect(
      scope.bullets.some((b) => b.toLowerCase().includes("data sensitivity")),
    ).toBe(true);
  });

  it("flags simplified regime when isSimplified is true", () => {
    const scope = describeModuleScope({
      profile: baseProfile(),
      isSimplified: true,
      applicableCount: 10,
      totalCount: 40,
    });
    expect(scope.bullets[0].toLowerCase()).toContain("simplified");
  });

  it("labels regime as 'standard' when not simplified", () => {
    const scope = describeModuleScope({
      profile: baseProfile(),
      isSimplified: false,
      applicableCount: 10,
      totalCount: 10,
    });
    expect(scope.bullets[0].toLowerCase()).toContain("standard");
  });
});
