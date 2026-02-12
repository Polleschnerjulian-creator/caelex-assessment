/**
 * Copyright 2026 Caelex GmbH. All rights reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * This file contains proprietary regulatory compliance mappings and data
 * that represent significant research and development investment.
 *
 * COPUOS Long-Term Sustainability Guidelines (2019)
 * IADC Space Debris Mitigation Guidelines (2025 Update)
 * ISO 24113:2024 Space Debris Mitigation Requirements
 *
 * SPDX-License-Identifier: LicenseRef-Caelex-Proprietary
 */

// ─── Types ───

export type OrbitRegime =
  | "LEO"
  | "MEO"
  | "GEO"
  | "HEO"
  | "GTO"
  | "cislunar"
  | "deep_space";
export type MissionType =
  | "commercial"
  | "scientific"
  | "governmental"
  | "educational"
  | "military";
export type SatelliteCategory =
  | "cubesat"
  | "smallsat"
  | "medium"
  | "large"
  | "mega";
export type GuidelineSource = "COPUOS" | "IADC" | "ISO";
export type GuidelineCategory =
  | "policy_regulatory"
  | "safety_operations"
  | "international_cooperation"
  | "science_research"
  | "space_debris"
  | "space_weather"
  | "design_passivation"
  | "collision_avoidance"
  | "disposal"
  | "tracking_monitoring";

export type ComplianceStatus =
  | "compliant"
  | "partial"
  | "non_compliant"
  | "not_assessed"
  | "not_applicable";

export type BindingLevel = "mandatory" | "recommended" | "best_practice";

export interface CopuosMissionProfile {
  orbitRegime: OrbitRegime;
  altitudeKm?: number;
  inclinationDeg?: number;
  missionType: MissionType;
  satelliteCategory: SatelliteCategory;
  satelliteMassKg: number;
  hasManeuverability: boolean;
  hasPropulsion: boolean;
  plannedLifetimeYears: number;
  isConstellation: boolean;
  constellationSize?: number;
  launchDate?: string;
  countryOfRegistry?: string;
}

export interface CopuosGuideline {
  id: string;
  source: GuidelineSource;
  referenceNumber: string;
  title: string;
  description: string;
  category: GuidelineCategory;
  bindingLevel: BindingLevel;
  applicability: {
    orbitRegimes?: OrbitRegime[];
    missionTypes?: MissionType[];
    satelliteCategories?: SatelliteCategory[];
    minMassKg?: number;
    maxAltitudeKm?: number;
    minAltitudeKm?: number;
    constellationsOnly?: boolean;
    requiresPropulsion?: boolean;
  };
  complianceQuestion: string;
  evidenceRequired: string[];
  implementationGuidance: string[];
  euSpaceActCrossRef?: string[];
  isoReference?: string;
  iadcReference?: string;
  severity: "critical" | "major" | "minor";
}

export interface GapAnalysisResult {
  guidelineId: string;
  status: ComplianceStatus;
  priority: "high" | "medium" | "low";
  gap: string;
  recommendation: string;
  estimatedEffort: "low" | "medium" | "high";
  dependencies: string[];
}

// ─── Configuration ───

export const orbitRegimeConfig: Record<
  OrbitRegime,
  { label: string; description: string; color: string }
> = {
  LEO: { label: "Low Earth Orbit", description: "< 2,000 km", color: "blue" },
  MEO: {
    label: "Medium Earth Orbit",
    description: "2,000 - 35,786 km",
    color: "purple",
  },
  GEO: {
    label: "Geostationary Orbit",
    description: "~35,786 km",
    color: "amber",
  },
  HEO: {
    label: "Highly Elliptical Orbit",
    description: "Variable apogee",
    color: "orange",
  },
  GTO: {
    label: "Geostationary Transfer Orbit",
    description: "Transitional",
    color: "yellow",
  },
  cislunar: {
    label: "Cislunar Space",
    description: "Earth-Moon system",
    color: "cyan",
  },
  deep_space: {
    label: "Deep Space",
    description: "Beyond Earth-Moon",
    color: "slate",
  },
};

export const missionTypeConfig: Record<
  MissionType,
  { label: string; icon: string }
> = {
  commercial: { label: "Commercial", icon: "Building2" },
  scientific: { label: "Scientific Research", icon: "FlaskConical" },
  governmental: { label: "Governmental", icon: "Landmark" },
  educational: { label: "Educational", icon: "GraduationCap" },
  military: { label: "Defense/Military", icon: "Shield" },
};

export const satelliteCategoryConfig: Record<
  SatelliteCategory,
  { label: string; massRange: string }
> = {
  cubesat: { label: "CubeSat", massRange: "< 10 kg" },
  smallsat: { label: "Small Satellite", massRange: "10 - 100 kg" },
  medium: { label: "Medium Satellite", massRange: "100 - 1,000 kg" },
  large: { label: "Large Satellite", massRange: "1,000 - 5,000 kg" },
  mega: { label: "Mega Satellite", massRange: "> 5,000 kg" },
};

export const complianceStatusConfig: Record<
  ComplianceStatus,
  { label: string; color: string; icon: string }
> = {
  compliant: { label: "Compliant", color: "green", icon: "CheckCircle2" },
  partial: {
    label: "Partially Compliant",
    color: "amber",
    icon: "AlertTriangle",
  },
  non_compliant: { label: "Non-Compliant", color: "red", icon: "XCircle" },
  not_assessed: { label: "Not Assessed", color: "slate", icon: "HelpCircle" },
  not_applicable: {
    label: "Not Applicable",
    color: "gray",
    icon: "MinusCircle",
  },
};

