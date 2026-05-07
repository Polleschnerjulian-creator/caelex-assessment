/**
 * Tests for src/lib/comply-v2/onboarding-state.server.ts.
 *
 * The function gates the V2 sidebar's setup-progress badge AND the
 * Today empty-state's primary CTA, so its priority-order branching
 * is critical user-facing logic. Coverage:
 *
 *   1. No org → completedSteps=0, nextAction=set_up_organization,
 *      no downstream queries fired
 *   2. Org exists, no spacecraft → nextAction=add_spacecraft,
 *      step 1 of 4 done
 *   3. Org + spacecraft, no assessment → nextAction=run_assessment
 *   4. Assessment exists but no items yet → still
 *      nextAction=run_assessment (treats them as one step)
 *   5. Full chain → nextAction=all_done, completedSteps=4
 *   6. ALL 8 assessment-table checks fan out (regression for the
 *      Sprint C bug that only checked 3 tables)
 *   7. ALL 8 status-table checks fan out (same regression class)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockOrgMemberFindFirst,
  mockSpacecraftCount,
  mockDebrisAssessmentFirst,
  mockNIS2AssessmentFirst,
  mockCybersecurityAssessmentFirst,
  mockCRAAssessmentFirst,
  mockUkSpaceAssessmentFirst,
  mockUsRegulatoryAssessmentFirst,
  mockExportControlAssessmentFirst,
  mockSpectrumAssessmentFirst,
  mockDebrisStatusFirst,
  mockNIS2StatusFirst,
  mockCybersecurityStatusFirst,
  mockCRAStatusFirst,
  mockUkStatusFirst,
  mockUsStatusFirst,
  mockExportControlStatusFirst,
  mockSpectrumStatusFirst,
} = vi.hoisted(() => ({
  mockOrgMemberFindFirst: vi.fn(),
  mockSpacecraftCount: vi.fn(),
  mockDebrisAssessmentFirst: vi.fn(),
  mockNIS2AssessmentFirst: vi.fn(),
  mockCybersecurityAssessmentFirst: vi.fn(),
  mockCRAAssessmentFirst: vi.fn(),
  mockUkSpaceAssessmentFirst: vi.fn(),
  mockUsRegulatoryAssessmentFirst: vi.fn(),
  mockExportControlAssessmentFirst: vi.fn(),
  mockSpectrumAssessmentFirst: vi.fn(),
  mockDebrisStatusFirst: vi.fn(),
  mockNIS2StatusFirst: vi.fn(),
  mockCybersecurityStatusFirst: vi.fn(),
  mockCRAStatusFirst: vi.fn(),
  mockUkStatusFirst: vi.fn(),
  mockUsStatusFirst: vi.fn(),
  mockExportControlStatusFirst: vi.fn(),
  mockSpectrumStatusFirst: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: mockOrgMemberFindFirst },
    spacecraft: { count: mockSpacecraftCount },
    debrisAssessment: { findFirst: mockDebrisAssessmentFirst },
    nIS2Assessment: { findFirst: mockNIS2AssessmentFirst },
    cybersecurityAssessment: { findFirst: mockCybersecurityAssessmentFirst },
    cRAAssessment: { findFirst: mockCRAAssessmentFirst },
    ukSpaceAssessment: { findFirst: mockUkSpaceAssessmentFirst },
    usRegulatoryAssessment: { findFirst: mockUsRegulatoryAssessmentFirst },
    exportControlAssessment: { findFirst: mockExportControlAssessmentFirst },
    spectrumAssessment: { findFirst: mockSpectrumAssessmentFirst },
    debrisRequirementStatus: { findFirst: mockDebrisStatusFirst },
    nIS2RequirementStatus: { findFirst: mockNIS2StatusFirst },
    cybersecurityRequirementStatus: { findFirst: mockCybersecurityStatusFirst },
    cRARequirementStatus: { findFirst: mockCRAStatusFirst },
    ukRequirementStatus: { findFirst: mockUkStatusFirst },
    usRequirementStatus: { findFirst: mockUsStatusFirst },
    exportControlRequirementStatus: { findFirst: mockExportControlStatusFirst },
    spectrumRequirementStatus: { findFirst: mockSpectrumStatusFirst },
  },
}));

import { getOnboardingSetupState } from "./onboarding-state.server";

const USER_ID = "user_test_42";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: empty across the board (no org, no anything).
  mockOrgMemberFindFirst.mockResolvedValue(null);
  mockSpacecraftCount.mockResolvedValue(0);
  for (const m of [
    mockDebrisAssessmentFirst,
    mockNIS2AssessmentFirst,
    mockCybersecurityAssessmentFirst,
    mockCRAAssessmentFirst,
    mockUkSpaceAssessmentFirst,
    mockUsRegulatoryAssessmentFirst,
    mockExportControlAssessmentFirst,
    mockSpectrumAssessmentFirst,
    mockDebrisStatusFirst,
    mockNIS2StatusFirst,
    mockCybersecurityStatusFirst,
    mockCRAStatusFirst,
    mockUkStatusFirst,
    mockUsStatusFirst,
    mockExportControlStatusFirst,
    mockSpectrumStatusFirst,
  ]) {
    m.mockResolvedValue(null);
  }
});

describe("getOnboardingSetupState — priority-ordered nextAction", () => {
  it("no org → completedSteps=0, nextAction=set_up_organization", async () => {
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasOrganization).toBe(false);
    expect(r.hasSpacecraft).toBe(false);
    expect(r.hasAnyAssessment).toBe(false);
    expect(r.hasComplianceItems).toBe(false);
    expect(r.completedSteps).toBe(0);
    expect(r.totalSteps).toBe(4);
    expect(r.nextAction).toBe("set_up_organization");
  });

  it("no org → short-circuits before downstream queries", async () => {
    await getOnboardingSetupState(USER_ID);
    // Spacecraft + assessment + status checks must NOT fire when no org.
    expect(mockSpacecraftCount).not.toHaveBeenCalled();
    expect(mockDebrisAssessmentFirst).not.toHaveBeenCalled();
    expect(mockDebrisStatusFirst).not.toHaveBeenCalled();
  });

  it("org exists but no spacecraft → nextAction=add_spacecraft, completedSteps=1", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasOrganization).toBe(true);
    expect(r.hasSpacecraft).toBe(false);
    expect(r.completedSteps).toBe(1);
    expect(r.nextAction).toBe("add_spacecraft");
  });

  it("org + spacecraft but no assessment → nextAction=run_assessment, completedSteps=2", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    mockSpacecraftCount.mockResolvedValue(2);
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasSpacecraft).toBe(true);
    expect(r.spacecraftCount).toBe(2);
    expect(r.hasAnyAssessment).toBe(false);
    expect(r.completedSteps).toBe(2);
    expect(r.nextAction).toBe("run_assessment");
  });

  it("assessment exists but no items → still run_assessment, completedSteps=3", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    mockSpacecraftCount.mockResolvedValue(2);
    mockDebrisAssessmentFirst.mockResolvedValue({ id: "ass_1" });
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasAnyAssessment).toBe(true);
    expect(r.hasComplianceItems).toBe(false);
    expect(r.completedSteps).toBe(3);
    expect(r.nextAction).toBe("run_assessment");
  });

  it("full chain → all_done, completedSteps=4", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    mockSpacecraftCount.mockResolvedValue(2);
    mockDebrisAssessmentFirst.mockResolvedValue({ id: "ass_1" });
    mockDebrisStatusFirst.mockResolvedValue({ id: "stat_1" });
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasComplianceItems).toBe(true);
    expect(r.completedSteps).toBe(4);
    expect(r.nextAction).toBe("all_done");
  });
});

describe("getOnboardingSetupState — Sprint E regression coverage", () => {
  // Sprint E fixed audit issue #9: previously checked only 3 of 8
  // assessment tables and 2 of 8 status tables. Users with only a
  // UK_SPACE / SPECTRUM / EXPORT_CONTROL / CRA / US_REGULATORY
  // assessment got "run assessment" prompted forever.

  it("UK_SPACE_ACT-only assessment counts as hasAnyAssessment=true", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    mockSpacecraftCount.mockResolvedValue(1);
    mockUkSpaceAssessmentFirst.mockResolvedValue({ id: "ass_uk" });
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasAnyAssessment).toBe(true);
  });

  it("SPECTRUM-only assessment counts as hasAnyAssessment=true", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    mockSpacecraftCount.mockResolvedValue(1);
    mockSpectrumAssessmentFirst.mockResolvedValue({ id: "ass_sp" });
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasAnyAssessment).toBe(true);
  });

  it("CRA-only items count as hasComplianceItems=true", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    mockSpacecraftCount.mockResolvedValue(1);
    mockCRAAssessmentFirst.mockResolvedValue({ id: "ass_cra" });
    mockCRAStatusFirst.mockResolvedValue({ id: "stat_cra" });
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasComplianceItems).toBe(true);
    expect(r.nextAction).toBe("all_done");
  });

  it("EXPORT_CONTROL-only items count as hasComplianceItems=true", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    mockSpacecraftCount.mockResolvedValue(1);
    mockExportControlAssessmentFirst.mockResolvedValue({ id: "ass_ec" });
    mockExportControlStatusFirst.mockResolvedValue({ id: "stat_ec" });
    const r = await getOnboardingSetupState(USER_ID);
    expect(r.hasComplianceItems).toBe(true);
  });

  it("fans out to ALL 8 assessment tables (regression)", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    await getOnboardingSetupState(USER_ID);
    // All 8 assessment tables must have been checked.
    expect(mockDebrisAssessmentFirst).toHaveBeenCalledOnce();
    expect(mockNIS2AssessmentFirst).toHaveBeenCalledOnce();
    expect(mockCybersecurityAssessmentFirst).toHaveBeenCalledOnce();
    expect(mockCRAAssessmentFirst).toHaveBeenCalledOnce();
    expect(mockUkSpaceAssessmentFirst).toHaveBeenCalledOnce();
    expect(mockUsRegulatoryAssessmentFirst).toHaveBeenCalledOnce();
    expect(mockExportControlAssessmentFirst).toHaveBeenCalledOnce();
    expect(mockSpectrumAssessmentFirst).toHaveBeenCalledOnce();
  });

  it("fans out to ALL 8 status tables (regression)", async () => {
    mockOrgMemberFindFirst.mockResolvedValue({ organizationId: "org_1" });
    await getOnboardingSetupState(USER_ID);
    expect(mockDebrisStatusFirst).toHaveBeenCalledOnce();
    expect(mockNIS2StatusFirst).toHaveBeenCalledOnce();
    expect(mockCybersecurityStatusFirst).toHaveBeenCalledOnce();
    expect(mockCRAStatusFirst).toHaveBeenCalledOnce();
    expect(mockUkStatusFirst).toHaveBeenCalledOnce();
    expect(mockUsStatusFirst).toHaveBeenCalledOnce();
    expect(mockExportControlStatusFirst).toHaveBeenCalledOnce();
    expect(mockSpectrumStatusFirst).toHaveBeenCalledOnce();
  });
});
