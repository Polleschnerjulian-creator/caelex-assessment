import { describe, it, expect, vi } from "vitest";

// Mock the siteConfig used by the RSS route
vi.mock("@/lib/seo", () => ({
  siteConfig: {
    name: "Caelex",
    url: "https://www.caelex.eu",
    email: "cs@caelex.eu",
  },
}));

// Mock the blog posts data
vi.mock("@/content/blog/posts", () => ({
  getAllPosts: () => [
    {
      slug: "eu-space-act-explained",
      title: "EU Space Act Explained",
      description: "A guide to the EU Space Act.",
      publishedAt: "2025-01-15",
      category: "EU Space Act",
      author: "Caelex",
    },
    {
      slug: "nis2-space-operators",
      title: "NIS2 & Space Operators",
      description: "How NIS2 affects space operators.",
      publishedAt: "2025-01-14",
      category: "NIS2",
      author: "Caelex",
    },
  ],
}));

import { GET } from "./route";

// ---------------------------------------------------------------------------
// RSS GET handler
// ---------------------------------------------------------------------------
describe("GET /rss.xml", () => {
  it("returns a Response object", async () => {
    const response = await GET();
    expect(response).toBeInstanceOf(Response);
  });

  it("has Content-Type application/xml", async () => {
    const response = await GET();
    expect(response.headers.get("Content-Type")).toBe(
      "application/xml; charset=utf-8",
    );
  });

  it("has Cache-Control header", async () => {
    const response = await GET();
    const cacheControl = response.headers.get("Cache-Control");
    expect(cacheControl).toContain("public");
    expect(cacheControl).toContain("max-age=3600");
  });

  it("returns valid XML starting with XML declaration", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it("contains RSS 2.0 root element", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain('<rss version="2.0"');
  });

  it("contains channel element with title", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("<channel>");
    expect(body).toContain("<title>");
    expect(body).toContain("Caelex");
  });

  it("contains item elements for each blog post", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("<item>");
    expect(body).toContain("EU Space Act Explained");
    expect(body).toContain("NIS2 &amp; Space Operators");
  });

  it("contains proper link URLs for items", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("https://www.caelex.eu/blog/eu-space-act-explained");
    expect(body).toContain("https://www.caelex.eu/blog/nis2-space-operators");
  });

  it("contains pubDate elements", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("<pubDate>");
  });

  it("contains category elements", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain("<category>");
  });

  it("escapes special XML characters in content", async () => {
    const response = await GET();
    const body = await response.text();
    // The & in "NIS2 & Space Operators" should be escaped
    expect(body).toContain("NIS2 &amp; Space Operators");
  });

  it("contains atom:link for self-reference", async () => {
    const response = await GET();
    const body = await response.text();
    expect(body).toContain('atom:link href="https://www.caelex.eu/rss.xml"');
  });
});
