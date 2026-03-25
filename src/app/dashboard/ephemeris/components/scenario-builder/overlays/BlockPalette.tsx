"use client";

import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { useForgeTheme } from "../../../theme";
import { CATEGORY_COLORS } from "../types";
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES } from "../block-definitions";
import { ICON_MAP } from "../icon-map";

// ─── Props ────────────────────────────────────────────────────────────────────

interface BlockPaletteProps {
  onSelectBlock: (definitionId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

// ─── Group blocks by category ─────────────────────────────────────────────────

const BLOCKS_BY_CATEGORY = BLOCK_CATEGORIES.map((cat) => ({
  ...cat,
  blocks: BLOCK_DEFINITIONS.filter((b) => b.category === cat.id),
}));

// ─── Component ────────────────────────────────────────────────────────────────

export default function BlockPalette({
  onSelectBlock,
  collapsed,
  onToggleCollapse,
}: BlockPaletteProps) {
  const { forge, glass, isDark } = useForgeTheme();

  const [query, setQuery] = useState("");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    () => new Set(BLOCK_CATEGORIES.map((c) => c.id)),
  );

  // Track sidebar width for dynamic left position
  const [sidebarWidth, setSidebarWidth] = useState(72);
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setSidebarWidth(detail.width);
    };
    window.addEventListener("sidebar-width-change", handler);
    return () => window.removeEventListener("sidebar-width-change", handler);
  }, []);

  // left = sidebar left (12) + sidebar width + gap (8)
  const paletteLeft = 12 + sidebarWidth + 8;

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return BLOCKS_BY_CATEGORY;
    const q = query.toLowerCase();
    return BLOCKS_BY_CATEGORY.map((group) => ({
      ...group,
      blocks: group.blocks.filter(
        (b) =>
          b.name.toLowerCase().includes(q) ||
          b.description.toLowerCase().includes(q) ||
          group.label.toLowerCase().includes(q),
      ),
    })).filter((group) => group.blocks.length > 0);
  }, [query]);

  const toggleCategory = useCallback((catId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId);
      else next.add(catId);
      return next;
    });
  }, []);

  const handleBlockClick = useCallback(
    (definitionId: string) => {
      onSelectBlock(definitionId);
    },
    [onSelectBlock],
  );

  // ─── Glass base styles ─────────────────────────────────────────────────────

  const glassBase: React.CSSProperties = {
    position: "fixed",
    left: paletteLeft,
    top: 72,
    bottom: 24,
    zIndex: 40,
    background: glass.bg,
    backdropFilter: `blur(${glass.blur}px)`,
    WebkitBackdropFilter: `blur(${glass.blur}px)`,
    border: `1px solid ${glass.border}`,
    borderRadius: glass.panelRadius,
    boxShadow: `${glass.shadow}, ${glass.insetGlow}`,
    transition: "left 200ms ease, width 200ms ease, opacity 200ms ease",
    overflow: "hidden",
  };

  // Collapsed state: show only a thin glass toggle strip
  if (collapsed) {
    return (
      <div
        style={{
          ...glassBase,
          width: 40,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          paddingTop: 12,
        }}
      >
        <button
          onClick={onToggleCollapse}
          title="Expand block palette"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: forge.textTertiary,
            padding: 4,
          }}
        >
          <PanelLeftOpen size={18} />
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        ...glassBase,
        width: 260,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "12px 12px 8px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: isDark
            ? "1px solid rgba(255,255,255,0.04)"
            : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <span
          style={{
            fontSize: 11,
            fontWeight: isDark ? 600 : 700,
            color: isDark ? "rgba(255,255,255,0.3)" : forge.textPrimary,
            letterSpacing: isDark ? "0.15em" : "0.06em",
            textTransform: "uppercase",
          }}
        >
          BLOCKS
        </span>
        <button
          onClick={onToggleCollapse}
          title="Collapse block palette"
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: forge.textTertiary,
            padding: 2,
          }}
        >
          <PanelLeftClose size={16} />
        </button>
      </div>

      {/* Search */}
      <div
        style={{
          padding: "8px 12px",
          borderBottom: isDark
            ? "1px solid rgba(255,255,255,0.04)"
            : "1px solid rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: isDark ? 8 : 6,
            background: isDark
              ? "rgba(255,255,255,0.03)"
              : "rgba(255,255,255,0.5)",
            border: isDark
              ? "1px solid rgba(255,255,255,0.05)"
              : "1px solid rgba(255,255,255,0.6)",
            borderRadius: isDark ? 10 : 8,
            padding: isDark ? "8px 12px" : "6px 8px",
          }}
        >
          <Search
            size={13}
            color={isDark ? "rgba(255,255,255,0.2)" : forge.textMuted}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search blocks..."
            style={{
              border: "none",
              background: "none",
              outline: "none",
              fontSize: 12,
              color: forge.textPrimary,
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* Categories & Blocks */}
      <div style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
        {filteredGroups.map((group) => {
          const isExpanded = expandedCategories.has(group.id);
          const catColor = CATEGORY_COLORS[group.id] ?? forge.textMuted;

          return (
            <div key={group.id}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(group.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  width: "100%",
                  padding: "8px 12px",
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                {isExpanded ? (
                  <ChevronDown size={12} color={forge.textTertiary} />
                ) : (
                  <ChevronRight size={12} color={forge.textTertiary} />
                )}
                <div
                  style={{
                    width: isDark ? 6 : 8,
                    height: isDark ? 6 : 8,
                    borderRadius: "50%",
                    background: catColor,
                    flexShrink: 0,
                    ...(isDark ? { boxShadow: `0 0 8px ${catColor}40` } : {}),
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: forge.textSecondary,
                    letterSpacing: "0.01em",
                  }}
                >
                  {group.label}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: forge.textMuted,
                    marginLeft: "auto",
                  }}
                >
                  {group.blocks.length}
                </span>
              </button>

              {/* Block list */}
              {isExpanded && (
                <div style={{ paddingBottom: 4 }}>
                  {group.blocks.map((block) => {
                    const IconComp = ICON_MAP[block.icon];
                    return (
                      <button
                        key={block.id}
                        onClick={() => handleBlockClick(block.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          width: "100%",
                          padding: "6px 12px 6px 32px",
                          border: "none",
                          background: "none",
                          cursor: "pointer",
                          textAlign: "left",
                          borderRadius: 6,
                          transition: "background 150ms",
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            isDark
                              ? "rgba(255,255,255,0.04)"
                              : "rgba(255,255,255,0.5)";
                          if (isDark) {
                            (e.currentTarget as HTMLElement).style.border =
                              "1px solid rgba(255,255,255,0.06)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "none";
                          if (isDark) {
                            (e.currentTarget as HTMLElement).style.border =
                              "1px solid transparent";
                          }
                        }}
                      >
                        {IconComp && (
                          <IconComp
                            style={{
                              width: 14,
                              height: 14,
                              color: catColor,
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 12,
                              color: forge.textPrimary,
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {block.name}
                          </div>
                          <div
                            style={{
                              fontSize: 10,
                              color: forge.textMuted,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {block.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              fontSize: 12,
              color: forge.textMuted,
            }}
          >
            No blocks match &quot;{query}&quot;
          </div>
        )}
      </div>
    </div>
  );
}
