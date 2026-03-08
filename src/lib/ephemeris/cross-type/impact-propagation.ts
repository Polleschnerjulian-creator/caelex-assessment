import "server-only";
import type { PrismaClient } from "@prisma/client";
import type {
  CrossTypeImpactResult,
  DependencyImpact,
  DependencyStrength,
} from "../core/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const STRENGTH_MULTIPLIERS: Record<string, number> = {
  CRITICAL: 0.8,
  HIGH: 0.5,
  MEDIUM: 0.3,
  LOW: 0.1,
};

const CASCADE_DECAY = 0.5;
const MAX_CASCADE_DEPTH = 3;

// ─── Module Mapping ─────────────────────────────────────────────────────────

/**
 * Maps (targetOperatorType, targetModule) → sourceModules affected.
 * When a target entity's module degrades, these source modules are impacted.
 */
const MODULE_IMPACT_MAP: Record<string, Record<string, string[]>> = {
  // TCO issues → SCO impacts
  TCO: {
    ground_infrastructure: ["ground"],
    cyber: ["cyber"],
    operations_authorization: ["ground"],
    command_integrity: ["ground"],
    tracking_accuracy: ["ground"],
  },
  // LO issues → SCO impacts (mostly horizon, not score)
  LO: {
    launch_authorization: [],
    range_safety: [],
  },
  // LSO issues → LO impacts
  LSO: {
    site_authorization: ["launch_authorization"],
    range_safety_systems: ["range_safety"],
    environmental_compliance: ["environmental_impact"],
    ground_infrastructure: ["range_safety"],
  },
  // SCO issues → CAP impacts
  SCO_TO_CAP: {
    fuel: ["service_continuity"],
    subsystems: ["service_continuity"],
    orbital: ["service_continuity"],
  },
  // SCO issues → PDP impacts
  SCO_TO_PDP: {
    fuel: ["data_quality"],
    subsystems: ["data_quality"],
    orbital: ["data_quality"],
  },
  // SCO issues → ISOS impacts
  SCO_TO_ISOS: {
    orbital: ["target_compliance"],
    subsystems: ["target_compliance"],
  },
};

/**
 * Get affected modules on the source entity when a target entity's modules change.
 */
function getAffectedSourceModules(
  targetOperatorType: string,
  sourceOperatorType: string,
  targetAffectedModules: string[],
): string[] {
  // Determine which mapping to use
  let mapKey = targetOperatorType;
  if (targetOperatorType === "SCO" && sourceOperatorType === "CAP") {
    mapKey = "SCO_TO_CAP";
  } else if (targetOperatorType === "SCO" && sourceOperatorType === "PDP") {
    mapKey = "SCO_TO_PDP";
  } else if (targetOperatorType === "SCO" && sourceOperatorType === "ISOS") {
    mapKey = "SCO_TO_ISOS";
  }

  const mapping = MODULE_IMPACT_MAP[mapKey];
  if (!mapping) return [];

  const affected = new Set<string>();
  for (const mod of targetAffectedModules) {
    const mapped = mapping[mod];
    if (mapped) {
      for (const m of mapped) {
        affected.add(m);
      }
    }
  }
  return Array.from(affected);
}

// ─── Impact Propagation ─────────────────────────────────────────────────────

interface DependencyRecord {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  dependencyType: string;
  strength: string;
  sourceEntity: { id: string; name: string; operatorType: string };
  targetEntity: { id: string; name: string; operatorType: string };
}

/**
 * Propagate a compliance impact through the entity dependency graph.
 *
 * When an entity's compliance state changes, this engine:
 * 1. Finds all entities that depend on the changed entity
 * 2. Calculates the propagated impact (score delta * strength multiplier)
 * 3. Recursively checks for cascade impacts (with decay)
 * 4. Returns the full impact chain
 *
 * IMPORTANT: This is informational only — it does NOT modify actual scores.
 */
export async function propagateImpact(
  triggerEntityId: string,
  organizationId: string,
  scoreDelta: number,
  affectedModules: string[],
  prisma: PrismaClient,
  triggerEvent?: string,
): Promise<CrossTypeImpactResult> {
  // Fetch the trigger entity info
  const triggerEntity = await prisma.operatorEntity.findUnique({
    where: { id: triggerEntityId },
    select: { id: true, name: true, operatorType: true },
  });

  if (!triggerEntity) {
    return {
      triggerEntityId,
      triggerEvent: triggerEvent ?? "unknown",
      directImpacts: [],
      cascadeImpacts: [],
      totalEntitiesAffected: 0,
      totalScoreImpact: 0,
      criticalPathLength: 0,
    };
  }

  const visited = new Set<string>([triggerEntityId]);
  const directImpacts: DependencyImpact[] = [];
  const cascadeImpacts: DependencyImpact[] = [];

  // Fetch all dependencies where the trigger entity is the target
  const dependencies = await fetchDependenciesOnTarget(
    triggerEntityId,
    organizationId,
    prisma,
  );

  // Calculate direct impacts (depth 1)
  for (const dep of dependencies) {
    const multiplier = STRENGTH_MULTIPLIERS[dep.strength] ?? 0.3;
    const propagatedDelta = Math.round(scoreDelta * multiplier);
    const horizonDelta = Math.round(scoreDelta * multiplier * 2); // Horizon impact is amplified

    const sourceModules = getAffectedSourceModules(
      triggerEntity.operatorType,
      dep.sourceEntity.operatorType,
      affectedModules,
    );

    const impact: DependencyImpact = {
      sourceEntityId: dep.sourceEntity.id,
      sourceEntityName: dep.sourceEntity.name,
      sourceOperatorType: dep.sourceEntity.operatorType,
      targetEntityId: triggerEntity.id,
      targetEntityName: triggerEntity.name,
      targetOperatorType: triggerEntity.operatorType,
      dependencyType: dep.dependencyType,
      strength: dep.strength,
      impactScore: Math.abs(propagatedDelta),
      propagatedScoreDelta: propagatedDelta,
      propagatedHorizonDelta: horizonDelta,
      affectedModules: sourceModules,
      narrative: buildNarrative(
        triggerEntity.name,
        triggerEntity.operatorType,
        dep.sourceEntity.name,
        dep.sourceEntity.operatorType,
        dep.dependencyType,
        propagatedDelta,
        sourceModules,
      ),
    };

    directImpacts.push(impact);
    visited.add(dep.sourceEntity.id);
  }

  // Calculate cascade impacts (depth 2+)
  await propagateCascade(
    directImpacts,
    organizationId,
    scoreDelta,
    affectedModules,
    visited,
    cascadeImpacts,
    prisma,
    1,
  );

  const allImpacts = [...directImpacts, ...cascadeImpacts];
  const uniqueEntities = new Set(allImpacts.map((i) => i.sourceEntityId));

  return {
    triggerEntityId,
    triggerEvent: triggerEvent ?? `Score change: ${scoreDelta}`,
    directImpacts,
    cascadeImpacts,
    totalEntitiesAffected: uniqueEntities.size,
    totalScoreImpact: allImpacts.reduce(
      (sum, i) => sum + Math.abs(i.propagatedScoreDelta),
      0,
    ),
    criticalPathLength:
      cascadeImpacts.length > 0
        ? 2 + Math.min(cascadeImpacts.length, MAX_CASCADE_DEPTH - 1)
        : directImpacts.length > 0
          ? 1
          : 0,
  };
}

