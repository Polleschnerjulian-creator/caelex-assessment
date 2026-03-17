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
