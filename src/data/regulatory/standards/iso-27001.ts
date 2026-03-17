/**
 * ISO/IEC 27001:2022 — Information security management systems
 *
 * ISO/IEC 27001:2022 specifies requirements for establishing, implementing,
 * maintaining and continually improving an information security management
 * system (ISMS). The standard was revised in October 2022, replacing
 * ISO/IEC 27001:2013, with a restructured set of 93 controls in Annex A
 * (grouped into 4 themes instead of the previous 14 domains).
 *
 * This file contains Annex A controls most relevant to space operators,
 * focusing on:
 * - Information security policies and governance
 * - Physical security of ground segment infrastructure
 * - Access management for mission-critical systems
 * - Secure development and operations
 * - Cryptographic protection of TT&C links
 * - Monitoring, logging, and incident management
 * - Business continuity for space operations
 *
 * Each control is cross-referenced with:
 * - NIS2 Directive Art. 21 (cybersecurity risk-management measures)
 * - BSI IT-Grundschutz (German ISMS standard)
 * - EU Space Act proposal COM(2025) 335
 *
 * Source: https://www.iso.org/standard/27001
 * Full title: "ISO/IEC 27001:2022, Information security, cybersecurity
 *              and privacy protection — Information security management
 *              systems — Requirements"
 *
 * LEGAL DISCLAIMER: This data references an enacted ISO standard. Control
 * numbers and topic descriptions are based on the published Annex A
 * structure. Exact normative text is available only through ISO purchase.
 * This does not constitute legal advice.
 */

import type { EnactedRequirement } from "../types";

// ─── Constants ──────────────────────────────────────────────────────────────

const ISO27001_CITATION =
  "ISO/IEC 27001:2022, Information security, cybersecurity and privacy protection — " +
  "Information security management systems — Requirements";

const LAST_VERIFIED = "2026-03-17";

const EU_SPACE_ACT_DISCLAIMER =
  "Based on COM(2025) 335 legislative proposal. Article numbers may change." as const;

// ─── ISO/IEC 27001:2022 Annex A — Selected Controls ────────────────────────