export const bindingLevelConfig: Record<
  BindingLevel,
  { label: string; color: string }
> = {
  mandatory: { label: "Mandatory", color: "red" },
  recommended: { label: "Recommended", color: "amber" },
  best_practice: { label: "Best Practice", color: "blue" },
};

// ─── COPUOS Long-Term Sustainability Guidelines (2019) ───

export const copuosLtsGuidelines: CopuosGuideline[] = [
  // A. Policy and regulatory framework
  {
    id: "copuos-lts-a1",
    source: "COPUOS",
    referenceNumber: "A.1",
    title: "Adopt, revise and amend national regulatory frameworks",
    description:
      "States should adopt, revise and amend national regulatory frameworks as needed to address their authorization and supervision of non-governmental entities conducting space activities.",
    category: "policy_regulatory",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: [
        "LEO",
        "MEO",
        "GEO",
        "HEO",
        "GTO",
        "cislunar",
        "deep_space",
      ],
      missionTypes: [
        "commercial",
        "scientific",
        "governmental",
        "educational",
        "military",
      ],
    },
    complianceQuestion:
      "Is your space activity authorized under a national regulatory framework?",
    evidenceRequired: [
      "National license or authorization document",
      "Regulatory compliance certificate",
      "Correspondence with national space agency",
    ],
    implementationGuidance: [
      "Identify the relevant national space authority",
      "Submit authorization application with all required documentation",
      "Maintain communication with the regulator throughout mission lifecycle",
    ],
    euSpaceActCrossRef: ["Art. 4", "Art. 5", "Art. 6"],
    severity: "critical",
  },
  {
    id: "copuos-lts-a2",
    source: "COPUOS",
    referenceNumber: "A.2",
    title: "Consider ratifying UN space treaties",
    description:
      "States should consider ratifying the United Nations treaties on outer space and ensuring that their national regulatory frameworks are consistent with the obligations and principles set out therein.",
    category: "policy_regulatory",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: [
        "LEO",
        "MEO",
        "GEO",
        "HEO",
        "GTO",
        "cislunar",
        "deep_space",
      ],
    },
    complianceQuestion:
      "Does your mission comply with the applicable UN space treaties?",
    evidenceRequired: [
      "Legal compliance analysis",
      "Treaty applicability assessment",
    ],
    implementationGuidance: [
      "Review Outer Space Treaty (1967) obligations",
      "Review Liability Convention (1972) requirements",
      "Review Registration Convention (1976) requirements",
    ],
    euSpaceActCrossRef: ["Art. 2", "Art. 3"],
    severity: "major",
  },
  {
    id: "copuos-lts-a3",
    source: "COPUOS",
    referenceNumber: "A.3",
    title: "Supervise national space activities",
    description:
      "States should supervise national space activities, including those conducted by non-governmental entities, as appropriate.",
    category: "policy_regulatory",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: [
        "LEO",
        "MEO",
        "GEO",
        "HEO",
        "GTO",
        "cislunar",
        "deep_space",
      ],
    },
    complianceQuestion:
      "Are you prepared for ongoing supervision by your national space authority?",
    evidenceRequired: [
      "Supervision compliance plan",
      "Reporting procedures documentation",
      "Contact information for regulatory liaison",
    ],
    implementationGuidance: [
      "Establish reporting procedures to national authority",
      "Maintain operational records for inspection",
      "Designate responsible personnel for regulatory compliance",
    ],
    euSpaceActCrossRef: ["Art. 47", "Art. 48", "Art. 49"],
    severity: "major",
  },
  {
    id: "copuos-lts-a4",
    source: "COPUOS",
    referenceNumber: "A.4",
    title: "Ensure equitable access to spectrum and orbits",
    description:
      "States should ensure the equitable, rational and efficient use of the radio frequency spectrum and the various orbital regions used by satellites.",
    category: "policy_regulatory",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO"],
    },
    complianceQuestion:
      "Have you coordinated your spectrum and orbital usage through ITU procedures?",
    evidenceRequired: [
      "ITU coordination documentation",
      "Spectrum filing records",
      "Orbital slot coordination agreements",
    ],
    implementationGuidance: [
      "File frequency coordination through national administration",
      "Complete ITU coordination procedures",
      "Document interference analysis results",
    ],
    euSpaceActCrossRef: ["Art. 29", "Art. 30"],
    severity: "major",
  },
  {
    id: "copuos-lts-a5",
    source: "COPUOS",
    referenceNumber: "A.5",
    title: "Enhance space object registration practices",
    description:
      "States should enhance the practice of registering space objects, including by promoting voluntary registration of space objects with the Secretary-General.",
    category: "policy_regulatory",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: [
        "LEO",
        "MEO",
        "GEO",
        "HEO",
        "GTO",
        "cislunar",
        "deep_space",
      ],
    },
    complianceQuestion:
      "Have you registered your space object with the UN Registry (UNOOSA)?",
    evidenceRequired: [
      "UN registration submission",
      "National registry entry confirmation",
      "COSPAR ID assignment",
    ],
    implementationGuidance: [
      "Submit registration information to UNOOSA",
      "Include orbital parameters and mission description",
      "Update registration for any status changes",
    ],
    euSpaceActCrossRef: ["Art. 52", "Art. 53", "Art. 54"],
    severity: "critical",
  },

  // B. Safety of space operations
  {
    id: "copuos-lts-b1",
    source: "COPUOS",
    referenceNumber: "B.1",
    title: "Provide updated contact information",
    description:
      "States and international intergovernmental organizations should provide updated contact information to ensure timely communication regarding space operations.",
    category: "safety_operations",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO", "cislunar"],
    },
    complianceQuestion:
      "Is your operator contact information registered with relevant authorities and kept current?",
    evidenceRequired: [
      "Contact registry submission",
      "24/7 operations contact list",
      "Update procedures documentation",
    ],
    implementationGuidance: [
      "Register contacts with Space Surveillance networks",
      "Maintain 24/7 operations contact capability",
      "Update contact information within 48 hours of any change",
    ],
    euSpaceActCrossRef: ["Art. 51"],
    severity: "critical",
  },
  {
    id: "copuos-lts-b2",
    source: "COPUOS",
    referenceNumber: "B.2",
    title: "Improve accuracy of orbital data",
    description:
      "States and international intergovernmental organizations should improve the accuracy of orbital data on space objects and improve the information-sharing thereon.",
    category: "safety_operations",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Do you provide accurate orbital data to Space Situational Awareness providers?",
    evidenceRequired: [
      "Ephemeris data sharing agreement",
      "Orbital accuracy analysis",
      "SSA data sharing confirmation",
    ],
    implementationGuidance: [
      "Share ephemeris data with SSA providers (EUSST, 18SDS)",
      "Maintain ephemeris accuracy within specified thresholds",
      "Provide covariance data for conjunction assessment",
    ],
    euSpaceActCrossRef: ["Art. 63", "Art. 64"],
    iadcReference: "5.1",
    severity: "critical",
  },
  {
    id: "copuos-lts-b3",
    source: "COPUOS",
    referenceNumber: "B.3",
    title: "Promote conjunction information collection and dissemination",
    description:
      "States should promote the collection, sharing and dissemination of space debris data and conjunction warning information.",
    category: "safety_operations",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO"],
    },
    complianceQuestion:
      "Are you subscribed to a conjunction warning service and can you act on conjunction alerts?",
    evidenceRequired: [
      "Conjunction warning service subscription",
      "Collision avoidance procedures",
      "Response time capability documentation",
    ],
    implementationGuidance: [
      "Subscribe to conjunction warning services (EUSST, commercial providers)",
      "Establish collision avoidance maneuver capability",
      "Document response procedures for conjunction alerts",
    ],
    euSpaceActCrossRef: ["Art. 64", "Art. 65"],
    iadcReference: "5.2",
    severity: "critical",
  },
  {
    id: "copuos-lts-b4",
    source: "COPUOS",
    referenceNumber: "B.4",
    title: "Perform conjunction assessment during operations",
    description:
      "States should perform conjunction assessment during all orbital phases of space operations.",
    category: "safety_operations",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO"],
    },
    complianceQuestion:
      "Do you perform regular conjunction assessment throughout your mission?",
    evidenceRequired: [
      "Conjunction assessment procedures",
      "Collision probability thresholds",
      "Maneuver decision criteria",
    ],
    implementationGuidance: [
      "Assess conjunctions during launch, operations, and disposal phases",
      "Define collision probability thresholds for action",
      "Maintain records of all conjunction assessments and actions",
    ],
    euSpaceActCrossRef: ["Art. 64", "Art. 65", "Art. 66"],
    iadcReference: "5.2.1",
    severity: "critical",
  },
  {
    id: "copuos-lts-b5",
    source: "COPUOS",
    referenceNumber: "B.5",
    title: "Develop collision avoidance procedures",
    description:
      "States should develop practical approaches for collision avoidance procedures, including debris avoidance maneuvers.",
    category: "safety_operations",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO"],
      requiresPropulsion: true,
    },
    complianceQuestion:
      "Do you have documented collision avoidance procedures and maneuver capability?",
    evidenceRequired: [
      "Collision avoidance procedure document",
      "Delta-V budget for CA maneuvers",
      "Decision tree for CA actions",
    ],
    implementationGuidance: [
      "Develop standard collision avoidance procedures",
      "Reserve propellant for collision avoidance maneuvers",
      "Define decision thresholds and timelines for CA actions",
    ],
    euSpaceActCrossRef: ["Art. 66"],
    iadcReference: "5.2.2",
    isoReference: "ISO 24113:2024 §6.3",
    severity: "critical",
  },
  {
    id: "copuos-lts-b6",
    source: "COPUOS",
    referenceNumber: "B.6",
    title: "Share operational space weather data",
    description:
      "States should share operational space weather data and forecasts to improve awareness of the space environment.",
    category: "space_weather",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Do you monitor space weather conditions and share relevant data?",
    evidenceRequired: [
      "Space weather monitoring procedures",
      "Data sharing agreements (if applicable)",
      "Anomaly correlation records",
    ],
    implementationGuidance: [
      "Subscribe to space weather alert services",
      "Correlate operational anomalies with space weather events",
      "Share operational experience when appropriate",
    ],
    severity: "minor",
  },
  {
    id: "copuos-lts-b7",
    source: "COPUOS",
    referenceNumber: "B.7",
    title: "Develop space weather models and tools",
    description:
      "States should develop models, tools and procedures for space weather observations and forecasts.",
    category: "space_weather",
    bindingLevel: "recommended",
    applicability: {
      missionTypes: ["scientific", "governmental"],
    },
    complianceQuestion:
      "Does your mission contribute to space weather understanding (if applicable)?",
    evidenceRequired: [
      "Space weather contribution documentation",
      "Scientific data sharing agreements",
    ],
    implementationGuidance: [
      "Assess if mission can contribute space weather data",
      "Establish data sharing procedures if applicable",
    ],
    severity: "minor",
  },
  {
    id: "copuos-lts-b8",
    source: "COPUOS",
    referenceNumber: "B.8",
    title: "Design for space weather resilience",
    description:
      "States should design and operate space systems to be resilient to space weather impacts.",
    category: "space_weather",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO", "cislunar"],
    },
    complianceQuestion:
      "Is your spacecraft designed to be resilient to space weather impacts?",
    evidenceRequired: [
      "Radiation hardening analysis",
      "Single event effect mitigation measures",
      "Orbital debris protection assessment",
    ],
    implementationGuidance: [
      "Design electronics for radiation tolerance",
      "Include safe mode provisions for space weather events",
      "Consider shielding for critical components",
    ],
    severity: "major",
  },
  {
    id: "copuos-lts-b9",
    source: "COPUOS",
    referenceNumber: "B.9",
    title: "Address risks from uncontrolled re-entries",
    description:
      "States should address risks associated with uncontrolled re-entry of space objects.",
    category: "safety_operations",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "HEO", "GTO"],
    },
    complianceQuestion:
      "Have you assessed and mitigated risks from re-entry of your spacecraft?",
    evidenceRequired: [
      "Re-entry casualty risk assessment",
      "Design-for-demise analysis",
      "Controlled re-entry plan (if applicable)",
    ],
    implementationGuidance: [
      "Calculate casualty expectation for uncontrolled re-entry",
      "Design components for demise during re-entry",
      "Consider controlled re-entry if casualty risk exceeds 1:10,000",
    ],
    euSpaceActCrossRef: ["Art. 72", "Art. 73"],
    iadcReference: "5.3.2",
    isoReference: "ISO 24113:2024 §6.4",
    severity: "critical",
  },
  {
    id: "copuos-lts-b10",
    source: "COPUOS",
    referenceNumber: "B.10",
    title: "Observe safety measures for critical launches",
    description:
      "States should observe safety measures when conducting launches and take steps to reduce interference with other space operations.",
    category: "safety_operations",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO", "cislunar"],
    },
    complianceQuestion:
      "Are appropriate safety measures in place for your launch activities?",
    evidenceRequired: [
      "Launch safety analysis",
      "Launch collision avoidance screening",
      "Launch coordination documentation",
    ],
    implementationGuidance: [
      "Perform launch collision avoidance screening",
      "Coordinate launch window with relevant authorities",
      "Notify operators of potential conjunction risks during launch",
    ],
    euSpaceActCrossRef: ["Art. 33", "Art. 34"],
    severity: "critical",
  },

  // C. International cooperation, capacity-building and awareness
  {
    id: "copuos-lts-c1",
    source: "COPUOS",
    referenceNumber: "C.1",
    title: "Promote international cooperation",
    description:
      "States should promote and support international cooperation in space activities for peaceful purposes.",
    category: "international_cooperation",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: [
        "LEO",
        "MEO",
        "GEO",
        "HEO",
        "GTO",
        "cislunar",
        "deep_space",
      ],
    },
    complianceQuestion:
      "Does your mission support international cooperation in space activities?",
    evidenceRequired: [
      "International partnership agreements",
      "Data sharing agreements",
      "Cooperation framework documentation",
    ],
    implementationGuidance: [
      "Identify opportunities for international cooperation",
      "Establish data sharing arrangements where appropriate",
      "Participate in international space coordination mechanisms",
    ],
    severity: "minor",
  },
  {
    id: "copuos-lts-c2",
    source: "COPUOS",
    referenceNumber: "C.2",
    title: "Share experience in establishing frameworks",
    description:
      "States should share experience related to space activities, especially the establishment of regulatory frameworks.",
    category: "international_cooperation",
    bindingLevel: "recommended",
    applicability: {
      missionTypes: ["governmental"],
    },
    complianceQuestion:
      "Do you contribute to sharing regulatory experience (if applicable)?",
    evidenceRequired: [
      "Knowledge sharing documentation",
      "Participation in international forums",
    ],
    implementationGuidance: [
      "Participate in international regulatory forums",
      "Share lessons learned with emerging space nations",
    ],
    severity: "minor",
  },
  {
    id: "copuos-lts-c3",
    source: "COPUOS",
    referenceNumber: "C.3",
    title: "Promote capacity-building",
    description:
      "States should promote and support capacity-building in space activities.",
    category: "international_cooperation",
    bindingLevel: "recommended",
    applicability: {
      missionTypes: ["governmental", "educational"],
    },
    complianceQuestion:
      "Does your mission support capacity-building in space activities?",
    evidenceRequired: [
      "Capacity building program documentation",
      "Educational outreach records",
    ],
    implementationGuidance: [
      "Support educational initiatives in space",
      "Participate in training and capacity-building programs",
    ],
    severity: "minor",
  },
  {
    id: "copuos-lts-c4",
    source: "COPUOS",
    referenceNumber: "C.4",
    title: "Raise awareness about space activities",
    description:
      "States should raise awareness about space activities, their benefits and risks.",
    category: "international_cooperation",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: [
        "LEO",
        "MEO",
        "GEO",
        "HEO",
        "GTO",
        "cislunar",
        "deep_space",
      ],
    },
    complianceQuestion:
      "Do you contribute to public awareness about your space activities?",
    evidenceRequired: [
      "Public communication plan",
      "Outreach activities documentation",
    ],
    implementationGuidance: [
      "Develop public communication materials",
      "Engage in outreach and education activities",
    ],
    severity: "minor",
  },

  // D. Scientific and technical research and development
  {
    id: "copuos-lts-d1",
    source: "COPUOS",
    referenceNumber: "D.1",
    title: "Promote research on sustainable space activities",
    description:
      "States should promote research related to sustainable space activities and space sustainability.",
    category: "science_research",
    bindingLevel: "recommended",
    applicability: {
      missionTypes: ["scientific", "governmental"],
    },
    complianceQuestion:
      "Does your mission contribute to research on space sustainability (if applicable)?",
    evidenceRequired: [
      "Research contribution documentation",
      "Scientific publication plans",
    ],
    implementationGuidance: [
      "Identify sustainability research opportunities",
      "Share research findings with the community",
    ],
    severity: "minor",
  },
  {
    id: "copuos-lts-d2",
    source: "COPUOS",
    referenceNumber: "D.2",
    title: "Study and develop debris mitigation measures",
    description:
      "States should study and develop debris mitigation measures and technology.",
    category: "space_debris",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO"],
    },
    complianceQuestion:
      "Does your mission incorporate debris mitigation measures?",
    evidenceRequired: [
      "Debris mitigation plan",
      "Technology assessment for debris reduction",
    ],
    implementationGuidance: [
      "Implement state-of-the-art debris mitigation measures",
      "Consider active debris removal technologies if appropriate",
    ],
    euSpaceActCrossRef: ["Art. 67"],
    iadcReference: "5.3",
    isoReference: "ISO 24113:2024",
    severity: "major",
  },
  {
    id: "copuos-lts-d3",
    source: "COPUOS",
    referenceNumber: "D.3",
    title: "Support technology standardization",
    description:
      "States should support and participate in the development of standards for space systems.",
    category: "science_research",
    bindingLevel: "recommended",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO", "cislunar"],
    },
    complianceQuestion:
      "Does your mission follow relevant international standards?",
    evidenceRequired: [
      "Standards compliance matrix",
      "Design review against applicable standards",
    ],
    implementationGuidance: [
      "Identify applicable international standards (ISO, ECSS)",
      "Design spacecraft to comply with relevant standards",
    ],
    isoReference: "ISO 24113:2024",
    severity: "major",
  },
];

