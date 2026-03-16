/**
 * Generate 2.0 — Section-to-Data Mapping
 *
 * Maps each section of each NCA document type to the assessment fields it
 * needs. This is the section-granularity equivalent of readiness-schemas.ts.
 *
 * Field weights:
 *   3 = critical (must-have for meaningful output)
 *   2 = important (significantly improves quality)
 *   1 = nice-to-have (adds detail but not essential)
 */

import type { NCADocumentType } from "./types";

// ─── Interfaces ───

export interface SectionDataField {
  source: "debris" | "cybersecurity" | "spacecraft" | "user" | "organization";
  field: string;
  weight: 3 | 2 | 1;
  articleRef?: string;
  defaultAssumption?: string;
}

export interface SectionDataEntry {
  sectionIndex: number;
  fields: SectionDataField[];
}

// ─── Shared helpers ───

const coverPageFields: SectionDataField[] = [
  { source: "organization", field: "name", weight: 2 },
  { source: "user", field: "operatorType", weight: 2 },
];

// ─── Section Data Map ───

export const SECTION_DATA_MAP: Record<NCADocumentType, SectionDataEntry[]> = {
  // ── Category A: Debris Mitigation ──

  DMP: [
    // 0: Cover Page & Document Control
    {
      sectionIndex: 0,
      fields: coverPageFields,
    },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "complianceScore", weight: 1 },
      ],
    },
    // 2: Mission Overview & Orbital Parameters
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 3 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 3: Spacecraft Technical Description
    {
      sectionIndex: 3,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "debris", field: "hasManeuverability", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 4: Orbital Lifetime Analysis (25-Year Rule)
    {
      sectionIndex: 4,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 72",
        },
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 72",
        },
        { source: "debris", field: "plannedDurationYears", weight: 3 },
        { source: "debris", field: "hasManeuverability", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
      ],
    },
    // 5: Collision Avoidance Strategy
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "hasManeuverability", weight: 3 },
        { source: "debris", field: "caServiceProvider", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 6: End-of-Life Disposal Plan
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "deorbitTimelineYears", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 1 },
      ],
    },
    // 7: Passivation & Fragmentation Prevention
    {
      sectionIndex: 7,
      fields: [
        { source: "debris", field: "hasPassivationCap", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 8: Trackability & Identification
    {
      sectionIndex: 8,
      fields: [
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 9: Compliance Verification Matrix (Art. 58-73)
    {
      sectionIndex: 9,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 3,
          articleRef: "Art. 58-73",
        },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "hasManeuverability", weight: 2 },
        { source: "debris", field: "hasPassivationCap", weight: 1 },
      ],
    },
    // 10: Gap Analysis & Remediation Roadmap
    {
      sectionIndex: 10,
      fields: [
        { source: "debris", field: "complianceScore", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "orbitType", weight: 1 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  ORBITAL_LIFETIME: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Orbital Parameters
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 3: Atmospheric Drag Analysis
    {
      sectionIndex: 3,
      fields: [
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
        { source: "debris", field: "hasManeuverability", weight: 1 },
      ],
    },
    // 4: Solar Activity Projections
    {
      sectionIndex: 4,
      fields: [
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
      ],
    },
    // 5: Decay Modeling Results
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
        { source: "debris", field: "hasManeuverability", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 1 },
      ],
    },
    // 6: 25-Year Compliance Assessment
    {
      sectionIndex: 6,
      fields: [
        {
          source: "debris",
          field: "plannedDurationYears",
          weight: 3,
          articleRef: "Art. 72",
        },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "complianceScore", weight: 1 },
      ],
    },
    // 7: Sensitivity Analysis
    {
      sectionIndex: 7,
      fields: [
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
      ],
    },
    // 8: Conclusions
    {
      sectionIndex: 8,
      fields: [
        { source: "debris", field: "complianceScore", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  COLLISION_AVOIDANCE: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "hasManeuverability", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Conjunction Assessment Process
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "hasManeuverability", weight: 3 },
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "debris", field: "caServiceProvider", weight: 2 },
      ],
    },
    // 3: Data Sources & SSA Providers
    {
      sectionIndex: 3,
      fields: [
        { source: "debris", field: "caServiceProvider", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 1 },
      ],
    },
    // 4: Alert Handling & Escalation
    {
      sectionIndex: 4,
      fields: [
        { source: "debris", field: "hasManeuverability", weight: 3 },
        { source: "debris", field: "caServiceProvider", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 5: Maneuver Decision Criteria
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "hasManeuverability", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 1 },
      ],
    },
    // 6: Maneuver Execution
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "hasManeuverability", weight: 3 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 7: Operator Coordination
    {
      sectionIndex: 7,
      fields: [
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "debris", field: "caServiceProvider", weight: 2 },
      ],
    },
    // 8: Performance Metrics
    {
      sectionIndex: 8,
      fields: [
        { source: "debris", field: "hasManeuverability", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "debris", field: "complianceScore", weight: 1 },
      ],
    },
    // 9: Compliance Matrix
    {
      sectionIndex: 9,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 64",
        },
        { source: "debris", field: "hasManeuverability", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  EOL_DISPOSAL: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Disposal Strategy Selection
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
      ],
    },
    // 3: Disposal Maneuver Design
    {
      sectionIndex: 3,
      fields: [
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 4: Fuel Budget Analysis
    {
      sectionIndex: 4,
      fields: [
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "deorbitTimelineYears", weight: 2 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
      ],
    },
    // 5: Success Probability
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 1 },
      ],
    },
    // 6: Contingency Procedures
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 7: Ground Support
    {
      sectionIndex: 7,
      fields: [
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 8: Compliance Matrix
    {
      sectionIndex: 8,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 72",
        },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "deorbitTimelineYears", weight: 1 },
      ],
    },
  ],

  PASSIVATION: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "hasPassivationCap", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Passivation Rationale
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "hasPassivationCap",
          weight: 3,
          articleRef: "Art. 67(d)",
        },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 1 },
      ],
    },
    // 3: Energy Source Inventory
    {
      sectionIndex: 3,
      fields: [
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "hasPassivationCap", weight: 3 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 4: Passivation Sequence
    {
      sectionIndex: 4,
      fields: [
        { source: "debris", field: "hasPassivationCap", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
      ],
    },
    // 5: Battery Discharge Procedure
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "hasPassivationCap", weight: 3 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 6: Propellant Depletion Procedure
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 7: Pressure Vessel Safing
    {
      sectionIndex: 7,
      fields: [
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 8: Verification & Testing
    {
      sectionIndex: 8,
      fields: [
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 9: Compliance Matrix
    {
      sectionIndex: 9,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 67(d)",
        },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  REENTRY_RISK: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Re-Entry Scenario
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
      ],
    },
    // 3: Demise Analysis
    {
      sectionIndex: 3,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 2 },
      ],
    },
    // 4: Surviving Fragments Assessment
    {
      sectionIndex: 4,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 5: Ground Impact Footprint
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
      ],
    },
    // 6: Casualty Risk Calculation
    {
      sectionIndex: 6,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 7: Mitigation Measures
    {
      sectionIndex: 7,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "debris", field: "orbitType", weight: 1 },
      ],
    },
    // 8: Compliance Assessment
    {
      sectionIndex: 8,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 72",
        },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  DEBRIS_SUPPLY_CHAIN: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
    // 2: Supply Chain Mapping
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "constellationTier", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "organization", field: "name", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 3: Debris Mitigation Flow-Down Requirements
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "deorbitStrategy",
          weight: 3,
          articleRef: "Art. 73",
        },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "debris", field: "complianceScore", weight: 1 },
      ],
    },
    // 4: Supplier Compliance Assessment
    {
      sectionIndex: 4,
      fields: [
        { source: "debris", field: "constellationTier", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "debris", field: "complianceScore", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 5: Contractual Obligations
    {
      sectionIndex: 5,
      fields: [
        { source: "organization", field: "name", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 6: Verification & Audit Procedures
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "constellationTier", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
    // 7: Compliance Matrix
    {
      sectionIndex: 7,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 73",
        },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  LIGHT_RF_POLLUTION: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Brightness Analysis
    {
      sectionIndex: 2,
      fields: [
        {
          source: "debris",
          field: "altitudeKm",
          weight: 3,
          articleRef: "Art. 68",
        },
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 3: Anti-Reflective Measures
    {
      sectionIndex: 3,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 2 },
      ],
    },
    // 4: RF Interference Assessment
    {
      sectionIndex: 4,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 5: ITU Coordination
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 6: Astronomical Community Engagement
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "constellationTier", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
    // 7: Implementation Plan
    {
      sectionIndex: 7,
      fields: [
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "plannedDurationYears", weight: 1 },
      ],
    },
    // 8: Compliance Matrix
    {
      sectionIndex: 8,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 2,
          articleRef: "Art. 68",
        },
        { source: "debris", field: "orbitType", weight: 1 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  // ── Category B: Cybersecurity ──

  CYBER_POLICY: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "cybersecurity", field: "organizationSize", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Policy Scope & Applicability
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 3,
          articleRef: "Art. 74",
        },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 3: Roles & Responsibilities
    {
      sectionIndex: 3,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "employeeCount", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 4: Security Objectives & Principles
    {
      sectionIndex: 4,
      fields: [
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
      ],
    },
    // 5: Information Classification
    {
      sectionIndex: 5,
      fields: [
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 1 },
      ],
    },
    // 6: Acceptable Use Policy
    {
      sectionIndex: 6,
      fields: [
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "employeeCount", weight: 2 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
      ],
    },
    // 7: Policy Governance & Review
    {
      sectionIndex: 7,
      fields: [
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 1,
        },
      ],
    },
    // 8: Compliance Matrix (Art. 74-95)
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 74-95",
        },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  CYBER_RISK_ASSESSMENT: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "cybersecurity", field: "organizationSize", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "cybersecurity", field: "maturityScore", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Risk Assessment Methodology
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "existingCertifications",
          weight: 3,
          articleRef: "Art. 77-78",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      ],
    },
    // 3: Asset Inventory
    {
      sectionIndex: 3,
      fields: [
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 4: Threat Landscape Analysis
    {
      sectionIndex: 4,
      fields: [
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
      ],
    },
    // 5: Vulnerability Assessment
    {
      sectionIndex: 5,
      fields: [
        { source: "cybersecurity", field: "existingCertifications", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 3 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
      ],
    },
    // 6: Risk Evaluation & Prioritization
    {
      sectionIndex: 6,
      fields: [
        { source: "cybersecurity", field: "maturityScore", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 1 },
      ],
    },
    // 7: Risk Treatment Plan
    {
      sectionIndex: 7,
      fields: [
        { source: "cybersecurity", field: "maturityScore", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 8: Compliance Matrix
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 77-78",
        },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  INCIDENT_RESPONSE: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Incident Classification Framework
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "dataSensitivityLevel",
          weight: 3,
          articleRef: "Art. 89-92",
        },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 3 },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 2,
        },
      ],
    },
    // 3: Detection & Identification
    {
      sectionIndex: 3,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 1 },
      ],
    },
    // 4: Containment & Eradication
    {
      sectionIndex: 4,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 3 },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
        },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
      ],
    },
    // 5: Recovery Procedures
    {
      sectionIndex: 5,
      fields: [
        { source: "cybersecurity", field: "hasBCP", weight: 3 },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 2,
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
      ],
    },
    // 6: Notification Procedures (24h/72h/1mo)
    {
      sectionIndex: 6,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
          articleRef: "Art. 89-92",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 7: Post-Incident Review
    {
      sectionIndex: 7,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "maturityScore", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 1 },
      ],
    },
    // 8: Testing & Exercises
    {
      sectionIndex: 8,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 1 },
      ],
    },
    // 9: Compliance Matrix
    {
      sectionIndex: 9,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 89-92",
        },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 2,
        },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  BCP_RECOVERY: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "cybersecurity", field: "hasBCP", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Business Impact Analysis
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "spaceSegmentComplexity",
          weight: 3,
          articleRef: "Art. 85",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "cybersecurity", field: "hasBCP", weight: 2 },
      ],
    },
    // 3: Recovery Objectives (RTO/RPO)
    {
      sectionIndex: 3,
      fields: [
        { source: "cybersecurity", field: "hasBCP", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
      ],
    },
    // 4: Continuity Strategies
    {
      sectionIndex: 4,
      fields: [
        { source: "cybersecurity", field: "hasBCP", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
      ],
    },
    // 5: Recovery Procedures
    {
      sectionIndex: 5,
      fields: [
        { source: "cybersecurity", field: "hasBCP", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 2,
        },
      ],
    },
    // 6: Testing & Validation
    {
      sectionIndex: 6,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 1 },
      ],
    },
    // 7: Plan Maintenance
    {
      sectionIndex: 7,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 1 },
      ],
    },
    // 8: Compliance Matrix
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 85",
        },
        { source: "cybersecurity", field: "hasBCP", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  ACCESS_CONTROL: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "cybersecurity", field: "organizationSize", weight: 3 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Access Control Policy
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "organizationSize",
          weight: 3,
          articleRef: "Art. 79",
        },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      ],
    },
    // 3: Identity Management
    {
      sectionIndex: 3,
      fields: [
        { source: "cybersecurity", field: "employeeCount", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      ],
    },
    // 4: Authentication Requirements
    {
      sectionIndex: 4,
      fields: [
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
      ],
    },
    // 5: Authorization Model
    {
      sectionIndex: 5,
      fields: [
        { source: "cybersecurity", field: "organizationSize", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      ],
    },
    // 6: Privileged Access Management
    {
      sectionIndex: 6,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 1 },
      ],
    },
    // 7: Access Review & Audit
    {
      sectionIndex: 7,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 1 },
      ],
    },
    // 8: Compliance Matrix
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 79",
        },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  SUPPLY_CHAIN_SECURITY: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "cybersecurity", field: "criticalSupplierCount", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Supply Chain Mapping
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "criticalSupplierCount",
          weight: 3,
          articleRef: "Art. 78",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "organization", field: "name", weight: 2 },
      ],
    },
    // 3: Supplier Risk Assessment
    {
      sectionIndex: 3,
      fields: [
        { source: "cybersecurity", field: "criticalSupplierCount", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      ],
    },
    // 4: Security Requirements for Suppliers
    {
      sectionIndex: 4,
      fields: [
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "criticalSupplierCount", weight: 2 },
      ],
    },
    // 5: Contractual Security Clauses
    {
      sectionIndex: 5,
      fields: [
        { source: "organization", field: "name", weight: 2 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 6: Monitoring & Audit
    {
      sectionIndex: 6,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "criticalSupplierCount", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      ],
    },
    // 7: Incident Coordination with Suppliers
    {
      sectionIndex: 7,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
        },
        { source: "cybersecurity", field: "criticalSupplierCount", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 1 },
      ],
    },
    // 8: Compliance Matrix
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 78",
        },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  EUSRN_PROCEDURES: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: EUSRN Overview & Legal Basis
    {
      sectionIndex: 2,
      fields: [
        {
          source: "user",
          field: "operatorType",
          weight: 3,
          articleRef: "Art. 93-95",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "organization", field: "name", weight: 2 },
      ],
    },
    // 3: Notification Triggers
    {
      sectionIndex: 3,
      fields: [
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 3 },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 2,
        },
      ],
    },
    // 4: Notification Process & Timelines
    {
      sectionIndex: 4,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 3,
          articleRef: "Art. 93-95",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      ],
    },
    // 5: Information Requirements
    {
      sectionIndex: 5,
      fields: [
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 3 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
    // 6: Internal Coordination
    {
      sectionIndex: 6,
      fields: [
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 7: Testing & Readiness
    {
      sectionIndex: 7,
      fields: [
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 2,
        },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 1 },
      ],
    },
    // 8: Compliance Matrix
    {
      sectionIndex: 8,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 2,
          articleRef: "Art. 93-95",
        },
        {
          source: "cybersecurity",
          field: "hasIncidentResponsePlan",
          weight: 2,
        },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  COMPLIANCE_MATRIX: [
    // 0: Cover Page & Document Control
    { sectionIndex: 0, fields: coverPageFields },
    // 1: Executive Summary
    {
      sectionIndex: 1,
      fields: [
        { source: "cybersecurity", field: "maturityScore", weight: 3 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 2: Verification Methodology
    {
      sectionIndex: 2,
      fields: [
        {
          source: "cybersecurity",
          field: "existingCertifications",
          weight: 3,
          articleRef: "Art. 74-95",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
      ],
    },
    // 3: Requirements Matrix (Art. 74-95)
    {
      sectionIndex: 3,
      fields: [
        {
          source: "cybersecurity",
          field: "maturityScore",
          weight: 3,
          articleRef: "Art. 74-95",
        },
        { source: "cybersecurity", field: "organizationSize", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      ],
    },
    // 4: Evidence Inventory
    {
      sectionIndex: 4,
      fields: [
        { source: "cybersecurity", field: "existingCertifications", weight: 3 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "maturityScore", weight: 2 },
      ],
    },
    // 5: Gap Analysis
    {
      sectionIndex: 5,
      fields: [
        { source: "cybersecurity", field: "maturityScore", weight: 3 },
        { source: "cybersecurity", field: "dataSensitivityLevel", weight: 2 },
        { source: "cybersecurity", field: "spaceSegmentComplexity", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 1 },
      ],
    },
    // 6: Remediation Roadmap
    {
      sectionIndex: 6,
      fields: [
        { source: "cybersecurity", field: "maturityScore", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 7: Certification Readiness Assessment
    {
      sectionIndex: 7,
      fields: [
        { source: "cybersecurity", field: "maturityScore", weight: 3 },
        { source: "cybersecurity", field: "existingCertifications", weight: 3 },
        { source: "cybersecurity", field: "hasSecurityTeam", weight: 2 },
        { source: "cybersecurity", field: "organizationSize", weight: 1 },
      ],
    },
  ],

  // ── Category C: General / Cross-Cutting ──

  AUTHORIZATION_APPLICATION: [
    // 0: Cover Letter
    {
      sectionIndex: 0,
      fields: [
        { source: "organization", field: "name", weight: 3 },
        { source: "user", field: "operatorType", weight: 3 },
      ],
    },
    // 1: Operator Profile
    {
      sectionIndex: 1,
      fields: [
        { source: "organization", field: "name", weight: 3 },
        { source: "user", field: "operatorType", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 2: Mission Description
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 3: Compliance Summary
    {
      sectionIndex: 3,
      fields: [
        {
          source: "debris",
          field: "complianceScore",
          weight: 3,
          articleRef: "Art. 4-12",
        },
        { source: "cybersecurity", field: "maturityScore", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 2 },
      ],
    },
    // 4: Authorization Checklist (Art. 7)
    {
      sectionIndex: 4,
      fields: [
        {
          source: "user",
          field: "operatorType",
          weight: 3,
          articleRef: "Art. 7",
        },
        { source: "debris", field: "complianceScore", weight: 3 },
        { source: "cybersecurity", field: "maturityScore", weight: 2 },
        { source: "debris", field: "orbitType", weight: 1 },
      ],
    },
    // 5: Supporting Documents Index
    {
      sectionIndex: 5,
      fields: [
        { source: "organization", field: "name", weight: 2 },
        { source: "debris", field: "complianceScore", weight: 2 },
        { source: "cybersecurity", field: "existingCertifications", weight: 1 },
      ],
    },
    // 6: Certification Statement
    {
      sectionIndex: 6,
      fields: [
        { source: "organization", field: "name", weight: 3 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
  ],

  ENVIRONMENTAL_FOOTPRINT: [
    // 0: Executive Summary (no cover page for this doc type)
    {
      sectionIndex: 0,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 1: Mission Profile
    {
      sectionIndex: 1,
      fields: [
        {
          source: "debris",
          field: "orbitType",
          weight: 3,
          articleRef: "Art. 44-46",
        },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "satelliteCount", weight: 3 },
        { source: "debris", field: "plannedDurationYears", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 2: Lifecycle Assessment Methodology
    {
      sectionIndex: 2,
      fields: [
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
    // 3: Launch Vehicle Analysis
    {
      sectionIndex: 3,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 4: Propellant Analysis
    {
      sectionIndex: 4,
      fields: [
        { source: "debris", field: "hasPropulsion", weight: 3 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 5: Lifecycle Phase Breakdown
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "plannedDurationYears", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 6: Supplier Data Summary
    {
      sectionIndex: 6,
      fields: [
        { source: "organization", field: "name", weight: 2 },
        { source: "debris", field: "constellationTier", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 7: Hotspot Identification
    {
      sectionIndex: 7,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "hasPropulsion", weight: 1 },
      ],
    },
    // 8: Mitigation Measures
    {
      sectionIndex: 8,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "debris", field: "orbitType", weight: 1 },
      ],
    },
    // 9: EFD Grade Justification
    {
      sectionIndex: 9,
      fields: [
        { source: "debris", field: "complianceScore", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
    // 10: Recommendations
    {
      sectionIndex: 10,
      fields: [
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "deorbitStrategy", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],

  INSURANCE_COMPLIANCE: [
    // 0: Executive Summary (no cover page for this doc type)
    {
      sectionIndex: 0,
      fields: [
        { source: "organization", field: "name", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 1: Organization Risk Profile
    {
      sectionIndex: 1,
      fields: [
        {
          source: "organization",
          field: "name",
          weight: 3,
          articleRef: "Art. 47-50",
        },
        { source: "user", field: "operatorType", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
      ],
    },
    // 2: Third-Party Liability Analysis
    {
      sectionIndex: 2,
      fields: [
        { source: "debris", field: "orbitType", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 3: Coverage Overview
    {
      sectionIndex: 3,
      fields: [
        { source: "user", field: "operatorType", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 2 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
    // 4: Jurisdiction Requirements
    {
      sectionIndex: 4,
      fields: [
        { source: "user", field: "operatorType", weight: 3 },
        { source: "organization", field: "name", weight: 2 },
        { source: "debris", field: "orbitType", weight: 1 },
      ],
    },
    // 5: Gap Analysis
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "complianceScore", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 6: Premium Estimates
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "satelliteCount", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 7: Recommendations
    {
      sectionIndex: 7,
      fields: [
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "orbitType", weight: 1 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
  ],

  // ── Category D: Safety ──

  HAZARD_REPORT: [
    // 0: Document Cover & Classification
    {
      sectionIndex: 0,
      fields: [
        { source: "organization", field: "name", weight: 3 },
        { source: "user", field: "operatorType", weight: 2 },
      ],
    },
    // 1: Mission Overview
    {
      sectionIndex: 1,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "organization", field: "name", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 2 },
        { source: "debris", field: "plannedDurationYears", weight: 1 },
      ],
    },
    // 2: Safety Requirements
    {
      sectionIndex: 2,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "user", field: "operatorType", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "organization", field: "name", weight: 1 },
      ],
    },
    // 3: Hazard Log & Risk Matrix
    {
      sectionIndex: 3,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
      ],
    },
    // 4: Quantitative Risk Assessment
    {
      sectionIndex: 4,
      fields: [
        { source: "spacecraft", field: "length>=1", weight: 3 },
        { source: "debris", field: "altitudeKm", weight: 3 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "satelliteCount", weight: 1 },
      ],
    },
    // 5: Mitigation Measures
    {
      sectionIndex: 5,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "hasPassivationCap", weight: 2 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 1 },
      ],
    },
    // 6: Deorbit & Disposal
    {
      sectionIndex: 6,
      fields: [
        { source: "debris", field: "deorbitStrategy", weight: 3 },
        { source: "debris", field: "hasPropulsion", weight: 2 },
        { source: "debris", field: "orbitType", weight: 2 },
        { source: "debris", field: "altitudeKm", weight: 1 },
      ],
    },
    // 7: Hazard Acceptance & Open Items
    {
      sectionIndex: 7,
      fields: [
        { source: "organization", field: "name", weight: 2 },
        { source: "spacecraft", field: "length>=1", weight: 2 },
        { source: "user", field: "operatorType", weight: 1 },
      ],
    },
  ],
};

// ─── Utility Function ───

/**
 * Returns the SectionDataField[] for a given document type and section index.
 * Returns an empty array if the document type or section index is not found.
 */
export function getSectionDataFields(
  documentType: NCADocumentType,
  sectionIndex: number,
): SectionDataField[] {
  const entries = SECTION_DATA_MAP[documentType];
  if (!entries) return [];

  const entry = entries.find((e) => e.sectionIndex === sectionIndex);
  return entry?.fields ?? [];
}
