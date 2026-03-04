"use client";

// ---------------------------------------------------------------------------
// Block Palette – draggable block cards for the scenario builder
// ---------------------------------------------------------------------------

import React from "react";
import { useDraggable } from "@dnd-kit/core";
import {
  ArrowUpCircle,
  Flame,
  AlertTriangle,
  Clock,
  Globe,
  Wrench,
} from "lucide-react";
import { BLOCK_DEFINITIONS, type BlockDefinition } from "./block-definitions";

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
// Draggable Palette Card
// ---------------------------------------------------------------------------

function PaletteCard({ definition }: { definition: BlockDefinition }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.id}`,
    data: { type: "palette-block", definition },
  });

  const IconComponent = ICON_MAP[definition.icon];

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex items-start gap-2.5 rounded-lg border border-[#E5E7EB] bg-white p-3
        cursor-grab active:cursor-grabbing
        hover:border-[#D1D5DB] hover:shadow-sm
        transition-all duration-150
        ${isDragging ? "opacity-50 shadow-lg ring-2 ring-[#111827]/10" : ""}
      `}
    >
      {IconComponent && (
        <div className="mt-0.5 flex-shrink-0">
          <IconComponent className={`h-4 w-4 ${definition.color}`} />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-small font-medium text-[#111827] leading-tight">
          {definition.name}
        </p>
        <p className="text-micro text-[#9CA3AF] mt-0.5 leading-snug">
          {definition.description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block Palette Container
// ---------------------------------------------------------------------------

export default function BlockPalette() {
  return (
    <aside className="w-full lg:w-[240px] flex-shrink-0">
      <h2 className="text-caption font-medium uppercase tracking-wider text-[#9CA3AF] mb-3">
        Scenario Blocks
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-2">
        {BLOCK_DEFINITIONS.map((def) => (
          <PaletteCard key={def.id} definition={def} />
        ))}
      </div>
    </aside>
  );
}
