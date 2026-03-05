# Ephemeris Scenario Builder — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the single-purpose Jurisdiction Simulator with a drag-and-drop Scenario Builder that lets users compose multi-step what-if simulations from building blocks.

**Architecture:** 3-column Pipeline Stack layout (palette → pipeline → results). Uses `@dnd-kit` for drag-and-drop. Each block maps to one API call to the existing `/api/v1/ephemeris/what-if` endpoint. Blocks execute sequentially and results accumulate. No backend changes needed.

**Tech Stack:** React, @dnd-kit/core + @dnd-kit/sortable, existing Ephemeris what-if API, GlassCard UI, Tailwind CSS (Caelex light-mode palette)

---

## Task 1: Install @dnd-kit dependencies

**Files:**

- Modify: `package.json`

**Step 1: Install packages**

Run:

```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: Clean install, no peer dependency warnings for React 18.

**Step 2: Verify installation**

Run:

```bash
node -e "require('@dnd-kit/core'); console.log('dnd-kit OK')"
```

Expected: `dnd-kit OK`

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add @dnd-kit/core, sortable, utilities for scenario builder"
```

---

## Task 2: Block definitions registry

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/block-definitions.ts`
- Test: `tests/unit/ephemeris/scenario-builder/block-definitions.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/ephemeris/scenario-builder/block-definitions.test.ts`:

```typescript
import { describe, it, expect } from "vitest";
import {
  BLOCK_DEFINITIONS,
  type BlockDefinition,
  type PipelineBlockInstance,
  createBlockInstance,
  getDefaultParameters,
} from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";

