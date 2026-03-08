// ═══════════════════════════════════════════════════════════════════════════════
// LSO (Launch Site Operator) Compliance Requirements
//
// Regulatory data for LSO entities — deadlines and compliance requirements
// for the Ephemeris engine.
// ═══════════════════════════════════════════════════════════════════════════════

import type { LaunchDeadline } from "@/lib/ephemeris/core/types";

// ─── LSO Deadlines ──────────────────────────────────────────────────────────

export const LSO_DEADLINES: LaunchDeadline[] = [
  // Site Authorization
  {
    key: "site_license_validity",
    label: "Site License Validity",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 180,
    baseSeverity: "CRITICAL",
  },
  {
    key: "site_license_renewal",
    label: "Site License Renewal Application",
    regulationRef: "eu_space_act_art_6",
    frequency: "annual",
    leadTimeDays: 270,
    baseSeverity: "HIGH",
  },
  // Range Safety Systems
  {
    key: "fts_system_certification",
    label: "FTS System Certification",
    regulationRef: "eu_space_act_art_62",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  {
    key: "radar_calibration_certificate",
    label: "Radar Calibration Certificate",
    regulationRef: "eu_space_act_art_62",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  {
    key: "telemetry_system_certification",
    label: "Telemetry System Certification",
    regulationRef: "eu_space_act_art_62",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Environmental Compliance
  {
    key: "environmental_permit_renewal",
    label: "Environmental Permit Renewal",
    regulationRef: "eu_space_act_art_66",
    frequency: "biannual",
    leadTimeDays: 120,
    baseSeverity: "HIGH",
  },
  {
    key: "noise_monitoring_report",
    label: "Noise Monitoring Report",
    regulationRef: "eu_space_act_art_66",
    frequency: "annual",
    leadTimeDays: 30,
    baseSeverity: "MEDIUM",
  },
  // Emergency Response
  {
    key: "emergency_response_drill",
    label: "Emergency Response Drill",
    regulationRef: "national_civil_protection",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  {
    key: "emergency_response_plan_update",
    label: "Emergency Response Plan Update",
    regulationRef: "national_civil_protection",
    frequency: "annual",
    leadTimeDays: 45,
    baseSeverity: "MEDIUM",
  },
  // Cybersecurity (NIS2)
  {
    key: "penetration_test_lso",
    label: "Penetration Test (Site Systems)",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 56,
    baseSeverity: "HIGH",
  },
  {
    key: "vulnerability_scan_lso",
    label: "Vulnerability Scan (Site Network)",
    regulationRef: "nis2_art_21",
    frequency: "biannual",
    leadTimeDays: 7,
    baseSeverity: "MEDIUM",
  },
  // Insurance
  {
    key: "site_insurance_renewal",
    label: "Site Insurance Renewal",
    regulationRef: "eu_space_act_art_8",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  // Documentation
  {
    key: "operational_safety_manual_update",
    label: "Operational Safety Manual Update",
    regulationRef: "eu_space_act_art_62",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Ground Infrastructure
  {
    key: "weather_system_calibration",
    label: "Weather System Calibration",
    regulationRef: "eu_space_act_art_64",
    frequency: "biannual",
    leadTimeDays: 30,
    baseSeverity: "MEDIUM",
  },
  {
    key: "power_system_backup_test",
    label: "Power System Backup Test",
    regulationRef: "eu_space_act_art_64",
    frequency: "biannual",
    leadTimeDays: 14,
    baseSeverity: "MEDIUM",
  },
];
