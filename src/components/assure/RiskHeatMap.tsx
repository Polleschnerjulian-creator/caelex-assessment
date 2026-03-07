"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ───

interface Risk {
  id: string;
  title: string;
  probability: number;
  impact: number;
  category: string;
}

interface RiskHeatMapProps {
  risks: Risk[];
}

// ─── Helpers ───

function getCellColor(prob: number, impact: number): string {
  const score = prob * impact;
  if (score >= 16) return "bg-red-500/30 border-red-500/20";
  if (score >= 10) return "bg-orange-500/25 border-orange-500/20";
  if (score >= 5) return "bg-amber-500/20 border-amber-500/15";
  return "bg-emerald-500/15 border-emerald-500/10";
}

function getDotColor(category: string): string {
  const colors: Record<string, string> = {
    regulatory: "bg-blue-400",
    financial: "bg-emerald-400",
    operational: "bg-amber-400",
    market: "bg-purple-400",
    technology: "bg-cyan-400",
    legal: "bg-red-400",
    strategic: "bg-pink-400",
  };
  return colors[category.toLowerCase()] || "bg-[var(--text-tertiary)]";
}

const CATEGORY_COLORS: Record<string, string> = {
  regulatory: "text-blue-400",
  financial: "text-emerald-400",
  operational: "text-amber-400",
  market: "text-purple-400",
  technology: "text-cyan-400",
  legal: "text-red-400",
  strategic: "text-pink-400",
};

// ─── Component ───

export default function RiskHeatMap({ risks }: RiskHeatMapProps) {
  const [hoveredRisk, setHoveredRisk] = useState<Risk | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  // Grid is 5x5: probability (y: 1-5 bottom to top) x impact (x: 1-5 left to right)
  const gridSize = 5;
  const cellSize = 64;
  const padding = 40;
  const svgWidth = cellSize * gridSize + padding + 20;
  const svgHeight = cellSize * gridSize + padding + 20;

  // Categories present in risks
  const categories = [...new Set(risks.map((r) => r.category.toLowerCase()))];

  const handleRiskHover = (risk: Risk, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 10,
    });
    setHoveredRisk(risk);
  };

  return (
    <div className="relative">
      {/* Legend */}
      <div className="flex flex-wrap gap-3 mb-4">
        {categories.map((cat) => (
          <div key={cat} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${getDotColor(cat)}`} />
            <span className="text-micro text-[var(--text-tertiary)] capitalize">
              {cat}
            </span>
          </div>
        ))}
      </div>

      {/* Heat Map Grid */}
      <div className="relative overflow-x-auto">
        <svg
          width={svgWidth}
          height={svgHeight}
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="overflow-visible"
        >
          {/* Y-axis label */}
          <text
            x={10}
            y={svgHeight / 2 - 10}
            textAnchor="middle"
            className="fill-[var(--text-tertiary)]"
            style={{ fontSize: 10, fontWeight: 500 }}
            transform={`rotate(-90, 10, ${svgHeight / 2 - 10})`}
          >
            Probability
          </text>

          {/* X-axis label */}
          <text
            x={padding + (cellSize * gridSize) / 2}
            y={svgHeight - 2}
            textAnchor="middle"
            className="fill-[var(--text-tertiary)]"
            style={{ fontSize: 10, fontWeight: 500 }}
          >
            Impact
          </text>

          {/* Grid cells */}
          {Array.from({ length: gridSize }).map((_, row) =>
            Array.from({ length: gridSize }).map((_, col) => {
              const prob = gridSize - row; // 5 at top, 1 at bottom
              const impact = col + 1;
              const score = prob * impact;

              let fill = "rgba(16,185,129,0.08)";
              if (score >= 16) fill = "rgba(239,68,68,0.20)";
              else if (score >= 10) fill = "rgba(249,115,22,0.16)";
              else if (score >= 5) fill = "rgba(245,158,11,0.12)";

              return (
                <rect
                  key={`${row}-${col}`}
                  x={padding + col * cellSize}
                  y={row * cellSize}
                  width={cellSize}
                  height={cellSize}
                  fill={fill}
                  stroke="var(--fill-medium)"
                  strokeWidth={1}
                  rx={4}
                />
              );
            }),
          )}

          {/* Y-axis numbers */}
          {Array.from({ length: gridSize }).map((_, i) => (
            <text
              key={`y-${i}`}
              x={padding - 8}
              y={i * cellSize + cellSize / 2 + 4}
              textAnchor="end"
              className="fill-[var(--text-tertiary)]"
              style={{ fontSize: 11 }}
            >
              {gridSize - i}
            </text>
          ))}

          {/* X-axis numbers */}
          {Array.from({ length: gridSize }).map((_, i) => (
            <text
              key={`x-${i}`}
              x={padding + i * cellSize + cellSize / 2}
              y={gridSize * cellSize + 16}
              textAnchor="middle"
              className="fill-[var(--text-tertiary)]"
              style={{ fontSize: 11 }}
            >
              {i + 1}
            </text>
          ))}

          {/* Risk dots */}
          {risks.map((risk) => {
            const col = Math.min(Math.max(risk.impact, 1), 5) - 1;
            const row = gridSize - Math.min(Math.max(risk.probability, 1), 5);

            // Jitter slightly to avoid overlaps
            const jitterX = ((risk.id.charCodeAt(0) % 5) - 2) * 5;
            const jitterY = (((risk.id.charCodeAt(1) || 0) % 5) - 2) * 5;

            const cx = padding + col * cellSize + cellSize / 2 + jitterX;
            const cy = row * cellSize + cellSize / 2 + jitterY;

            const dotColorHex =
              {
                regulatory: "#60A5FA",
                financial: "#34D399",
                operational: "#FBBF24",
                market: "#A78BFA",
                technology: "#22D3EE",
                legal: "#F87171",
                strategic: "#F472B6",
              }[risk.category.toLowerCase()] || "var(--text-tertiary)";

            return (
              <motion.circle
                key={risk.id}
                cx={cx}
                cy={cy}
                r={8}
                fill={dotColorHex}
                fillOpacity={0.9}
                stroke="var(--fill-heavy)"
                strokeWidth={1}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className="cursor-pointer"
                onMouseEnter={(e) =>
                  handleRiskHover(risk, e as unknown as React.MouseEvent)
                }
                onMouseLeave={() => setHoveredRisk(null)}
                whileHover={{ scale: 1.3 }}
              />
            );
          })}
        </svg>
      </div>

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredRisk && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="fixed z-50 pointer-events-none"
            style={{
              left: tooltipPos.x,
              top: tooltipPos.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-lg shadow-xl px-3 py-2 max-w-[200px]">
              <p className="text-small font-medium text-[var(--text-primary)] truncate">
                {hoveredRisk.title}
              </p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-micro text-[var(--text-tertiary)]">
                  P:{hoveredRisk.probability} I:{hoveredRisk.impact}
                </span>
                <span
                  className={`text-micro capitalize ${CATEGORY_COLORS[hoveredRisk.category.toLowerCase()] || "text-[var(--text-tertiary)]"}`}
                >
                  {hoveredRisk.category}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
