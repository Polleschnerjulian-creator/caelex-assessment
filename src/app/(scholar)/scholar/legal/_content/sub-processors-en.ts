/**
 * Caelex Scholar — Sub-processors register (EN, convenience translation).
 *
 * Convenience translation of SUB_PROCESSORS_DE. The German edition is binding.
 * Keep both in sync. Scoped to the services Caelex Scholar actually uses; facts
 * verified against the platform register (src/app/legal/sub-processors/_content/
 * sub-processors-data.ts).
 */
import type { ScholarLegalDoc } from "../_components/types";

export const SUB_PROCESSORS_EN: ScholarLegalDoc = {
  lang: "en",
  title: "Sub-processors",
  subtitle: "Caelex Scholar — register of service providers used",
  version: "1.0",
  lastUpdated: "7 June 2026",
  preamble: [
    "This register lists the service providers (sub-processors) Caelex uses to provide Caelex Scholar, together with their role, location and — where processing takes place outside the EU/EEA — the applicable transfer mechanism.",
    "It concerns Caelex Scholar (caelex.eu/scholar) only. Other Caelex products may use additional service providers not listed here.",
  ],
  sections: [
    {
      id: "s1",
      number: "Section 1",
      title: "Controller and roles",
      blocks: [
        {
          type: "p",
          text: "The controller within the meaning of the GDPR is Caelex — sole proprietorship, owner: Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Germany (small business under Section 19 UStG). Contact: cs@caelex.eu, data protection: privacy@caelex.eu.",
        },
        {
          type: "p",
          text: "Caelex Scholar is provided under a provider-to-university-to-students (B2B2C) model. Where Caelex processes personal data on behalf of the licensing university, the university is the controller and Caelex is the processor (Article 28 GDPR); in that case the providers below are sub-processors. For its own purposes (product operation, security, AI-assisted research) Caelex acts as its own controller.",
        },
      ],
    },
    {
      id: "s2",
      number: "Section 2",
      title: "Sub-processors in use",
      blocks: [
        {
          type: "p",
          text: "For each provider the list states: name and legal entity, role/category, processing location, transfer mechanism where a third country is involved, and the type of data processed.",
        },

        { type: "subheading", text: "1. Vercel Inc. — Hosting & edge network" },
        {
          type: "ul",
          items: [
            "Legal entity: Vercel Inc., 340 S Lemon Ave #4133, Walnut, CA 91789, USA.",
            "Role: serving the application via the edge network; build/deploy orchestration; serverless functions.",
            "Location: USA with edge regions worldwide; for dynamic requests Caelex primarily uses EU regions (fra1 Frankfurt, cdg1 Paris).",
            "Transfer mechanism: EU Standard Contractual Clauses (Module 3); EU-US Data Privacy Framework (Vercel certified).",
            "Data: data required to serve the application (application code, request metadata, IP addresses); transient data during processing.",
          ],
        },

        {
          type: "subheading",
          text: "2. Neon Inc. — managed PostgreSQL database",
        },
        {
          type: "ul",
          items: [
            "Legal entity: Neon Inc., 2261 Market St #4474, San Francisco, CA 94114, USA.",
            "Role: operating the production database, including backups and point-in-time recovery.",
            "Location: EU region eu-central-1 (Frankfurt, Germany).",
            "Transfer mechanism: processing within the EU; any administrative access from the USA covered by EU Standard Contractual Clauses (Module 3).",
            "Data: all persisted Scholar data — account (name, email), preferences, search history (if enabled), bookmarks and reading lists, login events (masked IP).",
          ],
        },

        {
          type: "subheading",
          text: "3. OpenAI, L.L.C. — AI embeddings (semantic search)",
        },
        {
          type: "ul",
          items: [
            "Legal entity: OpenAI, L.L.C., 3180 18th Street, San Francisco, CA 94110, USA — routed via the Vercel AI Gateway.",
            "Role: generating vector embeddings for semantic search over the Scholar corpus. There is no direct contractual relationship between OpenAI and Caelex; OpenAI acts as a sub-sub-processor under Vercel.",
            "Location: USA.",
            "Transfer mechanism: EU-US Data Privacy Framework (certified); Standard Contractual Clauses; zero-data-retention for API calls; routing via the Vercel AI Gateway.",
            "Data: short query text (search query). No plaintext retention beyond the API call duration. Semantic search is off by default (opt-in).",
          ],
        },

        { type: "subheading", text: "4. Resend Inc. — transactional email" },
        {
          type: "ul",
          items: [
            "Legal entity: Resend Inc., 2261 Market Street #5039, San Francisco, CA 94114, USA.",
            "Role: sending transactional email (e.g. login/security notifications, support communication).",
            "Location: USA with EU edge regions.",
            "Transfer mechanism: EU Standard Contractual Clauses (Module 3); EU data residency where enabled.",
            "Data: recipient email address; subject and content only during delivery.",
          ],
        },

        {
          type: "subheading",
          text: "5. Upstash Inc. — rate limiting & caching",
        },
        {
          type: "ul",
          items: [
            "Legal entity: Upstash Inc., 900 Mission St #203, San Francisco, CA 94103, USA.",
            "Role: rate limiting (abuse and overload protection); short-lived caching.",
            "Location: EU region eu-west-1 (Dublin, Ireland).",
            "Transfer mechanism: processing within the EU; EU-US DPF for US support access; Standard Contractual Clauses Module 3.",
            "Data: IP addresses and user IDs for rate-limit purposes (short TTL); short-lived session/MFA counters.",
          ],
        },

        {
          type: "subheading",
          text: "6. Sentry (Functional Software Inc.) — error monitoring",
        },
        {
          type: "ul",
          items: [
            "Legal entity: Functional Software Inc. (dba Sentry), 45 Fremont Street, 8th Floor, San Francisco, CA 94105, USA.",
            "Role: capturing runtime errors for product stability and security observability. No cookies are set on your device.",
            "Location: EU region (Frankfurt) with USA fallback.",
            "Transfer mechanism: processing primarily in the EU; EU Standard Contractual Clauses (Module 3) for the USA fallback.",
            "Data: stack traces, browser/OS information, request metadata, anonymised user IDs. PII scrubbing enabled before transmission.",
          ],
        },

        {
          type: "subheading",
          text: "7. LogSnag — event monitoring (server-side)",
        },
        {
          type: "ul",
          items: [
            "Legal entity: LogSnag (operated by Shayan Taslim, registered in Canada).",
            "Role: server-side tracking of significant operational events for operator alerting. No profiling, no advertising analysis, no device fingerprinting.",
            "Location: Canada.",
            "Transfer mechanism: third country with an EU adequacy decision (Canada — Decision 2002/2/EC); supplemented by Standard Contractual Clauses in the provider contract.",
            "Data: event type, channel, short description, Caelex-internal IDs, timestamp. No email addresses, no plaintext PII.",
          ],
        },

        {
          type: "subheading",
          text: "8. Google Ireland Ltd. — sign-in (OAuth SSO)",
        },
        {
          type: "ul",
          items: [
            "Legal entity: Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Ireland (for EEA users); parent company Google LLC, USA.",
            "Role: identity provider for the optional 'Continue with Google' sign-in or university SSO where provided through Google. Google acts as an independent controller for the authentication data in that respect.",
            "Location: EU/EEA, with possible processing in the USA by the parent company.",
            "Transfer mechanism: EU-US Data Privacy Framework (Google certified); EU Standard Contractual Clauses.",
            "Data: account data transmitted for authentication (e.g. email address, name, verified-email status). Caelex receives only the details required to create the account.",
          ],
        },
      ],
    },
    {
      id: "s3",
      number: "Section 3",
      title: "Platform services not used by Scholar",
      blocks: [
        {
          type: "p",
          text: "The following providers used by other Caelex products are not used by the current feature set of Caelex Scholar:",
        },
        {
          type: "ul",
          items: [
            "Anthropic PBC (AI inference 'Claude') — Caelex Scholar uses embeddings (OpenAI) for semantic search, not generative language-model output; Scholar is 'powered by Atlas' in the sense of the underlying research technique.",
            "Stripe (payments) — Caelex Scholar is free for users; no payment processing takes place.",
            "Cloudflare R2 (object storage) — Caelex Scholar does not provide for user file uploads.",
            "Vercel Web Analytics / Speed Insights — not loaded in the Scholar area.",
          ],
        },
      ],
    },
    {
      id: "s4",
      number: "Section 4",
      title: "International transfers",
      blocks: [
        {
          type: "p",
          text: "Scholar data is stored in production within the EU (Neon, Frankfurt). Where providers based or processing outside the EU/EEA are used, Caelex relies on an adequacy decision (e.g. Canada), the EU-US Data Privacy Framework, and/or EU Standard Contractual Clauses together with supplementary measures (e.g. encryption, data minimisation, zero-data-retention).",
        },
        {
          type: "callout",
          variant: "info",
          text: "The precise suitability of the transfer mechanisms for each processing operation (transfer impact assessment, Schrems II) must be documented separately.",
        },
      ],
    },
    {
      id: "s5",
      number: "Section 5",
      title: "Notification of changes",
      blocks: [
        {
          type: "p",
          text: "Caelex keeps this register up to date. A planned addition or replacement of a sub-processor is notified to the licensing university with reasonable advance notice (generally at least 30 days), so that any contractual right to object can be exercised. The current version is available at caelex.eu/scholar/legal/sub-processors.",
        },
        {
          type: "p",
          text: "The specific arrangements for notification and objection follow from the data processing agreement (DPA) with the respective university.",
        },
      ],
    },
    {
      id: "s6",
      number: "Section 6",
      title: "Contact",
      blocks: [
        {
          type: "p",
          text: "Please direct questions about this register or about processing on behalf of a controller to privacy@caelex.eu.",
        },
      ],
    },
  ],
};
