// ═══════════════════════════════════════════════════════════════════════════════
// ISOS (In-Space Operations & Servicing) Compliance Requirements
//
// Regulatory data for ISOS entities — deadlines, proximity thresholds,
// and compliance requirements for the Ephemeris engine.
// ═══════════════════════════════════════════════════════════════════════════════

import type { LaunchDeadline } from "@/lib/ephemeris/core/types";

// ─── ISOS Deadlines ─────────────────────────────────────────────────────────

export const ISOS_DEADLINES: LaunchDeadline[] = [
  // Mission Authorization
  {
    key: "isos_mission_license",
    label: "ISOS Mission License",
    regulationRef: "eu_space_act_art_63",
    frequency: "once",
    leadTimeDays: 365,
    baseSeverity: "CRITICAL",
  },
  {
    key: "isos_mission_plan_update",
    label: "Mission Plan Update Submission",
    regulationRef: "eu_space_act_art_63",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "HIGH",
  },
  // Proximity Operations
  {
    key: "proximity_ops_authorization",
    label: "Proximity Operations Authorization",
    regulationRef: "eu_space_act_art_63",
    frequency: "per_campaign",
    leadTimeDays: 120,
    baseSeverity: "CRITICAL",
  },
  {
    key: "target_consent_verification",
    label: "Target Operator Consent Verification",
    regulationRef: "eu_space_act_art_63",
    frequency: "per_campaign",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  {
    key: "collision_avoidance_plan",
    label: "Collision Avoidance Plan",
    regulationRef: "iadc_proximity_guidelines",
    frequency: "per_campaign",
    leadTimeDays: 60,
    baseSeverity: "HIGH",
  },
  {
    key: "abort_procedure_review",
    label: "Abort Procedure Review",
    regulationRef: "eu_space_act_art_63",
    frequency: "annual",
    leadTimeDays: 45,
    baseSeverity: "HIGH",
  },
  // Insurance (higher for ISOS due to third-party satellite risk)
  {
    key: "tpl_insurance_isos",
    label: "TPL Insurance (ISOS Mission)",
    regulationRef: "eu_space_act_art_8",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "CRITICAL",
  },
  {
    key: "target_damage_insurance",
    label: "Target Damage Liability Insurance",
    regulationRef: "eu_space_act_art_8",
    frequency: "per_campaign",
    leadTimeDays: 60,
    baseSeverity: "CRITICAL",
  },
  // Cybersecurity
  {
    key: "penetration_test_isos",
    label: "Penetration Test (ISOS Command & Control)",
    regulationRef: "nis2_art_21",
    frequency: "annual",
    leadTimeDays: 56,
    baseSeverity: "HIGH",
  },
  {
    key: "command_link_security_audit",
    label: "Command Link Security Audit",
    regulationRef: "nis2_art_21",
    frequency: "biannual",
    leadTimeDays: 30,
    baseSeverity: "HIGH",
  },
  // Documentation
  {
    key: "safety_case_isos",
    label: "ISOS Safety Case Document",
    regulationRef: "eu_space_act_art_63",
    frequency: "annual",
    leadTimeDays: 90,
    baseSeverity: "HIGH",
  },
  {
    key: "deorbit_plan_post_mission",
    label: "Post-Mission Deorbit Plan",
    regulationRef: "eu_space_act_art_70",
    frequency: "once",
    leadTimeDays: 180,
    baseSeverity: "HIGH",
  },
];

// ─── Art. 63 Proximity Operations Thresholds ────────────────────────────────

export const PROXIMITY_THRESHOLDS = {
  keepOutZoneDefault: 10, // km — default keep-out zone
  warningDistance: 5, // km — WARNING when closer
  criticalDistance: 1, // km — CRITICAL when closer
  maxApproachVelocity: 0.5, // m/s — safe approach speed
  warningApproachVelocity: 1.0, // m/s — WARNING
  criticalApproachVelocity: 2.0, // m/s — CRITICAL
  minAbortFuelPercent: 20, // % — minimum fuel for safe abort
};
