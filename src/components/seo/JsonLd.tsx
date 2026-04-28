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
  | "Product"
  | "VideoObject";

interface JsonLdBaseProps {
  type: JsonLdType;
}

// ============================================================================
// ORGANIZATION SCHEMA (Site-wide)
// ============================================================================

export function OrganizationJsonLd() {
  // Structured data enriched for LLM + search-engine discovery. Schema.org
  // @type lists (Organization, SoftwareCompany) let LLMs infer the right
  // category; knowsAbout + areaServed give concrete semantic hooks for
  // queries like "company that does EU Space Act compliance in Europe".
  const schema = {
    "@context": "https://schema.org",
    "@type": ["Organization", "SoftwareCompany"],
    "@id": `${siteConfig.url}/#organization`,
    name: siteConfig.name,
    // Legal entity: sole proprietorship (Einzelunternehmen) registered
    // to Julian Polleschner — see /legal/impressum. Using the formal
    // legal-form-suffixed string here keeps schema.org legalName in
    // sync with the Impressum and the DPA party-block.
    legalName: "Caelex (Einzelunternehmen Julian Polleschner)",
    alternateName: ["Caelex", "caelex.eu"],
    slogan: siteConfig.tagline,
    url: siteConfig.url,
    logo: {
      "@type": "ImageObject",
      url: `${siteConfig.url}/logo.png`,
      width: 512,
      height: 512,
    },
    image: `${siteConfig.url}/og-image.png`,
    description: siteConfig.description,
    email: siteConfig.email,
    foundingDate: "2025",
    foundingLocation: {
      "@type": "Place",
      name: "Berlin, Germany",
    },
    // Founder — documented as a schema:Person so Google's Knowledge
    // Graph can link the company to the person (strengthens the
    // "is this a real business" signal for brand queries).
    founder: {
      "@type": "Person",
      name: "Julian Polleschner",
    },
    address: {
      "@type": "PostalAddress",
      addressLocality: "Berlin",
      addressCountry: "DE",
    },
    // Expanded 2026-04-22. Google's Knowledge Graph trigger is
    // heavily weighted by the count + authority of sameAs entries —
    // they prove "this entity is the same across trusted platforms".
    // Populate every public profile Caelex has. Leave ENV-gated slots
    // for platforms that are still in setup (Wikidata, Crunchbase)
    // so activation is a single ENV change, not a code deploy.
    sameAs: [
      siteConfig.linkedIn,
      "https://x.com/caboracaelex",
      "https://instagram.com/caelex.eu",
      `${siteConfig.url}/about`,
      `${siteConfig.url}/what-is-caelex`,
      // Optional external profiles — set ENV vars to include. Each
      // is an entity-verification signal if the profile exists.
      process.env.NEXT_PUBLIC_WIKIDATA_URL, // e.g. https://www.wikidata.org/wiki/Q...
      process.env.NEXT_PUBLIC_CRUNCHBASE_URL, // e.g. https://www.crunchbase.com/organization/caelex
      process.env.NEXT_PUBLIC_YOUTUBE_URL, // e.g. https://youtube.com/@caelex
      process.env.NEXT_PUBLIC_GITHUB_URL, // e.g. https://github.com/caelex
      process.env.NEXT_PUBLIC_MASTODON_URL, // Fediverse presence if any
    ].filter((v): v is string => Boolean(v)),
    contactPoint: [
      {
        "@type": "ContactPoint",
        email: siteConfig.email,
        contactType: "customer service",
        availableLanguage: ["English", "German"],
      },
      {
        "@type": "ContactPoint",
        email: "hi@caelex.eu",
        contactType: "sales",
        availableLanguage: ["English", "German"],
      },
    ],
    knowsAbout: [
      "EU Space Act",
      "NIS2 Directive",
      "space regulation",
      "satellite compliance",
      "space law",
      "Outer Space Treaty",
      "Registration Convention",
      "Liability Convention",
      "spectrum coordination",
      "ITU filings",
      "orbital debris mitigation",
      "COPUOS guidelines",
      "IADC guidelines",
      "export control",
      "ITAR",
      "EAR",
      "EU Dual-Use Regulation",
      "Satellitendatensicherheitsgesetz",
      "Loi sur les opérations spatiales",
      "Luxembourg Space Resources Act",
      "UK Space Industry Act 2018",
      "FCC satellite licensing",
      "FAA launch licensing",
    ],
    areaServed: [
      { "@type": "Country", name: "European Union" },
      { "@type": "Country", name: "Germany" },
      { "@type": "Country", name: "France" },
      { "@type": "Country", name: "Luxembourg" },
      { "@type": "Country", name: "United Kingdom" },
      { "@type": "Country", name: "Italy" },
      { "@type": "Country", name: "Netherlands" },
      { "@type": "Country", name: "Spain" },
      { "@type": "Country", name: "Belgium" },
    ],
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
  // Enhanced 2026-04-22: added potentialAction SearchAction (enables
  // Google Sitelinks Searchbox once the site ranks for its brand
  // query) and inLanguage / publisher pointers into the Organization
  // graph. The @id anchor lets JSON-LD consumers (especially Google's
  // rich-results parser) join WebSite + Organization + SoftwareApplication
  // into a single coherent entity.
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteConfig.url}/#website`,
    name: siteConfig.name,
    alternateName: ["Caelex", "caelex.eu"],
    url: siteConfig.url,
    description: siteConfig.description,
    inLanguage: ["en", "de"],
    publisher: { "@id": `${siteConfig.url}/#organization` },
    // SearchAction — once the domain earns brand-query ranking,
    // this enables the "search this site" box directly inside the
    // Google result. Search target URL matches the existing
    // /search?q=... pattern (see src/app/search if present) or
    // defaults to the glossary/blog search on the respective page.
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
  // Enriched 2026-04-22 for LLM / search-engine discovery. Expanded
  // featureList covers the full 15-module scope. The offer is kept
  // explicit (free assessment tier) rather than a price range, so
  // LLMs quoting "starting at" claims have a deterministic anchor.
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteConfig.url}/#softwareapplication`,
    name: siteConfig.name,
    alternateName: "Caelex Comply",
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "Regulatory Compliance Software",
    operatingSystem: "Web (any modern browser)",
    url: `${siteConfig.url}/platform`,
    description:
      "The regulatory operating system for the orbital economy. Caelex Comply is a web-based compliance platform covering 15+ regulatory modules across 10+ European jurisdictions — EU Space Act, NIS2 Directive, national space laws, export control, debris mitigation, spectrum coordination, and more — with AI-assisted document generation and continuous monitoring.",
    provider: {
      "@id": `${siteConfig.url}/#organization`,
    },
    audience: {
      "@type": "Audience",
      audienceType:
        "Satellite operators, launch providers, ground-segment operators, constellation operators, in-orbit service providers, space data providers, space resource operators, space-sector law firms and in-house counsel",
    },
    offers: [
      {
        "@type": "Offer",
        name: "Free compliance assessment",
        price: "0",
        priceCurrency: "EUR",
        description:
          "Free regulatory profile across EU Space Act, NIS2, and 10+ national jurisdictions — no credit card required.",
        url: `${siteConfig.url}/assessment`,
      },
      {
        "@type": "Offer",
        name: "Subscription tiers",
        priceCurrency: "EUR",
        description:
          "Multiple subscription tiers for operators and enterprises. Per-organization seat-based and feature-based pricing.",
        url: `${siteConfig.url}/pricing`,
      },
    ],
    featureList: [
      "EU Space Act compliance (119 articles)",
      "NIS2 Directive compliance",
      "National space law coverage (10+ jurisdictions)",
      "Authorization workflow management",
      "Registration (national + UN)",
      "Cybersecurity (BSI TR-03184, ENISA guidelines)",
      "Orbital debris mitigation (COPUOS, IADC, ISO 24113)",
      "Environmental impact assessment",
      "Third-party liability insurance tracking",
      "Export control (ITAR, EAR, EU Dual-Use, national lists)",
      "Spectrum and ITU frequency coordination",
      "UK Space Industry Act 2018 compliance",
      "US regulatory compliance (FCC, FAA)",
      "Digital twin compliance forecasting",
      "Evidence and audit trail management",
      "Astra AI copilot (Claude-powered)",
      "AI-assisted document generation",
      "Multi-tenant organizations with RBAC",
      "Stakeholder network (insurers, auditors, regulators)",
      "NCA submission pipeline",
      "Continuous compliance monitoring",
      "Incident management (NIS2 3-phase reporting)",
      "Regulatory change feed",
      "Public API v1",
      "Stripe-native billing",
    ],
    softwareRequirements: "Modern web browser",
    url_: `${siteConfig.url}/platform`,
    screenshot: `${siteConfig.url}/screenshots/dashboard.png`,
    softwareVersion: "1.0",
    datePublished: "2025",
    inLanguage: ["en", "de"],
    countriesSupported: [
      "DE",
      "FR",
      "LU",
      "UK",
      "IT",
      "NL",
      "BE",
      "ES",
      "NO",
      "SE",
      "DK",
      "AT",
      "CH",
      "PT",
      "IE",
      "FI",
      "GR",
      "CZ",
      "PL",
      "EE",
      "RO",
      "HU",
      "SI",
      "LV",
      "LT",
      "SK",
      "HR",
      "TR",
      "IS",
      "LI",
      "US",
      "NZ",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// ATLAS-SPECIFIC SOFTWARE APPLICATION SCHEMA
// ============================================================================

/**
 * Dedicated schema for ATLAS by Caelex. Rendered on the public ATLAS
 * entry points (/atlas-access) so search engines and LLMs can treat
 * Atlas as its own indexable product rather than folding it into the
 * Caelex Comply SoftwareApplication schema. `isRelatedTo` points back
 * at the main Caelex app so the two products are joined in the graph
 * without being conflated.
 */
export function AtlasSoftwareApplicationJsonLd() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${siteConfig.url}/#atlas`,
    name: "ATLAS by Caelex",
    alternateName: ["Caelex ATLAS", "Atlas"],
    applicationCategory: "LegalApplication",
    applicationSubCategory: "Legal Research Database",
    operatingSystem: "Web (any modern browser)",
    url: `${siteConfig.url}/atlas-access`,
    description:
      "The searchable space-law database for law firms. Continuously updated across 10+ jurisdictions — UN space treaties, EU instruments (EU Space Act, NIS2, CER, Dual-Use Regulation), and national legislation deep-linked to every official primary-source portal. Firm-wide shared annotations, AI-assisted research via Astra, change alerts the moment any source is amended.",
    publisher: { "@id": `${siteConfig.url}/#organization` },
    isRelatedTo: { "@id": `${siteConfig.url}/#softwareapplication` },
    audience: {
      "@type": "Audience",
      audienceType:
        "Law firms advising space-sector clients, in-house legal counsel at space operators, regulatory lawyers",
    },
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "EUR",
      description:
        "Sales-assisted onboarding. Free 30-minute intro call to request firm-wide access — no credit card.",
      url: `${siteConfig.url}/atlas-access`,
    },
    featureList: [
      "Searchable space-law database across 10+ jurisdictions",
      "UN space treaties (OST, Liability, Registration, Rescue, Moon)",
      "EU instruments (EU Space Act, NIS2, CER, Dual-Use Regulation)",
      "Deep-links to every article on authoritative national primary-source portals",
      "Firm-wide shared annotations",
      "AI-assisted research via Astra copilot",
      "Source-change alerts and amendment redlines",
      "Continuously updated regulatory content",
    ],
    inLanguage: ["en", "de"],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

