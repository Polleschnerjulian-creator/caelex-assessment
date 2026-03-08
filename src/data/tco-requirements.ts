// ═══════════════════════════════════════════════════════════════════════════════
// TCO (Tracking, Commanding & Operations) Compliance Requirements
//
// Regulatory data for TCO entities — deadlines and compliance requirements
// for the Ephemeris engine.
// ═══════════════════════════════════════════════════════════════════════════════

import type { LaunchDeadline } from "@/lib/ephemeris/core/types";

// ─── TCO Deadlines ──────────────────────────────────────────────────────────

export const TCO_DEADLINES: LaunchDeadline[] = [
  // Operations Authorization
  {
    key: "operations_authorization_validity",
    label: "Operations Authorization Validity",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 180,
    baseSeverity: "CRITICAL",
  },
  {
    key: "operations_authorization_renewal",
    label: "Operations Authorization Renewal",
    regulationRef: "eu_space_act_art_6",
    frequency: "annual",
    leadTimeDays: 270,
    baseSeverity: "HIGH",
  },
  // Ground Infrastructure
  {
    key: "ground_station_certification",
    label: "Ground Station Certification",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  {
    key: "antenna_calibration",
    label: "Antenna Calibration Certificate",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  {
    key: "timing_system_certification",
    label: "Timing System Certification",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Cybersecurity
  {
    key: "nis2_compliance_audit",
    label: "NIS2 Compliance Audit",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  {
    key: "command_encryption_audit",
    label: "Command Encryption Audit",
    regulationRef: "nis2_art_21",
    frequency: "biannual",
    leadTimeDays: 60,
    baseSeverity: "CRITICAL",
  },
  {
    key: "penetration_test",
    label: "Penetration Test",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Command Integrity
  {
    key: "command_protocol_review",
    label: "Command Protocol Review",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Tracking Accuracy
  {
    key: "tracking_accuracy_validation",
    label: "Tracking Accuracy Validation",
    regulationRef: "eu_space_act_art_64",
    frequency: "biannual",
    leadTimeDays: 30,
    baseSeverity: "MEDIUM",
  },
  // Insurance
  {
    key: "tpl_insurance_renewal",
    label: "TPL Insurance Renewal",
    regulationRef: "eu_space_act_art_8",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  // Interoperability
  {
    key: "ccsds_compliance_review",
    label: "CCSDS Compliance Review",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
  // Documentation
  {
    key: "operations_manual_review",
    label: "Operations Manual Review",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
  {
    key: "annual_compliance_report",
    label: "Annual Compliance Report",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
];
