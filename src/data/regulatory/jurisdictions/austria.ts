/**
 * Austria / FFG — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Weltraumgesetz 2011 (Austrian Outer Space Act, BGBl. I Nr. 132/2011)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - NIS2 Directive (EU) 2022/2555 (transposed via Austrian NIS2-Umsetzungsgesetz)
 * - ISO 24113:2019 Space systems — Space debris mitigation requirements
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ──────────────────────────────────────────────────

const AUSTRIA_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "at-weltraumgesetz-authorization",
    nationalRef: {
      law: "Weltraumgesetz 2011",
      article: "§ 4",
      title: "Authorization Requirement for Space Activities",
      fullText:
        "Any Austrian natural or legal person intending to carry out a space activity requires " +
        "prior authorization from the Federal Minister for Transport, Innovation and Technology. " +
        "The authorization application must include a description of the planned space activity, " +
        "technical specifications of the space object, operational procedures, insurance coverage " +
        "evidence, and a debris mitigation plan. Authorization may be subject to conditions and " +
        "is non-transferable without approval.",
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
    id: "at-weltraumgesetz-registration",
    nationalRef: {
      law: "Weltraumgesetz 2011",
      article: "§ 11",
      title: "Registration of Space Objects",
      fullText:
        "Austrian operators must register all authorized space objects in the national space " +
        "object registry maintained by FFG. Registration data must include the operator name, " +
        "orbital parameters, mission purpose, and expected operational lifetime. Data is " +
        "subsequently transmitted to the UN Secretary-General in compliance with the UN " +
        "Registration Convention (UNGA Res. 3235 (XXIX)). Amendments to registration data " +
        "must be reported without undue delay.",
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
    id: "at-weltraumgesetz-liability-insurance",
    nationalRef: {
      law: "Weltraumgesetz 2011",
      article: "§ 8",
      title: "Liability and Mandatory Insurance",
      fullText:
        "Austrian operators are liable for damage caused by their space activities under the " +
        "Outer Space Treaty (1967) and Liability Convention (1972). Operators must maintain " +
        "third-party liability insurance in an amount determined by the licensing authority " +
        "based on the risk profile of the mission. The Republic of Austria exercises recourse " +
        "against operators for any liability payments made on their behalf. Insurance must " +
        "remain in force for the entire operational lifetime of the space object.",
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
    id: "at-weltraumgesetz-debris-mitigation",
    nationalRef: {
      law: "Weltraumgesetz 2011",
      article: "§ 6",
      title: "Space Debris Mitigation Obligations",
      fullText:
        "Authorization holders must implement space debris mitigation measures in accordance " +
        "with the recognized international standards. The licensing authority (FFG) assesses " +
        "compliance with the IADC Space Debris Mitigation Guidelines as the baseline standard. " +
        "Operators must demonstrate a passivation plan, a post-mission disposal plan compliant " +
        "with the 25-year deorbit rule for LEO, and a collision avoidance capability. " +
        "Modifications to the debris mitigation plan require prior notification to FFG.",
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
];

// ─── Knowledge Base ─────────────────────────────────────────────────────────

const AUSTRIA_KNOWLEDGE_BASE = `
## AUSTRIA (FFG) — REGULATORY KNOWLEDGE BASE

### NCA Overview
The Austrian Research Promotion Agency (FFG — Österreichische Forschungsförderungsgesellschaft)
acts as the national competent authority for space activities under the Weltraumgesetz 2011.
The FFG Space division administers authorization, registration, and supervision of Austrian
space operators and maintains the national space object registry.

Website: https://www.ffg.at/en/space

### Weltraumgesetz 2011 (Austrian Outer Space Act)
BGBl. I Nr. 132/2011. Austria's comprehensive space law enacted in 2011 provides the statutory
basis for authorization, supervision, liability, and registration of space activities by Austrian
nationals and legal persons. No major amendments have been enacted since 2011; implementing
ordinances (Verordnungen) specify procedural details.

Key provisions:
- § 4: Authorization requirement — prior permit mandatory for all space activities
- § 6: Debris mitigation — IADC Guidelines and ISO 24113 baseline
- § 8: Liability and insurance — mandatory third-party liability coverage
- § 11: Registration — national registry plus UN Registration Convention compliance

### Insurance Requirements
Insurance is required per Weltraumgesetz § 8. The amount is set on a case-by-case basis
by the licensing authority based on mission risk profile. There is no statutory minimum figure
in the law itself; FFG references comparable European jurisdictions (France EUR 60M, Germany
EUR 50M draft) when setting coverage requirements. Operators should budget for coverage in
the range of EUR 20M–60M depending on mission type and orbital parameters.

### Cybersecurity — NIS2 Transposition
Austria has transposed NIS2 Directive (EU) 2022/2555 via the NIS2-Umsetzungsgesetz. Space
operators meeting the size thresholds (≥50 employees or ≥€10M turnover) and operating
ground segment infrastructure are subject to Austrian NIS2 obligations including:
- Risk management and technical security measures
- Incident reporting: 24h early warning, 72h notification, 1-month final report
- Supply chain security requirements
- Multi-factor authentication obligations

### Debris Mitigation Standards
FFG applies the IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) as the
primary technical standard, supplemented by ISO 24113:2019. Austrian operators are expected
to demonstrate:
- 25-year post-mission orbital lifetime rule (LEO)
- GEO graveyard orbit compliance
- Passivation of all energy sources at end-of-life
- Collision avoidance capability and procedures
- No intentional debris release

### EU Space Act Proposal Context
COM(2025) 335 will, once enacted, establish a harmonized EU authorization regime. Austria as
an EU Member State will implement the EU Space Act. Current Weltraumgesetz 2011 requirements
will largely be superseded by or aligned with the EU Space Act framework. FFG is expected to
become the designated NCA under Art. 6 of the proposal.
`.trim();

// ─── Jurisdiction Data ───────────────────────────────────────────────────────

const AUSTRIA_JURISDICTION: JurisdictionData = {
  code: "AT",
  name: "Austria",

  nca: {
    name: "FFG",
    fullName:
      "Österreichische Forschungsförderungsgesellschaft (Austrian Research Promotion Agency)",
    website: "https://www.ffg.at/en/space",
    language: "de",
    executiveSummaryLanguage: "de",
  },

  spaceLaw: {
    name: "Weltraumgesetz 2011 (Austrian Outer Space Act)",
    citation: "BGBl. I Nr. 132/2011",
    yearEnacted: 2011,
    yearAmended: null,
    status: "enacted",
    url: "https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007418",
  },

  additionalLaws: [
    {
      name: "NIS2-Umsetzungsgesetz (Austrian NIS2 transposition)",
      citation: "BGBl. I Nr. 118/2024",
      scope:
        "Cybersecurity obligations for essential and important entities including space operators " +
        "with ground segment infrastructure; incident reporting to national CERT.at",
      status: "enacted",
    },
  ],

  requirements: AUSTRIA_REQUIREMENTS,

  insurance: {
    minimumTPL: null,
    formula: "Case-by-case determination by FFG based on mission risk profile",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Weltraumgesetz 2011 § 8 — mandatory third-party liability insurance; " +
      "amount set by licensing authority. Republic of Austria exercises recourse " +
      "against operators for liability payments made on their behalf.",
  },

  complianceMatrixFormat: {
    statusValues: [
      "K (Konform)",
      "NK (Nicht Konform)",
      "TK (Teilweise Konform)",
      "NA (Nicht Anwendbar)",
    ],
    columns: [
      "Anforderung (Requirement)",
      "Gesetzliche Grundlage (Legal Basis)",
      "EU Space Act Art.",
      "Status",
      "Nachweis (Evidence)",
      "Bemerkung (Comment)",
    ],
    language: "de",
  },

  rigor: {
    debris: 3,
    cybersecurity: 3,
    general: 3,
    safety: 3,
  },

  requiredTools: [
    {
      name: "ESA DRAMA Suite",
      description:
        "OSCAR, MASTER, ARES modules for orbital lifetime and re-entry risk analysis. " +
        "FFG accepts ESA DRAMA or equivalent propagation tools — no Austrian-specific tool required.",
      mandatory: false,
    },
  ],

  acceptedEvidence: [
    {
      type: "ISO_27001_CERT",
      description:
        "ISO/IEC 27001:2022 certification for information security management system — " +
        "accepted as evidence of NIS2 cybersecurity compliance by Austrian authorities.",
      acceptedAsShortcut: true,
    },
    {
      type: "IADC_COMPLIANCE_REPORT",
      description:
        "Technical report demonstrating compliance with IADC Space Debris Mitigation " +
        "Guidelines Rev.2, including orbital lifetime analysis, passivation plan, and " +
        "disposal strategy. Primary debris compliance evidence accepted by FFG.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Certificate of third-party liability insurance from a recognized insurer, " +
        "confirming coverage amount and policy term as required by Weltraumgesetz § 8.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    DMP: {
      depthExpectation: "standard",
      specificRequirements: [
        "Reference Weltraumgesetz 2011 § 6 as the legal basis for debris mitigation obligations",
        "Apply IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) as primary standard",
        "Reference ISO 24113:2019 as complementary standard throughout",
        "Demonstrate 25-year post-mission disposal compliance for LEO orbits",
        "Include passivation plan covering all stored energy sources",
        "Include collision avoidance capability description and procedures",
        "German-language executive summary recommended for FFG review",
      ],
      commonRejectionReasons: [
        "No reference to Weltraumgesetz 2011 legal basis",
        "IADC Guidelines version not specified (must reference Rev.2 / IADC-02-01)",
        "Passivation plan incomplete or missing",
        "25-year deorbit rule compliance not demonstrated with propagation analysis",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "standard",
      specificRequirements: [
        "Submit to FFG Space division per Weltraumgesetz § 4 procedure",
        "Include full technical description of space object and mission",
        "Attach insurance coverage evidence per § 8",
        "Include debris mitigation plan per § 6",
        "Registration data submission per § 11 must follow authorization approval",
        "Application documentation may be submitted in German or English",
      ],
      commonRejectionReasons: [
        "Insurance coverage amount insufficient or not yet confirmed",
        "Debris mitigation plan not submitted with application",
        "Missing operator contact and corporate registration details",
      ],
    },
  },

  knowledgeBase: AUSTRIA_KNOWLEDGE_BASE,
};

// ─── Export ──────────────────────────────────────────────────────────────────

export function getAustriaJurisdiction(): JurisdictionData {
  return AUSTRIA_JURISDICTION;
}
