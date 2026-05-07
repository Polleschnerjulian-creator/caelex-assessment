/**
 * Sprint B2 — Classification lookup engine tests.
 *
 * Tests the multi-jurisdiction lookup functions in classification-lookup.ts.
 * All functions are pure — no DB, no network, no async.
 */

import { describe, it, expect } from "vitest";

import {
  ALL_CLASSIFICATION_ENTRIES,
  findEntry,
  findEntriesAllJurisdictions,
  findRelatedClassifications,
  findEntriesByTopic,
  findEntriesByTopicGrouped,
  getTopic,
  getAllTopics,
  getEntriesForJurisdiction,
  isTopicMtcrCategoryI,
  getAllMtcrCategoryIEntries,
  isItarControlled,
  hasItarEntry,
  isMtControlled,
  isNsControlled,
  searchEntries,
  findEntriesByCodePrefix,
} from "./classification-lookup";

// ─── ALL_CLASSIFICATION_ENTRIES ───────────────────────────────────────

describe("ALL_CLASSIFICATION_ENTRIES", () => {
  it("contains entries from all 5 jurisdictions", () => {
    const jurisdictions = new Set(
      ALL_CLASSIFICATION_ENTRIES.map((e) => e.jurisdiction),
    );
    expect(jurisdictions.has("EU_ANNEX_I")).toBe(true);
    expect(jurisdictions.has("US_CCL")).toBe(true);
    expect(jurisdictions.has("USML")).toBe(true);
    expect(jurisdictions.has("MTCR_ANNEX")).toBe(true);
    expect(jurisdictions.has("DE_ANLAGE_AL")).toBe(true);
  });

  it("has at least 50 entries in total", () => {
    expect(ALL_CLASSIFICATION_ENTRIES.length).toBeGreaterThanOrEqual(50);
  });
});

// ─── findEntry ────────────────────────────────────────────────────────

describe("findEntry", () => {
  it("finds a known EU Annex I entry", () => {
    const entry = findEntry("9A004", "EU_ANNEX_I");
    expect(entry).toBeDefined();
    expect(entry?.code).toBe("9A004");
    expect(entry?.jurisdiction).toBe("EU_ANNEX_I");
  });

  it("finds a known US CCL entry", () => {
    const entry = findEntry("9A515.a", "US_CCL");
    expect(entry).toBeDefined();
    expect(entry?.jurisdiction).toBe("US_CCL");
  });

  it("finds a known USML entry", () => {
    const entry = findEntry("XV(a)(1)", "USML");
    expect(entry).toBeDefined();
    expect(entry?.jurisdiction).toBe("USML");
  });

  it("returns undefined for unknown code", () => {
    expect(findEntry("ZZZZ", "EU_ANNEX_I")).toBeUndefined();
  });

  it("does NOT cross jurisdictions — 9A004 in US_CCL != EU_ANNEX_I", () => {
    // 9A004 exists in both EU_ANNEX_I and US_CCL but they're different entries
    const eu = findEntry("9A004", "EU_ANNEX_I");
    const us = findEntry("9A004", "US_CCL");
    expect(eu).toBeDefined();
    expect(us).toBeDefined();
    expect(eu?.jurisdiction).toBe("EU_ANNEX_I");
    expect(us?.jurisdiction).toBe("US_CCL");
  });
});

// ─── findEntriesAllJurisdictions ──────────────────────────────────────

describe("findEntriesAllJurisdictions", () => {
  it("returns entries from multiple jurisdictions for a shared code", () => {
    // 9A004 exists in EU_ANNEX_I and US_CCL (and possibly DE_ANLAGE_AL)
    const results = findEntriesAllJurisdictions("9A004");
    expect(results.length).toBeGreaterThanOrEqual(2);
    const jurisdictions = results.map((e) => e.jurisdiction);
    expect(jurisdictions).toContain("EU_ANNEX_I");
    expect(jurisdictions).toContain("US_CCL");
  });

  it("returns empty array for unknown code", () => {
    expect(findEntriesAllJurisdictions("NONEXISTENT_CODE")).toHaveLength(0);
  });
});

