/**
 * ASTRA Regulatory Knowledge: NIS2 Directive
 *
 * Structured knowledge base for NIS2 (EU 2022/2555) requirements,
 * specifically tailored for space sector entities.
 */

import type { NIS2Requirement } from "../types";

// ─── Entity Classification Logic ───

export type NIS2EntityType = "essential" | "important" | "out_of_scope";

export interface NIS2ClassificationCriteria {
  sector: string;
  subSector?: string;
  employeeThreshold: number;
  turnoverThreshold: number;
  balanceSheetThreshold: number;
  specialCriteria?: string[];
}

export const SPACE_SECTOR_CLASSIFICATION: NIS2ClassificationCriteria = {
  sector: "Space",
  subSector:
    "Operators of ground-based infrastructure supporting provision of space-based services",
  employeeThreshold: 50,
  turnoverThreshold: 10_000_000,
  balanceSheetThreshold: 10_000_000,
  specialCriteria: [
    "Operators of ground-based infrastructure owned, managed and operated by Member States or private parties",
    "Supporting the provision of space-based services (excluding electronic communications)",
    "Satellite operators providing services essential for critical societal functions",
  ],
};

export function classifyNIS2Entity(
  employeeCount: number,
  annualTurnover: number,
  balanceSheet: number,
  isCriticalServiceProvider: boolean = false,
): NIS2EntityType {
  // Space sector is listed in Annex I (sectors of high criticality)
  // Medium and large entities are automatically classified

  const isMediumOrLarge =
    employeeCount >= 50 ||
    annualTurnover >= 10_000_000 ||
    balanceSheet >= 10_000_000;

  if (!isMediumOrLarge && !isCriticalServiceProvider) {
    return "out_of_scope";
  }

  // Large entities or critical service providers are essential
  const isLarge =
    employeeCount >= 250 ||
    annualTurnover >= 50_000_000 ||
    balanceSheet >= 43_000_000;

  if (isLarge || isCriticalServiceProvider) {
    return "essential";
  }

  return "important";
}

// ─── Requirement Categories ───

export const NIS2_REQUIREMENT_CATEGORIES = {
  policies_risk_analysis: {
    code: "a",
    title: "Policies on risk analysis and information system security",
    articleRef: "Art. 21(2)(a)",
    description:
      "Documented security policies and structured risk assessment processes.",
  },
  incident_handling: {
    code: "b",
    title: "Incident handling",
    articleRef: "Art. 21(2)(b)",
    description:
      "Detection, response, and recovery from cybersecurity incidents.",
  },
  business_continuity: {
    code: "c",
    title: "Business continuity and crisis management",
    articleRef: "Art. 21(2)(c)",
    description:
      "Backup management, disaster recovery, and crisis management procedures.",
  },
  supply_chain: {
    code: "d",
    title: "Supply chain security",
    articleRef: "Art. 21(2)(d)",
    description:
      "Security measures for supplier and service provider relationships.",
  },
  acquisition_security: {
    code: "e",
    title: "Security in acquisition, development and maintenance",
    articleRef: "Art. 21(2)(e)",
    description:
      "Security throughout the system lifecycle including vulnerability handling.",
  },
  effectiveness_assessment: {
    code: "f",
    title: "Policies to assess effectiveness",
    articleRef: "Art. 21(2)(f)",
    description: "Testing and auditing of cybersecurity measures.",
  },
  cyber_hygiene: {
    code: "g",
    title: "Basic cyber hygiene and training",
    articleRef: "Art. 21(2)(g)",
    description: "Foundational security practices and staff awareness.",
  },
  cryptography: {
    code: "h",
    title: "Cryptography and encryption",
    articleRef: "Art. 21(2)(h)",
    description: "Policies and procedures for cryptographic controls.",
  },
  hr_security: {
    code: "i",
    title: "Human resources security and access control",
    articleRef: "Art. 21(2)(i)",
    description: "Personnel security and asset access management.",
  },
  authentication: {
    code: "j",
    title: "Multi-factor authentication and secure communications",
    articleRef: "Art. 21(2)(j)",
    description: "Strong authentication and emergency communication systems.",
  },
  incident_notification: {
    code: "notification",
    title: "Incident notification obligations",
    articleRef: "Art. 23",
    description: "Timeline and content requirements for incident reporting.",
  },
  governance: {
    code: "governance",
    title: "Management body obligations",
    articleRef: "Art. 20",
    description: "Board-level accountability and oversight requirements.",
  },
} as const;

// ─── Key NIS2 Requirements (Space-Specific) ───

