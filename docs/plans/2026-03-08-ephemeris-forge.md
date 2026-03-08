# Ephemeris Forge Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the linear 3-panel Scenario Builder with a spatial node-graph canvas ("Ephemeris Forge") using React Flow, featuring real-time auto-computation, branching scenarios, animated edges, and a fullscreen light-mode experience.

**Architecture:** `@xyflow/react` provides the canvas, panning, zooming, node dragging, edge rendering, and minimap. We wrap it with custom node types (SatelliteOriginNode, ScenarioNode, ResultNode), a custom animated edge (ForgeEdge), and overlay components (toolbar, radial menu, slash command). Two hooks manage state: `useForgeGraph` (nodes/edges CRUD + DAG chain detection) and `useForgeComputation` (debounced auto-compute per chain via existing `/api/v1/ephemeris/what-if` API).

**Tech Stack:** React 18, Next.js 15, `@xyflow/react` (new dependency), Lucide icons, IBM Plex Mono font, existing `block-definitions.ts` (55 blocks unchanged), existing what-if API (unchanged).

**Design Doc:** `docs/plans/2026-03-08-ephemeris-forge-design.md`

---

## Task 1: Install @xyflow/react

**Files:**

- Modify: `package.json`

**Step 1: Install the dependency**

Run:

```bash
npm install @xyflow/react
```

**Step 2: Verify installation**

Run:

```bash
npm ls @xyflow/react
```

Expected: Shows `@xyflow/react@<version>` under dependencies.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @xyflow/react for Ephemeris Forge node graph canvas"
```

---

## Task 2: Types & Theme Foundation

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/types.ts`
- Modify: `src/app/dashboard/ephemeris/theme.ts`

**Step 1: Create types.ts**

This file defines all Forge-specific types. It reuses `StepResult` and `SimulationResults` from the existing hook (which will be preserved as types even though the hook is replaced), and `BlockDefinition`/`PipelineBlockInstance` from `block-definitions.ts`.

```typescript
// types.ts
import type { StepResult, SimulationResults } from "./useForgeComputation";

// ─── Category Colors ──────────────────────────────────────────────────────────

export const CATEGORY_COLORS: Record<string, string> = {
  orbital: "#3B82F6",
  hardware: "#F59E0B",
  environment: "#06B6D4",
  communication: "#8B5CF6",
  regulatory: "#10B981",
  operational: "#EC4899",
  financial: "#EF4444",
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
```

**Step 2: Add Forge theme tokens to theme.ts**

Add `FORGE` palette and `useForgeTheme` hook at the bottom of the existing `theme.ts` file. Do NOT modify the existing `DARK`, `LIGHT`, or `useEphemerisTheme` — other Ephemeris pages still use them.

Append to `src/app/dashboard/ephemeris/theme.ts`:

```typescript
// ─── Forge Theme (always light) ─────────────────────────────────────────────

export const FORGE = {
  canvasBg: "#FAFBFC",
  gridDot: "#E2E8F0",
  nodeBg: "#FFFFFF",
  nodeBorder: "#E2E8F0",
  nodeBorderHover: "#CBD5E1",
  nodeShadow: "0 1px 3px rgba(0,0,0,0.06)",
  nodeShadowHover: "0 4px 12px rgba(0,0,0,0.1)",
  toolbarBg: "rgba(255,255,255,0.88)",
  toolbarBorder: "#E2E8F0",
  toolbarShadow: "0 1px 3px rgba(0,0,0,0.06)",
  textPrimary: "#0F172A",
  textSecondary: "#334155",
  textTertiary: "#64748B",
  textMuted: "#94A3B8",
  originBorder: "#10B981",
  originGlow: "0 0 0 3px rgba(16,185,129,0.15)",
  edgeNominal: "#10B981",
  edgeWarning: "#F59E0B",
  edgeCritical: "#EF4444",
  edgeComputing: "#94A3B8",
  edgeIdle: "#CBD5E1",
  nominal: "#16A34A",
  warning: "#EA580C",
  critical: "#DC2626",
  watch: "#CA8A04",
  accent: "#2563EB",
} as const;

export type ForgeColors = typeof FORGE;

export function useForgeTheme(): ForgeColors {
  return FORGE;
}
```

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/types.ts src/app/dashboard/ephemeris/theme.ts
git commit -m "feat(forge): add Forge types and light-mode theme tokens"
```

---

## Task 3: useForgeGraph — Graph State Hook

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/useForgeGraph.ts`

**Step 1: Create useForgeGraph.ts**

This hook manages all graph state: nodes, edges, CRUD operations, auto ResultNode management, chain detection for computation, undo/redo, and serialization.

Key behaviors:

- Initializes with a single SatelliteOriginNode at `{x: 100, y: 300}`
- `addScenarioNode(position, definitionId)` creates a ScenarioNode with default params from `block-definitions.ts`
- After every node/edge mutation, runs `updateResultNodes()` which:
  - Finds all nodes with an output but no outgoing edge → appends a ResultNode 250px to the right
  - Removes ResultNodes that now have an outgoing edge (user connected something past them)
- `getChains()` walks the DAG from the origin node, returning each linear path as an ordered array of node IDs. Branches create parallel chains.
- Undo/redo via a state history stack (max 50 entries). Every mutation pushes `{nodes, edges}` snapshot.
- Save/load serializes to `SavedScenario` JSON.

