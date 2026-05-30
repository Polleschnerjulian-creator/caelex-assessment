/**
 * Tests for cross-screening pure functions (Sprint Z9c).
 *
 * Covers the merge logic between TradePartyOwnership-derived edges and
 * Orbis UBO trees, plus the chip-status derivation.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  isUboAncestorId,
  mergeUboTreeIntoCascade,
  uboChipStatus,
  uboEdgeToCascadeEdge,
  uboNodeToAncestorSummary,
  UBO_NAMESPACE_PREFIX,
  type UboResolutionSummary,
} from "./cross-screening";
import { ORBIS_FIXTURES } from "./sources/orbis-ubo";
import { analyzeCascade } from "./cascade-50pct";
import type { AncestorSummary, OwnershipEdgeSummary } from "./cascade-50pct";
import type { TradeScreeningStatus } from "@prisma/client";

// ─── Helpers ────────────────────────────────────────────────────────

function makeSummary(
  id: string,
  overrides?: Partial<AncestorSummary>,
): AncestorSummary {
  return {
    id,
    legalName: id,
    countryCode: "DE",
    screeningStatus: "CLEAR" as TradeScreeningStatus,
    isBlocked: false,
    ...overrides,
  };
}

// ─── isUboAncestorId ────────────────────────────────────────────────

describe("isUboAncestorId", () => {
  it("returns true for namespaced UBO ids", () => {
    expect(isUboAncestorId(`${UBO_NAMESPACE_PREFIX}ORBIS-DE-12345678`)).toBe(
      true,
    );
  });

  it("returns false for plain TradeParty CUIDs", () => {
    expect(isUboAncestorId("clxabc123def456")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isUboAncestorId("")).toBe(false);
  });
});

// ─── uboNodeToAncestorSummary ───────────────────────────────────────

describe("uboNodeToAncestorSummary", () => {
  it("maps sanctioned UBO node to CONFIRMED_HIT + blocked", () => {
    const node = ORBIS_FIXTURES["RU98765432"].nodes.find(
      (n) => n.isSanctioned === true,
    )!;
    const summary = uboNodeToAncestorSummary(node);
    expect(summary.screeningStatus).toBe("CONFIRMED_HIT");
    expect(summary.isBlocked).toBe(true);
    expect(summary.id.startsWith(UBO_NAMESPACE_PREFIX)).toBe(true);
  });

  it("maps clean UBO node to CLEAR + not blocked", () => {
    const node = ORBIS_FIXTURES["DE12345678"].nodes[1]; // NL Holdings — not sanctioned
    const summary = uboNodeToAncestorSummary(node);
    expect(summary.screeningStatus).toBe("CLEAR");
    expect(summary.isBlocked).toBe(false);
  });

  it("preserves legal name + country code", () => {
    const node = ORBIS_FIXTURES["DE12345678"].nodes[1];
    const summary = uboNodeToAncestorSummary(node);
    expect(summary.legalName).toBe(node.name);
    expect(summary.countryCode).toBe(node.countryCode);
  });
});

// ─── uboEdgeToCascadeEdge ───────────────────────────────────────────

describe("uboEdgeToCascadeEdge", () => {
  it("namespaces both owner and owned when neither is root", () => {
    const edge = {
      ownerId: "ORBIS-LU-99887766",
      ownedId: "ORBIS-NL-22334455",
      percent: 0.75,
      controlType: "economic" as const,
    };
    const result = uboEdgeToCascadeEdge(
      edge,
      "ORBIS-DE-12345678",
      "real-party-id",
    );
    expect(result.ownerId).toBe(`${UBO_NAMESPACE_PREFIX}ORBIS-LU-99887766`);
    expect(result.ownedId).toBe(`${UBO_NAMESPACE_PREFIX}ORBIS-NL-22334455`);
    expect(result.percent).toBe(0.75);
    expect(result.controlType).toBe("economic");
  });

  it("bridges the root-owned edge onto the real TradeParty id", () => {
    const edge = {
      ownerId: "ORBIS-NL-22334455",
      ownedId: "ORBIS-DE-12345678", // root
      percent: 1.0,
      controlType: "economic" as const,
    };
    const result = uboEdgeToCascadeEdge(
      edge,
      "ORBIS-DE-12345678",
      "real-party-id",
    );
    expect(result.ownerId).toBe(`${UBO_NAMESPACE_PREFIX}ORBIS-NL-22334455`);
    expect(result.ownedId).toBe("real-party-id");
  });
});

// ─── mergeUboTreeIntoCascade ────────────────────────────────────────

describe("mergeUboTreeIntoCascade — no UBO data", () => {
  it("returns base cascade input unchanged with resolved=false", () => {
    const baseEdges: OwnershipEdgeSummary[] = [
      { ownerId: "A", ownedId: "B", percent: 0.6, controlType: "economic" },
    ];
    const baseSummaries = new Map([
      ["A", makeSummary("A")],
      ["B", makeSummary("B")],
    ]);
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      null,
      "B",
      "mock",
    );
    expect(result.edges).toEqual(baseEdges);
    expect(result.partySummaries.size).toBe(2);
    expect(result.uboSummary.resolved).toBe(false);
    expect(result.uboSummary.depth).toBe(0);
  });

  it("does NOT mutate the input summaries map", () => {
    const baseSummaries = new Map([["A", makeSummary("A")]]);
    mergeUboTreeIntoCascade([], baseSummaries, null, "x", "mock");
    expect(baseSummaries.size).toBe(1); // still just A
  });
});

describe("mergeUboTreeIntoCascade — clean 3-level chain (DE12345678)", () => {
  const tree = ORBIS_FIXTURES["DE12345678"];

  it("adds 3 UBO ancestor summaries (skips root)", () => {
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-de-party",
      "mock",
    );
    // 4 nodes total, root excluded = 3
    const uboSummaries = Array.from(result.partySummaries.values()).filter(
      (s) => isUboAncestorId(s.id),
    );
    expect(uboSummaries).toHaveLength(3);
  });

  it("bridges the leaf edge onto the real target party id", () => {
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-de-party",
      "mock",
    );
    const leafEdge = result.edges.find((e) => e.ownedId === "real-de-party");
    expect(leafEdge).toBeDefined();
    expect(leafEdge?.percent).toBe(1.0);
    expect(leafEdge?.ownerId.startsWith(UBO_NAMESPACE_PREFIX)).toBe(true);
  });

  it("reports depth=3, nodeCount=4, edgeCount=3 in uboSummary", () => {
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-de-party",
      "mock",
    );
    expect(result.uboSummary.depth).toBe(3);
    expect(result.uboSummary.nodeCount).toBe(4);
    expect(result.uboSummary.edgeCount).toBe(3);
    expect(result.uboSummary.sanctionedAncestorCount).toBe(0);
  });

  it("flows through to analyzeCascade with no cascade hit (clean chain)", () => {
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-de-party",
      "mock",
    );
    const cascade = analyzeCascade({
      targetPartyId: "real-de-party",
      edges: result.edges,
      partySummaries: result.partySummaries,
    });
    expect(cascade.cascadeHit).toBe(false);
    expect(cascade.ancestors.length).toBeGreaterThan(0);
  });
});

describe("mergeUboTreeIntoCascade — sanctioned UBO triggers cascade", () => {
  const tree = ORBIS_FIXTURES["RU98765432"];

  it("marks the sanctioned ancestor as CONFIRMED_HIT", () => {
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-ru-party",
      "mock",
    );
    const sanctionedSummary = Array.from(result.partySummaries.values()).find(
      (s) => s.legalName === "Sanctioned Oligarch",
    );
    expect(sanctionedSummary?.screeningStatus).toBe("CONFIRMED_HIT");
    expect(sanctionedSummary?.isBlocked).toBe(true);
  });

  it("triggers cascade hit via 55% sanctioned ownership chain", () => {
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-ru-party",
      "mock",
    );
    const cascade = analyzeCascade({
      targetPartyId: "real-ru-party",
      edges: result.edges,
      partySummaries: result.partySummaries,
    });
    // 100% × 55% = 55% sanctioned ownership → cascadeHit
    expect(cascade.cascadeHit).toBe(true);
    expect(cascade.aggregateSanctionedOwnership).toBeCloseTo(0.55, 3);
    expect(cascade.sanctionedAncestorCount).toBe(1);
  });

  it("reports 1 sanctioned + 1 PEP ancestor in uboSummary", () => {
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-ru-party",
      "mock",
    );
    expect(result.uboSummary.sanctionedAncestorCount).toBe(1);
    expect(result.uboSummary.pepAncestorCount).toBe(1);
  });
});

describe("mergeUboTreeIntoCascade — control-without-equity", () => {
  it("preserves controlType through the merge for OFAC trustee doctrine", () => {
    const tree = ORBIS_FIXTURES["US44556677"];
    const result = mergeUboTreeIntoCascade(
      [],
      new Map(),
      tree,
      "real-us-party",
      "mock",
    );
    const edge = result.edges[0];
    expect(edge.controlType).toBe("control_no_equity");
    // The cascade engine intentionally EXCLUDES control_no_equity edges
    // from the 50%-rule aggregation — they're surfaced separately.
    const cascade = analyzeCascade({
      targetPartyId: "real-us-party",
      edges: result.edges,
      partySummaries: result.partySummaries,
    });
    expect(cascade.cascadeHit).toBe(false);
    expect(cascade.aggregateSanctionedOwnership).toBe(0);
  });
});

describe("mergeUboTreeIntoCascade — merges with existing TradePartyOwnership", () => {
  it("preserves all base edges while appending UBO edges", () => {
    const baseEdges: OwnershipEdgeSummary[] = [
      {
        ownerId: "extra-real-owner",
        ownedId: "real-de-party",
        percent: 0.3,
        controlType: "economic",
      },
    ];
    const baseSummaries = new Map([
      ["real-de-party", makeSummary("real-de-party")],
      ["extra-real-owner", makeSummary("extra-real-owner")],
    ]);
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      ORBIS_FIXTURES["DE12345678"],
      "real-de-party",
      "mock",
    );
    // 1 base edge + 3 UBO edges (from the 3-level fixture)
    expect(result.edges).toHaveLength(4);
    // Base edge preserved
    expect(
      result.edges.some(
        (e) =>
          e.ownerId === "extra-real-owner" && e.ownedId === "real-de-party",
      ),
    ).toBe(true);
  });

  it("real party always wins on summary-id collision", () => {
    // Construct a base summary that uses the same id we'd generate.
    const collidingId = `${UBO_NAMESPACE_PREFIX}ORBIS-NL-22334455`;
    const realSummary = makeSummary(collidingId, { legalName: "REAL_WINS" });
    const baseSummaries = new Map([[collidingId, realSummary]]);
    const result = mergeUboTreeIntoCascade(
      [],
      baseSummaries,
      ORBIS_FIXTURES["DE12345678"],
      "real-de-party",
      "mock",
    );
    expect(result.partySummaries.get(collidingId)?.legalName).toBe("REAL_WINS");
  });
});

// ─── mergeUboTreeIntoCascade — UBO identity reconciliation (T-M2) ───

describe("mergeUboTreeIntoCascade — dedup UBO nodes against existing parties (T-M2)", () => {
  /**
   * Scenario: the same beneficial owner appears BOTH as a real declared
   * TradeParty (already in baseSummaries with a real CUID id) AND as a
   * non-root UBO node in the Orbis tree. Before T-M2 the merge created
   * a second UBO:: entry with a different id, causing the cascade to see
   * TWO edges from the same owner (one real, one synthetic) and sum their
   * stakes — a false positive.
   *
   * The entity "Shared Holding B.V." (normalised: "shared holding") is:
   *   - real party id "real-shared-owner" with a 30% economic edge to target
   *   - non-root UBO node "ORBIS-NL-SHARED" with a 30% economic edge to target
   *
   * After reconciliation by normalised name:
   *   - Only ONE summary for "real-shared-owner" (UBO:: suppressed)
   *   - The UBO edge is remapped to "real-shared-owner" (no duplicate)
   *   - The cascade sees ≤ 30% from this owner, NOT 60%
   */
  const TARGET_ID = "target-party-id";
  const SHARED_OWNER_ID = "real-shared-owner";
  const SHARED_OWNER_NAME = "Shared Holding B.V.";

  // Minimal UBO tree: root = target, one non-root node = the shared owner.
  // Country code is "NL" on BOTH the UBO node AND the base summary so the
  // full-name+country identity key matches (same legal entity, same jurisdiction).
  // Note: the old canonicalizeName approach deduped by name only (no country
  // guard), which meant even different-country entities with the same base name
  // would merge. The new identityKey approach requires country to match too, so
  // genuine duplicates must supply consistent country codes on both sides.
  const uboTree = {
    rootEntityId: "UBO-ROOT",
    nodes: [
      {
        id: "UBO-ROOT",
        kind: "entity" as const,
        name: "Target Entity GmbH",
        countryCode: "DE",
        bvdId: "UBO-ROOT",
      },
      {
        id: "ORBIS-NL-SHARED",
        kind: "entity" as const,
        // Same legal name AND same country as the real party → genuine dedup
        name: SHARED_OWNER_NAME,
        countryCode: "NL",
        bvdId: "NLSHARED",
        isSanctioned: false,
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-NL-SHARED",
        ownedId: "UBO-ROOT",
        percent: 0.3,
        controlType: "economic" as const,
      },
    ],
    depth: 1,
    fetchedAt: "2026-05-30T00:00:00.000Z",
    confidence: 0.9,
  };

  // Base cascade: real declared ownership, same owner, same 30%
  const baseEdges: OwnershipEdgeSummary[] = [
    {
      ownerId: SHARED_OWNER_ID,
      ownedId: TARGET_ID,
      percent: 0.3,
      controlType: "economic",
    },
  ];
  const baseSummaries = new Map<string, AncestorSummary>([
    [TARGET_ID, makeSummary(TARGET_ID)],
    [
      SHARED_OWNER_ID,
      // Use "NL" country to match the UBO node — same entity, same jurisdiction
      makeSummary(SHARED_OWNER_ID, {
        legalName: SHARED_OWNER_NAME,
        countryCode: "NL",
      }),
    ],
  ]);

  it("RED → GREEN: the shared owner appears exactly once in partySummaries (no UBO:: duplicate)", () => {
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );

    // Count how many summary entries relate to "Shared Holding B.V." by name
    const matchingEntries = Array.from(result.partySummaries.values()).filter(
      (s) => s.legalName === SHARED_OWNER_NAME,
    );
    expect(matchingEntries).toHaveLength(1);

    // The surviving entry MUST use the real party id, not UBO::
    expect(matchingEntries[0].id).toBe(SHARED_OWNER_ID);
    expect(isUboAncestorId(matchingEntries[0].id)).toBe(false);
  });

  it("RED → GREEN: merged edges reference the real party id for the shared owner (no UBO:: owner)", () => {
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );

    // Both edges (base + UBO-remapped) should point from real-shared-owner
    const ownerIds = result.edges.map((e) => e.ownerId);
    expect(ownerIds.every((id) => !isUboAncestorId(id))).toBe(true);
    // Specifically the UBO edge was remapped to the real owner id
    const edgesToTarget = result.edges.filter((e) => e.ownedId === TARGET_ID);
    expect(edgesToTarget.every((e) => e.ownerId === SHARED_OWNER_ID)).toBe(
      true,
    );
  });

  it("RED → GREEN: cascade does NOT see 60% double-count — effective ownership ≤ 30%", () => {
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );
    const cascade = analyzeCascade({
      targetPartyId: TARGET_ID,
      edges: result.edges,
      partySummaries: result.partySummaries,
    });
    // The shared owner is CLEAR, so no cascade hit regardless of stake.
    // But the critical assertion is that effective ownership is at most 30%,
    // not the doubled 60% that the bug produced.
    const ownerAncestor = cascade.ancestors.find(
      (a) => a.ancestorId === SHARED_OWNER_ID,
    );
    if (ownerAncestor) {
      expect(ownerAncestor.effectivePercent).toBeCloseTo(0.3, 3);
    }
  });

  it("genuinely-distinct UBO nodes (no name match) still get UBO:: namespace", () => {
    // Add a second UBO node with a DIFFERENT name — it must NOT be reconciled
    const treeWithExtra = {
      ...uboTree,
      nodes: [
        ...uboTree.nodes,
        {
          id: "ORBIS-DE-DISTINCT",
          kind: "entity" as const,
          name: "Unrelated Grand Parent AG",
          countryCode: "DE",
          bvdId: "DEDISTINCT",
          isSanctioned: false,
        },
      ],
      edges: [
        ...uboTree.edges,
        {
          ownerId: "ORBIS-DE-DISTINCT",
          ownedId: "ORBIS-NL-SHARED",
          percent: 0.8,
          controlType: "economic" as const,
        },
      ],
    };
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      treeWithExtra,
      TARGET_ID,
      "mock",
    );
    const distinctEntry = Array.from(result.partySummaries.values()).find((s) =>
      s.legalName.includes("Unrelated"),
    );
    expect(distinctEntry).toBeDefined();
    expect(isUboAncestorId(distinctEntry!.id)).toBe(true);
  });
});

