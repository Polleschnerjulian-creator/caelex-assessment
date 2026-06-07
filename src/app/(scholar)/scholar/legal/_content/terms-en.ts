/**
 * Caelex Scholar — Terms of Use (EN, convenience translation).
 *
 * Convenience English edition. The binding edition is the German one
 * (`terms-de.ts`); keep both in sync. In case of divergence the German text
 * prevails.
 *
 * DRAFT — the mandatory ENTWURF/DRAFT banner is rendered by LegalDoc; do NOT add
 * one here. This text is a template pending qualified-counsel review.
 *
 * STRICTLY MONOCHROME / WCAG 2.2 AA — handled by the shell. Plain-string blocks
 * only; no inline HTML.
 */

import type { ScholarLegalDoc } from "../_components/types";

export const TERMS_EN: ScholarLegalDoc = {
  lang: "en",
  title: "Terms of Use",
  subtitle: "Caelex Scholar — free, university-licensed legal research",
  version: "Version 0.1 (Draft)",
  lastUpdated: "{{DATE}}",
  preamble: [
    "These Terms of Use govern access to and use of Caelex Scholar (caelex.eu/scholar, the “Service” or “Scholar”), a free, university-licensed legal-research database for space law operated by Caelex (sole proprietor: Julian Polleschner, Berlin; “Caelex”, “we”). Scholar is offered under a B2B2C model: a university or research institution (the “licensing university”) contracts with Caelex and provides access to its members free of charge.",
    "By using Scholar you agree to these Terms. Please read in particular the “No legal advice” notice (Section 2) and the liability provisions (Section 8).",
  ],
  sections: [
    {
      id: "s1",
      number: "Section 1",
      title: "Provider, scope and binding language",
      blocks: [
        {
          type: "p",
          text: "The provider of Scholar is Caelex, sole proprietor Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Germany. The full provider details under § 5 DDG appear in the Imprint.",
        },
        {
          type: "p",
          text: "These Terms apply to any use of Scholar by users who obtain access through a licensing university. They apply in addition to, and without prejudice to, any agreement between the licensing university and its members, and between Caelex and the licensing university.",
        },
        {
          type: "definition",
          term: "Binding language version.",
          text: "Only the German version of these Terms is binding. This English version is a non-binding convenience translation. In case of any discrepancy, the German version prevails.",
        },
      ],
    },
    {
      id: "s2",
      number: "Section 2",
      title: "No legal advice — research aid",
      blocks: [
        {
          type: "callout",
          variant: "warn",
          text: "Scholar is a research and educational tool. Scholar does NOT provide legal advice and is no substitute for advice from a qualified lawyer or other professional. The content provided is general reference material, not case-specific legal recommendation.",
        },
        {
          type: "p",
          text: "The materials in Scholar (treaties, EU legal acts, national laws, court decisions and supplementary space-law materials) are provided solely for information, study and research purposes. They create no lawyer–client or advisory relationship and no basis of reliance.",
        },
        {
          type: "p",
          text: "Caelex is not a law firm and not a tax-advisory practice. Use of Scholar creates no lawyer or advisory contract. Before any legally relevant decision, always obtain qualified legal advice and consult the primary source in its official version.",
        },
        {
          type: "p",
          text: "Do not rely on Scholar alone. Content may be incomplete, out of date or unsuitable for your situation. The authoritative, official version of any legal source must always be verified with the competent body (e.g. the Official Journal of the EU, national gazettes, courts).",
        },
      ],
    },
    {
      id: "s3",
      number: "Section 3",
      title: "Eligibility",
      blocks: [
        {
          type: "p",
          text: "Access is reserved exclusively to members of a licensing university to whom that university grants access — in particular enrolled students and teaching, research and administrative staff acting in the course of their work for the university.",
        },
        {
          type: "p",
          text: "Access is normally provided via your university’s single sign-on (SSO). You must keep your credentials confidential and must not share them with third parties (see the Acceptable Use Policy).",
        },
        {
          type: "p",
          text: "If your affiliation with the licensing university ends, or that university’s licence ends, your access entitlement lapses. There is no claim to continued access.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Minors: Scholar is aimed at university members; however, individual users may be minors. Optional, consent-based features (e.g. search history, semantic search) are off by default. Where consent is required, the German digital-consent age of 16 applies (Art. 8 GDPR). Details are in the Privacy Policy. [TBD: allocate Art. 8 responsibility in the university DPA with counsel.]",
        },
      ],
    },
    {
      id: "s4",
      number: "Section 4",
      title: "Scope of service, free of charge and licence scope",
      blocks: [
        {
          type: "p",
          text: "Scholar is provided free of charge to eligible users. Caelex is remunerated solely by the licensing university; there is no paid contractual relationship with individual users.",
        },
        {
          type: "p",
          text: "Caelex grants you a simple, non-exclusive, non-transferable and revocable right to use Scholar within these Terms for your own, non-commercial study and research purposes. Any use beyond this — in particular systematic reproduction or redistribution — is not permitted (see Section 6 and the Acceptable Use Policy).",
        },
        {
          type: "p",
          text: "Scholar is a free service provided “as is” and “as available”. No particular functionality, availability or fitness for a particular purpose is warranted. Caelex may modify, restrict or discontinue the Service at any time, to the extent reasonable for individual users.",
        },
      ],
    },
    {
      id: "s5",
      number: "Section 5",
      title: "AI-assisted search (transparency notice)",
      blocks: [
        {
          type: "p",
          text: "Scholar optionally offers a semantic search powered by artificial-intelligence methods (vector embeddings) to find and rank relevant passages within the corpus. This feature is off by default and is used only after you actively enable it.",
        },
        {
          type: "callout",
          variant: "info",
          text: "Notice under Art. 50 AI Act (Regulation (EU) 2024/1689): when semantic search is enabled, you are interacting with an AI system. Results are ranked using AI-assisted semantic search and may be erroneous, incomplete or unsuitable. Always verify results against the official source.",
        },
        {
          type: "p",
          text: "Semantic search is a tool for finding content (retrieval). It makes no legally binding decisions and performs no automated individual decision with legal effect within the meaning of Art. 22 GDPR. Substantive assessment and responsibility always remain with you.",
        },
      ],
    },
    {
      id: "s6",
      number: "Section 6",
      title: "Permitted use and obligations",
      blocks: [
        {
          type: "p",
          text: "You may use Scholar only within these Terms, the supplementary Acceptable Use Policy and applicable law. The Acceptable Use Policy forms part of these Terms.",
        },
        {
          type: "p",
          text: "The following are prohibited in particular: automated retrieval or bulk extraction of content (scraping, bulk download); circumventing technical protection, access or rate-limiting measures; sharing credentials; and any unlawful use or use that impairs the Service. Details are in the Acceptable Use Policy.",
        },
        {
          type: "p",
          text: "You are responsible for all activity under your access. If you suspect misuse of your access, please notify us without delay at cs@caelex.eu.",
        },
      ],
    },
    {
      id: "s7",
      number: "Section 7",
      title: "Intellectual property and the corpus",
      blocks: [
        {
          type: "p",
          text: "The marks “Caelex”, “Caelex Scholar”, as well as the look and feel, the software, and the structuring, preparation and compilation of the Service, are protected by copyright and trademark law. You receive no rights in them beyond Section 4.",
        },
        {
          type: "p",
          text: "The corpus consists predominantly of official legal texts (treaties, EU legal acts, national laws, court decisions). Official works are in the public domain under § 5 UrhG and enjoy no copyright protection. The relevant official version and validity must always be verified with the competent body.",
        },
        {
          type: "p",
          text: "The compilation of the corpus as a database is itself protected by the sui generis database right (Directive 96/9/EC, §§ 87a et seq. UrhG), even where individual items are in the public domain. Extraction or re-utilisation of substantial parts, and repeated and systematic extraction of insubstantial parts, are not permitted (see the Acceptable Use Policy).",
        },
        {
          type: "p",
          text: "For content from closed-licence standards (e.g. ITU, ISO/IEC), the amount of text displayed is capped (an excerpt of no more than 600 characters per provision) to respect the rights of the respective rightsholders. [TBD: confirm jurisdiction-specific official-works status and the actual ITU/ISO licence terms with counsel.]",
        },
      ],
    },
    {
      id: "s8",
      number: "Section 8",
      title: "Warranty and liability",
      blocks: [
        {
          type: "p",
          text: "Scholar is provided free of charge. To the extent permitted by law, no warranty is given for the accuracy, completeness, timeliness, availability or fitness of the content for a particular purpose. The official primary source always governs.",
        },
        {
          type: "p",
          text: "Caelex is liable without limitation — on any legal ground — only (i) for intent and gross negligence; (ii) for injury to life, body or health; (iii) under the mandatory provisions of the German Product Liability Act; and (iv) to the extent of a guarantee assumed by Caelex.",
        },
        {
          type: "p",
          text: "For the slightly negligent breach of a material contractual duty (a duty whose fulfilment makes proper performance possible in the first place and on whose observance you may regularly rely — a cardinal duty), liability is limited to the damage typically foreseeable at the time of contract. Otherwise liability for slight negligence is excluded.",
        },
        {
          type: "p",
          text: "Because Scholar is provided free of charge, Caelex is additionally liable under §§ 521, 599 BGB (German gift/loan-for-use rules) only for intent and gross negligence, where this extends further than the limitations above. Liability for decisions you make on the basis of the content is excluded to the extent permitted by law; the liability limits above remain unaffected.",
        },
        {
          type: "callout",
          variant: "info",
          text: "[TBD: the final wording of the warranty and liability clauses (including standard-terms control under §§ 305 et seq. BGB) must be reviewed by qualified legal counsel.]",
        },
      ],
    },
    {
      id: "s9",
      number: "Section 9",
      title: "Data protection",
      blocks: [
        {
          type: "p",
          text: "The processing of personal data in connection with Scholar is governed by the Privacy Policy. In the B2B2C model the licensing university is the controller for the contracted service and Caelex acts as processor in that respect; for its own purposes (product, security, AI) Caelex is an independent controller. Details, including your data-subject rights, are set out in the Privacy Policy.",
        },
      ],
    },
    {
      id: "s10",
      number: "Section 10",
      title: "Suspension and termination",
      blocks: [
        {
          type: "p",
          text: "Caelex may temporarily suspend or permanently terminate access in whole or in part for good cause — in particular for a breach of these Terms or the Acceptable Use Policy, for misuse, or to avert risks to the Service, to other users or to third parties.",
        },
        {
          type: "p",
          text: "Your access entitlement also ends when your affiliation with the licensing university ends or when that university’s licence ends. Rules on deletion of your data are set out in the Privacy Policy; self-service deletion of your account is available in the settings.",
        },
      ],
    },
    {
      id: "s11",
      number: "Section 11",
      title: "Changes to these Terms",
      blocks: [
        {
          type: "p",
          text: "Caelex may amend these Terms with effect for the future where this is necessary and reasonable for you, in particular to reflect changes in law, case law or functionality. The version in force is published with its date (“Stand”) and version number.",
        },
        {
          type: "p",
          text: "Material changes are indicated in an appropriate manner. By continuing to use the Service after an amended version takes effect, you are deemed to accept it, to the extent permitted by law.",
        },
      ],
    },
    {
      id: "s12",
      number: "Section 12",
      title: "Governing law and final provisions",
      blocks: [
        {
          type: "p",
          text: "The law of the Federal Republic of Germany applies, excluding the UN Convention on Contracts for the International Sale of Goods. Mandatory consumer-protection provisions of the country of your habitual residence remain unaffected.",
        },
        {
          type: "p",
          text: "The European Commission provides a platform for online dispute resolution (ODR) at ec.europa.eu/consumers/odr. Caelex is neither willing nor obliged to participate in dispute-resolution proceedings before a consumer arbitration board.",
        },
        {
          type: "definition",
          term: "Severability.",
          text: "Should any provision of these Terms be or become wholly or partly invalid, the validity of the remaining provisions shall remain unaffected. The statutory rule shall apply in place of the invalid provision.",
        },
        {
          type: "p",
          text: "Contact: Caelex, sole proprietor Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Germany — cs@caelex.eu.",
        },
      ],
    },
  ],
};