```typescript
"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import type { Node, Edge, Connection } from "@xyflow/react";
import {
  BLOCK_DEFINITIONS,
  getDefaultParameters,
  type BlockDefinition,
} from "./block-definitions";
import {
  FORGE_NODE_TYPES,
  CATEGORY_COLORS,
  type SatelliteOriginData,
  type ScenarioNodeData,
  type ResultNodeData,
  type ForgeEdgeData,
  type SavedScenario,
} from "./types";

// ─── ID Generators ────────────────────────────────────────────────────────────

let _nodeCounter = 0;
function nextNodeId(prefix: string) {
  _nodeCounter += 1;
  return `${prefix}-${Date.now()}-${_nodeCounter}`;
}

let _edgeCounter = 0;
function nextEdgeId() {
  _edgeCounter += 1;
  return `edge-${Date.now()}-${_edgeCounter}`;
}

// ─── Initial Nodes ────────────────────────────────────────────────────────────

const ORIGIN_NODE_ID = "satellite-origin";

function createOriginNode(data: SatelliteOriginData): Node {
  return {
    id: ORIGIN_NODE_ID,
    type: FORGE_NODE_TYPES.ORIGIN,
    position: { x: 100, y: 300 },
    data,
    deletable: false,
    draggable: true,
  };
}

// ─── Chain Detection ──────────────────────────────────────────────────────────

export interface Chain {
  id: string;
  nodeIds: string[]; // ordered from origin → ... → result (scenario nodes only)
  resultNodeId: string | null;
}

function detectChains(nodes: Node[], edges: Edge[]): Chain[] {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const existing = adjacency.get(edge.source) ?? [];
    existing.push(edge.target);
    adjacency.set(edge.source, existing);
  }

  const chains: Chain[] = [];
  let chainCounter = 0;

  function walk(nodeId: string, path: string[]) {
    const children = adjacency.get(nodeId) ?? [];
    if (children.length === 0) {
      // End of chain
      chainCounter += 1;
      const node = nodes.find((n) => n.id === nodeId);
      const isResult = node?.type === FORGE_NODE_TYPES.RESULT;
      chains.push({
        id: `chain-${chainCounter}`,
        nodeIds: path.filter((id) => {
          const n = nodes.find((nd) => nd.id === id);
          return n?.type === FORGE_NODE_TYPES.SCENARIO;
        }),
        resultNodeId: isResult ? nodeId : null,
      });
      return;
    }
    for (const childId of children) {
      walk(childId, [...path, childId]);
    }
  }

  walk(ORIGIN_NODE_ID, [ORIGIN_NODE_ID]);
  return chains;
}

// ─── Auto Result Node Management ──────────────────────────────────────────────

function updateResultNodes(
  nodes: Node[],
  edges: Edge[],
): { nodes: Node[]; edges: Edge[] } {
  const sourcesWithEdges = new Set(edges.map((e) => e.source));
  let updatedNodes = [...nodes];
  let updatedEdges = [...edges];

  // Remove result nodes that now have outgoing edges
  const resultNodesWithOutput = updatedNodes.filter(
    (n) => n.type === FORGE_NODE_TYPES.RESULT && sourcesWithEdges.has(n.id),
  );
  const removeIds = new Set(resultNodesWithOutput.map((n) => n.id));
  if (removeIds.size > 0) {
    updatedNodes = updatedNodes.filter((n) => !removeIds.has(n.id));
    updatedEdges = updatedEdges.filter(
      (e) => !removeIds.has(e.source) && !removeIds.has(e.target),
    );
  }

  // Find terminal nodes that need result nodes
  const nodesWithOutgoing = new Set(updatedEdges.map((e) => e.source));
  const terminalNodes = updatedNodes.filter(
    (n) =>
      n.type !== FORGE_NODE_TYPES.RESULT &&
      n.id !== ORIGIN_NODE_ID &&
      !nodesWithOutgoing.has(n.id),
  );

  // Also add result for origin if it has outgoing edges but no chain continues
  // (origin with direct connections that lead to terminal scenario nodes)

  for (const terminal of terminalNodes) {
    // Check if there's already a result node connected to this terminal
    const hasResult = updatedEdges.some(
      (e) =>
        e.source === terminal.id &&
        updatedNodes.find((n) => n.id === e.target)?.type ===
          FORGE_NODE_TYPES.RESULT,
    );
    if (hasResult) continue;

    const resultId = nextNodeId("result");
    const resultNode: Node = {
      id: resultId,
      type: FORGE_NODE_TYPES.RESULT,
      position: {
        x: terminal.position.x + 280,
        y: terminal.position.y,
      },
      data: {
        chainId: resultId,
        aggregatedResult: null,
        computeState: "idle",
      } satisfies ResultNodeData,
      deletable: false,
      draggable: true,
    };
    const resultEdge: Edge = {
      id: nextEdgeId(),
      source: terminal.id,
      target: resultId,
      type: "forge-edge",
      data: { severity: null, horizonDelta: null } satisfies ForgeEdgeData,
    };

    updatedNodes.push(resultNode);
    updatedEdges.push(resultEdge);
  }

  // Handle origin with no outgoing edges: add a single result node
  if (!nodesWithOutgoing.has(ORIGIN_NODE_ID) && updatedNodes.length === 1) {
    // No scenario nodes at all — don't add result
  }

  return { nodes: updatedNodes, edges: updatedEdges };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseForgeGraphOptions {
  originData: SatelliteOriginData;
}

export function useForgeGraph({ originData }: UseForgeGraphOptions) {
  const [nodes, setNodes] = useState<Node[]>(() => [
    createOriginNode(originData),
  ]);
  const [edges, setEdges] = useState<Edge[]>([]);

  // Undo/redo
  const historyRef = useRef<Array<{ nodes: Node[]; edges: Edge[] }>>([]);
  const historyIndexRef = useRef(-1);
  const maxHistory = 50;

  const pushHistory = useCallback(() => {
    // Trim future states if we've undone
    historyRef.current = historyRef.current.slice(
      0,
      historyIndexRef.current + 1,
    );
    historyRef.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
    });
    if (historyRef.current.length > maxHistory) {
      historyRef.current.shift();
    }
    historyIndexRef.current = historyRef.current.length - 1;
  }, [nodes, edges]);

  const applyMutation = useCallback(
    (
      mutateFn: (
        prevNodes: Node[],
        prevEdges: Edge[],
      ) => { nodes: Node[]; edges: Edge[] },
    ) => {
      setNodes((prevNodes) => {
        setEdges((prevEdges) => {
          // Push current state to history before mutation
          historyRef.current = historyRef.current.slice(
            0,
            historyIndexRef.current + 1,
          );
          historyRef.current.push({
            nodes: structuredClone(prevNodes),
            edges: structuredClone(prevEdges),
          });
          if (historyRef.current.length > maxHistory) {
            historyRef.current.shift();
          }
          historyIndexRef.current = historyRef.current.length - 1;

          const mutated = mutateFn(prevNodes, prevEdges);
          const result = updateResultNodes(mutated.nodes, mutated.edges);

          // We set nodes via the outer setNodes return
          // and edges here
          return result.edges;
        });
        // This runs first but needs coordinated — use ref pattern instead
        return nodes; // placeholder, real impl below
      });
    },
    [],
  );

  // Simpler approach: use coordinated state updates
  const mutateGraph = useCallback(
    (
      mutateFn: (
        prevNodes: Node[],
        prevEdges: Edge[],
      ) => { nodes: Node[]; edges: Edge[] },
    ) => {
      // Save history snapshot
      pushHistory();

      setNodes((prevNodes) => {
        // We need edges too — use a ref to coordinate
        return prevNodes; // will be overridden below
      });

      // Use functional updater that captures both states
      setNodes((prevNodes) => {
        setEdges((prevEdges) => {
          const mutated = mutateFn(prevNodes, prevEdges);
          const result = updateResultNodes(mutated.nodes, mutated.edges);
          // Schedule nodes update
          setTimeout(() => setNodes(result.nodes), 0);
          return result.edges;
        });
        return prevNodes;
      });
    },
    [pushHistory],
  );

  // ── CRUD ────────────────────────────────────────────────────────────────────

  const addScenarioNode = useCallback(
    (position: { x: number; y: number }, definitionId: string) => {
      const def = BLOCK_DEFINITIONS.find((d) => d.id === definitionId);
      if (!def) return;

      const nodeId = nextNodeId("scenario");
      const newNode: Node = {
        id: nodeId,
        type: FORGE_NODE_TYPES.SCENARIO,
        position,
        data: {
          definitionId,
          parameters: getDefaultParameters(def),
          computeState: "idle",
          stepResult: null,
        } satisfies ScenarioNodeData,
      };

      pushHistory();
      setNodes((prev) => {
        const updated = [...prev, newNode];
        return updateResultNodes(updated, edges).nodes;
      });
      setEdges((prev) => updateResultNodes([...nodes, newNode], prev).edges);
    },
    [nodes, edges, pushHistory],
  );

  const removeNode = useCallback(
    (nodeId: string) => {
      if (nodeId === ORIGIN_NODE_ID) return; // can't delete origin
      pushHistory();
      setEdges((prevEdges) => {
        const filtered = prevEdges.filter(
          (e) => e.source !== nodeId && e.target !== nodeId,
        );
        setNodes((prevNodes) => {
          const filteredNodes = prevNodes.filter((n) => n.id !== nodeId);
          const result = updateResultNodes(filteredNodes, filtered);
          setTimeout(() => setEdges(result.edges), 0);
          return result.nodes;
        });
        return filtered;
      });
    },
    [pushHistory],
  );

  const updateNodeParams = useCallback(
    (nodeId: string, params: Record<string, unknown>) => {
      pushHistory();
      setNodes((prev) =>
        prev.map((n) => {
          if (n.id !== nodeId || n.type !== FORGE_NODE_TYPES.SCENARIO) return n;
          const data = n.data as ScenarioNodeData;
          return {
            ...n,
            data: {
              ...data,
              parameters: { ...data.parameters, ...params },
              computeState: "idle" as const,
              stepResult: null,
            },
          };
        }),
      );
    },
    [pushHistory],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      pushHistory();
      const newEdge: Edge = {
        id: nextEdgeId(),
        source: connection.source,
        target: connection.target,
        type: "forge-edge",
        data: { severity: null, horizonDelta: null } satisfies ForgeEdgeData,
      };
      setEdges((prev) => {
        const updated = [...prev, newEdge];
        setNodes((prevNodes) => {
          const result = updateResultNodes(prevNodes, updated);
          setTimeout(() => setEdges(result.edges), 0);
          return result.nodes;
        });
        return updated;
      });
    },
    [pushHistory],
  );

  const onNodesChange = useCallback(
    (changes: import("@xyflow/react").NodeChange[]) => {
      // Handle position changes from React Flow's built-in dragging
      setNodes((prev) => {
        const { applyNodeChanges } = require("@xyflow/react");
        return applyNodeChanges(changes, prev);
      });
    },
    [],
  );

  const onEdgesChange = useCallback(
    (changes: import("@xyflow/react").EdgeChange[]) => {
      setEdges((prev) => {
        const { applyEdgeChanges } = require("@xyflow/react");
        return applyEdgeChanges(changes, prev);
      });
    },
    [],
  );

  // ── Undo / Redo ─────────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    if (historyIndexRef.current < 0) return;
    const state = historyRef.current[historyIndexRef.current];
    if (!state) return;
    historyIndexRef.current -= 1;
    setNodes(state.nodes);
    setEdges(state.edges);
  }, []);

  const redo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1) return;
    historyIndexRef.current += 1;
    const state = historyRef.current[historyIndexRef.current];
    if (!state) return;
    setNodes(state.nodes);
    setEdges(state.edges);
  }, []);

  // ── Chain Detection ─────────────────────────────────────────────────────────

  const chains = useMemo(() => detectChains(nodes, edges), [nodes, edges]);

  // ── Reset ───────────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    pushHistory();
    setNodes([createOriginNode(originData)]);
    setEdges([]);
  }, [originData, pushHistory]);

  // ── Serialization ───────────────────────────────────────────────────────────

  const serialize = useCallback(
    (name: string): SavedScenario => ({
      id: `saved-${Date.now()}`,
      name,
      createdAt: new Date().toISOString(),
      noradId: originData.noradId,
      nodes: nodes
        .filter((n) => n.type === FORGE_NODE_TYPES.SCENARIO)
        .map((n) => ({
          id: n.id,
          type: n.type!,
          position: n.position,
          data: n.data as Record<string, unknown>,
        })),
      edges: edges
        .filter((e) => {
          // Only save user-created edges (not auto result edges)
          const target = nodes.find((n) => n.id === e.target);
          return target?.type !== FORGE_NODE_TYPES.RESULT;
        })
        .map((e) => ({
          id: e.id,
          source: e.source,
          target: e.target,
        })),
    }),
    [nodes, edges, originData],
  );

  const deserialize = useCallback(
    (saved: SavedScenario) => {
      pushHistory();
      const restoredNodes: Node[] = [
        createOriginNode(originData),
        ...saved.nodes.map((n) => ({
          id: n.id,
          type: n.type,
          position: n.position,
          data: n.data,
        })),
      ];
      const restoredEdges: Edge[] = saved.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "forge-edge",
        data: { severity: null, horizonDelta: null } satisfies ForgeEdgeData,
      }));
      const result = updateResultNodes(restoredNodes, restoredEdges);
      setNodes(result.nodes);
      setEdges(result.edges);
    },
    [originData, pushHistory],
  );

  // ── Update origin when satellite state refreshes ────────────────────────────

  const updateOriginData = useCallback((data: SatelliteOriginData) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === ORIGIN_NODE_ID ? { ...n, data } : n)),
    );
  }, []);

  return {
    nodes,
    edges,
    chains,
    setNodes,
    setEdges,
    addScenarioNode,
    removeNode,
    updateNodeParams,
    onConnect,
    onNodesChange,
    onEdgesChange,
    undo,
    redo,
    reset,
    serialize,
    deserialize,
    updateOriginData,
  };
}
```