// ─── IADC Space Debris Mitigation Guidelines (2025 Update) ───

export const iadcGuidelines: CopuosGuideline[] = [
  {
    id: "iadc-5.1.1",
    source: "IADC",
    referenceNumber: "5.1.1",
    title: "Limitation of debris released during normal operations",
    description:
      "Space systems should be designed not to release debris during normal operations. If this is not feasible, the effect of any release of debris on the orbital environment should be minimized.",
    category: "space_debris",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO"],
    },
    complianceQuestion:
      "Is your spacecraft designed to avoid releasing debris during normal operations?",
    evidenceRequired: [
      "Design review documenting no planned debris release",
      "Mechanisms review for debris generation potential",
      "Mission debris assessment",
    ],
    implementationGuidance: [
      "Avoid pyrotechnic release mechanisms if possible",
      "Ensure lens caps, antenna covers, etc. are not jettisoned",
      "Use tethered mechanisms for any deployables",
    ],
    euSpaceActCrossRef: ["Art. 67(a)"],
    isoReference: "ISO 24113:2024 §6.2",
    severity: "major",
  },
  {
    id: "iadc-5.1.2",
    source: "IADC",
    referenceNumber: "5.1.2",
    title: "Minimization of break-up potential during operations",
    description:
      "Space systems should be designed and operated to minimize the potential for break-ups during operational phases.",
    category: "design_passivation",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Is your spacecraft designed to minimize break-up potential during operations?",
    evidenceRequired: [
      "Energy source safety analysis",
      "Propellant tank burst analysis",
      "Battery thermal runaway assessment",
    ],
    implementationGuidance: [
      "Minimize stored energy (pressure, momentum, chemical)",
      "Use fail-safe propellant tank designs",
      "Select batteries with low thermal runaway risk",
    ],
    euSpaceActCrossRef: ["Art. 67(c)"],
    isoReference: "ISO 24113:2024 §6.2.3",
    severity: "critical",
  },
  {
    id: "iadc-5.2.1",
    source: "IADC",
    referenceNumber: "5.2.1",
    title: "Collision probability estimation",
    description:
      "During all orbital phases, a space system should be able to estimate the probability of collision with other catalogued objects.",
    category: "collision_avoidance",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO"],
    },
    complianceQuestion:
      "Can you estimate collision probability throughout your mission?",
    evidenceRequired: [
      "Conjunction assessment service subscription",
      "Collision probability calculation methodology",
      "Screening volume documentation",
    ],
    implementationGuidance: [
      "Subscribe to conjunction assessment service",
      "Define screening volumes appropriate for mission",
      "Establish regular conjunction assessment schedule",
    ],
    euSpaceActCrossRef: ["Art. 64", "Art. 65"],
    isoReference: "ISO 24113:2024 §6.3",
    severity: "critical",
  },
  {
    id: "iadc-5.2.2",
    source: "IADC",
    referenceNumber: "5.2.2",
    title: "Collision avoidance maneuvers",
    description:
      "If the collision probability exceeds a threshold, the space system operator should execute a collision avoidance maneuver.",
    category: "collision_avoidance",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO"],
      requiresPropulsion: true,
    },
    complianceQuestion:
      "Do you have capability and procedures to execute collision avoidance maneuvers?",
    evidenceRequired: [
      "Collision avoidance maneuver procedures",
      "Delta-V budget allocation for CA",
      "Maneuver decision criteria",
    ],
    implementationGuidance: [
      "Define collision probability threshold for action (typically 10^-4 to 10^-5)",
      "Reserve sufficient propellant for CA maneuvers",
      "Establish maneuver planning and execution timeline",
    ],
    euSpaceActCrossRef: ["Art. 66"],
    isoReference: "ISO 24113:2024 §6.3.2",
    severity: "critical",
  },
  {
    id: "iadc-5.3.1",
    source: "IADC",
    referenceNumber: "5.3.1",
    title: "Passivation of space systems",
    description:
      "All on-board sources of stored energy should be depleted or made safe when they are no longer required for mission operations or post-mission disposal.",
    category: "design_passivation",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Does your spacecraft have a passivation plan for end-of-life?",
    evidenceRequired: [
      "Passivation procedure document",
      "Energy source inventory",
      "Passivation sequence design review",
    ],
    implementationGuidance: [
      "Deplete propellant tanks or vent to safe pressure",
      "Discharge batteries and prevent recharging",
      "De-spin momentum wheels",
      "Safe any pyrotechnic devices",
    ],
    euSpaceActCrossRef: ["Art. 67(d)"],
    isoReference: "ISO 24113:2024 §6.4.1",
    severity: "critical",
  },
  {
    id: "iadc-5.3.2-leo",
    source: "IADC",
    referenceNumber: "5.3.2",
    title: "Post-mission disposal - LEO",
    description:
      "Spacecraft in LEO should be de-orbited as soon as practical after mission completion. If direct deorbit is not possible, spacecraft should be left in an orbit that will decay within 25 years.",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO"],
    },
    complianceQuestion:
      "Will your LEO spacecraft deorbit within 25 years of end-of-mission?",
    evidenceRequired: [
      "Orbital lifetime analysis",
      "Deorbit plan and delta-V budget",
      "25-year compliance demonstration",
    ],
    implementationGuidance: [
      "Calculate orbital lifetime with NASA DAS or equivalent",
      "Plan active deorbit if natural decay exceeds 25 years",
      "Consider 5-year guideline for best practice",
    ],
    euSpaceActCrossRef: ["Art. 72"],
    isoReference: "ISO 24113:2024 §6.4.2",
    severity: "critical",
  },
  {
    id: "iadc-5.3.2-geo",
    source: "IADC",
    referenceNumber: "5.3.2",
    title: "Post-mission disposal - GEO",
    description:
      "Spacecraft in GEO should be transferred to a graveyard orbit with a minimum perigee altitude of GEO + 200 km + (Cr × A/m × 1000) km above GEO altitude.",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["GEO"],
    },
    complianceQuestion:
      "Do you have sufficient propellant for graveyard orbit transfer?",
    evidenceRequired: [
      "Graveyard orbit transfer plan",
      "Propellant budget with EOL reserve",
      "Target orbit parameters",
    ],
    implementationGuidance: [
      "Calculate required graveyard orbit altitude",
      "Reserve ~11 m/s delta-V for re-orbit",
      "Plan passivation after re-orbit maneuver",
    ],
    euSpaceActCrossRef: ["Art. 72"],
    isoReference: "ISO 24113:2024 §6.4.3",
    severity: "critical",
  },
  {
    id: "iadc-5.3.3",
    source: "IADC",
    referenceNumber: "5.3.3",
    title: "Limiting long-term interference with LEO and GEO regions",
    description:
      "Objects passing through LEO or GEO regions should not remain in these regions for more than 25 years (LEO) or should avoid long-term interference (GEO).",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["HEO", "GTO", "MEO"],
    },
    complianceQuestion:
      "Does your spacecraft avoid long-term interference with protected regions?",
    evidenceRequired: [
      "Long-term orbit evolution analysis",
      "Protected region transit analysis",
      "Disposal orbit selection rationale",
    ],
    implementationGuidance: [
      "Analyze orbit evolution over 200+ years",
      "Ensure spacecraft does not remain in LEO or GEO zones",
      "Select disposal orbit avoiding protected regions",
    ],
    euSpaceActCrossRef: ["Art. 72"],
    isoReference: "ISO 24113:2024 §6.4.4",
    severity: "critical",
  },
  {
    id: "iadc-5.3.4",
    source: "IADC",
    referenceNumber: "5.3.4",
    title: "Re-entry survival and casualty risk",
    description:
      "If the spacecraft cannot be safely disposed of in orbit, it should be designed to minimize ground casualty risk during re-entry.",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "GTO", "HEO"],
      minMassKg: 100,
    },
    complianceQuestion:
      "Have you assessed and mitigated ground casualty risk from re-entry?",
    evidenceRequired: [
      "Re-entry casualty risk assessment",
      "Design-for-demise analysis",
      "Controlled re-entry plan (if required)",
    ],
    implementationGuidance: [
      "Calculate casualty expectation (target < 10^-4)",
      "Design components to demise during re-entry",
      "Consider controlled re-entry for large spacecraft",
    ],
    euSpaceActCrossRef: ["Art. 72", "Art. 73"],
    isoReference: "ISO 24113:2024 §6.4.5",
    severity: "critical",
  },
];

