// ═══════════════════════════════════════════════════════════════════════════════
// PDP (Payload Data Provider) Compliance Requirements
//
// Regulatory data for PDP entities — deadlines and compliance requirements
// for the Ephemeris engine.
// ═══════════════════════════════════════════════════════════════════════════════

import type { LaunchDeadline } from "@/lib/ephemeris/core/types";

// ─── PDP Deadlines ──────────────────────────────────────────────────────────

export const PDP_DEADLINES: LaunchDeadline[] = [
  // Data Authorization
  {
    key: "data_authorization_validity",
    label: "Data Authorization Validity",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 180,
    baseSeverity: "CRITICAL",
  },
  {
    key: "data_authorization_renewal",
    label: "Data Authorization Renewal",
    regulationRef: "eu_space_act_art_6",
    frequency: "annual",
    leadTimeDays: 270,
    baseSeverity: "HIGH",
  },
  // Data Security
  {
    key: "data_security_audit",
    label: "Data Security Audit",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "HIGH",
  },
  {
    key: "encryption_key_rotation",
    label: "Encryption Key Rotation",
    regulationRef: "nis2_art_21",
    frequency: "biannual",
    leadTimeDays: 30,
    baseSeverity: "HIGH",
  },
  // Data Quality
  {
    key: "data_quality_assessment",
    label: "Data Quality Assessment",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
  {
    key: "calibration_validation",
    label: "Calibration & Validation",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
  // Distribution Compliance
  {
    key: "distribution_license_review",
    label: "Distribution License Review",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "HIGH",
  },
  {
    key: "export_control_review",
    label: "Export Control Review",
    regulationRef: "eu_dual_use",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
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
  // Spectrum Rights
  {
    key: "downlink_license_renewal",
    label: "Downlink License Renewal",
    regulationRef: "itu_radio_regulations",
    frequency: "annual",
    leadTimeDays: 180,
    baseSeverity: "HIGH",
  },
  // Documentation
  {
    key: "data_policy_review",
    label: "Data Policy Review",
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
