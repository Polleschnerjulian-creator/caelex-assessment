/**
 * Caelex Scholar — Acceptable Use Policy (EN, convenience translation).
 *
 * Convenience English edition. The binding edition is the German one
 * (`acceptable-use-de.ts`); keep both in sync. The German text prevails.
 *
 * DRAFT — the mandatory ENTWURF/DRAFT banner is rendered by LegalDoc; do NOT add
 * one here. Template pending qualified-counsel review.
 *
 * STRICTLY MONOCHROME / WCAG 2.2 AA — handled by the shell. Plain strings only.
 */

import type { ScholarLegalDoc } from "../_components/types";

export const ACCEPTABLE_USE_EN: ScholarLegalDoc = {
  lang: "en",
  title: "Acceptable Use Policy",
  subtitle: "Caelex Scholar — Nutzungsrichtlinie",
  version: "1.0",
  lastUpdated: "7 June 2026",
  preamble: [
    "This Acceptable Use Policy supplements the Caelex Scholar Terms of Use and forms part of them. It sets out what use of Scholar is permitted and what is prohibited, in order to protect the Service, its corpus and all users.",
    "The German version is binding; this English version is a non-binding translation.",
  ],
  sections: [
    {
      id: "s1",
      number: "Section 1",
      title: "Principle",
      blocks: [
        {
          type: "p",
          text: "Scholar may be used solely for your own, non-commercial study, teaching and research purposes within your access entitlement. Any use beyond this, or any abusive or unlawful use, is prohibited.",
        },
        {
          type: "p",
          text: "In the event of a breach of this Policy, Caelex may temporarily suspend or permanently terminate access (see Terms of Use Section 10) and, where necessary, inform the licensing university.",
        },
      ],
    },
    {
      id: "s2",
      number: "Section 2",
      title: "No scraping, no bulk extraction",
      blocks: [
        {
          type: "p",
          text: "Automated retrieval (scraping, crawling), bulk downloading and any systematic reproduction of content are prohibited — whether manually or by means of scripts, bots, browser extensions or other tools.",
        },
        {
          type: "callout",
          variant: "warn",
          text: "The compilation of the corpus is protected as a database by the sui generis database right (Directive 96/9/EC, §§ 87a et seq. UrhG), even where individual items are in the public domain. Extraction or re-utilisation of a substantial part, and repeated and systematic extraction of insubstantial parts, are not permitted.",
        },
        {
          type: "p",
          text: "Reading, occasionally saving or printing individual sources, and quoting to a reasonable extent for your own study and research purposes, remain permitted.",
        },
      ],
    },
    {
      id: "s3",
      number: "Section 3",
      title: "No misuse of the AI search",
      blocks: [
        {
          type: "p",
          text: "The semantic (AI-assisted) search must not be misused. The following are prohibited in particular: automated or bulk submission of search queries; attempts to inject inputs into the system (prompt injection) or to circumvent security or content mechanisms; and attempts to read out, reconstruct or exfiltrate the corpus, underlying models or embeddings.",
        },
        {
          type: "p",
          text: "The AI search serves to find content. Results must always be verified against the official source (see Terms of Use Section 5). Use to build competing databases or to train your own models is not permitted.",
        },
      ],
    },
    {
      id: "s4",
      number: "Section 4",
      title: "No sharing of credentials",
      blocks: [
        {
          type: "p",
          text: "Access is personal. You must not pass on, share or make accessible to third parties your credentials — in particular your university SSO — and must not set up shared accounts.",
        },
        {
          type: "p",
          text: "You must protect your credentials carefully. Please report any suspected unauthorised use of your access without delay to cs@caelex.eu.",
        },
      ],
    },
    {
      id: "s5",
      number: "Section 5",
      title: "No unlawful or disruptive use",
      blocks: [
        {
          type: "p",
          text: "Any unlawful use is prohibited, as is any use that impairs or endangers the Service, its infrastructure, other users or third parties.",
        },
        {
          type: "ul",
          items: [
            "Circumventing or defeating access, authentication, security or rate-limiting measures;",
            "Interfering with the integrity or availability of the Service (e.g. overloading, disruption, introducing malicious code);",
            "Unauthorised access to accounts, data or systems, and penetration testing without express written permission;",
            "Infringing third-party rights, including copyright, trademark and data-protection rights;",
            "Concealing identity in order to evade suspensions or restrictions.",
          ],
        },
      ],
    },
    {
      id: "s6",
      number: "Section 6",
      title: "Rate limiting",
      blocks: [
        {
          type: "p",
          text: "To protect the Service and all users, access is subject to technical rate limits. Requests exceeding these limits may be temporarily throttled or rejected.",
        },
        {
          type: "callout",
          variant: "info",
          text: "The specific limits may change at any time for security and stability reasons. Circumventing or deliberately maxing out the rate limit is prohibited.",
        },
      ],
    },
    {
      id: "s7",
      number: "Section 7",
      title: "Reporting breaches and security issues",
      blocks: [
        {
          type: "p",
          text: "Please report breaches of this Policy and suspected security vulnerabilities to cs@caelex.eu. Please do not exploit any vulnerabilities and do not disclose them before they are fixed.",
        },
        {
          type: "p",
          text: "Caelex reserves the right to take appropriate measures in the event of a breach, including suspending access and — where necessary — informing the licensing university and the competent authorities.",
        },
      ],
    },
  ],
};
