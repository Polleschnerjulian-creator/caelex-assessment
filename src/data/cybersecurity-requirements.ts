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

// Cybersecurity Requirements Data for EU Space Act Compliance (Art. 74-95)

export type SecurityMaturityLevel =
  | "initial"
  | "developing"
  | "defined"
  | "managed"
  | "optimizing";

export type OrganizationSize = "micro" | "small" | "medium" | "large";
// micro: <10 employees, <€2M revenue
// small: <50 employees, <€10M revenue
// medium: <250 employees, <€50M revenue
// large: ≥250 employees or ≥€50M revenue

export type SpaceSegmentComplexity =
  | "single_satellite"
  | "small_constellation"
  | "large_constellation"
  | "ground_only";

export type DataSensitivityLevel =
  | "public"
  | "internal"
  | "confidential"
  | "restricted";

export type RequirementCategory =
  | "governance" // Art. 74-76
  | "risk_assessment" // Art. 77-78
  | "infosec" // Art. 79-80
  | "cryptography" // Art. 81-82
  | "detection_monitoring" // Art. 83-84
  | "business_continuity" // Art. 85
  | "incident_reporting" // Art. 89-92
  | "eusrn"; // Art. 93-95

export type RequirementStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

export interface CybersecurityProfile {
  // Organization
  organizationSize: OrganizationSize;
  employeeCount?: number;
  annualRevenue?: number; // in EUR

  // Space Operations
  spaceSegmentComplexity: SpaceSegmentComplexity;
  satelliteCount?: number;
  hasGroundSegment: boolean;
  groundStationCount?: number;

  // Data & Sensitivity
  dataSensitivityLevel: DataSensitivityLevel;
  processesPersonalData: boolean;
  handlesGovData: boolean;

  // Existing Security
  existingCertifications: string[]; // 'iso27001', 'soc2', 'tisax', etc.
  hasSecurityTeam: boolean;
  securityTeamSize?: number;
  hasIncidentResponsePlan: boolean;
  hasBCP: boolean;

  // Supply Chain
  criticalSupplierCount?: number;
  supplierSecurityAssessed: boolean;
}

export interface CybersecurityRequirement {
  id: string;
  articleRef: string;
  category: RequirementCategory;
  title: string;
  description: string;
  complianceQuestion: string;
  applicableTo: {
    organizationSizes?: OrganizationSize[];
    spaceSegmentComplexities?: SpaceSegmentComplexity[];
    dataSensitivities?: DataSensitivityLevel[];
    simplifiedRegimeExcluded?: boolean; // true = not applicable if eligible for simplified regime
  };
  simplifiedAlternative?: string; // Alternative requirement text for simplified regime
  tips: string[];
  evidenceRequired: string[];
  nis2Reference?: string;
  isoReference?: string;
  severity: "critical" | "major" | "minor";
  implementationTimeWeeks?: number;
}

// ─── Requirements Data ───

