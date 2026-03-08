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
import { PDP_DEADLINES } from "@/data/pdp-requirements";

// Data adapters (reused from SCO/LO pipeline)
import { getVerityAttestations, getVerityStatus } from "../data/verity-adapter";
import {
  getAssessmentData,
  getAssessmentStatus,
} from "../data/assessment-adapter";
import { getRegulatoryChanges } from "../data/eurlex-adapter";
import { getSentinelStatus } from "../data/sentinel-adapter";

/**
 * PDP (Payload Data Provider) Compliance State Calculator
 *
 * PDP operators handle satellite payload data — acquisition, processing,
 * archiving, and distribution. Compliance centers on data authorization,
 * security, quality standards, and distribution controls.
 *
 * Data hierarchy (trust tiers):
 *   Sentinel (telemetry) > Verity (attestations) > Assessment (self-reported)
 */

export async function calculatePDPComplianceState(
  entity: OperatorEntityInput,
  prisma: PrismaClient,
): Promise<SatelliteComplianceStateInternal> {
  const orgId = entity.organizationId;
  const systemId = entity.identifiers.systemId ?? entity.id;

  safeLog("Calculating PDP compliance state", { orgId, systemId });

  // ─── Step 1: Load data in parallel ──────────────────────────────────
  const [assessmentData, attestations, regulatoryChanges, verityStatus] =
    await Promise.all([
      getAssessmentData(prisma, orgId),
      getVerityAttestations(prisma, orgId, systemId),
      getRegulatoryChanges(prisma),
      getVerityStatus(prisma, orgId, systemId),
    ]);

  const [assessmentStatus, sentinelStatus] = await Promise.all([
    getAssessmentStatus(prisma, orgId, assessmentData),
    getSentinelStatus(prisma, orgId, systemId),
  ]);

  // ─── Step 2: Build module scores ────────────────────────────────────
  const modules = buildPDPModuleScores(
    entity,
    assessmentData,
    attestations,
    regulatoryChanges,
  );

  // ─── Step 3: Aggregate scores ───────────────────────────────────────
  const overallScore = calculateOverallScore(modules, "PDP");
  const dataFreshness = determineDataFreshness(modules);

  // ─── Step 4: Build compliance horizon ───────────────────────────────
  const complianceHorizon = calculatePDPComplianceHorizon(modules);

  // ─── Step 5: Build data sources status ──────────────────────────────
  const dataSources: DataSourcesStatus = {
    sentinel: sentinelStatus,
    verity: verityStatus,
    assessment: assessmentStatus,
    celestrak: { lastTle: null, tleAge: null },
  };

  return {
    noradId: systemId,
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

function buildPDPModuleScores(
  entity: OperatorEntityInput,
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
  regulatoryChanges: RegulatoryChangeImpact[],
): ModuleScoresInternal {
  return {
    data_authorization: buildDataAuthorizationModule(attestations),
    data_security: buildDataSecurityModule(assessmentData, attestations),
    data_quality: buildDataQualityModule(assessmentData),
    cyber: buildCyberModule(assessmentData, attestations),
    distribution_compliance: buildDistributionComplianceModule(assessmentData),
    insurance: buildInsuranceModule(assessmentData),
    spectrum_rights: buildSpectrumRightsModule(assessmentData),
    documentation: buildDocumentationModule(assessmentData, attestations),
  } as unknown as ModuleScoresInternal;
}

function buildDataAuthorizationModule(
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const authAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("eu_space_act_art_5"),
  );
  if (authAttestations.length > 0) {
    factors.push({
      id: "pdp_data_auth",
      name: "Data Authorization Valid",
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
    return buildUnknownModule("data_authorization" as never);
  return calculateModuleScore(factors, "verity");
}

function buildDataSecurityModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  const securityAttestations = attestations.filter((a) =>
    a.regulationRef.startsWith("nis2_"),
  );
  if (securityAttestations.length > 0) {
    for (const att of securityAttestations) {
      factors.push({
        id: `verity_sec_${att.dataPoint}`,
        name: `Data Security: ${att.dataPoint}`,
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
  if (factors.length === 0) return buildUnknownModule("data_security" as never);
  return calculateModuleScore(factors, "verity");
}

function buildDataQualityModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  return buildUnknownModule("data_quality" as never);
}

function buildCyberModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoreInternal {
  const factors: ComplianceFactorInternal[] = [];
  if (assessmentData.cyber) {
    factors.push({
      id: "pdp_cyber_assessment",
      name: "Cybersecurity Assessment",
      regulationRef: "nis2_art_21",
      thresholdValue: 60,
      thresholdType: "ABOVE",
      unit: "%",
      status:
        assessmentData.cyber.patchCompliancePct !== null &&
        assessmentData.cyber.patchCompliancePct >= 60
          ? "COMPLIANT"
          : "UNKNOWN",
      source: "assessment",
      confidence: 0.5,
      lastMeasured: assessmentData.cyber.lastUpdated,
      currentValue: assessmentData.cyber.patchCompliancePct,
      daysToThreshold: null,
    });
  }
  if (factors.length === 0) return buildUnknownModule("cyber");
  return calculateModuleScore(factors, "assessment");
}

function buildDistributionComplianceModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  return buildUnknownModule("distribution_compliance" as never);
}

function buildInsuranceModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  if (!assessmentData.insurance) return buildUnknownModule("insurance");
  const ins = assessmentData.insurance;
  const factors: ComplianceFactorInternal[] = [
    {
      id: "pdp_insurance_active",
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

function buildSpectrumRightsModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoreInternal {
  return buildUnknownModule("spectrum_rights" as never);
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
      id: "pdp_doc_certs",
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

function calculatePDPComplianceHorizon(
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
