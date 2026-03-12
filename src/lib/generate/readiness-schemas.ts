/**
 * Generate 2.0 — Readiness Schemas
 *
 * Maps each of the 16 NCA document types to the data fields required
 * for generation. Each field carries a weight:
 *   3 = critical (must-have for meaningful output)
 *   2 = important (significantly improves quality)
 *   1 = nice-to-have (adds detail but not essential)
 */

import type { ReadinessSchema, NCADocumentType } from "./types";

// ─── Schema Definitions ───

export const READINESS_SCHEMAS: Record<NCADocumentType, ReadinessSchema> = {
  // ── Category A: Debris Mitigation ──

  DMP: {
    documentType: "DMP",
    fields: [
      { source: "debris", field: "orbitType", weight: 3 },
      { source: "debris", field: "satelliteCount", weight: 3 },
      { source: "debris", field: "deorbitStrategy", weight: 3 },
      { source: "debris", field: "altitudeKm", weight: 2 },
      { source: "debris", field: "plannedDurationYears", weight: 2 },
      { source: "debris", field: "hasManeuverability", weight: 2 },
      { source: "user", field: "operatorType", weight: 2 },
      { source: "spacecraft", field: "length>=1", weight: 1 },
      { source: "debris", field: "complianceScore", weight: 1 },
    ],
  },

  ORBITAL_LIFETIME: {
    documentType: "ORBITAL_LIFETIME",
    fields: [
      { source: "debris", field: "orbitType", weight: 3 },
      { source: "debris", field: "altitudeKm", weight: 3 },
      { source: "debris", field: "plannedDurationYears", weight: 3 },
      { source: "debris", field: "satelliteCount", weight: 2 },
      { source: "debris", field: "hasManeuverability", weight: 2 },
      { source: "debris", field: "deorbitStrategy", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  COLLISION_AVOIDANCE: {
    documentType: "COLLISION_AVOIDANCE",
    fields: [
      { source: "debris", field: "orbitType", weight: 3 },
      { source: "debris", field: "hasManeuverability", weight: 3 },
      { source: "debris", field: "caServiceProvider", weight: 2 },
      { source: "debris", field: "satelliteCount", weight: 2 },
      { source: "debris", field: "altitudeKm", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
      { source: "spacecraft", field: "length>=1", weight: 1 },
    ],
  },

  EOL_DISPOSAL: {
    documentType: "EOL_DISPOSAL",
    fields: [
      { source: "debris", field: "deorbitStrategy", weight: 3 },
      { source: "debris", field: "orbitType", weight: 3 },
      { source: "debris", field: "plannedDurationYears", weight: 2 },
      { source: "debris", field: "hasPropulsion", weight: 2 },
      { source: "debris", field: "altitudeKm", weight: 2 },
      { source: "debris", field: "deorbitTimelineYears", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  PASSIVATION: {
    documentType: "PASSIVATION",
    fields: [
      { source: "debris", field: "hasPassivationCap", weight: 3 },
      { source: "debris", field: "hasPropulsion", weight: 2 },
      { source: "debris", field: "orbitType", weight: 2 },
      { source: "debris", field: "deorbitStrategy", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
      { source: "spacecraft", field: "length>=1", weight: 1 },
    ],
  },

  REENTRY_RISK: {
    documentType: "REENTRY_RISK",
    fields: [
      { source: "debris", field: "deorbitStrategy", weight: 3 },
      { source: "debris", field: "orbitType", weight: 3 },
      { source: "debris", field: "altitudeKm", weight: 2 },
      { source: "debris", field: "satelliteCount", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
      { source: "spacecraft", field: "length>=1", weight: 1 },
    ],
  },

  DEBRIS_SUPPLY_CHAIN: {
    documentType: "DEBRIS_SUPPLY_CHAIN",
    fields: [
      { source: "debris", field: "satelliteCount", weight: 2 },
      { source: "debris", field: "constellationTier", weight: 2 },
      { source: "user", field: "operatorType", weight: 2 },
      { source: "organization", field: "name", weight: 1 },
      { source: "spacecraft", field: "length>=1", weight: 1 },
    ],
  },

  LIGHT_RF_POLLUTION: {
    documentType: "LIGHT_RF_POLLUTION",
    fields: [
      { source: "debris", field: "orbitType", weight: 3 },
      { source: "debris", field: "altitudeKm", weight: 3 },
      { source: "debris", field: "satelliteCount", weight: 2 },
      { source: "debris", field: "constellationTier", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  // ── Category B: Cybersecurity ──

  CYBER_POLICY: {
    documentType: "CYBER_POLICY",
    fields: [
      { source: "cybersecurity", field: "organizationSize", weight: 3 },
      { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
      { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      { source: "cybersecurity", field: "hasIncidentResponsePlan", weight: 2 },
      { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      { source: "user", field: "operatorType", weight: 2 },
    ],
  },

  CYBER_RISK_ASSESSMENT: {
    documentType: "CYBER_RISK_ASSESSMENT",
    fields: [
      { source: "cybersecurity", field: "organizationSize", weight: 3 },
      { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
      { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 3 },
      { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      { source: "cybersecurity", field: "maturityScore", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  INCIDENT_RESPONSE: {
    documentType: "INCIDENT_RESPONSE",
    fields: [
      { source: "cybersecurity", field: "hasIncidentResponsePlan", weight: 3 },
      { source: "cybersecurity", field: "organizationSize", weight: 3 },
      { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
      { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  BCP_RECOVERY: {
    documentType: "BCP_RECOVERY",
    fields: [
      { source: "cybersecurity", field: "hasBCP", weight: 3 },
      { source: "cybersecurity", field: "organizationSize", weight: 3 },
      { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
      { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  ACCESS_CONTROL: {
    documentType: "ACCESS_CONTROL",
    fields: [
      { source: "cybersecurity", field: "organizationSize", weight: 3 },
      { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
      { source: "cybersecurity", field: "employeeCount", weight: 2 },
      { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  SUPPLY_CHAIN_SECURITY: {
    documentType: "SUPPLY_CHAIN_SECURITY",
    fields: [
      { source: "cybersecurity", field: "criticalSupplierCount", weight: 3 },
      { source: "cybersecurity", field: "organizationSize", weight: 2 },
      { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
      { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  EUSRN_PROCEDURES: {
    documentType: "EUSRN_PROCEDURES",
    fields: [
      { source: "cybersecurity", field: "hasIncidentResponsePlan", weight: 3 },
      { source: "cybersecurity", field: "organizationSize", weight: 3 },
      { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  COMPLIANCE_MATRIX: {
    documentType: "COMPLIANCE_MATRIX",
    fields: [
      { source: "cybersecurity", field: "organizationSize", weight: 3 },
      { source: "cybersecurity", field: "maturityScore", weight: 3 },
      { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
      { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      { source: "user", field: "operatorType", weight: 1 },
    ],
  },

  // ── Category C: General / Cross-Cutting ──

  AUTHORIZATION_APPLICATION: {
    documentType: "AUTHORIZATION_APPLICATION",
    fields: [
      { source: "organization", field: "name", weight: 3 },
      { source: "user", field: "operatorType", weight: 3 },
      { source: "debris", field: "complianceScore", weight: 2 },
      { source: "cybersecurity", field: "maturityScore", weight: 2 },
      { source: "spacecraft", field: "length>=1", weight: 2 },
      { source: "debris", field: "orbitType", weight: 1 },
    ],
  },

  ENVIRONMENTAL_FOOTPRINT: {
    documentType: "ENVIRONMENTAL_FOOTPRINT",
    fields: [
      { source: "debris", field: "orbitType", weight: 3 },
      { source: "debris", field: "satelliteCount", weight: 3 },
      { source: "debris", field: "deorbitStrategy", weight: 2 },
      { source: "debris", field: "altitudeKm", weight: 2 },
      { source: "user", field: "operatorType", weight: 2 },
      { source: "spacecraft", field: "length>=1", weight: 1 },
    ],
  },

  INSURANCE_COMPLIANCE: {
    documentType: "INSURANCE_COMPLIANCE",
    fields: [
      { source: "organization", field: "name", weight: 3 },
      { source: "user", field: "operatorType", weight: 3 },
      { source: "debris", field: "orbitType", weight: 2 },
      { source: "debris", field: "satelliteCount", weight: 2 },
      { source: "spacecraft", field: "length>=1", weight: 1 },
    ],
  },

  // ── Category D: Safety ──

  HAZARD_REPORT: {
    documentType: "HAZARD_REPORT",
    fields: [
      { source: "spacecraft", field: "length>=1", weight: 3 },
      { source: "organization", field: "name", weight: 3 },
    ],
  },
};
