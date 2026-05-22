/**
 * Tests for src/lib/trade/icp-mapping-service.ts — Sprint Z8.
 *
 * The ICP 2019/1318 seven-element mapping must project a program
 * record onto the seven elements correctly. Tests cover:
 *
 *  - Empty snapshot → 0% completion, all mandatory items outstanding
 *  - Full snapshot → 100% completion (auto-satisfaction)
 *  - Manual overrides win over auto-satisfaction (both ways)
 *  - BAFA SAG threshold at ≥ 80% mandatory completion
 *  - Per-element scoring with mixed satisfaction
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  mapProgramToIcpElements,
  BAFA_SAG_THRESHOLD,
  type ICPProgramSnapshot,
} from "./icp-mapping-service";
import {
  ICP_ELEMENTS,
  ICP_ITEM_COUNT,
  ICP_MANDATORY_ITEM_COUNT,
} from "@/data/trade/icp-2019-1318";

describe("ICP 2019/1318 data integrity", () => {
  it("exactly 7 elements as required by the EU Recommendation", () => {
    expect(ICP_ELEMENTS).toHaveLength(7);
  });

  it("elements ordered 1-7 by ordinal field", () => {
    const ordinals = ICP_ELEMENTS.map((e) => e.ordinal);
    expect(ordinals).toEqual([1, 2, 3, 4, 5, 6, 7]);
  });

  it("every item has a stable element-prefixed ID", () => {
    for (const element of ICP_ELEMENTS) {
      const prefix = `E${element.ordinal}-`;
      for (const item of element.items) {
        expect(item.id.startsWith(prefix)).toBe(true);
      }
    }
  });

  it("all item IDs unique across elements", () => {
    const ids = ICP_ELEMENTS.flatMap((e) => e.items.map((i) => i.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each element has at least one mandatory item", () => {
    for (const element of ICP_ELEMENTS) {
      expect(element.items.some((i) => i.mandatory)).toBe(true);
    }
  });

  it("constants match the data — count + mandatory count", () => {
    const computedTotal = ICP_ELEMENTS.reduce(
      (sum, e) => sum + e.items.length,
      0,
    );
    const computedMandatory = ICP_ELEMENTS.reduce(
      (sum, e) => sum + e.items.filter((i) => i.mandatory).length,
      0,
    );
    expect(ICP_ITEM_COUNT).toBe(computedTotal);
    expect(ICP_MANDATORY_ITEM_COUNT).toBe(computedMandatory);
  });
});

describe("mapProgramToIcpElements — empty snapshot", () => {
  const empty: ICPProgramSnapshot = {};

  it("returns 7 element results", () => {
    const result = mapProgramToIcpElements(empty);
    expect(result.elements).toHaveLength(7);
  });

  it("overall completion is 0", () => {
    const result = mapProgramToIcpElements(empty);
    expect(result.overallCompletion).toBe(0);
    expect(result.overallMandatoryCompletion).toBe(0);
  });

  it("not BAFA-SAG eligible", () => {
    const result = mapProgramToIcpElements(empty);
    expect(result.isBafaSagEligible).toBe(false);
  });

  it("every mandatory item appears in outstandingMandatoryItems", () => {
    const result = mapProgramToIcpElements(empty);
    expect(result.outstandingMandatoryItems).toHaveLength(
      ICP_MANDATORY_ITEM_COUNT,
    );
  });

  it("every item marked 'unsatisfied' source", () => {
    const result = mapProgramToIcpElements(empty);
    for (const elementResult of result.elements) {
      for (const itemResult of elementResult.items) {
        expect(itemResult.satisfied).toBe(false);
        expect(itemResult.source).toBe("unsatisfied");
      }
    }
  });
});

describe("mapProgramToIcpElements — auto-satisfaction via scalar fields", () => {
  it("empoweredOfficialName populates → E2-01 satisfied via auto-scalar", () => {
    const result = mapProgramToIcpElements({
      empoweredOfficialName: "Jane Doe",
    });
    const e2 = result.elements.find(
      (e) => e.element.id === "E2_ORGANISATION_RESPONSIBILITIES",
    );
    expect(e2).toBeDefined();
    const e201 = e2!.items.find((i) => i.item.id === "E2-01");
    expect(e201?.satisfied).toBe(true);
    expect(e201?.source).toBe("auto-scalar");
  });

  it("empty-string scalar does NOT satisfy", () => {
    const result = mapProgramToIcpElements({
      empoweredOfficialName: "   ", // whitespace-only
    });
    const e201 = result.elements
      .flatMap((e) => e.items)
      .find((i) => i.item.id === "E2-01");
    expect(e201?.satisfied).toBe(false);
  });

  it("date field auto-satisfies", () => {
    const result = mapProgramToIcpElements({
      lastTrainingDate: new Date("2026-01-15"),
    });
    const e302 = result.elements
      .flatMap((e) => e.items)
      .find((i) => i.item.id === "E3-02");
    expect(e302?.satisfied).toBe(true);
    expect(e302?.source).toBe("auto-scalar");
  });
});

describe("mapProgramToIcpElements — auto-satisfaction via boolean fields", () => {
  it("hasTCP=true → E2-04 satisfied via auto-boolean", () => {
    const result = mapProgramToIcpElements({ hasTCP: true });
    const e204 = result.elements
      .flatMap((e) => e.items)
      .find((i) => i.item.id === "E2-04");
    expect(e204?.satisfied).toBe(true);
    expect(e204?.source).toBe("auto-boolean");
  });

  it("hasAutomatedScreening=true → E4-02 satisfied", () => {
    const result = mapProgramToIcpElements({ hasAutomatedScreening: true });
    const e402 = result.elements
      .flatMap((e) => e.items)
      .find((i) => i.item.id === "E4-02");
    expect(e402?.satisfied).toBe(true);
  });

  it("boolean=false does NOT auto-satisfy", () => {
    const result = mapProgramToIcpElements({ hasTCP: false });
    const e204 = result.elements
      .flatMap((e) => e.items)
      .find((i) => i.item.id === "E2-04");
    expect(e204?.satisfied).toBe(false);
  });
});

describe("mapProgramToIcpElements — manual overrides", () => {
  it("manualOverride=true wins over a missing auto-satisfaction", () => {
    const result = mapProgramToIcpElements({
      manualOverrides: { "E1-01": true },
    });
    const e101 = result.elements
      .flatMap((e) => e.items)
      .find((i) => i.item.id === "E1-01");
    expect(e101?.satisfied).toBe(true);
    expect(e101?.source).toBe("manual");
  });

  it("manualOverride=false wins over auto-satisfaction (auditor flag)", () => {
    const result = mapProgramToIcpElements({
      empoweredOfficialName: "Jane Doe",
      manualOverrides: { "E2-01": false },
    });
    const e201 = result.elements
      .flatMap((e) => e.items)
      .find((i) => i.item.id === "E2-01");
    expect(e201?.satisfied).toBe(false);
    expect(e201?.source).toBe("unsatisfied");
  });
});

describe("mapProgramToIcpElements — BAFA SAG eligibility threshold", () => {
  it("threshold constant is 0.8", () => {
    expect(BAFA_SAG_THRESHOLD).toBe(0.8);
  });

  it("80% mandatory completion exactly → SAG eligible", () => {
    // Hit every mandatory item via manual overrides until we cross 80%.
    const everyMandatoryItemId = ICP_ELEMENTS.flatMap((e) =>
      e.items.filter((i) => i.mandatory).map((i) => i.id),
    );
    const eightyPct = Math.ceil(everyMandatoryItemId.length * 0.8);
    const overrides: Record<string, boolean> = {};
    for (let i = 0; i < eightyPct; i++) {
      overrides[everyMandatoryItemId[i]] = true;
    }
    const result = mapProgramToIcpElements({ manualOverrides: overrides });
    expect(result.overallMandatoryCompletion).toBeGreaterThanOrEqual(
      BAFA_SAG_THRESHOLD,
    );
    expect(result.isBafaSagEligible).toBe(true);
  });

  it("just-below-threshold → NOT SAG eligible", () => {
    const everyMandatoryItemId = ICP_ELEMENTS.flatMap((e) =>
      e.items.filter((i) => i.mandatory).map((i) => i.id),
    );
    // Mark exactly half — well below 80%.
    const half = Math.floor(everyMandatoryItemId.length / 2);
    const overrides: Record<string, boolean> = {};
    for (let i = 0; i < half; i++) {
      overrides[everyMandatoryItemId[i]] = true;
    }
    const result = mapProgramToIcpElements({ manualOverrides: overrides });
    expect(result.overallMandatoryCompletion).toBeLessThan(BAFA_SAG_THRESHOLD);
    expect(result.isBafaSagEligible).toBe(false);
  });
});

describe("mapProgramToIcpElements — full snapshot scenario", () => {
  it("a well-developed ICP yields high completion across all elements", () => {
    const fullSnapshot: ICPProgramSnapshot = {
      // E2 — Empowered Official
      empoweredOfficialName: "Jane Doe",
      empoweredOfficialEmailEnc: "encrypted:abc123",
      empoweredOfficialTitle: "VP, Export Control",
      hasTCP: true,
      // E3 — Training
      lastTrainingDate: new Date("2026-03-01"),
      nextTrainingDue: new Date("2027-03-01"),
      trainingCompletionRate: 95,
      // E4 — Screening
      hasAutomatedScreening: true,
      screeningVendor: "Caelex Trade",
      jurisdictionDetermination: "dual_use",
      // E5 — Performance
      lastAuditDate: new Date("2026-02-15"),
      nextAuditDue: new Date("2027-02-15"),
      lastAuditFindings: "No material findings; 3 process improvements logged",
      hasVoluntaryDisclosures: true,
      // Manual sign-offs for the items that have no auto-satisfaction
      // wiring — these are policy/procedure items that can only be
      // asserted by the operator (or an auditor) explicitly.
      manualOverrides: {
        "E1-01": true,
        "E1-02": true,
        "E1-03": true,
        "E4-03": true, // EUS for sensitive transactions — procedure
        "E4-04": true, // Catch-all / red-flag procedure
        "E6-01": true,
        "E6-02": true,
        "E7-01": true,
        "E7-03": true,
      },
    };
    const result = mapProgramToIcpElements(fullSnapshot);
    expect(result.isBafaSagEligible).toBe(true);
    // Every mandatory item must be satisfied for SAG-readiness.
    expect(result.outstandingMandatoryItems).toHaveLength(0);
    expect(result.overallMandatoryCompletion).toBe(1);
  });

  it("element-level completion percentages exposed for the UI", () => {
    const result = mapProgramToIcpElements({
      empoweredOfficialName: "Jane Doe",
      empoweredOfficialEmailEnc: "encrypted:abc123",
      empoweredOfficialTitle: "VP",
      hasTCP: true,
    });
    const e2 = result.elements.find((e) => e.element.ordinal === 2);
    expect(e2).toBeDefined();
    // E2 has 4 items; 3 auto-satisfied here (org chart still missing)
    expect(e2!.satisfiedCount).toBe(3);
    expect(e2!.completion).toBeGreaterThan(0.5);
    expect(e2!.mandatoryCompletion).toBe(1); // all 3 mandatory E2 items hit
  });
});

describe("mapProgramToIcpElements — outstanding items ordering", () => {
  it("outstandingMandatoryItems preserves element order (E1 first, E7 last)", () => {
    const result = mapProgramToIcpElements({});
    const ordinals = result.outstandingMandatoryItems.map((i) =>
      parseInt(i.id.match(/^E(\d+)-/)?.[1] ?? "0", 10),
    );
    // Should be non-decreasing — items in E1 come before E2, etc.
    for (let i = 1; i < ordinals.length; i++) {
      expect(ordinals[i]).toBeGreaterThanOrEqual(ordinals[i - 1]);
    }
  });
});
