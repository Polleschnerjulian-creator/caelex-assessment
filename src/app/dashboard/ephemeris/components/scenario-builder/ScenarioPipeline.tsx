"use client";

// ---------------------------------------------------------------------------
// Scenario Pipeline – center column drop zone with sortable block list
// ---------------------------------------------------------------------------

import React from "react";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { Layers } from "lucide-react";
import type { PipelineBlockInstance } from "./block-definitions";
import { useEphemerisTheme } from "../../theme";
import PipelineBlock from "./PipelineBlock";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ScenarioPipelineProps {
  pipeline: PipelineBlockInstance[];
  onUpdateParams: (instanceId: string, params: Record<string, unknown>) => void;
  onRemove: (instanceId: string) => void;
}

// ---------------------------------------------------------------------------
// Drop Zone
// ---------------------------------------------------------------------------

function DropZone({ isEmpty }: { isEmpty: boolean }) {
  const C = useEphemerisTheme();
  const { isOver, setNodeRef } = useDroppable({
    id: "pipeline-drop-zone",
  });

  return (
    <div
      ref={setNodeRef}
      className="flex flex-col items-center justify-center rounded-xl py-10 px-6 transition-colors duration-150"
      style={{
        border: `2px dashed ${isOver ? C.accent : C.border}`,
        background: isOver ? `${C.accent}10` : "transparent",
      }}
    >
      <Layers
        className="h-8 w-8 mb-3"
        style={{ color: isOver ? C.accent : C.borderActive }}
      />
      <p className="text-small text-center" style={{ color: C.textTertiary }}>
        {isEmpty
          ? "Drag scenario blocks here to build your simulation"
          : "Drop here to add another step"}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scenario Pipeline Component
// ---------------------------------------------------------------------------

export default function ScenarioPipeline({
  pipeline,
  onUpdateParams,
  onRemove,
}: ScenarioPipelineProps) {
  const C = useEphemerisTheme();
  const sortableIds = pipeline.map((b) => b.instanceId);

  return (
    <section className="flex-1 min-w-0">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h2
          className="text-caption font-medium uppercase tracking-wider"
          style={{
            color: C.textTertiary,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          Simulation Pipeline
        </h2>
        <span
          className="text-micro"
          style={{
            color: C.textMuted,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {pipeline.length} {pipeline.length === 1 ? "step" : "steps"}
        </span>
      </div>

      {/* Sortable block list */}
      <SortableContext
        items={sortableIds}
        strategy={verticalListSortingStrategy}
      >
        <div className="space-y-0">
          {pipeline.map((instance, idx) => (
            <React.Fragment key={instance.instanceId}>
              <PipelineBlock
                instance={instance}
                index={idx}
                onUpdateParams={onUpdateParams}
                onRemove={onRemove}
              />
              {/* Connector line between blocks */}
              {idx < pipeline.length - 1 && (
                <div className="flex justify-center">
                  <div className="w-px h-4" style={{ background: C.border }} />
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </SortableContext>

      {/* Drop zone */}
      {pipeline.length > 0 && (
        <div className="flex justify-center">
          <div className="w-px h-4" style={{ background: C.border }} />
        </div>
      )}
      <DropZone isEmpty={pipeline.length === 0} />
    </section>
  );
}
