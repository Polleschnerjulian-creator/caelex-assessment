import { describe, it, expect } from "vitest";
import { guides, getAllGuides, getGuideBySlug, Guide } from "./guides";

// ---------------------------------------------------------------------------
// guides array
// ---------------------------------------------------------------------------
describe("guides array", () => {
  it("exports a non-empty array", () => {
    expect(Array.isArray(guides)).toBe(true);
    expect(guides.length).toBeGreaterThan(0);
  });

  it("each guide has required fields", () => {
    for (const guide of guides) {
      expect(guide.slug).toBeTruthy();
      expect(guide.title).toBeTruthy();
      expect(guide.h1).toBeTruthy();
      expect(guide.description).toBeTruthy();
      expect(guide.content).toBeTruthy();
      expect(guide.publishedAt).toBeTruthy();
      expect(guide.author).toBeTruthy();
      expect(Array.isArray(guide.keywords)).toBe(true);
      expect(typeof guide.readingTime).toBe("number");
    }
  });
});

// ---------------------------------------------------------------------------
// getAllGuides
// ---------------------------------------------------------------------------
describe("getAllGuides", () => {
  it("returns all guides including additional and new guides", () => {
    const all = getAllGuides();
    expect(all.length).toBeGreaterThan(guides.length);
  });

  it("returns guides sorted by publishedAt descending (newest first)", () => {
    const all = getAllGuides();
    for (let i = 1; i < all.length; i++) {
      const prev = new Date(all[i - 1].publishedAt).getTime();
      const curr = new Date(all[i].publishedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("returns Guide objects with correct shape", () => {
    const all = getAllGuides();
    const first = all[0];
    expect(first).toHaveProperty("slug");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("h1");
    expect(first).toHaveProperty("content");
  });
});

// ---------------------------------------------------------------------------
// getGuideBySlug
// ---------------------------------------------------------------------------
describe("getGuideBySlug", () => {
  it("returns a guide for a known slug from the base array", () => {
    const guide = getGuideBySlug("eu-space-act");
    expect(guide).toBeDefined();
    expect(guide!.slug).toBe("eu-space-act");
    expect(guide!.title).toContain("EU Space Act");
  });

  it("returns a guide from the additional-guides array", () => {
    const guide = getGuideBySlug("national-space-laws");
    expect(guide).toBeDefined();
    expect(guide!.slug).toBe("national-space-laws");
  });

  it("returns a guide from the new-guides-part1 array", () => {
    const guide = getGuideBySlug("space-insurance");
    expect(guide).toBeDefined();
    expect(guide!.slug).toBe("space-insurance");
  });

  it("returns a guide from the new-guides-part2 array", () => {
    const guide = getGuideBySlug("spectrum-management");
    expect(guide).toBeDefined();
    expect(guide!.slug).toBe("spectrum-management");
  });

  it("returns undefined for a non-existent slug", () => {
    const guide = getGuideBySlug("nonexistent-guide-xyz");
    expect(guide).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    const guide = getGuideBySlug("");
    expect(guide).toBeUndefined();
  });
});
