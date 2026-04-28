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

// NIS2 Directive (EU) 2022/2555 Requirements Data — Space Sector Mapping
// Space is listed in Annex I, Sector 11 ("Space") as a sector of high criticality.

import {
  NIS2EntityClassification,
  NIS2Sector,
  NIS2SpaceSubSector,
  NIS2RequirementCategory,
  NIS2Requirement,
  NIS2AssessmentAnswers,
} from "@/lib/nis2-types";
import type { AssessmentField, ComplianceRule } from "@/lib/compliance/types";

// ─── NIS2 Requirements Array ───

export const NIS2_REQUIREMENTS: NIS2Requirement[] = [
  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(a) — Policies on risk analysis and information system security
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-001",
    articleRef: "NIS2 Art. 21(2)(a)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "policies_risk_analysis",
    title: "Information Security Policy for Space Systems",
    description:
      "A documented information security policy that covers ground segment infrastructure, space segment operations, and inter-segment communication links. The policy must be approved by senior management and reviewed at least annually.",
    complianceQuestion:
      "Do you have a documented and management-approved information security policy covering all space system segments?",
    spaceSpecificGuidance:
      "Space operators must address the unique threat landscape including RF interference, orbital debris-induced failures, and ASAT threats. The policy should explicitly cover ground stations, mission control centres, TT&C links, and any inter-satellite links.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 74",
    euSpaceActArticleNumbers: [74],
    enisaControlIds: ["3.1.1", "3.1.2"],
    iso27001Ref: "A.5.1",
    tips: [
      "Ensure the policy explicitly references ground segment, space segment, and link segment",
      "Include references to ECSS-Q-ST-80C for space product assurance",
      "Align review cycles with mission phases (design, launch, operations, decommission)",
    ],
    evidenceRequired: [
      "Signed information security policy document",
      "Management approval records",
      "Annual review and update history",
      "Policy communication records to all personnel",
    ],
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "policyExists",
        label: "IS policy document exists",
        type: "boolean" as const,
      },
      {
        id: "coversAllSegments",
        label: "Covers ground, space, and link segments",
        type: "boolean" as const,
        helpText:
          "Policy must explicitly address ground stations, mission control, TT&C links, and inter-satellite links",
      },
      {
        id: "managementApproved",
        label: "Approved by senior management",
        type: "boolean" as const,
      },
      {
        id: "annualReview",
        label: "Reviewed at least annually",
        type: "boolean" as const,
      },
      {
        id: "lastReviewDate",
        label: "Last review date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "policyExists",
        "coversAllSegments",
        "managementApproved",
        "annualReview",
      ],
      requiredNotEmpty: ["lastReviewDate"],
    },
  },
  {
    id: "nis2-002",
    articleRef: "NIS2 Art. 21(2)(a)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "policies_risk_analysis",
    title: "Cybersecurity Risk Analysis for Space Operations",
    description:
      "A structured risk analysis process that identifies, assesses, and prioritises cybersecurity risks specific to space operations. Must consider threats to confidentiality, integrity, and availability of mission-critical services.",
    complianceQuestion:
      "Do you conduct structured cybersecurity risk analyses that include space-specific threats and vulnerabilities?",
    spaceSpecificGuidance:
      "Risk analysis must account for space-domain-specific threats such as jamming, spoofing of GNSS signals, RF uplink command injection, ground station compromise, and supply chain manipulation of flight software. Use threat catalogues from ENISA and ESA for space-relevant scenarios.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 76-77",
    euSpaceActArticleNumbers: [76, 77],
    enisaControlIds: ["3.1.3", "3.2.1"],
    iso27001Ref: "6.1.2, A.5.1",
    tips: [
      "Include both cyber and physical threats to ground infrastructure",
      "Consider space weather events as availability risks",
      "Map risks to specific mission phases and operational modes",
    ],
    evidenceRequired: [
      "Risk assessment methodology document",
      "Risk register with space-specific threat scenarios",
      "Risk treatment plan with prioritised mitigations",
      "Evidence of periodic reassessment (at least annually)",
    ],
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "riskMethodologyDefined",
        label: "Risk assessment methodology documented",
        type: "boolean" as const,
      },
      {
        id: "spaceThreatsIncluded",
        label: "Includes space-specific threats (jamming, spoofing, ASAT)",
        type: "boolean" as const,
        helpText:
          "Must cover RF interference, GNSS spoofing, uplink command injection, and supply chain manipulation",
      },
      {
        id: "riskRegisterMaintained",
        label: "Risk register maintained with space-specific scenarios",
        type: "boolean" as const,
      },
      {
        id: "periodicReassessment",
        label: "Risk reassessment performed at least annually",
        type: "boolean" as const,
      },
      {
        id: "lastAssessmentDate",
        label: "Last risk assessment date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "riskMethodologyDefined",
        "spaceThreatsIncluded",
        "riskRegisterMaintained",
        "periodicReassessment",
      ],
      requiredNotEmpty: ["lastAssessmentDate"],
    },
  },
  {
    id: "nis2-003",
    articleRef: "NIS2 Art. 21(2)(a)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "policies_risk_analysis",
    title: "Risk Appetite and Tolerance Statement",
    description:
      "A formally documented risk appetite statement that defines acceptable levels of cybersecurity risk for space operations. Must be endorsed by the management body and communicated to relevant stakeholders.",
    complianceQuestion:
      "Has your management body formally defined and documented cybersecurity risk appetite and tolerance levels?",
    spaceSpecificGuidance:
      "Space operators should differentiate risk tolerance between mission-critical functions (TT&C, payload control) and support functions (corporate IT). Loss of commanding capability or unintended manoeuvres have safety-of-flight implications that demand near-zero risk tolerance.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 76",
    euSpaceActArticleNumbers: [76],
    iso27001Ref: "5.2, 6.1.1",
    tips: [
      "Distinguish risk tolerance for safety-critical vs. business-critical systems",
      "Align risk appetite with mission criticality and service level agreements",
      "Review risk appetite after significant incidents or mission changes",
    ],
    evidenceRequired: [
      "Risk appetite statement signed by management body",
      "Risk tolerance thresholds per system criticality level",
      "Board meeting minutes showing endorsement",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "appetiteDocumented",
        label: "Risk appetite statement formally documented",
        type: "boolean" as const,
      },
      {
        id: "boardEndorsed",
        label: "Endorsed by management body",
        type: "boolean" as const,
      },
      {
        id: "differentiatesCriticality",
        label:
          "Differentiates tolerance for safety-critical vs business-critical systems",
        type: "boolean" as const,
        helpText:
          "TT&C and payload control should have near-zero risk tolerance",
      },
      {
        id: "communicatedToStakeholders",
        label: "Communicated to relevant stakeholders",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "appetiteDocumented",
        "boardEndorsed",
        "differentiatesCriticality",
      ],
    },
  },
  {
    id: "nis2-004",
    articleRef: "NIS2 Art. 21(2)(a)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "policies_risk_analysis",
    title: "Space Segment Security Classification",
    description:
      "A classification scheme for space system assets that categorises ground segment, space segment, and link components by their criticality and required protection level.",
    complianceQuestion:
      "Have you classified all space system assets (ground, space, link segments) according to their security criticality?",
    spaceSpecificGuidance:
      "Classification must consider that space segment assets cannot be physically serviced once deployed. Ground stations, TT&C systems, and mission control centres should be classified at the highest tier. Payload data downlinks may have different classification depending on sensitivity.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79-80",
    euSpaceActArticleNumbers: [79, 80],
    enisaControlIds: ["3.3.1"],
    iso27001Ref: "A.5.9, A.5.10, A.5.12",
    tips: [
      "Create a classification matrix mapping asset types to protection levels",
      "Include inter-satellite links if operating a constellation",
      "Consider export control classification (ITAR/EAR) alongside security classification",
    ],
    evidenceRequired: [
      "Asset classification policy",
      "Complete asset inventory with assigned classifications",
      "Classification review records",
    ],
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "classificationSchemeExists",
        label: "Asset classification scheme documented",
        type: "boolean" as const,
      },
      {
        id: "allSegmentsCovered",
        label: "Covers ground, space, and link segment assets",
        type: "boolean" as const,
      },
      {
        id: "inventoryComplete",
        label: "Complete asset inventory with assigned classifications",
        type: "boolean" as const,
      },
      {
        id: "reviewedPeriodically",
        label: "Classifications reviewed periodically",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "classificationSchemeExists",
        "allSegmentsCovered",
        "inventoryComplete",
      ],
    },
  },
  {
    id: "nis2-005",
    articleRef: "NIS2 Art. 21(2)(a)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "policies_risk_analysis",
    title: "Periodic Risk Reassessment Cycle",
    description:
      "A defined schedule for periodic risk reassessment that accounts for changes in the threat landscape, mission profile, and regulatory requirements. Must include trigger-based reassessments for significant events.",
    complianceQuestion:
      "Do you perform scheduled risk reassessments at least annually, with trigger-based reviews for significant changes?",
    spaceSpecificGuidance:
      "Reassessments should be triggered by mission phase transitions (e.g., commissioning to operations), constellation expansion, new ground station deployment, or significant space weather events. Conjunction warnings from SSA providers should also trigger review of affected assets.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 77-78",
    euSpaceActArticleNumbers: [77, 78],
    iso27001Ref: "8.2, 10.2",
    tips: [
      "Define specific triggers for unscheduled reassessments (e.g., new vulnerability in flight software)",
      "Align reassessment cycles with mission milestones",
      "Include lessons learned from industry incidents in reassessment scope",
    ],
    evidenceRequired: [
      "Risk reassessment schedule",
      "Trigger criteria documentation",
      "Completed reassessment reports",
      "Change log of risk register updates",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "scheduleExists",
        label: "Reassessment schedule defined",
        type: "boolean" as const,
      },
      {
        id: "annualCycle",
        label: "Reassessments performed at least annually",
        type: "boolean" as const,
      },
      {
        id: "triggersDefined",
        label: "Trigger criteria for unscheduled reassessments defined",
        type: "boolean" as const,
        helpText:
          "E.g., mission phase transitions, constellation expansion, significant space weather events",
      },
      {
        id: "lastReassessmentDate",
        label: "Last reassessment date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: ["scheduleExists", "annualCycle", "triggersDefined"],
      requiredNotEmpty: ["lastReassessmentDate"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(b) — Incident handling
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-006",
    articleRef: "NIS2 Art. 21(2)(b)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "incident_handling",
    title: "Incident Detection for Space Systems",
    description:
      "Technical and procedural capabilities to detect cybersecurity incidents affecting space operations in a timely manner. Must cover all segments of the space system architecture.",
    complianceQuestion:
      "Do you have automated incident detection capabilities covering ground segment, link segment, and space segment telemetry?",
    spaceSpecificGuidance:
      "Detection must span ground-based IT/OT infrastructure and space segment telemetry anomalies. Monitor for unexpected commanding sequences, RF interference patterns, telemetry deviations from nominal baselines, and unauthorised access to mission control systems. Consider integration with SSA data for correlation.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 83-84",
    euSpaceActArticleNumbers: [83, 84],
    enisaControlIds: ["3.8.1", "3.8.2"],
    iso27001Ref: "A.8.15, A.8.16",
    tips: [
      "Establish behavioural baselines for spacecraft telemetry to detect anomalies",
      "Monitor ground station access logs and command logs in real-time",
      "Implement RF spectrum monitoring at ground stations for jamming detection",
    ],
    evidenceRequired: [
      "Detection system architecture documentation",
      "Alert rule definitions and thresholds",
      "Detection coverage matrix (ground/space/link)",
      "Mean time to detect (MTTD) metrics",
    ],
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "detectionCapabilityExists",
        label: "Automated incident detection systems deployed",
        type: "boolean" as const,
      },
      {
        id: "coversGroundSegment",
        label: "Detection covers ground segment IT/OT",
        type: "boolean" as const,
      },
      {
        id: "coversSpaceTelemetry",
        label: "Detection covers space segment telemetry anomalies",
        type: "boolean" as const,
      },
      {
        id: "rfMonitoring",
        label: "RF spectrum monitoring for jamming detection",
        type: "boolean" as const,
        helpText:
          "Monitor ground station RF environment for interference patterns",
      },
      {
        id: "mttdHours",
        label: "Mean time to detect (MTTD) in hours",
        type: "number" as const,
        unit: "hours",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "detectionCapabilityExists",
        "coversGroundSegment",
        "coversSpaceTelemetry",
      ],
      numberThresholds: { mttdHours: { max: 24 } },
    },
  },
  {
    id: "nis2-007",
    articleRef: "NIS2 Art. 21(2)(b)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "incident_handling",
    title: "Incident Response Procedures for Space Operations",
    description:
      "Documented incident response procedures that define roles, escalation paths, containment strategies, and recovery actions specifically tailored to space operations incidents.",
    complianceQuestion:
      "Do you have documented incident response procedures that address space-specific incident types?",
    spaceSpecificGuidance:
      "Procedures must cover space-unique scenarios including loss of contact with spacecraft, unauthorised commanding, telemetry manipulation, ground station compromise, and RF interference. Include safe-mode triggering criteria and autonomous spacecraft protection measures.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 83, Art. 89",
    euSpaceActArticleNumbers: [83, 89],
    enisaControlIds: ["3.8.3", "3.8.4"],
    iso27001Ref: "A.5.24, A.5.25, A.5.26",
    tips: [
      "Define specific playbooks for: loss of contact, unauthorised commands, ground station breach",
      "Include decision trees for safe-mode activation during suspected cyber incidents",
      "Coordinate response procedures with launch service providers and ground station partners",
    ],
    evidenceRequired: [
      "Incident response plan covering space-specific scenarios",
      "Incident classification and severity matrix",
      "Contact lists and escalation procedures",
      "Tabletop exercise records",
    ],
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "irpExists",
        label: "Incident response plan documented",
        type: "boolean" as const,
      },
      {
        id: "spaceScenariosCovered",
        label: "Covers space-specific incident types",
        type: "boolean" as const,
        helpText:
          "E.g., loss of contact, unauthorised commanding, telemetry manipulation, RF interference",
      },
      {
        id: "rolesAndEscalation",
        label: "Roles and escalation paths defined",
        type: "boolean" as const,
      },
      {
        id: "safeModeCriteria",
        label: "Safe-mode triggering criteria documented",
        type: "boolean" as const,
      },
      {
        id: "lastDrillDate",
        label: "Last incident response drill date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "irpExists",
        "spaceScenariosCovered",
        "rolesAndEscalation",
        "safeModeCriteria",
      ],
      requiredNotEmpty: ["lastDrillDate"],
    },
  },
  {
    id: "nis2-008",
    articleRef: "NIS2 Art. 21(2)(b)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "incident_handling",
    title: "Space-Specific Incident Classification Scheme",
    description:
      "An incident classification taxonomy that captures space-domain-specific incident types alongside conventional cybersecurity incidents. Must define severity levels, impact criteria, and reporting thresholds.",
    complianceQuestion:
      "Do you have an incident classification scheme that includes space-specific incident categories such as commanding anomalies, RF interference, and loss of contact?",
    spaceSpecificGuidance:
      "Classification must distinguish between: (1) ground segment cyber incidents, (2) space segment anomalies with potential cyber causes, (3) link segment interference, and (4) supply chain compromise affecting operations. Severity levels should account for reversibility - space segment impacts are often irreversible.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 84, Art. 89-90",
    euSpaceActArticleNumbers: [84, 89, 90],
    enisaControlIds: ["3.8.5"],
    iso27001Ref: "A.5.24",
    tips: [
      "Include hybrid incident types where the root cause may be cyber or space environment",
      "Define clear thresholds for mandatory reporting to NCA (NIS2 Art. 23 significant incident criteria)",
      "Map incident types to required notification timelines",
    ],
    evidenceRequired: [
      "Incident classification taxonomy document",
      "Severity level definitions with impact criteria",
      "Reporting threshold definitions",
      "Examples of classified past incidents or simulated scenarios",
    ],
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "taxonomyExists",
        label: "Incident classification taxonomy documented",
        type: "boolean" as const,
      },
      {
        id: "spaceCategories",
        label:
          "Includes space-specific categories (commanding anomalies, RF interference, loss of contact)",
        type: "boolean" as const,
      },
      {
        id: "severityLevels",
        label: "Severity levels defined with impact criteria",
        type: "boolean" as const,
      },
      {
        id: "reportingThresholds",
        label: "Reporting thresholds mapped to NIS2 Art. 23",
        type: "boolean" as const,
        helpText: "Clear thresholds for mandatory reporting to NCA",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "taxonomyExists",
        "spaceCategories",
        "severityLevels",
        "reportingThresholds",
      ],
    },
  },
  {
    id: "nis2-009",
    articleRef: "NIS2 Art. 21(2)(b)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "incident_handling",
    title: "Incident Containment and Eradication",
    description:
      "Documented procedures for containing and eradicating cybersecurity incidents, including isolation of affected systems and controlled recovery to prevent recurrence.",
    complianceQuestion:
      "Do you have defined containment and eradication procedures for cybersecurity incidents affecting space operations?",
    spaceSpecificGuidance:
      "Containment in space operations is constrained by orbital mechanics and limited spacecraft reprogrammability. Procedures should include: commanding lockout (preventing further unauthorised commands), ground station network isolation, switching to backup TT&C paths, and triggering spacecraft safe-mode as a last resort.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 85",
    euSpaceActArticleNumbers: [85],
    enisaControlIds: ["3.8.6"],
    iso27001Ref: "A.5.26",
    tips: [
      "Pre-plan spacecraft safe-mode activation criteria for cyber events",
      "Document network isolation procedures for ground segment with minimal mission impact",
      "Maintain verified clean firmware images for ground system recovery",
    ],
    evidenceRequired: [
      "Containment procedure documentation",
      "Eradication and recovery procedures",
      "Clean baseline/image repository evidence",
      "Post-incident verification checklists",
    ],
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "containmentProcedures",
        label: "Containment procedures documented",
        type: "boolean" as const,
      },
      {
        id: "commandingLockout",
        label: "Commanding lockout procedure defined",
        type: "boolean" as const,
        helpText: "Ability to prevent further unauthorised commands",
      },
      {
        id: "networkIsolation",
        label: "Ground station network isolation procedures in place",
        type: "boolean" as const,
      },
      {
        id: "cleanBaselines",
        label: "Clean firmware/software baselines maintained for recovery",
        type: "boolean" as const,
      },
      {
        id: "verificationChecklist",
        label: "Post-incident verification checklist exists",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "containmentProcedures",
        "commandingLockout",
        "networkIsolation",
        "cleanBaselines",
      ],
    },
  },
  {
    id: "nis2-010",
    articleRef: "NIS2 Art. 21(2)(b)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "incident_handling",
    title: "Post-Incident Review and Lessons Learned",
    description:
      "A formal process for conducting post-incident reviews, documenting lessons learned, and implementing improvements to prevent recurrence of similar incidents.",
    complianceQuestion:
      "Do you conduct formal post-incident reviews with documented lessons learned and follow-up actions?",
    spaceSpecificGuidance:
      "Post-incident reviews for space operations should include analysis of whether the incident could have impacted other operators (e.g., through conjunction risk or shared ground infrastructure). Findings should be shared with CSIRT and industry peers through appropriate channels such as the EUSRN.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 92",
    euSpaceActArticleNumbers: [92],
    iso27001Ref: "A.5.27, 10.2",
    tips: [
      "Include a root cause analysis methodology (e.g., 5-Whys, fault tree analysis)",
      "Track improvement actions to completion with assigned owners",
      "Consider sharing anonymised lessons learned with the space community",
    ],
    evidenceRequired: [
      "Post-incident review reports",
      "Lessons learned register",
      "Improvement action tracking records",
      "Evidence of implemented changes",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "reviewProcessExists",
        label: "Formal post-incident review process defined",
        type: "boolean" as const,
      },
      {
        id: "rcaMethodology",
        label: "Root cause analysis methodology used",
        type: "boolean" as const,
        helpText: "E.g., 5-Whys, fault tree analysis",
      },
      {
        id: "lessonsLearnedRegister",
        label: "Lessons learned register maintained",
        type: "boolean" as const,
      },
      {
        id: "improvementsTracked",
        label: "Improvement actions tracked to completion",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "reviewProcessExists",
        "rcaMethodology",
        "lessonsLearnedRegister",
        "improvementsTracked",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(c) — Business continuity and crisis management
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-011",
    articleRef: "NIS2 Art. 21(2)(c)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "business_continuity",
    title: "Business Continuity Plan for Mission-Critical Ground Operations",
    description:
      "A documented business continuity plan that ensures continued operation of mission-critical ground segment functions during and after disruptive cybersecurity incidents.",
    complianceQuestion:
      "Do you have a tested business continuity plan for mission-critical ground operations including TT&C and mission control?",
    spaceSpecificGuidance:
      "The BCP must address loss of primary ground station, mission control centre failure, and communication path disruption. Include procedures for transferring operations to backup facilities, maintaining minimum safe commanding capability, and protecting orbital slot/frequency rights during outages.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 85",
    euSpaceActArticleNumbers: [85],
    enisaControlIds: ["3.9.1", "3.9.2"],
    iso27001Ref: "A.5.29, A.5.30",
    tips: [
      "Identify maximum tolerable downtime for each mission-critical function",
      "Plan for graceful degradation: full operations, reduced operations, safe-mode, emergency-only",
      "Test failover to backup ground stations at least annually",
    ],
    evidenceRequired: [
      "Business continuity plan document",
      "Business impact analysis for space operations",
      "Recovery time and point objectives (RTO/RPO)",
      "Annual BCP test records and results",
    ],
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "bcpExists",
        label: "Business continuity plan documented",
        type: "boolean" as const,
      },
      {
        id: "biaCompleted",
        label: "Business impact analysis completed for space operations",
        type: "boolean" as const,
      },
      {
        id: "rtoRpoDefined",
        label: "Recovery time and point objectives (RTO/RPO) defined",
        type: "boolean" as const,
      },
      {
        id: "backupFacilitiesIdentified",
        label: "Backup ground stations/facilities identified",
        type: "boolean" as const,
      },
      {
        id: "lastBcpTestDate",
        label: "Last BCP test date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "bcpExists",
        "biaCompleted",
        "rtoRpoDefined",
        "backupFacilitiesIdentified",
      ],
      requiredNotEmpty: ["lastBcpTestDate"],
    },
  },
  {
    id: "nis2-012",
    articleRef: "NIS2 Art. 21(2)(c)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "business_continuity",
    title: "Backup and Disaster Recovery for TT&C Systems",
    description:
      "Robust backup and disaster recovery procedures for Telemetry, Tracking, and Command (TT&C) systems, ensuring restoration of spacecraft commanding capability within defined recovery time objectives.",
    complianceQuestion:
      "Do you maintain and regularly test backup and disaster recovery procedures for TT&C and mission control systems?",
    spaceSpecificGuidance:
      "TT&C backup must include: alternative ground station agreements, backup command encryption keys stored securely off-site, redundant orbit determination capabilities, and verified backup copies of spacecraft command databases. Recovery procedures must be tested with actual spacecraft or high-fidelity simulators.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure", "satellite_communications"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 85",
    euSpaceActArticleNumbers: [85],
    enisaControlIds: ["3.9.3"],
    iso27001Ref: "A.8.13",
    tips: [
      "Maintain agreements with at least one backup ground station provider",
      "Test full commanding chain recovery (not just data restoration)",
      "Store backup command encryption keys in geographically separate HSMs",
    ],
    evidenceRequired: [
      "Backup policy and procedures for TT&C",
      "Backup ground station agreements",
      "Disaster recovery test records with actual or simulated commanding",
      "Backup verification logs",
    ],
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "backupProceduresExist",
        label: "TT&C backup procedures documented",
        type: "boolean" as const,
      },
      {
        id: "backupGroundStation",
        label: "Backup ground station agreement in place",
        type: "boolean" as const,
      },
      {
        id: "keysStoredOffsite",
        label: "Command encryption keys stored securely off-site",
        type: "boolean" as const,
        helpText: "Geographically separate HSMs for backup key storage",
      },
      {
        id: "drTestedWithSpacecraft",
        label: "DR tested with actual spacecraft or high-fidelity simulator",
        type: "boolean" as const,
      },
      {
        id: "lastDrTestDate",
        label: "Last disaster recovery test date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "backupProceduresExist",
        "backupGroundStation",
        "keysStoredOffsite",
        "drTestedWithSpacecraft",
      ],
      requiredNotEmpty: ["lastDrTestDate"],
    },
  },
  {
    id: "nis2-013",
    articleRef: "NIS2 Art. 21(2)(c)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "business_continuity",
    title: "Crisis Management for Space Segment Anomalies",
    description:
      "A crisis management framework for handling severe space segment anomalies that may have cybersecurity origins, including command authority delegation and coordination with external stakeholders.",
    complianceQuestion:
      "Do you have a crisis management framework that addresses severe space segment anomalies potentially caused by cyber incidents?",
    spaceSpecificGuidance:
      "Crisis management must address scenarios where spacecraft behaviour deviates from expected norms due to potential cyber compromise: unintended manoeuvres creating conjunction risks, loss of attitude control, payload anomalies, or complete loss of contact. Include coordination with national space agencies, SSA providers, and potentially affected co-orbital operators.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 85, Art. 89",
    euSpaceActArticleNumbers: [85, 89],
    enisaControlIds: ["3.9.4"],
    iso27001Ref: "A.5.29",
    tips: [
      "Define clear command authority delegation for crisis situations",
      "Establish pre-arranged communication channels with national space agencies",
      "Include conjunction assessment procedures when spacecraft behaviour is anomalous",
    ],
    evidenceRequired: [
      "Crisis management plan",
      "Command authority delegation matrix",
      "External stakeholder contact lists and communication protocols",
      "Crisis exercise records",
    ],
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "crisisFrameworkExists",
        label: "Crisis management framework documented",
        type: "boolean" as const,
      },
      {
        id: "commandDelegation",
        label: "Command authority delegation matrix defined",
        type: "boolean" as const,
      },
      {
        id: "externalCoordination",
        label:
          "Pre-arranged coordination with national space agencies and SSA providers",
        type: "boolean" as const,
      },
      {
        id: "conjunctionProcedures",
        label:
          "Conjunction assessment procedures for anomalous spacecraft behaviour",
        type: "boolean" as const,
      },
      {
        id: "lastCrisisExerciseDate",
        label: "Last crisis exercise date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "crisisFrameworkExists",
        "commandDelegation",
        "externalCoordination",
      ],
      requiredNotEmpty: ["lastCrisisExerciseDate"],
    },
  },
  {
    id: "nis2-014",
    articleRef: "NIS2 Art. 21(2)(c)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "business_continuity",
    title: "Continuity Testing and Exercises",
    description:
      "Regular testing of business continuity and crisis management plans through tabletop exercises, functional drills, and full-scale simulations relevant to space operations.",
    complianceQuestion:
      "Do you conduct regular business continuity and crisis management exercises that include cyber-space scenarios?",
    spaceSpecificGuidance:
      "Exercises should simulate combined cyber-space scenarios such as ground station ransomware during a conjunction warning, loss of TT&C during a critical manoeuvre window, or coordinated attacks on multiple ground stations. Include scenarios requiring coordination with SSA providers and other operators.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 85, Art. 88",
    euSpaceActArticleNumbers: [85, 88],
    enisaControlIds: ["3.9.5"],
    iso27001Ref: "A.5.29",
    tips: [
      "Conduct at least one tabletop exercise and one functional drill per year",
      "Vary scenarios to cover different incident types and severity levels",
      "Include external partners (ground station providers, SSA services) in exercises",
    ],
    evidenceRequired: [
      "Exercise schedule and plans",
      "Exercise after-action reports",
      "Improvement actions from exercises",
      "Participation records",
    ],
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "exerciseScheduleExists",
        label: "Exercise schedule defined",
        type: "boolean" as const,
      },
      {
        id: "tabletopAnnual",
        label: "Tabletop exercise conducted at least annually",
        type: "boolean" as const,
      },
      {
        id: "functionalDrillAnnual",
        label: "Functional drill conducted at least annually",
        type: "boolean" as const,
      },
      {
        id: "cyberSpaceScenarios",
        label: "Exercises include combined cyber-space scenarios",
        type: "boolean" as const,
        helpText: "E.g., ground station ransomware during conjunction warning",
      },
      {
        id: "lastExerciseDate",
        label: "Last exercise date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "exerciseScheduleExists",
        "tabletopAnnual",
        "cyberSpaceScenarios",
      ],
      requiredNotEmpty: ["lastExerciseDate"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(d) — Supply chain security
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-015",
    articleRef: "NIS2 Art. 21(2)(d)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "supply_chain",
    title: "Supplier Risk Assessment for Space Components",
    description:
      "A structured process for assessing cybersecurity risks associated with suppliers of space hardware components, flight software, ground systems, and operational services.",
    complianceQuestion:
      "Do you conduct cybersecurity risk assessments of critical suppliers including space hardware and flight software providers?",
    spaceSpecificGuidance:
      "Space supply chains involve highly specialised vendors for reaction wheels, star trackers, transponders, and flight computers. Assess suppliers for: secure development practices, hardware provenance (counterfeit risk), firmware integrity, and geopolitical risks. Consider that some components have decades-long lead times making supplier switching difficult.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 73",
    euSpaceActArticleNumbers: [73],
    enisaControlIds: ["3.7.1", "3.7.2"],
    iso27001Ref: "A.5.19, A.5.20",
    tips: [
      "Categorise suppliers by criticality: flight-critical, mission-critical, support",
      "Include hardware provenance verification to mitigate counterfeit component risk",
      "Assess geopolitical risks for suppliers of ITAR/EAR-controlled components",
    ],
    evidenceRequired: [
      "Supplier risk assessment methodology",
      "Critical supplier registry with risk ratings",
      "Supplier security assessment questionnaires and responses",
      "Supplier audit reports (where applicable)",
    ],
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "supplierRiskMethodology",
        label: "Supplier risk assessment methodology defined",
        type: "boolean" as const,
      },
      {
        id: "criticalSupplierRegistry",
        label: "Critical supplier registry maintained with risk ratings",
        type: "boolean" as const,
      },
      {
        id: "provenanceVerification",
        label: "Hardware provenance verification performed",
        type: "boolean" as const,
        helpText:
          "Mitigates counterfeit component risk for flight-grade electronics",
      },
      {
        id: "geopoliticalRisksAssessed",
        label: "Geopolitical risks assessed for ITAR/EAR-controlled components",
        type: "boolean" as const,
      },
      {
        id: "criticalSupplierCount",
        label: "Number of critical suppliers assessed",
        type: "number" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "supplierRiskMethodology",
        "criticalSupplierRegistry",
        "provenanceVerification",
      ],
      numberThresholds: { criticalSupplierCount: { min: 1 } },
    },
  },
  {
    id: "nis2-016",
    articleRef: "NIS2 Art. 21(2)(d)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "supply_chain",
    title: "Security Requirements for Subcontractors",
    description:
      "Defined cybersecurity requirements that must be flowed down to subcontractors and service providers involved in space operations, including contractual obligations and right-to-audit clauses.",
    complianceQuestion:
      "Do your contracts with critical subcontractors include specific cybersecurity requirements and right-to-audit clauses?",
    spaceSpecificGuidance:
      "Subcontractor requirements must cover: ground station service providers (data handling, access controls), launch service providers (pre-launch data protection), mission operations service providers (command authentication), and cloud/hosting providers for ground segment infrastructure.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 73",
    euSpaceActArticleNumbers: [73],
    enisaControlIds: ["3.7.3"],
    iso27001Ref: "A.5.20, A.5.21, A.5.22",
    tips: [
      "Include security requirements in all procurement and subcontracting agreements",
      "Define incident notification obligations for subcontractors (aligned with NIS2 timelines)",
      "Require evidence of security certifications from critical subcontractors",
    ],
    evidenceRequired: [
      "Standard security clauses for contracts",
      "Executed contracts with security provisions",
      "Right-to-audit clause evidence",
      "Subcontractor compliance status tracking",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "securityClausesStandard",
        label: "Standard security clauses in contracts",
        type: "boolean" as const,
      },
      {
        id: "rightToAudit",
        label: "Right-to-audit clauses included",
        type: "boolean" as const,
      },
      {
        id: "incidentNotificationReqs",
        label: "Incident notification obligations defined for subcontractors",
        type: "boolean" as const,
        helpText: "Aligned with NIS2 24h/72h reporting timelines",
      },
      {
        id: "complianceTracked",
        label: "Subcontractor compliance status tracked",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "securityClausesStandard",
        "rightToAudit",
        "incidentNotificationReqs",
        "complianceTracked",
      ],
    },
  },
  {
    id: "nis2-017",
    articleRef: "NIS2 Art. 21(2)(d)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "supply_chain",
    title: "Secure Software Development for Flight Software",
    description:
      "Security requirements and verification procedures for flight software developed by suppliers or in-house, including code review, testing, and integrity verification prior to upload.",
    complianceQuestion:
      "Do you enforce secure software development practices and integrity verification for all flight software?",
    spaceSpecificGuidance:
      "Flight software is uploaded to spacecraft and typically cannot be fully replaced post-launch. Require suppliers to follow secure coding standards (MISRA C, CERT C), conduct static and dynamic analysis, and provide software bills of materials (SBOM). Verify binary integrity before every upload to the spacecraft.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["spacecraft_manufacturing", "satellite_communications"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 73, Art. 79",
    euSpaceActArticleNumbers: [73, 79],
    enisaControlIds: ["3.6.1", "3.6.2"],
    iso27001Ref: "A.8.25, A.8.26, A.8.27",
    tips: [
      "Require SBOMs from all flight software suppliers",
      "Implement cryptographic signing of flight software builds",
      "Conduct independent security testing of flight software before acceptance",
    ],
    evidenceRequired: [
      "Secure development lifecycle documentation",
      "Software bills of materials (SBOMs)",
      "Static and dynamic analysis reports",
      "Code signing and integrity verification records",
    ],
    severity: "critical",
    implementationTimeWeeks: 10,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "secureCodingStandards",
        label: "Secure coding standards enforced (MISRA C, CERT C)",
        type: "boolean" as const,
      },
      {
        id: "sbomRequired",
        label: "Software bills of materials (SBOMs) required from suppliers",
        type: "boolean" as const,
      },
      {
        id: "staticDynamicAnalysis",
        label: "Static and dynamic code analysis performed",
        type: "boolean" as const,
      },
      {
        id: "cryptographicSigning",
        label: "Flight software builds cryptographically signed",
        type: "boolean" as const,
      },
      {
        id: "integrityVerifiedPreUpload",
        label: "Binary integrity verified before every spacecraft upload",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "secureCodingStandards",
        "sbomRequired",
        "staticDynamicAnalysis",
        "cryptographicSigning",
        "integrityVerifiedPreUpload",
      ],
    },
  },
  {
    id: "nis2-018",
    articleRef: "NIS2 Art. 21(2)(d)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "supply_chain",
    title: "Supply Chain Incident Notification",
    description:
      "Procedures for receiving, assessing, and acting on cybersecurity incident notifications from suppliers, and for notifying affected customers when incidents impact delivered products or services.",
    complianceQuestion:
      "Do you have bidirectional incident notification procedures with your critical suppliers?",
    spaceSpecificGuidance:
      "Space supply chains involve long-lifecycle components where vulnerabilities may be discovered years after delivery. Ensure suppliers commit to notifying you of vulnerabilities in delivered components (including embedded software), and establish procedures to assess impact on deployed space assets.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 73, Art. 89-90",
    euSpaceActArticleNumbers: [73, 89, 90],
    enisaControlIds: ["3.7.4"],
    iso27001Ref: "A.5.21",
    tips: [
      "Include notification timelines in supplier contracts (aligned with NIS2 24h/72h requirements)",
      "Maintain a mapping of supplier components to deployed space assets for impact assessment",
      "Establish a vulnerability disclosure coordination process with key suppliers",
    ],
    evidenceRequired: [
      "Supplier incident notification procedures",
      "Contractual notification obligations",
      "Component-to-asset mapping documentation",
      "Records of supplier notifications received and actions taken",
    ],
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "bidirectionalNotification",
        label: "Bidirectional incident notification procedures established",
        type: "boolean" as const,
      },
      {
        id: "contractualTimelines",
        label: "Notification timelines in supplier contracts",
        type: "boolean" as const,
        helpText: "Aligned with NIS2 24h/72h requirements",
      },
      {
        id: "componentAssetMapping",
        label: "Supplier components mapped to deployed space assets",
        type: "boolean" as const,
      },
      {
        id: "vulnerabilityDisclosure",
        label:
          "Vulnerability disclosure coordination process with key suppliers",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "bidirectionalNotification",
        "contractualTimelines",
        "componentAssetMapping",
      ],
    },
  },
  {
    id: "nis2-019",
    articleRef: "NIS2 Art. 21(2)(d)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "supply_chain",
    title: "Hardware Provenance and Anti-Counterfeit Measures",
    description:
      "Processes to verify the provenance and authenticity of hardware components used in space systems, mitigating the risk of counterfeit or tampered components entering the supply chain.",
    complianceQuestion:
      "Do you verify hardware provenance and implement anti-counterfeit measures for critical space components?",
    spaceSpecificGuidance:
      "Counterfeit electronic components pose significant reliability and security risks in space systems. Implement incoming inspection, lot testing, and provenance tracking for radiation-hardened components, FPGAs, and other flight-grade electronics. Consider the ECSS-Q-ST-60C standard for EEE components.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["spacecraft_manufacturing"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 73",
    euSpaceActArticleNumbers: [73],
    iso27001Ref: "A.5.19",
    tips: [
      "Source flight-grade components only from authorised distributors",
      "Implement incoming inspection and testing for critical components",
      "Maintain chain of custody records for all flight hardware",
    ],
    evidenceRequired: [
      "Anti-counterfeit policy",
      "Approved supplier list for flight components",
      "Incoming inspection and test records",
      "Component traceability documentation",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "antiCounterfeitPolicy",
        label: "Anti-counterfeit policy documented",
        type: "boolean" as const,
      },
      {
        id: "authorisedDistributorsOnly",
        label:
          "Flight-grade components sourced from authorised distributors only",
        type: "boolean" as const,
      },
      {
        id: "incomingInspection",
        label: "Incoming inspection and testing for critical components",
        type: "boolean" as const,
      },
      {
        id: "chainOfCustody",
        label: "Chain of custody records maintained for flight hardware",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "antiCounterfeitPolicy",
        "authorisedDistributorsOnly",
        "incomingInspection",
        "chainOfCustody",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(e) — Network and IS acquisition, development, maintenance
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-020",
    articleRef: "NIS2 Art. 21(2)(e)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "network_acquisition",
    title: "Secure Development Lifecycle for Ground Segment Software",
    description:
      "Implementation of a secure software development lifecycle (SSDLC) for all ground segment software including mission control systems, data processing chains, and operator interfaces.",
    complianceQuestion:
      "Do you follow a secure software development lifecycle for ground segment and mission control software?",
    spaceSpecificGuidance:
      "Ground segment software often interfaces directly with spacecraft commanding and telemetry processing. SSDLC must include threat modelling for space-specific interfaces, security requirements derived from mission criticality, and security testing including fuzzing of CCSDS protocol parsers.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79, Art. 82",
    euSpaceActArticleNumbers: [79, 82],
    enisaControlIds: ["3.6.1", "3.6.3"],
    iso27001Ref: "A.8.25, A.8.26",
    tips: [
      "Implement threat modelling for all ground-to-space interfaces",
      "Include fuzz testing of CCSDS and proprietary protocol parsers",
      "Enforce code review for all changes to commanding and telemetry processing code",
    ],
    evidenceRequired: [
      "SSDLC policy and procedures",
      "Threat model documentation for ground segment",
      "Security testing reports",
      "Code review records for security-critical modules",
    ],
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "ssdlcImplemented",
        label: "Secure software development lifecycle (SSDLC) implemented",
        type: "boolean" as const,
      },
      {
        id: "threatModellingDone",
        label: "Threat modelling performed for space-specific interfaces",
        type: "boolean" as const,
      },
      {
        id: "securityRequirementsDerived",
        label: "Security requirements derived from mission criticality",
        type: "boolean" as const,
      },
      {
        id: "protocolFuzzing",
        label: "Fuzz testing of CCSDS protocol parsers performed",
        type: "boolean" as const,
      },
      {
        id: "codeReviewEnforced",
        label: "Code review enforced for commanding/telemetry code",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "ssdlcImplemented",
        "threatModellingDone",
        "securityRequirementsDerived",
        "codeReviewEnforced",
      ],
    },
  },
  {
    id: "nis2-021",
    articleRef: "NIS2 Art. 21(2)(e)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "network_acquisition",
    title: "Vulnerability Management for Ground Segment",
    description:
      "A systematic process for identifying, evaluating, and remediating vulnerabilities in ground segment infrastructure, including operating systems, applications, and network equipment.",
    complianceQuestion:
      "Do you have a vulnerability management programme covering all ground segment systems?",
    spaceSpecificGuidance:
      "Ground segment systems may use specialised RTOS, embedded systems, and legacy software that standard vulnerability scanners cannot assess. Supplement automated scanning with manual assessment of mission-specific software. Coordinate patching windows with mission operations to avoid disruption during critical passes.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79-80",
    euSpaceActArticleNumbers: [79, 80],
    enisaControlIds: ["3.6.4"],
    iso27001Ref: "A.8.8",
    tips: [
      "Define SLAs for vulnerability remediation based on severity and exploitability",
      "Maintain an exception process for systems that cannot be patched (with compensating controls)",
      "Coordinate patch deployment with mission operations schedules",
    ],
    evidenceRequired: [
      "Vulnerability management policy",
      "Scan reports and remediation tracking",
      "Patch management records",
      "Exception register with compensating controls",
    ],
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "vulnMgmtProgramme",
        label: "Vulnerability management programme in place",
        type: "boolean" as const,
      },
      {
        id: "automatedScanning",
        label: "Automated vulnerability scanning performed",
        type: "boolean" as const,
      },
      {
        id: "manualAssessment",
        label: "Manual assessment for mission-specific software",
        type: "boolean" as const,
        helpText:
          "Supplement automated scanning for specialised RTOS, embedded, and legacy systems",
      },
      {
        id: "remediationSlas",
        label: "Remediation SLAs defined by severity",
        type: "boolean" as const,
      },
      {
        id: "exceptionProcess",
        label:
          "Exception process with compensating controls for unpatchable systems",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "vulnMgmtProgramme",
        "automatedScanning",
        "remediationSlas",
      ],
    },
  },
  {
    id: "nis2-022",
    articleRef: "NIS2 Art. 21(2)(e)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "network_acquisition",
    title: "Patch Management for Mission Control Systems",
    description:
      "A controlled patch management process for mission control and ground station systems that balances security updates with operational continuity requirements.",
    complianceQuestion:
      "Do you have a patch management process that ensures timely updates while maintaining mission operations continuity?",
    spaceSpecificGuidance:
      "Patching mission control systems requires careful planning due to 24/7 operational requirements and potential impact on spacecraft commanding. Implement staged rollout with testing on representative environments, maintain rollback capability, and schedule patches outside critical mission windows (e.g., not during station-keeping manoeuvres).",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79",
    euSpaceActArticleNumbers: [79],
    enisaControlIds: ["3.6.5"],
    iso27001Ref: "A.8.8, A.8.32",
    tips: [
      "Maintain a test environment that mirrors the operational mission control configuration",
      "Define emergency patching procedures for critical zero-day vulnerabilities",
      "Document compensating controls for systems where patches cannot be immediately applied",
    ],
    evidenceRequired: [
      "Patch management policy and procedures",
      "Patch testing records",
      "Patch deployment logs with rollback capability evidence",
      "Emergency patch procedures",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "patchPolicyExists",
        label: "Patch management policy documented",
        type: "boolean" as const,
      },
      {
        id: "testEnvironment",
        label: "Test environment mirrors operational configuration",
        type: "boolean" as const,
      },
      {
        id: "stagedRollout",
        label: "Staged rollout with rollback capability",
        type: "boolean" as const,
      },
      {
        id: "emergencyPatchProcess",
        label: "Emergency patching procedures for zero-day vulnerabilities",
        type: "boolean" as const,
      },
      {
        id: "patchCompliancePercent",
        label: "Patch compliance rate (%)",
        type: "number" as const,
        unit: "%",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "patchPolicyExists",
        "testEnvironment",
        "stagedRollout",
        "emergencyPatchProcess",
      ],
      numberThresholds: { patchCompliancePercent: { min: 90 } },
    },
  },
  {
    id: "nis2-023",
    articleRef: "NIS2 Art. 21(2)(e)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "network_acquisition",
    title: "Network Segmentation for Space Operations Infrastructure",
    description:
      "Implementation of network segmentation to isolate mission-critical space operations networks from corporate IT, internet-facing services, and development environments.",
    complianceQuestion:
      "Have you implemented network segmentation isolating mission-critical space operations from corporate and internet-facing networks?",
    spaceSpecificGuidance:
      "Space operations networks must be isolated into security zones: mission control (highest trust), telemetry processing, ground station interconnects, corporate IT, and internet DMZ. Use firewalls and data diodes where appropriate, particularly for telemetry flows that should be unidirectional from ground station to mission control.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure", "satellite_communications"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79",
    euSpaceActArticleNumbers: [79],
    enisaControlIds: ["3.5.1", "3.5.2"],
    iso27001Ref: "A.8.22",
    tips: [
      "Consider data diodes for unidirectional telemetry flows",
      "Implement micro-segmentation within the mission operations network",
      "Document all authorised cross-zone data flows with justification",
    ],
    evidenceRequired: [
      "Network architecture diagrams with security zones",
      "Firewall rule sets and access control lists",
      "Cross-zone data flow authorisation records",
      "Network penetration test reports",
    ],
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "segmentationImplemented",
        label:
          "Network segmentation between mission-critical and corporate networks",
        type: "boolean" as const,
      },
      {
        id: "securityZonesDefined",
        label:
          "Security zones defined (mission control, telemetry, ground station, corporate, DMZ)",
        type: "boolean" as const,
      },
      {
        id: "dataDiodesUsed",
        label: "Data diodes or unidirectional gateways for telemetry flows",
        type: "boolean" as const,
        helpText: "Unidirectional flows from ground station to mission control",
      },
      {
        id: "crossZoneFlowsDocumented",
        label: "Cross-zone data flows documented and authorised",
        type: "boolean" as const,
      },
      {
        id: "penTestConducted",
        label: "Network penetration testing conducted",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "segmentationImplemented",
        "securityZonesDefined",
        "crossZoneFlowsDocumented",
        "penTestConducted",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(f) — Assessment of cybersecurity measures effectiveness
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-024",
    articleRef: "NIS2 Art. 21(2)(f)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "effectiveness_assessment",
    title: "Regular Security Audits of Space Operations",
    description:
      "Periodic security audits of space operations infrastructure, processes, and controls by qualified internal or external auditors with space domain expertise.",
    complianceQuestion:
      "Do you conduct regular security audits of your space operations infrastructure and processes?",
    spaceSpecificGuidance:
      "Audits must cover both IT and OT aspects of space operations. Auditors should have domain expertise in space system architectures, CCSDS protocols, and ground station operations. Include assessment of TT&C security, command authentication, and telemetry integrity controls.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 88",
    euSpaceActArticleNumbers: [88],
    enisaControlIds: ["3.10.1"],
    iso27001Ref: "9.2, A.5.35, A.5.36",
    tips: [
      "Engage auditors with space system security expertise (not just generic IT auditors)",
      "Include ground station physical security in audit scope",
      "Audit frequency: at least annually, with additional audits after significant changes",
    ],
    evidenceRequired: [
      "Audit programme and schedule",
      "Audit reports with findings and recommendations",
      "Remediation tracking and closure evidence",
      "Auditor qualification records",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "auditProgrammeExists",
        label: "Security audit programme and schedule defined",
        type: "boolean" as const,
      },
      {
        id: "spaceDomainExpertise",
        label: "Auditors have space system security expertise",
        type: "boolean" as const,
        helpText:
          "Not just generic IT auditors; must understand CCSDS, TT&C, ground station operations",
      },
      {
        id: "itAndOtCovered",
        label: "Audits cover both IT and OT aspects",
        type: "boolean" as const,
      },
      {
        id: "remediationTracked",
        label: "Audit findings tracked to remediation",
        type: "boolean" as const,
      },
      {
        id: "lastAuditDate",
        label: "Last security audit date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "auditProgrammeExists",
        "itAndOtCovered",
        "remediationTracked",
      ],
      requiredNotEmpty: ["lastAuditDate"],
    },
  },
  {
    id: "nis2-025",
    articleRef: "NIS2 Art. 21(2)(f)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "effectiveness_assessment",
    title: "Penetration Testing Including RF Testing",
    description:
      "Regular penetration testing of ground segment infrastructure, including specialised RF link testing for space-to-ground communications where technically feasible.",
    complianceQuestion:
      "Do you conduct penetration testing of ground infrastructure and, where applicable, RF link security testing?",
    spaceSpecificGuidance:
      "Standard penetration testing should cover ground station networks, mission control systems, and web-facing portals. For space operators with RF expertise, include testing of uplink command authentication mechanisms and downlink data integrity. TLPT (Threat-Led Penetration Testing) may be required for essential entities under Art. 88.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 88",
    euSpaceActArticleNumbers: [88],
    enisaControlIds: ["3.10.2", "3.10.3"],
    iso27001Ref: "A.8.34",
    tips: [
      "Include CCSDS protocol fuzzing in penetration test scope",
      "Conduct RF security assessments with specialised providers",
      "Essential entities should prepare for Threat-Led Penetration Testing (TLPT) requirements",
    ],
    evidenceRequired: [
      "Penetration test reports",
      "RF security assessment reports (where applicable)",
      "Remediation evidence for identified vulnerabilities",
      "Retest confirmation",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "penTestConducted",
        label: "Penetration testing conducted on ground segment",
        type: "boolean" as const,
      },
      {
        id: "rfSecurityTesting",
        label: "RF link security testing performed (where applicable)",
        type: "boolean" as const,
        helpText:
          "Testing of uplink command authentication and downlink data integrity",
      },
      {
        id: "ccsdsProtocolFuzzing",
        label: "CCSDS protocol fuzzing included in scope",
        type: "boolean" as const,
      },
      {
        id: "findingsRemediated",
        label: "Identified vulnerabilities remediated and retested",
        type: "boolean" as const,
      },
      {
        id: "lastPenTestDate",
        label: "Last penetration test date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: ["penTestConducted", "findingsRemediated"],
      requiredNotEmpty: ["lastPenTestDate"],
    },
  },
  {
    id: "nis2-026",
    articleRef: "NIS2 Art. 21(2)(f)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "effectiveness_assessment",
    title: "Security Metrics and KPI Tracking",
    description:
      "Definition and regular tracking of cybersecurity key performance indicators and metrics to measure the effectiveness of implemented security controls.",
    complianceQuestion:
      "Do you track cybersecurity metrics and KPIs to measure control effectiveness?",
    spaceSpecificGuidance:
      "Metrics should include space-operations-relevant indicators: mean time to detect anomalies in spacecraft telemetry, ground station patching compliance, command authentication success rates, and security incident response times. Report metrics to the management body quarterly.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 88",
    euSpaceActArticleNumbers: [88],
    iso27001Ref: "9.1",
    tips: [
      "Define metrics that are meaningful for management decision-making",
      "Include leading indicators (training completion, patch currency) alongside lagging indicators (incidents)",
      "Benchmark against industry peers where data is available",
    ],
    evidenceRequired: [
      "Security metrics definition document",
      "Metric dashboards or reports",
      "Management body reporting records",
      "Trend analysis documentation",
    ],
    severity: "minor",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "metricsDefinedDoc",
        label: "Security metrics formally defined",
        type: "boolean" as const,
      },
      {
        id: "spaceOpsMetrics",
        label: "Includes space-operations-relevant KPIs",
        type: "boolean" as const,
        helpText:
          "E.g., MTTD for telemetry anomalies, ground station patching compliance, command auth success rate",
      },
      {
        id: "managementReporting",
        label: "Metrics reported to management body quarterly",
        type: "boolean" as const,
      },
      {
        id: "trendAnalysis",
        label: "Trend analysis and benchmarking performed",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "metricsDefinedDoc",
        "spaceOpsMetrics",
        "managementReporting",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(g) — Basic cyber hygiene practices and training
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-027",
    articleRef: "NIS2 Art. 21(2)(g)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "cyber_hygiene",
    title: "Security Awareness Training Programme",
    description:
      "A structured security awareness training programme for all personnel with access to space operations systems, including role-specific training for operators and engineers.",
    complianceQuestion:
      "Do you provide regular cybersecurity awareness training to all personnel, with specialised training for space operations roles?",
    spaceSpecificGuidance:
      "Training must go beyond generic phishing awareness. Space operations personnel need training on: SATCOM security threats, social engineering targeting mission-critical systems, secure commanding procedures, and recognising anomalous spacecraft behaviour that may indicate compromise.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 75",
    euSpaceActArticleNumbers: [75],
    enisaControlIds: ["3.1.4"],
    iso27001Ref: "A.6.3",
    tips: [
      "Include space-specific scenarios in phishing simulations (e.g., fake conjunction alerts)",
      "Provide role-specific training for mission controllers, ground station operators, and satellite engineers",
      "Require annual refresher training with assessment",
    ],
    evidenceRequired: [
      "Training programme documentation",
      "Training materials and curriculum",
      "Completion records and assessment results",
      "Training effectiveness metrics",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "trainingProgrammeExists",
        label: "Security awareness training programme documented",
        type: "boolean" as const,
      },
      {
        id: "roleSpecificTraining",
        label: "Role-specific training for mission controllers and engineers",
        type: "boolean" as const,
      },
      {
        id: "annualRefresher",
        label: "Annual refresher training with assessment",
        type: "boolean" as const,
      },
      {
        id: "trainingCompletionPercent",
        label: "Training completion rate (%)",
        type: "number" as const,
        unit: "%",
      },
      {
        id: "lastTrainingDate",
        label: "Last training cycle date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "trainingProgrammeExists",
        "roleSpecificTraining",
        "annualRefresher",
      ],
      numberThresholds: { trainingCompletionPercent: { min: 90 } },
      requiredNotEmpty: ["lastTrainingDate"],
    },
  },
  {
    id: "nis2-028",
    articleRef: "NIS2 Art. 21(2)(g)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "cyber_hygiene",
    title: "Cyber Hygiene Practices for Space Operations",
    description:
      "Documented and enforced basic cyber hygiene practices for all systems involved in space operations, including password policies, software update practices, and secure configuration standards.",
    complianceQuestion:
      "Do you have documented and enforced cyber hygiene practices covering password management, software updates, and secure configurations?",
    spaceSpecificGuidance:
      "Cyber hygiene in space operations must account for specialised systems: ground station equipment with default vendor credentials, legacy mission control software, and SCADA-type systems for antenna pointing. Ensure secure configuration baselines exist for all system types including embedded and real-time systems.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 74-75",
    euSpaceActArticleNumbers: [74, 75],
    enisaControlIds: ["3.1.5"],
    iso27001Ref: "A.8.9",
    tips: [
      "Create secure configuration baselines for each system category (mission control, ground station, corporate)",
      "Implement automated compliance checking against configuration baselines",
      "Address default credentials on all ground station and antenna control equipment",
    ],
    evidenceRequired: [
      "Cyber hygiene policy document",
      "Secure configuration baselines",
      "Configuration compliance scan reports",
      "Password policy enforcement evidence",
    ],
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "hygienePolicy",
        label: "Cyber hygiene policy documented",
        type: "boolean" as const,
      },
      {
        id: "secureConfigBaselines",
        label: "Secure configuration baselines for all system categories",
        type: "boolean" as const,
        helpText:
          "Baselines for mission control, ground station, and corporate systems",
      },
      {
        id: "automatedComplianceChecking",
        label: "Automated compliance checking against baselines",
        type: "boolean" as const,
      },
      {
        id: "defaultCredsAddressed",
        label: "Default credentials changed on all ground station equipment",
        type: "boolean" as const,
      },
      {
        id: "passwordPolicyEnforced",
        label: "Password policy enforced across all systems",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "hygienePolicy",
        "secureConfigBaselines",
        "defaultCredsAddressed",
        "passwordPolicyEnforced",
      ],
    },
  },
  {
    id: "nis2-029",
    articleRef: "NIS2 Art. 21(2)(g)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "cyber_hygiene",
    title: "Space-Specific Security Training (SATCOM and Link Security)",
    description:
      "Specialised training for technical personnel on SATCOM security, RF link protection, space protocol security, and emerging threats to space systems.",
    complianceQuestion:
      "Do technical personnel receive specialised training on SATCOM security, RF link protection, and space-specific cyber threats?",
    spaceSpecificGuidance:
      "Technical staff operating ground stations and mission control must understand: RF jamming and spoofing techniques, CCSDS protocol security features, command authentication mechanisms, and the unique challenges of patching on-orbit systems. Training should include hands-on exercises with representative equipment.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure", "satellite_communications"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 75, Art. 82",
    euSpaceActArticleNumbers: [75, 82],
    enisaControlIds: ["3.1.6"],
    iso27001Ref: "A.6.3",
    tips: [
      "Partner with ESA or national space agencies for specialised security training",
      "Include practical exercises with RF test equipment",
      "Cover emerging threats: quantum computing impact on encryption, AI-driven attacks",
    ],
    evidenceRequired: [
      "Specialised training curriculum",
      "Trainer qualification records",
      "Completion certificates",
      "Practical exercise records",
    ],
    severity: "minor",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "satcomCurriculumExists",
        label: "Specialised SATCOM security training curriculum exists",
        type: "boolean" as const,
      },
      {
        id: "rfLinkProtection",
        label: "RF link protection techniques covered",
        type: "boolean" as const,
        helpText: "Jamming, spoofing, CCSDS protocol security features",
      },
      {
        id: "handsOnExercises",
        label: "Practical hands-on exercises included",
        type: "boolean" as const,
      },
      {
        id: "trainerQualified",
        label: "Trainers qualified in space security domain",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "satcomCurriculumExists",
        "rfLinkProtection",
        "trainerQualified",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(h) — Policies and procedures for cryptography and encryption
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-030",
    articleRef: "NIS2 Art. 21(2)(h)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "cryptography",
    title: "Encryption of Uplink and Downlink Communications",
    description:
      "Implementation of encryption for all command uplinks and telemetry/payload downlinks to protect against eavesdropping and injection of unauthorised commands.",
    complianceQuestion:
      "Are all command uplinks and telemetry/payload downlinks encrypted using approved cryptographic algorithms?",
    spaceSpecificGuidance:
      "Command uplinks must be encrypted and authenticated to prevent unauthorised commanding. Telemetry downlinks should be encrypted where they contain sensitive operational or customer data. Use CCSDS Space Data Link Security (SDLS) protocol or equivalent. Consider bandwidth and latency constraints when selecting encryption schemes.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure", "satellite_communications"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 81-82",
    euSpaceActArticleNumbers: [81, 82],
    enisaControlIds: ["3.4.1", "3.4.2"],
    iso27001Ref: "A.8.24",
    tips: [
      "Implement CCSDS SDLS for standardised space link encryption",
      "Use AES-256 or equivalent for command encryption",
      "Ensure authentication is applied even if full encryption is not feasible for all links",
    ],
    evidenceRequired: [
      "Space link encryption architecture document",
      "Cryptographic algorithm selection justification",
      "Link encryption implementation evidence",
      "Encryption coverage matrix (which links are encrypted)",
    ],
    severity: "critical",
    implementationTimeWeeks: 12,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "uplinkEncrypted",
        label: "Command uplinks encrypted",
        type: "boolean" as const,
      },
      {
        id: "uplinkAuthenticated",
        label: "Command uplinks authenticated",
        type: "boolean" as const,
      },
      {
        id: "downlinkEncrypted",
        label: "Telemetry/payload downlinks encrypted",
        type: "boolean" as const,
      },
      {
        id: "approvedAlgorithms",
        label: "Approved cryptographic algorithms used (AES-256 or equivalent)",
        type: "boolean" as const,
      },
      {
        id: "encryptionCoverage",
        label: "Encryption coverage",
        type: "select" as const,
        options: [
          { value: "all", label: "All links encrypted" },
          { value: "most", label: "Most links encrypted (>80%)" },
          { value: "some", label: "Some links encrypted (50-80%)" },
          { value: "few", label: "Few links encrypted (<50%)" },
        ],
      },
    ],
    complianceRule: {
      requiredTrue: [
        "uplinkEncrypted",
        "uplinkAuthenticated",
        "approvedAlgorithms",
      ],
      requiredNotEmpty: ["encryptionCoverage"],
    },
  },
  {
    id: "nis2-031",
    articleRef: "NIS2 Art. 21(2)(h)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "cryptography",
    title: "Key Management for Telecommand Authentication",
    description:
      "A comprehensive key management system for telecommand authentication keys, including secure generation, distribution, storage, rotation, and destruction procedures.",
    complianceQuestion:
      "Do you have a documented key management system for telecommand authentication covering the full key lifecycle?",
    spaceSpecificGuidance:
      "Telecommand authentication keys protect against unauthorised commanding of spacecraft. Key management must address: pre-launch key loading procedures, secure key storage in both ground and space segments, key rotation mechanisms (considering limited spacecraft update windows), and emergency key revocation procedures.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure", "satellite_communications"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 81",
    euSpaceActArticleNumbers: [81],
    enisaControlIds: ["3.4.3"],
    iso27001Ref: "A.8.24",
    tips: [
      "Use Hardware Security Modules (HSMs) for key storage on the ground segment",
      "Define key rotation schedules that align with spacecraft contact windows",
      "Maintain secure backup copies of keys in geographically separate locations",
    ],
    evidenceRequired: [
      "Key management policy and procedures",
      "HSM deployment and configuration documentation",
      "Key lifecycle records (generation, distribution, rotation, destruction)",
      "Key escrow and backup arrangements",
    ],
    severity: "critical",
    implementationTimeWeeks: 8,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "keyMgmtPolicyExists",
        label: "Key management policy and procedures documented",
        type: "boolean" as const,
      },
      {
        id: "hsmUsed",
        label:
          "Hardware security modules (HSMs) used for ground segment key storage",
        type: "boolean" as const,
      },
      {
        id: "keyRotationSchedule",
        label: "Key rotation schedule defined and followed",
        type: "boolean" as const,
        helpText: "Aligned with spacecraft contact windows",
      },
      {
        id: "backupKeysGeographicSeparation",
        label: "Backup keys stored in geographically separate locations",
        type: "boolean" as const,
      },
      {
        id: "emergencyRevocation",
        label: "Emergency key revocation procedure defined",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "keyMgmtPolicyExists",
        "hsmUsed",
        "keyRotationSchedule",
        "backupKeysGeographicSeparation",
        "emergencyRevocation",
      ],
    },
  },
  {
    id: "nis2-032",
    articleRef: "NIS2 Art. 21(2)(h)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "cryptography",
    title: "Crypto Agility and Post-Quantum Preparedness",
    description:
      "Planning and preparation for cryptographic algorithm transitions, including migration paths to post-quantum cryptography for long-duration space missions.",
    complianceQuestion:
      "Do you have a crypto agility strategy that includes planning for post-quantum cryptography migration?",
    spaceSpecificGuidance:
      "Space missions with lifetimes exceeding 10 years must plan for the eventuality that current asymmetric cryptographic algorithms may be broken by quantum computers. Assess crypto agility of both ground and space segments. For new missions, consider hybrid classical/post-quantum approaches. For existing missions, ensure ground segment systems can transition algorithms.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 81-82",
    euSpaceActArticleNumbers: [81, 82],
    enisaControlIds: ["3.4.4"],
    iso27001Ref: "A.8.24",
    tips: [
      "Inventory all cryptographic algorithms in use across ground and space segments",
      "Assess which systems support algorithm agility (can be updated without hardware change)",
      "Monitor NIST PQC standardisation progress and plan migration timelines",
    ],
    evidenceRequired: [
      "Cryptographic algorithm inventory",
      "Crypto agility assessment report",
      "Post-quantum migration roadmap",
      "Algorithm transition testing records (where applicable)",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "algorithmInventory",
        label: "Cryptographic algorithm inventory maintained",
        type: "boolean" as const,
      },
      {
        id: "agilityAssessment",
        label: "Crypto agility assessment completed",
        type: "boolean" as const,
        helpText: "Which systems can be updated without hardware change",
      },
      {
        id: "pqcRoadmap",
        label: "Post-quantum cryptography migration roadmap defined",
        type: "boolean" as const,
      },
      {
        id: "missionLifetimeYears",
        label: "Longest active mission lifetime (years)",
        type: "number" as const,
        unit: "years",
      },
    ],
    complianceRule: {
      requiredTrue: ["algorithmInventory", "agilityAssessment", "pqcRoadmap"],
    },
  },
  {
    id: "nis2-033",
    articleRef: "NIS2 Art. 21(2)(h)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "cryptography",
    title: "Encryption for Ground Segment Data at Rest",
    description:
      "Implementation of encryption for sensitive data stored in ground segment systems including telemetry archives, command databases, and mission planning data.",
    complianceQuestion:
      "Is sensitive data stored in ground segment systems encrypted at rest using approved cryptographic methods?",
    spaceSpecificGuidance:
      "Ground segment systems store highly sensitive data including spacecraft command sequences, orbital parameters, encryption keys, and customer payload data. Encrypt databases, file systems, and backup media. Pay particular attention to portable media and backup tapes that may leave secure facilities.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 80",
    euSpaceActArticleNumbers: [80],
    enisaControlIds: ["3.4.5"],
    iso27001Ref: "A.8.24",
    tips: [
      "Encrypt all storage volumes containing spacecraft command data or encryption keys",
      "Implement full-disk encryption on portable devices used for mission operations",
      "Ensure backup media is encrypted, especially if stored off-site",
    ],
    evidenceRequired: [
      "Data-at-rest encryption policy",
      "Encryption implementation evidence by system",
      "Key management documentation for storage encryption",
      "Portable media encryption audit records",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "atRestPolicyExists",
        label: "Data-at-rest encryption policy documented",
        type: "boolean" as const,
      },
      {
        id: "databasesEncrypted",
        label: "Databases containing sensitive data encrypted",
        type: "boolean" as const,
      },
      {
        id: "fullDiskEncryption",
        label: "Full-disk encryption on portable devices",
        type: "boolean" as const,
      },
      {
        id: "backupMediaEncrypted",
        label: "Backup media encrypted (especially off-site storage)",
        type: "boolean" as const,
      },
      {
        id: "commandDataEncrypted",
        label: "Spacecraft command data and encryption keys encrypted at rest",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "atRestPolicyExists",
        "databasesEncrypted",
        "fullDiskEncryption",
        "backupMediaEncrypted",
        "commandDataEncrypted",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(i) — HR security, access control policies, asset management
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-034",
    articleRef: "NIS2 Art. 21(2)(i)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Personnel Security Screening for Mission-Critical Roles",
    description:
      "Background screening and vetting procedures for personnel in roles with access to mission-critical space operations systems, proportionate to the level of access granted.",
    complianceQuestion:
      "Do you conduct security screening for personnel in mission-critical roles with access to spacecraft commanding and ground station systems?",
    spaceSpecificGuidance:
      "Personnel with access to spacecraft commanding, encryption key management, or ground station operations represent high-value insider threat targets. Screening should be proportionate to role criticality. For roles involving national security payloads or government missions, coordinate with national security authorities for appropriate vetting levels.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79",
    euSpaceActArticleNumbers: [79],
    enisaControlIds: ["3.2.2"],
    iso27001Ref: "A.6.1, A.6.6",
    tips: [
      "Define screening levels based on role criticality and access privileges",
      "Include re-screening at defined intervals for high-privilege roles",
      "Implement procedures for role changes and termination (access revocation within 24 hours)",
    ],
    evidenceRequired: [
      "Personnel screening policy",
      "Screening records for mission-critical roles",
      "Access revocation procedures and records",
      "Role change process documentation",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "screeningPolicy",
        label: "Personnel screening policy documented",
        type: "boolean" as const,
      },
      {
        id: "criticalRolesScreened",
        label: "Mission-critical roles undergo background screening",
        type: "boolean" as const,
      },
      {
        id: "reScreeningScheduled",
        label: "Re-screening at defined intervals for high-privilege roles",
        type: "boolean" as const,
      },
      {
        id: "terminationProcedure",
        label: "Access revocation within 24 hours of role change/termination",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "screeningPolicy",
        "criticalRolesScreened",
        "terminationProcedure",
      ],
    },
  },
  {
    id: "nis2-035",
    articleRef: "NIS2 Art. 21(2)(i)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Access Control for Ground Stations and Mission Control",
    description:
      "Physical and logical access control measures for ground stations, mission control centres, and other facilities housing mission-critical space operations infrastructure.",
    complianceQuestion:
      "Have you implemented comprehensive physical and logical access controls for ground stations and mission control facilities?",
    spaceSpecificGuidance:
      "Ground stations and mission control centres require layered physical security: perimeter control, building access, server room access, and console-level access. Logical access must enforce role-based access to commanding interfaces, telemetry displays, and configuration management. Remote access for ground station maintenance requires additional controls.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79-80",
    euSpaceActArticleNumbers: [79, 80],
    enisaControlIds: ["3.3.2", "3.3.3"],
    iso27001Ref: "A.7.1, A.7.2, A.7.3, A.5.15",
    tips: [
      "Implement multi-factor physical access control for ground station antenna halls",
      "Log all physical and logical access with non-repudiation",
      "Conduct quarterly access reviews for all mission-critical systems",
    ],
    evidenceRequired: [
      "Physical access control policy and procedures",
      "Logical access control matrix",
      "Access log samples",
      "Quarterly access review records",
    ],
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "physicalAccessControls",
        label:
          "Physical access control for ground stations and mission control",
        type: "boolean" as const,
      },
      {
        id: "logicalAccessControls",
        label: "Role-based logical access controls enforced",
        type: "boolean" as const,
      },
      {
        id: "mfaPhysicalAccess",
        label: "Multi-factor physical access control for antenna halls",
        type: "boolean" as const,
      },
      {
        id: "accessLogged",
        label: "All physical and logical access logged with non-repudiation",
        type: "boolean" as const,
      },
      {
        id: "quarterlyAccessReview",
        label: "Quarterly access reviews for mission-critical systems",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "physicalAccessControls",
        "logicalAccessControls",
        "accessLogged",
        "quarterlyAccessReview",
      ],
    },
  },
  {
    id: "nis2-036",
    articleRef: "NIS2 Art. 21(2)(i)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Asset Inventory for Space and Ground Segments",
    description:
      "A comprehensive and maintained inventory of all assets across space and ground segments, including hardware, software, data, and network resources, with assigned ownership and classification.",
    complianceQuestion:
      "Do you maintain a comprehensive asset inventory covering both space and ground segment assets with assigned ownership?",
    spaceSpecificGuidance:
      "The inventory must include: spacecraft and their subsystems, ground station equipment (antennas, amplifiers, modems, routers), mission control hardware and software, network infrastructure, data archives, and third-party services. Include configuration baselines for each asset and track software versions deployed in both segments.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79",
    euSpaceActArticleNumbers: [79],
    enisaControlIds: ["3.3.1"],
    iso27001Ref: "A.5.9, A.5.10, A.5.11",
    tips: [
      "Include space segment assets with their on-board software versions",
      "Track configuration baselines and change history for all critical assets",
      "Automate inventory updates where possible (network scanning, CMDB integration)",
    ],
    evidenceRequired: [
      "Asset inventory (space and ground segments)",
      "Asset ownership assignments",
      "Configuration baseline documentation",
      "Inventory update and review records",
    ],
    severity: "major",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "inventoryExists",
        label: "Comprehensive asset inventory maintained",
        type: "boolean" as const,
      },
      {
        id: "spaceSegmentIncluded",
        label: "Space segment assets with on-board software versions included",
        type: "boolean" as const,
      },
      {
        id: "groundSegmentIncluded",
        label: "Ground segment equipment included (antennas, modems, routers)",
        type: "boolean" as const,
      },
      {
        id: "ownershipAssigned",
        label: "Asset ownership assigned",
        type: "boolean" as const,
      },
      {
        id: "configBaselinesTracked",
        label: "Configuration baselines and change history tracked",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "inventoryExists",
        "spaceSegmentIncluded",
        "groundSegmentIncluded",
        "ownershipAssigned",
      ],
    },
  },
  {
    id: "nis2-037",
    articleRef: "NIS2 Art. 21(2)(i)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Privileged Access Management for Space Operations",
    description:
      "Enhanced controls for privileged accounts that have the ability to command spacecraft, modify ground station configurations, or alter mission-critical system settings.",
    complianceQuestion:
      "Do you implement enhanced controls for privileged accounts with spacecraft commanding or ground station configuration access?",
    spaceSpecificGuidance:
      "Privileged access in space operations includes: spacecraft commanding authority, ground station configuration changes, encryption key management, and mission planning system modifications. Implement just-in-time access provisioning, session recording for commanding sessions, and dual-authorisation for critical commands.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79",
    euSpaceActArticleNumbers: [79],
    enisaControlIds: ["3.3.4"],
    iso27001Ref: "A.8.2, A.8.5, A.8.18",
    tips: [
      "Implement dual-authorisation (four-eyes principle) for critical spacecraft commands",
      "Record all privileged access sessions for mission control systems",
      "Use just-in-time privileged access with automatic expiration",
    ],
    evidenceRequired: [
      "Privileged access management policy",
      "Privileged account inventory",
      "Session recording evidence",
      "Dual-authorisation procedure documentation",
    ],
    severity: "critical",
    implementationTimeWeeks: 6,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "pamPolicy",
        label: "Privileged access management policy documented",
        type: "boolean" as const,
      },
      {
        id: "dualAuthorisation",
        label:
          "Dual-authorisation (four-eyes) for critical spacecraft commands",
        type: "boolean" as const,
      },
      {
        id: "sessionRecording",
        label: "Privileged access sessions recorded for mission control",
        type: "boolean" as const,
      },
      {
        id: "jitAccess",
        label: "Just-in-time privileged access with automatic expiration",
        type: "boolean" as const,
      },
      {
        id: "privilegedAccountInventory",
        label: "Privileged account inventory maintained",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "pamPolicy",
        "dualAuthorisation",
        "sessionRecording",
        "privilegedAccountInventory",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 21(2)(j) — Multi-factor authentication and continuous authentication
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-038",
    articleRef: "NIS2 Art. 21(2)(j)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "mfa_authentication",
    title: "Multi-Factor Authentication for Mission Control Access",
    description:
      "Implementation of multi-factor authentication for all access to mission control systems, ground station operations interfaces, and spacecraft commanding consoles.",
    complianceQuestion:
      "Is multi-factor authentication enforced for all access to mission control, ground station operations, and commanding interfaces?",
    spaceSpecificGuidance:
      "MFA must be implemented for: mission control console login, remote ground station access, VPN connections to operations networks, and administrative access to space operations infrastructure. Consider hardware tokens (FIDO2/U2F) for high-assurance environments. Account for operational scenarios where biometric MFA may not be feasible (e.g., gloved operations).",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79",
    euSpaceActArticleNumbers: [79],
    enisaControlIds: ["3.3.5"],
    iso27001Ref: "A.8.5",
    tips: [
      "Deploy hardware security keys (FIDO2) for mission-critical system access",
      "Implement phishing-resistant MFA methods",
      "Document and regularly review any MFA exceptions with compensating controls",
    ],
    evidenceRequired: [
      "MFA policy",
      "MFA deployment coverage report",
      "Exception register with compensating controls",
      "MFA method risk assessment",
    ],
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "mfaEnforced",
        label: "MFA enforced for all mission control and ground station access",
        type: "boolean" as const,
      },
      {
        id: "hardwareTokens",
        label: "Hardware security keys (FIDO2/U2F) deployed",
        type: "boolean" as const,
        helpText: "Phishing-resistant MFA for high-assurance environments",
      },
      {
        id: "vpnMfa",
        label: "MFA on VPN connections to operations networks",
        type: "boolean" as const,
      },
      {
        id: "exceptionsDocumented",
        label: "MFA exceptions documented with compensating controls",
        type: "boolean" as const,
      },
      {
        id: "mfaCoveragePercent",
        label: "MFA deployment coverage (%)",
        type: "number" as const,
        unit: "%",
      },
    ],
    complianceRule: {
      requiredTrue: ["mfaEnforced", "vpnMfa"],
      numberThresholds: { mfaCoveragePercent: { min: 95 } },
    },
  },
  {
    id: "nis2-039",
    articleRef: "NIS2 Art. 21(2)(j)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "mfa_authentication",
    title: "Emergency Access Procedures",
    description:
      "Documented and tested emergency access procedures that allow authorised personnel to access mission-critical systems when primary authentication mechanisms are unavailable.",
    complianceQuestion:
      "Do you have documented and tested emergency access procedures for scenarios where primary authentication is unavailable?",
    spaceSpecificGuidance:
      "Space operations require assured access to commanding systems even during infrastructure failures. Emergency procedures must address: backup authentication mechanisms for spacecraft commanding, break-glass procedures for ground station access, and alternative communication paths to ground stations when primary networks are down.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 85",
    euSpaceActArticleNumbers: [85],
    enisaControlIds: ["3.3.6"],
    iso27001Ref: "A.5.16, A.8.5",
    tips: [
      "Store break-glass credentials in sealed envelopes in a physical safe with dual-custody",
      "Test emergency access procedures at least semi-annually",
      "Ensure emergency access creates audit trail for post-event review",
    ],
    evidenceRequired: [
      "Emergency access procedures",
      "Break-glass credential storage evidence",
      "Emergency access test records",
      "Post-emergency access review records",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "emergencyProceduresDocumented",
        label: "Emergency access procedures documented",
        type: "boolean" as const,
      },
      {
        id: "breakGlassCredentials",
        label:
          "Break-glass credentials stored securely (sealed envelope, dual-custody safe)",
        type: "boolean" as const,
      },
      {
        id: "semiAnnualTesting",
        label: "Emergency access procedures tested at least semi-annually",
        type: "boolean" as const,
      },
      {
        id: "auditTrailCreated",
        label: "Emergency access creates audit trail for post-event review",
        type: "boolean" as const,
      },
      {
        id: "lastEmergencyTestDate",
        label: "Last emergency access test date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "emergencyProceduresDocumented",
        "breakGlassCredentials",
        "semiAnnualTesting",
        "auditTrailCreated",
      ],
      requiredNotEmpty: ["lastEmergencyTestDate"],
    },
  },
  {
    id: "nis2-040",
    articleRef: "NIS2 Art. 21(2)(j)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "mfa_authentication",
    title: "Secure Communications for Operations Teams",
    description:
      "Implementation of secure, authenticated communication channels for space operations teams, including encrypted voice, video, and messaging for mission-critical coordination.",
    complianceQuestion:
      "Do you use secure, authenticated communication channels for mission-critical coordination among operations teams?",
    spaceSpecificGuidance:
      "Operations teams coordinate spacecraft manoeuvres, anomaly resolution, and emergency responses using voice, video, and messaging. These communications must be protected against eavesdropping and impersonation. Implement end-to-end encrypted channels for: flight dynamics coordination, ground station handover communications, and anomaly resolution team discussions.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 79, Art. 82",
    euSpaceActArticleNumbers: [79, 82],
    iso27001Ref: "A.5.14, A.8.24",
    tips: [
      "Deploy end-to-end encrypted voice and messaging for operations teams",
      "Implement identity verification for participants in mission-critical calls",
      "Maintain backup communication channels independent of primary systems",
    ],
    evidenceRequired: [
      "Secure communications policy",
      "Approved communication tools list with security properties",
      "Deployment and configuration evidence",
      "Backup communication channel documentation",
    ],
    severity: "major",
    implementationTimeWeeks: 3,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "secureCommsPolicy",
        label: "Secure communications policy documented",
        type: "boolean" as const,
      },
      {
        id: "e2eEncryptedChannels",
        label: "End-to-end encrypted voice/messaging deployed",
        type: "boolean" as const,
      },
      {
        id: "identityVerification",
        label: "Identity verification for mission-critical calls",
        type: "boolean" as const,
      },
      {
        id: "backupChannels",
        label: "Backup communication channels independent of primary systems",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "secureCommsPolicy",
        "e2eEncryptedChannels",
        "backupChannels",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 20 — Governance and accountability
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-041",
    articleRef: "NIS2 Art. 20(1)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_20",
    category: "governance",
    title: "Board-Level Cybersecurity Oversight",
    description:
      "The management body must approve cybersecurity risk-management measures, oversee their implementation, and can be held liable for infringements. This requires regular reporting and decision-making at board level.",
    complianceQuestion:
      "Does your management body formally approve and oversee cybersecurity risk-management measures?",
    spaceSpecificGuidance:
      "Board members of space operators must understand the unique cybersecurity challenges of space operations, including the irreversibility of space segment compromises, the geopolitical dimension of space threats, and the safety implications of loss of spacecraft control. Board reporting should include space-specific risk metrics.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 74-75",
    euSpaceActArticleNumbers: [74, 75],
    iso27001Ref: "5.1, 5.2",
    tips: [
      "Include cybersecurity as a standing agenda item in board meetings (at least quarterly)",
      "Provide board members with space-sector-specific threat briefings",
      "Document board decisions on cybersecurity risk acceptance and investment",
    ],
    evidenceRequired: [
      "Board meeting minutes showing cybersecurity oversight",
      "Management body approval of cybersecurity measures",
      "Cybersecurity reporting to board (dashboard/report samples)",
      "Board-level risk acceptance decisions",
    ],
    severity: "critical",
    implementationTimeWeeks: 2,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "boardApprovesMeasures",
        label: "Management body formally approves cybersecurity measures",
        type: "boolean" as const,
      },
      {
        id: "quarterlyAgendaItem",
        label: "Cybersecurity is a standing quarterly board agenda item",
        type: "boolean" as const,
      },
      {
        id: "spaceRiskBriefings",
        label: "Board receives space-sector-specific threat briefings",
        type: "boolean" as const,
      },
      {
        id: "riskAcceptanceDocumented",
        label: "Board risk acceptance decisions documented",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "boardApprovesMeasures",
        "quarterlyAgendaItem",
        "riskAcceptanceDocumented",
      ],
    },
  },
  {
    id: "nis2-042",
    articleRef: "NIS2 Art. 20(2)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_20",
    category: "governance",
    title: "Management Body Cybersecurity Training",
    description:
      "Members of the management body must undergo training to gain sufficient knowledge and skills to identify risks and assess cybersecurity risk-management practices and their impact on services.",
    complianceQuestion:
      "Have all members of the management body completed cybersecurity training relevant to their oversight responsibilities?",
    spaceSpecificGuidance:
      "Training for management bodies of space operators should cover: overview of space cybersecurity threats, regulatory obligations under NIS2 and the EU Space Act, personal liability implications, and the organisation's specific risk profile. Consider executive briefings from space cybersecurity experts.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 75",
    euSpaceActArticleNumbers: [75],
    iso27001Ref: "5.1",
    tips: [
      "Provide annual executive cybersecurity briefings tailored to the space sector",
      "Include real-world case studies of space cybersecurity incidents",
      "Document individual completion records for each management body member",
    ],
    evidenceRequired: [
      "Training programme for management body",
      "Individual completion records",
      "Training content covering space-specific threats",
      "Annual refresher training evidence",
    ],
    severity: "major",
    implementationTimeWeeks: 1,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "boardTrainingProgramme",
        label: "Cybersecurity training programme for management body exists",
        type: "boolean" as const,
      },
      {
        id: "allMembersCompleted",
        label: "All management body members completed training",
        type: "boolean" as const,
      },
      {
        id: "spaceContentIncluded",
        label: "Training covers space-specific cybersecurity threats",
        type: "boolean" as const,
        helpText: "Including personal liability implications under NIS2",
      },
      {
        id: "annualRefresherBoard",
        label: "Annual refresher training conducted",
        type: "boolean" as const,
      },
      {
        id: "lastBoardTrainingDate",
        label: "Last board training date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "boardTrainingProgramme",
        "allMembersCompleted",
        "spaceContentIncluded",
        "annualRefresherBoard",
      ],
      requiredNotEmpty: ["lastBoardTrainingDate"],
    },
  },
  {
    id: "nis2-043",
    articleRef: "NIS2 Art. 20(1)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_20",
    category: "governance",
    title: "CISO or Equivalent Appointment",
    description:
      "Designation of a Chief Information Security Officer or equivalent role with defined authority and responsibility for cybersecurity across the organisation, reporting to the management body.",
    complianceQuestion:
      "Have you designated a CISO or equivalent role with defined authority for cybersecurity reporting to the management body?",
    spaceSpecificGuidance:
      "Space operators should ensure the CISO (or equivalent) has or can access domain expertise in space systems security. For smaller operators, this may be a part-time role or a virtual CISO arrangement with a space cybersecurity consultancy. The role must have authority over both ground segment IT and operational technology security.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 75",
    euSpaceActArticleNumbers: [75],
    iso27001Ref: "5.3",
    tips: [
      "Ensure the CISO role has authority across both IT and OT domains",
      "For small operators, consider a virtual CISO arrangement with space domain expertise",
      "Define clear reporting line to management body",
    ],
    evidenceRequired: [
      "CISO appointment documentation",
      "Role description with defined responsibilities and authority",
      "Reporting line documentation",
      "Evidence of regular management body reporting",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "cisoAppointed",
        label: "CISO or equivalent role designated",
        type: "boolean" as const,
      },
      {
        id: "authorityDefined",
        label: "Role has defined authority across IT and OT domains",
        type: "boolean" as const,
      },
      {
        id: "reportsToBoard",
        label: "Clear reporting line to management body",
        type: "boolean" as const,
      },
      {
        id: "spaceDomainExpertiseAccess",
        label: "Has or can access space systems security expertise",
        type: "boolean" as const,
        helpText:
          "For smaller operators, a virtual CISO arrangement with space cybersecurity consultancy is acceptable",
      },
    ],
    complianceRule: {
      requiredTrue: ["cisoAppointed", "authorityDefined", "reportsToBoard"],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 23 — Incident reporting obligations
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-044",
    articleRef: "NIS2 Art. 23(4)(a)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_23",
    category: "reporting",
    title: "24-Hour Early Warning to CSIRT/Competent Authority",
    description:
      "Capability and procedures to submit an early warning to the CSIRT or competent authority without undue delay and within 24 hours of becoming aware of a significant incident, indicating whether the incident is suspected of being caused by unlawful or malicious acts.",
    complianceQuestion:
      "Can you submit an early warning to the CSIRT or competent authority within 24 hours of detecting a significant incident?",
    spaceSpecificGuidance:
      "Space operators must pre-register with their national CSIRT and identify the competent authority for NIS2 in their Member State. Early warnings should cover: indication of potential cyber cause, affected space or ground systems, and whether the incident may affect other operators (e.g., conjunction risk from loss of control). Establish 24/7 capability for early warning submission.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 89-90",
    euSpaceActArticleNumbers: [89, 90],
    iso27001Ref: "A.5.24",
    tips: [
      "Pre-register with national CSIRT and test the reporting channel",
      "Prepare early warning templates pre-filled with static organisation data",
      "Designate at least two persons authorised to submit early warnings (for 24/7 coverage)",
    ],
    evidenceRequired: [
      "CSIRT registration confirmation",
      "Early warning submission procedure",
      "Template for early warning",
      "24/7 contact arrangements",
      "Test submission records",
    ],
    severity: "critical",
    implementationTimeWeeks: 2,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "csirtRegistered",
        label: "Pre-registered with national CSIRT",
        type: "boolean" as const,
      },
      {
        id: "earlyWarningProcedure",
        label: "Early warning submission procedure documented",
        type: "boolean" as const,
      },
      {
        id: "templatePrepared",
        label: "Early warning template pre-filled with static data",
        type: "boolean" as const,
      },
      {
        id: "twentyFourSevenCapability",
        label: "24/7 capability for early warning submission",
        type: "boolean" as const,
        helpText:
          "At least two authorised persons designated for 24/7 coverage",
      },
      {
        id: "testSubmissionDone",
        label: "Test submission performed with CSIRT",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "csirtRegistered",
        "earlyWarningProcedure",
        "templatePrepared",
        "twentyFourSevenCapability",
      ],
    },
  },
  {
    id: "nis2-045",
    articleRef: "NIS2 Art. 23(4)(b)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_23",
    category: "reporting",
    title: "72-Hour Incident Notification",
    description:
      "Capability to submit an incident notification within 72 hours of becoming aware of a significant incident, updating the early warning and providing an initial assessment of severity, impact, and indicators of compromise.",
    complianceQuestion:
      "Can you submit a detailed incident notification within 72 hours including initial impact assessment and indicators of compromise?",
    spaceSpecificGuidance:
      "The 72-hour notification for space operators should include: affected spacecraft or ground systems, impact on services provided (communications, EO data, navigation), assessment of whether other operators may be affected, containment measures taken (e.g., safe-mode activation), and initial indicators of compromise including any RF-layer indicators.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 91",
    euSpaceActArticleNumbers: [91],
    iso27001Ref: "A.5.24, A.5.25",
    tips: [
      "Prepare incident notification templates with space-specific fields",
      "Include indicators of compromise relevant to space operations (unusual RF patterns, unexpected commands)",
      "Coordinate with ground station providers for comprehensive impact assessment",
    ],
    evidenceRequired: [
      "Incident notification procedure",
      "72-hour notification template",
      "Impact assessment methodology",
      "IoC collection and sharing procedures",
    ],
    severity: "critical",
    implementationTimeWeeks: 2,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "notificationProcedure",
        label: "72-hour incident notification procedure documented",
        type: "boolean" as const,
      },
      {
        id: "templateWithSpaceFields",
        label: "Notification template includes space-specific fields",
        type: "boolean" as const,
        helpText:
          "Affected spacecraft/ground systems, service impact, containment measures",
      },
      {
        id: "impactAssessmentMethodology",
        label: "Impact assessment methodology defined",
        type: "boolean" as const,
      },
      {
        id: "iocCollectionProcess",
        label: "IoC collection and sharing process established",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "notificationProcedure",
        "templateWithSpaceFields",
        "impactAssessmentMethodology",
        "iocCollectionProcess",
      ],
    },
  },
  {
    id: "nis2-046",
    articleRef: "NIS2 Art. 23(4)(d)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_23",
    category: "reporting",
    title: "One-Month Final Incident Report",
    description:
      "Capability to submit a final report not later than one month after the incident notification, including detailed description, root cause, mitigation measures applied, and cross-border impact if applicable.",
    complianceQuestion:
      "Can you produce a comprehensive final incident report within one month including root cause analysis and remediation measures?",
    spaceSpecificGuidance:
      "Final reports for space incidents should include: detailed timeline of events across all segments (space, ground, link), root cause analysis, impact on spacecraft health and orbital parameters, measures taken to prevent recurrence, and assessment of any impact on other operators or space debris environment. Include lessons learned for the wider space community.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 92",
    euSpaceActArticleNumbers: [92],
    iso27001Ref: "A.5.27",
    tips: [
      "Maintain a standardised final report template with space-specific sections",
      "Include root cause analysis using recognised methodologies",
      "Track remediation actions to completion and reference in the report",
    ],
    evidenceRequired: [
      "Final report template",
      "Root cause analysis methodology",
      "Sample final report (from exercise or real incident)",
      "Remediation action tracking",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "finalReportTemplate",
        label: "Final report template with space-specific sections",
        type: "boolean" as const,
      },
      {
        id: "rcaMethodologyDefined",
        label: "Root cause analysis methodology defined",
        type: "boolean" as const,
      },
      {
        id: "crossSegmentTimeline",
        label:
          "Capable of producing cross-segment timeline (space, ground, link)",
        type: "boolean" as const,
      },
      {
        id: "remediationTracking",
        label: "Remediation action tracking to completion",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "finalReportTemplate",
        "rcaMethodologyDefined",
        "crossSegmentTimeline",
        "remediationTracking",
      ],
    },
  },
  {
    id: "nis2-047",
    articleRef: "NIS2 Art. 23(1)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_23",
    category: "reporting",
    title: "Significant Incident Determination for Space Operations",
    description:
      "Defined criteria for determining what constitutes a 'significant incident' under NIS2 for space operations, triggering mandatory reporting obligations.",
    complianceQuestion:
      "Have you defined criteria for determining NIS2 significant incidents specific to your space operations?",
    spaceSpecificGuidance:
      "Significant incident criteria for space operators should include: any unauthorised commanding of spacecraft, loss of contact exceeding defined thresholds, unintended orbital manoeuvre, ground station compromise affecting TT&C, ransomware affecting mission operations, and service disruption affecting EU customers. Map these to NIS2 Art. 23(3) impact thresholds.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 89",
    euSpaceActArticleNumbers: [89],
    iso27001Ref: "A.5.24",
    tips: [
      "Map space-specific incidents to NIS2 significant incident criteria (service disruption, financial impact, affected users)",
      "Define clear thresholds (e.g., loss of contact duration, number of affected users)",
      "Include conjunction events caused by loss of manoeuvre capability as a significant incident",
    ],
    evidenceRequired: [
      "Significant incident criteria document",
      "Decision tree for incident significance determination",
      "Mapping to NIS2 Art. 23(3) thresholds",
      "Examples of classified scenarios",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "criteriaDocumented",
        label: "Significant incident criteria documented",
        type: "boolean" as const,
      },
      {
        id: "spaceIncidentsMapped",
        label: "Space-specific incidents mapped to NIS2 thresholds",
        type: "boolean" as const,
        helpText:
          "E.g., unauthorised commanding, loss of contact, unintended manoeuvre, service disruption",
      },
      {
        id: "decisionTreeExists",
        label: "Decision tree for incident significance determination",
        type: "boolean" as const,
      },
      {
        id: "thresholdsDefined",
        label: "Clear quantitative thresholds defined",
        type: "boolean" as const,
        helpText: "E.g., loss of contact duration, number of affected users",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "criteriaDocumented",
        "spaceIncidentsMapped",
        "decisionTreeExists",
        "thresholdsDefined",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 27 — Registration with authorities
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-048",
    articleRef: "NIS2 Art. 27",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_27",
    category: "registration",
    title: "Registration with Competent Authority",
    description:
      "Registration with the competent authority or CSIRT in the Member State where the entity is established, providing required information including entity name, sector, sub-sector, contact details, and IP ranges.",
    complianceQuestion:
      "Have you registered with the NIS2 competent authority or CSIRT in your Member State of establishment?",
    spaceSpecificGuidance:
      "Space operators must identify the correct competent authority for NIS2 in their Member State. In some Member States, the space sector may fall under a specific sectoral authority, while others use a general NIS2 authority. If operating ground stations in multiple Member States, determine whether registration is required in each. Provide information about space operations infrastructure.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 93",
    euSpaceActArticleNumbers: [93],
    iso27001Ref: "A.5.31",
    tips: [
      "Identify the competent NIS2 authority in your Member State for the space sector",
      "If operating in multiple Member States, determine primary establishment for registration",
      "Keep registration information updated when operational details change",
    ],
    evidenceRequired: [
      "Registration submission confirmation",
      "Registration data provided",
      "Update records when information changes",
    ],
    severity: "critical",
    implementationTimeWeeks: 1,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "authorityIdentified",
        label: "Competent NIS2 authority identified in Member State",
        type: "boolean" as const,
      },
      {
        id: "registrationSubmitted",
        label: "Registration submitted to competent authority",
        type: "boolean" as const,
      },
      {
        id: "registrationConfirmed",
        label: "Registration confirmation received",
        type: "boolean" as const,
      },
      {
        id: "infoKeptCurrent",
        label: "Registration information kept up to date",
        type: "boolean" as const,
      },
      {
        id: "registrationDate",
        label: "Registration submission date",
        type: "date" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "authorityIdentified",
        "registrationSubmitted",
        "registrationConfirmed",
        "infoKeptCurrent",
      ],
      requiredNotEmpty: ["registrationDate"],
    },
  },
  {
    id: "nis2-049",
    articleRef: "NIS2 Art. 27(2)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_27",
    category: "registration",
    title: "Domain Name and IP Range Registration",
    description:
      "Provision of domain names, IP address ranges, and contact information to the competent authority as part of the NIS2 registration, and maintenance of current information.",
    complianceQuestion:
      "Have you provided your domain names, IP address ranges, and contact details to the competent authority as required?",
    spaceSpecificGuidance:
      "Space operators should provide IP ranges for all operational networks including ground station networks, mission control systems, and data distribution platforms. Consider that some ground station networks may use private IP ranges accessible only via VPN. Include domain names used for mission operations portals and data access services.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 93",
    euSpaceActArticleNumbers: [93],
    iso27001Ref: "A.5.9",
    tips: [
      "Maintain a current list of all domain names and IP ranges used for space operations",
      "Include IP ranges for partner/co-located ground stations if under your operational control",
      "Update the authority when IP ranges change due to infrastructure updates",
    ],
    evidenceRequired: [
      "Domain name inventory",
      "IP address range documentation",
      "Authority submission confirmation",
      "Update records",
    ],
    severity: "minor",
    implementationTimeWeeks: 1,
    canBeSimplified: false,
    assessmentFields: [
      {
        id: "domainInventoryMaintained",
        label: "Domain name inventory maintained",
        type: "boolean" as const,
      },
      {
        id: "ipRangesDocumented",
        label: "IP address ranges documented for all operational networks",
        type: "boolean" as const,
      },
      {
        id: "submittedToAuthority",
        label: "Domain/IP information submitted to authority",
        type: "boolean" as const,
      },
      {
        id: "updateProcessDefined",
        label: "Process defined for updating authority when changes occur",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "domainInventoryMaintained",
        "ipRangesDocumented",
        "submittedToAuthority",
        "updateProcessDefined",
      ],
    },
  },

  // ═══════════════════════════════════════════════════════════════════════
  // Art. 29 — Voluntary information sharing
  // ═══════════════════════════════════════════════════════════════════════

  {
    id: "nis2-050",
    articleRef: "NIS2 Art. 29",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_29",
    category: "information_sharing",
    title: "Voluntary Cybersecurity Information Sharing",
    description:
      "Participation in voluntary cybersecurity information sharing arrangements with other space operators, CSIRTs, and relevant communities to improve collective situational awareness.",
    complianceQuestion:
      "Do you participate in voluntary cybersecurity information sharing with other space operators or through established sharing communities?",
    spaceSpecificGuidance:
      "The space sector benefits significantly from collective threat intelligence sharing due to the small number of operators and shared threat actors. Participate in space-specific ISACs, EUSRN information sharing mechanisms, and bilateral sharing agreements with peer operators. Share anonymised indicators of compromise and threat intelligence related to space-specific attack vectors.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["small", "medium", "large"],
    },
    euSpaceActRef: "Art. 93-95",
    euSpaceActArticleNumbers: [93, 94, 95],
    iso27001Ref: "A.5.6",
    tips: [
      "Join the EUSRN and participate in information sharing activities",
      "Consider joining or establishing a space-sector ISAC",
      "Implement TLP (Traffic Light Protocol) for controlling information sharing sensitivity",
    ],
    evidenceRequired: [
      "Information sharing policy",
      "Membership in sharing communities or ISACs",
      "Records of shared and received intelligence",
      "TLP implementation evidence",
    ],
    severity: "minor",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "sharingPolicyExists",
        label: "Information sharing policy documented",
        type: "boolean" as const,
      },
      {
        id: "communityMembership",
        label: "Member of sharing community or ISAC",
        type: "boolean" as const,
        helpText:
          "E.g., EUSRN, space-sector ISAC, or bilateral sharing agreements",
      },
      {
        id: "tlpImplemented",
        label: "Traffic Light Protocol (TLP) implemented",
        type: "boolean" as const,
      },
      {
        id: "activeParticipation",
        label: "Actively sharing and receiving threat intelligence",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: ["sharingPolicyExists", "communityMembership"],
    },
  },
  {
    id: "nis2-051",
    articleRef: "NIS2 Art. 29",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_29",
    category: "information_sharing",
    title: "Cross-Operator Coordination for Shared Threats",
    description:
      "Procedures for coordinating with other space operators when shared threats or vulnerabilities affecting common systems, suppliers, or infrastructure are identified.",
    complianceQuestion:
      "Do you have procedures for coordinating with other operators when shared threats or common vulnerabilities are identified?",
    spaceSpecificGuidance:
      "Space operators often share ground station providers, spacecraft bus manufacturers, and software platforms. When a vulnerability is discovered in a shared component (e.g., a common spacecraft bus platform, widely-used ground station software), coordinated response across affected operators is essential. Establish pre-arranged communication channels for peer-to-peer threat coordination.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      organizationSizes: ["medium", "large"],
    },
    euSpaceActRef: "Art. 94-95",
    euSpaceActArticleNumbers: [94, 95],
    iso27001Ref: "A.5.5, A.5.6",
    tips: [
      "Identify operators using the same spacecraft platform or ground station provider",
      "Establish pre-arranged encrypted communication channels for urgent coordination",
      "Define a coordination protocol including roles, responsibilities, and information classification",
    ],
    evidenceRequired: [
      "Cross-operator coordination procedures",
      "Peer operator contact lists",
      "Communication channel documentation",
      "Coordination exercise records",
    ],
    severity: "minor",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "coordinationProcedures",
        label: "Cross-operator coordination procedures documented",
        type: "boolean" as const,
      },
      {
        id: "peerOperatorsIdentified",
        label: "Peer operators using same platforms/providers identified",
        type: "boolean" as const,
        helpText:
          "Operators sharing spacecraft bus, ground station provider, or software platform",
      },
      {
        id: "encryptedChannelsEstablished",
        label:
          "Pre-arranged encrypted communication channels for urgent coordination",
        type: "boolean" as const,
      },
      {
        id: "coordinationProtocol",
        label:
          "Coordination protocol with roles and information classification defined",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: ["coordinationProcedures", "peerOperatorsIdentified"],
    },
  },

  // ─── Art. 21(2)(k) — Physical Security of Network and IS ────────────────
  // Previously completely missing. Critical for space operators since ground
  // stations are a primary attack vector. Added as nis2-052 through nis2-055.

  {
    id: "nis2-052",
    articleRef: "NIS2 Art. 21(2)(k)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Physical Access Control for Ground Infrastructure",
    description:
      "Physical access control measures for facilities containing network and information systems, including ground stations, mission control centers, data centers, and spacecraft integration facilities. Required under Art. 21(2)(k).",
    complianceQuestion:
      "Do you implement physical access controls (badges, biometrics, visitor logs, escorted access) at all facilities containing network and information systems critical to your space operations?",
    spaceSpecificGuidance:
      "Ground stations represent the primary attack surface for space assets — an attacker with physical access to a TT&C facility can directly command spacecraft, inject malicious uplink data, or disrupt ground-segment availability. Required controls: multi-factor physical access (badge + PIN/biometric), video surveillance of all entry points, visitor escort policy, time-limited access credentials, separation of visitor and staff zones, documented access revocation on personnel changes. For unmanned remote ground stations, implement perimeter intrusion detection and tamper-evident enclosures.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure", "satellite_communications"],
    },
    euSpaceActRef: "Art. 74, 77",
    euSpaceActArticleNumbers: [74, 77],
    iso27001Ref: "A.7.1, A.7.2, A.7.3, A.7.4",
    tips: [
      "Inventory every facility with network equipment or cryptographic material",
      "Deploy multi-factor physical access (badge + biometric or PIN) on server rooms and TT&C rooms",
      "Install video surveillance on all entry/exit points with 90+ day retention",
      "Implement visitor management with escort requirements and sign-in logs",
      "Revoke physical credentials immediately on termination or role change",
      "For remote unmanned sites: perimeter intrusion detection, tamper-evident enclosures, 24/7 monitoring",
    ],
    evidenceRequired: [
      "Physical access policy document",
      "Facility access control system configuration",
      "Visitor logs (last 12 months)",
      "Video surveillance retention policy and sample recordings",
      "Termination checklist showing access revocation step",
      "Perimeter security assessment for remote sites",
    ],
    severity: "critical",
    implementationTimeWeeks: 4,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "physicalAccessControlsDeployed",
        label:
          "Multi-factor physical access controls at all critical facilities",
        type: "boolean" as const,
      },
      {
        id: "videoSurveillanceDeployed",
        label: "Video surveillance of entry points with 90+ day retention",
        type: "boolean" as const,
      },
      {
        id: "visitorManagementProcess",
        label: "Documented visitor management and escort policy",
        type: "boolean" as const,
      },
      {
        id: "accessRevocationProcess",
        label: "Access revocation triggered on personnel changes",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: [
        "physicalAccessControlsDeployed",
        "accessRevocationProcess",
      ],
    },
  },

  {
    id: "nis2-053",
    articleRef: "NIS2 Art. 21(2)(k)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Environmental and Tamper Protection for Critical Equipment",
    description:
      "Environmental controls (HVAC, fire suppression, flood sensors, UPS) and tamper-evidence measures for equipment processing critical space mission data.",
    complianceQuestion:
      "Do you protect critical equipment (servers, cryptographic modules, network gear) with environmental controls and tamper-detection measures?",
    spaceSpecificGuidance:
      "Ground station equipment runs 24/7 and a single HVAC or power failure can disrupt TT&C to live spacecraft. Implement: redundant climate control, early-warning smoke/heat detection, water/flood sensors under raised floors, uninterruptible power supply with automatic failover to generator, tamper-evident seals on cryptographic modules (HSMs), environmental monitoring with remote alerting. Spacecraft command authentication keys must be stored in FIPS 140-2 Level 3+ HSMs with tamper response (automatic key zeroization on physical attack).",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
    },
    euSpaceActRef: "Art. 81-82",
    euSpaceActArticleNumbers: [81, 82],
    iso27001Ref: "A.7.5, A.7.8, A.7.11, A.7.12",
    tips: [
      "Deploy environmental monitoring (temperature, humidity, flood) with alerting",
      "Install UPS with runtime sufficient for clean generator handoff",
      "Store HSMs and key material in tamper-evident enclosures",
      "Test failover quarterly",
      "Document single points of failure and mitigations",
    ],
    evidenceRequired: [
      "Environmental monitoring system configuration",
      "UPS/generator test records",
      "HSM tamper log",
      "Facility resilience assessment",
    ],
    severity: "major",
    implementationTimeWeeks: 6,
    canBeSimplified: true,
  },

  {
    id: "nis2-054",
    articleRef: "NIS2 Art. 21(2)(k)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Physical Security for Remote and Unmanned Ground Sites",
    description:
      "Enhanced physical protection for remote ground stations, relay sites, or unmanned facilities that form part of the space communication chain.",
    complianceQuestion:
      "For any remote or unmanned ground sites, do you implement perimeter intrusion detection, tamper-evident enclosures, and 24/7 remote monitoring?",
    spaceSpecificGuidance:
      "Space operators increasingly rely on distributed and unmanned ground stations (polar relays, equatorial downlink sites, mobile tracking trailers). These sites lack human guards and are prime targets for physical tampering or jamming equipment installation. Required: hardened enclosures resistant to forced entry, motion and perimeter sensors, 24/7 video with remote monitoring, tamper-evident seals on RF front-ends, battery-backed operation, GPS-jamming detection, protocol-level detection of unauthorized commands (can indicate physical compromise), documented incident response for physical breach alarms.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
      subSectors: ["ground_infrastructure", "satellite_communications"],
    },
    euSpaceActRef: "Art. 77, 82",
    euSpaceActArticleNumbers: [77, 82],
    iso27001Ref: "A.7.1, A.7.2, A.7.4",
    tips: [
      "Conduct site-specific threat assessment for every remote location",
      "Deploy remote monitoring with cellular/satellite backhaul independent of main uplink",
      "Use tamper-evident enclosures with alarm integration",
      "Document sensor coverage of each remote site",
      "Establish response time SLA for physical alarms",
    ],
    evidenceRequired: [
      "Remote site inventory and risk rating",
      "Site-specific physical security plan",
      "Alarm response procedure and SLA",
      "Incident history and response logs",
    ],
    severity: "major",
    implementationTimeWeeks: 8,
    canBeSimplified: true,
  },

  {
    id: "nis2-055",
    articleRef: "NIS2 Art. 21(2)(k)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_21",
    category: "hr_access_asset",
    title: "Media Handling and Secure Disposal",
    description:
      "Secure handling, transport, and end-of-life destruction of storage media containing space mission data, cryptographic material, or ground station configuration.",
    complianceQuestion:
      "Do you have documented procedures for secure media handling, transport, and destruction when decommissioning equipment?",
    spaceSpecificGuidance:
      "Ground station HSMs, flight software revision media, and command authentication key backups must never leave physical control unless encrypted and logged. When ground equipment is decommissioned or repaired off-site, media must be sanitized (cryptographic erasure + physical destruction for classified material) following NIST SP 800-88 Rev. 1. Cryptographic material for retired missions must be formally destroyed with certificate of destruction.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
    },
    euSpaceActRef: "Art. 82",
    euSpaceActArticleNumbers: [82],
    iso27001Ref: "A.7.10, A.7.14, A.8.10",
    tips: [
      "Follow NIST SP 800-88 Rev. 1 for media sanitization",
      "Require certificate of destruction for all retired media",
      "Encrypt all removable media in transit",
      "Maintain chain of custody logs for classified or sensitive media",
    ],
    evidenceRequired: [
      "Media handling policy",
      "Destruction certificates",
      "Chain of custody records",
      "Decommissioning checklist",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
  },

  // ─── Art. 23(4)(c) — Intermediate Status Report ─────────────────────────
  // Previously missing. This is a distinct obligation from the 24h/72h/1mo
  // reports and can be triggered at any point during an ongoing incident.

  {
    id: "nis2-056",
    articleRef: "NIS2 Art. 23(4)(c)",
    officialUrl:
      "https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32022L2555#art_23",
    category: "reporting",
    title: "Intermediate Status Report on CSIRT Request",
    description:
      "Ability to produce and submit an ad-hoc intermediate status report on request from the CSIRT or competent authority during an ongoing significant incident, separate from the 24-hour early warning, 72-hour notification, and 1-month final report.",
    complianceQuestion:
      "Do you have the organizational capability to produce an ad-hoc intermediate incident status report within a short timeframe (e.g., 12–24 hours) when requested by the CSIRT or competent authority during an active incident?",
    spaceSpecificGuidance:
      "Space incidents often take weeks to fully resolve — for example, a spacecraft command injection incident may require coordinated investigation with the spacecraft bus manufacturer, ground station provider, and upstream comsat partners. During such multi-week incidents, the CSIRT may demand on-demand status updates under Art. 23(4)(c) with no fixed deadline between the 72-hour notification and the 1-month final report. You must be able to: (1) pull current investigation status from the incident response team on short notice, (2) structure it into a formal intermediate report including evidence collected, mitigations deployed, and residual risk, (3) deliver it to the competent authority via secure channel. Pre-define an intermediate report template and a production SLA.",
    applicableTo: {
      entityClassifications: ["essential", "important"],
      sectors: ["space"],
    },
    euSpaceActRef: "Art. 89-90",
    euSpaceActArticleNumbers: [89, 90],
    iso27001Ref: "A.5.24, A.5.25, A.5.26",
    tips: [
      "Define an intermediate report template (structured sections: current status, evidence collected, mitigation deployed, residual risk, next steps)",
      "Assign clear ownership of on-demand reporting during active incidents",
      "Pre-establish secure transmission channels with your CSIRT",
      "Set internal SLA for intermediate report production (e.g., 12 hours from request)",
      "Include intermediate report drill in tabletop exercises",
    ],
    evidenceRequired: [
      "Intermediate report template",
      "Incident response procedures referencing Art. 23(4)(c)",
      "Secure transmission channel documentation",
      "Tabletop exercise records including intermediate report production",
    ],
    severity: "major",
    implementationTimeWeeks: 2,
    canBeSimplified: true,
    assessmentFields: [
      {
        id: "intermediateReportTemplate",
        label: "Intermediate status report template exists",
        type: "boolean" as const,
      },
      {
        id: "intermediateReportSLA",
        label: "Internal SLA defined for producing intermediate reports",
        type: "boolean" as const,
      },
      {
        id: "csirtChannelsEstablished",
        label: "Secure transmission channels to CSIRT pre-established",
        type: "boolean" as const,
      },
    ],
    complianceRule: {
      requiredTrue: ["intermediateReportTemplate", "csirtChannelsEstablished"],
    },
  },
];

