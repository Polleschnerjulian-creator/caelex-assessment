/**
 * Single source of truth for the Caelex legal document registry.
 *
 * Used by:
 *   - /legal (hub page)
 *   - LegalSidebar (in-page navigation on every /legal/* page)
 *   - Breadcrumbs (top of every /legal/* page)
 *   - Footer (main marketing footer)
 *   - LegalRenderer (ensures cross-links stay consistent)
 *
 * When you add or reorder a document, only edit this file — every
 * consumer picks up the change automatically.
 */

export interface LegalLink {
  id: string;
  label: string;
  labelEn?: string;
  href: string;
  description?: string;
  descriptionEn?: string;
  /** True if this is the language alternative of another item (avoid
   *  rendering both in the same list). */
  isTranslation?: boolean;
  /** Mark items the compliance team considers mandatory for DSA / DSGVO
   *  findability (shown bold in footer). */
  critical?: boolean;
}

export interface LegalCategory {
  id: string;
  label: string;
  labelEn: string;
  icon: "terms" | "privacy" | "security" | "consumer" | "policy" | "reference";
  description: string;
  descriptionEn: string;
  items: LegalLink[];
}

export const LEGAL_CATEGORIES: LegalCategory[] = [
  {
    id: "contracts",
    label: "Verträge",
    labelEn: "Contracts",
    icon: "terms",
    description:
      "Die Kernverträge, die das Verhältnis zwischen Caelex und Kunden regeln.",
    descriptionEn:
      "Core contracts governing the relationship between Caelex and customers.",
    items: [
      {
        id: "terms",
        label: "AGB (V3.0)",
        labelEn: "Terms of Service",
        href: "/legal/terms",
        description:
          "35 Paragraphen + 5 produktspezifische Annexes. Rechtsverbindlich für alle Caelex-Produkte.",
        descriptionEn:
          "35 sections + 5 product annexes. Legally binding for all Caelex products.",
        critical: true,
      },
      {
        id: "terms-en",
        label: "Terms of Service (EN)",
        href: "/legal/terms-en",
        description:
          "English convenience translation. The German version at /legal/terms prevails in case of conflict.",
        isTranslation: true,
      },
      {
        id: "dpa",
        label: "DPA / Auftragsverarbeitung (V1.0)",
        labelEn: "Data Processing Agreement",
        href: "/legal/dpa",
        description:
          "Vereinbarung nach Art. 28 DSGVO inklusive TOM-Anlage und Sub-Processor-Register.",
        descriptionEn:
          "Art. 28 GDPR agreement including TOM annex and sub-processor register.",
        critical: true,
      },
      {
        id: "dpa-en",
        label: "DPA (EN)",
        href: "/legal/dpa-en",
        description: "English version of the DPA.",
        isTranslation: true,
      },
      {
        id: "sub-processors",
        label: "Sub-Auftragsverarbeiter",
        labelEn: "Sub-processors",
        href: "/legal/sub-processors",
        description:
          "Transparenz-Register aller Caelex-Dienstleister mit Zweck, Datenarten und Transfermechanismus.",
        descriptionEn:
          "Transparency register of all Caelex service providers with purpose, data types and transfer mechanism.",
        critical: true,
      },
    ],
  },
  {
    id: "privacy",
    label: "Datenschutz",
    labelEn: "Privacy",
    icon: "privacy",
    description:
      "Wie wir personenbezogene Daten verarbeiten — transparent nach Art. 13/14 DSGVO.",
    descriptionEn:
      "How we process personal data — transparent under Art. 13/14 GDPR.",
    items: [
      {
        id: "privacy",
        label: "Datenschutzerklärung (V3.0)",
        labelEn: "Privacy Policy",
        href: "/legal/privacy",
        description:
          "15 Abschnitte mit konkreten Speicherdauern, Betroffenenrechten und KI-Transparenz.",
        descriptionEn:
          "15 sections with concrete retention periods, data-subject rights and AI transparency.",
        critical: true,
      },
      {
        id: "privacy-en",
        label: "Privacy Policy (EN)",
        href: "/legal/privacy-en",
        isTranslation: true,
      },
      {
        id: "cookies",
        label: "Cookie-Richtlinie",
        labelEn: "Cookie Policy",
        href: "/legal/cookies",
        description:
          "TTDSG-konforme Einwilligung, vollständiges Cookie-Inventar, Widerrufsmöglichkeit.",
        descriptionEn:
          "TTDSG-compliant consent, full cookie inventory, withdrawal option.",
      },
      {
        id: "cookies-en",
        label: "Cookie Policy (EN)",
        href: "/legal/cookies-en",
        isTranslation: true,
      },
      {
        id: "ai-disclosure",
        label: "KI-Transparenz",
        labelEn: "AI Disclosure",
        href: "/legal/ai-disclosure",
        description:
          "Wo wir KI einsetzen, welche Modelle, Zero-Data-Retention, Grenzen der Ausgaben.",
        descriptionEn:
          "Where we use AI, which models, zero data retention, limits of outputs.",
      },
    ],
  },
  {
    id: "security",
    label: "Sicherheit",
    labelEn: "Security",
    icon: "security",
    description:
      "Wie wir Ihre Daten und unsere Plattform schützen — einschließlich Schwachstellen-Meldekanal.",
    descriptionEn:
      "How we protect your data and our platform — including vulnerability reporting.",
    items: [
      {
        id: "security",
        label: "Sicherheitsrichtlinie",
        labelEn: "Security Policy",
        href: "/legal/security",
        description:
          "Coordinated Vulnerability Disclosure mit Safe Harbor und Reaktionszeiten.",
        descriptionEn:
          "Coordinated Vulnerability Disclosure with Safe Harbor and response times.",
      },
      {
        id: "security-txt",
        label: "security.txt (RFC 9116)",
        href: "/.well-known/security.txt",
        description:
          "Maschinenlesbarer Sicherheitskontakt für Scanner und Bug-Bounty-Plattformen.",
        descriptionEn:
          "Machine-readable security contact for scanners and bug-bounty platforms.",
      },
    ],
  },
  {
    id: "consumer",
    label: "Verbraucher & Zugänglichkeit",
    labelEn: "Consumer & accessibility",
    icon: "consumer",
    description:
      "Rechte, die wir gegenüber Verbrauchern und Nutzern mit Barrieren garantieren.",
    descriptionEn:
      "Rights guaranteed to consumers and users experiencing barriers.",
    items: [
      {
        id: "widerruf",
        label: "Widerrufsbelehrung",
        labelEn: "Withdrawal notice",
        href: "/legal/widerruf",
        description:
          "14-Tage-Widerrufsrecht nach §§ 312g, 355 BGB mit Muster-Widerrufsformular.",
        descriptionEn:
          "14-day withdrawal right under Sections 312g, 355 BGB with model form.",
      },
      {
        id: "barrierefreiheit",
        label: "Barrierefreiheit",
        labelEn: "Accessibility",
        href: "/legal/barrierefreiheit",
        description:
          "BFSG / WCAG 2.1 AA Selbstbewertung mit Remediation-Roadmap und Feedback-Kanal.",
        descriptionEn:
          "BFSG / WCAG 2.1 AA self-assessment with remediation roadmap and feedback channel.",
      },
      {
        id: "accessibility",
        label: "Accessibility Statement (EN)",
        href: "/legal/accessibility",
        isTranslation: true,
      },
    ],
  },
  {
    id: "policy",
    label: "Nutzungsregeln",
    labelEn: "Use policy",
    icon: "policy",
    description: "Was auf der Plattform zulässig ist — und was nicht.",
    descriptionEn: "What is permitted on the platform — and what is not.",
    items: [
      {
        id: "content-policy",
        label: "Acceptable Use Policy",
        labelEn: "Acceptable Use Policy",
        href: "/legal/content-policy",
        description:
          "Konkrete Verbotslisten und DSA-konforme Notice-and-Action-Verfahren.",
        descriptionEn:
          "Concrete prohibitions and DSA-compliant notice-and-action procedures.",
      },
    ],
  },
  {
    id: "reference",
    label: "Referenz",
    labelEn: "Reference",
    icon: "reference",
    description: "Rechtliche Angaben und Archiv früherer Vertragsfassungen.",
    descriptionEn: "Legal notice and archive of prior contract versions.",
    items: [
      {
        id: "impressum",
        label: "Impressum",
        labelEn: "Legal notice",
        href: "/legal/impressum",
        description:
          "Anbieterkennung nach § 5 DDG, MStV und DSA Art. 11/12 SPOC.",
        descriptionEn:
          "Provider identification under Section 5 DDG, MStV and DSA Art. 11/12 SPOC.",
        critical: true,
      },
      {
        id: "archive",
        label: "AGB-Archiv",
        labelEn: "Terms archive",
        href: "/legal/terms/archive",
        description:
          "Frühere Vertragsfassungen zur revisionssicheren Nachvollziehbarkeit (10 Jahre).",
        descriptionEn:
          "Prior contract versions for audit-proof traceability (10 years).",
      },
    ],
  },
];

/** Flat list of all legal items (no categories, no translations). */
export const LEGAL_ITEMS_FLAT: LegalLink[] = LEGAL_CATEGORIES.flatMap((c) =>
  c.items.filter((it) => !it.isTranslation),
);

/** Find the category + item for a given route (for breadcrumbs + sidebar). */
export function findLegalItem(
  pathname: string,
): { category: LegalCategory; item: LegalLink } | null {
  for (const category of LEGAL_CATEGORIES) {
    const item = category.items.find((i) => i.href === pathname);
    if (item) return { category, item };
  }
  return null;
}

/** Flat list of critical items — guaranteed in the footer. */
export const LEGAL_CRITICAL_ITEMS: LegalLink[] = LEGAL_CATEGORIES.flatMap((c) =>
  c.items.filter((it) => it.critical && !it.isTranslation),
);
