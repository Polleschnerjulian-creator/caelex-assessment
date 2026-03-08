"use client";

// ─── useForgeGraph — Graph State Hook ────────────────────────────────────────
// Manages all graph state: nodes, edges, CRUD operations, auto ResultNode
// management, chain detection for computation, undo/redo, and serialization.

import { useCallback, useReducer, useRef } from "react";
import {
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
} from "@xyflow/react";

import {
  FORGE_NODE_TYPES,
  type SatelliteOriginData,
  type ScenarioNodeData,
  type ResultNodeData,
  type ForgeEdgeData,
  type SavedScenario,
  type Chain,
} from "./types";

import { BLOCK_DEFINITIONS, getDefaultParameters } from "./block-definitions";

// ─── Constants ───────────────────────────────────────────────────────────────

const ORIGIN_NODE_ID = "origin";
const RESULT_NODE_OFFSET_X = 250;
const MAX_HISTORY = 50;

// ID generation — encapsulated via closure. IDs include Date.now() to
// guarantee uniqueness even across hot-module-reload boundaries.
const idGen = (() => {
  let counter = 0;
  return {
    nextNodeId(prefix: string): string {
      counter += 1;
      return `${prefix}-${Date.now()}-${counter}`;
    },
    nextEdgeId(): string {
      counter += 1;
      return `edge-${Date.now()}-${counter}`;
    },
  };
})();

const { nextNodeId, nextEdgeId } = idGen;

// ─── Initial State ───────────────────────────────────────────────────────────

interface GraphState {
  nodes: Node[];
  edges: Edge[];
}

interface HistoryState {
  past: GraphState[];
  present: GraphState;
  future: GraphState[];
}

function createOriginNode(): Node {
  const data: SatelliteOriginData = {
    satelliteName: "",
    noradId: "",
    overallScore: null,
    riskCategory: null,
    horizonDays: null,
    horizonRegulation: null,
    weakestModule: null,
  };
  return {
    id: ORIGIN_NODE_ID,
    type: FORGE_NODE_TYPES.ORIGIN,
    position: { x: 350, y: 200 },
    data: data as unknown as Record<string, unknown>,
    deletable: false,
    draggable: false,
  };
}

function createInitialState(): HistoryState {
  const present: GraphState = {
    nodes: [createOriginNode()],
    edges: [],
  };
  return {
    past: [],
    present,
    future: [],
  };
}

// ─── ResultNode Auto-Management ──────────────────────────────────────────────

/**
 * Finds all nodes that have an output handle but no outgoing edge, and ensures
 * a ResultNode exists 250px to the right. Removes orphaned ResultNodes that
 * now have an outgoing edge (user connected something past them).
 */
