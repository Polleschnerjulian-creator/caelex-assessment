// ═══════════════════════════════════════════════════════════════════════════════
// CAP (Capacity Provider) Compliance Requirements
//
// Regulatory data for CAP entities — deadlines and compliance requirements
// for the Ephemeris engine.
// ═══════════════════════════════════════════════════════════════════════════════

import type { LaunchDeadline } from "@/lib/ephemeris/core/types";

// ─── CAP Deadlines ──────────────────────────────────────────────────────────

export const CAP_DEADLINES: LaunchDeadline[] = [
  // Service Authorization
  {
    key: "service_authorization_validity",
    label: "Service Authorization Validity",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 180,
    baseSeverity: "CRITICAL",
  },
  {
    key: "service_authorization_renewal",
    label: "Service Authorization Renewal",
    regulationRef: "eu_space_act_art_6",
    frequency: "annual",
    leadTimeDays: 270,
    baseSeverity: "HIGH",
  },
  // Service Continuity
  {
    key: "continuity_plan_review",
    label: "Service Continuity Plan Review",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "HIGH",
  },
  {
    key: "disaster_recovery_test",
    label: "Disaster Recovery Test",
    regulationRef: "eu_space_act_art_64",
    frequency: "biannual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Capacity Management
  {
    key: "capacity_audit",
    label: "Capacity Audit & Forecast",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
  // Cybersecurity
  {
    key: "nis2_compliance_audit",
    label: "NIS2 Compliance Audit",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "HIGH",
  },
  {
    key: "penetration_test",
    label: "Penetration Test",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // SLA Compliance
  {
    key: "sla_performance_review",
    label: "SLA Performance Review",
    regulationRef: "eu_space_act_art_64",
    frequency: "annual",
    leadTimeDays: 30,
    baseSeverity: "MEDIUM",
  },
  {
    key: "customer_notification_obligations",
    label: "Customer Notification Obligations",
    regulationRef: "eu_space_act_art_64",
    frequency: "per_campaign",
    leadTimeDays: 14,
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
  {
    key: "service_liability_review",
    label: "Service Liability Review",
    regulationRef: "eu_space_act_art_8",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  // Spectrum Coordination
  {
    key: "spectrum_license_renewal",
    label: "Spectrum License Renewal",
    regulationRef: "itu_radio_regulations",
    frequency: "annual",
    leadTimeDays: 180,
    baseSeverity: "HIGH",
  },
  {
    key: "interference_assessment",
    label: "Interference Assessment",
    regulationRef: "itu_radio_regulations",
    frequency: "biannual",
    leadTimeDays: 30,
    baseSeverity: "MEDIUM",
  },
  // Documentation
  {
    key: "annual_compliance_report",
    label: "Annual Compliance Report",
    regulationRef: "eu_space_act_art_5",
    frequency: "annual",
    leadTimeDays: 60,
    baseSeverity: "MEDIUM",
  },
];
