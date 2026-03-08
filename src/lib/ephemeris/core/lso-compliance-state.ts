import "server-only";
import type { PrismaClient } from "@prisma/client";
import { safeLog } from "@/lib/verity/utils/redaction";
import type {
  SatelliteComplianceStateInternal,
  ModuleScoresInternal,
  ComplianceFactorInternal,
  DataSourcesStatus,
  ComplianceHorizon,
  SatelliteAlert as SatelliteAlertType,
  OperatorEntityInput,
  AssessmentDataBundle,
  VerityAttestationSummary,
  RegulatoryChangeImpact,
  ModuleScoreInternal,
} from "./types";
import {
  calculateOverallScore,
  calculateModuleScore,
  determineDataFreshness,
  buildUnknownModule,
} from "./scoring";
import { LSO_DEADLINES } from "@/data/lso-requirements";

// Data adapters (reused from SCO/LO pipeline)
import { getVerityAttestations, getVerityStatus } from "../data/verity-adapter";
import {
  getAssessmentData,
  getAssessmentStatus,
} from "../data/assessment-adapter";
import { getRegulatoryChanges } from "../data/eurlex-adapter";
import { getSentinelStatus } from "../data/sentinel-adapter";

/**
 * LSO (Launch Site Operator) Compliance State Calculator
 *
 * LSO is the most infrastructure-focused operator type. Compliance is centered
 * on physical site safety, environmental permits, and ground equipment health.
 *
 * Data hierarchy (trust tiers):
 *   Sentinel (telemetry) > Verity (attestations) > Assessment (self-reported)
 */

export async function calculateLSOComplianceState(
  entity: OperatorEntityInput,
  prisma: PrismaClient,
): Promise<SatelliteComplianceStateInternal> {
  const orgId = entity.organizationId;
  const facilityId = entity.identifiers.facilityId ?? entity.id;

  safeLog("Calculating LSO compliance state", { orgId, facilityId });

  // ─── Step 1: Load data in parallel ──────────────────────────────────
  const [assessmentData, attestations, regulatoryChanges, verityStatus] =
    await Promise.all([
      getAssessmentData(prisma, orgId),
      getVerityAttestations(prisma, orgId, facilityId),
      getRegulatoryChanges(prisma),
      getVerityStatus(prisma, orgId, facilityId),
    ]);

  const [assessmentStatus, sentinelStatus] = await Promise.all([
    getAssessmentStatus(prisma, orgId, assessmentData),
    getSentinelStatus(prisma, orgId, facilityId),
  ]);

  // ─── Step 2: Build module scores ────────────────────────────────────
  const modules = buildLSOModuleScores(
    entity,
    assessmentData,
    attestations,
    regulatoryChanges,
  );

  // ─── Step 3: Aggregate scores ───────────────────────────────────────
  const overallScore = calculateOverallScore(modules, "LSO");
  const dataFreshness = determineDataFreshness(modules);

  // ─── Step 4: Build compliance horizon ───────────────────────────────
  const complianceHorizon = calculateLSOComplianceHorizon(modules);

  // ─── Step 5: Build data sources status ──────────────────────────────
  const dataSources: DataSourcesStatus = {
    sentinel: sentinelStatus,
    verity: verityStatus,
    assessment: assessmentStatus,
    celestrak: { lastTle: null, tleAge: null }, // Not applicable to LSO
  };

  // ─── Step 6: Load active alerts ─────────────────────────────────────
  const activeAlerts = await loadLSOAlerts(prisma, orgId, facilityId);

  return {
    noradId: facilityId, // Reuse field for facility identifier
    satelliteName: entity.name,
    operatorId: orgId,
    overallScore,
    modules,
    dataSources,
    complianceHorizon,
    activeAlerts,
    calculatedAt: new Date().toISOString(),
    dataFreshness,
  };
}

// ─── Module Score Building ──────────────────────────────────────────────────

function buildLSOModuleScores(
  entity: OperatorEntityInput,
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
  regulatoryChanges: RegulatoryChangeImpact[],
): ModuleScoresInternal {
  return {
    site_authorization: buildSiteAuthorizationModule(
      assessmentData,
      attestations,
    ),
    range_safety_systems: buildRangeSafetySystemsModule(entity),
    environmental_compliance: buildEnvironmentalComplianceModule(
      assessmentData,
      regulatoryChanges,
    ),
    ground_infrastructure: buildGroundInfrastructureModule(entity),
    cyber: buildLSOCyberModule(assessmentData, attestations),
    insurance: buildLSOInsuranceModule(assessmentData),
    emergency_response: buildEmergencyResponseModule(assessmentData),
    documentation: buildLSODocumentationModule(assessmentData, attestations),
  } as unknown as ModuleScoresInternal;
}