export const cybersecurityRequirements: CybersecurityRequirement[] = [
  // ═══ GOVERNANCE (Art. 74-76) ═══
  {
    id: "sec_policy",
    articleRef: "Art. 74",
    category: "governance",
    title: "Information Security Policy",
    description:
      "Documented information security policy approved by management, communicated to all personnel, and reviewed regularly.",
    complianceQuestion:
      "Do you have a documented and management-approved information security policy?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    simplifiedAlternative:
      "Basic security policy document covering essential controls.",
    tips: [
      "Policy must be approved at board/executive level",
      "Annual review cycle recommended",
      "Include space-specific security considerations",
      "Align with ISO 27001 Annex A.5",
    ],
    evidenceRequired: [
      "Signed security policy document",
      "Management approval records",
      "Communication/training records",
      "Review and update history",
    ],
    nis2Reference: "NIS2 Art. 21(2)(a)",
    isoReference: "ISO 27001:2022 A.5.1",
    severity: "critical",
    implementationTimeWeeks: 4,
  },
  {
    id: "risk_mgmt_framework",
    articleRef: "Art. 76",
    category: "governance",
    title: "Cybersecurity Risk Management Framework",
    description:
      "Established framework for identifying, assessing, treating, and monitoring cybersecurity risks.",
    complianceQuestion:
      "Have you implemented a cybersecurity risk management framework?",
    applicableTo: {
      organizationSizes: ["small", "medium", "large"],
      simplifiedRegimeExcluded: true,
    },
    tips: [
      "Consider NIST CSF or ISO 27005 as baseline",
      "Include space-specific threat scenarios",
      "Document risk appetite and tolerance levels",
      "Integrate with enterprise risk management",
    ],
    evidenceRequired: [
      "Risk management policy/procedure",
      "Risk register",
      "Risk assessment methodology",
      "Risk treatment plans",
    ],
    nis2Reference: "NIS2 Art. 21(2)(a)",
    isoReference: "ISO 27005:2022",
    severity: "critical",
    implementationTimeWeeks: 8,
  },
  {
    id: "security_roles",
    articleRef: "Art. 75",
    category: "governance",
    title: "Security Roles and Responsibilities",
    description:
      "Clearly defined and assigned security roles and responsibilities across the organization.",
    complianceQuestion:
      "Are cybersecurity roles and responsibilities clearly defined and assigned?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Designate a security responsible person (even if part-time for small orgs)",
      "Document RACI matrix for security functions",
      "Include third-party/supplier responsibilities",
      "Consider virtual CISO for smaller operators",
    ],
    evidenceRequired: [
      "Organization chart with security roles",
      "Role descriptions/job profiles",
      "RACI matrix for security",
    ],
    nis2Reference: "NIS2 Art. 20(1)",
    severity: "major",
    implementationTimeWeeks: 2,
  },

  // ═══ RISK ASSESSMENT (Art. 77-78) ═══
  {
    id: "risk_assessment_regular",
    articleRef: "Art. 77",
    category: "risk_assessment",
    title: "Regular Risk Assessments",
    description:
      "Periodic cybersecurity risk assessments covering space segment, ground segment, and data processing.",
    complianceQuestion:
      "Do you conduct regular (at least annual) cybersecurity risk assessments?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    simplifiedAlternative:
      "Simplified risk assessment using standardized questionnaire approach.",
    tips: [
      "Annual full assessment + event-triggered updates",
      "Include supply chain risks",
      "Consider space-specific threats: jamming, spoofing, ASAT",
      "Document asset inventory first",
    ],
    evidenceRequired: [
      "Risk assessment reports",
      "Asset inventory",
      "Threat and vulnerability analysis",
      "Assessment schedule/calendar",
    ],
    nis2Reference: "NIS2 Art. 21(2)(a)",
    isoReference: "ISO 27001:2022 6.1.2",
    severity: "critical",
    implementationTimeWeeks: 6,
  },
  {
    id: "threat_intelligence",
    articleRef: "Art. 78",
    category: "risk_assessment",
    title: "Threat Intelligence Integration",
    description:
      "Active monitoring and integration of relevant cybersecurity threat intelligence.",
    complianceQuestion:
      "Do you monitor and integrate space-relevant cybersecurity threat intelligence?",
    applicableTo: {
      organizationSizes: ["medium", "large"],
      spaceSegmentComplexities: ["small_constellation", "large_constellation"],
      simplifiedRegimeExcluded: true,
    },
    tips: [
      "Subscribe to ENISA threat intelligence feeds",
      "Monitor ESA cybersecurity advisories",
      "Join relevant ISACs (Information Sharing and Analysis Centers)",
      "Consider commercial threat intel services",
    ],
    evidenceRequired: [
      "Threat intelligence sources list",
      "Intelligence integration procedures",
      "Threat briefing records",
    ],
    nis2Reference: "NIS2 Art. 21(2)(e)",
    severity: "major",
    implementationTimeWeeks: 4,
  },
  {
    id: "supply_chain_risk",
    articleRef: "Art. 78",
    category: "risk_assessment",
    title: "Supply Chain Risk Assessment",
    description:
      "Assessment of cybersecurity risks in the supply chain including critical suppliers and service providers.",
    complianceQuestion:
      "Do you assess cybersecurity risks of your critical suppliers?",
    applicableTo: {
      organizationSizes: ["small", "medium", "large"],
    },
    tips: [
      "Identify critical suppliers and dependencies",
      "Include hardware, software, and service providers",
      "Assess supplier security certifications",
      "Consider geopolitical risks",
    ],
    evidenceRequired: [
      "Critical supplier inventory",
      "Supplier security assessments",
      "Contractual security requirements",
    ],
    nis2Reference: "NIS2 Art. 21(2)(d)",
    isoReference: "ISO 27001:2022 A.5.19-A.5.23",
    severity: "major",
    implementationTimeWeeks: 6,
  },

  // ═══ INFORMATION SECURITY (Art. 79-80) ═══
  {
    id: "access_control",
    articleRef: "Art. 79",
    category: "infosec",
    title: "Access Control Policy",
    description:
      "Comprehensive access control policy implementing least privilege and need-to-know principles.",
    complianceQuestion:
      "Have you implemented role-based access control with least privilege principles?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Implement RBAC or ABAC model",
      "Separate ground station access from corporate",
      "Regular access reviews (quarterly minimum)",
      "Privileged access management for critical systems",
    ],
    evidenceRequired: [
      "Access control policy",
      "User access matrix",
      "Access review records",
      "Privileged account inventory",
    ],
    nis2Reference: "NIS2 Art. 21(2)(i)",
    isoReference: "ISO 27001:2022 A.5.15-A.5.18",
    severity: "critical",
    implementationTimeWeeks: 6,
  },
  {
    id: "mfa",
    articleRef: "Art. 79",
    category: "infosec",
    title: "Multi-Factor Authentication",
    description:
      "MFA required for all remote access and critical system access.",
    complianceQuestion:
      "Is multi-factor authentication enforced for remote and critical system access?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Hardware tokens for mission-critical systems",
      "Phishing-resistant MFA preferred (FIDO2)",
      "Include ground station command interfaces",
      "Document exceptions with compensating controls",
    ],
    evidenceRequired: [
      "MFA policy",
      "System configuration evidence",
      "Coverage report",
    ],
    nis2Reference: "NIS2 Art. 21(2)(j)",
    severity: "critical",
    implementationTimeWeeks: 4,
  },
  {
    id: "data_protection",
    articleRef: "Art. 80",
    category: "infosec",
    title: "Data Protection Measures",
    description:
      "Technical and organizational measures for data protection including classification and handling.",
    complianceQuestion:
      "Have you implemented data classification and protection measures?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
      dataSensitivities: ["internal", "confidential", "restricted"],
    },
    tips: [
      "Classify telemetry, command, and mission data",
      "Consider export control implications (ITAR/EAR)",
      "Implement DLP for sensitive data",
      "Secure data at rest and in transit",
    ],
    evidenceRequired: [
      "Data classification scheme",
      "Data handling procedures",
      "DLP implementation evidence",
    ],
    isoReference: "ISO 27001:2022 A.5.12-A.5.14",
    severity: "major",
    implementationTimeWeeks: 6,
  },
  {
    id: "network_security",
    articleRef: "Art. 79",
    category: "infosec",
    title: "Network Security",
    description:
      "Network segmentation and security controls for space operations infrastructure.",
    complianceQuestion:
      "Have you implemented network segmentation for mission-critical systems?",
    applicableTo: {
      organizationSizes: ["small", "medium", "large"],
      spaceSegmentComplexities: [
        "single_satellite",
        "small_constellation",
        "large_constellation",
      ],
    },
    tips: [
      "Isolate mission control networks from corporate",
      "Implement firewall rules and IDS/IPS",
      "Secure remote access via VPN or zero trust",
      "Regular network penetration testing",
    ],
    evidenceRequired: [
      "Network architecture diagrams",
      "Firewall rule sets",
      "Penetration test reports",
    ],
    isoReference: "ISO 27001:2022 A.8.20-A.8.22",
    severity: "major",
    implementationTimeWeeks: 8,
  },

  // ═══ CRYPTOGRAPHY (Art. 81-82) ═══
  {
    id: "crypto_policy",
    articleRef: "Art. 81",
    category: "cryptography",
    title: "Cryptographic Policy",
    description:
      "Policy defining approved cryptographic algorithms, key lengths, and use cases.",
    complianceQuestion:
      "Do you have a cryptographic policy defining approved algorithms and key management?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Follow ENISA recommendations for algorithm selection",
      "Plan for post-quantum cryptography transition",
      "Consider space link encryption (CCSDS standards)",
      "Document key lifecycle management",
    ],
    evidenceRequired: [
      "Cryptographic policy document",
      "Approved algorithm list",
      "Key management procedures",
    ],
    isoReference: "ISO 27001:2022 A.8.24",
    severity: "major",
    implementationTimeWeeks: 4,
  },
  {
    id: "space_link_encryption",
    articleRef: "Art. 82",
    category: "cryptography",
    title: "Space Link Encryption",
    description:
      "Encryption of space-to-ground communications for command, telemetry, and payload data.",
    complianceQuestion:
      "Are your space-to-ground communication links encrypted?",
    applicableTo: {
      spaceSegmentComplexities: [
        "single_satellite",
        "small_constellation",
        "large_constellation",
      ],
    },
    tips: [
      "CCSDS Space Link Security (SDLS) recommended",
      "AES-256 minimum for command encryption",
      "Consider authentication separate from encryption",
      "Hardware security modules for ground keys",
    ],
    evidenceRequired: [
      "Link encryption architecture",
      "Cryptographic implementation certificates",
      "Key management documentation",
    ],
    severity: "critical",
    implementationTimeWeeks: 12,
  },
  {
    id: "key_management",
    articleRef: "Art. 81",
    category: "cryptography",
    title: "Key Management",
    description:
      "Secure key generation, distribution, storage, rotation, and destruction procedures.",
    complianceQuestion: "Do you have documented key management procedures?",
    applicableTo: {
      organizationSizes: ["small", "medium", "large"],
    },
    tips: [
      "Use HSMs for key storage",
      "Define key rotation schedules",
      "Secure key distribution procedures",
      "Document key recovery processes",
    ],
    evidenceRequired: [
      "Key management procedures",
      "HSM documentation",
      "Key inventory and lifecycle records",
    ],
    isoReference: "ISO 27001:2022 A.8.24",
    severity: "major",
    implementationTimeWeeks: 6,
  },

  // ═══ DETECTION & MONITORING (Art. 83-84) ═══
  {
    id: "security_monitoring",
    articleRef: "Art. 83",
    category: "detection_monitoring",
    title: "Security Monitoring",
    description:
      "Continuous security monitoring of networks, systems, and space operations.",
    complianceQuestion:
      "Do you have continuous security monitoring covering all critical systems?",
    applicableTo: {
      organizationSizes: ["small", "medium", "large"],
      simplifiedRegimeExcluded: true,
    },
    simplifiedAlternative: "Basic log collection and periodic review.",
    tips: [
      "SIEM for log aggregation and correlation",
      "Include ground station and mission control",
      "Monitor for space-specific anomalies (unexpected commands)",
      "24/7 monitoring for large constellations",
    ],
    evidenceRequired: [
      "Monitoring architecture documentation",
      "SIEM/log management implementation",
      "Alert procedures",
      "Monitoring coverage report",
    ],
    nis2Reference: "NIS2 Art. 21(2)(b)",
    isoReference: "ISO 27001:2022 A.8.15-A.8.16",
    severity: "critical",
    implementationTimeWeeks: 8,
  },
  {
    id: "anomaly_detection",
    articleRef: "Art. 84",
    category: "detection_monitoring",
    title: "Anomaly Detection",
    description:
      "Automated detection of security anomalies and potential incidents.",
    complianceQuestion:
      "Have you implemented automated anomaly detection for critical systems?",
    applicableTo: {
      organizationSizes: ["medium", "large"],
      spaceSegmentComplexities: ["small_constellation", "large_constellation"],
      simplifiedRegimeExcluded: true,
    },
    tips: [
      "Baseline normal spacecraft behavior",
      "Detect unauthorized command patterns",
      "Monitor for RF interference/jamming",
      "Consider ML-based anomaly detection",
    ],
    evidenceRequired: [
      "Anomaly detection system documentation",
      "Detection rules/baselines",
      "Alert and escalation procedures",
    ],
    severity: "major",
    implementationTimeWeeks: 12,
  },
  {
    id: "log_management",
    articleRef: "Art. 83",
    category: "detection_monitoring",
    title: "Log Management",
    description: "Centralized logging with retention and integrity protection.",
    complianceQuestion:
      "Do you have centralized log management with appropriate retention?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Minimum 12-month retention for security logs",
      "Protect log integrity (immutable storage)",
      "Include all critical system logs",
      "Synchronize timestamps (NTP)",
    ],
    evidenceRequired: [
      "Log management policy",
      "Log sources inventory",
      "Retention configuration evidence",
    ],
    isoReference: "ISO 27001:2022 A.8.15",
    severity: "major",
    implementationTimeWeeks: 4,
  },

  // ═══ BUSINESS CONTINUITY (Art. 85) ═══
  {
    id: "bcp",
    articleRef: "Art. 85",
    category: "business_continuity",
    title: "Business Continuity Plan",
    description:
      "Documented BCP covering critical space operations and supporting infrastructure.",
    complianceQuestion:
      "Do you have a tested business continuity plan for space operations?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    simplifiedAlternative:
      "Basic continuity procedures for critical functions.",
    tips: [
      "Include loss of ground station scenarios",
      "Plan for satellite anomalies/failures",
      "Document alternative communication paths",
      "Test annually at minimum",
    ],
    evidenceRequired: [
      "BCP document",
      "Business impact analysis",
      "Recovery procedures",
      "Test records",
    ],
    nis2Reference: "NIS2 Art. 21(2)(c)",
    isoReference: "ISO 22301",
    severity: "critical",
    implementationTimeWeeks: 8,
  },
  {
    id: "backup_recovery",
    articleRef: "Art. 85",
    category: "business_continuity",
    title: "Backup and Recovery",
    description:
      "Regular backups and tested recovery procedures for critical systems and data.",
    complianceQuestion:
      "Do you have documented and tested backup/recovery procedures?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Include spacecraft configuration/parameters",
      "Offsite backup storage",
      "3-2-1 backup rule",
      "Regular recovery testing",
    ],
    evidenceRequired: [
      "Backup policy",
      "Backup schedules and logs",
      "Recovery test records",
    ],
    isoReference: "ISO 27001:2022 A.8.13",
    severity: "major",
    implementationTimeWeeks: 4,
  },

  // ═══ INCIDENT REPORTING (Art. 89-92) ═══
  {
    id: "incident_response_plan",
    articleRef: "Art. 89",
    category: "incident_reporting",
    title: "Incident Response Plan",
    description:
      "Documented incident response plan with defined roles, procedures, and communication channels.",
    complianceQuestion: "Do you have a documented incident response plan?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Include space-specific incident types",
      "Define severity classification",
      "Document escalation paths to NCA",
      "Include legal/PR communication templates",
    ],
    evidenceRequired: [
      "Incident response plan",
      "Incident classification matrix",
      "Contact/escalation lists",
      "Communication templates",
    ],
    nis2Reference: "NIS2 Art. 21(2)(b)",
    isoReference: "ISO 27001:2022 A.5.24-A.5.28",
    severity: "critical",
    implementationTimeWeeks: 4,
  },
  {
    id: "early_warning",
    articleRef: "Art. 90",
    category: "incident_reporting",
    title: "24-Hour Early Warning",
    description:
      "Capability to submit early warning to NCA within 24 hours of significant incident detection.",
    complianceQuestion:
      "Can you submit incident early warnings to your NCA within 24 hours?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Pre-register with NCA incident reporting portal",
      "Designate 24/7 incident contacts",
      "Prepare early warning templates",
      'Define "significant incident" thresholds',
    ],
    evidenceRequired: [
      "NCA registration confirmation",
      "Early warning procedure",
      "24/7 contact arrangements",
      "Incident detection thresholds",
    ],
    nis2Reference: "NIS2 Art. 23(4)(a)",
    severity: "critical",
    implementationTimeWeeks: 2,
  },
  {
    id: "detailed_notification",
    articleRef: "Art. 91",
    category: "incident_reporting",
    title: "72-Hour Detailed Notification",
    description:
      "Capability to submit detailed incident notification within 72 hours with impact assessment.",
    complianceQuestion:
      "Can you provide detailed incident notifications within 72 hours?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Include impact assessment template",
      "Document affected services/data",
      "Describe containment measures",
      "Prepare cross-border notification if applicable",
    ],
    evidenceRequired: [
      "Detailed notification procedure",
      "Incident report templates",
      "Impact assessment methodology",
    ],
    nis2Reference: "NIS2 Art. 23(4)(b)",
    severity: "critical",
    implementationTimeWeeks: 2,
  },
  {
    id: "final_report",
    articleRef: "Art. 92",
    category: "incident_reporting",
    title: "Final Incident Report",
    description:
      "Capability to provide comprehensive final incident report within one month.",
    complianceQuestion:
      "Can you provide final incident reports with root cause analysis within one month?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Include root cause analysis",
      "Document lessons learned",
      "Describe remediation measures",
      "Track improvement actions",
    ],
    evidenceRequired: [
      "Final report template",
      "Root cause analysis methodology",
      "Remediation tracking",
    ],
    nis2Reference: "NIS2 Art. 23(4)(d)",
    severity: "major",
    implementationTimeWeeks: 2,
  },

  // ═══ EUSRN (Art. 93-95) ═══
  {
    id: "eusrn_registration",
    articleRef: "Art. 93",
    category: "eusrn",
    title: "EUSRN Registration",
    description:
      "Registration with the European Union Space Resilience Network.",
    complianceQuestion: "Have you registered with the EUSRN?",
    applicableTo: {
      organizationSizes: ["micro", "small", "medium", "large"],
    },
    tips: [
      "Registration via NCA or directly with ENISA",
      "Provide required operational contacts",
      "Maintain updated registration information",
      "Designate EUSRN liaison",
    ],
    evidenceRequired: [
      "EUSRN registration confirmation",
      "Designated contacts list",
    ],
    severity: "major",
    implementationTimeWeeks: 1,
  },
  {
    id: "eusrn_participation",
    articleRef: "Art. 94-95",
    category: "eusrn",
    title: "EUSRN Coordination",
    description:
      "Active participation in EUSRN coordination activities, exercises, and information sharing.",
    complianceQuestion: "Do you participate in EUSRN activities and exercises?",
    applicableTo: {
      organizationSizes: ["small", "medium", "large"],
      simplifiedRegimeExcluded: true,
    },
    tips: [
      "Participate in annual cyber exercises",
      "Share threat intelligence (anonymized if needed)",
      "Attend EUSRN coordination meetings",
      "Implement EUSRN recommendations",
    ],
    evidenceRequired: [
      "Exercise participation records",
      "Information sharing evidence",
      "Meeting attendance records",
    ],
    severity: "minor",
    implementationTimeWeeks: 0, // Ongoing
  },
];

