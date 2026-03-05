import { describe, it, expect } from "vitest";
import {
  EU_SPACE_ACT_CHAPTERS,
  OPERATOR_TYPES,
  KEY_ARTICLES,
  getArticleById,
  getArticleByNumber,
  getArticlesForOperatorType,
  getArticlesForChapter,
  searchArticles,
  EU_SPACE_ACT_SUMMARY,
} from "./eu-space-act";

// ─── EU_SPACE_ACT_CHAPTERS ───

describe("EU_SPACE_ACT_CHAPTERS", () => {
  it("is a non-empty object", () => {
    expect(typeof EU_SPACE_ACT_CHAPTERS).toBe("object");
    expect(Object.keys(EU_SPACE_ACT_CHAPTERS).length).toBeGreaterThan(0);
  });

  it("has Title I through Title X", () => {
    expect(EU_SPACE_ACT_CHAPTERS["Title I"]).toBeDefined();
    expect(EU_SPACE_ACT_CHAPTERS["Title II"]).toBeDefined();
    expect(EU_SPACE_ACT_CHAPTERS["Title VII"]).toBeDefined();
    expect(EU_SPACE_ACT_CHAPTERS["Title X"]).toBeDefined();
  });

  it("each chapter has name, articles, and description", () => {
    for (const [, chapter] of Object.entries(EU_SPACE_ACT_CHAPTERS)) {
      expect(chapter.name).toBeTruthy();
      expect(Array.isArray(chapter.articles)).toBe(true);
      expect(chapter.articles.length).toBeGreaterThan(0);
      expect(chapter.description).toBeTruthy();
    }
  });

  it("Title VII covers Cybersecurity", () => {
    expect(EU_SPACE_ACT_CHAPTERS["Title VII"].name).toBe("Cybersecurity");
  });
});

// ─── OPERATOR_TYPES ───

describe("OPERATOR_TYPES", () => {
  it("has all 7 operator types", () => {
    expect(Object.keys(OPERATOR_TYPES)).toHaveLength(7);
    expect(OPERATOR_TYPES.SCO).toBeDefined();
    expect(OPERATOR_TYPES.LO).toBeDefined();
    expect(OPERATOR_TYPES.LSO).toBeDefined();
    expect(OPERATOR_TYPES.ISOS).toBeDefined();
    expect(OPERATOR_TYPES.CAP).toBeDefined();
    expect(OPERATOR_TYPES.PDP).toBeDefined();
    expect(OPERATOR_TYPES.TCO).toBeDefined();
  });

  it("each type has code, name, definition, keyObligations, applicableChapters", () => {
    for (const [key, type] of Object.entries(OPERATOR_TYPES)) {
      expect(type.code).toBe(key);
      expect(type.name).toBeTruthy();
      expect(type.definition).toBeTruthy();
      expect(Array.isArray(type.keyObligations)).toBe(true);
      expect(type.keyObligations.length).toBeGreaterThan(0);
      expect(Array.isArray(type.applicableChapters)).toBe(true);
      expect(type.applicableChapters.length).toBeGreaterThan(0);
    }
  });

  it("SCO is Spacecraft Operator", () => {
    expect(OPERATOR_TYPES.SCO.name).toBe("Spacecraft Operator");
  });

  it("TCO is Third Country Operator", () => {
    expect(OPERATOR_TYPES.TCO.name).toBe("Third Country Operator");
  });
});

// ─── KEY_ARTICLES ───

describe("KEY_ARTICLES", () => {
  it("is a non-empty array", () => {
    expect(Array.isArray(KEY_ARTICLES)).toBe(true);
    expect(KEY_ARTICLES.length).toBeGreaterThan(0);
  });

  it("every article has required fields", () => {
    for (const article of KEY_ARTICLES) {
      expect(article.id).toBeTruthy();
      expect(article.number).toBeTruthy();
      expect(article.title).toBeTruthy();
      expect(article.chapter).toBeTruthy();
      expect(article.summary).toBeTruthy();
      expect(Array.isArray(article.keyRequirements)).toBe(true);
      expect(article.keyRequirements.length).toBeGreaterThan(0);
      expect(Array.isArray(article.applicableOperatorTypes)).toBe(true);
      expect(Array.isArray(article.relatedArticles)).toBe(true);
      expect(Array.isArray(article.complianceCriteria)).toBe(true);
    }
  });

  it("includes article 6 (Authorization Requirement)", () => {
    const art6 = KEY_ARTICLES.find((a) => a.number === "6");
    expect(art6).toBeDefined();
    expect(art6!.title).toBe("Authorization Requirement");
  });

  it("includes article 74 (Cybersecurity Baseline Requirements)", () => {
    const art74 = KEY_ARTICLES.find((a) => a.number === "74");
    expect(art74).toBeDefined();
    expect(art74!.chapter).toBe("Title VII");
  });

  it("article 10 has lightRegimeApplicable", () => {
    const art10 = KEY_ARTICLES.find((a) => a.number === "10");
    expect(art10).toBeDefined();
    expect(art10!.lightRegimeApplicable).toBe(true);
  });

  it("article 106 has penalties", () => {
    const art106 = KEY_ARTICLES.find((a) => a.number === "106");
    expect(art106).toBeDefined();
    expect(art106!.penalties).toBeTruthy();
  });

  it("some articles have deadlines", () => {
    const withDeadlines = KEY_ARTICLES.filter(
      (a) => a.deadlines && a.deadlines.length > 0,
    );
    expect(withDeadlines.length).toBeGreaterThan(0);
  });
});