// ─── Individual Module Builders ─────────────────────────────────────────────

function buildSiteAuthorizationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Check for Verity attestation of site license
  const licenseAttestations = attestations.filter(
    (a) =>
      a.regulationRef === "eu_space_act_art_5" ||
      a.regulationRef === "eu_space_act_art_6",
  );
  if (licenseAttestations.length > 0) {
    const latest = licenseAttestations[0]!;
    const daysToExpiry = Math.floor(
      (new Date(latest.expiresAt).getTime() - Date.now()) / 86400000,
    );
    factors.push({
      id: "lso_site_license_status",
      name: "Site License Status",
      regulationRef: "eu_space_act_art_5",
      thresholdValue: 180,
      thresholdType: "ABOVE",
      unit: "days",
      status:
        daysToExpiry > 180
          ? "COMPLIANT"
          : daysToExpiry > 90
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "verity",
      confidence: latest.trustScore,
      lastMeasured: latest.issuedAt,
      currentValue: daysToExpiry,
      daysToThreshold: daysToExpiry > 0 ? daysToExpiry : 0,
    });
  }

  // Fall back to assessment
  if (factors.length === 0) {
    factors.push({
      id: "lso_site_license_assessment",
      name: "Site License Status (Self-Reported)",
      regulationRef: "eu_space_act_art_5",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: "UNKNOWN",
      source: "assessment",
      confidence: 0.5,
      lastMeasured: null,
      currentValue: null,
      daysToThreshold: null,
    });
  }

  return calculateModuleScore(factors, factors[0]?.source ?? "none");
}

