import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  checkRateLimit,
  getIdentifier,
  createRateLimitResponse,
} from "@/lib/ratelimit";
import { getUserOrgId } from "@/lib/hub/queries";
import { getUserRole } from "@/lib/services/organization-service";
import { roleHasPermission } from "@/lib/permissions";
import { z } from "zod";
import type { HazardType, HazardSeverity, SourceModule } from "@prisma/client";

// ─── Severity score mapping ───

const SEVERITY_SCORES: Record<string, number> = {
  CATASTROPHIC: 4,
  CRITICAL: 3,
  MARGINAL: 2,
  NEGLIGIBLE: 1,
};

// ─── Types ───

interface SyncedHazard {
  spacecraftId: string;
  hazardId: string;
  hazardType: HazardType;
  sourceModule: SourceModule;
  sourceRecordId: string | null;
  title: string;
  description: string;
  severity: HazardSeverity;
  likelihood: number;
  regulatoryRefs: string[];
  isPredicted?: boolean;
  predictedBreachDate?: Date;
  forecastConfidence?: string;
  forecastSourceDate?: Date;
}

// ─── Route params type ───

type RouteParams = { params: Promise<{ missionId: string }> };

// ─── Validation ───

const syncBodySchema = z
  .object({
    modules: z
      .array(z.enum(["SHIELD", "DEBRIS", "INCIDENTS", "EPHEMERIS"]))
      .optional(),
  })
  .optional();

// ─── Incident category → HazardType mapping ───

function mapIncidentCategoryToHazardType(
  category: string,
): { hazardType: HazardType; hazardId: string } | null {
  switch (category) {
    case "conjunction_event":
      return { hazardType: "COLLISION", hazardId: "G01" };
    case "debris_generation":
      return { hazardType: "DEBRIS_GENERATION", hazardId: "G04" };
    case "spacecraft_anomaly":
      return { hazardType: "CONTROL_LOSS", hazardId: "G05" };
    case "loss_of_contact":
      return { hazardType: "CONTROL_LOSS", hazardId: "G06" };
    case "cyber_incident":
      return { hazardType: "CYBER", hazardId: "G07" };
    case "regulatory_breach":
      return { hazardType: "CONTROL_LOSS", hazardId: "G08" };
    default:
      return null;
  }
}

// ─── Incident severity → HazardSeverity mapping ───

function mapIncidentSeverity(severity: string): HazardSeverity {
  switch (severity) {
    case "critical":
      return "CATASTROPHIC";
    case "high":
      return "CRITICAL";
    case "medium":
      return "MARGINAL";
    case "low":
      return "NEGLIGIBLE";
    default:
      return "MARGINAL";
  }
}

