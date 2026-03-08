"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BLOCK_CATEGORIES,
  BLOCK_DEFINITIONS,
  type BlockCategory,
} from "../block-definitions";
import { CATEGORY_COLORS } from "../types";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RadialMenuProps {
  position: { x: number; y: number } | null;
  onSelectBlock: (
    definitionId: string,
    screenPos: { x: number; y: number },
  ) => void;
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const RING_RADIUS = 90; // px – distance from center to category button center
const BUTTON_SIZE = 56; // px – category button diameter
const MENU_DIAMETER = 240; // px – overall container diameter
const TOTAL_SEGMENTS = BLOCK_CATEGORIES.length; // 7

// Blocks grouped by category (computed once)
const BLOCKS_BY_CATEGORY: Record<string, typeof BLOCK_DEFINITIONS> =
  BLOCK_DEFINITIONS.reduce(
    (acc, block) => {
      (acc[block.category] ??= []).push(block);
      return acc;
    },
    {} as Record<string, typeof BLOCK_DEFINITIONS>,
  );

// Category abbreviation for the button label
const CATEGORY_SHORT: Record<BlockCategory, string> = {
  orbital: "ORB",
  hardware: "HW",
  environment: "ENV",
  communication: "COM",
  regulatory: "REG",
  operational: "OPS",
  financial: "FIN",
  launch_operations: "LCH",
  vehicle_anomalies: "VEH",
  range_environment: "RNG",
  launch_regulatory: "LRG",
  proximity_operations: "PRX",
  target_events: "TGT",
  isos_regulatory: "ISR",
  site_infrastructure: "SIT",
  site_environmental: "SEV",
  site_regulatory: "SRG",
  capacity_management: "CAP",
  service_operations: "SVC",
  cap_regulatory: "CRG",
  data_operations: "DAT",
  data_security_events: "DSE",
  pdp_regulatory: "PRG",
  ground_operations: "GND",
  command_events: "CMD",
  tco_regulatory: "TRG",
  cross_type: "DEP",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function RadialMenu({
  position,
  onSelectBlock,
  onClose,
}: RadialMenuProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Animate in when position becomes non-null
  useEffect(() => {
    if (position) {
      // Force a reflow so the scale(0) -> scale(1) transition fires
      requestAnimationFrame(() => setIsOpen(true));
    } else {
      setIsOpen(false);
      setHoveredCategory(null);
    }
  }, [position]);

  // Close on Escape
  useEffect(() => {
    if (!position) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [position, onClose]);

  // Close on click outside
  useEffect(() => {
    if (!position) return;
    const handleClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    };
    // Use a timeout so the click that opened the menu doesn't immediately close it
    const timer = setTimeout(
      () => window.addEventListener("mousedown", handleClick),
      0,
    );
    return () => {
      clearTimeout(timer);
      window.removeEventListener("mousedown", handleClick);
    };
  }, [position, onClose]);

  // Compute button positions around the circle
  const categoryPositions = useMemo(() => {
    const angleStep = (2 * Math.PI) / TOTAL_SEGMENTS;
    // Start from top (-PI/2) and go clockwise
    return BLOCK_CATEGORIES.map((cat, i) => {
      const angle = -Math.PI / 2 + i * angleStep;
      return {
        category: cat,
        x: Math.cos(angle) * RING_RADIUS,
        y: Math.sin(angle) * RING_RADIUS,
        angle,
      };
    });
  }, []);

  const handleBlockClick = useCallback(
    (definitionId: string) => {
      if (!position) return;
      onSelectBlock(definitionId, position);
      onClose();
    },
    [position, onSelectBlock, onClose],
  );

  if (!position) return null;

  return (
    <div
      ref={containerRef}
      className="fixed z-50"
      style={{
        left: position.x,
        top: position.y,
        transform: "translate(-50%, -50%)",
      }}
    >
      {/* Radial container with spring animation */}
      <div
        style={{
          width: MENU_DIAMETER,
          height: MENU_DIAMETER,
          transform: isOpen ? "scale(1)" : "scale(0)",
          opacity: isOpen ? 1 : 0,
          transition:
            "transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.15s ease-out",
          transformOrigin: "center center",
        }}
        className="relative"
      >
        {/* Center dot */}
        <div
          className="absolute rounded-full"
          style={{
            width: 8,
            height: 8,
            left: MENU_DIAMETER / 2 - 4,
            top: MENU_DIAMETER / 2 - 4,
            backgroundColor: "#64748B",
            opacity: 0.5,
          }}
        />

        {/* Category buttons arranged in a circle */}
        {categoryPositions.map(({ category, x, y }) => {
          const color = CATEGORY_COLORS[category.id] ?? "#64748B";
          const isHovered = hoveredCategory === category.id;
          const blocks = BLOCKS_BY_CATEGORY[category.id] ?? [];

          return (
            <div
              key={category.id}
              className="absolute"
              style={{
                left: MENU_DIAMETER / 2 + x - BUTTON_SIZE / 2,
                top: MENU_DIAMETER / 2 + y - BUTTON_SIZE / 2,
              }}
              onMouseEnter={() => setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
            >
              {/* Category button */}
              <button
                type="button"
                className="relative flex flex-col items-center justify-center rounded-full border-2 shadow-lg cursor-pointer select-none"
                style={{
                  width: isHovered ? BUTTON_SIZE + 8 : BUTTON_SIZE,
                  height: isHovered ? BUTTON_SIZE + 8 : BUTTON_SIZE,
                  marginLeft: isHovered ? -4 : 0,
                  marginTop: isHovered ? -4 : 0,
                  backgroundColor: color,
                  borderColor: isHovered ? "#FFFFFF" : "rgba(255,255,255,0.3)",
                  boxShadow: isHovered
                    ? `0 0 16px ${color}88, 0 4px 12px rgba(0,0,0,0.3)`
                    : "0 2px 6px rgba(0,0,0,0.2)",
                  transition: "all 0.15s ease-out",
                }}
                title={category.label}
              >
                <span
                  className="font-bold leading-none"
                  style={{
                    fontSize: 11,
                    color: "#FFFFFF",
                    textShadow: "0 1px 2px rgba(0,0,0,0.3)",
                  }}
                >
                  {CATEGORY_SHORT[category.id]}
                </span>
                <span
                  className="leading-none mt-0.5"
                  style={{
                    fontSize: 8,
                    color: "rgba(255,255,255,0.8)",
                  }}
                >
                  {blocks.length}
                </span>
              </button>

              {/* Block list popover on hover — glass design */}
              {isHovered && blocks.length > 0 && (
                <div
                  className="absolute z-50 overflow-hidden"
                  style={{
                    left: BUTTON_SIZE / 2,
                    top: BUTTON_SIZE + 4,
                    transform: "translateX(-50%)",
                    minWidth: 180,
                    maxHeight: 240,
                    overflowY: "auto",
                    background: "rgba(255,255,255,0.75)",
                    backdropFilter: "blur(20px)",
                    WebkitBackdropFilter: "blur(20px)",
                    border: "1px solid rgba(255,255,255,0.8)",
                    borderRadius: 12,
                    boxShadow:
                      "0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
                    animation: "radialFadeIn 0.12s ease-out",
                  }}
                >
                  {/* Category header */}
                  <div
                    className="px-3 py-1.5 text-xs font-semibold"
                    style={{
                      color: color,
                      borderBottom: "1px solid rgba(0,0,0,0.06)",
                      backgroundColor: "rgba(255,255,255,0.3)",
                    }}
                  >
                    {category.label}
                  </div>

                  {/* Block items */}
                  {blocks.map((block) => (
                    <button
                      key={block.id}
                      type="button"
                      className="w-full text-left px-3 py-2 text-xs cursor-pointer"
                      style={{
                        color: "#334155",
                        borderBottom: "1px solid rgba(0,0,0,0.04)",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "rgba(255,255,255,0.5)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "transparent";
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleBlockClick(block.id);
                      }}
                    >
                      <span className="font-medium">{block.name}</span>
                      <span
                        className="block mt-0.5"
                        style={{ color: "#64748B", fontSize: 10 }}
                      >
                        {block.description.length > 60
                          ? block.description.slice(0, 57) + "..."
                          : block.description}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Keyframe animation injected via style tag */}
      <style jsx>{`
        @keyframes radialFadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
