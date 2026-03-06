// ═══════════════════════════════════════════════════════════════════════════════
// CASCADE ENGINE — Regulatory Dependency Graph
// ═══════════════════════════════════════════════════════════════════════════════
//
// Models cross-regulatory dependencies as a DAG. When a regulation changes,
// BFS propagation identifies all downstream impacts across frameworks
// and calculates aggregate score deltas per satellite.
//
// Example: EU-SA-54 changes → EU-SA-52 affected → DE-WRG-12 affected →
//          4 satellites must be re-assessed → Score delta: -12 avg
// ═══════════════════════════════════════════════════════════════════════════════

import type { ModuleKey, AlertSeverity } from "../core/types";

// ─── Types ──────────────────────────────────────────────────────────────────

export type RegulatoryFramework =
  | "EU Space Act"
  | "NIS2"
  | "IADC"
  | "DE-SatDSiG"
  | "FR-LOS"
  | "UK-SIA"
  | "NO-SpaceAct"
  | "ITU-RR";

export type ChangeType =
  | "threshold_change"
  | "new_requirement"
  | "deadline_change"
  | "repeal";

export interface RegulatoryNode {
  id: string;
  framework: RegulatoryFramework;
  article: string;
  title: string;
  dependencies: string[]; // IDs of nodes that THIS node depends on (upstream)
  dependents: string[]; // IDs of nodes affected when THIS node changes (downstream)
  affectedModules: ModuleKey[];
  defaultImpact: number; // Base score impact when triggered (negative = worse)
}

export interface SatelliteImpact {
  noradId: string;
  name: string;
  affectedModules: ModuleKey[];
  scoreDelta: number;
  currentScore: number | null;
  projectedScore: number | null;
  severity: AlertSeverity;
}

export interface CascadeResult {
  trigger: string;
  changeType: ChangeType;
  affectedNodes: string[];
  affectedSatellites: SatelliteImpact[];
  totalImpact: number;
  propagationPath: string[][];
  timestamp: string;
}

export interface CascadeInput {
  regulatoryNodeId: string;
  changeType: ChangeType;
  parameters?: {
    newThreshold?: number;
    oldThreshold?: number;
    newDeadline?: string;
    impactMultiplier?: number;
  };
}

// ─── Regulatory Node Registry ───────────────────────────────────────────────
//
// Built from the 8 existing regulatory frameworks. Each node captures:
// - Which framework/article it belongs to
// - What Caelex modules it affects
// - What other nodes it depends on / what depends on it
// - Base impact score when triggered

