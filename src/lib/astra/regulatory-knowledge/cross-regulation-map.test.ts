import { describe, it, expect } from "vitest";
import {
  CROSS_REGULATION_MAPPINGS,
  analyzeOverlap,
  getMappingsForRegulation,
  getMappingsForArticle,
  getSingleImplementationMappings,
  CROSS_REGULATION_SUMMARY,
} from "./cross-regulation-map";

// ─── CROSS_REGULATION_MAPPINGS ───

describe("CROSS_REGULATION_MAPPINGS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(CROSS_REGULATION_MAPPINGS)).toBe(true);
    expect(CROSS_REGULATION_MAPPINGS.length).toBeGreaterThan(0);
  });

  it("every mapping has required fields", () => {
    for (const mapping of CROSS_REGULATION_MAPPINGS) {
      expect(mapping.id).toBeTruthy();
      expect(mapping.sourceRegulation).toBeTruthy();
      expect(mapping.sourceArticle).toBeTruthy();
      expect(mapping.targetRegulation).toBeTruthy();
      expect(mapping.targetArticle).toBeTruthy();
      expect([
        "single_implementation",
        "partial_overlap",
        "separate_effort",
      ]).toContain(mapping.overlapType);
      expect(mapping.description).toBeTruthy();
    }
  });

  it("contains NIS2 to EU Space Act mappings", () => {
    const nis2ToEUSA = CROSS_REGULATION_MAPPINGS.filter(
      (m) =>
        m.sourceRegulation === "NIS2" && m.targetRegulation === "EU Space Act",
    );
    expect(nis2ToEUSA.length).toBeGreaterThan(0);
  });

  it("contains NIS2 to ISO 27001 mappings", () => {
    const nis2ToISO = CROSS_REGULATION_MAPPINGS.filter(
      (m) =>
        m.sourceRegulation === "NIS2" && m.targetRegulation === "ISO 27001",
    );
    expect(nis2ToISO.length).toBeGreaterThan(0);
  });

  it("contains EU Space Act to IADC Guidelines mappings", () => {
    const eusaToIADC = CROSS_REGULATION_MAPPINGS.filter(
      (m) =>
        m.sourceRegulation === "EU Space Act" &&
        m.targetRegulation === "IADC Guidelines",
    );
    expect(eusaToIADC.length).toBeGreaterThan(0);
  });

  it("most mappings have timeSavingsPercent", () => {
    const withSavings = CROSS_REGULATION_MAPPINGS.filter(
      (m) => m.timeSavingsPercent !== undefined,
    );
    expect(withSavings.length).toBeGreaterThan(
      CROSS_REGULATION_MAPPINGS.length / 2,
    );
  });

  it("timeSavingsPercent is between 0 and 100", () => {
    for (const mapping of CROSS_REGULATION_MAPPINGS) {
      if (mapping.timeSavingsPercent !== undefined) {
        expect(mapping.timeSavingsPercent).toBeGreaterThanOrEqual(0);
        expect(mapping.timeSavingsPercent).toBeLessThanOrEqual(100);
      }
    }
  });

  it("has unique ids", () => {
    const ids = CROSS_REGULATION_MAPPINGS.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });
});

// ─── analyzeOverlap ───

