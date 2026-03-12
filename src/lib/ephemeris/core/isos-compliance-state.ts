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
import { ISOS_DEADLINES, PROXIMITY_THRESHOLDS } from "@/data/isos-requirements";

// Data adapters (reused from SCO/LO pipeline)
import { getVerityAttestations, getVerityStatus } from "../data/verity-adapter";
import {
  getAssessmentData,
  getAssessmentStatus,
} from "../data/assessment-adapter";
import { getRegulatoryChanges } from "../data/eurlex-adapter";
import { getSentinelStatus } from "../data/sentinel-adapter";

/**
 * ISOS (In-Space Operations & Servicing) Compliance State Calculator
 *
 * ISOS is the most technically complex operator type — it combines orbital
 * mechanics (like SCO) with unique proximity operations requirements under
 * EU Space Act Art. 63.
 *
 * Data hierarchy (trust tiers):
 *   Sentinel (telemetry) > Verity (attestations) > Assessment (self-reported)
 */

export async function calculateISOSComplianceState(
  entity: OperatorEntityInput,
  prisma: PrismaClient,
): Promise<SatelliteComplianceStateInternal> {
  const orgId = entity.organizationId;
  const missionId = entity.identifiers.missionId ?? entity.id;

  safeLog("Calculating ISOS compliance state", { orgId, missionId });

  // ─── Step 1: Load data in parallel ──────────────────────────────────
  const [assessmentData, attestations, regulatoryChanges, verityStatus] =
    await Promise.all([
      getAssessmentData(prisma, orgId),
      getVerityAttestations(prisma, orgId, missionId),
      getRegulatoryChanges(prisma),
      getVerityStatus(prisma, orgId, missionId),
    ]);

  const [assessmentStatus, sentinelStatus] = await Promise.all([
    getAssessmentStatus(prisma, orgId, assessmentData),
    getSentinelStatus(prisma, orgId, missionId),
  ]);

  // ─── Step 2: Build module scores ────────────────────────────────────
  const modules = buildISOSModuleScores(
    entity,
    assessmentData,
    attestations,
    regulatoryChanges,
  );

  // ─── Step 3: Aggregate scores ───────────────────────────────────────
  const overallScore = calculateOverallScore(modules, "ISOS");
  const dataFreshness = determineDataFreshness(modules);

  // ─── Step 4: Build compliance horizon ───────────────────────────────
  const complianceHorizon = calculateISOSComplianceHorizon(modules);

  // ─── Step 5: Build data sources status ──────────────────────────────
  const dataSources: DataSourcesStatus = {
    sentinel: sentinelStatus,
    verity: verityStatus,
    assessment: assessmentStatus,
    celestrak: { lastTle: null, tleAge: null }, // Used if servicer has NORAD ID
  };

  // ─── Step 6: Load active alerts ─────────────────────────────────────
  const activeAlerts = await loadISOSAlerts(prisma, orgId, missionId);

  return {
    noradId: missionId, // Reuse field for mission identifier
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

function buildISOSModuleScores(
  entity: OperatorEntityInput,
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
  regulatoryChanges: RegulatoryChangeImpact[],
): ModuleScoresInternal {
  return {
    mission_authorization: buildMissionAuthorizationModule(
      assessmentData,
      attestations,
    ),
    proximity_operations: buildProximityOperationsModule(entity),
    fuel: buildISOSFuelModule(entity),
    target_compliance: buildTargetComplianceModule(entity),
    cyber: buildISOSCyberModule(assessmentData, attestations),
    debris_risk: buildDebrisRiskModule(assessmentData),
    insurance: buildISOSInsuranceModule(assessmentData),
    documentation: buildISOSDocumentationModule(assessmentData, attestations),
  } as unknown as ModuleScoresInternal;
}

// ─── Individual Module Builders ─────────────────────────────────────────────

function buildMissionAuthorizationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Check for Verity attestation of ISOS mission license
  const licenseAttestations = attestations.filter(
    (a) =>
      a.regulationRef === "eu_space_act_art_63" ||
      a.regulationRef === "eu_space_act_art_5",
  );
  if (licenseAttestations.length > 0) {
    const latest = licenseAttestations[0]!;
    const daysToExpiry = Math.floor(
      (new Date(latest.expiresAt).getTime() - Date.now()) / 86400000,
    );
    factors.push({
      id: "isos_mission_license_status",
      name: "ISOS Mission License Status",
      regulationRef: "eu_space_act_art_63",
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

  // Fall back to assessment data
  if (factors.length === 0) {
    factors.push({
      id: "isos_mission_license_assessment",
      name: "ISOS Mission License (Self-Reported)",
      regulationRef: "eu_space_act_art_63",
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

function buildProximityOperationsModule(
  entity: OperatorEntityInput,
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const meta = entity.metadata as Record<string, unknown>;

  // Factor: Keep-Out Zone Compliance
  const keepOutZoneKm =
    typeof meta.keepOutZoneKm === "number"
      ? meta.keepOutZoneKm
      : PROXIMITY_THRESHOLDS.keepOutZoneDefault;
  const currentDistanceKm =
    typeof meta.currentDistanceKm === "number" ? meta.currentDistanceKm : null;

  if (currentDistanceKm !== null) {
    const keepOutStatus =
      currentDistanceKm > keepOutZoneKm
        ? "COMPLIANT"
        : currentDistanceKm > PROXIMITY_THRESHOLDS.criticalDistance
          ? "WARNING"
          : "NON_COMPLIANT";

    factors.push({
      id: "isos_keepout_zone_compliance",
      name: "Keep-Out Zone Compliance (Art. 63)",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: keepOutZoneKm,
      thresholdType: "ABOVE",
      unit: "km",
      status: keepOutStatus,
      source: "sentinel",
      confidence: 0.9,
      lastMeasured: new Date().toISOString(),
      currentValue: currentDistanceKm,
      daysToThreshold: null, // Computed from approach trajectory if available
    });
  } else {
    // Assessment fallback
    factors.push({
      id: "isos_keepout_zone_assessment",
      name: "Keep-Out Zone Compliance (Art. 63)",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: keepOutZoneKm,
      thresholdType: "ABOVE",
      unit: "km",
      status: "UNKNOWN",
      source: "assessment",
      confidence: 0.4,
      lastMeasured: null,
      currentValue: null,
      daysToThreshold: null,
    });
  }

  // Factor: Approach Velocity Compliance
  const approachVelocityMps =
    typeof meta.approachVelocityMps === "number"
      ? meta.approachVelocityMps
      : null;

  if (approachVelocityMps !== null) {
    const velocityStatus =
      approachVelocityMps <= PROXIMITY_THRESHOLDS.maxApproachVelocity
        ? "COMPLIANT"
        : approachVelocityMps <= PROXIMITY_THRESHOLDS.warningApproachVelocity
          ? "WARNING"
          : "NON_COMPLIANT";

    factors.push({
      id: "isos_approach_velocity",
      name: "Approach Velocity Compliance",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: PROXIMITY_THRESHOLDS.maxApproachVelocity,
      thresholdType: "BELOW",
      unit: "m/s",
      status: velocityStatus,
      source: "sentinel",
      confidence: 0.85,
      lastMeasured: new Date().toISOString(),
      currentValue: approachVelocityMps,
      daysToThreshold: null,
    });
  }

  // Factor: Abort Capability
  const fuelForAbortPct =
    typeof meta.fuelForAbortPct === "number" ? meta.fuelForAbortPct : null;
  const abortCapability =
    typeof meta.abortCapability === "boolean" ? meta.abortCapability : null;

  if (fuelForAbortPct !== null) {
    factors.push({
      id: "isos_abort_capability",
      name: "Abort Capability (Fuel Reserve)",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: PROXIMITY_THRESHOLDS.minAbortFuelPercent,
      thresholdType: "ABOVE",
      unit: "%",
      status:
        fuelForAbortPct >= PROXIMITY_THRESHOLDS.minAbortFuelPercent
          ? "COMPLIANT"
          : fuelForAbortPct >= PROXIMITY_THRESHOLDS.minAbortFuelPercent * 0.5
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.85,
      lastMeasured: new Date().toISOString(),
      currentValue: fuelForAbortPct,
      daysToThreshold: null,
    });
  } else if (abortCapability !== null) {
    factors.push({
      id: "isos_abort_capability_assessment",
      name: "Abort Capability",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: abortCapability ? "COMPLIANT" : "NON_COMPLIANT",
      source: "assessment",
      confidence: 0.6,
      lastMeasured: null,
      currentValue: abortCapability ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Factor: Target Operator Consent
  const hasTargetConsent =
    typeof meta.hasTargetConsent === "boolean" ? meta.hasTargetConsent : null;
  const approachMethod =
    typeof meta.approachMethod === "string" ? meta.approachMethod : null;

  if (hasTargetConsent !== null) {
    const isCooperative = approachMethod === "cooperative";
    factors.push({
      id: "isos_target_consent",
      name: "Target Operator Consent (Art. 63)",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: hasTargetConsent
        ? "COMPLIANT"
        : isCooperative
          ? "NON_COMPLIANT"
          : "WARNING",
      source: "assessment",
      confidence: 0.8,
      lastMeasured: null,
      currentValue: hasTargetConsent ? 1 : 0,
      daysToThreshold: null,
    });
  }

  if (factors.length === 0)
    return buildUnknownModule("proximity_operations" as never);
  return calculateModuleScore(factors, factors[0]!.source);
}

function buildISOSFuelModule(entity: OperatorEntityInput): ModuleScoreInternal {
  // ISOS servicers are spacecraft — fuel model is identical to SCO
  // but with higher reserve threshold (20% for abort vs 15% for passivation)
  const meta = entity.metadata as Record<string, unknown>;
  const fuelPct = typeof meta.fuelPct === "number" ? meta.fuelPct : null;

  if (fuelPct === null) return buildUnknownModule("fuel" as never);

  const factors: ComplianceFactorInternal[] = [
    {
      id: "isos_fuel_reserve",
      name: "Fuel Reserve (Abort Margin)",
      regulationRef: "eu_space_act_art_70",
      thresholdValue: PROXIMITY_THRESHOLDS.minAbortFuelPercent,
      thresholdType: "ABOVE",
      unit: "%",
      status:
        fuelPct >= PROXIMITY_THRESHOLDS.minAbortFuelPercent + 10
          ? "COMPLIANT"
          : fuelPct >= PROXIMITY_THRESHOLDS.minAbortFuelPercent
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: 0.85,
      lastMeasured: new Date().toISOString(),
      currentValue: fuelPct,
      daysToThreshold: null,
    },
  ];

  return calculateModuleScore(factors, "sentinel");
}

function buildTargetComplianceModule(
  entity: OperatorEntityInput,
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const meta = entity.metadata as Record<string, unknown>;

  // Factor: Target Identification
  const targetNoradId = entity.identifiers.targetNoradId;
  factors.push({
    id: "isos_target_identification",
    name: "Target Identification",
    regulationRef: "eu_space_act_art_63",
    thresholdValue: 1,
    thresholdType: "ABOVE",
    unit: "",
    status: targetNoradId ? "COMPLIANT" : "WARNING",
    source: "assessment",
    confidence: 0.7,
    lastMeasured: null,
    currentValue: targetNoradId ? 1 : 0,
    daysToThreshold: null,
  });

  // Factor: Target Orbital Status
  const targetOrbitalStatus =
    typeof meta.targetOrbitalStatus === "string"
      ? meta.targetOrbitalStatus
      : null;
  if (targetOrbitalStatus) {
    factors.push({
      id: "isos_target_orbital_status",
      name: "Target Orbital Status",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status:
        targetOrbitalStatus === "nominal"
          ? "COMPLIANT"
          : targetOrbitalStatus === "drifting"
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "assessment",
      confidence: 0.6,
      lastMeasured: null,
      currentValue: targetOrbitalStatus === "nominal" ? 1 : 0,
      daysToThreshold: null,
    });
  }

  // Factor: Target Cooperation Status
  const approachMethod =
    typeof meta.approachMethod === "string" ? meta.approachMethod : null;
  const targetCoopConfirmed =
    typeof meta.targetCoopConfirmed === "boolean"
      ? meta.targetCoopConfirmed
      : null;

  if (approachMethod === "cooperative" && targetCoopConfirmed !== null) {
    factors.push({
      id: "isos_target_cooperation",
      name: "Target Cooperation Status",
      regulationRef: "eu_space_act_art_63",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: targetCoopConfirmed ? "COMPLIANT" : "NON_COMPLIANT",
      source: "assessment",
      confidence: 0.7,
      lastMeasured: null,
      currentValue: targetCoopConfirmed ? 1 : 0,
      daysToThreshold: null,
    });
  }

  if (factors.length === 0)
    return buildUnknownModule("target_compliance" as never);
  return calculateModuleScore(factors, "assessment");
}

function buildISOSCyberModule(
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
        id: `isos_verity_${att.dataPoint}`,
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
      id: "isos_cyber_assessment",
      name: "Cybersecurity Assessment (ISOS C2)",
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

function buildDebrisRiskModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  if (!assessmentData.debris) return buildUnknownModule("debris_risk" as never);

  const factors: ComplianceFactorInternal[] = [];

  factors.push({
    id: "isos_deorbit_plan",
    name: "Post-Mission Deorbit Plan",
    regulationRef: "eu_space_act_art_68",
    thresholdValue: 1,
    thresholdType: "ABOVE",
    unit: "",
    status: assessmentData.debris.deorbitPlanExists
      ? "COMPLIANT"
      : "NON_COMPLIANT",
    source: "assessment",
    confidence: 0.7,
    lastMeasured: assessmentData.debris.lastUpdated,
    currentValue: assessmentData.debris.deorbitPlanExists ? 1 : 0,
    daysToThreshold: null,
  });

  factors.push({
    id: "isos_passivation_plan",
    name: "Passivation Plan (Post-Mission)",
    regulationRef: "iadc_5_3",
    thresholdValue: 1,
    thresholdType: "ABOVE",
    unit: "",
    status: assessmentData.debris.passivationPlanExists
      ? "COMPLIANT"
      : "WARNING",
    source: "assessment",
    confidence: 0.7,
    lastMeasured: assessmentData.debris.lastUpdated,
    currentValue: assessmentData.debris.passivationPlanExists ? 1 : 0,
    daysToThreshold: null,
  });

  return calculateModuleScore(factors, "assessment");
}

function buildISOSInsuranceModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  if (!assessmentData.insurance)
    return buildUnknownModule("insurance" as never);

  const ins = assessmentData.insurance;
  const factors: ComplianceFactorInternal[] = [];

  // Active TPL policy (higher minimum for ISOS — third-party satellite risk)
  factors.push({
    id: "isos_tpl_insurance_status",
    name: "TPL Insurance Status (ISOS Mission)",
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

  // Coverage adequacy (ISOS requires higher coverage)
  if (ins.coverageEur !== null) {
    const isosMinimumEur = 60_000_000; // Higher than SCO/LO due to target damage risk
    factors.push({
      id: "isos_insurance_coverage_adequacy",
      name: "Insurance Coverage Adequacy (ISOS)",
      regulationRef: "eu_space_act_art_8",
      thresholdValue: isosMinimumEur,
      thresholdType: "ABOVE",
      unit: "EUR",
      status:
        ins.coverageEur >= isosMinimumEur
          ? "COMPLIANT"
          : ins.coverageEur >= isosMinimumEur * 0.8
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "assessment",
      confidence: 0.8,
      lastMeasured: ins.lastUpdated,
      currentValue: ins.coverageEur,
      daysToThreshold: null,
    });
  }

  return calculateModuleScore(factors, "assessment");
}

function buildISOSDocumentationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Verity certificates for ISOS documentation
  const docAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("eu_space_act_"),
  );
  if (docAttestations.length > 0) {
    factors.push({
      id: "isos_doc_verity_certs",
      name: "Verity Compliance Certificates (ISOS)",
      regulationRef: "eu_space_act_art_63",
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

  // Deorbit plan documentation
  if (assessmentData.debris) {
    factors.push({
      id: "isos_doc_deorbit_plan",
      name: "Post-Mission Deorbit Plan Documentation",
      regulationRef: "eu_space_act_art_70",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: assessmentData.debris.deorbitPlanExists
        ? "COMPLIANT"
        : "NON_COMPLIANT",
      source: "assessment",
      confidence: 0.7,
      lastMeasured: assessmentData.debris.lastUpdated,
      currentValue: assessmentData.debris.deorbitPlanExists ? 1 : 0,
      daysToThreshold: null,
    });
  }

  if (factors.length === 0) return buildUnknownModule("documentation" as never);
  return calculateModuleScore(factors, factors[0]!.source);
}

// ─── Compliance Horizon ─────────────────────────────────────────────────────

function calculateISOSComplianceHorizon(
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

async function loadISOSAlerts(
  prisma: PrismaClient,
  orgId: string,
  missionId: string,
): Promise<SatelliteAlertType[]> {
  try {
    const alerts = await prisma.satelliteAlert.findMany({
      where: {
        operatorId: orgId,
        noradId: missionId,
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