// ─── T-M2 REVIEW: Fix 1 — distinct entities sharing a base name must not merge ───

describe("mergeUboTreeIntoCascade — no false-merge on different legal forms (T-M2 review Fix 1)", () => {
  /**
   * "Spire GmbH" (Germany, CLEAR) is a known real TradeParty.
   * "Spire B.V." (Netherlands, SANCTIONED) is a UBO non-root node.
   *
   * canonicalizeName("Spire GmbH") === canonicalizeName("Spire B.V.") === "spire"
   * — so the old code would merge the sanctioned BV into the clear GmbH summary,
   * hiding the sanction. The fix must keep them separate.
   *
   * Expected: "Spire B.V." remains a distinct UBO:: ancestor with isBlocked=true.
   */
  const TARGET_ID = "target-spire";
  const CLEAR_GMBH_ID = "real-spire-gmbh";
  const CLEAR_GMBH_NAME = "Spire GmbH";

  const uboTree = {
    rootEntityId: "UBO-SPIRE-ROOT",
    nodes: [
      {
        id: "UBO-SPIRE-ROOT",
        kind: "entity" as const,
        name: "Target Counterparty GmbH",
        countryCode: "DE",
        bvdId: "UBO-SPIRE-ROOT",
      },
      {
        id: "ORBIS-NL-SPIRE-BV",
        kind: "entity" as const,
        name: "Spire B.V.", // shares base name with GmbH but DIFFERENT legal form
        countryCode: "NL", // AND different country
        bvdId: "NL-SPIRE-BV",
        isSanctioned: true, // SANCTIONED — this must NOT be silently merged away
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-NL-SPIRE-BV",
        ownedId: "UBO-SPIRE-ROOT",
        percent: 0.6,
        controlType: "economic" as const,
      },
    ],
    depth: 1,
    fetchedAt: "2026-05-30T00:00:00.000Z",
    confidence: 0.9,
  };

  const baseEdges: OwnershipEdgeSummary[] = [
    {
      ownerId: CLEAR_GMBH_ID,
      ownedId: TARGET_ID,
      percent: 0.4,
      controlType: "economic",
    },
  ];
  const baseSummaries = new Map<string, AncestorSummary>([
    [TARGET_ID, makeSummary(TARGET_ID)],
    [
      CLEAR_GMBH_ID,
      makeSummary(CLEAR_GMBH_ID, {
        legalName: CLEAR_GMBH_NAME,
        countryCode: "DE",
      }),
    ],
  ]);

  it("does NOT merge distinct entities sharing a base name with different legal forms", () => {
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );

    // The sanctioned "Spire B.V." must be a SEPARATE UBO:: entry — NOT merged into the clear "Spire GmbH"
    const spireBvEntry = Array.from(result.partySummaries.values()).find(
      (s) => s.legalName === "Spire B.V.",
    );
    expect(spireBvEntry).toBeDefined();
    expect(isUboAncestorId(spireBvEntry!.id)).toBe(true); // must be UBO:: namespace
    expect(spireBvEntry!.isBlocked).toBe(true); // sanction preserved, not hidden

    // The clear GmbH must be untouched (still CLEAR)
    const gmbhEntry = result.partySummaries.get(CLEAR_GMBH_ID);
    expect(gmbhEntry).toBeDefined();
    expect(gmbhEntry!.isBlocked).toBe(false);
    expect(gmbhEntry!.screeningStatus).toBe("CLEAR");
  });

  it("sanctioned B.V. ancestor triggers cascade hit (60% ownership, not silently merged away)", () => {
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );
    const cascade = analyzeCascade({
      targetPartyId: TARGET_ID,
      edges: result.edges,
      partySummaries: result.partySummaries,
    });
    // Spire B.V. owns 60% of target → cascade hit (≥50% sanctioned ownership)
    expect(cascade.cascadeHit).toBe(true);
    expect(cascade.aggregateSanctionedOwnership).toBeGreaterThanOrEqual(0.5);
  });

  it("genuine same-entity (identical full name + same country) still dedups", () => {
    // "Shared Holding B.V." in NL appears both in base and in UBO with identical full name+country
    const SAME_ENTITY_ID = "real-shared-bv";
    const SAME_NAME = "Shared Holding B.V.";
    const sameName_baseEdges: OwnershipEdgeSummary[] = [
      {
        ownerId: SAME_ENTITY_ID,
        ownedId: TARGET_ID,
        percent: 0.3,
        controlType: "economic",
      },
    ];
    const sameName_baseSummaries = new Map<string, AncestorSummary>([
      [TARGET_ID, makeSummary(TARGET_ID)],
      [
        SAME_ENTITY_ID,
        makeSummary(SAME_ENTITY_ID, {
          legalName: SAME_NAME,
          countryCode: "NL",
        }),
      ],
    ]);
    const sameNameTree = {
      rootEntityId: "UBO-SAME-ROOT",
      nodes: [
        {
          id: "UBO-SAME-ROOT",
          kind: "entity" as const,
          name: "Target",
          countryCode: "DE",
          bvdId: "UBO-SAME-ROOT",
        },
        {
          id: "ORBIS-NL-SHARED-BV",
          kind: "entity" as const,
          name: SAME_NAME, // identical full name including B.V.
          countryCode: "NL", // AND same country
          bvdId: "NL-SHARED-BV",
          isSanctioned: false,
        },
      ],
      edges: [
        {
          ownerId: "ORBIS-NL-SHARED-BV",
          ownedId: "UBO-SAME-ROOT",
          percent: 0.3,
          controlType: "economic" as const,
        },
      ],
      depth: 1,
      fetchedAt: "2026-05-30T00:00:00.000Z",
      confidence: 0.9,
    };
    const result = mergeUboTreeIntoCascade(
      sameName_baseEdges,
      sameName_baseSummaries,
      sameNameTree,
      TARGET_ID,
      "mock",
    );
    // Should be deduplicated — only ONE entry for "Shared Holding B.V."
    const matching = Array.from(result.partySummaries.values()).filter(
      (s) => s.legalName === SAME_NAME,
    );
    expect(matching).toHaveLength(1);
    expect(matching[0].id).toBe(SAME_ENTITY_ID);
    expect(isUboAncestorId(matching[0].id)).toBe(false);
  });
});

