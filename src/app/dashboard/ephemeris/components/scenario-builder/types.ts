// ─── Ephemeris Forge Types ───────────────────────────────────────────────────

import type { Node, Edge } from "@xyflow/react";

// Re-export result types from computation hook (will be created in Task 4)
// For now, define inline to avoid circular dependency
export interface StepResult {
  blockInstanceId: string;
  scenarioType: string;
  baselineHorizon: number;
  projectedHorizon: number;
  horizonDelta: number;
  affectedRegulations: Array<{
    regulationRef: string;
    statusBefore: string;
    statusAfter: string;
    crossingDateBefore: string | null;
    crossingDateAfter: string | null;
  }>;
  fuelImpact: { before: number; after: number; delta: number } | null;
  recommendation: string;
  severityLevel?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  moduleImpacts?: Array<{
    moduleKey: string;
    statusBefore: string;
    statusAfter: string;
    scoreDelta: number;
  }>;
  costEstimate?: {
    fuelKg?: number;
    financialUsd?: number;
    description?: string;
  };
  confidenceBand?: {
    optimistic: number;
    pessimistic: number;
  };
  timelineProjection?: Array<{
    monthOffset: number;
    baselineScore: number;
    projectedScore: number;
  }>;
}

export interface SimulationResults {
  stepResults: StepResult[];
  totalHorizonDelta: number;
  totalFuelDelta: number;
  allAffectedRegulations: Array<{
    regulationRef: string;
    statusBefore: string;
    statusAfter: string;
    crossingDateBefore: string | null;
    crossingDateAfter: string | null;
  }>;
  finalRecommendation: string;
  overallSeverity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  totalCostEstimate: { fuelKg: number; financialUsd: number };
}

// ─── Category Colors ──────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  orbital: "#3B82F6",
  hardware: "#F59E0B",
  environment: "#06B6D4",
  communication: "#8B5CF6",
  regulatory: "#10B981",
  operational: "#EC4899",
  financial: "#EF4444",
  launch_operations: "#3B82F6",
  vehicle_anomalies: "#F59E0B",
  range_environment: "#06B6D4",
  launch_regulatory: "#10B981",
};

// ─── Compute State ────────────────────────────────────────────────────────────

export type ComputeState = "idle" | "computing" | "done" | "error";

// ─── Node Data Types ──────────────────────────────────────────────────────────

export interface SatelliteOriginData {
  satelliteName: string;
  noradId: string;
  overallScore: number | null;
  riskCategory: string | null;
  horizonDays: number | null;
  horizonRegulation: string | null;
  weakestModule: string | null;
  showHint?: boolean;
}

export interface ScenarioNodeData {
  definitionId: string;
  parameters: Record<string, unknown>;
  computeState: ComputeState;
  stepResult: StepResult | null;
}

export interface ResultNodeData {
  chainId: string;
  aggregatedResult: SimulationResults | null;
  computeState: ComputeState;
}

// ─── Edge Data ────────────────────────────────────────────────────────────────

export type EdgeSeverity =
  | "nominal"
  | "warning"
  | "critical"
  | "computing"
  | null;

export interface ForgeEdgeData {
  severity: EdgeSeverity;
  horizonDelta: number | null;
}

// ─── Serialization (Save/Load) ────────────────────────────────────────────────

export interface SavedScenario {
  id: string;
  name: string;
  createdAt: string;
  noradId: string;
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: Record<string, unknown>;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
  }>;
}

// ─── Forge Node Type IDs ──────────────────────────────────────────────────────

export const FORGE_NODE_TYPES = {
  ORIGIN: "satellite-origin",
  SCENARIO: "scenario",
  RESULT: "result",
} as const;

// ─── Chain type ───────────────────────────────────────────────────────────────

export interface Chain {
  id: string;
  nodeIds: string[];
  resultNodeId: string | null;
}

// ─── Type aliases for React Flow typed nodes/edges ────────────────────────────

export type ForgeNode = Node;
export type ForgeEdge = Edge;
