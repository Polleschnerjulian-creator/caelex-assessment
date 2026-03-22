// ─── Demo Data Definitions ───
// Static data only — NO server imports, NO Prisma.
// All demo records use [DEMO] prefix in name/title fields
// and { _demo: true } in JSON metadata fields.

// ═══════════════════════════════════════════════════════════
// SATELLITES
// ═══════════════════════════════════════════════════════════

export const DEMO_SATELLITES = [
  {
    name: "[DEMO] Sentinel-2A",
    noradId: "40697",
    cosparId: "2015-028A",
    missionType: "earth_observation",
    orbitType: "LEO",
    altitudeKm: 786,
    inclinationDeg: 98.57,
    status: "OPERATIONAL" as const,
  },
  {
    name: "[DEMO] Galileo-FOC FM10",
    noradId: "41859",
    cosparId: "2016-069A",
    missionType: "navigation",
    orbitType: "MEO",
    altitudeKm: 23222,
    inclinationDeg: 56.0,
    status: "OPERATIONAL" as const,
  },
  {
    name: "[DEMO] EUTELSAT HOTBIRD 13G",
    noradId: "52040",
    cosparId: "2022-053A",
    missionType: "communication",
    orbitType: "GEO",
    altitudeKm: 35786,
    inclinationDeg: 0.05,
    status: "OPERATIONAL" as const,
  },
] as const;

// ═══════════════════════════════════════════════════════════
// CONJUNCTION EVENTS
// ═══════════════════════════════════════════════════════════

export const DEMO_CONJUNCTION_EVENTS = [
  {
    // EMERGENCY — Sentinel-2A vs Cosmos debris
    satelliteIndex: 0, // references DEMO_SATELLITES[0]
    threatNoradId: "22675",
    threatObjectName: "COSMOS 2251 DEB",
    threatObjectType: "DEBRIS",
    conjunctionId: "DEMO-CDM-2026-001",
    status: "ASSESSMENT_REQUIRED" as const,
    riskTier: "EMERGENCY" as const,
    peakPc: 2.3e-4,
    latestPc: 2.3e-4,
    latestMissDistance: 340,
    relativeSpeed: 14200,
    tcaOffsetHours: 18, // TCA is 18h from now
  },
  {
    // ELEVATED — Galileo vs rocket body
    satelliteIndex: 1,
    threatNoradId: "13552",
    threatObjectName: "SL-8 R/B",
    threatObjectType: "ROCKET BODY",
    conjunctionId: "DEMO-CDM-2026-002",
    status: "DECISION_MADE" as const,
    riskTier: "ELEVATED" as const,
    peakPc: 8.1e-6,
    latestPc: 5.2e-6,
    latestMissDistance: 890,
    relativeSpeed: 3400,
    tcaOffsetHours: 72,
    decision: "MONITOR" as const,
    decisionRationale:
      "Pc trending downward (slope -0.8/day, R\u00B2=0.72). Miss distance stable above 800m. Will re-assess if Pc exceeds 1e-5. Fuel reserves adequate for maneuver if needed.",
  },
  {
    // CLOSED — HOTBIRD vs defunct sat
    satelliteIndex: 2,
    threatNoradId: "28702",
    threatObjectName: "INTELSAT 10-02 (IS-10-02)",
    threatObjectType: "PAYLOAD",
    conjunctionId: "DEMO-CDM-2026-003",
    status: "CLOSED" as const,
    riskTier: "MONITOR" as const,
    peakPc: 3.7e-5,
    latestPc: 1.2e-6,
    latestMissDistance: 2100,
    relativeSpeed: 780,
    tcaOffsetHours: -48, // TCA was 48h ago
    decision: "ACCEPT_RISK" as const,
    decisionRationale:
      "Pc below maneuver threshold for all applicable NCAs. GEO station-keeping constraints make maneuver impractical. Risk accepted with NCA notification.",
    closedReason:
      "TCA passed without incident. Post-event analysis confirms minimum miss distance 2.1km.",
    ncaNotified: true,
    reportGenerated: true,
  },
] as const;

// ═══════════════════════════════════════════════════════════
// CDM RECORDS — 8 total, showing Pc evolution per event
// ═══════════════════════════════════════════════════════════