// ─── T-M2 REVIEW: Fix 2 — edge suppression must keep the higher ownership percent ───

describe("mergeUboTreeIntoCascade — max-percent retention on suppressed edge (T-M2 review Fix 2)", () => {
  /**
   * Base declares 30% ownership; Orbis reports 60% for the SAME pair (same
   * ownerId, ownedId, controlType). The old code silently dropped the UBO edge
   * and left the cascade with 30% — could miss the >50% cascade threshold.
   *
   * Expected: merged edge set has 60% for that pair (max of declared vs. reported).
   */
  const TARGET_ID = "target-understate";
  const REAL_OWNER_ID = "real-owner-id";

  const baseEdges: OwnershipEdgeSummary[] = [
    {
      ownerId: REAL_OWNER_ID,
      ownedId: TARGET_ID,
      percent: 0.3, // declared: only 30%
      controlType: "economic",
    },
  ];
  const baseSummaries = new Map<string, AncestorSummary>([
    [TARGET_ID, makeSummary(TARGET_ID)],
    // The real owner's name: use same name as UBO node so they reconcile
    [
      REAL_OWNER_ID,
      makeSummary(REAL_OWNER_ID, {
        legalName: "Understating Holdings GmbH",
        countryCode: "DE",
      }),
    ],
  ]);

  // UBO tree: root is the target; one non-root node = same owner (by name+country),
  // but with a HIGHER percent (60%).
  const uboTree = {
    rootEntityId: "UBO-UNDER-ROOT",
    nodes: [
      {
        id: "UBO-UNDER-ROOT",
        kind: "entity" as const,
        name: "Target Understated S.A.",
        countryCode: "FR",
        bvdId: "UBO-UNDER-ROOT",
      },
      {
        id: "ORBIS-DE-UNDERSTATE",
        kind: "entity" as const,
        name: "Understating Holdings GmbH", // matches real owner by name+country
        countryCode: "DE",
        bvdId: "DE-UNDERSTATE",
        isSanctioned: false,
      },
    ],
    edges: [
      {
        ownerId: "ORBIS-DE-UNDERSTATE",
        ownedId: "UBO-UNDER-ROOT",
        percent: 0.6, // Orbis reports 60% — higher than declared
        controlType: "economic" as const,
      },
    ],
    depth: 1,
    fetchedAt: "2026-05-30T00:00:00.000Z",
    confidence: 0.95,
  };

  it("keeps the higher ownership percent when base and UBO disagree (max retention)", () => {
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );

    // Find the edge from the real owner to the target
    const ownerEdge = result.edges.find(
      (e) => e.ownerId === REAL_OWNER_ID && e.ownedId === TARGET_ID,
    );
    expect(ownerEdge).toBeDefined();
    // Must be 60% (the higher Orbis-reported value), not the 30% declared
    expect(ownerEdge!.percent).toBeCloseTo(0.6, 3);
  });

  it("does NOT produce duplicate edges when UBO raises the percent", () => {
    const result = mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );

    // Exactly one edge from real owner to target (not two)
    const ownerEdges = result.edges.filter(
      (e) => e.ownerId === REAL_OWNER_ID && e.ownedId === TARGET_ID,
    );
    expect(ownerEdges).toHaveLength(1);
  });

  it("does NOT mutate the caller's baseEdges array (works on a copy)", () => {
    const originalPercent = baseEdges[0].percent;
    mergeUboTreeIntoCascade(
      baseEdges,
      baseSummaries,
      uboTree,
      TARGET_ID,
      "mock",
    );
    // Original baseEdges must be unchanged
    expect(baseEdges[0].percent).toBe(originalPercent);
  });

  it("when base percent >= UBO percent, keeps base percent (no downgrade)", () => {
    // Base declares 70%, UBO reports only 40% — keep 70%
    const highBaseEdges: OwnershipEdgeSummary[] = [
      {
        ownerId: REAL_OWNER_ID,
        ownedId: TARGET_ID,
        percent: 0.7,
        controlType: "economic",
      },
    ];
    const lowUboTree = {
      ...uboTree,
      edges: [
        {
          ownerId: "ORBIS-DE-UNDERSTATE",
          ownedId: "UBO-UNDER-ROOT",
          percent: 0.4,
          controlType: "economic" as const,
        },
      ],
    };
    const result = mergeUboTreeIntoCascade(
      highBaseEdges,
      baseSummaries,
      lowUboTree,
      TARGET_ID,
      "mock",
    );
    const ownerEdge = result.edges.find(
      (e) => e.ownerId === REAL_OWNER_ID && e.ownedId === TARGET_ID,
    );
    expect(ownerEdge).toBeDefined();
    expect(ownerEdge!.percent).toBeCloseTo(0.7, 3);
  });
});

