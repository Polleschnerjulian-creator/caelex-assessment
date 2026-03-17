/**
 * Luxembourg / LSA — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Space Activities Act 2020 (Loi du 15 décembre 2020 relative aux activités spatiales
 *   et à diverses mesures liées à la souveraineté nationale dans l'espace extra-atmosphérique),
 *   Mémorial A 2020, 1189
 * - SpaceResources.lu Act 2017 (Loi du 20 juillet 2017 sur l'exploration et l'utilisation
 *   des ressources de l'espace), Mémorial A 2017, 674
 * - Luxembourg Space Agency (LSA) — Licensing Guidelines (2021)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - Liability Convention 1972
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ─────────────────────────────────────────────────

const LU_REQUIREMENTS: NationalRequirement[] = [
  // ── Authorization (SAA 2020, Art. 4-8) ──
  {
    id: "LU-SAA2020-4",
    nationalRef: {
      law: "Space Activities Act 2020",
      article: "Art. 4",
      title: "Authorisation requirement",
      fullText:
        "Any natural or legal person having a registered office, central administration, or " +
        "principal place of business in Luxembourg who intends to carry out space activities " +
        "must obtain prior authorisation from the Government. Space activities include the " +
        "launching, operation, and return of space objects, as well as the exploration and " +
        "utilisation of space resources. The Luxembourg Space Agency (LSA) processes " +
        "authorisation applications and advises the Government.",
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

  // ── Registration (SAA 2020, Art. 14) ──
  {
    id: "LU-SAA2020-14",
    nationalRef: {
      law: "Space Activities Act 2020",
      article: "Art. 14",
      title: "Registration of space objects",
      fullText:
        "The Grand Duchy of Luxembourg shall register every space object launched under a " +
        "Luxembourg authorisation with the national register maintained by LSA and shall " +
        "communicate registration data to the United Nations Secretary-General in accordance " +
        "with the Registration Convention 1975. Operators must provide orbital parameters, " +
        "launching state, date of launch, and general function within 60 days of launch.",
    },
    standardsMapping: [
      {
        framework: "Registration Convention 1975",
        reference: "Art. II, IV",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 44-50",
      confidence: "direct",
    },
    category: "registration",
  },

  // ── Insurance (SAA 2020, Art. 10) ──
  {
    id: "LU-SAA2020-10",
    nationalRef: {
      law: "Space Activities Act 2020",
      article: "Art. 10",
      title: "Insurance obligation",
      fullText:
        "An authorised operator must maintain third-party liability insurance in an amount " +
        "determined by the LSA, taking into account the nature and risk profile of the space " +
        "activity. There is no fixed statutory minimum; LSA sets the required coverage amount " +
        "on a per-authorisation basis. The Government may provide a financial guarantee for " +
        "risk exceeding the commercially insurable limit, subject to a Government Guarantee " +
        "Agreement with the operator.",
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

  // ── Debris Mitigation (SAA 2020, Art. 7 conditions) ──
  {
    id: "LU-SAA2020-7-DM",
    nationalRef: {
      law: "Space Activities Act 2020",
      article: "Art. 7 + LSA Technical Conditions",
      title:
        "Authorisation conditions — debris mitigation and operational safety",
      fullText:
        "LSA imposes authorisation conditions consistent with internationally recognised debris " +
        "mitigation guidelines (IADC Guidelines Rev.2, ISO 24113:2019). Conditions include: " +
        "probability of on-orbit fragmentation below accepted thresholds; passivation of all " +
        "stored energy sources at end-of-life; post-mission disposal within 25 years for LEO; " +
        "collision avoidance capability; and uncontrolled re-entry casualty risk below 1:10,000. " +
        "A Debris Mitigation Plan (DMP) is required as part of the authorisation application.",
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

  // ── SpaceResources.lu — ISRU Authorisation (SRA 2017, Art. 1-4) ──
  {
    id: "LU-SRA2017-1",
    nationalRef: {
      law: "SpaceResources.lu Act 2017",
      article: "Art. 1-4",
      title: "Right to explore and utilise space resources",
      fullText:
        "Under the SpaceResources.lu Act 2017, Luxembourg acknowledges that space resources " +
        "are capable of being appropriated and that operators authorised by the Luxembourg " +
        "Government may explore for and utilise space resources. An operator wishing to carry " +
        "out in-situ resource utilisation (ISRU) activities must obtain a specific authorisation " +
        "from the Government under the 2017 Act and must comply with the Outer Space Treaty 1967 " +
        "Art. II (non-appropriation of celestial bodies). The authorisation covers mission " +
        "planning, extraction operations, and environmental protection of the space environment.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. I, II, VI",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 104-110",
      confidence: "inferred",
    },
    category: "authorization",
  },
];

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const KNOWLEDGE_LSA = `
## Luxembourg Space Agency (LSA) — Licensing Regime

### Legal Framework
- Space Activities Act 2020 (SAA 2020): primary legislation replacing the 2017 national space law;
  Loi du 15 décembre 2020 relative aux activités spatiales, Mémorial A 2020, 1189
- SpaceResources.lu Act 2017 (SRA 2017): world's first national law explicitly recognising
  operator rights to space resources; Loi du 20 juillet 2017, Mémorial A 2017, 674
- LSA (Luxembourg Space Agency): competent authority, established 2018; processes authorisations
  and advises the Government (Ministry responsible for space: Ministry of the Economy)
- Luxembourg is a state party to all five UN space treaties

### Key Characteristics
- Business-friendly regime designed to attract new space operators and ISRU ventures
- No fixed statutory minimum insurance: LSA determines coverage per authorisation
- Government financial guarantee available for risk exceeding the commercially insurable limit
- Full operator liability (no operator liability cap in statute); Government guarantee covers the excess
- Two separate authorisation tracks: (1) standard space activities under SAA 2020;
  (2) space resource utilisation under SRA 2017 (additional ISRU-specific conditions)
- Fast-track process available for low-risk small satellite missions (typically 2-3 months)

### SpaceResources.lu (ISRU) — Special Provisions
SRA 2017 establishes that Luxembourg operators may appropriate, own, and use space resources
extracted from celestial bodies, consistent with Outer Space Treaty Art. II (no claim of
sovereignty over celestial bodies, but resources can be owned).
Conditions for ISRU authorisation under Art. 1-4 of SRA 2017:
  1. Environmental protection plan: minimise contamination of the celestial body
  2. Mission safety case: failure mode analysis for extraction systems
  3. Coordination with international partners where activities may affect their operations
  4. Reporting obligations: regular mission status reports to LSA, including resource extraction volumes
Note: SRA 2017 pre-dates the EU Space Act proposal; Art. 104-110 of the EU Space Act proposal
addresses space resource activities but is currently inferred mapping only (not a direct codification).

### Authorisation Process (SAA 2020)
1. Pre-application consultation with LSA recommended for novel missions
2. Application submitted to LSA with technical dossier, financial and insurance documentation
3. LSA technical review; DMP and orbital lifetime analysis required
4. Government authorisation issued with conditions; typical timeline 2-4 months
5. Annual compliance reports to LSA; anomaly notification within 48 hours

### Debris Mitigation Expectations
LSA applies IADC Guidelines Rev.2 and ISO 24113:2019:
- 25-year de-orbit rule for LEO (NASA DAS or ESA DRAMA accepted)
- 1:10,000 casualty risk threshold for re-entry
- Passivation of stored energy sources
- Collision avoidance capability required

### Cybersecurity
- Luxembourg NIS2 transposition: Loi du 27 septembre 2024 relative à la cybersécurité
- CIRCL (Computer Incident Response Centre Luxembourg) and ILR (Institut Luxembourgeois de Régulation) are the competent authorities
- Space operators above NIS2 size threshold must register with ILR and report significant cyber incidents
- LSA may cross-reference ILR cybersecurity guidance in authorisation conditions

### Compliance Matrix Format
LSA does not prescribe a mandatory template. Recommended approach:
- Language: English or French
- Status: Compliant / Non-Compliant / Partial / N-A
- Columns: Requirement | Regulatory Basis | Status | Document Reference | Comment
`;

function buildKnowledgeBase(): string {
  return [
    "## LSA (LUXEMBOURG SPACE AGENCY) — REGULATORY KNOWLEDGE",
    "",
    "The following knowledge reflects the Space Activities Act 2020 and SpaceResources.lu Act 2017 " +
      "licensing regime. Apply this knowledge when generating documents for LSA-authorised operators.",
    "",
    KNOWLEDGE_LSA,
  ].join("\n");
}

// ─── Jurisdiction Data ────────────────────────────────────────────────────────

const LUXEMBOURG_JURISDICTION: JurisdictionData = {
  code: "LU",
  name: "Luxembourg",

  nca: {
    name: "LSA",
    fullName: "Luxembourg Space Agency (Agence Spatiale Luxembourgeoise)",
    website: "https://space.lu",
    language: "fr",
    executiveSummaryLanguage: "en",
  },

  spaceLaw: {
    name: "Space Activities Act 2020",
    citation:
      "Loi du 15 décembre 2020 relative aux activités spatiales et à diverses mesures liées " +
      "à la souveraineté nationale dans l'espace extra-atmosphérique, Mémorial A 2020, No. 1189",
    yearEnacted: 2020,
    yearAmended: null,
    status: "enacted",
    url: "https://legilux.public.lu/eli/etat/leg/loi/2020/12/15/a1189/jo",
  },

  additionalLaws: [
    {
      name: "SpaceResources.lu Act 2017",
      citation:
        "Loi du 20 juillet 2017 sur l'exploration et l'utilisation des ressources de l'espace, " +
        "Mémorial A 2017, No. 674",
      scope:
        "World's first national law explicitly recognising operator rights to explore and utilise " +
        "space resources (in-situ resource utilisation / ISRU). Establishes separate authorisation " +
        "track for space mining and resource extraction missions.",
      status: "enacted",
    },
    {
      name: "Luxembourg NIS2 Transposition",
      citation:
        "Loi du 27 septembre 2024 relative à la cybersécurité (transposition of Directive 2022/2555)",
      scope:
        "Cybersecurity obligations for essential and important entities including space operators. " +
        "Designates ILR (Institut Luxembourgeois de Régulation) as competent authority for space sector.",
      status: "enacted",
    },
  ],

  requirements: LU_REQUIREMENTS,

  insurance: {
    minimumTPL: null,
    formula:
      "No fixed minimum. LSA determines required coverage per authorisation based on mission " +
      "risk profile. Government financial guarantee may be available for risk exceeding the " +
      "commercially insurable limit, subject to a Government Guarantee Agreement.",
    cap: null,
    governmentGuarantee: true,
    legalBasis:
      "Space Activities Act 2020, Art. 10; LSA Licensing Guidelines 2021",
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
        "Mandatory annex to LSA authorisation application.",
      acceptedAsShortcut: false,
    },
    {
      type: "ORBITAL_LIFETIME_ANALYSIS",
      description:
        "Orbital lifetime analysis demonstrating ≤25-year de-orbit. NASA DAS or ESA DRAMA accepted.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Third-party liability insurance certificate or Government Guarantee Agreement. " +
        "Coverage amount determined by LSA per mission.",
      acceptedAsShortcut: false,
    },
    {
      type: "ISRU_MISSION_PLAN",
      description:
        "For space resource utilisation missions: detailed ISRU mission plan covering " +
        "extraction operations, environmental protection of the celestial body, and " +
        "coordination with international operators. Required under SRA 2017 Art. 1-4.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {},

  knowledgeBase: buildKnowledgeBase(),
};

export function getLuxembourgJurisdiction(): JurisdictionData {
  return LUXEMBOURG_JURISDICTION;
}
