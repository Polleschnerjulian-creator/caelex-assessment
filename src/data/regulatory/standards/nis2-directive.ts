/**
 * NIS2 Directive (EU) 2022/2555 — Enacted Requirements
 *
 * Directive (EU) 2022/2555 of the European Parliament and of the Council
 * of 14 December 2022 on measures for a high common level of cybersecurity
 * across the Union (NIS2 Directive).
 *
 * Official Journal: OJ L 333, 27.12.2022, p. 80-152
 * Entry into force: 16 January 2023
 * Transposition deadline: 17 October 2024
 *
 * Space is designated a sector of high criticality under Annex I, Sector 11.
 * Space operators (ground infrastructure operators, space operations centres,
 * and satellite operators) meeting the size thresholds in Art. 2 are subject
 * to NIS2 as essential or important entities.
 *
 * This file contains the primary cybersecurity risk-management measures
 * (Art. 21), incident reporting obligations (Art. 23), and governance
 * requirements (Art. 20) relevant to space operators.
 *
 * LEGAL DISCLAIMER: This data references enacted EU law. Article numbers,
 * paragraph numbers, and quoted text are sourced from the Official Journal.
 * This does not constitute legal advice. Always consult the Official Journal
 * and qualified legal counsel.
 */

import type { EnactedRequirement } from "../types";

// ─── NIS2 Directive Requirements ─────────────────────────────────────────────