export const DEMO_CDM_RECORDS = [
  // --- Event 0 (EMERGENCY, Sentinel-2A vs COSMOS debris): 3 CDMs ---
  {
    eventIndex: 0,
    cdmId: "DEMO-CDM-REC-001",
    hoursBeforeNow: 72,
    missDistance: 1200,
    collisionProbability: 4.5e-6,
    relativeSpeed: 14180,
    riskTier: "ELEVATED" as const,
    probabilityMethod: "FOSTER-1992",
  },
  {
    eventIndex: 0,
    cdmId: "DEMO-CDM-REC-002",
    hoursBeforeNow: 36,
    missDistance: 640,
    collisionProbability: 7.8e-5,
    relativeSpeed: 14195,
    riskTier: "HIGH" as const,
    probabilityMethod: "FOSTER-1992",
  },
  {
    eventIndex: 0,
    cdmId: "DEMO-CDM-REC-003",
    hoursBeforeNow: 6,
    missDistance: 340,
    collisionProbability: 2.3e-4,
    relativeSpeed: 14200,
    riskTier: "EMERGENCY" as const,
    probabilityMethod: "FOSTER-1992",
  },
  // --- Event 1 (ELEVATED, Galileo vs SL-8 R/B): 3 CDMs ---
  {
    eventIndex: 1,
    cdmId: "DEMO-CDM-REC-004",
    hoursBeforeNow: 96,
    missDistance: 720,
    collisionProbability: 8.1e-6,
    relativeSpeed: 3380,
    riskTier: "ELEVATED" as const,
    probabilityMethod: "ALFANO-MAX",
  },
  {
    eventIndex: 1,
    cdmId: "DEMO-CDM-REC-005",
    hoursBeforeNow: 48,
    missDistance: 810,
    collisionProbability: 6.4e-6,
    relativeSpeed: 3390,
    riskTier: "ELEVATED" as const,
    probabilityMethod: "ALFANO-MAX",
  },
  {
    eventIndex: 1,
    cdmId: "DEMO-CDM-REC-006",
    hoursBeforeNow: 12,
    missDistance: 890,
    collisionProbability: 5.2e-6,
    relativeSpeed: 3400,
    riskTier: "ELEVATED" as const,
    probabilityMethod: "ALFANO-MAX",
  },
  // --- Event 2 (CLOSED, HOTBIRD vs INTELSAT): 2 CDMs ---
  {
    eventIndex: 2,
    cdmId: "DEMO-CDM-REC-007",
    hoursBeforeNow: 120,
    missDistance: 1500,
    collisionProbability: 3.7e-5,
    relativeSpeed: 775,
    riskTier: "ELEVATED" as const,
    probabilityMethod: "PATERA-2005",
  },
  {
    eventIndex: 2,
    cdmId: "DEMO-CDM-REC-008",
    hoursBeforeNow: 60,
    missDistance: 2100,
    collisionProbability: 1.2e-6,
    relativeSpeed: 780,
    riskTier: "MONITOR" as const,
    probabilityMethod: "PATERA-2005",
  },
] as const;

// ═══════════════════════════════════════════════════════════
// GENERATED DOCUMENTS
// ═══════════════════════════════════════════════════════════

export const DEMO_DOCUMENTS = [
  {
    documentType: "DEBRIS_MITIGATION_PLAN" as const,
    title: "[DEMO] Debris Mitigation Plan \u2014 Sentinel-2A",
    language: "en",
    status: "COMPLETED" as const,
  },
  {
    documentType: "CYBERSECURITY_FRAMEWORK" as const,
    title: "[DEMO] Cybersecurity Policy \u2014 EuroSat Fleet",
    language: "en",
    status: "COMPLETED" as const,
  },
  {
    documentType: "AUTHORIZATION_APPLICATION" as const,
    title: "[DEMO] Authorization Application \u2014 BNetzA",
    language: "de",
    status: "PENDING" as const,
  },
] as const;

// ═══════════════════════════════════════════════════════════
// VERITY ATTESTATIONS
// ═══════════════════════════════════════════════════════════