describe("block-definitions", () => {
  it("should export 6 predefined block definitions", () => {
    expect(BLOCK_DEFINITIONS).toHaveLength(6);
  });

  it("should have unique IDs for all blocks", () => {
    const ids = BLOCK_DEFINITIONS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each block should have required fields", () => {
    for (const block of BLOCK_DEFINITIONS) {
      expect(block.id).toBeTruthy();
      expect(block.name).toBeTruthy();
      expect(block.description).toBeTruthy();
      expect(block.icon).toBeTruthy();
      expect(block.color).toBeTruthy();
      expect(block.scenarioType).toBeTruthy();
      expect(Array.isArray(block.parameterDefs)).toBe(true);
    }
  });

  describe("createBlockInstance", () => {
    it("should create instance with unique instanceId", () => {
      const def = BLOCK_DEFINITIONS[0];
      const a = createBlockInstance(def);
      const b = createBlockInstance(def);
      expect(a.instanceId).not.toBe(b.instanceId);
      expect(a.definitionId).toBe(def.id);
    });

    it("should populate default parameter values", () => {
      const orbitRaise = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
      const instance = createBlockInstance(orbitRaise);
      expect(instance.parameters).toHaveProperty("altitudeDeltaKm");
      expect(instance.parameters).toHaveProperty("fuelCostPct");
    });
  });

  describe("getDefaultParameters", () => {
    it("should return defaults for a block definition", () => {
      const orbitRaise = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
      const defaults = getDefaultParameters(orbitRaise);
      expect(defaults.altitudeDeltaKm).toBe(50);
      expect(defaults.fuelCostPct).toBe(2);
    });

    it("should return empty object for block with no params", () => {
      const thruster = BLOCK_DEFINITIONS.find(
        (b) => b.id === "thruster-failure",
      )!;
      const defaults = getDefaultParameters(thruster);
      expect(Object.keys(defaults)).toHaveLength(0);
    });
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ephemeris/scenario-builder/block-definitions.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/app/dashboard/ephemeris/components/scenario-builder/block-definitions.ts`:

```typescript
export type ParameterType = "slider" | "select";

export interface SliderParameterDef {
  type: "slider";
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: string;
}

export interface SelectParameterDef {
  type: "select";
  key: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  defaultValue: string;
}

export type ParameterDef = SliderParameterDef | SelectParameterDef;

export interface BlockDefinition {
  id: string;
  name: string;
  description: string;
  icon: string; // lucide icon name
  color: string; // tailwind text color class for the icon accent
  scenarioType: string;
  parameterDefs: ParameterDef[];
}

export interface PipelineBlockInstance {
  instanceId: string;
  definitionId: string;
  parameters: Record<string, unknown>;
}

const JURISDICTIONS = [
  { value: "DE", label: "DE — Germany" },
  { value: "NO", label: "NO — Norway" },
  { value: "GB", label: "GB — United Kingdom" },
  { value: "LU", label: "LU — Luxembourg" },
  { value: "FR", label: "FR — France" },
  { value: "IT", label: "IT — Italy" },
  { value: "SE", label: "SE — Sweden" },
];

export const BLOCK_DEFINITIONS: BlockDefinition[] = [
  {
    id: "orbit-raise",
    name: "Orbit Raise",
    description: "Raise orbital altitude, consuming fuel",
    icon: "ArrowUpCircle",
    color: "text-blue-600",
    scenarioType: "ORBIT_RAISE",
    parameterDefs: [
      {
        type: "slider",
        key: "altitudeDeltaKm",
        label: "Altitude Change",
        min: 10,
        max: 200,
        step: 10,
        defaultValue: 50,
        unit: "km",
      },
      {
        type: "slider",
        key: "fuelCostPct",
        label: "Fuel Cost",
        min: 0.5,
        max: 10,
        step: 0.5,
        defaultValue: 2,
        unit: "%",
      },
    ],
  },
  {
    id: "fuel-burn",
    name: "Fuel Burn",
    description: "Simulate fuel consumption event",
    icon: "Flame",
    color: "text-orange-500",
    scenarioType: "FUEL_BURN",
    parameterDefs: [
      {
        type: "slider",
        key: "burnPct",
        label: "Fuel Burned",
        min: 1,
        max: 50,
        step: 1,
        defaultValue: 5,
        unit: "%",
      },
    ],
  },
  {
    id: "thruster-failure",
    name: "Thruster Failure",
    description: "Complete thruster system failure",
    icon: "AlertTriangle",
    color: "text-red-500",
    scenarioType: "THRUSTER_FAILURE",
    parameterDefs: [],
  },
  {
    id: "eol-extension",
    name: "EOL Extension",
    description: "Extend end-of-life mission duration",
    icon: "Clock",
    color: "text-amber-500",
    scenarioType: "EOL_EXTENSION",
    parameterDefs: [
      {
        type: "slider",
        key: "extensionYears",
        label: "Extension",
        min: 1,
        max: 10,
        step: 1,
        defaultValue: 2,
        unit: "years",
      },
    ],
  },
  {
    id: "jurisdiction-change",
    name: "Jurisdiction Change",
    description: "Re-flag to different jurisdiction",
    icon: "Globe",
    color: "text-indigo-500",
    scenarioType: "JURISDICTION_CHANGE",
    parameterDefs: [
      {
        type: "select",
        key: "toJurisdiction",
        label: "Target Jurisdiction",
        options: JURISDICTIONS,
        defaultValue: "LU",
      },
    ],
  },
  {
    id: "custom",
    name: "Custom Scenario",
    description: "Define custom parameters",
    icon: "Wrench",
    color: "text-[#6B7280]",
    scenarioType: "CUSTOM",
    parameterDefs: [],
  },
];

let counter = 0;

export function createBlockInstance(
  definition: BlockDefinition,
): PipelineBlockInstance {
  counter += 1;
  return {
    instanceId: `${definition.id}-${Date.now()}-${counter}`,
    definitionId: definition.id,
    parameters: getDefaultParameters(definition),
  };
}

export function getDefaultParameters(
  definition: BlockDefinition,
): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  for (const p of definition.parameterDefs) {
    params[p.key] = p.defaultValue;
  }
  return params;
}
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ephemeris/scenario-builder/block-definitions.test.ts`
Expected: All 6 tests PASS

**Step 5: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/block-definitions.ts tests/unit/ephemeris/scenario-builder/block-definitions.test.ts
git commit -m "feat(ephemeris): add scenario block definitions registry with tests"
```

---

## Task 3: useScenarioSimulation hook

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation.ts`
- Test: `tests/unit/ephemeris/scenario-builder/useScenarioSimulation.test.ts`

**Step 1: Write the failing test**

Create `tests/unit/ephemeris/scenario-builder/useScenarioSimulation.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useScenarioSimulation } from "@/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation";
import {
  BLOCK_DEFINITIONS,
  createBlockInstance,
} from "@/app/dashboard/ephemeris/components/scenario-builder/block-definitions";

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock csrfHeaders
vi.mock("@/lib/csrf-client", () => ({
  csrfHeaders: () => ({ "x-csrf-token": "test-token" }),
}));

describe("useScenarioSimulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty pipeline and no results", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    expect(result.current.pipeline).toEqual([]);
    expect(result.current.results).toBeNull();
    expect(result.current.isRunning).toBe(false);
  });

  it("should add a block to the pipeline", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const orbitDef = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
    const instance = createBlockInstance(orbitDef);

    act(() => {
      result.current.addBlock(instance);
    });

    expect(result.current.pipeline).toHaveLength(1);
    expect(result.current.pipeline[0].definitionId).toBe("orbit-raise");
  });

  it("should remove a block from the pipeline", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const orbitDef = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
    const instance = createBlockInstance(orbitDef);

    act(() => {
      result.current.addBlock(instance);
    });
    const id = result.current.pipeline[0].instanceId;
    act(() => {
      result.current.removeBlock(id);
    });

    expect(result.current.pipeline).toHaveLength(0);
  });

  it("should update block parameters", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const orbitDef = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
    const instance = createBlockInstance(orbitDef);

    act(() => {
      result.current.addBlock(instance);
    });
    const id = result.current.pipeline[0].instanceId;
    act(() => {
      result.current.updateBlockParams(id, { altitudeDeltaKm: 100 });
    });

    expect(result.current.pipeline[0].parameters.altitudeDeltaKm).toBe(100);
  });

  it("should reorder blocks", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const orbitDef = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;
    const fuelDef = BLOCK_DEFINITIONS.find((b) => b.id === "fuel-burn")!;

    act(() => {
      result.current.addBlock(createBlockInstance(orbitDef));
      result.current.addBlock(createBlockInstance(fuelDef));
    });

    const ids = result.current.pipeline.map((b) => b.instanceId);
    act(() => {
      result.current.reorderBlocks(ids[1], ids[0]);
    });

    expect(result.current.pipeline[0].definitionId).toBe("fuel-burn");
    expect(result.current.pipeline[1].definitionId).toBe("orbit-raise");
  });

  it("should reset pipeline and results", () => {
    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const orbitDef = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;

    act(() => {
      result.current.addBlock(createBlockInstance(orbitDef));
    });
    act(() => {
      result.current.reset();
    });

    expect(result.current.pipeline).toHaveLength(0);
    expect(result.current.results).toBeNull();
  });

  it("should run simulation and aggregate results", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          scenario: {
            type: "ORBIT_RAISE",
            parameters: { altitudeDeltaKm: 50 },
          },
          baselineHorizon: 847,
          projectedHorizon: 912,
          horizonDelta: 65,
          affectedRegulations: [
            {
              regulationRef: "CA Art.12",
              statusBefore: "COMPLIANT",
              statusAfter: "WARNING",
              crossingDateBefore: null,
              crossingDateAfter: "2027-06-15",
            },
          ],
          fuelImpact: { before: 34, after: 32, delta: -2 },
          recommendation: "Orbit raise gains 65 days.",
        },
      }),
    });

    const { result } = renderHook(() => useScenarioSimulation("25544"));
    const orbitDef = BLOCK_DEFINITIONS.find((b) => b.id === "orbit-raise")!;

    act(() => {
      result.current.addBlock(createBlockInstance(orbitDef));
    });

    await act(async () => {
      await result.current.runSimulation();
    });

    expect(result.current.results).not.toBeNull();
    expect(result.current.results!.totalHorizonDelta).toBe(65);
    expect(result.current.results!.stepResults).toHaveLength(1);
    expect(result.current.isRunning).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/ephemeris/scenario-builder/useScenarioSimulation.test.ts`
Expected: FAIL — module not found

**Step 3: Write the implementation**

Create `src/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation.ts`:

```typescript
"use client";

