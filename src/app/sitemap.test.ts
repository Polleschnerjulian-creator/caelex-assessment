import { describe, it, expect, vi } from "vitest";

// Mock content imports to isolate the sitemap function
vi.mock("@/content/glossary/terms", () => ({
  getAllTerms: () => [
    { slug: "eu-space-act", term: "EU Space Act" },
    { slug: "nis2-directive", term: "NIS2 Directive" },
  ],
}));

vi.mock("@/content/blog/posts", () => ({
  getAllPosts: () => [
    {
      slug: "eu-space-act-explained",
      title: "EU Space Act Explained",
      publishedAt: "2025-01-15",
    },
    {
      slug: "nis2-space-operators",
      title: "NIS2 Space Operators",
      publishedAt: "2025-01-14",
    },
  ],
}));

vi.mock("@/content/guides/guides", () => ({
  getAllGuides: () => [
    { slug: "eu-space-act", title: "EU Space Act Guide" },
    { slug: "nis2-space", title: "NIS2 Guide" },
  ],
}));

vi.mock("@/lib/seo", () => ({
  moduleMetadata: [{ slug: "authorization" }, { slug: "cybersecurity" }],
  jurisdictionMetadata: [{ slug: "france" }, { slug: "germany" }],
}));

import sitemap from "./sitemap";

// ---------------------------------------------------------------------------
// sitemap
// ---------------------------------------------------------------------------
describe("sitemap()", () => {
  it("returns an array", () => {
    const result = sitemap();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns entries with url, lastModified, changeFrequency, and priority", () => {
    const result = sitemap();
    for (const entry of result) {
      expect(entry.url).toBeTruthy();
      expect(typeof entry.url).toBe("string");
      expect(entry).toHaveProperty("lastModified");
      expect(entry).toHaveProperty("changeFrequency");
      expect(entry).toHaveProperty("priority");
    }
  });

  it("all URLs start with https://caelex.eu", () => {
    const result = sitemap();
    for (const entry of result) {
      expect(entry.url).toMatch(/^https:\/\/caelex\.eu/);
    }
  });

  it("includes the home page with priority 1.0", () => {
    const result = sitemap();
    const home = result.find((e) => e.url === "https://caelex.eu");
    expect(home).toBeDefined();
    expect(home!.priority).toBe(1.0);
  });

  it("includes blog post pages", () => {
    const result = sitemap();
    const blogPages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/blog/"),
    );
    expect(blogPages.length).toBe(2);
  });

  it("includes guide pages", () => {
    const result = sitemap();
    const guidePages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/guides/"),
    );
    expect(guidePages.length).toBe(2);
  });

  it("includes glossary term pages", () => {
    const result = sitemap();
    const glossaryPages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/glossary/"),
    );
    expect(glossaryPages.length).toBe(2);
  });

  it("includes module pages", () => {
    const result = sitemap();
    const modulePages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/modules/"),
    );
    expect(modulePages.length).toBe(2);
  });

  it("includes jurisdiction pages", () => {
    const result = sitemap();
    const jurisdictionPages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/jurisdictions/"),
    );
    expect(jurisdictionPages.length).toBe(2);
  });

  it("includes comparison pages", () => {
    const result = sitemap();
    const comparePages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/compare/"),
    );
    expect(comparePages.length).toBe(3);
  });

  it("includes legal pages", () => {
    const result = sitemap();
    const legalPages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/legal/"),
    );
    expect(legalPages.length).toBeGreaterThan(0);
  });

  it("includes assessment pages", () => {
    const result = sitemap();
    const assessmentPages = result.filter((e) =>
      e.url.startsWith("https://caelex.eu/assessment/"),
    );
    expect(assessmentPages.length).toBeGreaterThan(0);
  });

  it("priorities are between 0 and 1", () => {
    const result = sitemap();
    for (const entry of result) {
      expect(entry.priority).toBeGreaterThanOrEqual(0);
      expect(entry.priority).toBeLessThanOrEqual(1);
    }
  });

  it("changeFrequency values are valid", () => {
    const validFrequencies = [
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ];
    const result = sitemap();
    for (const entry of result) {
      expect(validFrequencies).toContain(entry.changeFrequency);
    }
  });
});
