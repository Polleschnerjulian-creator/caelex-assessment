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
          text: "(3) Platform usage data. We process several categories with different retention periods, all enforced technically by our daily retention job (`/api/cron/data-retention-cleanup`):",
        },
        {
          type: "ul",
          items: [
            "Compliance content (assessments, documents, workflows, bookmarks): up to 30 days after termination (export window), then deletion; where a statutory retention obligation applies, the data is restricted instead of deleted (Art. 17(3) GDPR).",
            "Astra conversations and messages: rolling 6-month window, deleted automatically by the daily retention job.",
            "Analytics events (usage telemetry): 90 days; user-agent strings are anonymised after 30 days.",
            "Sessions and verification tokens: deleted on expiry.",
            "Audit trail (tamper-evident, hash-chained — mandatory compliance evidence): pseudonymised on account deletion (`userId` removed, hash chain remains intact); retained for up to 7 years as evidence vis-à-vis supervisory and tax authorities, then deleted. Legal basis: Art. 6(1)(f) GDPR (compliance evidence) in conjunction with Art. 5(1)(e) GDPR. Cross-tenant administrative-access entries fall under the same retention; see Section 5(2).",
            "Sentinel telemetry: cross-verifications 6 months, sentinel packets 12 months.",
          ],
        },
        {
          type: "p",
          text: "Legal basis for (3): Art. 6(1)(b) GDPR, supplemented by Art. 6(1)(f) GDPR for the audit trail.",
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
          text: "(6) Security and abuse data. We separate short-lived brute-force detection data from longer-retained forensic data:",
        },
        {
          type: "ul",
          items: [
            "Login attempts (LoginAttempt): 90 days. The brute-force detector only consults the last 15-minute slice; the longer period covers DSAR responses.",
            "Login events (LoginEvent, including device and location info): 12 months, visible to you under security settings.",
            "Security events (SecurityEvent, SecurityAuditLog) at risk-level LOW or MEDIUM: 12 months from resolution. HIGH or CRITICAL events are retained for forensic investigation until the root cause is fully documented, at the latest until the end of statutory limitation periods.",
            "Honey-token triggers and anomaly-detection results: indefinite, as these may serve as evidence of security incidents (Art. 6(1)(f) GDPR in conjunction with Art. 32 GDPR).",
            "MFA configuration and WebAuthn credentials: until account deletion.",
          ],
        },
        {
          type: "p",
          text: "Legal basis for (6): Art. 6(1)(f) GDPR (IT security, abuse prevention) in conjunction with Art. 32 GDPR.",
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
            "OpenAI L.L.C. (embedding models for the Atlas Library full-text search, zero data retention)",
          ],
        },
        {
          type: "p",
          text: "We transfer to tax advisors, auditors and law-enforcement authorities only where legally required. There is no transfer to advertising partners, data brokers or similar third parties.",
        },
        {
          type: "p",
          text: "(2) Restricted administrative access by platform owners. A narrowly limited number of internal Caelex accounts (platform owners — currently four accounts; the authoritative allowlist lives at src/lib/super-admin.ts in the repository) hold cross-tenant administrative read access. This access is used solely (a) to debug specific customer support requests, (b) to recover from misconfiguration, and (c) to satisfy statutory cooperation obligations. Every cross-tenant scope-resolution is recorded in the tamper-evident audit chain (`super_admin_cross_tenant_access`) and is available to the controller upon written request pursuant to Art. 28(3)(h) GDPR.",
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
          text: "(1) Some processors are based in the USA or process data there. Transfers occur exclusively under EU Standard Contractual Clauses (Implementing Decision (EU) 2021/914) and, where applicable, the EU-US Data Privacy Framework (Implementing Decision (EU) 2023/1795). The applicable transfer mechanism per processor is listed individually at /legal/sub-processors.",
        },
        {
          type: "p",
          text: "(2) Where possible we select EU regions over US regions. Specifically: for AI inference, Anthropic Claude is preferentially routed via the Vercel AI Gateway to AWS Bedrock in the EU (Frankfurt / Ireland) — this path involves NO third-country transfer. Only on fallback (Bedrock unavailable or Gateway not configured) does the direct Anthropic-USA path apply, under DPF + SCC. Details: Section 7(1).",
        },
        {
          type: "p",
          text: "(3) Supplementary safeguards include transport and at-rest encryption, pseudonymisation, PII scrubbing (Sentry) and zero-data-retention commitments (Anthropic, OpenAI).",
        },
      ],
    },
    {
      id: "p7",
      number: "Section 7",
      title: "AI features (Astra, Atlas, Generate)",
      blocks: [
        {
          type: "p",
          text: "(1) Our platform contains AI-assisted features. Requests are transmitted via secure connections to Anthropic PBC for conversational responses (Astra compliance copilot, Atlas legal-counsel mode, Generate 2.0) and to OpenAI L.L.C. only for embeddings powering the Atlas Library search.",
        },
        {
          type: "p",
          text: "Routing for Anthropic (preferred path EU): requests are preferentially routed via the Vercel AI Gateway to Anthropic on AWS Bedrock in the EU (Frankfurt / Ireland) — no third-country transfer takes place on this path. Only if the Gateway is not configured or the EU Bedrock region is unavailable do we fall back to the direct Anthropic API (USA). Which path is active is determined by the configuration in `src/lib/atlas/anthropic-client.ts` and is verifiable via the Vercel project-settings dashboard.",
        },
        {
          type: "p",
          text: "Routing for OpenAI: embedding calls run exclusively via the Vercel AI Gateway. OpenAI acts as a sub-sub-processor under Vercel; there is no direct contractual relationship between Caelex and OpenAI.",
        },
        {
          type: "p",
          text: "(2) We have zero-data-retention agreements with Anthropic and OpenAI: your inputs are not stored after response or embedding computation and are not used to train the models.",
        },
        {
          type: "p",
          text: "(3) Legal basis: Art. 6(1)(b) GDPR (performance of the AI feature). Transfer basis in Section 6.",
        },
        {
          type: "p",
          text: "(4) We comply with the requirements of Regulation (EU) 2024/1689 (AI Act). Astra and Atlas outputs are labelled as AI-generated (Section 7 of Terms V3.0, Annex E).",
        },
        {
          type: "p",
          text: "(5) Persistence behaviour in Atlas (legal-/compliance-counsel mode). Atlas conversations are NOT persisted server-side in the database. During a chat turn, your input and the generated answer exist only (a) in the memory of the serverless function invocation handling the SSE connection and (b) in your device's browser memory. If you cancel a response or the connection breaks with an error, the following applies:",
        },
        {
          type: "ul",
          items: [
            "On the Caelex side: NO conversation or message record is created. The incomplete response remains, if at all, only in your device's browser cache and is removed on the next page reload.",
            "On the Anthropic side: due to the zero-data-retention commitment, neither input nor (partial) output is persisted.",
            "Audit trail: we log only metadata (invocation, tool usage, compliance flags such as injected disclaimer banners or unverified citations). The conversation contents are not written to the audit log.",
            "Manual persistence: storage occurs only when you actively trigger an action (saving to the Atlas Library as `AtlasResearchEntry`, pinning to a workspace as `AtlasWorkspaceCard`, setting a bookmark, or creating an annotation). These saved contents are processed in accordance with Section 3(3) and remain subject to your right to erasure (Art. 17 GDPR).",
          ],
        },
        {
          type: "p",
          text: "(6) Persistence behaviour in Astra (compliance copilot, dashboard side). Astra conversations are stored in the `AstraConversation` and `AstraMessage` models so the conversation can continue across sessions. Retention period: 6 months from last activity (see Section 3(3)).",
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