**Note:** The coordinated state update pattern above is a first pass. During implementation, consider using a single `useReducer` instead of dual `useState` for `nodes`/`edges` to avoid the timing coordination issue. The reducer receives `{ type: "ADD_NODE" | "REMOVE_NODE" | ... , payload }` actions and produces both `nodes` and `edges` in one atomic update. This is cleaner than the `setTimeout` coordination.

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/useForgeGraph.ts
git commit -m "feat(forge): add useForgeGraph hook for graph state management"
```

---

## Task 4: useForgeComputation — Auto-Compute Engine

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/useForgeComputation.ts`

**Step 1: Create useForgeComputation.ts**

This hook replaces `useScenarioSimulation.ts`. It watches for graph mutations and auto-computes after 500ms debounce. It re-exports the `StepResult` and `SimulationResults` types so existing code that imports them continues to work.

Key behaviors:

- On any change to `nodes` or `edges` arrays, debounces 500ms, then triggers computation
- Extracts chains from the graph via `chains` (from useForgeGraph)
- For each chain in parallel (`Promise.all`), walks scenario nodes sequentially, POSTing each to `/api/v1/ephemeris/what-if`
- Stores `StepResult` on each ScenarioNode's data
- Aggregates results into each chain's ResultNode
- Updates edge severity colors based on `horizonDelta`
- Uses `AbortController` to cancel in-flight requests when graph mutates during computation
- Mutation version counter ensures stale results are discarded

