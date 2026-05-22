/**
 * Tests for src/lib/trade/bom-classification.ts — Sprint Z3p.
 *
 * The orchestrator combines Z3l (matcher bridge) with Z3o (see-through
 * propagation). Tests cover:
 *
 *   - Regime-to-jurisdiction mapping
 *   - Pre-classified overrides merge with matcher-derived tags
 *   - End-to-end XV(e)(17) scenario: bus + payload → bus inherits ITAR
 *   - Commercial-only BOM stays EAR (no propagation)
 *   - Unknown classifications surface explicitly
 *   - Audit trail integrity
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  classifyBOM,
  deriveJurisdictionsFromMatcher,
  type BOMItemInput,
} from "./bom-classification";
import type { MatcherResult } from "@/lib/comply-v2/trade/classification/parametric-matcher";
import type { ControlListEntry } from "@/lib/comply-v2/trade/classification/control-list-cross-walk";

describe("deriveJurisdictionsFromMatcher", () => {
  it("USML candidate → ITAR tag", () => {
    const result = mkMatcherResult([mkCandidate("ITAR-USML")]);
    expect(deriveJurisdictionsFromMatcher(result)).toEqual(["ITAR"]);
  });

  it("CCL candidate → EAR tag", () => {
    const result = mkMatcherResult([mkCandidate("EAR-CCL")]);
    expect(deriveJurisdictionsFromMatcher(result)).toEqual(["EAR"]);
  });

  it("EU Annex I → EU_DUAL_USE tag", () => {
    const result = mkMatcherResult([mkCandidate("EU-ANNEX-I")]);
    expect(deriveJurisdictionsFromMatcher(result)).toEqual(["EU_DUAL_USE"]);
  });

  it("DE national list → EU_DUAL_USE tag (EU 2021/821-derived)", () => {
    const result = mkMatcherResult([mkCandidate("DE-AL-TEIL-IB")]);
    expect(deriveJurisdictionsFromMatcher(result)).toEqual(["EU_DUAL_USE"]);
  });

  it("Multiple candidates → union of tags", () => {
    const result = mkMatcherResult([
      mkCandidate("ITAR-USML"),
      mkCandidate("EAR-CCL"),
    ]);
    const tags = deriveJurisdictionsFromMatcher(result);
    expect(tags).toContain("ITAR");
    expect(tags).toContain("EAR");
  });

  it("Empty candidate list → UNKNOWN", () => {
    const result = mkMatcherResult([]);
    expect(deriveJurisdictionsFromMatcher(result)).toEqual(["UNKNOWN"]);
  });

  it("NSG-only candidate → UNKNOWN (NSG not first-class jurisdiction)", () => {
    const result = mkMatcherResult([mkCandidate("NSG")]);
    expect(deriveJurisdictionsFromMatcher(result)).toEqual(["UNKNOWN"]);
  });
});

describe("classifyBOM — XV(e)(17) hosted payload scenario (the canonical case)", () => {
  it("Commercial bus + ITAR payload → bus FINAL jurisdictions include ITAR", () => {
    // The defining XV(e)(17) scenario: a 9A515.a EAR satellite bus
    // hosting a USML XV(e)(17) ITAR payload. After see-through, the
    // bus inherits ITAR jurisdiction.
    const bus: BOMItemInput = {
      itemId: "bus-001",
      name: "9A515.a commercial spacecraft bus",
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.4, // squarely in 9A515.a.1 range → EAR
    };
    const payload: BOMItemInput = {
      itemId: "payload-001",
      name: "Hosted high-res EO payload (USML XV(e)(17))",
      itemClass: "spacecraft.hosted_payload.high_res_eo",
      isSpeciallyDesigned: true,
      isXVe17HostedPayload: true,
    };
    const result = classifyBOM(bus, [payload]);

    // Parent (bus) starts EAR from the matcher (9A515.a.1)
    expect(result.parent.initialJurisdictions).toContain("EAR");
    // After see-through, ITAR is inherited from the payload
    expect(result.parent.finalJurisdictions).toContain("ITAR");
    expect(result.parent.finalJurisdictions).toContain("EAR");
    expect(result.parent.itarInherited).toBe(true);

    // Audit trail records the propagation
    expect(result.parent.seeThroughTrail).toHaveLength(1);
    expect(result.parent.seeThroughTrail[0].childItemId).toBe("payload-001");
    expect(result.parent.seeThroughTrail[0].inheritedJurisdiction).toBe("ITAR");
    expect(result.parent.seeThroughTrail[0].rationale).toMatch(
      /XV\(e\)\(17\)|hosted payload/i,
    );
  });

  it("Commercial bus (EAR-only at 0.50m) + commercial sensor → no ITAR inheritance (control case)", () => {
    // Use apertureMeters=0.50 to stay strictly in 9A515.a.1's
    // [0.35-0.50] inclusive band while falling OUTSIDE USML XV(a)(7)(i)
    // which cuts off at <0.50 exclusive — gives a clean EAR-only bus
    // for testing see-through non-propagation.
    const bus: BOMItemInput = {
      itemId: "bus-002",
      name: "Commercial spacecraft bus",
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.5,
    };
    const wheel: BOMItemInput = {
      itemId: "wheel-002",
      name: "Reaction wheel (9A515.x)",
      itemClass: "spacecraft.adcs.reaction_wheel.high_precision",
      isSpeciallyDesigned: true,
    };
    const result = classifyBOM(bus, [wheel]);
    expect(result.parent.finalJurisdictions).not.toContain("ITAR");
    expect(result.parent.itarInherited).toBe(false);
    expect(result.parent.seeThroughTrail).toHaveLength(0);
  });
});

describe("classifyBOM — pre-classified overrides", () => {
  it("Operator-asserted jurisdiction unions with matcher-derived", () => {
    const parent: BOMItemInput = {
      itemId: "p1",
      name: "Pre-classified item",
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.4,
      preClassifiedJurisdictions: ["EU_DUAL_USE"], // attorney opinion
    };
    const result = classifyBOM(parent, []);
    // EAR (matcher) + EU_DUAL_USE (pre-classified) both in initial set
    expect(result.parent.initialJurisdictions).toContain("EAR");
    expect(result.parent.initialJurisdictions).toContain("EU_DUAL_USE");
  });

  it("Pre-classified ITAR on a child propagates to parent", () => {
    // Operator might pre-classify an unlisted item ITAR based on a
    // CJ determination. The orchestrator must propagate that ITAR
    // tag even though the matcher returns UNKNOWN for the child.
    const bus: BOMItemInput = {
      itemId: "bus-003",
      name: "Spacecraft bus",
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.4,
    };
    const unlistedItarComponent: BOMItemInput = {
      itemId: "comp-cj",
      name: "CJ-determined ITAR component",
      // No matcher-detectable attributes — only the pre-classification
      preClassifiedJurisdictions: ["ITAR"],
    };
    const result = classifyBOM(bus, [unlistedItarComponent]);
    expect(result.parent.itarInherited).toBe(true);
    expect(result.parent.finalJurisdictions).toContain("ITAR");
  });
});

describe("classifyBOM — UNKNOWN handling", () => {
  it("Empty-attribute child surfaces UNKNOWN; UNKNOWN does NOT propagate", () => {
    const bus: BOMItemInput = {
      itemId: "bus-004",
      name: "Bus",
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.4,
    };
    const unclassified: BOMItemInput = {
      itemId: "unk-1",
      name: "Unclassified part",
      // No attributes at all
    };
    const result = classifyBOM(bus, [unclassified]);
    const child = result.children.find((c) => c.itemId === "unk-1");
    expect(child?.initialJurisdictions).toEqual(["UNKNOWN"]);
    // UNKNOWN must not propagate
    expect(result.parent.itarInherited).toBe(false);
  });

  it("UNKNOWN drops out when a concrete tag exists alongside (no UNKNOWN+EAR)", () => {
    // The matcher might return both regime-matched candidates AND an
    // UNKNOWN signal. The merge logic drops UNKNOWN when concrete
    // tags are present.
    const parent: BOMItemInput = {
      itemId: "p1",
      name: "Mixed signal",
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.4,
      preClassifiedJurisdictions: ["UNKNOWN"], // operator was uncertain
    };
    const result = classifyBOM(parent, []);
    // EAR from matcher wins; UNKNOWN drops because we have something
    expect(result.parent.initialJurisdictions).toContain("EAR");
    expect(result.parent.initialJurisdictions).not.toContain("UNKNOWN");
  });
});

describe("classifyBOM — output shape", () => {
  it("Children classifications are returned per-node", () => {
    const parent: BOMItemInput = {
      itemId: "p1",
      name: "Parent",
      itemClass: "spacecraft.remote_sensing.eo",
      apertureMeters: 0.4,
    };
    const child1: BOMItemInput = {
      itemId: "c1",
      name: "Child 1",
      itemClass: "spacecraft.adcs.reaction_wheel.high_precision",
      isSpeciallyDesigned: true,
    };
    const child2: BOMItemInput = {
      itemId: "c2",
      name: "Child 2",
      itemClass: "propulsion.electric.hall",
      IspSeconds: 1500,
      isSpeciallyDesigned: true,
    };
    const result = classifyBOM(parent, [child1, child2]);
    expect(result.children).toHaveLength(2);
    expect(result.children[0].itemId).toBe("c1");
    expect(result.children[1].itemId).toBe("c2");
    // Each child has its own matcher result
    expect(result.children[0].matcherResult).toBeDefined();
    expect(result.children[1].matcherResult).toBeDefined();
  });

  it("Disclaimer is always present and mentions both matcher + see-through", () => {
    const result = classifyBOM(
      { itemId: "p", name: "P", itemClass: "spacecraft.remote_sensing.eo" },
      [],
    );
    expect(result.disclaimer).toMatch(/matcher|cross-walk/i);
    expect(result.disclaimer).toMatch(/see-through|propagation/i);
    expect(result.disclaimer).toMatch(/compliance officer/i);
  });
});

// ─── Test helpers ──────────────────────────────────────────────────

function mkMatcherResult(
  candidates: Array<ReturnType<typeof mkCandidate>>,
): MatcherResult {
  return {
    candidates,
    possibleMatches: [],
    nearMisses: [],
    noAttributesPopulated: false,
    disclaimer: "test disclaimer",
  };
}

function mkCandidate(regime: ControlListEntry["regime"]) {
  const entry: ControlListEntry = {
    canonicalId: `TEST:${regime}`,
    regime,
    category: "9",
    productGroup: "A",
    entryNumber: "515",
    title: `Test entry for ${regime}`,
    predicates: [],
    reasonsForControl: [],
    seeAlso: [],
    citation: "test citation",
    validFrom: "2025-01-01",
  };
  return {
    entry,
    confidence: "HIGH" as const,
    matchedPredicates: [],
    rationale: "test",
  };
}
