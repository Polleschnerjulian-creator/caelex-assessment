/**
 * Belgium / BELSPO — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Belgian Law on Activities in Outer Space (Loi relative aux activites spatiales /
 *   Wet betreffende de ruimteactiviteiten), 17 September 2005
 *   (Belgian Official Gazette / Belgisch Staatsblad, 20 October 2005)
 * - 2013 Amendment: Loi du 1er décembre 2013 modifiant la loi du 17 septembre 2005
 *   (introduced provisions for non-manoeuvrable space objects)
 * - Royal Decree implementing the 2005 Act (Arrêté royal du 18 janvier 2008)
 * - Royal Decree of 2022 (impact study requirements, sustainability of space environment)
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

  // ── Impact Study — Royal Decree 2022 ──
  {
    id: "BE-RD2022-IMPACT",
    nationalRef: {
      law: "Royal Decree 2022 (Impact Study and Sustainability)",
      article: "Art. 3-5",
      title: "Mandatory impact study for space environment sustainability",
      fullText:
        "Under the Royal Decree 2022, every authorisation application must include an impact " +
        "study (étude d'impact) assessing the sustainability of the space environment. The " +
        "impact study must address: probability of collision with catalogued and un-catalogued " +
        "objects; debris generation risk during all mission phases (launch, operations, disposal); " +
        "long-term sustainability of the target orbital regime; contribution to orbital congestion; " +
        "cumulative effects of planned constellation deployments; and end-of-life disposal " +
        "effectiveness. BELSPO uses the impact study as a primary input for authorisation " +
        "decisions and may require revisions or additional analysis before granting authorisation. " +
        "The impact study aligns Belgian requirements with COPUOS Long-term Sustainability " +
        "Guidelines (2019) and supplements the IADC-based Debris Mitigation Plan.",
    },
    standardsMapping: [
      {
        framework: "COPUOS LTS Guidelines 2019",
        reference: "Guidelines 1-5, 7-12",
        relationship: "implements",
      },
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-73",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Non-Manoeuvrable Objects — 2013 Amendment ──
  {
    id: "BE-LSA-2013-NMO",
    nationalRef: {
      law: "Belgian Law on Activities in Outer Space 2005 (as amended 2013)",
      article: "Art. 5bis (2013 Amendment)",
      title: "Specific provisions for non-manoeuvrable space objects",
      fullText:
        "The 2013 amendment introduced specific provisions for non-manoeuvrable space objects " +
        "(e.g., CubeSats without propulsion, passive payloads). Operators of non-manoeuvrable " +
        "objects must demonstrate: (1) that the initial orbital parameters ensure natural decay " +
        "will achieve de-orbit within 25 years without active manoeuvring; (2) that the object " +
        "is designed to minimise fragmentation risk (no stored energy sources, or adequate " +
        "passivation at deployment); (3) that the orbit selection minimises collision probability " +
        "with operational spacecraft and debris. Liability and insurance requirements apply " +
        "equally to non-manoeuvrable objects. BELSPO may impose additional conditions based on " +
        "the specific orbital regime and congestion level.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.2",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-73",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── BELSPO Licensing Process ──
  {
    id: "BE-LSA-LICENSING",
    nationalRef: {
      law: "Belgian Law on Activities in Outer Space 2005 / Royal Decree 2008",
      article: "Art. 4-7, Royal Decree Art. 2-5",
      title: "BELSPO licensing process — end-to-end authorisation procedure",
      fullText:
        "The Belgian authorisation process is administered by BELSPO with ministerial approval: " +
        "(1) Application submission to BELSPO with technical dossier, financial documentation, " +
        "insurance plan, impact study (per Royal Decree 2022), and debris mitigation plan. " +
        "(2) BELSPO technical review: assessment of technical competence, safety, debris " +
        "compliance, environmental sustainability, insurance adequacy, and cybersecurity. " +
        "(3) Consultation with Ministry of Foreign Affairs (treaty obligations), Ministry of " +
        "Defence (national security), and other relevant federal agencies. " +
        "(4) Ministerial authorisation: signed by the minister responsible for science policy. " +
        "(5) Authorisation conditions: BELSPO may impose mission-specific conditions including " +
        "frequency coordination, conjunction analysis obligations, and reporting requirements. " +
        "(6) Annual compliance reporting to BELSPO; immediate notification for anomalies. " +
        "Applications may be submitted in French, Dutch, or English.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 8-17",
      confidence: "direct",
    },
    category: "authorization",
  },

  // ── Belgian Liability Framework ──
  {
    id: "BE-LSA-LIABILITY",
    nationalRef: {
      law: "Belgian Law on Activities in Outer Space 2005",
      article: "Art. 9-11",
      title: "Belgian liability framework — Liability Convention alignment",
      fullText:
        "Belgium's liability framework directly implements the Liability Convention 1972: " +
        "absolute liability for damage on the surface of the Earth or to aircraft in flight; " +
        "fault-based liability for damage in outer space. The operator bears full liability " +
        "with no government cap — this is a distinguishing feature of the Belgian regime. " +
        "The operator must indemnify the Belgian State for any amount the State is required " +
        "to pay under the Liability Convention as launching state. Insurance must be maintained " +
        "for the full duration of the space activity including the disposal phase. BELSPO " +
        "determines the required insurance amount per authorisation based on mission risk " +
        "profile — there is no fixed statutory minimum. Belgium's full-liability, no-cap " +
        "approach places significant financial risk on operators and makes adequate insurance " +
        "critical for every Belgian-authorised mission.",
    },
    standardsMapping: [
      {
        framework: "Liability Convention 1972",
        reference: "Art. II, III, IV",
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

  // ── Environmental Sustainability Requirement ──
  {
    id: "BE-RD2022-SUSTAINABILITY",
    nationalRef: {
      law: "Royal Decree 2022 (Impact Study and Sustainability)",
      article: "Art. 6-8",
      title: "Sustainability of the space environment — assessment obligations",
      fullText:
        "The Royal Decree 2022 introduces an explicit sustainability assessment obligation " +
        "aligned with COPUOS Long-term Sustainability Guidelines. Operators must demonstrate: " +
        "that their mission contributes to the long-term sustainability of the space environment; " +
        "that orbital regime selection considers congestion and collision risk; that the mission " +
        "design minimises the creation of long-lived debris; and that end-of-life disposal is " +
        "planned and technically feasible. BELSPO may refuse or condition an authorisation if " +
        "the impact study reveals unacceptable risks to the sustainability of the space " +
        "environment, even if the operator otherwise meets all technical requirements. This " +
        "reflects Belgium's proactive approach to space sustainability governance.",
    },
    standardsMapping: [
      {
        framework: "COPUOS LTS Guidelines 2019",
        reference: "Full",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 4",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-73",
      confidence: "direct",
    },
    category: "environmental",
  },
];

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const KNOWLEDGE_BELSPO = `
## BELSPO (Belgian Science Policy Office) — Licensing Regime

### Legal Framework
- Belgian Law on Activities in Outer Space 2005 (Loi relative aux activités spatiales /
  Wet betreffende de ruimteactiviteiten), 17 September 2005
- 2013 Amendment (Loi du 1er décembre 2013): introduced provisions for non-manoeuvrable
  space objects (CubeSats, passive payloads) — clarified liability and natural decay requirements
- Royal Decree of 18 January 2008: implements the 2005 Act; sets out technical criteria,
  authorisation conditions, and supervisory procedures
- Royal Decree 2022: introduced mandatory impact study (étude d'impact) requirements and
  explicit sustainability of the space environment assessment obligations
- BELSPO (Service public fédéral de Programmation Politique scientifique): acts as the
  designated competent authority for space authorisations
- Belgium is a state party to all five UN space treaties

### Key Characteristics
- Full operator liability with no government cap — Belgium holds operator fully liable under
  Liability Convention 1972 via indemnification obligation (Art. 9-11 of the 2005 Act)
- No fixed statutory minimum insurance: BELSPO determines required coverage per authorisation
  based on mission risk profile, orbital regime, and operator financial capacity
- Authorisation conditions are tailored to mission profile; BELSPO may impose technical
  conditions referencing IADC guidelines, ISO 24113, and CCN cybersecurity guidance
- BELSPO has a dual role: policy and licensing, plus scientific coordination (ESA/EU R&D)
- The no-cap liability approach makes Belgium one of the stricter regimes for operators —
  adequate insurance is critical and should cover the full mission lifecycle including disposal

### Authorisation Process (BELSPO Licensing)
1. Pre-engagement: informal consultation with BELSPO recommended before formal submission
2. Application to BELSPO with: technical dossier; financial documentation; insurance plan;
   impact study (required by Royal Decree 2022); debris mitigation plan; cybersecurity
   arrangements; and corporate documentation
3. BELSPO technical review: assessment of technical capability, safety, debris compliance,
   environmental sustainability (per Royal Decree 2022), insurance, and cybersecurity
4. Consultation with Ministry of Foreign Affairs (treaty obligations), Ministry of Defence
   (national security), and other relevant federal agencies
5. Ministerial authorisation: signed by the minister responsible for science policy
6. Authorisation conditions: mission-specific conditions may be imposed (frequency coordination,
   conjunction analysis obligations, reporting, tracking arrangements)
7. Annual compliance reporting to BELSPO; immediate notification for anomalies or incidents
8. For non-manoeuvrable objects (per 2013 amendment): additional demonstration that natural
   orbital decay meets the 25-year rule without active manoeuvring

### Royal Decree 2022 — Impact Study Requirements
The Royal Decree 2022 introduced a mandatory impact study as a key authorisation requirement:
- Must assess the sustainability of the space environment
- Covers: collision probability; debris generation risk; orbital congestion contribution;
  cumulative constellation effects; disposal effectiveness
- BELSPO may refuse authorisation solely on sustainability grounds, even if other criteria are met
- Aligns Belgium with COPUOS Long-term Sustainability Guidelines (2019)
- Represents Belgium's proactive stance on space environment governance

### 2013 Amendment — Non-Manoeuvrable Objects
The 2013 amendment specifically addresses the growing population of non-manoeuvrable space
objects (CubeSats, educational satellites, passive payloads):
- Must demonstrate natural orbital decay achieves 25-year de-orbit without propulsion
- Orbit selection must minimise collision probability with operational satellites and debris
- Design must minimise fragmentation risk (no unexpended energy sources at deployment)
- Full liability and insurance requirements apply regardless of manoeuvrability

### Belgian Liability Framework
Belgium's liability framework directly implements the Liability Convention 1972:
- Absolute liability: damage on Earth's surface or to aircraft in flight
- Fault-based liability: damage in outer space
- No government cap: operator bears full liability via indemnification obligation to the State
- Insurance must cover the full mission lifecycle including disposal phase
- BELSPO determines coverage amount per authorisation (no fixed statutory minimum)
- Belgium may exercise recourse as launching state under the Liability Convention

### Debris Mitigation Expectations
BELSPO applies IADC Guidelines Rev.2 and ISO 24113:2019, supplemented by Royal Decree 2022:
- 25-year de-orbit rule for LEO (NASA DAS or ESA DRAMA accepted)
- 1:10,000 casualty risk threshold for re-entry
- Passivation of stored energy sources (batteries, propellant, pressure vessels)
- Collision avoidance capability (or natural decay justification for non-manoeuvrable objects)
- Impact study demonstrating space environment sustainability (Royal Decree 2022)

### Cybersecurity (Post-NIS2)
- Belgian NIS2 transposition: Loi du 26 avril 2024 relative à la cybersécurité
- CCN (Centre for Cyber Security Belgium) is the national cybersecurity authority
- Space operators above NIS2 threshold must register with CCN and report significant cyber incidents
- BELSPO may cross-reference CCN compliance in authorisation conditions
- 24h early warning, 72h full notification, 1-month final report to CCN

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
      "17 septembre 2005, M.B. 20 octobre 2005. Amended: Loi du 1er décembre 2013 " +
      "(non-manoeuvrable objects); Royal Decree 2022 (impact study, sustainability).",
    yearEnacted: 2005,
    yearAmended: 2022,
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
      name: "2013 Amendment — Non-Manoeuvrable Space Objects",
      citation:
        "Loi du 1er décembre 2013 modifiant la loi du 17 septembre 2005 relative aux " +
        "activités spatiales, M.B. 2013",
      scope:
        "Introduced specific provisions for non-manoeuvrable space objects (e.g., CubeSats, " +
        "passive payloads). Requires operators of non-manoeuvrable objects to demonstrate that " +
        "natural orbital decay will achieve de-orbit within the prescribed timeframe. Clarified " +
        "liability and insurance requirements for operators unable to perform active collision " +
        "avoidance or controlled disposal.",
      status: "enacted",
    },
    {
      name: "Royal Decree 2022 — Impact Study and Sustainability",
      citation:
        "Arrêté royal du 2022 relatif à l'étude d'impact et la durabilité de " +
        "l'environnement spatial",
      scope:
        "Requires operators to submit an impact study (étude d'impact) as part of the " +
        "authorisation application, assessing the sustainability of the space environment. " +
        "The impact study must address: orbital debris generation risk; collision probability; " +
        "long-term sustainability of the orbital regime; and environmental effects. Aligns " +
        "Belgian requirements with COPUOS Long-term Sustainability Guidelines and strengthens " +
        "the debris mitigation assessment framework. BELSPO uses the impact study as a key " +
        "input for authorisation decisions.",
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

  documentGuidance: {
    DMP: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference Belgian Law on Activities in Outer Space 2005, Art. 5, and Royal Decree 2008 Art. 6",
        "Reference Royal Decree 2022 impact study requirements alongside the DMP",
        "Apply IADC Space Debris Mitigation Guidelines Rev.2 as primary international standard",
        "Reference ISO 24113:2019 as complementary standard",
        "Demonstrate 25-year post-mission disposal compliance for LEO",
        "Include passivation plan for all stored energy sources at end-of-life",
        "For non-manoeuvrable objects (per 2013 amendment): demonstrate natural decay compliance",
        "Include collision avoidance capability description or natural decay justification",
        "Address orbital regime sustainability per Royal Decree 2022",
        "NASA DAS or ESA DRAMA accepted for orbital lifetime analysis",
        "French, Dutch, or English accepted",
      ],
      commonRejectionReasons: [
        "Impact study (Royal Decree 2022) not submitted alongside DMP",
        "Passivation plan missing or incomplete",
        "Non-manoeuvrable object: natural decay analysis not provided",
        "25-year de-orbit compliance not supported by tool output (DAS or DRAMA)",
        "Orbital sustainability not addressed",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "standard",
      specificRequirements: [
        "Submit to BELSPO with complete technical dossier per Royal Decree 2008",
        "Include impact study per Royal Decree 2022 (sustainability assessment)",
        "Include Debris Mitigation Plan referencing IADC Rev.2 and ISO 24113",
        "Provide insurance plan — BELSPO determines required coverage per mission risk",
        "Operator indemnification declaration (Art. 9 of 2005 Act — full liability, no cap)",
        "Corporate documentation: Belgian entity registration or establishment evidence",
        "For non-manoeuvrable objects: additional 2013 amendment compliance demonstration",
        "Cybersecurity arrangements per NIS2 (Loi du 26 avril 2024) if above threshold",
        "Applications accepted in French, Dutch, or English",
      ],
      commonRejectionReasons: [
        "Impact study (Royal Decree 2022) not included in application",
        "Insurance coverage insufficient for mission risk profile",
        "Indemnification obligation not acknowledged",
        "Debris mitigation plan absent or non-compliant with IADC/ISO",
        "Non-manoeuvrable object provisions (2013 amendment) not addressed where applicable",
      ],
    },
    IMPACT_STUDY: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference Royal Decree 2022 as legal basis",
        "Assess collision probability with catalogued and un-catalogued objects",
        "Assess debris generation risk during all mission phases",
        "Evaluate long-term sustainability of the target orbital regime",
        "For constellations: assess cumulative effects and orbital congestion contribution",
        "Evaluate end-of-life disposal effectiveness and reliability",
        "Align with COPUOS Long-term Sustainability Guidelines (2019)",
        "Include quantitative analysis where possible (collision probability, decay time)",
        "French, Dutch, or English accepted",
      ],
      commonRejectionReasons: [
        "Not all mission phases covered in sustainability assessment",
        "Collision probability analysis missing or qualitative only",
        "Cumulative constellation effects not assessed (for multi-satellite missions)",
        "Disposal effectiveness not quantified",
        "No reference to COPUOS LTS Guidelines",
      ],
    },
  },

  knowledgeBase: buildKnowledgeBase(),
};

export function getBelgiumJurisdiction(): JurisdictionData {
  return BELGIUM_JURISDICTION;
}