function updateResultNodes(state: GraphState): GraphState {
  const { nodes, edges } = state;

  // Set of source node IDs that have outgoing edges
  const nodesWithOutgoing = new Set(edges.map((e) => e.source));

  // Identify which result nodes currently exist, keyed by the source node they display for
  const existingResultNodes = new Map<string, Node>();
  for (const node of nodes) {
    if (node.type === FORGE_NODE_TYPES.RESULT) {
      const data = node.data as unknown as ResultNodeData;
      existingResultNodes.set(data.chainId, node);
    }
  }

  // Nodes that should have a result node: origin or scenario nodes without outgoing edges
  const nodesNeedingResult = nodes.filter(
    (n) =>
      (n.type === FORGE_NODE_TYPES.ORIGIN ||
        n.type === FORGE_NODE_TYPES.SCENARIO) &&
      !nodesWithOutgoing.has(n.id),
  );

  // IDs of source nodes that need result nodes
  const needsResultSet = new Set(nodesNeedingResult.map((n) => n.id));

  // Remove result nodes whose source now has an outgoing edge
  // Also remove result nodes that have outgoing edges themselves (user connected past them)
  const resultNodesToRemove = new Set<string>();
  existingResultNodes.forEach((resultNode, sourceId) => {
    if (!needsResultSet.has(sourceId) || nodesWithOutgoing.has(resultNode.id)) {
      resultNodesToRemove.add(resultNode.id);
    }
  });

  // Also remove edges connected to removed result nodes
  const filteredEdges = edges.filter(
    (e) =>
      !resultNodesToRemove.has(e.source) && !resultNodesToRemove.has(e.target),
  );

  // Filter out removed result nodes
  let updatedNodes = nodes.filter((n) => !resultNodesToRemove.has(n.id));

  // Create new result nodes for nodes that need them and don't already have one
  for (const sourceNode of nodesNeedingResult) {
    const existingResult = existingResultNodes.get(sourceNode.id);
    if (existingResult && !resultNodesToRemove.has(existingResult.id)) {
      // Already has a valid result node
      continue;
    }

    const resultData: ResultNodeData = {
      chainId: sourceNode.id,
      aggregatedResult: null,
      computeState: "idle",
    };

    const resultNode: Node = {
      id: nextNodeId("result"),
      type: FORGE_NODE_TYPES.RESULT,
      position: {
        x: sourceNode.position.x + RESULT_NODE_OFFSET_X,
        y: sourceNode.position.y,
      },
      data: resultData as unknown as Record<string, unknown>,
      deletable: false,
      selectable: false,
      draggable: true,
    };

    const edgeData: ForgeEdgeData = {
      severity: null,
      horizonDelta: null,
    };

    const resultEdge: Edge = {
      id: nextEdgeId(),
      source: sourceNode.id,
      target: resultNode.id,
      type: "forge-edge",
      animated: false,
      data: edgeData as unknown as Record<string, unknown>,
    };

    updatedNodes = [...updatedNodes, resultNode];
    filteredEdges.push(resultEdge);
  }

  return { nodes: updatedNodes, edges: filteredEdges };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type GraphAction =
  | { type: "APPLY_NODE_CHANGES"; changes: NodeChange[] }
  | { type: "APPLY_EDGE_CHANGES"; changes: EdgeChange[] }
  | {
      type: "ADD_SCENARIO_NODE";
      position: { x: number; y: number };
      definitionId: string;
    }
  | { type: "REMOVE_NODE"; nodeId: string }
  | {
      type: "UPDATE_NODE_DATA";
      nodeId: string;
      data: Partial<Record<string, unknown>>;
      skipHistory?: boolean;
    }
  | { type: "ADD_EDGE"; connection: Connection }
  | { type: "REMOVE_EDGE"; edgeId: string }
  | { type: "SET_ORIGIN_DATA"; data: Partial<SatelliteOriginData> }
  | { type: "LOAD_SCENARIO"; scenario: SavedScenario }
  | { type: "RESET" }
  | { type: "UNDO" }
  | { type: "REDO" };

function pushHistory(
  history: HistoryState,
  newPresent: GraphState,
): HistoryState {
  const past = [...history.past, history.present].slice(-MAX_HISTORY);
  return {
    past,
    present: newPresent,
    future: [],
  };
}

function graphReducer(state: HistoryState, action: GraphAction): HistoryState {
  switch (action.type) {
    case "APPLY_NODE_CHANGES": {
      const newNodes = applyNodeChanges(action.changes, state.present.nodes);
      // Position/selection/dimension changes are minor — no result node update needed
      const isMinorChange = action.changes.every(
        (c) =>
          c.type === "position" ||
          c.type === "select" ||
          c.type === "dimensions",
      );
      const newState: GraphState = {
        nodes: newNodes,
        edges: state.present.edges,
      };
      if (isMinorChange) {
        // Don't push history for drag/select, just update present
        return { ...state, present: newState };
      }
      const updated = updateResultNodes(newState);
      return pushHistory(state, updated);
    }

    case "APPLY_EDGE_CHANGES": {
      const newEdges = applyEdgeChanges(action.changes, state.present.edges);
      const newState: GraphState = {
        nodes: state.present.nodes,
        edges: newEdges,
      };
      const updated = updateResultNodes(newState);
      return pushHistory(state, updated);
    }

    case "ADD_SCENARIO_NODE": {
      const definition = BLOCK_DEFINITIONS.find(
        (b) => b.id === action.definitionId,
      );
      if (!definition) return state;

      const scenarioData: ScenarioNodeData = {
        definitionId: action.definitionId,
        parameters: getDefaultParameters(definition),
        computeState: "idle",
        stepResult: null,
      };

      const newNode: Node = {
        id: nextNodeId("scenario"),
        type: FORGE_NODE_TYPES.SCENARIO,
        position: action.position,
        data: scenarioData as unknown as Record<string, unknown>,
      };

      const newState: GraphState = {
        nodes: [...state.present.nodes, newNode],
        edges: state.present.edges,
      };
      const updated = updateResultNodes(newState);
      return pushHistory(state, updated);
    }

    case "REMOVE_NODE": {
      // Cannot remove origin node
      if (action.nodeId === ORIGIN_NODE_ID) return state;

      const newNodes = state.present.nodes.filter(
        (n) => n.id !== action.nodeId,
      );
      const newEdges = state.present.edges.filter(
        (e) => e.source !== action.nodeId && e.target !== action.nodeId,
      );
      const newState: GraphState = { nodes: newNodes, edges: newEdges };
      const updated = updateResultNodes(newState);
      return pushHistory(state, updated);
    }

    case "UPDATE_NODE_DATA": {
      const newNodes = state.present.nodes.map((n) => {
        if (n.id !== action.nodeId) return n;
        return {
          ...n,
          data: { ...n.data, ...action.data },
        };
      });
      const newState: GraphState = {
        nodes: newNodes,
        edges: state.present.edges,
      };
      // Skip history for compute state updates (e.g. computing → done)
      if (action.skipHistory) {
        return { ...state, present: newState };
      }
      return pushHistory(state, newState);
    }

    case "ADD_EDGE": {
      const { connection } = action;
      if (!connection.source || !connection.target) return state;

      // Prevent duplicate edges
      const exists = state.present.edges.some(
        (e) => e.source === connection.source && e.target === connection.target,
      );
      if (exists) return state;

      // Prevent self-connections
      if (connection.source === connection.target) return state;

      const edgeData: ForgeEdgeData = {
        severity: null,
        horizonDelta: null,
      };

      const newEdge: Edge = {
        id: nextEdgeId(),
        source: connection.source,
        target: connection.target,
        type: "forge-edge",
        animated: false,
        data: edgeData as unknown as Record<string, unknown>,
      };

      const newState: GraphState = {
        nodes: state.present.nodes,
        edges: [...state.present.edges, newEdge],
      };
      const updated = updateResultNodes(newState);
      return pushHistory(state, updated);
    }

    case "REMOVE_EDGE": {
      const newEdges = state.present.edges.filter(
        (e) => e.id !== action.edgeId,
      );
      const newState: GraphState = {
        nodes: state.present.nodes,
        edges: newEdges,
      };
      const updated = updateResultNodes(newState);
      return pushHistory(state, updated);
    }

    case "SET_ORIGIN_DATA": {
      const newNodes = state.present.nodes.map((n) => {
        if (n.id !== ORIGIN_NODE_ID) return n;
        return {
          ...n,
          data: { ...n.data, ...action.data },
        };
      });
      const newState: GraphState = {
        nodes: newNodes,
        edges: state.present.edges,
      };
      return pushHistory(state, newState);
    }

    case "LOAD_SCENARIO": {
      const { scenario } = action;
      const loadedNodes: Node[] = scenario.nodes.map((n) => ({
        id: n.id,
        type: n.type,
        position: n.position,
        data: n.data,
        deletable: n.type === FORGE_NODE_TYPES.ORIGIN ? false : undefined,
      }));
      const edgeData: ForgeEdgeData = {
        severity: null,
        horizonDelta: null,
      };
      const loadedEdges: Edge[] = scenario.edges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        type: "forge-edge",
        data: edgeData as unknown as Record<string, unknown>,
      }));
      const newState: GraphState = {
        nodes: loadedNodes,
        edges: loadedEdges,
      };
      const updated = updateResultNodes(newState);
      return {
        past: [],
        present: updated,
        future: [],
      };
    }

    case "RESET": {
      return createInitialState();
    }

    case "UNDO": {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, -1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_HISTORY),
      };
    }

    case "REDO": {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present].slice(-MAX_HISTORY),
        present: next,
        future: newFuture,
      };
    }

    default:
      return state;
  }
}

