import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSafeErrorMessage } from "@/lib/validations";
import { logger } from "@/lib/logger";
import {
  getDefaultGraph,
  type CascadeInput,
  type CascadeResult,
  type ChangeType,
  type RegulatoryFramework,
} from "@/lib/ephemeris/cascade/dependency-graph";
import {
  getDefaultDetector,
  type ConflictReport,
} from "@/lib/ephemeris/cascade/conflict-detector";
import type { ModuleKey } from "@/lib/ephemeris/core/types";
import { generateCascadeAlerts } from "./alerts";

const VALID_CHANGE_TYPES: ChangeType[] = [
  "threshold_change",
  "new_requirement",
  "deadline_change",
  "repeal",
];

/**
 * POST /api/v1/ephemeris/cascade
 *
 * Simulate a regulatory change cascade through the dependency graph.
 * Returns all affected nodes, satellites, and score impacts.
 *
 * Body: {
 *   regulatoryNodeId: string,
 *   changeType: "threshold_change" | "new_requirement" | "deadline_change" | "repeal",
 *   parameters?: { newThreshold?, oldThreshold?, newDeadline?, impactMultiplier? },
 *   includeConflicts?: boolean
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const membership = await prisma.organizationMember.findFirst({
      where: { userId: session.user.id },
      select: { organizationId: true },
    });
    if (!membership) {
      return NextResponse.json({ error: "No organization" }, { status: 403 });
    }

    // Parse and validate request body
    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const { regulatoryNodeId, changeType, parameters, includeConflicts } =
      body as {
        regulatoryNodeId?: string;
        changeType?: string;
        parameters?: CascadeInput["parameters"];
        includeConflicts?: boolean;
      };

    if (!regulatoryNodeId || typeof regulatoryNodeId !== "string") {
      return NextResponse.json(
        { error: "regulatoryNodeId is required" },
        { status: 400 },
      );
    }

    if (!changeType || !VALID_CHANGE_TYPES.includes(changeType as ChangeType)) {
      return NextResponse.json(
        {
          error: `changeType must be one of: ${VALID_CHANGE_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }

    const graph = getDefaultGraph();
    const node = graph.getNode(regulatoryNodeId);
    if (!node) {
      return NextResponse.json(
        {
          error: `Unknown regulatory node: ${regulatoryNodeId}`,
          availableNodes: graph.getAllNodeIds(),
        },
        { status: 400 },
      );
    }

    // Run cascade propagation
    const impactMultiplier = parameters?.impactMultiplier ?? 1.0;
    const propagation = graph.propagate(
      regulatoryNodeId,
      changeType as ChangeType,
      impactMultiplier,
    );

    // Fetch organization's satellites with current scores
    const spacecraft = await prisma.spacecraft.findMany({
      where: {
        organizationId: membership.organizationId,
        noradId: { not: null },
      },
      select: {
        noradId: true,
        name: true,
        altitudeKm: true,
        orbitType: true,
      },
    });

    // Load current compliance states for score data
    const complianceStates = await prisma.satelliteComplianceState.findMany({
      where: {
        operatorId: membership.organizationId,
        noradId: {
          in: spacecraft
            .map((sc) => sc.noradId)
            .filter((id): id is string => id !== null),
        },
      },
      select: {
        noradId: true,
        overallScore: true,
        moduleScores: true,
      },
    });

    const stateMap = new Map(complianceStates.map((s) => [s.noradId, s]));

    // Build satellite data for impact calculation
    const satelliteData = spacecraft
      .filter(
        (sc): sc is typeof sc & { noradId: string } => sc.noradId !== null,
      )
      .map((sc) => {
        const state = stateMap.get(sc.noradId);
        const moduleScores: Partial<Record<ModuleKey, number>> = {};

        if (state?.moduleScores && typeof state.moduleScores === "object") {
          const ms = state.moduleScores as Record<string, { score?: number }>;
          for (const [key, val] of Object.entries(ms)) {
            if (val?.score !== undefined) {
              moduleScores[key as ModuleKey] = val.score;
            }
          }
        }

        return {
          noradId: sc.noradId,
          name: sc.name,
          jurisdictions: [] as string[], // Could be enriched from org profile
          currentScore: state?.overallScore ?? null,
          moduleScores,
        };
      });

    const satelliteImpacts = graph.calculateSatelliteImpacts(
      propagation,
      satelliteData,
    );

    const cascadeResult: CascadeResult = {
      trigger: regulatoryNodeId,
      changeType: changeType as ChangeType,
      affectedNodes: propagation.affectedNodes,
      affectedSatellites: satelliteImpacts,
      totalImpact: Math.round(propagation.totalImpact * 10) / 10,
      propagationPath: propagation.propagationPath,
      timestamp: new Date().toISOString(),
    };

    // Generate alerts for WARNING/CRITICAL impacts
    const alertsGenerated = await generateCascadeAlerts(
      membership.organizationId,
      cascadeResult,
    );

    // Optionally include conflict detection
    let conflictReport: ConflictReport | undefined;
    if (includeConflicts) {
      const detector = getDefaultDetector();
      // Collect frameworks from affected nodes
      const affectedFrameworks = new Set<RegulatoryFramework>();
      for (const nodeId of [regulatoryNodeId, ...propagation.affectedNodes]) {
        const n = graph.getNode(nodeId);
        if (n) affectedFrameworks.add(n.framework);
      }

      // Run conflict detection for first satellite (representative)
      if (satelliteData.length > 0) {
        const sat = satelliteData[0]!;
        conflictReport = detector.detectConflicts(
          { noradId: sat.noradId, name: sat.name },
          Array.from(affectedFrameworks),
        );
      }
    }

    logger.info("[Cascade] Simulation complete", {
      trigger: regulatoryNodeId,
      changeType,
      affectedNodes: propagation.affectedNodes.length,
      affectedSatellites: satelliteImpacts.length,
      totalImpact: cascadeResult.totalImpact,
      alertsGenerated,
    });

    return NextResponse.json({
      data: cascadeResult,
      alerts: { generated: alertsGenerated },
      ...(conflictReport ? { conflicts: conflictReport } : {}),
    });
  } catch (error) {
    logger.error("[Cascade] API error", error);
    return NextResponse.json(
      {
        error: "Cascade simulation failed",
        message: getSafeErrorMessage(error, "Cascade simulation failed"),
      },
      { status: 500 },
    );
  }
}

/**
 * GET /api/v1/ephemeris/cascade
 * Returns the regulatory dependency graph structure.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const graph = getDefaultGraph();
    const framework = request.nextUrl.searchParams.get("framework");

    const nodes = framework
      ? graph.getNodesByFramework(framework as RegulatoryFramework)
      : graph.getAllNodes();

    return NextResponse.json({
      data: {
        nodes,
        totalNodes: nodes.length,
        frameworks: [...new Set(nodes.map((n) => n.framework))],
      },
    });
  } catch (error) {
    logger.error("[Cascade] Graph fetch error", error);
    return NextResponse.json(
      { error: "Failed to load regulatory graph" },
      { status: 500 },
    );
  }
}
