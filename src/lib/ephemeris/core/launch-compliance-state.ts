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
import { LAUNCH_DEADLINES } from "@/data/launch-operator-requirements";

// Data adapters (reused from SCO pipeline)
import { getVerityAttestations, getVerityStatus } from "../data/verity-adapter";
import {
  getAssessmentData,
  getAssessmentStatus,
} from "../data/assessment-adapter";
import { getRegulatoryChanges } from "../data/eurlex-adapter";
import { getSentinelStatus } from "../data/sentinel-adapter";

/**
 * Launch Operator Compliance State Calculator
 *
 * Unlike SCO (physics-driven: orbital decay, fuel depletion), LO compliance
 * is primarily deadline-driven: license validity, insurance expiry,
 * certification status, and regulatory change impact.
 *
 * Data hierarchy (trust tiers):
 *   Sentinel (telemetry) > Verity (attestations) > Assessment (self-reported)
 */

export async function calculateLaunchComplianceState(
  entity: OperatorEntityInput,
  prisma: PrismaClient,
): Promise<SatelliteComplianceStateInternal> {
  const orgId = entity.organizationId;
  const vehicleId = entity.identifiers.vehicleId ?? entity.id;

  safeLog("Calculating launch operator compliance state", {
    orgId,
    vehicleId,
  });

  // ─── Step 1: Load data in parallel ──────────────────────────────────
  const [assessmentData, attestations, regulatoryChanges, verityStatus] =
    await Promise.all([
      getAssessmentData(prisma, orgId),
      getVerityAttestations(prisma, orgId, vehicleId),
      getRegulatoryChanges(prisma),
      getVerityStatus(prisma, orgId, vehicleId),
    ]);

  const [assessmentStatus, sentinelStatus] = await Promise.all([
    getAssessmentStatus(prisma, orgId, assessmentData),
    getSentinelStatus(prisma, orgId, vehicleId),
  ]);

  // ─── Step 2: Build module scores ────────────────────────────────────
  const modules = buildLaunchModuleScores(
    entity,
    assessmentData,
    attestations,
    regulatoryChanges,
  );

  // ─── Step 3: Aggregate scores ───────────────────────────────────────
  const overallScore = calculateOverallScore(modules, "LO");
  const dataFreshness = determineDataFreshness(modules);

  // ─── Step 4: Build compliance horizon ───────────────────────────────
  const complianceHorizon = calculateLaunchComplianceHorizon(modules);

  // ─── Step 5: Build data sources status ──────────────────────────────
  const dataSources: DataSourcesStatus = {
    sentinel: sentinelStatus,
    verity: verityStatus,
    assessment: assessmentStatus,
    celestrak: { lastTle: null, tleAge: null }, // Not applicable to LO
  };

  // ─── Step 6: Load active alerts ─────────────────────────────────────
  const activeAlerts = await loadLaunchAlerts(prisma, orgId, vehicleId);

  return {
    noradId: vehicleId, // Reuse field for vehicle identifier
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

function buildLaunchModuleScores(
  entity: OperatorEntityInput,
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
  regulatoryChanges: RegulatoryChangeImpact[],
): ModuleScoresInternal {
  return {
    launch_authorization: buildLaunchAuthorizationModule(
      assessmentData,
      attestations,
    ),
    range_safety: buildRangeSafetyModule(assessmentData),
    third_party_liability: buildThirdPartyLiabilityModule(assessmentData),
    environmental_impact: buildEnvironmentalImpactModule(assessmentData),
    payload_integration: buildPayloadIntegrationModule(assessmentData),
    cyber: buildLaunchCyberModule(assessmentData, attestations),
    documentation: buildLaunchDocumentationModule(assessmentData, attestations),
    frequency_coordination: buildFrequencyCoordinationModule(assessmentData),
    export_control: buildExportControlModule(regulatoryChanges),
  } as unknown as ModuleScoresInternal;
}

// ─── Individual Module Builders ─────────────────────────────────────────────

function buildLaunchAuthorizationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Check for Verity attestation of launch license
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
      id: "lo_launch_license_status",
      name: "Launch License Status",
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

  // Fall back to assessment data if no attestation
  if (factors.length === 0) {
    factors.push({
      id: "lo_launch_license_assessment",
      name: "Launch License Status (Self-Reported)",
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

function buildRangeSafetyModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // FTS Certification — deadline-based
  const ftsDeadline = LAUNCH_DEADLINES.find(
    (d) => d.key === "fts_certification",
  );
  if (ftsDeadline) {
    factors.push({
      id: "lo_fts_certification",
      name: ftsDeadline.label,
      regulationRef: ftsDeadline.regulationRef,
      thresholdValue: ftsDeadline.leadTimeDays,
      thresholdType: "ABOVE",
      unit: "days",
      status: "UNKNOWN", // Unknown until we have campaign data
      source: "assessment",
      confidence: 0.4,
      lastMeasured: null,
      currentValue: null,
      daysToThreshold: null,
    });
  }

  // Range Safety Review
  factors.push({
    id: "lo_range_safety_review",
    name: "Range Safety Review Status",
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

  // Flight Safety Analysis
  factors.push({
    id: "lo_flight_safety_analysis",
    name: "Flight Safety Analysis",
    regulationRef: "eu_space_act_art_62",
    thresholdValue: 365,
    thresholdType: "BELOW",
    unit: "days since update",
    status: "UNKNOWN",
    source: "assessment",
    confidence: 0.4,
    lastMeasured: null,
    currentValue: null,
    daysToThreshold: null,
  });

  return calculateModuleScore(factors, "assessment");
}

function buildThirdPartyLiabilityModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  if (!assessmentData.insurance)
    return buildUnknownModule("third_party_liability" as never);

  const ins = assessmentData.insurance;
  const factors: ComplianceFactorInternal[] = [];

  // Active TPL policy
  factors.push({
    id: "lo_tpl_insurance_status",
    name: "TPL Insurance Status (Launch)",
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

  // Coverage adequacy
  if (ins.coverageEur !== null) {
    // Minimum insurance for launch operations is typically higher
    const launchMinimumEur = 45_000_000;
    factors.push({
      id: "lo_insurance_coverage_adequacy",
      name: "Insurance Coverage Adequacy",
      regulationRef: "eu_space_act_art_8",
      thresholdValue: launchMinimumEur,
      thresholdType: "ABOVE",
      unit: "EUR",
      status:
        ins.coverageEur >= launchMinimumEur
          ? "COMPLIANT"
          : ins.coverageEur >= launchMinimumEur * 0.8
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

function buildEnvironmentalImpactModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  if (!assessmentData.environmental)
    return buildUnknownModule("environmental_impact" as never);

  const env = assessmentData.environmental;
  const factors: ComplianceFactorInternal[] = [];

  factors.push({
    id: "lo_eia_status",
    name: "Environmental Impact Assessment",
    regulationRef: "eu_space_act_art_66",
    thresholdValue: 1,
    thresholdType: "ABOVE",
    unit: "",
    status: env.impactAssessed ? "COMPLIANT" : "WARNING",
    source: "assessment",
    confidence: 0.7,
    lastMeasured: env.lastUpdated,
    currentValue: env.impactAssessed ? 1 : 0,
    daysToThreshold: null,
  });

  return calculateModuleScore(factors, "assessment");
}

function buildPayloadIntegrationModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  // Payload integration is campaign-specific; without campaign data,
  // fall back to UNKNOWN with assessment-based baseline
  return buildUnknownModule("payload_integration" as never);
}

function buildLaunchCyberModule(
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
        id: `lo_verity_${att.dataPoint}`,
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
      id: "lo_cyber_assessment",
      name: "Cybersecurity Assessment (Launch Systems)",
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

function buildLaunchDocumentationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Verity certificates for launch documentation
  const docAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("eu_space_act_"),
  );
  if (docAttestations.length > 0) {
    factors.push({
      id: "lo_doc_verity_certs",
      name: "Verity Compliance Certificates (Launch)",
      regulationRef: "eu_space_act_art_5",
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

function buildFrequencyCoordinationModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  // Telemetry frequency license is deadline-based
  return buildUnknownModule("frequency_coordination" as never);
}

function buildExportControlModule(
  regulatoryChanges: RegulatoryChangeImpact[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];

  // Check for regulatory changes affecting export control
  const exportChanges = regulatoryChanges.filter(
    (c) =>
      c.event.title.toLowerCase().includes("export") ||
      c.event.title.toLowerCase().includes("itar") ||
      c.event.title.toLowerCase().includes("dual-use"),
  );

  if (exportChanges.length > 0) {
    for (const change of exportChanges) {
      const severityToStatus = {
        CRITICAL: "NON_COMPLIANT" as const,
        HIGH: "WARNING" as const,
        MEDIUM: "COMPLIANT" as const,
        LOW: "COMPLIANT" as const,
      };
      factors.push({
        id: `lo_export_change_${change.event.id}`,
        name: `Regulatory Change: ${change.event.title}`,
        regulationRef: "eu_dual_use",
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
    return calculateModuleScore(factors, "derived");
  }

  return buildUnknownModule("export_control" as never);
}

// ─── Compliance Horizon ─────────────────────────────────────────────────────

function calculateLaunchComplianceHorizon(
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

async function loadLaunchAlerts(
  prisma: PrismaClient,
  orgId: string,
  vehicleId: string,
): Promise<SatelliteAlertType[]> {
  try {
    const alerts = await prisma.satelliteAlert.findMany({
      where: {
        operatorId: orgId,
        noradId: vehicleId,
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