export const NIS2_KEY_REQUIREMENTS: NIS2Requirement[] = [
  // Art. 21(2)(a) - Risk Analysis
  {
    id: "nis2-risk-policy",
    category: "policies_risk_analysis",
    categoryCode: "a",
    title: "Information Security Policy for Space Systems",
    description:
      "Documented information security policy covering ground segment, space segment, and inter-segment communication links. Must be approved by management and reviewed annually.",
    implementationGuidance: [
      "Cover all three segments: ground, space, and link",
      "Reference ECSS-Q-ST-80C for space product assurance",
      "Align review cycles with mission phases",
      "Include space-specific threats (RF interference, ASAT, space weather)",
    ],
    articleReference: "Art. 21(2)(a)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Space operators must address unique threats including RF jamming/spoofing, space weather events, and orbital debris impacts on cyber systems.",
  },
  {
    id: "nis2-risk-assessment",
    category: "policies_risk_analysis",
    categoryCode: "a",
    title: "Cybersecurity Risk Analysis for Space Operations",
    description:
      "Structured risk analysis identifying, assessing, and prioritising cybersecurity risks specific to space operations.",
    implementationGuidance: [
      "Include space-domain threats: jamming, spoofing, command injection",
      "Use ENISA and ESA space threat catalogues",
      "Map risks to mission phases and operational modes",
      "Consider supply chain risks for flight software",
    ],
    articleReference: "Art. 21(2)(a)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Must account for ground station compromise, GNSS signal spoofing, and uplink command injection scenarios.",
  },

  // Art. 21(2)(b) - Incident Handling
  {
    id: "nis2-incident-detection",
    category: "incident_handling",
    categoryCode: "b",
    title: "Space System Incident Detection",
    description:
      "Capabilities to detect cybersecurity incidents across ground and space segments, including anomaly detection for spacecraft telemetry.",
    implementationGuidance: [
      "Monitor ground station networks and spacecraft telemetry",
      "Implement anomaly detection for command/control links",
      "Correlate space weather events with system anomalies",
      "Integrate with EU-CyCLONe for cross-border incidents",
    ],
    articleReference: "Art. 21(2)(b)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Detection must distinguish between cyber incidents and space environment effects (radiation, debris impact).",
  },
  {
    id: "nis2-incident-response",
    category: "incident_handling",
    categoryCode: "b",
    title: "Space Operations Incident Response",
    description:
      "Documented procedures for responding to cybersecurity incidents affecting space operations, including spacecraft safe mode procedures.",
    implementationGuidance: [
      "Define escalation paths for different incident severities",
      "Include spacecraft safe mode and recovery procedures",
      "Coordinate with SSA providers during conjunction-related incidents",
      "Establish communication protocols with NCA and CSIRT",
    ],
    articleReference: "Art. 21(2)(b)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Response procedures must account for communication latency and limited spacecraft commanding windows.",
  },

  // Art. 21(2)(c) - Business Continuity
  {
    id: "nis2-business-continuity",
    category: "business_continuity",
    categoryCode: "c",
    title: "Space Operations Continuity",
    description:
      "Plans ensuring continuity of space operations during and after cybersecurity incidents, including backup ground stations and alternative communication paths.",
    implementationGuidance: [
      "Maintain redundant ground station capabilities",
      "Document alternative TT&C paths",
      "Establish data backup and recovery procedures",
      "Define RTO/RPO for critical mission functions",
    ],
    articleReference: "Art. 21(2)(c)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Must address single points of failure in ground segment and limited on-orbit redundancy options.",
  },

  // Art. 21(2)(d) - Supply Chain
  {
    id: "nis2-supply-chain",
    category: "supply_chain",
    categoryCode: "d",
    title: "Space Supply Chain Security",
    description:
      "Security measures for relationships with suppliers of flight hardware, ground systems, and space services.",
    implementationGuidance: [
      "Assess cybersecurity posture of component suppliers",
      "Require secure development practices for flight software",
      "Verify integrity of firmware and software updates",
      "Include security clauses in supplier contracts",
    ],
    articleReference: "Art. 21(2)(d)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Space supply chains are long (3-5 years) with limited ability to patch deployed spacecraft. Security must be built-in from design phase.",
  },

  // Art. 21(2)(h) - Cryptography
  {
    id: "nis2-cryptography",
    category: "cryptography",
    categoryCode: "h",
    title: "Space Communications Encryption",
    description:
      "Cryptographic protection for command uplinks, telemetry downlinks, and inter-satellite links using space-qualified encryption standards.",
    implementationGuidance: [
      "Encrypt all TT&C links (CCSDS standards recommended)",
      "Implement authenticated commands to prevent injection",
      "Use space-qualified cryptographic modules",
      "Plan for crypto agility (algorithm updates)",
    ],
    articleReference: "Art. 21(2)(h)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Must balance encryption strength with limited on-board processing power and bandwidth constraints.",
  },

  // Art. 23 - Incident Notification
  {
    id: "nis2-notification-early",
    category: "incident_notification",
    categoryCode: "notification",
    title: "Early Warning (24 hours)",
    description:
      "Without undue delay, and within 24 hours of becoming aware of a significant incident, provide early warning to CSIRT/NCA.",
    implementationGuidance: [
      "Establish 24/7 incident detection and reporting capability",
      "Pre-register with national CSIRT",
      "Define 'significant incident' thresholds for space operations",
      "Template early warning forms ready for rapid submission",
    ],
    timelineRequirements: "Within 24 hours of incident detection",
    articleReference: "Art. 23(4)(a)",
    applicableEntityTypes: ["essential", "important"],
    spaceSpecificConsiderations:
      "Space incidents may have delayed detection due to communication windows. Timeline starts from confirmed awareness.",
  },
  {
    id: "nis2-notification-initial",
    category: "incident_notification",
    categoryCode: "notification",
    title: "Initial Notification (72 hours)",
    description:
      "Within 72 hours, provide initial notification with preliminary assessment including severity, impact, and indicators of compromise.",
    implementationGuidance: [
      "Include affected systems (ground/space/link segments)",
      "Estimate number of affected users/services",
      "Provide initial severity assessment",
      "Share known IoCs with CSIRT",
    ],
    timelineRequirements: "Within 72 hours of early warning",
    articleReference: "Art. 23(4)(b)",
    applicableEntityTypes: ["essential", "important"],
  },
  {
    id: "nis2-notification-final",
    category: "incident_notification",
    categoryCode: "notification",
    title: "Final Report (1 month)",
    description:
      "Within one month, submit final report with root cause analysis, remediation measures, and cross-border impact assessment.",
    implementationGuidance: [
      "Complete root cause analysis",
      "Document all remediation measures taken",
      "Assess cross-border impact on connected services",
      "Include lessons learned and preventive measures",
    ],
    timelineRequirements: "Within 1 month of incident resolution",
    articleReference: "Art. 23(4)(d)",
    applicableEntityTypes: ["essential", "important"],
  },
];

