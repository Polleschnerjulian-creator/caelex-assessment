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
  OrbitalElements,
  SentinelTimeSeries,
  AssessmentDataBundle,
  VerityAttestationSummary,
  RegulatoryChangeImpact,
  OperatorEntityInput,
} from "./types";
import { getNoradId } from "./entity-adapter";
import { calculateLaunchComplianceState } from "./launch-compliance-state";
import { calculateISOSComplianceState } from "./isos-compliance-state";
import { calculateLSOComplianceState } from "./lso-compliance-state";
import { calculateCAPComplianceState } from "./cap-compliance-state";
import { calculatePDPComplianceState } from "./pdp-compliance-state";
import { calculateTCOComplianceState } from "./tco-compliance-state";
import {
  calculateOverallScore,
  calculateModuleScore,
  determineDataFreshness,
  buildUnknownModule,
} from "./scoring";
import { COMPLIANCE_THRESHOLDS } from "@/lib/compliance/thresholds";

// Data adapters
import {
  getSentinelTimeSeries,
  getSentinelStatus,
} from "../data/sentinel-adapter";
import { getCurrentF107 } from "../data/solar-flux-adapter";
import {
  getOrbitalElements,
  getCelesTrakStatus,
} from "../data/celestrak-adapter";
import { getVerityAttestations, getVerityStatus } from "../data/verity-adapter";
import {
  getAssessmentData,
  getAssessmentStatus,
} from "../data/assessment-adapter";
import { getRegulatoryChanges } from "../data/eurlex-adapter";
import {
  getShieldComplianceFactors,
  getShieldDataSourceStatus,
} from "../data/shield-adapter";

// Prediction models
import {
  predictOrbitalDecay,
  getOrbitalDecayFactors,
} from "../models/orbital-decay";
import {
  predictFuelDepletion,
  getFuelDepletionFactors,
} from "../models/fuel-depletion";
import {
  predictSubsystemHealth,
  getSubsystemFactors,
} from "../models/subsystem-degradation";
import {
  calculateDeadlineEvents,
  getDeadlineFactors,
} from "../models/deadline-events";
import { getRegulatoryChangeFactors } from "../models/regulatory-change";

/**
 * Aggregation Engine — The Bridge
 *
 * Aggregates all 5 prediction models into a SatelliteComplianceStateInternal.
 *
 * Flow:
 * 1. Load all data via adapters
 * 2. Run all 5 prediction models
 * 3. Aggregate module scores with weights
 * 4. Apply safety gate
 * 5. Build SatelliteComplianceStateInternal (with currentValue)
 *
 * IMPORTANT: Convert via toPublicState() before any external use.
 */

interface AggregationInput {
  prisma: PrismaClient;
  orgId: string;
  noradId: string;
  satelliteName: string;
  launchDate: Date | null;
}

/**
 * Generic entry point — Calculate compliance state for any OperatorEntity.
 * For SCO, delegates to the existing satellite pipeline.
 * For other types: throws (Phase 2+).
 */
export async function calculateEntityComplianceState(
  entity: OperatorEntityInput,
  prisma: PrismaClient,
): Promise<SatelliteComplianceStateInternal> {
  if (entity.operatorType === "SCO") {
    const noradId = getNoradId(entity);
    if (!noradId) throw new Error("SCO entity missing noradId");

    const launchDate =
      entity.metadata.launchDate instanceof Date
        ? entity.metadata.launchDate
        : typeof entity.metadata.launchDate === "string"
          ? new Date(entity.metadata.launchDate)
          : null;

    return calculateSatelliteComplianceState({
      prisma,
      orgId: entity.organizationId,
      noradId,
      satelliteName: entity.name,
      launchDate,
    });
  }

  if (entity.operatorType === "LO") {
    return calculateLaunchComplianceState(entity, prisma);
  }

  if (entity.operatorType === "ISOS") {
    return calculateISOSComplianceState(entity, prisma);
  }

  if (entity.operatorType === "LSO") {
    return calculateLSOComplianceState(entity, prisma);
  }

  if (entity.operatorType === "CAP") {
    return calculateCAPComplianceState(entity, prisma);
  }

  if (entity.operatorType === "PDP") {
    return calculatePDPComplianceState(entity, prisma);
  }

  if (entity.operatorType === "TCO") {
    return calculateTCOComplianceState(entity, prisma);
  }

  // Exhaustive check — all 7 OperatorTypes handled above
  const _exhaustive: never = entity.operatorType as never;
  throw new Error(`Operator type ${_exhaustive} not supported in Ephemeris`);
}