async function propagateCascade(
  parentImpacts: DependencyImpact[],
  organizationId: string,
  originalScoreDelta: number,
  originalModules: string[],
  visited: Set<string>,
  cascadeImpacts: DependencyImpact[],
  prisma: PrismaClient,
  depth: number,
): Promise<void> {
  if (depth >= MAX_CASCADE_DEPTH) return;

  for (const parentImpact of parentImpacts) {
    // Find entities that depend on the impacted entity
    const dependencies = await fetchDependenciesOnTarget(
      parentImpact.sourceEntityId,
      organizationId,
      prisma,
    );

    for (const dep of dependencies) {
      if (visited.has(dep.sourceEntity.id)) continue; // Prevent circular propagation
      visited.add(dep.sourceEntity.id);

      const decayedDelta = originalScoreDelta * Math.pow(CASCADE_DECAY, depth);
      const multiplier = STRENGTH_MULTIPLIERS[dep.strength] ?? 0.3;
      const propagatedDelta = Math.round(decayedDelta * multiplier);

      if (Math.abs(propagatedDelta) < 1) continue; // Skip negligible impacts

      const sourceModules = getAffectedSourceModules(
        parentImpact.sourceOperatorType,
        dep.sourceEntity.operatorType,
        parentImpact.affectedModules,
      );

      const impact: DependencyImpact = {
        sourceEntityId: dep.sourceEntity.id,
        sourceEntityName: dep.sourceEntity.name,
        sourceOperatorType: dep.sourceEntity.operatorType,
        targetEntityId: parentImpact.sourceEntityId,
        targetEntityName: parentImpact.sourceEntityName,
        targetOperatorType: parentImpact.sourceOperatorType,
        dependencyType: dep.dependencyType,
        strength: dep.strength,
        impactScore: Math.abs(propagatedDelta),
        propagatedScoreDelta: propagatedDelta,
        propagatedHorizonDelta: Math.round(propagatedDelta * 2),
        affectedModules: sourceModules,
        narrative: `[Cascade] ${buildNarrative(
          parentImpact.sourceEntityName,
          parentImpact.sourceOperatorType,
          dep.sourceEntity.name,
          dep.sourceEntity.operatorType,
          dep.dependencyType,
          propagatedDelta,
          sourceModules,
        )}`,
      };

      cascadeImpacts.push(impact);
    }
  }

  // Recurse for next depth level
  if (cascadeImpacts.length > 0 && depth + 1 < MAX_CASCADE_DEPTH) {
    const newCascades: DependencyImpact[] = [];
    await propagateCascade(
      cascadeImpacts,
      organizationId,
      originalScoreDelta,
      originalModules,
      visited,
      newCascades,
      prisma,
      depth + 1,
    );
    cascadeImpacts.push(...newCascades);
  }
}

async function fetchDependenciesOnTarget(
  targetEntityId: string,
  organizationId: string,
  prisma: PrismaClient,
): Promise<DependencyRecord[]> {
  return prisma.entityDependency.findMany({
    where: {
      targetEntityId,
      organizationId,
      isActive: true,
    },
    include: {
      sourceEntity: { select: { id: true, name: true, operatorType: true } },
      targetEntity: { select: { id: true, name: true, operatorType: true } },
    },
  }) as unknown as DependencyRecord[];
}

function buildNarrative(
  targetName: string,
  targetType: string,
  sourceName: string,
  sourceType: string,
  dependencyType: string,
  propagatedDelta: number,
  affectedModules: string[],
): string {
  const direction = propagatedDelta < 0 ? "reduces" : "improves";
  const moduleStr =
    affectedModules.length > 0
      ? ` ${affectedModules.join(", ")} module(s)`
      : " compliance";
  return (
    `${targetName} (${targetType}) ${dependencyType.replace(/_/g, " ").toLowerCase()} impact ` +
    `${direction} ${sourceName} (${sourceType})${moduleStr} by ${Math.abs(propagatedDelta)} points`
  );
}