// ─── Helper Functions ───

/**
 * NIS2 entity classification lives in the canonical engine file.
 * This re-export keeps backwards compatibility for any legacy imports that
 * used to pull the classifier from the data file. Do not reimplement here.
 *
 * @see src/lib/nis2-engine.server.ts for the authoritative version
 */
// Classification is NOT re-exported here on purpose — importing from a server-
// only engine file would pull `server-only` into any consumer of this data
// file, breaking client bundles. Callers must import `classifyNIS2Entity`
// from `@/lib/nis2-engine.server` directly. This is enforced by deleting the
// previous duplicate implementation below.

/**
 * Filter NIS2 requirements based on entity classification, sector, and size.
 * Returns only requirements applicable to the given entity profile.
 */
export function getApplicableNIS2Requirements(
  classification: NIS2EntityClassification,
  answers: NIS2AssessmentAnswers,
): NIS2Requirement[] {
  if (classification === "out_of_scope") {
    return [];
  }

  return NIS2_REQUIREMENTS.filter((req) => {
    // Check entity classification
    if (
      req.applicableTo.entityClassifications &&
      !req.applicableTo.entityClassifications.includes(classification)
    ) {
      return false;
    }

    // Check sector
    if (
      req.applicableTo.sectors &&
      answers.sector !== null &&
      !req.applicableTo.sectors.includes(answers.sector)
    ) {
      return false;
    }

    // Check sub-sector if specified
    if (
      req.applicableTo.subSectors &&
      req.applicableTo.subSectors.length > 0 &&
      answers.spaceSubSector !== null
    ) {
      if (!req.applicableTo.subSectors.includes(answers.spaceSubSector)) {
        return false;
      }
    }

    // Check organisation size
    if (
      req.applicableTo.organizationSizes &&
      answers.entitySize !== null &&
      !req.applicableTo.organizationSizes.includes(answers.entitySize)
    ) {
      return false;
    }

    return true;
  });
}

