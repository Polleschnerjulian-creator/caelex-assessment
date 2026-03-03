import type { RegulationMapping } from "../types/evidence-packet.js";

export interface RegulatoryRule {
  id: string;
  name: string;
  regulation: string;
  article: string;
  data_points: string[];
  evaluate: (data: Record<string, unknown>) => RegulationMapping["status"];
}

export const REGULATORY_RULES: RegulatoryRule[] = [
  // ═══════════════════════════════════════════════════
  // EU SPACE ACT — Debris & Orbital Safety
  // ═══════════════════════════════════════════════════
  {
    id: "eu_space_act_art_68_25yr",
    name: "25-Year Orbital Lifetime Limit",
    regulation: "EU Space Act",
    article: "Art. 68",
    data_points: ["altitude_km", "estimated_lifetime_yr"],
    evaluate: (d) => {
      const alt = d["altitude_km"] as number;
      const life = d["estimated_lifetime_yr"] as number;
      if (alt < 2000 && life > 25) return "NON_COMPLIANT";
      if (alt < 2000 && life > 20) return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "eu_space_act_art_70_passivation",
    name: "End-of-Life Passivation Readiness",
    regulation: "EU Space Act",
    article: "Art. 70",
    data_points: [
      "remaining_fuel_pct",
      "battery_soc_pct",
      "solar_array_power_w",
    ],
    evaluate: (d) => {
      const fuel = d["remaining_fuel_pct"] as number;
      if (fuel < 5) return "CRITICAL";
      if (fuel < 15) return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "eu_space_act_art_66_manoeuvrability",
    name: "Spacecraft Manoeuvrability",
    regulation: "EU Space Act",
    article: "Art. 66",
    data_points: ["thruster_status", "attitude_status"],
    evaluate: (d) => {
      if (d["thruster_status"] === "FAILED") return "NON_COMPLIANT";
      if (d["thruster_status"] === "DEGRADED") return "WARNING";
      if (d["attitude_status"] === "TUMBLING") return "NON_COMPLIANT";
      if (d["attitude_status"] === "SAFE_MODE") return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "eu_space_act_art_64_collision_avoidance",
    name: "Collision Avoidance Capability",
    regulation: "EU Space Act",
    article: "Art. 64",
    data_points: [
      "ca_events_30d",
      "ca_maneuvers_30d",
      "thruster_status",
      "high_risk_ca_events",
    ],
    evaluate: (d) => {
      if (d["thruster_status"] === "FAILED") return "NON_COMPLIANT";
      const highRisk = d["high_risk_ca_events"] as number;
      const maneuvers = d["ca_maneuvers_30d"] as number;
      if (highRisk > 0 && maneuvers === 0) return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "eu_space_act_art_72_disposal",
    name: "End-of-Life Disposal Capability",
    regulation: "EU Space Act",
    article: "Art. 72",
    data_points: ["deorbit_capability", "remaining_fuel_pct"],
    evaluate: (d) => {
      if (d["deorbit_capability"] === "IMPOSSIBLE") return "NON_COMPLIANT";
      if (d["deorbit_capability"] === "DEGRADED") return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "eu_space_act_art_102_ca_response",
    name: "Collision Avoidance Response",
    regulation: "EU Space Act",
    article: "Art. 102",
    data_points: ["ca_events_30d", "high_risk_ca_events", "ca_maneuvers_30d"],
    evaluate: (d) => {
      const events = d["ca_events_30d"] as number;
      const highRisk = d["high_risk_ca_events"] as number;
      if (events > 10) return "MONITORED";
      if (highRisk > 2) return "WARNING";
      return "COMPLIANT";
    },
  },

  // ═══════════════════════════════════════════════════
  // NIS2 Directive — Cybersecurity
  // ═══════════════════════════════════════════════════
  {
    id: "nis2_art_23_incident_reporting",
    name: "Incident Reporting Compliance",
    regulation: "NIS2 Directive",
    article: "Art. 23",
    data_points: ["reportable_incidents", "mttr_minutes"],
    evaluate: (d) => {
      const reportable = d["reportable_incidents"] as number;
      const mttr = d["mttr_minutes"] as number;
      if (reportable > 0 && mttr > 1440) return "NON_COMPLIANT"; // >24h
      if (reportable > 0) return "MONITORED";
      return "COMPLIANT";
    },
  },
  {
    id: "nis2_art_21_vulnerability_mgmt",
    name: "Vulnerability Management",
    regulation: "NIS2 Directive",
    article: "Art. 21(2)(e)",
    data_points: [
      "critical_vulns_unpatched",
      "patch_compliance_pct",
      "days_since_last_vuln_scan",
    ],
    evaluate: (d) => {
      if ((d["critical_vulns_unpatched"] as number) > 0) return "NON_COMPLIANT";
      if ((d["patch_compliance_pct"] as number) < 80) return "WARNING";
      if ((d["days_since_last_vuln_scan"] as number) > 30) return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "nis2_art_21_access_control",
    name: "Access Control & Authentication",
    regulation: "NIS2 Directive",
    article: "Art. 21(2)(i)(j)",
    data_points: [
      "mfa_adoption_pct",
      "privileged_accounts",
      "last_access_review",
    ],
    evaluate: (d) => {
      const mfa = d["mfa_adoption_pct"] as number;
      if (mfa < 80) return "NON_COMPLIANT";
      if (mfa < 95) return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "nis2_art_21_backup",
    name: "Backup & Recovery",
    regulation: "NIS2 Directive",
    article: "Art. 21(2)(c)",
    data_points: ["backup_status", "last_backup_test"],
    evaluate: (d) => {
      if (d["backup_status"] === "FAILED") return "NON_COMPLIANT";
      if (d["backup_status"] === "UNVERIFIED") return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "nis2_art_21_encryption",
    name: "Encryption Standards",
    regulation: "NIS2 Directive",
    article: "Art. 21(2)(h)",
    data_points: ["encryption_at_rest", "encryption_in_transit"],
    evaluate: (d) => {
      if (
        d["encryption_at_rest"] === "NONE" ||
        d["encryption_in_transit"] === "NONE"
      )
        return "NON_COMPLIANT";
      if (
        d["encryption_at_rest"] === "PARTIAL" ||
        d["encryption_in_transit"] === "PARTIAL"
      )
        return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "nis2_art_21_training",
    name: "Security Awareness Training",
    regulation: "NIS2 Directive",
    article: "Art. 21(2)(g)",
    data_points: ["security_training_pct"],
    evaluate: (d) => {
      const pct = d["security_training_pct"] as number;
      if (pct < 70) return "NON_COMPLIANT";
      if (pct < 90) return "WARNING";
      return "COMPLIANT";
    },
  },

  // ═══════════════════════════════════════════════════
  // IADC Guidelines — Debris Mitigation
  // ═══════════════════════════════════════════════════
  {
    id: "iadc_5_3_1_passivation_fuel",
    name: "IADC Passivation Fuel Reserve",
    regulation: "IADC Guidelines",
    article: "§5.3.1",
    data_points: ["remaining_fuel_pct"],
    evaluate: (d) => {
      const fuel = d["remaining_fuel_pct"] as number;
      if (fuel < 10) return "WARNING";
      return "COMPLIANT";
    },
  },
  {
    id: "iadc_5_2_orbit_lifetime",
    name: "IADC 25-Year Rule",
    regulation: "IADC Guidelines",
    article: "§5.2",
    data_points: ["estimated_lifetime_yr", "altitude_km"],
    evaluate: (d) => {
      const alt = d["altitude_km"] as number;
      const life = d["estimated_lifetime_yr"] as number;
      if (alt < 2000 && life > 25) return "NON_COMPLIANT";
      return "COMPLIANT";
    },
  },

  // ═══════════════════════════════════════════════════
  // Ground Station — Operational
  // ═══════════════════════════════════════════════════
  {
    id: "eu_space_act_art_64_gs_contact",
    name: "Ground Station Contact Capability",
    regulation: "EU Space Act",
    article: "Art. 64",
    data_points: ["contact_success_rate_pct", "time_since_last_contact_min"],
    evaluate: (d) => {
      const rate = d["contact_success_rate_pct"] as number;
      const timeSince = d["time_since_last_contact_min"] as number;
      if (rate < 85) return "NON_COMPLIANT";
      if (rate < 95 || timeSince > 360) return "WARNING";
      return "COMPLIANT";
    },
  },

  // ═══════════════════════════════════════════════════
  // Document Compliance
  // ═══════════════════════════════════════════════════
  {
    id: "eu_space_act_art_7_licensing",
    name: "License & Certificate Validity",
    regulation: "EU Space Act",
    article: "Art. 7",
    data_points: ["detected_type", "expiry_date"],
    evaluate: (d) => {
      const expiry = d["expiry_date"] as string | null;
      if (!expiry) return "COMPLIANT";
      const daysUntil = Math.floor(
        (new Date(expiry).getTime() - Date.now()) / 86400000,
      );
      if (daysUntil < 0) return "NON_COMPLIANT";
      if (daysUntil < 30) return "WARNING";
      return "COMPLIANT";
    },
  },
];
