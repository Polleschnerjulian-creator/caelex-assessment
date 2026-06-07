/**
 * Caelex Scholar — Privacy Notice (EN, convenience translation).
 *
 * Convenience English translation of the binding German Scholar privacy notice
 * (`privacy-de.ts`). If the two differ, the German edition prevails.
 *
 * Content-only file (plain-string blocks, no JSX/HTML). The DRAFT banner and the
 * monochrome / WCAG presentation come from `../_components/LegalDoc.tsx`.
 *
 * DRAFT — to be reviewed by qualified legal counsel before publication. Open
 * items are flagged in-text with “[TBD: confirm with counsel]”.
 */
import type { ScholarLegalDoc } from "../_components/types";

export const PRIVACY_EN: ScholarLegalDoc = {
  lang: "en",
  title: "Privacy Notice",
  subtitle: "Caelex Scholar — the legal-research database for universities",
  version: "Version 0.1 (Draft)",
  lastUpdated: "{{DATE}}",
  preamble: [
    "This Privacy Notice informs you, under Articles 12 to 14 of the General Data Protection Regulation (GDPR), how Caelex processes personal data when you use Caelex Scholar (caelex.eu/scholar) — the free, university-licensed legal-research database for space law.",
    "Caelex Scholar is “powered by Atlas”: semantic search relies on an AI-assisted meaning-based search over the Atlas corpus. It is off by default and runs only with your explicit consent (see Sections 5 and 11).",
    "The binding version is the German edition; this English translation is provided for your convenience only.",
  ],
  sections: [
    // 0 · Plain-language summary
    {
      id: "summary",
      number: "At a glance",
      title: "The essentials, in plain language",
      blocks: [
        {
          type: "callout",
          variant: "info",
          text: "This summary explains the essentials in plain words — including if you are under 18. It does not replace the detailed sections below; if they differ, the detailed text prevails.",
        },
        { type: "subheading", text: "What is Caelex Scholar?" },
        {
          type: "p",
          text: "Caelex Scholar is an online library of space-law texts — treaties, EU law, national statutes and court decisions. Your university has licensed Scholar for you; it is free for you to use. You sign in through your university’s access (single sign-on) or with an account.",
        },
        { type: "subheading", text: "What data do we hold about you?" },
        {
          type: "ul",
          items: [
            "Your account: name and email address (usually from your university via sign-in).",
            "Your settings: e.g. language, preferred jurisdiction, citation format.",
            "What you save: bookmarks and reading lists you create yourself.",
            "Only if you switch it on: your search history (the search terms you enter) and AI meaning-based search.",
            "Technical sign-in logs for security (with a shortened, i.e. incomplete, IP address).",
          ],
        },
        { type: "subheading", text: "We protect your data from the start" },
        {
          type: "p",
          text: "Search history and AI semantic search are OFF by default. You decide whether to switch them on — and you can switch them off again at any time.",
        },
        { type: "subheading", text: "What can you do?" },
        {
          type: "ul",
          items: [
            "In Settings you can download all your Scholar data with one click.",
            "You can delete your account yourself in Settings — this also deletes your searches, bookmarks and reading lists.",
            "We also delete any stored search history automatically after 90 days.",
            "You can write to us any time at privacy@caelex.eu.",
          ],
        },
        { type: "subheading", text: "Does the AI make decisions about me?" },
        {
          type: "p",
          text: "No. The AI only ranks search results by meaning. It makes no decision about you and has no legal effect on you. Always check important results against the official source.",
        },
      ],
    },

    // 1 · Controller + contact
    {
      id: "controller",
      number: "Section 1",
      title: "Controller and data-protection contact",
      blocks: [
        {
          type: "p",
          text: "The controller within the meaning of Art. 4(7) GDPR for the processing described in this notice is:",
        },
        {
          type: "p",
          text: "Caelex — sole proprietorship, owner: Julian Polleschner, Am Maselakepark 37, 13587 Berlin, Germany. Caelex is a small business within the meaning of § 19 of the German VAT Act (Kleinunternehmer). Full provider details are in the Imprint (/legal/impressum).",
        },
        {
          type: "p",
          text: "General contact: cs@caelex.eu. For data-protection matters, contact us at privacy@caelex.eu.",
        },
        { type: "subheading", text: "Data protection officer" },
        {
          type: "p",
          text: "[TBD: confirm with counsel] Whether Caelex must appoint a data protection officer depends on Art. 37 GDPR together with § 38 BDSG (German Federal Data Protection Act), e.g. where a data protection impact assessment is required. Once a DPO is appointed, their contact details will be published here. Until then, please contact privacy@caelex.eu.",
        },
      ],
    },

    // 2 · Roles: university (controller) / Caelex (processor)
    {
      id: "roles",
      number: "Section 2",
      title: "Who is responsible for what? (your university and Caelex)",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar is provided to your university as a service (B2B2C). From a data-protection perspective there are therefore two roles, applying to different processing activities:",
        },
        {
          type: "subheading",
          text: "Your university as controller; Caelex as processor",
        },
        {
          type: "p",
          text: "Where Caelex operates Scholar on behalf of and on the instructions of your university — in particular providing the licensed service to its students and staff — your university is the controller and Caelex is a processor (Art. 28 GDPR). The basis is a data processing agreement (DPA) between your university and Caelex. In this relationship your university is primarily responsible for the lawfulness of the processing and for fulfilling your data-subject rights; Caelex supports it.",
        },
        { type: "subheading", text: "Caelex as a controller in its own right" },
        {
          type: "p",
          text: "For certain processing, Caelex itself determines the purposes and means and is therefore a controller in its own right. This includes in particular: secure operation, abuse/attack prevention and security logging; maintenance, debugging and product development; and the design of the AI-assisted semantic search. This Privacy Notice applies directly to that processing.",
        },
        {
          type: "callout",
          variant: "info",
          text: "You can always address your data-subject rights to Caelex (privacy@caelex.eu) — even where your university is the controller in a given case. We will then forward your request to the competent body without undue delay or support your university in responding.",
        },
      ],
    },

    // 3 · Categories of data
    {
      id: "categories",
      number: "Section 3",
      title: "What data we process",
      blocks: [
        {
          type: "p",
          text: "We process only the data necessary for the research database:",
        },
        {
          type: "definition",
          term: "Account and identity data:",
          text: "name and email address. These usually come from sign-in via your university (single sign-on) or, where set up for your university, from an account created with credentials.",
        },
        {
          type: "definition",
          term: "Settings (ScholarUserPreferences):",
          text: "interface language, source language, default jurisdiction, citation format, results per page, and the toggle states for semantic search and search history.",
        },
        {
          type: "definition",
          term: "Search history (ScholarSearchHistory) — only if enabled:",
          text: "search term, selected jurisdiction and timestamp. Stored only if you explicitly switch search history on (default: off).",
        },
        {
          type: "definition",
          term: "Bookmarks (ScholarBookmark):",
          text: "references to sources or decisions you save (item type and id, timestamp).",
        },
        {
          type: "definition",
          term: "Reading lists (ScholarReadingList and items):",
          text: "named lists you create, with a name, optional description and their entries (item type/id, optional note, order).",
        },
        {
          type: "definition",
          term: "Sign-in and security logs (LoginEvent):",
          text: "timestamps of sign-in events, a shortened (masked) IP address and information about the browser/device used (user agent), to detect and prevent abuse.",
        },
        {
          type: "callout",
          variant: "info",
          text: "In Scholar we generally do not process special categories of personal data (Art. 9 GDPR). Please do not enter sensitive personal data into search queries, notes or list names.",
        },
      ],
    },

    // 4 · Purposes + legal bases
    {
      id: "purposes",
      number: "Section 4",
      title: "Purposes of processing and legal bases",
      blocks: [
        {
          type: "p",
          text: "For each processing activity we state the purpose and the legal basis under Art. 6(1) GDPR:",
        },
        {
          type: "definition",
          term: "Providing the account and access to the database.",
          text: "Purpose: to authenticate you and provide the licensed research database. Legal basis: performance of the (university-mediated) usage relationship or pre-contractual steps, Art. 6(1)(b) GDPR; vis-à-vis the university, on the basis of the Art. 28 GDPR DPA.",
        },
        {
          type: "definition",
          term: "Bookmarks and reading lists.",
          text: "Purpose: to let you save and organise sources for your studies or teaching. Legal basis: performance of the usage relationship, Art. 6(1)(b) GDPR. These features are visible only to you (private by default).",
        },
        {
          type: "definition",
          term: "Storing and displaying your settings.",
          text: "Purpose: to present the service according to your preferences. Legal basis: performance of the usage relationship, Art. 6(1)(b) GDPR.",
        },
        {
          type: "definition",
          term: "Search history (only if enabled).",
          text: "Purpose: to show you your past searches. Legal basis: your consent, Art. 6(1)(a) GDPR. Off by default; withdrawable at any time in Settings (with effect for the future).",
        },
        {
          type: "definition",
          term: "Semantic search (AI meaning-based search, only if enabled).",
          text: "Purpose: to find and rank results by meaning rather than keywords alone. Legal basis: your consent, Art. 6(1)(a) GDPR. Off by default; withdrawable at any time. See Section 11.",
        },
        {
          type: "definition",
          term: "Security, abuse prevention and logging.",
          text: "Purpose: to detect and prevent unauthorised access, brute-force attacks and abusive use, and to safeguard the integrity of the service (incl. sign-in logs with masked IP, rate limiting, a security audit log). Legal basis: legitimate interests, Art. 6(1)(f) GDPR (see balancing below).",
        },
        {
          type: "definition",
          term: "Compliance with legal obligations.",
          text: "Purpose: to meet statutory obligations, e.g. responding to data-subject requests and retention/record-keeping duties. Legal basis: legal obligation, Art. 6(1)(c) GDPR.",
        },
        {
          type: "subheading",
          text: "Legitimate-interests balancing (short LIA)",
        },
        {
          type: "p",
          text: "For security logging we rely on Art. 6(1)(f) GDPR. Our legitimate interest is protecting the service and its users from attacks and abuse. The processing is necessary for this, designed to be data-minimising (in particular masked IP addresses and short retention) and foreseeable for you as a signed-in user. As no overriding interests or fundamental rights are apparent, the protective interest prevails. You nonetheless have a right to object under Art. 21 GDPR (see Section 9). [TBD: confirm with counsel — document the full LIA.]",
        },
      ],
    },

    // 5 · Privacy by default
    {
      id: "defaults",
      number: "Section 5",
      title: "Privacy-friendly defaults (privacy by default)",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar is designed on the principle of data protection by default (Art. 25(2) GDPR). The two most data-intensive features are off unless you choose otherwise:",
        },
        {
          type: "ul",
          items: [
            "Search history is OFF by default — your searches are not stored unless you enable it.",
            "Semantic search (AI) is OFF by default — no AI meaning-based search takes place until you enable it.",
            "Bookmarks and reading lists are private — visible only to you.",
          ],
        },
        {
          type: "p",
          text: "You can switch these features on and off at any time in Settings. At each toggle you receive a short note explaining what enabling it means.",
        },
      ],
    },

    // 6 · Recipients / processors
    {
      id: "recipients",
      number: "Section 6",
      title: "Recipients and processors",
      blocks: [
        {
          type: "p",
          text: "Within Caelex, only those people who need it to provide and secure the service have access to your data. In addition, we use carefully selected service providers as processors under Art. 28 GDPR, e.g. for hosting/CDN (Vercel), database (Neon, eu-central-1 Frankfurt), embeddings for semantic search (OpenAI), email delivery (Resend), sign-in via Google (OAuth), rate limiting (Upstash), error monitoring (Sentry) and event logging (LogSnag).",
        },
        {
          type: "p",
          text: "The current, complete list of our sub-processors with purpose, location and transfer basis is available on our Sub-processors overview (/scholar/legal/sub-processors).",
        },
        {
          type: "p",
          text: "Disclosures to your university take place within the respective allocation of roles (Section 2). Disclosures to public authorities occur only where we are legally required to do so. We do not sell your personal data.",
        },
      ],
    },

    // 7 · International transfers
    {
      id: "transfers",
      number: "Section 7",
      title: "Transfers to third countries",
      blocks: [
        {
          type: "p",
          text: "We operate Scholar so that personal data is processed primarily within the European Union. In particular, the database is stored in the EU region eu-central-1 (Frankfurt) at Neon.",
        },
        {
          type: "p",
          text: "Some service providers have parent companies in the United States (e.g. Vercel) or process to a limited extent outside the EU. For semantic search, if you have enabled this feature, search queries are transmitted to OpenAI (USA) to generate vector embeddings.",
        },
        {
          type: "p",
          text: "Where a transfer to a third country takes place without an adequacy decision, we rely on appropriate safeguards under Art. 46 GDPR — in particular the European Commission’s standard contractual clauses — or, where applicable, on certification under the EU-US Data Privacy Framework, in each case supplemented by additional protective measures (e.g. encryption in transit and at rest, data minimisation, masked IP addresses).",
        },
        {
          type: "callout",
          variant: "warn",
          text: "[TBD: confirm with counsel] The specific transfer basis per provider (adequacy decision/DPF, standard contractual clauses), the executed data-processing/transfer agreements and the outcome of the transfer impact assessment (TIA) must be confirmed before publication. A copy of the safeguards may be requested at privacy@caelex.eu.",
        },
      ],
    },

    // 8 · Retention
    {
      id: "retention",
      number: "Section 8",
      title: "Retention periods",
      blocks: [
        {
          type: "p",
          text: "We store personal data only for as long as necessary for the respective purposes:",
        },
        {
          type: "definition",
          term: "Account, settings, bookmarks and reading lists:",
          text: "until you delete your account or your university’s licence ends and access is terminated. On account deletion, this data is deleted (see Section 9).",
        },
        {
          type: "definition",
          term: "Search history:",
          text: "if enabled, automatically deleted after 90 days; and on account deletion. You can delete the history yourself or disable the feature at any time.",
        },
        {
          type: "definition",
          term: "Sign-in and security logs:",
          text: "stored for as long as necessary for security defence, then deleted or anonymised. [TBD: set the specific retention period with counsel and enter it here.]",
        },
        {
          type: "definition",
          term: "Consent records:",
          text: "stored for as long as needed to demonstrate the respective consent and to meet statutory record-keeping duties.",
        },
      ],
    },

    // 9 · Rights + how to exercise
    {
      id: "rights",
      number: "Section 9",
      title: "Your rights and how to exercise them",
      blocks: [
        { type: "p", text: "Under the GDPR you have the following rights:" },
        {
          type: "ul",
          items: [
            "Access (Art. 15): whether and which data we process about you.",
            "Rectification (Art. 16): correction of inaccurate data; you can edit settings and profile yourself.",
            "Erasure (Art. 17): deletion of your data, unless a retention obligation applies.",
            "Restriction of processing (Art. 18).",
            "Data portability (Art. 20): receipt of your data in a structured, commonly used, machine-readable format.",
            "Objection (Art. 21): to processing based on legitimate interests (Section 4).",
            "Withdrawal of consent given (Art. 7(3)): with effect for the future, without affecting the lawfulness of processing carried out beforehand.",
          ],
        },
        { type: "subheading", text: "Self-service in Settings" },
        {
          type: "p",
          text: "You can exercise many rights directly in the service — in Scholar Settings (/scholar/settings):",
        },
        {
          type: "ul",
          items: [
            "Data export: with one click you receive a file containing your account data, settings, search history and your bookmarks and reading lists.",
            "Account deletion: you delete your account yourself; this also deletes search history, bookmarks and reading lists and their items.",
            "Search history and semantic search: switch on/off at any time; you can delete the history.",
          ],
        },
        {
          type: "p",
          text: "You can also reach us for any matter at privacy@caelex.eu. We respond to requests in principle within one month (Art. 12(3) GDPR). Where your university is the controller for a processing activity (Section 2), we forward your request or support its response.",
        },
        {
          type: "subheading",
          text: "Right to lodge a complaint with a supervisory authority (Art. 13(2)(d), 77)",
        },
        {
          type: "p",
          text: "You have the right to lodge a complaint with a data-protection supervisory authority. The authority competent for Caelex is the Berlin Commissioner for Data Protection and Freedom of Information (Berliner Beauftragte für Datenschutz und Informationsfreiheit, BlnBDI), Alt-Moabit 59–61, 10555 Berlin. You may also contact the authority of your habitual residence or place of work.",
        },
      ],
    },

    // 10 · Obligation to provide / source
    {
      id: "provision",
      number: "Section 10",
      title: "Obligation to provide data and source of the data",
      blocks: [
        {
          type: "p",
          text: "Providing your account and identity data is necessary to use Scholar: without authentication we cannot grant you access. There is no statutory or contractual obligation to create an account; using Scholar is voluntary.",
        },
        {
          type: "p",
          text: "Where account and identity data are not collected directly from you but via your university’s sign-in (single sign-on) or via Google (OAuth), they originate from those sources (Art. 14 GDPR).",
        },
      ],
    },

    // 11 · AI / semantic search + no ADM
    {
      id: "ai",
      number: "Section 11",
      title:
        "Artificial intelligence: semantic search and no automated decision-making",
      blocks: [
        {
          type: "p",
          text: "If you enable semantic search, Caelex Scholar uses an AI system to find content in the corpus by meaning and to rank search results (“powered by Atlas”). Technically, this uses vector embeddings (see Section 7 on transfers).",
        },
        {
          type: "p",
          text: "For transparency, and pursuant to Art. 50 of the AI Act (Regulation (EU) 2024/1689), we inform you that you are interacting with an AI-assisted search system. The results are a research aid; always check important results against the official source. Caelex Scholar does not provide legal advice.",
        },
        {
          type: "callout",
          variant: "warn",
          text: "No automated decision in individual cases: there is no solely automated decision-making, including profiling, within the meaning of Art. 22 GDPR that produces legal effects concerning you or similarly significantly affects you. Semantic search merely ranks content; it makes no decision about you.",
        },
      ],
    },

    // 12 · Minors
    {
      id: "minors",
      number: "Section 12",
      title: "Information for minors",
      blocks: [
        {
          type: "p",
          text: "Caelex Scholar is aimed at university students and staff. Individual users may be minors. In Germany, consent to information-society services under Art. 8 GDPR is valid from the age of 16; for younger persons, the consent of a holder of parental responsibility is required.",
        },
        {
          type: "p",
          text: "We design Scholar so that its core functions do not rely on consent (but on the usage relationship or legitimate interests, Section 4) and the consent-based features (search history, semantic search) are off by default. We do not specifically collect a date of birth for age verification, and we process no more data than necessary.",
        },
        {
          type: "p",
          text: "[TBD: confirm with counsel] Responsibility for compliance with Art. 8 GDPR (age and, where relevant, parental consent) is allocated to the licensing university in the DPA; the university mediates access for its members.",
        },
      ],
    },

    // 13 · Cookies pointer
    {
      id: "cookies",
      number: "Section 13",
      title: "Cookies and access to your device",
      blocks: [
        {
          type: "p",
          text: "To operate Scholar we use strictly necessary cookies or comparable technologies (e.g. for sign-in and protection against cross-site request forgery). Non-essential access to your device requires your consent under § 25 TDDDG. Details are in the Cookie Notice (/scholar/legal/cookies).",
        },
      ],
    },

    // 14 · Security TOMs
    {
      id: "security",
      number: "Section 14",
      title: "Data security (technical and organisational measures)",
      blocks: [
        {
          type: "p",
          text: "We take appropriate technical and organisational measures under Art. 32 GDPR to protect your data, including:",
        },
        {
          type: "ul",
          items: [
            "Encryption of sensitive fields (AES-256-GCM) and encryption in transit (TLS).",
            "Password hashing with bcrypt, plus multi-factor authentication and hardware security keys (WebAuthn/FIDO2).",
            "Masking of IP addresses in security logs, plus brute-force protection and rate limiting.",
            "Tamper-evident audit log (hash chaining) and strict security headers (incl. CSP, HSTS).",
            "Strict confidentiality of credentials/keys (server-side only) and need-to-know access.",
          ],
        },
      ],
    },

    // 15 · Changes
    {
      id: "changes",
      number: "Section 15",
      title: "Changes to this Privacy Notice",
      blocks: [
        {
          type: "p",
          text: "We will update this Privacy Notice when the service, our processing or the legal situation changes. The version published here applies; you will find the date and version above.",
        },
      ],
    },
  ],
};
