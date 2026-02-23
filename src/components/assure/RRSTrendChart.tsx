"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";

interface TrendDataPoint {
  date: string;
  overallScore: number;
  [key: string]: number | string;
}

interface RRSTrendChartProps {
  data: TrendDataPoint[];
  period: "30d" | "90d" | "365d";
  onPeriodChange?: (period: "30d" | "90d" | "365d") => void;
}

const PERIOD_OPTIONS: Array<{ value: "30d" | "90d" | "365d"; label: string }> =
  [
    { value: "30d", label: "30 Days" },
    { value: "90d", label: "90 Days" },
    { value: "365d", label: "1 Year" },
  ];

const LINE_COLORS: Record<string, string> = {
  overallScore: "#10B981",
  authorizationReadiness: "#3B82F6",
  cybersecurityPosture: "#8B5CF6",
  operationalCompliance: "#F59E0B",
  jurisdictionalCoverage: "#06B6D4",
  regulatoryTrajectory: "#EC4899",
  governanceProcess: "#14B8A6",
};

const LINE_LABELS: Record<string, string> = {
  overallScore: "Overall",
  authorizationReadiness: "Authorization",
  cybersecurityPosture: "Cybersecurity",
  operationalCompliance: "Operations",
  jurisdictionalCoverage: "Jurisdictional",
  regulatoryTrajectory: "Trajectory",
  governanceProcess: "Governance",
};

export default function RRSTrendChart({
  data,
  period,
  onPeriodChange,
}: RRSTrendChartProps) {
  const [activeLines, setActiveLines] = useState<Set<string>>(
    new Set(["overallScore"]),
  );
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);

  // Chart dimensions
  const width = 720;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Compute axes
  const { xScale, yScale, yTicks, xLabels } = useMemo(() => {
    const maxY = 100;
    const minY = 0;

    const xScale = (i: number) =>
      padding.left + (i / Math.max(1, data.length - 1)) * chartWidth;
    const yScale = (v: number) =>
      padding.top + (1 - (v - minY) / (maxY - minY)) * chartHeight;

    const yTicks = [0, 20, 40, 60, 80, 100];

    // Pick evenly spaced x-axis labels
    const maxLabels = 8;
    const step = Math.max(1, Math.ceil(data.length / maxLabels));
    const xLabels = data
      .map((d, i) => ({ index: i, label: formatDate(d.date) }))
      .filter((_, i) => i % step === 0 || i === data.length - 1);

    return { xScale, yScale, yTicks, xLabels };
  }, [data, chartWidth, chartHeight, padding]);

  // Available component lines
  const availableLines = useMemo(() => {
    if (data.length === 0) return ["overallScore"];
    const keys = Object.keys(data[0]).filter(
      (k) => k !== "date" && typeof data[0][k] === "number",
    );
    return keys;
  }, [data]);

  const toggleLine = (key: string) => {
    setActiveLines((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Build SVG paths
  const linePaths = useMemo(() => {
    if (data.length === 0) return {};
    const paths: Record<string, string> = {};

    for (const key of activeLines) {
      const points = data
        .map((d, i) => {
          const val = typeof d[key] === "number" ? (d[key] as number) : 0;
          return `${xScale(i)},${yScale(val)}`;
        })
        .join(" L ");
      paths[key] = `M ${points}`;
    }

    return paths;
  }, [data, activeLines, xScale, yScale]);

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[300px] text-center">
        <p className="text-body text-slate-500 dark:text-white/45">
          No trend data available yet.
        </p>
        <p className="text-small text-slate-400 dark:text-white/30 mt-1">
          Score history will appear after daily computations.
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Period selector + Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        {/* Period tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-lg p-1">
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onPeriodChange?.(opt.value)}
              className={`px-3 py-1.5 rounded-md text-small font-medium transition-all ${
                period === opt.value
                  ? "bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/60"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Legend toggles */}
        <div className="flex flex-wrap gap-2">
          {availableLines.map((key) => {
            const active = activeLines.has(key);
            const color = LINE_COLORS[key] || "#94A3B8";
            const label = LINE_LABELS[key] || key;

            return (
              <button
                key={key}
                onClick={() => toggleLine(key)}
                className={`flex items-center gap-1.5 px-2 py-1 rounded text-micro transition-all ${
                  active
                    ? "bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-white/70"
                    : "text-slate-400 dark:text-white/30 hover:text-slate-600 dark:hover:text-white/50"
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: active ? color : "transparent",
                    border: active ? "none" : `1.5px solid ${color}`,
                  }}
                />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto"
          role="img"
          aria-label={`RRS trend chart showing score over ${period}`}
        >
          {/* Grid lines */}
          {yTicks.map((tick) => (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={yScale(tick)}
                x2={width - padding.right}
                y2={yScale(tick)}
                stroke="currentColor"
                strokeWidth={0.5}
                className="text-slate-100 dark:text-white/5"
              />
              <text
                x={padding.left - 8}
                y={yScale(tick)}
                textAnchor="end"
                dominantBaseline="central"
                className="fill-slate-400 dark:fill-white/40"
                style={{ fontSize: 10 }}
              >
                {tick}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {xLabels.map(({ index, label }) => (
            <text
              key={index}
              x={xScale(index)}
              y={height - 10}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-white/40"
              style={{ fontSize: 10 }}
            >
              {label}
            </text>
          ))}

          {/* Threshold zone bands */}
          <rect
            x={padding.left}
            y={yScale(100)}
            width={chartWidth}
            height={yScale(80) - yScale(100)}
            fill="#10B981"
            opacity={0.03}
          />
          <rect
            x={padding.left}
            y={yScale(80)}
            width={chartWidth}
            height={yScale(60) - yScale(80)}
            fill="#F59E0B"
            opacity={0.03}
          />
          <rect
            x={padding.left}
            y={yScale(60)}
            width={chartWidth}
            height={yScale(0) - yScale(60)}
            fill="#EF4444"
            opacity={0.03}
          />

          {/* Lines */}
          {Object.entries(linePaths).map(([key, path]) => (
            <motion.path
              key={key}
              d={path}
              fill="none"
              stroke={LINE_COLORS[key] || "#94A3B8"}
              strokeWidth={key === "overallScore" ? 2.5 : 1.5}
              strokeLinejoin="round"
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          ))}

          {/* Data points for overall line */}
          {activeLines.has("overallScore") &&
            data.map((d, i) => (
              <g key={i}>
                <circle
                  cx={xScale(i)}
                  cy={yScale(d.overallScore)}
                  r={hoveredPoint === i ? 5 : 3}
                  fill={LINE_COLORS.overallScore}
                  className="transition-all"
                  onMouseEnter={() => setHoveredPoint(i)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  style={{ cursor: "pointer" }}
                />
                {hoveredPoint === i && (
                  <g>
                    <rect
                      x={xScale(i) - 40}
                      y={yScale(d.overallScore) - 32}
                      width={80}
                      height={22}
                      rx={4}
                      className="fill-slate-800 dark:fill-slate-700"
                    />
                    <text
                      x={xScale(i)}
                      y={yScale(d.overallScore) - 18}
                      textAnchor="middle"
                      fill="white"
                      style={{ fontSize: 11, fontWeight: 500 }}
                    >
                      {formatDate(d.date)}: {d.overallScore}
                    </text>
                  </g>
                )}
              </g>
            ))}
        </svg>
      </div>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  } catch {
    return dateStr;
  }
}