// ─── Penalties ───

export const NIS2_PENALTIES = {
  essential: {
    maxFine: 10_000_000,
    maxTurnoverPercent: 2,
    description:
      "Maximum EUR 10,000,000 or 2% of total worldwide annual turnover",
  },
  important: {
    maxFine: 7_000_000,
    maxTurnoverPercent: 1.4,
    description:
      "Maximum EUR 7,000,000 or 1.4% of total worldwide annual turnover",
  },
};

// ─── Incident Notification Timeline ───

export const INCIDENT_NOTIFICATION_TIMELINE = {
  earlyWarning: {
    deadline: "24 hours",
    content:
      "Indication of significant incident, suspected unlawful/malicious act, potential cross-border impact",
    articleRef: "Art. 23(4)(a)",
  },
  initialNotification: {
    deadline: "72 hours",
    content:
      "Update on early warning, initial assessment of severity and impact, indicators of compromise",
    articleRef: "Art. 23(4)(b)",
  },
  intermediateReport: {
    deadline: "Upon request",
    content: "Status updates during ongoing incident handling",
    articleRef: "Art. 23(4)(c)",
  },
  finalReport: {
    deadline: "1 month",
    content:
      "Root cause analysis, mitigation measures, cross-border impact assessment",
    articleRef: "Art. 23(4)(d)",
  },
};

// ─── Lookup Functions ───

export function getRequirementsByCategory(category: string): NIS2Requirement[] {
  return NIS2_KEY_REQUIREMENTS.filter((r) => r.category === category);
}

export function getRequirementsForEntityType(
  entityType: NIS2EntityType,
): NIS2Requirement[] {
  if (entityType === "out_of_scope") return [];
  return NIS2_KEY_REQUIREMENTS.filter((r) =>
    r.applicableEntityTypes.includes(entityType),
  );
}

export function searchRequirements(query: string): NIS2Requirement[] {
  const lowerQuery = query.toLowerCase();
  return NIS2_KEY_REQUIREMENTS.filter(
    (r) =>
      r.title.toLowerCase().includes(lowerQuery) ||
      r.description.toLowerCase().includes(lowerQuery) ||
      r.implementationGuidance.some((g) =>
        g.toLowerCase().includes(lowerQuery),
      ),
  );
}

// ─── Summary for ASTRA Context ───

export const NIS2_SUMMARY = `
The NIS2 Directive (EU 2022/2555) establishes cybersecurity requirements for essential and important entities across critical sectors, including Space (Annex I, Sector 11).

**Space Sector Scope**: Operators of ground-based infrastructure supporting provision of space-based services, excluding electronic communications networks.

**Entity Classification**:
- Essential entities: Large enterprises (250+ employees OR EUR 50M+ turnover) or critical service providers
- Important entities: Medium enterprises (50+ employees OR EUR 10M+ turnover)
- SMEs below thresholds are generally out of scope unless providing critical services

**Core Requirements (Art. 21)**:
(a) Risk analysis and information security policies
(b) Incident handling procedures
(c) Business continuity and crisis management
(d) Supply chain security
(e) Security in system acquisition/development
(f) Effectiveness assessment
(g) Cyber hygiene and training
(h) Cryptography and encryption
(i) HR security and access control
(j) Multi-factor authentication and secure communications

**Incident Notification Timeline**:
- 24 hours: Early warning to CSIRT/NCA
- 72 hours: Initial notification with preliminary assessment
- 1 month: Final report with root cause analysis

**Penalties**:
- Essential entities: Up to EUR 10M or 2% global turnover
- Important entities: Up to EUR 7M or 1.4% global turnover

**Space-Specific Considerations**:
- Must address RF jamming, spoofing, and command injection threats
- Supply chain security critical due to long development cycles
- Limited patching capability once spacecraft deployed
- Integration with EU Space Act cybersecurity requirements (Art. 74-85)
`.trim();