/**
 * Calculate a NIS2 maturity score (0-100) based on requirement compliance statuses.
 * Weights requirements by severity: critical=3, major=2, minor=1.
 * Returns score, maturity level label, and per-category breakdown.
 *
 * @deprecated This function is never called. Use computeCybersecurityScore()
 * from src/lib/services/cybersecurity-score.ts instead.
 */
export function calculateNIS2MaturityScore(
  requirementStatuses: { requirementId: string; status: string }[],
): {
  score: number;
  level: string;
  breakdown: Record<NIS2RequirementCategory, number>;
} {
  const severityWeights: Record<string, number> = {
    critical: 3,
    major: 2,
    minor: 1,
  };

  // Build a lookup from requirementId to status
  const statusMap = new Map<string, string>();
  for (const rs of requirementStatuses) {
    statusMap.set(rs.requirementId, rs.status);
  }

  // Accumulate scores per category
  const categoryTotals: Record<string, number> = {};
  const categoryAchieved: Record<string, number> = {};

  let totalWeight = 0;
  let achievedWeight = 0;

  for (const req of NIS2_REQUIREMENTS) {
    const weight = severityWeights[req.severity] || 1;
    totalWeight += weight;

    if (!categoryTotals[req.category]) {
      categoryTotals[req.category] = 0;
      categoryAchieved[req.category] = 0;
    }
    categoryTotals[req.category] += weight;

    const status = statusMap.get(req.id) || "not_assessed";

    if (status === "compliant") {
      achievedWeight += weight;
      categoryAchieved[req.category] += weight;
    } else if (status === "partial") {
      achievedWeight += weight * 0.5;
      categoryAchieved[req.category] += weight * 0.5;
    }
    // non_compliant, not_assessed, not_applicable = 0
  }

  const score =
    totalWeight > 0 ? Math.round((achievedWeight / totalWeight) * 100) : 0;

  // Determine maturity level
  let level: string;
  if (score <= 20) {
    level = "Initial — Ad-hoc security practices with minimal formal processes";
  } else if (score <= 40) {
    level =
      "Developing — Some security processes defined but inconsistently applied";
  } else if (score <= 60) {
    level = "Defined — Documented security procedures consistently followed";
  } else if (score <= 80) {
    level = "Managed — Security measures actively measured and controlled";
  } else {
    level =
      "Optimizing — Continuous improvement with proactive threat management";
  }

  // Build per-category breakdown
  const allCategories: NIS2RequirementCategory[] = [
    "policies_risk_analysis",
    "incident_handling",
    "business_continuity",
    "supply_chain",
    "network_acquisition",
    "effectiveness_assessment",
    "cyber_hygiene",
    "cryptography",
    "hr_access_asset",
    "mfa_authentication",
    "governance",
    "registration",
    "reporting",
    "information_sharing",
  ];

  const breakdown = {} as Record<NIS2RequirementCategory, number>;
  for (const cat of allCategories) {
    const total = categoryTotals[cat] || 0;
    const achieved = categoryAchieved[cat] || 0;
    breakdown[cat] = total > 0 ? Math.round((achieved / total) * 100) : 0;
  }

  return { score, level, breakdown };
}

