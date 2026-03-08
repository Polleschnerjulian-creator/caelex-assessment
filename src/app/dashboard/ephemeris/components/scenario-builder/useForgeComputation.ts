"use client";

// ─── useForgeComputation — Auto-Compute Engine ──────────────────────────────
// Watches for graph mutations (node/edge changes) and auto-computes after a
// 500ms debounce. For each chain detected in the graph, walks scenario nodes
// sequentially, POSTing each to the what-if API. Stores StepResult on each
// ScenarioNode and aggregates into the chain's ResultNode.
//
// Uses AbortController to cancel in-flight requests when the graph mutates
// during computation. A mutation version counter ensures stale results are
// discarded.

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import type { Node, Edge, EdgeChange } from "@xyflow/react";

import {
  FORGE_NODE_TYPES,
  type Chain,
  type ScenarioNodeData,
  type ForgeEdgeData,
  type StepResult,
  type SimulationResults,
  type ComputeState,
  type EdgeSeverity,
} from "./types";

import { BLOCK_DEFINITIONS } from "./block-definitions";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Config ─────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 500;

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Look up the scenarioType for a given block definitionId. */
function getScenarioType(definitionId: string): string {
  const def = BLOCK_DEFINITIONS.find((d) => d.id === definitionId);
  return def?.scenarioType ?? "CUSTOM";
}

/** Determine edge severity from horizonDelta. */
function severityFromDelta(delta: number): EdgeSeverity {
  if (delta > 0) return "nominal";
  if (delta > -90) return "warning";
  return "critical";
}

/** Pick the max severity from an array of levels. */
function maxSeverity(
  levels: Array<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined>,
): "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" {
  const order: Array<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL"> = [
    "LOW",
    "MEDIUM",
    "HIGH",
    "CRITICAL",
  ];
  let maxIdx = 0;
  for (const level of levels) {
    if (!level) continue;
    const idx = order.indexOf(level);
    if (idx > maxIdx) maxIdx = idx;
  }
  return order[maxIdx];
}

/** Aggregate an array of StepResults into a SimulationResults summary. */
function aggregateResults(steps: StepResult[]): SimulationResults {
  const totalHorizonDelta = steps.reduce((sum, s) => sum + s.horizonDelta, 0);

  const totalFuelDelta = steps.reduce(
    (sum, s) => sum + (s.fuelImpact?.delta ?? 0),
    0,
  );

  // Deduplicate by regulationRef — keep the last occurrence
  const regMap = new Map<
    string,
    {
      regulationRef: string;
      statusBefore: string;
      statusAfter: string;
      crossingDateBefore: string | null;
      crossingDateAfter: string | null;
    }
  >();
  for (const step of steps) {
    for (const reg of step.affectedRegulations) {
      regMap.set(reg.regulationRef, reg);
    }
  }

  const finalRecommendation = steps
    .map((s) => s.recommendation)
    .filter(Boolean)
    .join(" ");

  const overallSeverity = maxSeverity(steps.map((s) => s.severityLevel));

  const totalCostEstimate = {
    fuelKg: steps.reduce((sum, s) => sum + (s.costEstimate?.fuelKg ?? 0), 0),
    financialUsd: steps.reduce(
      (sum, s) => sum + (s.costEstimate?.financialUsd ?? 0),
      0,
    ),
  };

  return {
    stepResults: steps,
    totalHorizonDelta,
    totalFuelDelta,
    allAffectedRegulations: Array.from(regMap.values()),
    finalRecommendation,
    overallSeverity,
    totalCostEstimate,
  };
}

/**
 * Build a fingerprint string from the scenario-relevant parts of the graph.
 * Changes in node IDs, parameters, or edge connections will produce a
 * different fingerprint, triggering recomputation.
 */
function buildGraphFingerprint(nodes: Node[], edges: Edge[]): string {
  // Only consider scenario nodes for fingerprinting
  const scenarioNodes = nodes
    .filter((n) => n.type === FORGE_NODE_TYPES.SCENARIO)
    .sort((a, b) => a.id.localeCompare(b.id));

  const nodeParts = scenarioNodes.map((n) => {
    const data = n.data as unknown as ScenarioNodeData;
    return `${n.id}:${data.definitionId}:${JSON.stringify(data.parameters)}`;
  });

  // Edge connections (sorted for determinism)
  const edgeParts = edges
    .filter((e) => {
      const sourceNode = nodes.find((n) => n.id === e.source);
      const targetNode = nodes.find((n) => n.id === e.target);
      return (
        sourceNode &&
        targetNode &&
        (sourceNode.type === FORGE_NODE_TYPES.ORIGIN ||
          sourceNode.type === FORGE_NODE_TYPES.SCENARIO) &&
        (targetNode.type === FORGE_NODE_TYPES.SCENARIO ||
          targetNode.type === FORGE_NODE_TYPES.RESULT)
      );
    })
    .map((e) => `${e.source}->${e.target}`)
    .sort();

  return `nodes[${nodeParts.join("|")}]edges[${edgeParts.join("|")}]`;
}

