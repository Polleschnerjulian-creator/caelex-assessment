"use client";

// ---------------------------------------------------------------------------
// Pipeline Block – sortable block card with parameter controls
// ---------------------------------------------------------------------------

import React from "react";
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
import {
  BLOCK_DEFINITIONS,
  type PipelineBlockInstance,
  type SliderParameterDef,
  type SelectParameterDef,
} from "./block-definitions";

// ---------------------------------------------------------------------------
// Icon Mapping
// ---------------------------------------------------------------------------

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
};

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
}: {
  param: SliderParameterDef;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-micro font-medium text-[#374151]">
          {param.label}
        </label>
        <span className="text-micro font-medium text-[#111827]">
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
        className={`
          w-full h-1.5 bg-[#E5E7EB] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-3.5
          [&::-webkit-slider-thumb]:h-3.5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-[#111827]
          [&::-moz-range-thumb]:w-3.5
          [&::-moz-range-thumb]:h-3.5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-[#111827]
          [&::-moz-range-thumb]:border-0
        `}
      />
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
}: {
  param: SelectParameterDef;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1">
      <label className="text-micro font-medium text-[#374151]">
        {param.label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="
          w-full rounded-md border border-[#E5E7EB] bg-white px-2.5 py-1.5
          text-small text-[#111827]
          focus:outline-none focus:ring-1 focus:ring-[#111827]/20 focus:border-[#D1D5DB]
        "
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
  };

  if (!definition) return null;

  const IconComponent = ICON_MAP[definition.icon];

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`
        rounded-xl border bg-white p-4 transition-shadow
        ${isDragging ? "shadow-lg border-[#111827]/20" : "border-[#E5E7EB]"}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-[#9CA3AF] hover:text-[#6B7280] touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>

        <span className="text-micro font-medium text-[#9CA3AF] w-5 text-center">
          {index + 1}
        </span>

        {IconComponent && (
          <IconComponent className={`h-4 w-4 ${definition.color}`} />
        )}

        <span className="text-small font-medium text-[#111827] flex-1">
          {definition.name}
        </span>

        <button
          type="button"
          onClick={() => onRemove(instance.instanceId)}
          className="text-[#9CA3AF] hover:text-[#374151] transition-colors"
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
                />
              );
            }

            return null;
          })}
        </div>
      ) : (
        <p className="pl-7 mt-2 text-micro italic text-[#9CA3AF]">
          No configurable parameters
        </p>
      )}
    </div>
  );
}
