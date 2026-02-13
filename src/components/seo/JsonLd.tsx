import { siteConfig } from "@/lib/seo";

// ============================================================================
// JSON-LD SCHEMA TYPES
// ============================================================================

type JsonLdType =
  | "Organization"
  | "WebSite"
  | "SoftwareApplication"
  | "Article"
  | "BlogPosting"
  | "FAQPage"
  | "BreadcrumbList"
  | "DefinedTermSet"
  | "DefinedTerm"
  | "HowTo"
  | "Product";

interface JsonLdBaseProps {
  type: JsonLdType;
}

// ============================================================================
// ORGANIZATION SCHEMA (Site-wide)
// ============================================================================

export function OrganizationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: siteConfig.name,
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    description: siteConfig.description,
    email: siteConfig.email,
    sameAs: [siteConfig.linkedIn, "https://x.com/caboracaelex"],
    contactPoint: {
      "@type": "ContactPoint",
      email: siteConfig.email,
      contactType: "customer service",
      availableLanguage: ["English", "German"],
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// WEBSITE SCHEMA (Homepage)
// ============================================================================

export function WebSiteJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: siteConfig.name,
    url: siteConfig.url,
    description: siteConfig.description,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteConfig.url}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// SOFTWARE APPLICATION SCHEMA (Homepage/Product pages)
// ============================================================================

export function SoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: siteConfig.name,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description:
      "Space compliance platform covering 12 regulatory modules across 10+ jurisdictions including EU Space Act, NIS2, and national space laws.",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description: "Free tier available",
    },
    featureList: [
      "EU Space Act Compliance",
      "NIS2 Directive Compliance",
      "12 Compliance Modules",
      "10+ Jurisdictions",
      "AI-Powered Guidance",
      "Auto-Generated Documents",
    ],
    screenshot: `${siteConfig.url}/screenshots/dashboard.png`,
    softwareVersion: "1.0",
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: "5",
      reviewCount: "1",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// ARTICLE SCHEMA (Blog posts, Guides)
// ============================================================================

interface ArticleJsonLdProps {
  title: string;
  description: string;
  url: string;
  imageUrl?: string;
  datePublished: string;
  dateModified?: string;
  authorName?: string;
  category?: string;
}

export function ArticleJsonLd({
  title,
  description,
  url,
  imageUrl,
  datePublished,
  dateModified,
  authorName = siteConfig.name,
  category,
}: ArticleJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description,
    url,
    image: imageUrl || siteConfig.ogImage,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Organization",
      name: authorName,
      url: siteConfig.url,
    },
    publisher: {
      "@type": "Organization",
      name: siteConfig.name,
      logo: {
        "@type": "ImageObject",
        url: `${siteConfig.url}/logo.png`,
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    ...(category && { articleSection: category }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// FAQ PAGE SCHEMA
// ============================================================================

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQPageJsonLdProps {
  faqs: FAQItem[];
}

export function FAQPageJsonLd({ faqs }: FAQPageJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// BREADCRUMB LIST SCHEMA
// ============================================================================

interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbJsonLdProps {
  items: BreadcrumbItem[];
}

export function BreadcrumbJsonLd({ items }: BreadcrumbJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// DEFINED TERM SET SCHEMA (Glossary Index)
// ============================================================================

interface GlossaryTerm {
  term: string;
  definition: string;
  url: string;
}

interface DefinedTermSetJsonLdProps {
  name: string;
  description: string;
  terms: GlossaryTerm[];
}

export function DefinedTermSetJsonLd({
  name,
  description,
  terms,
}: DefinedTermSetJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name,
    description,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      description: t.definition,
      url: t.url,
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// DEFINED TERM SCHEMA (Individual Glossary Entry)
// ============================================================================

interface DefinedTermJsonLdProps {
  term: string;
  definition: string;
  url: string;
  inDefinedTermSet?: string;
}

export function DefinedTermJsonLd({
  term,
  definition,
  url,
  inDefinedTermSet = `${siteConfig.url}/glossary`,
}: DefinedTermJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term,
    description: definition,
    url,
    inDefinedTermSet: {
      "@type": "DefinedTermSet",
      "@id": inDefinedTermSet,
      name: "Space Compliance Glossary",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// HOW-TO SCHEMA (Guides with steps)
// ============================================================================

interface HowToStep {
  name: string;
  text: string;
  url?: string;
}

interface HowToJsonLdProps {
  name: string;
  description: string;
  steps: HowToStep[];
  totalTime?: string; // ISO 8601 duration format, e.g., "PT30M"
}

export function HowToJsonLd({
  name,
  description,
  steps,
  totalTime,
}: HowToJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    ...(totalTime && { totalTime }),
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
      ...(step.url && { url: step.url }),
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// PRODUCT SCHEMA (For specific modules/features)
// ============================================================================

interface ProductJsonLdProps {
  name: string;
  description: string;
  url: string;
  image?: string;
  category?: string;
}

export function ProductJsonLd({
  name,
  description,
  url,
  image,
  category,
}: ProductJsonLdProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    image: image || siteConfig.ogImage,
    brand: {
      "@type": "Brand",
      name: siteConfig.name,
    },
    ...(category && { category }),
    offers: {
      "@type": "Offer",
      availability: "https://schema.org/InStock",
      price: "0",
      priceCurrency: "EUR",
      seller: {
        "@type": "Organization",
        name: siteConfig.name,
      },
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
