/**
 * @deprecated Use `src/data/regulatory/standards/nis2-directive.ts` + `src/data/regulatory/standards/iso-27001.ts` instead.
 * This file references EU Space Act proposal articles as if they are enacted law.
 * The new regulatory layer uses NIS2 and ISO 27001 as primary enacted references.
 */

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
  /**
   * Canonical URL to the primary source for this requirement.
   * - EU Space Act articles link to EUR-Lex proposal COM(2025) 335.
   * - NIS2 articles link to the NIS2 Directive ELI permalink.
   * - ISO standards link to the canonical ISO catalogue page (text may be paywalled).
   */
  officialUrl?: string;
  severity: "critical" | "major" | "minor";
  implementationTimeWeeks?: number;
  assessmentFields?: AssessmentField[];
  complianceRule?: ComplianceRule;
  enisaGuidance?: {
    controlId: string; // e.g. "ENISA-SP-GOV-01"
    controlName: string;
    segment: "space" | "ground" | "user" | "link";
    implementationSteps: string[];
    maturityLevels?: { level: number; description: string }[];
  }[];
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
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-1.1.2",
        controlName: "Cybersecurity Policy for Space Operations",
        segment: "ground",
        implementationSteps: [
          "Establish a dedicated cybersecurity policy addressing space operations specifically",
          "Obtain senior management approval and formal sign-off for the policy",
          "Communicate the policy to all relevant personnel involved in space operations",
          "Schedule regular reviews aligned with Art. 74 requirements",
        ],
        maturityLevels: [
          {
            level: 1,
            description:
              "No formal cybersecurity policy for space operations exists",
          },
          {
            level: 2,
            description:
              "Draft policy exists but is not approved or communicated",
          },
          {
            level: 3,
            description:
              "Approved policy exists and is communicated to key personnel",
          },
          {
            level: 4,
            description:
              "Policy is regularly reviewed and updated with space-specific considerations",
          },
          {
            level: 5,
            description:
              "Policy is continuously improved based on threat landscape changes and audit findings",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.9",
        controlName: "Space Cybersecurity Awareness Training",
        segment: "ground",
        implementationSteps: [
          "Design cybersecurity awareness training tailored to space operations personnel",
          "Cover space-specific threats such as signal interference, spoofing, and supply chain compromise",
          "Deliver training regularly and track completion records",
          "Update training content based on evolving threat landscape",
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.5",
        controlName: "Compliance Monitoring Framework",
        segment: "ground",
        implementationSteps: [
          "Implement a framework for continuous monitoring of compliance with the security policy",
          "Map policy requirements to operational controls and verify implementation",
          "Track compliance metrics and report to management",
          "Address non-compliance findings with corrective actions",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/80585.html",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-1.1.1",
        controlName: "Space Mission Cybersecurity Risk Assessment",
        segment: "ground",
        implementationSteps: [
          "Conduct comprehensive cybersecurity risk assessments covering space, ground, user, and link segments",
          "Identify and categorize threats specific to the space mission lifecycle",
          "Assess vulnerabilities across the entire mission architecture",
          "Document risk assessment results and feed into treatment planning",
        ],
        maturityLevels: [
          { level: 1, description: "No formal risk assessment process exists" },
          {
            level: 2,
            description:
              "Ad-hoc risk assessments performed without consistent methodology",
          },
          {
            level: 3,
            description:
              "Documented risk assessment methodology covering all four segments",
          },
          {
            level: 4,
            description:
              "Regular risk assessments with quantitative analysis and trend tracking",
          },
          {
            level: 5,
            description:
              "Continuous risk monitoring with automated threat intelligence integration",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.4",
        controlName: "Risk Treatment Plan for Space Assets",
        segment: "ground",
        implementationSteps: [
          "Develop risk treatment plans for each identified cybersecurity risk",
          "Define risk acceptance criteria and residual risk thresholds",
          "Track residual risk levels after treatment implementation",
          "Review and update treatment plans periodically",
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.6",
        controlName: "Regular Risk Review Cycle",
        segment: "ground",
        implementationSteps: [
          "Establish a defined schedule for periodic risk reviews",
          "Trigger ad-hoc reviews upon significant mission profile or threat landscape changes",
          "Update the risk register based on review findings",
          "Report risk review outcomes to senior management",
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.8",
        controlName: "Regulatory Compliance Mapping",
        segment: "ground",
        implementationSteps: [
          "Map all applicable cybersecurity regulatory requirements to internal controls",
          "Maintain traceability between EU Space Act, NIS2, and national law obligations and implementations",
          "Identify and close compliance gaps through the risk management framework",
          "Update mappings when regulations or internal controls change",
        ],
      },
    ],
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
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-1.1.3",
        controlName: "Roles and Responsibilities Definition",
        segment: "ground",
        implementationSteps: [
          "Define cybersecurity roles and responsibilities for all space mission phases",
          "Designate a security officer specifically for space operations",
          "Document accountability chains from operations staff to senior management",
          "Ensure role definitions cover both ground and space segment responsibilities",
        ],
        maturityLevels: [
          { level: 1, description: "No formal security roles defined" },
          {
            level: 2,
            description: "Security responsibilities informally assigned",
          },
          {
            level: 3,
            description:
              "Formal role definitions documented with designated security officer",
          },
          {
            level: 4,
            description:
              "RACI matrix maintained with regular reviews of role assignments",
          },
          {
            level: 5,
            description:
              "Dynamic role management adapting to mission phases and organizational changes",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.2",
        controlName: "Cybersecurity Policy for Space Operations",
        segment: "ground",
        implementationSteps: [
          "Ensure the cybersecurity policy explicitly assigns roles and accountability",
          "Include third-party and supplier responsibilities in the policy scope",
          "Align role definitions with NIS2 Art. 20(1) management accountability requirements",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-1.1.1",
        controlName: "Space Mission Cybersecurity Risk Assessment",
        segment: "ground",
        implementationSteps: [
          "Conduct risk assessments covering all four segments: space, ground, user, and link",
          "Include space-specific threat scenarios such as jamming, spoofing, and ASAT threats",
          "Assess vulnerabilities across the entire mission architecture lifecycle",
          "Document findings in a structured risk register",
        ],
      },
      {
        controlId: "ENISA-SPACE-2.1.1",
        controlName: "Space Asset Inventory",
        segment: "ground",
        implementationSteps: [
          "Maintain a comprehensive inventory of all space assets including satellites, ground stations, and links",
          "Include ownership and security classification attributes for each asset",
          "Use the asset inventory as the foundation for risk assessments",
          "Keep the inventory current with regular updates",
        ],
      },
      {
        controlId: "ENISA-SPACE-2.1.6",
        controlName: "Critical Asset Identification",
        segment: "ground",
        implementationSteps: [
          "Identify assets whose compromise would result in mission loss or safety hazards",
          "Prioritize risk assessment activities around critical assets",
          "Apply enhanced protection measures to assets identified as critical",
          "Review critical asset designations when mission profiles change",
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.6",
        controlName: "Regular Risk Review Cycle",
        segment: "ground",
        implementationSteps: [
          "Conduct periodic risk reviews at least annually",
          "Trigger event-driven reviews upon significant changes to mission profile or threat landscape",
          "Update risk treatment plans based on review findings",
          "Document review outcomes and track remediation actions",
        ],
      },
    ],
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
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-1.1.1",
        controlName: "Space Mission Cybersecurity Risk Assessment",
        segment: "ground",
        implementationSteps: [
          "Integrate threat intelligence feeds into the risk assessment process",
          "Use space-specific threat intelligence to identify emerging vulnerabilities",
          "Update risk assessments when new threat intelligence indicates changed risk levels",
        ],
      },
      {
        controlId: "ENISA-SPACE-9.1.2",
        controlName: "Supply Chain Risk Management",
        segment: "ground",
        implementationSteps: [
          "Monitor threat intelligence for supply chain compromise indicators",
          "Assess geopolitical threat intelligence relevant to supplier locations",
          "Share relevant threat information with critical suppliers where appropriate",
        ],
      },
      {
        controlId: "ENISA-SPACE-13.1.5",
        controlName: "Space Weather Monitoring",
        segment: "space",
        implementationSteps: [
          "Monitor space weather intelligence feeds for solar events and geomagnetic storms",
          "Integrate space weather data into operational risk monitoring",
          "Correlate space weather events with spacecraft anomalies",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-9.1.1",
        controlName: "Supplier Security Assessment",
        segment: "ground",
        implementationSteps: [
          "Assess the cybersecurity posture of critical suppliers and subcontractors",
          "Evaluate component manufacturers, software providers, and launch service integrators",
          "Verify supplier security certifications and compliance status",
          "Conduct regular reassessments based on risk and supplier criticality",
        ],
        maturityLevels: [
          {
            level: 1,
            description: "No supplier security assessments performed",
          },
          { level: 2, description: "Ad-hoc assessments of some suppliers" },
          {
            level: 3,
            description:
              "Systematic assessments of all critical suppliers using defined criteria",
          },
          {
            level: 4,
            description:
              "Continuous supplier monitoring with risk-based assessment frequency",
          },
          {
            level: 5,
            description:
              "Integrated supplier risk management with real-time threat intelligence",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-9.1.2",
        controlName: "Supply Chain Risk Management",
        segment: "ground",
        implementationSteps: [
          "Implement supply chain risk management covering geopolitical risks",
          "Identify and mitigate single-source dependencies for critical components",
          "Verify component authenticity throughout the space system lifecycle",
          "Maintain supply chain risk register with treatment plans",
        ],
      },
      {
        controlId: "ENISA-SPACE-9.1.5",
        controlName: "Contractual Security Requirements",
        segment: "ground",
        implementationSteps: [
          "Include cybersecurity clauses in all supplier contracts",
          "Require incident notification, audit rights, and data handling obligations",
          "Mandate compliance with applicable regulations (NIS2, EU Space Act)",
          "Define security requirements for subcontractors in the supply chain",
        ],
      },
      {
        controlId: "ENISA-SPACE-9.1.4",
        controlName: "Counterfeit Component Prevention",
        segment: "space",
        implementationSteps: [
          "Implement measures to detect and prevent counterfeit electronic components",
          "Source components exclusively from authorized distributors",
          "Apply testing protocols to verify component authenticity",
          "Maintain traceability records for all critical components",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-3.1.1",
        controlName: "Role-Based Access for Mission Control",
        segment: "ground",
        implementationSteps: [
          "Implement RBAC for mission control systems based on operator duties",
          "Define granular roles separating commanding, monitoring, and administration functions",
          "Restrict operator access to only the functions necessary for their assigned role",
          "Review and update role definitions when mission requirements change",
        ],
        maturityLevels: [
          { level: 1, description: "No formal access control model in place" },
          {
            level: 2,
            description: "Basic user accounts with shared credentials",
          },
          {
            level: 3,
            description: "RBAC implemented with documented role definitions",
          },
          {
            level: 4,
            description:
              "Automated access provisioning with regular certification reviews",
          },
          {
            level: 5,
            description:
              "Attribute-based access control with context-aware policies",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-3.1.2",
        controlName: "Privileged Access Management for TT&C",
        segment: "ground",
        implementationSteps: [
          "Implement privileged access management for Telemetry, Tracking, and Command systems",
          "Deploy just-in-time access provisioning for elevated privileges",
          "Enable session recording for all privileged access sessions",
          "Require approval workflows before granting privileged access",
        ],
      },
      {
        controlId: "ENISA-SPACE-3.1.6",
        controlName: "Access Review and Recertification",
        segment: "ground",
        implementationSteps: [
          "Conduct periodic access reviews for all user accounts",
          "Immediately revoke access upon role change or personnel departure",
          "Recertify access rights at least quarterly for mission-critical systems",
          "Document and track all access changes and exceptions",
        ],
      },
      {
        controlId: "ENISA-SPACE-9.1.3",
        controlName: "Third-Party Access Control",
        segment: "ground",
        implementationSteps: [
          "Control and monitor third-party access to space systems and data",
          "Define access scope and time limitations for all supplier interactions",
          "Implement audit logging for all third-party access sessions",
        ],
      },
    ],
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
    officialUrl: "https://eur-lex.europa.eu/eli/dir/2022/2555/oj",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-3.1.7",
        controlName: "Multi-Factor Authentication for Critical Systems",
        segment: "ground",
        implementationSteps: [
          "Enforce MFA using hardware tokens or FIDO2 for all mission-critical system access",
          "Include spacecraft commanding interfaces in MFA scope",
          "Deploy phishing-resistant MFA methods for highest-risk systems",
          "Document exceptions with compensating controls and risk acceptance",
        ],
        maturityLevels: [
          { level: 1, description: "No MFA deployed" },
          {
            level: 2,
            description: "MFA on some systems using SMS or email codes",
          },
          {
            level: 3,
            description:
              "MFA enforced on all critical systems with TOTP or hardware tokens",
          },
          {
            level: 4,
            description:
              "Phishing-resistant MFA (FIDO2) deployed with centralized management",
          },
          {
            level: 5,
            description: "Adaptive MFA with risk-based step-up authentication",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-3.1.4",
        controlName: "Remote Access Security for Satellite Operations",
        segment: "ground",
        implementationSteps: [
          "Secure all remote access to satellite operations with VPN and MFA",
          "Implement encrypted channels for all remote sessions",
          "Enable continuous session monitoring for remote access connections",
          "Restrict remote access origination to approved networks where possible",
        ],
      },
      {
        controlId: "ENISA-SPACE-13.1.8",
        controlName: "Ground-to-Space Authentication",
        segment: "link",
        implementationSteps: [
          "Implement mutual authentication between ground stations and spacecraft",
          "Use cryptographic protocols to prevent rogue ground station access",
          "Verify authentication mechanisms cannot be bypassed during safe mode",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-1.1.7",
        controlName: "Space Mission Security Classification",
        segment: "ground",
        implementationSteps: [
          "Classify space missions and associated data flows by sensitivity and criticality",
          "Apply proportionate security controls to each classification level",
          "Include telemetry, command, and payload data in the classification scheme",
          "Align classification levels with export control requirements (ITAR/EAR)",
        ],
      },
      {
        controlId: "ENISA-SPACE-2.1.2",
        controlName: "Hardware and Software Asset Classification",
        segment: "ground",
        implementationSteps: [
          "Classify all hardware and software assets by criticality and sensitivity",
          "Distinguish between mission-critical, mission-support, and general-purpose systems",
          "Apply data protection measures proportionate to asset classification",
          "Review classifications when mission profiles or data handling requirements change",
        ],
      },
      {
        controlId: "ENISA-SPACE-7.1.7",
        controlName: "Data-in-Transit Protection",
        segment: "ground",
        implementationSteps: [
          "Protect all data in transit between ground stations, data centers, and end users",
          "Use TLS 1.3 or equivalent encryption for terrestrial data transfers",
          "Implement integrity verification for data exchanged between systems",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-7.1.4",
        controlName: "Network Segmentation for Ground Segment",
        segment: "ground",
        implementationSteps: [
          "Segment ground station networks isolating mission-critical systems from corporate IT",
          "Implement DMZs between internet-facing services and operational networks",
          "Deploy firewalls with documented and justified rule sets between network zones",
          "Regularly test segmentation effectiveness through penetration testing",
        ],
        maturityLevels: [
          { level: 1, description: "Flat network with no segmentation" },
          {
            level: 2,
            description:
              "Basic VLAN separation between corporate and operations",
          },
          {
            level: 3,
            description:
              "Multi-zone architecture with firewall-enforced segmentation",
          },
          {
            level: 4,
            description: "Micro-segmentation with IDS/IPS at zone boundaries",
          },
          {
            level: 5,
            description: "Zero trust architecture with continuous verification",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-3.1.4",
        controlName: "Remote Access Security for Satellite Operations",
        segment: "ground",
        implementationSteps: [
          "Secure all remote access via VPN with multi-factor authentication",
          "Implement encrypted tunnels for remote satellite operations sessions",
          "Monitor all remote access sessions continuously for anomalous activity",
        ],
      },
      {
        controlId: "ENISA-SPACE-5.1.1",
        controlName: "Ground Station Physical Protection",
        segment: "ground",
        implementationSteps: [
          "Complement network security with physical security at ground stations",
          "Implement intrusion detection systems for both physical and network perimeters",
          "Ensure physical access controls support network segmentation boundaries",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-4.1.4",
        controlName: "Crypto Module Standards Compliance",
        segment: "ground",
        implementationSteps: [
          "Ensure cryptographic modules comply with FIPS 140-3 or Common Criteria standards",
          "Match standard level to the classification of protected data",
          "Maintain certificates and validation records for all cryptographic modules",
          "Replace non-compliant modules according to a defined timeline",
        ],
        maturityLevels: [
          {
            level: 1,
            description: "No cryptographic policy or standards in place",
          },
          {
            level: 2,
            description: "Informal algorithm choices without documented policy",
          },
          {
            level: 3,
            description:
              "Documented policy with approved algorithm list and key lifecycle procedures",
          },
          {
            level: 4,
            description:
              "Certified cryptographic modules with enforced standards compliance",
          },
          {
            level: 5,
            description:
              "Crypto agility framework enabling rapid algorithm transition when needed",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-4.1.5",
        controlName: "Post-Quantum Cryptography Planning",
        segment: "ground",
        implementationSteps: [
          "Develop a migration plan for transitioning to post-quantum cryptographic algorithms",
          "Assess which space assets have operational lifetimes extending beyond quantum threat horizons",
          "Identify crypto-agile architectures that support algorithm substitution",
          "Monitor NIST and ENISA guidance on post-quantum algorithm standardization",
        ],
      },
      {
        controlId: "ENISA-SPACE-4.1.3",
        controlName: "Key Management Lifecycle for Space Systems",
        segment: "ground",
        implementationSteps: [
          "Document end-to-end key lifecycle covering generation, distribution, storage, rotation, revocation, and destruction",
          "Define key management procedures specific to space link encryption",
          "Establish secure key distribution procedures for ground-to-space key transfer",
          "Implement key recovery procedures to prevent loss of spacecraft control",
        ],
      },
    ],
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
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52025PC0335",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-4.1.1",
        controlName: "Encryption of Telecommand Uplinks",
        segment: "link",
        implementationSteps: [
          "Encrypt all telecommand uplinks using approved cryptographic algorithms",
          "Implement command authentication to prevent command injection and replay attacks",
          "Use sequence numbering and anti-replay mechanisms on command uplinks",
          "Test encryption implementation against known attack patterns",
        ],
        maturityLevels: [
          { level: 1, description: "No encryption on space links" },
          {
            level: 2,
            description: "Encryption on some links with basic key management",
          },
          {
            level: 3,
            description:
              "All command and telemetry links encrypted with CCSDS SDLS or equivalent",
          },
          {
            level: 4,
            description:
              "Separate authentication and encryption with HSM-backed ground keys",
          },
          {
            level: 5,
            description:
              "Crypto-agile space link architecture with over-the-air re-keying capability",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-4.1.2",
        controlName: "Encryption of Telemetry Downlinks",
        segment: "link",
        implementationSteps: [
          "Encrypt telemetry downlinks to protect spacecraft health and payload data",
          "Prevent eavesdropping on operational parameters and mission data",
          "Implement integrity verification for all telemetry data",
          "Consider selective encryption based on data classification levels",
        ],
      },
      {
        controlId: "ENISA-SPACE-7.1.6",
        controlName: "TT&C Communication Security",
        segment: "link",
        implementationSteps: [
          "Implement end-to-end security for Telemetry, Tracking, and Command communications",
          "Deploy authentication, encryption, and replay protection on all TT&C links",
          "Use sequence numbering to detect and reject out-of-order or replayed commands",
          "Verify TT&C security during all mission phases including safe mode",
        ],
      },
      {
        controlId: "ENISA-SPACE-4.1.6",
        controlName: "Inter-Satellite Link Encryption",
        segment: "space",
        implementationSteps: [
          "Apply encryption to inter-satellite communication links (optical or RF)",
          "Prevent interception and manipulation of data relayed between constellation nodes",
          "Implement mutual authentication between constellation spacecraft",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-4.1.3",
        controlName: "Key Management Lifecycle for Space Systems",
        segment: "ground",
        implementationSteps: [
          "Implement end-to-end key management for all cryptographic keys used in space operations",
          "Define procedures for key generation using approved random number generators",
          "Establish secure key distribution mechanisms including out-of-band transfer",
          "Document key rotation schedules, revocation procedures, and secure destruction methods",
        ],
        maturityLevels: [
          { level: 1, description: "No formal key management procedures" },
          {
            level: 2,
            description: "Basic key management with manual processes",
          },
          {
            level: 3,
            description:
              "Documented lifecycle procedures with HSM storage and defined rotation schedules",
          },
          {
            level: 4,
            description:
              "Automated key lifecycle management with centralized inventory and audit trail",
          },
          {
            level: 5,
            description:
              "Advanced key management with over-the-air re-keying and post-quantum readiness",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-4.1.4",
        controlName: "Crypto Module Standards Compliance",
        segment: "ground",
        implementationSteps: [
          "Use FIPS 140-3 or Common Criteria certified HSMs for key storage",
          "Ensure key generation meets required entropy standards",
          "Validate that cryptographic modules are appropriate for the data classification level",
        ],
      },
      {
        controlId: "ENISA-SPACE-8.1.5",
        controlName: "Secure Software Update Mechanisms",
        segment: "space",
        implementationSteps: [
          "Manage cryptographic keys for OTA update signature verification",
          "Implement key rollover procedures for update signing keys",
          "Ensure key compromise recovery procedures include update signing keys",
        ],
      },
    ],
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
    officialUrl: "https://www.iso.org/standard/27001",
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-6.1.3",
        controlName: "Monitoring of Space System Operations",
        segment: "ground",
        implementationSteps: [
          "Continuously monitor space system operations for security events across all segments",
          "Detect anomalous behaviors and unauthorized activities in real time",
          "Correlate events across ground station, mission control, and communication link systems",
          "Establish alert thresholds based on mission-specific risk profiles",
        ],
        maturityLevels: [
          { level: 1, description: "No security monitoring in place" },
          {
            level: 2,
            description: "Basic log collection without active monitoring",
          },
          {
            level: 3,
            description:
              "SIEM deployed with documented alert procedures covering ground and mission systems",
          },
          {
            level: 4,
            description:
              "24/7 monitoring with automated correlation and response playbooks",
          },
          {
            level: 5,
            description:
              "Advanced monitoring with ML-based detection and threat hunting capabilities",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-13.1.1",
        controlName: "Spacecraft Health Monitoring",
        segment: "space",
        implementationSteps: [
          "Implement continuous spacecraft health monitoring with security-aware anomaly detection",
          "Distinguish between hardware failures, environmental effects, and potential cyber attacks",
          "Integrate spacecraft health telemetry into the security monitoring infrastructure",
          "Define alert criteria for security-relevant spacecraft anomalies",
        ],
      },
      {
        controlId: "ENISA-SPACE-6.1.1",
        controlName: "Secure Satellite Operations Procedures",
        segment: "ground",
        implementationSteps: [
          "Document secure operating procedures for commanding, telemetry processing, and payload management",
          "Monitor for deviations from approved operating procedures",
          "Log all satellite operations activities for security review",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-13.1.2",
        controlName: "Orbital Anomaly Detection",
        segment: "space",
        implementationSteps: [
          "Monitor for unexpected orbital maneuvers and deviations from predicted parameters",
          "Detect proximity operations by uncooperative objects",
          "Integrate orbital anomaly detection with security monitoring systems",
          "Define alert thresholds for orbital parameter deviations",
        ],
      },
      {
        controlId: "ENISA-SPACE-13.1.1",
        controlName: "Spacecraft Health Monitoring",
        segment: "space",
        implementationSteps: [
          "Implement security-aware anomaly detection on spacecraft telemetry",
          "Baseline normal spacecraft behavior patterns for comparison",
          "Distinguish between hardware failures, environmental effects, and cyber attacks",
          "Use correlation of multiple telemetry parameters to reduce false positives",
        ],
      },
      {
        controlId: "ENISA-SPACE-7.1.2",
        controlName: "Anti-Jamming Measures",
        segment: "link",
        implementationSteps: [
          "Implement RF interference and jamming detection capabilities",
          "Deploy spread spectrum and frequency hopping techniques for resilience",
          "Monitor signal quality metrics to detect deliberate interference patterns",
          "Establish automated alerting for communication link anomalies",
        ],
      },
      {
        controlId: "ENISA-SPACE-7.1.3",
        controlName: "Anti-Spoofing for GNSS",
        segment: "user",
        implementationSteps: [
          "Deploy anti-spoofing mechanisms for GNSS-dependent operations",
          "Implement multi-source validation for navigation signals",
          "Monitor for anomalies indicating GNSS spoofing attacks",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-6.1.3",
        controlName: "Monitoring of Space System Operations",
        segment: "ground",
        implementationSteps: [
          "Collect security-relevant logs from all space system operations across all segments",
          "Aggregate logs from ground stations, mission control, and network infrastructure",
          "Ensure log sources cover commanding, telemetry processing, and link management activities",
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.3",
        controlName: "Forensic Capability for Space Systems",
        segment: "ground",
        implementationSteps: [
          "Retain logs with sufficient detail to support forensic investigation",
          "Include telemetry archives and command log histories in centralized logging",
          "Protect log integrity using immutable storage or cryptographic verification",
          "Ensure timestamp synchronization supports forensic timeline reconstruction",
        ],
      },
      {
        controlId: "ENISA-SPACE-3.1.5",
        controlName: "Session Management for Ground Systems",
        segment: "ground",
        implementationSteps: [
          "Log all session activities on ground system interfaces",
          "Include session start/end times, user identity, and actions performed",
          "Retain session logs for the minimum required retention period",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-11.1.1",
        controlName: "Mission Continuity Planning",
        segment: "ground",
        implementationSteps: [
          "Develop mission continuity plans covering loss of ground contact, spacecraft anomaly, and cyber attack scenarios",
          "Define recovery time and recovery point objectives for each mission-critical function",
          "Identify dependencies between space, ground, and link segments for continuity planning",
          "Maintain and version-control continuity plan documentation",
        ],
        maturityLevels: [
          { level: 1, description: "No business continuity plan exists" },
          {
            level: 2,
            description: "Informal recovery procedures for some scenarios",
          },
          {
            level: 3,
            description:
              "Documented BCP covering ground station loss, satellite anomalies, and alternative communication",
          },
          {
            level: 4,
            description:
              "Regularly tested BCP with defined RTO/RPO and automated failover capabilities",
          },
          {
            level: 5,
            description:
              "Resilient architecture with real-time failover and continuous continuity validation",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-11.1.2",
        controlName: "Ground Station Failover",
        segment: "ground",
        implementationSteps: [
          "Implement failover capabilities between primary and backup ground stations",
          "Define and test switchover procedures with maximum acceptable switchover times",
          "Establish agreements with partner ground station networks for emergency access",
          "Regularly test failover procedures to validate recovery capability",
        ],
      },
      {
        controlId: "ENISA-SPACE-11.1.3",
        controlName: "Emergency Operations Procedures",
        segment: "space",
        implementationSteps: [
          "Define emergency operations procedures for degraded modes of operation",
          "Include safe-mode commanding and manual backup procedures",
          "Establish emergency communication channels independent of primary infrastructure",
          "Train operations personnel on emergency procedures regularly",
        ],
      },
      {
        controlId: "ENISA-SPACE-11.1.5",
        controlName: "Business Continuity Testing",
        segment: "ground",
        implementationSteps: [
          "Regularly test BCP through tabletop exercises and functional tests",
          "Conduct full-scale simulations at least annually",
          "Incorporate lessons learned into plan updates",
          "Document test results and track remediation of identified gaps",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-6.1.8",
        controlName: "Backup and Recovery for Mission Data",
        segment: "ground",
        implementationSteps: [
          "Implement comprehensive backup procedures for mission-critical data",
          "Include telemetry archives, command histories, orbital parameters, and configuration baselines",
          "Store backups using the 3-2-1 rule with offsite replication",
          "Regularly test recovery procedures to verify backup integrity",
        ],
        maturityLevels: [
          { level: 1, description: "No backup procedures for mission data" },
          {
            level: 2,
            description: "Ad-hoc backups of some systems without testing",
          },
          {
            level: 3,
            description:
              "Documented backup policy with offsite storage and scheduled testing",
          },
          {
            level: 4,
            description:
              "Automated backups with regular recovery validation and defined RTO/RPO",
          },
          {
            level: 5,
            description:
              "Real-time replication with instant failover and continuous integrity verification",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-11.1.4",
        controlName: "Disaster Recovery for Space Operations",
        segment: "ground",
        implementationSteps: [
          "Implement disaster recovery capabilities with offsite data replication",
          "Establish alternative processing sites for mission control functions",
          "Define and test recovery time and recovery point objectives",
          "Include spacecraft configuration data in disaster recovery scope",
        ],
      },
      {
        controlId: "ENISA-SPACE-2.1.3",
        controlName: "Configuration Management for Space Systems",
        segment: "ground",
        implementationSteps: [
          "Include spacecraft and ground system configurations in backup scope",
          "Track and backup all authorized configuration baselines",
          "Ensure configuration recovery procedures are tested alongside data recovery",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-10.1.2",
        controlName: "Incident Response for Space Operations",
        segment: "ground",
        implementationSteps: [
          "Maintain incident response procedures specific to space operations",
          "Develop playbooks for satellite anomalies, ground station compromise, and link disruption",
          "Define roles, responsibilities, and communication channels for incident response",
          "Practice response procedures through regular tabletop exercises and simulations",
        ],
        maturityLevels: [
          { level: 1, description: "No incident response plan exists" },
          {
            level: 2,
            description:
              "Generic IT incident response plan without space-specific considerations",
          },
          {
            level: 3,
            description:
              "Documented space-specific IRP with severity classification and NCA escalation paths",
          },
          {
            level: 4,
            description:
              "Regularly tested IRP with dedicated response team and automated alerting",
          },
          {
            level: 5,
            description:
              "Mature incident response with threat hunting, advanced forensics, and continuous improvement",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.1",
        controlName: "Space Incident Detection and Classification",
        segment: "ground",
        implementationSteps: [
          "Establish incident detection capabilities with space-specific classification schemes",
          "Distinguish between cyber, physical, natural, and conjunction events",
          "Define severity levels and escalation criteria for each incident type",
          "Integrate detection with monitoring systems for rapid identification",
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.5",
        controlName: "Conjunction Event Response",
        segment: "space",
        implementationSteps: [
          "Define response procedures for conjunction events and collision risks",
          "Establish collision probability assessment thresholds for maneuver decisions",
          "Coordinate with SSA providers for conjunction warning data",
          "Include conjunction response in incident response tabletop exercises",
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.6",
        controlName: "Signal Interference Response",
        segment: "link",
        implementationSteps: [
          "Establish procedures for detecting and characterizing RF signal interference",
          "Define response actions for intentional and unintentional interference",
          "Include interference response playbooks in the incident response plan",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-10.1.4",
        controlName: "Incident Communication and Reporting",
        segment: "ground",
        implementationSteps: [
          "Implement NCA notification procedures meeting the 24-hour early warning deadline",
          "Pre-register with the national incident reporting portal",
          "Prepare early warning templates covering required notification fields",
          "Designate 24/7 contacts authorized to submit incident notifications",
        ],
        maturityLevels: [
          {
            level: 1,
            description: "No incident notification procedures in place",
          },
          {
            level: 2,
            description:
              "Awareness of notification requirements but no formal process",
          },
          {
            level: 3,
            description:
              "Registered with NCA, templates prepared, and 24/7 contacts designated",
          },
          {
            level: 4,
            description:
              "Automated notification workflow with pre-approved templates and tested processes",
          },
          {
            level: 5,
            description:
              "Integrated notification platform with real-time NCA coordination and cross-border capability",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.1",
        controlName: "Space Incident Detection and Classification",
        segment: "ground",
        implementationSteps: [
          "Define clear thresholds for what constitutes a significant incident requiring NCA notification",
          "Establish automated detection that can trigger notification workflows within the 24-hour window",
          "Classify incidents rapidly to determine reporting obligations",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-10.1.4",
        controlName: "Incident Communication and Reporting",
        segment: "ground",
        implementationSteps: [
          "Prepare detailed incident report templates meeting NIS2 Art. 23(4)(b) requirements",
          "Include impact assessment covering affected services, data, and stakeholders",
          "Document containment measures taken and their effectiveness",
          "Establish cross-border notification procedures for multi-jurisdiction operations",
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.2",
        controlName: "Incident Response for Space Operations",
        segment: "ground",
        implementationSteps: [
          "Execute incident response playbooks to gather information for the 72-hour detailed report",
          "Document affected space assets, ground systems, and communication links",
          "Record all containment and mitigation actions with timestamps",
          "Coordinate between technical response team and regulatory reporting function",
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.3",
        controlName: "Forensic Capability for Space Systems",
        segment: "ground",
        implementationSteps: [
          "Begin forensic investigation to support detailed notification content",
          "Preserve evidence including telemetry logs, command histories, and system images",
          "Document initial findings for inclusion in the 72-hour report",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-10.1.7",
        controlName: "Post-Incident Analysis",
        segment: "ground",
        implementationSteps: [
          "Conduct structured post-incident analysis for all significant incidents",
          "Capture lessons learned and update threat models based on findings",
          "Improve detection and response capabilities based on post-incident review",
          "Track remediation actions to completion and verify effectiveness",
        ],
        maturityLevels: [
          { level: 1, description: "No post-incident analysis performed" },
          {
            level: 2,
            description: "Informal debriefs after major incidents only",
          },
          {
            level: 3,
            description:
              "Structured root cause analysis with documented lessons learned and remediation tracking",
          },
          {
            level: 4,
            description:
              "Systematic post-incident process with metrics, trend analysis, and organizational learning",
          },
          {
            level: 5,
            description:
              "Continuous improvement cycle with proactive threat model updates and industry information sharing",
          },
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.3",
        controlName: "Forensic Capability for Space Systems",
        segment: "ground",
        implementationSteps: [
          "Complete forensic investigation including telemetry analysis and command log review",
          "Determine root cause and attribution where possible",
          "Document forensic findings in the final incident report",
          "Preserve forensic evidence for regulatory and legal requirements",
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.4",
        controlName: "Incident Communication and Reporting",
        segment: "ground",
        implementationSteps: [
          "Prepare comprehensive final report meeting NIS2 Art. 23(4)(d) one-month deadline",
          "Include root cause analysis, impact assessment, and remediation measures taken",
          "Submit final report to NCA and coordinate with EUSRN as required",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-12.1.1",
        controlName: "Regulatory Compliance Assessment",
        segment: "ground",
        implementationSteps: [
          "Include EUSRN registration in your regulatory compliance tracking",
          "Verify registration details are current and accurate",
          "Align EUSRN participation with NCA reporting obligations",
        ],
      },
      {
        controlId: "ENISA-SPACE-1.1.8",
        controlName: "Regulatory Compliance Mapping",
        segment: "ground",
        implementationSteps: [
          "Map EUSRN obligations to internal processes and responsible personnel",
          "Maintain traceability between EUSRN requirements and operational contacts",
          "Update compliance mapping when EUSRN requirements evolve",
        ],
      },
    ],
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
    enisaGuidance: [
      {
        controlId: "ENISA-SPACE-12.1.3",
        controlName: "External Audit Coordination",
        segment: "ground",
        implementationSteps: [
          "Coordinate with EUSRN for cross-sector cybersecurity exercises",
          "Facilitate regulatory audit access while protecting sensitive operational data",
          "Share exercise results and lessons learned with the EUSRN community",
        ],
      },
      {
        controlId: "ENISA-SPACE-10.1.4",
        controlName: "Incident Communication and Reporting",
        segment: "ground",
        implementationSteps: [
          "Participate in EUSRN coordinated incident response activities",
          "Share threat intelligence with the EUSRN network (anonymized where needed)",
          "Implement EUSRN recommendations for improving sector-wide resilience",
        ],
      },
      {
        controlId: "ENISA-SPACE-12.1.1",
        controlName: "Regulatory Compliance Assessment",
        segment: "ground",
        implementationSteps: [
          "Track EUSRN participation requirements as part of regulatory compliance",
          "Document attendance at coordination meetings and exercises",
          "Implement recommendations received through EUSRN channels",
        ],
      },
    ],
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
