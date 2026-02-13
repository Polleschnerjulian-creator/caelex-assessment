import { Metadata } from "next";

// ============================================================================
// SEO CONFIGURATION
// ============================================================================

export const siteConfig = {
  name: "Caelex",
  tagline: "Space Compliance Platform",
  description:
    "The world's space compliance platform. Navigate EU Space Act, NIS2, and national space laws across 10+ jurisdictions with 12 compliance modules.",
  url: "https://caelex.eu",
  ogImage: "https://caelex.eu/og-image.png",
  twitterHandle: "@caboracaelex",
  linkedIn: "https://linkedin.com/company/caelex",
  email: "cs@caelex.eu",
  locale: "en_US",
  themeColor: "#000000",
};

// ============================================================================
// METADATA GENERATOR
// ============================================================================

interface GenerateMetadataProps {
  title: string;
  description: string;
  path?: string;
  ogImage?: string;
  ogType?: "website" | "article";
  publishedTime?: string;
  modifiedTime?: string;
  authors?: string[];
  keywords?: string[];
  noIndex?: boolean;
}

export function generateMetadata({
  title,
  description,
  path = "",
  ogImage,
  ogType = "website",
  publishedTime,
  modifiedTime,
  authors,
  keywords,
  noIndex = false,
}: GenerateMetadataProps): Metadata {
  const fullTitle =
    title === siteConfig.name
      ? `${siteConfig.name} — ${siteConfig.tagline}`
      : `${title} | ${siteConfig.name} — ${siteConfig.tagline}`;

  const url = `${siteConfig.url}${path}`;
  const image = ogImage || siteConfig.ogImage;

  return {
    title: fullTitle,
    description,
    keywords,
    authors: authors
      ? authors.map((name) => ({ name }))
      : [{ name: siteConfig.name }],
    metadataBase: new URL(siteConfig.url),
    alternates: {
      canonical: url,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: siteConfig.name,
      type: ogType,
      locale: siteConfig.locale,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
      ...(ogType === "article" && {
        publishedTime,
        modifiedTime,
        authors,
      }),
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [image],
      creator: siteConfig.twitterHandle,
      site: siteConfig.twitterHandle,
    },
    icons: {
      icon: "/favicon.svg",
      shortcut: "/favicon.svg",
      apple: "/apple-touch-icon.png",
    },
    manifest: "/site.webmanifest",
    other: {
      "theme-color": siteConfig.themeColor,
    },
  };
}

// ============================================================================
// PAGE-SPECIFIC METADATA
// ============================================================================

