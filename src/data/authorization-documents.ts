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

// Authorization document types required under EU Space Act
// Based on Art. 7-9 requirements

export interface AuthorizationDocumentTemplate {
  id: string;
  type: string;
  name: string;
  description: string;
  articleRef: string;
  required: boolean;
  applicableTo: string[]; // Operator types: SCO, LO, LSO, TCO, etc.
  category: "technical" | "legal" | "financial" | "environmental" | "safety";
  estimatedEffort: "low" | "medium" | "high";
  tips?: string[];
}

export const authorizationDocuments: AuthorizationDocumentTemplate[] = [
  // Core Application Documents
  {
    id: "mission_description",
    type: "mission_description",
    name: "Mission Description",
    description:
      "Comprehensive description of the space mission including objectives, timeline, orbital parameters, and operational concept.",
    articleRef: "Art. 7(2)(a)",
    required: true,
    applicableTo: ["SCO", "LO", "LSO", "ISOS", "ALL"],
    category: "technical",
    estimatedEffort: "medium",
    tips: [
      "Include detailed mission timeline with key milestones",
      "Describe primary and secondary mission objectives",
      "Specify orbital parameters (altitude, inclination, eccentricity)",
      "Include concept of operations (CONOPS) document",
    ],
  },
  {
    id: "technical_specs",
    type: "technical_specs",
    name: "Technical Specifications",
    description:
      "Detailed technical specifications of the space object including design, subsystems, and performance characteristics.",
    articleRef: "Art. 7(2)(b)",
    required: true,
    applicableTo: ["SCO", "LO", "LSO", "ALL"],
    category: "technical",
    estimatedEffort: "high",
    tips: [
      "Include spacecraft bus specifications",
      "Detail payload characteristics and interfaces",
      "Provide power budget and thermal analysis",
      "Include mass properties and structural analysis",
    ],
  },
  {
    id: "debris_mitigation_plan",
    type: "debris_mitigation_plan",
    name: "Debris Mitigation Plan",
    description:
      "Comprehensive plan for minimizing space debris generation during and after the mission, in compliance with EU Space Act debris requirements.",
    articleRef: "Art. 58-72",
    required: true,
    applicableTo: ["SCO", "LO", "ISOS", "ALL"],
    category: "environmental",
    estimatedEffort: "high",
    tips: [
      "Follow ISO 24113 Space Debris Mitigation standard",
      "Include passivation procedures",
      "Detail collision avoidance capabilities",
      "Specify end-of-life disposal strategy (re-entry or graveyard orbit)",
    ],
  },
  {
    id: "insurance_proof",
    type: "insurance_proof",
    name: "Third-Party Liability Insurance",
    description:
      "Proof of third-party liability insurance coverage meeting EU Space Act minimum requirements.",
    articleRef: "Art. 44-51",
    required: true,
    applicableTo: ["SCO", "LO", "LSO", "TCO", "ALL"],
    category: "financial",
    estimatedEffort: "medium",
    tips: [
      "Ensure coverage meets minimum requirements (typically €60M-100M)",
      "Coverage must be valid for mission duration",
      "Include launch and in-orbit phases",
      "Consider umbrella policies for constellation operators",
    ],
  },
  {
    id: "cybersecurity_assessment",
    type: "cybersecurity_assessment",
    name: "Cybersecurity Risk Assessment",
    description:
      "NIS2-aligned cybersecurity risk assessment covering ground segment, space segment, and communication links.",
    articleRef: "Art. 74-95",
    required: true,
    applicableTo: ["SCO", "LO", "LSO", "ISOS", "PDP", "ALL"],
    category: "safety",
    estimatedEffort: "high",
    tips: [
      "Follow NIS2 Directive requirements",
      "Include supply chain security assessment",
      "Detail incident response procedures",
      "Specify encryption standards for TT&C",
    ],
  },
  {
    id: "eol_disposal_plan",
    type: "eol_disposal_plan",
    name: "End-of-Life Disposal Plan",
    description:
      "Detailed plan for spacecraft disposal at end of mission, including deorbit timeline and method.",
    articleRef: "Art. 66-72",
    required: true,
    applicableTo: ["SCO", "ISOS", "ALL"],
    category: "environmental",
    estimatedEffort: "medium",
    tips: [
      "LEO satellites: 25-year deorbit rule (EU may require 5 years)",
      "GEO satellites: Graveyard orbit disposal",
      "Include propellant budget for disposal maneuvers",
      "Consider active debris removal as backup",
    ],
  },
  {
    id: "efd",
    type: "efd",
    name: "Environmental Footprint Declaration",
    description:
      "Declaration of environmental impact including manufacturing, launch, and operations phases.",
    articleRef: "Art. 96-100",
    required: false, // Required based on entity size
    applicableTo: ["SCO", "LO", "LSO", "ALL"],
    category: "environmental",
    estimatedEffort: "high",
    tips: [
      "Light regime entities have extended deadline (2032)",
      "Follow EU methodology for space activities",
      "Include lifecycle carbon footprint",
      "Consider Scope 1, 2, and 3 emissions",
    ],
  },

  // Legal Documents
  {
    id: "legal_entity_proof",
    type: "legal_entity_proof",
    name: "Legal Entity Documentation",
    description:
      "Proof of legal establishment in an EU Member State or third country.",
    articleRef: "Art. 6(1)",
    required: true,
    applicableTo: ["SCO", "LO", "LSO", "ISOS", "PDP", "ALL"],
    category: "legal",
    estimatedEffort: "low",
    tips: [
      "Include certificate of incorporation",
      "Provide organizational structure",
      "Detail ownership and control relationships",
      "For TCO: include legal representative appointment",
    ],
  },
  {
    id: "control_documentation",
    type: "control_documentation",
    name: "Control & Ownership Documentation",
    description:
      "Documentation proving effective control and ownership structure of the operating entity.",
    articleRef: "Art. 6(2)",
    required: true,
    applicableTo: ["SCO", "LO", "LSO", "ALL"],
    category: "legal",
    estimatedEffort: "medium",
    tips: [
      "Detail shareholder structure",
      "Identify ultimate beneficial owners",
      "Describe decision-making authority",
      "Include board composition",
    ],
  },
  {
    id: "eu_representative",
    type: "eu_representative",
    name: "EU Legal Representative",
    description:
      "Appointment of legal representative established in the EU (required for third country operators).",
    articleRef: "Art. 14(2)",
    required: true,
    applicableTo: ["TCO"],
    category: "legal",
    estimatedEffort: "medium",
    tips: [
      "Representative must be established in EU",
      "Include power of attorney",
      "Representative serves as contact for NCAs",
      "Consider specialized space law firms",
    ],
  },

  // Launch-Specific Documents
  {
    id: "launch_safety_assessment",
    type: "launch_safety_assessment",
    name: "Launch Safety Assessment",
    description:
      "Comprehensive safety assessment for launch operations including risk analysis and mitigation measures.",
    articleRef: "Art. 17-21",
    required: true,
    applicableTo: ["LO", "LSO"],
    category: "safety",
    estimatedEffort: "high",
    tips: [
      "Include flight termination system documentation",
      "Detail range safety procedures",
      "Provide hazard analysis",
      "Include emergency response plan",
    ],
  },
  {
    id: "launch_site_license",
    type: "launch_site_license",
    name: "Launch Site License Application",
    description:
      "Application for launch site operating license including site safety and environmental assessments.",
    articleRef: "Art. 17-21",
    required: true,
    applicableTo: ["LSO"],
    category: "legal",
    estimatedEffort: "high",
    tips: [
      "Include environmental impact assessment",
      "Detail safety zones and exclusion areas",
      "Provide emergency evacuation procedures",
      "Include ground support equipment documentation",
    ],
  },

  // Financial Documents
  {
    id: "financial_guarantee",
    type: "financial_guarantee",
    name: "Financial Guarantee / Bond",
    description:
      "Financial guarantee or bond to cover potential liabilities beyond insurance coverage.",
    articleRef: "Art. 48-51",
    required: false, // May be required based on mission risk
    applicableTo: ["SCO", "LO", "LSO", "ALL"],
    category: "financial",
    estimatedEffort: "medium",
    tips: [
      "May be required for high-risk missions",
      "Consider bank guarantee or escrow",
      "Amount based on mission risk assessment",
      "Can substitute for portion of insurance",
    ],
  },
  {
    id: "financial_statements",
    type: "financial_statements",
    name: "Financial Statements",
    description:
      "Audited financial statements demonstrating financial viability of the operator.",
    articleRef: "Art. 7(2)(f)",
    required: true,
    applicableTo: ["SCO", "LO", "LSO", "ALL"],
    category: "financial",
    estimatedEffort: "low",
    tips: [
      "Include last 2-3 years of audited statements",
      "Provide cash flow projections",
      "Detail mission funding sources",
      "Include shareholder commitment letters if startup",
    ],
  },

  // Operational Documents
  {
    id: "operations_manual",
    type: "operations_manual",
    name: "Operations Manual",
    description:
      "Comprehensive manual covering all operational procedures for the space mission.",
    articleRef: "Art. 7(2)(c)",
    required: true,
    applicableTo: ["SCO", "ISOS", "ALL"],
    category: "technical",
    estimatedEffort: "high",
    tips: [
      "Include nominal operations procedures",
      "Detail contingency procedures",
      "Specify operator qualifications",
      "Include shift handover procedures",
    ],
  },
  {
    id: "frequency_coordination",
    type: "frequency_coordination",
    name: "Frequency Coordination Documentation",
    description:
      "ITU frequency filing and coordination documentation for spacecraft communications.",
    articleRef: "Art. 7(2)(d)",
    required: true,
    applicableTo: ["SCO", "ISOS", "PDP", "ALL"],
    category: "technical",
    estimatedEffort: "medium",
    tips: [
      "Include ITU filing references",
      "Provide frequency coordination agreements",
      "Detail antenna specifications",
      "Include link budget analysis",
    ],
  },
  {
    id: "ground_segment_docs",
    type: "ground_segment_docs",
    name: "Ground Segment Documentation",
    description:
      "Documentation of ground segment infrastructure including mission control and ground stations.",
    articleRef: "Art. 7(2)(e)",
    required: true,
    applicableTo: ["SCO", "ISOS", "PDP", "ALL"],
    category: "technical",
    estimatedEffort: "medium",
    tips: [
      "Include mission control center details",
      "List ground station locations and capabilities",
      "Detail redundancy and failover procedures",
      "Provide data handling and storage information",
    ],
  },
];

