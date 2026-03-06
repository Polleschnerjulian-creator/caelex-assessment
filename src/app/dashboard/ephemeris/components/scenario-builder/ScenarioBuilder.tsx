"use client";

// ---------------------------------------------------------------------------
// Scenario Builder – top-level container with DndContext
// ---------------------------------------------------------------------------

import React, { useState } from "react";
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
  ArrowDownCircle,
  RotateCcw,
  Target,
  Crosshair,
  ArrowDown,
  Grid3x3,
  Wind,
  AlertTriangle,
  Cog,
  Sun,
  Battery,
  Radio,
  Eye,
  Thermometer,
  Package,
  ShieldOff,
  Droplets,
  Zap,
  CloudLightning,
  Flame,
  Sparkles,
  Cloud,
  WifiOff,
  Satellite,
  Shield,
  Database,
  Globe,
  Users,
  FileText,
  Search,
  FileCheck,
  Trash2,
  AlertOctagon,
  Waves,
  ScrollText,
  Scale,
  Bell,
  Clock,
  CalendarX,
  Maximize2,
  Code,
  UserMinus,
  TrendingUp,
  Truck,
  Ban,
  Scissors,
  UserX,
  Orbit,
  Wifi,
  DollarSign,
} from "lucide-react";

import { createBlockInstance, type BlockDefinition } from "./block-definitions";
import { useScenarioSimulation } from "./useScenarioSimulation";
import { useEphemerisTheme } from "../../theme";
import BlockPalette from "./BlockPalette";
import ScenarioPipeline from "./ScenarioPipeline";
import ResultsPanel from "./ResultsPanel";

// ---------------------------------------------------------------------------
// Icon Mapping (complete set for all 55 blocks)
// ---------------------------------------------------------------------------

export const ICON_MAP: Record<
  string,
  React.ComponentType<{ className?: string; style?: React.CSSProperties }>
> = {
  ArrowUpCircle,
  ArrowDownCircle,
  RotateCcw,
  Target,
  Crosshair,
  ArrowDown,
  Grid3x3,
  Wind,
  AlertTriangle,
  Cog,
  Sun,
  Battery,
  Radio,
  Eye,
  Thermometer,
  Package,
  ShieldOff,
  Droplets,
  Zap,
  CloudLightning,
  Flame,
  Sparkles,
  Cloud,
  WifiOff,
  Satellite,
  Shield,
  Database,
  Globe,
  Users,
  FileText,
  Search,
  FileCheck,
  Trash2,
  AlertOctagon,
  Waves,
  ScrollText,
  Scale,
  Bell,
  Clock,
  CalendarX,
  Maximize2,
  Code,
  UserMinus,
  TrendingUp,
  Truck,
  Ban,
  Scissors,
  UserX,
  Orbit,
  Wifi,
  DollarSign,
};

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScenarioBuilderProps {
  noradId: string;
  satelliteName: string;
}

// ---------------------------------------------------------------------------
// Overlay Card (rendered inside DragOverlay while dragging from palette)
// ---------------------------------------------------------------------------

function OverlayCard({ definition }: { definition: BlockDefinition }) {
  const C = useEphemerisTheme();
  const IconComponent = ICON_MAP[definition.icon];

  return (
    <div
      className="flex items-center gap-2.5 rounded-lg p-3 w-[220px]"
      style={{
        background: C.elevated,
        border: `1px solid ${C.border}`,
        boxShadow: "0 10px 25px rgba(0,0,0,0.25)",
      }}
    >
      {IconComponent && (
        <IconComponent
          className={`h-4 w-4 flex-shrink-0 ${definition.color}`}
        />
      )}
      <span className="text-small font-medium" style={{ color: C.textPrimary }}>
        {definition.name}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario Builder Component
// ---------------------------------------------------------------------------

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

  // -- Sensors ---------------------------------------------------------------

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  // -- Handlers --------------------------------------------------------------

  function handleDragStart(event: DragStartEvent) {
    if (event.active.data.current?.type === "palette-block") {
      setActiveDragDef(event.active.data.current.definition as BlockDefinition);
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveDragDef(null);

    const { active, over } = event;
    if (!over) return;

    if (active.data.current?.type === "palette-block") {
      // Dropping a palette block into the pipeline
      const definition = active.data.current.definition as BlockDefinition;
      const instance = createBlockInstance(definition);
      addBlock(instance);
    } else if (active.id !== over.id) {
      // Reordering existing pipeline blocks
      reorderBlocks(String(active.id), String(over.id));
    }
  }

  // -- Render ----------------------------------------------------------------

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <BlockPalette />
        <ScenarioPipeline
          pipeline={pipeline}
          onUpdateParams={updateBlockParams}
          onRemove={removeBlock}
        />
        <ResultsPanel
          results={results}
          isRunning={isRunning}
          error={error}
          pipelineLength={pipeline.length}
          onRun={runSimulation}
          onReset={reset}
        />
      </div>

      <DragOverlay>
        {activeDragDef ? <OverlayCard definition={activeDragDef} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
