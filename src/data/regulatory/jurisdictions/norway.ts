/**
 * Norway / NOSA — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Norwegian Space Activities Act (Lov om Norsk Romsenter, LOV-1994-11-11-13)
 * - Regulations on Space Activities (FOR-1997-09-01-1021)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - NIS2 Directive (EU) 2022/2555 — applicable to Norway via EEA Agreement
 * - ISO 24113:2019 Space systems — Space debris mitigation requirements
 *
 * NOTE: Norway is NOT an EU Member State but is a member of the European Economic
 * Area (EEA). NIS2 Directive obligations apply to Norway via EEA Agreement
 * incorporation. Norway will also be affected by the EU Space Act proposal via
 * EEA once enacted, though EEA incorporation requires a separate EEA Joint
 * Committee Decision.
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ──────────────────────────────────────────────────

const NORWAY_REQUIREMENTS: NationalRequirement[] = [
  {
    id: "no-space-act-authorization",
    nationalRef: {
      law: "Norwegian Space Activities Act",
      article: "§ 2",
      title: "Authorization Requirement for Space Activities",
      fullText:
        "Norwegian nationals and Norwegian legal entities must obtain authorization from the " +
        "King (delegated to the Ministry of Trade, Industry and Fisheries and administered by " +
        "NOSA — Norwegian Space Agency) before launching or operating space objects. " +
        "Authorization is also required for launches from Norwegian territory. Applications must " +
        "include a description of the space activity, technical specifications of the space " +
        "object, identification of the launch vehicle and launch site, debris mitigation plan, " +
        "and evidence of insurance coverage. Conditions may be attached to the authorization " +
        "and it may be revoked if the conditions are not met.",
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
      confidence: "partial",
    },
    category: "authorization",
  },
  {
    id: "no-space-act-registration",
    nationalRef: {
      law: "Norwegian Space Activities Act",
      article: "§ 5",
      title: "Registration of Norwegian Space Objects",
      fullText:
        "Norwegian operators must register authorized space objects in the Norwegian national " +
        "space object registry maintained by NOSA. Registration information must include the " +
        "name of the launching state, the name and address of the operator, the launch date " +
        "and launch vehicle, orbital parameters (apogee, perigee, inclination, orbital period), " +
        "and the general function of the space object. Norway notifies the UN Secretary-General " +
        "of registered objects in accordance with the UN Registration Convention " +
        "(UNGA Res. 3235 (XXIX)). Operators must notify NOSA of any significant changes to " +
        "registration data, including orbital maneuvers affecting nominal parameters.",
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
      confidence: "partial",
    },
    category: "registration",
  },
  {
    id: "no-space-act-liability-insurance",
    nationalRef: {
      law: "Norwegian Space Activities Act",
      article: "§ 7",
      title: "Liability and Mandatory Insurance",
      fullText:
        "Norwegian operators are liable for damage caused by their space activities consistent " +
        "with Norway's obligations under the Liability Convention (1972) and the Outer Space " +
        "Treaty (1967). Operators must maintain adequate third-party liability insurance or " +
        "provide equivalent financial security. The Norwegian State exercises recourse against " +
        "the operator for any liability payments made on their behalf under international treaty " +
        "obligations. NOSA determines the required coverage amount based on the risk profile " +
        "of the specific space activity. Insurance documentation must be submitted as part of " +
        "the authorization application and maintained for the full operational period.",
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
      confidence: "partial",
    },
    category: "insurance",
  },
  {
    id: "no-space-act-debris-mitigation",
    nationalRef: {
      law: "Norwegian Space Activities Act / FOR-1997-09-01-1021",
      article: "§ 3 / § 4",
      title: "Space Debris Mitigation and Operational Safety",
      fullText:
        "Norwegian space operators must conduct their activities in a manner that does not " +
        "unnecessarily endanger persons, property, or the space environment. NOSA applies the " +
        "IADC Space Debris Mitigation Guidelines Rev.2 and ISO 24113:2019 as the technical " +
        "baseline for assessing authorization applications. Operators must demonstrate: " +
        "passivation of all stored energy sources at end-of-life; post-mission disposal " +
        "strategy compliant with the 25-year LEO deorbit rule; avoidance of intentional debris " +
        "release; and collision avoidance capability. Norway's Regulations on Space Activities " +
        "(FOR-1997-09-01-1021) specify that authorization conditions may include specific " +
        "technical requirements determined by NOSA on a case-by-case basis.",
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
      confidence: "partial",
    },
    category: "debris",
  },
];

// ─── Knowledge Base ─────────────────────────────────────────────────────────

const NORWAY_KNOWLEDGE_BASE = `
## NORWAY (NOSA) — REGULATORY KNOWLEDGE BASE

### NCA Overview
NOSA (Norwegian Space Agency — Norsk Romsenter) is Norway's national space agency and
competent authority for space activities. NOSA administers the authorization regime under
the Norwegian Space Activities Act, maintains the national space registry, and advises
the Ministry of Trade, Industry and Fisheries on space policy.

Website: https://www.romsenter.no

### Norway's EEA Status — Critical Context
NORWAY IS NOT AN EU MEMBER STATE. Norway is a member of the European Economic Area (EEA)
under the EEA Agreement. This has important regulatory implications:

1. NIS2 Directive (EU) 2022/2555: The NIS2 Directive has been incorporated into the EEA
   Agreement and is applicable in Norway. Norwegian space operators meeting the size and
   sector thresholds are subject to NIS2 obligations, transposed into Norwegian law via
   the Sikkerhetsloven amendments and a dedicated NIS2 implementing regulation.
   The National Security Authority (Nasjonal sikkerhetsmyndighet, NSM) is the primary
   NIS2 supervisory authority in Norway.

2. EU Space Act (COM(2025) 335): Once enacted, the EU Space Act would need a separate
   EEA Joint Committee Decision to become applicable in Norway. This process typically
   takes 12–24 months after EU enactment. Until incorporated, Norwegian operators are
   not directly subject to EU Space Act requirements but should anticipate incorporation
   given Norway's EEA commitments. Operators planning EU-market activities should comply
   voluntarily as a matter of prudence.

3. EU Regulations generally: Norway participates in EASA, ESA, Galileo, Copernicus,
   and other EU space programs via separate agreements and EEA/Framework Agreements.

### Norwegian Space Activities Act (LOV-1994-11-11-13)
The Norwegian Space Activities Act was enacted in 1994 and supplemented by Regulations on
Space Activities (FOR-1997-09-01-1021). This relatively concise legal framework establishes
the authorization requirement, liability regime, and registration obligations. NOSA has been
modernizing its procedures and actively updates its guidance for commercial operators.

### Insurance Requirements
NOSA determines insurance requirements on a case-by-case basis. There is no statutory
minimum figure in the Space Activities Act. In practice, NOSA has aligned coverage
expectations with comparable EEA jurisdictions. Commercial small satellite operators
should anticipate requirements in the range of EUR 20M–60M depending on mission profile.

### Cybersecurity — NIS2 via EEA
NIS2 obligations apply to Norwegian space operators via EEA incorporation. NSM
(Nasjonal sikkerhetsmyndighet) is the competent supervisory authority. Key obligations:
- Risk management and technical security measures per NIS2 Art. 21
- Incident reporting: 24h early warning, 72h notification, 1-month final report to NSM
- Supply chain security
- Multi-factor authentication
Norwegian-language incident reports are standard for NSM submissions, though English
is accepted in practice for international operators.

### Andøya Spaceport and Launch Activities
Norway operates Andøya Space (formerly Andøya Rocket Range), the first operational
orbital launch site in continental Europe. Operators using Andøya for launch services
must obtain separate launch site approvals under Norwegian law in addition to authorization
for the space object itself. NOSA coordinates closely with Andøya Space on launch safety.

### Debris Mitigation Standards
NOSA applies IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) and
ISO 24113:2019. ESA DRAMA or equivalent tools are accepted for orbital lifetime analysis.
No Norwegian-specific debris tool is mandated.

### EU Space Act and EEA Incorporation Timeline
Norway has historically incorporated EU space-related legislation within 12–24 months of
EU enactment. Operators should monitor EEA Joint Committee Decisions closely. NOSA and
the Ministry of Trade, Industry and Fisheries are the responsible Norwegian bodies for
EU Space Act EEA incorporation preparatory work.
`.trim();

// ─── Jurisdiction Data ───────────────────────────────────────────────────────

const NORWAY_JURISDICTION: JurisdictionData = {
  code: "NO",
  name: "Norway",

  nca: {
    name: "NOSA",
    fullName: "Norwegian Space Agency (Norsk Romsenter)",
    website: "https://www.romsenter.no",
    language: "no",
    executiveSummaryLanguage: "en",
  },

  spaceLaw: {
    name: "Norwegian Space Activities Act",
    citation:
      "LOV-1994-11-11-13; FOR-1997-09-01-1021 (Regulations on Space Activities)",
    yearEnacted: 1994,
    yearAmended: 1997,
    status: "enacted",
    url: "https://lovdata.no/dokument/NL/lov/1994-11-11-13",
  },

  additionalLaws: [
    {
      name: "Regulations on Space Activities",
      citation: "FOR-1997-09-01-1021",
      scope:
        "Implementing regulation specifying procedural requirements for authorization " +
        "applications, conditions, and supervision under the Norwegian Space Activities Act",
      status: "enacted",
    },
    {
      name: "NIS2 Directive (EEA) — Norwegian transposition",
      citation:
        "EEA Agreement Annex XI (incorporated); Norwegian implementing regulation",
      scope:
        "Cybersecurity obligations for essential and important entities including space operators; " +
        "NIS2 applicable via EEA Agreement — Norway is EEA, NOT EU; " +
        "NSM (Nasjonal sikkerhetsmyndighet) as supervisory authority",
      status: "enacted",
    },
  ],

  requirements: NORWAY_REQUIREMENTS,

  insurance: {
    minimumTPL: null,
    formula: "Case-by-case determination by NOSA based on mission risk profile",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Norwegian Space Activities Act § 7 — mandatory third-party liability insurance or " +
      "equivalent financial security; amount set by NOSA. Norwegian State exercises recourse " +
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
      "Legal Basis (Norwegian)",
      "NIS2 / International Standard",
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
        "NOSA accepts ESA DRAMA or equivalent propagation tools — no Norwegian-specific tool required.",
      mandatory: false,
    },
  ],

  acceptedEvidence: [
    {
      type: "ISO_27001_CERT",
      description:
        "ISO/IEC 27001:2022 certification accepted as evidence of NIS2 cybersecurity " +
        "compliance. NIS2 applies in Norway via EEA Agreement; NSM is the supervisory authority.",
      acceptedAsShortcut: true,
    },
    {
      type: "IADC_COMPLIANCE_REPORT",
      description:
        "Technical report demonstrating compliance with IADC Space Debris Mitigation " +
        "Guidelines Rev.2. Primary debris compliance evidence accepted by NOSA.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Certificate of third-party liability insurance or equivalent financial security " +
        "confirming coverage amount agreed with NOSA per Norwegian Space Activities Act § 7.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    DMP: {
      depthExpectation: "standard",
      specificRequirements: [
        "Reference Norwegian Space Activities Act (LOV-1994-11-11-13) § 3 as legal basis",
        "Apply IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020) as primary standard",
        "Reference ISO 24113:2019 throughout as complementary standard",
        "Demonstrate 25-year post-mission disposal compliance for LEO orbits",
        "Include passivation plan for all stored energy sources",
        "Note EEA status where relevant: NIS2 applies via EEA; EU Space Act not yet incorporated",
        "English documentation is standard and preferred for NOSA review",
        "ESA DRAMA suite accepted for orbital lifetime analysis",
      ],
      commonRejectionReasons: [
        "No reference to Norwegian Space Activities Act legal basis",
        "Passivation plan missing or insufficient",
        "25-year deorbit rule compliance not demonstrated with analysis",
        "IADC Guidelines version not specified",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "standard",
      specificRequirements: [
        "Submit to NOSA per Norwegian Space Activities Act § 2 procedure",
        "Include full technical description of space object and mission parameters",
        "Attach insurance documentation or commitment per § 7",
        "Include Debris Mitigation Plan",
        "Confirm whether launch is from Andøya or another launch site — separate approvals may apply",
        "Registration under § 5 proceeds after authorization approval",
        "Applications may be in English or Norwegian; NOSA correspondence is typically in English for international operators",
        "Note Norway's EEA status in regulatory context section — not EU Member State",
      ],
      commonRejectionReasons: [
        "Insurance coverage amount not agreed with NOSA in advance",
        "Debris mitigation plan not submitted with application",
        "Launch site authorization not addressed where applicable (e.g., Andøya launches)",
        "Confusion of Norway with EU Member State — EEA status must be correctly characterized",
      ],
    },
  },

  knowledgeBase: NORWAY_KNOWLEDGE_BASE,
};

// ─── Export ──────────────────────────────────────────────────────────────────

export function getNorwayJurisdiction(): JurisdictionData {
  return NORWAY_JURISDICTION;
}