// ─── findRelatedClassifications ───────────────────────────────────────

describe("findRelatedClassifications", () => {
  it("returns related entries across jurisdictions for a topic entry", () => {
    const entry = findEntry("9A004", "EU_ANNEX_I");
    expect(entry).toBeDefined();

    const related = findRelatedClassifications(entry!);
    expect(related.length).toBeGreaterThan(0);
    // Should not include the original entry itself
    const hasSelf = related.some(
      (e) => e.code === "9A004" && e.jurisdiction === "EU_ANNEX_I",
    );
    expect(hasSelf).toBe(false);
  });

  it("returns empty array for entry with null crossReferenceTopic", () => {
    const entryWithNullTopic = ALL_CLASSIFICATION_ENTRIES.find(
      (e) => e.crossReferenceTopic === null,
    );
    if (!entryWithNullTopic) {
      // If no such entry exists, test is vacuously true
      return;
    }
    expect(findRelatedClassifications(entryWithNullTopic)).toHaveLength(0);
  });
});

// ─── findEntriesByTopic ───────────────────────────────────────────────

describe("findEntriesByTopic", () => {
  it("returns all entries for hall-thrusters-electric-propulsion", () => {
    const entries = findEntriesByTopic("hall-thrusters-electric-propulsion");
    expect(entries.length).toBeGreaterThanOrEqual(3);
    // Should have EU, US, USML, MTCR entries
    const jurisdictions = new Set(entries.map((e) => e.jurisdiction));
    expect(jurisdictions.has("EU_ANNEX_I")).toBe(true);
    expect(jurisdictions.has("US_CCL")).toBe(true);
  });

  it("returns empty array for unknown topic slug", () => {
    expect(findEntriesByTopic("nonexistent-topic")).toHaveLength(0);
  });
});

// ─── findEntriesByTopicGrouped ────────────────────────────────────────

describe("findEntriesByTopicGrouped", () => {
  it("groups entries by jurisdiction for complete-launch-vehicles", () => {
    const grouped = findEntriesByTopicGrouped("complete-launch-vehicles");
    expect(Object.keys(grouped).length).toBeGreaterThan(0);
    // Check that each group only contains entries for that jurisdiction
    for (const [jurisdiction, entries] of Object.entries(grouped)) {
      for (const entry of entries!) {
        expect(entry.jurisdiction).toBe(jurisdiction);
      }
    }
  });
});

// ─── getTopic / getAllTopics ───────────────────────────────────────────

describe("getTopic", () => {
  it("returns topic for known slug", () => {
    const topic = getTopic("hall-thrusters-electric-propulsion");
    expect(topic).toBeDefined();
    expect(topic?.slug).toBe("hall-thrusters-electric-propulsion");
    expect(topic?.title).toBeTruthy();
  });

  it("returns undefined for unknown slug", () => {
    expect(getTopic("unknown-slug")).toBeUndefined();
  });
});

describe("getAllTopics", () => {
  it("returns all cross-reference topics", () => {
    const topics = getAllTopics();
    expect(topics.length).toBeGreaterThan(10);
  });
});

// ─── getEntriesForJurisdiction ────────────────────────────────────────

