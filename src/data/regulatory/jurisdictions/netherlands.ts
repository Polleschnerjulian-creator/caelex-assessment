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
      law: "Space Activities Act 2007 / Besluit register ruimtevoorwerpen",
      article: "Art. 5; Besluit register ruimtevoorwerpen (BWBR0022944)",
      title: "Registration of space objects",
      fullText:
        "The operator shall register every space object launched under a Dutch permit in " +
        "the Netherlands national register of space objects (established under the Besluit " +
        "register ruimtevoorwerpen, BWBR0022944). The register entry must include " +
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
      title: "Insurance obligation and liability cap",
      fullText:
        "The operator shall maintain the 'maximum possible cover' for the liability arising " +
        "from the space activities (Section 3(4)), account taken of what can reasonably be " +
        "insured; there is no fixed statutory minimum amount -- the Minister sets the required " +
        "sum per licence. Under Chapter 4 (Art. 12) the State has a right of recourse: if it must " +
        "pay compensation under Art. VII of the Outer Space Treaty or the Liability Convention it " +
        "may recover from the operator, BUT the operator's liability and the State's recourse are " +
        "CAPPED at the sum insured specified under Section 3(4).",
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
      law: "Space Activities Act 2007 / Besluit aanwijzing toezichthouders",
      article: "Art. 13(1) (BWBR0038004)",
      title: "Supervision and inspection",
      fullText:
        "RDI inspectors are charged with supervision of compliance under Art. 13(1) of the Act " +
        "(Besluit aanwijzing toezichthouders, BWBR0038004, in force 1 Jan 2023). " +
        "Operators must provide access to facilities, systems, and records upon request and " +
        "notify the regulator without undue delay of: anomalies materially affecting mission " +
        "safety; loss of command and control; unplanned manoeuvres; and cybersecurity incidents " +
        "affecting space operations.",
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
## Netherlands Space-Activities Licensing Regime (RDI / Minister of Economic Affairs)

### Legal Framework
- Space Activities Act 2007 (Wet ruimtevaartactiviteiten, BWBR0021418; in force 1 Jan 2008; consolidated text 1 July 2025): the primary act. Extended to unguided/small satellites managed from NL by the Besluit ongeleide satellieten (BWBR0036190, 2015).
- Implementing instruments: Regeling aanvraag vergunning ruimtevaartactiviteiten en registratie (BWBR0023494) + Besluit register ruimtevoorwerpen (BWBR0022944)
- The licence is issued by the Minister of Economic Affairs ("Our Minister"); licence implementation, supervision (Art. 13) and ITU notification are carried out by the RDI (Rijksinspectie Digitale Infrastructuur, formerly Agentschap Telecom until 1 Jan 2023). NSO is the national space agency for policy/programmes, NOT the licence issuer.
- Netherlands is a state party to all five UN space treaties (incl. the Moon Agreement, ratified 17 Feb 1983 -- the only major space-faring nation fully bound)

### Key Characteristics
- No fixed statutory minimum insurance amount: the Minister sets the required 'maximum possible cover' per licence (Section 3(4))
- Operator liability and the State's right of recourse are CAPPED at the sum insured (Art. 12) -- NOT unlimited. No government backstop; instead the State has a right of recourse against the operator up to the sum insured.
- Risk-based, proportionate approach: NSO tailors permit conditions to mission risk profile
- Small satellite and constellation operators report NSO as having relatively pragmatic, accessible process

### Permit Application Process
1. Pre-application contact with RDI recommended for novel missions; apply at least 6 months ahead (business.gov.nl)
2. The space-activities licence application is handled by the RDI on behalf of the Minister of Economic Affairs
3. Technical review: DMP, insurance, registration plan, operational safety case
4. The Ministry/RDI consults other bodies (e.g. Ministry of Defence, SRON/NSO) where needed
5. Licence issued with conditions; plan for a multi-month process for straightforward missions

### Debris Mitigation Expectations
NSO applies IADC Guidelines Rev.2 as the primary reference:
- 25-year de-orbit rule for LEO
- 1:10,000 casualty risk threshold for uncontrolled re-entry
- Passivation of stored energy sources
- Collision avoidance capability required
- DRAMA (ESA) or NASA DAS accepted for orbital lifetime and casualty risk analysis

