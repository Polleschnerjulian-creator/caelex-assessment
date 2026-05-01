/**
 * Tests for missions.server.ts.
 *
 * Coverage:
 *
 *   1. Empty: no memberships, no phases → []
 *   2. Empty: org with no spacecraft AND no phases → []
 *   3. Linked mission: spacecraft + matching phases joined
 *   4. Linked mission with no matching phases → phaseCount=0
 *   5. Unlinked: phases reference a missionId without spacecraft → surfaced
 *   6. Active phase priority: IN_PROGRESS > next PLANNED > most recent COMPLETED
 *   7. Sort order: linked OPERATIONAL → LAUNCHED → PRE_LAUNCH; unlinked alpha
 *   8. roadmapProgressPct = mean of phase progress, rounded
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockSpacecraftFindMany, mockPhaseFindMany } =
  vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockSpacecraftFindMany: vi.fn(),
    mockPhaseFindMany: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    spacecraft: { findMany: mockSpacecraftFindMany },
    missionPhase: { findMany: mockPhaseFindMany },
  },
}));

import { getMissionsForUser } from "./missions.server";

beforeEach(() => {
  vi.clearAllMocks();
  // Default — user has a primary org.
  mockUserFindUnique.mockResolvedValue({
    organizationMemberships: [{ organizationId: "org_1" }],
  });
  mockSpacecraftFindMany.mockResolvedValue([]);
  mockPhaseFindMany.mockResolvedValue([]);
});

function spacecraft(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sc_1",
    name: "Falcon-1",
    status: "OPERATIONAL",
    missionType: "earth_observation",
    orbitType: "LEO",
    altitudeKm: 550,
    launchDate: new Date("2024-04-01"),
    cosparId: "2024-001A",
    noradId: "12345",
    ...over,
  };
}

function phase(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "phase_1",
    missionId: "sc_1",
    missionName: null,
    name: "Operations",
    status: "IN_PROGRESS",
    progress: 50,
    startDate: new Date("2024-05-01"),
    endDate: new Date("2025-12-31"),
    ...over,
  };
}

// ─── Empty paths ──────────────────────────────────────────────────────────

describe("getMissionsForUser — empty paths", () => {
  it("returns [] when user has no memberships and no phases", async () => {
    mockUserFindUnique.mockResolvedValue({ organizationMemberships: [] });
    const r = await getMissionsForUser("u_1");
    expect(r).toEqual([]);
    // Spacecraft fetch must NOT be called when no orgId
    expect(mockSpacecraftFindMany).not.toHaveBeenCalled();
  });

  it("returns [] when org has no spacecraft and no phases", async () => {
    const r = await getMissionsForUser("u_1");
    expect(r).toEqual([]);
    expect(mockSpacecraftFindMany).toHaveBeenCalledOnce();
  });
});

// ─── Linked-mission paths ─────────────────────────────────────────────────

describe("getMissionsForUser — linked missions", () => {
  it("joins spacecraft + matching phase", async () => {
    mockSpacecraftFindMany.mockResolvedValue([spacecraft()]);
    mockPhaseFindMany.mockResolvedValue([phase()]);
    const r = await getMissionsForUser("u_1");
    expect(r).toHaveLength(1);
    expect(r[0].id).toBe("sc_1");
    expect(r[0].linked).toBe(true);
    expect(r[0].name).toBe("Falcon-1");
    expect(r[0].cosparId).toBe("2024-001A");
    expect(r[0].phaseCount).toBe(1);
    expect(r[0].activePhase?.name).toBe("Operations");
    expect(r[0].activePhase?.status).toBe("IN_PROGRESS");
    expect(r[0].roadmapProgressPct).toBe(50);
  });

  it("linked spacecraft with no matching phases → phaseCount=0", async () => {
    mockSpacecraftFindMany.mockResolvedValue([spacecraft()]);
    mockPhaseFindMany.mockResolvedValue([]);
    const r = await getMissionsForUser("u_1");
    expect(r).toHaveLength(1);
    expect(r[0].linked).toBe(true);
    expect(r[0].phaseCount).toBe(0);
    expect(r[0].activePhase).toBeNull();
    expect(r[0].roadmapProgressPct).toBe(0);
  });

  it("active phase: IN_PROGRESS wins over PLANNED-future", async () => {
    mockSpacecraftFindMany.mockResolvedValue([spacecraft()]);
    mockPhaseFindMany.mockResolvedValue([
      phase({
        id: "p_planned",
        name: "Decommission",
        status: "PLANNED",
        startDate: new Date("2099-01-01"),
      }),
      phase({
        id: "p_active",
        name: "Cruise",
        status: "IN_PROGRESS",
        progress: 70,
      }),
    ]);
    const r = await getMissionsForUser("u_1");
    expect(r[0].activePhase?.name).toBe("Cruise");
    expect(r[0].activePhase?.progress).toBe(70);
  });

  it("active phase: next PLANNED wins when no IN_PROGRESS", async () => {
    mockSpacecraftFindMany.mockResolvedValue([spacecraft()]);
    const futureA = new Date(Date.now() + 30 * 86400000);
    const futureB = new Date(Date.now() + 90 * 86400000);
    mockPhaseFindMany.mockResolvedValue([
      phase({
        id: "p_late",
        name: "Phase B",
        status: "PLANNED",
        startDate: futureB,
        progress: 0,
      }),
      phase({
        id: "p_early",
        name: "Phase A",
        status: "PLANNED",
        startDate: futureA,
        progress: 0,
      }),
    ]);
    const r = await getMissionsForUser("u_1");
    expect(r[0].activePhase?.name).toBe("Phase A");
  });

  it("active phase: most recent COMPLETED when neither in-progress nor future-planned", async () => {
    mockSpacecraftFindMany.mockResolvedValue([spacecraft()]);
    mockPhaseFindMany.mockResolvedValue([
      phase({
        id: "p_old",
        name: "Launch",
        status: "COMPLETED",
        progress: 100,
        startDate: new Date("2020-01-01"),
        endDate: new Date("2020-04-01"),
      }),
      phase({
        id: "p_new",
        name: "Commissioning",
        status: "COMPLETED",
        progress: 100,
        startDate: new Date("2020-04-15"),
        endDate: new Date("2020-08-01"),
      }),
    ]);
    const r = await getMissionsForUser("u_1");
    expect(r[0].activePhase?.name).toBe("Commissioning");
  });

  it("roadmapProgressPct = mean over all phases, rounded", async () => {
    mockSpacecraftFindMany.mockResolvedValue([spacecraft()]);
    mockPhaseFindMany.mockResolvedValue([
      phase({ id: "p1", progress: 33 }),
      phase({ id: "p2", progress: 67 }),
      phase({ id: "p3", progress: 100 }),
    ]);
    const r = await getMissionsForUser("u_1");
    // mean = 66.67 → rounded 67
    expect(r[0].roadmapProgressPct).toBe(67);
  });
});

// ─── Sort order ───────────────────────────────────────────────────────────

describe("getMissionsForUser — sort order", () => {
  it("linked sorted by status priority (operational first), launchDate desc as tiebreaker", async () => {
    mockSpacecraftFindMany.mockResolvedValue([
      spacecraft({
        id: "sc_decom",
        name: "Old-Sat",
        status: "DECOMMISSIONING",
        launchDate: new Date("2018-01-01"),
      }),
      spacecraft({
        id: "sc_pre",
        name: "New-Sat",
        status: "PRE_LAUNCH",
        launchDate: new Date("2026-06-01"),
      }),
      spacecraft({
        id: "sc_op_old",
        name: "Op-Old",
        status: "OPERATIONAL",
        launchDate: new Date("2022-01-01"),
      }),
      spacecraft({
        id: "sc_op_new",
        name: "Op-New",
        status: "OPERATIONAL",
        launchDate: new Date("2024-01-01"),
      }),
      spacecraft({
        id: "sc_launched",
        name: "Launching",
        status: "LAUNCHED",
        launchDate: new Date("2025-09-01"),
      }),
    ]);
    const r = await getMissionsForUser("u_1");
    expect(r.map((m) => m.id)).toEqual([
      "sc_op_new", // OPERATIONAL, newer launch first
      "sc_op_old", // OPERATIONAL, older
      "sc_launched", // LAUNCHED
      "sc_pre", // PRE_LAUNCH
      "sc_decom", // DECOMMISSIONING
    ]);
  });
});

// ─── Unlinked paths ───────────────────────────────────────────────────────

describe("getMissionsForUser — unlinked missions", () => {
  it("phases referencing missionId without spacecraft are surfaced", async () => {
    mockSpacecraftFindMany.mockResolvedValue([]);
    mockPhaseFindMany.mockResolvedValue([
      phase({
        missionId: "legacy_mission_a",
        missionName: "Apollo-7",
        progress: 80,
      }),
      phase({
        id: "phase_2",
        missionId: "legacy_mission_a",
        missionName: null,
        progress: 100,
      }),
      phase({
        id: "phase_3",
        missionId: "legacy_mission_b",
        missionName: "Voyager-Pathfinder",
        progress: 0,
      }),
    ]);
    const r = await getMissionsForUser("u_1");
    expect(r).toHaveLength(2);
    expect(r.every((m) => !m.linked)).toBe(true);
    // alpha-sorted: Apollo-7 < Voyager-Pathfinder
    expect(r[0].name).toBe("Apollo-7");
    expect(r[0].phaseCount).toBe(2);
    expect(r[0].roadmapProgressPct).toBe(90);
    expect(r[1].name).toBe("Voyager-Pathfinder");
  });

  it("unlinked falls back to 'Unlinked mission' when no phase has a name", async () => {
    mockSpacecraftFindMany.mockResolvedValue([]);
    mockPhaseFindMany.mockResolvedValue([
      phase({ missionId: "legacy_x", missionName: null }),
    ]);
    const r = await getMissionsForUser("u_1");
    expect(r[0].name).toBe("Unlinked mission");
    expect(r[0].linked).toBe(false);
  });

  it("linked appear before unlinked in the result list", async () => {
    mockSpacecraftFindMany.mockResolvedValue([spacecraft()]);
    mockPhaseFindMany.mockResolvedValue([
      phase({ id: "p_linked", missionId: "sc_1", name: "Ops" }),
      phase({
        id: "p_orphan",
        missionId: "legacy_orphan",
        missionName: "Legacy",
      }),
    ]);
    const r = await getMissionsForUser("u_1");
    expect(r).toHaveLength(2);
    expect(r[0].linked).toBe(true);
    expect(r[1].linked).toBe(false);
  });
});