const REGULATORY_NODES: RegulatoryNode[] = [
  // ── EU Space Act: Debris & End-of-Life ──
  {
    id: "EU-SA-68",
    framework: "EU Space Act",
    article: "Art. 68",
    title: "25-Year Orbital Lifetime Limit",
    dependencies: ["EU-SA-64"],
    dependents: ["EU-SA-70", "EU-SA-72", "IADC-5.3.1"],
    affectedModules: ["orbital"],
    defaultImpact: -15,
  },
  {
    id: "EU-SA-70",
    framework: "EU Space Act",
    article: "Art. 70",
    title: "End-of-Life Passivation Readiness",
    dependencies: ["EU-SA-68"],
    dependents: ["EU-SA-72"],
    affectedModules: ["fuel"],
    defaultImpact: -10,
  },
  {
    id: "EU-SA-72",
    framework: "EU Space Act",
    article: "Art. 72",
    title: "End-of-Life Disposal Capability",
    dependencies: ["EU-SA-68", "EU-SA-70", "EU-SA-96"],
    dependents: ["DE-WRG-12", "FR-LOS-7"],
    affectedModules: ["fuel", "orbital"],
    defaultImpact: -12,
  },
  {
    id: "EU-SA-64",
    framework: "EU Space Act",
    article: "Art. 64",
    title: "Collision Avoidance Capability",
    dependencies: [],
    dependents: ["EU-SA-68", "IADC-5.3.1"],
    affectedModules: ["orbital", "subsystems"],
    defaultImpact: -20,
  },

  // ── EU Space Act: Authorization & Supervision ──
  {
    id: "EU-SA-6",
    framework: "EU Space Act",
    article: "Art. 6-16",
    title: "Authorization & Licensing",
    dependencies: [],
    dependents: ["EU-SA-26", "EU-SA-44", "DE-WRG-3", "FR-LOS-1", "UK-SIA-3"],
    affectedModules: ["registration"],
    defaultImpact: -25,
  },
  {
    id: "EU-SA-24",
    framework: "EU Space Act",
    article: "Art. 24",
    title: "URSO Registration",
    dependencies: ["EU-SA-6"],
    dependents: ["DE-WRG-5", "NO-SA-4"],
    affectedModules: ["registration"],
    defaultImpact: -10,
  },
  {
    id: "EU-SA-26",
    framework: "EU Space Act",
    article: "Art. 26-31",
    title: "Supervision & Reporting",
    dependencies: ["EU-SA-6"],
    dependents: [],
    affectedModules: ["documentation"],
    defaultImpact: -8,
  },
  {
    id: "EU-SA-44",
    framework: "EU Space Act",
    article: "Art. 44-51",
    title: "Insurance & Liability",
    dependencies: ["EU-SA-6"],
    dependents: ["FR-LOS-5", "UK-SIA-12"],
    affectedModules: ["insurance"],
    defaultImpact: -15,
  },

  // ── EU Space Act: Cybersecurity ──
  {
    id: "EU-SA-74",
    framework: "EU Space Act",
    article: "Art. 74-95",
    title: "Cybersecurity Requirements",
    dependencies: [],
    dependents: ["NIS2-21", "DE-SatDSiG-4"],
    affectedModules: ["cyber"],
    defaultImpact: -18,
  },

  // ── EU Space Act: Environmental ──
  {
    id: "EU-SA-96",
    framework: "EU Space Act",
    article: "Art. 96-100",
    title: "Environmental Footprint",
    dependencies: [],
    dependents: ["EU-SA-72"],
    affectedModules: ["ground"],
    defaultImpact: -8,
  },

  // ── NIS2 Directive ──
  {
    id: "NIS2-21",
    framework: "NIS2",
    article: "Art. 21",
    title: "Cybersecurity Risk Management Measures",
    dependencies: ["EU-SA-74"],
    dependents: ["NIS2-23", "DE-SatDSiG-4"],
    affectedModules: ["cyber"],
    defaultImpact: -15,
  },
  {
    id: "NIS2-23",
    framework: "NIS2",
    article: "Art. 23",
    title: "Incident Reporting Obligations",
    dependencies: ["NIS2-21"],
    dependents: [],
    affectedModules: ["cyber", "documentation"],
    defaultImpact: -10,
  },

  // ── IADC Guidelines ──
  {
    id: "IADC-5.3.1",
    framework: "IADC",
    article: "Guideline 5.3.1",
    title: "Passivation Fuel Reserve",
    dependencies: ["EU-SA-64", "EU-SA-68"],
    dependents: [],
    affectedModules: ["fuel"],
    defaultImpact: -8,
  },

  // ── Germany: SatDSiG ──
  {
    id: "DE-SatDSiG-4",
    framework: "DE-SatDSiG",
    article: "§4",
    title: "Satellite Data Security",
    dependencies: ["EU-SA-74", "NIS2-21"],
    dependents: [],
    affectedModules: ["cyber"],
    defaultImpact: -10,
  },
  {
    id: "DE-WRG-3",
    framework: "DE-SatDSiG",
    article: "§3 WRG",
    title: "German Operator License",
    dependencies: ["EU-SA-6", "ITU-RR-22"],
    dependents: ["DE-WRG-5"],
    affectedModules: ["registration"],
    defaultImpact: -12,
  },
  {
    id: "DE-WRG-5",
    framework: "DE-SatDSiG",
    article: "§5 WRG",
    title: "German Registry Obligation",
    dependencies: ["EU-SA-24", "DE-WRG-3"],
    dependents: [],
    affectedModules: ["registration"],
    defaultImpact: -5,
  },
  {
    id: "DE-WRG-12",
    framework: "DE-SatDSiG",
    article: "§12 WRG",
    title: "German Disposal Requirements",
    dependencies: ["EU-SA-72"],
    dependents: [],
    affectedModules: ["fuel", "orbital"],
    defaultImpact: -10,
  },

  // ── France: Loi Opérations Spatiales ──
  {
    id: "FR-LOS-1",
    framework: "FR-LOS",
    article: "Art. 1-4",
    title: "French Authorization",
    dependencies: ["EU-SA-6"],
    dependents: ["FR-LOS-5", "FR-LOS-7"],
    affectedModules: ["registration"],
    defaultImpact: -12,
  },
  {
    id: "FR-LOS-5",
    framework: "FR-LOS",
    article: "Art. 5-6",
    title: "French Third-Party Liability",
    dependencies: ["EU-SA-44", "FR-LOS-1"],
    dependents: [],
    affectedModules: ["insurance"],
    defaultImpact: -10,
  },
  {
    id: "FR-LOS-7",
    framework: "FR-LOS",
    article: "Art. 7",
    title: "French Technical Compliance (CNES)",
    dependencies: ["EU-SA-72", "FR-LOS-1"],
    dependents: [],
    affectedModules: ["orbital", "fuel", "subsystems"],
    defaultImpact: -8,
  },

  // ── UK: Space Industry Act 2018 ──
  {
    id: "UK-SIA-3",
    framework: "UK-SIA",
    article: "s.3",
    title: "UK Operator Licence",
    dependencies: ["EU-SA-6"],
    dependents: ["UK-SIA-12"],
    affectedModules: ["registration"],
    defaultImpact: -12,
  },
  {
    id: "UK-SIA-12",
    framework: "UK-SIA",
    article: "s.12",
    title: "UK Third-Party Liability Insurance",
    dependencies: ["EU-SA-44", "UK-SIA-3"],
    dependents: [],
    affectedModules: ["insurance"],
    defaultImpact: -10,
  },

  // ── Norway: Space Act ──
  {
    id: "NO-SA-4",
    framework: "NO-SpaceAct",
    article: "§4",
    title: "Norwegian Registration",
    dependencies: ["EU-SA-24"],
    dependents: [],
    affectedModules: ["registration"],
    defaultImpact: -5,
  },

  // ── ITU Radio Regulations ──
  {
    id: "ITU-RR-22",
    framework: "ITU-RR",
    article: "Art. 22",
    title: "ITU Frequency Coordination",
    dependencies: [],
    dependents: ["DE-WRG-3"],
    affectedModules: ["ground"],
    defaultImpact: -8,
  },
];