/**
 * Calculate complete compliance state for a single satellite.
 * Returns the INTERNAL state (with currentValue). Use toPublicState() before API response.
 */
export async function calculateSatelliteComplianceState(
  input: AggregationInput,
): Promise<SatelliteComplianceStateInternal> {
  const { prisma, orgId, noradId, satelliteName, launchDate } = input;

  safeLog("Calculating satellite compliance state", { orgId, noradId });

  // ─── Step 1: Load all data in parallel ─────────────────────────────
  const [
    orbitalElements,
    f107,
    fuelSeries,
    thrusterSeries,
    batterySeries,
    solarSeries,
    cyberPatchSeries,
    cyberMfaSeries,
    assessmentData,
    attestations,
    regulatoryChanges,
    sentinelStatus,
    celestrakStatus,
    verityStatus,
  ] = await Promise.all([
    getOrbitalElements(noradId),
    getCurrentF107(),
    getSentinelTimeSeries(prisma, orgId, noradId, "remaining_fuel_pct"),
    getSentinelTimeSeries(prisma, orgId, noradId, "thruster_status"),
    getSentinelTimeSeries(prisma, orgId, noradId, "battery_state_of_charge"),
    getSentinelTimeSeries(prisma, orgId, noradId, "solar_array_power_pct"),
    getSentinelTimeSeries(prisma, orgId, noradId, "patch_compliance_pct"),
    getSentinelTimeSeries(prisma, orgId, noradId, "mfa_adoption_pct"),
    getAssessmentData(prisma, orgId),
    getVerityAttestations(prisma, orgId, noradId),
    getRegulatoryChanges(prisma),
    getSentinelStatus(prisma, orgId, noradId),
    getCelesTrakStatus(noradId),
    getVerityStatus(prisma, orgId, noradId),
  ]);

  // Compute assessment status from pre-loaded data (avoids redundant DB queries)
  const assessmentStatus = await getAssessmentStatus(
    prisma,
    orgId,
    assessmentData,
  );

  // ─── Shield adapter (collision avoidance) ───────────────────────────
  let shieldFactor: Awaited<
    ReturnType<typeof getShieldComplianceFactors>
  > | null = null;
  let shieldStatus: Awaited<
    ReturnType<typeof getShieldDataSourceStatus>
  > | null = null;
  try {
    [shieldFactor, shieldStatus] = await Promise.all([
      getShieldComplianceFactors(prisma, orgId, noradId),
      getShieldDataSourceStatus(prisma, orgId),
    ]);
  } catch {
    // Shield errors must not crash Ephemeris — degrade gracefully
    shieldFactor = null;
    shieldStatus = null;
  }

  // ─── Step 2: Run prediction models ─────────────────────────────────
  const missionAgeDays = launchDate
    ? Math.floor((Date.now() - launchDate.getTime()) / (24 * 60 * 60 * 1000))
    : 365; // Default 1 year if unknown

  const modules = buildModuleScores(
    orbitalElements,
    f107,
    fuelSeries,
    thrusterSeries,
    batterySeries,
    solarSeries,
    cyberPatchSeries,
    cyberMfaSeries,
    assessmentData,
    attestations,
    regulatoryChanges,
    missionAgeDays,
    shieldFactor,
  );

  // ─── Step 3: Aggregate scores ──────────────────────────────────────
  const overallScore = calculateOverallScore(modules);
  const dataFreshness = determineDataFreshness(modules);

  // ─── Step 4: Build compliance horizon ──────────────────────────────
  const complianceHorizon = calculateComplianceHorizon(modules);

  // ─── Step 5: Build data sources status ─────────────────────────────
  const dataSources: DataSourcesStatus = {
    sentinel: sentinelStatus,
    verity: verityStatus,
    assessment: assessmentStatus,
    celestrak: celestrakStatus,
    ...(shieldStatus ? { shield: shieldStatus } : {}),
  };

  // ─── Step 6: Load active alerts ────────────────────────────────────
  const activeAlerts = await loadActiveAlerts(prisma, orgId, noradId);

  return {
    noradId,
    satelliteName,
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

// ─── Module Score Building ───────────────────────────────────────────────────

function buildModuleScores(
  orbitalElements: OrbitalElements | null,
  f107: number,
  fuelSeries: SentinelTimeSeries,
  thrusterSeries: SentinelTimeSeries,
  batterySeries: SentinelTimeSeries,
  solarSeries: SentinelTimeSeries,
  cyberPatchSeries: SentinelTimeSeries,
  cyberMfaSeries: SentinelTimeSeries,
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
  regulatoryChanges: RegulatoryChangeImpact[],
  missionAgeDays: number,
  shieldFactor: Awaited<ReturnType<typeof getShieldComplianceFactors>> | null,
): ModuleScoresInternal {
  // Orbital module
  const orbital = orbitalElements
    ? (() => {
        const forecast = predictOrbitalDecay(orbitalElements, f107);
        const factors = getOrbitalDecayFactors(forecast);
        return calculateModuleScore(factors, "derived");
      })()
    : buildUnknownModule("orbital");

  // Fuel module
  const fuel =
    fuelSeries.points.length > 0
      ? (() => {
          const forecast = predictFuelDepletion(fuelSeries);
          const factors = getFuelDepletionFactors(forecast);
          return calculateModuleScore(factors, "sentinel");
        })()
      : buildUnknownModule("fuel");

  // Subsystems module
  const subsystems = (() => {
    const hasThruster = thrusterSeries.points.length > 0;
    const hasBattery = batterySeries.points.length > 0;
    const hasSolar = solarSeries.points.length > 0;

    if (!hasThruster && !hasBattery && !hasSolar) {
      // Use default degradation model based on mission age
      const forecast = predictSubsystemHealth(null, null, null, missionAgeDays);
      const factors = getSubsystemFactors(forecast);
      return calculateModuleScore(factors, "derived");
    }

    const forecast = predictSubsystemHealth(
      hasThruster ? thrusterSeries : null,
      hasBattery ? batterySeries : null,
      hasSolar ? solarSeries : null,
      missionAgeDays,
    );
    const factors = getSubsystemFactors(forecast);
    return calculateModuleScore(factors, "sentinel");
  })();

  // Cyber module (Sentinel + Assessment + Verity)
  const cyber = buildCyberModule(
    cyberPatchSeries,
    cyberMfaSeries,
    assessmentData,
    attestations,
  );

  // Ground module — derived from Sentinel ground station data
  // For now, basic derivation from overall Sentinel connectivity
  const ground = buildGroundModule(assessmentData);

  // Documentation module
  const documentation = buildDocumentationModule(assessmentData, attestations);

  // Insurance module
  const insurance = buildInsuranceModule(assessmentData);

  // Registration module — basic placeholder
  const registration = buildRegistrationModule();

  // Collision Avoidance module — from Shield adapter
  const collision_avoidance = buildCollisionAvoidanceModule(shieldFactor);

  return {
    orbital,
    fuel,
    subsystems,
    collision_avoidance,
    cyber,
    ground,
    documentation,
    insurance,
    registration,
  };
}

function buildCyberModule(
  patchSeries: SentinelTimeSeries,
  mfaSeries: SentinelTimeSeries,
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoresInternal["cyber"] {
  const factors: ComplianceFactorInternal[] = [];

  // Patch compliance from Sentinel
  if (patchSeries.points.length > 0) {
    const latest = patchSeries.points[patchSeries.points.length - 1]!;
    const t = COMPLIANCE_THRESHOLDS.nis2_art_21_2_e_patch;
    factors.push({
      id: "cyber_patch_compliance",
      name: "Patch Compliance (NIS2 Art. 21)",
      regulationRef: "nis2_art_21_2_e",
      thresholdValue: t.threshold,
      thresholdType: t.type,
      unit: t.unit,
      status:
        latest.value >= t.threshold + t.warningBuffer
          ? "COMPLIANT"
          : latest.value >= t.threshold
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: latest.trustScore,
      lastMeasured: latest.timestamp,
      currentValue: latest.value,
      daysToThreshold: null, // Would need trend analysis
    });
  }

  // MFA adoption from Sentinel
  if (mfaSeries.points.length > 0) {
    const latest = mfaSeries.points[mfaSeries.points.length - 1]!;
    const t = COMPLIANCE_THRESHOLDS.nis2_art_21_2_j;
    factors.push({
      id: "cyber_mfa_adoption",
      name: "MFA Adoption (NIS2 Art. 21)",
      regulationRef: "nis2_art_21_2_j",
      thresholdValue: t.threshold,
      thresholdType: t.type,
      unit: t.unit,
      status:
        latest.value >= t.threshold + t.warningBuffer
          ? "COMPLIANT"
          : latest.value >= t.threshold
            ? "WARNING"
            : "NON_COMPLIANT",
      source: "sentinel",
      confidence: latest.trustScore,
      lastMeasured: latest.timestamp,
      currentValue: latest.value,
      daysToThreshold: null,
    });
  }

  // Verity-backed attestations for cyber
  const cyberAttestations = attestations.filter(
    (a) =>
      a.regulationRef.startsWith("nis2_") && !isExpiringSoon(a.expiresAt, 30),
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

  if (factors.length === 0) {
    // Fall back to assessment maturity score
    if (assessmentData.cyber) {
      return calculateModuleScore(
        [
          {
            id: "cyber_assessment",
            name: "Cybersecurity Assessment",
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
          },
        ],
        "assessment",
      );
    }
    return buildUnknownModule("cyber");
  }

  return calculateModuleScore(factors, factors[0]!.source);
}

function buildGroundModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoresInternal["ground"] {
  // Ground station health is primarily derived from Sentinel ground station collector.
  // For now, we indicate UNKNOWN if no data.
  return buildUnknownModule("ground");
}

function buildDocumentationModule(
  assessmentData: AssessmentDataBundle,
  attestations: VerityAttestationSummary[],
): ModuleScoresInternal["documentation"] {
  const factors: ComplianceFactorInternal[] = [];

  // Check debris assessment (deorbit plan)
  if (assessmentData.debris) {
    factors.push({
      id: "doc_deorbit_plan",
      name: "Deorbit Plan Documentation",
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

  // Verity certificates as documentation proof
  const docAttestations = attestations.filter(
    (a) =>
      a.regulationRef.startsWith("eu_space_act_") &&
      !isExpiringSoon(a.expiresAt, 30),
  );
  if (docAttestations.length > 0) {
    factors.push({
      id: "doc_verity_certs",
      name: "Verity Compliance Certificates",
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
  return calculateModuleScore(factors, "assessment");
}

function buildInsuranceModule(
  assessmentData: AssessmentDataBundle,
): ModuleScoresInternal["insurance"] {
  if (!assessmentData.insurance) return buildUnknownModule("insurance");

  const ins = assessmentData.insurance;
  const factors: ComplianceFactorInternal[] = [];

  // Active policy check
  factors.push({
    id: "insurance_active_policy",
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
  });

  return calculateModuleScore(factors, "assessment");
}

function buildRegistrationModule(): ModuleScoresInternal["registration"] {
  // Registration status would come from SpaceObjectRegistration model.
  // For now, return UNKNOWN (Phase 2: query registration status).
  return buildUnknownModule("registration");
}

function buildCollisionAvoidanceModule(
  shieldFactor: Awaited<ReturnType<typeof getShieldComplianceFactors>> | null,
): ModuleScoresInternal["collision_avoidance"] {
  if (!shieldFactor || shieldFactor.status === "UNKNOWN") {
    return buildUnknownModule("collision_avoidance");
  }

  const factor: ComplianceFactorInternal = {
    id: shieldFactor.key,
    name: shieldFactor.label,
    regulationRef: "eu_space_act_art_63",
    thresholdValue: 70,
    thresholdType: "ABOVE",
    unit: "%",
    status: shieldFactor.status,
    source: "shield",
    confidence: shieldFactor.status === "COMPLIANT" ? 0.9 : 0.8,
    lastMeasured: shieldFactor.measuredAt.toISOString(),
    currentValue: shieldFactor.score,
    daysToThreshold: null,
  };

  return calculateModuleScore([factor], "shield");
}

// ─── Compliance Horizon ──────────────────────────────────────────────────────

function calculateComplianceHorizon(
  modules: ModuleScoresInternal,
): ComplianceHorizon {
  let minDays: number | null = null;
  let breachRegulation: string | null = null;
  let breachType: string | null = null;

  // Scan all factors across all modules for smallest positive daysToThreshold
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

  // Confidence based on data availability
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

// ─── Alert Loading ───────────────────────────────────────────────────────────

async function loadActiveAlerts(
  prisma: PrismaClient,
  orgId: string,
  noradId: string,
): Promise<SatelliteAlertType[]> {
  try {
    // SatelliteAlert is a new Prisma model — use $queryRawUnsafe until prisma generate
    // is run in production. In the meantime, use type-safe dynamic access.
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
        noradId,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isExpiringSoon(expiresAt: string, withinDays: number): boolean {
  const expiryDate = new Date(expiresAt);
  const threshold = new Date(Date.now() + withinDays * 24 * 60 * 60 * 1000);
  return expiryDate <= threshold;
}
