/**
 * Shield — NCA Regulatory Threshold Engine
 *
 * Jurisdiction-specific collision avoidance rules. Each NCA has different
 * thresholds for when operators must report, maneuver, and what documentation
 * format is required. This is Shield's core compliance differentiator —
 * no tracking provider (LeoLabs, Space-Track) knows these rules.
 */
import "server-only";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface NCAThresholdProfile {
  /** ISO country code */
  jurisdiction: string;
  /** NCA name */
  authority: string;
  /** NCA short name */
  authorityShort: string;

  // ─── Reporting Thresholds ───
  /** Pc threshold above which NCA must be notified */
  reportingPcThreshold: number;
  /** Miss distance (meters) below which NCA must be notified */
  reportingMissDistanceThreshold: number;
  /** Hours before TCA by which report must be submitted */
  reportingDeadlineHours: number;
  /** Whether to report automatically or await operator decision first */
  reportAfterDecision: boolean;

  // ─── Maneuver Thresholds ───
  /** Pc threshold above which maneuver is "expected" by NCA (not just recommended) */
  maneuverExpectedPcThreshold: number;
  /** If true, NCA expects justification for ACCEPT_RISK when above maneuver threshold */
  riskAcceptanceJustificationRequired: boolean;

  // ─── Documentation Requirements ───
  /** Legal basis / article reference */
  legalBasis: string;
  /** Format template name for NCA-specific report */
  reportFormat: string;
  /** What data fields the NCA specifically requires */
  requiredFields: string[];
  /** Additional NCA-specific notes */
  notes: string;

  // ─── Post-Event Requirements ───
  /** Hours after TCA to submit post-event report */
  postEventReportDeadlineHours: number | null;
  /** Whether NCA requires post-maneuver orbital data submission */
  postManeuverOrbitalDataRequired: boolean;
  /** Retention period for CA records in years */
  recordRetentionYears: number;
}

export interface ComplianceDeadline {
  jurisdiction: string;
  authority: string;
  deadlineType:
    | "pre_tca_notification"
    | "post_event_report"
    | "risk_justification";
  deadlineAt: Date;
  hoursRemaining: number;
  isOverdue: boolean;
  legalBasis: string;
  description: string;
}

export interface ThresholdViolation {
  jurisdiction: string;
  authority: string;
  violationType:
    | "reporting_required"
    | "maneuver_expected"
    | "justification_required";
  threshold: number;
  actual: number;
  metric: "pc" | "miss_distance";
  legalBasis: string;
  description: string;
  urgency: "immediate" | "urgent" | "standard";
}

// ─── NCA Profiles ───────────────────────────────────────────────────────────

