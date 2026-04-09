import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock server-only so the service can be imported
vi.mock("server-only", () => ({}));

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    asset: { findFirst: vi.fn(), findMany: vi.fn() },
    assetDependency: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock audit
vi.mock("@/lib/audit", () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { logAuditEvent } from "@/lib/audit";
import {
  addDependency,
  removeDependency,
  getDependenciesForAsset,
  getImpactAnalysis,
  getSinglePointsOfFailure,
  getDependencyGraph,
  autoDetectDependencies,
} from "@/lib/nexus/dependency-service.server";

// ─── Fixtures ───────────────────────────────────────────────────────────────

const mockAssetA = {
  id: "asset-a",
  organizationId: "org-1",
  name: "Spacecraft Alpha",
  assetType: "SPACECRAFT",
  category: "SPACE_SEGMENT",
  criticality: "HIGH",
  isDeleted: false,
};

const mockAssetB = {
  id: "asset-b",
  organizationId: "org-1",
  name: "TTC Uplink Beta",
  assetType: "TTC_UPLINK",
  category: "LINK_SEGMENT",
  criticality: "MEDIUM",
  isDeleted: false,
};

const mockAssetC = {
  id: "asset-c",
  organizationId: "org-1",
  name: "Ground Station Charlie",
  assetType: "GROUND_STATION",
  category: "GROUND_SEGMENT",
  criticality: "CRITICAL",
  isDeleted: false,
};

const mockDependency = {
  id: "dep-1",
  sourceAssetId: "asset-a",
  targetAssetId: "asset-b",
  dependencyType: "COMMUNICATES_WITH",
  strength: "HARD",
  description: "Primary uplink",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
};

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("Dependency Service", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // Re-apply persistent mocks that need to always work
    vi.mocked(logAuditEvent).mockResolvedValue(undefined);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // addDependency
  // ─────────────────────────────────────────────────────────────────────────

  describe("addDependency", () => {
    it("creates a dependency when both assets exist and no circularity", async () => {
      // Both assets exist
      vi.mocked(prisma.asset.findFirst)
        .mockResolvedValueOnce(mockAssetA as never) // source
        .mockResolvedValueOnce(mockAssetB as never); // target

      // No existing dependencies from target (circularity check: BFS from target finds nothing)
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      vi.mocked(prisma.assetDependency.create).mockResolvedValue(
        mockDependency as never,
      );

      const result = await addDependency(
        "asset-a",
        "asset-b",
        "COMMUNICATES_WITH",
        "HARD",
        "Primary uplink",
        "org-1",
        "user-1",
      );

      expect(prisma.assetDependency.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          sourceAssetId: "asset-a",
          targetAssetId: "asset-b",
          dependencyType: "COMMUNICATES_WITH",
          strength: "HARD",
          description: "Primary uplink",
        }),
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_dependency_added",
          entityType: "nexus_dependency",
          userId: "user-1",
          organizationId: "org-1",
        }),
      );

      expect(result).toEqual(mockDependency);
    });

    it("throws error when source asset does not exist", async () => {
      vi.mocked(prisma.asset.findFirst)
        .mockResolvedValueOnce(null) // source not found
        .mockResolvedValueOnce(mockAssetB as never);

      await expect(
        addDependency(
          "asset-nonexistent",
          "asset-b",
          "COMMUNICATES_WITH",
          "HARD",
          undefined,
          "org-1",
          "user-1",
        ),
      ).rejects.toThrow();
    });

    it("throws error when target asset does not exist", async () => {
      vi.mocked(prisma.asset.findFirst)
        .mockResolvedValueOnce(mockAssetA as never) // source found
        .mockResolvedValueOnce(null); // target not found

      await expect(
        addDependency(
          "asset-a",
          "asset-nonexistent",
          "COMMUNICATES_WITH",
          "HARD",
          undefined,
          "org-1",
          "user-1",
        ),
      ).rejects.toThrow();
    });

    it("rejects circular dependency: A→B→C→A", async () => {
      // A→B and B→C already exist; trying to add C→A would create cycle
      vi.mocked(prisma.asset.findFirst)
        .mockResolvedValueOnce(mockAssetC as never) // source C
        .mockResolvedValueOnce(mockAssetA as never); // target A

      // Circularity check: BFS from target (A)
      // A's outgoing dependencies → B
      // B's outgoing dependencies → C
      // C is the source, so cycle detected
      vi.mocked(prisma.assetDependency.findMany)
        .mockResolvedValueOnce([
          // A→B
          { targetAssetId: "asset-b" },
        ] as never)
        .mockResolvedValueOnce([
          // B→C
          { targetAssetId: "asset-c" },
        ] as never)
        .mockResolvedValueOnce([] as never); // C→nothing

      await expect(
        addDependency(
          "asset-c", // source = C
          "asset-a", // target = A
          "REQUIRES",
          "HARD",
          undefined,
          "org-1",
          "user-1",
        ),
      ).rejects.toThrow("Circular dependency detected");
    });

    it("does NOT reject when no cycle exists", async () => {
      // A→B exists; adding A→C should be fine
      vi.mocked(prisma.asset.findFirst)
        .mockResolvedValueOnce(mockAssetA as never)
        .mockResolvedValueOnce(mockAssetC as never);

      // BFS from C finds nothing → no path back to A
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      vi.mocked(prisma.assetDependency.create).mockResolvedValue({
        ...mockDependency,
        id: "dep-2",
        targetAssetId: "asset-c",
      } as never);

      const result = await addDependency(
        "asset-a",
        "asset-c",
        "CONTROLLED_BY",
        "SOFT",
        undefined,
        "org-1",
        "user-1",
      );

      expect(result).toBeDefined();
      expect(prisma.assetDependency.create).toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // removeDependency
  // ─────────────────────────────────────────────────────────────────────────

  describe("removeDependency", () => {
    it("deletes the dependency and logs audit event", async () => {
      const depWithSource = {
        ...mockDependency,
        sourceAsset: mockAssetA,
      };

      vi.mocked(prisma.assetDependency.findFirst).mockResolvedValue(
        depWithSource as never,
      );
      vi.mocked(prisma.assetDependency.delete).mockResolvedValue(
        depWithSource as never,
      );

      await removeDependency("dep-1", "org-1", "user-1");

      expect(prisma.assetDependency.delete).toHaveBeenCalledWith({
        where: { id: "dep-1" },
      });

      expect(logAuditEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          action: "nexus_dependency_removed",
          entityType: "nexus_dependency",
          entityId: "dep-1",
          userId: "user-1",
          organizationId: "org-1",
        }),
      );
    });

    it("throws error when dependency does not exist", async () => {
      vi.mocked(prisma.assetDependency.findFirst).mockResolvedValue(null);

      await expect(
        removeDependency("dep-nonexistent", "org-1", "user-1"),
      ).rejects.toThrow();
    });

    it("throws error when dependency belongs to different org", async () => {
      const depOtherOrg = {
        ...mockDependency,
        sourceAsset: { ...mockAssetA, organizationId: "org-other" },
      };

      vi.mocked(prisma.assetDependency.findFirst).mockResolvedValue(null); // not found for this org

      await expect(
        removeDependency("dep-1", "org-1", "user-1"),
      ).rejects.toThrow();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDependenciesForAsset
  // ─────────────────────────────────────────────────────────────────────────

  describe("getDependenciesForAsset", () => {
    it("returns both dependenciesFrom and dependenciesTo for the asset", async () => {
      const depsFrom = [
        {
          ...mockDependency,
          sourceAssetId: "asset-a",
          targetAsset: mockAssetB,
        },
      ];
      const depsTo = [
        {
          ...mockDependency,
          id: "dep-2",
          sourceAssetId: "asset-c",
          targetAssetId: "asset-a",
          sourceAsset: mockAssetC,
        },
      ];

      vi.mocked(prisma.assetDependency.findMany)
        .mockResolvedValueOnce(depsFrom as never) // dependenciesFrom
        .mockResolvedValueOnce(depsTo as never); // dependenciesTo

      const result = await getDependenciesForAsset("asset-a", "org-1");

      expect(result).toHaveProperty("dependenciesFrom");
      expect(result).toHaveProperty("dependenciesTo");
      expect(result.dependenciesFrom).toEqual(depsFrom);
      expect(result.dependenciesTo).toEqual(depsTo);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getImpactAnalysis
  // ─────────────────────────────────────────────────────────────────────────

  describe("getImpactAnalysis", () => {
    it("returns DIRECT dependents at level 0", async () => {
      // B depends on A (B→A means A is the target; we look for who depends ON A)
      // BFS from A following dependenciesTo: assets where targetAssetId = A
      // Level 0: direct dependents of A = [B]
      const directDeps = [
        {
          sourceAssetId: "asset-b",
          targetAssetId: "asset-a",
          dependencyType: "REQUIRES",
          strength: "HARD",
          sourceAsset: mockAssetB,
        },
      ];

      vi.mocked(prisma.assetDependency.findMany)
        .mockResolvedValueOnce(directDeps as never) // who depends on A (level 0)
        .mockResolvedValueOnce([] as never); // who depends on B (level 1) — none

      const results = await getImpactAnalysis("asset-a", "org-1");

      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        assetId: "asset-b",
        assetName: "TTC Uplink Beta",
        impactLevel: "DIRECT",
        dependencyType: "REQUIRES",
        strength: "HARD",
      });
    });

    it("returns INDIRECT_1HOP dependents at level 1", async () => {
      // C depends on B which depends on A
      // BFS: level 0 → B (DIRECT), level 1 → C (INDIRECT_1HOP).
      //
      // The impact-analysis engine was refactored to fetch ALL org
      // dependencies in a single findMany call and build an in-memory
      // adjacency map (dependency-service.server.ts:191). The test
      // accordingly returns the full edge list in one shot rather than
      // mocking per-node calls.
      const allDeps = [
        {
          sourceAssetId: "asset-b",
          targetAssetId: "asset-a",
          dependencyType: "REQUIRES",
          strength: "HARD",
          sourceAsset: mockAssetB,
        },
        {
          sourceAssetId: "asset-c",
          targetAssetId: "asset-b",
          dependencyType: "COMMUNICATES_WITH",
          strength: "SOFT",
          sourceAsset: mockAssetC,
        },
      ];

      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue(
        allDeps as never,
      );

      const results = await getImpactAnalysis("asset-a", "org-1");

      expect(results).toHaveLength(2);

      const direct = results.find((r) => r.assetId === "asset-b");
      const indirect1 = results.find((r) => r.assetId === "asset-c");

      expect(direct?.impactLevel).toBe("DIRECT");
      expect(indirect1?.impactLevel).toBe("INDIRECT_1HOP");
    });

    it("returns INDIRECT_2HOP dependents at level 2", async () => {
      // D depends on C which depends on B which depends on A.
      // Single findMany returns the full edge list (refactor 2026-04).
      const mockAssetD = {
        id: "asset-d",
        name: "Asset D",
        assetType: "GROUND_SOFTWARE",
        category: "SOFTWARE_DATA",
      };

      const allDeps = [
        {
          sourceAssetId: "asset-b",
          targetAssetId: "asset-a",
          dependencyType: "REQUIRES",
          strength: "HARD",
          sourceAsset: mockAssetB,
        },
        {
          sourceAssetId: "asset-c",
          targetAssetId: "asset-b",
          dependencyType: "COMMUNICATES_WITH",
          strength: "SOFT",
          sourceAsset: mockAssetC,
        },
        {
          sourceAssetId: "asset-d",
          targetAssetId: "asset-c",
          dependencyType: "REQUIRES",
          strength: "HARD",
          sourceAsset: mockAssetD,
        },
      ];

      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue(
        allDeps as never,
      );

      const results = await getImpactAnalysis("asset-a", "org-1");

      const hop2 = results.find((r) => r.assetId === "asset-d");
      expect(hop2?.impactLevel).toBe("INDIRECT_2HOP");
    });

    it("skips REDUNDANT strength edges in BFS", async () => {
      const redundantDeps = [
        {
          sourceAssetId: "asset-b",
          targetAssetId: "asset-a",
          dependencyType: "REQUIRES",
          strength: "REDUNDANT",
          sourceAsset: mockAssetB,
        },
      ];

      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue(
        redundantDeps as never,
      );

      const results = await getImpactAnalysis("asset-a", "org-1");

      // REDUNDANT edges should be skipped
      expect(results).toHaveLength(0);
    });

    it("returns empty array when no one depends on the asset", async () => {
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const results = await getImpactAnalysis("asset-a", "org-1");
      expect(results).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getSinglePointsOfFailure
  // ─────────────────────────────────────────────────────────────────────────

  describe("getSinglePointsOfFailure", () => {
    it("identifies assets with HARD dependency but no REDUNDANT backup", async () => {
      // Asset B has a HARD dependency from A (A depends on B), no REDUNDANT → SPOF
      const hardDeps = [
        {
          id: "dep-1",
          sourceAssetId: "asset-a",
          targetAssetId: "asset-b",
          strength: "HARD",
          dependencyType: "REQUIRES",
          targetAsset: mockAssetB,
          sourceAsset: mockAssetA,
        },
      ];

      vi.mocked(prisma.assetDependency.findMany)
        .mockResolvedValueOnce(hardDeps as never) // all HARD deps
        .mockResolvedValueOnce([] as never); // no REDUNDANT deps for asset-b from asset-a

      const spofs = await getSinglePointsOfFailure("org-1");

      expect(spofs.length).toBeGreaterThan(0);
      const spof = spofs.find((s) => s.assetId === "asset-b");
      expect(spof).toBeDefined();
    });

    it("does NOT flag assets that have a REDUNDANT backup", async () => {
      const hardDeps = [
        {
          id: "dep-1",
          sourceAssetId: "asset-a",
          targetAssetId: "asset-b",
          strength: "HARD",
          dependencyType: "REQUIRES",
          targetAsset: mockAssetB,
          sourceAsset: mockAssetA,
        },
      ];
      const redundantDeps = [
        {
          id: "dep-2",
          sourceAssetId: "asset-a",
          targetAssetId: "asset-b",
          strength: "REDUNDANT",
          dependencyType: "REQUIRES",
          targetAsset: mockAssetB,
          sourceAsset: mockAssetA,
        },
      ];

      vi.mocked(prisma.assetDependency.findMany)
        .mockResolvedValueOnce(hardDeps as never)
        .mockResolvedValueOnce(redundantDeps as never); // REDUNDANT exists → not SPOF

      const spofs = await getSinglePointsOfFailure("org-1");

      expect(spofs).toHaveLength(0);
    });

    it("returns empty array when no HARD dependencies exist", async () => {
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const spofs = await getSinglePointsOfFailure("org-1");
      expect(spofs).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // getDependencyGraph
  // ─────────────────────────────────────────────────────────────────────────

  describe("getDependencyGraph", () => {
    it("returns nodes and edges for the organization", async () => {
      const assets = [mockAssetA, mockAssetB, mockAssetC];
      const deps = [mockDependency];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue(
        deps as never,
      );

      const graph = await getDependencyGraph("org-1");

      expect(graph).toHaveProperty("nodes");
      expect(graph).toHaveProperty("edges");

      expect(graph.nodes).toHaveLength(3);
      expect(graph.edges).toHaveLength(1);

      // Check node shape
      const nodeA = graph.nodes.find((n) => n.id === "asset-a");
      expect(nodeA).toMatchObject({
        id: "asset-a",
        name: "Spacecraft Alpha",
      });

      // Check edge shape
      expect(graph.edges[0]).toMatchObject({
        source: "asset-a",
        target: "asset-b",
        type: "COMMUNICATES_WITH",
        strength: "HARD",
      });
    });

    it("returns empty nodes and edges when org has no assets", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const graph = await getDependencyGraph("org-1");

      expect(graph.nodes).toHaveLength(0);
      expect(graph.edges).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // autoDetectDependencies
  // ─────────────────────────────────────────────────────────────────────────

  describe("autoDetectDependencies", () => {
    it("suggests SPACECRAFT→TTC_UPLINK (COMMUNICATES_WITH) dependencies", async () => {
      const assets = [mockAssetA, mockAssetB]; // A=SPACECRAFT, B=TTC_UPLINK

      vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never); // no existing deps

      const suggestions = await autoDetectDependencies("org-1");

      const spacecraftToUplink = suggestions.find(
        (s) =>
          s.sourceAssetId === "asset-a" &&
          s.targetAssetId === "asset-b" &&
          s.dependencyType === "COMMUNICATES_WITH",
      );

      expect(spacecraftToUplink).toBeDefined();
    });

    it("suggests SPACECRAFT→GROUND_STATION (CONTROLLED_BY) dependency", async () => {
      const assets = [mockAssetA, mockAssetC]; // A=SPACECRAFT, C=GROUND_STATION

      vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const suggestions = await autoDetectDependencies("org-1");

      const spacecraftToGround = suggestions.find(
        (s) =>
          s.sourceAssetId === "asset-a" &&
          s.targetAssetId === "asset-c" &&
          s.dependencyType === "CONTROLLED_BY",
      );

      expect(spacecraftToGround).toBeDefined();
    });

    it("suggests SPACECRAFT→FLIGHT_SOFTWARE (REQUIRES) dependency", async () => {
      const flightSw = {
        id: "asset-fsw",
        organizationId: "org-1",
        name: "Flight SW",
        assetType: "FLIGHT_SOFTWARE",
        category: "SOFTWARE_DATA",
        isDeleted: false,
      };

      vi.mocked(prisma.asset.findMany).mockResolvedValue([
        mockAssetA,
        flightSw,
      ] as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const suggestions = await autoDetectDependencies("org-1");

      const spacecraftToFsw = suggestions.find(
        (s) =>
          s.sourceAssetId === "asset-a" &&
          s.targetAssetId === "asset-fsw" &&
          s.dependencyType === "REQUIRES",
      );

      expect(spacecraftToFsw).toBeDefined();
    });

    it("suggests GROUND_STATION→GROUND_SOFTWARE (REQUIRES) dependency", async () => {
      const groundSw = {
        id: "asset-gsw",
        organizationId: "org-1",
        name: "Ground Control SW",
        assetType: "GROUND_SOFTWARE",
        category: "SOFTWARE_DATA",
        isDeleted: false,
      };

      vi.mocked(prisma.asset.findMany).mockResolvedValue([
        mockAssetC,
        groundSw,
      ] as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const suggestions = await autoDetectDependencies("org-1");

      const groundToSw = suggestions.find(
        (s) =>
          s.sourceAssetId === "asset-c" &&
          s.targetAssetId === "asset-gsw" &&
          s.dependencyType === "REQUIRES",
      );

      expect(groundToSw).toBeDefined();
    });

    it("does not suggest dependencies that already exist", async () => {
      const assets = [mockAssetA, mockAssetB]; // A=SPACECRAFT, B=TTC_UPLINK

      const existingDep = {
        sourceAssetId: "asset-a",
        targetAssetId: "asset-b",
        dependencyType: "COMMUNICATES_WITH",
      };

      vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([
        existingDep,
      ] as never);

      const suggestions = await autoDetectDependencies("org-1");

      // Should NOT suggest A→B:COMMUNICATES_WITH because it already exists
      const duplicate = suggestions.find(
        (s) =>
          s.sourceAssetId === "asset-a" &&
          s.targetAssetId === "asset-b" &&
          s.dependencyType === "COMMUNICATES_WITH",
      );

      expect(duplicate).toBeUndefined();
    });

    it("returns empty array when org has no assets", async () => {
      vi.mocked(prisma.asset.findMany).mockResolvedValue([] as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const suggestions = await autoDetectDependencies("org-1");
      expect(suggestions).toHaveLength(0);
    });

    it("suggestion includes sourceAssetName, targetAssetName, and reason", async () => {
      const assets = [mockAssetA, mockAssetB];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(assets as never);
      vi.mocked(prisma.assetDependency.findMany).mockResolvedValue([] as never);

      const suggestions = await autoDetectDependencies("org-1");

      expect(suggestions.length).toBeGreaterThan(0);
      const suggestion = suggestions[0];
      expect(suggestion).toHaveProperty("sourceAssetName");
      expect(suggestion).toHaveProperty("targetAssetName");
      expect(suggestion).toHaveProperty("reason");
      expect(typeof suggestion.reason).toBe("string");
    });
  });
});