// ─── Helper Functions ───

/**
 * Determine if operator qualifies for simplified regime (Art. 86-88)
 */
export function isEligibleForSimplifiedRegime(
  profile: CybersecurityProfile,
): boolean {
  // Criteria for simplified regime:
  // - Micro or small organization
  // - Single satellite or ground-only
  // - No government data
  // - No personal data processing at scale

  if (
    profile.organizationSize !== "micro" &&
    profile.organizationSize !== "small"
  ) {
    return false;
  }

  if (profile.spaceSegmentComplexity === "large_constellation") {
    return false;
  }

  if (profile.handlesGovData) {
    return false;
  }

  if (profile.processesPersonalData && (profile.satelliteCount || 0) > 1) {
    return false;
  }

  return true;
}

/**
 * Get applicable requirements based on profile
 */
export function getApplicableRequirements(
  profile: CybersecurityProfile,
): CybersecurityRequirement[] {
  const isSimplified = isEligibleForSimplifiedRegime(profile);

  return cybersecurityRequirements.filter((req) => {
    // Check organization size
    if (
      req.applicableTo.organizationSizes &&
      !req.applicableTo.organizationSizes.includes(profile.organizationSize)
    ) {
      return false;
    }

    // Check space segment complexity
    if (
      req.applicableTo.spaceSegmentComplexities &&
      !req.applicableTo.spaceSegmentComplexities.includes(
        profile.spaceSegmentComplexity,
      )
    ) {
      return false;
    }

    // Check data sensitivity
    if (
      req.applicableTo.dataSensitivities &&
      !req.applicableTo.dataSensitivities.includes(profile.dataSensitivityLevel)
    ) {
      return false;
    }

    // Check simplified regime exclusion
    if (isSimplified && req.applicableTo.simplifiedRegimeExcluded) {
      return false;
    }

    return true;
  });
}