const NCA_PROFILES: NCAThresholdProfile[] = [
  {
    jurisdiction: "FR",
    authority: "Centre National d'Études Spatiales",
    authorityShort: "CNES",
    reportingPcThreshold: 1e-5,
    reportingMissDistanceThreshold: 1000,
    reportingDeadlineHours: 72,
    reportAfterDecision: false,
    maneuverExpectedPcThreshold: 1e-4,
    riskAcceptanceJustificationRequired: true,
    legalBasis:
      "Loi relative aux Opérations Spatiales (FSOA), RT Art. 13, Art. 44-48",
    reportFormat: "cnes_notice_technique",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "relative_speed",
      "sat1_norad_id",
      "sat2_norad_id",
      "threat_object_type",
      "cdm_source",
      "cdm_count",
      "pc_trend",
      "decision",
      "decision_rationale",
      "maneuver_delta_v",
      "post_maneuver_orbit",
    ],
    notes:
      "CNES provides its own conjunction assessment service. Operators must cross-reference CNES data with Space-Track/LeoLabs. Passivation compliance (RT 39-41) may be affected by maneuver fuel usage.",
    postEventReportDeadlineHours: 168,
    postManeuverOrbitalDataRequired: true,
    recordRetentionYears: 10,
  },
  {
    jurisdiction: "GB",
    authority: "Civil Aviation Authority — Space Team",
    authorityShort: "CAA",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 48,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: true,
    legalBasis: "UK Space Industry Act 2018 s.12, CAP 2209, CAP 2214",
    reportFormat: "caa_ca_notification",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
      "decision_rationale",
      "cdm_source",
      "monitor_my_satellite_ref",
    ],
    notes:
      "CAA operates Monitor my Satellite (MmS) programme. Operators are expected to subscribe to MmS and use it as primary conjunction data source alongside Space-Track.",
    postEventReportDeadlineHours: 720,
    postManeuverOrbitalDataRequired: true,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "DE",
    authority:
      "Bundesanstalt für den Digitalfunk der Sicherheitsbehörden / DLR",
    authorityShort: "BNetzA/DLR",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 48,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-4,
    riskAcceptanceJustificationRequired: true,
    legalBasis: "Satellitendatensicherheitsgesetz (SatDSiG), WRG Eckpunkte §7",
    reportFormat: "dlr_ca_bericht",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "relative_speed",
      "decision",
      "decision_rationale",
      "risk_assessment",
    ],
    notes:
      "Germany relies on ESA SST services for conjunction data. Operators must demonstrate they subscribe to conjunction warning services. BSI-TR-03184 applies to ground segment security of CA systems.",
    postEventReportDeadlineHours: 336,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "IT",
    authority: "Agenzia Spaziale Italiana",
    authorityShort: "ASI",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 72,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: false,
    legalBasis: "Legge 89/2025 Art. 14-15",
    reportFormat: "asi_notifica_ca",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
    ],
    notes:
      "Italy's space law is relatively new (2025). ASI requires basic CA reporting but detailed format is still evolving. Follow ESA SST recommendations.",
    postEventReportDeadlineHours: null,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "BE",
    authority: "Belgian Federal Science Policy Office",
    authorityShort: "BELSPO",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 72,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: false,
    legalBasis:
      "Loi relative aux activités de lancement, 2005, Royal Decree 2022",
    reportFormat: "belspo_ca_report",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
    ],
    notes:
      "BELSPO follows ESA SST service recommendations. CA reporting obligation is part of general licence conditions under the Royal Decree 2022.",
    postEventReportDeadlineHours: null,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "NL",
    authority: "Netherlands Space Office",
    authorityShort: "NSO",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 72,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: false,
    legalBasis: "Wet ruimtevaartactiviteiten (Space Activities Act), Art. 3-4",
    reportFormat: "nso_ca_report",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
    ],
    notes:
      "NSO requires demonstration of conjunction assessment capability as licence condition. Reporting follows ESA SST standards.",
    postEventReportDeadlineHours: null,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "LU",
    authority: "Luxembourg Space Agency",
    authorityShort: "LSA",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 72,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: false,
    legalBasis: "Loi du 15 décembre 2020, Space Resources Act 2017",
    reportFormat: "lsa_ca_report",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
    ],
    notes:
      "LSA follows general ESA SST recommendations. Reporting is part of licence conditions.",
    postEventReportDeadlineHours: null,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "AT",
    authority: "Austrian Space Applications Programme",
    authorityShort: "BMK/FFG",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 72,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: false,
    legalBasis: "Weltraumgesetz (Austrian Outer Space Act) §4-5",
    reportFormat: "bmk_ca_meldung",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
    ],
    notes:
      "Austria's space act requires debris mitigation and collision avoidance as licence conditions. Uses ESA SST services.",
    postEventReportDeadlineHours: null,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "DK",
    authority: "Danish Ministry of Higher Education and Science",
    authorityShort: "DTU Space",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 72,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: false,
    legalBasis: "Danish Space Act, §3",
    reportFormat: "dtu_ca_report",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
    ],
    notes:
      "Denmark follows Nordic space cooperation standards and ESA SST recommendations.",
    postEventReportDeadlineHours: null,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
  {
    jurisdiction: "NO",
    authority: "Norwegian Space Agency",
    authorityShort: "NOSA",
    reportingPcThreshold: 1e-4,
    reportingMissDistanceThreshold: 500,
    reportingDeadlineHours: 72,
    reportAfterDecision: true,
    maneuverExpectedPcThreshold: 1e-3,
    riskAcceptanceJustificationRequired: false,
    legalBasis: "Norwegian Space Activities Act §4",
    reportFormat: "nosa_ca_report",
    requiredFields: [
      "conjunction_id",
      "tca",
      "collision_probability",
      "miss_distance",
      "decision",
    ],
    notes:
      "Norway follows Nordic space cooperation standards and ESA SST recommendations.",
    postEventReportDeadlineHours: null,
    postManeuverOrbitalDataRequired: false,
    recordRetentionYears: 5,
  },
];