// ─── Hook Interface ─────────────────────────────────────────────────────────

interface UseForgeComputationOptions {
  noradId: string;
  nodes: Node[];
  edges: Edge[];
  chains: Chain[];
  updateNodeData: (
    nodeId: string,
    data: Partial<Record<string, unknown>>,
  ) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
}

interface UseForgeComputationReturn {
  isComputing: boolean;
  computeError: string | null;
  /** Force a debounced computation. */
  triggerCompute: () => void;
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useForgeComputation({
  noradId,
  nodes,
  edges,
  chains,
  updateNodeData,
  onEdgesChange,
}: UseForgeComputationOptions): UseForgeComputationReturn {
  // ── State exposed to consumers ──────────────────────────────────────────
  const [isComputing, setIsComputing] = useState(false);
  const [computeError, setComputeError] = useState<string | null>(null);

  // ── Refs for cancellation & staleness ───────────────────────────────────
  const abortControllerRef = useRef<AbortController | null>(null);
  const mutationVersionRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Stable refs to latest values (avoid stale closures) ────────────────
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;

  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  const chainsRef = useRef(chains);
  chainsRef.current = chains;

  const updateNodeDataRef = useRef(updateNodeData);
  updateNodeDataRef.current = updateNodeData;

  const onEdgesChangeRef = useRef(onEdgesChange);
  onEdgesChangeRef.current = onEdgesChange;

  const noradIdRef = useRef(noradId);
  noradIdRef.current = noradId;

  // ── Graph fingerprint ───────────────────────────────────────────────────
  const fingerprint = useMemo(
    () => buildGraphFingerprint(nodes, edges),
    [nodes, edges],
  );
  const lastFingerprintRef = useRef(fingerprint);

  // ── Update edge data via replace changes ────────────────────────────────
  const updateEdgeData = useCallback(
    (edgeId: string, data: Partial<ForgeEdgeData>) => {
      const edge = edgesRef.current.find((e) => e.id === edgeId);
      if (!edge) return;
      const updatedEdge: Edge = {
        ...edge,
        data: { ...edge.data, ...data },
      };
      onEdgesChangeRef.current([
        { id: edgeId, type: "replace", item: updatedEdge },
      ]);
    },
    [],
  );

  // ── Set compute state on all scenario nodes in a chain ──────────────────
  const setChainComputeState = useCallback(
    (chain: Chain, state: ComputeState) => {
      const currentNodes = nodesRef.current;
      for (const nodeId of chain.nodeIds) {
        const node = currentNodes.find((n) => n.id === nodeId);
        if (node?.type === FORGE_NODE_TYPES.SCENARIO) {
          updateNodeDataRef.current(nodeId, { computeState: state });
        }
      }
      if (chain.resultNodeId) {
        updateNodeDataRef.current(chain.resultNodeId, { computeState: state });
      }
    },
    [],
  );

  // ── Set severity on all edges along a chain ─────────────────────────────
  const setChainEdgesSeverity = useCallback(
    (chain: Chain, severity: EdgeSeverity) => {
      const currentEdges = edgesRef.current;
      for (let i = 0; i < chain.nodeIds.length - 1; i++) {
        const sourceId = chain.nodeIds[i];
        const targetId = chain.nodeIds[i + 1];
        const edge = currentEdges.find(
          (e) => e.source === sourceId && e.target === targetId,
        );
        if (edge) {
          updateEdgeData(edge.id, { severity, horizonDelta: null });
        }
      }
      // Edge from last chain node to result node
      if (chain.resultNodeId) {
        const lastNodeId = chain.nodeIds[chain.nodeIds.length - 1];
        const resultEdge = currentEdges.find(
          (e) => e.source === lastNodeId && e.target === chain.resultNodeId,
        );
        if (resultEdge) {
          updateEdgeData(resultEdge.id, { severity, horizonDelta: null });
        }
      }
    },
    [updateEdgeData],
  );

  // ── Compute a single chain (scenario nodes walked sequentially) ─────────
  const computeChain = useCallback(
    async (chain: Chain, version: number, signal: AbortSignal) => {
      const currentNodes = nodesRef.current;
      const currentEdges = edgesRef.current;

      // Extract only scenario node IDs from the chain (skip origin)
      const scenarioNodeIds = chain.nodeIds.filter((id) => {
        const node = currentNodes.find((n) => n.id === id);
        return node?.type === FORGE_NODE_TYPES.SCENARIO;
      });

      const stepResults: StepResult[] = [];

      for (const nodeId of scenarioNodeIds) {
        // Bail if cancelled or stale
        if (signal.aborted || mutationVersionRef.current !== version) return;

        const node = currentNodes.find((n) => n.id === nodeId);
        if (!node) continue;

        const nodeData = node.data as unknown as ScenarioNodeData;
        const scenarioType = getScenarioType(nodeData.definitionId);
        if (scenarioType === "CUSTOM") continue;

        // Mark individual node as computing
        updateNodeDataRef.current(nodeId, { computeState: "computing" });

        const res = await fetch("/api/v1/ephemeris/what-if", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders(),
          },
          body: JSON.stringify({
            norad_id: noradIdRef.current,
            scenario: {
              type: scenarioType,
              parameters: nodeData.parameters,
            },
          }),
          signal,
        });

        if (!res.ok) {
          const errBody = await res.json().catch(() => ({}));
          const detail =
            errBody.message || errBody.error || res.statusText || "Unknown";
          throw new Error(`${detail} (${res.status})`);
        }

        // Check staleness after await
        if (mutationVersionRef.current !== version) return;

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

        // Store StepResult on the ScenarioNode
        updateNodeDataRef.current(nodeId, {
          computeState: "done" as ComputeState,
          stepResult,
        });

        // Update the edge leading to this node with severity color
        const nodeIndex = chain.nodeIds.indexOf(nodeId);
        if (nodeIndex > 0) {
          const prevNodeId = chain.nodeIds[nodeIndex - 1];
          const edge = currentEdges.find(
            (e) => e.source === prevNodeId && e.target === nodeId,
          );
          if (edge) {
            const severity = severityFromDelta(stepResult.horizonDelta);
            updateEdgeData(edge.id, {
              severity,
              horizonDelta: stepResult.horizonDelta,
            });
          }
        }
      }

      // Check staleness before aggregation
      if (mutationVersionRef.current !== version) return;

      // Aggregate results into the chain's ResultNode
      if (chain.resultNodeId && stepResults.length > 0) {
        const aggregated = aggregateResults(stepResults);
        updateNodeDataRef.current(chain.resultNodeId, {
          aggregatedResult: aggregated,
          computeState: "done" as ComputeState,
        });

        // Update the edge to the result node
        const lastNodeId = chain.nodeIds[chain.nodeIds.length - 1];
        const resultEdge = currentEdges.find(
          (e) => e.source === lastNodeId && e.target === chain.resultNodeId,
        );
        if (resultEdge) {
          const severity = severityFromDelta(aggregated.totalHorizonDelta);
          updateEdgeData(resultEdge.id, {
            severity,
            horizonDelta: aggregated.totalHorizonDelta,
          });
        }
      } else if (chain.resultNodeId) {
        // No scenario nodes produced results
        updateNodeDataRef.current(chain.resultNodeId, {
          aggregatedResult: null,
          computeState: "done" as ComputeState,
        });
      }
    },
    [updateEdgeData],
  );

  // ── Core computation orchestrator ───────────────────────────────────────
  const runComputation = useCallback(async () => {
    // Bump mutation version and capture it
    mutationVersionRef.current += 1;
    const currentVersion = mutationVersionRef.current;

    // Cancel any in-flight requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    const currentChains = chainsRef.current;
    const currentNodes = nodesRef.current;

    // Only compute chains that contain at least one scenario node
    const computeChains = currentChains.filter((chain) =>
      chain.nodeIds.some((id) => {
        const node = currentNodes.find((n) => n.id === id);
        return node?.type === FORGE_NODE_TYPES.SCENARIO;
      }),
    );

    if (computeChains.length === 0) return;

    setIsComputing(true);
    setComputeError(null);

    // Mark all chains as computing
    for (const chain of computeChains) {
      setChainComputeState(chain, "computing");
      setChainEdgesSeverity(chain, "computing");
    }

    try {
      // Process all chains in parallel; within each chain, nodes are sequential
      await Promise.all(
        computeChains.map(async (chain) => {
          try {
            await computeChain(chain, currentVersion, controller.signal);
          } catch (err) {
            if (err instanceof DOMException && err.name === "AbortError") {
              return;
            }
            // Mark this chain as errored
            if (mutationVersionRef.current === currentVersion) {
              setChainComputeState(chain, "error");
              setChainEdgesSeverity(chain, null);
            }
            throw err;
          }
        }),
      );
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        // Cancelled — don't update state
        return;
      }
      if (mutationVersionRef.current === currentVersion) {
        setComputeError(err instanceof Error ? err.message : String(err));
      }
    } finally {
      if (mutationVersionRef.current === currentVersion) {
        setIsComputing(false);
      }
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [computeChain, setChainComputeState, setChainEdgesSeverity]);

  // ── Debounced trigger ───────────────────────────────────────────────────
  const triggerCompute = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    // Cancel in-flight requests immediately on new mutation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      runComputation();
    }, DEBOUNCE_MS);
  }, [runComputation]);

  // ── Watch for graph fingerprint changes ─────────────────────────────────
  useEffect(() => {
    if (fingerprint === lastFingerprintRef.current) return;
    lastFingerprintRef.current = fingerprint;
    triggerCompute();
  }, [fingerprint, triggerCompute]);

  // ── Cleanup on unmount ──────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    isComputing,
    computeError,
    triggerCompute,
  };
}
