/**
 * Netherlands / NSO — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Wet Ruimtevaartactiviteiten (Space Activities Act 2007), Staatsblad 2007, 444
 * - Netherlands Space Office (NSO) — Licensing guidance (2022)
 * - Regeling ruimtevaartactiviteiten (Space Activities Regulation, ministerial decree)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - COSPAR Panel on Planetary Protection Policy (for operator registration)
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ─────────────────────────────────────────────────

const NL_REQUIREMENTS: NationalRequirement[] = [
  // ── Authorization (Art. 3) ──
  {
    id: "NL-SAA-3",
    nationalRef: {
      law: "Space Activities Act 2007",
      article: "Art. 3",
      title: "Authorisation requirement",
      fullText:
        "It is prohibited to carry out space activities without a permit issued by Our Minister. " +
        "Space activities means any activity relating to the launching of objects into outer space, " +
        "the piloting of objects in outer space, or the return of objects from outer space to Earth. " +
        "The prohibition applies to Dutch nationals and to legal entities established in the Netherlands, " +
        "wherever the activity is carried out.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI",
        relationship: "implements",
      },
      {
        framework: "Liability Convention 1972",
        reference: "Art. II",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 8-12",
      confidence: "direct",
    },
    category: "authorization",
  },

  // ── Registration (Art. 5) ──
  {
    id: "NL-SAA-5",
    nationalRef: {
      law: "Space Activities Act 2007",
      article: "Art. 5",
      title: "Registration of space objects",
      fullText:
        "The operator shall register every space object launched under a Dutch permit with " +
        "the Netherlands national register maintained by NSO. The register entry must include " +
        "the name of the launching state, an identifying designation or registration number, " +
        "the date and territory of launch, basic orbital parameters, and the general function " +
        "of the space object. Registration must be performed as soon as practicable after launch.",
    },
    standardsMapping: [
      {
        framework: "Registration Convention 1975",
        reference: "Art. IV",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 44-50",
      confidence: "direct",
    },
    category: "registration",
  },

  // ── Insurance / Liability (Art. 7) ──
  {
    id: "NL-SAA-7",
    nationalRef: {
      law: "Space Activities Act 2007",
      article: "Art. 7",
      title: "Insurance obligation",
      fullText:
        "The operator shall maintain adequate third-party liability insurance or equivalent " +
        "financial guarantee for the full duration of the space activity. There is no statutory " +
        "minimum; the Minister determines the required coverage amount on a case-by-case basis " +
        "taking into account the nature, scale, and risk profile of the activity. " +
        "The Netherlands does not cap operator liability; the operator remains fully liable " +
        "without a ceiling for damage caused to third parties.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II-V",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 30-35",
      confidence: "direct",
    },
    category: "insurance",
  },

  // ── Debris Mitigation (Art. 4 conditions / Ministerial Decree) ──
  {
    id: "NL-SAA-4-DM",
    nationalRef: {
      law: "Space Activities Act 2007 / Regeling ruimtevaartactiviteiten",
      article: "Art. 4 + Ministerial Decree Ch. 3",
      title: "Permit conditions — debris mitigation and operational safety",
      fullText:
        "Permit conditions imposed under Art. 4 include compliance with internationally " +
        "recognised debris mitigation guidelines (IADC Guidelines Rev.2). Operators must " +
        "submit a Debris Mitigation Plan demonstrating: limitation of fragmentation risk; " +
        "passivation of stored energy sources at end-of-life; post-mission disposal within " +
        "25 years for LEO; collision avoidance capability; and uncontrolled re-entry casualty " +
        "risk below 1 in 10,000.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-73",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Supervision / Ongoing Compliance (Art. 9) ──
  {
    id: "NL-SAA-9",
    nationalRef: {
      law: "Space Activities Act 2007",
      article: "Art. 9",
      title: "Supervision and inspection",
      fullText:
        "NSO may designate inspectors with authority to verify compliance with permit conditions. " +
        "Operators must provide access to facilities, systems, and records upon request. " +
        "NSO must be notified without undue delay of: anomalies materially affecting mission safety; " +
        "loss of command and control; unplanned manoeuvres; and cybersecurity incidents affecting " +
        "space operations. Operators submit annual compliance reports to NSO.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive 2022/2555",
        reference: "Art. 23",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 96-103",
      confidence: "partial",
    },
    category: "supervision",
  },
];

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const KNOWLEDGE_NSO = `
## Netherlands Space Office (NSO) — Licensing Regime

### Legal Framework
- Space Activities Act 2007 (Wet Ruimtevaartactiviteiten, Stb. 2007/444): the primary act
- Regeling ruimtevaartactiviteiten: ministerial decree setting detailed permit conditions
- NSO serves as the competent authority (NCA) on behalf of the Ministry of Economic Affairs and Climate Policy
- Netherlands is a state party to all five UN space treaties

### Key Characteristics
- No fixed statutory minimum insurance amount — NSO determines coverage requirement per mission
- Full operator liability without a government cap: operators bear unlimited third-party liability
  (this is less commercially attractive than the UK/France model with government backstops)
- Risk-based, proportionate approach: NSO tailors permit conditions to mission risk profile
- Small satellite and constellation operators report NSO as having relatively pragmatic, accessible process

### Permit Application Process
1. Pre-application meeting with NSO recommended for novel missions
2. Application to NSO (submitted via Ministry of Economic Affairs portal)
3. Technical review: DMP, insurance, registration plan, operational safety case
4. NSO consults with Dutch Space Research Organisation (SRON) and Ministry of Defence where needed
5. Permit issued with conditions; typical timeline 3-6 months for straightforward missions

### Debris Mitigation Expectations
NSO applies IADC Guidelines Rev.2 as the primary reference:
- 25-year de-orbit rule for LEO
- 1:10,000 casualty risk threshold for uncontrolled re-entry
- Passivation of stored energy sources
- Collision avoidance capability required
- DRAMA (ESA) or NASA DAS accepted for orbital lifetime and casualty risk analysis

### Cybersecurity (NIS2 Context)
- Post-2024: Dutch NIS2 transposition (Cyberbeveiligingswet, Cbw) applies to qualifying space operators
- NCSC-NL (Nationaal Cyber Security Centrum) is the national cybersecurity authority
- Space operators above the NIS2 size threshold must register with NCSC-NL and report significant incidents
- NSO may impose cybersecurity permit conditions referencing NCSC-NL guidelines and IEC 62443

### Compliance Matrix Format
NSO does not prescribe a mandatory matrix format. Industry standard:
- Language: English or Dutch (English accepted for international operators)
- Status: Compliant / Non-Compliant / Partial / N-A
- Columns: Requirement | Regulatory Basis | Status | Document Reference | Comment
`;

function buildKnowledgeBase(): string {
  return [
    "## NSO (NETHERLANDS SPACE OFFICE) — REGULATORY KNOWLEDGE",
    "",
    "The following knowledge reflects the Netherlands Space Activities Act 2007 licensing regime. " +
      "Apply this knowledge when generating documents for NSO-licensed operators.",
    "",
    KNOWLEDGE_NSO,
  ].join("\n");
}

// ─── Jurisdiction Data ────────────────────────────────────────────────────────

const NETHERLANDS_JURISDICTION: JurisdictionData = {
  code: "NL",
  name: "Netherlands",

  nca: {
    name: "NSO",
    fullName: "Netherlands Space Office (Nationaal Ruimtevaart Instituut)",
    website: "https://www.spaceoffice.nl",
    language: "nl",
    executiveSummaryLanguage: "en",
  },

  spaceLaw: {
    name: "Space Activities Act 2007 (Wet Ruimtevaartactiviteiten)",
    citation:
      "Wet van 24 oktober 2007, houdende regels omtrent ruimtevaartactiviteiten, Stb. 2007/444",
    yearEnacted: 2007,
    yearAmended: null,
    status: "enacted",
    url: "https://wetten.overheid.nl/BWBR0023147",
  },

  additionalLaws: [
    {
      name: "Regeling ruimtevaartactiviteiten",
      citation: "Ministerial Decree (Stcrt. 2008/61)",
      scope:
        "Detailed permit conditions: debris mitigation, insurance requirements, technical " +
        "standards, and supervisory obligations under the Space Activities Act 2007.",
      status: "enacted",
    },
  ],

  requirements: NL_REQUIREMENTS,

  insurance: {
    minimumTPL: null,
    formula:
      "No fixed minimum. NSO determines the required coverage amount per mission based on " +
      "risk profile. Operator bears unlimited third-party liability — no government cap. " +
      "Coverage typically reflects realistic maximum probable loss for the mission.",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Space Activities Act 2007, Art. 7; Regeling ruimtevaartactiviteiten",
  },

  complianceMatrixFormat: {
    statusValues: ["Compliant", "Non-Compliant", "Partial", "N-A"],
    columns: [
      "Requirement",
      "Regulatory Basis",
      "Status",
      "Document Reference",
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

  requiredTools: [],

  acceptedEvidence: [
    {
      type: "DMP",
      description:
        "Debris Mitigation Plan referencing IADC Guidelines Rev.2 and ISO 24113:2019. " +
        "Mandatory annex to NSO permit application.",
      acceptedAsShortcut: false,
    },
    {
      type: "ORBITAL_LIFETIME_ANALYSIS",
      description:
        "Orbital lifetime analysis demonstrating ≤25-year de-orbit. ESA DRAMA or " +
        "NASA DAS output accepted.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Third-party liability insurance certificate or equivalent financial guarantee. " +
        "Coverage amount determined by NSO per mission.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {},

  knowledgeBase: buildKnowledgeBase(),
};

export function getNetherlandsJurisdiction(): JurisdictionData {
  return NETHERLANDS_JURISDICTION;
}
