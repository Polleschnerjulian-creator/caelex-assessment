/**
 * Italy / ASI — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Legge sull'Economia dello Spazio (Italian Space Economy Act 2025, L. n. 7/2025)
 *   NOTE: Implementing regulations (decreti attuativi) are pending as of 2025.
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - NIS2 Directive (EU) 2022/2555 (transposed via D.Lgs. 138/2024)
 * - ISO 24113:2019 Space systems — Space debris mitigation requirements
 *
 * IMPORTANT: The 2025 space law is enacted but key implementing regulations
 * (decreti ministeriali attuativi) specifying procedural details, insurance tiers,
 * and technical standards are still pending. Until these are issued, operators
 * should engage ASI directly for guidance on compliance pathways.
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ──────────────────────────────────────────────────

const ITALY_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "it-space-economy-act-authorization",
    nationalRef: {
      law: "Legge sull'Economia dello Spazio (L. n. 7/2025)",
      article: "Art. 4",
      title: "Authorization Requirement for Space Activities",
      fullText:
        "Italian nationals and Italian legal entities must obtain prior authorization from the " +
        "Minister of Enterprises and Made in Italy (MIMIT), in coordination with ASI, before " +
        "carrying out any space activity. The authorization covers launch, orbital operations, " +
        "and re-entry. Applications must be submitted to ASI (Agenzia Spaziale Italiana) which " +
        "performs the technical assessment. The specific procedural requirements, timelines, and " +
        "documentation requirements will be detailed in implementing decrees (decreti attuativi) " +
        "to be issued pursuant to this law. Until implementing regulations are published, " +
        "operators should contact ASI for interim guidance.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 1",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 17-25",
      confidence: "direct",
    },
    category: "authorization",
  },
  {
    id: "it-space-economy-act-registration",
    nationalRef: {
      law: "Legge sull'Economia dello Spazio (L. n. 7/2025)",
      article: "Art. 9",
      title: "Registration of Italian Space Objects",
      fullText:
        "All space objects authorized under the Italian Space Economy Act must be registered " +
        "in the national Italian space object registry maintained by ASI. Registration data " +
        "must include operator identity, orbital parameters, launch date and vehicle, mission " +
        "purpose, and expected operational lifetime. Italy notifies the UN Secretary-General " +
        "per the Registration Convention (UNGA Res. 3235 (XXIX)). Detailed registration " +
        "procedures, formats, and timelines are to be specified in implementing decrees " +
        "currently pending. Operators are advised to confirm requirements with ASI.",
    },
    standardsMapping: [
      {
        framework: "UN Registration Convention",
        reference: "Art. IV",
        relationship: "implements",
      },
      {
        framework: "UNGA Res. 62/101",
        reference: "Section III",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 40-45",
      confidence: "direct",
    },
    category: "registration",
  },
  {
    id: "it-space-economy-act-liability-insurance",
    nationalRef: {
      law: "Legge sull'Economia dello Spazio (L. n. 7/2025)",
      article: "Art. 11",
      title: "Liability, Insurance, and Size-Tiered Coverage",
      fullText:
        "Italian operators bear liability for damage caused by their space activities consistent " +
        "with Italy's treaty obligations under the Liability Convention (1972) and the Outer " +
        "Space Treaty (1967). Mandatory third-party liability insurance is required. The Italian " +
        "Space Economy Act introduces a size-tiered insurance framework: micro/small operators " +
        "(< 50 employees or < €10M turnover) are required to hold coverage of at least EUR 20M; " +
        "medium operators (50–249 employees or €10M–50M turnover) must hold at least EUR 50M; " +
        "large operators (≥ 250 employees or ≥ €50M turnover) must hold at least EUR 100M. " +
        "The Italian State exercises recourse against operators for international liability " +
        "payments. Implementing decrees specifying coverage forms and procedural details " +
        "are pending.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II-III",
        relationship: "implements",
      },
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI-VII",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 26-30",
      confidence: "direct",
    },
    category: "insurance",
  },
  {
    id: "it-space-economy-act-debris-mitigation",
    nationalRef: {
      law: "Legge sull'Economia dello Spazio (L. n. 7/2025)",
      article: "Art. 7",
      title: "Space Debris Mitigation and Sustainability Obligations",
      fullText:
        "Authorized operators must adopt debris mitigation measures in line with internationally " +
        "recognized guidelines. ASI applies the IADC Space Debris Mitigation Guidelines Rev.2 " +
        "and ISO 24113:2019 as the technical baseline. Operators must submit a Debris Mitigation " +
        "Plan (Piano di Mitigazione dei Detriti Spaziali) covering passivation of all energy " +
        "sources, post-mission disposal (25-year LEO rule), collision avoidance procedures, " +
        "and prohibition on intentional debris release. Technical standards and assessment " +
        "methodology details are to be specified in implementing decrees, which remain pending. " +
        "In the interim, ASI applies IADC/ISO standards directly.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Sections 4-6",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Sections 5-7",
        relationship: "implements",
      },
      {
        framework: "NIS2 Directive",
        reference: "Art. 21(2)",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-72",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "it-d-lgs-138-2024-nis2-cybersecurity",
    nationalRef: {
      law: "D.Lgs. 138/2024 (Italian NIS2 transposition)",
      article: "Art. 24-26",
      title: "Cybersecurity Risk Management for Space Operators",
      fullText:
        "Italian space operators qualifying as essential or important entities under D.Lgs. " +
        "138/2024 (the Italian transposition of NIS2 Directive (EU) 2022/2555) must implement " +
        "appropriate technical and organisational cybersecurity measures. The Agenzia per la " +
        "Cybersicurezza Nazionale (ACN) is the competent supervisory authority. Obligations " +
        "include risk analysis, incident handling, business continuity, supply chain security, " +
        "vulnerability disclosure, and multi-factor authentication. Incident reporting timelines: " +
        "early warning within 24 hours, notification within 72 hours, final report within 1 month. " +
        "Space operators with ground segment infrastructure qualifying as critical infrastructure " +
        "are classified as essential entities regardless of size.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive",
        reference: "Art. 21-23",
        relationship: "implements",
      },
      {
        framework: "ISO/IEC 27001:2022",
        reference: "Clause 6.1",
        relationship: "equivalent",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-95",
      confidence: "direct",
    },
    category: "cybersecurity",
  },
];

// ─── Knowledge Base ─────────────────────────────────────────────────────────

const ITALY_KNOWLEDGE_BASE = `
## ITALY (ASI) — REGULATORY KNOWLEDGE BASE

### NCA Overview
ASI (Agenzia Spaziale Italiana) is Italy's national space agency and acts as the technical
assessment body for space authorization applications submitted to the Ministry of Enterprises
and Made in Italy (MIMIT). ASI maintains the Italian space object registry and represents
Italy in international space bodies.

Website: https://www.asi.it

### Legge sull'Economia dello Spazio (Italian Space Economy Act 2025, L. n. 7/2025)
Italy enacted its first comprehensive space law in 2025 — the Legge sull'Economia dello
Spazio (L. n. 7/2025). This is a landmark development; Italy previously lacked a unified
national space law and operated under general administrative law principles.

CRITICAL NOTE — IMPLEMENTING REGULATIONS PENDING:
The 2025 law establishes the framework but delegates key procedural and technical details
to implementing decrees (decreti ministeriali attuativi). As of the date of this data file,
these implementing regulations have NOT yet been published. This means:
- Specific application forms and procedures are not yet finalized
- Technical assessment criteria are not yet formally specified
- Insurance tier thresholds (EUR 20M / 50M / 100M) are set in the law but procedural
  confirmation requirements are pending implementing decrees
- Registration procedures and timeline are pending
Operators should contact ASI directly for the current interim guidance process.

### Insurance — Size-Tiered Framework
The 2025 law introduces a notable innovation: tiered insurance requirements based on
operator size:
- Micro/small operators: EUR 20 million minimum TPL
- Medium operators: EUR 50 million minimum TPL
- Large operators: EUR 100 million minimum TPL
Size thresholds follow EU SME definitions (Recommendation 2003/361/EC):
- Micro: < 10 employees and < EUR 2M turnover
- Small: < 50 employees and < EUR 10M turnover
- Medium: 50–249 employees and EUR 10M–50M turnover
- Large: ≥ 250 employees or ≥ EUR 50M turnover
This tiered system is more operator-friendly for small NewSpace companies than flat
minimums (e.g., France EUR 60M). However, implementing decrees confirming the exact
framework are still awaited.

### Cybersecurity — ACN and NIS2 Transposition
Italy transposed the NIS2 Directive via D.Lgs. 138/2024. The Agenzia per la Cybersicurezza
Nazionale (ACN) is the competent authority. Space operators with ground segment infrastructure
may qualify as essential entities. Key obligations:
- Risk management measures per Art. 24
- 24h/72h/1-month incident reporting timelines to ACN
- Supply chain security requirements
- Italian-language incident reports typically required for ACN submissions

### Debris Mitigation Standards
ASI applies IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) and
ISO 24113:2019 as primary technical standards. Until implementing decrees are issued,
operators should demonstrate compliance using these international standards directly.
ESA DRAMA or equivalent tools are accepted for orbital lifetime analysis.

### EU Space Act Proposal Context
As an EU Member State, Italy will implement COM(2025) 335 once enacted. ASI is expected to
become the designated NCA under the harmonized EU framework. The new Italian space law was
designed in part to position Italy ahead of the EU Space Act, and ASI has been involved in
the EU Space Act legislative process. Operators should anticipate that implementing decrees
for the Italian law may be aligned with EU Space Act requirements when they are issued.

### Italy's Space Sector Profile
Italy has a significant domestic space industry (Leonardo, Thales Alenia Space, Avio) and
is a founding member of ESA with a strong scientific and commercial space heritage. ASI
administers Italian contributions to ISS, the Cosmo-SkyMed EO constellation, and the
PRISMA hyperspectral satellite. New entrants benefit from ASI's technical expertise and
access to ground infrastructure.
`.trim();

// ─── Jurisdiction Data ───────────────────────────────────────────────────────

const ITALY_JURISDICTION: JurisdictionData = {
  code: "IT",
  name: "Italy",

  nca: {
    name: "ASI",
    fullName: "Agenzia Spaziale Italiana (Italian Space Agency)",
    website: "https://www.asi.it",
    language: "it",
    executiveSummaryLanguage: "it",
  },

  spaceLaw: {
    name: "Legge sull'Economia dello Spazio (Italian Space Economy Act)",
    citation: "L. n. 7 del 6 febbraio 2025 (G.U. n. 33 del 8.2.2025)",
    yearEnacted: 2025,
    yearAmended: null,
    status: "enacted",
    url: "https://www.gazzettaufficiale.it/eli/id/2025/02/08/25G00018/SG",
  },

  additionalLaws: [
    {
      name: "D.Lgs. 138/2024 (Italian NIS2 transposition)",
      citation: "D.Lgs. 4 settembre 2024, n. 138",
      scope:
        "Cybersecurity obligations for essential and important entities including space operators; " +
        "ACN (Agenzia per la Cybersicurezza Nazionale) as supervisory authority; " +
        "incident reporting timelines: 24h / 72h / 1 month",
      status: "enacted",
    },
    {
      name: "Implementing Decrees under L. n. 7/2025",
      citation: "Decreti ministeriali attuativi — NOT YET PUBLISHED",
      scope:
        "PENDING: Technical standards, application procedures, insurance confirmation requirements, " +
        "registration formats, and authorization timelines. " +
        "Operators must contact ASI for interim guidance until these are issued.",
      status: "draft",
    },
  ],

  requirements: ITALY_REQUIREMENTS,

  insurance: {
    minimumTPL: 20_000_000,
    formula:
      "Size-tiered: EUR 20M (micro/small), EUR 50M (medium), EUR 100M (large). " +
      "Size thresholds follow EU SME Recommendation 2003/361/EC. " +
      "Implementing decrees specifying procedural confirmation requirements are PENDING.",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Legge sull'Economia dello Spazio, L. n. 7/2025, Art. 11. " +
      "Implementing regulations pending — contact ASI for current process. " +
      "Italian State exercises recourse against operators for international liability payments.",
  },

  complianceMatrixFormat: {
    statusValues: [
      "C (Conforme)",
      "NC (Non Conforme)",
      "PC (Parzialmente Conforme)",
      "NA (Non Applicabile)",
    ],
    columns: [
      "Requisito (Requirement)",
      "Base Legale (Legal Basis)",
      "EU Space Act Art.",
      "Stato (Status)",
      "Evidenza (Evidence)",
      "Note (Comment)",
    ],
    language: "it",
  },

  rigor: {
    debris: 3,
    cybersecurity: 3,
    general: 4,
    safety: 3,
  },

  requiredTools: [
    {
      name: "ESA DRAMA Suite",
      description:
        "OSCAR, MASTER, ARES modules for orbital lifetime and re-entry risk analysis. " +
        "ASI accepts ESA DRAMA or equivalent propagation tools pending issuance of implementing decrees " +
        "that may specify additional Italian-specific requirements.",
      mandatory: false,
    },
  ],

  acceptedEvidence: [
    {
      type: "ISO_27001_CERT",
      description:
        "ISO/IEC 27001:2022 certification accepted as evidence of NIS2 cybersecurity " +
        "compliance by ACN (Agenzia per la Cybersicurezza Nazionale).",
      acceptedAsShortcut: true,
    },
    {
      type: "IADC_COMPLIANCE_REPORT",
      description:
        "Technical report demonstrating compliance with IADC Space Debris Mitigation " +
        "Guidelines Rev.2. Primary debris compliance evidence accepted by ASI pending " +
        "implementing decrees.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Certificate of third-party liability insurance confirming coverage amount " +
        "appropriate to operator size tier (EUR 20M / 50M / 100M) per L. n. 7/2025 Art. 11.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    DMP: {
      depthExpectation: "standard",
      specificRequirements: [
        "Reference Legge sull'Economia dello Spazio (L. n. 7/2025) Art. 7 as legal basis",
        "Apply IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) as primary standard",
        "Reference ISO 24113:2019 throughout as complementary standard",
        "Demonstrate 25-year post-mission disposal compliance for LEO",
        "Include passivation plan for all stored energy sources at end-of-life",
        "Note that implementing decrees may impose additional Italian-specific requirements when issued",
        "Italian-language executive summary recommended for ASI review",
        "ESA DRAMA suite accepted for orbital lifetime analysis",
      ],
      commonRejectionReasons: [
        "No reference to new Italian Space Economy Act 2025 legal basis",
        "Passivation plan missing or incomplete",
        "25-year deorbit rule compliance not supported by analysis",
        "Implementing decrees not acknowledged — document should note pending regulations",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "standard",
      specificRequirements: [
        "Contact ASI Space Regulation Office before formal submission — implementing decrees pending",
        "Include technical description of space object, orbital parameters, mission duration",
        "Confirm applicable insurance tier based on operator size (micro/small/medium/large)",
        "Attach insurance documentation or commitment letter per L. n. 7/2025 Art. 11",
        "Include Debris Mitigation Plan (Piano di Mitigazione dei Detriti Spaziali)",
        "Registration under Art. 9 proceeds after authorization is granted",
        "Applications may be submitted in Italian or English; ASI correspondence typically in Italian",
        "IMPORTANT: Reference that implementing regulations are pending and process may evolve",
      ],
      commonRejectionReasons: [
        "Failure to engage ASI before formal application given pending implementing decrees",
        "Insurance tier not matched to operator size classification",
        "Debris mitigation plan not included or not referencing L. n. 7/2025 Art. 7",
        "Missing Italian corporate/entity registration documentation",
      ],
    },
  },

  knowledgeBase: ITALY_KNOWLEDGE_BASE,
};

// ─── Export ──────────────────────────────────────────────────────────────────

export function getItalyJurisdiction(): JurisdictionData {
  return ITALY_JURISDICTION;
}
