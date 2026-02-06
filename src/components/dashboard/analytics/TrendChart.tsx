"use client";

import React, { useMemo } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TrendDataPoint {
  date: Date;
  score: number;
  label?: string;
}

interface TrendChartProps {
  data: TrendDataPoint[];
  height?: number;
  showLabels?: boolean;
  title?: string;
  subtitle?: string;
}

export function TrendChart({
  data,
  height = 200,
  showLabels = true,
  title = "Compliance Trend",
  subtitle,
}: TrendChartProps) {
  const chartData = useMemo(() => {
    if (data.length === 0) return { points: [], trend: 0, min: 0, max: 100 };

    const scores = data.map((d) => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;

    // Calculate trend (last vs first)
    const trend =
      data.length > 1 ? data[data.length - 1].score - data[0].score : 0;

    // Normalize points for SVG
    const points = data.map((d, i) => ({
      x: (i / (data.length - 1 || 1)) * 100,
      y: 100 - ((d.score - min) / range) * 80 - 10, // Leave 10% padding top/bottom
      score: d.score,
      date: d.date,
      label: d.label,
    }));

    return { points, trend, min, max };
  }, [data]);

  const pathD = useMemo(() => {
    if (chartData.points.length < 2) return "";

    return chartData.points.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, "");
  }, [chartData.points]);

  const areaD = useMemo(() => {
    if (chartData.points.length < 2) return "";

    const linePath = chartData.points.reduce((path, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${path} L ${point.x} ${point.y}`;
    }, "");

    return `${linePath} L 100 100 L 0 100 Z`;
  }, [chartData.points]);

  const getTrendColor = (trend: number) => {
    if (trend > 0) return "text-green-400";
    if (trend < 0) return "text-red-400";
    return "text-slate-400";
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp className="w-4 h-4" />;
    if (trend < 0) return <TrendingDown className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getStrokeColor = (trend: number) => {
    if (trend > 0) return "#22C55E"; // green-500
    if (trend < 0) return "#EF4444"; // red-500
    return "#3B82F6"; // blue-500
  };

  const getFillColor = (trend: number) => {
    if (trend > 0) return "url(#gradientGreen)";
    if (trend < 0) return "url(#gradientRed)";
    return "url(#gradientBlue)";
  };

  if (data.length === 0) {
    return (
      <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
        {subtitle && <p className="text-sm text-slate-400 mb-4">{subtitle}</p>}
        <div
          className="flex items-center justify-center text-slate-500"
          style={{ height }}
        >
          <p>No trend data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-navy-800 border border-navy-700 rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle && <p className="text-sm text-slate-400">{subtitle}</p>}
        </div>
        <div
          className={`flex items-center gap-1 ${getTrendColor(chartData.trend)}`}
        >
          {getTrendIcon(chartData.trend)}
          <span className="text-sm font-medium">
            {chartData.trend > 0 ? "+" : ""}
            {chartData.trend.toFixed(1)} pts
          </span>
        </div>
      </div>

      <div className="relative" style={{ height }}>
        {/* Y-axis labels */}
        {showLabels && (
          <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-slate-500 py-2">
            <span>{chartData.max}</span>
            <span>{Math.round((chartData.max + chartData.min) / 2)}</span>
            <span>{chartData.min}</span>
          </div>
        )}

        {/* Chart area */}
        <div className={showLabels ? "ml-10" : ""}>
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="w-full h-full"
            style={{ height }}
          >
            <defs>
              <linearGradient id="gradientGreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22C55E" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#22C55E" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradientRed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="gradientBlue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line
              x1="0"
              y1="25"
              x2="100"
              y2="25"
              stroke="#334155"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1="50"
              x2="100"
              y2="50"
              stroke="#334155"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />
            <line
              x1="0"
              y1="75"
              x2="100"
              y2="75"
              stroke="#334155"
              strokeWidth="0.5"
              strokeDasharray="2,2"
            />

            {/* Area fill */}
            <path d={areaD} fill={getFillColor(chartData.trend)} />

            {/* Line */}
            <path
              d={pathD}
              fill="none"
              stroke={getStrokeColor(chartData.trend)}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />

            {/* Data points */}
            {chartData.points.map((point, i) => (
              <circle
                key={i}
                cx={point.x}
                cy={point.y}
                r="1.5"
                fill={getStrokeColor(chartData.trend)}
                className="hover:r-3 transition-all"
              />
            ))}
          </svg>
        </div>

        {/* X-axis labels */}
        {showLabels && chartData.points.length > 0 && (
          <div
            className={`flex justify-between text-xs text-slate-500 mt-2 ${showLabels ? "ml-10" : ""}`}
          >
            <span>
              {chartData.points[0].date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
            {chartData.points.length > 2 && (
              <span>
                {chartData.points[
                  Math.floor(chartData.points.length / 2)
                ].date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                })}
              </span>
            )}
            <span>
              {chartData.points[
                chartData.points.length - 1
              ].date.toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        )}
      </div>

      {/* Current score */}
      {chartData.points.length > 0 && (
        <div className="mt-4 pt-4 border-t border-navy-700">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Current Score</span>
            <span className="text-lg font-semibold text-white">
              {chartData.points[chartData.points.length - 1].score.toFixed(0)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// Mini version for compact displays
export function MiniTrendChart({
  data,
  width = 80,
  height = 24,
}: {
  data: TrendDataPoint[];
  width?: number;
  height?: number;
}) {
  const chartData = useMemo(() => {
    if (data.length < 2) return { path: "", trend: 0 };

    const scores = data.map((d) => d.score);
    const min = Math.min(...scores);
    const max = Math.max(...scores);
    const range = max - min || 1;

    const points = data.map((d, i) => ({
      x: (i / (data.length - 1)) * 100,
      y: 100 - ((d.score - min) / range) * 80 - 10,
    }));

    const path = points.reduce((p, point, i) => {
      if (i === 0) return `M ${point.x} ${point.y}`;
      return `${p} L ${point.x} ${point.y}`;
    }, "");

    const trend = data[data.length - 1].score - data[0].score;

    return { path, trend };
  }, [data]);

  if (data.length < 2) {
    return <div className="w-20 h-6 bg-navy-700 rounded" />;
  }

  const strokeColor = chartData.trend >= 0 ? "#22C55E" : "#EF4444";

  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <path
        d={chartData.path}
        fill="none"
        stroke={strokeColor}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
