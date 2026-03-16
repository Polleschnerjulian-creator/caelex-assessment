/**
 * Generate 2.0 — Section Definitions
 *
 * Defines the sections for each of the 16 NCA document types.
 */

import type { NCADocumentType, SectionDefinition } from "./types";

export const SECTION_DEFINITIONS: Record<NCADocumentType, SectionDefinition[]> =
  {
    // ─── Category A: Debris Mitigation ───

    DMP: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Mission Overview & Orbital Parameters" },
      { number: 4, title: "Spacecraft Technical Description" },
      { number: 5, title: "Orbital Lifetime Analysis (25-Year Rule)" },
      { number: 6, title: "Collision Avoidance Strategy" },
      { number: 7, title: "End-of-Life Disposal Plan" },
      { number: 8, title: "Passivation & Fragmentation Prevention" },
      { number: 9, title: "Trackability & Identification" },
      { number: 10, title: "Compliance Verification Matrix (Art. 58-73)" },
      { number: 11, title: "Gap Analysis & Remediation Roadmap" },
    ],

    ORBITAL_LIFETIME: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Orbital Parameters" },
      { number: 4, title: "Atmospheric Drag Analysis" },
      { number: 5, title: "Solar Activity Projections" },
      { number: 6, title: "Decay Modeling Results" },
      { number: 7, title: "25-Year Compliance Assessment" },
      { number: 8, title: "Sensitivity Analysis" },
      { number: 9, title: "Conclusions" },
    ],

    COLLISION_AVOIDANCE: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Conjunction Assessment Process" },
      { number: 4, title: "Data Sources & SSA Providers" },
      { number: 5, title: "Alert Handling & Escalation" },
      { number: 6, title: "Maneuver Decision Criteria" },
      { number: 7, title: "Maneuver Execution" },
      { number: 8, title: "Operator Coordination" },
      { number: 9, title: "Performance Metrics" },
      { number: 10, title: "Compliance Matrix" },
    ],

    EOL_DISPOSAL: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Disposal Strategy Selection" },
      { number: 4, title: "Disposal Maneuver Design" },
      { number: 5, title: "Fuel Budget Analysis" },
      { number: 6, title: "Success Probability" },
      { number: 7, title: "Contingency Procedures" },
      { number: 8, title: "Ground Support" },
      { number: 9, title: "Compliance Matrix" },
    ],

    PASSIVATION: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Passivation Rationale" },
      { number: 4, title: "Energy Source Inventory" },
      { number: 5, title: "Passivation Sequence" },
      { number: 6, title: "Battery Discharge Procedure" },
      { number: 7, title: "Propellant Depletion Procedure" },
      { number: 8, title: "Pressure Vessel Safing" },
      { number: 9, title: "Verification & Testing" },
      { number: 10, title: "Compliance Matrix" },
    ],

    REENTRY_RISK: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Re-Entry Scenario" },
      { number: 4, title: "Demise Analysis" },
      { number: 5, title: "Surviving Fragments Assessment" },
      { number: 6, title: "Ground Impact Footprint" },
      { number: 7, title: "Casualty Risk Calculation" },
      { number: 8, title: "Mitigation Measures" },
      { number: 9, title: "Compliance Assessment" },
    ],

    DEBRIS_SUPPLY_CHAIN: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Supply Chain Mapping" },
      { number: 4, title: "Debris Mitigation Flow-Down Requirements" },
      { number: 5, title: "Supplier Compliance Assessment" },
      { number: 6, title: "Contractual Obligations" },
      { number: 7, title: "Verification & Audit Procedures" },
      { number: 8, title: "Compliance Matrix" },
    ],

    LIGHT_RF_POLLUTION: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Brightness Analysis" },
      { number: 4, title: "Anti-Reflective Measures" },
      { number: 5, title: "RF Interference Assessment" },
      { number: 6, title: "ITU Coordination" },
      { number: 7, title: "Astronomical Community Engagement" },
      { number: 8, title: "Implementation Plan" },
      { number: 9, title: "Compliance Matrix" },
    ],

    // ─── Category B: Cybersecurity ───

    CYBER_POLICY: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Policy Scope & Applicability" },
      { number: 4, title: "Roles & Responsibilities" },
      { number: 5, title: "Security Objectives & Principles" },
      { number: 6, title: "Information Classification" },
      { number: 7, title: "Acceptable Use Policy" },
      { number: 8, title: "Policy Governance & Review" },
      { number: 9, title: "Compliance Matrix (Art. 74-95)" },
    ],

    CYBER_RISK_ASSESSMENT: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Risk Assessment Methodology" },
      { number: 4, title: "Asset Inventory" },
      { number: 5, title: "Threat Landscape Analysis" },
      { number: 6, title: "Vulnerability Assessment" },
      { number: 7, title: "Risk Evaluation & Prioritization" },
      { number: 8, title: "Risk Treatment Plan" },
      { number: 9, title: "Compliance Matrix" },
    ],

    INCIDENT_RESPONSE: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Incident Classification Framework" },
      { number: 4, title: "Detection & Identification" },
      { number: 5, title: "Containment & Eradication" },
      { number: 6, title: "Recovery Procedures" },
      { number: 7, title: "Notification Procedures (24h/72h/1mo)" },
      { number: 8, title: "Post-Incident Review" },
      { number: 9, title: "Testing & Exercises" },
      { number: 10, title: "Compliance Matrix" },
    ],

    BCP_RECOVERY: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Business Impact Analysis" },
      { number: 4, title: "Recovery Objectives (RTO/RPO)" },
      { number: 5, title: "Continuity Strategies" },
      { number: 6, title: "Recovery Procedures" },
      { number: 7, title: "Testing & Validation" },
      { number: 8, title: "Plan Maintenance" },
      { number: 9, title: "Compliance Matrix" },
    ],

    ACCESS_CONTROL: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Access Control Policy" },
      { number: 4, title: "Identity Management" },
      { number: 5, title: "Authentication Requirements" },
      { number: 6, title: "Authorization Model" },
      { number: 7, title: "Privileged Access Management" },
      { number: 8, title: "Access Review & Audit" },
      { number: 9, title: "Compliance Matrix" },
    ],

    SUPPLY_CHAIN_SECURITY: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Supply Chain Mapping" },
      { number: 4, title: "Supplier Risk Assessment" },
      { number: 5, title: "Security Requirements for Suppliers" },
      { number: 6, title: "Contractual Security Clauses" },
      { number: 7, title: "Monitoring & Audit" },
      { number: 8, title: "Incident Coordination with Suppliers" },
      { number: 9, title: "Compliance Matrix" },
    ],

    EUSRN_PROCEDURES: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "EUSRN Overview & Legal Basis" },
      { number: 4, title: "Notification Triggers" },
      { number: 5, title: "Notification Process & Timelines" },
      { number: 6, title: "Information Requirements" },
      { number: 7, title: "Internal Coordination" },
      { number: 8, title: "Testing & Readiness" },
      { number: 9, title: "Compliance Matrix" },
    ],

    COMPLIANCE_MATRIX: [
      { number: 1, title: "Cover Page & Document Control" },
      { number: 2, title: "Executive Summary" },
      { number: 3, title: "Verification Methodology" },
      { number: 4, title: "Requirements Matrix (Art. 74-95)" },
      { number: 5, title: "Evidence Inventory" },
      { number: 6, title: "Gap Analysis" },
      { number: 7, title: "Remediation Roadmap" },
      { number: 8, title: "Certification Readiness Assessment" },
    ],

    // ─── Category C: General / Cross-Cutting ───

    AUTHORIZATION_APPLICATION: [
      { number: 1, title: "Cover Letter" },
      { number: 2, title: "Operator Profile" },
      { number: 3, title: "Mission Description" },
      { number: 4, title: "Compliance Summary" },
      { number: 5, title: "Authorization Checklist (Art. 7)" },
      { number: 6, title: "Supporting Documents Index" },
      { number: 7, title: "Certification Statement" },
    ],

    ENVIRONMENTAL_FOOTPRINT: [
      { number: 1, title: "Executive Summary" },
      { number: 2, title: "Mission Profile" },
      { number: 3, title: "Lifecycle Assessment Methodology" },
      { number: 4, title: "Launch Vehicle Analysis" },
      { number: 5, title: "Propellant Analysis" },
      { number: 6, title: "Lifecycle Phase Breakdown" },
      { number: 7, title: "Supplier Data Summary" },
      { number: 8, title: "Hotspot Identification" },
      { number: 9, title: "Mitigation Measures" },
      { number: 10, title: "EFD Grade Justification" },
      { number: 11, title: "Recommendations" },
    ],

    INSURANCE_COMPLIANCE: [
      { number: 1, title: "Executive Summary" },
      { number: 2, title: "Organization Risk Profile" },
      { number: 3, title: "Third-Party Liability Analysis" },
      { number: 4, title: "Coverage Overview" },
      { number: 5, title: "Jurisdiction Requirements" },
      { number: 6, title: "Gap Analysis" },
      { number: 7, title: "Premium Estimates" },
      { number: 8, title: "Recommendations" },
    ],

    // Category D — Safety (generated via dedicated Hazard Analysis module)
    // L-10: HAZARD_REPORT section definitions exist for future use and are excluded
    // from the Generate 2.0 flow. This document type is generated through the
    // dedicated Hazard Analysis module (CNES/FSOA template), not via the AI
    // generation pipeline. These definitions are retained here for completeness
    // and to support potential future integration with the Generate 2.0 system.
    HAZARD_REPORT: [
      { number: 1, title: "Document Cover & Classification" },
      { number: 2, title: "Mission Overview" },
      { number: 3, title: "Safety Requirements" },
      { number: 4, title: "Hazard Log & Risk Matrix" },
      { number: 5, title: "Quantitative Risk Assessment" },
      { number: 6, title: "Mitigation Measures" },
      { number: 7, title: "Deorbit & Disposal" },
      { number: 8, title: "Hazard Acceptance & Open Items" },
    ],
  };
