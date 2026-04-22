import { MetadataRoute } from "next";
import { moduleMetadata, jurisdictionMetadata } from "@/lib/seo";
import { getAllTerms } from "@/content/glossary/terms";
import { getAllPosts } from "@/content/blog/posts";
import { getAllGuides } from "@/content/guides/guides";
import { PERSONAS } from "./for/[slug]/personas";
import { COMPARISONS } from "./compare/[slug]/comparisons";

// ============================================================================
// SITEMAP CONFIGURATION
// ============================================================================

const baseUrl = "https://www.caelex.eu";

// Dynamic content imports - these are used to generate sitemap entries

// Comparison pages — single source of truth is the COMPARISONS array
// imported from /compare/[slug]/comparisons.ts; the sitemap reflects
// whatever lives there so adding a comparison never means touching
// this file twice.

// ============================================================================
// GENERATE SITEMAP
// ============================================================================

export default function sitemap(): MetadataRoute.Sitemap {
  // Static pages with realistic last-modified dates
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date("2026-03-28"),
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/platform`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: new Date("2026-03-28"),
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/assessment`,
      lastModified: new Date("2026-03-28"),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/astra`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date("2026-03-28"),
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/modules`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/jurisdictions`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Module pages (content rarely changes)
  const modulePages: MetadataRoute.Sitemap = moduleMetadata.map((module) => ({
    url: `${baseUrl}/modules/${module.slug}`,
    lastModified: new Date("2026-03-15"),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Jurisdiction pages (content rarely changes)
  const jurisdictionPages: MetadataRoute.Sitemap = jurisdictionMetadata.map(
    (jurisdiction) => ({
      url: `${baseUrl}/jurisdictions/${jurisdiction.slug}`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.85,
    }),
  );

  // Blog posts (from content)
  const blogPosts = getAllPosts();
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.publishedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Guide pages (from content — use actual publish/update dates)
  const guides = getAllGuides();
  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified:
      guide.updatedAt || guide.publishedAt || new Date("2026-03-01"),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Glossary term pages (from content — no date field, use fixed date)
  const glossaryTerms = getAllTerms();
  const glossaryPages: MetadataRoute.Sitemap = glossaryTerms.map((term) => ({
    url: `${baseUrl}/glossary/${term.slug}`,
    lastModified: new Date("2026-03-15"),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Comparison pages — generated from the COMPARISONS data file so
  // the sitemap and the actual routes can never drift apart. Priority
  // 0.85 because "Caelex vs X" is a high-intent LLM-query target.
  const comparePages: MetadataRoute.Sitemap = COMPARISONS.map((c) => ({
    url: `${baseUrl}/compare/${c.slug}`,
    lastModified: new Date("2026-04-22"),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  // Resource pages
  const resourcePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/resources`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources/faq`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources/timeline`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources/glossary`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/resources/eu-space-act`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  // Legal pages (with DE + EN variants where applicable — rarely updated)
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/legal/impressum`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy-en`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms-en`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cookies`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cookies-en`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];

  // Assessment wizard pages
  const assessmentPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/assessment/eu-space-act`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/assessment/nis2`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/assessment/space-law`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
  ];

  // Additional standalone pages
  const additionalPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/login`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.2,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: new Date("2026-01-15"),
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/careers`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.5,
    },
    {
      url: `${baseUrl}/docs/api`,
      lastModified: new Date("2026-03-15"),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    },
    // LLM-canonical declarative fact page — high priority, intended
    // to be surfaced in AI answer boxes for "what is Caelex" queries.
    {
      url: `${baseUrl}/what-is-caelex`,
      lastModified: new Date("2026-04-22"),
      changeFrequency: "monthly" as const,
      priority: 0.9,
    },
  ];

  // ─── Persona landing pages — /for/[slug] ───────────────────────────

  const personaPages: MetadataRoute.Sitemap = PERSONAS.map((persona) => ({
    url: `${baseUrl}/for/${persona.slug}`,
    lastModified: new Date("2026-04-22"),
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  return [
    ...staticPages,
    ...modulePages,
    ...jurisdictionPages,
    ...guidePages,
    ...blogPages,
    ...glossaryPages,
    ...comparePages,
    ...resourcePages,
    ...legalPages,
    ...assessmentPages,
    ...additionalPages,
    ...personaPages,
  ];
}
