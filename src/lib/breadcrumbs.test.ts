import { describe, it, expect } from "vitest";
import {
  generateModuleBreadcrumbs,
  generateJurisdictionBreadcrumbs,
  generateBlogBreadcrumbs,
  generateGuideBreadcrumbs,
  generateGlossaryBreadcrumbs,
  generateCompareBreadcrumbs,
  type BreadcrumbItem,
} from "./breadcrumbs";

describe("breadcrumbs", () => {
  describe("generateModuleBreadcrumbs", () => {
    it("returns breadcrumb items with Modules root and module page", () => {
      const result = generateModuleBreadcrumbs(
        "Authorization",
        "authorization",
      );
      expect(result).toEqual<BreadcrumbItem[]>([
        { label: "Modules", href: "/modules" },
        { label: "Authorization", href: "/modules/authorization" },
      ]);
    });

    it("handles slugs with hyphens", () => {
      const result = generateModuleBreadcrumbs(
        "Debris Mitigation",
        "debris-mitigation",
      );
      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({
        label: "Debris Mitigation",
        href: "/modules/debris-mitigation",
      });
    });
  });

  describe("generateJurisdictionBreadcrumbs", () => {
    it("returns breadcrumb items with Jurisdictions root and country page", () => {
      const result = generateJurisdictionBreadcrumbs("Germany", "germany");
      expect(result).toEqual<BreadcrumbItem[]>([
        { label: "Jurisdictions", href: "/jurisdictions" },
        { label: "Germany", href: "/jurisdictions/germany" },
      ]);
    });

    it("handles multi-word country slugs", () => {
      const result = generateJurisdictionBreadcrumbs(
        "United Kingdom",
        "united-kingdom",
      );
      expect(result[1].href).toBe("/jurisdictions/united-kingdom");
    });
  });

  describe("generateBlogBreadcrumbs", () => {
    it("returns Blog root and post without category", () => {
      const result = generateBlogBreadcrumbs("My Post", "my-post");
      expect(result).toEqual<BreadcrumbItem[]>([
        { label: "Blog", href: "/blog" },
        { label: "My Post", href: "/blog/my-post" },
      ]);
    });

    it("includes category breadcrumb when category is provided", () => {
      const result = generateBlogBreadcrumbs(
        "EU Space Act Update",
        "eu-space-act-update",
        "Space Law",
      );
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ label: "Blog", href: "/blog" });
      expect(result[1]).toEqual({
        label: "Space Law",
        href: "/blog/category/space-law",
      });
      expect(result[2]).toEqual({
        label: "EU Space Act Update",
        href: "/blog/eu-space-act-update",
      });
    });

    it("collapses multiple spaces into a single hyphen in category slug", () => {
      const result = generateBlogBreadcrumbs(
        "Test",
        "test",
        "Regulatory  Updates",
      );
      expect(result[1].href).toBe("/blog/category/regulatory-updates");
    });

    it("handles category with single word", () => {
      const result = generateBlogBreadcrumbs("Test", "test", "News");
      expect(result[1].href).toBe("/blog/category/news");
    });
  });

  describe("generateGuideBreadcrumbs", () => {
    it("returns Guides root and guide page", () => {
      const result = generateGuideBreadcrumbs(
        "Getting Started",
        "getting-started",
      );
      expect(result).toEqual<BreadcrumbItem[]>([
        { label: "Guides", href: "/guides" },
        { label: "Getting Started", href: "/guides/getting-started" },
      ]);
    });
  });

  describe("generateGlossaryBreadcrumbs", () => {
    it("returns Glossary root and term page", () => {
      const result = generateGlossaryBreadcrumbs("SCO", "sco");
      expect(result).toEqual<BreadcrumbItem[]>([
        { label: "Glossary", href: "/glossary" },
        { label: "SCO", href: "/glossary/sco" },
      ]);
    });
  });

  describe("generateCompareBreadcrumbs", () => {
    it("returns Compare root and comparison page", () => {
      const result = generateCompareBreadcrumbs(
        "France vs Germany",
        "france-vs-germany",
      );
      expect(result).toEqual<BreadcrumbItem[]>([
        { label: "Compare", href: "/compare" },
        { label: "France vs Germany", href: "/compare/france-vs-germany" },
      ]);
    });
  });
});
