"use client";

// ---------------------------------------------------------------------------
// Pipeline Block – sortable block card with parameter controls
// ---------------------------------------------------------------------------

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, X } from "lucide-react";
import {
  BLOCK_DEFINITIONS,
  type PipelineBlockInstance,
  type SliderParameterDef,
  type SelectParameterDef,
} from "./block-definitions";
import { useEphemerisTheme, type EphemerisColors } from "../../theme";
import { ICON_MAP } from "./ScenarioBuilder";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface PipelineBlockProps {
  instance: PipelineBlockInstance;
  index: number;
  onUpdateParams: (instanceId: string, params: Record<string, unknown>) => void;
  onRemove: (instanceId: string) => void;
}

// ---------------------------------------------------------------------------
// Slider Parameter Control
// ---------------------------------------------------------------------------

function SliderControl({
  param,
  value,
  onChange,
  C,
}: {
  param: SliderParameterDef;
  value: number;
  onChange: (v: number) => void;
  C: EphemerisColors;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label
          className="text-micro font-medium"
          style={{ color: C.textSecondary }}
        >
          {param.label}
        </label>
        <span
          className="text-micro font-medium"
          style={{
            color: C.textPrimary,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {value}
          {param.unit}
        </span>
      </div>
      <input
        type="range"
        min={param.min}
        max={param.max}
        step={param.step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
        style={
          {
            background: C.border,
            "--thumb-color": C.accent,
          } as React.CSSProperties
        }
      />
      <style>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${C.accent};
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: ${C.accent};
          border: 0;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Select Parameter Control
// ---------------------------------------------------------------------------

function SelectControl({
  param,
  value,
  onChange,
  C,
}: {
  param: SelectParameterDef;
  value: string;
  onChange: (v: string) => void;
  C: EphemerisColors;
}) {
  return (
    <div className="space-y-1">
      <label
        className="text-micro font-medium"
        style={{ color: C.textSecondary }}
      >
        {param.label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md px-2.5 py-1.5 text-small focus:outline-none"
        style={{
          background: C.sunken,
          border: `1px solid ${C.border}`,
          color: C.textPrimary,
        }}
      >
        {param.options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pipeline Block Component
// ---------------------------------------------------------------------------

export default function PipelineBlock({
  instance,
  index,
  onUpdateParams,
  onRemove,
}: PipelineBlockProps) {
  const C = useEphemerisTheme();

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

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    background: C.elevated,
    border: `1px solid ${isDragging ? C.borderActive : C.border}`,
    boxShadow: isDragging ? "0 4px 12px rgba(0,0,0,0.2)" : "none",
  };

  if (!definition) return null;

  const IconComponent = ICON_MAP[definition.icon];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-xl p-4 transition-shadow"
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing touch-none"
          style={{ color: C.textMuted }}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span
          className="text-micro font-medium w-5 text-center"
          style={{
            color: C.textMuted,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {index + 1}
        </span>

        {IconComponent && (
          <IconComponent className={`h-4 w-4 ${definition.color}`} />
        )}

        <span
          className="text-small font-medium flex-1"
          style={{ color: C.textPrimary }}
        >
          {definition.name}
        </span>

        <button
          type="button"
          onClick={() => onRemove(instance.instanceId)}
          className="transition-colors"
          style={{
            color: C.textMuted,
            background: "transparent",
            border: "none",
            cursor: "pointer",
          }}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Parameters */}
      {definition.parameterDefs.length > 0 ? (
        <div className="pl-7 mt-3 space-y-3">
          {definition.parameterDefs.map((param) => {
            if (param.type === "slider") {
              return (
                <SliderControl
                  key={param.key}
                  param={param}
                  value={
                    (instance.parameters[param.key] as number) ??
                    param.defaultValue
                  }
                  onChange={(v) =>
                    onUpdateParams(instance.instanceId, { [param.key]: v })
                  }
                  C={C}
                />
              );
            }

            if (param.type === "select") {
              return (
                <SelectControl
                  key={param.key}
                  param={param}
                  value={
                    (instance.parameters[param.key] as string) ??
                    param.defaultValue
                  }
                  onChange={(v) =>
                    onUpdateParams(instance.instanceId, { [param.key]: v })
                  }
                  C={C}
                />
              );
            }

            return null;
          })}
        </div>
      ) : (
        <p
          className="pl-7 mt-2 text-micro italic"
          style={{ color: C.textMuted }}
        >
          No configurable parameters
        </p>
      )}
    </div>
  );
}
