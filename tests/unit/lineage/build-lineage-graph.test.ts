import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/verity/utils/redaction", () => ({ safeLog: vi.fn() }));
vi.mock("@/lib/prisma", () => ({
  prisma: {
    auditLog: { findMany: vi.fn() },
    organizationMember: { findMany: vi.fn() },
    derivationTrace: { findMany: vi.fn() },
    astraProposal: { findMany: vi.fn() },
  },
}));

import { buildLineageGraph } from "@/lib/lineage/build-lineage-graph";
import { prisma } from "@/lib/prisma";

beforeEach(() => {
  vi.clearAllMocks();
  // Default: all queries return empty arrays.
  vi.mocked(prisma.auditLog.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([] as never);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma as any).derivationTrace = { findMany: vi.fn().mockResolvedValue([]) };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (prisma as any).astraProposal = { findMany: vi.fn().mockResolvedValue([]) };
});

describe("buildLineageGraph", () => {
  it("returns a subject-only graph when no upstream data exists", async () => {
    const result = await buildLineageGraph("org-1", {
      type: "compliance-item",
      id: "EU_SPACE_ACT:AUTH-001",
    });

    expect(result.subject.type).toBe("compliance-item");
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0]!.kind).toBe("subject");
    expect(result.edges).toEqual([]);
    expect(result.meta.truncated).toBe(false);
  });

  it("adds DerivationTrace nodes + edges for compliance-item", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).derivationTrace = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "trace-1",
          fieldName: "status",
          value: "ATTESTED",
          origin: "ai-inferred",
          sourceRef: null,
          confidence: 0.92,
          modelVersion: "claude-sonnet-4-6",
          derivedAt: new Date("2026-05-20T10:00:00Z"),
          verificationTier: "T2_SOURCE_VERIFIED",
          entryHash: "abc123",
        },
      ]),
    };

    const result = await buildLineageGraph("org-1", {
      type: "compliance-item",
      id: "EU_SPACE_ACT:AUTH-001",
    });

    expect(result.nodes.length).toBeGreaterThanOrEqual(2);
    const traceNode = result.nodes.find((n) => n.kind === "derivation-trace");
    expect(traceNode).toBeDefined();
    expect(traceNode!.confidence).toBe(0.92);
    expect(result.edges.some((e) => e.kind === "derives-from")).toBe(true);
  });

  it("creates an enrichment-source node from DerivationTrace.sourceRef.system", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).derivationTrace = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "trace-2",
          fieldName: "legalName",
          value: "Caelex GmbH",
          origin: "source-backed",
          sourceRef: { system: "vies", id: "DE123" },
          confidence: 0.95,
          modelVersion: null,
          derivedAt: new Date(),
          verificationTier: "T2_SOURCE_VERIFIED",
          entryHash: null,
        },
      ]),
    };

    const result = await buildLineageGraph("org-1", {
      type: "operator-profile-field",
      id: "opid:legalName",
    });

    const enrichmentNode = result.nodes.find(
      (n) => n.kind === "enrichment-source",
    );
    expect(enrichmentNode).toBeDefined();
    expect(enrichmentNode!.label).toContain("vies");
    expect(result.edges.some((e) => e.kind === "sources-from")).toBe(true);
  });

  it("adds AstraProposal nodes filtered by org membership", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).astraProposal = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "prop-1",
          actionName: "markAsAttested",
          status: "PENDING",
          itemId: "EU_SPACE_ACT:AUTH-001",
          modelName: "claude-sonnet-4-6",
          engineVersion: "v1",
          rationale: "user clicked attest",
          createdAt: new Date(),
          userId: "user-1",
        },
      ]),
    };
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue([
      { userId: "user-1" },
    ] as never);

    const result = await buildLineageGraph("org-1", {
      type: "compliance-item",
      id: "EU_SPACE_ACT:AUTH-001",
    });

    const proposalNode = result.nodes.find((n) => n.kind === "astra-proposal");
    expect(proposalNode).toBeDefined();
    expect(proposalNode!.label).toContain("markAsAttested");
    expect(result.edges.some((e) => e.kind === "proposed-by")).toBe(true);
  });

  it("excludes AstraProposals whose user is not in the org", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).astraProposal = {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "prop-2",
          actionName: "markAsAttested",
          status: "PENDING",
          itemId: "EU_SPACE_ACT:AUTH-001",
          modelName: null,
          engineVersion: null,
          rationale: null,
          createdAt: new Date(),
          userId: "user-other-org",
        },
      ]),
    };
    vi.mocked(prisma.organizationMember.findMany).mockResolvedValue(
      [] as never,
    );

    const result = await buildLineageGraph("org-1", {
      type: "compliance-item",
      id: "EU_SPACE_ACT:AUTH-001",
    });

    expect(
      result.nodes.find((n) => n.kind === "astra-proposal"),
    ).toBeUndefined();
  });

  it("adds AuditLog nodes", async () => {
    vi.mocked(prisma.auditLog.findMany).mockResolvedValue([
      {
        id: "audit-1",
        action: "UPDATE",
        entityType: "compliance-item",
        entityId: "EU_SPACE_ACT:AUTH-001",
        timestamp: new Date(),
        userId: "user-1",
      },
    ] as never);

    const result = await buildLineageGraph("org-1", {
      type: "compliance-item",
      id: "EU_SPACE_ACT:AUTH-001",
    });

    const auditNode = result.nodes.find((n) => n.kind === "audit-log");
    expect(auditNode).toBeDefined();
    expect(result.edges.some((e) => e.kind === "audited-by")).toBe(true);
  });

  it("never throws; soft-fails per query with warnings", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).derivationTrace = {
      findMany: vi.fn().mockRejectedValue(new Error("DB down")),
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (prisma as any).astraProposal = {
      findMany: vi.fn().mockRejectedValue(new Error("DB down 2")),
    };

    const result = await buildLineageGraph("org-1", {
      type: "compliance-item",
      id: "EU_SPACE_ACT:AUTH-001",
    });

    expect(result.nodes).toHaveLength(1); // subject only
    expect(result.meta.warnings.length).toBeGreaterThanOrEqual(2);
    expect(result.meta.warnings.some((w) => w.includes("soft-failed"))).toBe(
      true,
    );
  });

  it("returns subject + meta even for non-compliance subject types", async () => {
    const result = await buildLineageGraph("org-1", {
      type: "audit-log-entry",
      id: "audit-99",
    });

    expect(result.subject.type).toBe("audit-log-entry");
    expect(result.nodes[0]!.kind).toBe("subject");
    expect(result.meta.durationMs).toBeGreaterThanOrEqual(0);
  });
});
