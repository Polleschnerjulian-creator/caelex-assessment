import { describe, it, expect, vi } from "vitest";

// Mock the external dependencies
vi.mock("@/lib/seo", () => ({
  moduleMetadata: [{ slug: "authorization" }, { slug: "registration" }],
  jurisdictionMetadata: [{ slug: "germany" }, { slug: "france" }],
}));

vi.mock("@/content/glossary/terms", () => ({
  getAllTerms: vi.fn(() => [{ slug: "compliance" }, { slug: "authorization" }]),
}));

vi.mock("@/content/blog/posts", () => ({
  getAllPosts: vi.fn(() => [{ slug: "first-post", publishedAt: "2025-01-01" }]),
}));

vi.mock("@/content/guides/guides", () => ({
  getAllGuides: vi.fn(() => [{ slug: "getting-started" }]),
}));

describe("sitemap.ts", () => {
  it("exports a default function", async () => {
    const mod = await import("@/app/sitemap");
    expect(typeof mod.default).toBe("function");
  });

  it("returns an array of sitemap entries", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it("includes the base URL entry", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const homeEntry = result.find((entry) => entry.url === "https://caelex.eu");
    expect(homeEntry).toBeTruthy();
    expect(homeEntry?.priority).toBe(1.0);
  });

  it("includes module pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const authModule = result.find(
      (entry) => entry.url === "https://caelex.eu/modules/authorization",
    );
    expect(authModule).toBeTruthy();
  });

  it("includes jurisdiction pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const germanyPage = result.find(
      (entry) => entry.url === "https://caelex.eu/jurisdictions/germany",
    );
    expect(germanyPage).toBeTruthy();
  });

  it("includes blog pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const blogPost = result.find(
      (entry) => entry.url === "https://caelex.eu/blog/first-post",
    );
    expect(blogPost).toBeTruthy();
  });

  it("includes glossary pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const glossaryEntry = result.find(
      (entry) => entry.url === "https://caelex.eu/glossary/compliance",
    );
    expect(glossaryEntry).toBeTruthy();
  });

  it("includes guide pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const guideEntry = result.find(
      (entry) => entry.url === "https://caelex.eu/guides/getting-started",
    );
    expect(guideEntry).toBeTruthy();
  });

  it("includes assessment pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const euSpaceAct = result.find(
      (entry) => entry.url === "https://caelex.eu/assessment/eu-space-act",
    );
    expect(euSpaceAct).toBeTruthy();
  });

  it("includes legal pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const impressum = result.find(
      (entry) => entry.url === "https://caelex.eu/legal/impressum",
    );
    expect(impressum).toBeTruthy();
  });

  it("includes comparison pages", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    const comparePage = result.find(
      (entry) =>
        entry.url === "https://caelex.eu/compare/space-compliance-consultants",
    );
    expect(comparePage).toBeTruthy();
  });

  it("all entries have a url property", async () => {
    const mod = await import("@/app/sitemap");
    const result = mod.default();
    for (const entry of result) {
      expect(entry.url).toBeDefined();
      expect(entry.url.startsWith("https://caelex.eu")).toBe(true);
    }
  });
});
