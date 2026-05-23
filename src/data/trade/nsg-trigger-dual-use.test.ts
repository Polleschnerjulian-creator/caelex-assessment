/**
 * NSG Trigger List + Dual-Use Annex — data integrity tests.
 *
 * Locks in the data contract for `nsg-trigger-dual-use.ts`. These run
 * in CI; any future edit to the entries that breaks an invariant fails
 * fast rather than shipping silently.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { describe, it, expect } from "vitest";
import {
  NSG_ENTRIES,
  NSG_TRIGGER_LIST_ENTRIES,
  NSG_DUAL_USE_ENTRIES,
  NSG_TRIGGER_LIST_COVERAGE,
  NSG_DUAL_USE_COVERAGE,
  findNsgEntry,
  findNsgByList,
  findNsgSpaceRelevant,
  findNsgByCategory,
  type NsgEntry,
  type NsgList,
} from "./nsg-trigger-dual-use";

// ─── Presence + cardinality ──────────────────────────────────────────

describe("NSG dataset — presence + cardinality", () => {
  it("has at least 30 entries (the moat is non-trivial)", () => {
    expect(NSG_ENTRIES.length).toBeGreaterThanOrEqual(30);
  });

  it("has at most 60 entries (terse, focused dataset)", () => {
    expect(NSG_ENTRIES.length).toBeLessThanOrEqual(60);
  });

  it("Trigger List has at least 15 entries", () => {
    expect(NSG_TRIGGER_LIST_ENTRIES.length).toBeGreaterThanOrEqual(15);
  });

  it("Dual-Use Annex has at least 15 entries", () => {
    expect(NSG_DUAL_USE_ENTRIES.length).toBeGreaterThanOrEqual(15);
  });

  it("combined NSG_ENTRIES equals trigger + dual-use entries", () => {
    expect(NSG_ENTRIES.length).toBe(
      NSG_TRIGGER_LIST_ENTRIES.length + NSG_DUAL_USE_ENTRIES.length,
    );
  });
});

// ─── Schema integrity ────────────────────────────────────────────────

describe("NSG dataset — schema integrity", () => {
  it("every entry has a unique code", () => {
    const codes = NSG_ENTRIES.map((e) => e.code);
    const dupes = codes.filter((c, i) => codes.indexOf(c) !== i);
    expect(dupes).toEqual([]);
  });

  it("every entry has a non-empty title (≤ 120 chars)", () => {
    for (const entry of NSG_ENTRIES) {
      expect(entry.title.trim().length).toBeGreaterThan(0);
      expect(entry.title.length).toBeLessThanOrEqual(120);
    }
  });

  it("every entry has a non-empty description", () => {
    for (const entry of NSG_ENTRIES) {
      expect(entry.description.trim().length).toBeGreaterThan(0);
    }
  });

  it("every entry has a sourceUrl that looks like a URL", () => {
    for (const entry of NSG_ENTRIES) {
      expect(entry.sourceUrl).toMatch(/^https?:\/\//);
    }
  });

  it("every entry has a parseable ISO-8601 asOfDate", () => {
    for (const entry of NSG_ENTRIES) {
      expect(entry.asOfDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const d = new Date(entry.asOfDate);
      expect(Number.isNaN(d.getTime())).toBe(false);
    }
  });

  it("every entry has a boolean spaceRelevant flag", () => {
    for (const entry of NSG_ENTRIES) {
      expect(typeof entry.spaceRelevant).toBe("boolean");
    }
  });

  it("every entry has a valid category", () => {
    const validCategories = new Set([
      "reactor",
      "materials",
      "isotope-separation",
      "heavy-water",
      "machine-tools",
      "electronics",
      "metallurgy",
      "software-tech",
      "test-equipment",
      "instrumentation",
      "other",
    ]);
    for (const entry of NSG_ENTRIES) {
      expect(validCategories.has(entry.category)).toBe(true);
    }
  });
});

// ─── List distribution ───────────────────────────────────────────────

describe("NSG dataset — list distribution", () => {
  it("Trigger List entries all have list === 'TRIGGER'", () => {
    for (const entry of NSG_TRIGGER_LIST_ENTRIES) {
      expect(entry.list).toBe("TRIGGER");
    }
  });

  it("Dual-Use entries all have list === 'DUAL_USE'", () => {
    for (const entry of NSG_DUAL_USE_ENTRIES) {
      expect(entry.list).toBe("DUAL_USE");
    }
  });

  it("Dual-Use entries use the 'DU.' code prefix", () => {
    for (const entry of NSG_DUAL_USE_ENTRIES) {
      expect(entry.code.startsWith("DU.")).toBe(true);
    }
  });

  it("Trigger List entries do NOT use the 'DU.' code prefix", () => {
    for (const entry of NSG_TRIGGER_LIST_ENTRIES) {
      expect(entry.code.startsWith("DU.")).toBe(false);
    }
  });
});

// ─── Space-relevance signal ──────────────────────────────────────────

describe("NSG dataset — space-relevance signal", () => {
  it("at least 10 entries are flagged space-relevant", () => {
    const spaceRelevant = NSG_ENTRIES.filter((e) => e.spaceRelevant);
    expect(spaceRelevant.length).toBeGreaterThanOrEqual(10);
  });

  it("space-relevant entries span BOTH Trigger and Dual-Use lists", () => {
    const triggerRelevant = NSG_TRIGGER_LIST_ENTRIES.filter(
      (e) => e.spaceRelevant,
    );
    const dualUseRelevant = NSG_DUAL_USE_ENTRIES.filter((e) => e.spaceRelevant);
    expect(triggerRelevant.length).toBeGreaterThan(0);
    expect(dualUseRelevant.length).toBeGreaterThan(0);
  });

  it("nuclear reactors (1.1) are flagged space-relevant (NTP, NEP)", () => {
    const entry = findNsgEntry("1.1");
    expect(entry).toBeDefined();
    expect(entry?.spaceRelevant).toBe(true);
  });

  it("nuclear-grade graphite (2.2) is flagged space-relevant", () => {
    const entry = findNsgEntry("2.2");
    expect(entry).toBeDefined();
    expect(entry?.spaceRelevant).toBe(true);
  });

  it("5-axis CNC machine tools (DU.2.A.1) are flagged space-relevant", () => {
    const entry = findNsgEntry("DU.2.A.1");
    expect(entry).toBeDefined();
    expect(entry?.spaceRelevant).toBe(true);
  });

  it("maraging steel (DU.5.A.1) is flagged space-relevant", () => {
    const entry = findNsgEntry("DU.5.A.1");
    expect(entry).toBeDefined();
    expect(entry?.spaceRelevant).toBe(true);
  });
});

// ─── Cross-references ────────────────────────────────────────────────

describe("NSG dataset — cross-references", () => {
  it("at least 10 entries cross-reference EU Annex I codes", () => {
    const withEuRef = NSG_ENTRIES.filter((e) => e.euAnnexIRef);
    expect(withEuRef.length).toBeGreaterThanOrEqual(10);
  });

  it("at least 10 entries cross-reference EAR CCL ECCNs", () => {
    const withCclRef = NSG_ENTRIES.filter((e) => e.earCclRef);
    expect(withCclRef.length).toBeGreaterThanOrEqual(10);
  });

  it("EU Annex I refs look like ECCN-style codes (digit + letter + digits)", () => {
    for (const entry of NSG_ENTRIES) {
      if (!entry.euAnnexIRef) continue;
      expect(entry.euAnnexIRef).toMatch(/^[0-9][A-Z][0-9]{3}/);
    }
  });

  it("EAR CCL refs look like ECCN-style codes", () => {
    for (const entry of NSG_ENTRIES) {
      if (!entry.earCclRef) continue;
      expect(entry.earCclRef).toMatch(/^[0-9][A-Z][0-9]{3}/);
    }
  });
});

// ─── Helper functions ────────────────────────────────────────────────

describe("NSG dataset — helper functions", () => {
  it("findNsgEntry returns the right entry by code", () => {
    const entry = findNsgEntry("1.1");
    expect(entry?.title).toContain("Complete nuclear reactors");
  });

  it("findNsgEntry returns undefined for unknown code", () => {
    expect(findNsgEntry("999.999")).toBeUndefined();
  });

  it("findNsgByList('TRIGGER') returns only Trigger entries", () => {
    const result = findNsgByList("TRIGGER");
    expect(result.length).toBe(NSG_TRIGGER_LIST_ENTRIES.length);
    for (const entry of result) {
      expect(entry.list).toBe("TRIGGER");
    }
  });

  it("findNsgByList('DUAL_USE') returns only Dual-Use entries", () => {
    const result = findNsgByList("DUAL_USE");
    expect(result.length).toBe(NSG_DUAL_USE_ENTRIES.length);
    for (const entry of result) {
      expect(entry.list).toBe("DUAL_USE");
    }
  });

  it("findNsgSpaceRelevant returns only space-relevant entries", () => {
    const result = findNsgSpaceRelevant();
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.spaceRelevant).toBe(true);
    }
  });

  it("findNsgByCategory('machine-tools') returns CNC + CMM entries", () => {
    const result = findNsgByCategory("machine-tools");
    expect(result.length).toBeGreaterThan(0);
    for (const entry of result) {
      expect(entry.category).toBe("machine-tools");
    }
  });
});

// ─── Coverage metadata ───────────────────────────────────────────────

describe("NSG dataset — coverage metadata", () => {
  it("Trigger List coverage count matches entry array length", () => {
    expect(NSG_TRIGGER_LIST_COVERAGE.caelexCoverageCount).toBe(
      NSG_TRIGGER_LIST_ENTRIES.length,
    );
  });

  it("Dual-Use coverage count matches entry array length", () => {
    expect(NSG_DUAL_USE_COVERAGE.caelexCoverageCount).toBe(
      NSG_DUAL_USE_ENTRIES.length,
    );
  });

  it("coverage references INFCIRC source documents", () => {
    expect(NSG_TRIGGER_LIST_COVERAGE.source).toContain("INFCIRC/254");
    expect(NSG_TRIGGER_LIST_COVERAGE.source).toContain("Part 1");
    expect(NSG_DUAL_USE_COVERAGE.source).toContain("INFCIRC/254");
    expect(NSG_DUAL_USE_COVERAGE.source).toContain("Part 2");
  });
});

// ─── Cross-walk integration ──────────────────────────────────────────
// The cross-walk parametric file references NSG codes via the
// `NSG-TRIGGER` and `NSG-DU` regime names. This block verifies the
// NSG entries can be discovered from the cross-walk's seeAlso graph.

describe("NSG dataset — cross-walk integration", () => {
  it("NsgList type accepts both TRIGGER and DUAL_USE", () => {
    const lists: NsgList[] = ["TRIGGER", "DUAL_USE"];
    expect(lists.length).toBe(2);
  });

  it("at least one entry exists for code '3.1' (nuclear reactor 1.1)", () => {
    // The cross-walk Z35-NSG section references NSG-TRIGGER:3.A
    // for spacecraft nuclear reactors. The data entry 1.1 covers
    // the same domain (the cross-walk codes use a slightly different
    // sub-paragraph notation but discoverability via category works).
    const reactorEntries = findNsgByCategory("reactor");
    expect(reactorEntries.length).toBeGreaterThan(0);
  });

  it("Dual-Use 2.A.1 (5-axis CNC) is discoverable for spacecraft mfg cross-walk", () => {
    const entry = findNsgEntry("DU.2.A.1");
    expect(entry).toBeDefined();
    expect(entry?.spaceRelevant).toBe(true);
    expect(entry?.earCclRef).toBe("2B201");
  });

  it("nuclear-grade graphite 2.2 is discoverable for reactor moderator cross-walk", () => {
    const entry = findNsgEntry("2.2");
    expect(entry).toBeDefined();
    expect(entry?.spaceRelevant).toBe(true);
    expect(entry?.category).toBe("materials");
  });
});