```typescript
"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Node, Edge } from "@xyflow/react";
import { BLOCK_DEFINITIONS } from "./block-definitions";
import { csrfHeaders } from "@/lib/csrf-client";
import {
  FORGE_NODE_TYPES,
  type ScenarioNodeData,
  type ResultNodeData,
  type ForgeEdgeData,
} from "./types";
import type { Chain } from "./useForgeGraph";

// ─── Types (re-exported for compatibility) ────────────────────────────────────

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getScenarioType(definitionId: string): string {
  const def = BLOCK_DEFINITIONS.find((d) => d.id === definitionId);
  return def?.scenarioType ?? "CUSTOM";
}

function maxSeverity(
  levels: Array<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined>,
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const order = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
  let maxIdx = 0;
  for (const level of levels) {
    if (!level) continue;
    const idx = order.indexOf(level);
    if (idx > maxIdx) maxIdx = idx;
  }
  return order[maxIdx];
}

function aggregateResults(steps: StepResult[]): SimulationResults {
  const totalHorizonDelta = steps.reduce((sum, s) => sum + s.horizonDelta, 0);
  const totalFuelDelta = steps.reduce(
    (sum, s) => sum + (s.fuelImpact?.delta ?? 0),
    0,
  );
  const regMap = new Map<string, StepResult["affectedRegulations"][0]>();
  for (const step of steps) {
    for (const reg of step.affectedRegulations) {
      regMap.set(reg.regulationRef, reg);
    }
  }
  return {
    stepResults: steps,
    totalHorizonDelta,
    totalFuelDelta,
    allAffectedRegulations: Array.from(regMap.values()),
    finalRecommendation: steps
      .map((s) => s.recommendation)
      .filter(Boolean)
      .join(" "),
    overallSeverity: maxSeverity(steps.map((s) => s.severityLevel)),
    totalCostEstimate: {
      fuelKg: steps.reduce((sum, s) => sum + (s.costEstimate?.fuelKg ?? 0), 0),
      financialUsd: steps.reduce(
        (sum, s) => sum + (s.costEstimate?.financialUsd ?? 0),
        0,
      ),
    },
  };
}

function edgeSeverityFromDelta(
  delta: number | null,
): ForgeEdgeData["severity"] {
  if (delta === null) return null;
  if (delta > 0) return "nominal";
  if (delta > -90) return "warning";
  return "critical";
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseForgeComputationOptions {
  noradId: string;
  nodes: Node[];
  edges: Edge[];
  chains: Chain[];
  setNodes: React.Dispatch<React.SetStateAction<Node[]>>;
  setEdges: React.Dispatch<React.SetStateAction<Edge[]>>;
}

export function useForgeComputation({
  noradId,
  nodes,
  edges,
  chains,
  setNodes,
  setEdges,
}: UseForgeComputationOptions) {
  const abortRef = useRef<AbortController | null>(null);
  const versionRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Count scenario nodes to know if there's anything to compute
  const scenarioNodeCount = nodes.filter(
    (n) => n.type === FORGE_NODE_TYPES.SCENARIO,
  ).length;

  // Build a fingerprint of the graph that changes when computation should retrigger
  const graphFingerprint =
    nodes
      .filter((n) => n.type === FORGE_NODE_TYPES.SCENARIO)
      .map((n) => {
        const data = n.data as ScenarioNodeData;
        return `${n.id}:${data.definitionId}:${JSON.stringify(data.parameters)}`;
      })
      .join("|") +
    "||" +
    edges.map((e) => `${e.source}->${e.target}`).join("|");

  const runComputation = useCallback(async () => {
    if (scenarioNodeCount === 0) return;

    // Cancel previous computation
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const version = ++versionRef.current;

    // Set all scenario/result nodes to computing
    setNodes((prev) =>
      prev.map((n) => {
        if (n.type === FORGE_NODE_TYPES.SCENARIO) {
          return {
            ...n,
            data: {
              ...(n.data as ScenarioNodeData),
              computeState: "computing",
              stepResult: null,
            },
          };
        }
        if (n.type === FORGE_NODE_TYPES.RESULT) {
          return {
            ...n,
            data: {
              ...(n.data as ResultNodeData),
              computeState: "computing",
              aggregatedResult: null,
            },
          };
        }
        return n;
      }),
    );
    setEdges((prev) =>
      prev.map((e) => ({
        ...e,
        data: {
          severity: "computing",
          horizonDelta: null,
        } satisfies ForgeEdgeData,
      })),
    );

    try {
      // Process each chain in parallel
      await Promise.all(
        chains.map(async (chain) => {
          if (chain.nodeIds.length === 0) return;
          if (controller.signal.aborted) return;

          const stepResults: StepResult[] = [];

          // Sequential within chain
          for (const nodeId of chain.nodeIds) {
            if (controller.signal.aborted) return;
            if (version !== versionRef.current) return; // stale

            const node = nodes.find((n) => n.id === nodeId);
            if (!node || node.type !== FORGE_NODE_TYPES.SCENARIO) continue;

            const data = node.data as ScenarioNodeData;
            const scenarioType = getScenarioType(data.definitionId);
            if (scenarioType === "CUSTOM") continue;

            const res = await fetch("/api/v1/ephemeris/what-if", {
              method: "POST",
              headers: { "Content-Type": "application/json", ...csrfHeaders() },
              body: JSON.stringify({
                norad_id: noradId,
                scenario: { type: scenarioType, parameters: data.parameters },
              }),
              signal: controller.signal,
            });

            if (!res.ok) {
              const errBody = await res.json().catch(() => ({}));
              throw new Error(
                errBody.message || errBody.error || res.statusText,
              );
            }

            const json = await res.json();
            const d = json.data;

            const stepResult: StepResult = {
              blockInstanceId: nodeId,
              scenarioType,
              baselineHorizon: d.baselineHorizon,
              projectedHorizon: d.projectedHorizon,
              horizonDelta: d.horizonDelta,
              affectedRegulations: d.affectedRegulations,
              fuelImpact: d.fuelImpact ?? null,
              recommendation: d.recommendation,
              severityLevel: d.severityLevel,
              moduleImpacts: d.moduleImpacts,
              costEstimate: d.costEstimate,
              confidenceBand: d.confidenceBand,
              timelineProjection: d.timelineProjection,
            };
            stepResults.push(stepResult);

            // Update this node's data immediately (progressive results)
            if (version === versionRef.current) {
              setNodes((prev) =>
                prev.map((n) =>
                  n.id === nodeId
                    ? {
                        ...n,
                        data: { ...data, computeState: "done", stepResult },
                      }
                    : n,
                ),
              );
              // Color the incoming edge
              setEdges((prev) =>
                prev.map((e) =>
                  e.target === nodeId
                    ? {
                        ...e,
                        data: {
                          severity: edgeSeverityFromDelta(
                            stepResult.horizonDelta,
                          ),
                          horizonDelta: stepResult.horizonDelta,
                        } satisfies ForgeEdgeData,
                      }
                    : e,
                ),
              );
            }
          }

          // Update chain's result node
          if (version === versionRef.current && chain.resultNodeId) {
            const aggregated = aggregateResults(stepResults);
            setNodes((prev) =>
              prev.map((n) =>
                n.id === chain.resultNodeId
                  ? {
                      ...n,
                      data: {
                        ...(n.data as ResultNodeData),
                        computeState: "done",
                        aggregatedResult: aggregated,
                      },
                    }
                  : n,
              ),
            );
            // Color edge to result node
            setEdges((prev) =>
              prev.map((e) =>
                e.target === chain.resultNodeId
                  ? {
                      ...e,
                      data: {
                        severity: edgeSeverityFromDelta(
                          aggregated.totalHorizonDelta,
                        ),
                        horizonDelta: aggregated.totalHorizonDelta,
                      } satisfies ForgeEdgeData,
                    }
                  : e,
              ),
            );
          }
        }),
      );
    } catch (err) {
      if ((err as Error).name === "AbortError") return; // expected cancellation
      // Set error state on all nodes
      if (version === versionRef.current) {
        setNodes((prev) =>
          prev.map((n) => {
            if (
              n.type === FORGE_NODE_TYPES.SCENARIO ||
              n.type === FORGE_NODE_TYPES.RESULT
            ) {
              return {
                ...n,
                data: { ...n.data, computeState: "error" },
              };
            }
            return n;
          }),
        );
      }
    }
  }, [noradId, nodes, edges, chains, scenarioNodeCount, setNodes, setEdges]);

  // Debounced auto-trigger on graph changes
  useEffect(() => {
    if (scenarioNodeCount === 0) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runComputation();
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphFingerprint]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/useForgeComputation.ts
git commit -m "feat(forge): add useForgeComputation hook with debounced auto-compute"
```

