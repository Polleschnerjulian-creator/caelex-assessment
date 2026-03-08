// ═══════════════════════════════════════════════════════════════════════════════
// Launch Operator Compliance Requirements
//
// Regulatory data for Launch Operator (LO) entities — deadlines, jurisdiction
// profiles, and compliance requirements for the Ephemeris engine.
// ═══════════════════════════════════════════════════════════════════════════════

import type {
  LaunchDeadline,
  LaunchJurisdictionProfile,
} from "@/lib/ephemeris/core/types";

// ─── Launch Deadlines ────────────────────────────────────────────────────────

export const LAUNCH_DEADLINES: LaunchDeadline[] = [
  // Authorization
  {
    key: "launch_license_validity",
    label: "Launch License Validity",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 180,
    baseSeverity: "CRITICAL",
  },
  {
    key: "launch_license_renewal",
    label: "Launch License Renewal Application",
    regulationRef: "eu_space_act_art_6",
    frequency: "annual",
    leadTimeDays: 270,
    baseSeverity: "HIGH",
  },
  // Range Safety
  {
    key: "fts_certification",
    label: "Flight Termination System Certification",
    regulationRef: "eu_space_act_art_62",
    frequency: "per_campaign",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  {
    key: "range_safety_review",
    label: "Range Safety Review",
    regulationRef: "eu_space_act_art_62",
    frequency: "per_campaign",
    leadTimeDays: 60,
    baseSeverity: "CRITICAL",
  },
  {
    key: "flight_safety_analysis",
    label: "Flight Safety Analysis Update",
    regulationRef: "eu_space_act_art_62",
    frequency: "per_campaign",
    leadTimeDays: 45,
    baseSeverity: "HIGH",
  },
  // Insurance
  {
    key: "tpl_insurance_launch",
    label: "Third-Party Liability Insurance (Launch)",
    regulationRef: "eu_space_act_art_8",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  {
    key: "tpl_insurance_campaign",
    label: "Campaign-Specific Insurance Endorsement",
    regulationRef: "eu_space_act_art_8",
    frequency: "per_campaign",
    leadTimeDays: 30,
    baseSeverity: "HIGH",
  },
  // Environmental
  {
    key: "environmental_impact_assessment",
    label: "Environmental Impact Assessment",
    regulationRef: "eu_space_act_art_66",
    frequency: "biannual",
    leadTimeDays: 120,
    baseSeverity: "HIGH",
  },
  {
    key: "noise_assessment",
    label: "Launch Noise Assessment",
    regulationRef: "eu_space_act_art_66",
    frequency: "per_campaign",
    leadTimeDays: 30,
    baseSeverity: "MEDIUM",
  },
  // Payload
  {
    key: "payload_safety_review",
    label: "Payload Safety Review",
    regulationRef: "eu_space_act_art_64",
    frequency: "per_campaign",
    leadTimeDays: 45,
    baseSeverity: "HIGH",
  },
  {
    key: "payload_export_license",
    label: "Payload Export License Verification",
    regulationRef: "eu_dual_use",
    frequency: "per_campaign",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Cybersecurity (NIS2)
  {
    key: "penetration_test_lo",
    label: "Penetration Test (Launch Systems)",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 56,
    baseSeverity: "HIGH",
  },
  {
    key: "vulnerability_scan_lo",
    label: "Vulnerability Scan (Ground Systems)",
    regulationRef: "nis2_art_21",
    frequency: "biannual",
    leadTimeDays: 7,
    baseSeverity: "MEDIUM",
  },
  // Documentation
  {
    key: "flight_safety_plan",
    label: "Flight Safety Plan",
    regulationRef: "eu_space_act_art_62",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "HIGH",
  },
  {
    key: "emergency_response_plan",
    label: "Emergency Response Plan",
    regulationRef: "eu_space_act_art_62",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
  // Frequency
  {
    key: "telemetry_frequency_license",
    label: "Telemetry Frequency License",
    regulationRef: "itu_radio_regulations",
    frequency: "annual",
    leadTimeDays: 120,
    baseSeverity: "HIGH",
  },
];

// ─── Launch Jurisdiction Profiles ────────────────────────────────────────────

export const LAUNCH_JURISDICTIONS: Record<string, LaunchJurisdictionProfile> = {
  NO: {
    name: "Norway",
    primaryLaw: "Norwegian Space Act (2022)",
    authority: "Norwegian Space Agency (NOSA)",
    primaryLaunchSite: "Andøya Spaceport",
    latitude: 69.3,
    insuranceMinimumEur: 45_000_000,
    approvalTimelineMonths: 12,
    environmentalAssessment: "EIA, limited scope",
    exportControl: "EEA + NATO aligned",
    polarOrbitAccess: "excellent",
    equatorialAccess: "poor",
    maxLaunchRateYear: 20,
    strengths: [
      "Fast approval for small launchers",
      "Polar/SSO orbit access",
      "Growing infrastructure",
    ],
    challenges: [
      "Limited equatorial access",
      "Weather constraints",
      "Remote logistics",
    ],
  },
  FR: {
    name: "France",
    primaryLaw: "LOI 2008-518 (French Space Operations Act)",
    authority: "CNES (Technical) + Ministry of Higher Education",
    primaryLaunchSite: "Centre Spatial Guyanais (Kourou)",
    latitude: 5.2,
    insuranceMinimumEur: 60_000_000,
    approvalTimelineMonths: 18,
    environmentalAssessment: "Full ICPE, strict (ESA/CNES standards)",
    exportControl: "Broad EU framework",
    polarOrbitAccess: "limited (SSO via dogleg maneuver)",
    equatorialAccess: "excellent",
    maxLaunchRateYear: 15,
    strengths: [
      "Equatorial advantage",
      "ESA infrastructure",
      "Established regulatory framework",
    ],
    challenges: [
      "Higher insurance requirements",
      "Longer approval timeline",
      "Strict environmental rules",
    ],
  },
  SE: {
    name: "Sweden",
    primaryLaw: "Swedish Space Activities Act (1982:963)",
    authority: "Swedish National Space Agency (SNSA)",
    primaryLaunchSite: "Esrange Space Center",
    latitude: 67.9,
    insuranceMinimumEur: 35_000_000,
    approvalTimelineMonths: 14,
    environmentalAssessment: "EIA, moderate scope",
    exportControl: "EEA + NATO aligned",
    polarOrbitAccess: "good",
    equatorialAccess: "poor",
    maxLaunchRateYear: 10,
    strengths: [
      "Established sounding rocket heritage",
      "Good polar access",
      "Moderate regulations",
    ],
    challenges: [
      "Limited orbital launch history",
      "Smaller infrastructure",
      "Weather constraints",
    ],
  },
  GB: {
    name: "United Kingdom",
    primaryLaw: "Space Industry Act 2018",
    authority: "UK Civil Aviation Authority (CAA)",
    primaryLaunchSite: "SaxaVord Spaceport (Shetland)",
    latitude: 60.8,
    insuranceMinimumEur: 58_000_000,
    approvalTimelineMonths: 16,
    environmentalAssessment: "EIA + Habitats Regulations Assessment",
    exportControl: "UK OGEL + Wassenaar Arrangement",
    polarOrbitAccess: "good",
    equatorialAccess: "moderate",
    maxLaunchRateYear: 12,
    strengths: [
      "Strong regulatory framework",
      "Multiple spaceport sites",
      "Financial sector proximity",
    ],
    challenges: [
      "Post-Brexit export complexity",
      "Higher insurance",
      "Environmental scrutiny",
    ],
  },
  DE: {
    name: "Germany",
    primaryLaw: "SatDSiG + upcoming national space law",
    authority: "DLR (Technical oversight)",
    primaryLaunchSite: "Offshore platform (North Sea, planned)",
    latitude: 54.0,
    insuranceMinimumEur: 50_000_000,
    approvalTimelineMonths: 18,
    environmentalAssessment: "UVP (Environmental Impact Assessment), strict",
    exportControl: "EU framework + Wassenaar + MTCR",
    polarOrbitAccess: "moderate",
    equatorialAccess: "poor",
    maxLaunchRateYear: 8,
    strengths: [
      "Strong industrial base",
      "EU regulatory alignment",
      "DLR technical expertise",
    ],
    challenges: [
      "No established launch site yet",
      "Complex regulatory landscape",
      "Environmental restrictions",
    ],
  },
  IT: {
    name: "Italy",
    primaryLaw: "Italian Space Act (Legge 7/2018)",
    authority: "ASI (Italian Space Agency)",
    primaryLaunchSite: "Luigi Broglio Space Centre (offshore platform)",
    latitude: 2.9,
    insuranceMinimumEur: 50_000_000,
    approvalTimelineMonths: 16,
    environmentalAssessment: "VIA (Valutazione Impatto Ambientale)",
    exportControl: "EU framework + Wassenaar",
    polarOrbitAccess: "poor",
    equatorialAccess: "excellent (equatorial platform)",
    maxLaunchRateYear: 6,
    strengths: [
      "Near-equatorial platform",
      "ESA membership",
      "Growing space economy",
    ],
    challenges: [
      "Limited platform capacity",
      "Complex bureaucracy",
      "Offshore logistics",
    ],
  },
};