describe("analyzeOverlap", () => {
  it("analyzes NIS2 vs EU Space Act overlap", () => {
    const result = analyzeOverlap("NIS2", "EU Space Act");
    expect(result.regulation1).toBe("NIS2");
    expect(result.regulation2).toBe("EU Space Act");
    expect(result.totalMappings).toBeGreaterThan(0);
    expect(result.singleImplementation).toBeGreaterThanOrEqual(0);
    expect(result.partialOverlap).toBeGreaterThanOrEqual(0);
    expect(result.separateEffort).toBeGreaterThanOrEqual(0);
    expect(result.estimatedSavingsPercent).toBeGreaterThanOrEqual(0);
  });

  it("analysis is symmetric (both directions produce same result)", () => {
    const forward = analyzeOverlap("NIS2", "EU Space Act");
    const reverse = analyzeOverlap("EU Space Act", "NIS2");
    expect(forward.totalMappings).toBe(reverse.totalMappings);
    expect(forward.singleImplementation).toBe(reverse.singleImplementation);
  });

  it("analyzes NIS2 vs ISO 27001 overlap", () => {
    const result = analyzeOverlap("NIS2", "ISO 27001");
    expect(result.totalMappings).toBeGreaterThan(0);
    expect(result.estimatedSavingsPercent).toBeGreaterThan(0);
  });

  it("returns zero for unrelated regulations", () => {
    const result = analyzeOverlap("NONEXISTENT_1", "NONEXISTENT_2");
    expect(result.totalMappings).toBe(0);
    expect(result.singleImplementation).toBe(0);
    expect(result.partialOverlap).toBe(0);
    expect(result.separateEffort).toBe(0);
    expect(result.estimatedSavingsPercent).toBe(0);
  });

  it("total counts add up", () => {
    const result = analyzeOverlap("NIS2", "EU Space Act");
    expect(
      result.singleImplementation +
        result.partialOverlap +
        result.separateEffort,
    ).toBe(result.totalMappings);
  });

  it("savings percent is rounded", () => {
    const result = analyzeOverlap("NIS2", "EU Space Act");
    expect(result.estimatedSavingsPercent).toBe(
      Math.round(result.estimatedSavingsPercent),
    );
  });
});

// ─── getMappingsForRegulation ───

describe("getMappingsForRegulation", () => {
  it("returns mappings for NIS2", () => {
    const results = getMappingsForRegulation("NIS2");
    expect(results.length).toBeGreaterThan(0);
    for (const mapping of results) {
      expect(
        mapping.sourceRegulation === "NIS2" ||
          mapping.targetRegulation === "NIS2",
      ).toBe(true);
    }
  });

  it("returns mappings for EU Space Act", () => {
    const results = getMappingsForRegulation("EU Space Act");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns mappings for ISO 27001", () => {
    const results = getMappingsForRegulation("ISO 27001");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown regulation", () => {
    const results = getMappingsForRegulation("NONEXISTENT");
    expect(results).toEqual([]);
  });
});

// ─── getMappingsForArticle ───

describe("getMappingsForArticle", () => {
  it("returns mappings for Art. 21(2)(a)", () => {
    const results = getMappingsForArticle("Art. 21(2)(a)");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns mappings for Art. 23", () => {
    const results = getMappingsForArticle("Art. 23");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown article", () => {
    const results = getMappingsForArticle("Art. 9999");
    expect(results).toEqual([]);
  });

  it("matches both source and target articles", () => {
    const results = getMappingsForArticle("Art. 74-76");
    expect(results.length).toBeGreaterThan(0);
  });
});

// ─── getSingleImplementationMappings ───

describe("getSingleImplementationMappings", () => {
  it("returns only single_implementation mappings", () => {
    const results = getSingleImplementationMappings();
    expect(results.length).toBeGreaterThan(0);
    for (const mapping of results) {
      expect(mapping.overlapType).toBe("single_implementation");
    }
  });

  it("returns a subset of all mappings", () => {
    const singleImpl = getSingleImplementationMappings();
    expect(singleImpl.length).toBeLessThanOrEqual(
      CROSS_REGULATION_MAPPINGS.length,
    );
  });
});

// ─── CROSS_REGULATION_SUMMARY ───

describe("CROSS_REGULATION_SUMMARY", () => {
  it("is a non-empty string", () => {
    expect(typeof CROSS_REGULATION_SUMMARY).toBe("string");
    expect(CROSS_REGULATION_SUMMARY.length).toBeGreaterThan(100);
  });

  it("mentions key regulation names", () => {
    expect(CROSS_REGULATION_SUMMARY).toContain("NIS2");
    expect(CROSS_REGULATION_SUMMARY).toContain("EU Space Act");
    expect(CROSS_REGULATION_SUMMARY).toContain("ISO 27001");
  });

  it("mentions savings", () => {
    expect(CROSS_REGULATION_SUMMARY).toContain("savings");
  });
});