export const DEMO_ATTESTATIONS = [
  {
    regulationRef: "eu_art70_fuel_passivation",
    dataPoint: "fuel_reserve_percent",
    thresholdType: "gte",
    thresholdValue: 5.0,
    result: true,
    trustLevel: "HIGH",
    trustScore: 0.92,
    evidenceSource: "sentinel_telemetry",
    claimStatement:
      "[DEMO] Fuel reserve at 12.4% — exceeds 5% passivation threshold per EU Space Act Art. 70",
  },
  {
    regulationRef: "eu_art68_orbital_lifetime",
    dataPoint: "orbital_lifetime_years",
    thresholdType: "lte",
    thresholdValue: 25.0,
    result: true,
    trustLevel: "HIGH",
    trustScore: 0.95,
    evidenceSource: "ephemeris_forecast",
    claimStatement:
      "[DEMO] Predicted orbital lifetime 4.2 years — within 25-year limit per EU Space Act Art. 68",
  },
  {
    regulationRef: "nis2_art21_patch_compliance",
    dataPoint: "patch_compliance_percent",
    thresholdType: "gte",
    thresholdValue: 95.0,
    result: true,
    trustLevel: "MEDIUM",
    trustScore: 0.78,
    evidenceSource: "cyber_scan",
    claimStatement:
      "[DEMO] Ground segment patch compliance at 97.3% — meets NIS2 Art. 21 requirements",
  },
  {
    regulationRef: "eu_art64_ca_capability",
    dataPoint: "collision_avoidance_capability",
    thresholdType: "eq",
    thresholdValue: 1.0,
    result: true,
    trustLevel: "HIGH",
    trustScore: 0.91,
    evidenceSource: "sentinel_telemetry",
    claimStatement:
      "[DEMO] Collision avoidance capability verified — thruster system operational per EU Space Act Art. 64",
  },
  {
    regulationRef: "nis2_art21_mfa",
    dataPoint: "mfa_adoption_percent",
    thresholdType: "gte",
    thresholdValue: 100.0,
    result: false,
    trustLevel: "MEDIUM",
    trustScore: 0.65,
    evidenceSource: "iam_audit",
    claimStatement:
      "[DEMO] MFA adoption at 78% — below 100% requirement per NIS2 Art. 21",
  },
  {
    regulationRef: "nis2_art23_incident_response",
    dataPoint: "incident_response_time_minutes",
    thresholdType: "lte",
    thresholdValue: 60.0,
    result: false,
    trustLevel: "LOW",
    trustScore: 0.42,
    evidenceSource: "incident_log",
    claimStatement:
      "[DEMO] Average incident response time 142min — exceeds 60min target per NIS2 Art. 23",
  },
] as const;

// ═══════════════════════════════════════════════════════════
// SENTINEL AGENT + PACKETS
// ═══════════════════════════════════════════════════════════

export const DEMO_SENTINEL_AGENT = {
  name: "[DEMO] EuroSat Ground Control Sentinel",
  enabledCollectors: [
    "orbital_parameters",
    "cyber_posture",
    "ground_station_metrics",
  ],
  version: "2.1.0",
};

