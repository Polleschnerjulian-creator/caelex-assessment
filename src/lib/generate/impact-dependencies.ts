/**
 * Generate 2.0 — Impact Dependencies
 *
 * Static mapping: which assessment data field affects which sections
 * in which documents. Used by Impact Analysis to instantly show
 * affected documents when data changes.
 */

import type { NCADocumentType } from "./types";

export interface SectionDependency {
  documentType: NCADocumentType;
  sectionIndex: number;
  sectionTitle: string;
  impactLevel: "invalidates" | "requires_review" | "minor_update";
  reason: string;
}

export interface DependencyMapping {
  field: string;
  source: "debris" | "cybersecurity" | "spacecraft" | "user";
  affects: SectionDependency[];
}

export const DEPENDENCY_MAP: DependencyMapping[] = [
  // ── Debris Assessment Fields ──

  {
    field: "altitudeKm",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 2,
        sectionTitle: "Mission Overview & Orbital Parameters",
        impactLevel: "requires_review",
        reason: "Altitude parameter stated in mission description",
      },
      {
        documentType: "DMP",
        sectionIndex: 4,
        sectionTitle: "Orbital Lifetime Analysis (25-Year Rule)",
        impactLevel: "invalidates",
        reason: "Orbital lifetime calculation depends directly on altitude",
      },
      {
        documentType: "ORBITAL_LIFETIME",
        sectionIndex: 2,
        sectionTitle: "Orbital Parameters",
        impactLevel: "invalidates",
        reason: "Primary input parameter for all calculations",
      },
      {
        documentType: "ORBITAL_LIFETIME",
        sectionIndex: 3,
        sectionTitle: "Atmospheric Drag Analysis",
        impactLevel: "invalidates",
        reason: "Drag forces change with altitude",
      },
      {
        documentType: "ORBITAL_LIFETIME",
        sectionIndex: 5,
        sectionTitle: "Decay Modeling Results",
        impactLevel: "invalidates",
        reason: "All decay curves change with altitude",
      },
      {
        documentType: "ORBITAL_LIFETIME",
        sectionIndex: 6,
        sectionTitle: "25-Year Compliance Assessment",
        impactLevel: "invalidates",
        reason: "Compliance determination may change at different altitude",
      },
      {
        documentType: "EOL_DISPOSAL",
        sectionIndex: 3,
        sectionTitle: "Disposal Maneuver Design",
        impactLevel: "invalidates",
        reason: "Delta-V budget for disposal changes with altitude",
      },
      {
        documentType: "EOL_DISPOSAL",
        sectionIndex: 4,
        sectionTitle: "Fuel Budget Analysis",
        impactLevel: "invalidates",
        reason: "Fuel allocation depends on disposal delta-V",
      },
      {
        documentType: "REENTRY_RISK",
        sectionIndex: 2,
        sectionTitle: "Re-Entry Scenario",
        impactLevel: "requires_review",
        reason: "Re-entry trajectory changes with orbital altitude",
      },
      {
        documentType: "LIGHT_RF_POLLUTION",
        sectionIndex: 2,
        sectionTitle: "Brightness Analysis",
        impactLevel: "requires_review",
        reason: "Apparent brightness changes with orbital altitude",
      },
    ],
  },

  {
    field: "orbitType",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 2,
        sectionTitle: "Mission Overview & Orbital Parameters",
        impactLevel: "invalidates",
        reason: "Mission regime classification changes",
      },
      {
        documentType: "DMP",
        sectionIndex: 4,
        sectionTitle: "Orbital Lifetime Analysis (25-Year Rule)",
        impactLevel: "invalidates",
        reason: "25-year rule only applies to LEO",
      },
      {
        documentType: "DMP",
        sectionIndex: 6,
        sectionTitle: "End-of-Life Disposal Plan",
        impactLevel: "invalidates",
        reason: "LEO=deorbit vs GEO=graveyard",
      },
      {
        documentType: "EOL_DISPOSAL",
        sectionIndex: 2,
        sectionTitle: "Disposal Strategy Selection",
        impactLevel: "invalidates",
        reason: "Strategy depends entirely on orbit regime",
      },
      {
        documentType: "ORBITAL_LIFETIME",
        sectionIndex: 2,
        sectionTitle: "Orbital Parameters",
        impactLevel: "invalidates",
        reason: "Entire analysis framework changes",
      },
      {
        documentType: "REENTRY_RISK",
        sectionIndex: 2,
        sectionTitle: "Re-Entry Scenario",
        impactLevel: "invalidates",
        reason: "Only applicable for LEO/MEO",
      },
      {
        documentType: "ENVIRONMENTAL_FOOTPRINT",
        sectionIndex: 5,
        sectionTitle: "Lifecycle Phase Breakdown",
        impactLevel: "requires_review",
        reason: "Environmental impact differs by orbit",
      },
    ],
  },

  {
    field: "deorbitStrategy",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 6,
        sectionTitle: "End-of-Life Disposal Plan",
        impactLevel: "invalidates",
        reason: "Core disposal approach changed",
      },
      {
        documentType: "EOL_DISPOSAL",
        sectionIndex: 2,
        sectionTitle: "Disposal Strategy Selection",
        impactLevel: "invalidates",
        reason: "Primary topic of this section",
      },
      {
        documentType: "EOL_DISPOSAL",
        sectionIndex: 3,
        sectionTitle: "Disposal Maneuver Design",
        impactLevel: "invalidates",
        reason: "Maneuver depends on strategy",
      },
      {
        documentType: "REENTRY_RISK",
        sectionIndex: 2,
        sectionTitle: "Re-Entry Scenario",
        impactLevel: "invalidates",
        reason: "Controlled vs uncontrolled re-entry",
      },
      {
        documentType: "PASSIVATION",
        sectionIndex: 4,
        sectionTitle: "Passivation Sequence",
        impactLevel: "requires_review",
        reason: "Passivation timing relative to disposal",
      },
    ],
  },

  {
    field: "satelliteCount",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 2,
        sectionTitle: "Mission Overview & Orbital Parameters",
        impactLevel: "requires_review",
        reason: "Fleet size description",
      },
      {
        documentType: "COLLISION_AVOIDANCE",
        sectionIndex: 7,
        sectionTitle: "Operator Coordination",
        impactLevel: "requires_review",
        reason: "Fleet management complexity changes",
      },
      {
        documentType: "DEBRIS_SUPPLY_CHAIN",
        sectionIndex: 2,
        sectionTitle: "Supply Chain Mapping",
        impactLevel: "requires_review",
        reason: "Supply chain scales with fleet size",
      },
      {
        documentType: "INSURANCE_COMPLIANCE",
        sectionIndex: 1,
        sectionTitle: "Organization Risk Profile",
        impactLevel: "invalidates",
        reason: "TPL exposure scales with satellite count",
      },
      {
        documentType: "ENVIRONMENTAL_FOOTPRINT",
        sectionIndex: 2,
        sectionTitle: "Lifecycle Assessment Methodology",
        impactLevel: "invalidates",
        reason: "Environmental impact multiplied by fleet size",
      },
    ],
  },

  {
    field: "hasPropulsion",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 5,
        sectionTitle: "Collision Avoidance Strategy",
        impactLevel: "invalidates",
        reason: "Avoidance capability depends on propulsion",
      },
      {
        documentType: "EOL_DISPOSAL",
        sectionIndex: 3,
        sectionTitle: "Disposal Maneuver Design",
        impactLevel: "invalidates",
        reason: "No propulsion = no active disposal",
      },
      {
        documentType: "EOL_DISPOSAL",
        sectionIndex: 4,
        sectionTitle: "Fuel Budget Analysis",
        impactLevel: "invalidates",
        reason: "No propulsion = no fuel budget",
      },
      {
        documentType: "PASSIVATION",
        sectionIndex: 6,
        sectionTitle: "Propellant Depletion Procedure",
        impactLevel: "invalidates",
        reason: "Section irrelevant without propulsion",
      },
      {
        documentType: "COLLISION_AVOIDANCE",
        sectionIndex: 5,
        sectionTitle: "Maneuver Decision Criteria",
        impactLevel: "invalidates",
        reason: "No avoidance maneuvers possible",
      },
    ],
  },

  {
    field: "hasPassivationCap",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 7,
        sectionTitle: "Passivation & Fragmentation Prevention",
        impactLevel: "invalidates",
        reason: "Passivation capability changed",
      },
      {
        documentType: "PASSIVATION",
        sectionIndex: 2,
        sectionTitle: "Passivation Rationale",
        impactLevel: "invalidates",
        reason: "Fundamental capability changed",
      },
      {
        documentType: "PASSIVATION",
        sectionIndex: 4,
        sectionTitle: "Passivation Sequence",
        impactLevel: "invalidates",
        reason: "Entire sequence depends on capability",
      },
    ],
  },

  {
    field: "plannedDurationYears",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 4,
        sectionTitle: "Orbital Lifetime Analysis (25-Year Rule)",
        impactLevel: "requires_review",
        reason: "Mission duration affects lifetime analysis",
      },
      {
        documentType: "ORBITAL_LIFETIME",
        sectionIndex: 6,
        sectionTitle: "25-Year Compliance Assessment",
        impactLevel: "requires_review",
        reason: "Compliance depends on mission + post-mission lifetime",
      },
      {
        documentType: "ENVIRONMENTAL_FOOTPRINT",
        sectionIndex: 5,
        sectionTitle: "Lifecycle Phase Breakdown",
        impactLevel: "requires_review",
        reason: "Operational phase duration changed",
      },
    ],
  },

  {
    field: "caServiceProvider",
    source: "debris",
    affects: [
      {
        documentType: "DMP",
        sectionIndex: 5,
        sectionTitle: "Collision Avoidance Strategy",
        impactLevel: "minor_update",
        reason: "CA provider name update",
      },
      {
        documentType: "COLLISION_AVOIDANCE",
        sectionIndex: 3,
        sectionTitle: "Data Sources & SSA Providers",
        impactLevel: "invalidates",
        reason: "Primary data source changed",
      },
    ],
  },

  // ── Cybersecurity Assessment Fields ──

  {
    field: "organizationSize",
    source: "cybersecurity",
    affects: [
      {
        documentType: "CYBER_POLICY",
        sectionIndex: 3,
        sectionTitle: "Roles & Responsibilities",
        impactLevel: "requires_review",
        reason: "Org structure and role definitions change",
      },
      {
        documentType: "ACCESS_CONTROL",
        sectionIndex: 3,
        sectionTitle: "Access Control Policy",
        impactLevel: "requires_review",
        reason: "Scale of access management changes",
      },
      {
        documentType: "AUTHORIZATION_APPLICATION",
        sectionIndex: 1,
        sectionTitle: "Operator Profile",
        impactLevel: "requires_review",
        reason: "Organization description needs update",
      },
    ],
  },

  {
    field: "hasIncidentResponsePlan",
    source: "cybersecurity",
    affects: [
      {
        documentType: "INCIDENT_RESPONSE",
        sectionIndex: 2,
        sectionTitle: "Incident Classification Framework",
        impactLevel: "invalidates",
        reason: "Existing plan status changes entire document approach",
      },
      {
        documentType: "EUSRN_PROCEDURES",
        sectionIndex: 3,
        sectionTitle: "Notification Triggers",
        impactLevel: "requires_review",
        reason: "EUSRN builds on incident response plan",
      },
      {
        documentType: "COMPLIANCE_MATRIX",
        sectionIndex: 3,
        sectionTitle: "Requirements Matrix (Art. 74-95)",
        impactLevel: "requires_review",
        reason: "Art. 89-92 compliance status changes",
      },
    ],
  },

  {
    field: "isSimplifiedRegime",
    source: "cybersecurity",
    affects: [
      {
        documentType: "CYBER_POLICY",
        sectionIndex: 2,
        sectionTitle: "Policy Scope & Applicability",
        impactLevel: "invalidates",
        reason: "Light regime changes scope fundamentally",
      },
      {
        documentType: "CYBER_RISK_ASSESSMENT",
        sectionIndex: 2,
        sectionTitle: "Risk Assessment Methodology",
        impactLevel: "invalidates",
        reason: "Simplified assessment allowed under Art. 10(3)",
      },
      {
        documentType: "COMPLIANCE_MATRIX",
        sectionIndex: 3,
        sectionTitle: "Requirements Matrix (Art. 74-95)",
        impactLevel: "invalidates",
        reason: "Many requirements waived under light regime",
      },
      {
        documentType: "AUTHORIZATION_APPLICATION",
        sectionIndex: 4,
        sectionTitle: "Authorization Checklist (Art. 7)",
        impactLevel: "invalidates",
        reason: "Different checklist for simplified regime",
      },
    ],
  },

  {
    field: "hasSecurityTeam",
    source: "cybersecurity",
    affects: [
      {
        documentType: "CYBER_POLICY",
        sectionIndex: 3,
        sectionTitle: "Roles & Responsibilities",
        impactLevel: "requires_review",
        reason: "Security team existence affects governance structure",
      },
      {
        documentType: "INCIDENT_RESPONSE",
        sectionIndex: 3,
        sectionTitle: "Detection & Identification",
        impactLevel: "requires_review",
        reason: "Detection capabilities depend on security team",
      },
      {
        documentType: "ACCESS_CONTROL",
        sectionIndex: 6,
        sectionTitle: "Privileged Access Management",
        impactLevel: "requires_review",
        reason: "PAM oversight depends on security team",
      },
    ],
  },

  {
    field: "dataSensitivityLevel",
    source: "cybersecurity",
    affects: [
      {
        documentType: "CYBER_POLICY",
        sectionIndex: 5,
        sectionTitle: "Information Classification",
        impactLevel: "invalidates",
        reason: "Classification scheme changes with sensitivity level",
      },
      {
        documentType: "CYBER_RISK_ASSESSMENT",
        sectionIndex: 4,
        sectionTitle: "Threat Landscape Analysis",
        impactLevel: "requires_review",
        reason: "Threat profile changes with data sensitivity",
      },
    ],
  },

  {
    field: "criticalSupplierCount",
    source: "cybersecurity",
    affects: [
      {
        documentType: "SUPPLY_CHAIN_SECURITY",
        sectionIndex: 2,
        sectionTitle: "Supply Chain Mapping",
        impactLevel: "invalidates",
        reason: "Supplier count directly affects mapping scope",
      },
      {
        documentType: "SUPPLY_CHAIN_SECURITY",
        sectionIndex: 3,
        sectionTitle: "Supplier Risk Assessment",
        impactLevel: "invalidates",
        reason: "Risk assessment scope changes",
      },
    ],
  },

  {
    field: "hasBCP",
    source: "cybersecurity",
    affects: [
      {
        documentType: "BCP_RECOVERY",
        sectionIndex: 1,
        sectionTitle: "Executive Summary",
        impactLevel: "invalidates",
        reason: "BCP existence changes entire document approach",
      },
      {
        documentType: "BCP_RECOVERY",
        sectionIndex: 2,
        sectionTitle: "Business Impact Analysis",
        impactLevel: "invalidates",
        reason: "BIA approach depends on existing BCP",
      },
    ],
  },
];

/**
 * Get dependencies for a specific field and source.
 */
export function getDependencies(
  field: string,
  source: string,
): SectionDependency[] {
  const mapping = DEPENDENCY_MAP.find(
    (d) => d.field === field && d.source === source,
  );
  return mapping?.affects || [];
}