---

## Task 5: ForgeEdge — Animated Bézier Edge

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/edges/ForgeEdge.tsx`

**Step 1: Create ForgeEdge.tsx**

Custom React Flow edge with:

- Severity-based color (green/amber/red/gray)
- Animated pulse particle traveling along the Bézier path (SVG `<circle>` with `<animateMotion>`)
- Computing shimmer state (animated gradient)
- CRITICAL reverse pulse

```typescript
"use client";

import React, { useMemo } from "react";
import { BaseEdge, getBezierPath, type EdgeProps } from "@xyflow/react";
import { FORGE } from "../../../theme";
import type { ForgeEdgeData } from "../types";

function edgeColor(severity: ForgeEdgeData["severity"]): string {
  switch (severity) {
    case "nominal":
      return FORGE.edgeNominal;
    case "warning":
      return FORGE.edgeWarning;
    case "critical":
      return FORGE.edgeCritical;
    case "computing":
      return FORGE.edgeComputing;
    default:
      return FORGE.edgeIdle;
  }
}

export default function ForgeEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const edgeData = data as ForgeEdgeData | undefined;
  const severity = edgeData?.severity ?? null;
  const color = edgeColor(severity);

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const strokeWidth = selected ? 3 : 2;
  const showPulse = severity === "nominal" || severity === "warning" || severity === "critical";
  const showReversePulse = severity === "critical";
  const isComputing = severity === "computing";

  // Unique IDs for SVG defs
  const gradientId = `shimmer-${id}`;
  const pulseId = `pulse-${id}`;
  const reversePulseId = `rpulse-${id}`;

  return (
    <>
      {/* Shimmer gradient for computing state */}
      {isComputing && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity={0.3}>
              <animate
                attributeName="offset"
                values="-1;2"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="30%" stopColor={color} stopOpacity={1}>
              <animate
                attributeName="offset"
                values="-0.7;2.3"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </stop>
            <stop offset="60%" stopColor={color} stopOpacity={0.3}>
              <animate
                attributeName="offset"
                values="-0.4;2.6"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </stop>
          </linearGradient>
        </defs>
      )}

      {/* Base edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: isComputing ? `url(#${gradientId})` : color,
          strokeWidth,
          strokeLinecap: "round",
          transition: "stroke 0.3s ease",
        }}
      />

      {/* Forward pulse particle */}
      {showPulse && (
        <circle
          id={pulseId}
          r={4}
          fill={color}
          opacity={0.9}
        >
          <animateMotion
            dur="2s"
            repeatCount="indefinite"
            path={edgePath}
          />
        </circle>
      )}

      {/* Reverse pulse for CRITICAL */}
      {showReversePulse && (
        <circle
          id={reversePulseId}
          r={6}
          fill={FORGE.edgeCritical}
          opacity={0.5}
        >
          <animateMotion
            dur="1.2s"
            repeatCount="indefinite"
            path={edgePath}
            keyPoints="1;0"
            keyTimes="0;1"
          />
        </circle>
      )}
    </>
  );
}
```

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/edges/ForgeEdge.tsx
git commit -m "feat(forge): add ForgeEdge with animated Bézier and severity coloring"
```