// ─── Lookup Functions ───────────────────────────────────────────────────────

/** Get threshold profile for a jurisdiction */
export function getNCAProfile(
  jurisdiction: string,
): NCAThresholdProfile | null {
  return (
    NCA_PROFILES.find((p) => p.jurisdiction === jurisdiction.toUpperCase()) ??
    null
  );
}

/** Get all NCA profiles */
export function getAllNCAProfiles(): NCAThresholdProfile[] {
  return [...NCA_PROFILES];
}

/** Get profiles for multiple jurisdictions */
export function getNCAProfiles(jurisdictions: string[]): NCAThresholdProfile[] {
  const codes = new Set(jurisdictions.map((j) => j.toUpperCase()));
  return NCA_PROFILES.filter((p) => codes.has(p.jurisdiction));
}

// ─── Threshold Evaluation ───────────────────────────────────────────────────

/** Check which NCAs require notification for a given event */
export function evaluateThresholds(params: {
  pc: number;
  missDistance: number;
  jurisdictions: string[];
}): ThresholdViolation[] {
  const { pc, missDistance, jurisdictions } = params;
  const violations: ThresholdViolation[] = [];

  for (const profile of getNCAProfiles(jurisdictions)) {
    // Check Pc reporting threshold
    if (pc >= profile.reportingPcThreshold) {
      violations.push({
        jurisdiction: profile.jurisdiction,
        authority: profile.authorityShort,
        violationType: "reporting_required",
        threshold: profile.reportingPcThreshold,
        actual: pc,
        metric: "pc",
        legalBasis: profile.legalBasis,
        description: `Collision probability ${pc.toExponential(2)} exceeds ${profile.authorityShort} reporting threshold of ${profile.reportingPcThreshold.toExponential(1)}`,
        urgency:
          pc >= profile.maneuverExpectedPcThreshold ? "immediate" : "urgent",
      });
    }

    // Check miss distance reporting threshold
    if (missDistance <= profile.reportingMissDistanceThreshold) {
      violations.push({
        jurisdiction: profile.jurisdiction,
        authority: profile.authorityShort,
        violationType: "reporting_required",
        threshold: profile.reportingMissDistanceThreshold,
        actual: missDistance,
        metric: "miss_distance",
        legalBasis: profile.legalBasis,
        description: `Miss distance ${missDistance.toFixed(0)}m below ${profile.authorityShort} threshold of ${profile.reportingMissDistanceThreshold}m`,
        urgency: missDistance <= 100 ? "immediate" : "urgent",
      });
    }

    // Check maneuver expected threshold
    if (pc >= profile.maneuverExpectedPcThreshold) {
      violations.push({
        jurisdiction: profile.jurisdiction,
        authority: profile.authorityShort,
        violationType: "maneuver_expected",
        threshold: profile.maneuverExpectedPcThreshold,
        actual: pc,
        metric: "pc",
        legalBasis: profile.legalBasis,
        description: `Pc ${pc.toExponential(2)} exceeds ${profile.authorityShort} maneuver expectation threshold of ${profile.maneuverExpectedPcThreshold.toExponential(1)}. ${
          profile.riskAcceptanceJustificationRequired
            ? "ACCEPT_RISK decision requires written justification."
            : ""
        }`,
        urgency: "immediate",
      });
    }

    // Check justification requirement
    if (
      profile.riskAcceptanceJustificationRequired &&
      pc >= profile.maneuverExpectedPcThreshold
    ) {
      violations.push({
        jurisdiction: profile.jurisdiction,
        authority: profile.authorityShort,
        violationType: "justification_required",
        threshold: profile.maneuverExpectedPcThreshold,
        actual: pc,
        metric: "pc",
        legalBasis: profile.legalBasis,
        description: `${profile.authorityShort} requires written justification if declining to maneuver at Pc ≥ ${profile.maneuverExpectedPcThreshold.toExponential(1)}`,
        urgency: "urgent",
      });
    }
  }

  return violations;
}