// Get documents applicable to a specific operator type
export function getDocumentsForOperatorType(
  operatorType: string,
): AuthorizationDocumentTemplate[] {
  return authorizationDocuments.filter(
    (doc) =>
      doc.applicableTo.includes("ALL") ||
      doc.applicableTo.includes(operatorType),
  );
}

// Get required documents for a specific operator type
export function getRequiredDocuments(
  operatorType: string,
): AuthorizationDocumentTemplate[] {
  return getDocumentsForOperatorType(operatorType).filter(
    (doc) => doc.required,
  );
}

// Get documents by category
export function getDocumentsByCategory(
  category: AuthorizationDocumentTemplate["category"],
): AuthorizationDocumentTemplate[] {
  return authorizationDocuments.filter((doc) => doc.category === category);
}

// Document status workflow
export const documentStatusFlow = {
  not_started: {
    label: "Not Started",
    color: "text-white/30",
    bgColor: "bg-white/[0.02]",
    next: ["in_progress"],
  },
  in_progress: {
    label: "In Progress",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    next: ["ready", "not_started"],
  },
  ready: {
    label: "Ready",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    next: ["submitted", "in_progress"],
  },
  submitted: {
    label: "Submitted",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    next: ["approved", "rejected"],
  },
  approved: {
    label: "Approved",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    next: [],
  },
  rejected: {
    label: "Rejected",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    next: ["in_progress"],
  },
};

// Workflow status definitions
export const workflowStatusFlow = {
  not_started: {
    label: "Not Started",
    description: "Authorization process has not begun",
    color: "text-white/30",
    bgColor: "bg-white/[0.02]",
    step: 0,
  },
  in_progress: {
    label: "In Progress",
    description: "Preparing authorization documents",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    step: 1,
  },
  submitted: {
    label: "Submitted",
    description: "Application submitted to NCA",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    step: 2,
  },
  under_review: {
    label: "Under Review",
    description: "NCA is reviewing the application",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    step: 3,
  },
  approved: {
    label: "Approved",
    description: "Authorization granted",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    step: 4,
  },
  rejected: {
    label: "Rejected",
    description: "Authorization denied",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    step: -1,
  },
};