---

## Task 6: SatelliteOriginNode

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/nodes/SatelliteOriginNode.tsx`

**Step 1: Create SatelliteOriginNode.tsx**

The mandatory start node. Shows live satellite state. Has output handle only.

```typescript
"use client";

import React, { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { Satellite } from "lucide-react";
import { FORGE } from "../../../theme";
import type { SatelliteOriginData } from "../types";

const MONO = "'IBM Plex Mono', monospace";

function scoreColor(score: number): string {
  if (score >= 85) return FORGE.nominal;
  if (score >= 70) return FORGE.watch;
  if (score >= 50) return FORGE.warning;
  return FORGE.critical;
}

function riskLabel(score: number): string {
  if (score >= 85) return "NOMINAL";
  if (score >= 70) return "WATCH";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

function SatelliteOriginNode({ data }: NodeProps) {
  const d = data as SatelliteOriginData;
  const score = d.overallScore;

  return (
    <div
      className="forge-node-spawn"
      style={{
        width: 280,
        background: FORGE.nodeBg,
        border: `2px solid ${FORGE.originBorder}`,
        borderRadius: 12,
        padding: 16,
        boxShadow: FORGE.originGlow,
        cursor: "grab",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Satellite size={14} color={FORGE.originBorder} />
        <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 600, color: FORGE.textPrimary }}>
          {d.satelliteName}
        </span>
        <span style={{ fontFamily: MONO, fontSize: 10, color: FORGE.textMuted, marginLeft: "auto" }}>
          #{d.noradId}
        </span>
      </div>

      {/* Score */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div
          style={{
            fontFamily: MONO,
            fontSize: 36,
            fontWeight: 700,
            lineHeight: 1,
            color: score !== null ? scoreColor(score) : FORGE.textMuted,
          }}
        >
          {score !== null ? score : "—"}
        </div>
        {score !== null && (
          <div
            style={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.08em",
              color: scoreColor(score),
              marginTop: 4,
            }}
          >
            {riskLabel(score)}
          </div>
        )}
      </div>

      {/* Metrics */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `1px solid ${FORGE.nodeBorder}`,
          paddingTop: 8,
        }}
      >
        <div>
          <div style={{ fontFamily: MONO, fontSize: 9, color: FORGE.textMuted, letterSpacing: "0.05em" }}>
            HORIZON
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: FORGE.textPrimary, fontWeight: 500 }}>
            {d.horizonDays !== null ? `${d.horizonDays}d` : "∞"}
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontFamily: MONO, fontSize: 9, color: FORGE.textMuted, letterSpacing: "0.05em" }}>
            WEAKEST
          </div>
          <div style={{ fontFamily: MONO, fontSize: 12, color: FORGE.textPrimary, fontWeight: 500 }}>
            {d.weakestModule ?? "—"}
          </div>
        </div>
      </div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        style={{
          width: 10,
          height: 10,
          background: FORGE.originBorder,
          border: `2px solid ${FORGE.nodeBg}`,
          boxShadow: `0 0 0 2px ${FORGE.originBorder}`,
        }}
      />
    </div>
  );
}

export default memo(SatelliteOriginNode);
```

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/nodes/SatelliteOriginNode.tsx
git commit -m "feat(forge): add SatelliteOriginNode with live satellite state display"
```

---

## Task 7: ScenarioNode

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/nodes/ScenarioNode.tsx`

**Step 1: Create ScenarioNode.tsx**

The main scenario block node with inline parameter editing. Renders parameter controls directly (sliders, selects). Shows computed result hint at bottom. Adapts detail level to zoom.

This is the largest node component. Key details:

- Uses `useStore(s => s.transform[2])` from React Flow to get current zoom level for adaptive detail
- Imports `ICON_MAP` (moved from old ScenarioBuilder.tsx — recreate the same mapping as a shared constant)
- Renders `SliderParameterDef` as `<input type="range">` and `SelectParameterDef` as `<select>`
- Bottom bar shows `ΔH: {delta}d` badge + severity dot after computation
- Shimmer overlay during computation
- Input handle (left) + Output handle (right)
- Delete button appears on hover (X icon, top right)
- 3px left border in category color
- Uses `useCallback` for parameter updates to call parent's `updateNodeParams`

The icon map should be extracted to a shared file (`src/app/dashboard/ephemeris/components/scenario-builder/icon-map.ts`) containing the same Lucide icon imports as the current `ScenarioBuilder.tsx` lines 19–138, exported as `ICON_MAP`. This avoids the circular dependency the old code had (BlockPalette importing from ScenarioBuilder).

**Files to also create:**

- `src/app/dashboard/ephemeris/components/scenario-builder/icon-map.ts` — Extract ICON_MAP from the old ScenarioBuilder.tsx (same 50+ Lucide imports and the `Record<string, ComponentType>` export)

The ScenarioNode component should be ~200 LOC.

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/nodes/ScenarioNode.tsx src/app/dashboard/ephemeris/components/scenario-builder/icon-map.ts
git commit -m "feat(forge): add ScenarioNode with inline params and zoom-adaptive detail"
```

---

## Task 8: ResultNode

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/nodes/ResultNode.tsx`

**Step 1: Create ResultNode.tsx**

Auto-generated terminal node showing aggregated chain results. Key details:

- Input handle only (left side)
- Shows: total ΔH (large mono number), overall severity badge, affected regs count, cost estimate
- Expandable: click "Expand" toggles showing compliance timeline sparkline (reuse SVG pattern from old ResultsPanel.tsx `ComplianceTimeline` component — a hand-drawn SVG ~200×80px with baseline and projected lines) and risk heatmap grid
- Border color = severity color, background = severity tint at 5% opacity
- CRITICAL state: pulsing red `box-shadow` animation via CSS keyframes
- Computing state: dashed border with rotating dash offset animation
- ~150 LOC

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/nodes/ResultNode.tsx
git commit -m "feat(forge): add ResultNode with expandable results and severity animation"
```

---