// ─── POST: Sync hazards from subsystems (idempotent) ───

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const rl = await checkRateLimit(
      "hub",
      getIdentifier(request, session.user.id),
    );
    if (!rl.success) return createRateLimitResponse(rl);

    const orgId = await getUserOrgId(session.user.id);
    if (!orgId) {
      return NextResponse.json(
        { error: "No organization found" },
        { status: 404 },
      );
    }

    // RBAC: require MEMBER+ (compliance:write)
    const userRole = await getUserRole(orgId, session.user.id);
    if (!userRole || !roleHasPermission(userRole, "compliance:write")) {
      return NextResponse.json(
        { error: "Insufficient permissions for hazard sync" },
        { status: 403 },
      );
    }

    const { missionId } = await params;
    const spacecraftId = missionId;

    // Verify spacecraft belongs to the user's organization
    const spacecraft = await prisma.spacecraft.findFirst({
      where: { id: spacecraftId, organizationId: orgId },
      select: { id: true, noradId: true },
    });
    if (!spacecraft) {
      return NextResponse.json(
        { error: "Spacecraft not found in your organization" },
        { status: 403 },
      );
    }

    // Parse optional body to filter which modules to sync
    let modulesToSync: string[] = [
      "SHIELD",
      "DEBRIS",
      "INCIDENTS",
      "EPHEMERIS",
    ];
    try {
      const body = await request.json();
      const parsed = syncBodySchema.safeParse(body);
      if (parsed.success && parsed.data?.modules) {
        modulesToSync = parsed.data.modules;
      }
    } catch {
      // Empty body is fine — sync all modules
    }

    const hazardsToSync: SyncedHazard[] = [];
    const syncLog: string[] = [];

    // ─── 1. Shield (ConjunctionEvent) → G01 (COLLISION), G07 (CYBER) ───

    if (modulesToSync.includes("SHIELD")) {
      const conjunctions = await prisma.conjunctionEvent.findMany({
        where: {
          organizationId: orgId,
          spacecraftId,
          riskTier: { in: ["EMERGENCY", "HIGH", "ELEVATED"] },
        },
        orderBy: { tca: "desc" },
      });

      if (conjunctions.length > 0) {
        // Determine severity from highest risk tier
        const hasEmergency = conjunctions.some(
          (c) => c.riskTier === "EMERGENCY",
        );
        const hasHigh = conjunctions.some((c) => c.riskTier === "HIGH");

        const collisionSeverity: HazardSeverity = hasEmergency
          ? "CATASTROPHIC"
          : hasHigh
            ? "CRITICAL"
            : "MARGINAL";

        // Likelihood based on count and risk tier
        const likelihood = hasEmergency
          ? 5
          : hasHigh
            ? 4
            : Math.min(conjunctions.length, 3);

        hazardsToSync.push({
          spacecraftId,
          hazardId: "G01",
          hazardType: "COLLISION",
          sourceModule: "SHIELD",
          sourceRecordId: conjunctions[0].id,
          title: `Collision Risk — ${conjunctions.length} conjunction event(s) detected`,
          description: `Shield module detected ${conjunctions.length} conjunction event(s) at risk tiers EMERGENCY/HIGH/ELEVATED. Highest risk tier: ${hasEmergency ? "EMERGENCY" : hasHigh ? "HIGH" : "ELEVATED"}. Latest TCA: ${conjunctions[0].tca.toISOString()}.`,
          severity: collisionSeverity,
          likelihood,
          regulatoryRefs: ["FSOA Art. 34", "IADC Guidelines 5.2.1"],
        });

        syncLog.push(
          `SHIELD: ${conjunctions.length} conjunction(s) → G01 COLLISION`,
        );

        // Check for cyber implications (only UNKNOWN threat objects warrant cyber inference;
        // PAYLOAD objects are legitimate and should not trigger false positives)
        const cyberThreats = conjunctions.filter(
          (c) => c.threatObjectType === "UNKNOWN",
        );
        if (cyberThreats.length > 0) {
          hazardsToSync.push({
            spacecraftId,
            hazardId: "G07",
            hazardType: "CYBER",
            sourceModule: "SHIELD",
            sourceRecordId: cyberThreats[0].id,
            title: `Cyber/Interference Risk — ${cyberThreats.length} suspicious conjunction(s)`,
            description: `Shield module detected ${cyberThreats.length} conjunction event(s) involving UNKNOWN threat objects, which may indicate intentional interference or spoofing.`,
            severity: "CRITICAL",
            likelihood: 2,
            regulatoryRefs: ["NIS2 Art. 21", "FSOA Art. 38"],
          });

          syncLog.push(
            `SHIELD: ${cyberThreats.length} cyber threat(s) → G07 CYBER`,
          );
        }
      }
    }

    // ─── 2. Debris (DebrisAssessment) → G01 (COLLISION), G04 (DEBRIS_GENERATION) ───

    if (modulesToSync.includes("DEBRIS")) {
      const debrisAssessments = await prisma.debrisAssessment.findMany({
        where: { organizationId: orgId, spacecraftId: spacecraftId },
        include: {
          requirements: {
            where: { status: "non_compliant" },
          },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (debrisAssessments.length > 0) {
        // Check for non-compliant requirements related to protected zones / collision avoidance
        const collisionRequirements = debrisAssessments.flatMap((a) =>
          a.requirements.filter(
            (r) =>
              r.requirementId.includes("collision") ||
              r.requirementId.includes("ca_") ||
              r.requirementId.includes("protected") ||
              r.requirementId.includes("avoidance"),
          ),
        );

        if (collisionRequirements.length > 0) {
          hazardsToSync.push({
            spacecraftId,
            hazardId: "G01",
            hazardType: "COLLISION",
            sourceModule: "DEBRIS",
            sourceRecordId: debrisAssessments[0].id,
            title: `Collision Risk — ${collisionRequirements.length} non-compliant debris requirement(s) in protected zones`,
            description: `Debris assessment found ${collisionRequirements.length} non-compliant requirement(s) related to collision avoidance or protected zone operations.`,
            severity: "CRITICAL",
            likelihood: 3,
            regulatoryRefs: [
              "FSOA Art. 34",
              "IADC Guidelines 5.3",
              "ISO 24113",
            ],
          });

          syncLog.push(
            `DEBRIS: ${collisionRequirements.length} collision requirement(s) → G01 COLLISION`,
          );
        }

        // Check for debris generation non-compliance
        const debrisGenRequirements = debrisAssessments.flatMap((a) =>
          a.requirements.filter(
            (r) =>
              r.requirementId.includes("debris") ||
              r.requirementId.includes("fragmentation") ||
              r.requirementId.includes("passivation") ||
              r.requirementId.includes("disposal"),
          ),
        );

        if (debrisGenRequirements.length > 0) {
          hazardsToSync.push({
            spacecraftId,
            hazardId: "G04",
            hazardType: "DEBRIS_GENERATION",
            sourceModule: "DEBRIS",
            sourceRecordId: debrisAssessments[0].id,
            title: `Debris Generation Risk — ${debrisGenRequirements.length} non-compliant requirement(s)`,
            description: `Debris assessment identified ${debrisGenRequirements.length} non-compliant requirement(s) related to debris generation, fragmentation, passivation, or disposal.`,
            severity: "CRITICAL",
            likelihood: 3,
            regulatoryRefs: [
              "FSOA Art. 35",
              "IADC Guidelines 5.2",
              "ISO 24113",
            ],
          });

          syncLog.push(
            `DEBRIS: ${debrisGenRequirements.length} debris gen requirement(s) → G04 DEBRIS_GENERATION`,
          );
        }
      }
    }

    // ─── 3. Incidents → Map category to hazard type ───

    if (modulesToSync.includes("INCIDENTS")) {
      // Find incidents where the supervision config belongs to a user in this org
      const orgMembers = await prisma.organizationMember.findMany({
        where: { organizationId: orgId },
        select: { userId: true },
      });
      const memberUserIds = orgMembers.map((m) => m.userId);

      const allIncidents = await prisma.incident.findMany({
        where: {
          supervision: {
            userId: { in: memberUserIds },
          },
          status: { notIn: ["resolved", "reported"] },
        },
        include: {
          supervision: {
            select: { userId: true },
          },
          affectedAssets: true,
        },
        orderBy: { detectedAt: "desc" },
      });

      // Filter incidents to those affecting this spacecraft
      const incidents = allIncidents.filter((inc) => {
        if (inc.affectedAssets.length === 0) return true; // No asset info = include by default
        return inc.affectedAssets.some(
          (a) =>
            a.nexusAssetId === spacecraftId ||
            (spacecraft.noradId && a.noradId === spacecraft.noradId),
        );
      });

      // Group incidents by category to avoid duplicate hazard IDs
      const incidentsByCategory = new Map<string, typeof incidents>();
      for (const incident of incidents) {
        const existing = incidentsByCategory.get(incident.category) ?? [];
        existing.push(incident);
        incidentsByCategory.set(incident.category, existing);
      }

      for (const [category, categoryIncidents] of incidentsByCategory) {
        const mapping = mapIncidentCategoryToHazardType(category);
        if (!mapping) continue;

        const highestSeverityIncident = categoryIncidents.reduce(
          (highest, current) => {
            const severityOrder = ["critical", "high", "medium", "low"];
            return severityOrder.indexOf(current.severity) <
              severityOrder.indexOf(highest.severity)
              ? current
              : highest;
          },
        );

        const hazardSeverity = mapIncidentSeverity(
          highestSeverityIncident.severity,
        );
        const likelihood = Math.min(categoryIncidents.length + 1, 5);

        hazardsToSync.push({
          spacecraftId,
          hazardId: mapping.hazardId,
          hazardType: mapping.hazardType,
          sourceModule: "INCIDENTS",
          sourceRecordId: highestSeverityIncident.id,
          title: `${mapping.hazardType} — ${categoryIncidents.length} active incident(s) (${category})`,
          description: `Incident module reports ${categoryIncidents.length} active incident(s) in category "${category}". Highest severity: ${highestSeverityIncident.severity}. Latest: ${highestSeverityIncident.title}.`,
          severity: hazardSeverity,
          likelihood,
          regulatoryRefs: ["FSOA Art. 36", "NIS2 Art. 23"],
        });

        syncLog.push(
          `INCIDENTS: ${categoryIncidents.length} ${category} incident(s) → ${mapping.hazardId} ${mapping.hazardType}`,
        );
      }
    }

    // ─── 4. Ephemeris (SatelliteComplianceState) → G02, G03, G05, G06 ───

    if (modulesToSync.includes("EPHEMERIS") && spacecraft.noradId) {
      const complianceState = await prisma.satelliteComplianceState.findFirst({
        where: {
          noradId: spacecraft.noradId,
          operatorId: orgId,
        },
        orderBy: { calculatedAt: "desc" },
      });

      if (complianceState?.moduleScores) {
        const moduleScores = complianceState.moduleScores as Record<
          string,
          { score?: number; status?: string; [key: string]: unknown }
        >;

        // Orbital decay → G02 (REENTRY)
        const orbitalDecay = moduleScores.orbital_decay ?? moduleScores.orbital;
        if (
          orbitalDecay &&
          typeof orbitalDecay.score === "number" &&
          orbitalDecay.score < 70
        ) {
          const severity: HazardSeverity =
            orbitalDecay.score < 30
              ? "CATASTROPHIC"
              : orbitalDecay.score < 50
                ? "CRITICAL"
                : "MARGINAL";
          const likelihood =
            orbitalDecay.score < 30 ? 4 : orbitalDecay.score < 50 ? 3 : 2;

          hazardsToSync.push({
            spacecraftId,
            hazardId: "G02",
            hazardType: "REENTRY",
            sourceModule: "EPHEMERIS",
            sourceRecordId: complianceState.id,
            title: `Reentry Risk — orbital decay compliance score ${orbitalDecay.score}/100`,
            description: `Ephemeris module reports orbital decay compliance score of ${orbitalDecay.score}/100, indicating elevated reentry risk. Compliance horizon: ${complianceState.horizonDays ?? "unknown"} days.`,
            severity,
            likelihood,
            regulatoryRefs: [
              "FSOA Art. 35",
              "IADC Guidelines 5.3.2",
              "ISO 27875",
            ],
          });

          syncLog.push(
            `EPHEMERIS: orbital_decay score ${orbitalDecay.score} → G02 REENTRY`,
          );
        }

        // Fuel depletion → G03 (EXPLOSION)
        const fuelDepletion = moduleScores.fuel_depletion ?? moduleScores.fuel;
        if (
          fuelDepletion &&
          typeof fuelDepletion.score === "number" &&
          fuelDepletion.score < 70
        ) {
          const severity: HazardSeverity =
            fuelDepletion.score < 30
              ? "CATASTROPHIC"
              : fuelDepletion.score < 50
                ? "CRITICAL"
                : "MARGINAL";
          const likelihood =
            fuelDepletion.score < 30 ? 4 : fuelDepletion.score < 50 ? 3 : 2;

          hazardsToSync.push({
            spacecraftId,
            hazardId: "G03",
            hazardType: "EXPLOSION",
            sourceModule: "EPHEMERIS",
            sourceRecordId: complianceState.id,
            title: `Explosion/Passivation Risk — fuel depletion compliance score ${fuelDepletion.score}/100`,
            description: `Ephemeris module reports fuel depletion compliance score of ${fuelDepletion.score}/100, indicating risk of explosion from residual propellant.`,
            severity,
            likelihood,
            regulatoryRefs: [
              "FSOA Art. 35",
              "IADC Guidelines 5.2.3",
              "ECSS-Q-ST-40-02C",
            ],
          });

          syncLog.push(
            `EPHEMERIS: fuel_depletion score ${fuelDepletion.score} → G03 EXPLOSION`,
          );
        }

        // Subsystem degradation → G05 (TOXICITY) / G06 (CONTROL_LOSS)
        const subsystemDegradation =
          moduleScores.subsystem_degradation ?? moduleScores.subsystem;
        if (
          subsystemDegradation &&
          typeof subsystemDegradation.score === "number" &&
          subsystemDegradation.score < 70
        ) {
          const severity: HazardSeverity =
            subsystemDegradation.score < 30
              ? "CATASTROPHIC"
              : subsystemDegradation.score < 50
                ? "CRITICAL"
                : "MARGINAL";
          const likelihood =
            subsystemDegradation.score < 30
              ? 4
              : subsystemDegradation.score < 50
                ? 3
                : 2;

          // G05 — TOXICITY (hazardous material release from degradation)
          hazardsToSync.push({
            spacecraftId,
            hazardId: "G05",
            hazardType: "TOXICITY",
            sourceModule: "EPHEMERIS",
            sourceRecordId: complianceState.id,
            title: `Toxicity Risk — subsystem degradation score ${subsystemDegradation.score}/100`,
            description: `Ephemeris module reports subsystem degradation compliance score of ${subsystemDegradation.score}/100, indicating potential hazardous material release risk during reentry or breakup.`,
            severity,
            likelihood,
            regulatoryRefs: ["FSOA Art. 35", "ECSS-Q-ST-70-01C"],
          });

          // G06 — CONTROL_LOSS (inability to maintain attitude/orbit control)
          hazardsToSync.push({
            spacecraftId,
            hazardId: "G06",
            hazardType: "CONTROL_LOSS",
            sourceModule: "EPHEMERIS",
            sourceRecordId: complianceState.id,
            title: `Control Loss Risk — subsystem degradation score ${subsystemDegradation.score}/100`,
            description: `Ephemeris module reports subsystem degradation compliance score of ${subsystemDegradation.score}/100, indicating elevated risk of loss of attitude or orbit control capability.`,
            severity,
            likelihood: Math.min(likelihood + 1, 5),
            regulatoryRefs: ["FSOA Art. 34", "IADC Guidelines 5.2.2"],
          });

          syncLog.push(
            `EPHEMERIS: subsystem_degradation score ${subsystemDegradation.score} → G05 TOXICITY, G06 CONTROL_LOSS`,
          );
        }
      }
    }

    // ─── 5. Predictive Hazards from EphemerisForecast → G02-P, G03-P, G05-P ───
    // Predictive hazards are derived from EPHEMERIS data and always written as sourceModule: "EPHEMERIS"

    if (modulesToSync.includes("EPHEMERIS") && spacecraft.noradId) {
      const latestForecast = await prisma.ephemerisForecast.findFirst({
        where: {
          noradId: spacecraft.noradId,
          operatorId: orgId,
        },
        orderBy: { calculatedAt: "desc" },
      });

      if (latestForecast?.complianceEvents) {
        const complianceEvents = latestForecast.complianceEvents as Array<{
          module: string;
          eventType: string;
          day: number;
          description: string;
          regulation?: string;
          confidence?: string;
        }>;

        const breaches = complianceEvents.filter(
          (e) => e.eventType === "threshold_breach",
        );

        const CONFIDENCE_LIKELIHOOD: Record<string, number> = {
          HIGH: 4,
          MEDIUM: 3,
          LOW: 2,
        };

        const MODULE_HAZARD_MAP: Record<
          string,
          { hazardId: string; hazardType: HazardType } | undefined
        > = {
          orbital_decay: { hazardId: "G02-P", hazardType: "REENTRY" },
          fuel_depletion: { hazardId: "G03-P", hazardType: "EXPLOSION" },
          subsystem_degradation: {
            hazardId: "G05-P",
            hazardType: "CONTROL_LOSS",
          },
        };

        for (const breach of breaches) {
          const mapping = MODULE_HAZARD_MAP[breach.module];
          if (!mapping) continue;

          const daysUntilBreach = breach.day;
          const severity: HazardSeverity =
            daysUntilBreach < 365
              ? "CRITICAL"
              : daysUntilBreach < 730
                ? "MARGINAL"
                : "NEGLIGIBLE";

          const confidence = (breach.confidence ?? "MEDIUM").toUpperCase();
          const likelihood = CONFIDENCE_LIKELIHOOD[confidence] ?? 2;

          const predictedBreachDate = new Date(latestForecast.calculatedAt);
          predictedBreachDate.setDate(
            predictedBreachDate.getDate() + daysUntilBreach,
          );

          hazardsToSync.push({
            spacecraftId,
            hazardId: mapping.hazardId,
            hazardType: mapping.hazardType,
            sourceModule: "EPHEMERIS",
            sourceRecordId: latestForecast.id,
            title: `Predicted ${mapping.hazardType} — ${breach.description}`,
            description: `EphemerisForecast predicts ${breach.module} threshold breach in ${daysUntilBreach} days (${predictedBreachDate.toISOString().split("T")[0]}). ${breach.regulation ? `Regulation: ${breach.regulation}.` : ""} Confidence: ${confidence}. Model version: ${latestForecast.modelVersion ?? "unknown"}.`,
            severity,
            likelihood,
            regulatoryRefs: breach.regulation ? [breach.regulation] : [],
            isPredicted: true,
            predictedBreachDate,
            forecastConfidence: confidence,
            forecastSourceDate: latestForecast.calculatedAt,
          });

          syncLog.push(
            `PREDICTIVE: ${breach.module} breach in ${daysUntilBreach}d → ${mapping.hazardId} ${mapping.hazardType} (${confidence})`,
          );
        }
      }
    }

    // ─── 6. Cybersecurity Assessment → CYBER hazards ───

    if (
      modulesToSync.includes("INCIDENTS") ||
      modulesToSync.includes("MANUAL")
    ) {
      try {
        const cyberAssessments = await prisma.cybersecurityAssessment.findMany({
          where: { organizationId: orgId },
          include: { requirements: { where: { status: "non_compliant" } } },
          take: 1,
          orderBy: { updatedAt: "desc" },
        });

        for (const assessment of cyberAssessments) {
          const criticalGaps = assessment.requirements.filter(
            (r) => r.status === "non_compliant",
          );
          if (criticalGaps.length > 0) {
            // Create a single aggregated CYBER hazard for unresolved cybersecurity gaps
            const gapSeverity: HazardSeverity =
              criticalGaps.length > 5 ? "CRITICAL" : "MARGINAL";
            const gapLikelihood = 3; // OCCASIONAL

            hazardsToSync.push({
              spacecraftId,
              hazardId: `CYBER-GAPS-${assessment.id.slice(-6)}`,
              hazardType: "CYBER",
              sourceModule: "MANUAL", // No CYBERSECURITY enum in SourceModule, use MANUAL
              sourceRecordId: assessment.id,
              title: `Cybersecurity Compliance Gaps — ${criticalGaps.length} non-compliant requirements`,
              description: `${criticalGaps.length} cybersecurity requirements are non-compliant. Address these to reduce cyber risk exposure.`,
              severity: gapSeverity,
              likelihood: gapLikelihood,
              regulatoryRefs: ["NIS2 Art. 21", "ENISA Guidelines"],
            });

            syncLog.push(
              `CYBERSECURITY: ${criticalGaps.length} non-compliant requirements → CYBER-GAPS`,
            );
          }
        }
      } catch (err) {
        logger.warn("Cybersecurity assessment sync failed", err);
      }
    }

    // ─── Upsert all synced hazards (idempotent) ───

    // Deduplicate by hazardId: if multiple sources produce the same hazardId,
    // keep the one with the highest riskIndex
    const deduped = new Map<string, SyncedHazard>();
    for (const hazard of hazardsToSync) {
      const key = `${hazard.spacecraftId}:${hazard.hazardId}`;
      const existing = deduped.get(key);
      const currentRiskIndex =
        SEVERITY_SCORES[hazard.severity] * hazard.likelihood;
      const existingRiskIndex = existing
        ? SEVERITY_SCORES[existing.severity] * existing.likelihood
        : 0;

      if (!existing || currentRiskIndex > existingRiskIndex) {
        deduped.set(key, hazard);
      }
    }

    // Wrap all upserts in a transaction for atomicity
    const upsertResults = await prisma.$transaction(async (tx) => {
      const results = [];

      for (const hazard of deduped.values()) {
        const riskIndex = SEVERITY_SCORES[hazard.severity] * hazard.likelihood;

        // Check if a MANUAL, ACCEPTED, or in-progress/closed entry already exists — never overwrite
        const existingProtected = await tx.hazardEntry.findFirst({
          where: {
            spacecraftId: hazard.spacecraftId,
            hazardId: hazard.hazardId,
            organizationId: orgId,
            OR: [
              { sourceModule: "MANUAL" },
              { acceptanceStatus: "ACCEPTED" },
              { mitigationStatus: { in: ["IN_PROGRESS", "CLOSED"] } },
            ],
          },
          select: {
            id: true,
            sourceModule: true,
            acceptanceStatus: true,
            mitigationStatus: true,
          },
        });

        if (existingProtected) {
          const reason =
            existingProtected.sourceModule === "MANUAL"
              ? "MANUAL entry"
              : existingProtected.acceptanceStatus === "ACCEPTED"
                ? "ACCEPTED entry"
                : `mitigation ${existingProtected.mitigationStatus} entry`;
          syncLog.push(
            `SKIP: ${hazard.hazardId} — ${reason} exists, not overwriting`,
          );
          continue;
        }

        const result = await tx.hazardEntry.upsert({
          where: {
            spacecraftId_hazardId: {
              spacecraftId: hazard.spacecraftId,
              hazardId: hazard.hazardId,
            },
          },
          create: {
            organizationId: orgId,
            spacecraftId: hazard.spacecraftId,
            hazardId: hazard.hazardId,
            hazardType: hazard.hazardType,
            sourceModule: hazard.sourceModule,
            sourceRecordId: hazard.sourceRecordId,
            title: hazard.title,
            description: hazard.description,
            severity: hazard.severity,
            likelihood: hazard.likelihood,
            riskIndex,
            regulatoryRefs: hazard.regulatoryRefs,
            isPredicted: hazard.isPredicted ?? false,
            predictedBreachDate: hazard.predictedBreachDate ?? null,
            forecastConfidence: hazard.forecastConfidence ?? null,
            forecastSourceDate: hazard.forecastSourceDate ?? null,
          },
          update: {
            hazardType: hazard.hazardType,
            sourceModule: hazard.sourceModule,
            sourceRecordId: hazard.sourceRecordId,
            title: hazard.title,
            description: hazard.description,
            severity: hazard.severity,
            likelihood: hazard.likelihood,
            riskIndex,
            regulatoryRefs: hazard.regulatoryRefs,
            isPredicted: hazard.isPredicted ?? false,
            predictedBreachDate: hazard.predictedBreachDate ?? null,
            forecastConfidence: hazard.forecastConfidence ?? null,
            forecastSourceDate: hazard.forecastSourceDate ?? null,
          },
        });

        results.push(result);
      }

      return results;
    });

    return NextResponse.json({
      synced: upsertResults.length,
      total: deduped.size,
      skipped: deduped.size - upsertResults.length,
      log: syncLog,
      entries: upsertResults,
    });
  } catch (err) {
    logger.error("[missions/[missionId]/hazards/sync] POST error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
