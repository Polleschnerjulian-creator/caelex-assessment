/**
 * Tests for the Orbis UBO data layer (Sprint Z9b).
 *
 * Fixture-driven only — the mock adapter never makes network calls.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect, afterEach } from "vitest";
import {
  mockOrbisUboAdapter,
  getOrbisUboAdapter,
  unconfiguredUboAdapter,
  UboSourceNotConfiguredError,
  computeTreeDepth,
  listAncestors,
  OrbisEntityNotFoundError,
  OrbisAuthError,
  ORBIS_FIXTURES,
  type UboTree,
} from "./orbis-ubo";

describe("OrbisEntityNotFoundError", () => {
  it("attaches the entity id", () => {
    const err = new OrbisEntityNotFoundError("ZZ99999999");
    expect(err.entityId).toBe("ZZ99999999");
    expect(err.message).toContain("ZZ99999999");
    expect(err.name).toBe("OrbisEntityNotFoundError");
  });
});

describe("OrbisAuthError", () => {
  it("has the expected name + message", () => {
    const err = new OrbisAuthError();
    expect(err.name).toBe("OrbisAuthError");
    expect(err.message).toContain("ORBIS_API_KEY");
  });
});

describe("mockOrbisUboAdapter.fetchUboTree", () => {
  it("returns the clean 3-level chain for DE12345678", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("DE12345678");
    expect(tree.rootEntityId).toBe("DE12345678");
    expect(tree.nodes).toHaveLength(4);
    expect(tree.edges).toHaveLength(3);
    expect(tree.depth).toBe(3);
    expect(tree.confidence).toBeGreaterThan(0.9);
  });

  it("returns sanctioned-UBO chain for RU98765432 with sanctioned flag", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("RU98765432");
    const ubo = tree.nodes.find((n) => n.kind === "person");
    expect(ubo).toBeDefined();
    expect(ubo?.isSanctioned).toBe(true);
    expect(ubo?.isPep).toBe(true);
  });

  it("returns diamond ownership (one UBO reaches root via two paths)", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("GB55667788");
    // Two edges from the UBO into different intermediates
    const ubo = "ORBIS-PERSON-diamond";
    const fromUbo = tree.edges.filter((e) => e.ownerId === ubo);
    expect(fromUbo).toHaveLength(2);
  });

  it("returns control-without-equity edge for US44556677 trustee fixture", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("US44556677");
    expect(tree.edges[0].controlType).toBe("control_no_equity");
    expect(tree.edges[0].percent).toBe(0);
  });

  it("returns root-only tree for FR12121212 (no ownership data)", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("FR12121212");
    expect(tree.nodes).toHaveLength(1);
    expect(tree.edges).toHaveLength(0);
    expect(tree.depth).toBe(0);
  });

  it("filters redacted nodes by default", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("AT88990011");
    expect(tree.nodes.every((n) => n.kind !== "unknown")).toBe(true);
    // The single edge referenced the redacted node, so it should also drop
    expect(tree.edges).toHaveLength(0);
  });

  it("includes redacted nodes when includeRedacted=true", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("AT88990011", {
      includeRedacted: true,
    });
    expect(tree.nodes.some((n) => n.kind === "unknown")).toBe(true);
    expect(tree.edges).toHaveLength(1);
  });

  it("throws OrbisEntityNotFoundError for unknown entity", async () => {
    await expect(
      mockOrbisUboAdapter.fetchUboTree("ZZ99999999"),
    ).rejects.toBeInstanceOf(OrbisEntityNotFoundError);
  });

  it("caps maxDepth at the API-side hard limit of 10", async () => {
    const tree = await mockOrbisUboAdapter.fetchUboTree("DE12345678", {
      maxDepth: 100,
    });
    // Fixture's natural depth is 3 — no truncation needed; still returns 3
    expect(tree.depth).toBe(3);
  });

  it("truncates deep trees when maxDepth is shorter than fixture", async () => {
    // The DE12345678 fixture has depth 3. Truncating to depth 1 should
    // drop the LU node + the edge above NL.
    const tree = await mockOrbisUboAdapter.fetchUboTree("DE12345678", {
      maxDepth: 1,
    });
    expect(tree.depth).toBe(1);
    // Should still contain the root + its direct owner only
    const nodeIds = tree.nodes.map((n) => n.id).sort();
    expect(nodeIds).toContain("ORBIS-DE-12345678");
    expect(nodeIds).toContain("ORBIS-NL-22334455");
    expect(nodeIds).not.toContain("ORBIS-LU-99887766");
  });
});

describe("computeTreeDepth", () => {
  it("returns 0 for root-only tree", () => {
    expect(computeTreeDepth(ORBIS_FIXTURES["FR12121212"])).toBe(0);
  });

  it("returns 3 for 3-level chain fixture", () => {
    expect(computeTreeDepth(ORBIS_FIXTURES["DE12345678"])).toBe(3);
  });

  it("returns 2 for the sanctioned-UBO Cyprus chain", () => {
    expect(computeTreeDepth(ORBIS_FIXTURES["RU98765432"])).toBe(2);
  });

  it("returns 2 for diamond ownership (depth from leaf to UBO)", () => {
    expect(computeTreeDepth(ORBIS_FIXTURES["GB55667788"])).toBe(2);
  });

  it("survives cycles (which shouldn't happen but we guard anyway)", () => {
    const cyclic: UboTree = {
      rootEntityId: "A",
      nodes: [
        { id: "A", kind: "entity", name: "A", countryCode: "DE" },
        { id: "B", kind: "entity", name: "B", countryCode: "DE" },
      ],
      edges: [
        { ownerId: "B", ownedId: "A", percent: 1, controlType: "economic" },
        { ownerId: "A", ownedId: "B", percent: 1, controlType: "economic" }, // cycle
      ],
      depth: 1,
      fetchedAt: "2026-05-22T10:00:00.000Z",
      confidence: 1.0,
    };
    expect(() => computeTreeDepth(cyclic)).not.toThrow();
    expect(computeTreeDepth(cyclic)).toBe(1);
  });
});

describe("listAncestors", () => {
  it("returns empty list for root-only tree", () => {
    expect(listAncestors(ORBIS_FIXTURES["FR12121212"])).toEqual([]);
  });

  it("lists every ancestor in BFS order for clean chain", () => {
    const tree = ORBIS_FIXTURES["DE12345678"];
    const ancestors = listAncestors(tree);
    expect(ancestors.map((a) => a.id)).toEqual([
      "ORBIS-NL-22334455",
      "ORBIS-LU-99887766",
      "ORBIS-PERSON-abc123",
    ]);
  });

  it("dedupes diamond-path ancestors (same UBO via two paths)", () => {
    const tree = ORBIS_FIXTURES["GB55667788"];
    const ancestors = listAncestors(tree);
    const uboCount = ancestors.filter(
      (a) => a.id === "ORBIS-PERSON-diamond",
    ).length;
    expect(uboCount).toBe(1);
  });

  it("includes sanctioned ancestor for sanctioned-chain fixture", () => {
    const tree = ORBIS_FIXTURES["RU98765432"];
    const ancestors = listAncestors(tree);
    const sanctioned = ancestors.find((a) => a.isSanctioned);
    expect(sanctioned).toBeDefined();
    expect(sanctioned?.name).toBe("Sanctioned Oligarch");
  });
});

describe("getOrbisUboAdapter — fixtures only in test/dev, unconfigured in prod", () => {
  const savedNodeEnv = process.env.NODE_ENV;
  const savedFixtures = process.env.UBO_USE_FIXTURES;
  afterEach(() => {
    process.env.NODE_ENV = savedNodeEnv;
    if (savedFixtures === undefined) delete process.env.UBO_USE_FIXTURES;
    else process.env.UBO_USE_FIXTURES = savedFixtures;
  });

  it("returns the mock adapter under NODE_ENV=test", () => {
    process.env.NODE_ENV = "test";
    delete process.env.UBO_USE_FIXTURES;
    expect(getOrbisUboAdapter().name).toBe("mock");
  });

  it("returns the mock adapter when UBO_USE_FIXTURES=1 (explicit local dev)", () => {
    process.env.NODE_ENV = "development";
    process.env.UBO_USE_FIXTURES = "1";
    expect(getOrbisUboAdapter().name).toBe("mock");
  });

  it("returns the UNCONFIGURED adapter in production with no fixtures flag — never serves fabricated trees", () => {
    process.env.NODE_ENV = "production";
    delete process.env.UBO_USE_FIXTURES;
    expect(getOrbisUboAdapter().name).toBe("unconfigured");
  });

  it("the unconfigured adapter throws on a fixture-keyed id (a real party can no longer get a fabricated tree)", async () => {
    // "RU98765432" is a fixture key with a sanctioned UBO. The unconfigured
    // adapter must NOT serve it — it throws instead of fabricating a hit.
    await expect(
      unconfiguredUboAdapter.fetchUboTree("RU98765432"),
    ).rejects.toBeInstanceOf(UboSourceNotConfiguredError);
  });

  it("returned adapter satisfies the OrbisUboAdapter contract (test env → mock)", async () => {
    process.env.NODE_ENV = "test";
    delete process.env.UBO_USE_FIXTURES;
    const adapter = getOrbisUboAdapter();
    expect(typeof adapter.fetchUboTree).toBe("function");
    const tree = await adapter.fetchUboTree("DE12345678");
    expect(tree.rootEntityId).toBe("DE12345678");
  });
});

describe("Fixture contract guards", () => {
  it("every fixture has its rootEntityId resolvable to a node", () => {
    for (const [key, tree] of Object.entries(ORBIS_FIXTURES)) {
      const matchByBvd = tree.nodes.find((n) => n.bvdId === tree.rootEntityId);
      const matchById = tree.nodes.find((n) => n.id === tree.rootEntityId);
      expect(
        matchByBvd || matchById,
        `fixture ${key} root not found in nodes`,
      ).toBeTruthy();
    }
  });

  it("every edge references existing node ids", () => {
    for (const [key, tree] of Object.entries(ORBIS_FIXTURES)) {
      const nodeIds = new Set(tree.nodes.map((n) => n.id));
      for (const edge of tree.edges) {
        expect(
          nodeIds.has(edge.ownerId),
          `fixture ${key}: missing owner ${edge.ownerId}`,
        ).toBe(true);
        expect(
          nodeIds.has(edge.ownedId),
          `fixture ${key}: missing owned ${edge.ownedId}`,
        ).toBe(true);
      }
    }
  });

  it("every percent is in [0, 1]", () => {
    for (const [key, tree] of Object.entries(ORBIS_FIXTURES)) {
      for (const edge of tree.edges) {
        expect(
          edge.percent >= 0 && edge.percent <= 1,
          `fixture ${key}: percent out of range`,
        ).toBe(true);
      }
    }
  });
});