### Cybersecurity (NIS2 Context)
- NIS2 transposition (Cyberbeveiligingswet, Cbw, replacing the Wbni) was passed by the Tweede Kamer on 15 April 2026 and is pending the Eerste Kamer; entry into force targeted for Q2 2026 -- NOT yet formally in force as of mid-2026. The Wbni remains applicable until then.
- NCSC-NL (Nationaal Cyber Security Centrum) is the national cybersecurity authority
- Once the Cbw is in force, space operators above the NIS2 size threshold register with NCSC-NL and report significant incidents
- The regulator (RDI) may impose cybersecurity permit conditions referencing NCSC-NL guidelines and IEC 62443

### Compliance Matrix Format
NSO does not prescribe a mandatory matrix format. Industry standard:
- Language: English or Dutch (English accepted for international operators)
- Status: Compliant / Non-Compliant / Partial / N-A
- Columns: Requirement | Regulatory Basis | Status | Document Reference | Comment
`;

function buildKnowledgeBase(): string {
  return [
    "## NETHERLANDS SPACE-ACTIVITIES REGULATORY KNOWLEDGE (RDI / Minister of Economic Affairs)",
    "",
    "The following knowledge reflects the Netherlands Space Activities Act 2007 licensing regime. " +
      "Apply this knowledge when generating documents for operators licensed under the Dutch Space " +
      "Activities Act (licence issued by the Minister of Economic Affairs, implemented by the RDI).",
    "",
    KNOWLEDGE_NSO,
  ].join("\n");
}

// ─── Jurisdiction Data ────────────────────────────────────────────────────────

const NETHERLANDS_JURISDICTION: JurisdictionData = {
  code: "NL",
  name: "Netherlands",

  nca: {
    name: "RDI",
    fullName:
      "Rijksinspectie Digitale Infrastructuur (Dutch Authority for Digital Infrastructure), acting for the Minister of Economic Affairs (the de jure licensing authority). NSO (Netherlands Space Office) is the national space agency for policy/programmes, NOT the licence issuer.",
    website: "https://www.rdi.nl/onderwerpen/ruimtevaart",
    language: "nl",
    executiveSummaryLanguage: "en",
  },

  spaceLaw: {
    name: "Space Activities Act 2007 (Wet ruimtevaartactiviteiten)",
    citation:
      "Wet van 24 januari 2007, houdende regels omtrent ruimtevaartactiviteiten en de instelling van een register van ruimtevoorwerpen (BWBR0021418); in force 1 Jan 2008; consolidated text valid from 1 July 2025",
    yearEnacted: 2007,
    yearAmended: 2015,
    status: "enacted",
    url: "https://wetten.overheid.nl/BWBR0021418/2025-07-01",
  },

  additionalLaws: [
    {
      name: "Regeling aanvraag vergunning ruimtevaartactiviteiten en registratie",
      citation:
        "Ministerial regulation (BWBR0023494), under Art. 4(2)-(3) of the Act",
      scope:
        "Application/permit and registration procedure, technical standards, insurance, " +
        "debris mitigation and supervisory obligations under the Space Activities Act 2007.",
      status: "enacted",
    },
    {
      name: "Besluit register ruimtevoorwerpen",
      citation: "Decree (BWBR0022944)",
      scope:
        "Legal basis and structure of the national register of space objects (the grondslag " +
        "cited by the registration Regeling).",
      status: "enacted",
    },
    {
      name: "Besluit ongeleide satellieten",
      citation:
        "Decree of 19 Jan 2015 (Stb. 2015, 18; BWBR0036190), in force 1 July 2015",
      scope:
        "Extends the Act to the remote management, from the Netherlands via a communication " +
        "link, of an unguided (non-steerable) space object -- i.e. small/unguided satellites.",
      status: "enacted",
    },
  ],

  requirements: NL_REQUIREMENTS,

  insurance: {
    minimumTPL: null,
    formula:
      "No fixed statutory minimum. The Minister sets the required 'maximum possible cover' per " +
      "licence (Section 3(4)), account taken of what can reasonably be insured. Operator " +
      "liability and the State's right of recourse are CAPPED at the sum insured (Art. 12) -- " +
      "i.e. not unlimited; the ceiling is the (per-licence, non-fixed) sum insured. No government " +
      "backstop; instead the State has a right of recourse against the operator.",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Wet ruimtevaartactiviteiten, Section 3(4) (cover) and Art. 12 (recourse/cap)",
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
