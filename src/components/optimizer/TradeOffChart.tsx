"use client";

import { useState } from "react";
import type { TradeOffPoint } from "@/lib/optimizer/types";
import type { SpaceLawCountryCode } from "@/lib/space-law-types";

interface TradeOffChartProps {
  data: TradeOffPoint[];
  selectedJurisdiction?: SpaceLawCountryCode;
  onSelect: (jurisdiction: SpaceLawCountryCode) => void;
  accentColor?: string;
}

const PADDING = { top: 24, right: 24, bottom: 48, left: 56 };
const WIDTH = 600;
const HEIGHT = 400;
const PLOT_W = WIDTH - PADDING.left - PADDING.right;
const PLOT_H = HEIGHT - PADDING.top - PADDING.bottom;

const Y_TICKS = [0, 25, 50, 75, 100];

function scaleX(cost: number) {
  return PADDING.left + cost * PLOT_W;
}

function scaleY(compliance: number) {
  return PADDING.top + PLOT_H - (compliance / 100) * PLOT_H;
}

function bubbleRadius(weeks: number) {
  return Math.max(6, Math.min(24, 30 - weeks));
}

export default function TradeOffChart({
  data,
  selectedJurisdiction,
  onSelect,
  accentColor = "#10B981",
}: TradeOffChartProps) {
  const [hovered, setHovered] = useState<SpaceLawCountryCode | null>(null);

  const hoveredPoint = hovered
    ? data.find((d) => d.jurisdiction === hovered)
    : null;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      style={{ fontFamily: "IBM Plex Mono, monospace" }}
    >
      {/* Grid lines - horizontal */}
      {Y_TICKS.map((tick) => (
        <line
          key={`grid-y-${tick}`}
          x1={PADDING.left}
          y1={scaleY(tick)}
          x2={WIDTH - PADDING.right}
          y2={scaleY(tick)}
          className="text-slate-700"
          stroke="currentColor"
          opacity={0.2}
          strokeWidth={0.5}
        />
      ))}

      {/* Grid lines - vertical at 0, 0.25, 0.5, 0.75, 1 */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick) => (
        <line
          key={`grid-x-${tick}`}
          x1={scaleX(tick)}
          y1={PADDING.top}
          x2={scaleX(tick)}
          y2={HEIGHT - PADDING.bottom}
          className="text-slate-700"
          stroke="currentColor"
          opacity={0.2}
          strokeWidth={0.5}
        />
      ))}

      {/* Y-axis labels */}
      {Y_TICKS.map((tick) => (
        <text
          key={`y-label-${tick}`}
          x={PADDING.left - 8}
          y={scaleY(tick)}
          textAnchor="end"
          dy="0.35em"
          className="fill-slate-400"
          style={{ fontSize: "10px" }}
        >
          {tick}
        </text>
      ))}

      {/* X-axis labels */}
      <text
        x={PADDING.left}
        y={HEIGHT - PADDING.bottom + 20}
        textAnchor="start"
        className="fill-slate-400"
        style={{ fontSize: "10px" }}
      >
        Low
      </text>
      <text
        x={WIDTH - PADDING.right}
        y={HEIGHT - PADDING.bottom + 20}
        textAnchor="end"
        className="fill-slate-400"
        style={{ fontSize: "10px" }}
      >
        High
      </text>

      {/* Axis titles */}
      <text
        x={PADDING.left + PLOT_W / 2}
        y={HEIGHT - 4}
        textAnchor="middle"
        className="fill-slate-400"
        style={{ fontSize: "11px" }}
      >
        {"Cost \u2192"}
      </text>
      <text
        x={14}
        y={PADDING.top + PLOT_H / 2}
        textAnchor="middle"
        className="fill-slate-400"
        style={{ fontSize: "11px" }}
        transform={`rotate(-90, 14, ${PADDING.top + PLOT_H / 2})`}
      >
        {"Compliance \u2192"}
      </text>

      {/* Bubbles */}
      {data.map((point) => {
        const px = scaleX(point.x);
        const py = scaleY(point.y);
        const r = bubbleRadius(point.size);
        const isSelected = point.jurisdiction === selectedJurisdiction;
        const isHovered = point.jurisdiction === hovered;

        return (
          <g
            key={point.jurisdiction}
            style={{ cursor: "pointer" }}
            onClick={() => onSelect(point.jurisdiction)}
            onMouseEnter={() => setHovered(point.jurisdiction)}
            onMouseLeave={() => setHovered(null)}
          >
            <circle
              cx={px}
              cy={py}
              r={r}
              fill={isSelected ? accentColor : "#64748B"}
              fillOpacity={isSelected ? 0.8 : 0.5}
              stroke={isSelected ? accentColor : isHovered ? "#94A3B8" : "none"}
              strokeWidth={isSelected ? 2 : isHovered ? 1.5 : 0}
            />
            {/* Country code label */}
            <text
              x={px}
              y={py - r - 4}
              textAnchor="middle"
              className="fill-slate-400"
              style={{ fontSize: "9px" }}
            >
              {point.jurisdiction}
            </text>
          </g>
        );
      })}

      {/* Hover tooltip */}
      {hoveredPoint &&
        (() => {
          const tx = scaleX(hoveredPoint.x);
          const ty = scaleY(hoveredPoint.y);
          const r = bubbleRadius(hoveredPoint.size);
          const tooltipW = 160;
          const tooltipH = 52;
          // Position tooltip above the bubble
          let tooltipX = tx - tooltipW / 2;
          let tooltipY = ty - r - tooltipH - 8;
          // Clamp within viewBox
          if (tooltipX < 4) tooltipX = 4;
          if (tooltipX + tooltipW > WIDTH - 4) tooltipX = WIDTH - 4 - tooltipW;
          if (tooltipY < 4) tooltipY = ty + r + 8;

          return (
            <g pointerEvents="none">
              <rect
                x={tooltipX}
                y={tooltipY}
                width={tooltipW}
                height={tooltipH}
                rx={4}
                fill="#0F172A"
                stroke="#334155"
                strokeWidth={1}
              />
              <text
                x={tooltipX + 8}
                y={tooltipY + 16}
                className="fill-slate-200"
                style={{ fontSize: "11px", fontWeight: 600 }}
              >
                {hoveredPoint.label}
              </text>
              <text
                x={tooltipX + 8}
                y={tooltipY + 30}
                className="fill-slate-400"
                style={{ fontSize: "10px" }}
              >
                {`Compliance: ${hoveredPoint.y}`}
              </text>
              <text
                x={tooltipX + 8}
                y={tooltipY + 43}
                className="fill-slate-400"
                style={{ fontSize: "10px" }}
              >
                {`Timeline: ${hoveredPoint.size} weeks`}
              </text>
            </g>
          );
        })()}
    </svg>
  );
}
