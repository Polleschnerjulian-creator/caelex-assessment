/**
 * Tests for src/lib/trade/see-through-propagation.ts — Sprint Z3o.
 *
 * The see-through rule (ITAR § 123.1(b)) is asymmetric: ITAR poisons
 * up the BOM tree, EAR does not. EU Annex IV (Reg. 833/2014 Art. 2b)
 * propagates too because Art. 2b is a hard-prohibition gate without
 * de minimis. Other jurisdictions (EU dual-use Annex I, MTCR,
 * Wassenaar) DON'T propagate via this rule.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  propagateSeeThroughITAR,
  type BOMNode,
} from "./see-through-propagation";

describe("propagateSeeThroughITAR — ITAR propagation (the core rule)", () => {
  it("Parent (EAR) inherits ITAR from a USML-controlled child", () => {
    const parent: BOMNode = {
      itemId: "sat-001",
      name: "Earth-observation satellite (9A515.a.1)",
      jurisdictionTags: ["EAR"],
    };
    const children: BOMNode[] = [
      {
        itemId: "comp-001",
        name: "Sensitive optical telescope (USML XV(a)(7))",
        jurisdictionTags: ["ITAR"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.parent.jurisdictionTags).toContain("ITAR");
    expect(result.parent.jurisdictionTags).toContain("EAR");
    expect(result.itarInherited).toBe(true);
  });

  it("Parent inherits ITAR from XV(e)(17) hosted payload with payload-specific rationale", () => {
    const parent: BOMNode = {
      itemId: "bus-001",
      name: "Commercial spacecraft bus (9A515.a)",
      jurisdictionTags: ["EAR"],
    };
    const children: BOMNode[] = [
      {
        itemId: "payload-001",
        name: "Hosted EO payload (USML XV(e)(17))",
        jurisdictionTags: ["ITAR"],
        isXVe17HostedPayload: true,
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.itarInherited).toBe(true);
    const event = result.trail.find(
      (t) =>
        t.childItemId === "payload-001" && t.inheritedJurisdiction === "ITAR",
    );
    expect(event).toBeDefined();
    expect(event!.rationale).toMatch(/XV\(e\)\(17\)|hosted payload/i);
    expect(event!.rationale).toMatch(/retransfer.*DDTC/i);
  });

  it("Multiple ITAR children all appear in the trail", () => {
    const parent: BOMNode = {
      itemId: "sat-002",
      name: "Multi-instrument observation satellite",
      jurisdictionTags: ["EAR"],
    };
    const children: BOMNode[] = [
      {
        itemId: "sensor-1",
        name: "Sensor A (USML XV(a)(7))",
        jurisdictionTags: ["ITAR"],
      },
      {
        itemId: "sensor-2",
        name: "Sensor B (USML XV(a)(8))",
        jurisdictionTags: ["ITAR"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.trail).toHaveLength(2);
    expect(result.trail.every((t) => t.inheritedJurisdiction === "ITAR")).toBe(
      true,
    );
  });

  it("ITAR-only child propagates even when other jurisdictions present", () => {
    // Mixed child: ITAR + EU_DUAL_USE. Only ITAR propagates.
    const parent: BOMNode = {
      itemId: "sat-003",
      name: "Hybrid jurisdiction satellite",
      jurisdictionTags: ["EAR"],
    };
    const children: BOMNode[] = [
      {
        itemId: "mixed-1",
        name: "Mixed-classification component",
        jurisdictionTags: ["ITAR", "EU_DUAL_USE"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.parent.jurisdictionTags).toContain("ITAR");
    expect(result.parent.jurisdictionTags).not.toContain("EU_DUAL_USE");
  });
});

describe("propagateSeeThroughITAR — EAR-only children DO NOT propagate", () => {
  it("EAR-only child does NOT propagate to parent (the rule is asymmetric)", () => {
    const parent: BOMNode = {
      itemId: "sat-004",
      name: "Commercial small-sat",
      jurisdictionTags: ["EAR"],
    };
    const children: BOMNode[] = [
      {
        itemId: "wheel-1",
        name: "Reaction wheel (9A515.x)",
        jurisdictionTags: ["EAR"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.itarInherited).toBe(false);
    expect(result.trail).toHaveLength(0);
  });

  it("EU_DUAL_USE child does NOT propagate (has its own 10% de minimis under EU 2021/821)", () => {
    const parent: BOMNode = {
      itemId: "sat-005",
      name: "European commercial satellite",
      jurisdictionTags: ["EU_DUAL_USE"],
    };
    const children: BOMNode[] = [
      {
        itemId: "ann-i-comp",
        name: "EU Annex I controlled component (9A004)",
        jurisdictionTags: ["EU_DUAL_USE"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.trail).toHaveLength(0);
  });

  it("MTCR child does NOT propagate (national interpretation, no see-through)", () => {
    const parent: BOMNode = {
      itemId: "launcher-1",
      name: "Small-launch system",
      jurisdictionTags: ["EAR"],
    };
    const children: BOMNode[] = [
      {
        itemId: "motor-1",
        name: "Solid rocket motor (MTCR Item 2)",
        jurisdictionTags: ["MTCR"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.itarInherited).toBe(false);
    expect(result.trail).toHaveLength(0);
  });
});

describe("propagateSeeThroughITAR — EU Annex IV propagation (Reg. 833 Art. 2b)", () => {
  it("EU Annex IV child propagates to parent (hard-prohibition has no de minimis)", () => {
    const parent: BOMNode = {
      itemId: "product-001",
      name: "Industrial machine tool",
      jurisdictionTags: ["EU_DUAL_USE"],
    };
    const children: BOMNode[] = [
      {
        itemId: "comp-002",
        name: "Annex IV controlled microelectronic (3E001)",
        jurisdictionTags: ["EU_ANNEX_IV"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.parent.jurisdictionTags).toContain("EU_ANNEX_IV");
    const event = result.trail.find(
      (t) => t.inheritedJurisdiction === "EU_ANNEX_IV",
    );
    expect(event?.rationale).toMatch(/833\/2014.*Art\.\s*2b|hard prohibition/i);
  });
});

describe("propagateSeeThroughITAR — edge cases", () => {
  it("Empty children list → no propagation, parent unchanged", () => {
    const parent: BOMNode = {
      itemId: "p1",
      name: "Standalone item",
      jurisdictionTags: ["EAR"],
    };
    const result = propagateSeeThroughITAR(parent, []);
    expect(result.parent.jurisdictionTags).toEqual(["EAR"]);
    expect(result.trail).toHaveLength(0);
    expect(result.itarInherited).toBe(false);
  });

  it("Parent already has ITAR — still records the event for audit trail", () => {
    // Edge case: operator pre-classified the parent ITAR. A propagating
    // child should still be recorded so the audit trail shows WHY the
    // host is ITAR — not just that it is.
    const parent: BOMNode = {
      itemId: "p2",
      name: "Already-ITAR satellite",
      jurisdictionTags: ["ITAR"],
    };
    const children: BOMNode[] = [
      {
        itemId: "c1",
        name: "ITAR component",
        jurisdictionTags: ["ITAR"],
      },
    ];
    const result = propagateSeeThroughITAR(parent, children);
    expect(result.parent.jurisdictionTags).toEqual(["ITAR"]);
    expect(result.trail).toHaveLength(1);
    expect(result.trail[0].rationale).toMatch(
      /already classified|audit trail/i,
    );
  });

  it("Input parent is NOT mutated (pure function contract)", () => {
    const parent: BOMNode = {
      itemId: "p3",
      name: "Spacecraft",
      jurisdictionTags: ["EAR"],
    };
    const originalTags = [...parent.jurisdictionTags];
    propagateSeeThroughITAR(parent, [
      {
        itemId: "c1",
        name: "ITAR comp",
        jurisdictionTags: ["ITAR"],
      },
    ]);
    expect(parent.jurisdictionTags).toEqual(originalTags);
  });

  it("Disclaimer always present and references § 123.1(b)", () => {
    const result = propagateSeeThroughITAR(
      {
        itemId: "p4",
        name: "Item",
        jurisdictionTags: ["EAR"],
      },
      [],
    );
    expect(result.disclaimer).toMatch(/§\s*123\.1\(b\)/);
    expect(result.disclaimer).toMatch(/no de minimis/i);
    expect(result.disclaimer).toMatch(/compliance officer/i);
  });

  it("UNKNOWN jurisdiction child does NOT propagate", () => {
    // Operator hasn't classified the child yet — must not propagate
    // anything, including ITAR. The classifier is conservative.
    const result = propagateSeeThroughITAR(
      {
        itemId: "p5",
        name: "Host",
        jurisdictionTags: ["EAR"],
      },
      [
        {
          itemId: "c1",
          name: "Unclassified child",
          jurisdictionTags: ["UNKNOWN"],
        },
      ],
    );
    expect(result.itarInherited).toBe(false);
    expect(result.trail).toHaveLength(0);
  });
});
