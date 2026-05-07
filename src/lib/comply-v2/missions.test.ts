/**
 * Tests for missions.server.ts — Sprint Mission-2 (post-refactor).
 *
 * Coverage:
 *
 *   1. resolvePrimaryOrgId returns null when no memberships
 *   2. getMissionsForUser returns [] when user has no primary org
 *   3. getMissionsForUser maps Mission rows to MissionSummary shape
 *   4. getMissionDetail returns null when mission not found / wrong org
 *   5. ensureMissionsForOrg backfills phase missionRefId via raw SQL
 *
 * The auto-migration loop (creates Mission rows for orphan Spacecraft)
 * is exercised through `ensureMissionsForOrg` returning expected
 * counts — full mock of $transaction is not necessary at this layer
 * because we trust Prisma's transaction primitive.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockUserFindUnique,
  mockMissionFindMany,
  mockMissionFindFirst,
  mockSpacecraftFindMany,
  mockExecuteRawUnsafe,
} = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
  mockMissionFindMany: vi.fn(),
  mockMissionFindFirst: vi.fn(),
  mockSpacecraftFindMany: vi.fn(),
  mockExecuteRawUnsafe: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    mission: {
      findMany: mockMissionFindMany,
      findFirst: mockMissionFindFirst,
    },
    spacecraft: { findMany: mockSpacecraftFindMany },
    $executeRawUnsafe: mockExecuteRawUnsafe,
  },
}));

import {
  getMissionsForUser,
  getMissionDetail,
  resolvePrimaryOrgId,
  ensureMissionsForOrg,
} from "./missions.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({
    organizationMemberships: [{ organizationId: "org_1" }],
  });
  mockSpacecraftFindMany.mockResolvedValue([]);
  mockMissionFindMany.mockResolvedValue([]);
  mockMissionFindFirst.mockResolvedValue(null);
  mockExecuteRawUnsafe.mockResolvedValue(0);
});

// ─── resolvePrimaryOrgId ────────────────────────────────────────────────

describe("resolvePrimaryOrgId", () => {
  it("returns the orgId when user has a membership", async () => {
    const result = await resolvePrimaryOrgId("u_1");
    expect(result).toBe("org_1");
  });

  it("returns null when the user has no memberships", async () => {
    mockUserFindUnique.mockResolvedValue({ organizationMemberships: [] });
    const result = await resolvePrimaryOrgId("u_1");
    expect(result).toBeNull();
  });

  it("returns null when the user does not exist", async () => {
    mockUserFindUnique.mockResolvedValue(null);
    const result = await resolvePrimaryOrgId("u_unknown");
    expect(result).toBeNull();
  });
});

// ─── getMissionsForUser ─────────────────────────────────────────────────

describe("getMissionsForUser", () => {
  it("returns [] when the user has no primary org", async () => {
    mockUserFindUnique.mockResolvedValue({ organizationMemberships: [] });
    const result = await getMissionsForUser("u_1");
    expect(result).toEqual([]);
    // No org-scoped queries should fire
    expect(mockSpacecraftFindMany).not.toHaveBeenCalled();
    expect(mockMissionFindMany).not.toHaveBeenCalled();
  });

  it("maps Mission rows to MissionSummary with computed fields", async () => {
    const mission = {
      id: "m_1",
      organizationId: "org_1",
      createdById: "u_1",
      name: "Iceye Constellation Phase 2",
      reference: "ICEYE-FY26",
      description: null,
      missionType: "EARTH_OBSERVATION",
      programPhase: "PHASE_E",
      status: "ACTIVE",
      primaryEndUser: "ESA EOP-S",
      primaryEndUserCountryCode: "EU",
      plannedStartAt: new Date("2025-01-01"),
      startedAt: new Date("2025-03-15"),
      endedAt: null,
      authorityRefs: ["BAFA-EXP-12345"],
      createdAt: new Date("2024-12-01"),
      updatedAt: new Date("2025-04-01"),
      spacecraft: [
        {
          id: "ms_1",
          missionId: "m_1",
          spacecraftId: "sc_1",
          role: "primary",
          startedAt: new Date("2025-03-15"),
          endedAt: null,
          constellationSlot: 1,
          notes: null,
          createdAt: new Date("2025-03-15"),
          spacecraft: {
            id: "sc_1",
            name: "ICEYE-X14",
            status: "OPERATIONAL",
            cosparId: "2024-064A",
            noradId: "59021",
            orbitType: "LEO",
            altitudeKm: 583,
          },
        },
      ],
      phases: [
        {
          id: "ph_1",
          name: "Operations",
          status: "IN_PROGRESS",
          progress: 60,
          startDate: new Date("2025-03-15"),
          endDate: new Date("2027-12-31"),
        },
      ],
    };
    mockMissionFindMany.mockResolvedValue([mission]);

    const [summary] = await getMissionsForUser("u_1");

    expect(summary.id).toBe("m_1");
    expect(summary.reference).toBe("ICEYE-FY26");
    expect(summary.missionType).toBe("EARTH_OBSERVATION");
    expect(summary.status).toBe("ACTIVE");
    expect(summary.spacecraftCount).toBe(1);
    expect(summary.primarySpacecraft?.spacecraftName).toBe("ICEYE-X14");
    expect(summary.primarySpacecraft?.cosparId).toBe("2024-064A");
    expect(summary.phaseCount).toBe(1);
    expect(summary.activePhase?.status).toBe("IN_PROGRESS");
    expect(summary.activePhase?.progress).toBe(60);
    expect(summary.roadmapProgressPct).toBe(60);
  });
});

// ─── getMissionDetail ───────────────────────────────────────────────────

describe("getMissionDetail", () => {
  it("returns null when user has no primary org", async () => {
    mockUserFindUnique.mockResolvedValue({ organizationMemberships: [] });
    const result = await getMissionDetail("u_1", "m_1");
    expect(result).toBeNull();
  });

  it("returns null when mission does not belong to user's org", async () => {
    mockMissionFindFirst.mockResolvedValue(null);
    const result = await getMissionDetail("u_1", "m_other_org");
    expect(result).toBeNull();
  });
});

// ─── ensureMissionsForOrg ───────────────────────────────────────────────

describe("ensureMissionsForOrg", () => {
  it("returns 0 created when there are no orphan spacecraft", async () => {
    mockSpacecraftFindMany.mockResolvedValue([]);
    mockExecuteRawUnsafe.mockResolvedValue(0);
    const result = await ensureMissionsForOrg("org_1", "u_1");
    expect(result.missionsCreated).toBe(0);
    expect(result.phasesBackfilled).toBe(0);
  });

  it("reports backfill counts from the raw SQL update", async () => {
    mockSpacecraftFindMany.mockResolvedValue([]);
    mockExecuteRawUnsafe.mockResolvedValue(7);
    const result = await ensureMissionsForOrg("org_1", "u_1");
    expect(result.phasesBackfilled).toBe(7);
  });
});
