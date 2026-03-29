export interface TopicClusterLink {
  title: string;
  href: string;
  description: string;
}

export const TOPIC_CLUSTERS: Record<string, TopicClusterLink[]> = {
  "EU Space Act": [
    {
      title: "EU Space Act Overview",
      href: "/resources/eu-space-act",
      description:
        "Comprehensive overview of the EU Space Act (COM(2025) 335) and its 119 articles.",
    },
    {
      title: "Authorization & Licensing",
      href: "/modules/authorization",
      description:
        "Navigate the authorization process for space operations in the EU.",
    },
    {
      title: "Debris Mitigation",
      href: "/modules/debris",
      description:
        "Meet debris mitigation requirements under the EU Space Act.",
    },
    {
      title: "Environmental Compliance",
      href: "/modules/environmental",
      description:
        "Environmental footprint declaration and lifecycle assessment requirements.",
    },
    {
      title: "Insurance & Liability",
      href: "/modules/insurance",
      description:
        "Third-party liability coverage and financial guarantees for space operators.",
    },
    {
      title: "EU Space Act Assessment",
      href: "/assessment/eu-space-act",
      description:
        "Free assessment to determine which articles apply to your operations.",
    },
  ],
  "NIS2 Cybersecurity": [
    {
      title: "NIS2 for Space Operators",
      href: "/solutions/cybersecurity-nis2",
      description:
        "How the NIS2 Directive applies to satellite operators and space services.",
    },
    {
      title: "Cybersecurity Module",
      href: "/modules/cybersecurity",
      description:
        "NIS2-aligned cybersecurity assessment and compliance tracking.",
    },
    {
      title: "NIS2 Assessment",
      href: "/assessment/nis2",
      description: "Classify your organization under the NIS2 Directive.",
    },
    {
      title: "Supervision & Reporting",
      href: "/modules/supervision",
      description: "Ongoing supervisory obligations and incident reporting.",
    },
  ],
  Jurisdictions: [
    {
      title: "Compare Jurisdictions",
      href: "/assessment/space-law",
      description:
        "Side-by-side comparison of space law requirements across 10 European jurisdictions.",
    },
    {
      title: "France (CNES)",
      href: "/jurisdictions/france",
      description: "French space law (LOS) and CNES licensing requirements.",
    },
    {
      title: "Germany",
      href: "/jurisdictions/germany",
      description: "German Space Act (Weltraumgesetz) and BNetzA oversight.",
    },
    {
      title: "United Kingdom",
      href: "/jurisdictions/united-kingdom",
      description: "UK Space Industry Act and CAA licensing.",
    },
    {
      title: "Luxembourg",
      href: "/jurisdictions/luxembourg",
      description:
        "Luxembourg space law including space resources legislation.",
    },
    {
      title: "Netherlands",
      href: "/jurisdictions/netherlands",
      description: "Dutch Space Activities Act and ILT supervision.",
    },
  ],
};

/**
 * Maps module slugs to their topic cluster name.
 */
export const MODULE_CLUSTER_MAP: Record<string, string> = {
  authorization: "EU Space Act",
  debris: "EU Space Act",
  environmental: "EU Space Act",
  insurance: "EU Space Act",
  supervision: "EU Space Act",
  cybersecurity: "NIS2 Cybersecurity",
  nis2: "NIS2 Cybersecurity",
};
