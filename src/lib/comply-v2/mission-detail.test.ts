/**
 * Tests for mission-detail.server.ts.
 *
 * Coverage:
 *
 *   1. Linked path: spacecraft + matching phases joined with milestones
 *   2. Unlinked path: phases reference legacy missionId, no spacecraft
 *   3. Tenant guard: spacecraft from other org returns null
 *   4. 404 path: spacecraft missing AND no phases → null
 *   5. roadmapProgressPct = mean(phase.progress)
 *   6. totalMilestones + regulatoryMilestones aggregates
 *   7. Phases ordered by startDate asc, milestones by targetDate asc
 *   8. Unlinked name: derived from first phase missionName, fallback to default
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockUserFindUnique, mockSpacecraftFindUnique, mockPhaseFindMany } =
  vi.hoisted(() => ({
    mockUserFindUnique: vi.fn(),
    mockSpacecraftFindUnique: vi.fn(),
    mockPhaseFindMany: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    spacecraft: { findUnique: mockSpacecraftFindUnique },
    missionPhase: { findMany: mockPhaseFindMany },
  },
}));

import { getMissionDetail } from "./mission-detail.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockUserFindUnique.mockResolvedValue({
    organizationMemberships: [{ organizationId: "org_1" }],
  });
  mockSpacecraftFindUnique.mockResolvedValue(null);
  mockPhaseFindMany.mockResolvedValue([]);
});

function spacecraftRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sc_1",
    organizationId: "org_1",
    name: "Falcon-1",
    status: "OPERATIONAL",
    missionType: "earth_observation",
    orbitType: "LEO",
    altitudeKm: 550,
    inclinationDeg: 53.0,
    cosparId: "2024-001A",
    noradId: "12345",
    launchDate: new Date("2024-04-01"),
    endOfLifeDate: new Date("2030-04-01"),
    description: "Sun-synchronous EO satellite",
    ...over,
  };
}

function phaseRow(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "p_1",
    name: "Operations",
    description: "Routine ops",
    status: "IN_PROGRESS",
    progress: 50,
    startDate: new Date("2024-05-01"),
    endDate: new Date("2025-12-31"),
    color: "#10b981",
    dependsOn: [],
    missionName: "Falcon-1 Mission",
    milestones: [],
    ...over,
  };
}

function milestone(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "m_1",
    name: "First image",
    description: null,
    targetDate: new Date("2024-06-01"),
    completedDate: null,
    status: "PENDING",
    isCritical: false,
    isRegulatory: false,
    regulatoryRef: null,
    icon: null,
    ...over,
  };
}

// ─── Linked path ──────────────────────────────────────────────────────────

describe("getMissionDetail — linked", () => {
  it("joins spacecraft + matching phases + milestones", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(spacecraftRow());
    mockPhaseFindMany.mockResolvedValue([
      phaseRow({
        milestones: [
          milestone({
            id: "m_a",
            isRegulatory: true,
            regulatoryRef: "Art. 14",
          }),
          milestone({ id: "m_b" }),
        ],
      }),
    ]);
    const r = await getMissionDetail("u_1", "sc_1");
    expect(r).not.toBeNull();
    expect(r!.linked).toBe(true);
    expect(r!.id).toBe("sc_1");
    expect(r!.name).toBe("Falcon-1");
    expect(r!.cosparId).toBe("2024-001A");
    expect(r!.altitudeKm).toBe(550);
    expect(r!.phases).toHaveLength(1);
    expect(r!.phases[0].milestones).toHaveLength(2);
    expect(r!.totalMilestones).toBe(2);
    expect(r!.regulatoryMilestones).toBe(1);
    expect(r!.roadmapProgressPct).toBe(50);
  });

  it("returns spacecraft fields with no phases when none exist", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(spacecraftRow());
    mockPhaseFindMany.mockResolvedValue([]);
    const r = await getMissionDetail("u_1", "sc_1");
    expect(r).not.toBeNull();
    expect(r!.linked).toBe(true);
    expect(r!.phases).toEqual([]);
    expect(r!.roadmapProgressPct).toBe(0);
    expect(r!.totalMilestones).toBe(0);
  });

  it("computes roadmapProgressPct as mean across phases", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(spacecraftRow());
    mockPhaseFindMany.mockResolvedValue([
      phaseRow({ id: "p_1", progress: 33 }),
      phaseRow({ id: "p_2", progress: 67 }),
      phaseRow({ id: "p_3", progress: 100 }),
    ]);
    const r = await getMissionDetail("u_1", "sc_1");
    expect(r!.roadmapProgressPct).toBe(67); // 200/3 = 66.67 → 67
  });
});

// ─── Tenant guard ─────────────────────────────────────────────────────────

describe("getMissionDetail — tenant guard", () => {
  it("returns null when spacecraft belongs to a different org (no info leak)", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(
      spacecraftRow({ organizationId: "other_org" }),
    );
    mockPhaseFindMany.mockResolvedValue([]);
    const r = await getMissionDetail("u_1", "sc_1");
    expect(r).toBeNull();
  });

  it("returns null when user has no memberships AND no phases", async () => {
    mockUserFindUnique.mockResolvedValue({ organizationMemberships: [] });
    mockSpacecraftFindUnique.mockResolvedValue(null);
    mockPhaseFindMany.mockResolvedValue([]);
    const r = await getMissionDetail("u_1", "sc_x");
    expect(r).toBeNull();
    // Spacecraft fetch must be skipped without orgId
    expect(mockSpacecraftFindUnique).not.toHaveBeenCalled();
  });

  it("returns null when neither spacecraft nor phases exist", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(null);
    mockPhaseFindMany.mockResolvedValue([]);
    const r = await getMissionDetail("u_1", "sc_x");
    expect(r).toBeNull();
  });
});

// ─── Unlinked path ────────────────────────────────────────────────────────

describe("getMissionDetail — unlinked", () => {
  it("surfaces phases without a backing spacecraft", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(null);
    mockPhaseFindMany.mockResolvedValue([
      phaseRow({ id: "p_a", missionName: "Apollo-7", progress: 100 }),
      phaseRow({ id: "p_b", missionName: null, progress: 60 }),
    ]);
    const r = await getMissionDetail("u_1", "legacy_apollo7");
    expect(r).not.toBeNull();
    expect(r!.linked).toBe(false);
    expect(r!.id).toBe("legacy_apollo7");
    expect(r!.name).toBe("Apollo-7");
    expect(r!.status).toBeNull();
    expect(r!.cosparId).toBeNull();
    expect(r!.phases).toHaveLength(2);
    expect(r!.roadmapProgressPct).toBe(80);
  });

  it("falls back to 'Unlinked mission' when no phase has a name", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(null);
    mockPhaseFindMany.mockResolvedValue([
      phaseRow({ id: "p_x", missionName: null }),
    ]);
    const r = await getMissionDetail("u_1", "legacy_x");
    expect(r!.name).toBe("Unlinked mission");
    expect(r!.linked).toBe(false);
  });
});

// ─── Aggregates ───────────────────────────────────────────────────────────

describe("getMissionDetail — aggregates", () => {
  it("counts regulatory milestones across all phases", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(spacecraftRow());
    mockPhaseFindMany.mockResolvedValue([
      phaseRow({
        id: "p_1",
        milestones: [
          milestone({ id: "m1", isRegulatory: true }),
          milestone({ id: "m2", isRegulatory: true }),
          milestone({ id: "m3", isRegulatory: false }),
        ],
      }),
      phaseRow({
        id: "p_2",
        milestones: [
          milestone({ id: "m4", isRegulatory: true }),
          milestone({ id: "m5", isRegulatory: false }),
        ],
      }),
    ]);
    const r = await getMissionDetail("u_1", "sc_1");
    expect(r!.totalMilestones).toBe(5);
    expect(r!.regulatoryMilestones).toBe(3);
  });

  it("preserves phase order from prisma (startDate asc) and passes milestones through", async () => {
    mockSpacecraftFindUnique.mockResolvedValue(spacecraftRow());
    mockPhaseFindMany.mockResolvedValue([
      phaseRow({
        id: "p_first",
        startDate: new Date("2020-01-01"),
        milestones: [milestone({ id: "m_alpha" })],
      }),
      phaseRow({
        id: "p_second",
        startDate: new Date("2024-01-01"),
        milestones: [milestone({ id: "m_beta" })],
      }),
    ]);
    const r = await getMissionDetail("u_1", "sc_1");
    expect(r!.phases.map((p) => p.id)).toEqual(["p_first", "p_second"]);
    expect(r!.phases[0].milestones[0].id).toBe("m_alpha");
    expect(r!.phases[1].milestones[0].id).toBe("m_beta");
  });
});
