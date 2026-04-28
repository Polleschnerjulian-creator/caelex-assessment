import type { LegalDocument } from "@/lib/legal/types";

export const DPA_EN: LegalDocument = {
  lang: "en",
  title: "Data Processing Agreement",
  subtitle:
    "Agreement under Art. 28 GDPR between the customer (Controller) and Caelex (Processor)",
  version: "Version 1.0",
  effectiveDate: "18 April 2026",
  legalEntity: "Caelex, Julian Polleschner, Berlin, Germany",
  preamble: [
    "This Data Processing Agreement (the „DPA“) specifies the rights and obligations of the Controller (the „Customer“) and the Processor („Caelex“ or the „Provider“) when processing personal data in connection with the use of the Caelex platform.",
    "The DPA is an integral part of the main contract (Terms V3.0, Section 20). In case of conflict between this DPA and the main contract, the DPA prevails for the matters it governs.",
    "Governing law is Regulation (EU) 2016/679 („GDPR“) together with the German Federal Data Protection Act („BDSG“) as in force from time to time.",
    "The German version at /legal/dpa is the legally binding version. This English translation is provided for convenience; in case of discrepancy the German version prevails.",
  ],
  sections: [
    {
      id: "d1",
      number: "Section 1",
      title: "Subject matter, scope and duration",
      blocks: [
        {
          type: "p",
          text: "(1) Subject of this DPA is the processing of personal data by Caelex on behalf of and under instructions from the Customer in the course of providing the Caelex platform and all contractually agreed products (Atlas, Assure, Academy, API/Widget, Astra, Mission Control, Ephemeris, NCA Portal, Digital Twin, Sentinel, Verity, Generate, Dashboard, Assessments).",
        },
        {
          type: "p",
          text: "(2) The term corresponds to the term of the main contract. Rights and obligations under this DPA which by nature are intended to survive (deletion, confidentiality, liability, records) continue beyond termination.",
        },
        {
          type: "p",
          text: "(3) Primary place of processing is the European Union and the European Economic Area. Third-country processing occurs only under Section 18.",
        },
      ],
    },
    {
      id: "d2",
      number: "Section 2",
      title: "Definitions",
      blocks: [
        {
          type: "p",
          text: "Definitions in Art. 4 GDPR apply. In addition:",
        },
        {
          type: "definition",
          term: "Controller",
          text: "the Customer under Art. 4(7) GDPR. The Customer determines purposes and means of processing.",
        },
        {
          type: "definition",
          term: "Processor",
          text: "Caelex under Art. 4(8) GDPR. Caelex processes personal data on behalf of the Customer.",
        },
        {
          type: "definition",
          term: "Sub-processor",
          text: "a third party engaged by Caelex that processes personal data in the course of service provision (Art. 28(4) GDPR). The current list is Annex 2 and is published at caelex.eu/legal/sub-processors.",
        },
        {
          type: "definition",
          term: "TOMs",
          text: "technical and organisational measures under Art. 32 GDPR, documented in Annex 1 of this DPA.",
        },
        {
          type: "definition",
          term: "Personal Data Breach",
          text: "a breach of protection of personal data within the meaning of Art. 4(12) GDPR.",
        },
      ],
    },
    {
      id: "d3",
      number: "Section 3",
      title: "Nature and purpose of processing",
      blocks: [
        { type: "p", text: "(1) Nature of processing:" },
        {
          type: "ul",
          items: [
            "collection, recording, organisation, structuring, storage, adaptation, alteration",
            "retrieval, consultation, use by automated analysis",
            "disclosure by transmission, dissemination or otherwise making available",
            "alignment, combination, restriction, erasure, destruction",
            "AI-assisted analysis to support the Customer (Astra, Generate, document automation)",
          ],
        },
        { type: "p", text: "(2) Purposes of processing:" },
        {
          type: "ul",
          items: [
            "providing the contracted products and services",
            "account and user management, roles and permissions",
            "running compliance assessments and generating compliance documents",
            "managing documents, filings and audit trails of the Customer",
            "AI-assisted responses (Astra) based on inputs of the Customer",
            "enabling collaboration between the Customer's users",
            "operationally safe and observable provisioning (error monitoring, performance metrics)",
            "fulfilling statutory retention and recordkeeping obligations",
          ],
        },
        {
          type: "p",
          text: "(3) Processing is exclusively for the purposes under (2). Use for the Processor's own purposes — in particular advertising, third-party profiling or training of own or third-party AI models — is excluded unless the Customer expressly and revocably consents in text form.",
        },
      ],
    },
    {
      id: "d4",
      number: "Section 4",
      title: "Types of personal data",
      blocks: [
        {
          type: "p",
          text: "Depending on the Customer's use, the following data categories are processed:",
        },
        {
          type: "ul",
          items: [
            "master data of Customer users (name, email, language, time zone)",
            "authentication data (hashed passwords, MFA tokens, WebAuthn credentials, session tokens)",
            "organisation and role data (organisation membership, permissions, invitations)",
            "communications (support tickets, in-app notifications, Astra conversations)",
            "customer content in the narrower sense (uploaded documents, assessment answers, compliance status, risks, ephemeris data, satellite telemetry, customer-specific regulatory configurations)",
            "usage and log data (IP addresses, user agents, access timestamps, security events, audit logs)",
            "billing and contract data (billing address, payment history via Stripe; Caelex does not store payment instruments)",
          ],
        },
        {
          type: "p",
          text: "Special categories of personal data within the meaning of Art. 9 GDPR are not envisaged. The Customer shall not introduce such data into the platform unless a separate agreement has been concluded with Caelex.",
        },
      ],
    },
    {
      id: "d5",
      number: "Section 5",
      title: "Categories of data subjects",
      blocks: [
        {
          type: "p",
          text: "The processing affects in particular:",
        },
        {
          type: "ul",
          items: [
            "users of the Customer (own employees, contractors, authorised third parties)",
            "business contacts of the Customer whose data is introduced to the platform (e.g. contact persons at authorities, NCA contacts, investor contacts in Assure)",
            "end customers of the Customer, insofar as their data is processed via the platform",
          ],
        },
      ],
    },
    {
      id: "d6",
      number: "Section 6",
      title: "Rights and obligations of the Controller",
      blocks: [
        {
          type: "p",
          text: "(1) The Customer is the Controller under Art. 4(7) GDPR and bears sole responsibility for the lawfulness of processing and the exercise of data-subject rights.",
        },
        {
          type: "p",
          text: "(2) The Customer ensures a valid legal basis (Art. 6, 9, 10 GDPR as applicable) and fulfils the required information obligations (Art. 13, 14 GDPR).",
        },
        {
          type: "p",
          text: "(3) The Customer documents all instructions and requests in text form. Oral instructions shall be confirmed in text form without delay.",
        },
        {
          type: "p",
          text: "(4) The Customer designates a contact person for data-protection matters and informs Caelex without delay on change.",
        },
      ],
    },
    {
      id: "d7",
      number: "Section 7",
      title: "General obligations of the Processor",
      blocks: [
        {
          type: "p",
          text: "Caelex processes personal data exclusively within the contractual arrangements and on documented instructions of the Customer. Caelex:",
        },
        {
          type: "ul",
          items: [
            "processes data only on documented instructions of the Customer, including transfers to third countries (subject to Section 18);",
            "informs the Customer without undue delay if an instruction, in Caelex's view, violates the GDPR or other data-protection law; Caelex may suspend execution until the Customer confirms or amends;",
            "places staff involved in processing under confidentiality or ensures adequate statutory secrecy (Art. 28(3)(b) GDPR);",
            "implements and maintains the TOMs under Section 9 and Annex 1;",
            "engages sub-processors only under Section 10 and Annex 2;",
            "supports the Customer with suitable technical and organisational measures in fulfilling data-subject rights (Section 15);",
            "supports the Customer with Art. 32–36 GDPR duties (Sections 12, 13);",
            "deletes or returns all personal data, at the Customer's choice, after end of provision of processing services and deletes existing copies unless a statutory retention requires storage (Section 14);",
            "provides the Customer with all information necessary to demonstrate compliance and allows for audits (Section 16);",
            "appoints a data protection officer where legally required and communicates name and contact details on request.",
          ],
        },
      ],
    },
    {
      id: "d8",
      number: "Section 8",
      title: "Right to give instructions",
      blocks: [
        {
          type: "p",
          text: "(1) The Customer issues instructions in text form to privacy@caelex.eu. Conclusion of this DPA (with annexes) and use of the platform per its contracted functions are also instructions.",
        },
        {
          type: "p",
          text: "(2) Individual instructions are binding where reasonable and compatible with the contracted scope. Instructions beyond the contracted scope may be charged for in time spent or refused by Caelex.",
        },
        {
          type: "p",
          text: "(3) Caelex communicates authorised instruction recipients and notifies the Customer of changes without delay.",
        },
      ],
    },
    {
      id: "d9",
      number: "Section 9",
      title: "Technical and organisational measures",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex implements appropriate TOMs under Art. 32 GDPR proportionate to the state of the art, cost, nature, scope, context and purposes of processing and the risk for data subjects.",
        },
        {
          type: "p",
          text: "(2) The TOMs are documented in Annex 1 and are updated on material changes. Caelex may evolve the TOMs provided the protection level is not reduced.",
        },
        {
          type: "p",
          text: "(3) The Customer confirms having reviewed the TOMs prior to contracting and considers them appropriate.",
        },
      ],
    },
    {
      id: "d10",
      number: "Section 10",
      title: "Sub-processors",
      blocks: [
        {
          type: "p",
          text: "(1) The Customer grants Caelex the general written authorisation within the meaning of Art. 28(2) sent. 2 GDPR to engage the sub-processors listed in Annex 2.",
        },
        {
          type: "p",
          text: "(2) Caelex contractually obligates its sub-processors to a protection level materially equivalent to this DPA, including sufficient TOMs and adherence to instructions (Art. 28(4) GDPR).",
        },
        {
          type: "p",
          text: "(3) Caelex provides the Customer with at least 30 days' prior notice of on-boarding or replacement of sub-processors. The current list is published at caelex.eu/legal/sub-processors; the Customer may subscribe to the notification service.",
        },
        {
          type: "p",
          text: "(4) The Customer may object for important, data-protection-related reasons in text form. If an objection is justified and Caelex cannot offer a comparable alternative, the Customer may terminate the main contract as of the change effective date.",
        },
        {
          type: "p",
          text: "(5) Mere use of service providers without access to personal data (e.g. anonymous CDN, physical mail) is not sub-processing under the GDPR.",
        },
      ],
    },
    {
      id: "d11",
      number: "Section 11",
      title: "Assistance obligations",
      blocks: [
        {
          type: "p",
          text: "Caelex reasonably assists the Customer in fulfilling obligations under Art. 32–36 GDPR, in particular:",
        },
        {
          type: "ul",
          items: [
            "ensuring confidentiality, integrity, availability and resilience (Art. 32 GDPR);",
            "rapid restorability after incidents;",
            "support in notification of breaches (Section 12);",
            "support in data-protection impact assessments (Section 13);",
            "support in prior consultation with the supervisory authority where necessary.",
          ],
        },
        {
          type: "p",
          text: "Support beyond the obligations in this DPA is billed at time spent at customary rates.",
        },
      ],
    },
    {
      id: "d12",
      number: "Section 12",
      title: "Notification of personal data breaches",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex notifies the Customer without undue delay, at the latest within 72 hours of becoming aware, in writing or text form of personal-data breaches attributable to Caelex's sphere of responsibility.",
        },
        {
          type: "p",
          text: "(2) The notification contains, where known: nature of the breach, categories and approximate number of data subjects, categories and approximate number of records affected, likely consequences, remedial measures taken.",
        },
        {
          type: "p",
          text: "(3) The Customer is responsible for notification to the competent supervisory authority (Art. 33 GDPR) and, where required, to affected data subjects (Art. 34 GDPR). Caelex supports in preparing notifications.",
        },
        {
          type: "p",
          text: "(4) Central reporting channels at Caelex are security@caelex.eu and privacy@caelex.eu. Caelex maintains a breach register and provides the relevant entry to the Customer on request.",
        },
      ],
    },
    {
      id: "d13",
      number: "Section 13",
      title: "Data protection impact assessment",
      blocks: [
        {
          type: "p",
          text: "(1) Where the Customer is required to conduct a DPIA under Art. 35 GDPR, Caelex supports with reasonable information, in particular product descriptions, TOMs, sub-processor information and where appropriate summaries of internal risk assessments.",
        },
        {
          type: "p",
          text: "(2) Caelex is not obliged to surrender its own DPIAs to the Customer insofar as these contain trade secrets.",
        },
      ],
    },
    {
      id: "d14",
      number: "Section 14",
      title: "Return and deletion",
      blocks: [
        {
          type: "p",
          text: "(1) After end of the processing service Caelex makes personal data available to the Customer within 30 days in a structured, common and machine-readable format (export). After expiry of the export window or upon Customer request deletion follows.",
        },
        {
          type: "p",
          text: "(2) Deletion takes place on production systems within 30 days, on backup systems at the latest upon expiry of the 90-day backup cycle. Deletion is logged; the Customer may request a deletion confirmation.",
        },
        {
          type: "p",
          text: "(3) Statutory retention obligations (commercial and tax law in particular) prevail over deletion. Caelex informs the Customer which data is retained for which reason and period.",
        },
        {
          type: "p",
          text: "(4) Aggregated, fully anonymised data without personal reference and without re-identification possibility may be used for statistical and product-improvement purposes.",
        },
      ],
    },
    {
      id: "d15",
      number: "Section 15",
      title: "Data-subject rights",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex supports the Customer with suitable technical and organisational measures in responding to requests under Art. 15–22 GDPR, in particular through self-service features, exports and targeted deletion.",
        },
        {
          type: "p",
          text: "(2) If a data subject contacts Caelex directly, Caelex forwards the request to the Customer without undue delay and does not respond itself unless expressly instructed or legally required.",
        },
      ],
    },
    {
      id: "d16",
      number: "Section 16",
      title: "Records and audits",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex provides the Customer with all information necessary to demonstrate compliance with Art. 28 GDPR and this DPA, including current TOM documentation, sub-processor list and where appropriate third-party audit reports (e.g. ISO 27001 of hosting providers, SOC 2 reports).",
        },
        {
          type: "p",
          text: "(2) The Customer may conduct an audit once per calendar year — more often for justified reasons (e.g. documented breach) — with at least 30 calendar days' notice.",
        },
        {
          type: "p",
          text: "(3) Audits shall not unreasonably disrupt Caelex's business and are primarily discharged by documentation, certifications and written replies. On-site audits are only conducted if documentary review is insufficient.",
        },
        {
          type: "p",
          text: "(4) The Customer may appoint a professionally-confidential third party auditor (e.g. a licensed auditor). Competitors of Caelex are excluded as auditors.",
        },
        {
          type: "p",
          text: "(5) Audit costs are borne by the Customer unless the audit uncovers material defects attributable to Caelex.",
        },
      ],
    },
    {
      id: "d17",
      number: "Section 17",
      title: "Liability",
      blocks: [
        {
          type: "p",
          text: "(1) Liability under Art. 82 GDPR follows the GDPR directly. In the internal relationship Section 26 of Terms V3.0 applies additionally.",
        },
        {
          type: "p",
          text: "(2) Where Caelex and Customer are jointly and severally liable, in the internal relationship the party to whose sphere the cause is attributable bears primary liability.",
        },
        {
          type: "p",
          text: "(3) The Customer indemnifies Caelex in the internal relationship against claims based on the Customer's instructions or on unlawfulness of processing within the Customer's sphere.",
        },
      ],
    },
    {
      id: "d18",
      number: "Section 18",
      title: "International data transfers",
      blocks: [
        {
          type: "p",
          text: "(1) Transfer of personal data to third countries under Art. 44 et seq. GDPR occurs only on a valid basis under Art. 45–49 GDPR.",
        },
        {
          type: "p",
          text: "(2) For transfers to sub-processors in the USA or other third countries without adequacy decision, Caelex uses the EU Standard Contractual Clauses (Implementing Decision (EU) 2021/914), Module 2 (Controller-to-Processor) or Module 3 (Processor-to-Processor), as applicable.",
        },
        {
          type: "p",
          text: "(3) Where applicable, Caelex additionally relies on the EU-US Data Privacy Framework (Implementing Decision (EU) 2023/1795).",
        },
        {
          type: "p",
          text: "(4) Supplementary safeguards (encryption, access restriction, transparency reports) are documented in the TOMs in Annex 1.",
        },
        {
          type: "p",
          text: "(5) On conclusion of this DPA the Customer expressly consents to the third-country transfers described in Annex 2.",
        },
      ],
    },
    {
      id: "d19",
      number: "Section 19",
      title: "Confidentiality",
      blocks: [
        {
          type: "p",
          text: "(1) Caelex obligates staff involved in processing to confidentiality. The obligation continues after termination of their activity.",
        },
        {
          type: "p",
          text: "(2) Additionally the confidentiality clause Section 22 of Terms V3.0 applies.",
        },
      ],
    },
    {
      id: "d20",
      number: "Section 20",
      title: "Miscellaneous",
      blocks: [
        {
          type: "p",
          text: "(1) Amendments and supplements to this DPA require text form. The same applies to the amendment of this text-form clause.",
        },
        {
          type: "p",
          text: "(2) Should individual provisions be invalid or unenforceable, the validity of the remaining provisions remains unaffected.",
        },
        {
          type: "p",
          text: "(3) In case of conflict between this DPA and other agreements between the parties, this DPA prevails for the matters it governs.",
        },
        {
          type: "p",
          text: "(4) German law applies. Place of jurisdiction is Berlin where the Customer is a merchant, public-law legal entity or public-law special fund.",
        },
        {
          type: "p",
          text: "(5) The German version of this DPA is authoritative. English versions serve information only.",
        },
      ],
    },
  ],
  annexes: [
    {
      id: "anl1",
      number: "Annex 1",
      title: "Technical and organisational measures (TOMs)",
      blocks: [
        {
          type: "callout",
          variant: "info",
          text: "The following TOMs describe the protection level ensured by Caelex at the time of contracting. Caelex may evolve the measures provided the protection level is not reduced.",
        },
        { type: "p", text: "A. Confidentiality (Art. 32(1)(b) GDPR)" },
        {
          type: "ul",
          items: [
            "Physical access control: hosting infrastructure in certified data centres (ISO 27001, SOC 2 Type II) of infrastructure partners. Caelex does not operate on-premises servers with production data.",
            "System access control: multi-factor authentication for all privileged access (TOTP and/or WebAuthn / FIDO2). Password policy with minimum length 12, bcrypt hashing (12 rounds). Automatic account lockout after five failed attempts within 15 minutes.",
            "Data access control: role-based access control (RBAC) with roles Owner, Admin, Manager, Member, Viewer. Principle of least privilege. Tenant data separation on application and database layer per organisation.",
            "Separation control: tenant separation at application-database layer; per-organisation key derivation on field-level encryption.",
            "Pseudonymisation / encryption: sensitive database fields (VAT, bank data, tax IDs, policy numbers) are encrypted with AES-256-GCM and scrypt key derivation per tenant. Transport encryption is TLS 1.2+ without exception.",
          ],
        },
        { type: "p", text: "B. Integrity (Art. 32(1)(b) GDPR)" },
        {
          type: "ul",
          items: [
            "Transfer control: data transmission only encrypted. Internal service-to-service communication via authenticated channels. HMAC-signed API requests on sensitive endpoints.",
            "Input control: tamper-evident audit logs with SHA-256 hash chaining per change.",
          ],
        },
        {
          type: "p",
          text: "C. Availability and resilience (Art. 32(1)(b) and (c) GDPR)",
        },
        {
          type: "ul",
          items: [
            "Backups: automated daily, cryptographically protected; retained at least 30 days (point-in-time database recovery).",
            "Availability target: 99.5 % monthly (see Section 16 of Terms).",
            "High availability via distributed edge infrastructure and cross-region database replication.",
            "Regular restore testing.",
          ],
        },
        {
          type: "p",
          text: "D. Procedures for regular review (Art. 32(1)(d) GDPR)",
        },
        {
          type: "ul",
          items: [
            "Data-protection management: documented procedures; privacy@caelex.eu as central channel.",
            "Incident response: documented process with 72-hour notification window (Art. 33 GDPR).",
            "Anomaly detection and intrusion monitoring with automated alerts (honey tokens, brute-force detection, anomaly detection engine).",
            "Security audit logs including login events, API calls, permission changes.",
            "Regular dependency and vulnerability scanning (Dependabot, CodeQL, TruffleHog secret scanning, OWASP dependency checks).",
            "Sub-processor control: sub-processors contractually obligated, see Annex 2.",
            "Privacy-by-default in the user interface.",
          ],
        },
        { type: "p", text: "E. Organisational measures" },
        {
          type: "ul",
          items: [
            "Confidentiality and data-protection obligations for employees; regular training.",
            "Documented password and device-security policies.",
            "Separate environments for development, staging and production.",
            "Two-person rule for high-risk production changes.",
            "Pre-commit hooks (ESLint, TypeScript, secret scanning) before commits.",
          ],
        },
      ],
    },
    {
      id: "anl2",
      number: "Annex 2",
      title: "Sub-processors",
      blocks: [
        {
          type: "p",
          text: "Sub-processors in use at the time of contracting are listed below by category. The complete, current list is available at caelex.eu/legal/sub-processors.",
        },
        {
          type: "ul",
          items: [
            "Hosting / edge network: Vercel Inc. (USA) — SCC Module 3; EU-US DPF; data predominantly in EU regions.",
            "Database (managed Postgres): Neon Inc. (USA) — EU data residency (eu-central-1); SCC Module 3.",
            "Rate limiting / caching: Upstash Inc. (USA) — SCC Module 3; EU-US DPF.",
            "Payments: Stripe Payments Europe Ltd. (Ireland) — independently responsible for payment data; Caelex does not store card data.",
            "Email delivery: Resend Inc. (USA) — SCC Module 3.",
            "Error and performance monitoring: Functional Software Inc. (dba Sentry, USA) — configured with PII scrubbing.",
            "AI inference (Astra, Atlas, Generate 2.0): Anthropic PBC — preferred processing in the EU (AWS Bedrock Frankfurt/Ireland via Vercel AI Gateway); fallback in the USA (Anthropic direct API) safeguarded by EU-US DPF (Anthropic is DPF-certified) + SCC Module 3. A zero-data-retention agreement (Anthropic Enterprise) applies on both paths — inputs are not used for model training.",
            "AI embeddings (Atlas Library search, semantic recall): OpenAI L.L.C. (USA) as a sub-sub-processor under Vercel — no direct contractual relationship between Caelex and OpenAI. Routed via Vercel AI Gateway. EU-US DPF (certified) + SCC + zero-data-retention for API calls.",
          ],
        },
        {
          type: "p",
          text: "Caelex will notify the Customer at least 30 days in advance of changes to this list (Section 10).",
        },
      ],
    },
  ],
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
    { label: "Deutsche Version →", href: "/legal/dpa" },
    { label: "Terms (V3.0)", href: "/legal/terms-en" },
    { label: "Privacy Policy", href: "/legal/privacy-en" },
    { label: "Sub-processors", href: "/legal/sub-processors" },
  ],
};