/**
 * Determine if an entity is eligible for proportionality under NIS2 Art. 21(1).
 *
 * NIS2 Art. 21(1) requires that measures be "proportionate" taking into account:
 * - The entity's degree of exposure to risks
 * - The entity's size
 * - The likelihood and severity of potential incidents
 * - The cost of implementation relative to the entity's resources
 *
 * For space operators, proportionality applies primarily to smaller entities
 * without critical infrastructure responsibilities.
 */
export function isEligibleForProportionality(answers: NIS2AssessmentAnswers): {
  eligible: boolean;
  reason: string;
} {
  // Large entities are not eligible for proportionality simplifications
  if (answers.entitySize === "large") {
    return {
      eligible: false,
      reason:
        "Large entities (250+ employees or EUR 50M+ turnover) are expected to implement the full set of " +
        "NIS2 Art. 21 measures without significant simplifications. Proportionality under Art. 21(1) primarily " +
        "benefits smaller entities with limited resources.",
    };
  }

  // Medium entities operating critical infrastructure
  if (
    answers.entitySize === "medium" &&
    (answers.operatesGroundInfra === true || answers.operatesSatComms === true)
  ) {
    return {
      eligible: false,
      reason:
        "Medium-sized entities operating critical space infrastructure (ground stations, satellite communications) " +
        "are expected to implement comprehensive NIS2 measures due to the potential impact of service disruption. " +
        "Limited proportionality may apply to non-critical support systems.",
    };
  }

  // Medium entities without critical infrastructure
  if (answers.entitySize === "medium") {
    return {
      eligible: true,
      reason:
        "As a medium-sized entity without critical space infrastructure responsibilities, you may apply " +
        "proportionate implementation of NIS2 Art. 21 measures. This means: risk assessments may use simplified " +
        "methodologies, security audits may be less frequent, and some advanced measures (e.g., TLPT, 24/7 SOC) " +
        "may be implemented in reduced form. Requirements marked 'canBeSimplified' in the assessment indicate where " +
        "proportionality can be applied.",
    };
  }

  // Small entities
  if (answers.entitySize === "small") {
    return {
      eligible: true,
      reason:
        "As a small entity, you are eligible for proportionate implementation under NIS2 Art. 21(1). " +
        "This allows: use of standardised risk assessment templates rather than full methodologies, reduced " +
        "audit frequency, basic monitoring rather than 24/7 SOC, and simplified documentation requirements. " +
        "Requirements marked 'canBeSimplified' indicate where proportionality applies. Focus on the most " +
        "critical requirements first.",
    };
  }

  // Micro entities should typically be out of scope, but if they reach here:
  if (answers.entitySize === "micro") {
    return {
      eligible: true,
      reason:
        "Micro entities are generally excluded from NIS2 scope. If your entity falls under an exception " +
        "(Art. 2(2)), maximum proportionality applies. Implement only the most critical measures with simplified " +
        "approaches. Consider pooling resources with other micro operators for shared security services.",
    };
  }

  return {
    eligible: false,
    reason:
      "Unable to determine proportionality eligibility. Please provide organisation size information.",
  };
}
