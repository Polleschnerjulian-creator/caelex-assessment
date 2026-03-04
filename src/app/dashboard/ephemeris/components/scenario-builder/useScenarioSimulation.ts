"use client";

// ---------------------------------------------------------------------------
// Scenario Simulation Hook – pipeline state management & API calls
// ---------------------------------------------------------------------------

import { useState, useCallback } from "react";
import type { PipelineBlockInstance } from "./block-definitions";
import { BLOCK_DEFINITIONS } from "./block-definitions";
import { csrfHeaders } from "@/lib/csrf-client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StepResult {
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
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Look up the scenarioType for a given definitionId. */
function getScenarioType(definitionId: string): string {
  const def = BLOCK_DEFINITIONS.find((d) => d.id === definitionId);
  return def?.scenarioType ?? "CUSTOM";
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

  return {
    stepResults: steps,
    totalHorizonDelta,
    totalFuelDelta,
    allAffectedRegulations: Array.from(regMap.values()),
    finalRecommendation,
  };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useScenarioSimulation(noradId: string) {
  const [pipeline, setPipeline] = useState<PipelineBlockInstance[]>([]);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // -- Pipeline mutations ---------------------------------------------------

  const addBlock = useCallback((block: PipelineBlockInstance) => {
    setPipeline((prev) => [...prev, block]);
    setResults(null);
  }, []);

  const removeBlock = useCallback((instanceId: string) => {
    setPipeline((prev) => prev.filter((b) => b.instanceId !== instanceId));
    setResults(null);
  }, []);

  const updateBlockParams = useCallback(
    (instanceId: string, params: Record<string, unknown>) => {
      setPipeline((prev) =>
        prev.map((b) =>
          b.instanceId === instanceId
            ? { ...b, parameters: { ...b.parameters, ...params } }
            : b,
        ),
      );
      setResults(null);
    },
    [],
  );

  const reorderBlocks = useCallback((activeId: string, overId: string) => {
    setPipeline((prev) => {
      const oldIndex = prev.findIndex((b) => b.instanceId === activeId);
      const newIndex = prev.findIndex((b) => b.instanceId === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;

      const next = [...prev];
      const [moved] = next.splice(oldIndex, 1);
      next.splice(newIndex, 0, moved);
      return next;
    });
    setResults(null);
  }, []);

  const reset = useCallback(() => {
    setPipeline([]);
    setResults(null);
    setError(null);
  }, []);

  // -- Simulation -----------------------------------------------------------

  const runSimulation = useCallback(async () => {
    setIsRunning(true);
    setError(null);
    setResults(null);

    try {
      const stepResults: StepResult[] = [];

      for (const block of pipeline) {
        const scenarioType = getScenarioType(block.definitionId);

        // Skip CUSTOM blocks — they have no API representation
        if (scenarioType === "CUSTOM") continue;

        const res = await fetch("/api/v1/ephemeris/what-if", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...csrfHeaders(),
          },
          body: JSON.stringify({
            norad_id: noradId,
            scenario: {
              type: scenarioType,
              parameters: block.parameters,
            },
          }),
        });

        if (!res.ok) {
          throw new Error(
            `Simulation step failed (${res.status} ${res.statusText})`,
          );
        }

        const json = await res.json();
        const d = json.data;

        stepResults.push({
          blockInstanceId: block.instanceId,
          scenarioType,
          baselineHorizon: d.baselineHorizon,
          projectedHorizon: d.projectedHorizon,
          horizonDelta: d.horizonDelta,
          affectedRegulations: d.affectedRegulations,
          fuelImpact: d.fuelImpact ?? null,
          recommendation: d.recommendation,
        });
      }

      setResults(aggregateResults(stepResults));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsRunning(false);
    }
  }, [pipeline, noradId]);

  return {
    pipeline,
    results,
    isRunning,
    error,
    addBlock,
    removeBlock,
    updateBlockParams,
    reorderBlocks,
    reset,
    runSimulation,
  };
}