/** Compute compliance deadlines for an event */
export function computeDeadlines(params: {
  tca: Date;
  jurisdictions: string[];
  eventCreatedAt?: Date;
}): ComplianceDeadline[] {
  const { tca, jurisdictions, eventCreatedAt } = params;
  const now = new Date();
  const deadlines: ComplianceDeadline[] = [];

  for (const profile of getNCAProfiles(jurisdictions)) {
    // Pre-TCA notification deadline
    const preTcaDeadline = new Date(
      tca.getTime() - profile.reportingDeadlineHours * 60 * 60 * 1000,
    );
    const preTcaHoursRemaining =
      (preTcaDeadline.getTime() - now.getTime()) / (60 * 60 * 1000);

    deadlines.push({
      jurisdiction: profile.jurisdiction,
      authority: profile.authorityShort,
      deadlineType: "pre_tca_notification",
      deadlineAt: preTcaDeadline,
      hoursRemaining: Math.max(0, preTcaHoursRemaining),
      isOverdue: preTcaHoursRemaining < 0,
      legalBasis: profile.legalBasis,
      description: `Notify ${profile.authorityShort} at least ${profile.reportingDeadlineHours}h before TCA`,
    });

    // Post-event report deadline
    if (profile.postEventReportDeadlineHours) {
      const postEventDeadline = new Date(
        tca.getTime() + profile.postEventReportDeadlineHours * 60 * 60 * 1000,
      );
      const postEventHoursRemaining =
        (postEventDeadline.getTime() - now.getTime()) / (60 * 60 * 1000);

      deadlines.push({
        jurisdiction: profile.jurisdiction,
        authority: profile.authorityShort,
        deadlineType: "post_event_report",
        deadlineAt: postEventDeadline,
        hoursRemaining: Math.max(0, postEventHoursRemaining),
        isOverdue: postEventHoursRemaining < 0,
        legalBasis: profile.legalBasis,
        description: `Submit post-event report to ${profile.authorityShort} within ${profile.postEventReportDeadlineHours}h after TCA`,
      });
    }
  }

  // Sort by deadline (most urgent first)
  deadlines.sort((a, b) => a.deadlineAt.getTime() - b.deadlineAt.getTime());

  return deadlines;
}

/** Get the strictest thresholds across multiple jurisdictions */
export function getStrictestThresholds(jurisdictions: string[]): {
  reportingPcThreshold: number;
  reportingMissDistanceThreshold: number;
  reportingDeadlineHours: number;
  maneuverExpectedPcThreshold: number;
  strictestJurisdiction: string;
} {
  const profiles = getNCAProfiles(jurisdictions);
  if (profiles.length === 0) {
    return {
      reportingPcThreshold: 1e-4,
      reportingMissDistanceThreshold: 500,
      reportingDeadlineHours: 48,
      maneuverExpectedPcThreshold: 1e-3,
      strictestJurisdiction: "DEFAULT",
    };
  }

  // Strictest = lowest Pc threshold (triggers earliest), highest miss distance (triggers earliest),
  // longest deadline hours (requires earliest action)
  let strictest = profiles[0];
  for (const p of profiles) {
    if (p.reportingPcThreshold < strictest.reportingPcThreshold) {
      strictest = p;
    }
  }

  return {
    reportingPcThreshold: Math.min(
      ...profiles.map((p) => p.reportingPcThreshold),
    ),
    reportingMissDistanceThreshold: Math.max(
      ...profiles.map((p) => p.reportingMissDistanceThreshold),
    ),
    reportingDeadlineHours: Math.max(
      ...profiles.map((p) => p.reportingDeadlineHours),
    ),
    maneuverExpectedPcThreshold: Math.min(
      ...profiles.map((p) => p.maneuverExpectedPcThreshold),
    ),
    strictestJurisdiction: strictest.jurisdiction,
  };
}