/**
 * Calculate maturity score based on requirement statuses
 */
export function calculateMaturityScore(
  requirements: CybersecurityRequirement[],
  statuses: Record<string, RequirementStatus>,
): number {
  const weights = { critical: 3, major: 2, minor: 1 };
  let totalWeight = 0;
  let achievedWeight = 0;

  for (const req of requirements) {
    const weight = weights[req.severity];
    totalWeight += weight;

    const status = statuses[req.id] || "not_assessed";
    if (status === "compliant") {
      achievedWeight += weight;
    } else if (status === "partial") {
      achievedWeight += weight * 0.5;
    }
    // non_compliant, not_assessed, not_applicable = 0
  }

  return totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;
}

/**
 * Get maturity level from score
 */
export function getMaturityLevel(score: number): SecurityMaturityLevel {
  if (score <= 20) return "initial";
  if (score <= 40) return "developing";
  if (score <= 60) return "defined";
  if (score <= 80) return "managed";
  return "optimizing";
}

/**
 * Get total implementation time estimate in weeks
 */
export function getImplementationTimeEstimate(
  requirements: CybersecurityRequirement[],
  statuses: Record<string, RequirementStatus>,
): number {
  let totalWeeks = 0;

  for (const req of requirements) {
    const status = statuses[req.id] || "not_assessed";
    if (status === "non_compliant" || status === "not_assessed") {
      totalWeeks += req.implementationTimeWeeks || 0;
    } else if (status === "partial") {
      totalWeeks += Math.ceil((req.implementationTimeWeeks || 0) / 2);
    }
  }

  return totalWeeks;
}