// ============================================================================
// PRODUCT CATALOG SCHEMA — the five Caelex products
// ============================================================================

/**
 * Renders the five public Caelex products (Comply, Atlas, Sentinel,
 * Ephemeris, Verity) as an ItemList of Product/Service records.
 * Gives LLMs a clean way to answer "what products does Caelex offer"
 * and to route a query to the right product URL.
 */
export function ProductCatalogJsonLd() {
  const products = [
    {
      name: "Caelex Comply",
      description:
        "Regulatory command center. Real-time compliance posture across EU Space Act, NIS2, and national space laws. 15+ compliance modules, AI-assisted document generation.",
      url: `${siteConfig.url}/platform`,
      category: "Compliance Workspace",
    },
    {
      name: "Caelex Atlas",
      description:
        "Searchable space-law database for law firms. UN treaties, EU instruments, national legislation across 10+ jurisdictions with deep-links to primary sources, firm-wide shared annotations, and AI-assisted research.",
      url: `${siteConfig.url}/atlas-access`,
      category: "Legal Research",
    },
    {
      name: "Caelex Sentinel",
      description:
        "Autonomous compliance-evidence agents deployed at operator premises. Cryptographically signed hash chains, cross-verification against public orbital data.",
      url: `${siteConfig.url}/sentinel`,
      category: "Evidence Automation",
    },
    {
      name: "Caelex Ephemeris",
      description:
        "Forward-looking compliance risk engine. Models every satellite as a digital twin and forecasts compliance trajectories across the mission lifecycle.",
      url: `${siteConfig.url}/systems/ephemeris`,
      category: "Predictive Compliance",
    },
    {
      name: "Caelex Verity",
      description:
        "Zero-knowledge compliance attestation. Cryptographic proofs demonstrating regulatory adherence without exposing operational data.",
      url: `${siteConfig.url}/verity`,
      category: "Cryptographic Attestation",
    },
  ];

  const schema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Caelex product catalog",
    description:
      "The five products in the Caelex family for space-sector regulatory compliance and legal research.",
    numberOfItems: products.length,
    itemListElement: products.map((p, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      item: {
        "@type": "SoftwareApplication",
        name: p.name,
        description: p.description,
        url: p.url,
        applicationCategory: p.category,
        operatingSystem: "Web",
        provider: { "@id": `${siteConfig.url}/#organization` },
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
// VIDEO OBJECT SCHEMA (Hero video, promotional videos)
// ============================================================================

export function VideoObjectJsonLd({
  name,
  description,
  thumbnailUrl,
  uploadDate,
  contentUrl,
}: {
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate: string;
  contentUrl: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name,
    description,
    thumbnailUrl,
    uploadDate,
    contentUrl,
    publisher: {
      "@type": "Organization",
      name: "Caelex",
      url: "https://www.caelex.eu",
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
