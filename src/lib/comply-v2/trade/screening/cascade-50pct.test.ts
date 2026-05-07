/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
 *
 * Tests for the 50%-Rule Cascade Engine.
 *
 * Reference: 31 CFR § 510 (OFAC's 50% rule guidance, August 2014).
 * Real-world test cases from OFAC's published 50%-rule examples.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import type { TradeScreeningStatus } from "@prisma/client";
import {
  analyzeCascade,
  type AncestorSummary,
  type OwnershipEdgeSummary,
} from "./cascade-50pct";

// ─── Helpers for building test fixtures ────────────────────────────

function party(
  id: string,
  legalName: string,
  status: TradeScreeningStatus = "CLEAR",
  countryCode: string = "US",
  isBlocked: boolean = false,
): [string, AncestorSummary] {
  return [
    id,
    {
      id,
      legalName,
      countryCode,
      screeningStatus: status,
      isBlocked: isBlocked || status === "CONFIRMED_HIT",
    },
  ];
}

function edge(
  ownerId: string,
  ownedId: string,
  percent: number,
  controlType: string = "economic",
): OwnershipEdgeSummary {
  return { ownerId, ownedId, percent, controlType };
}

describe("analyzeCascade", () => {
  describe("trivial cases", () => {
    it("returns no ancestors when target has no owners", () => {
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [],
        partySummaries: new Map([party("T", "Target")]),
      });
      expect(result.ancestors).toEqual([]);
      expect(result.aggregateSanctionedOwnership).toBe(0);
      expect(result.cascadeHit).toBe(false);
    });

    it("handles target absent from partySummaries gracefully", () => {
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [],
        partySummaries: new Map(),
      });
      expect(result.cascadeHit).toBe(false);
    });
  });

  describe("direct ownership (depth 1)", () => {
    it("flags 60% direct ownership by sanctioned ancestor as cascade hit", () => {
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.6)],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      expect(result.ancestors).toHaveLength(1);
      expect(result.ancestors[0].effectivePercent).toBeCloseTo(0.6);
      expect(result.cascadeHit).toBe(true);
      expect(result.sanctionedAncestorCount).toBe(1);
    });

    it("does NOT flag 49% direct ownership as cascade hit", () => {
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.49)],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      expect(result.cascadeHit).toBe(false);
      expect(result.aggregateSanctionedOwnership).toBeCloseTo(0.49);
      expect(result.sanctionedAncestorCount).toBe(1);
    });

    it("flags exactly 50% as cascade hit (boundary)", () => {
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.5)],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      expect(result.cascadeHit).toBe(true);
    });

    it("does NOT count CLEAR ancestors toward cascade total", () => {
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.99)],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Friendly X", "CLEAR"),
        ]),
      });
      expect(result.cascadeHit).toBe(false);
      expect(result.aggregateSanctionedOwnership).toBe(0);
      expect(result.sanctionedAncestorCount).toBe(0);
    });
  });

  describe("indirect ownership (multiplication through chain)", () => {
    it("computes effective ownership through 2-hop chain", () => {
      // X owns 80% of Y, Y owns 70% of T → X effective = 56%
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "Y", 0.8), edge("Y", "T", 0.7)],
        partySummaries: new Map([
          party("T", "Target"),
          party("Y", "Intermediary Y"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      const x = result.ancestors.find((a) => a.ancestorId === "X");
      expect(x?.effectivePercent).toBeCloseTo(0.56);
      expect(result.cascadeHit).toBe(true);
    });

    it("does NOT trigger cascade when chain dilutes below 50%", () => {
      // X owns 70% of Y, Y owns 60% of T → X effective = 42%
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "Y", 0.7), edge("Y", "T", 0.6)],
        partySummaries: new Map([
          party("T", "Target"),
          party("Y", "Intermediary Y"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      expect(result.cascadeHit).toBe(false);
      expect(result.aggregateSanctionedOwnership).toBeCloseTo(0.42);
    });

    it("respects maxDepth and does not traverse beyond", () => {
      // 4-hop chain: X→Y→Z→W→T, each 90% (totaling 65.6%).
      // With maxDepth=2, X is unreachable, no cascade hit.
      const result = analyzeCascade({
        targetPartyId: "T",
        maxDepth: 2,
        edges: [
          edge("X", "Y", 0.9),
          edge("Y", "Z", 0.9),
          edge("Z", "W", 0.9),
          edge("W", "T", 0.9),
        ],
        partySummaries: new Map([
          party("T", "Target"),
          party("W", "W"),
          party("Z", "Z"),
          party("Y", "Y"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      // X is at depth 4, beyond maxDepth=2, so not reached
      const x = result.ancestors.find((a) => a.ancestorId === "X");
      expect(x).toBeUndefined();
      expect(result.cascadeHit).toBe(false);
    });
  });

  describe("diamond aggregation (the OFAC tricky case)", () => {
    it("aggregates effective ownership across multiple paths from same ancestor", () => {
      // X owns 30% of Y AND 20% of Z. Y owns 60% of T, Z owns 40% of T.
      // X effective = 30%×60% + 20%×40% = 18% + 8% = 26%
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [
          edge("X", "Y", 0.3),
          edge("X", "Z", 0.2),
          edge("Y", "T", 0.6),
          edge("Z", "T", 0.4),
        ],
        partySummaries: new Map([
          party("T", "Target"),
          party("Y", "Y"),
          party("Z", "Z"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      const x = result.ancestors.find((a) => a.ancestorId === "X");
      expect(x?.effectivePercent).toBeCloseTo(0.26);
      expect(x?.pathCount).toBe(2);
      expect(result.cascadeHit).toBe(false); // 26% < 50%
    });

    it("aggregates diamond paths to push total over 50% threshold", () => {
      // Same diamond but with 60% via each path:
      // X owns 70% of Y AND 70% of Z. Y owns 50% of T, Z owns 50% of T.
      // X effective = 70%×50% + 70%×50% = 35% + 35% = 70% → cascade hit
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [
          edge("X", "Y", 0.7),
          edge("X", "Z", 0.7),
          edge("Y", "T", 0.5),
          edge("Z", "T", 0.5),
        ],
        partySummaries: new Map([
          party("T", "Target"),
          party("Y", "Y"),
          party("Z", "Z"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      const x = result.ancestors.find((a) => a.ancestorId === "X");
      expect(x?.effectivePercent).toBeCloseTo(0.7);
      expect(result.cascadeHit).toBe(true);
    });
  });

  describe("multiple sanctioned ancestors (combined 50%)", () => {
    it("sums effective ownership from different sanctioned ancestors", () => {
      // X (sanctioned) owns 30% of T directly
      // Y (sanctioned) owns 25% of T directly
      // Combined: 30% + 25% = 55% sanctioned ownership → cascade hit
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.3), edge("Y", "T", 0.25)],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
          party("Y", "Sanctioned Y", "CONFIRMED_HIT"),
        ]),
      });
      expect(result.aggregateSanctionedOwnership).toBeCloseTo(0.55);
      expect(result.cascadeHit).toBe(true);
      expect(result.sanctionedAncestorCount).toBe(2);
    });

    it("does NOT mix sanctioned and non-sanctioned ownership in the 50% calc", () => {
      // X (sanctioned) owns 40%
      // Y (CLEAR) owns 40%
      // Z (CLEAR) owns 20%
      // Sanctioned aggregate = 40%, NOT 80%
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.4), edge("Y", "T", 0.4), edge("Z", "T", 0.2)],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
          party("Y", "Y"),
          party("Z", "Z"),
        ]),
      });
      expect(result.aggregateSanctionedOwnership).toBeCloseTo(0.4);
      expect(result.cascadeHit).toBe(false);
      expect(result.totalCascadedOwnership).toBeCloseTo(1.0);
    });
  });

  describe("cycles + edge cases", () => {
    it("handles ownership cycles without infinite loop", () => {
      // T owns 50% of X, X owns 50% of T (impossible in real life,
      // but malicious test data shouldn't crash us)
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.5), edge("T", "X", 0.5)],
        partySummaries: new Map([party("T", "Target"), party("X", "X")]),
      });
      // Should terminate, X reached but not its own ancestor (T)
      expect(result.ancestors.length).toBeLessThanOrEqual(1);
    });

    it("ignores 'control_no_equity' edges in 50% calculation", () => {
      // X has voting control over T but no equity (e.g. trustee)
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 1.0, "control_no_equity")],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Trustee X", "CONFIRMED_HIT"),
        ]),
      });
      // 50%-rule cascade does not aggregate non-equity control
      expect(result.cascadeHit).toBe(false);
      expect(result.ancestors).toEqual([]);
    });

    it("includes 'voting' edges in calculation", () => {
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.51, "voting")],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Sanctioned X", "CONFIRMED_HIT"),
        ]),
      });
      expect(result.cascadeHit).toBe(true);
    });

    it("treats BLOCKED party as sanctioned even if status is not CONFIRMED_HIT", () => {
      // Party manually blocked by operator (without a confirmed sanctions hit)
      const result = analyzeCascade({
        targetPartyId: "T",
        edges: [edge("X", "T", 0.6)],
        partySummaries: new Map([
          party("T", "Target"),
          party("X", "Manually Blocked X", "CLEAR", "US", true),
        ]),
      });
      expect(result.cascadeHit).toBe(true);
      expect(result.sanctionedAncestorCount).toBe(1);
    });
  });

  describe("real-world OFAC scenario", () => {
    it("captures the Rosneft-style energy chain (illustrative)", () => {
      // Public-record-style: sanctioned holding company owns 35% of
      // operating company, which owns 80% of subsidiary. Plus another
      // chain: same sanctioned holding owns 25% of a JV which owns 30%
      // of the same subsidiary. Combined effective ownership of subsid:
      // 35%×80% + 25%×30% = 28% + 7.5% = 35.5% → below 50%, no cascade.
      const result = analyzeCascade({
        targetPartyId: "subsidiary",
        edges: [
          edge("holding", "opco", 0.35),
          edge("opco", "subsidiary", 0.8),
          edge("holding", "jv", 0.25),
          edge("jv", "subsidiary", 0.3),
        ],
        partySummaries: new Map([
          party("subsidiary", "Subsidiary Co"),
          party("opco", "Operating Co"),
          party("jv", "JV Co"),
          party("holding", "Sanctioned Holding", "CONFIRMED_HIT"),
        ]),
      });
      const holding = result.ancestors.find((a) => a.ancestorId === "holding");
      expect(holding?.effectivePercent).toBeCloseTo(0.355, 2);
      expect(result.cascadeHit).toBe(false); // below 50%
      // But sanctioned ancestor present — operator should still review
      expect(result.sanctionedAncestorCount).toBe(1);
    });
  });
});