/** 15 packets with three data-point types and realistic values */
export const DEMO_SENTINEL_PACKETS: readonly {
  dataPoint: string;
  satelliteNorad: string;
  sourceSystem: string;
  collectionMethod: string;
  hoursAgo: number;
  complianceNotes: string[];
  values: Record<string, unknown>;
  regulationMapping: Record<string, string>;
  trustScore: number;
}[] = [
  // ── orbital_parameters (5 packets, Sentinel-2A) ──
  {
    dataPoint: "orbital_parameters",
    satelliteNorad: "40697",
    sourceSystem: "mission_control_fds",
    collectionMethod: "automated_telemetry",
    hoursAgo: 1,
    complianceNotes: [
      "Orbit within licensed altitude band",
      "Inclination nominal",
    ],
    values: {
      _demo: true,
      altitude_km: 785.4,
      inclination_deg: 98.56,
      eccentricity: 0.000142,
      raan_deg: 142.3,
      arg_perigee_deg: 89.7,
      mean_anomaly_deg: 270.1,
      epoch: "2026-03-22T10:00:00Z",
    },
    regulationMapping: {
      altitude_km: "eu_art68_orbital_parameters",
      inclination_deg: "eu_art68_orbital_parameters",
    },
    trustScore: 0.94,
  },
  {
    dataPoint: "orbital_parameters",
    satelliteNorad: "40697",
    sourceSystem: "mission_control_fds",
    collectionMethod: "automated_telemetry",
    hoursAgo: 7,
    complianceNotes: ["Orbit nominal"],
    values: {
      _demo: true,
      altitude_km: 785.6,
      inclination_deg: 98.57,
      eccentricity: 0.000139,
      raan_deg: 141.8,
      arg_perigee_deg: 89.6,
      mean_anomaly_deg: 45.2,
      epoch: "2026-03-22T04:00:00Z",
    },
    regulationMapping: {
      altitude_km: "eu_art68_orbital_parameters",
    },
    trustScore: 0.93,
  },
  {
    dataPoint: "orbital_parameters",
    satelliteNorad: "40697",
    sourceSystem: "mission_control_fds",
    collectionMethod: "automated_telemetry",
    hoursAgo: 13,
    complianceNotes: ["Orbit nominal"],
    values: {
      _demo: true,
      altitude_km: 785.8,
      inclination_deg: 98.57,
      eccentricity: 0.000137,
      raan_deg: 141.3,
      arg_perigee_deg: 89.5,
      mean_anomaly_deg: 180.4,
      epoch: "2026-03-21T22:00:00Z",
    },
    regulationMapping: {
      altitude_km: "eu_art68_orbital_parameters",
    },
    trustScore: 0.92,
  },
  {
    dataPoint: "orbital_parameters",
    satelliteNorad: "41859",
    sourceSystem: "mission_control_fds",
    collectionMethod: "automated_telemetry",
    hoursAgo: 3,
    complianceNotes: ["MEO orbit stable", "Galileo constellation slot nominal"],
    values: {
      _demo: true,
      altitude_km: 23222.1,
      inclination_deg: 56.0,
      eccentricity: 0.000024,
      raan_deg: 30.1,
      arg_perigee_deg: 315.4,
      mean_anomaly_deg: 120.7,
      epoch: "2026-03-22T08:00:00Z",
    },
    regulationMapping: {
      altitude_km: "eu_art68_orbital_parameters",
    },
    trustScore: 0.95,
  },
  {
    dataPoint: "orbital_parameters",
    satelliteNorad: "52040",
    sourceSystem: "mission_control_fds",
    collectionMethod: "automated_telemetry",
    hoursAgo: 5,
    complianceNotes: [
      "GEO station-keeping within +/-0.05 deg",
      "Longitude 13.0E nominal",
    ],
    values: {
      _demo: true,
      altitude_km: 35786.2,
      inclination_deg: 0.048,
      eccentricity: 0.000003,
      longitude_deg: 13.0,
      epoch: "2026-03-22T06:00:00Z",
    },
    regulationMapping: {
      altitude_km: "eu_art68_orbital_parameters",
      longitude_deg: "itu_geo_station_keeping",
    },
    trustScore: 0.96,
  },
  // ── cyber_posture (5 packets) ──
  {
    dataPoint: "cyber_posture",
    satelliteNorad: "40697",
    sourceSystem: "soc_dashboard",
    collectionMethod: "automated_scan",
    hoursAgo: 2,
    complianceNotes: [
      "2 HIGH vulnerabilities pending patch",
      "MFA coverage below target",
    ],
    values: {
      _demo: true,
      vulnerability_count_critical: 0,
      vulnerability_count_high: 2,
      vulnerability_count_medium: 7,
      patch_compliance_percent: 97.3,
      mfa_adoption_percent: 78,
      last_penetration_test: "2026-02-15",
      encryption_at_rest: true,
      encryption_in_transit: true,
    },
    regulationMapping: {
      patch_compliance_percent: "nis2_art21_patch_management",
      mfa_adoption_percent: "nis2_art21_access_control",
      vulnerability_count_critical: "nis2_art21_vulnerability_handling",
    },
    trustScore: 0.74,
  },
  {
    dataPoint: "cyber_posture",
    satelliteNorad: "40697",
    sourceSystem: "soc_dashboard",
    collectionMethod: "automated_scan",
    hoursAgo: 26,
    complianceNotes: ["3 HIGH vulnerabilities — 1 patched since last scan"],
    values: {
      _demo: true,
      vulnerability_count_critical: 0,
      vulnerability_count_high: 3,
      vulnerability_count_medium: 8,
      patch_compliance_percent: 96.1,
      mfa_adoption_percent: 76,
      last_penetration_test: "2026-02-15",
      encryption_at_rest: true,
      encryption_in_transit: true,
    },
    regulationMapping: {
      patch_compliance_percent: "nis2_art21_patch_management",
      mfa_adoption_percent: "nis2_art21_access_control",
    },
    trustScore: 0.71,
  },
  {
    dataPoint: "cyber_posture",
    satelliteNorad: "41859",
    sourceSystem: "soc_dashboard",
    collectionMethod: "automated_scan",
    hoursAgo: 4,
    complianceNotes: ["All critical/high patched", "MFA at 100%"],
    values: {
      _demo: true,
      vulnerability_count_critical: 0,
      vulnerability_count_high: 0,
      vulnerability_count_medium: 3,
      patch_compliance_percent: 99.8,
      mfa_adoption_percent: 100,
      last_penetration_test: "2026-03-01",
      encryption_at_rest: true,
      encryption_in_transit: true,
    },
    regulationMapping: {
      patch_compliance_percent: "nis2_art21_patch_management",
      mfa_adoption_percent: "nis2_art21_access_control",
    },
    trustScore: 0.91,
  },
  {
    dataPoint: "cyber_posture",
    satelliteNorad: "52040",
    sourceSystem: "soc_dashboard",
    collectionMethod: "automated_scan",
    hoursAgo: 6,
    complianceNotes: ["1 CRITICAL vulnerability — vendor patch pending"],
    values: {
      _demo: true,
      vulnerability_count_critical: 1,
      vulnerability_count_high: 4,
      vulnerability_count_medium: 11,
      patch_compliance_percent: 91.2,
      mfa_adoption_percent: 82,
      last_penetration_test: "2026-01-20",
      encryption_at_rest: true,
      encryption_in_transit: true,
    },
    regulationMapping: {
      vulnerability_count_critical: "nis2_art21_vulnerability_handling",
      patch_compliance_percent: "nis2_art21_patch_management",
    },
    trustScore: 0.58,
  },
  {
    dataPoint: "cyber_posture",
    satelliteNorad: "52040",
    sourceSystem: "soc_dashboard",
    collectionMethod: "automated_scan",
    hoursAgo: 30,
    complianceNotes: ["1 CRITICAL + 5 HIGH — elevated risk"],
    values: {
      _demo: true,
      vulnerability_count_critical: 1,
      vulnerability_count_high: 5,
      vulnerability_count_medium: 12,
      patch_compliance_percent: 89.5,
      mfa_adoption_percent: 80,
      last_penetration_test: "2026-01-20",
      encryption_at_rest: true,
      encryption_in_transit: true,
    },
    regulationMapping: {
      vulnerability_count_critical: "nis2_art21_vulnerability_handling",
      patch_compliance_percent: "nis2_art21_patch_management",
    },
    trustScore: 0.52,
  },
  // ── ground_station_metrics (5 packets) ──
  {
    dataPoint: "ground_station_metrics",
    satelliteNorad: "40697",
    sourceSystem: "ground_network_monitor",
    collectionMethod: "network_telemetry",
    hoursAgo: 1,
    complianceNotes: [
      "Kiruna station primary — nominal",
      "99.7% uptime last 30d",
    ],
    values: {
      _demo: true,
      station_id: "KIRUNA-1",
      uptime_percent_30d: 99.7,
      link_margin_db: 8.2,
      pass_success_rate: 0.98,
      antenna_health: "NOMINAL",
      data_throughput_mbps: 520,
      last_contact: "2026-03-22T10:30:00Z",
    },
    regulationMapping: {
      uptime_percent_30d: "eu_art64_ground_segment_availability",
    },
    trustScore: 0.93,
  },
  {
    dataPoint: "ground_station_metrics",
    satelliteNorad: "40697",
    sourceSystem: "ground_network_monitor",
    collectionMethod: "network_telemetry",
    hoursAgo: 25,
    complianceNotes: ["Svalbard station backup — nominal"],
    values: {
      _demo: true,
      station_id: "SVALBARD-2",
      uptime_percent_30d: 99.2,
      link_margin_db: 6.8,
      pass_success_rate: 0.96,
      antenna_health: "NOMINAL",
      data_throughput_mbps: 480,
      last_contact: "2026-03-21T10:00:00Z",
    },
    regulationMapping: {
      uptime_percent_30d: "eu_art64_ground_segment_availability",
    },
    trustScore: 0.9,
  },
  {
    dataPoint: "ground_station_metrics",
    satelliteNorad: "41859",
    sourceSystem: "ground_network_monitor",
    collectionMethod: "network_telemetry",
    hoursAgo: 3,
    complianceNotes: ["Fucino uplink — nominal"],
    values: {
      _demo: true,
      station_id: "FUCINO-GCS",
      uptime_percent_30d: 99.9,
      link_margin_db: 12.1,
      pass_success_rate: 0.99,
      antenna_health: "NOMINAL",
      data_throughput_mbps: 310,
      last_contact: "2026-03-22T08:15:00Z",
    },
    regulationMapping: {
      uptime_percent_30d: "eu_art64_ground_segment_availability",
    },
    trustScore: 0.97,
  },
  {
    dataPoint: "ground_station_metrics",
    satelliteNorad: "52040",
    sourceSystem: "ground_network_monitor",
    collectionMethod: "network_telemetry",
    hoursAgo: 5,
    complianceNotes: ["Rambouillet teleport — degraded antenna B"],
    values: {
      _demo: true,
      station_id: "RAMBOUILLET-TP",
      uptime_percent_30d: 97.8,
      link_margin_db: 4.2,
      pass_success_rate: 0.94,
      antenna_health: "DEGRADED",
      data_throughput_mbps: 890,
      last_contact: "2026-03-22T06:45:00Z",
    },
    regulationMapping: {
      uptime_percent_30d: "eu_art64_ground_segment_availability",
    },
    trustScore: 0.81,
  },
  {
    dataPoint: "ground_station_metrics",
    satelliteNorad: "52040",
    sourceSystem: "ground_network_monitor",
    collectionMethod: "network_telemetry",
    hoursAgo: 29,
    complianceNotes: ["Rambouillet teleport — antenna B maintenance complete"],
    values: {
      _demo: true,
      station_id: "RAMBOUILLET-TP",
      uptime_percent_30d: 98.1,
      link_margin_db: 7.9,
      pass_success_rate: 0.97,
      antenna_health: "NOMINAL",
      data_throughput_mbps: 920,
      last_contact: "2026-03-21T06:00:00Z",
    },
    regulationMapping: {
      uptime_percent_30d: "eu_art64_ground_segment_availability",
    },
    trustScore: 0.89,
  },
];

