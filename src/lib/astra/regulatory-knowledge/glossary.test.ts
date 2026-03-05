import { describe, it, expect } from "vitest";
import {
  GLOSSARY_TERMS,
  getTermByAbbreviation,
  searchTerms,
  getTermsByContext,
  getRelatedTerms,
  GLOSSARY_INDEX,
} from "./glossary";

// ─── GLOSSARY_TERMS data ───

describe("GLOSSARY_TERMS", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(GLOSSARY_TERMS)).toBe(true);
    expect(GLOSSARY_TERMS.length).toBeGreaterThan(0);
  });

  it("every term has required fields", () => {
    for (const term of GLOSSARY_TERMS) {
      expect(term.abbreviation).toBeTruthy();
      expect(typeof term.abbreviation).toBe("string");
      expect(term.fullName).toBeTruthy();
      expect(typeof term.fullName).toBe("string");
      expect(term.definition).toBeTruthy();
      expect(typeof term.definition).toBe("string");
      expect(Array.isArray(term.regulatoryContext)).toBe(true);
      expect(term.regulatoryContext.length).toBeGreaterThan(0);
      expect(Array.isArray(term.relatedTerms)).toBe(true);
    }
  });

  it("contains well-known operator type terms", () => {
    const abbreviations = GLOSSARY_TERMS.map((t) => t.abbreviation);
    expect(abbreviations).toContain("SCO");
    expect(abbreviations).toContain("LO");
    expect(abbreviations).toContain("LSO");
    expect(abbreviations).toContain("ISOS");
    expect(abbreviations).toContain("CAP");
    expect(abbreviations).toContain("PDP");
    expect(abbreviations).toContain("TCO");
  });

  it("contains regulatory body terms", () => {
    const abbreviations = GLOSSARY_TERMS.map((t) => t.abbreviation);
    expect(abbreviations).toContain("NCA");
    expect(abbreviations).toContain("CSIRT");
    expect(abbreviations).toContain("ENISA");
  });

  it("contains orbit type terms", () => {
    const abbreviations = GLOSSARY_TERMS.map((t) => t.abbreviation);
    expect(abbreviations).toContain("LEO");
    expect(abbreviations).toContain("MEO");
    expect(abbreviations).toContain("GEO");
    expect(abbreviations).toContain("SSO");
  });

  it("some terms have examples arrays", () => {
    const withExamples = GLOSSARY_TERMS.filter(
      (t) => t.examples && t.examples.length > 0,
    );
    expect(withExamples.length).toBeGreaterThan(0);
  });
});

// ─── GLOSSARY_INDEX ───

describe("GLOSSARY_INDEX", () => {
  it("is an object keyed by abbreviation", () => {
    expect(typeof GLOSSARY_INDEX).toBe("object");
    expect(GLOSSARY_INDEX["SCO"]).toBeDefined();
    expect(GLOSSARY_INDEX["SCO"].fullName).toBe("Spacecraft Operator");
  });

  it("has same count as GLOSSARY_TERMS", () => {
    expect(Object.keys(GLOSSARY_INDEX).length).toBe(GLOSSARY_TERMS.length);
  });
});

// ─── getTermByAbbreviation ───

describe("getTermByAbbreviation", () => {
  it("returns a term for a known abbreviation", () => {
    const term = getTermByAbbreviation("SCO");
    expect(term).toBeDefined();
    expect(term!.abbreviation).toBe("SCO");
    expect(term!.fullName).toBe("Spacecraft Operator");
  });

  it("is case-insensitive", () => {
    const lower = getTermByAbbreviation("sco");
    const upper = getTermByAbbreviation("SCO");
    const mixed = getTermByAbbreviation("Sco");
    expect(lower).toEqual(upper);
    expect(lower).toEqual(mixed);
  });

  it("returns undefined for unknown abbreviation", () => {
    const term = getTermByAbbreviation("NONEXISTENT");
    expect(term).toBeUndefined();
  });

  it("finds NIS2 term", () => {
    const term = getTermByAbbreviation("NIS2");
    expect(term).toBeDefined();
    expect(term!.fullName).toBe("Network and Information Security Directive 2");
  });

  it("finds TPL term", () => {
    const term = getTermByAbbreviation("TPL");
    expect(term).toBeDefined();
    expect(term!.fullName).toBe("Third-Party Liability");
  });
});

// ─── searchTerms ───

describe("searchTerms", () => {
  it("returns matching terms by abbreviation", () => {
    const results = searchTerms("SCO");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((t) => t.abbreviation === "SCO")).toBe(true);
  });

  it("returns matching terms by fullName", () => {
    const results = searchTerms("Spacecraft Operator");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((t) => t.abbreviation === "SCO")).toBe(true);
  });

  it("returns matching terms by definition content", () => {
    const results = searchTerms("geostationary");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((t) => t.abbreviation === "GEO")).toBe(true);
  });

  it("is case-insensitive", () => {
    const resultsLower = searchTerms("spacecraft");
    const resultsUpper = searchTerms("SPACECRAFT");
    expect(resultsLower.length).toBe(resultsUpper.length);
  });

  it("returns empty array for no matches", () => {
    const results = searchTerms("zzzznonexistenttermzzzz");
    expect(results).toEqual([]);
  });

  it("returns multiple matches for broad queries", () => {
    const results = searchTerms("orbit");
    expect(results.length).toBeGreaterThan(1);
  });
});

// ─── getTermsByContext ───

describe("getTermsByContext", () => {
  it("returns terms for EU Space Act context", () => {
    const results = getTermsByContext("EU Space Act");
    expect(results.length).toBeGreaterThan(0);
    for (const term of results) {
      expect(
        term.regulatoryContext.some((ctx) =>
          ctx.toLowerCase().includes("eu space act"),
        ),
      ).toBe(true);
    }
  });

  it("returns terms for NIS2 context", () => {
    const results = getTermsByContext("NIS2");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const lower = getTermsByContext("nis2");
    const upper = getTermsByContext("NIS2");
    expect(lower.length).toBe(upper.length);
  });

  it("returns empty array for unknown context", () => {
    const results = getTermsByContext("NONEXISTENT_REGULATION");
    expect(results).toEqual([]);
  });
});

// ─── getRelatedTerms ───

describe("getRelatedTerms", () => {
  it("returns related terms for SCO", () => {
    const results = getRelatedTerms("SCO");
    expect(results.length).toBeGreaterThan(0);
    // SCO has relatedTerms ["LO", "ISOS", "Space Object"]
    const abbreviations = results.map((t) => t.abbreviation);
    expect(abbreviations).toContain("LO");
    expect(abbreviations).toContain("ISOS");
  });

  it("returns empty array for unknown abbreviation", () => {
    const results = getRelatedTerms("NONEXISTENT");
    expect(results).toEqual([]);
  });

  it("only returns terms that exist in glossary", () => {
    // SCO has related term "Space Object" which may not be in the glossary
    const results = getRelatedTerms("SCO");
    for (const term of results) {
      expect(term.abbreviation).toBeTruthy();
      expect(term.fullName).toBeTruthy();
    }
  });

  it("returns related terms for LEO", () => {
    const results = getRelatedTerms("LEO");
    expect(results.length).toBeGreaterThan(0);
  });
});