// ─── ISO 24113:2024 Requirements ───

export const iso24113Requirements: CopuosGuideline[] = [
  {
    id: "iso-24113-6.1",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.1",
    title: "Debris mitigation requirements - General",
    description:
      "Space systems shall be designed and operated to minimize the generation of space debris throughout all mission phases.",
    category: "space_debris",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO", "GTO", "cislunar"],
    },
    complianceQuestion:
      "Is your mission designed to minimize debris generation?",
    evidenceRequired: [
      "Debris mitigation plan",
      "Design review records",
      "Mission phase debris assessment",
    ],
    implementationGuidance: [
      "Conduct debris generation assessment for all mission phases",
      "Implement debris mitigation measures in design",
      "Document compliance with ISO 24113",
    ],
    euSpaceActCrossRef: ["Art. 67"],
    iadcReference: "5.1",
    severity: "critical",
  },
  {
    id: "iso-24113-6.2.1",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.2.1",
    title: "Control of mission-related debris",
    description:
      "A space system shall limit the amount of mission-related debris released in protected orbit regions.",
    category: "space_debris",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "GEO"],
    },
    complianceQuestion:
      "Does your mission limit debris release in protected orbital regions?",
    evidenceRequired: [
      "Mission debris assessment",
      "Release mechanism review",
      "Protected region analysis",
    ],
    implementationGuidance: [
      "Minimize intentional debris releases",
      "Ensure any released objects decay within 25 years",
      "Document all planned debris releases and their justification",
    ],
    euSpaceActCrossRef: ["Art. 67(a)"],
    iadcReference: "5.1.1",
    severity: "major",
  },
  {
    id: "iso-24113-6.2.2",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.2.2",
    title: "Probability of break-up",
    description:
      "A space system shall be designed such that the probability of accidental break-up is less than 0.001 during the mission.",
    category: "design_passivation",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Is your spacecraft designed for < 0.001 probability of accidental break-up?",
    evidenceRequired: [
      "Break-up probability analysis",
      "Fault tree analysis",
      "Energy source failure mode analysis",
    ],
    implementationGuidance: [
      "Conduct failure mode and effects analysis for break-up scenarios",
      "Design propellant system for burst prevention",
      "Select batteries with proven safety record",
    ],
    euSpaceActCrossRef: ["Art. 67(c)"],
    iadcReference: "5.1.2",
    severity: "critical",
  },
  {
    id: "iso-24113-6.2.3",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.2.3",
    title: "Prevention of intentional destruction",
    description:
      "Intentional destruction of space systems generating long-lived debris shall be avoided unless required for safety.",
    category: "space_debris",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Does your mission plan avoid intentional destruction generating debris?",
    evidenceRequired: [
      "Mission plan review",
      "No intentional destruction statement",
    ],
    implementationGuidance: [
      "Avoid any planned fragmentation or break-up events",
      "If safety termination is required, design for minimum debris",
    ],
    euSpaceActCrossRef: ["Art. 67(c)"],
    iadcReference: "5.1.2",
    severity: "critical",
  },
  {
    id: "iso-24113-6.3.1",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.3.1",
    title: "Collision avoidance assessment",
    description:
      "Operators shall assess the risk of collision with catalogued objects and debris throughout all orbital phases.",
    category: "collision_avoidance",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO"],
    },
    complianceQuestion:
      "Do you conduct collision risk assessment throughout your mission?",
    evidenceRequired: [
      "Collision risk assessment methodology",
      "Conjunction screening records",
      "Risk acceptance criteria",
    ],
    implementationGuidance: [
      "Subscribe to conjunction warning service",
      "Define collision probability thresholds",
      "Maintain collision assessment records",
    ],
    euSpaceActCrossRef: ["Art. 64", "Art. 65"],
    iadcReference: "5.2.1",
    severity: "critical",
  },
  {
    id: "iso-24113-6.3.2",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.3.2",
    title: "Collision avoidance capabilities",
    description:
      "Spacecraft in congested regions shall have collision avoidance maneuver capability unless orbital lifetime is less than 25 years.",
    category: "collision_avoidance",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO"],
      minMassKg: 10,
    },
    complianceQuestion:
      "Does your spacecraft have collision avoidance capability appropriate for its orbit?",
    evidenceRequired: [
      "Maneuver capability assessment",
      "Delta-V budget",
      "Response time analysis",
    ],
    implementationGuidance: [
      "Provide propulsive CA capability if orbital lifetime > 25 years",
      "Reserve propellant for CA maneuvers",
      "Ensure ability to respond within conjunction warning timelines",
    ],
    euSpaceActCrossRef: ["Art. 66"],
    iadcReference: "5.2.2",
    severity: "critical",
  },
  {
    id: "iso-24113-6.4.1",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.4.1",
    title: "Passivation requirements",
    description:
      "All stored energy sources shall be depleted or safed at end of mission before disposal or when passivation is no longer deferrable.",
    category: "design_passivation",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Do you have comprehensive passivation procedures for all energy sources?",
    evidenceRequired: [
      "Passivation procedure",
      "Energy source inventory",
      "Passivation verification plan",
    ],
    implementationGuidance: [
      "Inventory all energy sources (propellant, batteries, pressure, momentum)",
      "Design passivation capability for each energy source",
      "Plan passivation sequence timing relative to disposal",
    ],
    euSpaceActCrossRef: ["Art. 67(d)"],
    iadcReference: "5.3.1",
    severity: "critical",
  },
  {
    id: "iso-24113-6.4.2",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.4.2",
    title: "Disposal of LEO spacecraft",
    description:
      "LEO spacecraft shall be disposed of such that the orbital lifetime after end of mission is less than 25 years.",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO"],
    },
    complianceQuestion:
      "Does your LEO disposal plan meet the 25-year requirement?",
    evidenceRequired: [
      "Orbital lifetime calculation",
      "Deorbit delta-V budget",
      "Disposal reliability analysis",
    ],
    implementationGuidance: [
      "Calculate post-mission orbital lifetime",
      "Design active deorbit capability if needed",
      "Consider 5-year best practice guideline",
    ],
    euSpaceActCrossRef: ["Art. 72"],
    iadcReference: "5.3.2",
    severity: "critical",
  },
  {
    id: "iso-24113-6.4.3",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.4.3",
    title: "Disposal of GEO spacecraft",
    description:
      "GEO spacecraft shall be transferred to a disposal orbit with minimum perigee above the protected GEO region.",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["GEO"],
    },
    complianceQuestion:
      "Is your GEO disposal plan compliant with protected region clearance?",
    evidenceRequired: [
      "Graveyard orbit design",
      "Propellant budget",
      "Long-term orbit stability analysis",
    ],
    implementationGuidance: [
      "Calculate required graveyard altitude per IADC formula",
      "Reserve EOL propellant",
      "Verify long-term orbit does not return to GEO region",
    ],
    euSpaceActCrossRef: ["Art. 72"],
    iadcReference: "5.3.2",
    severity: "critical",
  },
  {
    id: "iso-24113-6.4.4",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.4.4",
    title: "Ground casualty risk",
    description:
      "For spacecraft undergoing uncontrolled re-entry, the casualty expectation shall be less than 1 in 10,000.",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "GTO", "HEO"],
      minMassKg: 50,
    },
    complianceQuestion:
      "Is your spacecraft's re-entry casualty expectation < 1:10,000?",
    evidenceRequired: [
      "Casualty expectation analysis",
      "Surviving debris assessment",
      "Design-for-demise analysis (if applicable)",
    ],
    implementationGuidance: [
      "Calculate casualty expectation using NASA DAS or equivalent",
      "Identify surviving components",
      "Implement design-for-demise or plan controlled re-entry",
    ],
    euSpaceActCrossRef: ["Art. 72", "Art. 73"],
    iadcReference: "5.3.4",
    severity: "critical",
  },
  {
    id: "iso-24113-6.4.5",
    source: "ISO",
    referenceNumber: "ISO 24113:2024 §6.4.5",
    title: "Disposal reliability",
    description:
      "The probability of successful post-mission disposal shall be at least 90%.",
    category: "disposal",
    bindingLevel: "mandatory",
    applicability: {
      orbitRegimes: ["LEO", "MEO", "GEO", "HEO"],
    },
    complianceQuestion:
      "Is your disposal system designed for > 90% success probability?",
    evidenceRequired: [
      "Disposal reliability analysis",
      "Failure mode analysis",
      "Redundancy design documentation",
    ],
    implementationGuidance: [
      "Analyze disposal system reliability",
      "Consider redundant disposal mechanisms",
      "Plan for backup disposal approaches",
    ],
    euSpaceActCrossRef: ["Art. 72"],
    severity: "critical",
  },
];