// ─── Graph Engine ───────────────────────────────────────────────────────────

export class RegulatoryDependencyGraph {
  private nodes: Map<string, RegulatoryNode>;

  constructor(nodes?: RegulatoryNode[]) {
    this.nodes = new Map();
    for (const node of nodes ?? REGULATORY_NODES) {
      this.nodes.set(node.id, node);
    }
  }

  /** Get a node by ID */
  getNode(id: string): RegulatoryNode | undefined {
    return this.nodes.get(id);
  }

  /** Get all node IDs */
  getAllNodeIds(): string[] {
    return Array.from(this.nodes.keys());
  }

  /** Get all nodes */
  getAllNodes(): RegulatoryNode[] {
    return Array.from(this.nodes.values());
  }

  /** Get nodes filtered by framework */
  getNodesByFramework(framework: RegulatoryFramework): RegulatoryNode[] {
    return this.getAllNodes().filter((n) => n.framework === framework);
  }

  /** Get nodes that affect a given module */
  getNodesByModule(module: ModuleKey): RegulatoryNode[] {
    return this.getAllNodes().filter((n) => n.affectedModules.includes(module));
  }

  /**
   * BFS propagation: Given a trigger node, find all downstream affected nodes.
   * Returns nodes in propagation order (waves), not just flat list.
   *
   * The propagation follows `dependents` edges (downstream direction):
   *   trigger → direct dependents → their dependents → ...
   */
  propagate(
    triggerId: string,
    changeType: ChangeType,
    impactMultiplier: number = 1.0,
  ): {
    affectedNodes: string[];
    propagationPath: string[][];
    moduleImpacts: Map<ModuleKey, number>;
    totalImpact: number;
  } {
    const trigger = this.nodes.get(triggerId);
    if (!trigger) {
      return {
        affectedNodes: [],
        propagationPath: [],
        moduleImpacts: new Map(),
        totalImpact: 0,
      };
    }

    const visited = new Set<string>([triggerId]);
    const propagationPath: string[][] = [[triggerId]];
    const moduleImpacts = new Map<ModuleKey, number>();

    // Seed with trigger node's impact
    const changeMultiplier = getChangeTypeMultiplier(changeType);
    const triggerImpact =
      trigger.defaultImpact * impactMultiplier * changeMultiplier;

    for (const mod of trigger.affectedModules) {
      moduleImpacts.set(mod, (moduleImpacts.get(mod) ?? 0) + triggerImpact);
    }

    // BFS: process level by level
    let currentLevel = [triggerId];

    while (currentLevel.length > 0) {
      const nextLevel: string[] = [];

      for (const nodeId of currentLevel) {
        const node = this.nodes.get(nodeId);
        if (!node) continue;

        for (const depId of node.dependents) {
          if (visited.has(depId)) continue;
          visited.add(depId);

          const depNode = this.nodes.get(depId);
          if (!depNode) continue;

          nextLevel.push(depId);

          // Cascade attenuation: each level reduces impact by 40%
          const depth = propagationPath.length;
          const attenuation = Math.pow(0.6, depth);
          const nodeImpact =
            depNode.defaultImpact *
            impactMultiplier *
            changeMultiplier *
            attenuation;

          for (const mod of depNode.affectedModules) {
            moduleImpacts.set(mod, (moduleImpacts.get(mod) ?? 0) + nodeImpact);
          }
        }
      }

      if (nextLevel.length > 0) {
        propagationPath.push(nextLevel);
      }

      currentLevel = nextLevel;
    }

    // All affected = everything except the trigger itself
    const affectedNodes = Array.from(visited);
    affectedNodes.shift(); // Remove trigger

    const totalImpact = Array.from(moduleImpacts.values()).reduce(
      (sum, v) => sum + v,
      0,
    );

    return { affectedNodes, propagationPath, moduleImpacts, totalImpact };
  }

