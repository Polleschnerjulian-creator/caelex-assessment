"use client";

// ---------------------------------------------------------------------------
// Block Palette – draggable block cards with collapsible categories + search
// ---------------------------------------------------------------------------

import React, { useState, useMemo } from "react";
import { useDraggable } from "@dnd-kit/core";
import { ChevronDown, ChevronRight, Search as SearchIcon } from "lucide-react";
import {
  BLOCK_DEFINITIONS,
  BLOCK_CATEGORIES,
  type BlockDefinition,
  type BlockCategory,
} from "./block-definitions";
import { useEphemerisTheme, type EphemerisColors } from "../../theme";
import { ICON_MAP } from "./ScenarioBuilder";

// ---------------------------------------------------------------------------
// Category colour mapping (hex values for category header icons)
// ---------------------------------------------------------------------------

const CATEGORY_HEX: Record<BlockCategory, string> = {
  orbital: "#3b82f6",
  hardware: "#ef4444",
  environment: "#a855f7",
  communication: "#06b6d4",
  regulatory: "#6366f1",
  operational: "#f59e0b",
  financial: "#10b981",
};

// ---------------------------------------------------------------------------
// Draggable Palette Card
// ---------------------------------------------------------------------------

function PaletteCard({
  definition,
  C,
}: {
  definition: BlockDefinition;
  C: EphemerisColors;
}) {
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
      className="flex items-start gap-2.5 rounded-lg p-2.5 cursor-grab active:cursor-grabbing transition-all duration-150"
      style={{
        background: C.elevated,
        border: `1px solid ${C.border}`,
        opacity: isDragging ? 0.5 : 1,
        boxShadow: isDragging
          ? `0 4px 12px rgba(0,0,0,0.2), 0 0 0 2px ${C.borderActive}`
          : "none",
      }}
    >
      {IconComponent && (
        <div className="mt-0.5 flex-shrink-0">
          <IconComponent className={`h-4 w-4 ${definition.color}`} />
        </div>
      )}
      <div className="min-w-0">
        <p
          className="text-small font-medium leading-tight"
          style={{ color: C.textPrimary }}
        >
          {definition.name}
        </p>
        <p
          className="text-micro mt-0.5 leading-snug"
          style={{ color: C.textTertiary }}
        >
          {definition.description}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Collapsible Category Section
// ---------------------------------------------------------------------------

function CategorySection({
  categoryId,
  label,
  icon,
  blocks,
  isExpanded,
  onToggle,
  C,
}: {
  categoryId: BlockCategory;
  label: string;
  icon: string;
  blocks: BlockDefinition[];
  isExpanded: boolean;
  onToggle: () => void;
  C: EphemerisColors;
}) {
  const IconComponent = ICON_MAP[icon];
  const hexColor = CATEGORY_HEX[categoryId];

  return (
    <div>
      {/* Category header */}
      <button
        type="button"
        onClick={onToggle}
        className="flex items-center gap-2 w-full py-2 px-1 rounded transition-colors duration-100"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        {isExpanded ? (
          <ChevronDown
            className="h-3 w-3 flex-shrink-0"
            style={{ color: C.textMuted }}
          />
        ) : (
          <ChevronRight
            className="h-3 w-3 flex-shrink-0"
            style={{ color: C.textMuted }}
          />
        )}
        {IconComponent && (
          <IconComponent
            className="h-3.5 w-3.5 flex-shrink-0"
            style={{ color: hexColor }}
          />
        )}
        <span
          className="text-caption font-medium flex-1 text-left"
          style={{
            color: C.textSecondary,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {label}
        </span>
        <span
          className="text-micro font-medium"
          style={{
            color: C.textMuted,
            fontFamily: "'IBM Plex Mono', monospace",
          }}
        >
          {blocks.length}
        </span>
      </button>

      {/* Block cards */}
      {isExpanded && (
        <div className="space-y-1.5 pb-2 pl-1">
          {blocks.map((def) => (
            <PaletteCard key={def.id} definition={def} C={C} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Block Palette Container
// ---------------------------------------------------------------------------

export default function BlockPalette() {
  const C = useEphemerisTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<
    Set<BlockCategory>
  >(() => new Set(BLOCK_CATEGORIES.map((c) => c.id)));

  // Group blocks by category
  const blocksByCategory = useMemo(() => {
    const map = new Map<BlockCategory, BlockDefinition[]>();
    for (const cat of BLOCK_CATEGORIES) {
      map.set(cat.id, []);
    }
    for (const def of BLOCK_DEFINITIONS) {
      const arr = map.get(def.category);
      if (arr) arr.push(def);
    }
    return map;
  }, []);

  // Filter blocks by search query
  const filteredByCategory = useMemo(() => {
    if (!searchQuery.trim()) return blocksByCategory;

    const q = searchQuery.toLowerCase();
    const map = new Map<BlockCategory, BlockDefinition[]>();
    for (const [catId, blocks] of blocksByCategory) {
      const filtered = blocks.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q),
      );
      map.set(catId, filtered);
    }
    return map;
  }, [searchQuery, blocksByCategory]);

  const totalFiltered = useMemo(() => {
    let count = 0;
    for (const blocks of filteredByCategory.values()) {
      count += blocks.length;
    }
    return count;
  }, [filteredByCategory]);

  function toggleCategory(id: BlockCategory) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <aside className="w-full lg:w-[260px] flex-shrink-0">
      {/* Header */}
      <h2
        className="text-caption font-medium uppercase tracking-wider mb-3"
        style={{
          color: C.textTertiary,
          fontFamily: "'IBM Plex Mono', monospace",
        }}
      >
        Scenario Blocks
      </h2>

      {/* Search input */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2 mb-3"
        style={{
          background: C.sunken,
          border: `1px solid ${C.border}`,
        }}
      >
        <SearchIcon
          className="h-3.5 w-3.5 flex-shrink-0"
          style={{ color: C.textMuted }}
        />
        <input
          type="text"
          placeholder="Search blocks..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-small outline-none placeholder:opacity-60"
          style={{
            color: C.textPrimary,
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 12,
            border: "none",
          }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="text-micro flex-shrink-0"
            style={{
              color: C.textMuted,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            {totalFiltered} found
          </button>
        )}
      </div>

      {/* Scrollable category list */}
      <div
        className="space-y-1 overflow-y-auto pr-1"
        style={{ maxHeight: "calc(100vh - 260px)" }}
      >
        {BLOCK_CATEGORIES.map((cat) => {
          const blocks = filteredByCategory.get(cat.id) ?? [];
          // Skip empty categories when searching
          if (searchQuery && blocks.length === 0) return null;

          return (
            <CategorySection
              key={cat.id}
              categoryId={cat.id}
              label={cat.label}
              icon={cat.icon}
              blocks={blocks}
              isExpanded={
                searchQuery ? blocks.length > 0 : expandedCategories.has(cat.id)
              }
              onToggle={() => toggleCategory(cat.id)}
              C={C}
            />
          );
        })}
      </div>
    </aside>
  );
}
