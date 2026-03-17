/**
 * Denmark / DTU Space — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Danish Outer Space Act 2016 (Act No. 409 of 11 May 2016)
 * - Executive Order on Authorization of Space Activities (BEK nr 1021 af 26/06/2020)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - NIS2 Directive (EU) 2022/2555 (transposed via Danish CER/NIS2 law)
 * - ISO 24113:2019 Space systems — Space debris mitigation requirements
 *
 * Note: Greenland hosts significant ground station facilities (e.g., ESA Svalbard-equivalent
 * assets); ground stations in Greenland are within Danish jurisdiction and subject to
 * the Danish Outer Space Act where space activities are supported.
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ──────────────────────────────────────────────────

const DENMARK_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "dk-space-act-authorization",
    nationalRef: {
      law: "Danish Outer Space Act 2016",
      article: "§ 3",
      title: "Authorization Requirement for Space Activities",
      fullText:
        "Danish nationals and Danish legal entities must obtain authorization from the Minister " +
        "for Higher Education and Science before carrying out space activities. Authorization is " +
        "also required for activities carried out from Danish territory by foreign nationals. " +
        "Applications are processed by DTU Space on behalf of the Ministry. The authorization " +
        "must specify the space object, mission type, orbital parameters, operational duration, " +
        "and debris mitigation measures. Authorization is non-transferable and may be revoked " +
        "for non-compliance.",
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
    id: "dk-space-act-registration",
    nationalRef: {
      law: "Danish Outer Space Act 2016",
      article: "§ 7",
      title: "Registration of Danish Space Objects",
      fullText:
        "All space objects authorized under the Danish Outer Space Act must be registered in " +
        "the Danish national registry of space objects maintained by DTU Space. Registration " +
        "information must include name and address of operator, launch date, launch vehicle, " +
        "orbital parameters (apogee, perigee, inclination, orbital period), and general " +
        "function of the space object. Denmark notifies the UN Secretary-General of registered " +
        "objects in accordance with the Registration Convention. Updates to orbital parameters " +
        "or mission status must be reported promptly.",
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
    id: "dk-space-act-liability-insurance",
    nationalRef: {
      law: "Danish Outer Space Act 2016",
      article: "§ 8",
      title: "Liability and Insurance Obligations",
      fullText:
        "Authorized operators bear absolute liability for damage caused by their space activities " +
        "consistent with Denmark's obligations under the Liability Convention (1972). Operators " +
        "must maintain third-party liability insurance in an amount and form approved by the " +
        "competent authority. The Danish State exercises recourse against the operator for any " +
        "compensation paid on their behalf under international treaty obligations. Insurance " +
        "documentation must be maintained for the full operational lifetime of the space object " +
        "and submitted to DTU Space upon request.",
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
    id: "dk-space-act-debris-mitigation",
    nationalRef: {
      law: "Danish Outer Space Act 2016",
      article: "§ 5",
      title: "Space Debris Mitigation Requirements",
      fullText:
        "Authorized operators must implement space debris mitigation measures consistent with " +
        "recognized international standards. DTU Space applies the IADC Space Debris Mitigation " +
        "Guidelines Rev.2 as the baseline technical standard. Operators must submit a debris " +
        "mitigation plan demonstrating compliance with the 25-year LEO disposal rule, passivation " +
        "of all stored energy at end of mission, avoidance of intentional debris release, " +
        "and collision avoidance procedures. Ground station facilities in Greenland and Denmark " +
        "supporting space activities are subject to the same oversight framework.",
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

const DENMARK_KNOWLEDGE_BASE = `
## DENMARK (DTU Space) — REGULATORY KNOWLEDGE BASE

### NCA Overview
DTU Space (National Space Institute at the Technical University of Denmark) administers
space authorization and registration functions on behalf of the Ministry of Higher Education
and Research. DTU Space provides technical assessment for authorization applications and
maintains the Danish national space object registry.

Website: https://www.space.dtu.dk

### Danish Outer Space Act 2016 (Act No. 409)
The Danish Outer Space Act (Act No. 409 of 11 May 2016) establishes the legal basis for
authorization, registration, and supervision of Danish space activities. The Act implements
Denmark's obligations under the Outer Space Treaty, Liability Convention, and Registration
Convention. An Executive Order (BEK nr 1021 af 26/06/2020) provides implementing procedures.

Key provisions:
- § 3: Authorization requirement — mandatory for all space activities by Danish entities
- § 5: Debris mitigation — IADC Guidelines baseline
- § 7: Registration — national registry plus UN Registration Convention compliance
- § 8: Liability and insurance — mandatory third-party liability coverage

### Greenland Ground Station Facilities
Denmark has significant ground station infrastructure. Facilities in Greenland (including
stations supporting polar-orbit satellite operations) fall under Danish jurisdiction. Operators
using Greenland-based ground stations for telemetry, tracking, and command (TT&C) services
should confirm whether their ground segment activities trigger Danish authorization requirements
under the Outer Space Act. ESA and other international organizations operate under separate
framework agreements; commercial operators require Danish authorization.

### Insurance Requirements
The Danish Outer Space Act § 8 requires third-party liability insurance. The amount is
determined by DTU Space on a case-by-case basis considering mission type, orbit, and risk
profile. Denmark has not published a statutory minimum figure; operators should consult DTU
Space during the pre-application phase. Coverage in the range of EUR 20M–60M is typical for
commercial small satellite missions.

### Cybersecurity — NIS2 Transposition
Denmark has transposed the NIS2 Directive (EU) 2022/2555. Space operators meeting size
thresholds (≥50 employees or ≥€10M turnover) with ground segment infrastructure are subject
to Danish NIS2 obligations including:
- Technical and organisational security measures per Art. 21
- Incident reporting: 24h early warning, 72h notification, 1-month final report
- Supply chain security assessment
The Danish Centre for Cyber Security (CFCS) is the primary NIS2 supervisory authority.

### Debris Mitigation Standards
DTU Space applies IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) as the
primary technical reference. ISO 24113:2019 is the complementary standard. Danish operators
must demonstrate:
- 25-year post-mission orbital lifetime rule for LEO
- GEO graveyard orbit compliance
- Passivation of all stored energy sources
- Collision avoidance capability
- No intentional debris release

### EU Space Act Proposal Context
As an EU Member State, Denmark will implement COM(2025) 335 once enacted. DTU Space is
expected to serve as the Danish NCA under the harmonized EU framework. Operators should
design their compliance documentation to be compatible with both the current Danish Outer
Space Act and the forthcoming EU Space Act regime.
`.trim();

// ─── Jurisdiction Data ───────────────────────────────────────────────────────

const DENMARK_JURISDICTION: JurisdictionData = {
  code: "DK",
  name: "Denmark",

  nca: {
    name: "DTU Space",
    fullName:
      "National Space Institute, Technical University of Denmark (under Ministry of Higher Education and Research)",
    website: "https://www.space.dtu.dk",
    language: "da",
    executiveSummaryLanguage: "en",
  },

  spaceLaw: {
    name: "Danish Outer Space Act 2016",
    citation: "Act No. 409 of 11 May 2016; BEK nr 1021 af 26/06/2020",
    yearEnacted: 2016,
    yearAmended: 2020,
    status: "enacted",
    url: "https://www.retsinformation.dk/eli/lta/2016/409",
  },

  additionalLaws: [
    {
      name: "Executive Order on Authorization of Space Activities",
      citation: "BEK nr 1021 af 26/06/2020",
      scope:
        "Implementing regulation for the Danish Outer Space Act — procedural requirements " +
        "for authorization applications, registration, and supervision",
      status: "enacted",
    },
    {
      name: "Danish NIS2 Transposition Act",
      citation: "Lov nr 1548 af 13/12/2022 (as amended)",
      scope:
        "Cybersecurity obligations for essential and important entities including space operators; " +
        "incident reporting to CFCS (Centre for Cyber Security)",
      status: "enacted",
    },
  ],

  requirements: DENMARK_REQUIREMENTS,

  insurance: {
    minimumTPL: null,
    formula:
      "Case-by-case determination by DTU Space based on mission risk profile",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Danish Outer Space Act 2016 § 8 — mandatory third-party liability insurance; " +
      "amount determined by the competent authority. The Danish State exercises recourse " +
      "against operators for international liability payments made on their behalf.",
  },

  complianceMatrixFormat: {
    statusValues: [
      "C (Compliant)",
      "NC (Non-Compliant)",
      "PC (Partially Compliant)",
      "NA (Not Applicable)",
    ],
    columns: [
      "Requirement",
      "Legal Basis",
      "EU Space Act Art.",
      "Status",
      "Evidence",
      "Comment",
    ],
    language: "en",
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
        "DTU Space accepts ESA DRAMA or equivalent propagation tools — no Danish-specific tool required.",
      mandatory: false,
    },
  ],

  acceptedEvidence: [
    {
      type: "ISO_27001_CERT",
      description:
        "ISO/IEC 27001:2022 certification accepted as evidence of NIS2 cybersecurity " +
        "compliance by Danish authorities.",
      acceptedAsShortcut: true,
    },
    {
      type: "IADC_COMPLIANCE_REPORT",
      description:
        "Technical report demonstrating compliance with IADC Space Debris Mitigation " +
        "Guidelines Rev.2. Primary debris compliance evidence accepted by DTU Space.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Certificate of third-party liability insurance confirming coverage amount and " +
        "policy term as required by Danish Outer Space Act § 8.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    DMP: {
      depthExpectation: "standard",
      specificRequirements: [
        "Reference Danish Outer Space Act 2016 § 5 as the legal basis for debris obligations",
        "Apply IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) as primary standard",
        "Reference ISO 24113:2019 throughout as complementary standard",
        "Demonstrate 25-year post-mission disposal compliance for LEO orbits",
        "Include passivation plan for all stored energy sources",
        "Address ground station operations in Greenland/Denmark where applicable",
        "English-language documentation is acceptable and preferred for DTU Space review",
      ],
      commonRejectionReasons: [
        "No reference to Danish Outer Space Act legal basis",
        "IADC Guidelines version not specified",
        "Passivation plan missing or insufficiently detailed",
        "25-year deorbit rule compliance not supported by propagation analysis",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "standard",
      specificRequirements: [
        "Submit via DTU Space per Danish Outer Space Act § 3 and BEK nr 1021 procedure",
        "Include technical description of space object, orbital parameters, mission duration",
        "Attach insurance documentation per § 8 or confirmation that coverage will be obtained",
        "Include debris mitigation plan per § 5",
        "Registration under § 7 proceeds after authorization is granted",
        "Applications may be submitted in Danish or English",
        "Note any use of Greenland ground station infrastructure",
      ],
      commonRejectionReasons: [
        "Debris mitigation plan not included in application package",
        "Insurance coverage not confirmed or amount not agreed with DTU Space",
        "Orbital parameters insufficiently specified for risk assessment",
      ],
    },
  },

  knowledgeBase: DENMARK_KNOWLEDGE_BASE,
};

// ─── Export ──────────────────────────────────────────────────────────────────

export function getDenmarkJurisdiction(): JurisdictionData {
  return DENMARK_JURISDICTION;
}
