import type { LegalDocument } from "@/lib/legal/types";

export const PRIVACY_EN: LegalDocument = {
  lang: "en",
  title: "Privacy Policy",
  subtitle:
    "Information on the processing of personal data under Art. 13 and 14 GDPR",
  version: "Version 3.0",
  effectiveDate: "18 April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin, Germany",
  preamble: [
    "This Privacy Policy transparently and comprehensively informs you about the processing of personal data when you visit our website and use the Caelex platform.",
    "We follow the principle of data minimisation: we collect only the data necessary to deliver our services or fulfil legal obligations, and we use it solely for the stated purposes.",
    "For customer data that you process through the platform, you are the Controller. Caelex acts as Processor; the Data Processing Agreement applies (/legal/dpa).",
    "The German version at /legal/privacy is the legally binding version. This English version is a convenience translation.",
  ],
  sections: [
    {
      id: "p1",
      number: "Section 1",
      title: "Controller",
      blocks: [
        {
          type: "p",
          text: "Controller under Art. 4(7) GDPR for the processing of personal data on this website and upon use of the Caelex platform is:",
        },
        {
          type: "p",
          text: "Caelex, Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Germany. Email: privacy@caelex.eu.",
        },
        {
          type: "p",
          text: "A data protection officer has not been designated as the statutory conditions (Section 38 BDSG) are not met. For data-protection inquiries please contact privacy@caelex.eu.",
        },
      ],
    },
    {
      id: "p2",
      number: "Section 2",
      title: "Definitions and legal bases",
      blocks: [
        {
          type: "p",
          text: "We process personal data under the GDPR, in particular:",
        },
        {
          type: "ul",
          items: [
            "Art. 6(1)(a) GDPR — consent (e.g. newsletter, non-essential cookies, marketing)",
            "Art. 6(1)(b) GDPR — performance of a contract or pre-contractual steps (platform use, support)",
            "Art. 6(1)(c) GDPR — legal obligations (e.g. tax retention under Section 147 AO)",
            "Art. 6(1)(f) GDPR — legitimate interests (e.g. IT security, fraud prevention, product improvement)",
            "Art. 9(2) GDPR — if special categories are affected (not contemplated in normal operation)",
          ],
        },
      ],
    },
    {
      id: "p3",
      number: "Section 3",
      title: "Collected data and purposes",
      blocks: [
        {
          type: "p",
          text: "Depending on use we process the following data categories:",
        },
        {
          type: "p",
          text: "(1) Server log data on each page view: IP address (anonymised after 30 days), date and time, browser and OS, referrer URL, HTTP status, transferred bytes. Legal basis: Art. 6(1)(f) GDPR (IT security, abuse prevention). Retention: 30 days.",
        },
        {
          type: "p",
          text: "(2) Registration and account: email, name, password (bcrypt-hashed), organisation, language, time zone, plan. Legal basis: Art. 6(1)(b). Retention: duration of contract plus statutory retention (6–10 years under Section 147 AO, Section 257 HGB).",
        },
        {
          type: "p",
          text: "(3) Platform usage data: assessment answers, document uploads, API calls, compliance state, audit logs, Astra conversations, bookmarks. Legal basis: Art. 6(1)(b). Retention: up to 30 days after termination (export window), then deletion subject to statutory obligations.",
        },
        {
          type: "p",
          text: "(4) Payment data: billing address, VAT ID, payment history. Card data is stored exclusively with Stripe, not with Caelex. Legal basis: Art. 6(1)(b), (c). Retention: 10 years.",
        },
        {
          type: "p",
          text: "(5) Communications: support requests, email correspondence, demo inquiries, newsletter. Legal basis: Art. 6(1)(b) or (a). Retention: up to 3 years after closure; newsletter until withdrawal of consent.",
        },
        {
          type: "p",
          text: "(6) Security and abuse data: login events, MFA setup, failed logins, anomaly detection, honey tokens. Legal basis: Art. 6(1)(f). Retention: 12 months.",
        },
        {
          type: "p",
          text: "(7) We do not process special categories of personal data under Art. 9 GDPR.",
        },
      ],
    },
    {
      id: "p4",
      number: "Section 4",
      title: "Cookies and local storage",
      blocks: [
        {
          type: "p",
          text: "We set strictly necessary cookies and local storage entries to operate the platform (session, CSRF, language preference, Atlas bookmarks for guests). Basis: Section 25(2) TTDSG (strictly necessary) — no consent required.",
        },
        {
          type: "p",
          text: "Optional cookies (analytics, convenience) are set only with consent (Section 25(1) TTDSG, Art. 6(1)(a) GDPR). Details on purpose, provider and retention are in the Cookie Policy (/legal/cookies-en). Consent can be withdrawn at any time via the cookie settings.",
        },
      ],
    },
    {
      id: "p5",
      number: "Section 5",
      title: "Recipients and processors",
      blocks: [
        {
          type: "p",
          text: "We transfer personal data only where necessary for contract performance, a legal obligation or your consent. Recipients are in particular the processors listed at /legal/sub-processors:",
        },
        {
          type: "ul",
          items: [
            "Vercel Inc. (hosting / edge network)",
            "Neon Inc. (database, EU region)",
            "Upstash Inc. (rate limiting / cache, EU region)",
            "Stripe Payments Europe Ltd. (payments, Ireland)",
            "Resend Inc. (transactional email)",
            "Sentry / Functional Software Inc. (error monitoring with PII scrubbing)",
            "Anthropic PBC (AI inference for Astra, zero data retention)",
          ],
        },
        {
          type: "p",
          text: "We transfer to tax advisors, auditors and law-enforcement authorities only where legally required. There is no transfer to advertising partners, data brokers or similar third parties.",
        },
      ],
    },
    {
      id: "p6",
      number: "Section 6",
      title: "International data transfers",
      blocks: [
        {
          type: "p",
          text: "(1) Some processors are based in the USA or process data there. Transfers occur exclusively under EU Standard Contractual Clauses (Implementing Decision (EU) 2021/914) and, where applicable, the EU-US Data Privacy Framework (Implementing Decision (EU) 2023/1795).",
        },
        {
          type: "p",
          text: "(2) Supplementary safeguards include transport and at-rest encryption, pseudonymisation, PII scrubbing (Sentry) and zero-data-retention commitments (Anthropic).",
        },
      ],
    },
    {
      id: "p7",
      number: "Section 7",
      title: "AI features (Astra, Generate)",
      blocks: [
        {
          type: "p",
          text: "(1) Our platform contains AI-assisted features. Requests are transmitted via secure connections to Anthropic PBC (USA) and processed there to generate responses.",
        },
        {
          type: "p",
          text: "(2) We have a zero-data-retention agreement with Anthropic: your inputs are not stored after response and are not used to train the models.",
        },
        {
          type: "p",
          text: "(3) Legal basis: Art. 6(1)(b) GDPR (performance of the AI feature). Transfer basis in Section 6.",
        },
        {
          type: "p",
          text: "(4) We comply with the requirements of Regulation (EU) 2024/1689 (AI Act). Astra outputs are labelled as AI-generated (Section 7 of Terms V3.0, Annex E).",
        },
      ],
    },
    {
      id: "p8",
      number: "Section 8",
      title: "Automated decision-making",
      blocks: [
        {
          type: "p",
          text: "We do not make automated individual decisions under Art. 22 GDPR with legal effect on data subjects. Assure scores and ratings are informational only and not automated decisions within the meaning of Art. 22.",
        },
      ],
    },
    {
      id: "p9",
      number: "Section 9",
      title: "Your rights",
      blocks: [
        {
          type: "p",
          text: "You have the following rights as a data subject under the GDPR:",
        },
        {
          type: "ul",
          items: [
            "access to your processed data (Art. 15 GDPR)",
            "rectification of inaccurate data (Art. 16 GDPR)",
            "erasure („right to be forgotten“) (Art. 17 GDPR)",
            "restriction of processing (Art. 18 GDPR)",
            "data portability (Art. 20 GDPR)",
            "objection to processing based on legitimate interests (Art. 21 GDPR)",
            "withdrawal of consent with effect for the future (Art. 7(3) GDPR)",
            "complaint with a supervisory authority (Art. 77 GDPR)",
          ],
        },
        {
          type: "p",
          text: "Please direct requests to privacy@caelex.eu. We generally respond within 30 days (Art. 12(3) GDPR). Competent supervisory authority for Caelex is the Berlin Commissioner for Data Protection and Freedom of Information, Alt-Moabit 59–61, 10555 Berlin.",
        },
      ],
    },
    {
      id: "p10",
      number: "Section 10",
      title: "Retention and erasure",
      blocks: [
        {
          type: "p",
          text: "Concrete retention periods are set out in Section 3. Generally: personal data is deleted as soon as the processing purpose ceases and no legal retention obligations (HGB, AO) remain.",
        },
        {
          type: "p",
          text: "In deletion conflicts we follow Art. 17(3) GDPR in favour of statutory obligations; affected data is then blocked and used only for those obligations.",
        },
      ],
    },
    {
      id: "p11",
      number: "Section 11",
      title: "Security",
      blocks: [
        {
          type: "p",
          text: "We apply appropriate technical and organisational measures under Art. 32 GDPR to protect your data. Measures are detailed in DPA Annex 1 (/legal/dpa-en). Core elements: TLS 1.2+ in transport, AES-256-GCM at rest, MFA, hash-chained audit logs, anomaly detection, segregated environments.",
        },
        {
          type: "p",
          text: "We report personal-data breaches where required under Art. 33 GDPR within 72 hours to the supervisory authority and, where needed, to affected data subjects (Art. 34 GDPR).",
        },
      ],
    },
    {
      id: "p12",
      number: "Section 12",
      title: "Newsletter and marketing",
      blocks: [
        {
          type: "p",
          text: "(1) We send newsletters and marketing emails only with your express consent (double opt-in). Legal basis: Art. 6(1)(a) GDPR, Section 7 UWG.",
        },
        {
          type: "p",
          text: "(2) You can use the unsubscribe link in every message or write to privacy@caelex.eu. Consent is logged (time, IP, confirmed double opt-in).",
        },
      ],
    },
    {
      id: "p13",
      number: "Section 13",
      title: "Social media, external links",
      blocks: [
        {
          type: "p",
          text: "We do not embed social-media plug-ins with automatic data flow on our website. External links to primary sources (EUR-Lex, UNOOSA, etc.) are marked as such and open in a new tab. The respective providers are solely responsible for their processing.",
        },
      ],
    },
    {
      id: "p14",
      number: "Section 14",
      title: "Recruitment data",
      blocks: [
        {
          type: "p",
          text: "Application documents are processed under Section 26 BDSG and Art. 6(1)(b) GDPR. Retention: up to 6 months after end of the procedure; on hiring during the employment and for statutory retention periods.",
        },
      ],
    },
    {
      id: "p15",
      number: "Section 15",
      title: "Changes to this Policy",
      blocks: [
        {
          type: "p",
          text: "We update this Policy when our processing activities or the legal framework change. We communicate material changes by email or in-app notification. The current version is available at caelex.eu/legal/privacy-en.",
        },
      ],
    },
  ],
  annexes: [],
  contactLines: [
    "Caelex",
    "Owner: Julian Polleschner",
    "Am Maselakepark 37",
    "13587 Berlin, Germany",
    "",
    "Data-protection inquiries:",
    "mailto:privacy@caelex.eu",
    "Security incidents:",
    "mailto:security@caelex.eu",
    "Legal:",
    "mailto:legal@caelex.eu",
  ],
  links: [
    { label: "Deutsche Version →", href: "/legal/privacy" },
    { label: "DPA", href: "/legal/dpa-en" },
    { label: "Sub-processors", href: "/legal/sub-processors" },
    { label: "Cookie Policy", href: "/legal/cookies-en" },
    { label: "Terms", href: "/legal/terms-en" },
    { label: "Impressum", href: "/legal/impressum" },
  ],
};
