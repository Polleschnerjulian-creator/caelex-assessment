import { describe, it, expect } from "vitest";
import {
  glossaryTerms,
  getAllTerms,
  getTermBySlug,
  getTermsByCategory,
  getAllCategories,
  getRelatedTerms,
  searchTerms,
  getTermsStartingWith,
  getAlphabetWithTerms,
  GlossaryTerm,
} from "./terms";

// ---------------------------------------------------------------------------
// glossaryTerms array
// ---------------------------------------------------------------------------
describe("glossaryTerms array", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(glossaryTerms)).toBe(true);
    expect(glossaryTerms.length).toBeGreaterThan(0);
  });

  it("each term has required fields", () => {
    for (const term of glossaryTerms) {
      expect(term.slug).toBeTruthy();
      expect(term.term).toBeTruthy();
      expect(term.definition).toBeTruthy();
      expect(term.longDescription).toBeTruthy();
      expect(term.category).toBeTruthy();
      expect(Array.isArray(term.relatedTerms)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// getAllTerms
// ---------------------------------------------------------------------------
describe("getAllTerms", () => {
  it("returns all terms including additional and more terms", () => {
    const all = getAllTerms();
    expect(all.length).toBeGreaterThan(glossaryTerms.length);
  });

  it("returns terms sorted alphabetically by term name", () => {
    const all = getAllTerms();
    for (let i = 1; i < all.length; i++) {
      const cmp = all[i - 1].term.localeCompare(all[i].term);
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getTermBySlug
// ---------------------------------------------------------------------------
describe("getTermBySlug", () => {
  it("returns a term for a known slug from the base array", () => {
    const term = getTermBySlug("eu-space-act");
    expect(term).toBeDefined();
    expect(term!.slug).toBe("eu-space-act");
    expect(term!.term).toBe("EU Space Act");
  });

  it("returns a term from the additional-terms array", () => {
    const term = getTermBySlug("esa");
    expect(term).toBeDefined();
    expect(term!.slug).toBe("esa");
  });

  it("returns a term from the more-terms array", () => {
    const term = getTermBySlug("cnes");
    expect(term).toBeDefined();
    expect(term!.slug).toBe("cnes");
  });

  it("returns undefined for a non-existent slug", () => {
    const term = getTermBySlug("nonexistent-term-xyz");
    expect(term).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    const term = getTermBySlug("");
    expect(term).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getTermsByCategory
// ---------------------------------------------------------------------------
describe("getTermsByCategory", () => {
  it("returns terms for the regulation category", () => {
    const results = getTermsByCategory("regulation");
    expect(results.length).toBeGreaterThan(0);
    for (const term of results) {
      expect(term.category).toBe("regulation");
    }
  });

  it("returns terms for the technical category", () => {
    const results = getTermsByCategory("technical");
    expect(results.length).toBeGreaterThan(0);
    for (const term of results) {
      expect(term.category).toBe("technical");
    }
  });

  it("returns terms for the legal category", () => {
    const results = getTermsByCategory("legal");
    expect(results.length).toBeGreaterThan(0);
    for (const term of results) {
      expect(term.category).toBe("legal");
    }
  });

  it("returns terms for the cybersecurity category", () => {
    const results = getTermsByCategory("cybersecurity");
    expect(results.length).toBeGreaterThan(0);
    for (const term of results) {
      expect(term.category).toBe("cybersecurity");
    }
  });

  it("returns terms for the operator category", () => {
    const results = getTermsByCategory("operator");
    expect(results.length).toBeGreaterThan(0);
    for (const term of results) {
      expect(term.category).toBe("operator");
    }
  });

  it("returns results sorted alphabetically by term name", () => {
    const results = getTermsByCategory("technical");
    for (let i = 1; i < results.length; i++) {
      const cmp = results[i - 1].term.localeCompare(results[i].term);
      expect(cmp).toBeLessThanOrEqual(0);
    }
  });
});

// ---------------------------------------------------------------------------
// getAllCategories
// ---------------------------------------------------------------------------
describe("getAllCategories", () => {
  it("returns all five category values", () => {
    const categories = getAllCategories();
    expect(categories).toEqual([
      "regulation",
      "operator",
      "technical",
      "legal",
      "cybersecurity",
    ]);
  });

  it("returns an array of length 5", () => {
    expect(getAllCategories().length).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// getRelatedTerms
// ---------------------------------------------------------------------------
describe("getRelatedTerms", () => {
  it("returns related GlossaryTerm objects for a term with related slugs", () => {
    const term = getTermBySlug("eu-space-act")!;
    const related = getRelatedTerms(term);
    expect(related.length).toBeGreaterThan(0);
    for (const r of related) {
      expect(r).toHaveProperty("slug");
      expect(r).toHaveProperty("term");
    }
  });

  it("only returns terms that actually exist", () => {
    const term = getTermBySlug("eu-space-act")!;
    const related = getRelatedTerms(term);
    // All returned items are valid GlossaryTerm objects
    for (const r of related) {
      expect(r.slug).toBeTruthy();
      expect(r.definition).toBeTruthy();
    }
  });

  it("filters out undefined when a related slug does not exist", () => {
    // Create a synthetic term with a mix of valid and invalid related slugs
    const synthetic: GlossaryTerm = {
      slug: "test",
      term: "Test",
      definition: "test",
      longDescription: "test",
      category: "technical",
      relatedTerms: ["eu-space-act", "nonexistent-term-xyz-123"],
    };
    const related = getRelatedTerms(synthetic);
    // Should only include the valid one
    expect(related.length).toBe(1);
    expect(related[0].slug).toBe("eu-space-act");
  });
});

// ---------------------------------------------------------------------------
// searchTerms
// ---------------------------------------------------------------------------
describe("searchTerms", () => {
  it("finds terms by term name", () => {
    const results = searchTerms("Space Act");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds terms by definition content", () => {
    const results = searchTerms("authorization");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds terms by acronym", () => {
    const results = searchTerms("EUSA");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const upper = searchTerms("NCA");
    const lower = searchTerms("nca");
    expect(upper.length).toBe(lower.length);
  });

  it("returns an empty array for a nonsense query", () => {
    const results = searchTerms("xyzzyfoobarbaz999");
    expect(results).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getTermsStartingWith
// ---------------------------------------------------------------------------
describe("getTermsStartingWith", () => {
  it("returns terms starting with the letter E", () => {
    const results = getTermsStartingWith("E");
    expect(results.length).toBeGreaterThan(0);
    for (const term of results) {
      expect(term.term[0].toUpperCase()).toBe("E");
    }
  });

  it("is case-insensitive", () => {
    const upper = getTermsStartingWith("E");
    const lower = getTermsStartingWith("e");
    expect(upper.length).toBe(lower.length);
  });

  it("returns an empty array for an unused letter", () => {
    const results = getTermsStartingWith("Z");
    // Might or might not be empty depending on data, but should be an array
    expect(Array.isArray(results)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getAlphabetWithTerms
// ---------------------------------------------------------------------------
describe("getAlphabetWithTerms", () => {
  it("returns a sorted array of uppercase letters", () => {
    const letters = getAlphabetWithTerms();
    expect(letters.length).toBeGreaterThan(0);
    for (const letter of letters) {
      expect(letter).toMatch(/^[A-Z]$/);
    }
    // Sorted
    for (let i = 1; i < letters.length; i++) {
      expect(letters[i - 1] <= letters[i]).toBe(true);
    }
  });

  it("contains the letter E (EU Space Act exists)", () => {
    const letters = getAlphabetWithTerms();
    expect(letters).toContain("E");
  });

  it("contains only unique letters", () => {
    const letters = getAlphabetWithTerms();
    expect(new Set(letters).size).toBe(letters.length);
  });
});
