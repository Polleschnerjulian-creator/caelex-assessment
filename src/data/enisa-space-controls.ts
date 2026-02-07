/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * Unauthorized reproduction, distribution, reverse-engineering, or use
 * of this data to build competing products or services is strictly prohibited
 * and may result in legal action.
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

import { ENISASpaceControl, ENISAControlCategory } from "@/lib/nis2-types";

// ─── ENISA Space Threat Landscape — Cybersecurity Control Framework ───
//
// Based on ENISA "Space Threat Landscape" report (February 2025).
// Controls mapped across 4 segments: Space, Ground, User, Link.
// Cross-referenced to NIS2 Directive, EU Space Act (COM(2025) 335),
// and ISO 27001:2022 Annex A.

export const ENISA_SPACE_CONTROLS: ENISASpaceControl[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // 1. GOVERNANCE & RISK MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-1.1.1",
    category: "governance_risk",
    subcategory: "Risk Assessment",
    title: "Space Mission Cybersecurity Risk Assessment",
    description:
      "Conduct comprehensive cybersecurity risk assessments specific to the space mission lifecycle, covering space, ground, user, and link segments.",
    threatAddressed:
      "Unidentified vulnerabilities across the mission architecture leading to exploitation by threat actors.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 77",
    iso27001Mapping: "A.5.1",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "user", "link"],
  },
  {
    id: "ENISA-SPACE-1.1.2",
    category: "governance_risk",
    subcategory: "Policy",
    title: "Cybersecurity Policy for Space Operations",
    description:
      "Establish and maintain a dedicated cybersecurity policy addressing space operations, approved by senior management and communicated to all relevant personnel.",
    threatAddressed:
      "Lack of organizational direction and commitment to cybersecurity in space operations.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 74",
    iso27001Mapping: "A.5.1",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground", "user", "link"],
  },
  {
    id: "ENISA-SPACE-1.1.3",
    category: "governance_risk",
    subcategory: "Roles & Responsibilities",
    title: "Roles and Responsibilities Definition",
    description:
      "Define and assign cybersecurity roles and responsibilities for all space mission phases, including a designated security officer for space operations.",
    threatAddressed:
      "Unclear accountability leading to gaps in security coverage and delayed incident response.",
    nis2Mapping: "Art. 20(1)",
    euSpaceActMapping: "Art. 75",
    iso27001Mapping: "A.5.2",
    priority: "essential",
    implementationComplexity: "low",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-1.1.4",
    category: "governance_risk",
    subcategory: "Risk Treatment",
    title: "Risk Treatment Plan for Space Assets",
    description:
      "Develop and implement risk treatment plans addressing identified cybersecurity risks to space assets, with defined acceptance criteria and residual risk tracking.",
    threatAddressed:
      "Unmitigated risks persisting due to lack of structured treatment approach.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 77",
    iso27001Mapping: "A.5.5",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-1.1.5",
    category: "governance_risk",
    subcategory: "Compliance Monitoring",
    title: "Compliance Monitoring Framework",
    description:
      "Implement a framework for continuous monitoring of compliance with cybersecurity requirements across all applicable regulations (NIS2, EU Space Act, national requirements).",
    threatAddressed:
      "Regulatory non-compliance leading to penalties and operational disruptions.",
    nis2Mapping: "Art. 21(2)(f)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.36",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-1.1.6",
    category: "governance_risk",
    subcategory: "Risk Review",
    title: "Regular Risk Review Cycle",
    description:
      "Conduct periodic reviews of cybersecurity risks at defined intervals and upon significant changes to the mission profile, threat landscape, or regulatory environment.",
    threatAddressed:
      "Stale risk assessments failing to account for evolving threats and changed operational conditions.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 77",
    iso27001Mapping: "A.5.1",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["space", "ground", "user", "link"],
  },
  {
    id: "ENISA-SPACE-1.1.7",
    category: "governance_risk",
    subcategory: "Classification",
    title: "Space Mission Security Classification",
    description:
      "Classify space missions and associated data flows according to sensitivity and criticality, applying proportionate security controls to each classification level.",
    threatAddressed:
      "Insufficient protection of high-value assets due to uniform security treatment.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.12",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-1.1.8",
    category: "governance_risk",
    subcategory: "Regulatory Mapping",
    title: "Regulatory Compliance Mapping",
    description:
      "Map all applicable cybersecurity regulatory requirements (EU Space Act, NIS2, national laws) to internal controls and maintain traceability between obligations and implementations.",
    threatAddressed:
      "Compliance gaps arising from fragmented regulatory landscape across multiple jurisdictions.",
    nis2Mapping: "Art. 21(2)(f)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.36",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-1.1.9",
    category: "governance_risk",
    subcategory: "Training & Awareness",
    title: "Space Cybersecurity Awareness Training",
    description:
      "Deliver regular cybersecurity awareness training tailored to space operations personnel, covering space-specific threats such as signal interference, spoofing, and supply chain compromise.",
    threatAddressed:
      "Human error and social engineering attacks due to lack of space-specific security awareness.",
    nis2Mapping: "Art. 21(2)(g)",
    euSpaceActMapping: "Art. 74",
    iso27001Mapping: "A.6.3",
    priority: "essential",
    implementationComplexity: "low",
    spaceSegment: ["ground", "user"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 2. ASSET MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-2.1.1",
    category: "asset_management",
    subcategory: "Inventory",
    title: "Space Asset Inventory",
    description:
      "Maintain a comprehensive inventory of all space assets including satellites, ground stations, communication links, and user terminals, with ownership and security classification attributes.",
    threatAddressed:
      "Unknown or untracked assets creating blind spots in the security perimeter.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.9",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground", "user", "link"],
  },
  {
    id: "ENISA-SPACE-2.1.2",
    category: "asset_management",
    subcategory: "Classification",
    title: "Hardware and Software Asset Classification",
    description:
      "Classify all hardware and software assets by criticality and sensitivity, distinguishing between mission-critical, mission-support, and general-purpose systems.",
    threatAddressed:
      "Misallocation of security resources due to undifferentiated asset treatment.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.12",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-2.1.3",
    category: "asset_management",
    subcategory: "Configuration Management",
    title: "Configuration Management for Space Systems",
    description:
      "Implement configuration management processes for spacecraft, ground segment, and link infrastructure, tracking all authorized configurations and changes.",
    threatAddressed:
      "Unauthorized configuration changes introducing vulnerabilities or operational instability.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.8.9",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-2.1.4",
    category: "asset_management",
    subcategory: "End-of-Life",
    title: "End-of-Life Asset Handling",
    description:
      "Define secure procedures for decommissioning space assets, including secure data erasure, credential revocation, and passivation of spacecraft systems.",
    threatAddressed:
      "Data leakage or unauthorized access through decommissioned but still accessible assets.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 65",
    iso27001Mapping: "A.5.11",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-2.1.5",
    category: "asset_management",
    subcategory: "Ground Segment",
    title: "Ground Segment Asset Tracking",
    description:
      "Track all ground segment assets including antennas, modems, processing servers, network equipment, and their interconnections with external networks.",
    threatAddressed:
      "Unmonitored ground infrastructure providing attack vectors into mission-critical systems.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.9",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-2.1.6",
    category: "asset_management",
    subcategory: "Critical Assets",
    title: "Critical Asset Identification",
    description:
      "Identify and document critical assets whose compromise would result in loss of mission, safety hazards, or significant service degradation, with enhanced protection measures.",
    threatAddressed:
      "Inadequate protection of high-value targets due to lack of criticality-based prioritization.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.10",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground", "link"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 3. ACCESS CONTROL
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-3.1.1",
    category: "access_control",
    subcategory: "Role-Based Access",
    title: "Role-Based Access for Mission Control",
    description:
      "Implement role-based access control (RBAC) for mission control systems, ensuring operators can only access functions necessary for their assigned duties.",
    threatAddressed:
      "Unauthorized access to mission control functions enabling malicious commands or data exfiltration.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.5.15",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-3.1.2",
    category: "access_control",
    subcategory: "Privileged Access",
    title: "Privileged Access Management for TT&C",
    description:
      "Implement privileged access management for Telemetry, Tracking, and Command (TT&C) systems, including just-in-time access, session recording, and approval workflows.",
    threatAddressed:
      "Compromised privileged accounts enabling unauthorized spacecraft commanding or telemetry interception.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.8.2",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["ground", "link"],
  },
  {
    id: "ENISA-SPACE-3.1.3",
    category: "access_control",
    subcategory: "Physical Access",
    title: "Physical Access Control for Ground Stations",
    description:
      "Enforce physical access control at ground stations using multi-layered perimeter security, badge systems, biometrics, and visitor management procedures.",
    threatAddressed:
      "Physical intrusion at ground stations enabling hardware tampering or direct system access.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.7.1",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-3.1.4",
    category: "access_control",
    subcategory: "Remote Access",
    title: "Remote Access Security for Satellite Operations",
    description:
      "Secure all remote access to satellite operations systems with VPN, multi-factor authentication, and encrypted channels, with continuous session monitoring.",
    threatAddressed:
      "Remote access exploitation enabling unauthorized satellite commanding from external networks.",
    nis2Mapping: "Art. 21(2)(j)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.8.1",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-3.1.5",
    category: "access_control",
    subcategory: "Session Management",
    title: "Session Management for Ground Systems",
    description:
      "Implement session management controls including automatic timeouts, concurrent session limits, and session logging for all ground system interfaces.",
    threatAddressed:
      "Session hijacking or abandoned sessions providing unauthorized access to operational systems.",
    nis2Mapping: "Art. 21(2)(j)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.8.5",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-3.1.6",
    category: "access_control",
    subcategory: "Access Review",
    title: "Access Review and Recertification",
    description:
      "Conduct periodic access reviews and recertification of all user accounts, with immediate revocation upon role change or personnel departure.",
    threatAddressed:
      "Accumulation of excessive privileges and orphaned accounts increasing the attack surface.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.5.18",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["ground", "user"],
  },
  {
    id: "ENISA-SPACE-3.1.7",
    category: "access_control",
    subcategory: "Multi-Factor Authentication",
    title: "Multi-Factor Authentication for Critical Systems",
    description:
      "Enforce multi-factor authentication using hardware tokens or FIDO2 for all access to mission-critical systems including spacecraft commanding interfaces.",
    threatAddressed:
      "Credential theft or brute-force attacks bypassing single-factor authentication on critical systems.",
    nis2Mapping: "Art. 21(2)(j)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.8.5",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 4. CRYPTOGRAPHY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-4.1.1",
    category: "cryptography",
    subcategory: "Uplink Encryption",
    title: "Encryption of Telecommand Uplinks",
    description:
      "Encrypt all telecommand uplinks using approved cryptographic algorithms to prevent unauthorized commanding and command injection attacks.",
    threatAddressed:
      "Command injection or replay attacks on unencrypted telecommand uplinks.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.24",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "link"],
  },
  {
    id: "ENISA-SPACE-4.1.2",
    category: "cryptography",
    subcategory: "Downlink Encryption",
    title: "Encryption of Telemetry Downlinks",
    description:
      "Encrypt telemetry downlinks to protect spacecraft health data, payload data, and operational parameters from eavesdropping.",
    threatAddressed:
      "Interception of telemetry data revealing spacecraft status, capabilities, or sensitive payload information.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.24",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "link"],
  },
  {
    id: "ENISA-SPACE-4.1.3",
    category: "cryptography",
    subcategory: "Key Management",
    title: "Key Management Lifecycle for Space Systems",
    description:
      "Implement end-to-end key management covering generation, distribution, storage, rotation, revocation, and destruction for all cryptographic keys used in space operations.",
    threatAddressed:
      "Compromised or mismanaged cryptographic keys undermining the entire encryption infrastructure.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 81",
    iso27001Mapping: "A.8.24",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-4.1.4",
    category: "cryptography",
    subcategory: "Standards",
    title: "Crypto Module Standards Compliance",
    description:
      "Ensure cryptographic modules comply with recognized standards such as FIPS 140-3 or Common Criteria, appropriate to the classification level of protected data.",
    threatAddressed:
      "Weak or flawed cryptographic implementations creating false sense of security.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 81",
    iso27001Mapping: "A.8.24",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-4.1.5",
    category: "cryptography",
    subcategory: "Post-Quantum",
    title: "Post-Quantum Cryptography Planning",
    description:
      "Develop a migration plan for transitioning to post-quantum cryptographic algorithms, considering the long operational lifetime of space assets.",
    threatAddressed:
      "Future quantum computing capability rendering current encryption schemes obsolete during satellite lifetime.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 81",
    iso27001Mapping: "A.8.24",
    priority: "recommended",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-4.1.6",
    category: "cryptography",
    subcategory: "Inter-Satellite Links",
    title: "Inter-Satellite Link Encryption",
    description:
      "Apply encryption to inter-satellite communication links (optical or RF) to prevent interception and manipulation of data relayed between spacecraft.",
    threatAddressed:
      "Eavesdropping or manipulation of data transmitted between constellation satellites.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.24",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["space", "link"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 5. PHYSICAL SECURITY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-5.1.1",
    category: "physical_security",
    subcategory: "Ground Station Protection",
    title: "Ground Station Physical Protection",
    description:
      "Implement multi-layered physical security for ground stations including perimeter fencing, surveillance systems, intrusion detection, and security personnel.",
    threatAddressed:
      "Physical attacks on ground stations disrupting communications or enabling hardware tampering.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.7.1",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-5.1.2",
    category: "physical_security",
    subcategory: "Launch Site",
    title: "Launch Site Security",
    description:
      "Enforce physical security controls at launch sites during integration, testing, and launch phases to prevent tampering with spacecraft or launch vehicles.",
    threatAddressed:
      "Pre-launch tampering with spacecraft hardware or software during integration and testing.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.7.1",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-5.1.3",
    category: "physical_security",
    subcategory: "Data Center",
    title: "Data Center Physical Controls",
    description:
      "Apply physical security controls to data centers housing mission control, data processing, and archival systems, including redundant power and environmental controls.",
    threatAddressed:
      "Physical compromise of data centers leading to loss of mission control capability or data integrity.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.7.3",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-5.1.4",
    category: "physical_security",
    subcategory: "Environmental Monitoring",
    title: "Environmental Monitoring for Ground Stations",
    description:
      "Monitor environmental conditions (temperature, humidity, power quality) at ground stations to detect anomalies indicating physical tampering or natural hazards.",
    threatAddressed:
      "Environmental threats or covert physical interference degrading ground station operations.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.7.5",
    priority: "recommended",
    implementationComplexity: "low",
    spaceSegment: ["ground"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 6. OPERATIONS SECURITY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-6.1.1",
    category: "operations_security",
    subcategory: "Procedures",
    title: "Secure Satellite Operations Procedures",
    description:
      "Document and enforce secure operating procedures for all satellite operations including commanding, telemetry processing, orbit maintenance, and payload management.",
    threatAddressed:
      "Procedural errors or unauthorized actions during satellite operations leading to mission compromise.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.5.37",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-6.1.2",
    category: "operations_security",
    subcategory: "Change Management",
    title: "Change Management for Flight Software",
    description:
      "Implement formal change management processes for flight software updates, including impact assessment, testing, approval, and rollback procedures.",
    threatAddressed:
      "Unauthorized or untested software changes causing spacecraft malfunction or introducing vulnerabilities.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.32",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-6.1.3",
    category: "operations_security",
    subcategory: "Monitoring",
    title: "Monitoring of Space System Operations",
    description:
      "Continuously monitor space system operations for security events, anomalous behaviors, and unauthorized activities across all segments.",
    threatAddressed:
      "Undetected security incidents persisting due to insufficient operational monitoring.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 83",
    iso27001Mapping: "A.8.15",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-6.1.4",
    category: "operations_security",
    subcategory: "Vulnerability Management",
    title: "Vulnerability Management for Ground Segment",
    description:
      "Maintain a vulnerability management program for ground segment systems, including vulnerability scanning, assessment, prioritization, and remediation tracking.",
    threatAddressed:
      "Known vulnerabilities in ground systems exploited by threat actors to gain unauthorized access.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.8",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-6.1.5",
    category: "operations_security",
    subcategory: "Patch Management",
    title: "Patch Management for Mission Control",
    description:
      "Implement structured patch management for mission control and ground station systems, balancing security urgency with operational stability requirements.",
    threatAddressed:
      "Unpatched systems providing known attack vectors for exploitation.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.8",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-6.1.6",
    category: "operations_security",
    subcategory: "Capacity Management",
    title: "Capacity Management",
    description:
      "Monitor and manage system capacity for ground segment and communication links to prevent denial-of-service conditions and ensure operational availability.",
    threatAddressed:
      "Resource exhaustion attacks or unexpected load causing loss of satellite contact or data processing capability.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.8.6",
    priority: "recommended",
    implementationComplexity: "low",
    spaceSegment: ["ground", "link"],
  },
  {
    id: "ENISA-SPACE-6.1.7",
    category: "operations_security",
    subcategory: "Environment Separation",
    title: "Separation of Development, Test, and Production",
    description:
      "Maintain strict separation between development, testing, and production environments for mission control and ground segment software.",
    threatAddressed:
      "Test code or configurations leaking into production, or production data exposed in test environments.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.31",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-6.1.8",
    category: "operations_security",
    subcategory: "Backup & Recovery",
    title: "Backup and Recovery for Mission Data",
    description:
      "Implement comprehensive backup and recovery procedures for mission-critical data including telemetry archives, command histories, orbital parameters, and configuration baselines.",
    threatAddressed:
      "Data loss from ransomware, system failure, or malicious deletion disrupting mission operations.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.8.13",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-6.1.9",
    category: "operations_security",
    subcategory: "Malware Protection",
    title: "Malware Protection for Ground Systems",
    description:
      "Deploy and maintain anti-malware solutions across ground segment systems, with particular attention to air-gapped mission control networks and removable media controls.",
    threatAddressed:
      "Malware infection of ground systems via network, removable media, or supply chain compromise.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.7",
    priority: "essential",
    implementationComplexity: "low",
    spaceSegment: ["ground"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 7. COMMUNICATIONS SECURITY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-7.1.1",
    category: "communications_security",
    subcategory: "RF Link Protection",
    title: "RF Link Protection",
    description:
      "Implement comprehensive protection measures for RF communication links including uplink, downlink, and crosslink, covering confidentiality, integrity, and availability.",
    threatAddressed:
      "RF interception, jamming, or spoofing compromising satellite communications.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.20",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-7.1.2",
    category: "communications_security",
    subcategory: "Anti-Jamming",
    title: "Anti-Jamming Measures",
    description:
      "Implement anti-jamming techniques such as spread spectrum, frequency hopping, adaptive nulling, and signal power management to maintain communication availability.",
    threatAddressed:
      "Deliberate or incidental RF jamming causing loss of satellite command and telemetry links.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.20",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-7.1.3",
    category: "communications_security",
    subcategory: "Anti-Spoofing",
    title: "Anti-Spoofing for GNSS",
    description:
      "Deploy anti-spoofing mechanisms for GNSS-dependent operations, including signal authentication, multi-source validation, and anomaly detection for navigation signals.",
    threatAddressed:
      "GNSS spoofing attacks causing incorrect positioning, navigation, or timing for space operations.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.20",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "user"],
  },
  {
    id: "ENISA-SPACE-7.1.4",
    category: "communications_security",
    subcategory: "Network Segmentation",
    title: "Network Segmentation for Ground Segment",
    description:
      "Segment ground station networks isolating mission-critical systems from corporate IT, internet-facing services, and less trusted zones using firewalls and DMZs.",
    threatAddressed:
      "Lateral movement from compromised corporate systems into mission control networks.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.8.22",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-7.1.5",
    category: "communications_security",
    subcategory: "Inter-Satellite Links",
    title: "Secure Inter-Satellite Links",
    description:
      "Secure inter-satellite communication links with authentication, encryption, and integrity verification to prevent unauthorized access between constellation nodes.",
    threatAddressed:
      "Exploitation of inter-satellite links for data interception or rogue node injection in constellations.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.20",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["space", "link"],
  },
  {
    id: "ENISA-SPACE-7.1.6",
    category: "communications_security",
    subcategory: "TT&C Security",
    title: "TT&C Communication Security",
    description:
      "Implement end-to-end security for Telemetry, Tracking, and Command communications including authentication, encryption, sequence numbering, and replay protection.",
    threatAddressed:
      "TT&C link compromise enabling unauthorized spacecraft control or telemetry interception.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.20",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-7.1.7",
    category: "communications_security",
    subcategory: "Data-in-Transit",
    title: "Data-in-Transit Protection",
    description:
      "Protect all data in transit between ground stations, data centers, and end users using TLS 1.3 or equivalent encryption standards.",
    threatAddressed:
      "Interception of mission data, telemetry, or control information on terrestrial network segments.",
    nis2Mapping: "Art. 21(2)(h)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.24",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["ground", "user"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 8. SYSTEM ACQUISITION & DEVELOPMENT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-8.1.1",
    category: "system_acquisition",
    subcategory: "Secure-by-Design",
    title: "Secure-by-Design for Spacecraft Software",
    description:
      "Apply secure-by-design principles to spacecraft software development, including threat modeling, secure coding standards, and security architecture reviews.",
    threatAddressed:
      "Software vulnerabilities in spacecraft firmware enabling remote exploitation after launch.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.25",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space"],
  },
  {
    id: "ENISA-SPACE-8.1.2",
    category: "system_acquisition",
    subcategory: "Procurement Security",
    title: "Security Requirements in Procurement",
    description:
      "Include specific cybersecurity requirements in procurement specifications for spacecraft, ground equipment, and software, with verification criteria.",
    threatAddressed:
      "Acquired systems lacking adequate security controls due to undefined procurement requirements.",
    nis2Mapping: "Art. 21(2)(d)",
    euSpaceActMapping: "Art. 78",
    iso27001Mapping: "A.5.19",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-8.1.3",
    category: "system_acquisition",
    subcategory: "Code Review",
    title: "Code Review for Flight Software",
    description:
      "Conduct security-focused code reviews and static analysis of flight software before deployment, covering command handlers, communication protocols, and fault management.",
    threatAddressed:
      "Exploitable code defects in flight software discoverable through systematic review.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.28",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space"],
  },
  {
    id: "ENISA-SPACE-8.1.4",
    category: "system_acquisition",
    subcategory: "Testing",
    title: "Security Testing and Acceptance Criteria",
    description:
      "Define and execute security testing including penetration testing as part of system acceptance criteria for both space and ground segment components.",
    threatAddressed:
      "Undetected vulnerabilities passing through acceptance without security validation.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.29",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-8.1.5",
    category: "system_acquisition",
    subcategory: "OTA Updates",
    title: "Secure Software Update Mechanisms",
    description:
      "Implement secure over-the-air (OTA) update mechanisms for spacecraft software with cryptographic signature verification, rollback capability, and staged deployment.",
    threatAddressed:
      "Malicious firmware injection through compromised or unauthenticated update channels.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 80",
    iso27001Mapping: "A.8.32",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-8.1.6",
    category: "system_acquisition",
    subcategory: "SBOM",
    title: "Software Bill of Materials",
    description:
      "Maintain a software bill of materials (SBOM) for all spacecraft and ground segment software, enabling vulnerability tracking and supply chain transparency.",
    threatAddressed:
      "Hidden vulnerable components in software supply chain undetectable without component inventory.",
    nis2Mapping: "Art. 21(2)(d)",
    euSpaceActMapping: "Art. 78",
    iso27001Mapping: "A.5.9",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 9. SUPPLIER RELATIONSHIP MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-9.1.1",
    category: "supplier_management",
    subcategory: "Supplier Assessment",
    title: "Supplier Security Assessment",
    description:
      "Assess the cybersecurity posture of critical suppliers and subcontractors, including component manufacturers, software providers, and launch service integrators.",
    threatAddressed:
      "Supply chain compromise introducing vulnerabilities or backdoors through trusted supplier relationships.",
    nis2Mapping: "Art. 21(2)(d)",
    euSpaceActMapping: "Art. 78",
    iso27001Mapping: "A.5.19",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-9.1.2",
    category: "supplier_management",
    subcategory: "Supply Chain Risk",
    title: "Supply Chain Risk Management",
    description:
      "Implement supply chain risk management covering geopolitical risks, single-source dependencies, and component authenticity throughout the space system lifecycle.",
    threatAddressed:
      "Supply chain disruptions or compromise affecting mission-critical component availability and integrity.",
    nis2Mapping: "Art. 21(2)(d)",
    euSpaceActMapping: "Art. 78",
    iso27001Mapping: "A.5.21",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-9.1.3",
    category: "supplier_management",
    subcategory: "Third-Party Access",
    title: "Third-Party Access Control",
    description:
      "Control and monitor third-party access to space systems and data, with defined access scope, time limitations, and audit logging for all supplier interactions.",
    threatAddressed:
      "Unauthorized data access or system manipulation through inadequately controlled third-party connections.",
    nis2Mapping: "Art. 21(2)(d)",
    euSpaceActMapping: "Art. 79",
    iso27001Mapping: "A.5.20",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-9.1.4",
    category: "supplier_management",
    subcategory: "Counterfeit Prevention",
    title: "Counterfeit Component Prevention",
    description:
      "Implement measures to detect and prevent counterfeit electronic components in spacecraft and ground equipment, including authorized distributor sourcing and testing protocols.",
    threatAddressed:
      "Counterfeit components causing premature failure, reduced reliability, or embedded hardware trojans.",
    nis2Mapping: "Art. 21(2)(d)",
    euSpaceActMapping: "Art. 78",
    iso27001Mapping: "A.5.22",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-9.1.5",
    category: "supplier_management",
    subcategory: "Contractual Security",
    title: "Contractual Security Requirements",
    description:
      "Include cybersecurity clauses in contracts with suppliers covering incident notification, audit rights, data handling, and compliance with applicable regulations.",
    threatAddressed:
      "Lack of contractual basis for enforcing security requirements on suppliers and subcontractors.",
    nis2Mapping: "Art. 21(2)(d)",
    euSpaceActMapping: "Art. 78",
    iso27001Mapping: "A.5.20",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["space", "ground"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 10. INCIDENT MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-10.1.1",
    category: "incident_management",
    subcategory: "Detection & Classification",
    title: "Space Incident Detection and Classification",
    description:
      "Establish incident detection capabilities with classification schemes specific to space operations, distinguishing between cyber, physical, natural, and conjunction events.",
    threatAddressed:
      "Delayed or missed detection of security incidents due to lack of space-specific detection criteria.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 89",
    iso27001Mapping: "A.5.25",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-10.1.2",
    category: "incident_management",
    subcategory: "Response Procedures",
    title: "Incident Response for Space Operations",
    description:
      "Maintain incident response procedures specific to space operations, including playbooks for satellite anomalies, ground station compromise, link disruption, and data breaches.",
    threatAddressed:
      "Ineffective incident response due to generic procedures not accounting for space-specific constraints.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 89",
    iso27001Mapping: "A.5.26",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-10.1.3",
    category: "incident_management",
    subcategory: "Forensics",
    title: "Forensic Capability for Space Systems",
    description:
      "Develop forensic investigation capability for space system incidents, including telemetry analysis, command log review, and ground system forensics.",
    threatAddressed:
      "Inability to determine root cause and attribution of security incidents in space systems.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 92",
    iso27001Mapping: "A.5.28",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-10.1.4",
    category: "incident_management",
    subcategory: "Communication & Reporting",
    title: "Incident Communication and Reporting",
    description:
      "Implement incident communication procedures covering NCA notification (24h early warning, 72h detailed report, 1-month final report), EUSRN coordination, and stakeholder communication.",
    threatAddressed:
      "Regulatory non-compliance and coordination failures from inadequate incident reporting procedures.",
    nis2Mapping: "Art. 23(4)",
    euSpaceActMapping: "Art. 90",
    iso27001Mapping: "A.5.26",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-10.1.5",
    category: "incident_management",
    subcategory: "Conjunction Response",
    title: "Conjunction Event Response",
    description:
      "Define response procedures for conjunction events including collision probability assessment, avoidance maneuver decision-making, and coordination with SSA providers.",
    threatAddressed:
      "Collision risk from delayed or inadequate response to conjunction warnings.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 59",
    iso27001Mapping: "A.5.26",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-10.1.6",
    category: "incident_management",
    subcategory: "Signal Interference",
    title: "Signal Interference Response",
    description:
      "Establish procedures for detecting, characterizing, and responding to intentional or unintentional RF signal interference affecting space communications.",
    threatAddressed:
      "Loss of satellite communication due to jamming, interference, or unauthorized signal transmission.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.5.26",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground", "link"],
  },
  {
    id: "ENISA-SPACE-10.1.7",
    category: "incident_management",
    subcategory: "Post-Incident",
    title: "Post-Incident Analysis",
    description:
      "Conduct structured post-incident analysis for all significant incidents, capturing lessons learned, updating threat models, and improving detection and response capabilities.",
    threatAddressed:
      "Recurring incidents due to failure to learn from previous security events.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 92",
    iso27001Mapping: "A.5.27",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["space", "ground", "link"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 11. BUSINESS CONTINUITY
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-11.1.1",
    category: "business_continuity",
    subcategory: "Mission Continuity",
    title: "Mission Continuity Planning",
    description:
      "Develop and maintain mission continuity plans covering scenarios such as loss of ground contact, spacecraft anomaly, data center failure, and cyber attack on mission infrastructure.",
    threatAddressed:
      "Extended mission outages from inadequate continuity planning for space-specific failure modes.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.5.29",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-11.1.2",
    category: "business_continuity",
    subcategory: "Ground Station Failover",
    title: "Ground Station Failover",
    description:
      "Implement failover capabilities between primary and backup ground stations, with tested switchover procedures and maximum acceptable switchover times.",
    threatAddressed:
      "Single point of failure at ground station level causing complete loss of satellite contact.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.8.14",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-11.1.3",
    category: "business_continuity",
    subcategory: "Emergency Operations",
    title: "Emergency Operations Procedures",
    description:
      "Define emergency operations procedures for degraded modes of operation, including safe-mode commanding, manual backup procedures, and emergency communication channels.",
    threatAddressed:
      "Inability to maintain minimum viable operations during crisis scenarios.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.5.30",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-11.1.4",
    category: "business_continuity",
    subcategory: "Disaster Recovery",
    title: "Disaster Recovery for Space Operations",
    description:
      "Implement disaster recovery capabilities for space operations including offsite data replication, alternative processing sites, and recovery time/point objectives.",
    threatAddressed:
      "Catastrophic loss of mission control capability from disasters affecting primary facilities.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.8.14",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-11.1.5",
    category: "business_continuity",
    subcategory: "Continuity Testing",
    title: "Business Continuity Testing",
    description:
      "Regularly test business continuity and disaster recovery plans through tabletop exercises, functional tests, and full-scale simulations, incorporating lessons learned.",
    threatAddressed:
      "Untested continuity plans failing when activated during actual incidents.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.5.30",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 12. COMPLIANCE & AUDIT
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-12.1.1",
    category: "compliance_audit",
    subcategory: "Regulatory Assessment",
    title: "Regulatory Compliance Assessment",
    description:
      "Conduct periodic assessments of compliance with all applicable cybersecurity regulations including NIS2, EU Space Act, and national space authority requirements.",
    threatAddressed:
      "Unidentified compliance gaps leading to regulatory penalties and operational restrictions.",
    nis2Mapping: "Art. 21(2)(f)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.36",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-12.1.2",
    category: "compliance_audit",
    subcategory: "Internal Audit",
    title: "Internal Audit Program",
    description:
      "Establish an internal audit program for cybersecurity controls, with defined audit scope, frequency, methodology, and reporting to management.",
    threatAddressed:
      "Control weaknesses persisting undetected due to lack of independent verification.",
    nis2Mapping: "Art. 21(2)(f)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.35",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-12.1.3",
    category: "compliance_audit",
    subcategory: "External Audit",
    title: "External Audit Coordination",
    description:
      "Coordinate with external auditors and regulatory bodies for compliance assessments, providing required evidence and facilitating audit access while protecting sensitive data.",
    threatAddressed:
      "Failed external audits due to inadequate preparation and evidence management.",
    nis2Mapping: "Art. 21(2)(f)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.35",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["ground"],
  },
  {
    id: "ENISA-SPACE-12.1.4",
    category: "compliance_audit",
    subcategory: "Evidence Management",
    title: "Compliance Evidence Management",
    description:
      "Maintain organized compliance evidence including policies, procedures, logs, test results, and audit trails with defined retention periods and integrity protection.",
    threatAddressed:
      "Inability to demonstrate compliance due to disorganized or incomplete evidence records.",
    nis2Mapping: "Art. 21(2)(f)",
    euSpaceActMapping: "Art. 76",
    iso27001Mapping: "A.5.36",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["ground"],
  },

  // ═══════════════════════════════════════════════════════════════════════
  // 13. SPACE-SPECIFIC CONTROLS
  // ═══════════════════════════════════════════════════════════════════════
  {
    id: "ENISA-SPACE-13.1.1",
    category: "space_specific",
    subcategory: "Health Monitoring",
    title: "Spacecraft Health Monitoring",
    description:
      "Implement continuous spacecraft health monitoring with security-aware anomaly detection, distinguishing between hardware failures, environmental effects, and potential cyber attacks.",
    threatAddressed:
      "Failure to distinguish cyber attacks from normal anomalies, delaying appropriate response.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 83",
    iso27001Mapping: "A.8.15",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-13.1.2",
    category: "space_specific",
    subcategory: "Orbital Anomaly",
    title: "Orbital Anomaly Detection",
    description:
      "Monitor for orbital anomalies including unexpected maneuvers, proximity operations by uncooperative objects, and deviations from predicted orbital parameters.",
    threatAddressed:
      "Undetected hostile proximity operations or unauthorized orbital changes threatening spacecraft safety.",
    nis2Mapping: "Art. 21(2)(b)",
    euSpaceActMapping: "Art. 59",
    iso27001Mapping: "A.8.15",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-13.1.3",
    category: "space_specific",
    subcategory: "End-of-Life Disposal",
    title: "End-of-Life Disposal Security",
    description:
      "Ensure secure end-of-life disposal of spacecraft including cryptographic key destruction, passivation of stored energy, credential revocation, and controlled de-orbit or graveyard orbit transfer.",
    threatAddressed:
      "Zombie spacecraft accessible by threat actors after operational end-of-life due to residual access credentials.",
    nis2Mapping: "Art. 21(2)(i)",
    euSpaceActMapping: "Art. 65",
    iso27001Mapping: "A.5.11",
    priority: "essential",
    implementationComplexity: "medium",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-13.1.4",
    category: "space_specific",
    subcategory: "De-Orbit Authentication",
    title: "De-Orbit Command Authentication",
    description:
      "Implement strong authentication for de-orbit and disposal commands with multi-person authorization, cryptographic verification, and irreversibility safeguards.",
    threatAddressed:
      "Unauthorized de-orbit commands causing premature mission termination or uncontrolled re-entry.",
    nis2Mapping: "Art. 21(2)(j)",
    euSpaceActMapping: "Art. 65",
    iso27001Mapping: "A.8.5",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-13.1.5",
    category: "space_specific",
    subcategory: "Space Weather",
    title: "Space Weather Monitoring",
    description:
      "Monitor space weather conditions (solar events, geomagnetic storms, radiation belts) that may affect spacecraft operations and security system availability.",
    threatAddressed:
      "Space weather events disrupting communications, causing system resets, or degrading security controls.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 83",
    iso27001Mapping: "A.7.5",
    priority: "important",
    implementationComplexity: "low",
    spaceSegment: ["space", "ground"],
  },
  {
    id: "ENISA-SPACE-13.1.6",
    category: "space_specific",
    subcategory: "Proximity Operations",
    title: "Proximity Operations Security",
    description:
      "Implement security protocols for proximity operations including rendezvous and docking, in-orbit servicing, and active debris removal, with authentication and authorization frameworks.",
    threatAddressed:
      "Unauthorized proximity operations enabling physical inspection, tampering, or capture of spacecraft.",
    nis2Mapping: "Art. 21(2)(a)",
    euSpaceActMapping: "Art. 73",
    iso27001Mapping: "A.5.37",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["space", "link"],
  },
  {
    id: "ENISA-SPACE-13.1.7",
    category: "space_specific",
    subcategory: "Frequency Coordination",
    title: "Frequency Coordination Security",
    description:
      "Secure the frequency coordination process including protection of frequency assignments, monitoring for unauthorized use, and interference detection and reporting.",
    threatAddressed:
      "Frequency interference or unauthorized spectrum use degrading communication capabilities.",
    nis2Mapping: "Art. 21(2)(e)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.20",
    priority: "important",
    implementationComplexity: "medium",
    spaceSegment: ["ground", "link"],
  },
  {
    id: "ENISA-SPACE-13.1.8",
    category: "space_specific",
    subcategory: "Ground-to-Space Authentication",
    title: "Ground-to-Space Authentication",
    description:
      "Implement mutual authentication between ground stations and spacecraft using cryptographic protocols, preventing rogue ground station access and command spoofing.",
    threatAddressed:
      "Rogue ground stations issuing unauthorized commands to spacecraft through authentication bypass.",
    nis2Mapping: "Art. 21(2)(j)",
    euSpaceActMapping: "Art. 82",
    iso27001Mapping: "A.8.5",
    priority: "essential",
    implementationComplexity: "high",
    spaceSegment: ["space", "ground", "link"],
  },
  {
    id: "ENISA-SPACE-13.1.9",
    category: "space_specific",
    subcategory: "Safe Mode Security",
    title: "Spacecraft Safe Mode Security",
    description:
      "Ensure spacecraft safe mode configurations maintain minimum security controls, preventing exploitation of reduced-capability states by threat actors.",
    threatAddressed:
      "Exploitation of safe mode states where security controls may be relaxed or disabled.",
    nis2Mapping: "Art. 21(2)(c)",
    euSpaceActMapping: "Art. 85",
    iso27001Mapping: "A.8.1",
    priority: "important",
    implementationComplexity: "high",
    spaceSegment: ["space"],
  },
];

// ─── Helper Functions ───

/**
 * Get all controls belonging to a specific ENISA category.
 */
export function getControlsByCategory(
  category: ENISAControlCategory,
): ENISASpaceControl[] {
  return ENISA_SPACE_CONTROLS.filter(
    (control) => control.category === category,
  );
}

/**
 * Get all controls applicable to a specific space segment
 * (space, ground, user, or link).
 */
export function getControlsBySegment(
  segment: "space" | "ground" | "user" | "link",
): ENISASpaceControl[] {
  return ENISA_SPACE_CONTROLS.filter((control) =>
    control.spaceSegment.includes(segment),
  );
}

/**
 * Get all controls matching a specific priority level.
 */
export function getControlsByPriority(
  priority: "essential" | "important" | "recommended",
): ENISASpaceControl[] {
  return ENISA_SPACE_CONTROLS.filter(
    (control) => control.priority === priority,
  );
}

/**
 * Get all controls mapped to a specific NIS2 article reference.
 * Performs a substring match, so "Art. 21(2)(a)" will match controls
 * whose nis2Mapping contains that string.
 */
export function getControlsByNIS2Mapping(
  nis2Article: string,
): ENISASpaceControl[] {
  return ENISA_SPACE_CONTROLS.filter(
    (control) =>
      control.nis2Mapping && control.nis2Mapping.includes(nis2Article),
  );
}