// ─── Configuration Objects ───

export const categoryConfig: Record<
  RequirementCategory,
  { label: string; icon: string; color: string }
> = {
  governance: { label: "Governance & Policy", icon: "Shield", color: "purple" },
  risk_assessment: { label: "Risk Assessment", icon: "Search", color: "blue" },
  infosec: { label: "Information Security", icon: "Lock", color: "green" },
  cryptography: { label: "Cryptography", icon: "Key", color: "yellow" },
  detection_monitoring: {
    label: "Detection & Monitoring",
    icon: "Eye",
    color: "orange",
  },
  business_continuity: {
    label: "Business Continuity",
    icon: "LifeBuoy",
    color: "red",
  },
  incident_reporting: {
    label: "Incident Reporting",
    icon: "AlertTriangle",
    color: "rose",
  },
  eusrn: { label: "EUSRN", icon: "Network", color: "cyan" },
};

export const statusConfig: Record<
  RequirementStatus,
  { label: string; color: string; icon: string }
> = {
  compliant: { label: "Compliant", color: "green", icon: "CheckCircle2" },
  partial: { label: "Partial", color: "yellow", icon: "AlertCircle" },
  non_compliant: { label: "Non-Compliant", color: "red", icon: "XCircle" },
  not_assessed: { label: "Not Assessed", color: "gray", icon: "Circle" },
  not_applicable: { label: "N/A", color: "slate", icon: "Minus" },
};

