import { describe, it, expect } from "vitest";
import {
  blogPosts,
  getAllPosts,
  getPostBySlug,
  getFeaturedPosts,
  getPostsByCategory,
  getAllCategories,
  getRelatedPosts,
  BlogPost,
} from "./posts";

// ---------------------------------------------------------------------------
// blogPosts array
// ---------------------------------------------------------------------------
describe("blogPosts array", () => {
  it("exports a non-empty array of BlogPost objects", () => {
    expect(Array.isArray(blogPosts)).toBe(true);
    expect(blogPosts.length).toBeGreaterThan(0);
  });

  it("each post has required fields", () => {
    for (const post of blogPosts) {
      expect(post.slug).toBeTruthy();
      expect(post.title).toBeTruthy();
      expect(post.description).toBeTruthy();
      expect(post.content).toBeTruthy();
      expect(post.publishedAt).toBeTruthy();
      expect(post.author).toBeTruthy();
      expect(post.category).toBeTruthy();
      expect(Array.isArray(post.tags)).toBe(true);
      expect(typeof post.readingTime).toBe("number");
    }
  });
});

// ---------------------------------------------------------------------------
// getAllPosts
// ---------------------------------------------------------------------------
describe("getAllPosts", () => {
  it("returns all posts including additional and more posts", () => {
    const posts = getAllPosts();
    expect(Array.isArray(posts)).toBe(true);
    // Should have more posts than just blogPosts (additional + more are merged)
    expect(posts.length).toBeGreaterThan(blogPosts.length);
  });

  it("returns posts sorted by publishedAt descending (newest first)", () => {
    const posts = getAllPosts();
    for (let i = 1; i < posts.length; i++) {
      const prev = new Date(posts[i - 1].publishedAt).getTime();
      const curr = new Date(posts[i].publishedAt).getTime();
      expect(prev).toBeGreaterThanOrEqual(curr);
    }
  });

  it("returns BlogPost objects with correct shape", () => {
    const posts = getAllPosts();
    const first = posts[0];
    expect(first).toHaveProperty("slug");
    expect(first).toHaveProperty("title");
    expect(first).toHaveProperty("category");
  });
});

// ---------------------------------------------------------------------------
// getPostBySlug
// ---------------------------------------------------------------------------
describe("getPostBySlug", () => {
  it("returns a post for a known slug from the base array", () => {
    const post = getPostBySlug("eu-space-act-explained");
    expect(post).toBeDefined();
    expect(post!.slug).toBe("eu-space-act-explained");
    expect(post!.title).toContain("EU Space Act");
  });

  it("returns a post for a slug from additional-posts", () => {
    const post = getPostBySlug("french-los-guide");
    expect(post).toBeDefined();
    expect(post!.slug).toBe("french-los-guide");
  });

  it("returns a post for a slug from more-posts", () => {
    const post = getPostBySlug("orbital-regimes-compliance");
    expect(post).toBeDefined();
    expect(post!.slug).toBe("orbital-regimes-compliance");
  });

  it("returns undefined for a non-existent slug", () => {
    const post = getPostBySlug("does-not-exist-xyz");
    expect(post).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    const post = getPostBySlug("");
    expect(post).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// getFeaturedPosts
// ---------------------------------------------------------------------------
describe("getFeaturedPosts", () => {
  it("returns only posts with featured === true", () => {
    const featured = getFeaturedPosts();
    expect(featured.length).toBeGreaterThan(0);
    for (const post of featured) {
      expect(post.featured).toBe(true);
    }
  });

  it("returns fewer posts than getAllPosts (not all are featured)", () => {
    const featured = getFeaturedPosts();
    const all = getAllPosts();
    expect(featured.length).toBeLessThan(all.length);
  });
});

// ---------------------------------------------------------------------------
// getPostsByCategory
// ---------------------------------------------------------------------------
describe("getPostsByCategory", () => {
  it("returns posts matching the given category (case-insensitive)", () => {
    const posts = getPostsByCategory("EU Space Act");
    expect(posts.length).toBeGreaterThan(0);
    for (const post of posts) {
      expect(post.category.toLowerCase()).toBe("eu space act");
    }
  });

  it("is case-insensitive", () => {
    const upper = getPostsByCategory("EU SPACE ACT");
    const lower = getPostsByCategory("eu space act");
    expect(upper.length).toBe(lower.length);
  });

  it("returns an empty array for an unknown category", () => {
    const posts = getPostsByCategory("Nonexistent Category 999");
    expect(posts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// getAllCategories
// ---------------------------------------------------------------------------
describe("getAllCategories", () => {
  it("returns a non-empty array of unique category strings", () => {
    const categories = getAllCategories();
    expect(categories.length).toBeGreaterThan(0);
    // All unique
    expect(new Set(categories).size).toBe(categories.length);
  });

  it("contains expected categories", () => {
    const categories = getAllCategories();
    expect(categories).toContain("EU Space Act");
    expect(categories).toContain("NIS2");
  });
});

// ---------------------------------------------------------------------------
// getRelatedPosts
// ---------------------------------------------------------------------------
describe("getRelatedPosts", () => {
  it("returns related posts for a known slug", () => {
    const related = getRelatedPosts("eu-space-act-explained");
    expect(related.length).toBeGreaterThan(0);
    // None of the related posts should be the current post
    for (const post of related) {
      expect(post.slug).not.toBe("eu-space-act-explained");
    }
  });

  it("respects the limit parameter", () => {
    const related = getRelatedPosts("eu-space-act-explained", 1);
    expect(related.length).toBeLessThanOrEqual(1);
  });

  it("defaults to max 3 results", () => {
    const related = getRelatedPosts("eu-space-act-explained");
    expect(related.length).toBeLessThanOrEqual(3);
  });

  it("returns an empty array for a non-existent slug", () => {
    const related = getRelatedPosts("nonexistent-slug-xyz");
    expect(related).toEqual([]);
  });

  it("returns posts sharing the same category or overlapping tags", () => {
    const currentPost = getPostBySlug("eu-space-act-explained")!;
    const related = getRelatedPosts("eu-space-act-explained", 10);
    for (const post of related) {
      const sameCategory = post.category === currentPost.category;
      const sharedTag = post.tags.some((tag) => currentPost.tags.includes(tag));
      expect(sameCategory || sharedTag).toBe(true);
    }
  });
});
