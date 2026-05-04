/**
 * Tests for src/lib/comply-v2/operator-universe.server.ts.
 *
 * Coverage:
 *
 *   1. Unknown organisation → empty universe (operator placeholder, no throw)
 *   2. Operator-only fetch when no spacecraft + no engagements
 *   3. Spacecraft → orbit radius keyed off orbitType (LEO < MEO < GEO < HEO)
 *   4. Unknown orbitType falls back to FALLBACK_ORBIT_RADIUS band
 *   5. altitudeKm nudges orbit radius within the band; null leaves base
 *   6. initialAngle + yOffset are deterministic per id (same input → same value)
 *   7. speedMultiplier descends LEO > MEO > GEO > HEO
 *   8. spacecraftByStatus histogram counts every status, zero-fills the rest
 *   9. Stakeholder ring: angles evenly spaced, includes type + companyName
 *  10. REVOKED engagements + isRevoked rows are filtered (status filter sent)
 *  11. Order = createdAt ASC; take cap = 50 for both spacecraft + stakeholders
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOrgFindUnique, mockSpacecraftFindMany, mockEngagementFindMany } =
  vi.hoisted(() => ({
    mockOrgFindUnique: vi.fn(),
    mockSpacecraftFindMany: vi.fn(),
    mockEngagementFindMany: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: mockOrgFindUnique },
    spacecraft: { findMany: mockSpacecraftFindMany },
    stakeholderEngagement: { findMany: mockEngagementFindMany },
  },
}));

import { getOperatorUniverse } from "./operator-universe.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockOrgFindUnique.mockResolvedValue({ id: "org_1", name: "OneWeb Ltd" });
  mockSpacecraftFindMany.mockResolvedValue([]);
  mockEngagementFindMany.mockResolvedValue([]);
});

function craft(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "sc_1",
    name: "Sat-1",
    missionType: "communication",
    orbitType: "LEO",
    status: "OPERATIONAL",
    altitudeKm: null,
    ...over,
  };
}

function engagement(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "e_1",
    type: "LEGAL_COUNSEL",
    companyName: "Counsel Co",
    status: "ACTIVE",
    ...over,
  };
}

// ─── Empty / not-found ───────────────────────────────────────────────────

describe("getOperatorUniverse — empty paths", () => {
  it("returns empty universe when the organisation does not exist", async () => {
    mockOrgFindUnique.mockResolvedValueOnce(null);
    const u = await getOperatorUniverse("ghost");
    expect(u.spacecraft).toEqual([]);
    expect(u.stakeholders).toEqual([]);
    expect(u.totals.stakeholderCount).toBe(0);
    expect(u.totals.spacecraftByStatus.OPERATIONAL).toBe(0);
    // Operator block still set (placeholder name) so the client knows what
    // org id was queried.
    expect(u.operator.id).toBe("ghost");
  });

  it("returns operator-only universe when no spacecraft + no engagements", async () => {
    const u = await getOperatorUniverse("org_1");
    expect(u.operator).toEqual({ id: "org_1", name: "OneWeb Ltd" });
    expect(u.spacecraft).toHaveLength(0);
    expect(u.stakeholders).toHaveLength(0);
  });
});

// ─── Spacecraft → orbit-band mapping ─────────────────────────────────────

describe("getOperatorUniverse — orbit radius mapping", () => {
  it("LEO < MEO < GEO < HEO ordering on orbit radius", async () => {
    mockSpacecraftFindMany.mockResolvedValueOnce([
      craft({ id: "sc_leo", orbitType: "LEO" }),
      craft({ id: "sc_meo", orbitType: "MEO" }),
      craft({ id: "sc_geo", orbitType: "GEO" }),
      craft({ id: "sc_heo", orbitType: "HEO" }),
    ]);
    const u = await getOperatorUniverse("org_1");
    const byId = Object.fromEntries(u.spacecraft.map((s) => [s.id, s]));
    expect(byId["sc_leo"].orbitRadius).toBeLessThan(byId["sc_meo"].orbitRadius);
    expect(byId["sc_meo"].orbitRadius).toBeLessThan(byId["sc_geo"].orbitRadius);
    expect(byId["sc_geo"].orbitRadius).toBeLessThan(byId["sc_heo"].orbitRadius);
  });

  it("unknown orbitType falls back to a middling radius (between LEO and HEO)", async () => {
    mockSpacecraftFindMany.mockResolvedValueOnce([
      craft({ id: "sc_leo", orbitType: "LEO" }),
      craft({ id: "sc_unknown", orbitType: "MARS_TRANSFER" }),
      craft({ id: "sc_heo", orbitType: "HEO" }),
    ]);
    const u = await getOperatorUniverse("org_1");
    const byId = Object.fromEntries(u.spacecraft.map((s) => [s.id, s]));
    expect(byId["sc_unknown"].orbitRadius).toBeGreaterThan(
      byId["sc_leo"].orbitRadius,
    );
    expect(byId["sc_unknown"].orbitRadius).toBeLessThan(
      byId["sc_heo"].orbitRadius,
    );
  });

  it("altitudeKm nudges orbit radius within the band; null leaves base", async () => {
    mockSpacecraftFindMany.mockResolvedValueOnce([
      craft({ id: "sc_low_leo", orbitType: "LEO", altitudeKm: 400 }),
      craft({ id: "sc_high_leo", orbitType: "LEO", altitudeKm: 1500 }),
      craft({ id: "sc_no_alt", orbitType: "LEO", altitudeKm: null }),
    ]);
    const u = await getOperatorUniverse("org_1");
    const byId = Object.fromEntries(u.spacecraft.map((s) => [s.id, s]));
    // Nudge magnitude is bounded
    expect(
      Math.abs(byId["sc_low_leo"].orbitRadius - byId["sc_no_alt"].orbitRadius),
    ).toBeLessThan(0.4);
    // Different altitudes → different nudges → different radii
    expect(byId["sc_low_leo"].orbitRadius).not.toBe(
      byId["sc_high_leo"].orbitRadius,
    );
  });

  it("speedMultiplier descends LEO > MEO > GEO > HEO", async () => {
    mockSpacecraftFindMany.mockResolvedValueOnce([
      craft({ id: "sc_leo", orbitType: "LEO" }),
      craft({ id: "sc_meo", orbitType: "MEO" }),
      craft({ id: "sc_geo", orbitType: "GEO" }),
      craft({ id: "sc_heo", orbitType: "HEO" }),
    ]);
    const u = await getOperatorUniverse("org_1");
    const byId = Object.fromEntries(u.spacecraft.map((s) => [s.id, s]));
    expect(byId["sc_leo"].speedMultiplier).toBeGreaterThan(
      byId["sc_meo"].speedMultiplier,
    );
    expect(byId["sc_meo"].speedMultiplier).toBeGreaterThan(
      byId["sc_geo"].speedMultiplier,
    );
    expect(byId["sc_geo"].speedMultiplier).toBeGreaterThan(
      byId["sc_heo"].speedMultiplier,
    );
  });
});

// ─── Determinism (jitter from id) ────────────────────────────────────────

describe("getOperatorUniverse — determinism", () => {
  it("same id → same initialAngle + yOffset across calls", async () => {
    mockSpacecraftFindMany.mockResolvedValue([craft({ id: "sc_stable" })]);
    const a = await getOperatorUniverse("org_1");
    const b = await getOperatorUniverse("org_1");
    expect(a.spacecraft[0].initialAngle).toBe(b.spacecraft[0].initialAngle);
    expect(a.spacecraft[0].yOffset).toBe(b.spacecraft[0].yOffset);
  });

  it("different ids produce different angles (with high probability)", async () => {
    mockSpacecraftFindMany.mockResolvedValueOnce([
      craft({ id: "sc_alpha" }),
      craft({ id: "sc_beta" }),
      craft({ id: "sc_gamma" }),
    ]);
    const u = await getOperatorUniverse("org_1");
    const angles = u.spacecraft.map((s) => s.initialAngle);
    const uniq = new Set(angles);
    expect(uniq.size).toBe(3);
  });

  it("yOffset stays within ±0.4 scene units", async () => {
    // Generate 20 different ids and check all yOffsets are bounded
    const rows = Array.from({ length: 20 }, (_, i) =>
      craft({ id: `sc_${i}_long_id_abcdef` }),
    );
    mockSpacecraftFindMany.mockResolvedValueOnce(rows);
    const u = await getOperatorUniverse("org_1");
    for (const s of u.spacecraft) {
      expect(Math.abs(s.yOffset)).toBeLessThanOrEqual(0.4);
    }
  });
});

// ─── Status histogram ────────────────────────────────────────────────────

describe("getOperatorUniverse — status histogram", () => {
  it("counts spacecraft per status; zeros statuses with no rows", async () => {
    mockSpacecraftFindMany.mockResolvedValueOnce([
      craft({ id: "a", status: "OPERATIONAL" }),
      craft({ id: "b", status: "OPERATIONAL" }),
      craft({ id: "c", status: "PRE_LAUNCH" }),
      craft({ id: "d", status: "DEORBITED" }),
    ]);
    const u = await getOperatorUniverse("org_1");
    expect(u.totals.spacecraftByStatus.OPERATIONAL).toBe(2);
    expect(u.totals.spacecraftByStatus.PRE_LAUNCH).toBe(1);
    expect(u.totals.spacecraftByStatus.DEORBITED).toBe(1);
    expect(u.totals.spacecraftByStatus.LAUNCHED).toBe(0);
    expect(u.totals.spacecraftByStatus.LOST).toBe(0);
    expect(u.totals.spacecraftByStatus.DECOMMISSIONING).toBe(0);
  });
});

// ─── Stakeholder ring ────────────────────────────────────────────────────

describe("getOperatorUniverse — stakeholder ring", () => {
  it("evenly spaces angles around the ring (0..2π)", async () => {
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({ id: "e1" }),
      engagement({ id: "e2" }),
      engagement({ id: "e3" }),
      engagement({ id: "e4" }),
    ]);
    const u = await getOperatorUniverse("org_1");
    expect(u.stakeholders).toHaveLength(4);
    expect(u.stakeholders[0].angle).toBe(0);
    expect(u.stakeholders[1].angle).toBeCloseTo(Math.PI / 2, 5);
    expect(u.stakeholders[2].angle).toBeCloseTo(Math.PI, 5);
    expect(u.stakeholders[3].angle).toBeCloseTo((3 * Math.PI) / 2, 5);
  });

  it("preserves type + companyName fields", async () => {
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({
        id: "e_nca",
        type: "NCA",
        companyName: "Bundesnetzagentur",
      }),
    ]);
    const u = await getOperatorUniverse("org_1");
    expect(u.stakeholders[0]).toMatchObject({
      type: "NCA",
      companyName: "Bundesnetzagentur",
    });
  });

  it("totals.stakeholderCount matches stakeholder array length", async () => {
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({ id: "e1" }),
      engagement({ id: "e2" }),
    ]);
    const u = await getOperatorUniverse("org_1");
    expect(u.totals.stakeholderCount).toBe(2);
  });
});

// ─── Filters + query shape ───────────────────────────────────────────────

describe("getOperatorUniverse — filters", () => {
  it("filters engagements with isRevoked:false + status in [INVITED, ACTIVE]", async () => {
    await getOperatorUniverse("org_1");
    const args = mockEngagementFindMany.mock.calls[0][0] as {
      where: {
        organizationId: string;
        isRevoked: boolean;
        status: { in: string[] };
      };
    };
    expect(args.where.organizationId).toBe("org_1");
    expect(args.where.isRevoked).toBe(false);
    expect(args.where.status.in).toEqual(["INVITED", "ACTIVE"]);
  });

  it("scopes spacecraft query by organizationId, ordered by createdAt asc, capped at 50", async () => {
    await getOperatorUniverse("org_1");
    const args = mockSpacecraftFindMany.mock.calls[0][0] as {
      where: { organizationId: string };
      orderBy: { createdAt: string };
      take: number;
    };
    expect(args.where.organizationId).toBe("org_1");
    expect(args.orderBy.createdAt).toBe("asc");
    expect(args.take).toBe(50);
  });

  it("caps stakeholder query at 50 too (prevent runaway scenes)", async () => {
    await getOperatorUniverse("org_1");
    const args = mockEngagementFindMany.mock.calls[0][0] as { take: number };
    expect(args.take).toBe(50);
  });
});