export const iso27001Requirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Theme 5 — Organisational controls
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ISO27001-A5.1",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 5.1",
      title: "Policies for information security",
      fullText:
        "An information security policy and topic-specific policies shall be " +
        "defined, approved by management, published, communicated to and " +
        "acknowledged by relevant personnel and relevant interested parties, " +
        "and reviewed at planned intervals or if significant changes occur. " +
        "For space operators, this encompasses policies covering ground segment " +
        "security, satellite bus and payload protection, TT&C link security, " +
        "and inter-satellite link encryption.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, ISMS.1 (Security Management); NIS2UmsuCG §30(1)",
        notes:
          "BSI IT-Grundschutz requires documented information security policies " +
          "(Sicherheitsleitlinie) as the foundation of the ISMS. NIS2 transposition " +
          "mandates management body approval.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 1; PSSI requirements",
        notes:
          "ANSSI requires a PSSI (Politique de Sécurité des Systèmes d'Information) " +
          "approved by management, aligned with ISO 27001 policy requirements.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A5.23",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 5.23",
      title: "Information security for use of cloud services",
      fullText:
        "Processes for acquisition, use, management and exit from cloud services " +
        "shall be established in accordance with the organisation's information " +
        "security requirements. For space operators, this covers cloud-hosted " +
        "mission planning systems, satellite operations software-as-a-service, " +
        "ground station-as-a-service, data processing and distribution platforms, " +
        "and telemetry data storage. The cloud security requirements shall " +
        "address data sovereignty, encryption, access controls, and supply " +
        "chain risk.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, OPS.2.2 (Cloud Usage); BSI C5 catalogue",
        notes:
          "BSI requires cloud security assessment via the C5 (Cloud Computing " +
          "Compliance Criteria Catalogue) for operators of critical infrastructure.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI SecNumCloud qualification; ANSSI NIS2 Referential",
        notes:
          "ANSSI mandates SecNumCloud-qualified cloud providers for operators " +
          "of vital importance handling sensitive data.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A5.24",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 5.24",
      title:
        "Information security incident management planning and preparation",
      fullText:
        "The organisation shall plan and prepare for managing information " +
        "security incidents by defining, establishing and communicating " +
        "information security incident management processes, roles and " +
        "responsibilities. For space operators, incident management must " +
        "account for scenarios including satellite command authority compromise, " +
        "ground station intrusion, TT&C link jamming or spoofing, orbital " +
        "manoeuvre anomalies, and payload data exfiltration. Response " +
        "procedures shall be coordinated with NIS2 incident reporting timelines.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, DER.2.1 (Incident Management); NIS2UmsuCG §32",
        notes:
          "BSI requires documented incident response plans. NIS2 transposition " +
          "mandates 24-hour initial notification, 72-hour interim report, and " +
          "1-month final report to BSI.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 5; Art. L. 1332-6-2 (OIV)",
        notes:
          "ANSSI requires incident management procedures with mandatory notification " +
          "to ANSSI-CERT within 24 hours for significant incidents.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(3)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A5.30",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 5.30",
      title: "ICT readiness for business continuity",
      fullText:
        "ICT readiness shall be planned, implemented, maintained and tested " +
        "based on business continuity objectives and ICT continuity requirements. " +
        "For space operators, ICT continuity must address: ground station " +
        "redundancy and failover; backup mission control centre capabilities; " +
        "continuity of conjunction assessment and collision avoidance services; " +
        "satellite safe mode and autonomous operation procedures; and data " +
        "distribution service continuity for downstream users.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, DER.4 (Business Continuity Management); NIS2UmsuCG §30(2)(c)",
        notes:
          "BSI requires business continuity planning aligned with BSI Standard 200-4. " +
          "NIS2 transposition mandates BCM measures for essential and important entities.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 7; PCA/PRA requirements",
        notes:
          "ANSSI requires Plan de Continuité d'Activité (PCA) and Plan de Reprise " +
          "d'Activité (PRA) for operators of essential services.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Theme 6 — People controls
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ISO27001-A6.1",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 6.1",
      title: "Screening",
      fullText:
        "Background verification checks on all candidates for employment shall " +
        "be carried out prior to joining the organisation and on an ongoing " +
        "basis, taking into consideration applicable laws, regulations, ethics " +
        "and the information security requirements. For space operators, " +
        "screening is particularly critical for personnel with access to " +
        "satellite command systems, TT&C encryption keys, mission planning " +
        "data, and orbital manoeuvre authority. Export control regulations " +
        "(ITAR/EAR) may impose additional screening requirements.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, ORP.2 (Personnel); SÜG (Security Clearance Act)",
        notes:
          "BSI requires personnel screening proportionate to access level. " +
          "For operators of critical infrastructure, the Sicherheitsüberprüfungsgesetz " +
          "(SÜG) may require formal security clearance.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential; Habilitation de sécurité (IGPDE/SGDSN)",
        notes:
          "ANSSI and SGDSN require security habilitation for personnel at operators " +
          "of vital importance (OIV) with access to classified or sensitive systems.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Theme 7 — Physical controls
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ISO27001-A7.1",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 7.1",
      title: "Physical security perimeters",
      fullText:
        "Security perimeters shall be defined and used to protect areas that " +
        "contain information and other associated assets. For space operators, " +
        "physical security perimeters are essential for ground segment " +
        "infrastructure including: mission control centres, ground stations, " +
        "TT&C facilities, satellite integration and test facilities, launch " +
        "site facilities, and data processing centres. Perimeter controls " +
        "shall account for the geographical distribution of ground segment " +
        "assets and the use of third-party ground station networks.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, INF.1 (General Building); INF.2 (Data Centre)",
        notes:
          "BSI IT-Grundschutz provides building blocks for physical security of " +
          "buildings, server rooms, and data centres relevant to ground segment protection.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential; PPMS (Plan Particulier de Mise en Sûreté)",
        notes:
          "ANSSI and French defence requirements mandate physical protection plans " +
          "for operators of vital importance, including ground segment facilities.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Theme 8 — Technological controls
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "ISO27001-A8.1",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.1",
      title: "User endpoint devices",
      fullText:
        "Information stored on, processed by or accessible via user endpoint " +
        "devices shall be protected. For space operators, endpoint devices " +
        "include operator workstations in mission control, portable ground " +
        "station terminals, engineering laptops used for satellite diagnostics, " +
        "and mobile devices used for on-call operations. Device management " +
        "shall enforce encryption, access controls, remote wipe capability, " +
        "and approved software baselines.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, SYS.2.1 (General Client); SYS.3.2 (Mobile Devices)",
        notes:
          "BSI provides device-specific building blocks for client systems and " +
          "mobile devices with hardening requirements.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI Guide d'hygiène informatique; ANSSI NIS2 Referential",
        notes:
          "ANSSI requires endpoint protection measures per the Guide d'hygiène " +
          "informatique, with enhanced requirements for OIV/OSE.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.2",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.2",
      title: "Privileged access rights",
      fullText:
        "The allocation and use of privileged access rights shall be restricted " +
        "and managed. For space operators, privileged access is critical for " +
        "satellite command and control systems (telecommand upload authority), " +
        "orbit manoeuvre authorisation, ground station configuration, key " +
        "management systems for encrypted TT&C links, and mission planning " +
        "databases. Privileged access shall require multi-factor authentication, " +
        "be logged, and be subject to regular review.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, ORP.4 (Identity and Access Management); NIS2UmsuCG §30(2)(d)",
        notes:
          "BSI requires strict management of privileged accounts with MFA, logging, " +
          "and regular review. NIS2 transposition reinforces access control requirements.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 3; Guide d'hygiène, Measure 12",
        notes:
          "ANSSI mandates strict privileged access management including MFA, " +
          "dedicated admin workstations, and access logging.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.5",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.5",
      title: "Secure authentication",
      fullText:
        "Secure authentication technologies and procedures shall be established " +
        "and implemented based on information access restrictions and the " +
        "topic-specific policy on access control. For space operators, " +
        "authentication requirements apply to satellite command interfaces, " +
        "ground station access, mission control systems, and remote operations. " +
        "Multi-factor authentication shall be required for all mission-critical " +
        "system access. Authentication mechanisms shall be resilient to " +
        "replay attacks, credential theft, and session hijacking.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, ORP.4 (Identity and Access Management); BSI TR-02102",
        notes:
          "BSI requires strong authentication per TR-02102 (Cryptographic Mechanisms) " +
          "and mandates MFA for remote and privileged access.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 3; RGS (Référentiel Général de Sécurité)",
        notes:
          "ANSSI requires secure authentication aligned with the RGS, including " +
          "MFA for sensitive system access.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.9",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.9",
      title: "Configuration management",
      fullText:
        "Configurations, including security configurations, of hardware, " +
        "software, services and networks shall be established, documented, " +
        "implemented, monitored and reviewed. For space operators, configuration " +
        "management is critical for satellite flight software, ground segment " +
        "systems, ground station network equipment, TT&C encryption parameters, " +
        "and mission database configurations. Configuration changes to " +
        "satellite software shall follow formal change control processes " +
        "with security impact assessment.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, OPS.1.1.3 (Patch and Change Management)",
        notes:
          "BSI requires formal configuration and change management processes " +
          "with security impact assessment and rollback procedures.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 4; Guide d'hygiène, Measure 34",
        notes:
          "ANSSI requires documented configuration management including baseline " +
          "configurations, change control, and regular compliance audits.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.15",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.15",
      title: "Logging",
      fullText:
        "Logs that record activities, exceptions, faults and other relevant " +
        "events shall be produced, stored, protected and analysed. For space " +
        "operators, logging is essential for satellite command logs (all " +
        "telecommand uploads), ground station access logs, TT&C session logs, " +
        "mission control operator actions, anomaly and fault detection events, " +
        "and conjunction assessment decision records. Logs shall be tamper-proof, " +
        "time-synchronised, and retained for the period required by licensing " +
        "conditions.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, OPS.1.1.5 (Logging); NIS2UmsuCG §30(2)(e)",
        notes:
          "BSI requires comprehensive logging with tamper protection and " +
          "time synchronisation. NIS2 transposition mandates event logging " +
          "for essential and important entities.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 6; ANSSI Guide de journalisation",
        notes:
          "ANSSI requires logging per its Guide de journalisation, with " +
          "centralised log management and retention requirements for OIV/OSE.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.16",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.16",
      title: "Monitoring activities",
      fullText:
        "Networks, systems and applications shall be monitored for anomalous " +
        "behaviour and appropriate actions taken to evaluate potential " +
        "information security incidents. For space operators, monitoring shall " +
        "cover ground segment network traffic, satellite telemetry anomalies, " +
        "TT&C link integrity, ground station availability, command execution " +
        "verification, and orbital parameter deviations. Security monitoring " +
        "shall be integrated with operational monitoring to detect both " +
        "cyber and physical threats.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, DER.1 (Detection of Security Incidents); NIS2UmsuCG §30(2)(e)",
        notes:
          "BSI requires security monitoring with SIEM capabilities. NIS2 transposition " +
          "mandates continuous monitoring for essential and important entities.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 6; SOC requirements for OIV",
        notes:
          "ANSSI requires security monitoring through a qualified SOC for operators " +
          "of vital importance and recommends SOC capabilities for important entities.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.24",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.24",
      title: "Use of cryptography",
      fullText:
        "Rules for the effective use of cryptography, including cryptographic " +
        "key management, shall be defined and implemented. For space operators, " +
        "cryptography is critical for: telecommand encryption and authentication " +
        "(uplink protection), telemetry encryption (downlink confidentiality), " +
        "inter-satellite link encryption, ground network communications, " +
        "key distribution to ground stations, and encryption of stored mission " +
        "data. Cryptographic algorithms and key lengths shall comply with " +
        "national requirements and be resistant to quantum computing threats " +
        "where applicable.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, CON.1 (Cryptography); BSI TR-02102",
        notes:
          "BSI mandates cryptographic mechanisms per TR-02102, with specific " +
          "algorithm and key length requirements. BSI provides guidance on " +
          "post-quantum cryptography transition.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI RGS (Référentiel Général de Sécurité); ANSSI crypto recommendations",
        notes:
          "ANSSI requires cryptographic implementations per RGS v2.0, with " +
          "specific guidance on algorithm selection, key management, and " +
          "qualified crypto products for OIV systems.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "direct",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.25",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.25",
      title: "Secure development life cycle",
      fullText:
        "Rules for the secure development of software and systems shall be " +
        "established and applied. For space operators, secure development " +
        "practices are essential for satellite flight software, ground segment " +
        "control systems, mission planning software, telemetry processing " +
        "applications, and customer-facing data delivery platforms. The " +
        "development lifecycle shall include threat modelling, secure design " +
        "review, static and dynamic code analysis, penetration testing, and " +
        "supply chain integrity verification for third-party components.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, CON.8 (Software Development); NIS2UmsuCG §30(2)(f)",
        notes:
          "BSI requires secure software development practices per IT-Grundschutz. " +
          "NIS2 transposition mandates supply chain security assessment for " +
          "essential and important entities.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 4; ANSSI Secure Development Guide",
        notes:
          "ANSSI provides guidance on secure development practices and requires " +
          "security validation of critical software for OIV/OSE.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "ISO27001-A8.28",
    source: {
      framework: "ISO/IEC 27001:2022",
      reference: "Annex A, Control 8.28",
      title: "Secure coding",
      fullText:
        "Secure coding principles shall be applied to software development. " +
        "For space operators, secure coding is critical for flight software " +
        "that executes on satellite processors, ground control system software " +
        "that processes telecommands and telemetry, and web applications " +
        "exposed to the internet for data distribution or customer portals. " +
        "Coding standards shall address input validation, memory safety, " +
        "error handling, authentication bypasses, and protection against " +
        "injection attacks. Code review and automated analysis shall be " +
        "integrated into the development process.",
      status: "published",
      citation: ISO27001_CITATION,
      lastVerified: LAST_VERIFIED,
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI IT-Grundschutz Compendium, CON.8 (Software Development); BSI Secure Coding Guidelines",
        notes:
          "BSI provides secure coding guidelines and requires code review for " +
          "critical infrastructure software development.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI Secure Development Guide; ANSSI NIS2 Referential v1.0, Objective 4",
        notes:
          "ANSSI provides detailed secure coding guidance and recommends " +
          "automated code analysis tools for critical software.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74(2)",
      confidence: "partial",
      relationship: "codifies",
      disclaimer: EU_SPACE_ACT_DISCLAIMER,
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },
];

// ─── Accessor Functions ─────────────────────────────────────────────────────

/**
 * Returns all ISO/IEC 27001:2022 Annex A requirements relevant to space operators.
 */
export function getISO27001Requirements(): EnactedRequirement[] {
  return iso27001Requirements;
}

/**
 * Returns a single ISO 27001 requirement by its ID, or null if not found.
 *
 * @param id - The requirement identifier (e.g., "ISO27001-A8.24")
 */
export function getISO27001RequirementById(
  id: string,
): EnactedRequirement | null {
  return iso27001Requirements.find((r) => r.id === id) ?? null;
}
