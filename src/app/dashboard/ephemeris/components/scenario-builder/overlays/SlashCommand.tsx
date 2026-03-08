"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search } from "lucide-react";
import { BLOCK_DEFINITIONS, BLOCK_CATEGORIES } from "../block-definitions";
import { CATEGORY_COLORS } from "../types";
import { FORGE } from "../../../theme";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SlashCommandProps {
  isOpen: boolean;
  onSelectBlock: (definitionId: string) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function SlashCommand({
  isOpen,
  onSelectBlock,
  onClose,
}: SlashCommandProps) {
  const [query, setQuery] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Filtered & grouped blocks ──────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return BLOCK_DEFINITIONS;
    return BLOCK_DEFINITIONS.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        b.description.toLowerCase().includes(q) ||
        b.category.toLowerCase().includes(q),
    );
  }, [query]);

  const grouped = useMemo(() => {
    const groups: {
      categoryId: string;
      label: string;
      items: typeof filtered;
    }[] = [];
    for (const cat of BLOCK_CATEGORIES) {
      const items = filtered.filter((b) => b.category === cat.id);
      if (items.length > 0) {
        groups.push({ categoryId: cat.id, label: cat.label, items });
      }
    }
    return groups;
  }, [filtered]);

  const flatList = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // ── Reset state when opening/closing ───────────────────────────────────

  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setHighlightIndex(0);
      // Wait for next frame so the input is mounted
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [isOpen]);

  // Clamp highlight when list shrinks
  useEffect(() => {
    setHighlightIndex((prev) =>
      Math.min(prev, Math.max(0, flatList.length - 1)),
    );
  }, [flatList.length]);

  // ── Scroll highlighted item into view ──────────────────────────────────

  useEffect(() => {
    const el = listRef.current?.querySelector("[data-highlighted='true']");
    el?.scrollIntoView({ block: "nearest" });
  }, [highlightIndex]);

  // ── Keyboard navigation ────────────────────────────────────────────────

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightIndex((i) => Math.min(i + 1, flatList.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const block = flatList[highlightIndex];
        if (block) onSelectBlock(block.id);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    },
    [flatList, highlightIndex, onSelectBlock, onClose],
  );

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.05)",
          zIndex: 50,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "opacity 180ms ease",
        }}
        onClick={onClose}
      />

      {/* Card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          width: 400,
          maxHeight: 400,
          transform: isOpen
            ? "translate(-50%,-50%) scale(1)"
            : "translate(-50%,-50%) scale(0.95)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          transition: "transform 180ms ease, opacity 180ms ease",
          zIndex: 51,
          backgroundColor: FORGE.nodeBg,
          borderRadius: 12,
          boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
          border: `1px solid ${FORGE.nodeBorder}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderBottom: `1px solid ${FORGE.nodeBorder}`,
          }}
        >
          <Search size={16} color={FORGE.textTertiary} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search blocks..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setHighlightIndex(0);
            }}
            style={{
              flex: 1,
              border: "none",
              outline: "none",
              background: "transparent",
              fontSize: 14,
              color: FORGE.textPrimary,
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Block list */}
        <div
          ref={listRef}
          style={{
            overflowY: "auto",
            flex: 1,
            padding: "6px 0",
          }}
        >
          {flatList.length === 0 && (
            <div
              style={{
                padding: "20px 14px",
                textAlign: "center",
                color: FORGE.textMuted,
                fontSize: 13,
              }}
            >
              No blocks found
            </div>
          )}

          {grouped.map((group) => (
            <div key={group.categoryId}>
              {/* Category header */}
              <div
                style={{
                  padding: "6px 14px 4px",
                  fontSize: 11,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.04em",
                  color: FORGE.textTertiary,
                }}
              >
                {group.label}
              </div>

              {/* Block rows */}
              {group.items.map((block) => {
                const globalIndex = flatList.indexOf(block);
                const isHighlighted = globalIndex === highlightIndex;
                const dotColor =
                  CATEGORY_COLORS[block.category] ?? FORGE.textMuted;

                return (
                  <div
                    key={block.id}
                    data-highlighted={isHighlighted}
                    onClick={() => onSelectBlock(block.id)}
                    onMouseEnter={() => setHighlightIndex(globalIndex)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "7px 14px",
                      cursor: "pointer",
                      backgroundColor: isHighlighted
                        ? FORGE.canvasBg
                        : "transparent",
                      transition: "background-color 80ms ease",
                    }}
                  >
                    {/* Category dot */}
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: dotColor,
                        flexShrink: 0,
                      }}
                    />

                    {/* Name + description */}
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 500,
                          color: FORGE.textPrimary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {block.name}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: FORGE.textTertiary,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {block.description}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