import { useState, useCallback } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import type { PipelineBlockInstance } from "./block-definitions";
import { BLOCK_DEFINITIONS } from "./block-definitions";

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

export function useScenarioSimulation(noradId: string) {
  const [pipeline, setPipeline] = useState<PipelineBlockInstance[]>([]);
  const [results, setResults] = useState<SimulationResults | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const updated = [...prev];
      const [moved] = updated.splice(oldIndex, 1);
      updated.splice(newIndex, 0, moved);
      return updated;
    });
    setResults(null);
  }, []);

  const reset = useCallback(() => {
    setPipeline([]);
    setResults(null);
    setError(null);
  }, []);

  const runSimulation = useCallback(async () => {
    if (pipeline.length === 0) return;
    setIsRunning(true);
    setError(null);

    const stepResults: StepResult[] = [];

    try {
      for (const block of pipeline) {
        const definition = BLOCK_DEFINITIONS.find(
          (d) => d.id === block.definitionId,
        );
        if (!definition || definition.scenarioType === "CUSTOM") continue;

        const res = await fetch("/api/v1/ephemeris/what-if", {
          method: "POST",
          headers: { ...csrfHeaders(), "Content-Type": "application/json" },
          body: JSON.stringify({
            norad_id: noradId,
            scenario: {
              type: definition.scenarioType,
              parameters: block.parameters,
            },
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error || `Simulation failed for ${definition.name}`,
          );
        }

        const data = await res.json();
        stepResults.push({
          blockInstanceId: block.instanceId,
          scenarioType: definition.scenarioType,
          baselineHorizon: data.data.baselineHorizon,
          projectedHorizon: data.data.projectedHorizon,
          horizonDelta: data.data.horizonDelta,
          affectedRegulations: data.data.affectedRegulations ?? [],
          fuelImpact: data.data.fuelImpact ?? null,
          recommendation: data.data.recommendation ?? "",
        });
      }

      // Aggregate results
      const totalHorizonDelta = stepResults.reduce(
        (sum, r) => sum + r.horizonDelta,
        0,
      );
      const totalFuelDelta = stepResults.reduce(
        (sum, r) => sum + (r.fuelImpact?.delta ?? 0),
        0,
      );

      // Deduplicate regulations by ref, keep last status
      const regMap = new Map<
        string,
        (typeof stepResults)[0]["affectedRegulations"][0]
      >();
      for (const step of stepResults) {
        for (const reg of step.affectedRegulations) {
          regMap.set(reg.regulationRef, reg);
        }
      }

      const recommendations = stepResults
        .map((r) => r.recommendation)
        .filter(Boolean);

      setResults({
        stepResults,
        totalHorizonDelta,
        totalFuelDelta,
        allAffectedRegulations: Array.from(regMap.values()),
        finalRecommendation: recommendations.join(" "),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed");
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run tests/unit/ephemeris/scenario-builder/useScenarioSimulation.test.ts`
Expected: All 7 tests PASS

**Step 5: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation.ts tests/unit/ephemeris/scenario-builder/useScenarioSimulation.test.ts
git commit -m "feat(ephemeris): add useScenarioSimulation hook with pipeline state management"
```

---

## Task 4: BlockPalette component

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx`

**Context:** The palette sits in the left column (240px). It renders all block definitions as draggable cards. When a user drags a card and drops it on the pipeline, a new instance is created.

**Step 1: Write the component**

Create `src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx`:

```tsx
"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
} from "lucide-react";
import type { BlockDefinition } from "./block-definitions";
import { BLOCK_DEFINITIONS } from "./block-definitions";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
};

function DraggableBlock({ definition }: { definition: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${definition.id}`,
      data: { type: "palette-block", definition },
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  const Icon = ICON_MAP[definition.icon];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`
        flex items-center gap-3 p-3 rounded-lg border border-[#E5E7EB] bg-white
        cursor-grab active:cursor-grabbing
        hover:border-[#D1D5DB] hover:shadow-sm transition-all
        ${isDragging ? "shadow-lg ring-2 ring-[#111827]/10" : ""}
      `}
    >
      {Icon && <Icon className={`w-4 h-4 flex-shrink-0 ${definition.color}`} />}
      <div className="min-w-0">
        <p className="text-small font-medium text-[#111827] truncate">
          {definition.name}
        </p>
        <p className="text-micro text-[#9CA3AF] truncate">
          {definition.description}
        </p>
      </div>
    </div>
  );
}

export default function BlockPalette() {
  return (
    <div className="w-[240px] flex-shrink-0">
      <h4 className="text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
        Scenario Blocks
      </h4>
      <div className="space-y-2">
        {BLOCK_DEFINITIONS.map((def) => (
          <DraggableBlock key={def.id} definition={def} />
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "scenario-builder" || echo "No TS errors in scenario-builder"`
Expected: No TypeScript errors related to scenario-builder files

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx
git commit -m "feat(ephemeris): add draggable BlockPalette component for scenario builder"
```

---

## Task 5: PipelineBlock component (individual block with parameters)

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx`

**Context:** Each block dropped into the pipeline renders as a card with parameter controls. Sliders for numeric params, dropdowns for select params. Blocks are sortable (drag to reorder) and dismissable (X button).

**Step 1: Write the component**

Create `src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx`:

```tsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  GripVertical,
  X,
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
} from "lucide-react";
import type {
  BlockDefinition,
  PipelineBlockInstance,
  ParameterDef,
} from "./block-definitions";
import { BLOCK_DEFINITIONS } from "./block-definitions";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
};

interface PipelineBlockProps {
  instance: PipelineBlockInstance;
  index: number;
  onUpdateParams: (instanceId: string, params: Record<string, unknown>) => void;
  onRemove: (instanceId: string) => void;
}

function ParameterControl({
  paramDef,
  value,
  onChange,
}: {
  paramDef: ParameterDef;
  value: unknown;
  onChange: (key: string, val: unknown) => void;
}) {
  if (paramDef.type === "slider") {
    const numValue = typeof value === "number" ? value : paramDef.defaultValue;
    return (
      <div className="flex items-center gap-3">
        <label className="text-micro text-[#6B7280] w-24 flex-shrink-0">
          {paramDef.label}
        </label>
        <input
          type="range"
          min={paramDef.min}
          max={paramDef.max}
          step={paramDef.step}
          value={numValue}
          onChange={(e) => onChange(paramDef.key, parseFloat(e.target.value))}
          className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#111827] [&::-webkit-slider-thumb]:cursor-pointer"
        />
        <span className="text-small font-medium text-[#111827] w-16 text-right tabular-nums">
          {numValue}
          {paramDef.unit}
        </span>
      </div>
    );
  }

  if (paramDef.type === "select") {
    const strValue = typeof value === "string" ? value : paramDef.defaultValue;
    return (
      <div className="flex items-center gap-3">
        <label className="text-micro text-[#6B7280] w-24 flex-shrink-0">
          {paramDef.label}
        </label>
        <select
          value={strValue}
          onChange={(e) => onChange(paramDef.key, e.target.value)}
          className="flex-1 px-2.5 py-1.5 rounded-lg bg-white border border-[#D1D5DB]
            text-small text-[#111827] focus:outline-none focus:border-[#111827]"
        >
          {paramDef.options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}

export default function PipelineBlock({
  instance,
  index,
  onUpdateParams,
  onRemove,
}: PipelineBlockProps) {
  const definition = BLOCK_DEFINITIONS.find(
    (d) => d.id === instance.definitionId,
  );

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: instance.instanceId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  if (!definition) return null;

  const Icon = ICON_MAP[definition.icon];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        rounded-xl border bg-white p-4 transition-shadow
        ${isDragging ? "shadow-lg border-[#111827]/20" : "border-[#E5E7EB] shadow-sm"}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <button
          {...attributes}
          {...listeners}
          className="p-0.5 text-[#D1D5DB] hover:text-[#9CA3AF] cursor-grab active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>
        <span className="text-micro font-medium text-[#9CA3AF] w-5">
          {index + 1}
        </span>
        {Icon && <Icon className={`w-4 h-4 ${definition.color}`} />}
        <span className="text-small font-medium text-[#111827] flex-1">
          {definition.name}
        </span>
        <button
          onClick={() => onRemove(instance.instanceId)}
          className="p-1 text-[#D1D5DB] hover:text-red-500 transition-colors"
          aria-label={`Remove ${definition.name}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Parameters */}
      {definition.parameterDefs.length > 0 ? (
        <div className="space-y-2.5 pl-7">
          {definition.parameterDefs.map((paramDef) => (
            <ParameterControl
              key={paramDef.key}
              paramDef={paramDef}
              value={instance.parameters[paramDef.key]}
              onChange={(key, val) =>
                onUpdateParams(instance.instanceId, { [key]: val })
              }
            />
          ))}
        </div>
      ) : (
        <p className="text-micro text-[#9CA3AF] pl-7 italic">
          No configurable parameters
        </p>
      )}
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "PipelineBlock" || echo "No TS errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx
git commit -m "feat(ephemeris): add PipelineBlock component with parameter controls"
```

---

## Task 6: ScenarioPipeline component (drop zone + sortable list)

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx`

**Context:** Center column. Uses `@dnd-kit/sortable` `SortableContext` to make pipeline blocks reorderable. Shows a dashed "drop here" zone when empty or at the bottom.

**Step 1: Write the component**

Create `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx`:

```tsx
"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Layers } from "lucide-react";
import PipelineBlock from "./PipelineBlock";
import type { PipelineBlockInstance } from "./block-definitions";

interface ScenarioPipelineProps {
  pipeline: PipelineBlockInstance[];
  onUpdateParams: (instanceId: string, params: Record<string, unknown>) => void;
  onRemove: (instanceId: string) => void;
}

function DropZone({ isEmpty }: { isEmpty: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: "pipeline-drop-zone" });

  return (
    <div
      ref={setNodeRef}
      className={`
        rounded-xl border-2 border-dashed p-6 transition-all text-center
        ${
          isOver
            ? "border-[#111827] bg-[#F7F8FA]"
            : "border-[#E5E7EB] bg-transparent"
        }
        ${isEmpty ? "py-16" : "py-4"}
      `}
    >
      <div
        className={`flex flex-col items-center gap-2 ${isOver ? "text-[#111827]" : "text-[#D1D5DB]"}`}
      >
        <Layers className="w-5 h-5" />
        <p className="text-small">
          {isEmpty
            ? "Drag scenario blocks here to build your simulation"
            : "Drop here to add another step"}
        </p>
      </div>
    </div>
  );
}

export default function ScenarioPipeline({
  pipeline,
  onUpdateParams,
  onRemove,
}: ScenarioPipelineProps) {
  const sortableIds = pipeline.map((b) => b.instanceId);

  return (
    <div className="flex-1 min-w-0">
      <h4 className="text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
        Simulation Pipeline
        {pipeline.length > 0 && (
          <span className="ml-2 text-[#111827]">
            ({pipeline.length} step{pipeline.length !== 1 ? "s" : ""})
          </span>
        )}
      </h4>

      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-2">
          {pipeline.map((block, index) => (
            <div key={block.instanceId}>
              <PipelineBlock
                instance={block}
                index={index}
                onUpdateParams={onUpdateParams}
                onRemove={onRemove}
              />
              {/* Connector arrow between blocks */}
              {index < pipeline.length - 1 && (
                <div className="flex justify-center py-1">
                  <div className="w-px h-4 bg-[#E5E7EB]" />
                </div>
              )}
            </div>
          ))}
        </div>
      </SortableContext>

      <div className={pipeline.length > 0 ? "mt-2" : ""}>
        <DropZone isEmpty={pipeline.length === 0} />
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "ScenarioPipeline" || echo "No TS errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx
git commit -m "feat(ephemeris): add ScenarioPipeline component with sortable drop zone"
```

---

## Task 7: ResultsPanel component

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx`

**Context:** Right column (320px). Shows aggregated simulation results: horizon delta, fuel impact, affected regulations, and recommendations. Shows empty state when no results.

**Step 1: Write the component**

Create `src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx`:

```tsx
"use client";

import {
  Play,
  RotateCcw,
  TrendingUp,
  TrendingDown,
  Minus,
  Fuel,
  AlertCircle,
  Loader2,
} from "lucide-react";
import type { SimulationResults } from "./useScenarioSimulation";

interface ResultsPanelProps {
  results: SimulationResults | null;
  isRunning: boolean;
  error: string | null;
  pipelineLength: number;
  onRun: () => void;
  onReset: () => void;
}

function DeltaBadge({ value, unit }: { value: number; unit: string }) {
  const isPositive = value > 0;
  const isNegative = value < 0;

  return (
    <span
      className={`
        inline-flex items-center gap-0.5 text-small font-medium
        ${isPositive ? "text-[#111827]" : isNegative ? "text-red-500" : "text-[#9CA3AF]"}
      `}
    >
      {isPositive ? (
        <TrendingUp className="w-3.5 h-3.5" />
      ) : isNegative ? (
        <TrendingDown className="w-3.5 h-3.5" />
      ) : (
        <Minus className="w-3.5 h-3.5" />
      )}
      {isPositive ? "+" : ""}
      {value}
      {unit}
    </span>
  );
}

function statusIcon(status: string) {
  switch (status) {
    case "COMPLIANT":
      return <span className="text-[#111827]">&#x2713;</span>;
    case "WARNING":
      return <span className="text-amber-500">&#x26A0;</span>;
    case "NON_COMPLIANT":
      return <span className="text-red-500">&#x2717;</span>;
    default:
      return <span className="text-[#9CA3AF]">?</span>;
  }
}

export default function ResultsPanel({
  results,
  isRunning,
  error,
  pipelineLength,
  onRun,
  onReset,
}: ResultsPanelProps) {
  return (
    <div className="w-[320px] flex-shrink-0">
      <h4 className="text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
        Simulation Results
      </h4>

      <div className="rounded-xl border border-[#E5E7EB] bg-[#F7F8FA] p-4 space-y-4">
        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onRun}
            disabled={isRunning || pipelineLength === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg
              text-small font-medium bg-[#111827] text-white hover:bg-[#374151]
              transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Scenario
              </>
            )}
          </button>
          <button
            onClick={onReset}
            disabled={pipelineLength === 0}
            className="p-2.5 rounded-lg border border-[#E5E7EB] text-[#6B7280]
              hover:text-[#111827] hover:border-[#D1D5DB] transition-colors
              disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Reset pipeline"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-small text-red-600">{error}</p>
          </div>
        )}

        {/* Results */}
        {results ? (
          <>
            {/* Horizon Delta */}
            <div className="p-3 rounded-lg bg-white border border-[#E5E7EB]">
              <p className="text-micro text-[#9CA3AF] uppercase tracking-wider mb-1">
                Compliance Horizon
              </p>
              <DeltaBadge value={results.totalHorizonDelta} unit=" days" />
            </div>

            {/* Fuel Impact */}
            {results.totalFuelDelta !== 0 && (
              <div className="p-3 rounded-lg bg-white border border-[#E5E7EB]">
                <div className="flex items-center gap-1.5 mb-1">
                  <Fuel className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <p className="text-micro text-[#9CA3AF] uppercase tracking-wider">
                    Fuel Impact
                  </p>
                </div>
                <DeltaBadge value={results.totalFuelDelta} unit="%" />
              </div>
            )}

            {/* Affected Regulations */}
            {results.allAffectedRegulations.length > 0 && (
              <div className="p-3 rounded-lg bg-white border border-[#E5E7EB]">
                <p className="text-micro text-[#9CA3AF] uppercase tracking-wider mb-2">
                  Affected Regulations ({results.allAffectedRegulations.length})
                </p>
                <div className="space-y-1.5">
                  {results.allAffectedRegulations.map((reg) => (
                    <div
                      key={reg.regulationRef}
                      className="flex items-center justify-between text-small"
                    >
                      <span className="text-[#374151] truncate">
                        {reg.regulationRef}
                      </span>
                      <span className="flex items-center gap-1 flex-shrink-0">
                        {statusIcon(reg.statusBefore)}
                        <span className="text-[#D1D5DB]">&rarr;</span>
                        {statusIcon(reg.statusAfter)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step-by-step breakdown */}
            {results.stepResults.length > 1 && (
              <div className="p-3 rounded-lg bg-white border border-[#E5E7EB]">
                <p className="text-micro text-[#9CA3AF] uppercase tracking-wider mb-2">
                  Step Breakdown
                </p>
                <div className="space-y-1">
                  {results.stepResults.map((step, i) => (
                    <div
                      key={step.blockInstanceId}
                      className="flex items-center justify-between text-small"
                    >
                      <span className="text-[#6B7280]">
                        {i + 1}. {step.scenarioType.replace(/_/g, " ")}
                      </span>
                      <DeltaBadge value={step.horizonDelta} unit="d" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {results.finalRecommendation && (
              <div className="p-3 rounded-lg bg-white border border-[#E5E7EB]">
                <p className="text-micro text-[#9CA3AF] uppercase tracking-wider mb-1">
                  Recommendation
                </p>
                <p className="text-small text-[#374151] leading-relaxed">
                  {results.finalRecommendation}
                </p>
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="py-8 text-center">
            <p className="text-small text-[#D1D5DB]">
              {pipelineLength === 0
                ? "Add blocks to build a scenario"
                : "Click Run to simulate"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "ResultsPanel" || echo "No TS errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx
git commit -m "feat(ephemeris): add ResultsPanel component for simulation results display"
```

---

## Task 8: ScenarioBuilder container (main 3-column component)

**Files:**

- Create: `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx`

**Context:** This is the top-level component that composes all sub-components. It wraps everything in `DndContext` from `@dnd-kit/core`, handles drag-start/end events, creates block instances from palette drags, and delegates sorting to `SortableContext`.

**Step 1: Write the component**

Create `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx`:

```tsx
"use client";

import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
} from "lucide-react";
import BlockPalette from "./BlockPalette";
import ScenarioPipeline from "./ScenarioPipeline";
import ResultsPanel from "./ResultsPanel";
import { useScenarioSimulation } from "./useScenarioSimulation";
import { createBlockInstance, type BlockDefinition } from "./block-definitions";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
};

interface ScenarioBuilderProps {
  noradId: string;
  satelliteName: string;
}

export default function ScenarioBuilder({ noradId }: ScenarioBuilderProps) {
  const {
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
  } = useScenarioSimulation(noradId);

  const [activeDragDef, setActiveDragDef] = useState<BlockDefinition | null>(
    null,
  );

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragStart = (event: DragStartEvent) => {
    const data = event.active.data.current;
    if (data?.type === "palette-block") {
      setActiveDragDef(data.definition as BlockDefinition);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragDef(null);
    const { active, over } = event;

    if (!over) return;

    const activeData = active.data.current;

    // Dropping from palette → create new instance
    if (activeData?.type === "palette-block") {
      const definition = activeData.definition as BlockDefinition;
      const instance = createBlockInstance(definition);
      addBlock(instance);
      return;
    }

    // Reordering within pipeline
    if (active.id !== over.id) {
      reorderBlocks(active.id as string, over.id as string);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 items-start">
        {/* Left: Palette */}
        <BlockPalette />

        {/* Center: Pipeline */}
        <ScenarioPipeline
          pipeline={pipeline}
          onUpdateParams={updateBlockParams}
          onRemove={removeBlock}
        />

        {/* Right: Results */}
        <ResultsPanel
          results={results}
          isRunning={isRunning}
          error={error}
          pipelineLength={pipeline.length}
          onRun={runSimulation}
          onReset={reset}
        />
      </div>

      {/* Drag overlay for palette blocks */}
      <DragOverlay>
        {activeDragDef ? (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-[#111827]/20 bg-white shadow-xl w-[220px]">
            {ICON_MAP[activeDragDef.icon] &&
              (() => {
                const Icon = ICON_MAP[activeDragDef.icon];
                return (
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${activeDragDef.color}`}
                  />
                );
              })()}
            <div className="min-w-0">
              <p className="text-small font-medium text-[#111827] truncate">
                {activeDragDef.name}
              </p>
              <p className="text-micro text-[#9CA3AF] truncate">
                {activeDragDef.description}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
```

**Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit --pretty 2>&1 | grep -i "scenario" || echo "No TS errors"`
Expected: No errors

**Step 3: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx
git commit -m "feat(ephemeris): add ScenarioBuilder container with DndContext integration"
```

---

## Task 9: Integrate into satellite detail page

**Files:**

- Modify: `src/app/dashboard/ephemeris/[noradId]/page.tsx`

**Context:** Replace the `JurisdictionSimulator` import and usage on the "Simulate" tab with the new `ScenarioBuilder` component. The tab stays as "simulate" — only the content changes.

**Step 1: Read the current file**

Read `src/app/dashboard/ephemeris/[noradId]/page.tsx` to find the exact imports and JSX to replace.

**Step 2: Replace import**

Find this import:

```typescript
import JurisdictionSimulator from "../components/jurisdiction-simulator";
```

Replace with:

```typescript
import ScenarioBuilder from "../components/scenario-builder/ScenarioBuilder";
```

**Step 3: Replace tab content**

Find the simulate tab rendering (look for `activeTab === "simulate"`):

```tsx
{
  activeTab === "simulate" && (
    <JurisdictionSimulator
      noradId={noradId}
      satelliteName={state?.satelliteName ?? noradId}
    />
  );
}
```

Replace with:

```tsx
{
  activeTab === "simulate" && (
    <ScenarioBuilder
      noradId={noradId}
      satelliteName={state?.satelliteName ?? noradId}
    />
  );
}
```

**Step 4: Update tab label** (optional — rename from "Simulate" to "Scenario Builder")

Find the tab definition:

```typescript
{ id: "simulate" as const, label: "Simulate", icon: Globe },
```

Replace with:

```typescript
{ id: "simulate" as const, label: "Scenario Builder", icon: Layers },
```

And add `Layers` to the lucide-react import if not already present.

**Step 5: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 6: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add src/app/dashboard/ephemeris/[noradId]/page.tsx
git commit -m "feat(ephemeris): integrate ScenarioBuilder into satellite detail page"
```

---

## Task 10: Responsive layout + mobile support

**Files:**

- Modify: `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx`

**Context:** The 3-column layout needs to collapse on smaller screens. On tablet (md): palette becomes horizontal strip, pipeline + results stack. On mobile: everything stacks vertically.

**Step 1: Update the ScenarioBuilder layout**

Replace the layout div in `ScenarioBuilder.tsx`:

```tsx
{/* Old: */}
<div className="flex gap-6 items-start">

{/* New: */}
<div className="flex flex-col lg:flex-row gap-6 items-start">
```

**Step 2: Update BlockPalette for responsive**

In `BlockPalette.tsx`, update the container:

```tsx
{/* Old: */}
<div className="w-[240px] flex-shrink-0">
  ...
  <div className="space-y-2">

{/* New: */}
<div className="w-full lg:w-[240px] flex-shrink-0">
  ...
  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
```

**Step 3: Update ResultsPanel for responsive**

In `ResultsPanel.tsx`, update the container:

```tsx
{/* Old: */}
<div className="w-[320px] flex-shrink-0">

{/* New: */}
<div className="w-full lg:w-[320px] flex-shrink-0">
```

**Step 4: Verify build**

Run: `npm run build 2>&1 | tail -5`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx
git commit -m "feat(ephemeris): add responsive layout for scenario builder"
```

---

## Task 11: Add to dashboard layout route map

**Files:**

- Modify: `src/app/dashboard/layout.tsx`

**Context:** The dashboard layout has a `ROUTE_TITLE_MAP` that maps routes to page titles. The ephemeris route should be registered there.

**Step 1: Check if ephemeris route exists in the map**

Read `src/app/dashboard/layout.tsx` and check `ROUTE_TITLE_MAP` for `/dashboard/ephemeris`.

**Step 2: Add route if missing**

If `/dashboard/ephemeris` is not in the map, add it:

```typescript
"/dashboard/ephemeris": "_literal:Ephemeris",
```

**Step 3: Commit if changed**

```bash
git add src/app/dashboard/layout.tsx
git commit -m "feat(ephemeris): add ephemeris route to dashboard layout title map"
```

---

## Task 12: Final verification and cleanup

**Step 1: Run TypeScript check**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 2: Run existing tests**

Run: `npx vitest run tests/unit/ephemeris/`
Expected: All tests pass (existing + new from tasks 2 & 3)

**Step 3: Run full test suite**

Run: `npm run test:run`
Expected: All tests pass

**Step 4: Build**

Run: `npm run build`
Expected: Build succeeds

**Step 5: Verify no emerald/dark-mode regressions**

Run these grep checks:

```bash
grep -r "emerald" src/app/dashboard/ephemeris/components/scenario-builder/ || echo "No emerald"
grep -r "dark:" src/app/dashboard/ephemeris/components/scenario-builder/ || echo "No dark:"
```

Expected: No matches

**Step 6: Final commit for any remaining cleanup**

```bash
git add -A
git status
# Only commit if there are actual changes
```

---

## File Summary

**New files (8):**

1. `src/app/dashboard/ephemeris/components/scenario-builder/block-definitions.ts`
2. `src/app/dashboard/ephemeris/components/scenario-builder/useScenarioSimulation.ts`
3. `src/app/dashboard/ephemeris/components/scenario-builder/BlockPalette.tsx`
4. `src/app/dashboard/ephemeris/components/scenario-builder/PipelineBlock.tsx`
5. `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioPipeline.tsx`
6. `src/app/dashboard/ephemeris/components/scenario-builder/ResultsPanel.tsx`
7. `src/app/dashboard/ephemeris/components/scenario-builder/ScenarioBuilder.tsx`
8. `tests/unit/ephemeris/scenario-builder/block-definitions.test.ts`
9. `tests/unit/ephemeris/scenario-builder/useScenarioSimulation.test.ts`

**Modified files (2):**

1. `src/app/dashboard/ephemeris/[noradId]/page.tsx` — swap JurisdictionSimulator → ScenarioBuilder
2. `src/app/dashboard/layout.tsx` — add ephemeris to route title map

**Dependencies added:**

- `@dnd-kit/core`
- `@dnd-kit/sortable`
- `@dnd-kit/utilities`

**No backend changes required.** All scenarios use the existing `/api/v1/ephemeris/what-if` endpoint.
