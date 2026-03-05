import { describe, it, expect } from "vitest";
import {
  faqs,
  getAllFaqs,
  getFaqsByCategory,
  getFaqById,
  getAllCategories,
  getCategoryLabel,
  searchFaqs,
  FAQ,
} from "./faqs";

// ---------------------------------------------------------------------------
// faqs array
// ---------------------------------------------------------------------------
describe("faqs array", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(faqs)).toBe(true);
    expect(faqs.length).toBeGreaterThan(0);
  });

  it("each FAQ has required fields", () => {
    for (const faq of faqs) {
      expect(faq.id).toBeTruthy();
      expect(faq.question).toBeTruthy();
      expect(faq.answer).toBeTruthy();
      expect(faq.category).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// getAllFaqs
// ---------------------------------------------------------------------------
describe("getAllFaqs", () => {
  it("returns all FAQs including additional FAQs", () => {
    const all = getAllFaqs();
    expect(all.length).toBeGreaterThan(faqs.length);
  });

  it("returns FAQ objects with correct shape", () => {
    const all = getAllFaqs();
    for (const faq of all) {
      expect(faq).toHaveProperty("id");
      expect(faq).toHaveProperty("question");
      expect(faq).toHaveProperty("answer");
      expect(faq).toHaveProperty("category");
    }
  });
});

// ---------------------------------------------------------------------------
// getFaqsByCategory
// ---------------------------------------------------------------------------
describe("getFaqsByCategory", () => {
  it("returns FAQs for the eu-space-act category", () => {
    const results = getFaqsByCategory("eu-space-act");
    expect(results.length).toBeGreaterThan(0);
    for (const faq of results) {
      expect(faq.category).toBe("eu-space-act");
    }
  });

  it("returns FAQs for the nis2 category", () => {
    const results = getFaqsByCategory("nis2");
    expect(results.length).toBeGreaterThan(0);
    for (const faq of results) {
      expect(faq.category).toBe("nis2");
    }
  });

  it("returns FAQs for the platform category", () => {
    const results = getFaqsByCategory("platform");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns FAQs for the technical category", () => {
    const results = getFaqsByCategory("technical");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns FAQs for the licensing category", () => {
    const results = getFaqsByCategory("licensing");
    expect(results.length).toBeGreaterThan(0);
  });

  it("returns FAQs for the compliance category", () => {
    const results = getFaqsByCategory("compliance");
    expect(results.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// getFaqById
// ---------------------------------------------------------------------------
describe("getFaqById", () => {
  it("returns a FAQ for a known id from the base array", () => {
    const faq = getFaqById("what-is-eu-space-act");
    expect(faq).toBeDefined();
    expect(faq!.id).toBe("what-is-eu-space-act");
    expect(faq!.question).toContain("EU Space Act");
  });

  it("returns a FAQ from the additional faqs", () => {
    const faq = getFaqById("eu-space-act-vs-national-laws");
    expect(faq).toBeDefined();
    expect(faq!.id).toBe("eu-space-act-vs-national-laws");
  });

  it("returns undefined for a non-existent id", () => {
    const faq = getFaqById("nonexistent-faq-id-xyz");
    expect(faq).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    const faq = getFaqById("");
    expect(faq).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getAllCategories
// ---------------------------------------------------------------------------
describe("getAllCategories", () => {
  it("returns all six category values", () => {
    const categories = getAllCategories();
    expect(categories).toEqual([
      "eu-space-act",
      "nis2",
      "licensing",
      "compliance",
      "platform",
      "technical",
    ]);
  });

  it("returns an array of length 6", () => {
    expect(getAllCategories().length).toBe(6);
  });
});

// ---------------------------------------------------------------------------
// getCategoryLabel
// ---------------------------------------------------------------------------
describe("getCategoryLabel", () => {
  it('returns "EU Space Act" for eu-space-act', () => {
    expect(getCategoryLabel("eu-space-act")).toBe("EU Space Act");
  });

  it('returns "NIS2 Directive" for nis2', () => {
    expect(getCategoryLabel("nis2")).toBe("NIS2 Directive");
  });

  it('returns "Licensing & Authorization" for licensing', () => {
    expect(getCategoryLabel("licensing")).toBe("Licensing & Authorization");
  });

  it('returns "Compliance" for compliance', () => {
    expect(getCategoryLabel("compliance")).toBe("Compliance");
  });

  it('returns "Caelex Platform" for platform', () => {
    expect(getCategoryLabel("platform")).toBe("Caelex Platform");
  });

  it('returns "Technical Requirements" for technical', () => {
    expect(getCategoryLabel("technical")).toBe("Technical Requirements");
  });
});

// ---------------------------------------------------------------------------
// searchFaqs
// ---------------------------------------------------------------------------
describe("searchFaqs", () => {
  it("finds FAQs matching a keyword in the question", () => {
    const results = searchFaqs("authorization");
    expect(results.length).toBeGreaterThan(0);
    const hasMatch = results.some(
      (faq) =>
        faq.question.toLowerCase().includes("authorization") ||
        faq.answer.toLowerCase().includes("authorization"),
    );
    expect(hasMatch).toBe(true);
  });

  it("finds FAQs matching a keyword in the answer", () => {
    const results = searchFaqs("cybersecurity");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const upper = searchFaqs("NIS2");
    const lower = searchFaqs("nis2");
    expect(upper.length).toBe(lower.length);
  });

  it("returns an empty array for a nonsense query", () => {
    const results = searchFaqs("xyzzyfoobarbaz999");
    expect(results).toEqual([]);
  });

  it("returns all FAQs for an empty query string", () => {
    const results = searchFaqs("");
    const all = getAllFaqs();
    expect(results.length).toBe(all.length);
  });
});