## Task 9: ForgeToolbar

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/overlays/ForgeToolbar.tsx`

**Step 1: Create ForgeToolbar.tsx**

Fixed top toolbar (48px height, full width, z-50). Contents:

- **Left:** Back arrow button (calls `onBack` prop to exit fullscreen), satellite name, NORAD ID badge
- **Center:** Editable scenario name (contentEditable span, defaults to "Untitled Scenario"), save button, load dropdown
- **Right:** Reset button, zoom display (reads from React Flow `useReactFlow().getZoom()`), zoom in/out buttons (calls `zoomIn()`/`zoomOut()`), minimap toggle, present mode toggle
- Save writes to localStorage key `ephemeris-forge-scenarios-{noradId}`, load reads from it
- Style: white bg with backdrop-blur, bottom shadow, 1px border

Props:

```typescript
interface ForgeToolbarProps {
  satelliteName: string;
  noradId: string;
  onBack: () => void;
  onReset: () => void;
  onSave: (name: string) => void;
  onLoad: (saved: SavedScenario) => void;
  showMinimap: boolean;
  onToggleMinimap: () => void;
}
```

~180 LOC.

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/overlays/ForgeToolbar.tsx
git commit -m "feat(forge): add ForgeToolbar with save/load and zoom controls"
```

---

## Task 10: RadialMenu

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/overlays/RadialMenu.tsx`

**Step 1: Create RadialMenu.tsx**

Circular context menu for adding scenario blocks. Key details:

- Triggered via prop `position: {x, y} | null` (null = hidden)
- 7 segments rendered as SVG arcs in a 240px diameter circle
- Each segment colored with `CATEGORY_COLORS`
- Category icon at segment center
- Hover expands segment (radius grows 120→160px) and reveals block names
- Click on a block calls `onSelectBlock(definitionId, canvasPosition)` and closes
- Dismiss on Escape key or click outside
- Spring open/close animation via CSS transform scale
- Uses `BLOCK_DEFINITIONS` and `BLOCK_CATEGORIES` from block-definitions.ts
- Canvas position is converted from screen coords via `screenToFlowPosition` from React Flow

~200 LOC.

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/overlays/RadialMenu.tsx
git commit -m "feat(forge): add RadialMenu for contextual block spawning"
```

---

## Task 11: SlashCommand

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/overlays/SlashCommand.tsx`

**Step 1: Create SlashCommand.tsx**

Notion-style command palette. Key details:

- Triggered via prop `isOpen: boolean`
- Centered overlay (400px wide, max 400px height)
- Auto-focused search input at top
- Filtered list of blocks grouped by category, each row: colored dot + block name + truncated description
- Keyboard navigation: ↑/↓ to move selection, Enter to select, Escape to close
- On select: calls `onSelectBlock(definitionId)` — node spawns at canvas viewport center
- Subtle backdrop (5% black overlay behind the card)
- Uses `BLOCK_DEFINITIONS` and `BLOCK_CATEGORIES`

~160 LOC.

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/overlays/SlashCommand.tsx
git commit -m "feat(forge): add SlashCommand palette for keyboard-driven block search"
```

---

## Task 12: ComparisonBar

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/overlays/ComparisonBar.tsx`

**Step 1: Create ComparisonBar.tsx**

Floating glass card that appears when 2+ ResultNodes exist, positioned at their geometric midpoint. Key details:

- Takes an array of `{resultNodeId, position, result: SimulationResults}` entries
- Compares the best and worst branches: ΔH, severity, cost side by side
- Green highlight on the better value, red on worse
- Auto-generated insight text: "Branch B saves {N} days, ${M} less"
- Style: white bg, backdrop-blur(12px), subtle shadow, 1px border
- Positioned via React Flow's viewport transform (absolute positioning on the canvas)

~120 LOC.

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/overlays/ComparisonBar.tsx
git commit -m "feat(forge): add ComparisonBar for parallel branch comparison"
```

---

## Task 13: EphemerisForge — Main Container

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/EphemerisForge.tsx`

**Step 1: Create EphemerisForge.tsx**

Top-level container that replaces `ScenarioBuilder.tsx`. Wires together React Flow canvas, all custom nodes/edges, overlays, and both hooks.

Key structure:

```tsx
export default function EphemerisForge({ noradId, satelliteName, satelliteState, onBack }: Props) {
  const forgeTheme = useForgeTheme();
  const graph = useForgeGraph({ originData: buildOriginData(satelliteState) });
  useForgeComputation({ noradId, ...graph });

  const [showMinimap, setShowMinimap] = useState(true);
  const [radialMenuPos, setRadialMenuPos] = useState<{x:number,y:number}|null>(null);
  const [showSlashCommand, setShowSlashCommand] = useState(false);

  const nodeTypes = useMemo(() => ({
    [FORGE_NODE_TYPES.ORIGIN]: SatelliteOriginNode,
    [FORGE_NODE_TYPES.SCENARIO]: ScenarioNode,
    [FORGE_NODE_TYPES.RESULT]: ResultNode,
  }), []);

  const edgeTypes = useMemo(() => ({
    "forge-edge": ForgeEdge,
  }), []);

  // Keyboard shortcuts
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "/" && !isInputFocused()) { e.preventDefault(); setShowSlashCommand(true); }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) { e.preventDefault(); graph.undo(); }
      if ((e.key === "z" && e.shiftKey && (e.metaKey || e.ctrlKey)) || (e.key === "y" && (e.metaKey || e.ctrlKey))) { e.preventDefault(); graph.redo(); }
      if (e.key === "Escape") { setRadialMenuPos(null); setShowSlashCommand(false); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [graph]);

  // Right-click / double-click canvas → RadialMenu
  const handlePaneContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setRadialMenuPos({ x: e.clientX, y: e.clientY });
  };
  const handlePaneDoubleClick = (e: React.MouseEvent) => {
    setRadialMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Block selection from overlays
  const handleSelectBlock = (definitionId: string, screenPos?: {x:number,y:number}) => {
    const position = screenPos
      ? reactFlowInstance.screenToFlowPosition(screenPos)
      : reactFlowInstance.screenToFlowPosition({ x: window.innerWidth/2, y: window.innerHeight/2 });
    graph.addScenarioNode(position, definitionId);
    setRadialMenuPos(null);
    setShowSlashCommand(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 40, background: forgeTheme.canvasBg }}>
      <ForgeToolbar ... />
      <div style={{ position: "absolute", inset: 0, top: 48 }}>
        <ReactFlow
          nodes={graph.nodes}
          edges={graph.edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={graph.onNodesChange}
          onEdgesChange={graph.onEdgesChange}
          onConnect={graph.onConnect}
          onPaneContextMenu={handlePaneContextMenu}
          onPaneClick={() => setRadialMenuPos(null)}
          defaultEdgeOptions={{ type: "forge-edge" }}
          fitView
          minZoom={0.25}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant="dots" gap={20} size={1} color={forgeTheme.gridDot} />
          {showMinimap && <MiniMap ... />}
        </ReactFlow>
      </div>
      <RadialMenu position={radialMenuPos} onSelectBlock={handleSelectBlock} onClose={() => setRadialMenuPos(null)} />
      <SlashCommand isOpen={showSlashCommand} onSelectBlock={(id) => handleSelectBlock(id)} onClose={() => setShowSlashCommand(false)} />
      <ComparisonBar nodes={graph.nodes} edges={graph.edges} />

      {/* Global CSS for animations */}
      <style>{`
        @keyframes forgeNodeSpawn {
          0% { transform: scale(0.8); opacity: 0; }
          75% { transform: scale(1.02); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        .forge-node-spawn { animation: forgeNodeSpawn 200ms ease-out; }
        @keyframes forgeCriticalPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239,68,68,0.3); }
          50% { box-shadow: 0 0 0 6px rgba(239,68,68,0); }
        }
        .forge-critical-pulse { animation: forgeCriticalPulse 2s ease-in-out infinite; }
      `}</style>
    </div>
  );
}
```

This is the orchestration component — ~250 LOC. The code above is a structural sketch; the actual implementation fills in the ReactFlow instance ref, proper typing, and handles all the prop threading.

**Step 2: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/EphemerisForge.tsx
git commit -m "feat(forge): add EphemerisForge main container with React Flow canvas"
```

