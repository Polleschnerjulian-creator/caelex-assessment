import { describe, it, expect } from "vitest";

// ---------------------------------------------------------------------------
// Verify that re-export / data-only files export valid arrays.
// A simple existence check is sufficient for these modules.
// ---------------------------------------------------------------------------

describe("blog re-export files", () => {
  it("additional-posts exports a non-empty array", async () => {
    const { additionalPosts } = await import("./blog/additional-posts");
    expect(Array.isArray(additionalPosts)).toBe(true);
    expect(additionalPosts.length).toBeGreaterThan(0);
  });

  it("more-posts exports a non-empty array", async () => {
    const { morePosts } = await import("./blog/more-posts");
    expect(Array.isArray(morePosts)).toBe(true);
    expect(morePosts.length).toBeGreaterThan(0);
  });

  it("more-posts exports getMorePosts function", async () => {
    const { getMorePosts } = await import("./blog/more-posts");
    expect(typeof getMorePosts).toBe("function");
    const posts = getMorePosts();
    expect(Array.isArray(posts)).toBe(true);
    expect(posts.length).toBeGreaterThan(0);
  });
});

describe("faq re-export files", () => {
  it("additional-faqs exports a non-empty array", async () => {
    const { additionalFaqs } = await import("./faq/additional-faqs");
    expect(Array.isArray(additionalFaqs)).toBe(true);
    expect(additionalFaqs.length).toBeGreaterThan(0);
  });

  it("additional-faqs exports getAdditionalFaqs function", async () => {
    const { getAdditionalFaqs } = await import("./faq/additional-faqs");
    expect(typeof getAdditionalFaqs).toBe("function");
    const faqs = getAdditionalFaqs();
    expect(Array.isArray(faqs)).toBe(true);
    expect(faqs.length).toBeGreaterThan(0);
  });
});

describe("glossary re-export files", () => {
  it("additional-terms exports a non-empty array", async () => {
    const { additionalTerms } = await import("./glossary/additional-terms");
    expect(Array.isArray(additionalTerms)).toBe(true);
    expect(additionalTerms.length).toBeGreaterThan(0);
  });

  it("more-terms exports a non-empty array", async () => {
    const { moreTerms } = await import("./glossary/more-terms");
    expect(Array.isArray(moreTerms)).toBe(true);
    expect(moreTerms.length).toBeGreaterThan(0);
  });
});

describe("guides re-export files", () => {
  it("additional-guides exports a non-empty array", async () => {
    const { additionalGuides } = await import("./guides/additional-guides");
    expect(Array.isArray(additionalGuides)).toBe(true);
    expect(additionalGuides.length).toBeGreaterThan(0);
  });

  it("additional-guides exports getAdditionalGuides function", async () => {
    const { getAdditionalGuides } = await import("./guides/additional-guides");
    expect(typeof getAdditionalGuides).toBe("function");
    const guides = getAdditionalGuides();
    expect(Array.isArray(guides)).toBe(true);
    expect(guides.length).toBeGreaterThan(0);
  });

  it("new-guides-part1 exports a non-empty array", async () => {
    const { newGuidesPart1 } = await import("./guides/new-guides-part1");
    expect(Array.isArray(newGuidesPart1)).toBe(true);
    expect(newGuidesPart1.length).toBeGreaterThan(0);
  });

  it("new-guides-part2 exports a non-empty array", async () => {
    const { newGuidesPart2 } = await import("./guides/new-guides-part2");
    expect(Array.isArray(newGuidesPart2)).toBe(true);
    expect(newGuidesPart2.length).toBeGreaterThan(0);
  });
});