export const pageMetadata = {
  home: generateMetadata({
    title: "Caelex",
    description:
      "The world's space compliance platform. Navigate EU Space Act, NIS2, and national space laws across 10+ jurisdictions with 12 compliance modules and AI-powered guidance.",
    path: "/",
    keywords: [
      "space compliance",
      "EU Space Act",
      "satellite regulation",
      "space law",
      "NIS2 space",
      "space licensing",
    ],
  }),

  platform: generateMetadata({
    title: "Platform Overview",
    description:
      "Explore Caelex's 12 compliance modules covering authorization, cybersecurity, debris mitigation, insurance, and more across 10+ space jurisdictions.",
    path: "/platform",
    keywords: [
      "space compliance platform",
      "satellite compliance software",
      "space regulatory technology",
    ],
  }),

  pricing: generateMetadata({
    title: "Pricing",
    description:
      "Flexible pricing plans for space operators of all sizes. From startups to enterprise, find the right compliance solution for your mission.",
    path: "/pricing",
    keywords: ["space compliance pricing", "satellite compliance cost"],
  }),

  about: generateMetadata({
    title: "About Caelex",
    description:
      "Learn about Caelex's mission to simplify space compliance. Our team helps satellite operators navigate complex regulations across the globe.",
    path: "/about",
    keywords: [
      "space compliance company",
      "Caelex team",
      "space regulation experts",
    ],
  }),

  contact: generateMetadata({
    title: "Contact",
    description:
      "Get in touch with Caelex. Request a demo, ask questions, or learn how we can help with your space compliance needs.",
    path: "/contact",
    keywords: ["contact space compliance", "space regulation help"],
  }),

  demo: generateMetadata({
    title: "Request a Demo",
    description:
      "See Caelex in action. Book a personalized demo to explore how our platform simplifies EU Space Act, NIS2, and national space law compliance.",
    path: "/demo",
    keywords: ["space compliance demo", "satellite regulation demo"],
  }),

  assessment: generateMetadata({
    title: "Compliance Assessment",
    description:
      "Start your free space compliance assessment. Get your regulatory profile across EU Space Act, NIS2, and 10 national jurisdictions in minutes.",
    path: "/assessment",
    keywords: [
      "space compliance assessment",
      "EU Space Act assessment",
      "satellite compliance check",
    ],
  }),

  astra: generateMetadata({
    title: "ASTRA AI Agent",
    description:
      "Meet ASTRA, Caelex's AI compliance agent. Get instant answers on EU Space Act, NIS2, export control, and space regulations with 22+ specialized tools.",
    path: "/astra",
    keywords: [
      "space compliance AI",
      "satellite regulation AI",
      "space law chatbot",
      "ASTRA",
    ],
  }),

  blog: generateMetadata({
    title: "Space Compliance Blog",
    description:
      "Expert insights on EU Space Act, NIS2, space debris, export control, and satellite licensing. Stay ahead of space regulation changes.",
    path: "/blog",
    keywords: [
      "space compliance blog",
      "EU Space Act news",
      "satellite regulation updates",
    ],
  }),

  glossary: generateMetadata({
    title: "Space Compliance Glossary",
    description:
      "Comprehensive glossary of space compliance terms. From SCO to COPUOS, understand the terminology of space regulation.",
    path: "/glossary",
    keywords: [
      "space compliance glossary",
      "space regulation terms",
      "satellite licensing terminology",
    ],
  }),

  guides: generateMetadata({
    title: "Compliance Guides",
    description:
      "In-depth guides on EU Space Act, NIS2, space debris mitigation, export control, and satellite licensing. Expert knowledge for space operators.",
    path: "/guides",
    keywords: [
      "space compliance guides",
      "EU Space Act guide",
      "satellite licensing guide",
    ],
  }),

  jurisdictions: generateMetadata({
    title: "Space Jurisdictions",
    description:
      "Compare space regulations across 10+ jurisdictions. Understand national space laws in Germany, France, UK, Luxembourg, and more.",
    path: "/jurisdictions",
    keywords: [
      "space law by country",
      "national space regulations",
      "satellite licensing countries",
    ],
  }),

  modules: generateMetadata({
    title: "Compliance Modules",
    description:
      "Explore Caelex's 12 compliance modules: authorization, cybersecurity, debris, insurance, export control, spectrum, and more.",
    path: "/modules",
    keywords: [
      "space compliance modules",
      "satellite regulatory modules",
      "space licensing modules",
    ],
  }),

  resources: generateMetadata({
    title: "Resources",
    description:
      "Access comprehensive space compliance resources: guides, blog articles, glossary, and regulatory information for EU Space Act, NIS2, and national space laws.",
    path: "/resources",
    keywords: [
      "space compliance resources",
      "space regulation guides",
      "satellite compliance knowledge",
    ],
  }),
};

// ============================================================================
// MODULE METADATA
// ============================================================================

export interface ModuleInfo {
  slug: string;
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  regulations: string[];
  jurisdictions: string[];
}

