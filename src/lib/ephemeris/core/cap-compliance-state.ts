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
import { CAP_DEADLINES } from "@/data/cap-requirements";

// Data adapters (reused from SCO/LO pipeline)
import { getVerityAttestations, getVerityStatus } from "../data/verity-adapter";
import {
  getAssessmentData,
  getAssessmentStatus,
} from "../data/assessment-adapter";
import { getRegulatoryChanges } from "../data/eurlex-adapter";
import { getSentinelStatus } from "../data/sentinel-adapter";

/**
 * CAP (Capacity Provider) Compliance State Calculator
 *
 * CAP operators provide transponder capacity, bandwidth, or hosted payload
 * services. Compliance centers on service continuity, SLA adherence, spectrum
 * coordination, and cybersecurity.
 *
 * Data hierarchy (trust tiers):
 *   Sentinel (telemetry) > Verity (attestations) > Assessment (self-reported)
 */

export async function calculateCAPComplianceState(
  entity: OperatorEntityInput,
  prisma: PrismaClient,
): Promise<SatelliteComplianceStateInternal> {
  const orgId = entity.organizationId;
  const serviceId = entity.identifiers.serviceId ?? entity.id;

  safeLog("Calculating CAP compliance state", { orgId, serviceId });

  // ─── Step 1: Load data in parallel ──────────────────────────────────
  const [assessmentData, attestations, regulatoryChanges, verityStatus] =
    await Promise.all([
      getAssessmentData(prisma, orgId),
      getVerityAttestations(prisma, orgId, serviceId),
      getRegulatoryChanges(prisma),
      getVerityStatus(prisma, orgId, serviceId),
    ]);

  const [assessmentStatus, sentinelStatus] = await Promise.all([
    getAssessmentStatus(prisma, orgId, assessmentData),
    getSentinelStatus(prisma, orgId, serviceId),
  ]);

  // ─── Step 2: Build module scores ────────────────────────────────────
  const modules = buildCAPModuleScores(
    entity,
    assessmentData,
    attestations,
    regulatoryChanges,
  );

  // ─── Step 3: Aggregate scores ───────────────────────────────────────
  const overallScore = calculateOverallScore(modules, "CAP");
  const dataFreshness = determineDataFreshness(modules);

  // ─── Step 4: Build compliance horizon ───────────────────────────────
  const complianceHorizon = calculateCAPComplianceHorizon(modules);

  // ─── Step 5: Build data sources status ──────────────────────────────
  const dataSources: DataSourcesStatus = {
    sentinel: sentinelStatus,
    verity: verityStatus,
    assessment: assessmentStatus,
    celestrak: { lastTle: null, tleAge: null },
  };

  return {
    noradId: serviceId,
    satelliteName: entity.name,
    operatorId: orgId,
    overallScore,
    modules,
    dataSources,
    complianceHorizon,
    activeAlerts: [],
    calculatedAt: new Date().toISOString(),
    dataFreshness,
  };
}

// ─── Module Score Building ──────────────────────────────────────────────────

function buildCAPModuleScores(
  entity: OperatorEntityInput,
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
  regulatoryChanges: RegulatoryChangeImpact[],
): ModuleScoresInternal {
  return {
    service_authorization: buildServiceAuthorizationModule(attestations),
    service_continuity: buildServiceContinuityModule(assessmentData),
    capacity_management: buildCapacityManagementModule(assessmentData),
    cyber: buildCyberModule(assessmentData, attestations),
    sla_compliance: buildSlaComplianceModule(assessmentData),
    insurance: buildInsuranceModule(assessmentData),
    spectrum_coordination: buildSpectrumCoordinationModule(assessmentData),
    documentation: buildDocumentationModule(assessmentData, attestations),
  } as unknown as ModuleScoresInternal;
}

function buildServiceAuthorizationModule(
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const authAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("eu_space_act_art_5"),
  );
  if (authAttestations.length > 0) {
    factors.push({
      id: "cap_service_auth",
      name: "Service Authorization Valid",
      regulationRef: "eu_space_act_art_5",
      thresholdValue: 1,
      thresholdType: "ABOVE",
      unit: "",
      status: authAttestations[0]!.result ? "COMPLIANT" : "NON_COMPLIANT",
      source: "verity",
      confidence: authAttestations[0]!.trustScore,
      lastMeasured: authAttestations[0]!.issuedAt,
      currentValue: authAttestations[0]!.result ? 1 : 0,
      daysToThreshold: null,
    });
  }
  if (factors.length === 0)
    return buildUnknownModule("service_authorization" as never);
  return calculateModuleScore(factors, "verity");
}

function buildServiceContinuityModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  return buildUnknownModule("service_continuity" as never);
}

function buildCapacityManagementModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  return buildUnknownModule("capacity_management" as never);
}

function buildCyberModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const cyberAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("nis2_"),
  );
  if (cyberAttestations.length > 0) {
    for (const att of cyberAttestations) {
      factors.push({
        id: `verity_${att.dataPoint}`,
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
  if (factors.length === 0) return buildUnknownModule("cyber");
  return calculateModuleScore(factors, "verity");
}

function buildSlaComplianceModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  return buildUnknownModule("sla_compliance" as never);
}

function buildInsuranceModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  if (!assessmentData.insurance) return buildUnknownModule("insurance");
  const ins = assessmentData.insurance;
  const factors: ComplianceFactorInternal[] = [
    {
      id: "cap_insurance_active",
      name: "Active TPL Insurance Policy",
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
              (new Date(ins.expiresAt).getTime() - Date.now()) /
                (24 * 60 * 60 * 1000),
            ),
          )
        : null,
    },
  ];
  return calculateModuleScore(factors, "assessment");
}

function buildSpectrumCoordinationModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  return buildUnknownModule("spectrum_coordination" as never);
}

function buildDocumentationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const docAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("eu_space_act_"),
  );
  if (docAttestations.length > 0) {
    factors.push({
      id: "cap_doc_certs",
      name: "Compliance Certificates",
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
  if (factors.length === 0) return buildUnknownModule("documentation");
  return calculateModuleScore(factors, "verity");
}

// ─── Compliance Horizon ─────────────────────────────────────────────────────

function calculateCAPComplianceHorizon(
  modules: ModuleScoresInternal,
): ComplianceHorizon {
  let minDays: number | null = null;
  let breachRegulation: string | null = null;
  let breachType: string | null = null;

  for (const mod of Object.values(modules)) {
    for (const factor of (mod as ModuleScoreInternal).factors) {
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
    (m) => (m as ModuleScoreInternal).dataSource !== "none",
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
