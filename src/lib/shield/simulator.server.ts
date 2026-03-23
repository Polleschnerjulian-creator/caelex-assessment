import "server-only";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { RiskTier, ConjunctionStatus } from "@prisma/client";

export type SimulationScenario = "emergency" | "escalating" | "resolved";

export interface SimulateConjunctionParams {
  organizationId: string;
  scenario: SimulationScenario;
}

export interface SimulateConjunctionResult {
  success: true;
  eventId: string;
  conjunctionId: string;
  scenario: SimulationScenario;
  cdmCount: number;
  escalationCount: number;
}

export interface SimulateConjunctionError {
  success: false;
  error: string;
}

interface CdmSpec {
  collisionProbability: number;
  missDistance: number;
  tcaOffsetMinutes: number; // ± minutes from central TCA
  creationDate: Date;
}

/** Tier from Pc value using default thresholds */
function tierFromPc(pc: number): RiskTier {
  if (pc >= 1e-3) return "EMERGENCY";
  if (pc >= 1e-4) return "HIGH";
  if (pc >= 1e-5) return "ELEVATED";
  if (pc >= 1e-7) return "MONITOR";
  return "INFORMATIONAL";
}

/**
 * Compute a miss distance (metres) that is inversely correlated with Pc.
 * Reference: Pc ~1e-4 → ~100 m, Pc ~1e-8 → ~5000 m.
 */
function missDistanceFromPc(pc: number): number {
  // log-linear interpolation: log10(pc) from -3 to -9 → missDistance 30 m to 8000 m
  const logPc = Math.log10(Math.max(pc, 1e-12));
  // -3 → 30 m, -9 → 8000 m (linear in log space)
  const t = (logPc - -3) / (-9 - -3); // 0 at Pc=1e-3, 1 at Pc=1e-9
  const missDistance = 30 + t * (8000 - 30);
  // Add ±5 % jitter
  const jitter = missDistance * (0.95 + Math.random() * 0.1);
  return Math.round(jitter);
}

/**
 * Build CDM specs for the "emergency" scenario.
 * Sentinel-2A vs DEBRIS | Pc: 1e-6 → 3e-4 | TCA in 18 h
 */
function buildEmergencyCdms(tca: Date): CdmSpec[] {
  const now = new Date();
  // CDMs arrive at 72h, 48h, 24h, 18h before TCA
  const hoursBeforeTca = [72, 48, 24, 18];
  const pcValues = [1e-6, 8e-6, 6e-5, 3e-4];

  return hoursBeforeTca.map((h, i) => {
    const creationDate = new Date(tca.getTime() - h * 3600 * 1000);
    const pc = pcValues[i];
    return {
      collisionProbability: pc,
      missDistance: missDistanceFromPc(pc),
      tcaOffsetMinutes: (Math.random() - 0.5) * 4, // ±2 min
      creationDate: creationDate < now ? creationDate : now,
    };
  });
}

/**
 * Build CDM specs for the "escalating" scenario.
 * Galileo vs ROCKET BODY | Pc: 5e-8 → 2e-5 | TCA in 48 h
 */
function buildEscalatingCdms(tca: Date): CdmSpec[] {
  // CDMs arrive at 5d, 4d, 3d, 2.5d, 2d before TCA
  const hoursBeforeTca = [120, 96, 72, 60, 48];
  const pcValues = [5e-8, 3e-7, 2e-6, 8e-6, 2e-5];

  return hoursBeforeTca.map((h, i) => {
    const creationDate = new Date(tca.getTime() - h * 3600 * 1000);
    const pc = pcValues[i];
    return {
      collisionProbability: pc,
      missDistance: missDistanceFromPc(pc),
      tcaOffsetMinutes: (Math.random() - 0.5) * 10, // ±5 min
      creationDate,
    };
  });
}

/**
 * Build CDM specs for the "resolved" scenario.
 * Arbitrary sat vs DEBRIS | Pc peaks at 5e-5 then drops to 8e-7 | TCA 24 h ago
 */
function buildResolvedCdms(tca: Date): CdmSpec[] {
  // CDMs arrive at 96h, 72h, 48h, 36h, 24h, 18h before TCA (which is 24h ago)
  const hoursBeforeTca = [96, 72, 48, 36, 24, 18];
  const pcValues = [3e-6, 1e-5, 5e-5, 4e-5, 2e-5, 8e-7];

  return hoursBeforeTca.map((h, i) => {
    const creationDate = new Date(tca.getTime() - h * 3600 * 1000);
    const pc = pcValues[i];
    return {
      collisionProbability: pc,
      missDistance: missDistanceFromPc(pc),
      tcaOffsetMinutes: (Math.random() - 0.5) * 6, // ±3 min
      creationDate,
    };
  });
}

