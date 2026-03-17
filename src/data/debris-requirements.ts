/**
 * @deprecated Use `src/data/regulatory/standards/iadc-guidelines.ts` + `src/data/regulatory/standards/iso-24113.ts` instead.
 * The new regulatory layer uses IADC and ISO 24113 as primary enacted references.
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

// Debris Mitigation Requirements based on EU Space Act Art. 58-73
// Used for compliance assessment in the Debris module

export type OrbitType = "LEO" | "MEO" | "GEO" | "HEO" | "cislunar";
export type ConstellationTier =
  | "single"
  | "small"
  | "medium"
  | "large"
  | "mega";
export type ManeuverabilityLevel = "full" | "limited" | "none";
export type DeorbitStrategy =
  | "active_deorbit"
  | "passive_decay"
  | "graveyard_orbit"
  | "adr_contracted";
export type RequirementStatus =
  | "compliant"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

// Re-export shared types for backward compatibility
export type { AssessmentField, ComplianceRule } from "@/lib/compliance/types";

import type { AssessmentField, ComplianceRule } from "@/lib/compliance/types";

export interface DebrisMissionProfile {
  // Orbit
  orbitType: OrbitType;
  altitudeKm?: number;

  // Constellation
  satelliteCount: number;
  constellationTier: ConstellationTier;

  // Capabilities
  hasManeuverability: ManeuverabilityLevel;
  hasPropulsion: boolean;
  hasPassivationCapability: boolean;

  // Mission
  plannedMissionDurationYears: number;
  launchDate?: string;

  // Deorbit Strategy
  deorbitStrategy: DeorbitStrategy;
  deorbitTimelineYears?: number;
}

export interface DebrisRequirement {
  id: string;
  articleRef: string;
  title: string;
  description: string;
  complianceQuestion: string;
  applicableTo: {
    orbitTypes?: OrbitType[];
    constellationTiers?: ConstellationTier[];
    requiresPropulsion?: boolean;
    requiresManeuverability?: boolean;
    minSatellites?: number;
  };
  tips: string[];
  evidenceRequired: string[];
  isoReference?: string;
  severity: "critical" | "major" | "minor";
  assessmentFields?: AssessmentField[];
  complianceRule?: ComplianceRule;
}

export const debrisRequirements: DebrisRequirement[] = [
  {
    id: "trackability",
    articleRef: "Art. 63",
    title: "Trackability",
    description:
      "Spacecraft must be detectable by ground-based or space-based sensors throughout its operational lifetime.",
    complianceQuestion:
      "Can your spacecraft be tracked by ground-based radar or optical sensors?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO", "GEO", "HEO", "cislunar"],
    },
    tips: [
      "Minimum cross-section for radar detectability varies by orbit (typically >10cm for LEO)",
      "Consider adding radar reflectors if spacecraft is small (<10cm)",
      "Optical tracking requires sufficient albedo and size",
      "Register with Space Surveillance networks (EUSST, 18th SDS)",
    ],
    evidenceRequired: [
      "Radar cross-section analysis",
      "Tracking feasibility study",
      "Space Surveillance registration confirmation",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "radarCrossSection",
        label: "Minimum radar cross-section",
        type: "number",
        unit: "m²",
        placeholder: "e.g., 0.15",
        helpText: "Typically >0.01 m² for LEO radar detectability",
      },
      {
        id: "hasRadarReflectors",
        label: "Equipped with radar reflectors?",
        type: "boolean",
      },
      {
        id: "trackingProvider",
        label: "Primary tracking provider",
        type: "select",
        options: [
          { value: "EUSST", label: "EUSST" },
          { value: "18SDS", label: "18th SDS" },
          { value: "LeoLabs", label: "LeoLabs" },
          { value: "ExoAnalytic", label: "ExoAnalytic" },
          { value: "Other", label: "Other" },
        ],
      },
      {
        id: "ssnRegistered",
        label: "Registered with Space Surveillance Network?",
        type: "boolean",
      },
      {
        id: "opticalTrackingFeasible",
        label: "Optical tracking feasibility confirmed?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["ssnRegistered"],
      requiredNotEmpty: ["trackingProvider"],
    },
  },
  {
    id: "collision_avoidance_service",
    articleRef: "Art. 64",
    title: "Collision Avoidance Service Subscription",
    description:
      "Operators must subscribe to collision avoidance services and maintain capability to receive and act on conjunction warnings.",
    complianceQuestion:
      "Have you contracted a collision avoidance service provider?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO", "GEO"],
    },
    tips: [
      "EUSST provides free basic service for EU operators",
      "Commercial providers: LeoLabs, ExoAnalytic, Slingshot Aerospace",
      "Service must cover entire operational phase",
      "Ensure 24/7 capability to receive conjunction alerts",
    ],
    evidenceRequired: [
      "CA Service contract or Letter of Intent",
      "Provider confirmation letter",
      "Operations procedures for conjunction handling",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "caProvider",
        label: "CA service provider",
        type: "select",
        options: [
          { value: "EUSST", label: "EUSST" },
          { value: "LeoLabs", label: "LeoLabs" },
          { value: "ExoAnalytic", label: "ExoAnalytic" },
          { value: "Slingshot", label: "Slingshot Aerospace" },
          { value: "18SDS", label: "18th SDS" },
          { value: "Other", label: "Other" },
        ],
      },
      {
        id: "contractStatus",
        label: "Contract status",
        type: "select",
        options: [
          { value: "active", label: "Active" },
          { value: "pending", label: "Pending" },
          { value: "planned", label: "Planned" },
          { value: "none", label: "None" },
        ],
      },
      {
        id: "coveragePeriod",
        label: "Coverage period",
        type: "text",
        placeholder: "e.g., launch to deorbit",
      },
      {
        id: "has24x7Capability",
        label: "24/7 conjunction alert reception capability?",
        type: "boolean",
      },
      {
        id: "caResponseTimeHours",
        label: "Max response time to CA alert",
        type: "number",
        unit: "hours",
        placeholder: "e.g., 8",
      },
    ],
    complianceRule: {
      requiredNotEmpty: ["caProvider", "contractStatus"],
      requiredTrue: ["has24x7Capability"],
    },
  },
  {
    id: "maneuverability",
    articleRef: "Art. 66",
    title: "Manoeuvrability Requirements",
    description:
      "Spacecraft in congested orbital regimes must maintain minimum manoeuvrability for collision avoidance throughout operational life.",
    complianceQuestion:
      "Does your spacecraft have propulsion capability for collision avoidance maneuvers?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO"],
      requiresManeuverability: true,
    },
    tips: [
      "Delta-V budget must include collision avoidance reserve",
      "Typical CA maneuver: 0.1-1 m/s per event",
      "Plan for 2-4 CA maneuvers per year in congested LEO",
      "Non-maneuverable satellites may face restrictions in protected zones",
    ],
    evidenceRequired: [
      "Propulsion system specifications",
      "Delta-V budget with CA allocation",
      "CA maneuver capability analysis",
      "Response time analysis",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "propulsionType",
        label: "Propulsion type",
        type: "select",
        options: [
          { value: "chemical", label: "Chemical" },
          { value: "electric", label: "Electric" },
          { value: "cold_gas", label: "Cold gas" },
          { value: "hybrid", label: "Hybrid" },
        ],
      },
      {
        id: "totalDeltaV",
        label: "Total delta-V budget",
        type: "number",
        unit: "m/s",
        placeholder: "e.g., 150",
      },
      {
        id: "caReserveDeltaV",
        label: "Delta-V reserved for collision avoidance",
        type: "number",
        unit: "m/s",
        placeholder: "e.g., 30",
      },
      {
        id: "expectedCAPerYear",
        label: "Expected CA maneuvers per year",
        type: "number",
        placeholder: "e.g., 3",
      },
      {
        id: "minResponseTimeHours",
        label: "Minimum CA maneuver response time",
        type: "number",
        unit: "hours",
        placeholder: "e.g., 6",
      },
    ],
    complianceRule: {
      requiredNotEmpty: ["propulsionType"],
      numberThresholds: {
        totalDeltaV: { min: 1 },
        caReserveDeltaV: { min: 0.1 },
      },
    },
  },
  {
    id: "debris_mitigation_plan",
    articleRef: "Art. 67",
    title: "Debris Mitigation Plan",
    description:
      "Comprehensive plan covering collision avoidance procedures, end-of-life disposal strategy, fragmentation avoidance measures, and passivation procedures.",
    complianceQuestion:
      "Have you prepared a comprehensive Debris Mitigation Plan following ISO 24113?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO", "GEO", "HEO", "cislunar"],
    },
    tips: [
      "Must cover all 5 areas: CA, EOL, fragmentation, passivation, 25-year compliance",
      "Follow ISO 24113:2019 structure for completeness",
      "Submit as part of authorization application (Art. 7)",
      "Include risk assessment and mitigation measures",
    ],
    evidenceRequired: [
      "Debris Mitigation Plan document",
      "ISO 24113 compliance checklist",
    ],
    isoReference: "ISO 24113:2019",
    severity: "critical",
    assessmentFields: [
      {
        id: "planDocumentExists",
        label: "DMP document prepared?",
        type: "boolean",
      },
      {
        id: "iso24113Compliant",
        label: "Follows ISO 24113:2019 structure?",
        type: "boolean",
      },
      {
        id: "coversCAProcedures",
        label: "Covers collision avoidance procedures?",
        type: "boolean",
      },
      {
        id: "coversEOLDisposal",
        label: "Covers end-of-life disposal?",
        type: "boolean",
      },
      {
        id: "coversFragmentation",
        label: "Covers fragmentation avoidance?",
        type: "boolean",
      },
      {
        id: "coversPassivation",
        label: "Covers passivation procedures?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "planDocumentExists",
        "coversCAProcedures",
        "coversEOLDisposal",
        "coversFragmentation",
        "coversPassivation",
      ],
    },
  },
  {
    id: "fragmentation_avoidance",
    articleRef: "Art. 67(c)",
    title: "Fragmentation Avoidance",
    description:
      "Design and operational measures to prevent in-orbit break-ups, both intentional and accidental.",
    complianceQuestion:
      "Have you implemented design measures to prevent fragmentation events?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO", "GEO", "HEO"],
    },
    tips: [
      "Avoid storing energy in pressurized vessels longer than necessary",
      "Use batteries with low risk of thermal runaway",
      "Design propellant tanks with rupture mitigation",
      "No intentional break-ups except for safety",
    ],
    evidenceRequired: [
      "Fragmentation risk assessment",
      "Design review showing mitigation measures",
      "Battery safety analysis",
    ],
    severity: "major",
    assessmentFields: [
      {
        id: "pressurizedVesselCount",
        label: "Number of pressurized vessels",
        type: "number",
        placeholder: "e.g., 2",
      },
      {
        id: "batteryType",
        label: "Battery type",
        type: "select",
        options: [
          { value: "li_ion", label: "Li-Ion" },
          { value: "ni_cd", label: "Ni-Cd" },
          { value: "ni_mh", label: "Ni-MH" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "thermalRunawayMitigation",
        label: "Thermal runaway mitigation measures?",
        type: "boolean",
      },
      {
        id: "propellantTankMitigation",
        label: "Propellant tank rupture mitigation?",
        type: "boolean",
      },
      {
        id: "intentionalBreakupPlanned",
        label: "Any intentional fragmentation planned?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["thermalRunawayMitigation", "propellantTankMitigation"],
      requiredNotEmpty: ["batteryType"],
    },
  },
  {
    id: "light_pollution",
    articleRef: "Art. 68",
    title: "Light & Radio Pollution Mitigation",
    description:
      "Visual magnitude must remain ≥7 (not visible to naked eye) throughout operational lifetime. Radio frequency interference must be minimized.",
    complianceQuestion:
      "Will your spacecraft maintain visual magnitude ≥7 (not visible to naked eye)?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO"],
      constellationTiers: ["medium", "large", "mega"],
      minSatellites: 10,
    },
    tips: [
      "Magnitude 7 = threshold of naked eye visibility",
      "Consider anti-reflective coatings on solar panels",
      "Sun visors can reduce brightness during twilight",
      "Dark satellite designs (e.g., SpaceX DarkSat, VisorSat)",
      "Large constellations have enhanced obligations",
    ],
    evidenceRequired: [
      "Brightness analysis at various phase angles",
      "Mitigation measures description",
      "Coordination with astronomical community (if applicable)",
    ],
    severity: "major",
    assessmentFields: [
      {
        id: "expectedMagnitude",
        label: "Expected visual magnitude",
        type: "number",
        placeholder: "e.g., 7.5",
        helpText: "Must be ≥7 (not visible to naked eye)",
      },
      {
        id: "hasAntiReflectiveCoating",
        label: "Anti-reflective coatings applied?",
        type: "boolean",
      },
      {
        id: "hasSunVisor",
        label: "Sun visor or brightness mitigation?",
        type: "boolean",
      },
      {
        id: "astronomyCommunityCoordinated",
        label: "Coordinated with astronomical community?",
        type: "boolean",
      },
      {
        id: "rfiMitigation",
        label: "Radio frequency interference mitigation?",
        type: "boolean",
      },
    ],
    complianceRule: {
      numberThresholds: { expectedMagnitude: { min: 7 } },
    },
  },
  {
    id: "large_constellation_management",
    articleRef: "Art. 69",
    title: "Large Constellation Management",
    description:
      "Constellations of 100+ satellites require comprehensive constellation-wide debris management systems.",
    complianceQuestion:
      "Have you implemented constellation-wide debris management procedures?",
    applicableTo: {
      constellationTiers: ["large", "mega"],
      minSatellites: 100,
    },
    tips: [
      "Automated collision avoidance decision systems",
      "Constellation coordination for maneuver deconfliction",
      "Higher reliability standards for critical systems",
      "Real-time tracking of all constellation elements",
    ],
    evidenceRequired: [
      "Constellation debris management plan",
      "Automation system documentation",
      "Reliability analysis for deorbit systems",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "automatedCASystem",
        label: "Automated CA decision system?",
        type: "boolean",
      },
      {
        id: "constellationCoordination",
        label: "Inter-satellite maneuver coordination?",
        type: "boolean",
      },
      {
        id: "realTimeTracking",
        label: "Real-time tracking of all elements?",
        type: "boolean",
      },
      {
        id: "systemReliabilityPercent",
        label: "Critical system reliability target",
        type: "number",
        unit: "%",
        placeholder: "e.g., 99.5",
      },
      {
        id: "deconflictionProcedure",
        label: "Maneuver deconfliction procedures?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: [
        "automatedCASystem",
        "realTimeTracking",
        "deconflictionProcedure",
      ],
    },
  },
  {
    id: "large_constellation_disposal",
    articleRef: "Art. 70",
    title: "Large Constellation Disposal Requirements",
    description:
      "Enhanced end-of-life reliability requirements for large constellations to ensure high success rate of disposal.",
    complianceQuestion:
      "Does your constellation meet enhanced disposal reliability requirements (>95% success rate)?",
    applicableTo: {
      constellationTiers: ["large", "mega"],
      minSatellites: 100,
    },
    tips: [
      "Target >95% disposal success rate",
      "Consider redundant deorbit systems",
      "Plan for ADR (Active Debris Removal) of failed satellites",
      "Establish decommissioning fund or insurance",
    ],
    evidenceRequired: [
      "Disposal reliability analysis",
      "Redundancy design documentation",
      "Failed satellite handling procedures",
      "Financial provisions for ADR",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "targetDisposalSuccessRate",
        label: "Target disposal success rate",
        type: "number",
        unit: "%",
        placeholder: "e.g., 95",
        helpText: "Should be >95% for large constellations",
      },
      {
        id: "redundantDeorbitSystems",
        label: "Redundant deorbit systems?",
        type: "boolean",
      },
      {
        id: "failedSatProcedure",
        label: "Failed satellite handling procedure?",
        type: "boolean",
      },
      {
        id: "adrProvisionPlanned",
        label: "ADR service contracted/planned?",
        type: "boolean",
      },
      {
        id: "decommissioningFund",
        label: "Financial provisions for ADR?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["failedSatProcedure"],
      numberThresholds: { targetDisposalSuccessRate: { min: 95 } },
    },
  },
  {
    id: "end_of_life_leo",
    articleRef: "Art. 72",
    title: "End-of-Life Disposal (LEO)",
    description:
      "LEO spacecraft must deorbit within 25 years of end-of-mission (5 years emerging best practice). Natural decay or controlled reentry.",
    complianceQuestion:
      "Does your deorbit plan comply with the 25-year rule (or 5-year for new missions)?",
    applicableTo: {
      orbitTypes: ["LEO"],
    },
    tips: [
      "Altitudes <400km: Natural decay often sufficient",
      "Altitudes 400-600km: Depends on solar activity, may need assist",
      "Altitudes >600km: Active deorbit likely required",
      "5-year rule becoming industry standard",
      "Consider controlled reentry for large spacecraft (>1 ton)",
    ],
    evidenceRequired: [
      "Orbital lifetime analysis (DRAMA, STK, GMAT)",
      "Propellant budget for EOL maneuver",
      "Backup deorbit strategy",
      "Reentry casualty risk analysis (if controlled)",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "predictedLifetimeYears",
        label: "Post-mission orbital lifetime",
        type: "number",
        unit: "years",
        placeholder: "e.g., 4",
      },
      {
        id: "analysisToolUsed",
        label: "Orbital lifetime analysis tool",
        type: "select",
        options: [
          { value: "DRAMA", label: "DRAMA" },
          { value: "STK", label: "STK" },
          { value: "GMAT", label: "GMAT" },
          { value: "Other", label: "Other" },
        ],
      },
      {
        id: "complianceStandard",
        label: "Target compliance standard",
        type: "select",
        options: [
          { value: "25_year", label: "25-year rule" },
          { value: "5_year", label: "5-year best practice" },
        ],
      },
      {
        id: "eolDeltaVBudget",
        label: "Delta-V for EOL maneuver",
        type: "number",
        unit: "m/s",
        placeholder: "e.g., 50",
      },
      {
        id: "controlledReentry",
        label: "Controlled reentry planned?",
        type: "boolean",
      },
      {
        id: "casualtyRiskAnalysis",
        label: "Reentry casualty risk analysis?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredNotEmpty: ["analysisToolUsed", "complianceStandard"],
      numberThresholds: { predictedLifetimeYears: { max: 25 } },
    },
  },
  {
    id: "end_of_life_geo",
    articleRef: "Art. 72",
    title: "End-of-Life Disposal (GEO)",
    description:
      "GEO spacecraft must transfer to graveyard orbit at least 300km above GEO altitude at end of mission.",
    complianceQuestion:
      "Do you have sufficient propellant reserved for graveyard orbit transfer?",
    applicableTo: {
      orbitTypes: ["GEO"],
    },
    tips: [
      "Graveyard orbit: minimum 300km above GEO (35,786km + 300km)",
      "Reserve ~11 m/s delta-V for re-orbit maneuver",
      "Plan for passivation after graveyard transfer",
      "Consider eccentric graveyard orbit to use less fuel",
    ],
    evidenceRequired: [
      "GEO disposal analysis",
      "Propellant budget with EOL reserve",
      "Graveyard orbit parameters",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "graveyardAltitudeAboveGEO",
        label: "Graveyard orbit altitude above GEO",
        type: "number",
        unit: "km",
        placeholder: "e.g., 300",
        helpText: "Minimum 300km above GEO",
      },
      {
        id: "reorbitDeltaV",
        label: "Delta-V for re-orbit maneuver",
        type: "number",
        unit: "m/s",
        placeholder: "e.g., 11",
      },
      {
        id: "propellantReserved",
        label: "EOL propellant reserved?",
        type: "boolean",
      },
      {
        id: "postReorbitPassivation",
        label: "Post-transfer passivation planned?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["propellantReserved"],
      numberThresholds: { graveyardAltitudeAboveGEO: { min: 300 } },
    },
  },
  {
    id: "end_of_life_meo",
    articleRef: "Art. 72",
    title: "End-of-Life Disposal (MEO)",
    description:
      "MEO spacecraft disposal depends on altitude. May require transfer to disposal orbit or long-term stable orbit.",
    complianceQuestion:
      "Have you determined appropriate disposal strategy for your MEO orbit?",
    applicableTo: {
      orbitTypes: ["MEO"],
    },
    tips: [
      "MEO disposal is complex - depends on specific altitude",
      "GNSS altitudes (~20,000km) have specific disposal zones",
      "Lower MEO may target LEO disposal regions",
      "Consult IADC guidelines for MEO disposal",
    ],
    evidenceRequired: [
      "MEO disposal analysis",
      "Long-term orbit stability study",
      "Propellant budget for disposal",
    ],
    severity: "critical",
    assessmentFields: [
      {
        id: "disposalStrategy",
        label: "Disposal strategy",
        type: "select",
        options: [
          { value: "leo_region", label: "LEO disposal region" },
          { value: "disposal_orbit", label: "Dedicated disposal orbit" },
          { value: "stable_orbit", label: "Long-term stable orbit" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "disposalOrbitAnalysis",
        label: "Disposal orbit analysis completed?",
        type: "boolean",
      },
      {
        id: "longTermStabilityStudy",
        label: "Long-term orbit stability study done?",
        type: "boolean",
      },
      {
        id: "iadcGuidelinesConsulted",
        label: "IADC MEO guidelines consulted?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredNotEmpty: ["disposalStrategy"],
      requiredTrue: ["disposalOrbitAnalysis"],
    },
  },
  {
    id: "passivation",
    articleRef: "Art. 67(d)",
    title: "Passivation Procedures",
    description:
      "All stored energy sources must be depleted at end-of-life to prevent explosions and fragmentation.",
    complianceQuestion:
      "Do you have procedures to passivate all energy sources at end-of-life?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO", "GEO", "HEO", "cislunar"],
    },
    tips: [
      "Deplete propellant tanks (controlled venting or burn)",
      "Discharge batteries to safe level",
      "De-spin reaction wheels and CMGs",
      "Disconnect solar arrays from batteries if possible",
      "Document all energy sources in design phase",
    ],
    evidenceRequired: [
      "Passivation procedure document",
      "Energy source inventory",
      "Passivation sequence timeline",
    ],
    severity: "major",
    assessmentFields: [
      {
        id: "propellantDepletionPlanned",
        label: "Propellant depletion/venting planned?",
        type: "boolean",
      },
      {
        id: "batteryDischargeMethod",
        label: "Battery discharge method",
        type: "select",
        options: [
          { value: "controlled", label: "Controlled discharge" },
          { value: "passive", label: "Passive discharge" },
          { value: "none", label: "None" },
        ],
      },
      {
        id: "reactionWheelDespin",
        label: "Reaction wheel de-spin planned?",
        type: "boolean",
      },
      {
        id: "solarArrayDisconnect",
        label: "Solar array disconnect capability?",
        type: "boolean",
      },
      {
        id: "energySourceInventory",
        label: "Energy source inventory documented?",
        type: "boolean",
      },
      {
        id: "passivationSequenceHours",
        label: "Passivation sequence duration",
        type: "number",
        unit: "hours",
        placeholder: "e.g., 24",
      },
    ],
    complianceRule: {
      requiredTrue: ["energySourceInventory"],
      requiredNotEmpty: ["batteryDischargeMethod"],
    },
  },
  {
    id: "supply_chain_compliance",
    articleRef: "Art. 73",
    title: "Supply Chain Compliance",
    description:
      "Ensure suppliers, manufacturers, and subcontractors comply with debris-related design requirements.",
    complianceQuestion:
      "Have you verified your suppliers comply with EU Space Act debris requirements?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO", "GEO", "HEO", "cislunar"],
    },
    tips: [
      "Include EU Space Act compliance clauses in supplier contracts",
      "Request debris compliance documentation from manufacturers",
      "Consider ISO 24113 certification of key suppliers",
      "Audit critical suppliers for debris-related requirements",
    ],
    evidenceRequired: [
      "Supplier compliance declarations",
      "Supply chain audit records",
      "Contract clauses referencing EU Space Act",
    ],
    severity: "minor",
    assessmentFields: [
      {
        id: "contractsIncludeCompliance",
        label: "EU Space Act clauses in contracts?",
        type: "boolean",
      },
      {
        id: "supplierDocsReceived",
        label: "Debris compliance docs from manufacturers?",
        type: "boolean",
      },
      {
        id: "iso24113CertifiedSuppliers",
        label: "Key suppliers ISO 24113 certified?",
        type: "boolean",
      },
      {
        id: "supplierAuditConducted",
        label: "Critical supplier audit completed?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["contractsIncludeCompliance", "supplierDocsReceived"],
    },
  },
  {
    id: "on_orbit_servicing",
    articleRef: "Art. 71",
    title: "On-Orbit Servicing Readiness",
    description:
      "Consider design features enabling future on-orbit servicing, life extension, or active debris removal.",
    complianceQuestion:
      "Have you considered design features for on-orbit servicing or ADR compatibility?",
    applicableTo: {
      orbitTypes: ["LEO", "MEO", "GEO"],
    },
    tips: [
      "Grapple fixtures or docking interfaces",
      "Standardized refueling ports",
      "Accessible propulsion system for servicing",
      "Not mandatory but demonstrates best practice",
    ],
    evidenceRequired: [
      "Serviceable design features description (if implemented)",
      "ADR compatibility assessment",
    ],
    severity: "minor",
    assessmentFields: [
      {
        id: "hasGrappleFixture",
        label: "Grapple fixture or docking interface?",
        type: "boolean",
      },
      {
        id: "hasRefuelingPort",
        label: "Standardized refueling port?",
        type: "boolean",
      },
      {
        id: "propulsionAccessible",
        label: "Accessible propulsion for servicing?",
        type: "boolean",
      },
      {
        id: "adrCompatibilityAssessed",
        label: "ADR compatibility assessment done?",
        type: "boolean",
      },
    ],
    complianceRule: {
      requiredTrue: ["adrCompatibilityAssessed"],
    },
  },
];

// Helper function to get applicable requirements based on mission profile
export function getApplicableRequirements(
  profile: DebrisMissionProfile,
): DebrisRequirement[] {
  return debrisRequirements.filter((req) => {
    const { applicableTo } = req;

    // Check orbit type
    if (
      applicableTo.orbitTypes &&
      !applicableTo.orbitTypes.includes(profile.orbitType)
    ) {
      return false;
    }

    // Check constellation tier
    if (
      applicableTo.constellationTiers &&
      !applicableTo.constellationTiers.includes(profile.constellationTier)
    ) {
      return false;
    }

    // Check minimum satellites
    if (
      applicableTo.minSatellites &&
      profile.satelliteCount < applicableTo.minSatellites
    ) {
      return false;
    }

    // Check propulsion requirement
    if (applicableTo.requiresPropulsion && !profile.hasPropulsion) {
      return false;
    }

    // Check maneuverability requirement
    if (
      applicableTo.requiresManeuverability &&
      profile.hasManeuverability === "none"
    ) {
      return false;
    }

    return true;
  });
}

// Determine constellation tier from satellite count
export function getConstellationTier(count: number): ConstellationTier {
  if (count >= 1000) return "mega";
  if (count >= 100) return "large";
  if (count >= 10) return "medium";
  if (count >= 2) return "small";
  return "single";
}

// Get available deorbit strategies based on orbit type
export function getAvailableDeorbitStrategies(
  orbitType: OrbitType,
): DeorbitStrategy[] {
  switch (orbitType) {
    case "GEO":
      return ["graveyard_orbit", "adr_contracted"];
    case "LEO":
      return ["active_deorbit", "passive_decay", "adr_contracted"];
    case "MEO":
      return ["active_deorbit", "graveyard_orbit", "adr_contracted"];
    case "HEO":
      return ["active_deorbit", "graveyard_orbit", "adr_contracted"];
    case "cislunar":
      return ["active_deorbit", "adr_contracted"];
    default:
      return ["active_deorbit", "passive_decay", "adr_contracted"];
  }
}

// Status colors and labels
export const requirementStatusConfig: Record<
  RequirementStatus,
  { label: string; color: string; bgColor: string }
> = {
  compliant: {
    label: "Compliant",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
  },
  non_compliant: {
    label: "Non-Compliant",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  not_assessed: {
    label: "Not Assessed",
    color: "text-white/30",
    bgColor: "bg-white/[0.02]",
  },
  not_applicable: {
    label: "N/A",
    color: "text-white/20",
    bgColor: "bg-white/[0.01]",
  },
};

// Severity colors
export const severityConfig: Record<
  string,
  { label: string; color: string; bgColor: string }
> = {
  critical: {
    label: "Critical",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
  },
  major: {
    label: "Major",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
  },
  minor: {
    label: "Minor",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
  },
};

// Orbit type display info
export const orbitTypeConfig: Record<
  OrbitType,
  { label: string; altitudeRange: string; description: string }
> = {
  LEO: {
    label: "Low Earth Orbit (LEO)",
    altitudeRange: "200 - 2,000 km",
    description: "Most congested region, 25-year deorbit rule applies",
  },
  MEO: {
    label: "Medium Earth Orbit (MEO)",
    altitudeRange: "2,000 - 35,786 km",
    description: "GNSS constellations, specific disposal regions",
  },
  GEO: {
    label: "Geostationary Orbit (GEO)",
    altitudeRange: "~35,786 km",
    description: "Graveyard orbit disposal required",
  },
  HEO: {
    label: "Highly Elliptical Orbit (HEO)",
    altitudeRange: "Variable",
    description: "Complex disposal requirements",
  },
  cislunar: {
    label: "Cislunar / Beyond GEO",
    altitudeRange: "> 35,786 km",
    description: "Emerging regulatory framework",
  },
};
