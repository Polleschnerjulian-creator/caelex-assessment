/**
 * Sprint 10F2 — posture.server.ts integration tests.
 *
 * The aggregate-driven posture path (Sprint E) replaced the
 * full-row-fetch implementation. This test mocks the inner aggregate
 * helper + the workflow KPI prisma calls and verifies the projection
 * produces the right top-level numbers AND the right per-regulation
 * roll-up.
 *
 * Coverage:
 *   1. Status counts pass through unchanged from aggregate
 *   2. countableItems excludes NOT_APPLICABLE
 *   3. overallScore = round(attested / countable * 100), 0 when 0
 *   4. regulationBreakdown filters out regulations with total=0
 *   5. workflow.openTriage sums all 3 sources (Sprint G fix)
 *   6. workflow.attestedThisWeek piped through from aggregate
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetAggregate,
  mockOrgMemberFindMany,
  mockAstraProposalCount,
  mockSnoozeCount,
  mockNotificationCount,
  mockSatelliteAlertCount,
  mockRegulatoryUpdateCount,
  mockRegulatoryUpdateReadCount,
} = vi.hoisted(() => ({
  mockGetAggregate: vi.fn(),
  mockOrgMemberFindMany: vi.fn(),
  mockAstraProposalCount: vi.fn(),
  mockSnoozeCount: vi.fn(),
  mockNotificationCount: vi.fn(),
  mockSatelliteAlertCount: vi.fn(),
  mockRegulatoryUpdateCount: vi.fn(),
  mockRegulatoryUpdateReadCount: vi.fn(),
}));

vi.mock("./compliance-item.server", () => ({
  getComplianceStatusAggregateForUser: mockGetAggregate,
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organizationMember: { findMany: mockOrgMemberFindMany },
    astraProposal: { count: mockAstraProposalCount },
    complianceItemSnooze: { count: mockSnoozeCount },
    notification: { count: mockNotificationCount },
    satelliteAlert: { count: mockSatelliteAlertCount },
    regulatoryUpdate: { count: mockRegulatoryUpdateCount },
    regulatoryUpdateRead: { count: mockRegulatoryUpdateReadCount },
  },
}));

import { getPostureForUser } from "./posture.server";

const USER_ID = "user_test_42";

const ZERO_REG = {
  PENDING: 0,
  DRAFT: 0,
  EVIDENCE_REQUIRED: 0,
  UNDER_REVIEW: 0,
  ATTESTED: 0,
  EXPIRED: 0,
  NOT_APPLICABLE: 0,
};

beforeEach(() => {
  vi.clearAllMocks();
  // Sane defaults for KPI counts.
  mockOrgMemberFindMany.mockResolvedValue([]);
  mockAstraProposalCount.mockResolvedValue(0);
  mockSnoozeCount.mockResolvedValue(0);
  mockNotificationCount.mockResolvedValue(0);
  mockSatelliteAlertCount.mockResolvedValue(0);
  mockRegulatoryUpdateCount.mockResolvedValue(0);
  mockRegulatoryUpdateReadCount.mockResolvedValue(0);
});

describe("getPostureForUser — overall score", () => {
  it("score = round(attested / countable * 100)", async () => {
    mockGetAggregate.mockResolvedValue({
      totalItems: 10,
      attestedThisWeek: 0,
      totalByStatus: {
        ...ZERO_REG,
        PENDING: 2,
        EVIDENCE_REQUIRED: 1,
        ATTESTED: 7,
      },
      perRegulation: {
        DEBRIS: { ...ZERO_REG, ATTESTED: 7, PENDING: 2, EVIDENCE_REQUIRED: 1 },
        CYBERSECURITY: ZERO_REG,
        NIS2: ZERO_REG,
        CRA: ZERO_REG,
        UK_SPACE_ACT: ZERO_REG,
        US_REGULATORY: ZERO_REG,
        EXPORT_CONTROL: ZERO_REG,
        SPECTRUM: ZERO_REG,
      },
    });
    const r = await getPostureForUser(USER_ID);
    expect(r.totalItems).toBe(10);
    expect(r.countableItems).toBe(10); // no NOT_APPLICABLE
    expect(r.attestedItems).toBe(7);
    expect(r.overallScore).toBe(70);
  });

  it("score = 0 when no countable items", async () => {
    mockGetAggregate.mockResolvedValue({
      totalItems: 5,
      attestedThisWeek: 0,
      totalByStatus: { ...ZERO_REG, NOT_APPLICABLE: 5 },
      perRegulation: {
        DEBRIS: { ...ZERO_REG, NOT_APPLICABLE: 5 },
        CYBERSECURITY: ZERO_REG,
        NIS2: ZERO_REG,
        CRA: ZERO_REG,
        UK_SPACE_ACT: ZERO_REG,
        US_REGULATORY: ZERO_REG,
        EXPORT_CONTROL: ZERO_REG,
        SPECTRUM: ZERO_REG,
      },
    });
    const r = await getPostureForUser(USER_ID);
    expect(r.totalItems).toBe(5);
    expect(r.countableItems).toBe(0); // all are NOT_APPLICABLE
    expect(r.overallScore).toBe(0);
  });
});

describe("getPostureForUser — regulationBreakdown", () => {
  it("filters out regulations with total=0", async () => {
    mockGetAggregate.mockResolvedValue({
      totalItems: 5,
      attestedThisWeek: 0,
      totalByStatus: { ...ZERO_REG, ATTESTED: 5 },
      perRegulation: {
        DEBRIS: { ...ZERO_REG, ATTESTED: 5 },
        CYBERSECURITY: ZERO_REG, // total=0 → should be filtered out
        NIS2: ZERO_REG,
        CRA: ZERO_REG,
        UK_SPACE_ACT: ZERO_REG,
        US_REGULATORY: ZERO_REG,
        EXPORT_CONTROL: ZERO_REG,
        SPECTRUM: ZERO_REG,
      },
    });
    const r = await getPostureForUser(USER_ID);
    expect(r.regulationBreakdown).toHaveLength(1);
    expect(r.regulationBreakdown[0].regulation).toBe("DEBRIS");
    expect(r.regulationBreakdown[0].score).toBe(100);
  });

  it("sorts breakdown by score desc, then total desc", async () => {
    mockGetAggregate.mockResolvedValue({
      totalItems: 30,
      attestedThisWeek: 0,
      totalByStatus: {
        ...ZERO_REG,
        PENDING: 8,
        ATTESTED: 22,
      },
      perRegulation: {
        DEBRIS: { ...ZERO_REG, PENDING: 5, ATTESTED: 5 }, // 50% / 10
        CYBERSECURITY: { ...ZERO_REG, ATTESTED: 10 }, // 100% / 10
        NIS2: { ...ZERO_REG, PENDING: 3, ATTESTED: 7 }, // 70% / 10
        CRA: ZERO_REG,
        UK_SPACE_ACT: ZERO_REG,
        US_REGULATORY: ZERO_REG,
        EXPORT_CONTROL: ZERO_REG,
        SPECTRUM: ZERO_REG,
      },
    });
    const r = await getPostureForUser(USER_ID);
    expect(r.regulationBreakdown.map((b) => b.regulation)).toEqual([
      "CYBERSECURITY",
      "NIS2",
      "DEBRIS",
    ]);
  });
});

describe("getPostureForUser — workflow KPIs", () => {
  beforeEach(() => {
    mockGetAggregate.mockResolvedValue({
      totalItems: 0,
      attestedThisWeek: 3,
      totalByStatus: ZERO_REG,
      perRegulation: {
        DEBRIS: ZERO_REG,
        CYBERSECURITY: ZERO_REG,
        NIS2: ZERO_REG,
        CRA: ZERO_REG,
        UK_SPACE_ACT: ZERO_REG,
        US_REGULATORY: ZERO_REG,
        EXPORT_CONTROL: ZERO_REG,
        SPECTRUM: ZERO_REG,
      },
    });
  });

  it("attestedThisWeek piped from aggregate", async () => {
    const r = await getPostureForUser(USER_ID);
    expect(r.workflow.attestedThisWeek).toBe(3);
  });

  it("openTriage sums notifications + sat alerts + unread reg updates (Sprint G fix)", async () => {
    // Org membership exists, so the org-scoped queries actually fire.
    mockOrgMemberFindMany.mockResolvedValue([{ organizationId: "org_1" }]);
    mockNotificationCount.mockResolvedValue(2);
    mockSatelliteAlertCount.mockResolvedValue(3);
    // Reg updates: 10 published, user read 6 → 4 unread.
    mockRegulatoryUpdateCount.mockResolvedValue(10);
    mockRegulatoryUpdateReadCount.mockResolvedValue(6);
    const r = await getPostureForUser(USER_ID);
    expect(r.workflow.openTriage).toBe(2 + 3 + 4);
  });

  it("openTriage = notifications only when user has no org", async () => {
    mockOrgMemberFindMany.mockResolvedValue([]); // no orgs
    mockNotificationCount.mockResolvedValue(5);
    // sat-alerts + reg-updates short-circuit to 0 — verify they're never queried
    const r = await getPostureForUser(USER_ID);
    expect(r.workflow.openTriage).toBe(5);
    expect(mockSatelliteAlertCount).not.toHaveBeenCalled();
    expect(mockRegulatoryUpdateCount).not.toHaveBeenCalled();
  });
});