interface ScenarioConfig {
  spacecraftName: string;
  spacecraftNoradId: string;
  threatNoradId: string;
  threatObjectName: string;
  threatObjectType: string;
  tca: Date;
  status: ConjunctionStatus;
  finalTier: RiskTier;
  decision?: import("@prisma/client").CADecision;
  buildCdms: (tca: Date) => CdmSpec[];
  escalationPath: Array<{
    previousTier: RiskTier;
    newTier: RiskTier;
    previousStatus: ConjunctionStatus;
    newStatus: ConjunctionStatus;
    details: string;
  }>;
}

function buildScenarioConfig(scenario: SimulationScenario): ScenarioConfig {
  const now = new Date();

  if (scenario === "emergency") {
    const tca = new Date(now.getTime() + 18 * 3600 * 1000);
    return {
      spacecraftName: "Sentinel-2A",
      spacecraftNoradId: "40697",
      threatNoradId: "48274",
      threatObjectName: "COSMOS 2251 DEB",
      threatObjectType: "DEBRIS",
      tca,
      status: "ASSESSMENT_REQUIRED",
      finalTier: "EMERGENCY",
      buildCdms: buildEmergencyCdms,
      escalationPath: [
        {
          previousTier: "INFORMATIONAL",
          newTier: "MONITOR",
          previousStatus: "NEW",
          newStatus: "MONITORING",
          details: "Initial CDM ingested — Pc 1.0e-6, miss distance 4200 m",
        },
        {
          previousTier: "MONITOR",
          newTier: "ELEVATED",
          previousStatus: "MONITORING",
          newStatus: "ASSESSMENT_REQUIRED",
          details: "Pc exceeded ELEVATED threshold — 8.0e-6",
        },
        {
          previousTier: "ELEVATED",
          newTier: "HIGH",
          previousStatus: "ASSESSMENT_REQUIRED",
          newStatus: "ASSESSMENT_REQUIRED",
          details: "Pc escalated to HIGH tier — 6.0e-5",
        },
        {
          previousTier: "HIGH",
          newTier: "EMERGENCY",
          previousStatus: "ASSESSMENT_REQUIRED",
          newStatus: "ASSESSMENT_REQUIRED",
          details:
            "EMERGENCY tier reached — Pc 3.0e-4, miss distance 31 m, TCA in 18 h",
        },
      ],
    };
  }

  if (scenario === "escalating") {
    const tca = new Date(now.getTime() + 48 * 3600 * 1000);
    return {
      spacecraftName: "Galileo FOC-8",
      spacecraftNoradId: "40890",
      threatNoradId: "23177",
      threatObjectName: "ARIANE 44L R/B",
      threatObjectType: "ROCKET BODY",
      tca,
      status: "MONITORING",
      finalTier: "ELEVATED",
      buildCdms: buildEscalatingCdms,
      escalationPath: [
        {
          previousTier: "INFORMATIONAL",
          newTier: "INFORMATIONAL",
          previousStatus: "NEW",
          newStatus: "MONITORING",
          details: "Initial CDM ingested — Pc 5.0e-8, miss distance 7600 m",
        },
        {
          previousTier: "INFORMATIONAL",
          newTier: "MONITOR",
          previousStatus: "MONITORING",
          newStatus: "MONITORING",
          details: "Pc rising — now 3.0e-7, tracking continued",
        },
        {
          previousTier: "MONITOR",
          newTier: "ELEVATED",
          previousStatus: "MONITORING",
          newStatus: "MONITORING",
          details:
            "ELEVATED tier reached — Pc 2.0e-5, miss distance 490 m, TCA in 48 h",
        },
      ],
    };
  }

  // "resolved"
  const tca = new Date(now.getTime() - 24 * 3600 * 1000);
  return {
    spacecraftName: "SPOT-7",
    spacecraftNoradId: "40053",
    threatNoradId: "31793",
    threatObjectName: "IRIDIUM 33 DEB",
    threatObjectType: "DEBRIS",
    tca,
    status: "CLOSED",
    finalTier: "INFORMATIONAL",
    decision: "ACCEPT_RISK",
    buildCdms: buildResolvedCdms,
    escalationPath: [
      {
        previousTier: "INFORMATIONAL",
        newTier: "MONITOR",
        previousStatus: "NEW",
        newStatus: "MONITORING",
        details: "Initial CDM — Pc 3.0e-6",
      },
      {
        previousTier: "MONITOR",
        newTier: "ELEVATED",
        previousStatus: "MONITORING",
        newStatus: "ASSESSMENT_REQUIRED",
        details: "Pc peak reached — 5.0e-5, miss distance 50 m",
      },
      {
        previousTier: "ELEVATED",
        newTier: "MONITOR",
        previousStatus: "ASSESSMENT_REQUIRED",
        newStatus: "DECISION_MADE",
        details: "Pc receding — latest 8.0e-7. Decision: ACCEPT_RISK",
      },
      {
        previousTier: "MONITOR",
        newTier: "INFORMATIONAL",
        previousStatus: "DECISION_MADE",
        newStatus: "CLOSED",
        details: "TCA passed without incident. Event closed.",
      },
    ],
  };
}

