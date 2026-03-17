/**
 * Belgium / BELSPO — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Belgian Law on Activities in Outer Space (Loi relative aux activites spatiales /
 *   Wet betreffende de ruimteactiviteiten), 17 September 2005
 *   (Belgian Official Gazette / Belgisch Staatsblad, 20 October 2005)
 * - Royal Decree implementing the 2005 Act (Arrêté royal du 18 janvier 2008)
 * - BELSPO (Belgian Science Policy Office) — licensing guidance
 * - Liability Convention 1972 (Convention on International Liability for Damage Caused
 *   by Space Objects)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ─────────────────────────────────────────────────

const BE_REQUIREMENTS: NationalRequirement[] = [
  // ── Authorization (Art. 4) ──
  {
    id: "BE-LSA-4",
    nationalRef: {
      law: "Belgian Law on Activities in Outer Space 2005",
      article: "Art. 4",
      title: "Authorisation requirement",
      fullText:
        "Any natural or legal person established in Belgium who intends to carry out a " +
        "space activity must obtain prior authorisation from the competent minister. " +
        "Space activity is defined as the launching, guiding, and return of a space object. " +
        "The authorisation requirement extends to Belgian nationals carrying out space " +
        "activities outside Belgian territory. BELSPO assesses the application and " +
        "advises the minister on the technical and financial fitness of the applicant.",
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

  // ── Registration (Art. 8) ──
  {
    id: "BE-LSA-8",
    nationalRef: {
      law: "Belgian Law on Activities in Outer Space 2005",
      article: "Art. 8",
      title: "Registration of space objects",
      fullText:
        "The Belgian State shall register every space object launched under a Belgian " +
        "authorisation with the national register maintained by BELSPO, and shall " +
        "communicate the registration to the United Nations Secretary-General in " +
        "accordance with the Registration Convention 1975. The operator must supply " +
        "all information required for registration, including orbital parameters, " +
        "launching state designation, date of launch, and general function.",
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

  // ── Liability (Art. 9-11) ──
  {
    id: "BE-LSA-9",
    nationalRef: {
      law: "Belgian Law on Activities in Outer Space 2005",
      article: "Art. 9",
      title: "Operator liability — Liability Convention implementation",
      fullText:
        "An authorised operator is fully and exclusively liable to the Belgian State " +
        "for any damage caused to third parties on the surface of the Earth or in the " +
        "airspace, in accordance with the absolute liability regime of the Liability " +
        "Convention 1972. In outer space, liability is fault-based. The operator must " +
        "indemnify the Belgian State for any sum the Belgian State is required to pay " +
        "under the Liability Convention as a result of the operator's space activities.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II, III",
        relationship: "implements",
      },
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VII",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 26-35",
      confidence: "direct",
    },
    category: "insurance",
  },

  // ── Debris Mitigation (Art. 5 conditions) ──
  {
    id: "BE-LSA-5-DM",
    nationalRef: {
      law: "Belgian Law on Activities in Outer Space 2005 / Royal Decree 2008",
      article: "Art. 5 + Royal Decree Art. 6",
      title:
        "Authorisation conditions — debris mitigation and operational safety",
      fullText:
        "Authorisation conditions imposed by BELSPO under Art. 5 and the Royal Decree " +
        "include adherence to internationally recognised debris mitigation guidelines " +
        "(IADC Guidelines Rev.2 and ISO 24113:2019). The operator must submit a technical " +
        "dossier demonstrating: limitation of fragmentation probability; passivation of " +
        "stored energy at end-of-life; post-mission disposal within 25 years for LEO; " +
        "collision avoidance procedures; and re-entry casualty risk below 1:10,000.",
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

  // ── Cybersecurity / NIS2 (Supervisory condition) ──
  {
    id: "BE-NIS2-CCN",
    nationalRef: {
      law: "Belgian NIS2 Transposition (Loi du 26 avril 2024)",
      article: "Art. 21 / CCN Sector Guidance",
      title: "Cybersecurity obligations for space operators",
      fullText:
        "Following Belgian transposition of the NIS2 Directive (Loi du 26 avril 2024 " +
        "relative à la cybersécurité), space operators classified as essential or important " +
        "entities must implement risk management measures covering: multi-factor authentication; " +
        "incident detection and reporting to CCN (Centre for Cyber Security Belgium) within " +
        "24 hours (early warning) and 72 hours (full notification); supply chain security; " +
        "and TT&C link authentication and encryption. BELSPO may include CCN compliance as " +
        "an authorisation condition.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive 2022/2555",
        reference: "Art. 21, 23",
        relationship: "implements",
      },
      {
        framework: "CCSDS 350.1-G-3",
        reference: "Full",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-92",
      confidence: "partial",
    },
    category: "cybersecurity",
  },
];

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const KNOWLEDGE_BELSPO = `
## BELSPO (Belgian Science Policy Office) — Licensing Regime

### Legal Framework
- Belgian Law on Activities in Outer Space 2005 (Loi relative aux activités spatiales /
  Wet betreffende de ruimteactiviteiten), 17 September 2005
- Royal Decree of 18 January 2008: implements the 2005 Act; sets out technical criteria,
  authorisation conditions, and supervisory procedures
- BELSPO (Service public fédéral de Programmation Politique scientifique): acts as the
  designated competent authority for space authorisations
- Belgium is a state party to all five UN space treaties

### Key Characteristics
- Full operator liability with no government cap — Belgium holds operator fully liable under
  Liability Convention 1972 via indemnification obligation (Art. 9-11 of the 2005 Act)
- No fixed statutory minimum insurance: BELSPO determines required coverage per authorisation
- Authorisation conditions are tailored to mission profile; BELSPO may impose technical
  conditions referencing IADC guidelines, ISO 24113, and CCN cybersecurity guidance
- BELSPO has a dual role: policy and licensing, plus scientific coordination (ESA/EU R&D)

### Authorisation Process
1. Application to BELSPO with technical dossier, financial documentation, and insurance plan
2. BELSPO technical review; consultation with Ministry of Foreign Affairs and Ministry of Defence
3. Ministerial authorisation (signed by the minister responsible for space policy)
4. Annual compliance reporting to BELSPO; notification obligations for anomalies

### Debris Mitigation Expectations
BELSPO applies IADC Guidelines Rev.2 and ISO 24113:2019:
- 25-year de-orbit rule for LEO (NASA DAS or ESA DRAMA accepted)
- 1:10,000 casualty risk threshold for re-entry
- Passivation of stored energy sources (batteries, propellant, pressure vessels)
- Collision avoidance capability

### Cybersecurity (Post-NIS2)
- Belgian NIS2 transposition: Loi du 26 avril 2024 relative à la cybersécurité
- CCN (Centre for Cyber Security Belgium) is the national cybersecurity authority
- Space operators above NIS2 threshold must register with CCN and report significant cyber incidents
- BELSPO may cross-reference CCN compliance in authorisation conditions

### Languages
- BELSPO accepts applications in French, Dutch, or English
- Compliance documents may be submitted in either French or Dutch (English accepted for international operators)

### Compliance Matrix Format
BELSPO does not mandate a specific format. Recommended approach:
- Status: Compliant / Non-Compliant / Partial / N-A
- Languages: French or Dutch (English accepted)
- Columns: Requirement | Regulatory Basis | Status | Document Reference | Comment
`;

function buildKnowledgeBase(): string {
  return [
    "## BELSPO (BELGIAN SCIENCE POLICY OFFICE) — REGULATORY KNOWLEDGE",
    "",
    "The following knowledge reflects the Belgian Law on Activities in Outer Space 2005 " +
      "licensing regime. Apply this knowledge when generating documents for BELSPO-authorised operators.",
    "",
    KNOWLEDGE_BELSPO,
  ].join("\n");
}

// ─── Jurisdiction Data ────────────────────────────────────────────────────────

const BELGIUM_JURISDICTION: JurisdictionData = {
  code: "BE",
  name: "Belgium",

  nca: {
    name: "BELSPO",
    fullName:
      "Belgian Science Policy Office (Service public fédéral de Programmation Politique scientifique / " +
      "Federale Overheidsdienst Wetenschapsbeleid)",
    website: "https://www.belspo.be",
    language: "fr",
    executiveSummaryLanguage: "fr",
  },

  spaceLaw: {
    name: "Belgian Law on Activities in Outer Space 2005",
    citation:
      "Loi relative aux activités spatiales / Wet betreffende de ruimteactiviteiten, " +
      "17 septembre 2005, M.B. 20 octobre 2005",
    yearEnacted: 2005,
    yearAmended: 2008,
    status: "enacted",
    url: "https://www.ejustice.just.fgov.be/eli/loi/2005/09/17/2005021025/justel",
  },

  additionalLaws: [
    {
      name: "Royal Decree implementing the 2005 Space Activities Act",
      citation:
        "Arrêté royal du 18 janvier 2008 relatif aux activités spatiales, M.B. 2008",
      scope:
        "Detailed implementing rules for authorisations: technical dossier requirements, " +
        "authorisation conditions, insurance obligations, supervisory procedures.",
      status: "enacted",
    },
    {
      name: "Belgian NIS2 Transposition",
      citation:
        "Loi du 26 avril 2024 relative à la cybersécurité (transposition of Directive 2022/2555)",
      scope:
        "Cybersecurity obligations for essential and important entities, including space operators. " +
        "Designates CCN (Centre for Cyber Security Belgium) as competent authority.",
      status: "enacted",
    },
  ],

  requirements: BE_REQUIREMENTS,

  insurance: {
    minimumTPL: null,
    formula:
      "No fixed minimum. BELSPO determines required coverage per authorisation based on mission " +
      "risk profile. Operator bears full liability under the Liability Convention 1972 with no " +
      "government cap; must indemnify the Belgian State for any Liability Convention claim.",
    cap: null,
    governmentGuarantee: false,
    legalBasis:
      "Belgian Law on Activities in Outer Space 2005, Art. 9-11; Royal Decree 2008, Art. 7",
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
    language: "fr",
  },

  rigor: {
    debris: 3,
    cybersecurity: 3,
    general: 4,
    safety: 3,
  },

  requiredTools: [],

  acceptedEvidence: [
    {
      type: "DMP",
      description:
        "Debris Mitigation Plan referencing IADC Guidelines Rev.2 and ISO 24113:2019. " +
        "Mandatory technical dossier component for BELSPO authorisation.",
      acceptedAsShortcut: false,
    },
    {
      type: "ORBITAL_LIFETIME_ANALYSIS",
      description:
        "Orbital lifetime analysis demonstrating ≤25-year de-orbit. ESA DRAMA or NASA DAS accepted.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Third-party liability insurance certificate. Coverage amount determined by BELSPO per mission.",
      acceptedAsShortcut: false,
    },
    {
      type: "LIABILITY_INDEMNIFICATION_DECLARATION",
      description:
        "Operator declaration accepting full liability under Liability Convention 1972 and " +
        "agreeing to indemnify the Belgian State for any claim under Art. 9 of the 2005 Act.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {},

  knowledgeBase: buildKnowledgeBase(),
};

export function getBelgiumJurisdiction(): JurisdictionData {
  return BELGIUM_JURISDICTION;
}