// ─── Combined Guidelines ───

export const allCopuosIadcGuidelines: CopuosGuideline[] = [
  ...copuosLtsGuidelines,
  ...iadcGuidelines,
  ...iso24113Requirements,
];

// ─── Helper Functions ───

export function getSatelliteCategory(massKg: number): SatelliteCategory {
  if (massKg < 10) return "cubesat";
  if (massKg < 100) return "smallsat";
  if (massKg < 1000) return "medium";
  if (massKg < 5000) return "large";
  return "mega";
}

export function getApplicableGuidelines(
  profile: CopuosMissionProfile,
): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter((guideline) => {
    const app = guideline.applicability;

    // Check orbit regime
    if (app.orbitRegimes && !app.orbitRegimes.includes(profile.orbitRegime)) {
      return false;
    }

    // Check mission type
    if (app.missionTypes && !app.missionTypes.includes(profile.missionType)) {
      return false;
    }

    // Check satellite category
    if (
      app.satelliteCategories &&
      !app.satelliteCategories.includes(profile.satelliteCategory)
    ) {
      return false;
    }

    // Check mass constraints
    if (
      app.minMassKg !== undefined &&
      profile.satelliteMassKg < app.minMassKg
    ) {
      return false;
    }

    // Check altitude constraints
    if (
      app.maxAltitudeKm !== undefined &&
      profile.altitudeKm &&
      profile.altitudeKm > app.maxAltitudeKm
    ) {
      return false;
    }
    if (
      app.minAltitudeKm !== undefined &&
      profile.altitudeKm &&
      profile.altitudeKm < app.minAltitudeKm
    ) {
      return false;
    }

    // Check constellation requirement
    if (app.constellationsOnly && !profile.isConstellation) {
      return false;
    }

    // Check propulsion requirement
    if (app.requiresPropulsion && !profile.hasPropulsion) {
      return false;
    }

    return true;
  });
}

export function getGuidelinesBySource(
  source: GuidelineSource,
): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter((g) => g.source === source);
}

export function getGuidelinesByCategory(
  category: GuidelineCategory,
): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter((g) => g.category === category);
}

export function getGuidelineById(id: string): CopuosGuideline | undefined {
  return allCopuosIadcGuidelines.find((g) => g.id === id);
}

export function getMandatoryGuidelines(): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter((g) => g.bindingLevel === "mandatory");
}

export function getCriticalGuidelines(): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter((g) => g.severity === "critical");
}

// Cross-reference helpers
export function getGuidelinesWithEuSpaceActRef(
  articleRef: string,
): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter((g) =>
    g.euSpaceActCrossRef?.some((ref) => ref.includes(articleRef)),
  );
}

export function getGuidelinesWithIso24113Ref(): CopuosGuideline[] {
  return allCopuosIadcGuidelines.filter((g) => g.isoReference !== undefined);
}