// ─── Chain Detection (DAG Walk) ──────────────────────────────────────────────

/**
 * Walk the DAG from the origin node, returning each linear path as an ordered
 * array of node IDs. Branches create parallel chains.
 */
function buildChains(nodes: Node[], edges: Edge[]): Chain[] {
  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    const children = adjacency.get(edge.source) ?? [];
    children.push(edge.target);
    adjacency.set(edge.source, children);
  }

  const nodeMap = new Map<string, Node>();
  for (const node of nodes) {
    nodeMap.set(node.id, node);
  }

  const chains: Chain[] = [];
  let chainCounter = 0;
  const visited = new Set<string>();

  function walk(currentId: string, currentChain: string[]): void {
    const node = nodeMap.get(currentId);
    if (!node) return;
    if (visited.has(currentId)) return; // cycle guard
    visited.add(currentId);

    currentChain.push(currentId);

    const children = adjacency.get(currentId) ?? [];

    // Filter out result nodes from children for chain continuation
    const scenarioChildren = children.filter((childId) => {
      const child = nodeMap.get(childId);
      return child != null && child.type !== FORGE_NODE_TYPES.RESULT;
    });

    const resultChild = children.find((childId) => {
      const child = nodeMap.get(childId);
      return child?.type === FORGE_NODE_TYPES.RESULT;
    });

    if (scenarioChildren.length === 0) {
      // Terminal node — finalize chain
      chainCounter += 1;
      chains.push({
        id: `chain-${chainCounter}`,
        nodeIds: [...currentChain],
        resultNodeId: resultChild ?? null,
      });
    } else if (scenarioChildren.length === 1) {
      // Linear continuation
      walk(scenarioChildren[0], currentChain);
    } else {
      // Branch — each child starts a new parallel chain from shared prefix
      for (const childId of scenarioChildren) {
        walk(childId, [...currentChain]);
      }
    }
  }

  // Start from origin
  const originNode = nodes.find((n) => n.id === ORIGIN_NODE_ID);
  if (originNode) {
    walk(ORIGIN_NODE_ID, []);
  }

  return chains;
}