export const moduleMetadata: ModuleInfo[] = [
  {
    slug: "authorization",
    title: "Space Authorization & Licensing Compliance",
    h1: "Space Authorization & Licensing Compliance",
    description:
      "Navigate space authorization requirements across EU Space Act, national laws, and international frameworks. Get licensed to operate satellites with confidence.",
    keywords: [
      "space authorization",
      "satellite license",
      "space licensing requirements",
      "launch authorization",
    ],
    regulations: ["EU Space Act Art. 5-9", "National Space Laws", "UN OST"],
    jurisdictions: [
      "EU",
      "Germany",
      "France",
      "UK",
      "Luxembourg",
      "Netherlands",
    ],
  },
  {
    slug: "cybersecurity",
    title: "Space Cybersecurity & NIS2 Compliance",
    h1: "Space Cybersecurity & NIS2 Compliance",
    description:
      "Implement cybersecurity measures for space systems under NIS2, NIST, and ISO 27001. Protect satellites and ground infrastructure from cyber threats.",
    keywords: [
      "space cybersecurity",
      "NIS2 space",
      "satellite cybersecurity",
      "space NIST framework",
    ],
    regulations: [
      "NIS2 Directive",
      "ISO 27001",
      "NIST CSF",
      "EU Space Act Art. 16",
    ],
    jurisdictions: ["EU", "All EU Member States"],
  },
  {
    slug: "debris-mitigation",
    title: "Space Debris Mitigation Compliance",
    h1: "Space Debris Mitigation Compliance",
    description:
      "Meet space debris mitigation requirements under IADC guidelines, ISO 24113, and EU Space Act. Plan deorbit, passivation, and end-of-life disposal.",
    keywords: [
      "space debris mitigation",
      "satellite deorbit",
      "IADC guidelines",
      "ISO 24113",
    ],
    regulations: [
      "EU Space Act Art. 10-12",
      "IADC Guidelines",
      "ISO 24113",
      "COPUOS LTS",
    ],
    jurisdictions: ["International", "EU", "National requirements vary"],
  },
  {
    slug: "environmental",
    title: "Environmental Compliance for Space Operations",
    h1: "Environmental Compliance for Space Operations",
    description:
      "Address environmental requirements for launches and space operations. Navigate emissions, protected areas, and environmental impact assessments.",
    keywords: [
      "space environmental compliance",
      "launch environmental impact",
      "space sustainability",
    ],
    regulations: [
      "EU Space Act Art. 13",
      "National Environmental Laws",
      "REACH",
    ],
    jurisdictions: ["EU", "National environmental agencies"],
  },
  {
    slug: "insurance",
    title: "Space Insurance & Liability Compliance",
    h1: "Space Insurance & Liability Compliance",
    description:
      "Understand third-party liability insurance requirements for space operations. Compare insurance mandates across jurisdictions and meet coverage minimums.",
    keywords: [
      "space insurance",
      "satellite liability insurance",
      "space TPL",
      "launch insurance",
    ],
    regulations: [
      "EU Space Act Art. 14",
      "Liability Convention",
      "National Insurance Requirements",
    ],
    jurisdictions: ["EU", "Germany", "France", "UK", "Luxembourg", "Belgium"],
  },
  {
    slug: "supervision",
    title: "Regulatory Supervision for Space Operators",
    h1: "Regulatory Supervision for Space Operators",
    description:
      "Navigate ongoing regulatory supervision, reporting requirements, and inspections. Stay compliant throughout your mission lifecycle.",
    keywords: [
      "space regulatory supervision",
      "satellite operator reporting",
      "NCA supervision",
    ],
    regulations: ["EU Space Act Art. 17-20", "National Supervision Frameworks"],
    jurisdictions: ["EU", "National Competent Authorities"],
  },
  {
    slug: "export-control",
    title: "Space Export Control Compliance (ITAR, EAR, EU)",
    h1: "Space Export Control Compliance (ITAR, EAR, EU)",
    description:
      "Navigate ITAR, EAR, and EU dual-use export controls for space technology. Understand licensing requirements and compliance obligations.",
    keywords: [
      "space export control",
      "ITAR space",
      "EAR satellites",
      "EU dual-use space",
    ],
    regulations: [
      "ITAR",
      "EAR",
      "EU Dual-Use Regulation",
      "Wassenaar Arrangement",
    ],
    jurisdictions: ["USA", "EU", "International"],
  },
  {
    slug: "spectrum",
    title: "Spectrum Management & ITU Compliance",
    h1: "Spectrum Management & ITU Compliance",
    description:
      "Manage radio frequency coordination under ITU Radio Regulations. Navigate spectrum allocation, interference mitigation, and filing procedures.",
    keywords: [
      "spectrum management",
      "ITU space",
      "satellite frequency coordination",
      "radio frequency licensing",
    ],
    regulations: [
      "ITU Radio Regulations",
      "EU Space Act Art. 15",
      "National Spectrum Authorities",
    ],
    jurisdictions: ["International (ITU)", "EU", "National"],
  },
  {
    slug: "nis2",
    title: "NIS2 Directive Compliance for Space",
    h1: "NIS2 Directive Compliance for Space",
    description:
      "Understand NIS2 requirements for space operators. Implement security measures, incident reporting, and supply chain security for essential entities.",
    keywords: [
      "NIS2 space",
      "NIS2 satellite",
      "space essential entity",
      "NIS2 compliance",
    ],
    regulations: [
      "NIS2 Directive (EU 2022/2555)",
      "National NIS2 Implementations",
    ],
    jurisdictions: ["EU", "All EU Member States"],
  },
  {
    slug: "copuos-iadc",
    title: "COPUOS & IADC Guidelines Compliance",
    h1: "COPUOS & IADC Guidelines Compliance",
    description:
      "Align with UN COPUOS Long-Term Sustainability Guidelines and IADC Space Debris Mitigation Guidelines. Meet international best practices.",
    keywords: [
      "COPUOS guidelines",
      "IADC compliance",
      "UN space guidelines",
      "space sustainability",
    ],
    regulations: ["COPUOS LTS Guidelines", "IADC Guidelines", "UN OST"],
    jurisdictions: ["International (UN)", "Referenced by EU and National Laws"],
  },
  {
    slug: "uk-space-act",
    title: "UK Space Industry Act Compliance",
    h1: "UK Space Industry Act Compliance",
    description:
      "Navigate the UK Space Industry Act 2018. Understand licensing requirements from the UK Space Agency for launch and orbital operations.",
    keywords: [
      "UK Space Industry Act",
      "UK space license",
      "UKSA compliance",
      "UK satellite regulation",
    ],
    regulations: ["UK Space Industry Act 2018", "UK Space Agency Guidelines"],
    jurisdictions: ["United Kingdom"],
  },
  {
    slug: "us-regulatory",
    title: "US Space Regulatory Compliance (FAA, FCC, NOAA)",
    h1: "US Space Regulatory Compliance (FAA, FCC, NOAA)",
    description:
      "Navigate US space regulations from FAA (launches), FCC (spectrum), and NOAA (remote sensing). Understand licensing requirements for US market access.",
    keywords: [
      "US space regulation",
      "FAA launch license",
      "FCC satellite license",
      "NOAA remote sensing",
    ],
    regulations: [
      "Commercial Space Launch Act",
      "Communications Act",
      "Land Remote Sensing Policy Act",
    ],
    jurisdictions: ["United States"],
  },
];

