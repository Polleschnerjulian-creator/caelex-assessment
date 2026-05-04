/**
 * Tests for src/lib/comply-v2/stakeholder-graph.server.ts.
 *
 * Coverage:
 *
 *   1. Unknown organisation → empty graph (no throw)
 *   2. Operator node always at the centre with kind="operator"
 *   3. Internal members → kind="internal" nodes
 *   4. Active engagements → kind="external" nodes with type
 *   5. Each non-operator node has a single edge from the operator
 *   6. perType histogram counts active engagements per type
 *   7. REVOKED + isRevoked engagements are filtered out
 *   8. Status filter restricts to ACTIVE + INVITED
 *   9. weight = dataRoomCount + attestationCount
 *  10. Operator weight = members + engagements (degree)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockOrgFindUnique, mockMemberFindMany, mockEngagementFindMany } =
  vi.hoisted(() => ({
    mockOrgFindUnique: vi.fn(),
    mockMemberFindMany: vi.fn(),
    mockEngagementFindMany: vi.fn(),
  }));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    organization: { findUnique: mockOrgFindUnique },
    organizationMember: { findMany: mockMemberFindMany },
    stakeholderEngagement: { findMany: mockEngagementFindMany },
  },
}));

import { getStakeholderNetwork } from "./stakeholder-graph.server";

beforeEach(() => {
  vi.clearAllMocks();
  mockOrgFindUnique.mockResolvedValue({ id: "org_1", name: "OneWeb Limited" });
  mockMemberFindMany.mockResolvedValue([]);
  mockEngagementFindMany.mockResolvedValue([]);
});

function member(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "m_1",
    role: "ADMIN",
    user: { id: "u_1", name: "Anna Operator", email: "anna@example.com" },
    ...over,
  };
}

function engagement(over: Partial<Record<string, unknown>> = {}) {
  return {
    id: "e_1",
    type: "LEGAL_COUNSEL",
    companyName: "Stadtgemeinde Counsel",
    contactName: "Maria Lawyer",
    status: "ACTIVE",
    _count: { dataRooms: 2, attestations: 3 },
    ...over,
  };
}

// ─── Empty / not-found ───────────────────────────────────────────────────

describe("getStakeholderNetwork — empty paths", () => {
  it("returns an empty graph when the organisation does not exist", async () => {
    mockOrgFindUnique.mockResolvedValueOnce(null);
    const r = await getStakeholderNetwork("ghost");
    expect(r.nodes).toEqual([]);
    expect(r.edges).toEqual([]);
    expect(r.totals.internal).toBe(0);
    expect(r.totals.external).toBe(0);
  });

  it("returns just the operator node when no members + no engagements", async () => {
    const r = await getStakeholderNetwork("org_1");
    expect(r.nodes).toHaveLength(1);
    expect(r.nodes[0].kind).toBe("operator");
    expect(r.nodes[0].label).toBe("OneWeb Limited");
    expect(r.edges).toEqual([]);
  });
});

// ─── Node + edge shape ───────────────────────────────────────────────────

describe("getStakeholderNetwork — node shapes", () => {
  it("internal members produce kind='internal' nodes with role as subLabel", async () => {
    mockMemberFindMany.mockResolvedValueOnce([
      member({
        id: "m_a",
        role: "OWNER",
        user: { id: "u_a", name: "Anna", email: "anna@x" },
      }),
      member({
        id: "m_b",
        role: "MEMBER",
        user: { id: "u_b", name: null, email: "bob@x" },
      }),
    ]);
    const r = await getStakeholderNetwork("org_1");
    const internals = r.nodes.filter((n) => n.kind === "internal");
    expect(internals).toHaveLength(2);
    expect(internals[0]).toMatchObject({
      id: "member:m_a",
      label: "Anna",
      subLabel: "OWNER",
    });
    // Falls back to email when user.name is null
    expect(internals[1].label).toBe("bob@x");
  });

  it("active engagements produce kind='external' nodes with type metadata", async () => {
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({
        id: "e_a",
        type: "NCA",
        companyName: "Bundesnetzagentur",
        contactName: "Inspector Müller",
      }),
    ]);
    const r = await getStakeholderNetwork("org_1");
    const external = r.nodes.find((n) => n.kind === "external");
    expect(external).toMatchObject({
      id: "engagement:e_a",
      kind: "external",
      label: "Bundesnetzagentur",
      subLabel: "Inspector Müller",
      type: "NCA",
    });
  });

  it("weight = dataRoomCount + attestationCount", async () => {
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({ _count: { dataRooms: 4, attestations: 7 } }),
    ]);
    const r = await getStakeholderNetwork("org_1");
    const external = r.nodes.find((n) => n.kind === "external");
    expect(external?.weight).toBe(11);
  });

  it("operator weight reflects degree (members + engagements)", async () => {
    mockMemberFindMany.mockResolvedValueOnce([
      member({ id: "m1" }),
      member({ id: "m2" }),
    ]);
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({ id: "e1" }),
      engagement({ id: "e2" }),
      engagement({ id: "e3" }),
    ]);
    const r = await getStakeholderNetwork("org_1");
    const op = r.nodes.find((n) => n.kind === "operator");
    expect(op?.weight).toBe(5);
  });
});

// ─── Edges ───────────────────────────────────────────────────────────────

describe("getStakeholderNetwork — edges", () => {
  it("creates one edge per non-operator node, all from the operator", async () => {
    mockMemberFindMany.mockResolvedValueOnce([
      member({ id: "m_a" }),
      member({ id: "m_b" }),
    ]);
    mockEngagementFindMany.mockResolvedValueOnce([engagement({ id: "e_a" })]);
    const r = await getStakeholderNetwork("org_1");
    expect(r.edges).toHaveLength(3);
    const operatorId = `operator:${"org_1"}`;
    expect(r.edges.every((e) => e.from === operatorId)).toBe(true);
    expect(r.edges.map((e) => e.to)).toEqual([
      "member:m_a",
      "member:m_b",
      "engagement:e_a",
    ]);
  });

  it("edge weight equals target node weight", async () => {
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({ id: "e_busy", _count: { dataRooms: 5, attestations: 5 } }),
    ]);
    const r = await getStakeholderNetwork("org_1");
    const edge = r.edges.find((e) => e.to === "engagement:e_busy");
    expect(edge?.weight).toBe(10);
  });
});

// ─── Filtering / type histogram ──────────────────────────────────────────

describe("getStakeholderNetwork — filters", () => {
  it("queries with isRevoked:false + status in [INVITED, ACTIVE]", async () => {
    await getStakeholderNetwork("org_1");
    const args = mockEngagementFindMany.mock.calls[0][0] as {
      where: { isRevoked: boolean; status: { in: string[] } };
    };
    expect(args.where.isRevoked).toBe(false);
    expect(args.where.status.in).toEqual(["INVITED", "ACTIVE"]);
  });

  it("perType histogram counts engagements per StakeholderType", async () => {
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({ id: "e1", type: "LEGAL_COUNSEL" }),
      engagement({ id: "e2", type: "LEGAL_COUNSEL" }),
      engagement({ id: "e3", type: "INSURER" }),
      engagement({ id: "e4", type: "NCA" }),
    ]);
    const r = await getStakeholderNetwork("org_1");
    expect(r.totals.perType.LEGAL_COUNSEL).toBe(2);
    expect(r.totals.perType.INSURER).toBe(1);
    expect(r.totals.perType.NCA).toBe(1);
    expect(r.totals.perType.AUDITOR).toBe(0);
  });

  it("internal + external totals match node counts", async () => {
    mockMemberFindMany.mockResolvedValueOnce([
      member({ id: "m1" }),
      member({ id: "m2" }),
      member({ id: "m3" }),
    ]);
    mockEngagementFindMany.mockResolvedValueOnce([
      engagement({ id: "e1" }),
      engagement({ id: "e2" }),
    ]);
    const r = await getStakeholderNetwork("org_1");
    expect(r.totals.internal).toBe(3);
    expect(r.totals.external).toBe(2);
  });
});
