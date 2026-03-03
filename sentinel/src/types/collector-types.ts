export interface CollectorOutput {
  data_point: string;
  values: Record<string, unknown>;
  source_system: string;
  collection_method: string;
  compliance_notes: string[];
  satellite_norad_id?: string;
}

export interface CronSchedule {
  expression: string;
  description: string;
}

export interface CollectorHealth {
  name: string;
  healthy: boolean;
  lastRun: Date | null;
  nextRun: Date | null;
  errorCount: number;
  lastError?: string;
}

// Orbit data shape
export interface OrbitData {
  altitude_km: number;
  semi_major_axis_km: number;
  eccentricity: number;
  inclination_deg: number;
  remaining_fuel_kg: number;
  remaining_fuel_pct: number;
  thruster_status: "NOMINAL" | "DEGRADED" | "FAILED";
  last_maneuver_timestamp: string;
  last_maneuver_delta_v: number;
  ca_events_30d: number;
  high_risk_ca_events: number;
  ca_maneuvers_30d: number;
  attitude_status: "NOMINAL" | "SAFE_MODE" | "TUMBLING";
  solar_array_power_w: number;
  battery_soc_pct: number;
  estimated_lifetime_yr: number;
  deorbit_capability: "NOMINAL" | "DEGRADED" | "IMPOSSIBLE";
}

// Cyber posture shape
export interface CyberPosture {
  incidents_30d: number;
  incidents_by_severity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  mttd_minutes: number;
  mttr_minutes: number;
  reportable_incidents: number;
  critical_vulns_unpatched: number;
  high_vulns_unpatched: number;
  patch_compliance_pct: number;
  days_since_last_vuln_scan: number;
  mfa_adoption_pct: number;
  privileged_accounts: number;
  last_access_review: string;
  backup_status: "VERIFIED" | "UNVERIFIED" | "FAILED";
  last_backup_test: string;
  encryption_at_rest: "AES-256" | "PARTIAL" | "NONE";
  encryption_in_transit: "TLS-1.3" | "TLS-1.2" | "PARTIAL" | "NONE";
  last_pentest_date: string;
  security_training_pct: number;
}

// Ground station shape
export interface GroundStationData {
  station_id: string;
  station_name: string;
  location: string;
  contacts_24h: number;
  contact_success_rate_pct: number;
  ground_station_availability_pct: number;
  command_uplink_success_pct: number;
  time_since_last_contact_min: number;
  signal_margin_db: number;
  frequency_coordination_status: "CURRENT" | "PENDING" | "EXPIRED";
}

// Document event shape
export interface DocumentEvent {
  filename: string;
  file_hash: string;
  file_size_bytes: number;
  detected_type:
    | "CERTIFICATE"
    | "INSURANCE_POLICY"
    | "EXPORT_LICENSE"
    | "TRAINING_CERT"
    | "AUDIT_REPORT"
    | "POLICY_DOCUMENT";
  expiry_date: string | null;
  detected_at: string;
}