// ─── Serialization ───────────────────────────────────────────────────────────

function serializeGraph(
  nodes: Node[],
  edges: Edge[],
  name: string,
  noradId: string,
): SavedScenario {
  return {
    id: `scenario-${Date.now()}`,
    name,
    createdAt: new Date().toISOString(),
    noradId,
    nodes: nodes
      .filter((n) => n.type !== FORGE_NODE_TYPES.RESULT)
      .map((n) => ({
        id: n.id,
        type: n.type ?? "",
        position: n.position,
        data: n.data as Record<string, unknown>,
      })),
    edges: edges
      .filter((e) => {
        // Exclude edges to result nodes
        const targetNode = nodes.find((n) => n.id === e.target);
        return targetNode?.type !== FORGE_NODE_TYPES.RESULT;
      })
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
      })),
  };
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useForgeGraph() {
  const [history, dispatch] = useReducer(
    graphReducer,
    undefined,
    createInitialState,
  );
  const { nodes, edges } = history.present;

  // Stable ref to current nodes/edges for getChains (avoids stale closures)
  const stateRef = useRef(history.present);
  stateRef.current = history.present;

  // ── React Flow change handlers ──────────────────────────────────────────

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    dispatch({ type: "APPLY_NODE_CHANGES", changes });
  }, []);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    dispatch({ type: "APPLY_EDGE_CHANGES", changes });
  }, []);

  const onConnect = useCallback((connection: Connection) => {
    dispatch({ type: "ADD_EDGE", connection });
  }, []);

  // ── CRUD Operations ─────────────────────────────────────────────────────

  const addScenarioNode = useCallback(
    (position: { x: number; y: number }, definitionId: string) => {
      dispatch({ type: "ADD_SCENARIO_NODE", position, definitionId });
    },
    [],
  );

  const removeNode = useCallback((nodeId: string) => {
    dispatch({ type: "REMOVE_NODE", nodeId });
  }, []);

  const updateNodeData = useCallback(
    (
      nodeId: string,
      data: Partial<Record<string, unknown>>,
      skipHistory = false,
    ) => {
      dispatch({ type: "UPDATE_NODE_DATA", nodeId, data, skipHistory });
    },
    [],
  );

  const removeEdge = useCallback((edgeId: string) => {
    dispatch({ type: "REMOVE_EDGE", edgeId });
  }, []);

  const setOriginData = useCallback((data: Partial<SatelliteOriginData>) => {
    dispatch({ type: "SET_ORIGIN_DATA", data });
  }, []);

  // ── Chain Detection ─────────────────────────────────────────────────────

  const getChains = useCallback((): Chain[] => {
    return buildChains(stateRef.current.nodes, stateRef.current.edges);
  }, []);

  // ── Undo / Redo ─────────────────────────────────────────────────────────

  const undo = useCallback(() => {
    dispatch({ type: "UNDO" });
  }, []);

  const redo = useCallback(() => {
    dispatch({ type: "REDO" });
  }, []);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  // ── Save / Load ─────────────────────────────────────────────────────────

  const saveScenario = useCallback(
    (name: string, noradId: string): SavedScenario => {
      return serializeGraph(
        stateRef.current.nodes,
        stateRef.current.edges,
        name,
        noradId,
      );
    },
    [],
  );

  const loadScenario = useCallback((scenario: SavedScenario) => {
    dispatch({ type: "LOAD_SCENARIO", scenario });
  }, []);

  // ── Reset ───────────────────────────────────────────────────────────────

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  // ── Public API ──────────────────────────────────────────────────────────

  return {
    // State
    nodes,
    edges,

    // React Flow event handlers
    onNodesChange,
    onEdgesChange,
    onConnect,

    // CRUD
    addScenarioNode,
    removeNode,
    updateNodeData,
    removeEdge,
    setOriginData,

    // Chain detection
    getChains,

    // Undo / Redo
    undo,
    redo,
    canUndo,
    canRedo,

    // Save / Load
    saveScenario,
    loadScenario,

    // Reset
    reset,
  };
}
