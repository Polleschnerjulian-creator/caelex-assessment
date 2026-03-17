/**
 * Regulatory Data Layer — Cross-Reference Map
 *
 * Connects requirements across all layers: international standards,
 * national law, and EU Space Act proposal. Each mapping represents
 * ONE compliance concept with ALL its regulatory references.
 *
 * This is the "Rosetta Stone" of the regulatory data layer.
 */

import type { RegulatoryMapping } from "./types";

export const REGULATORY_MAPPINGS: RegulatoryMapping[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // DEBRIS MITIGATION
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "DEBRIS-RELEASE-PREVENTION",
    name: "Debris Release Prevention During Normal Operations",
    description:
      "Space systems must be designed to not release debris during nominal operations. Exceptions for pyrotechnics (<1mm) and solid rocket motors.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.1", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.2",
          status: "published",
        },
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.2",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 40.1", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 Licence Condition",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 60",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-BREAKUP-PREVENTION",
    name: "On-Orbit Break-Up Prevention",
    description:
      "Operators must identify all stored energy sources and demonstrate design measures to prevent accidental break-ups with probability <1e-3 over mission lifetime.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.2", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.3",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 40.2", status: "enacted" },
      ],
      euSpaceAct: {
        articleRef: "Art. 59",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-PASSIVATION",
    name: "End-of-Life Passivation",
    description:
      "All stored energy sources (batteries, propellant, pressure vessels, reaction wheels) must be permanently depleted or safed at end of mission to prevent fragmentation.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.2.1", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.3.2",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 40.3", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 Licence Condition",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 67(1)(d)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-25-YEAR-RULE",
    name: "25-Year Post-Mission Orbital Lifetime (LEO)",
    description:
      "LEO spacecraft must deorbit within 25 years of end of mission. This is the most universally enforced debris mitigation requirement.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.3.2", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.4.1",
          status: "published",
        },
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.4",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 41-9", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 Orbital Requirements",
          status: "enacted",
        },
        {
          jurisdiction: "US",
          reference: "FCC 5-Year Rule (2024)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 72(2)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-GEO-DISPOSAL",
    name: "GEO Protected Region Disposal",
    description:
      "GEO spacecraft must be re-orbited to a graveyard orbit at least 300km above the GEO altitude at end of mission.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.3.1", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.4.2",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 41-10/41-11",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 72(3)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-COLLISION-AVOIDANCE",
    name: "Conjunction Assessment and Collision Avoidance",
    description:
      "Operators must screen for potential collisions, define Pc thresholds, maintain maneuver capability, and coordinate with other operators and SSA providers.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.4", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.5",
          status: "published",
        },
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.1",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 41/41-1/41-6",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 s.12 CA Condition",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 64",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-REENTRY-CASUALTY-RISK",
    name: "Re-Entry Ground Casualty Risk",
    description:
      "For uncontrolled re-entry, the probability of causing at least one casualty must be less than 1:10,000 per re-entry event.",
    category: "debris",
    references: {
      international: [
        {
          framework: "IADC",
          reference: "Section 5.3 (re-entry)",
          status: "published",
        },
        {
          framework: "ISO_24113",
          reference: "Section 6.6",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 44", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 Casualty Risk Condition",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 72(4)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-TRACKABILITY",
    name: "Object Trackability and Identification",
    description:
      "Space objects must be trackable by ground-based SSA sensors. Registration data must be maintained and shared.",
    category: "debris",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.2",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 39-1", status: "enacted" },
      ],
      euSpaceAct: {
        articleRef: "Art. 67(1)(e)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CYBERSECURITY
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "CYBER-RISK-MANAGEMENT",
    name: "Cybersecurity Risk Management Measures",
    description:
      "Essential and important entities must implement appropriate technical and organisational measures to manage cybersecurity risks.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(1)-(2)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Clause 6.1 + Annex A",
          status: "published",
        },
        {
          framework: "CCSDS",
          reference: "350.1-G-3 (threat taxonomy)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG + BSI-TR-03184",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI NIS2 Referential",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74-78",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-INCIDENT-REPORTING",
    name: "Cybersecurity Incident Reporting (24h/72h/1mo)",
    description:
      "Significant incidents must be reported: early warning within 24 hours, incident notification within 72 hours, final report within 1 month.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 23", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A.5.24",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "DE", reference: "NIS2UmsuCG §32", status: "enacted" },
        {
          jurisdiction: "FR",
          reference: "ANSSI Incident Notification",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 89-92",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-ACCESS-CONTROL",
    name: "Access Control and Authentication",
    description:
      "Role-based access control, multi-factor authentication for critical operations, privileged access management, and TT&C command authentication.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "NIS2",
          reference: "Art. 21(2)(i)-(j)",
          status: "enacted",
        },
        {
          framework: "ISO_27001",
          reference: "Annex A.8.2/A.8.5",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Part 1 Section 6",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 79-84",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-BCP",
    name: "Business Continuity and Disaster Recovery",
    description:
      "Business continuity plans with defined RTO/RPO, regular testing, and integration with incident response procedures.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(c)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A.5.30",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI IT-Grundschutz DER.4",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "CNES PCA/PRA requirement",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 85-88",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-SUPPLY-CHAIN",
    name: "Supply Chain Security",
    description:
      "Security requirements for suppliers, SBOM management, COTS component assessment, and contractual security clauses.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(d)", status: "enacted" },
        {
          framework: "CCSDS",
          reference: "Supply Chain Threats (350.1-G-3)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Part 1 Section 6",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 78(2)",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-EUSRN",
    name: "EU Space Resilience Network Notification",
    description:
      "Cross-border space cybersecurity coordination through the EUSRN. This is a NEW obligation with no enacted equivalent.",
    category: "cybersecurity",
    references: {
      international: [],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 93-95",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INSURANCE
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "INSURANCE-TPL",
    name: "Third-Party Liability Insurance",
    description:
      "Operators must maintain insurance or financial guarantee covering third-party liability. Requirements vary by jurisdiction.",
    category: "insurance",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Liability Convention 1972",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "LOS Art. 6 (€60M min)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 s.12 (MIR approach)",
          status: "enacted",
        },
        {
          jurisdiction: "NL",
          reference: "Space Activities Act Art. 7 (risk-based)",
          status: "enacted",
        },
        {
          jurisdiction: "IT",
          reference: "L. 7/2025 (size-tiered: €20M-100M)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 47-50",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECTRUM
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "SPECTRUM-ITU-FILING",
    name: "ITU Frequency Filing and Coordination",
    description:
      "Satellite operators must complete the ITU filing process: Advance Publication, Coordination, Notification, and Recording.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "Art. 9 + Appendix 4",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "FCC 47 CFR Part 25",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "BNetzA Frequenzplan",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Ofcom Space Spectrum Strategy",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 68-71",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT CONTROL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "EXPORT-ITAR-USML",
    name: "ITAR/USML Export License for Space Articles",
    description:
      "US-origin spacecraft, launch vehicles, and related technical data require DDTC export licenses under ITAR USML Categories IV and XV.",
    category: "export_control",
    references: {
      international: [
        {
          framework: "ITAR",
          reference: "22 CFR 121 USML Cat. IV/XV",
          status: "enacted",
        },
        {
          framework: "EAR",
          reference: "15 CFR 774 ECCN 9A515",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "DDTC/BIS License Requirement",
          status: "enacted",
        },
      ],
      euSpaceAct: null,
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENTAL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ENVIRONMENTAL-FOOTPRINT",
    name: "Environmental Footprint Declaration",
    description:
      "Assessment of environmental impact across the mission lifecycle including launch emissions, propellant toxicity, and re-entry debris contamination.",
    category: "environmental",
    references: {
      international: [],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 47-48 + INERIS methodology",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 44-46",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "AUTH-NATIONAL-LICENSE",
    name: "National Space Activity Authorization",
    description:
      "All space activities require authorization from the relevant national competent authority. Requirements and procedures vary by jurisdiction.",
    category: "authorization",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.1 (national framework)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "LOS Art. 2-4 (CNES authorization)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 s.8 (CAA licence)",
          status: "enacted",
        },
        {
          jurisdiction: "NL",
          reference: "Space Activities Act Art. 3",
          status: "enacted",
        },
        {
          jurisdiction: "BE",
          reference: "Belgian Space Act Art. 4",
          status: "enacted",
        },
        {
          jurisdiction: "LU",
          reference: "Space Activities Act Art. 4",
          status: "enacted",
        },
        {
          jurisdiction: "AT",
          reference: "Weltraumgesetz §4",
          status: "enacted",
        },
        {
          jurisdiction: "DK",
          reference: "Danish Outer Space Act §3",
          status: "enacted",
        },
        {
          jurisdiction: "IT",
          reference: "L. 7/2025 Art. 5",
          status: "enacted",
        },
        {
          jurisdiction: "NO",
          reference: "Space Activities Act §2",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 6-15",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "AUTH-REGISTRATION",
    name: "Space Object Registration",
    description:
      "Space objects must be registered in the national registry per the UN Registration Convention.",
    category: "registration",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "UN Registration Convention 1975",
          status: "published",
        },
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.3",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "LOS Registration",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 s.7 Registry",
          status: "enacted",
        },
        {
          jurisdiction: "AT",
          reference: "Weltraumgesetz §11",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 33-38",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DEBRIS — Granular IADC sub-requirements
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "DEBRIS-OPERATIONAL-DEBRIS-DESIGN",
    name: "Design to Prevent Operational Debris Release",
    description:
      "Spacecraft must be designed to avoid release of mission-related objects (lens caps, separation hardware, deployment mechanisms). Where unavoidable, released objects must have orbital lifetimes under 25 years.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.1(a)", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.2.1",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 10.1", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "UK CAA Orbital Operator Licence Guidance",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 70(1)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-BREAKUP-OPERATIONAL-PHASE",
    name: "Break-Up Prevention During Operational Phase",
    description:
      "During operations, spacecraft must be monitored for conditions that could lead to break-up. If a break-up risk is detected, disposal and passivation measures must be planned and executed promptly.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.2.2", status: "published" },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 11.2", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "UK CAA Orbital Operator Licence Guidance",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 70(2)(b)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-NO-INTENTIONAL-DESTRUCTION",
    name: "Prohibition on Long-Lived Debris from Intentional Destruction",
    description:
      "Intentional break-up of a spacecraft or orbital stage must not generate long-lived debris. Any intentional destruction must be conducted at sufficiently low altitude that resulting fragments have short orbital lifetimes.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.2.3", status: "published" },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 11.3", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 Licence Conditions",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "DLR Technical Guidelines for Debris Mitigation",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 70(2)(c)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-POST-MISSION-DISPOSAL-PLAN",
    name: "Post-Mission Disposal Plan (General)",
    description:
      "All spacecraft and orbital stages must have a documented disposal plan covering all orbital phases. The plan must identify the chosen disposal option and demonstrate compliance with the relevant protected region requirements.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.3", status: "published" },
        {
          framework: "ISO_24113",
          reference: "Section 6.4",
          status: "published",
        },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 12", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "UK CAA Orbital Operator Licence Guidance",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 71",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-MEO-HEO-DISPOSAL",
    name: "MEO/HEO/GTO Disposal to Avoid Protected Regions",
    description:
      "Spacecraft in medium, highly elliptical, or transfer orbits must be disposed of to avoid long-term interference with LEO and GEO protected regions. Options include storage orbits not intersecting protected regions or direct de-orbit.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.3.3", status: "published" },
      ],
      national: [
        { jurisdiction: "FR", reference: "RT Art. 12.3", status: "enacted" },
        {
          jurisdiction: "GB",
          reference: "UK CAA Orbital Operator Licence Guidance",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 71(3)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-5-YEAR-DEORBIT-TREND",
    name: "Emerging 5-Year Post-Mission Disposal Guideline",
    description:
      "WRC-23 and the FCC 5-year rule (effective 2024) signal regulatory convergence towards a 5-year post-mission LEO deorbit requirement. Multiple NCAs are incorporating this shorter timeline into licensing frameworks.",
    category: "debris",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "WRC-23 Resolution [COM6/12]; Agenda Item 7",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "47 CFR §25.114(d)(14)(v) (FCC 5-Year Rule, eff. 2024)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "CAA Orbital Operator Licence Guidance (Rev. 2024)",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "BNetzA/DLR joint guidance (in development)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 71",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-CONTROLLED-REENTRY",
    name: "Controlled Re-Entry for Surviving Objects",
    description:
      "Where a spacecraft or orbital stage is likely to survive re-entry, a controlled re-entry targeting uninhabited areas (oceanic impact zones) should be performed. Casualty risk analysis using validated tools (e.g., DEBRISK, DAS) is required.",
    category: "debris",
    references: {
      international: [
        {
          framework: "IADC",
          reference: "Section 5.3 (re-entry)",
          status: "published",
        },
        {
          framework: "ISO_24113",
          reference: "Section 6.6.2",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 12.4 (DEBRISK tool)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "UK CAA Re-entry Safety Assessment (CAP 2327)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 71(4)",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-CONJUNCTION-ASSESSMENT-COVERAGE",
    name: "Conjunction Assessment During All Orbital Phases",
    description:
      "Operators must perform conjunction assessment for all controlled orbital phases: deployment, station-keeping, orbit-raising, repositioning, and disposal. Subscription to conjunction assessment services and defined response procedures are required.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.4(a)", status: "published" },
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.4",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 13.1 (CNES conjunction services)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "UK CAA Monitor my Satellite programme",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "DLR Technical Guidelines; ESA SST services",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 72(1)",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-CAM-MANOEUVRE-CAPABILITY",
    name: "Collision Avoidance Manoeuvre Propellant Reserve",
    description:
      "Spacecraft with manoeuvre capability must maintain sufficient propellant reserves and operational readiness for collision avoidance throughout the mission. Propellant budgets must allocate margin specifically for CAM execution.",
    category: "debris",
    references: {
      international: [
        { framework: "IADC", reference: "Section 5.4(b)", status: "published" },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 13.2 (CNES propellant budget requirement)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "UK CAA Orbital Operator Licence Guidance",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 72(2)",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-SSA-DATA-SHARING",
    name: "SSA Data Sharing and Orbital Information Exchange",
    description:
      "States and operators should share space surveillance data, conjunction assessment information, and orbital event notifications to improve overall SSA accuracy and safety of operations for all.",
    category: "debris",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.1",
          status: "published",
        },
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.2",
          status: "published",
        },
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.3",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference:
            "CNES Conjunction Assessment Services; French contribution to EU SST",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "UK Space Agency Monitor my Satellite; UK SST programme",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 72-73",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "DEBRIS-SUPERVISION-LIFECYCLE",
    name: "Continuing Supervision of Space Activities — Full Lifecycle",
    description:
      "National competent authorities must supervise space activities across the full mission lifecycle from authorization through end-of-life. Operators must maintain demonstrable compliance at each phase.",
    category: "debris",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.3",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "LOS Art. 7-8; CNES as Technical Authority",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "SIA 2018 s.7; CAA as Regulator",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 14-17",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CYBERSECURITY — NIS2 Granular Requirements
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "CYBER-RISK-ANALYSIS-POLICY",
    name: "Risk Analysis Policy for Space Information Systems",
    description:
      "Entities must adopt documented risk analysis policies covering all space system segments: ground segment, space segment, and communication links. Risk analysis must account for space-specific threats including RF interference, ASAT, and the extended supply chain.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(a)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 5.1",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.1; NIS2UmsuCG §30(1)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI NIS2 Referential v1.0, Objective 1; EBIOS RM",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-INCIDENT-HANDLING",
    name: "Incident Handling Procedures for Space Operations",
    description:
      "Entities must implement incident handling procedures including detection, analysis, containment, and recovery. Space-specific scenarios include loss of satellite command authority, ground station compromise, TT&C link spoofing, and payload data exfiltration.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(b)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 5.24",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.2; NIS2UmsuCG §32",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI NIS2 Referential v1.0, Objective 5; CERT-FR",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-VULNERABILITY-MANAGEMENT",
    name: "Vulnerability Management for Space Systems",
    description:
      "Entities must ensure secure network and information system acquisition, development, and maintenance including vulnerability handling and disclosure. On-orbit software patching constraints require secure-by-design development and formal verification for critical flight software.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(e)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.25",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.5; BSI TR-02102",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 4; ANSSI CSPN certification",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-EFFECTIVENESS-ASSESSMENT",
    name: "Cybersecurity Effectiveness Assessment and Testing",
    description:
      "Entities must adopt policies and procedures to regularly assess the effectiveness of cybersecurity risk-management measures, including penetration testing, red team exercises simulating satellite command hijacking, and continuous KPI monitoring covering IT and OT environments.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(f)", status: "enacted" },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.6; NIS2UmsuCG §30(2)(6)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 7; PASSI-qualified auditors",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-AWARENESS-TRAINING",
    name: "Cyber Hygiene and Cybersecurity Training for Space Personnel",
    description:
      "Entities must implement basic cyber hygiene practices and cybersecurity training covering space-specific threats: social engineering targeting satellite operators, anomalous telemetry recognition, secure handling of command authentication credentials, and consequences of unauthorized commands.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(g)", status: "enacted" },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.7; NIS2UmsuCG §30(2)(7)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 2; CFSSI approved training",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-CRYPTOGRAPHY-POLICY",
    name: "Cryptography and Encryption Policy for TT&C Links",
    description:
      "Entities must establish policies for use of cryptography and encryption covering TT&C link protection, command authentication, telemetry confidentiality, key management for on-orbit systems, and national cryptographic approval requirements.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(h)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.24",
          status: "published",
        },
        {
          framework: "CCSDS",
          reference: "SDLS CCSDS 355.0-B-1 (Space Data Link Security)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI-TR-03184 Section 4.8; BSI-TR-02102 (Cryptographic Mechanisms)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 4.3; ANSSI RGS v2.0",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-HR-SECURITY",
    name: "Human Resources Security for Space Operations Personnel",
    description:
      "Entities must implement HR security measures including background checks and vetting for personnel with access to satellite command systems, mission control, and payload data. Secure offboarding must revoke all space system credentials.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(i)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 6.1",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI-TR-03184 Section 4.9; SÜG (Sicherheitsüberprüfungsgesetz)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI NIS2 Referential v1.0, Objective 2.2; IGI 1300",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-ASSET-MANAGEMENT",
    name: "Asset Management and Access Control for Space Systems",
    description:
      "Entities must maintain a comprehensive inventory of all information assets (satellites, ground stations, TT&C frequencies, orbital slots, mission data archives) and implement least-privilege access control with segregation between command authority, payload operations, and administrative systems.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(i)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.2",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.9.2; BSI IT-Grundschutz INF.14",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 2.3 (cartographie du SI)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-MFA-SPACE-SYSTEMS",
    name: "Multi-Factor Authentication for Satellite Command Systems",
    description:
      "MFA is required for all access to satellite command and control systems, mission planning tools, and ground station networks. Hardware security tokens are recommended for direct satellite command authority given the irreversible nature of certain commands.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(j)", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.5",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.10; BSI-TR-03107 (eID)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 2.4; ANSSI Guide MFA",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-SECURE-COMMUNICATIONS",
    name: "Secured Operational Communications for Space Missions",
    description:
      "All operational communication channels — mission control voice loops, inter-facility data links, launch provider coordination, ground station networks — must use end-to-end encryption for channels carrying satellite operational data, command sequences, or security-sensitive mission information.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 21(2)(j)", status: "enacted" },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BSI-TR-03184 Section 4.10.2; BSI-VS-NfD guidelines",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 4.4; ANSSI certified products",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-INCIDENT-EARLY-WARNING-24H",
    name: "Cybersecurity Incident Early Warning — 24 Hours",
    description:
      "Significant incidents must be reported to the national CSIRT/competent authority within 24 hours. For space operators, significant incidents include unauthorized satellite command access, loss of satellite control, and ground infrastructure compromise affecting mission operations.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "NIS2",
          reference: "Art. 23(1) and Art. 23(4)(a)",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §32(1); BSI reporting portal",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 5.1; CERT-FR portal",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 76",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-INCIDENT-72H-NOTIFICATION",
    name: "Cybersecurity Incident Notification — 72-Hour Report",
    description:
      "Within 72 hours of becoming aware of a significant incident, entities must submit a notification with initial severity assessment, affected systems, indicators of compromise, and cross-border impact assessment. Space operators must identify affected satellite assets and orbital parameters.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "NIS2",
          reference: "Art. 23(2) and Art. 23(4)(b)",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §32(2); BSI-TR-03184 Section 5.2",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI NIS2 Referential v1.0, Objective 5.2",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 76",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-GROUND-SEGMENT-THREATS",
    name: "Ground Segment Security — SCC and Ground Station Protection",
    description:
      "Ground segment infrastructure (spacecraft control centres, TT&C ground stations, mission planning systems) must be protected against unauthorized physical and logical access, command authentication system compromise, and network interconnection exploitation.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "CCSDS",
          reference: "350.1-G-3 Section 3.2 (Ground Segment Threats)",
          status: "published",
        },
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 7.1",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §30(1); BSI-TR-03184 Section 4.2",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 3; CNES Security Guidelines",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-TTC-LINK-PROTECTION",
    name: "TT&C Link Security — Command Injection and Jamming Prevention",
    description:
      "TT&C communication links must be protected against interception, command injection, replay attacks, jamming, and ground station identity spoofing. CCSDS Space Data Link Security Protocol (SDLS) and equivalent mechanisms must be implemented for authentication and encryption.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "CCSDS",
          reference: "350.1-G-3 Section 3.3 (Communication Link Threats)",
          status: "published",
        },
        {
          framework: "CCSDS",
          reference: "SDLS 355.0-B-1 (Space Data Link Security)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §30(2)(d); BSI-TR-03184 Section 5.1",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI NIS2 Referential v1.0, Objective 7; CNES RT-SEC",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(1)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-ONBOARD-SOFTWARE-INTEGRITY",
    name: "On-Board Flight Software Integrity and Space Segment Protection",
    description:
      "On-board satellite systems must be protected against manipulation of flight software, firmware vulnerabilities, attitude sensor spoofing (GPS, star trackers), and unauthorized subsystem activation. Secure boot and software integrity verification are required for space-grade processors.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "CCSDS",
          reference: "350.1-G-3 Section 3.4 (Space Segment Threats)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §30(2)(a); BSI-TR-03184 Section 5.3",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 5; CNES RT-SEC Art. 4",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(2)",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-LAUNCH-SEGMENT-SECURITY",
    name: "Launch Segment and Payload Integration Security",
    description:
      "Launch vehicle flight software, payload integration facilities, and launch site infrastructure must be secured against compromise. Rideshare missions require cross-contamination risk management between co-manifested payloads.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "CCSDS",
          reference: "350.1-G-3 Section 3.5 (Launch Segment Threats)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §30(2)(e); BSI-TR-03184 Section 6.1",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 4; CSG Security Regulations",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-USER-SEGMENT-SECURITY",
    name: "User Segment and Data Distribution Security",
    description:
      "End-user systems that receive, process, and distribute space-derived data must be protected against unauthorized data access, distribution channel spoofing, user terminal firmware compromise, and API exploitation. End-to-end data integrity and confidentiality must be maintained.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "CCSDS",
          reference: "350.1-G-3 Section 3.6 (User Segment Threats)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §30(2)(d); BSI-TR-03184 Section 5.4",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI NIS2 Referential v1.0, Objective 8",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(3)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-INSIDER-THREAT-MANAGEMENT",
    name: "Insider Threat Management for Space Mission Operations",
    description:
      "Space operators must manage insider threats through privileged access control, separation of duties for satellite command authority, social engineering awareness training, and behaviour monitoring for personnel with elevated access to mission-critical systems.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "CCSDS",
          reference: "350.1-G-3 Section 3.8 (Insider Threats)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §30(2)(h); BSI-TR-03184 Section 8.1",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 9; Defence Code Art. L2311-1",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-SPACE-ENVIRONMENT-RESILIENCE",
    name: "Space Environment Resilience for Security-Critical Electronics",
    description:
      "Security architectures must account for environmental threats: solar energetic particle events causing single-event upsets in cryptographic systems, geomagnetic storm-induced communication disruptions, and total ionizing dose degradation of security-critical hardware over mission lifetime.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "CCSDS",
          reference: "350.1-G-3 Section 3.9 (Environmental Threats)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "NIS2UmsuCG §30(2)(a); BSI-TR-03184 Section 9.1",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 2; CNES RNC-CNES-Q-HB-80-527",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-ISMS-GOVERNANCE",
    name: "ISMS Governance and Management Body Accountability",
    description:
      "Management bodies of essential and important entities must approve cybersecurity risk-management measures and oversee their implementation. Management can be held liable for infringements under NIS2 Art. 20.",
    category: "cybersecurity",
    references: {
      international: [
        { framework: "NIS2", reference: "Art. 20", status: "enacted" },
        {
          framework: "ISO_27001",
          reference: "Clause 5.1 (Leadership)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "NIS2UmsuCG §38 (Management liability); BSI IT-Grundschutz ISMS.1",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 1.1; PSSI approval requirement",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-CLOUD-SECURITY",
    name: "Cloud Security for Space Mission Systems",
    description:
      "Space operators using cloud-hosted mission planning, satellite operations SaaS, ground-station-as-a-service, or telemetry processing must implement cloud security addressing data sovereignty, encryption, access controls, and supply chain risk per ISO 27001 A.5.23.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 5.23",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI IT-Grundschutz OPS.2.2 (Cloud Usage); BSI C5 catalogue",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference: "ANSSI SecNumCloud qualification; ANSSI NIS2 Referential",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(2)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-CONFIGURATION-MANAGEMENT",
    name: "Configuration Management for Ground and Flight Systems",
    description:
      "Security configurations of hardware, software, and networks must be established, documented, monitored, and reviewed. Satellite flight software configuration changes must follow formal change control with security impact assessment.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.9",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI IT-Grundschutz OPS.1.1.3 (Patch and Change Management)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 4; Guide d'hygiène Measure 34",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(2)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-SECURITY-LOGGING",
    name: "Security Event Logging and Audit Trail for Space Systems",
    description:
      "Comprehensive security logs must be produced, stored, protected, and analysed. For space operators, logs must cover satellite command logs (all telecommand uploads), TT&C session logs, ground station access, operator actions, anomaly events, and conjunction assessment decisions.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.15",
          status: "published",
        },
        { framework: "NIS2", reference: "Art. 21(2)(e)", status: "enacted" },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI IT-Grundschutz OPS.1.1.5 (Logging); NIS2UmsuCG §30(2)(e)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 6; ANSSI Guide de journalisation",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(2)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-SIEM-MONITORING",
    name: "Continuous Security Monitoring of Space Infrastructure",
    description:
      "Networks, systems, and applications must be monitored for anomalous behaviour. Space-specific monitoring must cover ground segment network traffic, satellite telemetry anomalies, TT&C link integrity, command execution verification, and orbital parameter deviations.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.16",
          status: "published",
        },
        { framework: "NIS2", reference: "Art. 21(2)(f)", status: "enacted" },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI IT-Grundschutz DER.1 (Detection of Security Incidents); NIS2UmsuCG §30(2)(e)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential v1.0, Objective 6; SOC requirements for OIV",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(2)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-SECURE-CODING",
    name: "Secure Coding for Flight and Ground Software",
    description:
      "Secure coding principles must be applied to flight software on satellite processors, ground control system software processing telecommands and telemetry, and internet-exposed data distribution applications. Standards must address memory safety, input validation, and injection attack prevention.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 8.28",
          status: "published",
        },
        { framework: "NIS2", reference: "Art. 21(2)(e)", status: "enacted" },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI IT-Grundschutz CON.8 (Software Development); BSI Secure Coding Guidelines",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI Secure Development Guide; ANSSI NIS2 Referential v1.0, Objective 4",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(2)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "CYBER-PHYSICAL-SECURITY",
    name: "Physical Security Perimeters for Ground Segment Infrastructure",
    description:
      "Physical security perimeters must be defined for all ground segment infrastructure: mission control centres, ground stations, TT&C facilities, satellite integration and test facilities, and data processing centres. Controls must address geographically distributed assets and third-party ground station networks.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "ISO_27001",
          reference: "Annex A, Control 7.1",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference:
            "BSI IT-Grundschutz INF.1 (General Building); INF.2 (Data Centre)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "ANSSI NIS2 Referential; PPMS requirements for OIV facilities",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 74(2)",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SPECTRUM — Granular ITU requirements
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "SPECTRUM-ITU-API",
    name: "ITU Advance Publication Information Filing",
    description:
      "Administrations must submit Advance Publication Information (API) to the ITU Radiocommunication Bureau not earlier than 7 years and not later than 2 years before the planned date of bringing into use. API must include orbital characteristics, frequency bands, service area, and technical parameters.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "RR Art. 9, Section I (No. 9.1–9.2A)",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "47 CFR Part 25 (FCC); NTIA Manual of Regulations",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "BNetzA Frequenzplan; TKG §55",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference:
            "Ofcom Satellite Filing Guidelines; Wireless Telegraphy Act 2006",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 73",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "SPECTRUM-ITU-COORDINATION",
    name: "ITU Frequency Coordination with Affected Administrations",
    description:
      "Before notification to the MIFR, the responsible administration must complete bilateral or multilateral coordination with all administrations whose satellite networks or terrestrial services may be affected. Coordination requires agreeing on technical parameters, power limits, and operational constraints.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "RR Art. 9, Sections II–III; Appendix 4",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "47 CFR §25.111–25.117 (FCC Part 25)",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "BNetzA Frequenzplan; TKG §55–56",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Ofcom Satellite Filing Guidelines; WT Act 2006 s.8",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 73",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "SPECTRUM-ITU-MIFR-NOTIFICATION",
    name: "MIFR Notification and Recording for Satellite Networks",
    description:
      "Following coordination, satellite frequency assignments must be notified to the ITU Radiocommunication Bureau for examination and recording in the Master International Frequency Register (MIFR). Recording confers international recognition and protection against harmful interference.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "RR Art. 11 (No. 11.2–11.49)",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "47 CFR §25.117 (FCC Part 25)",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "BNetzA Frequenzplan; TKG §57",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Ofcom Satellite Filing Guidelines",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 73",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "SPECTRUM-ITU-EPFD-NGSO",
    name: "NGSO EPFD Limits Protecting GSO Networks",
    description:
      "NGSO systems operating in bands shared with GSO networks must not exceed equivalent power flux density (EPFD) limits per ITU RR Art. 22. Compliance must be demonstrated through ITU-approved EPFD validation software considering full constellation geometry.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "RR Art. 22; Appendix 5, Resolution 76 (Rev. WRC-15)",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "47 CFR §25.146 (FCC Part 25); FCC NGSO Processing Rules",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "BNetzA Frequenzplan; ITU Art. 22 direct application",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Ofcom NGSO Licensing Framework",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 73",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "SPECTRUM-ITU-HARMFUL-INTERFERENCE",
    name: "Harmful Interference Prevention and Resolution",
    description:
      "All satellite stations must be established and operated so as not to cause harmful interference to other stations operating in accordance with the Radio Regulations. Operators must implement power control, beam shaping, and frequency management to minimise interference potential.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "RR Art. 15 (No. 15.1–15.14)",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference: "47 CFR §25.140, §25.204 (FCC Part 25)",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "TKG §63; BNetzA interference resolution procedures",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Wireless Telegraphy Act 2006 s.54; Ofcom enforcement",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 73",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "SPECTRUM-ITU-EOL-CESSATION",
    name: "Cessation of Satellite Emissions at End of Life",
    description:
      "Space stations must cease all emissions at end of operational life to avoid harmful interference. On-board transmitters must be permanently disabled during end-of-life disposal. The responsible administration must notify the ITU BR for cancellation from the MIFR.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "RR Art. 25 (No. 25.1–25.11); RR Art. 22.1",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference:
            "47 CFR §25.282 (FCC End-of-Life Disposal); FCC Bond Order",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference:
            "BNetzA Frequenzplan; TKG §57 (cancellation of assignments)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Ofcom Orbital Operator Licence Conditions; WT Act 2006",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 71; Art. 73",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "SPECTRUM-WRC23-ALLOCATIONS",
    name: "WRC-23 Updated Spectrum Allocations for Satellite Services",
    description:
      "WRC-23 adopted updated frequency allocations and sharing conditions for satellite services including IMT co-existence criteria in 3600–3800 MHz, updated NGSO Ka-band sharing (17.7–20.2 GHz / 27.5–30.0 GHz), and new EESS allocations. Operators must verify continued compliance.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "ITU_RR",
          reference: "WRC-23 Agenda Items 1.2, 1.3, 1.5",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "US",
          reference:
            "FCC ET Docket WRC-23 implementation; NTIA Spectrum Strategy",
          status: "enacted",
        },
        {
          jurisdiction: "DE",
          reference: "BNetzA Frequenzplan (2024 update)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Ofcom Spectrum Framework Review (2024)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 73",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION — COPUOS Policy and Regulatory Framework
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "AUTH-REGULATORY-FRAMEWORK-ELEMENTS",
    name: "National Regulatory Framework Elements per COPUOS A.2",
    description:
      "In developing national regulatory frameworks, states should address: authorization and supervision conditions, debris mitigation requirements, registration practices, liability provisions, insurance or financial guarantee requirements, frequency coordination, and protection of the space environment.",
    category: "authorization",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.2",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "LOS Art. 4–6; Arrêté du 31 mars 2011",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "UK Space Industry Act 2018; SI 2021/792",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 7-10",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "AUTH-SPECTRUM-MANAGEMENT",
    name: "Spectrum Management and Equitable Orbital Slot Use",
    description:
      "States must ensure equitable, rational, and efficient use of the radio frequency spectrum and orbital regions in accordance with ITU Constitution, Convention, and Radio Regulations, including proper frequency coordination and registration of satellite networks.",
    category: "spectrum",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.4",
          status: "published",
        },
        {
          framework: "ITU_RR",
          reference: "Art. 9 + Art. 11",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference:
            "Code des postes et des communications électroniques; ARCEP/ANFR",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Communications Act 2003; Ofcom Spectrum Management",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 85-86",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "AUTH-REGISTRATION-ENHANCEMENT",
    name: "Enhanced Space Object Registration Practices",
    description:
      "States must register all objects launched into Earth orbit and provide registration information to the UN as soon as practicable. Registration must be updated for orbital status changes and end-of-life disposal.",
    category: "registration",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.5",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "LOS Art. 11; Registration Convention",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Outer Space Act 1986 s.7; UK Space Registry",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 59-61",
        relationship: "extends",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  {
    id: "AUTH-SUSTAINABILITY-POLICY",
    name: "National Space Sustainability Policy Development",
    description:
      "States should develop or adapt national policies on long-term sustainability of outer space activities, informed by COPUOS guidelines, promoting safe and sustainable use of outer space for current and future generations.",
    category: "authorization",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline A.7",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference:
            "French National Space Strategy; LOS implementation decrees",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference:
            "UK National Space Strategy 2021; UK Space Sustainability Plan",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 1-3",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // INSURANCE — Additional detail
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "INSURANCE-LIABILITY-CONVENTION",
    name: "Liability Convention Obligations — State Absolute Liability",
    description:
      "Under the 1972 Liability Convention, launching states bear absolute liability for damage caused by their space objects on the surface of the Earth or to aircraft in flight, and fault-based liability for damage in outer space. Operators must support their state's liability obligations.",
    category: "insurance",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Liability Convention 1972 (UNCOPUOS)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference:
            "LOS Art. 5-6 (Government recourse rights); €60M minimum guarantee",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Outer Space Act 1986 s.10; SIA 2018 s.32 (indemnity)",
          status: "enacted",
        },
        {
          jurisdiction: "NL",
          reference: "Space Activities Act Art. 7-8 (risk-based assessment)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 47-50",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // EXPORT CONTROL — Additional detail
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "EXPORT-EU-DUAL-USE",
    name: "EU Dual-Use Regulation for Space Technology",
    description:
      "EU Regulation 2021/821 controls export of dual-use items including space-related technology in Category 9 (Aerospace and Propulsion) of Annex I. Exporters within the EU require licences from national competent authorities for controlled space technology exports.",
    category: "export_control",
    references: {
      international: [
        {
          framework: "EAR",
          reference: "EU Dual-Use Reg. 2021/821, Annex I, Category 9",
          status: "enacted",
        },
      ],
      national: [
        {
          jurisdiction: "DE",
          reference: "BAFA Dual-Use Licensing (Außenwirtschaftsgesetz AWG)",
          status: "enacted",
        },
        {
          jurisdiction: "FR",
          reference:
            "Direction Générale des Entreprises (DGE) dual-use export control",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference:
            "Export Control Joint Unit (ECJU); Export Control Order 2008",
          status: "enacted",
        },
      ],
      euSpaceAct: null,
    },
    confidence: "verified",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENTAL — Additional requirements
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ENVIRONMENTAL-PROPELLANT-TOXICITY",
    name: "Propellant Toxicity and Ground Hazard Assessment",
    description:
      "Operators must assess the toxicity of propellants used in spacecraft and launch vehicles, including ground handling hazards at launch sites and re-entry contamination risk from surviving propellant tanks. Hydrazine and other toxic propellants require specific safety assessments.",
    category: "environmental",
    references: {
      international: [],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 47 + INERIS toxicological assessment",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference: "Environment Act 1995; Health and Safety at Work Act 1974",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 44",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "ENVIRONMENTAL-NUCLEAR-POWER-SOURCES",
    name: "Nuclear Power Sources Safety Assessment",
    description:
      "Spacecraft incorporating nuclear power sources (RTGs, nuclear reactors) require safety assessments covering launch accident scenarios, re-entry fragmentation, and long-term ground contamination risk. UN Principles on NPS in Outer Space apply.",
    category: "environmental",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "UN Principles on NPS (A/RES/47/68)",
          status: "published",
        },
      ],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 48 (special provisions for NPS)",
          status: "enacted",
        },
        {
          jurisdiction: "GB",
          reference:
            "Nuclear Installations Act 1965; CAA special licence conditions",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 45",
        relationship: "codifies",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "ENVIRONMENTAL-LAUNCH-EMISSIONS",
    name: "Launch Vehicle Atmospheric Emissions Assessment",
    description:
      "Assessment of the atmospheric emissions from launch vehicles, including black carbon (soot) deposition in the upper atmosphere, ozone depletion from solid rocket motor exhausts, and stratospheric aerosol injection effects over mission lifetime.",
    category: "environmental",
    references: {
      international: [],
      national: [
        {
          jurisdiction: "FR",
          reference: "RT Art. 47-48 + INERIS methodology (atmospheric impact)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 44-46",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW EU SPACE ACT OBLIGATIONS (no current enacted equivalent)
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "EUSA-OPERATOR-CATEGORY",
    name: "EU Space Act Operator Categorisation",
    description:
      "The EU Space Act introduces a harmonised categorisation of space operators (satellite operators, launch operators, launch site operators, space infrastructure providers, downstream service providers) with differentiated obligations based on category and size.",
    category: "authorization",
    references: {
      international: [],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 16-22",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "EUSA-SINGLE-AUTHORISATION",
    name: "EU Single Authorisation Mechanism",
    description:
      "The EU Space Act proposes a single EU-level authorisation mechanism allowing operators to obtain an EU authorisation valid across all member states, rather than requiring separate national licences in each jurisdiction.",
    category: "authorization",
    references: {
      international: [],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 23-32",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "EUSA-EU-SPACE-REGISTER",
    name: "EU Space Object Register",
    description:
      "The EU Space Act proposes an EU-level space object register complementing national registries and the UN register. All space objects operated by EU-authorised entities would be listed in the EU register.",
    category: "registration",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "UN Registration Convention 1975",
          status: "published",
        },
      ],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 33-38",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "EUSA-HARMONISED-INSURANCE",
    name: "EU Harmonised Space Activity Insurance Framework",
    description:
      "The EU Space Act proposes harmonised minimum insurance or financial guarantee requirements across the EU, replacing the current patchwork of divergent national insurance minimums (e.g., €60M France, size-tiered Italy, market-based UK).",
    category: "insurance",
    references: {
      international: [],
      national: [
        {
          jurisdiction: "FR",
          reference: "LOS Art. 6 (€60M minimum)",
          status: "enacted",
        },
        {
          jurisdiction: "IT",
          reference: "L. 7/2025 (€20M-100M size-tiered)",
          status: "enacted",
        },
      ],
      euSpaceAct: {
        articleRef: "Art. 47-50",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "EUSA-DEBRIS-ACTIVE-REMOVAL",
    name: "Active Debris Removal (ADR) Regulatory Framework",
    description:
      "The EU Space Act proposes a new regulatory framework for active debris removal missions, establishing authorization requirements for ADR operators, liability allocation for ADR operations, and coordination obligations with object owners.",
    category: "debris",
    references: {
      international: [],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 63",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "EUSA-IN-ORBIT-SERVICING",
    name: "In-Orbit Servicing (IOS) Authorization Framework",
    description:
      "The EU Space Act introduces specific authorization requirements for in-orbit servicing activities (refuelling, repair, life extension), including safety case requirements, proximity operations protocols, and coordination obligations with satellite owners.",
    category: "authorization",
    references: {
      international: [],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 62",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "EUSA-SPACE-TRAFFIC-MANAGEMENT",
    name: "EU Space Traffic Management Framework",
    description:
      "The EU Space Act proposes a coordinated EU approach to space traffic management, including mandatory use of EU SST services, coordination protocols between operators, and EU-level oversight of conjunction assessment and collision avoidance.",
    category: "debris",
    references: {
      international: [
        {
          framework: "COPUOS_LTS",
          reference: "Guideline B.4",
          status: "published",
        },
      ],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 64-66",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },

  {
    id: "EUSA-SPACE-CYBERSECURITY-CERT",
    name: "EU Space Cybersecurity Certification Scheme",
    description:
      "The EU Space Act proposes a sector-specific cybersecurity certification scheme for space systems, aligned with the EU Cybersecurity Act (ENISA) framework, establishing assurance levels for satellite components, ground systems, and data processing infrastructure.",
    category: "cybersecurity",
    references: {
      international: [
        {
          framework: "NIS2",
          reference: "Art. 24 (harmonised standards)",
          status: "enacted",
        },
      ],
      national: [],
      euSpaceAct: {
        articleRef: "Art. 77-78",
        relationship: "new_obligation",
        status: "proposal",
      },
    },
    confidence: "interpreted",
  },
];

// ─── Lookup Functions ────────────────────────────────────────────────────────

export function getAllMappings(): RegulatoryMapping[] {
  return REGULATORY_MAPPINGS;
}

export function getMappingById(id: string): RegulatoryMapping | null {
  return REGULATORY_MAPPINGS.find((m) => m.id === id) || null;
}

export function getMappingsByCategory(category: string): RegulatoryMapping[] {
  return REGULATORY_MAPPINGS.filter((m) => m.category === category);
}

/**
 * Find all mappings that have enacted equivalents (not "new_obligation" only).
 * These are the requirements operators can already comply with today.
 */
export function getActionableMappings(): RegulatoryMapping[] {
  return REGULATORY_MAPPINGS.filter(
    (m) =>
      m.references.international.length > 0 || m.references.national.length > 0,
  );
}

/**
 * Find mappings that are new EU Space Act obligations with no enacted equivalent.
 * These are future-preparation only — no current compliance requirement.
 */
export function getNewObligationMappings(): RegulatoryMapping[] {
  return REGULATORY_MAPPINGS.filter(
    (m) =>
      m.references.euSpaceAct?.relationship === "new_obligation" &&
      m.references.international.length === 0 &&
      m.references.national.length === 0,
  );
}