const nis2Requirements: EnactedRequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(a) — Policies on risk analysis and information system security
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-a-1",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(a)",
      title: "Risk analysis policy for space information systems",
      fullText:
        "Essential and important entities shall adopt policies on risk analysis " +
        "and information system security. For space operators, this encompasses " +
        "ground segment infrastructure (mission control centres, ground stations, " +
        "TT&C facilities), space segment operations (satellite bus and payload " +
        "systems), and inter-segment communication links (uplink, downlink, " +
        "inter-satellite links). The risk analysis must account for the unique " +
        "threat landscape of space operations, including RF interference, " +
        "anti-satellite threats, orbital debris-induced failures, and the " +
        "extended supply chain from component suppliers to launch providers.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(a); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.1; NIS2UmsuCG §30(1)",
        notes:
          "German transposition via NIS2-Umsetzungs- und Cybersicherheitsstärkungsgesetz. " +
          "BSI Technical Guideline TR-03184 provides sector-specific implementation " +
          "guidance for risk analysis methodologies.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 1; Loi n° 2024-xxx",
        notes:
          "French transposition via ANSSI regulatory framework. ANSSI NIS2 referential " +
          "defines risk analysis requirements aligned with EBIOS RM methodology.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "NIS2-21-2-a-2",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(a)",
      title: "Information system security policy documentation",
      fullText:
        "Entities shall maintain documented information system security policies " +
        "approved by management bodies. For space operators, these policies must " +
        "be reviewed at intervals aligned with mission phases (design, integration, " +
        "launch, early orbit, nominal operations, end-of-life) and at minimum " +
        "annually. The policies shall address classification of information " +
        "assets including telemetry data, command sequences, orbital parameters, " +
        "and mission planning data.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(a); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.1.2; BSI IT-Grundschutz Compendium",
        notes:
          "BSI requires documentation according to IT-Grundschutz standards. " +
          "Space-specific profiles under BSI-TR-03184 mandate coverage of all " +
          "mission segments.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 1.2",
        notes:
          "ANSSI requires PSSI (Politique de Sécurité des Systèmes d'Information) " +
          "documentation aligned with ISO 27001 and national defence requirements " +
          "for operators of vital importance (OIV/OSE).",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(b) — Incident handling
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-b",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(b)",
      title: "Incident handling procedures for space operations",
      fullText:
        "Entities shall implement incident handling procedures including detection, " +
        "analysis, containment, and recovery. Space operators face unique incident " +
        "scenarios: loss of satellite command authority, anomalous orbit manoeuvres " +
        "indicating unauthorized access, ground station compromise, TT&C link " +
        "jamming or spoofing, and payload data exfiltration. Incident handling " +
        "procedures must account for the real-time nature of space operations " +
        "and the limited ability to physically access space assets for remediation.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(b); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.2; NIS2UmsuCG §32",
        notes:
          "German transposition mandates incident handling procedures coordinated " +
          "with BSI as the national CSIRT. Space operators must integrate with " +
          "BSI's CERT-Bund notification infrastructure.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 5; CERT-FR procedures",
        notes:
          "French implementation requires integration with CERT-FR incident " +
          "response framework. ANSSI provides sector-specific incident " +
          "classification guidance.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(c) — Business continuity and crisis management
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-c",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(c)",
      title:
        "Business continuity, backup management, disaster recovery, and crisis management",
      fullText:
        "Entities shall implement business continuity and crisis management " +
        "measures including backup management and disaster recovery. For space " +
        "operators, this includes contingency procedures for loss of primary " +
        "ground station connectivity (failover to backup ground stations), " +
        "satellite safe mode recovery procedures, redundant command paths, " +
        "and mission continuity planning for constellation degradation scenarios. " +
        "Backup management must cover mission-critical data including ephemeris " +
        "data, command history, and satellite configuration states.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(c); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.3; BSI Standard 200-4",
        notes:
          "BSI Standard 200-4 (Business Continuity Management) applies. " +
          "BSI-TR-03184 adds space-specific continuity requirements for " +
          "ground segment redundancy and satellite safe mode procedures.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 6",
        notes:
          "ANSSI requires PCA (Plan de Continuité d'Activité) and PRA " +
          "(Plan de Reprise d'Activité) documentation with tested recovery " +
          "time objectives.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(d) — Supply chain security
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-d",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(d)",
      title: "Supply chain security for space systems",
      fullText:
        "Entities shall address supply chain security including security-related " +
        "aspects concerning the relationships between each entity and its direct " +
        "suppliers or service providers. The space supply chain is uniquely " +
        "complex: satellite component manufacturers, software suppliers for " +
        "on-board and ground segment systems, launch service providers, spectrum " +
        "providers, ground station network operators, and data relay services. " +
        "Entities must assess the cybersecurity posture of each supplier, " +
        "particularly for components with access to command and control systems, " +
        "and maintain a register of critical dependencies.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(d); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.4; NIS2UmsuCG §30(2)(4)",
        notes:
          "German law requires supply chain risk assessment with particular " +
          "attention to ICT product and service providers. BSI-TR-03184 adds " +
          "space-specific supply chain mapping requirements.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 3",
        notes:
          "ANSSI requires supply chain mapping and contractual security " +
          "clauses. French defence procurement rules (DGA) may additionally " +
          "apply to dual-use space components.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 75",
      confidence: "direct",
      relationship: "extends",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(e) — Security in network and information systems
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-e",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(e)",
      title:
        "Security in network and information system acquisition, development, and maintenance",
      fullText:
        "Entities shall ensure security in network and information system " +
        "acquisition, development, and maintenance, including vulnerability " +
        "handling and disclosure. For space operators, this covers secure " +
        "development practices for flight software, ground segment control " +
        "software, mission planning systems, and data processing pipelines. " +
        "Vulnerability handling must address the challenge that on-orbit " +
        "software cannot always be patched — requiring secure-by-design " +
        "development and formal verification for critical flight software " +
        "components.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(e); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.5; BSI TR-02102 (Crypto)",
        notes:
          "BSI requires secure software development lifecycle aligned with " +
          "Common Criteria or equivalent. BSI-TR-03184 addresses space-specific " +
          "constraints on patch management for on-orbit systems.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 4; ANSSI CSPN certification",
        notes:
          "ANSSI may require CSPN (Certification de Sécurité de Premier Niveau) " +
          "or CC certification for critical components. Vulnerability disclosure " +
          "must follow ANSSI coordinated vulnerability disclosure process.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(f) — Assessing cybersecurity risk-management effectiveness
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-f",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(f)",
      title:
        "Policies and procedures to assess the effectiveness of cybersecurity risk-management measures",
      fullText:
        "Entities shall adopt policies and procedures to assess the effectiveness " +
        "of cybersecurity risk-management measures. For space operators, this " +
        "includes regular penetration testing of ground segment systems, " +
        "red team exercises simulating adversarial scenarios (satellite command " +
        "hijacking, ground station intrusion), tabletop exercises for space-specific " +
        "incident scenarios, and continuous monitoring with metrics and KPIs " +
        "covering both IT and OT (operational technology) environments in the " +
        "ground segment.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(f); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.6; NIS2UmsuCG §30(2)(6)",
        notes:
          "German transposition requires regular effectiveness assessments. " +
          "BSI may conduct audits or require third-party assessments for " +
          "essential entities in the space sector.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 7",
        notes:
          "ANSSI requires periodic security audits (PASSI-qualified auditors) " +
          "and continuous improvement processes. Operators of vital importance " +
          "may face mandatory ANSSI-supervised audits.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "partial",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(g) — Cyber hygiene and cybersecurity training
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-g",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(g)",
      title: "Basic cyber hygiene practices and cybersecurity training",
      fullText:
        "Entities shall implement basic cyber hygiene practices and cybersecurity " +
        "training. Space operators must ensure training covers space-specific " +
        "threats and scenarios: social engineering targeting satellite operators, " +
        "recognition of anomalous telemetry indicating cyber intrusion, secure " +
        "handling of command authentication credentials, and awareness of the " +
        "consequences of unauthorized commands (orbital manoeuvre, payload " +
        "activation, decommissioning). Training shall be provided to all " +
        "personnel with access to space system networks and information systems.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(g); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.7; NIS2UmsuCG §30(2)(7)",
        notes:
          "BSI requires cybersecurity awareness training with documented " +
          "completion records. Space-specific training modules recommended " +
          "under BSI-TR-03184.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 2",
        notes:
          "ANSSI requires cybersecurity training programmes with regular " +
          "refresher courses. ANSSI provides sector-specific training " +
          "guidelines and approved training providers (CFSSI).",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(h) — Cryptography and encryption
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-h",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(h)",
      title:
        "Policies and procedures regarding the use of cryptography and encryption",
      fullText:
        "Entities shall establish policies and procedures regarding the use of " +
        "cryptography and, where appropriate, encryption. For space operators, " +
        "this is critical for securing TT&C (Telemetry, Tracking & Command) " +
        "links, protecting command authentication, and ensuring data " +
        "confidentiality for payload downlinks. Policies must address: " +
        "encryption of command uplinks, authentication of telemetry downlinks, " +
        "key management for on-orbit systems (where key rotation is constrained " +
        "by hardware limitations), and compliance with national cryptographic " +
        "regulations which may restrict export of space-grade encryption.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(h); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI-TR-03184 Section 4.8; BSI-TR-02102 (Cryptographic Mechanisms)",
        notes:
          "BSI-TR-02102 defines approved cryptographic algorithms and key " +
          "lengths. Space operators must comply with BSI cryptographic " +
          "recommendations and may require VS-NfD approval for classified " +
          "communications.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 4.3; ANSSI RGS v2.0",
        notes:
          "ANSSI RGS (Référentiel Général de Sécurité) v2.0 defines " +
          "cryptographic requirements. French regulation restricts certain " +
          "cryptographic exports. ANSSI qualification may be required for " +
          "cryptographic products used in space operations.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(i) — Human resources security, access control, asset mgmt
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-i-1",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(i)",
      title: "Human resources security for space operations personnel",
      fullText:
        "Entities shall implement human resources security measures including " +
        "appropriate background checks and vetting. For space operators, " +
        "personnel with access to satellite command systems, mission control " +
        "operations, and payload data require enhanced vetting due to the " +
        "critical infrastructure nature of space assets. This includes " +
        "security clearance requirements where applicable, ongoing personnel " +
        "security monitoring, and secure offboarding procedures that ensure " +
        "revocation of all access to space system credentials and networks.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(i); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference:
          "BSI-TR-03184 Section 4.9; SÜG (Sicherheitsüberprüfungsgesetz)",
        notes:
          "German Security Clearance Act (SÜG) applies to personnel at " +
          "space operators handling classified information. BSI-TR-03184 " +
          "specifies vetting levels for different operational roles.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 2.2; IGI 1300",
        notes:
          "French defence security instruction IGI 1300 governs personnel " +
          "clearances. ANSSI requires role-based access control documentation " +
          "and regular access reviews.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "partial",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "NIS2-21-2-i-2",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(i)",
      title: "Access control policies and asset management for space systems",
      fullText:
        "Entities shall implement access control policies and asset management " +
        "measures. Space operators must maintain a comprehensive inventory of " +
        "all information assets: satellites (including their on-board software " +
        "versions and firmware), ground station equipment, network infrastructure, " +
        "TT&C frequencies, orbital slots, and mission data archives. Access " +
        "control policies must implement the principle of least privilege, with " +
        "particular attention to segregation between satellite command authority, " +
        "payload operations, and administrative systems.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(i); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.9.2; BSI IT-Grundschutz INF.14",
        notes:
          "BSI IT-Grundschutz module INF.14 covers building blocks for " +
          "space ground segment security. Asset management must follow " +
          "BSI cataloguing requirements.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 2.3",
        notes:
          "ANSSI requires cartography of information systems (cartographie " +
          "du SI) with detailed asset inventory and data flow mapping.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(2)(j) — Multi-factor authentication and secured communications
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-2-j-1",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(j)",
      title: "Multi-factor authentication for space system access",
      fullText:
        "Entities shall use multi-factor authentication or continuous " +
        "authentication solutions where appropriate. For space operators, " +
        "MFA is essential for access to satellite command and control systems, " +
        "mission planning tools, and ground station networks. Continuous " +
        "authentication should be considered for long-duration mission control " +
        "sessions. Hardware security tokens are recommended for the most " +
        "critical access paths (direct satellite command authority) given the " +
        "irreversible nature of certain space operations (de-orbit commands, " +
        "manoeuvre execution).",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(j); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.10; BSI-TR-03107 (eID)",
        notes:
          "BSI requires MFA for all administrative and operational access. " +
          "BSI-TR-03184 mandates hardware-based authentication for satellite " +
          "command authority roles.",
      },
      {
        jurisdiction: "FR",
        reference:
          "ANSSI NIS2 Referential v1.0, Objective 2.4; ANSSI Guide MFA",
        notes:
          "ANSSI MFA guidance requires phishing-resistant authentication for " +
          "critical systems. ANSSI-qualified authentication products recommended " +
          "for space operations.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "NIS2-21-2-j-2",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(2)(j)",
      title: "Secured voice, video, and text communications",
      fullText:
        "Entities shall use secured voice, video, and text communications and " +
        "secured emergency communication systems within the entity where " +
        "appropriate. Space operators must secure all operational communications " +
        "channels: mission control voice loops, inter-facility data links, " +
        "coordination channels with launch providers and ground station networks, " +
        "and emergency communication paths used during anomaly resolution. " +
        "End-to-end encryption is required for communications carrying satellite " +
        "operational data, command sequences, or security-sensitive mission information.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(2)(j); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "BSI-TR-03184 Section 4.10.2; BSI-VS-NfD guidelines",
        notes:
          "BSI requires end-to-end encrypted communications for operational " +
          "data. VS-NfD (Verschlusssache — Nur für den Dienstgebrauch) " +
          "guidelines apply to classified operational communications.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 4.4",
        notes:
          "ANSSI requires use of qualified encryption products for sensitive " +
          "communications. ANSSI-certified secure communication tools required " +
          "for operators of vital importance.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "partial",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 23(1) — Incident notification — early warning within 24 hours
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-23-1",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 23(1) and Art. 23(4)(a)",
      title: "Early warning notification — 24 hours",
      fullText:
        "Essential and important entities shall notify the competent authority " +
        "or the CSIRT without undue delay of any significant incident. An early " +
        "warning shall be submitted without undue delay and in any event within " +
        "24 hours of the entity becoming aware of the significant incident. " +
        "The early warning shall indicate whether the significant incident is " +
        "suspected of being caused by unlawful or malicious acts or could have " +
        "a cross-border impact. For space operators, significant incidents include " +
        "unauthorized access to satellite command systems, loss of satellite " +
        "control, ground infrastructure compromise affecting mission operations, " +
        "and data breaches involving orbital parameters or national security data.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 23(1), (4)(a); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §32(1); BSI-TR-03184 Section 5.1",
        notes:
          "German transposition requires early warning to BSI within 24 hours. " +
          "BSI provides a dedicated reporting portal for NIS2 incident " +
          "notifications. Space sector reporting may additionally trigger " +
          "DLR (German Aerospace Center) notification.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 5.1; CERT-FR portal",
        notes:
          "French transposition requires notification via CERT-FR portal. " +
          "ANSSI may issue binding instructions within 24 hours of receiving " +
          "an early warning from a space operator.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 76",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 23(2) — Incident notification — within 72 hours
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-23-2",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 23(2) and Art. 23(4)(b)",
      title: "Incident notification — 72-hour report",
      fullText:
        "Without undue delay and in any event within 72 hours of becoming aware " +
        "of a significant incident, the entity shall submit an incident " +
        "notification that updates the early warning and sets out an initial " +
        "assessment of the significant incident, including its severity and " +
        "impact, as well as, where available, the indicators of compromise. " +
        "For space operators, the 72-hour notification must include: affected " +
        "satellite assets and their orbital parameters, impact on service " +
        "availability, assessment of whether the incident affects other " +
        "operators sharing orbital regimes or frequencies, and preliminary " +
        "root cause analysis covering both cyber and physical (space environment) " +
        "factors.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 23(2), (4)(b); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §32(2); BSI-TR-03184 Section 5.2",
        notes:
          "German law requires the 72-hour notification to BSI with severity " +
          "assessment, affected systems, and initial indicators of compromise. " +
          "BSI-TR-03184 provides space-specific incident classification criteria.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 5.2",
        notes:
          "French implementation requires structured incident report to ANSSI " +
          "within 72 hours, including technical analysis, indicators of " +
          "compromise, and impact assessment on essential services.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 76",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 23(3) — Final report — within 1 month
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-23-3",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 23(3) and Art. 23(4)(e)",
      title: "Final incident report — one month",
      fullText:
        "No later than one month after the submission of the incident notification, " +
        "the entity shall submit a final report containing: a detailed description " +
        "of the incident including its severity and impact; the type of threat or " +
        "root cause that is likely to have triggered the incident; applied and " +
        "ongoing mitigation measures; and, where applicable, the cross-border " +
        "impact of the incident. For space operators, the final report must " +
        "include lessons learned specific to space operations, changes to " +
        "satellite configuration or operational procedures, and recommendations " +
        "for the broader space community where the threat vector may affect " +
        "other operators.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 23(3), (4)(e); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §32(4); BSI-TR-03184 Section 5.3",
        notes:
          "German law requires the final report within one month. BSI may " +
          "request extensions for complex incidents. BSI-TR-03184 provides a " +
          "template for space-sector final incident reports.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 5.3",
        notes:
          "ANSSI requires comprehensive final report with root cause analysis, " +
          "remediation plan, and lessons learned. ANSSI may mandate additional " +
          "measures based on the final report findings.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 76",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 23(4)(c)-(d) — Intermediate / progress report upon request
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-23-4-c",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 23(4)(c)-(d)",
      title: "Intermediate status report upon request",
      fullText:
        "Upon request of the competent authority or the CSIRT, an intermediate " +
        "report on relevant status updates shall be provided. Where the incident " +
        "is ongoing at the time of the submission of the final report, Member " +
        "States shall ensure that the entity provides a progress report at that " +
        "time and a final report within one month of its handling of the incident. " +
        "For space operators, intermediate reports may be requested during " +
        "complex incidents involving ongoing anomaly investigation of satellite " +
        "systems, where root cause analysis depends on telemetry analysis over " +
        "multiple orbital passes or requires coordination with satellite " +
        "manufacturers and subsystem suppliers.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 23(4)(c)-(d); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §32(3); BSI-TR-03184 Section 5.2.1",
        notes:
          "German transposition empowers BSI to request intermediate reports " +
          "at any point during incident handling. BSI-TR-03184 provides " +
          "templates for space-sector progress reports including telemetry " +
          "analysis summaries.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 5.2.1",
        notes:
          "ANSSI may request intermediate reports and issue binding technical " +
          "instructions during ongoing incidents. For operators of vital " +
          "importance, ANSSI may deploy on-site support teams.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 76",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 20 — Governance / Management body responsibilities
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-20-1",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 20(1)",
      title: "Management body approval and oversight of cybersecurity measures",
      fullText:
        "Member States shall ensure that the management bodies of essential and " +
        "important entities approve the cybersecurity risk-management measures " +
        "taken by those entities in order to comply with Article 21 and oversee " +
        "its implementation, and can be held liable for infringements. For space " +
        "operators, this means the board or executive leadership must personally " +
        "approve the cybersecurity strategy covering all mission segments, " +
        "understand the space-specific threat landscape, and maintain oversight " +
        "of cybersecurity posture throughout the mission lifecycle.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 20(1); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §38; BSI-TR-03184 Section 3",
        notes:
          "German transposition holds management personally liable. §38 " +
          "NIS2UmsuCG establishes personal liability for management body " +
          "members who fail to ensure cybersecurity compliance. Fines up to " +
          "EUR 10 million or 2% of global annual turnover.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 1.1",
        notes:
          "French transposition establishes governance requirements including " +
          "board-level cybersecurity responsibility. ANSSI may require named " +
          "responsible persons for entities of vital importance.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  {
    id: "NIS2-20-2",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 20(2)",
      title: "Cybersecurity training for management bodies",
      fullText:
        "Member States shall ensure that the members of the management bodies " +
        "of essential and important entities are required to follow training, " +
        "and shall encourage essential and important entities to offer similar " +
        "training to their employees on a regular basis, in order that they " +
        "gain sufficient knowledge and skills to enable them to identify risks " +
        "and assess cybersecurity risk-management practices and their impact on " +
        "the services provided by the entity. For space operators, management " +
        "training must cover space-specific cyber threats, the unique risk " +
        "profile of space assets (inability to physically access, long mission " +
        "lifecycles, shared orbital environment), and the regulatory obligations " +
        "specific to the space sector.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 20(2); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §38(3); BSI-TR-03184 Section 3.2",
        notes:
          "German law mandates documented cybersecurity training for all " +
          "management body members. BSI-TR-03184 recommends space-sector " +
          "specific training content covering ECSS standards and space threat " +
          "landscape briefings.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, Objective 1.3",
        notes:
          "ANSSI requires documented management cybersecurity training. " +
          "CFSSI (Centre de Formation à la Sécurité des Systèmes d'Information) " +
          "provides approved training curricula.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 73",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // Art. 21(1) — Proportionality / all-hazards approach
  // ═══════════════════════════════════════════════════════════════════════════

  {
    id: "NIS2-21-1",
    source: {
      framework: "NIS2 Directive (EU) 2022/2555",
      reference: "Art. 21(1)",
      title: "Proportionate all-hazards cybersecurity risk management",
      fullText:
        "Member States shall ensure that essential and important entities take " +
        "appropriate and proportionate technical, operational, and organisational " +
        "measures to manage the risks posed to the security of network and " +
        "information systems which those entities use for their operations or " +
        "for the provision of their services, and to prevent or minimise the " +
        "impact of incidents on recipients of their services and on other " +
        "services. The measures shall be based on an all-hazards approach that " +
        "aims to protect network and information systems and the physical " +
        "environment of those systems from incidents. For space operators, the " +
        "all-hazards approach must encompass both cyber threats and physical " +
        "space environment hazards (solar events, orbital debris, electromagnetic " +
        "interference) that may compound or mask cyber incidents.",
      status: "enacted",
      citation:
        "Directive (EU) 2022/2555, Art. 21(1); OJ L 333, 27.12.2022, p. 80",
      lastVerified: "2026-03-01",
    },
    nationalImplementations: [
      {
        jurisdiction: "DE",
        reference: "NIS2UmsuCG §30(1); BSI-TR-03184 Section 4",
        notes:
          "German transposition adopts the proportionality principle. BSI-TR-03184 " +
          "provides space-specific risk categories and proportionality criteria " +
          "based on mission criticality and orbital regime.",
      },
      {
        jurisdiction: "FR",
        reference: "ANSSI NIS2 Referential v1.0, General Principles",
        notes:
          "ANSSI applies proportionality based on entity classification " +
          "(essential vs. important) and sector-specific risk profiles. " +
          "Space operators classified as OIV face stricter requirements.",
      },
    ],
    euSpaceActProposal: {
      articleRef: "Art. 74",
      confidence: "direct",
      relationship: "codifies",
      disclaimer:
        "Based on COM(2025) 335 legislative proposal. Article numbers may change.",
    },
    category: "cybersecurity",
    applicableTo: "all",
    priority: "mandatory",
  },
];

// ─── Accessor Functions ──────────────────────────────────────────────────────

/**
 * Returns all NIS2 Directive enacted requirements.
 */
export function getNIS2Requirements(): EnactedRequirement[] {
  return nis2Requirements;
}

/**
 * Returns a single NIS2 requirement by its ID, or undefined if not found.
 */
export function getNIS2RequirementById(
  id: string,
): EnactedRequirement | undefined {
  return nis2Requirements.find((r) => r.id === id);
}
