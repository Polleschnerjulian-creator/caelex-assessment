/**
 * CRA (EU) 2024/2847 — Cyber Resilience Act
 * Static knowledge for ASTRA AI copilot
 */

export const CRA_KNOWLEDGE = {
  regulation: {
    name: "Cyber Resilience Act",
    reference: "Regulation (EU) 2024/2847",
    entryIntoForce: "2024-12-10",
    reportingObligationsDate: "2026-09-11",
    fullApplicationDate: "2027-12-11",
    scope:
      "Products with digital elements placed on the EU market. Applies to manufacturers, importers, and distributors. Excludes non-commercial open-source software.",
  },

  productClasses: {
    default: {
      name: "Default",
      conformityRoute: "Self-assessment (Annex VIII)",
      description:
        "Products with digital elements that do not fall into Class I or Class II. Manufacturer performs internal control and self-declares conformity.",
    },
    class_I: {
      name: "Class I (Important Product)",
      conformityRoute:
        "Harmonised standard (Annex VIII) or EU type examination (Annex VII)",
      description:
        "Products listed in CRA Annex III. Higher cybersecurity risk. Can self-assess if using harmonised standards, otherwise requires third-party assessment.",
      annexIIICategories: [
        "2.1: Network-capable products",
        "2.2: Network management/security products",
        "2.3: Products with cryptographic functions",
        "2.4: Products processing positioning/timing data",
      ],
    },
    class_II: {
      name: "Class II (Critical Product)",
      conformityRoute:
        "Mandatory third-party assessment: EU type examination (Annex VII) or full quality assurance (Annex VI)",
      description:
        "Products listed in CRA Annex IV. Highest cybersecurity risk. Must undergo assessment by a Notified Body.",
      annexIVCategories: [
        "1: Industrial automation and control systems in critical infrastructure",
        "2: Products processing authentication/authorization data in critical infrastructure",
        "3: Cryptographic devices and key management systems",
      ],
    },
  },

  spaceContext: {
    overview:
      "The CRA applies to satellite components with digital elements: on-board computers, ground segment software, software-defined radios, AOCS flight software, TT&C systems, and more. Space products are particularly affected because satellite systems are critical infrastructure under NIS2 Annex I Sector 11.",
    classIIExamples: [
      "On-board Computer (OBC) — controls safety-critical spacecraft functions",
      "AOCS Flight Software — controls attitude and orbit, debris generation risk",
      "TT&C Ground System — processes spacecraft authentication and encryption",
      "Mission Control Software — central C2 for satellite fleet",
      "Hardware Security Module (space-grade) — cryptographic key management",
    ],
    classIExamples: [
      "Software-Defined Radio — network interface with crypto",
      "GNSS Receiver — positioning data in safety context",
      "Intersatellite Link Terminal — network + crypto",
      "Ground Station Software — network management",
      "Payload Data Processor — data processing with bus interface",
    ],
    defaultExamples: [
      "Star Tracker — sensor, no network function",
      "Reaction Wheel — actuator with simple controller",
      "Ground Monitoring Tool — read-only visualization",
    ],
  },

  nis2Overlap: {
    overview:
      "CRA and NIS2 have significant overlap. NIS2 regulates the entity (operator), CRA regulates the product. A spacecraft manufacturer may be subject to both. Key overlaps: risk analysis, vulnerability handling, incident reporting, cryptography, supply chain/SBOM.",
    keyOverlaps: [
      {
        cra: "Annex I Part I §1 (Security by Design)",
        nis2: "Art. 21(2)(a) (Risk Analysis)",
        relationship: "overlaps",
      },
      {
        cra: "Annex I Part I §2 (Vulnerability Handling)",
        nis2: "Art. 21(2)(e) (System Maintenance)",
        relationship: "implements",
      },
      {
        cra: "Annex I Part II §2 (SBOM)",
        nis2: "Art. 21(2)(d) (Supply Chain)",
        relationship: "extends",
      },
      {
        cra: "Art. 14 (Incident Reporting)",
        nis2: "Art. 23 (Incident Reporting)",
        relationship: "overlaps",
      },
    ],
  },

  penalties: {
    annexIViolation: "EUR 15,000,000 or 2.5% of worldwide annual turnover",
    otherViolation: "EUR 10,000,000 or 2% of worldwide annual turnover",
    incorrectInfo: "EUR 5,000,000 or 1% of worldwide annual turnover",
  },

  timeline: [
    { date: "2024-12-10", event: "CRA entered into force (Art. 71)" },
    {
      date: "2026-09-11",
      event:
        "Reporting obligations for actively exploited vulnerabilities (Art. 14)",
    },
    {
      date: "2027-12-11",
      event: "Full application of all requirements (Art. 71(2))",
    },
  ],
};