// ─── getArticleById ───

describe("getArticleById", () => {
  it("finds article by id", () => {
    const article = getArticleById("art-6");
    expect(article).toBeDefined();
    expect(article!.number).toBe("6");
    expect(article!.title).toBe("Authorization Requirement");
  });

  it("returns undefined for unknown id", () => {
    expect(getArticleById("art-999")).toBeUndefined();
  });

  it("finds art-74", () => {
    const article = getArticleById("art-74");
    expect(article).toBeDefined();
    expect(article!.title).toBe("Cybersecurity Baseline Requirements");
  });
});

// ─── getArticleByNumber ───

describe("getArticleByNumber", () => {
  it("finds article by number", () => {
    const article = getArticleByNumber("58");
    expect(article).toBeDefined();
    expect(article!.title).toBe("Mandatory Third-Party Liability Insurance");
  });

  it("returns undefined for unknown number", () => {
    expect(getArticleByNumber("999")).toBeUndefined();
  });

  it("finds article 31", () => {
    const article = getArticleByNumber("31");
    expect(article).toBeDefined();
    expect(article!.title).toBe("Debris Mitigation Requirements");
  });
});

// ─── getArticlesForOperatorType ───

describe("getArticlesForOperatorType", () => {
  it("returns articles applicable to SCO", () => {
    const articles = getArticlesForOperatorType("SCO");
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      expect(
        article.applicableOperatorTypes.includes("SCO") ||
          article.applicableOperatorTypes.includes("ALL"),
      ).toBe(true);
    }
  });

  it("returns articles applicable to TCO", () => {
    const articles = getArticlesForOperatorType("TCO");
    expect(articles.length).toBeGreaterThan(0);
  });

  it("returns empty array for non-existent operator type", () => {
    const articles = getArticlesForOperatorType("NONEXISTENT");
    expect(articles).toEqual([]);
  });

  it("SCO has more articles than TCO", () => {
    const scoArticles = getArticlesForOperatorType("SCO");
    const tcoArticles = getArticlesForOperatorType("TCO");
    expect(scoArticles.length).toBeGreaterThan(tcoArticles.length);
  });
});

// ─── getArticlesForChapter ───

describe("getArticlesForChapter", () => {
  it("returns articles for Title VII (Cybersecurity)", () => {
    const articles = getArticlesForChapter("Title VII");
    expect(articles.length).toBeGreaterThan(0);
    for (const article of articles) {
      expect(article.chapter).toBe("Title VII");
    }
  });

  it("returns articles for Title II (Authorization Regime)", () => {
    const articles = getArticlesForChapter("Title II");
    expect(articles.length).toBeGreaterThan(0);
  });

  it("returns empty array for unknown chapter", () => {
    const articles = getArticlesForChapter("Title NONEXISTENT");
    expect(articles).toEqual([]);
  });
});

// ─── searchArticles ───

describe("searchArticles", () => {
  it("finds articles by title keyword", () => {
    const results = searchArticles("Authorization");
    expect(results.length).toBeGreaterThan(0);
    expect(
      results.some((a) => a.title.toLowerCase().includes("authorization")),
    ).toBe(true);
  });

  it("finds articles by summary content", () => {
    const results = searchArticles("debris mitigation");
    expect(results.length).toBeGreaterThan(0);
  });

  it("finds articles by key requirement content", () => {
    const results = searchArticles("25-year");
    expect(results.length).toBeGreaterThan(0);
  });

  it("is case-insensitive", () => {
    const lower = searchArticles("insurance");
    const upper = searchArticles("INSURANCE");
    expect(lower.length).toBe(upper.length);
  });

  it("returns empty array for no matches", () => {
    const results = searchArticles("zzzznonexistentzzzz");
    expect(results).toEqual([]);
  });
});

// ─── EU_SPACE_ACT_SUMMARY ───

describe("EU_SPACE_ACT_SUMMARY", () => {
  it("is a non-empty string", () => {
    expect(typeof EU_SPACE_ACT_SUMMARY).toBe("string");
    expect(EU_SPACE_ACT_SUMMARY.length).toBeGreaterThan(100);
  });

  it("mentions key topics", () => {
    expect(EU_SPACE_ACT_SUMMARY).toContain("Authorization");
    expect(EU_SPACE_ACT_SUMMARY).toContain("Debris");
    expect(EU_SPACE_ACT_SUMMARY).toContain("Cybersecurity");
    expect(EU_SPACE_ACT_SUMMARY).toContain("Insurance");
  });
});
