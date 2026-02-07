/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Cross-regulation reference mappings between NIS2 Directive, EU Space Act,
 * ENISA Space Threat Landscape, and ISO 27001.
 *
 * This file represents significant regulatory research and analysis investment.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import {
  CrossReference,
  RegulationType,
  CrossReferenceRelationship,
} from "@/lib/nis2-types";

// ─── Cross-Reference Database ───
// Maps relationships between NIS2, EU Space Act, ENISA Space controls, and ISO 27001.
// The EU Space Act will be lex specialis for space operators, meaning it will supersede
// NIS2 for space-specific requirements once it enters into force (2030).

export const CROSS_REFERENCES: CrossReference[] = [
  // ================================================================
  // NIS2 Art. 21(2)(a) ↔ Risk Analysis & Information Security Policy
  // ================================================================
  {
    id: "xref-001",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(a)",
    sourceTitle: "Policies on risk analysis and information system security",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 76",
    targetTitle: "Risk Management Obligation",
    relationship: "overlaps",
    description:
      "Both require cybersecurity risk management frameworks. EU Space Act Art. 76 mandates space-specific risk management that covers NIS2 Art. 21(2)(a) scope for space operators.",
    confidence: "confirmed",
  },
  {
    id: "xref-002",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(a)",
    sourceTitle: "Policies on risk analysis and information system security",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 77-78",
    targetTitle: "Risk Assessment Requirements",
    relationship: "extends",
    description:
      "EU Space Act Art. 77-78 extends NIS2 risk assessment requirements with space-specific threat categories including RF interference, space weather, and orbital debris impacts on cyber systems.",
    confidence: "confirmed",
  },
  {
    id: "xref-003",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(a)",
    sourceTitle: "Policies on risk analysis and information system security",
    targetRegulation: "iso27001",
    targetArticle: "A.5.1",
    targetTitle: "Policies for information security",
    relationship: "implements",
    description:
      "ISO 27001 A.5.1 provides the framework for implementing NIS2 Art. 21(2)(a) information security policies.",
    confidence: "confirmed",
  },
  {
    id: "xref-004",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(a)",
    sourceTitle: "Policies on risk analysis and information system security",
    targetRegulation: "enisa_space",
    targetArticle: "1.1-1.8",
    targetTitle: "Governance & Risk Management controls",
    relationship: "implements",
    description:
      "ENISA Space Threat Landscape governance controls provide space-specific implementation guidance for NIS2 risk analysis policies.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(b) ↔ Incident Handling
  // ================================================================
  {
    id: "xref-005",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(b)",
    sourceTitle: "Incident handling",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 83-85",
    targetTitle: "Detection, Monitoring, and Incident Response",
    relationship: "overlaps",
    description:
      "EU Space Act Art. 83-85 covers incident detection and response with space-specific requirements (conjunction events, signal interference, commanding anomalies) that satisfy NIS2 incident handling for space operators.",
    confidence: "confirmed",
  },
  {
    id: "xref-006",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(b)",
    sourceTitle: "Incident handling",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 89-92",
    targetTitle: "Incident Reporting",
    relationship: "supersedes",
    description:
      "EU Space Act Art. 89-92 will supersede NIS2 Art. 23 incident reporting for space operators, with a 12-hour early warning (vs NIS2's 24-hour) and space-specific reporting requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-007",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(b)",
    sourceTitle: "Incident handling",
    targetRegulation: "iso27001",
    targetArticle: "A.5.24-A.5.28",
    targetTitle: "Information security incident management",
    relationship: "implements",
    description:
      "ISO 27001 incident management controls provide the process framework for NIS2 incident handling requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-008",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(b)",
    sourceTitle: "Incident handling",
    targetRegulation: "enisa_space",
    targetArticle: "10.1-10.8",
    targetTitle: "Incident Management controls",
    relationship: "implements",
    description:
      "ENISA space incident management controls address space-specific incident types including orbital anomalies, RF interference, and loss of spacecraft contact.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(c) ↔ Business Continuity & Crisis Management
  // ================================================================
  {
    id: "xref-009",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(c)",
    sourceTitle: "Business continuity and crisis management",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 85",
    targetTitle: "Business Continuity Planning",
    relationship: "overlaps",
    description:
      "EU Space Act Art. 85 requires business continuity planning for space operations, covering mission continuity, ground station failover, and emergency procedures that align with NIS2 requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-010",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(c)",
    sourceTitle: "Business continuity and crisis management",
    targetRegulation: "iso27001",
    targetArticle: "A.5.29-A.5.30",
    targetTitle: "ICT readiness for business continuity",
    relationship: "implements",
    description:
      "ISO 27001 business continuity controls provide the framework for implementing NIS2 BCP requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-011",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(c)",
    sourceTitle: "Business continuity and crisis management",
    targetRegulation: "enisa_space",
    targetArticle: "11.1-11.5",
    targetTitle: "Business Continuity controls",
    relationship: "implements",
    description:
      "ENISA space business continuity controls address mission continuity, ground station redundancy, and disaster recovery for space operations.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(d) ↔ Supply Chain Security
  // ================================================================
  {
    id: "xref-012",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(d)",
    sourceTitle: "Supply chain security",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 73",
    targetTitle: "Supply Chain Design/Manufacturing Compliance",
    relationship: "overlaps",
    description:
      "EU Space Act Art. 73 addresses supply chain compliance for spacecraft manufacturing, including security requirements for components and subcontractors that align with NIS2 supply chain security.",
    confidence: "confirmed",
  },
  {
    id: "xref-013",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(d)",
    sourceTitle: "Supply chain security",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 99",
    targetTitle: "Supplier Data Requirements (EFD)",
    relationship: "references",
    description:
      "EU Space Act Art. 99 requires supply chain data for environmental footprint declarations, creating an opportunity to integrate cybersecurity supply chain assessments.",
    confidence: "interpreted",
  },
  {
    id: "xref-014",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(d)",
    sourceTitle: "Supply chain security",
    targetRegulation: "iso27001",
    targetArticle: "A.5.19-A.5.23",
    targetTitle: "Supplier relationships",
    relationship: "implements",
    description:
      "ISO 27001 supplier management controls provide the framework for NIS2 supply chain security, including supplier assessment and monitoring.",
    confidence: "confirmed",
  },
  {
    id: "xref-015",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(d)",
    sourceTitle: "Supply chain security",
    targetRegulation: "enisa_space",
    targetArticle: "9.1-9.5",
    targetTitle: "Supplier Relationship Management",
    relationship: "implements",
    description:
      "ENISA supply chain controls address space-specific supply chain risks including counterfeit components and compromised flight software.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(e) ↔ Network & IS Acquisition/Development
  // ================================================================
  {
    id: "xref-016",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(e)",
    sourceTitle:
      "Security in network and information systems acquisition, development and maintenance",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 79-82",
    targetTitle: "Information Security and Access Control",
    relationship: "overlaps",
    description:
      "EU Space Act Art. 79-82 mandates information security measures including secure system development and maintenance for space information systems.",
    confidence: "confirmed",
  },
  {
    id: "xref-017",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(e)",
    sourceTitle:
      "Security in network and information systems acquisition, development and maintenance",
    targetRegulation: "iso27001",
    targetArticle: "A.8.25-A.8.33",
    targetTitle: "Secure development lifecycle",
    relationship: "implements",
    description:
      "ISO 27001 secure development controls provide the methodology for implementing NIS2 requirements for secure system acquisition and development.",
    confidence: "confirmed",
  },
  {
    id: "xref-018",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(e)",
    sourceTitle:
      "Security in network and information systems acquisition, development and maintenance",
    targetRegulation: "enisa_space",
    targetArticle: "8.1-8.6",
    targetTitle: "System Acquisition & Development",
    relationship: "implements",
    description:
      "ENISA controls for system acquisition cover secure-by-design for spacecraft software, security requirements in procurement, and OTA update security.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(f) ↔ Effectiveness Assessment
  // ================================================================
  {
    id: "xref-019",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(f)",
    sourceTitle:
      "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 88",
    targetTitle: "Threat-Led Penetration Testing (TLPT)",
    relationship: "extends",
    description:
      "EU Space Act Art. 88 mandates TLPT before launch — a more stringent effectiveness assessment than NIS2 Art. 21(2)(f) requires, specifically covering space system attack surfaces.",
    confidence: "confirmed",
  },
  {
    id: "xref-020",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(f)",
    sourceTitle:
      "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures",
    targetRegulation: "iso27001",
    targetArticle: "A.5.35-A.5.36",
    targetTitle: "Independent review and compliance with policies",
    relationship: "implements",
    description:
      "ISO 27001 audit and review controls support the implementation of NIS2 effectiveness assessment requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-021",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(f)",
    sourceTitle:
      "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures",
    targetRegulation: "enisa_space",
    targetArticle: "12.1-12.5",
    targetTitle: "Compliance & Audit",
    relationship: "implements",
    description:
      "ENISA compliance and audit controls provide space-specific assessment methodologies including RF penetration testing and satellite ground system security audits.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(g) ↔ Cyber Hygiene & Training
  // ================================================================
  {
    id: "xref-022",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(g)",
    sourceTitle: "Basic cyber hygiene practices and cybersecurity training",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 74-75",
    targetTitle: "General Principles and NIS2 Relationship",
    relationship: "references",
    description:
      "EU Space Act Art. 74-75 establishes the framework relationship with NIS2, requiring space operators to maintain baseline cyber hygiene per NIS2 requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-023",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(g)",
    sourceTitle: "Basic cyber hygiene practices and cybersecurity training",
    targetRegulation: "iso27001",
    targetArticle: "A.6.3",
    targetTitle: "Information security awareness, education and training",
    relationship: "implements",
    description:
      "ISO 27001 security awareness and training control directly supports NIS2 cyber hygiene and training requirements.",
    confidence: "confirmed",
  },

  // ================================================================
  // NIS2 Art. 21(2)(h) ↔ Cryptography & Encryption
  // ================================================================
  {
    id: "xref-024",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(h)",
    sourceTitle:
      "Policies and procedures regarding the use of cryptography and encryption",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 81-82",
    targetTitle: "Cryptography and Access Control",
    relationship: "overlaps",
    description:
      "EU Space Act Art. 81-82 mandates encryption for space communications and telecommand authentication, directly overlapping with NIS2 cryptography requirements for space operators.",
    confidence: "confirmed",
  },
  {
    id: "xref-025",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(h)",
    sourceTitle:
      "Policies and procedures regarding the use of cryptography and encryption",
    targetRegulation: "iso27001",
    targetArticle: "A.8.24",
    targetTitle: "Use of cryptography",
    relationship: "implements",
    description:
      "ISO 27001 cryptography control provides the policy framework for implementing NIS2 encryption requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-026",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(h)",
    sourceTitle:
      "Policies and procedures regarding the use of cryptography and encryption",
    targetRegulation: "enisa_space",
    targetArticle: "4.1-4.6",
    targetTitle: "Cryptography controls",
    relationship: "implements",
    description:
      "ENISA cryptography controls address space-specific encryption needs: uplink/downlink encryption, telecommand authentication, key management for space systems, and quantum-safe transition planning.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(i) ↔ HR Security, Access Control, Asset Mgmt
  // ================================================================
  {
    id: "xref-027",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(i)",
    sourceTitle:
      "Human resources security, access control policies and asset management",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 79-80",
    targetTitle: "Information Security and Access Control",
    relationship: "overlaps",
    description:
      "EU Space Act Art. 79-80 covers access control for space operations including mission control access, ground station security, and personnel vetting requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-028",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(i)",
    sourceTitle:
      "Human resources security, access control policies and asset management",
    targetRegulation: "iso27001",
    targetArticle: "A.6.1-A.6.8, A.5.15-A.5.18",
    targetTitle: "People controls and access management",
    relationship: "implements",
    description:
      "ISO 27001 people controls and access management provide comprehensive frameworks for NIS2 HR security and access control requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-029",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(i)",
    sourceTitle:
      "Human resources security, access control policies and asset management",
    targetRegulation: "enisa_space",
    targetArticle: "2.1-2.6, 3.1-3.6",
    targetTitle: "Asset Management and Access Control",
    relationship: "implements",
    description:
      "ENISA asset management and access control controls address space-specific needs: satellite asset inventory, ground station access control, and mission-critical role screening.",
    confidence: "interpreted",
  },

  // ================================================================
  // NIS2 Art. 21(2)(j) ↔ MFA & Authentication
  // ================================================================
  {
    id: "xref-030",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(j)",
    sourceTitle:
      "Use of multi-factor authentication, continuous authentication solutions, and secured communications",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 80",
    targetTitle: "Access Control",
    relationship: "overlaps",
    description:
      "EU Space Act Art. 80 access control requirements include authentication for mission-critical operations, which aligns with NIS2 MFA requirements.",
    confidence: "confirmed",
  },
  {
    id: "xref-031",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(2)(j)",
    sourceTitle:
      "Use of multi-factor authentication, continuous authentication solutions, and secured communications",
    targetRegulation: "iso27001",
    targetArticle: "A.8.5",
    targetTitle: "Secure authentication",
    relationship: "implements",
    description:
      "ISO 27001 secure authentication control directly supports NIS2 MFA requirements.",
    confidence: "confirmed",
  },

  // ================================================================
  // NIS2 Art. 23 ↔ Incident Reporting
  // ================================================================
  {
    id: "xref-032",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 23",
    sourceTitle: "Reporting obligations",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 89-92",
    targetTitle: "Incident Reporting",
    relationship: "supersedes",
    description:
      "EU Space Act Art. 89-92 will supersede NIS2 Art. 23 for space operators. The Space Act requires 12-hour early warning (vs NIS2's 24 hours) and includes space-specific incident categories.",
    confidence: "confirmed",
  },
  {
    id: "xref-033",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 23(4)(a)",
    sourceTitle: "Early warning within 24 hours",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 89",
    targetTitle: "Early Warning (12 hours)",
    relationship: "supersedes",
    description:
      "EU Space Act requires a 12-hour early warning for significant incidents, more stringent than NIS2's 24-hour requirement.",
    confidence: "confirmed",
  },
  {
    id: "xref-034",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 23(4)(b)",
    sourceTitle: "Incident notification within 72 hours",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 90",
    targetTitle: "Incident Notification",
    relationship: "overlaps",
    description:
      "Both NIS2 and EU Space Act require a detailed incident notification within 72 hours of awareness.",
    confidence: "confirmed",
  },
  {
    id: "xref-035",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 23(4)(d)",
    sourceTitle: "Final report within 1 month",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 92",
    targetTitle: "Final Incident Report",
    relationship: "overlaps",
    description:
      "Both NIS2 and EU Space Act require a comprehensive final incident report within one month.",
    confidence: "confirmed",
  },

  // ================================================================
  // NIS2 Art. 20 ↔ Governance
  // ================================================================
  {
    id: "xref-036",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 20",
    sourceTitle: "Governance",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 74",
    targetTitle: "General Cybersecurity Principles",
    relationship: "overlaps",
    description:
      "Both NIS2 Art. 20 and EU Space Act Art. 74 require management body accountability for cybersecurity risk management and training.",
    confidence: "confirmed",
  },
  {
    id: "xref-037",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 20",
    sourceTitle: "Governance",
    targetRegulation: "iso27001",
    targetArticle: "5.1-5.3",
    targetTitle: "Leadership and commitment",
    relationship: "implements",
    description:
      "ISO 27001 leadership requirements provide the governance framework for NIS2 management accountability.",
    confidence: "confirmed",
  },

  // ================================================================
  // NIS2 Art. 21(2)(d) ↔ Simplified Regime
  // ================================================================
  {
    id: "xref-038",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 21(1)",
    sourceTitle: "Proportionality principle",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 86-88",
    targetTitle: "Simplified Risk Management Regime",
    relationship: "overlaps",
    description:
      "Both NIS2 Art. 21(1) proportionality and EU Space Act Art. 86-88 simplified regime provide reduced requirements for smaller entities, allowing coordinated simplification.",
    confidence: "confirmed",
  },

  // ================================================================
  // NIS2 ↔ EUSRN (EU Space Resilience Network)
  // ================================================================
  {
    id: "xref-039",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 29",
    sourceTitle: "Voluntary information sharing arrangements",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 93-95",
    targetTitle: "Union Space Resilience Network (EUSRN)",
    relationship: "extends",
    description:
      "EU Space Act Art. 93-95 establishes the EUSRN for space-specific information sharing, extending NIS2 Art. 29 voluntary information sharing to the space sector.",
    confidence: "confirmed",
  },

  // ================================================================
  // NIS2 Art. 27 ↔ Registration
  // ================================================================
  {
    id: "xref-040",
    sourceRegulation: "nis2",
    sourceArticle: "Art. 27",
    sourceTitle: "Registration",
    targetRegulation: "eu_space_act",
    targetArticle: "Art. 24",
    targetTitle: "Union Register of Space Objects (URSO)",
    relationship: "references",
    description:
      "NIS2 registration requirements (Art. 27) are separate from EU Space Act URSO registration (Art. 24), but operators must comply with both. Information can be cross-referenced.",
    confidence: "confirmed",
  },

  // ================================================================
  // EU Space Act ↔ ISO 27001 (direct)
  // ================================================================
  {
    id: "xref-041",
    sourceRegulation: "eu_space_act",
    sourceArticle: "Art. 76",
    sourceTitle: "Risk Management Obligation",
    targetRegulation: "iso27001",
    targetArticle: "6.1",
    targetTitle: "Actions to address risks and opportunities",
    relationship: "overlaps",
    description:
      "ISO 27001 risk assessment methodology can be used to satisfy EU Space Act risk management obligation for information security aspects.",
    confidence: "interpreted",
  },
  {
    id: "xref-042",
    sourceRegulation: "eu_space_act",
    sourceArticle: "Art. 81-82",
    sourceTitle: "Cryptography Requirements",
    targetRegulation: "iso27001",
    targetArticle: "A.8.24",
    targetTitle: "Use of cryptography",
    relationship: "overlaps",
    description:
      "ISO 27001 cryptography controls provide the framework for implementing EU Space Act encryption requirements for space communications.",
    confidence: "interpreted",
  },

  // ================================================================
  // ENISA ↔ ISO 27001 (direct)
  // ================================================================
  {
    id: "xref-043",
    sourceRegulation: "enisa_space",
    sourceArticle: "1.1-1.8",
    sourceTitle: "Governance & Risk Management",
    targetRegulation: "iso27001",
    targetArticle: "A.5.1-A.5.8",
    targetTitle: "Organizational controls",
    relationship: "implements",
    description:
      "ENISA governance controls map directly to ISO 27001 organizational controls with space-specific extensions.",
    confidence: "interpreted",
  },
  {
    id: "xref-044",
    sourceRegulation: "enisa_space",
    sourceArticle: "7.1-7.8",
    sourceTitle: "Communications Security",
    targetRegulation: "iso27001",
    targetArticle: "A.8.20-A.8.23",
    targetTitle: "Network and communications security",
    relationship: "extends",
    description:
      "ENISA communications security controls extend ISO 27001 network controls with RF-specific security measures for space communications.",
    confidence: "interpreted",
  },

  // ================================================================
  // EU Space Act ↔ ECSS Standards
  // ================================================================
  {
    id: "xref-045",
    sourceRegulation: "eu_space_act",
    sourceArticle: "Art. 67",
    sourceTitle: "Space Debris Mitigation Plan",
    targetRegulation: "iso24113",
    targetArticle: "ISO 24113:2023",
    targetTitle: "Space debris mitigation requirements",
    relationship: "references",
    description:
      "EU Space Act debris mitigation plan requirements reference ISO 24113 as the international standard for debris mitigation compliance.",
    confidence: "confirmed",
  },
  {
    id: "xref-046",
    sourceRegulation: "eu_space_act",
    sourceArticle: "Art. 63",
    sourceTitle: "Trackability Requirements",
    targetRegulation: "iso24113",
    targetArticle: "ISO 24113:2023 Clause 6",
    targetTitle: "Trackability and identification",
    relationship: "overlaps",
    description:
      "Both EU Space Act Art. 63 and ISO 24113 Clause 6 require spacecraft to be trackable throughout their operational life.",
    confidence: "confirmed",
  },
  {
    id: "xref-047",
    sourceRegulation: "eu_space_act",
    sourceArticle: "Art. 72",
    sourceTitle: "End-of-Life Requirements",
    targetRegulation: "iso24113",
    targetArticle: "ISO 24113:2023 Clause 7",
    targetTitle: "Post-mission disposal",
    relationship: "overlaps",
    description:
      "EU Space Act end-of-life disposal requirements align with ISO 24113 Clause 7 post-mission disposal guidelines.",
    confidence: "confirmed",
  },
];

// ─── Helper Functions ───

/**
 * Get all cross-references for a specific regulation.
 */
export function getCrossReferencesForRegulation(
  regulation: RegulationType,
): CrossReference[] {
  return CROSS_REFERENCES.filter(
    (ref) =>
      ref.sourceRegulation === regulation ||
      ref.targetRegulation === regulation,
  );
}

/**
 * Get cross-references between two specific regulations.
 */
export function getCrossReferencesBetween(
  regA: RegulationType,
  regB: RegulationType,
): CrossReference[] {
  return CROSS_REFERENCES.filter(
    (ref) =>
      (ref.sourceRegulation === regA && ref.targetRegulation === regB) ||
      (ref.sourceRegulation === regB && ref.targetRegulation === regA),
  );
}

/**
 * Get cross-references for a specific article.
 */
export function getCrossReferencesForArticle(
  regulation: RegulationType,
  article: string,
): CrossReference[] {
  return CROSS_REFERENCES.filter(
    (ref) =>
      (ref.sourceRegulation === regulation && ref.sourceArticle === article) ||
      (ref.targetRegulation === regulation && ref.targetArticle === article),
  );
}

/**
 * Get cross-references by relationship type.
 */
export function getCrossReferencesByRelationship(
  relationship: CrossReferenceRelationship,
): CrossReference[] {
  return CROSS_REFERENCES.filter((ref) => ref.relationship === relationship);
}

/**
 * Get NIS2 ↔ EU Space Act overlap count.
 * This is a key metric shown to users: "X of your NIS2 requirements are already
 * covered by EU Space Act compliance."
 */
export function getNIS2EUSpaceActOverlapCount(): {
  total: number;
  overlapping: number;
  superseded: number;
  additional: number;
} {
  const nis2ToSpaceAct = CROSS_REFERENCES.filter(
    (ref) =>
      (ref.sourceRegulation === "nis2" &&
        ref.targetRegulation === "eu_space_act") ||
      (ref.sourceRegulation === "eu_space_act" &&
        ref.targetRegulation === "nis2"),
  );

  const overlapping = nis2ToSpaceAct.filter(
    (ref) => ref.relationship === "overlaps",
  ).length;
  const superseded = nis2ToSpaceAct.filter(
    (ref) => ref.relationship === "supersedes",
  ).length;

  return {
    total: nis2ToSpaceAct.length,
    overlapping,
    superseded,
    additional: nis2ToSpaceAct.length - overlapping - superseded,
  };
}

/**
 * Get all unique NIS2 articles that have EU Space Act equivalents.
 * Useful for showing users which NIS2 obligations are "already covered"
 * if they're preparing for the EU Space Act.
 */
export function getNIS2ArticlesWithEUSpaceActEquivalent(): string[] {
  const articles = new Set<string>();

  CROSS_REFERENCES.forEach((ref) => {
    if (
      ref.sourceRegulation === "nis2" &&
      ref.targetRegulation === "eu_space_act" &&
      (ref.relationship === "overlaps" || ref.relationship === "supersedes")
    ) {
      articles.add(ref.sourceArticle);
    }
  });

  return Array.from(articles);
}