// ============================================================================
// JURISDICTION METADATA
// ============================================================================

export interface JurisdictionInfo {
  slug: string;
  country: string;
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  spaceLaw: string;
  nca: string;
  ncaFull: string;
}

export const jurisdictionMetadata: JurisdictionInfo[] = [
  {
    slug: "germany",
    country: "Germany",
    title: "Space Regulation in Germany",
    h1: "Space Regulation in Germany",
    description:
      "Navigate German space regulations including SatDSiG. Understand licensing from DLR and BMWi requirements for satellite operations in Germany.",
    keywords: [
      "German space law",
      "Germany satellite license",
      "SatDSiG",
      "DLR space regulation",
    ],
    spaceLaw: "Satellite Data Security Act (SatDSiG)",
    nca: "DLR",
    ncaFull:
      "German Aerospace Center (DLR) / Federal Ministry for Economic Affairs",
  },
  {
    slug: "france",
    country: "France",
    title: "Space Regulation in France (Loi relative aux opérations spatiales)",
    h1: "Space Regulation in France",
    description:
      "Navigate French space regulations under the Loi relative aux opérations spatiales (LOS). Understand CNES licensing requirements and liability framework.",
    keywords: [
      "French space law",
      "France satellite license",
      "CNES regulation",
      "LOS space law",
    ],
    spaceLaw: "Loi relative aux opérations spatiales (LOS) 2008",
    nca: "CNES",
    ncaFull: "Centre National d'Études Spatiales (CNES)",
  },
  {
    slug: "united-kingdom",
    country: "United Kingdom",
    title: "Space Regulation in the United Kingdom",
    h1: "Space Regulation in the United Kingdom",
    description:
      "Navigate UK space regulations under the Space Industry Act 2018. Understand UK Space Agency licensing for launch and orbital operations.",
    keywords: [
      "UK space law",
      "UK satellite license",
      "UKSA regulation",
      "Space Industry Act",
    ],
    spaceLaw: "Space Industry Act 2018",
    nca: "UKSA",
    ncaFull: "UK Space Agency (UKSA)",
  },
  {
    slug: "luxembourg",
    country: "Luxembourg",
    title: "Space Regulation in Luxembourg",
    h1: "Space Regulation in Luxembourg",
    description:
      "Navigate Luxembourg's space-friendly regulatory framework. Understand licensing from LSA and requirements for space resources activities.",
    keywords: [
      "Luxembourg space law",
      "Luxembourg satellite license",
      "LSA regulation",
      "space resources law",
    ],
    spaceLaw: "Law on Space Activities 2020",
    nca: "LSA",
    ncaFull: "Luxembourg Space Agency (LSA)",
  },
  {
    slug: "netherlands",
    country: "Netherlands",
    title: "Space Regulation in the Netherlands",
    h1: "Space Regulation in the Netherlands",
    description:
      "Navigate Dutch space regulations under the Space Activities Act. Understand NSO licensing requirements for satellite operations.",
    keywords: [
      "Dutch space law",
      "Netherlands satellite license",
      "NSO regulation",
      "Space Activities Act",
    ],
    spaceLaw: "Space Activities Act (Wet ruimtevaartactiviteiten) 2007",
    nca: "NSO",
    ncaFull: "Netherlands Space Office (NSO)",
  },
  {
    slug: "belgium",
    country: "Belgium",
    title: "Space Regulation in Belgium",
    h1: "Space Regulation in Belgium",
    description:
      "Navigate Belgian space regulations under the Space Activities Act 2005. Understand BELSPO licensing for space operations.",
    keywords: [
      "Belgian space law",
      "Belgium satellite license",
      "BELSPO regulation",
    ],
    spaceLaw:
      "Law on Activities of Launching, Flight Operation and Guidance of Space Objects 2005",
    nca: "BELSPO",
    ncaFull: "Belgian Science Policy Office (BELSPO)",
  },
  {
    slug: "austria",
    country: "Austria",
    title: "Space Regulation in Austria",
    h1: "Space Regulation in Austria",
    description:
      "Navigate Austrian space regulations under the Austrian Outer Space Act. Understand FFG requirements for space activities authorization.",
    keywords: [
      "Austrian space law",
      "Austria satellite license",
      "FFG space regulation",
    ],
    spaceLaw: "Austrian Outer Space Act (Weltraumgesetz) 2011",
    nca: "FFG",
    ncaFull: "Austrian Research Promotion Agency (FFG)",
  },
  {
    slug: "denmark",
    country: "Denmark",
    title: "Space Regulation in Denmark",
    h1: "Space Regulation in Denmark",
    description:
      "Navigate Danish space regulations under the Outer Space Act 2016. Understand licensing from the Danish Agency for Science and Higher Education.",
    keywords: [
      "Danish space law",
      "Denmark satellite license",
      "Denmark space regulation",
    ],
    spaceLaw: "Outer Space Act (Lov om aktiviteter i det ydre rum) 2016",
    nca: "UFST",
    ncaFull: "Danish Agency for Science and Higher Education",
  },
  {
    slug: "italy",
    country: "Italy",
    title: "Space Regulation in Italy",
    h1: "Space Regulation in Italy",
    description:
      "Navigate Italian space regulations under the law on space and aerospace activities. Understand ASI's role in licensing and supervision.",
    keywords: [
      "Italian space law",
      "Italy satellite license",
      "ASI regulation",
    ],
    spaceLaw: "Law on Space and Aerospace Activities 2018",
    nca: "ASI",
    ncaFull: "Italian Space Agency (Agenzia Spaziale Italiana)",
  },
  {
    slug: "norway",
    country: "Norway",
    title: "Space Regulation in Norway",
    h1: "Space Regulation in Norway",
    description:
      "Navigate Norwegian space regulations under the Space Activities Act. Understand NOSA requirements for launch and orbital operations.",
    keywords: [
      "Norwegian space law",
      "Norway satellite license",
      "NOSA regulation",
    ],
    spaceLaw:
      "Act on Launching Objects from Norwegian Territory into Outer Space 1969",
    nca: "NOSA",
    ncaFull: "Norwegian Space Agency (NOSA)",
  },
  {
    slug: "european-union",
    country: "European Union",
    title: "EU Space Regulation: The EU Space Act & NIS2",
    h1: "EU Space Regulation: The EU Space Act & NIS2",
    description:
      "Navigate EU-wide space regulations including the EU Space Act and NIS2 Directive. Understand how EU law interacts with national frameworks.",
    keywords: [
      "EU Space Act",
      "EU space regulation",
      "NIS2 space",
      "European space law",
    ],
    spaceLaw: "EU Space Act (Proposed Regulation)",
    nca: "EUSPA/National NCAs",
    ncaFull:
      "EU Agency for the Space Programme (EUSPA) + National Competent Authorities",
  },
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getModuleMetadata(slug: string): ModuleInfo | undefined {
  return moduleMetadata.find((m) => m.slug === slug);
}

export function getJurisdictionMetadata(
  slug: string,
): JurisdictionInfo | undefined {
  return jurisdictionMetadata.find((j) => j.slug === slug);
}

export function generateModulePageMetadata(slug: string): Metadata {
  const moduleInfo = getModuleMetadata(slug);
  if (!moduleInfo) {
    return generateMetadata({
      title: "Module Not Found",
      description: "The requested compliance module could not be found.",
      path: `/modules/${slug}`,
      noIndex: true,
    });
  }

  return generateMetadata({
    title: moduleInfo.title,
    description: moduleInfo.description,
    path: `/modules/${moduleInfo.slug}`,
    keywords: moduleInfo.keywords,
  });
}

export function generateJurisdictionPageMetadata(slug: string): Metadata {
  const jurisdiction = getJurisdictionMetadata(slug);
  if (!jurisdiction) {
    return generateMetadata({
      title: "Jurisdiction Not Found",
      description: "The requested jurisdiction could not be found.",
      path: `/jurisdictions/${slug}`,
      noIndex: true,
    });
  }

  return generateMetadata({
    title: jurisdiction.title,
    description: jurisdiction.description,
    path: `/jurisdictions/${jurisdiction.slug}`,
    keywords: jurisdiction.keywords,
  });
}

// ============================================================================
// BLOG METADATA HELPER
// ============================================================================

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  updatedAt?: string;
  author: string;
  category: string;
  keywords: string[];
  readingTime: number;
}

export function generateBlogPostMetadata(post: BlogPostMeta): Metadata {
  return generateMetadata({
    title: post.title,
    description: post.description,
    path: `/blog/${post.slug}`,
    ogType: "article",
    publishedTime: post.publishedAt,
    modifiedTime: post.updatedAt || post.publishedAt,
    authors: [post.author],
    keywords: post.keywords,
  });
}

// ============================================================================
// GLOSSARY METADATA HELPER
// ============================================================================

export interface GlossaryTermMeta {
  slug: string;
  term: string;
  fullName: string;
  definition: string;
  source: string;
}

export function generateGlossaryTermMetadata(term: GlossaryTermMeta): Metadata {
  const title = term.fullName ? `${term.term} (${term.fullName})` : term.term;

  return generateMetadata({
    title: `${title} — Space Compliance Glossary`,
    description: `${term.term}: ${term.definition.substring(0, 140)}...`,
    path: `/glossary/${term.slug}`,
    keywords: [
      term.term,
      term.fullName,
      "space glossary",
      "space compliance terms",
    ].filter(Boolean) as string[],
  });
}
