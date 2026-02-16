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

import type { AssessmentField, ComplianceRule } from "@/lib/compliance/types";

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
  assessmentFields?: AssessmentField[];
  complianceRule?: ComplianceRule;
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
    assessmentFields: [
      {
        id: "policyDocumentExists",
        label: "Information security policy document exists?",
        type: "boolean",
      },
      {
        id: "boardApproved",
        label: "Policy approved by board/executive management?",
        type: "boolean",
      },
      {
        id: "lastReviewDate",
        label: "Date of last policy review",
        type: "date",
      },
      {
        id: "reviewFrequency",
        label: "Policy review frequency",
        type: "select",
        options: [
          { value: "annual", label: "Annual" },
          { value: "biannual", label: "Biannual" },
          { value: "quarterly", label: "Quarterly" },
        ],
      },
      {
        id: "coversSpaceSpecific",
        label: "Covers space-specific security considerations?",
        type: "boolean",
      },
      {
        id: "communicatedToStaff",
        label: "Communicated to all staff?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "policyDocumentExists",
        "boardApproved",
        "communicatedToStaff",
      ],
    },
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
    assessmentFields: [
      {
        id: "frameworkDocumented",
        label: "Risk management framework documented?",
        type: "boolean",
      },
      {
        id: "frameworkType",
        label: "Framework type",
        type: "select",
        options: [
          { value: "NIST_CSF", label: "NIST CSF" },
          { value: "ISO_27005", label: "ISO 27005" },
          { value: "custom", label: "Custom" },
        ],
      },
      {
        id: "includesSpaceThreats",
        label: "Includes space-specific threats?",
        type: "boolean",
      },
      {
        id: "riskAppetiteDefined",
        label: "Risk appetite and tolerance defined?",
        type: "boolean",
      },
      {
        id: "integratedWithERM",
        label: "Integrated with enterprise risk management?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["frameworkDocumented", "includesSpaceThreats"],
      requiredNotEmpty: ["frameworkType"],
    },
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
    assessmentFields: [
      {
        id: "securityResponsibleDesignated",
        label: "Security responsible person designated?",
        type: "boolean",
      },
      {
        id: "raciMatrixDocumented",
        label: "RACI matrix for security functions documented?",
        type: "boolean",
      },
      {
        id: "thirdPartyRolesIncluded",
        label: "Third-party/supplier responsibilities included?",
        type: "boolean",
      },
      {
        id: "roleDescriptionsExist",
        label: "Role descriptions/job profiles exist?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["securityResponsibleDesignated", "raciMatrixDocumented"],
    },
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
    assessmentFields: [
      {
        id: "annualAssessmentConducted",
        label: "Annual risk assessment conducted?",
        type: "boolean",
      },
      {
        id: "assetInventoryExists",
        label: "Asset inventory exists?",
        type: "boolean",
      },
      {
        id: "includesSupplyChainRisks",
        label: "Includes supply chain risks?",
        type: "boolean",
      },
      {
        id: "spaceThreatsConsidered",
        label: "Space-specific threats considered (jamming, spoofing, ASAT)?",
        type: "boolean",
      },
      {
        id: "assessmentMethodology",
        label: "Assessment methodology",
        type: "select",
        options: [
          { value: "ISO_27005", label: "ISO 27005" },
          { value: "NIST", label: "NIST" },
          { value: "OCTAVE", label: "OCTAVE" },
          { value: "custom", label: "Custom" },
        ],
      },
    ],
    complianceRule: {
      requiredTrue: ["annualAssessmentConducted", "assetInventoryExists"],
      requiredNotEmpty: ["assessmentMethodology"],
    },
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
    assessmentFields: [
      {
        id: "threatIntelSubscribed",
        label: "Subscribed to threat intelligence feeds?",
        type: "boolean",
      },
      {
        id: "threatFeedSources",
        label: "Primary threat feed source",
        type: "select",
        options: [
          { value: "ENISA", label: "ENISA" },
          { value: "ESA", label: "ESA" },
          { value: "ISAC", label: "ISAC" },
          { value: "commercial", label: "Commercial" },
        ],
      },
      {
        id: "regularBriefings",
        label: "Regular threat briefings conducted?",
        type: "boolean",
      },
      {
        id: "integrationWithRisk",
        label: "Threat intelligence integrated with risk management?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["threatIntelSubscribed", "regularBriefings"],
      requiredNotEmpty: ["threatFeedSources"],
    },
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
    assessmentFields: [
      {
        id: "criticalSuppliersIdentified",
        label: "Critical suppliers identified?",
        type: "boolean",
      },
      {
        id: "securityAssessmentsPerformed",
        label: "Security assessments performed on suppliers?",
        type: "boolean",
      },
      {
        id: "contractualSecReqs",
        label: "Contractual security requirements in place?",
        type: "boolean",
      },
      {
        id: "geopoliticalRisksConsidered",
        label: "Geopolitical risks considered?",
        type: "boolean",
      },
      {
        id: "supplierAuditFrequency",
        label: "Supplier audit frequency",
        type: "select",
        options: [
          { value: "annual", label: "Annual" },
          { value: "biannual", label: "Biannual" },
          { value: "ad_hoc", label: "Ad-hoc" },
          { value: "none", label: "None" },
        ],
      },
    ],
    complianceRule: {
      requiredTrue: [
        "criticalSuppliersIdentified",
        "securityAssessmentsPerformed",
        "contractualSecReqs",
      ],
      requiredNotEmpty: ["supplierAuditFrequency"],
    },
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
    assessmentFields: [
      {
        id: "rbacImplemented",
        label: "Role-based access control implemented?",
        type: "boolean",
      },
      {
        id: "leastPrivilegeEnforced",
        label: "Least privilege principle enforced?",
        type: "boolean",
      },
      {
        id: "accessReviewFrequency",
        label: "Access review frequency",
        type: "select",
        options: [
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "biannual", label: "Biannual" },
          { value: "annual", label: "Annual" },
        ],
      },
      {
        id: "privilegedAccountInventory",
        label: "Privileged account inventory maintained?",
        type: "boolean",
      },
      {
        id: "groundStationAccessSeparate",
        label: "Ground station access separated from corporate?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "rbacImplemented",
        "leastPrivilegeEnforced",
        "privilegedAccountInventory",
      ],
      requiredNotEmpty: ["accessReviewFrequency"],
    },
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
    assessmentFields: [
      {
        id: "mfaEnforced",
        label: "MFA enforced for remote and critical access?",
        type: "boolean",
      },
      {
        id: "mfaType",
        label: "MFA type",
        type: "select",
        options: [
          { value: "FIDO2", label: "FIDO2" },
          { value: "hardware_token", label: "Hardware Token" },
          { value: "TOTP", label: "TOTP" },
          { value: "SMS", label: "SMS" },
        ],
      },
      {
        id: "coversMissionCritical",
        label: "Covers all mission-critical systems?",
        type: "boolean",
      },
      {
        id: "coveragePercent",
        label: "System coverage percentage",
        type: "number",
        unit: "%",
        helpText: "Percentage of systems covered",
      },
      {
        id: "exceptionsDocumented",
        label: "Exceptions documented with compensating controls?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["mfaEnforced", "coversMissionCritical"],
      requiredNotEmpty: ["mfaType"],
      numberThresholds: { coveragePercent: { min: 90 } },
    },
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
    assessmentFields: [
      {
        id: "classificationSchemeExists",
        label: "Data classification scheme exists?",
        type: "boolean",
      },
      {
        id: "telemetryClassified",
        label: "Telemetry, command, and mission data classified?",
        type: "boolean",
      },
      {
        id: "dlpImplemented",
        label: "Data loss prevention implemented?",
        type: "boolean",
      },
      {
        id: "dataAtRestEncrypted",
        label: "Data at rest encrypted?",
        type: "boolean",
      },
      {
        id: "exportControlConsidered",
        label: "Export control implications considered (ITAR/EAR)?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["classificationSchemeExists", "dataAtRestEncrypted"],
    },
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
    assessmentFields: [
      {
        id: "missionNetworkIsolated",
        label: "Mission control network isolated from corporate?",
        type: "boolean",
      },
      {
        id: "firewallRulesDocumented",
        label: "Firewall rules documented?",
        type: "boolean",
      },
      {
        id: "idsIpsDeployed",
        label: "IDS/IPS deployed?",
        type: "boolean",
      },
      {
        id: "penTestFrequency",
        label: "Penetration testing frequency",
        type: "select",
        options: [
          { value: "annual", label: "Annual" },
          { value: "biannual", label: "Biannual" },
          { value: "quarterly", label: "Quarterly" },
          { value: "none", label: "None" },
        ],
      },
      {
        id: "zeroTrustImplemented",
        label: "Zero trust architecture implemented?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["missionNetworkIsolated", "firewallRulesDocumented"],
      requiredNotEmpty: ["penTestFrequency"],
    },
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
    assessmentFields: [
      {
        id: "policyDocumentExists",
        label: "Cryptographic policy document exists?",
        type: "boolean",
      },
      {
        id: "approvedAlgorithmList",
        label: "Approved algorithm list maintained?",
        type: "boolean",
      },
      {
        id: "postQuantumPlanExists",
        label: "Post-quantum cryptography transition plan exists?",
        type: "boolean",
      },
      {
        id: "keyLifecycleDocumented",
        label: "Key lifecycle management documented?",
        type: "boolean",
      },
      {
        id: "ccsdsMandated",
        label: "CCSDS standards mandated for space links?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "policyDocumentExists",
        "approvedAlgorithmList",
        "keyLifecycleDocumented",
      ],
    },
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
    assessmentFields: [
      {
        id: "linksEncrypted",
        label: "Space-to-ground links encrypted?",
        type: "boolean",
      },
      {
        id: "encryptionStandard",
        label: "Encryption standard",
        type: "select",
        options: [
          { value: "CCSDS_SDLS", label: "CCSDS SDLS" },
          { value: "AES_256", label: "AES-256" },
          { value: "custom", label: "Custom" },
        ],
      },
      {
        id: "hsmForGroundKeys",
        label: "HSM used for ground segment keys?",
        type: "boolean",
      },
      {
        id: "authSeparateFromEncryption",
        label: "Authentication separate from encryption?",
        type: "boolean",
      },
      {
        id: "keyRotationSchedule",
        label: "Key rotation schedule",
        type: "select",
        options: [
          { value: "per_pass", label: "Per Pass" },
          { value: "daily", label: "Daily" },
          { value: "weekly", label: "Weekly" },
          { value: "monthly", label: "Monthly" },
        ],
      },
    ],
    complianceRule: {
      requiredTrue: ["linksEncrypted", "hsmForGroundKeys"],
      requiredNotEmpty: ["encryptionStandard"],
    },
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
    assessmentFields: [
      {
        id: "hsmUsed",
        label: "Hardware security modules (HSM) used for key storage?",
        type: "boolean",
      },
      {
        id: "keyRotationDefined",
        label: "Key rotation schedules defined?",
        type: "boolean",
      },
      {
        id: "keyDistributionSecure",
        label: "Secure key distribution procedures in place?",
        type: "boolean",
      },
      {
        id: "keyRecoveryProcesses",
        label: "Key recovery processes documented?",
        type: "boolean",
      },
      {
        id: "keyInventoryMaintained",
        label: "Key inventory maintained?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["hsmUsed", "keyRotationDefined", "keyDistributionSecure"],
    },
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
    assessmentFields: [
      {
        id: "siemDeployed",
        label: "SIEM deployed?",
        type: "boolean",
      },
      {
        id: "groundStationCoverage",
        label: "Ground station systems covered by monitoring?",
        type: "boolean",
      },
      {
        id: "missionControlCoverage",
        label: "Mission control systems covered by monitoring?",
        type: "boolean",
      },
      {
        id: "monitoringMode",
        label: "Monitoring mode",
        type: "select",
        options: [
          { value: "24x7", label: "24/7" },
          { value: "business_hours", label: "Business Hours" },
          { value: "on_call", label: "On-Call" },
        ],
      },
      {
        id: "alertProceduresDocumented",
        label: "Alert and escalation procedures documented?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["siemDeployed", "alertProceduresDocumented"],
      requiredNotEmpty: ["monitoringMode"],
    },
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
    assessmentFields: [
      {
        id: "baselineBehaviorDefined",
        label: "Baseline normal behavior defined?",
        type: "boolean",
      },
      {
        id: "commandPatternMonitoring",
        label: "Unauthorized command pattern monitoring in place?",
        type: "boolean",
      },
      {
        id: "rfInterferenceDetection",
        label: "RF interference/jamming detection capability?",
        type: "boolean",
      },
      {
        id: "mlBasedDetection",
        label: "ML-based anomaly detection implemented?",
        type: "boolean",
      },
      {
        id: "detectionRulesDocumented",
        label: "Detection rules and baselines documented?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "baselineBehaviorDefined",
        "commandPatternMonitoring",
        "detectionRulesDocumented",
      ],
    },
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
    assessmentFields: [
      {
        id: "centralizedLogging",
        label: "Centralized logging implemented?",
        type: "boolean",
      },
      {
        id: "retentionMonths",
        label: "Log retention period",
        type: "number",
        unit: "months",
        placeholder: "e.g., 12",
        helpText: "Minimum 12 months recommended",
      },
      {
        id: "logIntegrityProtected",
        label: "Log integrity protected (immutable storage)?",
        type: "boolean",
      },
      {
        id: "timestampSynchronized",
        label: "Timestamps synchronized (NTP)?",
        type: "boolean",
      },
      {
        id: "allCriticalSystemsCovered",
        label: "All critical systems covered?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "centralizedLogging",
        "logIntegrityProtected",
        "timestampSynchronized",
      ],
      numberThresholds: { retentionMonths: { min: 12 } },
    },
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
    assessmentFields: [
      {
        id: "bcpDocumentExists",
        label: "Business continuity plan document exists?",
        type: "boolean",
      },
      {
        id: "includesGroundStationLoss",
        label: "Includes loss of ground station scenarios?",
        type: "boolean",
      },
      {
        id: "includesSatelliteAnomalies",
        label: "Includes satellite anomaly/failure scenarios?",
        type: "boolean",
      },
      {
        id: "alternativeCommPaths",
        label: "Alternative communication paths documented?",
        type: "boolean",
      },
      {
        id: "testFrequency",
        label: "BCP test frequency",
        type: "select",
        options: [
          { value: "annual", label: "Annual" },
          { value: "biannual", label: "Biannual" },
          { value: "quarterly", label: "Quarterly" },
        ],
      },
      {
        id: "lastTestDate",
        label: "Date of last BCP test",
        type: "date",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "bcpDocumentExists",
        "includesGroundStationLoss",
        "alternativeCommPaths",
      ],
      requiredNotEmpty: ["testFrequency"],
    },
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
    assessmentFields: [
      {
        id: "backupPolicyExists",
        label: "Backup policy exists?",
        type: "boolean",
      },
      {
        id: "includesSpacecraftConfig",
        label: "Includes spacecraft configuration/parameters?",
        type: "boolean",
      },
      {
        id: "offsiteStorageUsed",
        label: "Offsite backup storage used?",
        type: "boolean",
      },
      {
        id: "backupRule",
        label: "Backup strategy",
        type: "select",
        options: [
          { value: "3-2-1", label: "3-2-1 Rule" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "recoveryTestFrequency",
        label: "Recovery test frequency",
        type: "select",
        options: [
          { value: "monthly", label: "Monthly" },
          { value: "quarterly", label: "Quarterly" },
          { value: "annual", label: "Annual" },
          { value: "none", label: "None" },
        ],
      },
      {
        id: "lastRecoveryTest",
        label: "Date of last recovery test",
        type: "date",
      },
    ],
    complianceRule: {
      requiredTrue: ["backupPolicyExists", "offsiteStorageUsed"],
      requiredNotEmpty: ["backupRule", "recoveryTestFrequency"],
    },
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
    assessmentFields: [
      {
        id: "planDocumentExists",
        label: "Incident response plan document exists?",
        type: "boolean",
      },
      {
        id: "includesSpaceIncidents",
        label: "Includes space-specific incident types?",
        type: "boolean",
      },
      {
        id: "severityClassificationDefined",
        label: "Severity classification defined?",
        type: "boolean",
      },
      {
        id: "escalationToNCA",
        label: "Escalation paths to NCA documented?",
        type: "boolean",
      },
      {
        id: "commTemplatesExist",
        label: "Communication templates exist?",
        type: "boolean",
      },
      {
        id: "tabletopExerciseFrequency",
        label: "Tabletop exercise frequency",
        type: "select",
        options: [
          { value: "annual", label: "Annual" },
          { value: "biannual", label: "Biannual" },
          { value: "quarterly", label: "Quarterly" },
          { value: "none", label: "None" },
        ],
      },
    ],
    complianceRule: {
      requiredTrue: [
        "planDocumentExists",
        "includesSpaceIncidents",
        "severityClassificationDefined",
        "escalationToNCA",
      ],
      requiredNotEmpty: ["tabletopExerciseFrequency"],
    },
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
    assessmentFields: [
      {
        id: "ncaRegistered",
        label: "Registered with NCA incident reporting portal?",
        type: "boolean",
      },
      {
        id: "twentyFourSevenContacts",
        label: "24/7 incident contacts designated?",
        type: "boolean",
      },
      {
        id: "earlyWarningTemplates",
        label: "Early warning templates prepared?",
        type: "boolean",
      },
      {
        id: "incidentThresholdsDefined",
        label: "Significant incident thresholds defined?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "ncaRegistered",
        "twentyFourSevenContacts",
        "earlyWarningTemplates",
        "incidentThresholdsDefined",
      ],
    },
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
    assessmentFields: [
      {
        id: "notificationProcedureExists",
        label: "Detailed notification procedure exists?",
        type: "boolean",
      },
      {
        id: "impactAssessmentTemplate",
        label: "Impact assessment template prepared?",
        type: "boolean",
      },
      {
        id: "containmentMeasuresDocumented",
        label: "Containment measures documented?",
        type: "boolean",
      },
      {
        id: "crossBorderPrepared",
        label: "Cross-border notification prepared (if applicable)?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "notificationProcedureExists",
        "impactAssessmentTemplate",
        "containmentMeasuresDocumented",
      ],
    },
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
    assessmentFields: [
      {
        id: "reportTemplateExists",
        label: "Final report template exists?",
        type: "boolean",
      },
      {
        id: "rcaMethodologyDefined",
        label: "Root cause analysis methodology defined?",
        type: "boolean",
      },
      {
        id: "lessonsLearnedProcess",
        label: "Lessons learned process in place?",
        type: "boolean",
      },
      {
        id: "remediationTracking",
        label: "Remediation action tracking implemented?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "reportTemplateExists",
        "rcaMethodologyDefined",
        "lessonsLearnedProcess",
      ],
    },
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
    assessmentFields: [
      {
        id: "registrationSubmitted",
        label: "EUSRN registration submitted?",
        type: "boolean",
      },
      {
        id: "contactsDesignated",
        label: "Operational contacts designated?",
        type: "boolean",
      },
      {
        id: "registrationInfoCurrent",
        label: "Registration information current?",
        type: "boolean",
      },
      {
        id: "liaisonDesignated",
        label: "EUSRN liaison designated?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["registrationSubmitted", "contactsDesignated"],
    },
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
    assessmentFields: [
      {
        id: "exercisesParticipated",
        label: "Participated in EUSRN cyber exercises?",
        type: "boolean",
      },
      {
        id: "threatIntelShared",
        label: "Threat intelligence shared (anonymized if needed)?",
        type: "boolean",
      },
      {
        id: "meetingsAttended",
        label: "EUSRN coordination meetings attended?",
        type: "boolean",
      },
      {
        id: "recommendationsImplemented",
        label: "EUSRN recommendations implemented?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["exercisesParticipated", "meetingsAttended"],
    },
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