describe("getEntriesForJurisdiction", () => {
  it("returns only EU_ANNEX_I entries", () => {
    const entries = getEntriesForJurisdiction("EU_ANNEX_I");
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("returns only USML entries", () => {
    const entries = getEntriesForJurisdiction("USML");
    expect(entries.length).toBeGreaterThan(0);
    for (const e of entries) {
      expect(e.jurisdiction).toBe("USML");
    }
  });
});

// ─── MTCR gates ───────────────────────────────────────────────────────

describe("isTopicMtcrCategoryI", () => {
  it("returns true for complete-launch-vehicles", () => {
    expect(isTopicMtcrCategoryI("complete-launch-vehicles")).toBe(true);
  });

  it("returns false for topics with no Cat. I entries", () => {
    // optical-comm-terminals has no MTCR Cat. I
    expect(isTopicMtcrCategoryI("optical-comm-terminals")).toBe(false);
  });
});

describe("getAllMtcrCategoryIEntries", () => {
  it("returns only Cat. I entries", () => {
    const catI = getAllMtcrCategoryIEntries();
    expect(catI.length).toBeGreaterThan(0);
    for (const e of catI) {
      expect(e.mtcrCategory).toBe("I");
    }
  });
});

// ─── ITAR detection ───────────────────────────────────────────────────

describe("isItarControlled", () => {
  it("returns true for USML entries", () => {
    const entry = findEntry("XV(a)(1)", "USML");
    expect(entry).toBeDefined();
    expect(isItarControlled(entry!)).toBe(true);
  });

  it("returns false for EU Annex I entries", () => {
    const entry = findEntry("9A004", "EU_ANNEX_I");
    expect(entry).toBeDefined();
    expect(isItarControlled(entry!)).toBe(false);
  });
});

describe("hasItarEntry", () => {
  it("returns true for topics with USML entries", () => {
    // complete-launch-vehicles has USML IV(a)(1) → ITAR
    expect(hasItarEntry("complete-launch-vehicles")).toBe(true);
    // spacecraft-bus-platforms has USML XV(a)(1) → ITAR
    expect(hasItarEntry("spacecraft-bus-platforms")).toBe(true);
  });

  it("returns false for topics with no USML entries", () => {
    // high-entropy-alloys-refractory has no USML entries
    expect(hasItarEntry("high-entropy-alloys-refractory")).toBe(false);
    // metal-additive-manufacturing-aerospace has no USML entries
    expect(hasItarEntry("metal-additive-manufacturing-aerospace")).toBe(false);
  });
});

// ─── Control reason helpers ───────────────────────────────────────────

describe("isMtControlled", () => {
  it("returns true for MTCR-controlled entries", () => {
    const entry = findEntry("1.A.1", "MTCR_ANNEX");
    expect(entry).toBeDefined();
    expect(isMtControlled(entry!)).toBe(true);
  });
});

describe("isNsControlled", () => {
  it("returns true for NS-controlled entries", () => {
    const entry = findEntry("9A004", "EU_ANNEX_I");
    expect(entry).toBeDefined();
    expect(isNsControlled(entry!)).toBe(true);
  });
});

// ─── searchEntries ────────────────────────────────────────────────────

describe("searchEntries", () => {
  it("finds entries matching code prefix", () => {
    const results = searchEntries("9A004");
    expect(results.length).toBeGreaterThan(0);
    // All results should have 9A004 in code, title, or description
    for (const r of results) {
      const text = `${r.code} ${r.title} ${r.description}`.toLowerCase();
      expect(text).toContain("9a004");
    }
  });

  it("finds entries matching title keyword", () => {
    const results = searchEntries("Hall-effect");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for empty query", () => {
    expect(searchEntries("")).toHaveLength(0);
  });

  it("respects limit parameter", () => {
    const results = searchEntries("rocket", 3);
    expect(results.length).toBeLessThanOrEqual(3);
  });
});

// ─── findEntriesByCodePrefix ──────────────────────────────────────────

describe("findEntriesByCodePrefix", () => {
  it("finds all 9A entries across jurisdictions", () => {
    const results = findEntriesByCodePrefix("9A");
    expect(results.length).toBeGreaterThan(5);
    for (const r of results) {
      expect(r.code).toMatch(/^9A/);
    }
  });

  it("filters by jurisdiction when provided", () => {
    const results = findEntriesByCodePrefix("9A", "EU_ANNEX_I");
    for (const r of results) {
      expect(r.jurisdiction).toBe("EU_ANNEX_I");
    }
  });

  it("returns empty array for unknown prefix", () => {
    expect(findEntriesByCodePrefix("ZZZZZZ")).toHaveLength(0);
  });
});