export const maturityLevelConfig: Record<
  SecurityMaturityLevel,
  { label: string; color: string; description: string }
> = {
  initial: {
    label: "Initial (0-20%)",
    color: "red",
    description: "Ad-hoc security practices",
  },
  developing: {
    label: "Developing (21-40%)",
    color: "orange",
    description: "Some processes defined",
  },
  defined: {
    label: "Defined (41-60%)",
    color: "yellow",
    description: "Documented procedures",
  },
  managed: {
    label: "Managed (61-80%)",
    color: "blue",
    description: "Measured and controlled",
  },
  optimizing: {
    label: "Optimizing (81-100%)",
    color: "green",
    description: "Continuous improvement",
  },
};

export const organizationSizeConfig: Record<
  OrganizationSize,
  { label: string; description: string }
> = {
  micro: {
    label: "Micro Enterprise",
    description: "<10 employees, <€2M revenue",
  },
  small: {
    label: "Small Enterprise",
    description: "<50 employees, <€10M revenue",
  },
  medium: {
    label: "Medium Enterprise",
    description: "<250 employees, <€50M revenue",
  },
  large: {
    label: "Large Enterprise",
    description: "≥250 employees or ≥€50M revenue",
  },
};

export const spaceSegmentConfig: Record<
  SpaceSegmentComplexity,
  { label: string; description: string }
