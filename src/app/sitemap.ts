import { MetadataRoute } from "next";
import { moduleMetadata, jurisdictionMetadata } from "@/lib/seo";

// ============================================================================
// SITEMAP CONFIGURATION
// ============================================================================

const baseUrl = "https://caelex.eu";

// Blog posts - add as they are created
const blogPosts = [
  { slug: "eu-space-act-explained", updatedAt: "2025-01-15" },
  { slug: "eu-space-act-article-5-authorization", updatedAt: "2025-01-15" },
  { slug: "eu-space-act-timeline", updatedAt: "2025-01-15" },
  { slug: "nis2-space-operators", updatedAt: "2025-01-15" },
  { slug: "itar-vs-ear-space", updatedAt: "2025-01-15" },
  { slug: "space-debris-iadc-vs-iso", updatedAt: "2025-01-15" },
  { slug: "satellite-insurance-requirements-europe", updatedAt: "2025-01-15" },
  { slug: "uk-space-industry-act-guide", updatedAt: "2025-01-15" },
  { slug: "french-space-operations-act", updatedAt: "2025-01-15" },
  { slug: "german-satellite-data-security-act", updatedAt: "2025-01-15" },
  { slug: "space-compliance-checklist", updatedAt: "2025-01-15" },
  { slug: "what-is-a-space-operator", updatedAt: "2025-01-15" },
  { slug: "copuos-guidelines-compliance", updatedAt: "2025-01-15" },
  { slug: "itu-frequency-coordination", updatedAt: "2025-01-15" },
  { slug: "space-cybersecurity-nist-framework", updatedAt: "2025-01-15" },
  { slug: "mega-constellation-compliance", updatedAt: "2025-01-15" },
  { slug: "space-sustainability-rating", updatedAt: "2025-01-15" },
  { slug: "eu-space-act-vs-national-laws", updatedAt: "2025-01-15" },
  { slug: "small-satellite-compliance", updatedAt: "2025-01-15" },
  { slug: "space-regulation-2026-outlook", updatedAt: "2025-01-15" },
];

// Pillar guides
const guides = [
  { slug: "eu-space-act", updatedAt: "2025-01-15" },
  { slug: "nis2-space", updatedAt: "2025-01-15" },
  { slug: "space-debris-mitigation", updatedAt: "2025-01-15" },
  { slug: "space-insurance", updatedAt: "2025-01-15" },
  { slug: "space-export-control", updatedAt: "2025-01-15" },
  { slug: "satellite-licensing", updatedAt: "2025-01-15" },
  { slug: "space-cybersecurity", updatedAt: "2025-01-15" },
];

// Glossary terms
const glossaryTerms = [
  "sco",
  "lo",
  "lso",
  "isos",
  "cap",
  "pdp",
  "tco",
  "nca",
  "tpl",
  "ssa",
  "sst",
  "stm",
  "leo",
  "meo",
  "geo",
  "heo",
  "sso",
  "iadc",
  "copuos",
  "itu",
  "itar",
  "ear",
  "erc",
  "nis2",
  "enisa",
  "los",
  "gnss",
  "pnt",
  "sar",
  "sda",
  "cdm",
  "cola",
  "tle",
  "rso",
  "fcc",
  "faa",
  "noaa",
  "bfr",
  "cnes",
  "uksa",
  "asi",
  "nso",
  "belspo",
  "esa",
  "euspa",
  "iso-24113",
  "iso-27001",
  "nist-csf",
  "soc-2",
  "tisax",
  "csa-star",
  "kessler-syndrome",
  "orbital-debris",
  "deorbit",
  "passivation",
  "end-of-life",
  "graveyard-orbit",
  "space-situational-awareness",
  "frequency-coordination",
  "orbital-slot",
  "launch-license",
  "re-entry-license",
  "on-orbit-servicing",
  "active-debris-removal",
  "dual-use",
  "deemed-export",
];

// Comparison pages
const comparisonPages = [
  { slug: "space-compliance-consultants", updatedAt: "2025-01-15" },
  { slug: "manual-compliance", updatedAt: "2025-01-15" },
  { slug: "spreadsheet-compliance", updatedAt: "2025-01-15" },
];

// ============================================================================
// GENERATE SITEMAP
// ============================================================================

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/platform`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/assessment`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/astra`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/glossary`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/modules`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${baseUrl}/jurisdictions`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];

  // Module pages
  const modulePages: MetadataRoute.Sitemap = moduleMetadata.map((module) => ({
    url: `${baseUrl}/modules/${module.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Jurisdiction pages
  const jurisdictionPages: MetadataRoute.Sitemap = jurisdictionMetadata.map(
    (jurisdiction) => ({
      url: `${baseUrl}/jurisdictions/${jurisdiction.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    }),
  );

  // Blog posts
  const blogPages: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: post.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Guide pages
  const guidePages: MetadataRoute.Sitemap = guides.map((guide) => ({
    url: `${baseUrl}/guides/${guide.slug}`,
    lastModified: guide.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  // Glossary term pages
  const glossaryPages: MetadataRoute.Sitemap = glossaryTerms.map((term) => ({
    url: `${baseUrl}/glossary/${term}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  // Comparison pages
  const comparePages: MetadataRoute.Sitemap = comparisonPages.map((page) => ({
    url: `${baseUrl}/compare/${page.slug}`,
    lastModified: page.updatedAt,
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  // Resource pages
  const resourcePages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/resources`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources/faq`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources/timeline`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/resources/glossary`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.6,
    },
    {
      url: `${baseUrl}/resources/eu-space-act`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.8,
    },
  ];

  // Legal pages
  const legalPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/legal/impressum`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/privacy`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/terms`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
    {
      url: `${baseUrl}/legal/cookies`,
      lastModified: now,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    },
  ];

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
  ];
}