function buildRangeSafetySystemsModule(
  entity: OperatorEntityInput,
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const meta = entity.metadata as Record<string, unknown>;

  // Factor: FTS System Health
  const ftsStatus = typeof meta.ftsStatus === "string" ? meta.ftsStatus : null;

  if (ftsStatus) {
    factors.push({
      id: "lso_fts_system_health",
      name: "FTS System Health",
      regulationRef: "eu_space_act_art_62",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status:
        ftsStatus === "operational"
          ? "COMPLIANT"
          : ftsStatus === "degraded"
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.9,
      lastMeasured: new Date().toISOString(),
      currentValue: ftsStatus === "operational" ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Factor: Radar System Health
  const radarStatus =
    typeof meta.radarStatus === "string" ? meta.radarStatus : null;

  if (radarStatus) {
    factors.push({
      id: "lso_radar_system_health",
      name: "Radar System Health",
      regulationRef: "eu_space_act_art_62",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status:
        radarStatus === "operational"
          ? "COMPLIANT"
          : radarStatus === "degraded"
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.85,
      lastMeasured: new Date().toISOString(),
      currentValue: radarStatus === "operational" ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Factor: Telemetry System Health
  const telemetryStatus =
    typeof meta.telemetryStatus === "string" ? meta.telemetryStatus : null;

  if (telemetryStatus) {
    factors.push({
      id: "lso_telemetry_system_health",
      name: "Telemetry System Health",
      regulationRef: "eu_space_act_art_62",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status:
        telemetryStatus === "operational"
          ? "COMPLIANT"
          : telemetryStatus === "degraded"
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.85,
      lastMeasured: new Date().toISOString(),
      currentValue: telemetryStatus === "operational" ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Fall back to assessment if no Sentinel data
  if (factors.length === 0) {
    factors.push({
      id: "lso_range_safety_assessment",
      name: "Range Safety Systems (Self-Reported)",
      regulationRef: "eu_space_act_art_62",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: "UNKNOWN",
      source: "assessment",
      confidence: 0.4,
      lastMeasured: null,
      currentValue: null,
      daysToThreshold: null,
    });
  }

  return calculateModuleScore(factors, factors[0]!.source);
}

function buildEnvironmentalComplianceModule(
  assessmentData: AssessmentDataBundle,
  regulatoryChanges: RegulatoryChangeImpact[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Factor: Environmental Permit Status
  if (assessmentData.environmental) {
    factors.push({
      id: "lso_environmental_permit",
      name: "Environmental Permit Status",
      regulationRef: "eu_space_act_art_66",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: assessmentData.environmental.impactAssessed
        ? "COMPLIANT"
        : "WARNING",
      source: "assessment",
      confidence: 0.7,
      lastMeasured: assessmentData.environmental.lastUpdated,
      currentValue: assessmentData.environmental.impactAssessed ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Factor: Regulatory changes affecting environmental compliance
  const envChanges = regulatoryChanges.filter(
    (c) =>
      c.event.title.toLowerCase().includes("environment") ||
      c.event.title.toLowerCase().includes("emission") ||
      c.event.title.toLowerCase().includes("noise"),
  );
  if (envChanges.length > 0) {
    const severityToStatus = {
      CRITICAL: "NON_COMPLIANT" as const,
      HIGH: "WARNING" as const,
      MEDIUM: "COMPLIANT" as const,
      LOW: "COMPLIANT" as const,
    };
    for (const change of envChanges) {
      factors.push({
        id: `lso_env_change_${change.event.id}`,
        name: `Regulatory Change: ${change.event.title}`,
        regulationRef: "eu_space_act_art_66",
        thresholdValue: 0,
        thresholdType: "ABOVE",
        unit: "",
        status: severityToStatus[change.event.severity],
        source: "derived",
        confidence: 0.7,
        lastMeasured: change.event.publishedAt,
        currentValue: null,
        daysToThreshold: null,
      });
    }
  }

  if (factors.length === 0)
    return buildUnknownModule("environmental_compliance" as never);
  return calculateModuleScore(factors, factors[0]!.source);
}

function buildGroundInfrastructureModule(
  entity: OperatorEntityInput,
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const meta = entity.metadata as Record<string, unknown>;

  // Factor: Power System Health
  const powerSystemStatus =
    typeof meta.powerSystemStatus === "string" ? meta.powerSystemStatus : null;
  if (powerSystemStatus) {
    factors.push({
      id: "lso_power_system_health",
      name: "Power System Health",
      regulationRef: "eu_space_act_art_64",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status:
        powerSystemStatus === "operational"
          ? "COMPLIANT"
          : powerSystemStatus === "degraded"
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.85,
      lastMeasured: new Date().toISOString(),
      currentValue: powerSystemStatus === "operational" ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Factor: Communications Health
  const communicationsStatus =
    typeof meta.communicationsStatus === "string"
      ? meta.communicationsStatus
      : null;
  if (communicationsStatus) {
    factors.push({
      id: "lso_communications_health",
      name: "Communications Health",
      regulationRef: "eu_space_act_art_64",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status:
        communicationsStatus === "operational"
          ? "COMPLIANT"
          : communicationsStatus === "degraded"
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.85,
      lastMeasured: new Date().toISOString(),
      currentValue: communicationsStatus === "operational" ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Factor: Weather Station Health
  const weatherStationStatus =
    typeof meta.weatherStationStatus === "string"
      ? meta.weatherStationStatus
      : null;
  if (weatherStationStatus) {
    factors.push({
      id: "lso_weather_station_health",
      name: "Weather Station Health",
      regulationRef: "eu_space_act_art_64",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status:
        weatherStationStatus === "operational"
          ? "COMPLIANT"
          : weatherStationStatus === "degraded"
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.8,
      lastMeasured: new Date().toISOString(),
      currentValue: weatherStationStatus === "operational" ? 1 : 0,
      daysToThreshold: null,
    });
  }

  if (factors.length === 0)
    return buildUnknownModule("ground_infrastructure" as never);
  return calculateModuleScore(factors, factors[0]!.source);
}

function buildLSOCyberModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Verity NIS2 attestations
  const cyberAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("nis2_"),
  );
  if (cyberAttestations.length > 0) {
    for (const att of cyberAttestations) {
      factors.push({
        id: `lso_verity_${att.dataPoint}`,
        name: `Verity: ${att.dataPoint}`,
        regulationRef: att.regulationRef,
        thresholdValue: 0,
        thresholdType: "ABOVE",
        unit: "",
        status: att.result ? "COMPLIANT" : "NON_COMPLIANT",
        source: "verity",
        confidence: att.trustScore,
        lastMeasured: att.issuedAt,
        currentValue: att.result ? 1 : 0,
        daysToThreshold: null,
      });
    }
  }

  // Fall back to assessment
  if (factors.length === 0 && assessmentData.cyber) {
    factors.push({
      id: "lso_cyber_assessment",
      name: "Cybersecurity Assessment (Site Systems)",
      regulationRef: "nis2_art_21",
      thresholdValue: 60,
      thresholdType: "ABOVE",
      unit: "%",
      status: "UNKNOWN",
      source: "assessment",
      confidence: 0.5,
      lastMeasured: assessmentData.cyber.lastUpdated,
      currentValue: null,
      daysToThreshold: null,
    });
  }

  if (factors.length === 0) return buildUnknownModule("cyber" as never);
  return calculateModuleScore(factors, factors[0]!.source);
}

function buildLSOInsuranceModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  if (!assessmentData.insurance)
    return buildUnknownModule("insurance" as never);

  const ins = assessmentData.insurance;
  const factors: ComplianceFactorInternal[] = [];

  factors.push({
    id: "lso_site_insurance_status",
    name: "Site Insurance Status",
    regulationRef: "eu_space_act_art_8",
    thresholdValue: 1,
    thresholdType: "ABOVE",
    unit: "",
    status: ins.hasActivePolicy ? "COMPLIANT" : "NON_COMPLIANT",
    source: "assessment",
    confidence: 0.85,
    lastMeasured: ins.lastUpdated,
    currentValue: ins.hasActivePolicy ? 1 : 0,
    daysToThreshold: ins.expiresAt
      ? Math.max(
          0,
          Math.floor(
            (new Date(ins.expiresAt).getTime() - Date.now()) / 86400000,
          ),
        )
      : null,
  });

  return calculateModuleScore(factors, "assessment");
}

function buildEmergencyResponseModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  // Emergency response is purely deadline + assessment driven
  // Without campaign data, return UNKNOWN
  const factors: ComplianceFactorInternal[] = [];

  // Check if emergency response plan exists (via environmental assessment proxy)
  if (assessmentData.environmental) {
    factors.push({
      id: "lso_emergency_response_plan",
      name: "Emergency Response Plan",
      regulationRef: "national_civil_protection",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: "UNKNOWN", // Requires specific assessment data
      source: "assessment",
      confidence: 0.4,
      lastMeasured: assessmentData.environmental.lastUpdated,
      currentValue: null,
      daysToThreshold: null,
    });
  }

  if (factors.length === 0)
    return buildUnknownModule("emergency_response" as never);
  return calculateModuleScore(factors, "assessment");
}

function buildLSODocumentationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Verity certificates for site documentation
  const docAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("eu_space_act_"),
  );
  if (docAttestations.length > 0) {
    factors.push({
      id: "lso_doc_verity_certs",
      name: "Verity Compliance Certificates (LSO)",
      regulationRef: "eu_space_act_art_62",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: "COMPLIANT",
      source: "verity",
      confidence: 0.9,
      lastMeasured: docAttestations[0]!.issuedAt,
      currentValue: docAttestations.length,
      daysToThreshold: null,
    });
  }

  if (factors.length === 0) return buildUnknownModule("documentation" as never);
  return calculateModuleScore(factors, "assessment");
}

// ─── Compliance Horizon ─────────────────────────────────────────────────────

function calculateLSOComplianceHorizon(
  modules: ModuleScoresInternal,
): ComplianceHorizon {
  let minDays: number | null = null;
  let breachRegulation: string | null = null;
  let breachType: string | null = null;

  for (const mod of Object.values(modules)) {
    for (const factor of mod.factors) {
      if (
        factor.daysToThreshold !== null &&
        factor.daysToThreshold > 0 &&
        factor.status !== "COMPLIANT"
      ) {
        if (minDays === null || factor.daysToThreshold < minDays) {
          minDays = factor.daysToThreshold;
          breachRegulation = factor.regulationRef;
          breachType = factor.name;
        }
      }
    }
  }

  const dataSourceCount = Object.values(modules).filter(
    (m) => m.dataSource !== "none",
  ).length;
  const confidence =
    dataSourceCount >= 5
      ? ("HIGH" as const)
      : dataSourceCount >= 3
        ? ("MEDIUM" as const)
        : ("LOW" as const);

  return {
    daysUntilFirstBreach: minDays,
    firstBreachRegulation: breachRegulation,
    firstBreachType: breachType,
    confidence,
  };
}

// ─── Alert Loading ──────────────────────────────────────────────────────────

async function loadLSOAlerts(
  prisma: PrismaClient,
  orgId: string,
  facilityId: string,
): Promise<SatelliteAlertType[]> {
  try {
    const db = prisma as unknown as Record<string, unknown>;
    if (!db.satelliteAlert) return [];

    const alertModel = db.satelliteAlert as {
      findMany: (args: Record<string, unknown>) => Promise<
        Array<{
          id: string;
          noradId: string;
          type: string;
          severity: string;
          title: string;
          description: string;
          regulationRef: string | null;
          triggeredAt: Date;
          resolvedAt: Date | null;
          acknowledged: boolean;
        }>
      >;
    };

    const alerts = await alertModel.findMany({
      where: {
        operatorId: orgId,
        noradId: facilityId,
        resolvedAt: null,
      },
      orderBy: { triggeredAt: "desc" },
      take: 50,
    });

    return alerts.map((a) => ({
      id: a.id,
      noradId: a.noradId,
      type: a.type as SatelliteAlertType["type"],
      severity: a.severity as SatelliteAlertType["severity"],
      title: a.title,
      description: a.description,
      regulationRef: a.regulationRef,
      triggeredAt: a.triggeredAt.toISOString(),
      resolvedAt: null,
      acknowledged: a.acknowledged,
    }));
  } catch {
    return [];
  }
}
