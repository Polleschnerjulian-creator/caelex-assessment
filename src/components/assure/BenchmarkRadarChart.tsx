"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";

// ─── Types ───

interface BenchmarkRadarChartProps {
  companyScores: Record<string, number>;
  benchmarkScores: Record<string, number>;
  labels: string[];
}

// ─── Helpers ───

function polarToCartesian(
  cx: number,
  cy: number,
  radius: number,
  angleIndex: number,
  totalPoints: number,
): { x: number; y: number } {
  const angle = (2 * Math.PI * angleIndex) / totalPoints - Math.PI / 2;
  return {
    x: cx + radius * Math.cos(angle),
    y: cy + radius * Math.sin(angle),
  };
}

function buildPolygonPoints(
  scores: number[],
  cx: number,
  cy: number,
  maxRadius: number,
  totalPoints: number,
  maxScore: number,
): string {
  return scores
    .map((score, i) => {
      const radius = (score / maxScore) * maxRadius;
      const { x, y } = polarToCartesian(cx, cy, radius, i, totalPoints);
      return `${x},${y}`;
    })
    .join(" ");
}

// ─── Component ───

export default function BenchmarkRadarChart({
  companyScores,
  benchmarkScores,
  labels,
}: BenchmarkRadarChartProps) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const maxRadius = size / 2 - 50;
  const maxScore = 100;
  const rings = 5;

  const companyValues = useMemo(
    () => labels.map((l) => companyScores[l] ?? 0),
    [labels, companyScores],
  );

  const benchmarkValues = useMemo(
    () => labels.map((l) => benchmarkScores[l] ?? 0),
    [labels, benchmarkScores],
  );

  const companyPolygon = buildPolygonPoints(
    companyValues,
    cx,
    cy,
    maxRadius,
    labels.length,
    maxScore,
  );

  const benchmarkPolygon = buildPolygonPoints(
    benchmarkValues,
    cx,
    cy,
    maxRadius,
    labels.length,
    maxScore,
  );

  return (
    <div className="inline-flex flex-col items-center gap-4">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="overflow-visible"
      >
        {/* Concentric rings */}
        {Array.from({ length: rings }).map((_, i) => {
          const ringRadius = ((i + 1) / rings) * maxRadius;
          const points = Array.from({ length: labels.length })
            .map((_, j) => {
              const { x, y } = polarToCartesian(
                cx,
                cy,
                ringRadius,
                j,
                labels.length,
              );
              return `${x},${y}`;
            })
            .join(" ");

          return (
            <polygon
              key={`ring-${i}`}
              points={points}
              fill="none"
              stroke="var(--fill-medium)"
              strokeWidth={1}
            />
          );
        })}

        {/* Axis lines */}
        {labels.map((_, i) => {
          const { x, y } = polarToCartesian(
            cx,
            cy,
            maxRadius,
            i,
            labels.length,
          );
          return (
            <line
              key={`axis-${i}`}
              x1={cx}
              y1={cy}
              x2={x}
              y2={y}
              stroke="var(--fill-medium)"
              strokeWidth={1}
            />
          );
        })}

        {/* Benchmark polygon (dashed, slate) */}
        <motion.polygon
          points={benchmarkPolygon}
          fill="rgba(148,163,184,0.08)"
          stroke="rgba(148,163,184,0.5)"
          strokeWidth={1.5}
          strokeDasharray="6 3"
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        />

        {/* Company polygon (emerald, filled) */}
        <motion.polygon
          points={companyPolygon}
          fill="rgba(16,185,129,0.12)"
          stroke="#10B981"
          strokeWidth={2}
          initial={false}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.1, type: "spring" }}
          style={{ transformOrigin: `${cx}px ${cy}px` }}
        />

        {/* Company data points */}
        {companyValues.map((score, i) => {
          const radius = (score / maxScore) * maxRadius;
          const { x, y } = polarToCartesian(cx, cy, radius, i, labels.length);
          return (
            <motion.circle
              key={`company-dot-${i}`}
              cx={x}
              cy={y}
              r={4}
              fill="#10B981"
              stroke="rgba(16,185,129,0.3)"
              strokeWidth={6}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + i * 0.08 }}
            />
          );
        })}

        {/* Axis labels */}
        {labels.map((label, i) => {
          const { x, y } = polarToCartesian(
            cx,
            cy,
            maxRadius + 24,
            i,
            labels.length,
          );
          return (
            <text
              key={`label-${i}`}
              x={x}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-[var(--text-tertiary)]"
              style={{ fontSize: 11, fontWeight: 500 }}
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 bg-emerald-500 rounded" />
          <span className="text-micro text-[var(--text-tertiary)]">
            Your Company
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-0.5 border-t border-dashed border-slate-400" />
          <span className="text-micro text-[var(--text-tertiary)]">
            Peer Median
          </span>
        </div>
      </div>
    </div>
  );
}