export async function simulateConjunction(
  params: SimulateConjunctionParams,
): Promise<SimulateConjunctionResult | SimulateConjunctionError> {
  const { organizationId, scenario } = params;

  logger.info("simulateConjunction: starting", { organizationId, scenario });

  // Resolve spacecraft — prefer org's first spacecraft, fall back to placeholder
  let spacecraftId = "sim-spacecraft";
  const spacecraft = await prisma.spacecraft.findFirst({
    where: { organizationId },
    select: { id: true },
  });
  if (spacecraft) {
    spacecraftId = spacecraft.id;
  }

  const cfg = buildScenarioConfig(scenario);
  const cdmSpecs = cfg.buildCdms(cfg.tca);

  // Derive peak Pc and latest Pc from CDM series
  const pcValues = cdmSpecs.map((c) => c.collisionProbability);
  const peakPc = Math.max(...pcValues);
  const latestPc = pcValues[pcValues.length - 1];
  const latestMissDistance = cdmSpecs[cdmSpecs.length - 1].missDistance;

  // peakPcAt = creationDate of the CDM that holds peakPc
  const peakIdx = pcValues.indexOf(peakPc);
  const peakPcAt = cdmSpecs[peakIdx].creationDate;

  // Unique conjunctionId — guaranteed unique within org via timestamp
  const conjunctionId = `SIM-${scenario.toUpperCase()}-${Date.now()}`;

  try {
    // 1. Create ConjunctionEvent
    const event = await prisma.conjunctionEvent.create({
      data: {
        organizationId,
        spacecraftId,
        noradId: cfg.spacecraftNoradId,
        threatNoradId: cfg.threatNoradId,
        threatObjectName: cfg.threatObjectName,
        threatObjectType: cfg.threatObjectType,
        conjunctionId,
        status: cfg.status,
        riskTier: cfg.finalTier,
        peakPc,
        peakPcAt,
        latestPc,
        latestMissDistance,
        tca: cfg.tca,
        ...(cfg.decision
          ? {
              decision: cfg.decision,
              decisionAt: new Date(),
              decisionBy: "simulator",
              decisionRationale: `Auto-set by conjunction simulator (${scenario} scenario)`,
            }
          : {}),
      },
    });

    // 2. Create CDM records
    const cdmCreations = cdmSpecs.map((spec, i) => {
      const tcaWithOffset = new Date(
        cfg.tca.getTime() + spec.tcaOffsetMinutes * 60 * 1000,
      );
      const cdmId = `SIM-${Date.now()}-${i}`;
      const rawCdm = JSON.parse(
        JSON.stringify({
          _simulator: true,
          scenario,
          cdmIndex: i,
          CDM_ID: cdmId,
          CREATION_DATE: spec.creationDate.toISOString(),
          TCA: tcaWithOffset.toISOString(),
          MIN_RNG: (spec.missDistance / 1000).toFixed(6), // metres → km
          PC: spec.collisionProbability.toExponential(4),
          PC_METHOD: "FOSTER-1992",
          SAT_1_ID: cfg.spacecraftNoradId,
          SAT_1_NAME: cfg.spacecraftName,
          SAT1_OBJECT_TYPE: "PAYLOAD",
          SAT_2_ID: cfg.threatNoradId,
          SAT_2_NAME: cfg.threatObjectName,
          SAT2_OBJECT_TYPE: cfg.threatObjectType,
          SAT2_MANEUVERABLE: "N/A",
        }),
      );

      return prisma.cDMRecord.create({
        data: {
          conjunctionEventId: event.id,
          cdmId,
          creationDate: spec.creationDate,
          tca: tcaWithOffset,
          missDistance: spec.missDistance,
          collisionProbability: spec.collisionProbability,
          probabilityMethod: "FOSTER-1992",
          riskTier: tierFromPc(spec.collisionProbability),
          source: "simulator",
          rawCdm,
        },
      });
    });

    await Promise.all(cdmCreations);

    // 3. Create escalation logs
    const escalationCreations = cfg.escalationPath.map((step) =>
      prisma.cAEscalationLog.create({
        data: {
          conjunctionEventId: event.id,
          previousTier: step.previousTier,
          newTier: step.newTier,
          previousStatus: step.previousStatus,
          newStatus: step.newStatus,
          triggeredBy: "simulator",
          details: step.details,
        },
      }),
    );

    await Promise.all(escalationCreations);

    logger.info("simulateConjunction: created", {
      organizationId,
      scenario,
      eventId: event.id,
      conjunctionId,
      cdmCount: cdmSpecs.length,
      escalationCount: cfg.escalationPath.length,
    });

    return {
      success: true,
      eventId: event.id,
      conjunctionId,
      scenario,
      cdmCount: cdmSpecs.length,
      escalationCount: cfg.escalationPath.length,
    };
  } catch (error) {
    logger.error("simulateConjunction: failed", error);
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Unknown simulation error",
    };
  }
}
