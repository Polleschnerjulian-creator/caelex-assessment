/**
 * United Kingdom / CAA Space Directorate — Consolidated Jurisdiction Data
 *
 * Sources:
 * - Space Industry Act 2018 (SIA 2018), c.5
 * - Outer Space Act 1986 (OSA 1986), c.38
 * - Space Industry Regulations 2021 (SI 2021/792)
 * - CAA Space (Civil Aviation Authority, Space Directorate)
 * - UKSA Guidance on the Space Industry Act 2018 (February 2022)
 * - CAA CAP 1922 — Guidance on the Modelled Insurance Requirement (MIR)
 * - IADC Space Debris Mitigation Guidelines Rev.2 (IADC-02-01, 2020)
 * - NASA Debris Assessment Software (DAS) 3.1 User Guide
 */

import type { JurisdictionData, NationalRequirement } from "../types";

// ─── National Requirements ─────────────────────────────────────────────────

const UK_REQUIREMENTS: NationalRequirement[] = [
  // ── Licensing / Authorization (SIA 2018, ss. 8-12) ──
  {
    id: "GB-SIA-8",
    nationalRef: {
      law: "Space Industry Act 2018",
      article: "s. 8",
      title: "Requirement for a licence",
      fullText:
        "A person must not carry out a spaceflight activity or operate a spaceport in the United " +
        "Kingdom, or carry out a spaceflight activity or operate a range-control service from " +
        "the United Kingdom, unless authorised by a licence granted under this Act. " +
        "Contravention is an offence. Applies to UK-established operators worldwide and to " +
        "operations from UK territory regardless of operator nationality.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI",
        relationship: "implements",
      },
      {
        framework: "Registration Convention 1975",
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
  {
    id: "GB-SIA-9",
    nationalRef: {
      law: "Space Industry Act 2018",
      article: "s. 9",
      title: "Licensing criteria — regulator's assessment",
      fullText:
        "The regulator may grant a licence only if satisfied that the applicant is capable of " +
        "carrying out the licensed activities safely; has adequate insurance or financial " +
        "provision under s.12; meets applicable technical, operational, and financial " +
        "requirements; and will comply with international treaty obligations. " +
        "The regulator must consider any national security guidance from the Secretary of State.",
    },
    standardsMapping: [
      {
        framework: "Outer Space Treaty 1967",
        reference: "Art. VI",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 13-17",
      confidence: "direct",
    },
    category: "authorization",
  },
  {
    id: "GB-SIA-10",
    nationalRef: {
      law: "Space Industry Act 2018",
      article: "s. 10",
      title: "Licence conditions",
      fullText:
        "A licence may include conditions requiring the licensee to comply with: a safety case " +
        "accepted by the CAA; debris mitigation measures consistent with IADC guidelines; " +
        "collision avoidance procedures; provisions for end-of-life disposal; data sharing " +
        "requirements; and financial/insurance obligations. Conditions may be varied on written " +
        "notice after consultation.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Full",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 18-22",
      confidence: "direct",
    },
    category: "authorization",
  },
  {
    id: "GB-SIA-12",
    nationalRef: {
      law: "Space Industry Act 2018",
      article: "s. 12",
      title: "Insurance requirement",
      fullText:
        "A licensee must maintain third-party liability insurance meeting the Modelled Insurance " +
        "Requirement (MIR) as determined by the CAA. The MIR is a risk-based, mission-specific " +
        "calculation reflecting the realistic maximum probable loss from third-party claims. " +
        "For most small satellite missions the MIR falls between £60 million and £100 million. " +
        "Government indemnity may be available via the UKSA for residual/catastrophic risk " +
        "above a commercial insurance cap.",
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

  // ── Debris Mitigation ──
  {
    id: "GB-SIA-DM-1",
    nationalRef: {
      law: "Space Industry Regulations 2021",
      article: "Reg. 24",
      title: "Debris mitigation — design and operations",
      fullText:
        "An operator must design, manufacture, and operate a spacecraft in a way that minimises " +
        "the generation of debris. The operator must: limit the probability of on-orbit " +
        "fragmentation; plan for controlled or uncontrolled re-entry that meets the casualty " +
        "risk threshold; demonstrate compliance with the 25-year de-orbit rule for LEO " +
        "missions; and submit a Debris Mitigation Plan (DMP) as part of the licence application.",
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
      {
        framework: "UKSA/CAA Debris Guidance 2022",
        reference: "Section 3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 59-73",
      confidence: "direct",
    },
    category: "debris",
  },
  {
    id: "GB-SIA-DM-2",
    nationalRef: {
      law: "Space Industry Regulations 2021",
      article: "Reg. 25",
      title: "Casualty risk — 1-in-10,000 threshold",
      fullText:
        "The probability that re-entering debris causes one or more casualties on the ground " +
        "must not exceed 1 in 10,000 per re-entry event. The operator must demonstrate " +
        "compliance using NASA Debris Assessment Software (DAS 3.1) or equivalent approved " +
        "tool. The DAS or tool output must be submitted with the licence application and " +
        "updated for any mission change that affects re-entry risk.",
    },
    standardsMapping: [
      {
        framework: "IADC Guidelines Rev.2",
        reference: "Section 5.3.3",
        relationship: "implements",
      },
      {
        framework: "ISO 24113:2019",
        reference: "Section 6.3.3",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 72(4)",
      confidence: "direct",
    },
    category: "debris",
  },

  // ── Cybersecurity ──
  {
    id: "GB-SIA-CYBER-1",
    nationalRef: {
      law: "Space Industry Regulations 2021",
      article: "Reg. 30",
      title: "Cybersecurity for space operations",
      fullText:
        "A licensee must implement and maintain a cybersecurity framework covering: command and " +
        "control link authentication and encryption; ground segment access control and intrusion " +
        "detection; software and firmware integrity verification; supply chain security; and " +
        "procedures for detection and response to cyber incidents. The CAA Space Directorate " +
        "may require alignment with the NCSC Cyber Assessment Framework (CAF) for operators " +
        "meeting the NIS2 threshold.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive 2022/2555",
        reference: "Art. 21",
        relationship: "implements",
      },
      {
        framework: "CCSDS 350.1-G-3",
        reference: "Full",
        relationship: "implements",
      },
      {
        framework: "NCSC Cyber Assessment Framework",
        reference: "Full",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74-85",
      confidence: "partial",
    },
    category: "cybersecurity",
  },

  // ── Registration ──
  {
    id: "GB-OSA-4",
    nationalRef: {
      law: "Outer Space Act 1986",
      article: "s. 4",
      title: "Registration of space objects",
      fullText:
        "Any space object launched by a UK-licensed operator must be registered with the " +
        "UK National Registry maintained by the UKSA under the Registration Convention 1975. " +
        "The operator must supply: COSPAR/NORAD identifier; orbital parameters at launch; " +
        "general function of the object; name of launching state. Registration must be " +
        "completed within 60 days of reaching orbit.",
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

  // ── Supervision / Ongoing Compliance ──
  {
    id: "GB-SIA-19",
    nationalRef: {
      law: "Space Industry Act 2018",
      article: "s. 19",
      title: "Operator obligations — ongoing compliance and reporting",
      fullText:
        "A licensee must notify the CAA Space Directorate without delay of: any anomaly that " +
        "materially affects the safe or licensed conduct of operations; any loss of command and " +
        "control capability; any unplanned collision avoidance manoeuvre; and any cybersecurity " +
        "incident that threatens operational safety. Annual compliance reports summarising " +
        "operations, anomalies, and debris mitigation performance must be submitted to UKSA.",
    },
    standardsMapping: [
      {
        framework: "NIS2 Directive 2022/2555",
        reference: "Art. 23",
        relationship: "implements",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 89-92",
      confidence: "partial",
    },
    category: "supervision",
  },
];

// ─── Knowledge Base ───────────────────────────────────────────────────────────

const KNOWLEDGE_SIA_STRUCTURE = `
## UK Space Industry Act 2018 (SIA 2018) — Regulatory Structure

### Statutory Framework
- Primary legislation: Space Industry Act 2018 (c.5) — enacted 15 March 2018
- Secondary legislation: Space Industry Regulations 2021 (SI 2021/792) — operative 29 July 2021
- Legacy act: Outer Space Act 1986 (c.38) — still in force for overseas operators
- Regulator: Civil Aviation Authority (CAA) — Space Directorate (formerly CAA/UKSA joint)
- Policy owner: UK Space Agency (UKSA)

### Key Differences from EU Regime
The SIA 2018 introduced a risk-based, proportionate licensing approach:
- No fixed minimum insurance figure in statute — CAA calculates the Modelled Insurance Requirement (MIR) per mission
- Operator is not automatically fully liable above the MIR; government indemnity may cover the excess
- Dual-layer liability system: operator bears up to MIR threshold; UKSA backstop above MIR

### Scope (SIA 2018 s. 1-3)
- Spaceflight activities from UK territory (orbital and sub-orbital launches)
- Spaceflight activities carried out by UK-established persons anywhere in the world
- Operation of spaceports and range-control services in the UK
- Note: Outer Space Act 1986 continues to cover payload operators licensed under the legacy regime

### CAA Space Directorate
- Responsible for licensing, safety oversight, debris and security oversight
- Applies safety case methodology analogous to aviation: ALARP (As Low As Reasonably Practicable)
- Accepts self-certification for low-risk small satellite missions; mandatory third-party audit for higher-risk
- Issues Notices to Industry (NtIs) and Regulatory Means of Compliance (RMoC) as guidance
`;

const KNOWLEDGE_MIR = `
## Modelled Insurance Requirement (MIR) — CAA CAP 1922

### What the MIR Is
The MIR is a risk-based calculation that replaces a single statutory minimum. The CAA computes:
  - Probable Maximum Loss (PML): the loss that would be incurred in the credible worst-case third-party liability scenario
  - Expected Loss: statistical mean third-party loss over many similar missions
  - MIR = typically a multiple of Expected Loss, capped at a commercial insurance market ceiling

### Typical MIR Ranges (indicative, per UKSA guidance)
- Small LEO satellites (<250 kg): £60M–£80M
- Medium LEO satellites (250–1000 kg): £80M–£150M
- Large satellites or high-inclination orbits: up to £300M+
- Launch vehicles (from UK spaceport): subject to separate assessment, likely £500M+

### Government Indemnity
UKSA may provide indemnity for residual risk above the commercial MIR cap. Operators seeking government indemnity must apply separately and accept UKSA audit rights.

### Legal Basis
SIA 2018 s. 12; Space Industry Regulations 2021 regs. 22-23; CAP 1922.
`;

const KNOWLEDGE_CAA_EXPECTATIONS = `
## CAA Space Directorate — Application Expectations

### Safety Case Approach
The CAA applies an aviation-derived safety case methodology:
- Hazard Log: structured identification and mitigation of all mission hazards
- ALARP demonstration: risks reduced As Low As Reasonably Practicable
- For orbital missions: the safety case must cover launch phase, on-orbit operations, and end-of-life disposal
- CAA may appoint a specialist Technical Assessor (TA) for novel missions

### Debris Mitigation Plan (DMP) Requirements
1. Reference IADC Guidelines Rev.2 (IADC-02-01, 2020) as the primary international standard
2. Demonstrate ≤25-year de-orbit time for LEO (CAA accepts GMAT, STK, or NASA DAS orbital lifetime tools)
3. Casualty risk: <1:10,000 — demonstrate using NASA DAS 3.1 (preferred) or equivalent
4. Passivation plan covering all stored energy sources (batteries, propellant, pressure vessels)
5. Collision avoidance capability: describe conjunction analysis service used (LeoLabs, ExoAnalytic, ESA SST, etc.)

### NASA DAS 3.1 — CAA Preferred Tool
- DAS (Debris Assessment Software) v3.1 is listed in CAA guidance as the accepted tool for:
  - On-orbit lifetime assessment (25-year rule)
  - Ground casualty probability (1:10,000 threshold)
  - Orbital debris assessment report generation
- Available from NASA Orbital Debris Program Office: https://orbitaldebris.jsc.nasa.gov/mitigation/das.html

### Cybersecurity Expectations
- CAA may require alignment with the NCSC Cyber Assessment Framework (CAF) for operators above the NIS 2018 threshold
- Post-Brexit: UK NIS Regulations 2018 apply (analogous to EU NIS1 Directive); NIS2 is EU-only but CAA takes cognisance
- Command-link encryption and authentication are standard licence conditions for all orbital operators

### Compliance Matrix Format
CAA does not mandate a specific matrix template but expects:
- Status values: Compliant / Non-Compliant / Partial / N-A
- Language: English
- Columns: Requirement | Regulatory Reference | Status | Justification / Document Reference
`;

function buildKnowledgeBase(): string {
  return [
    "## UKSA / CAA SPACE DIRECTORATE — REGULATORY KNOWLEDGE (UK)",
    "",
    "The following knowledge reflects the Space Industry Act 2018 licensing regime. " +
      "Apply this knowledge when generating documents for UK-licensed operators.",
    "",
    KNOWLEDGE_SIA_STRUCTURE,
    KNOWLEDGE_MIR,
    KNOWLEDGE_CAA_EXPECTATIONS,
  ].join("\n");
}

// ─── Jurisdiction Data ────────────────────────────────────────────────────────

const UK_JURISDICTION: JurisdictionData = {
  code: "GB",
  name: "United Kingdom",

  nca: {
    name: "UKSA / CAA Space Directorate",
    fullName:
      "UK Space Agency (policy) / Civil Aviation Authority Space Directorate (licensing)",
    website: "https://www.caa.co.uk/space",
    language: "en",
    executiveSummaryLanguage: "en",
  },

  spaceLaw: {
    name: "Space Industry Act 2018 (SIA 2018)",
    citation:
      "Space Industry Act 2018, c.5; Space Industry Regulations 2021, SI 2021/792",
    yearEnacted: 2018,
    yearAmended: 2021,
    status: "enacted",
    url: "https://www.legislation.gov.uk/ukpga/2018/5/contents",
  },

  additionalLaws: [
    {
      name: "Outer Space Act 1986 (OSA 1986)",
      citation: "Outer Space Act 1986, c.38",
      scope:
        "Covers UK-established payload operators launching on non-UK licensed vehicles; " +
        "registration of space objects; ongoing liability obligations for pre-SIA operators.",
      status: "enacted",
    },
  ],

  requirements: UK_REQUIREMENTS,

  insurance: {
    minimumTPL: 60_000_000,
    formula:
      "Modelled Insurance Requirement (MIR): risk-based, mission-specific calculation by CAA. " +
      "Indicative range £60M–£300M+ depending on mission profile. Government indemnity " +
      "(UKSA backstop) may be available for residual risk above commercial MIR cap.",
    cap: null,
    governmentGuarantee: true,
    legalBasis:
      "SIA 2018 s. 12; Space Industry Regulations 2021 regs. 22-23; CAA CAP 1922",
  },

  complianceMatrixFormat: {
    statusValues: ["Compliant", "Non-Compliant", "Partial", "N-A"],
    columns: [
      "Requirement",
      "Regulatory Reference",
      "Status",
      "Justification / Document Reference",
    ],
    language: "en",
  },

  rigor: {
    debris: 4,
    cybersecurity: 4,
    general: 3,
    safety: 4,
  },

  requiredTools: [
    {
      name: "NASA DAS 3.1",
      description:
        "NASA Debris Assessment Software v3.1 — CAA's preferred tool for demonstrating " +
        "orbital lifetime compliance (≤25-year de-orbit) and ground casualty probability " +
        "(<1:10,000). Generates an Orbital Debris Assessment Report (ODAR) accepted by " +
        "CAA Space Directorate. Available from NASA ODPO: " +
        "https://orbitaldebris.jsc.nasa.gov/mitigation/das.html",
      mandatory: true,
    },
  ],

  acceptedEvidence: [
    {
      type: "DAS_ODAR",
      description:
        "NASA DAS 3.1 Orbital Debris Assessment Report — covering on-orbit lifetime " +
        "and casualty risk. CAA-preferred tool output.",
      acceptedAsShortcut: false,
    },
    {
      type: "SAFETY_CASE",
      description:
        "CAA-accepted safety case document using ALARP methodology and hazard log. " +
        "Mandatory for all SIA 2018 licence applications.",
      acceptedAsShortcut: false,
    },
    {
      type: "DMP",
      description:
        "Debris Mitigation Plan referencing IADC Guidelines Rev.2 and ISO 24113:2019.",
      acceptedAsShortcut: false,
    },
    {
      type: "INSURANCE_CERTIFICATE",
      description:
        "Third-party liability insurance certificate meeting the MIR as determined by " +
        "the CAA. Must specify limit, scope, and mission coverage period.",
      acceptedAsShortcut: false,
    },
  ],

  documentGuidance: {
    REENTRY_RISK: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Use NASA DAS 3.1 (preferred) to compute casualty expectation value (Ec)",
        "Demonstrate Ec < 0.0001 (1:10,000) per re-entry event",
        "Include spacecraft bill of materials for demise analysis",
        "For controlled re-entry: define target zone, contingency if deorbit burn fails",
        "Reference IADC Guidelines Rev.2 Section 5.3.3 and ISO 24113:2019",
        "Report orbital decay analysis with atmospheric density model specified (NRLMSISE-00 or JB2008)",
      ],
      commonRejectionReasons: [
        "Casualty risk analysis missing or uses non-approved tool",
        "DAS output not included in application package",
        "Insufficient demise analysis — no bill of materials provided",
        "Controlled re-entry contingency not addressed",
      ],
    },
    DMP: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Reference IADC Guidelines Rev.2 as primary international standard",
        "Demonstrate ≤25-year post-mission de-orbit for LEO",
        "Passivation plan covering batteries, propellant, pressure vessels, RF emissions",
        "Collision avoidance: identify conjunction analysis service (LeoLabs, ESA SST, etc.)",
        "Probability of successful disposal manoeuvre (delta-V budget with margin)",
        "Fragmentation risk: FMECA or equivalent for fragmentation hazards",
      ],
      commonRejectionReasons: [
        "No reference to IADC Guidelines Rev.2",
        "Orbital lifetime analysis missing or parametric only — DAS or equivalent output required",
        "Passivation of all energy sources not addressed",
        "No conjunction analysis service identified",
      ],
    },
    AUTHORIZATION_APPLICATION: {
      depthExpectation: "detailed",
      specificRequirements: [
        "Demonstrate compliance with SIA 2018 ss. 8-12 licensing criteria",
        "Include safety case or safety case summary (ALARP demonstration)",
        "Insurance: provide MIR assessment basis and coverage certificate",
        "Debris Mitigation Plan (DMP) as mandatory annex",
        "Orbital debris assessment using NASA DAS 3.1 output",
        "Cybersecurity: describe command-link security and ground segment controls",
        "Registration plan: demonstrate readiness to register with UK National Registry",
        "For constellations: fleet-level debris and casualty risk assessment",
      ],
      commonRejectionReasons: [
        "Safety case absent or lacks ALARP demonstration",
        "MIR calculation basis not provided",
        "DMP not submitted as part of application",
        "NASA DAS output not included",
      ],
    },
  },

  knowledgeBase: buildKnowledgeBase(),
};

export function getUKJurisdiction(): JurisdictionData {
  return UK_JURISDICTION;
}
