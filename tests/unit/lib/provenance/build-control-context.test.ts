/**
 * buildControlContext tests — template-driven three-beat context text.
 */

import { describe, it, expect } from "vitest";
import {
  buildControlContext,
  describeApplicabilityReason,
} from "@/lib/provenance/cybersecurity-provenance";
import type {
  CybersecurityRequirement,
  CybersecurityProfile,
} from "@/data/cybersecurity-requirements";

function baseRequirement(
  overrides: Partial<CybersecurityRequirement> = {},
): CybersecurityRequirement {
  return {
    id: "r_1",
    articleRef: "Art. 74",
    category: "governance",
    title: "Information Security Policy",
    description:
      "Operator must maintain a documented information security policy",
    complianceQuestion: "Do you have one?",
    applicableTo: {},
    tips: [],
    evidenceRequired: [],
    severity: "critical",
    status: "not_assessed",
    ...overrides,
  } as CybersecurityRequirement;
}

const baseProfile: CybersecurityProfile = {
  organizationSize: "medium",
  spaceSegmentComplexity: "small_constellation",
  dataSensitivityLevel: "confidential",
  hasGroundSegment: true,
  processesPersonalData: false,
  handlesGovData: false,
  existingCertifications: [],
  hasSecurityTeam: true,
  hasIncidentResponsePlan: true,
  hasBCP: false,
  supplierSecurityAssessed: false,
};

describe("buildControlContext", () => {
  it("returns three non-empty beats for a standard control", () => {
    const req = baseRequirement();
    const reason = describeApplicabilityReason(req, baseProfile, false);
    const ctx = buildControlContext({ req, reason });

    expect(ctx.wieso.length).toBeGreaterThan(10);
    expect(ctx.weshalb.length).toBeGreaterThan(10);
    expect(ctx.warum.length).toBeGreaterThan(10);
  });

  it("wieso cites the article reference", () => {
    const req = baseRequirement({ articleRef: "Art. 81" });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.wieso).toContain("Art. 81");
  });

  it("wieso mentions NIS2 when nis2Reference is present", () => {
    const req = baseRequirement({ nis2Reference: "Art. 21(2)(a)" });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.wieso).toMatch(/NIS2/);
    expect(ctx.wieso).toContain("Art. 21(2)(a)");
  });

  it("weshalb picks category-specific threat for governance", () => {
    const req = baseRequirement({ category: "governance" });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.weshalb.toLowerCase()).toContain("accountability");
  });

  it("weshalb picks category-specific threat for cryptography", () => {
    const req = baseRequirement({ category: "cryptography" });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.weshalb.toLowerCase()).toMatch(/interception|encrypt/);
  });

  it("warum names the matched profile dimensions", () => {
    const req = baseRequirement({
      applicableTo: {
        organizationSizes: ["medium", "large"],
        spaceSegmentComplexities: ["small_constellation"],
      },
    });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.warum.toLowerCase()).toContain("medium");
    expect(ctx.warum.toLowerCase()).toContain("small");
  });

  it("warum falls back to 'every operator' when no gate", () => {
    const req = baseRequirement({ applicableTo: {} });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.warum.toLowerCase()).toContain("every operator");
  });

  it("warum handles null reason gracefully", () => {
    const req = baseRequirement();
    const ctx = buildControlContext({ req, reason: null });
    expect(ctx.warum).toBeTruthy();
    expect(typeof ctx.warum).toBe("string");
  });

  it("wieso appends description sentence", () => {
    const req = baseRequirement({
      description: "Operator must define security responsibilities",
    });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.wieso).toContain("Operator must define");
  });

  it("ensures wieso ends with punctuation", () => {
    const req = baseRequirement({
      description: "no trailing punctuation here",
    });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(/[.!?]$/.test(ctx.wieso)).toBe(true);
  });

  it("handles requirement with empty description", () => {
    const req = baseRequirement({ description: "" });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    expect(ctx.wieso.length).toBeGreaterThan(0);
    // No crash + still ends with "."
    expect(/[.!?]$/.test(ctx.wieso)).toBe(true);
  });

  it("joins three matched dimensions naturally with commas and 'and'", () => {
    const req = baseRequirement({
      applicableTo: {
        organizationSizes: ["medium"],
        spaceSegmentComplexities: ["small_constellation"],
        dataSensitivities: ["confidential"],
      },
    });
    const ctx = buildControlContext({
      req,
      reason: describeApplicabilityReason(req, baseProfile, false),
    });
    // Oxford-style: "A, B, and C"
    expect(ctx.warum).toMatch(/, and /);
  });
});