// ═══════════════════════════════════════════════════════════
// DEADLINES
// ═══════════════════════════════════════════════════════════

export const DEMO_DEADLINES = [
  {
    title: "[DEMO] CNES RT Annual Filing",
    category: "REGULATORY" as const,
    priority: "HIGH" as const,
    daysFromNow: 14,
    description:
      "Annual regulatory filing with CNES for Sentinel-2A operations in French jurisdiction. Includes orbital data, debris mitigation status, and insurance confirmation.",
  },
  {
    title: "[DEMO] BNetzA Debris Compliance Report",
    category: "REGULATORY" as const,
    priority: "MEDIUM" as const,
    daysFromNow: 45,
    description:
      "Submit debris mitigation compliance report to Bundesnetzagentur per German Space Act requirements.",
  },
  {
    title: "[DEMO] Insurance Policy Renewal \u2014 Sentinel-2A",
    category: "INSURANCE" as const,
    priority: "HIGH" as const,
    daysFromNow: 60,
    description:
      "Third-party liability insurance renewal for Sentinel-2A. Current policy expires in 60 days. Broker has been engaged.",
  },
  {
    title: "[DEMO] NIS2 Cybersecurity Audit",
    category: "CERTIFICATION" as const,
    priority: "MEDIUM" as const,
    daysFromNow: 90,
    description:
      "External cybersecurity audit per NIS2 Directive Art. 21. Scope includes ground segment, mission control, and data processing infrastructure.",
  },
  {
    title: "[DEMO] EU Space Act Full Readiness Assessment",
    category: "REGULATORY" as const,
    priority: "LOW" as const,
    daysFromNow: 180,
    description:
      "Complete readiness assessment for EU Space Act compliance across entire fleet. Covers authorization, debris, insurance, and cybersecurity modules.",
  },
] as const;

// ═══════════════════════════════════════════════════════════
// NCA SUBMISSIONS (data only — seed is skipped)
// ═══════════════════════════════════════════════════════════

export const DEMO_NCA_SUBMISSIONS = [
  {
    ncaId: "de",
    ncaName: "BNetzA",
    submissionType: "authorization",
    status: "UNDER_REVIEW",
    title: "[DEMO] Authorization Application — BNetzA — Sentinel-2A",
  },
  {
    ncaId: "fr",
    ncaName: "CNES",
    submissionType: "annual_report",
    status: "DRAFT",
    title: "[DEMO] Annual Operations Report — CNES — EuroSat Fleet",
  },
] as const;