// ─── uboChipStatus ──────────────────────────────────────────────────

function summary(over: Partial<UboResolutionSummary>): UboResolutionSummary {
  return {
    resolved: true,
    adapter: "mock",
    depth: 2,
    nodeCount: 3,
    edgeCount: 2,
    sanctionedAncestorCount: 0,
    pepAncestorCount: 0,
    confidence: 0.9,
    fetchedAt: "2026-05-22T10:00:00.000Z",
    ...over,
  };
}

describe("uboChipStatus", () => {
  it("returns 'unresolved' when Orbis returned nothing", () => {
    expect(uboChipStatus(summary({ resolved: false }))).toBe("unresolved");
  });

  it("returns 'blocked' when at least one sanctioned ancestor present", () => {
    expect(uboChipStatus(summary({ sanctionedAncestorCount: 1 }))).toBe(
      "blocked",
    );
  });

  it("returns 'warning' when only PEPs present", () => {
    expect(uboChipStatus(summary({ pepAncestorCount: 1 }))).toBe("warning");
  });

  it("returns 'warning' when confidence < 0.5", () => {
    expect(uboChipStatus(summary({ confidence: 0.3 }))).toBe("warning");
  });

  it("returns 'ok' when clean + high confidence", () => {
    expect(uboChipStatus(summary({}))).toBe("ok");
  });

  it("prefers 'blocked' over 'warning' when both apply", () => {
    expect(
      uboChipStatus(
        summary({ sanctionedAncestorCount: 1, pepAncestorCount: 2 }),
      ),
    ).toBe("blocked");
  });
});