> = {
  single_satellite: {
    label: "Single Satellite",
    description: "One operational spacecraft",
  },
  small_constellation: {
    label: "Small Constellation",
    description: "2-10 spacecraft",
  },
  large_constellation: {
    label: "Large Constellation",
    description: ">10 spacecraft",
  },
  ground_only: {
    label: "Ground Segment Only",
    description: "No space assets operated",
  },
};

export const dataSensitivityConfig: Record<
  DataSensitivityLevel,
  { label: string; description: string }
> = {
  public: { label: "Public", description: "Publicly available data" },
  internal: { label: "Internal", description: "Business internal, not public" },
  confidential: {
    label: "Confidential",
    description: "Sensitive business/customer data",
  },
  restricted: {
    label: "Restricted",
    description: "Highly sensitive, government, or regulated",
  },
};

export const certificationOptions = [
  {
    id: "iso27001",
    label: "ISO 27001",
    description: "Information Security Management",
  },
  { id: "soc2", label: "SOC 2", description: "Service Organization Control" },
  { id: "tisax", label: "TISAX", description: "Automotive Security" },
  {
    id: "nis2",
    label: "NIS2 Compliant",
    description: "EU Network Security Directive",
  },
  { id: "csa_star", label: "CSA STAR", description: "Cloud Security Alliance" },
  { id: "iso22301", label: "ISO 22301", description: "Business Continuity" },
];