---

## Task 14: Integrate into Satellite Detail Page

**Files:**

- Modify: `src/app/dashboard/ephemeris/[noradId]/page.tsx` (lines 1, 19, 534–547)

**Step 1: Update the import**

Replace the ScenarioBuilder import (line 19):

```typescript
// OLD:
import ScenarioBuilder from "../components/scenario-builder/ScenarioBuilder";
// NEW:
import EphemerisForge from "../components/scenario-builder/EphemerisForge";
```

**Step 2: Replace the SCENARIOS tab content**

Replace lines 534–547 (the scenarios tab rendering):

```typescript
// OLD:
{activeTab === "scenarios" && (
  <div
    style={{
      background: C.elevated,
      borderRadius: 6,
      padding: 20,
      border: `1px solid ${C.border}`,
    }}
  >
    <ScenarioBuilder
      noradId={noradId}
      satelliteName={state?.satelliteName ?? noradId}
    />
  </div>
)}

// NEW:
{activeTab === "scenarios" && (
  <EphemerisForge
    noradId={noradId}
    satelliteName={state?.satelliteName ?? noradId}
    satelliteState={state}
    onBack={() => setActiveTab("forecast")}
  />
)}
```

Because the Forge renders as `position: fixed; inset: 0; z-index: 40`, it overlays the entire page when active. The `onBack` callback switches the tab back, which unmounts the Forge and reveals the normal tabbed view underneath.

**Step 3: Verify the page still renders other tabs correctly**

Run:

```bash
npm run typecheck
```

**Step 4: Commit**

```bash
git add src/app/dashboard/ephemeris/\[noradId\]/page.tsx
git commit -m "feat(forge): integrate EphemerisForge into satellite detail page"
```

---

## Task 15: Delete Old Files

**Files:**

- Delete: `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx`
- Delete: `src/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation.ts`
- Delete: `src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx`
- Delete: `src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx`
- Delete: `src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx`
- Delete: `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx`

**Step 1: Remove old files**

```bash
rm src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx
rm src/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation.ts
rm src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx
rm src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx
rm src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx
rm src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx
```

**Step 2: Verify no remaining imports**

```bash
grep -r "ScenarioBuilder\|useScenarioSimulation\|ResultsPanel\|BlockPalette\|PipelineBlock\|ScenarioPipeline" src/ --include="*.ts" --include="*.tsx" -l
```

Expected: Only the new files should appear (if any reference the old types by name, they should be updated to import from `useForgeComputation.ts` which re-exports `StepResult` and `SimulationResults`).

**Step 3: Typecheck**

```bash
npm run typecheck
```

**Step 4: Commit**

```bash
git add -A
git commit -m "refactor(forge): remove old 3-panel Scenario Builder files"
```

---

## Task 16: Build Verification & Polish

**Step 1: Full build**

```bash
npm run build
```

Fix any type errors or import issues.

**Step 2: Visual verification**

Run dev server and manually verify:

- Navigate to `/dashboard/ephemeris/{noradId}`
- Click SCENARIOS tab → Forge opens fullscreen in light mode
- Origin node shows live satellite state
- Right-click canvas → RadialMenu appears
- Select a block → ScenarioNode spawns with spring animation
- Drag from origin output to scenario input → edge connects
- After 500ms, computation fires → edge colors update, result node shows aggregated data
- Press `/` → SlashCommand opens
- Back arrow → returns to tabbed view
- Other tabs (FORECAST, MODULES, CASCADE, DATA SOURCES) still work normally

**Step 3: Final commit**

```bash
git add -A
git commit -m "feat(forge): Ephemeris Forge scenario builder complete"
```

---

## Summary

| Task      | Component               | Est. LOC   | Depends On |
| --------- | ----------------------- | ---------- | ---------- |
| 1         | Install @xyflow/react   | 0          | —          |
| 2         | Types + Theme           | ~120       | 1          |
| 3         | useForgeGraph           | ~350       | 2          |
| 4         | useForgeComputation     | ~280       | 2, 3       |
| 5         | ForgeEdge               | ~120       | 2          |
| 6         | SatelliteOriginNode     | ~130       | 2          |
| 7         | ScenarioNode + icon-map | ~260       | 2          |
| 8         | ResultNode              | ~150       | 2          |
| 9         | ForgeToolbar            | ~180       | 2          |
| 10        | RadialMenu              | ~200       | 2          |
| 11        | SlashCommand            | ~160       | 2          |
| 12        | ComparisonBar           | ~120       | 2          |
| 13        | EphemerisForge          | ~250       | 3–12       |
| 14        | Integration             | ~20        | 13         |
| 15        | Delete old files        | 0          | 14         |
| 16        | Build + Polish          | 0          | 15         |
| **Total** |                         | **~2,340** |            |
