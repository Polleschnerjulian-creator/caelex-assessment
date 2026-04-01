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
  // ─── CRA ↔ NIS2 Cross-References ───
  {
    id: "xref-048",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §1",
    sourceTitle: "Security by Design — Risk Analysis",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(a)",
    targetTitle: "Policies on risk analysis and information system security",
    relationship: "overlaps",
    description:
      "Both require systematic cybersecurity risk analysis. CRA is product-scoped (risk to the product), NIS2 is entity-scoped (risk to the organization). Overlap in methodology and documentation.",
    confidence: "confirmed",
  },
  {
    id: "xref-049",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §2",
    sourceTitle: "Vulnerability Handling Process",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(e)",
    targetTitle: "Network and information system maintenance",
    relationship: "implements",
    description:
      "CRA vulnerability handling (identification, remediation, testing, disclosure) directly implements NIS2 requirements for network and information system maintenance at the product level.",
    confidence: "confirmed",
  },
  {
    id: "xref-050",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part II §2",
    sourceTitle: "Software Bill of Materials (SBOM)",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(d)",
    targetTitle: "Supply chain security",
    relationship: "extends",
    description:
      "CRA SBOM requirement extends significantly beyond NIS2's general supply chain security obligation. CRA mandates machine-readable SBOM delivery; NIS2 requires supply chain risk management without SBOM specifics.",
    confidence: "confirmed",
  },
  {
    id: "xref-051",
    sourceRegulation: "cra",
    sourceArticle: "Art. 14",
    sourceTitle: "Incident and Vulnerability Reporting",
    targetRegulation: "nis2",
    targetArticle: "Art. 23",
    targetTitle: "Incident reporting obligations",
    relationship: "overlaps",
    description:
      "Both mandate incident reporting with similar timelines (24h/72h). CRA reports to ENISA for product vulnerabilities; NIS2 reports to national CSIRT for entity incidents. Overlapping processes but different recipients.",
    confidence: "confirmed",
  },
  {
    id: "xref-052",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §1(c)",
    sourceTitle: "Access Control Mechanisms",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(i)",
    targetTitle: "Human resources security, access control, asset management",
    relationship: "overlaps",
    description:
      "CRA product-level access control overlaps with NIS2 entity-level access management. CRA focuses on product authentication mechanisms; NIS2 on organizational access policies.",
    confidence: "confirmed",
  },
  {
    id: "xref-053",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part I §1(d)",
    sourceTitle: "Cryptographic Protection",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(h)",
    targetTitle: "Cryptography and encryption policies",
    relationship: "implements",
    description:
      "CRA product-level cryptographic requirements implement NIS2's encryption obligations at the product level. CRA specifies secure defaults and state-of-the-art crypto for products.",
    confidence: "confirmed",
  },
  {
    id: "xref-054",
    sourceRegulation: "cra",
    sourceArticle: "Art. 13(8)",
    sourceTitle: "Support Period and Lifecycle",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(c)",
    targetTitle: "Business continuity and crisis management",
    relationship: "extends",
    description:
      "CRA mandates minimum 5-year product support period with security updates. This extends NIS2's general business continuity requirement by setting concrete product lifecycle obligations.",
    confidence: "confirmed",
  },
  {
    id: "xref-055",
    sourceRegulation: "cra",
    sourceArticle: "Annex I Part II §1",
    sourceTitle: "Secure Software Update Mechanism",
    targetRegulation: "nis2",
    targetArticle: "Art. 21(2)(e)",
    targetTitle: "Network and information system maintenance",
    relationship: "implements",
    description:
      "CRA's secure update mechanism requirement (integrity verification, rollback capability, automatic delivery) implements NIS2's system maintenance obligations at the product level.",
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

// ================================================================
// Cross-Domain Regulation Mappings
// ================================================================

// ─── Export Control ↔ Cybersecurity Cross-References ───

export interface ExportCyberCrossRef {
  id: string;
  exportControl: { regulation: string; section: string; topic: string };
  cybersecurity: { regulation: string; article: string; topic: string };
  conflict: string;
  resolution: string;
  severity: "high" | "medium" | "low";
}

export const EXPORT_CYBER_CROSS_REFS: ExportCyberCrossRef[] = [
  {
    id: "ec-01",
    exportControl: {
      regulation: "ITAR",
      section: "22 CFR 120.17",
      topic: "Deemed Export",
    },
    cybersecurity: {
      regulation: "EU Space Act",
      article: "Art. 79",
      topic: "Information Security",
    },
    conflict:
      "Foreign nationals implementing cybersecurity controls may trigger deemed export of technical data.",
    resolution:
      "Obtain TAA (Technical Assistance Agreement) before granting access to USML-listed cybersecurity systems.",
    severity: "high" as const,
  },
  {
    id: "ec-02",
    exportControl: {
      regulation: "EAR",
      section: "15 CFR 734.13",
      topic: "Encryption Export Controls",
    },
    cybersecurity: {
      regulation: "EU Space Act",
      article: "Art. 81-82",
      topic: "Cryptography & Encryption",
    },
    conflict:
      "EU Space Act mandates encryption for space communications, but exporting encryption technology to certain destinations requires BIS license under EAR.",
    resolution:
      "Use License Exception ENC (Section 740.17) for commercial encryption. File classification requests for custom space-grade encryption algorithms.",
    severity: "medium" as const,
  },
  {
    id: "ec-03",
    exportControl: {
      regulation: "ITAR",
      section: "22 CFR 121 Cat. XV",
      topic: "Spacecraft Systems & Equipment",
    },
    cybersecurity: {
      regulation: "NIS2 Directive",
      article: "Art. 21(2)(d)",
      topic: "Supply Chain Security",
    },
    conflict:
      "NIS2 supply chain transparency requirements may conflict with ITAR restrictions on disclosing technical details of defense articles to non-US persons.",
    resolution:
      "Implement compartmentalized supply chain audits: separate ITAR-controlled technical data from NIS2 supply chain risk assessments. Use non-technical summaries for NIS2 reporting.",
    severity: "high" as const,
  },
  {
    id: "ec-04",
    exportControl: {
      regulation: "EU Dual-Use Regulation",
      section: "Regulation (EU) 2021/821 Annex I",
      topic: "Category 5 — Telecommunications & Information Security",
    },
    cybersecurity: {
      regulation: "EU Space Act",
      article: "Art. 88",
      topic: "Threat-Led Penetration Testing (TLPT)",
    },
    conflict:
      "TLPT tools and techniques for space systems may include dual-use cyber intrusion software requiring export authorization under EU Dual-Use Regulation.",
    resolution:
      "Ensure TLPT providers hold appropriate export licenses. Use EU-based testing facilities where possible to avoid cross-border transfer issues.",
    severity: "medium" as const,
  },
  {
    id: "ec-05",
    exportControl: {
      regulation: "ITAR",
      section: "22 CFR 125.4",
      topic: "Exemptions for NATO/Allied Transfers",
    },
    cybersecurity: {
      regulation: "EU Space Act",
      article: "Art. 93-95",
      topic: "EU Space Resilience Network (EUSRN)",
    },
    conflict:
      "EUSRN information sharing with non-NATO EU member states may not qualify for ITAR NATO exemptions, restricting threat intelligence exchange.",
    resolution:
      "Establish separate information sharing channels for ITAR-controlled and non-controlled cyber threat intelligence. Use sanitized indicators of compromise (IOCs).",
    severity: "low" as const,
  },
];

// ─── Spectrum ↔ Debris Cross-References ───

export interface SpectrumDebrisCrossRef {
  id: string;
  spectrum: { regulation: string; article: string; topic: string };
  debris: { regulation: string; article: string; topic: string };
  interaction: string;
  recommendation: string;
}

export const SPECTRUM_DEBRIS_CROSS_REFS: SpectrumDebrisCrossRef[] = [
  {
    id: "sd-01",
    spectrum: {
      regulation: "ITU RR",
      article: "Art. 44",
      topic: "Spectrum License Duration",
    },
    debris: {
      regulation: "EU Space Act",
      article: "Art. 59",
      topic: "5-Year Deorbit Rule",
    },
    interaction:
      "Spectrum license expiry date should align with or exceed debris compliance deadlines.",
    recommendation:
      "Ensure ITU filing duration covers planned mission + maximum deorbit window.",
  },
  {
    id: "sd-02",
    spectrum: {
      regulation: "ITU RR",
      article: "Art. 11 & Res. 35 (WRC-23)",
      topic: "NGSO Milestone-Based Deployment",
    },
    debris: {
      regulation: "EU Space Act",
      article: "Art. 67",
      topic: "Debris Mitigation Plan",
    },
    interaction:
      "ITU milestone deployment deadlines may pressure operators to launch satellites before debris mitigation plan approval is complete.",
    recommendation:
      "Submit debris mitigation plan to national authority in parallel with ITU milestone notifications. Coordinate timelines to avoid regulatory gaps.",
  },
  {
    id: "sd-03",
    spectrum: {
      regulation: "ITU RR",
      article: "Art. 21 No. 21.16",
      topic: "Harmful Interference",
    },
    debris: {
      regulation: "EU Space Act",
      article: "Art. 72",
      topic: "End-of-Life Passivation",
    },
    interaction:
      "End-of-life passivation requires disabling transmitters, which must be coordinated with ITU to formally notify cessation of emissions and release spectrum.",
    recommendation:
      "Include ITU spectrum release notification in end-of-life procedure. Notify administration 6 months before planned passivation.",
  },
  {
    id: "sd-04",
    spectrum: {
      regulation: "FCC",
      article: "47 CFR 25.114(d)(14)",
      topic: "Orbital Debris Mitigation in Spectrum License",
    },
    debris: {
      regulation: "FCC 5-Year Deorbit Rule",
      article: "47 CFR 25.114(d)(14)(iv)",
      topic: "Post-Mission Disposal",
    },
    interaction:
      "FCC now requires orbital debris mitigation disclosures as part of spectrum license applications, creating a single-window regulatory checkpoint.",
    recommendation:
      "Prepare unified debris mitigation + spectrum application package. Ensure deorbit timeline in spectrum application matches debris mitigation plan.",
  },
];

// ─── Insurance ↔ National Space Laws Cross-References ───

export interface InsuranceNationalCrossRef {
  id: string;
  country: string;
  countryCode: string;
  euSpaceAct: { article: string; topic: string };
  nationalLaw: { name: string; provision: string; topic: string };
  minimumTPL: string;
  interaction: string;
  recommendation: string;
}

export const INSURANCE_NATIONAL_CROSS_REFS: InsuranceNationalCrossRef[] = [
  {
    id: "in-01",
    country: "France",
    countryCode: "FR",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "French Space Operations Act (LOS 2008)",
      provision: "Art. 6 & Decree 2009-643",
      topic: "Third-Party Liability Insurance",
    },
    minimumTPL: "\u20AC60,000,000",
    interaction:
      "French LOS mandates \u20AC60M minimum TPL insurance, which may exceed EU Space Act harmonized minimums. France retains higher national threshold.",
    recommendation:
      "Comply with French \u20AC60M TPL as it exceeds EU Space Act minimum. Obtain CNES technical opinion on coverage adequacy for mission profile.",
  },
  {
    id: "in-02",
    country: "United Kingdom",
    countryCode: "UK",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "UK Space Industry Act 2018",
      provision: "Section 38 & Regulations 2021/792",
      topic: "Licensee Liability & Insurance",
    },
    minimumTPL: "\u00A360,000,000",
    interaction:
      "UK sets \u00A360M default TPL with risk-based adjustments by CAA. Post-Brexit, EU Space Act does not apply but UK operators seeking EU market access must comply with both.",
    recommendation:
      "UK operators targeting EU market should maintain dual-compliant insurance covering both UK CAA and EU Space Act requirements.",
  },
  {
    id: "in-03",
    country: "Belgium",
    countryCode: "BE",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "Belgian Space Activities Act 2005",
      provision: "Art. 15-17",
      topic: "Insurance Obligation",
    },
    minimumTPL: "Risk-based (set by Royal Decree)",
    interaction:
      "Belgian law delegates TPL amount to Royal Decree on case-by-case basis. EU Space Act will provide a harmonized floor that Belgium must implement.",
    recommendation:
      "Engage Belgian Science Policy Office (BELSPO) early to determine national TPL. Ensure coverage meets both national and EU Space Act thresholds.",
  },
  {
    id: "in-04",
    country: "Netherlands",
    countryCode: "NL",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "Dutch Space Activities Act 2007 (Wet ruimtevaartactiviteiten)",
      provision: "Art. 3(2)(f)",
      topic: "Financial Security",
    },
    minimumTPL: "Risk-based (Minister determination)",
    interaction:
      "Dutch law requires 'adequate financial security' determined per license. EU Space Act harmonization will establish minimum baseline replacing ministerial discretion.",
    recommendation:
      "Prepare for transition from discretionary to harmonized regime. Maintain existing Dutch insurance levels during transition period.",
  },
  {
    id: "in-05",
    country: "Luxembourg",
    countryCode: "LU",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "Luxembourg Space Activities Act 2020",
      provision: "Art. 16",
      topic: "Insurance & Financial Guarantees",
    },
    minimumTPL: "\u20AC100,000,000",
    interaction:
      "Luxembourg sets a high \u20AC100M TPL minimum, reflecting its role as a major satellite operator hub (SES). This exceeds expected EU Space Act harmonized minimums.",
    recommendation:
      "Comply with Luxembourg \u20AC100M TPL. Consider whether EU Space Act implementation may lower this threshold for smaller operators.",
  },
  {
    id: "in-06",
    country: "Austria",
    countryCode: "AT",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "Austrian Outer Space Act 2011 (Weltraumgesetz)",
      provision: "\u00A74(1)(4)",
      topic: "Insurance Requirement",
    },
    minimumTPL: "Risk-based (\u20AC60M guideline)",
    interaction:
      "Austrian law requires insurance proportionate to risk with an approximate \u20AC60M guideline. EU Space Act will formalize minimum thresholds.",
    recommendation:
      "Maintain coverage at or above \u20AC60M. Prepare for EU Space Act harmonized requirements which may adjust this threshold.",
  },
  {
    id: "in-07",
    country: "Denmark",
    countryCode: "DK",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "Danish Outer Space Act 2016 (Lov om aktiviteter i det ydre rum)",
      provision: "\u00A76",
      topic: "Liability Insurance",
    },
    minimumTPL: "DKK 500,000,000 (~\u20AC67M)",
    interaction:
      "Danish law sets DKK 500M (~\u20AC67M) TPL requirement. EU Space Act harmonization will interact with this established threshold.",
    recommendation:
      "Maintain DKK 500M coverage. Monitor EU Space Act implementation for potential changes to Danish national requirements.",
  },
  {
    id: "in-08",
    country: "Germany",
    countryCode: "DE",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "German Space Act (WeltraumG) \u2014 Draft",
      provision: "Draft \u00A78 (expected)",
      topic: "Insurance Obligation",
    },
    minimumTPL: "TBD (expected \u20AC50-60M)",
    interaction:
      "Germany currently lacks dedicated space law and insurance requirement. Draft WeltraumG expected to align with EU Space Act insurance provisions from the outset.",
    recommendation:
      "German operators should comply with EU Space Act insurance requirements directly. Monitor WeltraumG legislative progress for national specifics.",
  },
  {
    id: "in-09",
    country: "Italy",
    countryCode: "IT",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "Italian Space Economy Law (Law 7/2018)",
      provision: "Art. 8",
      topic: "Insurance & Liability",
    },
    minimumTPL: "Risk-based (ASI determination)",
    interaction:
      "Italian law delegates TPL determination to ASI (Italian Space Agency) on a case-by-case basis. EU Space Act will establish harmonized floor.",
    recommendation:
      "Engage ASI early in mission planning for insurance assessment. Prepare for transition to EU Space Act harmonized requirements.",
  },
  {
    id: "in-10",
    country: "Norway",
    countryCode: "NO",
    euSpaceAct: {
      article: "Art. 44-51",
      topic: "Insurance Requirements",
    },
    nationalLaw: {
      name: "Norwegian Space Activities Act 1969 (amended 2017)",
      provision: "\u00A73",
      topic: "Liability Coverage",
    },
    minimumTPL: "Risk-based (Ministry determination)",
    interaction:
      "Norway (EEA member) will likely incorporate EU Space Act insurance provisions through the EEA Agreement. Current risk-based approach will be supplemented by harmonized minimums.",
    recommendation:
      "Norwegian operators should anticipate EEA incorporation of EU Space Act. Maintain risk-based coverage per current Ministry of Trade requirements until harmonized regime applies.",
  },
];
