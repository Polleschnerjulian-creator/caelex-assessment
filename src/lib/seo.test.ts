import { describe, it, expect } from "vitest";
import {
  siteConfig,
  generateMetadata,
  pageMetadata,
  moduleMetadata,
  jurisdictionMetadata,
  getModuleMetadata,
  getJurisdictionMetadata,
  generateModulePageMetadata,
  generateJurisdictionPageMetadata,
  generateBlogPostMetadata,
  generateGlossaryTermMetadata,
} from "./seo";

describe("seo", () => {
  describe("siteConfig", () => {
    it("has required fields", () => {
      expect(siteConfig.name).toBe("Caelex");
      expect(siteConfig.url).toBe("https://caelex.eu");
      expect(siteConfig.tagline).toBe("Regulatory OS for the orbital economy");
      expect(siteConfig.ogImage).toBeDefined();
      expect(siteConfig.twitterHandle).toBeDefined();
      expect(siteConfig.email).toBeDefined();
      expect(siteConfig.locale).toBe("en_US");
      expect(siteConfig.themeColor).toBe("#000000");
    });
  });

  describe("generateMetadata", () => {
    it("generates correct title for non-site-name title", () => {
      const meta = generateMetadata({
        title: "Pricing",
        description: "Our plans",
      });
      expect(meta.title).toBe(
        "Pricing | Caelex — Regulatory OS for the orbital economy",
      );
    });

    it("generates correct title when title matches site name", () => {
      const meta = generateMetadata({
        title: "Caelex",
        description: "The platform",
      });
      expect(meta.title).toBe("Caelex — Regulatory OS for the orbital economy");
    });

    it("sets canonical URL from path", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
        path: "/pricing",
      });
      expect(meta.alternates?.canonical).toBe("https://caelex.eu/pricing");
    });

    it("defaults path to empty string for root URL", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
      });
      expect(meta.alternates?.canonical).toBe("https://caelex.eu");
    });

    it("uses custom ogImage when provided", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
        ogImage: "https://example.com/custom.png",
      });
      const images = meta.openGraph?.images as Array<{
        url: string;
        width: number;
        height: number;
        alt: string;
      }>;
      expect(images[0].url).toBe("https://example.com/custom.png");
    });

    it("falls back to siteConfig ogImage", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
      });
      const images = meta.openGraph?.images as Array<{
        url: string;
      }>;
      expect(images[0].url).toBe(siteConfig.ogImage);
    });

    it("sets robots to noindex when noIndex is true", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
        noIndex: true,
      });
      expect(meta.robots).toEqual({ index: false, follow: false });
    });

    it("sets robots to index and follow by default", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
      });
      expect(meta.robots).toEqual({ index: true, follow: true });
    });

    it("sets authors from provided array", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
        authors: ["Alice", "Bob"],
      });
      expect(meta.authors).toEqual([{ name: "Alice" }, { name: "Bob" }]);
    });

    it("defaults authors to site name", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
      });
      expect(meta.authors).toEqual([{ name: "Caelex" }]);
    });

    it("sets keywords when provided", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
        keywords: ["space", "law"],
      });
      expect(meta.keywords).toEqual(["space", "law"]);
    });

    it("includes article-specific OG fields for article type", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
        ogType: "article",
        publishedTime: "2024-01-01",
        modifiedTime: "2024-06-01",
        authors: ["Author A"],
      });
      expect(meta.openGraph?.type).toBe("article");
    });

    it("sets default ogType to website", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
      });
      expect(meta.openGraph?.type).toBe("website");
    });

    it("sets twitter card metadata", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test desc",
      });
      expect(meta.twitter?.card).toBe("summary_large_image");
      expect(meta.twitter?.creator).toBe(siteConfig.twitterHandle);
      expect(meta.twitter?.site).toBe(siteConfig.twitterHandle);
    });

    it("sets manifest and icons", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
      });
      expect(meta.manifest).toBe("/site.webmanifest");
      expect(meta.icons).toEqual({
        icon: "/favicon.svg",
        shortcut: "/favicon.svg",
      });
    });

    it("sets theme-color in other", () => {
      const meta = generateMetadata({
        title: "Test",
        description: "Test",
      });
      expect(meta.other?.["theme-color"]).toBe(siteConfig.themeColor);
    });
  });

  describe("pageMetadata", () => {
    it("has all expected page keys", () => {
      const expectedKeys = [
        "home",
        "platform",
        "pricing",
        "about",
        "contact",
        "demo",
        "assessment",
        "astra",
        "blog",
        "glossary",
        "guides",
        "jurisdictions",
        "modules",
        "governance",
        "security",
        "resources",
      ];
      expectedKeys.forEach((key) => {
        expect(pageMetadata).toHaveProperty(key);
      });
    });

    it("each page entry has title and description", () => {
      Object.values(pageMetadata).forEach((meta) => {
        expect(meta.title).toBeDefined();
        expect(meta.description).toBeDefined();
      });
    });
  });

  describe("moduleMetadata", () => {
    it("has at least 10 modules", () => {
      expect(moduleMetadata.length).toBeGreaterThanOrEqual(10);
    });

    it("each module has required fields", () => {
      moduleMetadata.forEach((mod) => {
        expect(mod.slug).toBeTruthy();
        expect(mod.title).toBeTruthy();
        expect(mod.h1).toBeTruthy();
        expect(mod.description).toBeTruthy();
        expect(mod.keywords.length).toBeGreaterThan(0);
        expect(mod.regulations.length).toBeGreaterThan(0);
        expect(mod.jurisdictions.length).toBeGreaterThan(0);
      });
    });

    it("has unique slugs", () => {
      const slugs = moduleMetadata.map((m) => m.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("jurisdictionMetadata", () => {
    it("has at least 10 jurisdictions", () => {
      expect(jurisdictionMetadata.length).toBeGreaterThanOrEqual(10);
    });

    it("each jurisdiction has required fields", () => {
      jurisdictionMetadata.forEach((j) => {
        expect(j.slug).toBeTruthy();
        expect(j.country).toBeTruthy();
        expect(j.title).toBeTruthy();
        expect(j.description).toBeTruthy();
        expect(j.spaceLaw).toBeTruthy();
        expect(j.nca).toBeTruthy();
        expect(j.ncaFull).toBeTruthy();
      });
    });

    it("has unique slugs", () => {
      const slugs = jurisdictionMetadata.map((j) => j.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    });
  });

  describe("getModuleMetadata", () => {
    it("returns module info for a valid slug", () => {
      const result = getModuleMetadata("authorization");
      expect(result).toBeDefined();
      expect(result?.slug).toBe("authorization");
    });

    it("returns undefined for an invalid slug", () => {
      const result = getModuleMetadata("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("getJurisdictionMetadata", () => {
    it("returns jurisdiction info for a valid slug", () => {
      const result = getJurisdictionMetadata("germany");
      expect(result).toBeDefined();
      expect(result?.slug).toBe("germany");
      expect(result?.country).toBe("Germany");
    });

    it("returns undefined for an invalid slug", () => {
      const result = getJurisdictionMetadata("nonexistent");
      expect(result).toBeUndefined();
    });
  });

  describe("generateModulePageMetadata", () => {
    it("generates metadata for a valid module slug", () => {
      const meta = generateModulePageMetadata("authorization");
      expect(meta.title).toContain("Authorization");
      expect(meta.robots).toEqual({ index: true, follow: true });
    });

    it("generates noIndex metadata for an invalid slug", () => {
      const meta = generateModulePageMetadata("nonexistent");
      expect(meta.title).toContain("Module Not Found");
      expect(meta.robots).toEqual({ index: false, follow: false });
    });
  });

  describe("generateJurisdictionPageMetadata", () => {
    it("generates metadata for a valid jurisdiction slug", () => {
      const meta = generateJurisdictionPageMetadata("france");
      expect(meta.title).toContain("France");
      expect(meta.robots).toEqual({ index: true, follow: true });
    });

    it("generates noIndex metadata for an invalid slug", () => {
      const meta = generateJurisdictionPageMetadata("nonexistent");
      expect(meta.title).toContain("Jurisdiction Not Found");
      expect(meta.robots).toEqual({ index: false, follow: false });
    });
  });

  describe("generateBlogPostMetadata", () => {
    it("generates article metadata for a blog post", () => {
      const meta = generateBlogPostMetadata({
        slug: "test-post",
        title: "Test Post",
        description: "A test post",
        publishedAt: "2024-01-01",
        author: "John",
        category: "Space Law",
        keywords: ["space"],
        readingTime: 5,
      });
      expect(meta.title).toContain("Test Post");
      expect(meta.openGraph?.type).toBe("article");
    });

    it("uses publishedAt as modifiedTime when updatedAt is not provided", () => {
      const meta = generateBlogPostMetadata({
        slug: "test",
        title: "Test",
        description: "Desc",
        publishedAt: "2024-01-01",
        author: "A",
        category: "B",
        keywords: [],
        readingTime: 3,
      });
      expect(meta.openGraph?.type).toBe("article");
    });
  });

  describe("generateGlossaryTermMetadata", () => {
    it("generates metadata with full name in title", () => {
      const meta = generateGlossaryTermMetadata({
        slug: "sco",
        term: "SCO",
        fullName: "Spacecraft Operator",
        definition:
          "An entity that operates a spacecraft in orbit for commercial or scientific purposes.",
        source: "EU Space Act",
      });
      expect(meta.title).toContain("SCO (Spacecraft Operator)");
      expect(meta.title).toContain("Space Compliance Glossary");
    });

    it("generates metadata without full name when empty", () => {
      const meta = generateGlossaryTermMetadata({
        slug: "orbit",
        term: "Orbit",
        fullName: "",
        definition: "The path of a celestial body or an artificial satellite.",
        source: "General",
      });
      expect(meta.title).toContain("Orbit");
      expect(meta.title).not.toContain("()");
    });

    it("truncates description to 140 characters", () => {
      const longDefinition = "A".repeat(200);
      const meta = generateGlossaryTermMetadata({
        slug: "test",
        term: "Test",
        fullName: "Full Test",
        definition: longDefinition,
        source: "Source",
      });
      expect(meta.description).toBeDefined();
      expect(meta.description!.length).toBeLessThan(200);
    });

    it("filters out falsy keyword values", () => {
      const meta = generateGlossaryTermMetadata({
        slug: "test",
        term: "Test",
        fullName: "",
        definition: "Some definition",
        source: "Source",
      });
      expect(meta.keywords).toBeDefined();
      // "fullName" is empty string, should be filtered out
      const keywords = meta.keywords as string[];
      expect(keywords.every((k) => k.length > 0)).toBe(true);
    });
  });
});