  /**
   * Calculate per-satellite impact from a cascade propagation.
   */
  calculateSatelliteImpacts(
    propagation: ReturnType<typeof this.propagate>,
    satellites: Array<{
      noradId: string;
      name: string;
      jurisdictions: string[];
      currentScore: number | null;
      moduleScores: Partial<Record<ModuleKey, number>>;
    }>,
  ): SatelliteImpact[] {
    const { moduleImpacts } = propagation;

    return satellites.map((sat) => {
      let scoreDelta = 0;
      const affectedModules: ModuleKey[] = [];

      for (const [mod, impact] of moduleImpacts) {
        // Check if satellite has this module scored
        const currentModuleScore = sat.moduleScores[mod];
        if (currentModuleScore !== undefined) {
          scoreDelta += impact;
          affectedModules.push(mod);
        }
      }

      // Round to 1 decimal
      scoreDelta = Math.round(scoreDelta * 10) / 10;

      const projectedScore =
        sat.currentScore !== null
          ? Math.max(0, Math.min(100, sat.currentScore + scoreDelta))
          : null;

      return {
        noradId: sat.noradId,
        name: sat.name,
        affectedModules,
        scoreDelta,
        currentScore: sat.currentScore,
        projectedScore,
        severity: scoreDeltaToSeverity(scoreDelta),
      };
    });
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getChangeTypeMultiplier(changeType: ChangeType): number {
  switch (changeType) {
    case "new_requirement":
      return 1.2;
    case "threshold_change":
      return 1.0;
    case "deadline_change":
      return 0.8;
    case "repeal":
      return 0.5; // Repeal generally reduces burden
    default:
      return 1.0;
  }
}

function scoreDeltaToSeverity(delta: number): AlertSeverity {
  const absDelta = Math.abs(delta);
  if (absDelta >= 20) return "CRITICAL";
  if (absDelta >= 10) return "HIGH";
  if (absDelta >= 5) return "MEDIUM";
  return "LOW";
}

// ─── Singleton ──────────────────────────────────────────────────────────────

let _defaultGraph: RegulatoryDependencyGraph | null = null;

export function getDefaultGraph(): RegulatoryDependencyGraph {
  if (!_defaultGraph) {
    _defaultGraph = new RegulatoryDependencyGraph();
  }
  return _defaultGraph;
}

export { REGULATORY_NODES };
