/**
 * Caelex Scholar — Imprint (EN, convenience translation) — § 5 DDG / § 18 MStV.
 *
 * Convenience English edition. The binding edition is the German one
 * (`imprint-de.ts`); keep both in sync. The German text prevails.
 *
 * DRAFT — the mandatory ENTWURF/DRAFT banner is rendered by LegalDoc; do NOT add
 * one here. Template pending qualified-counsel review.
 *
 * STRICTLY MONOCHROME / WCAG 2.2 AA — handled by the shell. Plain strings only.
 * Entity facts mirror src/app/legal/impressum/page.tsx.
 */

import type { ScholarLegalDoc } from "../_components/types";

export const IMPRINT_EN: ScholarLegalDoc = {
  lang: "en",
  title: "Imprint",
  subtitle: "Caelex Scholar — legal notice under § 5 DDG, § 18 MStV",
  version: "1.0",
  lastUpdated: "7 June 2026",
  preamble: [
    "Legally required information for the Caelex Scholar service (caelex.eu/scholar). The German version is binding; this English version is for information only.",
  ],
  sections: [
    {
      id: "s1",
      number: "Section 1",
      title: "Provider (§ 5 DDG, § 18 MStV)",
      blocks: [
        {
          type: "p",
          text: "Caelex",
        },
        {
          type: "ul",
          items: [
            "Sole proprietor: Julian Polleschner",
            "Am Maselakepark 37",
            "13587 Berlin",
            "Germany",
          ],
        },
        {
          type: "p",
          text: "Caelex is a sole proprietorship (Einzelunternehmen; sole proprietor: Julian Polleschner).",
        },
      ],
    },
    {
      id: "s2",
      number: "Section 2",
      title: "Contact",
      blocks: [
        {
          type: "ul",
          items: [
            "General and user contact: cs@caelex.eu",
            "Legal: legal@caelex.eu",
            "Data protection: privacy@caelex.eu",
            "Security: security@caelex.eu",
            "Abuse: abuse@caelex.eu",
          ],
        },
      ],
    },
    {
      id: "s3",
      number: "Section 3",
      title: "VAT identification number",
      blocks: [
        {
          type: "p",
          text: "Provided on request pursuant to § 27a UStG. As a small business under § 19 UStG (Kleinunternehmer), no VAT is shown on invoices, in so far and as long as applicable.",
        },
      ],
    },
    {
      id: "s4",
      number: "Section 4",
      title: "Responsible for content under § 18(2) MStV",
      blocks: [
        {
          type: "ul",
          items: [
            "Julian Polleschner",
            "Am Maselakepark 37",
            "13587 Berlin, Germany",
          ],
        },
      ],
    },
    {
      id: "s5",
      number: "Section 5",
      title: "Single Point of Contact under Art. 11 and 12 DSA",
      blocks: [
        {
          type: "p",
          text: "Single Point of Contact under Regulation (EU) 2022/2065 (Digital Services Act) for authorities and for users:",
        },
        {
          type: "ul",
          items: [
            "E-mail for authority contact: legal@caelex.eu",
            "E-mail for user contact: cs@caelex.eu",
            "Languages of communication: German, English",
            "Postal address: as stated above under Provider",
          ],
        },
      ],
    },
    {
      id: "s6",
      number: "Section 6",
      title: "Professional-law information",
      blocks: [
        {
          type: "p",
          text: "Caelex is not a law firm, not a tax-advisory practice and not a licensed financial-services provider. No specific professional-law rules apply. Caelex Scholar is a research and educational tool and does not provide legal advice (see Terms of Use Section 2).",
        },
      ],
    },
    {
      id: "s7",
      number: "Section 7",
      title: "Liability for content",
      blocks: [
        {
          type: "p",
          text: "As a service provider we are responsible under § 7(1) DDG for our own content on these pages in accordance with general law. Under §§ 8 to 10 DDG, however, we as a service provider are not obliged to monitor transmitted or stored third-party information or to investigate circumstances indicating unlawful activity.",
        },
        {
          type: "p",
          text: "Obligations to remove or block the use of information under general law remain unaffected. Liability in this respect is only possible from the point in time at which we become aware of a specific infringement. Upon becoming aware of such infringements, we will remove the content without delay.",
        },
      ],
    },
    {
      id: "s8",
      number: "Section 8",
      title: "Liability for links",
      blocks: [
        {
          type: "p",
          text: "Our offering contains links to external third-party websites over whose content we have no influence. We therefore cannot accept any liability for such third-party content. The respective provider or operator of the linked pages is always responsible for their content.",
        },
      ],
    },
    {
      id: "s9",
      number: "Section 9",
      title: "Copyright",
      blocks: [
        {
          type: "p",
          text: "Content and works created by Caelex on these pages are subject to German copyright law. Official works in the corpus (e.g. treaties, laws, court decisions) are in the public domain under § 5 UrhG. The compilation of the corpus as a database is protected by the sui generis database right (§§ 87a et seq. UrhG). Details are set out in the Terms of Use and the Acceptable Use Policy.",
        },
      ],
    },
    {
      id: "s10",
      number: "Section 10",
      title: "Dispute resolution",
      blocks: [
        {
          type: "p",
          text: "The European Commission provides a platform for online dispute resolution (ODR) at ec.europa.eu/consumers/odr. We are neither willing nor obliged to participate in dispute-resolution proceedings before a consumer arbitration board.",
        },
      ],
    },
  ],
};
