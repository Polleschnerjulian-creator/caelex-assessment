/**
 * Copyright 2026 Julian Polleschner (Caelex Einzelunternehmen). All rights reserved.
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

// CRA (EU) 2024/2847 — Cyber Resilience Act Requirements Data
// Space Sector Mapping with NIS2 Cross-References

import type {
  CRAProductClass,
  CRARequirement,
  CRARequirementCategory,
  CRAAssessmentAnswers,
  SpaceProductSegment,
} from "@/lib/cra-types";
import type { AssessmentField, ComplianceRule } from "@/lib/compliance/types";

// ─── CRA Requirements Array ───

export const CRA_REQUIREMENTS: CRARequirement[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // security_by_design (cra-001 to cra-010) — Annex I Part I §1
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-001",
    articleRef: "CRA Annex I, Part I, §1(a)",
    category: "security_by_design",
    title: "Access Control Mechanisms",
    description:
      "Products with digital elements shall be designed with appropriate access control mechanisms to prevent unauthorized access, including authentication, authorization, and identity management proportionate to the risk.",
    complianceQuestion:
      "Does the product implement access control mechanisms including authentication and authorization?",
    spaceSpecificGuidance:
      "For spacecraft on-board computers, implement SpaceWire bus-level access control and telecommand authentication verification (e.g., CCSDS Space Data Link Security protocol) before executing any state-changing command. For ground segment software, implement RBAC with multi-factor authentication for operator access to mission-critical functions such as orbit manoeuvres and payload tasking. User-segment receivers (e.g., GNSS modules) must authenticate signal sources to prevent spoofing attacks.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(i)",
    nis2RequirementIds: ["nis2-037"],
    crossRefIds: ["xref-052"],
    ecssRef: "ECSS-E-ST-70-41C",
    assessmentFields: [
      {
        id: "cra_001_implemented",
        label: "Are access control mechanisms implemented for the product?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Including authentication, authorization, and role-based access control.",
      },
      {
        id: "cra_001_documented",
        label: "Is the access control design documented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Technical documentation showing access control architecture and design decisions.",
      },
      {
        id: "cra_001_telecommand_auth",
        label:
          "Does telecommand interface implement cryptographic authentication?",
        type: "boolean" as const,
        required: false,
        helpText:
          "Applicable to space and link segment products using CCSDS authentication.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_001_implemented", "cra_001_documented"],
    },
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-002",
    articleRef: "CRA Annex I, Part I, §1(b)",
    category: "security_by_design",
    title: "Data Protection at Rest and in Transit",
    description:
      "Products with digital elements shall protect the confidentiality of stored, transmitted, or otherwise processed data, personal or otherwise, by means of state-of-the-art encryption or other appropriate technical measures.",
    complianceQuestion:
      "Does the product protect data confidentiality at rest and in transit using encryption?",
    spaceSpecificGuidance:
      "For space-to-ground links, implement CCSDS Space Data Link Security (SDLS) protocol with AES-256 encryption for telecommand uplinks and telemetry downlinks. For inter-satellite links (ISL), use authenticated encryption to protect relay traffic. Ground segment databases storing mission-critical data (orbital parameters, payload data, operator credentials) must use AES-256-GCM at rest. User-segment devices processing GNSS correction data should encrypt stored ephemeris and authentication keys.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(h)",
    nis2RequirementIds: ["nis2-033"],
    crossRefIds: ["xref-053"],
    ecssRef: "ECSS-E-ST-50-05C",
    assessmentFields: [
      {
        id: "cra_002_encryption_transit",
        label: "Is data encrypted in transit?",
        type: "boolean" as const,
        required: true,
        helpText:
          "TLS 1.3 for ground networks, CCSDS SDLS for space links, authenticated encryption for ISLs.",
      },
      {
        id: "cra_002_encryption_rest",
        label: "Is data encrypted at rest?",
        type: "boolean" as const,
        required: true,
        helpText:
          "AES-256-GCM or equivalent for stored mission data and credentials.",
      },
      {
        id: "cra_002_key_management",
        label: "Is a key management procedure in place?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Key rotation, secure storage of cryptographic keys, and lifecycle management.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_002_encryption_transit",
        "cra_002_encryption_rest",
        "cra_002_key_management",
      ],
    },
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: true,
  },

  {
    id: "cra-003",
    articleRef: "CRA Annex I, Part I, §1(c)",
    category: "security_by_design",
    title: "Minimized Attack Surface",
    description:
      "Products with digital elements shall be designed to reduce the attack surface to the minimum necessary, including limiting externally accessible interfaces, minimizing exposed services, and reducing code complexity where possible.",
    complianceQuestion:
      "Has the product's attack surface been systematically minimized?",
    spaceSpecificGuidance:
      "For flight software, disable all debug interfaces (JTAG, UART consoles, diagnostic telemetry ports) before launch. On-board computers should expose only the minimum CCSDS service set required for operations. Ground segment software must restrict management interfaces to dedicated VLANs and disable unnecessary network services. Satellite bus manufacturers must conduct interface enumeration audits to ensure no undocumented command channels exist in the telecommand dictionary.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_003_surface_analysis",
        label: "Has an attack surface analysis been performed?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Systematic enumeration of all external interfaces, services, and entry points.",
      },
      {
        id: "cra_003_minimized",
        label:
          "Have unnecessary interfaces and services been disabled or removed?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Debug ports, test interfaces, and unused network services must be removed for production.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_003_surface_analysis", "cra_003_minimized"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-004",
    articleRef: "CRA Annex I, Part I, §1(d)",
    category: "security_by_design",
    title: "Secure Default Configuration",
    description:
      "Products with digital elements shall be delivered with secure default configurations, including the possibility to reset the product to its original secure state, and shall not ship with known exploitable vulnerabilities.",
    complianceQuestion:
      "Is the product delivered with a secure default configuration?",
    spaceSpecificGuidance:
      "Spacecraft flight software must boot into a safe mode with all telecommand channels requiring authentication by default — no unauthenticated commanding permitted even during commissioning. Ground station controllers shall ship with default-deny firewall rules, disabled remote management, and randomized initial administrative credentials. GNSS receiver firmware must default to authenticated signal processing where OSNMA or equivalent is available. All default passwords in ground segment COTS equipment must be changed before integration.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_004_secure_defaults",
        label: "Does the product ship with secure default settings?",
        type: "boolean" as const,
        required: true,
        helpText:
          "No default passwords, unnecessary services disabled, minimum-privilege configuration.",
      },
      {
        id: "cra_004_reset_capability",
        label: "Can the product be reset to its secure default state?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Factory reset or equivalent mechanism to restore known-good configuration.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_004_secure_defaults", "cra_004_reset_capability"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-005",
    articleRef: "CRA Annex I, Part I, §1(e)",
    category: "security_by_design",
    title: "Integrity Protection",
    description:
      "Products with digital elements shall protect the integrity of stored and transmitted data, configurations, and software against unauthorized manipulation, including mechanisms to detect tampering.",
    complianceQuestion:
      "Does the product protect data and software integrity against unauthorized manipulation?",
    spaceSpecificGuidance:
      "Flight software must implement secure boot chains with cryptographic signature verification (e.g., RSA-2048 or Ed25519) for all bootloader stages and application images. On-board parameter tables and telecommand dictionaries must be integrity-protected with HMAC or digital signatures. Ground segment configuration files shall use version-controlled integrity hashes. Telemetry data pipelines must include CRC-32 or SHA-256 integrity checks to detect manipulation during downlink processing.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_005_integrity_mechanisms",
        label: "Are integrity protection mechanisms implemented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Cryptographic signatures, HMACs, or hashes protecting software, data, and configurations.",
      },
      {
        id: "cra_005_tamper_detection",
        label: "Can the product detect tampering or unauthorized modification?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Secure boot, runtime integrity monitoring, or configuration drift detection.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_005_integrity_mechanisms",
        "cra_005_tamper_detection",
      ],
    },
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-006",
    articleRef: "CRA Annex I, Part I, §1(f)",
    category: "security_by_design",
    title: "Availability and Resilience",
    description:
      "Products with digital elements shall be designed to ensure availability, including resilience against denial-of-service attacks and mechanisms to mitigate their impact on essential functions.",
    complianceQuestion:
      "Does the product ensure availability and resilience against denial-of-service attacks?",
    spaceSpecificGuidance:
      "Spacecraft systems must implement watchdog timers, autonomous safe-mode transitions, and redundant command receivers to maintain availability during RF jamming or uplink saturation attacks. Ground stations should deploy rate-limiting on telecommand ingestion and geographic diversity for critical TT&C links. Mission control software must support graceful degradation — maintaining core telemetry processing even when ancillary services are unavailable. LEO constellation operators should implement mesh-routing failover for inter-satellite links.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(c)",
    nis2RequirementIds: ["nis2-009"],
    assessmentFields: [
      {
        id: "cra_006_resilience",
        label:
          "Does the product include resilience mechanisms against denial-of-service?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Rate limiting, redundancy, failover, graceful degradation under attack conditions.",
      },
      {
        id: "cra_006_availability_tested",
        label:
          "Has the product been tested for availability under adversarial conditions?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Stress testing, DoS simulation, or resilience testing results documented.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_006_resilience", "cra_006_availability_tested"],
    },
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-007",
    articleRef: "CRA Annex I, Part I, §1(g)",
    category: "security_by_design",
    title: "Logging and Monitoring",
    description:
      "Products with digital elements shall record and allow monitoring of relevant internal activity, including data access and modifications, to enable the detection of cybersecurity incidents.",
    complianceQuestion:
      "Does the product provide logging and monitoring of security-relevant events?",
    spaceSpecificGuidance:
      "Flight software must log all telecommand executions, authentication attempts (successful and failed), mode transitions, and anomalous sensor readings to non-volatile on-board storage with timestamps synchronized via GPS or ground-uploaded time. Ground segment systems must integrate with SIEM solutions and log all operator actions, configuration changes, and data access events. Telemetry processing chains should generate security event logs for anomalous commanding patterns or unexpected data volumes that may indicate compromise.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(f)",
    assessmentFields: [
      {
        id: "cra_007_logging_implemented",
        label: "Does the product log security-relevant events?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Authentication attempts, access events, configuration changes, command executions.",
      },
      {
        id: "cra_007_monitoring_capability",
        label: "Can the logs be monitored or exported for analysis?",
        type: "boolean" as const,
        required: true,
        helpText:
          "SIEM integration, log export, or on-board anomaly detection capability.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_007_logging_implemented",
        "cra_007_monitoring_capability",
      ],
    },
    severity: "major",
    implementationTimeWeeks: 5,
    canBeSimplified: true,
  },

  {
    id: "cra-008",
    articleRef: "CRA Annex I, Part I, §1(h)",
    category: "security_by_design",
    title: "Secure Communication",
    description:
      "Products with digital elements shall ensure the security of communication channels, including the use of encryption and integrity protection for data exchanged with other products, services, or components.",
    complianceQuestion:
      "Does the product secure all communication channels using encryption and integrity protection?",
    spaceSpecificGuidance:
      "All telecommand uplinks must use CCSDS Space Data Link Security (SDLS) with authenticated encryption. Telemetry downlinks carrying sensitive data must be encrypted. Inter-satellite links in constellation architectures must implement authenticated and encrypted channels. Ground segment inter-facility communication must use TLS 1.3 or IPSec VPNs. APIs between mission control and ground station networks must enforce mutual TLS. Satellite-to-cloud data relay paths must maintain end-to-end encryption from spacecraft to processing facility.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(h)",
    crossRefIds: ["xref-053"],
    assessmentFields: [
      {
        id: "cra_008_encrypted_comms",
        label: "Are all communication channels encrypted?",
        type: "boolean" as const,
        required: true,
        helpText:
          "TLS 1.3, CCSDS SDLS, IPSec, or equivalent for all external interfaces.",
      },
      {
        id: "cra_008_integrity_comms",
        label: "Are communication channels integrity-protected?",
        type: "boolean" as const,
        required: true,
        helpText:
          "MACs, digital signatures, or authenticated encryption for transmitted data.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_008_encrypted_comms", "cra_008_integrity_comms"],
    },
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-009",
    articleRef: "CRA Annex I, Part I, §1(i)",
    category: "security_by_design",
    title: "Secure Update Mechanism",
    description:
      "Products with digital elements shall be designed with a secure mechanism for software updates, ensuring the authenticity and integrity of updates and allowing the user to verify and control the update process.",
    complianceQuestion:
      "Does the product include a secure mechanism for software updates?",
    spaceSpecificGuidance:
      "Flight software update mechanisms must implement cryptographically signed firmware images with dual-bank architecture for safe rollback in case of failed uploads. Over-the-air (OTA) updates to spacecraft must use the CCSDS File Delivery Protocol (CFDP) with integrity verification and staged activation (upload, verify, activate sequence). Ground segment software must support automated patch deployment with pre-deployment integrity checks and rollback capabilities. For user-segment receivers, firmware updates must be signed by the manufacturer's release key.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_009_update_mechanism",
        label: "Does the product have a secure update mechanism?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Signed updates, integrity verification, staged activation process.",
      },
      {
        id: "cra_009_update_authenticity",
        label: "Are updates cryptographically signed and verified?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Digital signatures on firmware/software images verified before installation.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_009_update_mechanism", "cra_009_update_authenticity"],
    },
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: true,
  },

  {
    id: "cra-010",
    articleRef: "CRA Annex I, Part I, §1(j)",
    category: "security_by_design",
    title: "Data Minimization",
    description:
      "Products with digital elements shall process only the minimum amount of data, including personal data, that is necessary for the intended purpose and shall not retain data longer than required.",
    complianceQuestion:
      "Does the product follow data minimization principles, processing only data necessary for its purpose?",
    spaceSpecificGuidance:
      "Spacecraft telemetry subsystems should transmit only operationally necessary housekeeping parameters during nominal operations, with verbose diagnostic telemetry reserved for anomaly investigation modes. Ground segment databases must implement automated retention policies — e.g., raw telemetry archived for the mission lifetime but real-time processing buffers purged after 30 days. User-segment devices must not collect or transmit user location data unless explicitly required for the service. Payload data processing chains should anonymize or pseudonymize end-user data at the earliest processing stage.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_010_data_minimization",
        label: "Does the product collect and process only necessary data?",
        type: "boolean" as const,
        required: true,
        helpText:
          "No unnecessary telemetry collection, user tracking, or data retention beyond operational need.",
      },
      {
        id: "cra_010_retention_policy",
        label: "Is a data retention and deletion policy implemented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Automated purging of temporary data, defined retention periods for archived data.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_010_data_minimization", "cra_010_retention_policy"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // vulnerability_handling (cra-011 to cra-016) — Annex I Part I §2
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-011",
    articleRef: "CRA Annex I, Part I, §2(a)",
    category: "vulnerability_handling",
    title: "Vulnerability Identification Process",
    description:
      "Manufacturers shall establish a documented process for identifying vulnerabilities in products with digital elements, including regular testing and analysis of the product and its components.",
    complianceQuestion:
      "Is there a documented process for identifying vulnerabilities in the product?",
    spaceSpecificGuidance:
      "Establish a dedicated Product Security Incident Response Team (PSIRT) covering both flight and ground software. Vulnerability identification for space systems must include: static analysis of flight software (MISRA-C compliance scans), dynamic testing of ground station interfaces, RF protocol fuzzing of telecommand parsers, and periodic review of CCSDS protocol stack implementations against published CVEs. Integrate with ESA's Space ISAC threat intelligence feeds and CERT-EU advisories for space-specific vulnerability information.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(e)",
    nis2RequirementIds: ["nis2-017"],
    crossRefIds: ["xref-049"],
    assessmentFields: [
      {
        id: "cra_011_vuln_process",
        label: "Is a vulnerability identification process documented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Formal process for discovering vulnerabilities including testing methodologies.",
      },
      {
        id: "cra_011_regular_testing",
        label: "Is regular security testing performed?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Static analysis, dynamic testing, fuzzing, and penetration testing on a defined schedule.",
      },
      {
        id: "cra_011_psirt_established",
        label: "Is a Product Security Incident Response Team (PSIRT) in place?",
        type: "boolean" as const,
        required: false,
        helpText:
          "Dedicated team or contact point for receiving and triaging vulnerability reports.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_011_vuln_process", "cra_011_regular_testing"],
    },
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-012",
    articleRef: "CRA Annex I, Part I, §2(b)",
    category: "vulnerability_handling",
    title: "Vulnerability Remediation Timeline",
    description:
      "Manufacturers shall address and remediate identified vulnerabilities without undue delay, with security updates provided free of charge for the defined support period.",
    complianceQuestion:
      "Is there a defined timeline for vulnerability remediation and patch delivery?",
    spaceSpecificGuidance:
      "Establish tiered remediation timelines that account for space-specific constraints: critical vulnerabilities in ground segment software within 48 hours; high-severity flight software vulnerabilities patched within the next planned upload window (typically 1-2 weeks for LEO, up to 4 weeks for GEO). Define emergency upload procedures for actively-exploited vulnerabilities that bypass normal planning cycles. Maintain pre-validated patch packages for known vulnerability classes in flight software to reduce upload preparation time. Document constraints on in-orbit patching (available bandwidth, contact windows, safe-mode risk).",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_012_remediation_timeline",
        label: "Are vulnerability remediation timelines defined?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Tiered timelines based on severity — critical, high, medium, low.",
      },
      {
        id: "cra_012_free_updates",
        label: "Are security updates provided free of charge?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Security patches must be delivered at no cost during the support period.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_012_remediation_timeline", "cra_012_free_updates"],
    },
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-013",
    articleRef: "CRA Annex I, Part I, §2(c)",
    category: "vulnerability_handling",
    title: "Security Testing",
    description:
      "Manufacturers shall conduct effective and regular security testing of the product with digital elements, including penetration testing, fuzz testing, static analysis, and review of third-party components.",
    complianceQuestion:
      "Is regular security testing (penetration testing, fuzzing, static analysis) conducted?",
    spaceSpecificGuidance:
      "Conduct protocol-level fuzz testing on CCSDS telecommand parsers and spacecraft data handling units. Perform penetration testing on ground station network interfaces, mission planning systems, and web-based satellite management portals. Run static analysis (MISRA-C/C++ for flight software, SAST tools for ground software) as part of CI/CD pipelines. For radiation-hardened processors, test error-handling paths triggered by single-event upsets (SEUs) that could create exploitable states. Conduct red-team exercises simulating hostile RF environment and ground station compromise scenarios.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_013_pen_testing",
        label: "Is penetration testing conducted regularly?",
        type: "boolean" as const,
        required: true,
        helpText:
          "At least annually or before major releases, by qualified testers.",
      },
      {
        id: "cra_013_static_analysis",
        label: "Is static code analysis performed?",
        type: "boolean" as const,
        required: true,
        helpText:
          "SAST tools integrated into development pipeline, MISRA-C for flight software.",
      },
      {
        id: "cra_013_fuzz_testing",
        label: "Is fuzz testing performed on input-handling interfaces?",
        type: "boolean" as const,
        required: false,
        helpText:
          "Protocol fuzzing for telecommand parsers, API endpoints, and file format handlers.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_013_pen_testing", "cra_013_static_analysis"],
    },
    severity: "major",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-014",
    articleRef: "CRA Annex I, Part I, §2(d)",
    category: "vulnerability_handling",
    title: "Vulnerability Disclosure Policy",
    description:
      "Manufacturers shall establish and maintain a coordinated vulnerability disclosure policy, including a publicly accessible contact point for reporting vulnerabilities and clear handling procedures.",
    complianceQuestion:
      "Is there a publicly accessible vulnerability disclosure policy with a reporting mechanism?",
    spaceSpecificGuidance:
      "Publish a security.txt file (RFC 9116) on manufacturer websites and include vulnerability reporting procedures in product documentation. For space systems, the disclosure policy must address the unique challenge of vulnerabilities in in-orbit assets where immediate patching may not be feasible — define interim mitigation procedures (e.g., operational workarounds, restricting telecommand access) for the period between disclosure and patch upload. Coordinate with national space agencies (e.g., ESA, DLR, CNES) and CERT-EU on disclosure timelines for vulnerabilities affecting mission-critical infrastructure.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_014_disclosure_policy",
        label: "Is a vulnerability disclosure policy published?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Publicly accessible policy with clear reporting channels (e.g., security.txt).",
      },
      {
        id: "cra_014_reporting_mechanism",
        label:
          "Is there a mechanism for external parties to report vulnerabilities?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Dedicated email, web form, or bug bounty programme for vulnerability reports.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_014_disclosure_policy",
        "cra_014_reporting_mechanism",
      ],
    },
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
  },

  {
    id: "cra-015",
    articleRef: "CRA Annex I, Part I, §2(e)",
    category: "vulnerability_handling",
    title: "SBOM Maintenance",
    description:
      "Manufacturers shall identify and document all components contained in the product, including third-party and open-source components, and maintain a software bill of materials (SBOM) to facilitate vulnerability tracking.",
    complianceQuestion:
      "Is a software bill of materials (SBOM) maintained and kept current?",
    spaceSpecificGuidance:
      "Generate SBOMs for both flight software and ground segment applications using CycloneDX or SPDX format. Flight software SBOMs must include: RTOS version and patch level, CCSDS protocol stack implementations, board support packages, and any COTS middleware (e.g., RTEMS, VxWorks components). Ground segment SBOMs must cover all frameworks, libraries, and containerized services. Map each SBOM entry to CVE monitoring feeds. For heritage flight software reused across missions, maintain traceable lineage of component versions and their known vulnerability status.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(d)",
    crossRefIds: ["xref-050"],
    assessmentFields: [
      {
        id: "cra_015_sbom_exists",
        label: "Is an SBOM generated and maintained for the product?",
        type: "boolean" as const,
        required: true,
        helpText:
          "CycloneDX or SPDX format, covering all first-party and third-party components.",
      },
      {
        id: "cra_015_sbom_current",
        label: "Is the SBOM updated with each release?",
        type: "boolean" as const,
        required: true,
        helpText:
          "SBOM regenerated or updated as part of the build/release pipeline.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_015_sbom_exists", "cra_015_sbom_current"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-016",
    articleRef: "CRA Annex I, Part I, §2(f)",
    category: "vulnerability_handling",
    title: "Third-Party Component Tracking",
    description:
      "Manufacturers shall track and monitor all third-party components integrated into the product, ensure they receive timely security updates, and assess the security posture of their suppliers.",
    complianceQuestion:
      "Are third-party components tracked for vulnerabilities and kept up to date?",
    spaceSpecificGuidance:
      "Monitor CVE databases and vendor advisories for all COTS components in both flight and ground segments. For flight software, this includes RTOS vendors (Wind River, Lynx, RTEMS project), CCSDS library providers, and radiation-tolerant processor SDK suppliers. Ground segment tracking must cover operating systems, web frameworks, container base images, and database engines. Establish vendor security assessment questionnaires for critical suppliers. For heritage components where the original vendor no longer provides support, designate internal ownership for ongoing vulnerability monitoring and patching.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(d)",
    crossRefIds: ["xref-050"],
    assessmentFields: [
      {
        id: "cra_016_component_tracking",
        label: "Are third-party components inventoried and monitored?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Automated CVE monitoring against SBOM, vendor advisory subscriptions.",
      },
      {
        id: "cra_016_supplier_assessment",
        label: "Are supplier security practices assessed?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Vendor questionnaires, security certifications, or audit evidence for critical suppliers.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_016_component_tracking",
        "cra_016_supplier_assessment",
      ],
    },
    severity: "major",
    implementationTimeWeeks: 5,
    canBeSimplified: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // documentation (cra-017 to cra-020) — Annex I Part I §3
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-017",
    articleRef: "CRA Annex I, Part I, §3(a)",
    category: "documentation",
    title: "Technical Documentation",
    description:
      "Manufacturers shall draw up and maintain technical documentation that demonstrates compliance with essential requirements, including a general description of the product, design and manufacturing details, and cybersecurity risk assessment.",
    complianceQuestion:
      "Is comprehensive technical documentation maintained that demonstrates CRA compliance?",
    spaceSpecificGuidance:
      "Technical documentation for space products must integrate with existing ECSS documentation standards (ECSS-E-ST-40C for software, ECSS-Q-ST-80C for product assurance). Include: system security architecture diagrams showing ground-space-link segment boundaries, threat model covering all RF interfaces and ground network entry points, secure development lifecycle evidence aligned with ECSS-Q-ST-80C, and test campaign results. For flight hardware with digital elements, include board-level security architecture and physical tamper resistance measures.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_017_tech_doc_exists",
        label: "Is technical documentation maintained?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Comprehensive documentation covering design, development, and security measures.",
      },
      {
        id: "cra_017_tech_doc_complete",
        label: "Does the documentation cover all CRA essential requirements?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Each Annex I requirement must be addressed with evidence of compliance.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_017_tech_doc_exists", "cra_017_tech_doc_complete"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-018",
    articleRef: "CRA Annex I, Part I, §3(b)",
    category: "documentation",
    title: "Risk Assessment Documentation",
    description:
      "Manufacturers shall document a cybersecurity risk assessment for the product, identifying threats, vulnerabilities, and residual risks, along with the measures taken to mitigate them.",
    complianceQuestion:
      "Is a cybersecurity risk assessment documented for the product?",
    spaceSpecificGuidance:
      "The risk assessment must address space-domain-specific threat vectors: RF jamming and spoofing of TT&C and payload links, ground station physical and cyber compromise, supply chain manipulation of flight components, solar particle event-induced bit flips creating exploitable states, and insider threats from operators with privileged telecommand access. Use established frameworks (ISO 27005 or NIST SP 800-30) adapted with space-specific threat catalogues from ENISA and ESA. Quantify risk impact in terms of mission impact (loss of mission, degraded service, data compromise) rather than purely financial terms.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(a)",
    nis2RequirementIds: ["nis2-001"],
    crossRefIds: ["xref-048"],
    assessmentFields: [
      {
        id: "cra_018_risk_assessment",
        label: "Is a cybersecurity risk assessment documented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Threat identification, vulnerability analysis, impact assessment, and mitigation measures.",
      },
      {
        id: "cra_018_space_threats",
        label: "Does the risk assessment cover space-specific threats?",
        type: "boolean" as const,
        required: true,
        helpText:
          "RF interference, ground station compromise, supply chain, orbital debris, insider threats.",
      },
      {
        id: "cra_018_residual_risk",
        label: "Are residual risks identified and accepted?",
        type: "boolean" as const,
        required: true,
        helpText: "Documented acceptance of residual risks with justification.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_018_risk_assessment",
        "cra_018_space_threats",
        "cra_018_residual_risk",
      ],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-019",
    articleRef: "CRA Annex I, Part I, §3(c)",
    category: "documentation",
    title: "Security Architecture Documentation",
    description:
      "Manufacturers shall document the security architecture of the product, including trust boundaries, data flows, authentication mechanisms, and the rationale for security design decisions.",
    complianceQuestion:
      "Is the product's security architecture documented with trust boundaries and data flows?",
    spaceSpecificGuidance:
      "Document security architecture across all segments: spacecraft bus security zones (payload vs. platform partitioning), ground-space link encryption boundaries, ground segment network segmentation (operations network vs. corporate IT vs. mission planning). Include data flow diagrams showing telemetry paths from instrument to archive, telecommand paths from operator console to spacecraft actuator, and cross-segment trust boundaries. For constellation systems, document the inter-satellite link security domain and key distribution architecture. Reference ECSS-E-ST-70C for the operations architecture baseline.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_019_security_arch",
        label: "Is the security architecture documented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Architecture diagrams, trust boundaries, security zones, and design rationale.",
      },
      {
        id: "cra_019_data_flows",
        label: "Are data flows and trust boundaries mapped?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Telemetry, telecommand, and payload data paths with encryption boundaries marked.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_019_security_arch", "cra_019_data_flows"],
    },
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
  },

  {
    id: "cra-020",
    articleRef: "CRA Annex I, Part I, §3(d)",
    category: "documentation",
    title: "User Information and Instructions",
    description:
      "Manufacturers shall provide users with clear and understandable information about the cybersecurity properties of the product, including secure installation, configuration, operation, and maintenance instructions.",
    complianceQuestion:
      "Are users provided with clear cybersecurity information and secure configuration instructions?",
    spaceSpecificGuidance:
      "Provide segment-specific security guidance: for ground station operators, deliver hardening guides covering network configuration, TT&C interface security settings, and operator authentication setup. For integrators, provide interface control documents (ICDs) detailing security requirements for all external interfaces. For user-segment devices (e.g., GNSS receivers), include end-user documentation explaining authentication features, secure configuration defaults, and update procedures. All documentation must identify known residual risks and recommended mitigations that are the operator's responsibility.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_020_user_docs",
        label: "Is user-facing security documentation provided?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Secure installation, configuration, and operation instructions for the end user or operator.",
      },
      {
        id: "cra_020_residual_risks",
        label: "Are residual risks and user responsibilities documented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Clear statement of security limitations and what the user must do to maintain security.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_020_user_docs", "cra_020_residual_risks"],
    },
    severity: "minor",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // conformity_assessment (cra-021 to cra-025) — Art. 32-34
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-021",
    articleRef: "CRA Art. 32",
    category: "conformity_assessment",
    title: "Conformity Assessment Procedure Selection",
    description:
      "Manufacturers shall select and apply the appropriate conformity assessment procedure based on the product classification: self-assessment for default products, harmonised standards or third-party assessment for Class I, and EU-type examination or full quality assurance for Class II.",
    complianceQuestion:
      "Has the appropriate conformity assessment procedure been selected based on product classification?",
    spaceSpecificGuidance:
      "Most space products with digital elements fall into Class I or Class II due to their use in critical infrastructure (satellite operations, navigation, Earth observation for civil protection). On-board computers, telecommand receivers, and ground station control software are typically Class II requiring EU-type examination. User-segment GNSS receivers with authentication functions are Class I. Default classification may apply only to non-critical ancillary tools (e.g., mission planning visualization software with no operational control functions). Consult the CRA Annex III and IV product lists and map to your space product taxonomy.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_021_procedure_selected",
        label: "Has a conformity assessment procedure been selected?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Procedure must match the product's CRA classification (default, Class I, Class II).",
      },
      {
        id: "cra_021_classification_justified",
        label: "Is the product classification justified and documented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Documented reasoning for the chosen classification referencing CRA Annex III/IV.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_021_procedure_selected",
        "cra_021_classification_justified",
      ],
    },
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-022",
    articleRef: "CRA Art. 28",
    category: "conformity_assessment",
    title: "EU Declaration of Conformity",
    description:
      "Manufacturers shall draw up an EU declaration of conformity in accordance with CRA Art. 28, stating that the product meets all applicable essential requirements and identifying the conformity assessment procedure followed.",
    complianceQuestion:
      "Has an EU declaration of conformity been prepared for the product?",
    spaceSpecificGuidance:
      "The declaration must identify the specific space product (including model number, firmware version, and applicable segment), reference all applied harmonised standards (e.g., EN 303 645 for IoT elements, IEC 62443 for industrial control functions), and identify the notified body if third-party assessment was used. For products spanning multiple segments (e.g., a satellite communication terminal with both ground and user interfaces), the declaration should cover all segments. Maintain version-controlled declarations that are updated with each major firmware or software release.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_022_declaration_prepared",
        label: "Has an EU declaration of conformity been drawn up?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Written declaration per CRA Art. 28 template, signed by authorized representative.",
      },
      {
        id: "cra_022_declaration_current",
        label: "Is the declaration kept up to date with product changes?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Updated when essential requirements change due to software/firmware updates.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_022_declaration_prepared",
        "cra_022_declaration_current",
      ],
    },
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-023",
    articleRef: "CRA Art. 29",
    category: "conformity_assessment",
    title: "CE Marking",
    description:
      "Products with digital elements that comply with essential requirements shall bear the CE marking in accordance with Regulation (EC) No 765/2008, affixed visibly, legibly, and indelibly to the product or its data plate.",
    complianceQuestion:
      "Does the product bear the CE marking in accordance with CRA requirements?",
    spaceSpecificGuidance:
      "For physical space hardware (on-board computers, ground station equipment, user terminals), affix CE marking to the product casing or data plate. For purely software products (mission control software, ground segment applications), include the CE marking in product documentation, about screens, and the EU declaration of conformity. For spacecraft components that are physically inaccessible after integration, include CE marking on the outer packaging and all accompanying documentation. Ensure CE marking includes the notified body identification number where applicable.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_023_ce_marking_applied",
        label: "Is the CE marking affixed to the product?",
        type: "boolean" as const,
        required: true,
        helpText:
          "On the product, packaging, or documentation (for software-only products).",
      },
      {
        id: "cra_023_ce_marking_compliant",
        label:
          "Does the CE marking comply with size and visibility requirements?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Minimum 5mm height, visible, legible, and indelible per Regulation (EC) 765/2008.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_023_ce_marking_applied",
        "cra_023_ce_marking_compliant",
      ],
    },
    severity: "critical",
    implementationTimeWeeks: 2,
    canBeSimplified: false,
  },

  {
    id: "cra-024",
    articleRef: "CRA Art. 32-34",
    category: "conformity_assessment",
    title: "Notified Body Engagement",
    description:
      "For Class I products not fully covered by harmonised standards and all Class II products, manufacturers must engage a notified body for conformity assessment through EU-type examination (Module B + C) or full quality assurance (Module H).",
    complianceQuestion:
      "Has a notified body been engaged for conformity assessment where required?",
    spaceSpecificGuidance:
      "Identify notified bodies with space-sector experience — traditional IT security certification bodies may lack understanding of spacecraft systems, CCSDS protocols, and space-specific threat landscapes. Prepare for extended assessment timelines (6-12 months) due to the complexity of space systems and limited availability of qualified assessors. For Class II products (e.g., satellite flight computers, ground station SCADA systems), engage the notified body early in the design phase to avoid costly late-stage redesigns. Consider establishing a framework agreement with a notified body if multiple products require assessment.",
    applicableTo: {
      productClasses: ["class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_024_nb_engaged",
        label: "Has a notified body been engaged?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Required for Class I (without full harmonised standard coverage) and all Class II products.",
      },
      {
        id: "cra_024_nb_space_experience",
        label:
          "Does the notified body have space-sector assessment experience?",
        type: "boolean" as const,
        required: false,
        helpText:
          "Recommended to ensure assessors understand space-specific protocols and architectures.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_024_nb_engaged"],
    },
    severity: "critical",
    implementationTimeWeeks: 12,
    canBeSimplified: false,
  },

  {
    id: "cra-025",
    articleRef: "CRA Art. 31",
    category: "conformity_assessment",
    title: "Technical File Preparation",
    description:
      "Manufacturers shall prepare a technical file containing all information demonstrating compliance with essential requirements, including the risk assessment, security architecture, test results, and vulnerability handling procedures.",
    complianceQuestion:
      "Has a comprehensive technical file been prepared for conformity assessment?",
    spaceSpecificGuidance:
      "The technical file for space products should integrate with the ECSS-M-ST-40C configuration management structure and include: product security architecture diagrams spanning all segments, CCSDS protocol security configuration evidence, penetration test reports for ground interfaces, flight software static analysis results (MISRA-C compliance), SBOM for both flight and ground software, vulnerability handling process documentation, and evidence of secure boot implementation. For notified body assessments, prepare a structured evidence package cross-referencing each CRA Annex I requirement with the corresponding documentation.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_025_tech_file_prepared",
        label: "Is a technical file prepared?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Comprehensive evidence package covering all essential requirements.",
      },
      {
        id: "cra_025_tech_file_complete",
        label: "Does the technical file include all required elements?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Risk assessment, architecture docs, test results, SBOM, vulnerability handling procedures.",
      },
      {
        id: "cra_025_tech_file_maintained",
        label: "Is the technical file kept up to date?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Updated for 10 years after product is placed on the market or support period ends.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_025_tech_file_prepared",
        "cra_025_tech_file_complete",
        "cra_025_tech_file_maintained",
      ],
    },
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // incident_reporting (cra-026 to cra-029) — Art. 14
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-026",
    articleRef: "CRA Art. 14(2)(a)",
    category: "incident_reporting",
    title: "Actively Exploited Vulnerability Reporting (24h)",
    description:
      "Manufacturers shall notify ENISA within 24 hours of becoming aware of any actively exploited vulnerability contained in the product, including an early warning with basic information about the vulnerability and the affected product.",
    complianceQuestion:
      "Is there a process to report actively exploited vulnerabilities to ENISA within 24 hours?",
    spaceSpecificGuidance:
      "Establish a 24/7 security monitoring capability for space systems — satellite operations centres typically run around the clock, but security incident detection must be explicitly integrated into mission operations procedures. The 24-hour notification clock starts when the manufacturer becomes aware of active exploitation, not when the vulnerability is discovered. For space products, coordinate reporting with the designated CSIRT under NIS2 (if the operator is also a NIS2-obligated entity) to avoid duplicate or conflicting reports. Pre-draft notification templates that include spacecraft identifier, affected subsystem, exploitation vector (e.g., telecommand interface, ground segment API), and immediate containment measures.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 23",
    crossRefIds: ["xref-051"],
    assessmentFields: [
      {
        id: "cra_026_24h_process",
        label:
          "Is there a process for 24-hour vulnerability notification to ENISA?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Documented procedure with roles, escalation paths, and notification templates.",
      },
      {
        id: "cra_026_monitoring",
        label:
          "Is there active monitoring for exploitation of known vulnerabilities?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Threat intelligence feeds, IDS/IPS alerts, or user reports monitored continuously.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_026_24h_process", "cra_026_monitoring"],
    },
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: false,
  },

  {
    id: "cra-027",
    articleRef: "CRA Art. 14(2)(b)",
    category: "incident_reporting",
    title: "Severe Incident Notification (72h)",
    description:
      "Manufacturers shall notify ENISA within 72 hours of becoming aware of any severe incident having an impact on the security of the product with digital elements, including a description of the incident, its impact, and corrective measures taken.",
    complianceQuestion:
      "Is there a process to notify ENISA of severe security incidents within 72 hours?",
    spaceSpecificGuidance:
      "Define severity criteria calibrated to space operations: unauthorized telecommand execution constitutes a severe incident regardless of operational impact. Loss of telemetry encryption, ground station network compromise, or unauthorized access to orbit manoeuvre planning systems all qualify. The 72-hour notification must include: affected spacecraft or ground systems by name, operational impact assessment (mission degradation, service interruption), containment measures applied, and estimated timeline for full remediation. For operators dual-obligated under NIS2, align the CRA 72-hour and NIS2 72-hour notification processes to use a single workflow.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 23",
    crossRefIds: ["xref-051"],
    assessmentFields: [
      {
        id: "cra_027_72h_process",
        label: "Is there a process for 72-hour severe incident notification?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Documented procedure covering incident classification, notification content, and escalation.",
      },
      {
        id: "cra_027_severity_criteria",
        label: "Are incident severity criteria defined?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Clear criteria for what constitutes a 'severe incident' for the product.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_027_72h_process", "cra_027_severity_criteria"],
    },
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: false,
  },

  {
    id: "cra-028",
    articleRef: "CRA Art. 14(2)(c)",
    category: "incident_reporting",
    title: "Patch Availability Notification (14d)",
    description:
      "Manufacturers shall notify ENISA and affected users within 14 days of a corrective measure or mitigating action being available, providing information about the vulnerability and how users can apply the fix.",
    complianceQuestion:
      "Is there a process to notify ENISA and users within 14 days of patch availability?",
    spaceSpecificGuidance:
      "For space products, the 14-day notification deadline for patch availability requires careful coordination: flight software patches may need weeks for validation, upload scheduling, and on-board activation. Notify users (satellite operators) as soon as the patch is validated and the upload package is ready, even if the actual on-orbit upload is scheduled for a future contact window. For ground segment patches, use automated deployment notification to all licensed operators. Include clear instructions specifying: patch version, affected versions, installation/upload procedures, expected downtime, and rollback instructions. Maintain a secure distribution channel for patch delivery.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_028_14d_notification",
        label: "Is there a process for 14-day patch notification?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Procedure to notify ENISA and affected users when patches are available.",
      },
      {
        id: "cra_028_user_notification",
        label: "Can affected users be identified and notified?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Customer/operator registry or distribution list for security advisories.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_028_14d_notification", "cra_028_user_notification"],
    },
    severity: "critical",
    implementationTimeWeeks: 3,
    canBeSimplified: false,
  },

  {
    id: "cra-029",
    articleRef: "CRA Art. 15",
    category: "incident_reporting",
    title: "Coordinated Vulnerability Disclosure",
    description:
      "Manufacturers shall participate in coordinated vulnerability disclosure processes, cooperating with designated CSIRTs and other stakeholders to ensure responsible handling and disclosure of vulnerabilities.",
    complianceQuestion:
      "Does the organization participate in coordinated vulnerability disclosure processes?",
    spaceSpecificGuidance:
      "Coordinate with the EU single reporting platform and designated CSIRTs (CERT-EU for EU institutions, national CSIRTs for member states). For space systems, also coordinate with ESA's security team and relevant national space agency security offices (e.g., DLR, CNES, ASI). Disclosure timelines for space product vulnerabilities should account for the extended patching cycles of in-orbit assets — request extended embargo periods (90-180 days) when in-orbit remediation is required. Participate in space-sector information sharing through the Space ISAC and ESA's Secure Software Development working group.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_029_cvd_participation",
        label:
          "Does the organization participate in coordinated vulnerability disclosure?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Established relationships with CSIRTs, willingness to cooperate on vulnerability handling.",
      },
      {
        id: "cra_029_csirt_contact",
        label: "Is a designated CSIRT identified and contact established?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Identified and contacted the relevant national CSIRT or CERT-EU.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_029_cvd_participation", "cra_029_csirt_contact"],
    },
    severity: "critical",
    implementationTimeWeeks: 3,
    canBeSimplified: false,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // post_market_obligations (cra-030 to cra-034) — Art. 13
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-030",
    articleRef: "CRA Art. 13(8)",
    category: "post_market_obligations",
    title: "Support Period Commitment (min 5 years)",
    description:
      "Manufacturers shall determine and document the expected product lifetime and ensure a support period of at least 5 years from placing on the market, during which security updates are provided free of charge.",
    complianceQuestion:
      "Is the product support period defined and at least 5 years?",
    spaceSpecificGuidance:
      "Space missions typically have lifetimes of 5-20 years, significantly exceeding the CRA minimum. The support period must cover the entire planned mission lifetime plus decommissioning phase. For LEO satellites with 5-7 year design life, the CRA minimum is sufficient. For GEO satellites (15+ year design life) and flagship science missions, the support commitment extends well beyond 5 years. Document how security updates will be delivered to spacecraft already in orbit throughout the mission — include provisions for ground-based mitigation if on-orbit patching becomes technically infeasible for aging hardware. Clearly state the support period in commercial contracts and product documentation.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(c)",
    crossRefIds: ["xref-054"],
    assessmentFields: [
      {
        id: "cra_030_support_period",
        label: "Is a support period of at least 5 years defined?",
        type: "boolean" as const,
        required: true,
        helpText:
          "From date of placing on the market, security updates must be provided free of charge.",
      },
      {
        id: "cra_030_support_documented",
        label: "Is the support period communicated to users?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Published in product documentation, sales materials, and on manufacturer website.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_030_support_period", "cra_030_support_documented"],
    },
    severity: "critical",
    implementationTimeWeeks: 2,
    canBeSimplified: false,
  },

  {
    id: "cra-031",
    articleRef: "CRA Art. 13(9)",
    category: "post_market_obligations",
    title: "Security Update Delivery",
    description:
      "Manufacturers shall ensure that security updates are made available to users without undue delay, separate from functionality updates, and clearly identifiable as security-relevant updates.",
    complianceQuestion:
      "Are security updates delivered promptly and identifiable as security patches?",
    spaceSpecificGuidance:
      "For spacecraft flight software, security patches must be separately versioned and validated from feature updates to reduce regression risk. Maintain a dedicated security patch upload and activation procedure that can be executed independently of planned mission software updates. Ground segment security patches should be deployable through automated patch management systems with rollback capability. Clearly label and version-tag security updates in release notes, distinguishing them from functional enhancements. For user-segment products, push security updates through established OTA channels with user notification.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(e)",
    crossRefIds: ["xref-055"],
    assessmentFields: [
      {
        id: "cra_031_update_delivery",
        label: "Are security updates delivered promptly to users?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Without undue delay, free of charge, through established distribution channels.",
      },
      {
        id: "cra_031_update_identifiable",
        label: "Are security updates clearly identifiable as such?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Separate from feature updates, clearly labelled in release notes.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_031_update_delivery", "cra_031_update_identifiable"],
    },
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-032",
    articleRef: "CRA Art. 13(10)",
    category: "post_market_obligations",
    title: "Market Surveillance Cooperation",
    description:
      "Manufacturers shall cooperate with market surveillance authorities upon reasoned request, providing all information and documentation necessary to demonstrate the conformity of the product.",
    complianceQuestion:
      "Is the organization prepared to cooperate with market surveillance authorities?",
    spaceSpecificGuidance:
      "Designate a regulatory affairs contact point for market surveillance authority inquiries regarding CRA compliance of space products. Maintain readily accessible compliance evidence packages that can be provided within the timeframes requested by authorities. For products that involve classified or export-controlled information (common in space systems), establish procedures for providing evidence in controlled environments or with appropriate redactions while still demonstrating compliance. Coordinate with legal counsel on obligations under both CRA market surveillance and national space law supervisory frameworks to present a consistent compliance narrative.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer", "importer", "distributor"],
    },
    assessmentFields: [
      {
        id: "cra_032_cooperation_ready",
        label:
          "Is the organization prepared to cooperate with market surveillance?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Designated contact, accessible documentation, and process for authority requests.",
      },
      {
        id: "cra_032_evidence_accessible",
        label: "Is compliance evidence readily accessible for authorities?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Technical file, declarations, test reports available within reasonable timeframes.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_032_cooperation_ready",
        "cra_032_evidence_accessible",
      ],
    },
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
  },

  {
    id: "cra-033",
    articleRef: "CRA Art. 13(11)",
    category: "post_market_obligations",
    title: "Product Recall and Withdrawal Procedures",
    description:
      "Manufacturers shall have procedures in place for recalling or withdrawing products from the market where there is a significant cybersecurity risk, and shall inform market surveillance authorities and affected users without delay.",
    complianceQuestion:
      "Are procedures in place for product recall or withdrawal due to cybersecurity risks?",
    spaceSpecificGuidance:
      "Product recall for space hardware already launched is physically impossible — define equivalent measures: emergency flight software upload procedures, operational restrictions (e.g., disabling compromised subsystems), or service suspension for affected satellites. For ground segment equipment, implement standard recall/withdrawal procedures with tracking of all deployed units via serial number registries. For user-segment products (GNSS receivers, satellite phones), maintain distribution chain records to enable targeted recall notifications. Document decision criteria for when a cybersecurity vulnerability warrants operational restrictions on in-orbit assets versus ground-based mitigation.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer", "importer", "distributor"],
    },
    assessmentFields: [
      {
        id: "cra_033_recall_procedure",
        label: "Are recall and withdrawal procedures documented?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Procedures for recalling products from the market or restricting in-orbit assets.",
      },
      {
        id: "cra_033_user_tracking",
        label: "Can affected users and deployed products be identified?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Serial number registry, customer database, or distribution chain records.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_033_recall_procedure", "cra_033_user_tracking"],
    },
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
  },

  {
    id: "cra-034",
    articleRef: "CRA Art. 13(6)",
    category: "post_market_obligations",
    title: "Post-Market Monitoring System",
    description:
      "Manufacturers shall establish and operate a post-market monitoring system proportionate to the cybersecurity risk, to collect and review data on the cybersecurity performance of the product throughout its lifetime.",
    complianceQuestion:
      "Is a post-market monitoring system in place for the product's cybersecurity performance?",
    spaceSpecificGuidance:
      "Leverage existing satellite operations telemetry to monitor cybersecurity-relevant events post-deployment: anomalous commanding patterns, authentication failures, unexpected mode transitions, and communication link anomalies. Ground segment monitoring should include SIEM-based security event tracking across all deployed instances. For user-segment products, implement anonymous telemetry collection (with user consent) to detect widespread exploitation patterns. Correlate post-market security findings with the product risk assessment and update threat models accordingly. Feed findings into the vulnerability handling process for continuous improvement.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_034_monitoring_system",
        label: "Is a post-market monitoring system in place?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Systematic collection and review of cybersecurity performance data.",
      },
      {
        id: "cra_034_feedback_loop",
        label:
          "Are monitoring findings fed back into the vulnerability handling process?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Continuous improvement cycle connecting post-market findings to risk assessment.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_034_monitoring_system", "cra_034_feedback_loop"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // software_update (cra-035 to cra-037) — Annex I Part II §1
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-035",
    articleRef: "CRA Annex I, Part II, §1(a)",
    category: "software_update",
    title: "Automatic Update Capability",
    description:
      "Products with digital elements shall support automatic security updates where technically feasible, with the possibility for the user to opt out. Automatic updates shall be enabled by default unless there are legitimate operational reasons not to.",
    complianceQuestion:
      "Does the product support automatic security updates (with user opt-out capability)?",
    spaceSpecificGuidance:
      "Fully automatic updates are generally inappropriate for flight software due to safety-of-flight concerns — any software change to a spacecraft must be validated, scheduled during a contact window, and verified post-upload. The CRA's 'technically feasible' exception applies: document why automatic updates are not enabled by default for flight software and what alternative mechanism is used (operator-initiated upload with manufacturer notification). Ground segment software should support automatic updates with operator opt-out for mission-critical systems where unplanned restarts could interrupt operations. User-segment devices (GNSS receivers, satellite communication terminals) should implement automatic updates by default.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(e)",
    crossRefIds: ["xref-055"],
    assessmentFields: [
      {
        id: "cra_035_auto_update",
        label: "Does the product support automatic security updates?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Or documented justification why automatic updates are not technically feasible.",
      },
      {
        id: "cra_035_opt_out",
        label: "Can users opt out of automatic updates?",
        type: "boolean" as const,
        required: true,
        helpText:
          "User-controllable update preferences, with clear risk communication for opt-out.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_035_auto_update", "cra_035_opt_out"],
    },
    severity: "major",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-036",
    articleRef: "CRA Annex I, Part II, §1(b)",
    category: "software_update",
    title: "Update Integrity Verification",
    description:
      "Products with digital elements shall verify the authenticity and integrity of software updates before installation, using cryptographic signatures or equivalent mechanisms.",
    complianceQuestion:
      "Does the product verify the integrity and authenticity of updates before installation?",
    spaceSpecificGuidance:
      "Flight software updates must be cryptographically signed with the manufacturer's release signing key (RSA-2048 minimum or Ed25519) and verified by the spacecraft's secure boot or application loader before activation. Implement a staged verification process: checksum verification during upload (CFDP file delivery), cryptographic signature verification before writing to execution partition, and post-activation integrity check. Ground segment update mechanisms must verify GPG/code-signing signatures. For user-segment devices, firmware images must be signed and verified against a manufacturer root-of-trust embedded in the device during manufacturing.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_036_signature_verification",
        label: "Are updates cryptographically signed and verified?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Digital signatures verified before installation, with trusted root key management.",
      },
      {
        id: "cra_036_integrity_check",
        label: "Is update integrity verified at each stage?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Checksums during transfer, signature before write, integrity check after activation.",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "cra_036_signature_verification",
        "cra_036_integrity_check",
      ],
    },
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "cra-037",
    articleRef: "CRA Annex I, Part II, §1(c)",
    category: "software_update",
    title: "Rollback Capability",
    description:
      "Products with digital elements shall provide the capability to roll back security updates to a previous known-good version in case an update causes issues, to maintain product availability.",
    complianceQuestion:
      "Does the product support rollback to a previous version after a failed update?",
    spaceSpecificGuidance:
      "Spacecraft must implement dual-bank (A/B) firmware architecture allowing instant rollback to the previously validated software image if the new version causes anomalies. The rollback must be triggerable both autonomously (via watchdog timer detecting boot failures) and via ground command. Ground segment software must support rapid rollback through container image versioning, database migration reversals, or VM snapshots. Define maximum rollback time requirements: flight software autonomous rollback within 2 boot cycles, ground segment rollback within 15 minutes of decision. Test the rollback mechanism as part of every update validation campaign — untested rollback is no rollback.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_037_rollback_capability",
        label: "Does the product support rollback to a previous version?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Dual-bank firmware, container versioning, or equivalent rollback mechanism.",
      },
      {
        id: "cra_037_rollback_tested",
        label: "Is the rollback mechanism regularly tested?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Rollback tested as part of update validation, not just assumed to work.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_037_rollback_capability", "cra_037_rollback_tested"],
    },
    severity: "major",
    implementationTimeWeeks: 5,
    canBeSimplified: true,
  },

  // ═══════════════════════════════════════════════════════════════════════
  // sbom (cra-038 to cra-040) — Annex I Part II §2
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "cra-038",
    articleRef: "CRA Annex I, Part II, §2(a)",
    category: "sbom",
    title: "SBOM Generation and Delivery",
    description:
      "Manufacturers shall generate a software bill of materials (SBOM) in a commonly used, machine-readable format, covering at minimum the top-level dependencies of the product, and make it available to users and authorities upon request.",
    complianceQuestion:
      "Is an SBOM generated in a standard format and available to users and authorities?",
    spaceSpecificGuidance:
      "Generate SBOMs in CycloneDX or SPDX format for all software components: flight software (including RTOS, BSP, CCSDS stacks, payload processing libraries), ground segment applications (web frameworks, databases, SCADA components), and user-segment firmware. For flight software built on heritage code, trace lineage to identify all embedded third-party components even if they were integrated decades ago. Include hardware-adjacent firmware (FPGA bitstreams, DSP code) where they contain programmable digital elements. Deliver SBOMs to satellite operators as part of the product delivery package and maintain them in the technical file for authority inspection.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    nis2Ref: "Art. 21(2)(d)",
    crossRefIds: ["xref-050"],
    assessmentFields: [
      {
        id: "cra_038_sbom_generated",
        label: "Is an SBOM generated in CycloneDX or SPDX format?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Machine-readable format covering at minimum top-level dependencies.",
      },
      {
        id: "cra_038_sbom_available",
        label: "Is the SBOM available to users and authorities upon request?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Delivered with product, included in technical file, and available on request.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_038_sbom_generated", "cra_038_sbom_available"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },

  {
    id: "cra-039",
    articleRef: "CRA Annex I, Part II, §2(b)",
    category: "sbom",
    title: "Open-Source Component License Compliance",
    description:
      "Manufacturers shall ensure compliance with the license terms of all open-source software components included in the product and maintain documentation of license obligations.",
    complianceQuestion:
      "Are open-source component licenses tracked and their obligations fulfilled?",
    spaceSpecificGuidance:
      "Space software often incorporates open-source components — RTEMS (GPL with linking exception), Linux-based ground systems (GPL), Python scientific libraries (various), and CCSDS reference implementations. Track license obligations using automated tools (e.g., FOSSology, SCANOSS) integrated into the build pipeline. Pay special attention to copyleft licenses (GPL, LGPL) in flight software: static linking to GPL code creates obligations that may conflict with proprietary flight software distribution. SBOM license fields must accurately reflect SPDX license identifiers. Maintain a license compliance matrix and legal review process for newly introduced components.",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_039_license_tracking",
        label: "Are open-source component licenses tracked?",
        type: "boolean" as const,
        required: true,
        helpText: "Automated license scanning integrated into build pipeline.",
      },
      {
        id: "cra_039_obligations_met",
        label: "Are license obligations being fulfilled?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Attribution notices, source availability, and copyleft compliance as required.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_039_license_tracking", "cra_039_obligations_met"],
    },
    severity: "minor",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
  },

  {
    id: "cra-040",
    articleRef: "CRA Annex I, Part II, §2(c)",
    category: "sbom",
    title: "Dependency Vulnerability Monitoring",
    description:
      "Manufacturers shall continuously monitor all components listed in the SBOM for newly disclosed vulnerabilities and take appropriate action when vulnerabilities are identified in dependencies.",
    complianceQuestion:
      "Are SBOM components continuously monitored for newly disclosed vulnerabilities?",
    spaceSpecificGuidance:
      "Integrate SBOM-based vulnerability monitoring into the development and operations lifecycle: automated CVE scanning against NVD, GitHub Advisory Database, and vendor-specific feeds for all SBOM entries. For flight software, prioritize monitoring of RTOS vendor advisories, CCSDS implementation vulnerabilities, and processor-specific errata that could create security-relevant defects. Ground segment monitoring should integrate with existing DevSecOps tooling (Dependabot, Snyk, Trivy). Establish triage procedures for newly disclosed vulnerabilities: assess exploitability in the space-specific deployment context (e.g., a web vulnerability in a ground segment component is critical, but the same CVE in a library used only for telemetry formatting on-board may have minimal impact).",
    applicableTo: {
      productClasses: ["default", "class_I", "class_II"],
      segments: ["space", "ground", "link", "user"],
      roles: ["manufacturer"],
    },
    assessmentFields: [
      {
        id: "cra_040_vuln_monitoring",
        label: "Are SBOM components monitored for new vulnerabilities?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Automated CVE scanning against NVD, vendor advisories, and security databases.",
      },
      {
        id: "cra_040_triage_process",
        label: "Is there a triage process for dependency vulnerabilities?",
        type: "boolean" as const,
        required: true,
        helpText:
          "Assessment of exploitability and impact in the specific deployment context.",
      },
    ],
    complianceRule: {
      requiredTrue: ["cra_040_vuln_monitoring", "cra_040_triage_process"],
    },
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
  },
];

// ─── Filter Function ───

export function getApplicableCRARequirements(
  classification: CRAProductClass,
  answers: CRAAssessmentAnswers,
): CRARequirement[] {
  return CRA_REQUIREMENTS.filter((req) => {
    // Filter by product class
    if (
      req.applicableTo.productClasses &&
      req.applicableTo.productClasses.length > 0 &&
      !req.applicableTo.productClasses.includes(classification)
    ) {
      return false;
    }

    // Filter by segment
    if (
      req.applicableTo.segments &&
      req.applicableTo.segments.length > 0 &&
      !req.applicableTo.segments.some((s) => answers.segments.includes(s))
    ) {
      return false;
    }

    // Filter by role
    if (
      req.applicableTo.roles &&
      req.applicableTo.roles.length > 0 &&
      !req.applicableTo.roles.includes(answers.economicOperatorRole)
    ) {
      return false;
    }

    return true;
  });
}
