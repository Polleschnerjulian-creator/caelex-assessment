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
        helpText:
          "A formal document outlining your organization's security objectives, roles, and rules. Required under NIS2 Art. 21(2)(a) — without it, you cannot demonstrate baseline governance.",
      },
      {
        id: "boardApproved",
        label: "Policy approved by board/executive management?",
        type: "boolean",
        helpText:
          "Board-level sign-off proves management commitment and accountability. NIS2 holds management personally liable for cybersecurity oversight.",
      },
      {
        id: "lastReviewDate",
        label: "Date of last policy review",
        type: "date",
        helpText:
          "Policies must be reviewed regularly to stay current with evolving threats. Annual review is the minimum expected by most NCAs.",
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
        helpText:
          "How often your policy is formally reviewed and updated. Annual is the minimum; higher-risk operators should review more frequently.",
      },
      {
        id: "coversSpaceSpecific",
        label: "Covers space-specific security considerations?",
        type: "boolean",
        helpText:
          "Your policy should address unique space risks like command link security, telemetry protection, and ground station hardening — not just standard IT security.",
      },
      {
        id: "communicatedToStaff",
        label: "Communicated to all staff?",
        type: "boolean",
        helpText:
          "All employees must be aware of the policy and their security responsibilities. Evidence of communication (e.g., signed acknowledgments or training records) is typically required.",
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
        helpText:
          "A written framework describing how you identify, assess, and treat cybersecurity risks. This is a core NIS2 Art. 21(2)(a) requirement and a prerequisite for all other risk activities.",
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
        helpText:
          "The standard or methodology your framework is based on. NIST CSF and ISO 27005 are widely accepted; a custom approach is acceptable if well-documented.",
      },
      {
        id: "includesSpaceThreats",
        label: "Includes space-specific threats?",
        type: "boolean",
        helpText:
          "Your risk framework must account for threats unique to space operations such as jamming, spoofing, and anti-satellite weapons (ASAT). Generic IT risk frameworks alone are insufficient.",
      },
      {
        id: "riskAppetiteDefined",
        label: "Risk appetite and tolerance defined?",
        type: "boolean",
        helpText:
          "Risk appetite defines how much risk your organization is willing to accept. Without it, there is no consistent basis for deciding which risks to treat, transfer, or accept.",
      },
      {
        id: "integratedWithERM",
        label: "Integrated with enterprise risk management?",
        type: "boolean",
        helpText:
          "Cybersecurity risks should feed into your organization's overall enterprise risk management to ensure leadership has a complete risk picture.",
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
        helpText:
          "At least one named individual must be accountable for cybersecurity. For smaller operators, this can be a part-time role or a virtual CISO arrangement.",
      },
      {
        id: "raciMatrixDocumented",
        label: "RACI matrix for security functions documented?",
        type: "boolean",
        helpText:
          "A RACI matrix clarifies who is Responsible, Accountable, Consulted, and Informed for each security function. NIS2 Art. 20(1) requires clear accountability structures.",
      },
      {
        id: "thirdPartyRolesIncluded",
        label: "Third-party/supplier responsibilities included?",
        type: "boolean",
        helpText:
          "If suppliers or contractors handle security-relevant tasks (e.g., ground station operations), their responsibilities must be formally documented and assigned.",
      },
      {
        id: "roleDescriptionsExist",
        label: "Role descriptions/job profiles exist?",
        type: "boolean",
        helpText:
          "Written job profiles or role descriptions that include security responsibilities. These serve as evidence that security duties are formally assigned, not just assumed.",
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
        helpText:
          "A formal risk assessment must be performed at least once per year, plus after any significant changes. This is a baseline expectation under NIS2 Art. 21(2)(a).",
      },
      {
        id: "assetInventoryExists",
        label: "Asset inventory exists?",
        type: "boolean",
        helpText:
          "A complete list of your hardware, software, data, and space assets. You cannot assess risks to assets you have not identified — this is the foundation of any risk assessment.",
      },
      {
        id: "includesSupplyChainRisks",
        label: "Includes supply chain risks?",
        type: "boolean",
        helpText:
          "Your risk assessment must cover risks introduced by suppliers, such as compromised satellite components or insecure ground station software. NIS2 Art. 21(2)(d) explicitly requires this.",
      },
      {
        id: "spaceThreatsConsidered",
        label: "Space-specific threats considered (jamming, spoofing, ASAT)?",
        type: "boolean",
        helpText:
          "Space operations face unique threats like signal jamming, GPS spoofing, and anti-satellite weapons. These must be explicitly addressed — generic IT threat catalogs are not sufficient.",
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
        helpText:
          "The structured method you use to identify and evaluate risks. Using a recognized standard (ISO 27005, NIST) strengthens your compliance position with NCAs.",
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
        helpText:
          "Active subscription to feeds that report on cyber threats relevant to space operations. ENISA and ESA both provide advisories specifically for this sector.",
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
        helpText:
          "Your main source of threat intelligence. ENISA and ESA feeds are free and space-specific; ISACs enable peer information sharing; commercial services offer broader coverage.",
      },
      {
        id: "regularBriefings",
        label: "Regular threat briefings conducted?",
        type: "boolean",
        helpText:
          "Periodic briefings where threat intelligence is communicated to relevant teams. This ensures new threats are acted upon rather than sitting unread in a feed.",
      },
      {
        id: "integrationWithRisk",
        label: "Threat intelligence integrated with risk management?",
        type: "boolean",
        helpText:
          "Threat intelligence should feed directly into your risk assessments so that newly discovered threats are evaluated and mitigated systematically.",
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
        helpText:
          "A documented list of suppliers whose failure or compromise could impact your space operations. This includes hardware manufacturers, software vendors, and service providers.",
      },
      {
        id: "securityAssessmentsPerformed",
        label: "Security assessments performed on suppliers?",
        type: "boolean",
        helpText:
          "You must evaluate the security posture of critical suppliers through questionnaires, audits, or certification checks. NIS2 Art. 21(2)(d) makes supply chain security mandatory.",
      },
      {
        id: "contractualSecReqs",
        label: "Contractual security requirements in place?",
        type: "boolean",
        helpText:
          "Supplier contracts should include specific cybersecurity clauses covering incident notification, access controls, and data protection obligations.",
      },
      {
        id: "geopoliticalRisksConsidered",
        label: "Geopolitical risks considered?",
        type: "boolean",
        helpText:
          "Space supply chains often span multiple jurisdictions. You should assess whether supplier locations or ownership structures create exposure to sanctions, export controls, or state-sponsored threats.",
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
        helpText:
          "How often you verify that suppliers still meet your security requirements. Annual audits are the baseline expectation for critical suppliers.",
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
        helpText:
          "Users should only have access based on their role (e.g., operator, engineer, admin). RBAC prevents unauthorized access to mission-critical systems and is required under NIS2 Art. 21(2)(i).",
      },
      {
        id: "leastPrivilegeEnforced",
        label: "Least privilege principle enforced?",
        type: "boolean",
        helpText:
          "Every user and system account should have only the minimum permissions needed to perform their function. This limits the blast radius if an account is compromised.",
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
        helpText:
          "How often you review who has access to what. Quarterly reviews are recommended; stale accounts from departed employees are a common audit finding.",
      },
      {
        id: "privilegedAccountInventory",
        label: "Privileged account inventory maintained?",
        type: "boolean",
        helpText:
          "A documented list of all admin and privileged accounts across your systems. These high-privilege accounts are prime targets for attackers and require special oversight.",
      },
      {
        id: "groundStationAccessSeparate",
        label: "Ground station access separated from corporate?",
        type: "boolean",
        helpText:
          "Ground station and mission control networks should be logically or physically separated from corporate IT. A breach in corporate email should not provide a path to spacecraft command systems.",
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
        helpText:
          "Multi-factor authentication requires two or more verification methods (e.g., password + hardware token). NIS2 Art. 21(2)(j) mandates MFA for remote and privileged access.",
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
        helpText:
          "The MFA method used. FIDO2 and hardware tokens are phishing-resistant and preferred for mission-critical systems; SMS is the weakest option and may not satisfy stricter NCAs.",
      },
      {
        id: "coversMissionCritical",
        label: "Covers all mission-critical systems?",
        type: "boolean",
        helpText:
          "MFA must protect all systems involved in spacecraft command, telemetry, and mission control — not just corporate applications like email.",
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
        helpText:
          "If any systems cannot support MFA (e.g., legacy ground equipment), each exception must be documented with alternative security measures that compensate for the missing factor.",
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
        helpText:
          "A formal scheme that categorizes data by sensitivity level (e.g., public, internal, confidential, restricted). This determines what protection measures apply to each type of data.",
      },
      {
        id: "telemetryClassified",
        label: "Telemetry, command, and mission data classified?",
        type: "boolean",
        helpText:
          "Telemetry, command uplinks, and mission payload data must be explicitly classified. Command data is typically restricted since unauthorized access could control the spacecraft.",
      },
      {
        id: "dlpImplemented",
        label: "Data loss prevention implemented?",
        type: "boolean",
        helpText:
          "Technical controls that detect and prevent unauthorized data exfiltration. Particularly important for mission data, spacecraft parameters, and any export-controlled information.",
      },
      {
        id: "dataAtRestEncrypted",
        label: "Data at rest encrypted?",
        type: "boolean",
        helpText:
          "Sensitive data stored on disk, in databases, or in backups must be encrypted. This protects against data theft even if physical media or storage systems are compromised.",
      },
      {
        id: "exportControlConsidered",
        label: "Export control implications considered (ITAR/EAR)?",
        type: "boolean",
        helpText:
          "Space technology is often subject to ITAR or EAR export controls. Your data protection measures must account for these legal restrictions on sharing technical data across borders.",
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
        helpText:
          "Mission control and ground station networks must be segmented from corporate IT. This prevents an attacker who compromises a business system from reaching spacecraft control infrastructure.",
      },
      {
        id: "firewallRulesDocumented",
        label: "Firewall rules documented?",
        type: "boolean",
        helpText:
          "All firewall rules should be documented with a business justification. Undocumented rules create security gaps and are a common finding in compliance audits.",
      },
      {
        id: "idsIpsDeployed",
        label: "IDS/IPS deployed?",
        type: "boolean",
        helpText:
          "Intrusion Detection/Prevention Systems monitor network traffic for malicious activity. They provide early warning of attacks targeting your ground infrastructure.",
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
        helpText:
          "How often independent testers attempt to breach your systems. Annual penetration testing is the minimum; critical infrastructure operators should test more frequently.",
      },
      {
        id: "zeroTrustImplemented",
        label: "Zero trust architecture implemented?",
        type: "boolean",
        helpText:
          "A security model where no user or system is trusted by default, even inside the network. Zero trust is increasingly expected for space operations but is not yet universally mandated.",
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
        helpText:
          "A formal document specifying which encryption algorithms, key lengths, and protocols are approved for use. Without it, teams may use weak or inconsistent cryptography.",
      },
      {
        id: "approvedAlgorithmList",
        label: "Approved algorithm list maintained?",
        type: "boolean",
        helpText:
          "A maintained list of cryptographic algorithms your organization permits (e.g., AES-256, RSA-4096). This should follow ENISA recommendations and exclude deprecated algorithms like DES or MD5.",
      },
      {
        id: "postQuantumPlanExists",
        label: "Post-quantum cryptography transition plan exists?",
        type: "boolean",
        helpText:
          "Quantum computers will eventually break current public-key algorithms. A transition plan ensures your long-lived space assets are prepared for the shift to quantum-resistant cryptography.",
      },
      {
        id: "keyLifecycleDocumented",
        label: "Key lifecycle management documented?",
        type: "boolean",
        helpText:
          "Procedures covering how cryptographic keys are generated, distributed, stored, rotated, and eventually destroyed. Poor key management undermines even the strongest encryption.",
      },
      {
        id: "ccsdsMandated",
        label: "CCSDS standards mandated for space links?",
        type: "boolean",
        helpText:
          "CCSDS (Consultative Committee for Space Data Systems) provides standardized space link security protocols. Using these standards ensures interoperability and proven security for satellite communications.",
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
        helpText:
          "All command uplinks, telemetry downlinks, and payload data transfers between your spacecraft and ground stations must be encrypted to prevent eavesdropping and command injection.",
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
        helpText:
          "The encryption standard used for space links. CCSDS Space Data Link Security (SDLS) is the recommended industry standard; AES-256 is the minimum acceptable algorithm strength.",
      },
      {
        id: "hsmForGroundKeys",
        label: "HSM used for ground segment keys?",
        type: "boolean",
        helpText:
          "Hardware Security Modules provide tamper-resistant storage for cryptographic keys at ground stations. They prevent key extraction even if the ground system is compromised.",
      },
      {
        id: "authSeparateFromEncryption",
        label: "Authentication separate from encryption?",
        type: "boolean",
        helpText:
          "Command authentication (verifying who sent a command) should be independent from encryption (hiding content). This ensures commands cannot be forged even if encryption is bypassed.",
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
        helpText:
          "How often encryption keys are replaced. More frequent rotation (per pass or daily) limits the window of exposure if a key is compromised. Monthly is the minimum acceptable frequency.",
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
        helpText:
          "HSMs are dedicated hardware devices that securely store cryptographic keys. They are the gold standard for key protection and are expected for any mission-critical space system.",
      },
      {
        id: "keyRotationDefined",
        label: "Key rotation schedules defined?",
        type: "boolean",
        helpText:
          "Documented schedules specifying when each type of key must be replaced. Regular rotation limits exposure from compromised keys and is a standard audit requirement.",
      },
      {
        id: "keyDistributionSecure",
        label: "Secure key distribution procedures in place?",
        type: "boolean",
        helpText:
          "Procedures for safely delivering keys to spacecraft and ground stations (e.g., out-of-band transfer, key wrapping). Insecure distribution is the most common point of failure in key management.",
      },
      {
        id: "keyRecoveryProcesses",
        label: "Key recovery processes documented?",
        type: "boolean",
        helpText:
          "Procedures for recovering access when keys are lost or corrupted. Without recovery processes, a key loss could result in permanent loss of spacecraft control.",
      },
      {
        id: "keyInventoryMaintained",
        label: "Key inventory maintained?",
        type: "boolean",
        helpText:
          "A centralized record of all active cryptographic keys, their purpose, expiry dates, and custodians. Essential for tracking key lifecycle and ensuring timely rotation.",
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
        helpText:
          "A Security Information and Event Management system aggregates logs from all systems and correlates events to detect threats. This is the backbone of continuous security monitoring under NIS2 Art. 21(2)(b).",
      },
      {
        id: "groundStationCoverage",
        label: "Ground station systems covered by monitoring?",
        type: "boolean",
        helpText:
          "Your monitoring must include ground station infrastructure (antennas, tracking systems, network equipment). Ground stations are a primary attack surface for space operations.",
      },
      {
        id: "missionControlCoverage",
        label: "Mission control systems covered by monitoring?",
        type: "boolean",
        helpText:
          "Mission control workstations, servers, and command systems must be monitored. Unauthorized access to these systems could lead to loss of spacecraft control.",
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
        helpText:
          "When your security monitoring is actively staffed. Large constellation operators are expected to have 24/7 coverage; smaller operators may use on-call arrangements with automated alerting.",
      },
      {
        id: "alertProceduresDocumented",
        label: "Alert and escalation procedures documented?",
        type: "boolean",
        helpText:
          "Written procedures defining how alerts are triaged, who gets notified, and when incidents are escalated. Without these, monitoring generates alerts that nobody acts on.",
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
        helpText:
          "A documented profile of what normal spacecraft and ground system behavior looks like (e.g., expected command sequences, telemetry ranges). Anomalies can only be detected against a known baseline.",
      },
      {
        id: "commandPatternMonitoring",
        label: "Unauthorized command pattern monitoring in place?",
        type: "boolean",
        helpText:
          "Systems that detect unexpected or unauthorized command sequences sent to spacecraft. This is critical for identifying command injection attacks or insider threats.",
      },
      {
        id: "rfInterferenceDetection",
        label: "RF interference/jamming detection capability?",
        type: "boolean",
        helpText:
          "The ability to detect radio frequency interference or deliberate jamming of your communication links. Jamming is one of the most common threats to satellite operations.",
      },
      {
        id: "mlBasedDetection",
        label: "ML-based anomaly detection implemented?",
        type: "boolean",
        helpText:
          "Machine learning models that identify unusual patterns beyond what static rules can catch. Useful but not mandatory — answer 'no' if you rely on rule-based detection only.",
      },
      {
        id: "detectionRulesDocumented",
        label: "Detection rules and baselines documented?",
        type: "boolean",
        helpText:
          "All detection rules, thresholds, and baseline definitions must be documented so they can be reviewed, updated, and audited. Undocumented rules cannot be validated for effectiveness.",
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
        helpText:
          "All security-relevant logs from across your systems should be collected in a central location. Scattered logs make it nearly impossible to detect coordinated attacks or perform forensic analysis.",
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
        helpText:
          "Logs must be stored in a tamper-proof manner (e.g., write-once storage) so that attackers cannot erase evidence of their activity after a breach.",
      },
      {
        id: "timestampSynchronized",
        label: "Timestamps synchronized (NTP)?",
        type: "boolean",
        helpText:
          "All systems must use synchronized clocks (via NTP or similar). Without consistent timestamps, correlating events across systems during an investigation becomes unreliable.",
      },
      {
        id: "allCriticalSystemsCovered",
        label: "All critical systems covered?",
        type: "boolean",
        helpText:
          "Logging must cover all mission-critical systems including ground stations, mission control, and network infrastructure. Gaps in coverage create blind spots for incident detection.",
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
        helpText:
          "A written plan describing how your organization will continue critical space operations during and after a disruption. Required under NIS2 Art. 21(2)(c) and ISO 22301.",
      },
      {
        id: "includesGroundStationLoss",
        label: "Includes loss of ground station scenarios?",
        type: "boolean",
        helpText:
          "Your BCP must address scenarios where a ground station becomes unavailable (e.g., natural disaster, cyberattack). You need documented procedures for switching to backup stations.",
      },
      {
        id: "includesSatelliteAnomalies",
        label: "Includes satellite anomaly/failure scenarios?",
        type: "boolean",
        helpText:
          "The plan should cover spacecraft anomalies such as tumbling, power loss, or communication failure. These scenarios require specific recovery procedures distinct from IT continuity.",
      },
      {
        id: "alternativeCommPaths",
        label: "Alternative communication paths documented?",
        type: "boolean",
        helpText:
          "Backup communication routes to your spacecraft if the primary link fails. This could include partner ground stations, relay satellites, or emergency frequency procedures.",
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
        helpText:
          "How often you test the plan through tabletop exercises or live drills. An untested BCP is unreliable — annual testing is the minimum expectation.",
      },
      {
        id: "lastTestDate",
        label: "Date of last BCP test",
        type: "date",
        helpText:
          "The most recent date your BCP was tested. NCAs expect recent test evidence; a plan that has never been tested or was last tested years ago will not satisfy auditors.",
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
        helpText:
          "A formal policy defining what is backed up, how often, where backups are stored, and who is responsible. This is foundational for recovery after ransomware, hardware failure, or data corruption.",
      },
      {
        id: "includesSpacecraftConfig",
        label: "Includes spacecraft configuration/parameters?",
        type: "boolean",
        helpText:
          "Spacecraft configuration data, orbital parameters, and command sequences must be backed up. Losing this data could mean losing the ability to operate or recover the spacecraft.",
      },
      {
        id: "offsiteStorageUsed",
        label: "Offsite backup storage used?",
        type: "boolean",
        helpText:
          "At least one copy of backups should be stored at a geographically separate location. This protects against site-level disasters that could destroy both primary systems and local backups.",
      },
      {
        id: "backupRule",
        label: "Backup strategy",
        type: "select",
        options: [
          { value: "3-2-1", label: "3-2-1 Rule" },
          { value: "other", label: "Other" },
        ],
        helpText:
          "The 3-2-1 rule means 3 copies of data, on 2 different media types, with 1 stored offsite. This is the industry-standard approach and the easiest to defend in an audit.",
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
        helpText:
          "How often you verify that backups can actually be restored. Untested backups frequently fail when needed — quarterly testing is recommended for critical mission data.",
      },
      {
        id: "lastRecoveryTest",
        label: "Date of last recovery test",
        type: "date",
        helpText:
          "The most recent date you successfully restored data from backup. This proves your backups are functional, not just theoretical.",
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
        helpText:
          "A written plan defining how your team detects, responds to, and recovers from cybersecurity incidents. Required under NIS2 Art. 21(2)(b) — this is non-negotiable for compliance.",
      },
      {
        id: "includesSpaceIncidents",
        label: "Includes space-specific incident types?",
        type: "boolean",
        helpText:
          "The plan must cover space-specific incidents such as unauthorized spacecraft commanding, telemetry hijacking, ground station compromise, and RF interference — not just generic IT incidents.",
      },
      {
        id: "severityClassificationDefined",
        label: "Severity classification defined?",
        type: "boolean",
        helpText:
          "A clear matrix that categorizes incidents by severity (e.g., low/medium/high/critical). This determines response speed, escalation paths, and whether regulatory notification is required.",
      },
      {
        id: "escalationToNCA",
        label: "Escalation paths to NCA documented?",
        type: "boolean",
        helpText:
          "Documented procedures for when and how to notify your National Competent Authority. NIS2 requires early warning within 24 hours — you must know exactly who to contact and how.",
      },
      {
        id: "commTemplatesExist",
        label: "Communication templates exist?",
        type: "boolean",
        helpText:
          "Pre-drafted templates for internal alerts, NCA notifications, customer communications, and press statements. During an active incident, there is no time to draft these from scratch.",
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
        helpText:
          "How often your team practices incident response through simulated scenarios. Regular exercises reveal gaps in the plan and build team readiness before a real incident occurs.",
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
        helpText:
          "You must pre-register with your NCA's incident reporting system before an incident occurs. Trying to register during a live incident wastes critical hours of your 24-hour deadline.",
      },
      {
        id: "twentyFourSevenContacts",
        label: "24/7 incident contacts designated?",
        type: "boolean",
        helpText:
          "Named individuals who can be reached at any time to initiate incident reporting. Incidents do not wait for business hours, and the 24-hour clock starts at detection, not next morning.",
      },
      {
        id: "earlyWarningTemplates",
        label: "Early warning templates prepared?",
        type: "boolean",
        helpText:
          "Pre-filled templates for the initial NCA notification under NIS2 Art. 23(4)(a). Having these ready ensures you can submit within 24 hours even under the pressure of an active incident.",
      },
      {
        id: "incidentThresholdsDefined",
        label: "Significant incident thresholds defined?",
        type: "boolean",
        helpText:
          "Clear criteria for what constitutes a 'significant incident' requiring NCA notification. Without defined thresholds, teams waste time debating whether to report instead of acting.",
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
        helpText:
          "A documented procedure for preparing and submitting the 72-hour detailed notification required by NIS2 Art. 23(4)(b). This must include who drafts it, who approves it, and how it is submitted.",
      },
      {
        id: "impactAssessmentTemplate",
        label: "Impact assessment template prepared?",
        type: "boolean",
        helpText:
          "A template for systematically assessing incident impact: affected services, number of users impacted, data compromised, and operational consequences. NCAs require this level of detail at 72 hours.",
      },
      {
        id: "containmentMeasuresDocumented",
        label: "Containment measures documented?",
        type: "boolean",
        helpText:
          "Pre-defined containment procedures for common incident types (e.g., isolating compromised systems, revoking credentials). The 72-hour report must describe what containment actions were taken.",
      },
      {
        id: "crossBorderPrepared",
        label: "Cross-border notification prepared (if applicable)?",
        type: "boolean",
        helpText:
          "If your operations span multiple EU member states, you may need to notify multiple NCAs. Prepare procedures and templates for cross-border notification to avoid delays.",
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
        helpText:
          "A structured template for the comprehensive final report due within one month per NIS2 Art. 23(4)(d). It should cover timeline, root cause, impact, and remediation actions.",
      },
      {
        id: "rcaMethodologyDefined",
        label: "Root cause analysis methodology defined?",
        type: "boolean",
        helpText:
          "A formal method for determining why an incident occurred (e.g., 5 Whys, fishbone diagram, fault tree analysis). NCAs expect root cause analysis, not just a description of symptoms.",
      },
      {
        id: "lessonsLearnedProcess",
        label: "Lessons learned process in place?",
        type: "boolean",
        helpText:
          "A structured process for capturing and acting on insights from each incident. This drives continuous improvement and demonstrates to regulators that incidents lead to meaningful change.",
      },
      {
        id: "remediationTracking",
        label: "Remediation action tracking implemented?",
        type: "boolean",
        helpText:
          "A system for tracking post-incident corrective actions to completion. NCAs may follow up on whether promised remediations were actually implemented.",
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
        helpText:
          "The European Union Space Resilience Network requires all covered space operators to register. This can be done through your NCA or directly with ENISA under Art. 93.",
      },
      {
        id: "contactsDesignated",
        label: "Operational contacts designated?",
        type: "boolean",
        helpText:
          "Named individuals who serve as points of contact for EUSRN communications, advisories, and coordination requests. These contacts must be reachable during incidents.",
      },
      {
        id: "registrationInfoCurrent",
        label: "Registration information current?",
        type: "boolean",
        helpText:
          "Your EUSRN registration details (contacts, operational scope, systems) must be kept up to date. Outdated information means critical advisories may not reach the right people.",
      },
      {
        id: "liaisonDesignated",
        label: "EUSRN liaison designated?",
        type: "boolean",
        helpText:
          "A named person responsible for coordinating with the EUSRN on an ongoing basis, including attending meetings, sharing intelligence, and implementing recommendations.",
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
        helpText:
          "The EUSRN organizes coordinated cybersecurity exercises for space operators. Participation demonstrates your readiness and helps identify gaps in your incident response capabilities.",
      },
      {
        id: "threatIntelShared",
        label: "Threat intelligence shared (anonymized if needed)?",
        type: "boolean",
        helpText:
          "Contributing threat intelligence to the EUSRN community benefits all operators. Sharing can be anonymized to protect sensitive details while still helping peers defend against common threats.",
      },
      {
        id: "meetingsAttended",
        label: "EUSRN coordination meetings attended?",
        type: "boolean",
        helpText:
          "Regular attendance at EUSRN coordination meetings keeps you informed of sector-wide threats and policy developments. Active participation is expected under Art. 94-95.",
      },
      {
        id: "recommendationsImplemented",
        label: "EUSRN recommendations implemented?",
        type: "boolean",
        helpText:
          "The EUSRN issues security recommendations based on collective intelligence. Implementing these shows your organization takes sector-wide coordination seriously and stays ahead of emerging threats.",
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
