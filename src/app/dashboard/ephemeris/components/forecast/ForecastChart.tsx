"use client";

import { useMemo } from "react";
import {
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";
import type { EphemerisColors } from "../../theme";
import type { ForecastCurve, HistoryPoint } from "./types";

interface ForecastChartProps {
  curve: ForecastCurve;
  historyData: HistoryPoint[];
  C: EphemerisColors;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip(props: any) {
  const { active, payload, label, C } = props as {
    active?: boolean;
    payload?: Array<{
      name: string;
      value: number | [number, number];
      color: string;
      dataKey: string;
    }>;
    label?: string;
    C: EphemerisColors;
  };
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 10,
        padding: "10px 14px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
        minWidth: 150,
      }}
    >
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 10,
          color: C.textMuted,
          letterSpacing: "0.04em",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      {payload
        .filter(
          (p) =>
            p.dataKey !== "band" &&
            p.name !== "Glow" &&
            p.dataKey !== "historyScore",
        )
        .map((p) => (
          <div
            key={p.name}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              padding: "2px 0",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: p.color,
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 11,
                  color: C.textTertiary,
                }}
              >
                {p.name}
              </span>
            </div>
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: C.textPrimary,
              }}
            >
              {typeof p.value === "number" ? p.value.toFixed(1) : ""}
            </span>
          </div>
        ))}
    </div>
  );
}

export default function ForecastChart({
  curve,
  historyData,
  C,
}: ForecastChartProps) {
  // Find the "today" boundary — last historical point
  const todayIndex = useMemo(() => {
    const lastHistIdx = curve.dataPoints.findLastIndex((p) => p.isHistorical);
    return lastHistIdx >= 0 ? lastHistIdx : 0;
  }, [curve.dataPoints]);

  const chartData = useMemo(() => {
    return curve.dataPoints.map((pt, i) => {
      const dateLabel = new Date(pt.date).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
      return {
        date: dateLabel,
        fullDate: pt.date,
        nominal: Math.round(pt.nominal * 100) / 100,
        bestCase: Math.round(pt.bestCase * 100) / 100,
        worstCase: Math.round(pt.worstCase * 100) / 100,
        isHistorical: pt.isHistorical,
        // Confidence band — only show for forecast (non-historical)
        band: pt.isHistorical
          ? undefined
          : ([
              Math.round(pt.worstCase * 100) / 100,
              Math.round(pt.bestCase * 100) / 100,
            ] as [number, number]),
        // Historical score overlay from history data
        historyScore:
          i < historyData.length
            ? Math.round(historyData[i]!.overallScore * 10) / 10
            : undefined,
        _isTodayMarker: i === todayIndex,
      };
    });
  }, [curve.dataPoints, historyData, todayIndex]);

  // Find today's date label for ReferenceLine
  const todayLabel = chartData[todayIndex]?.date ?? "";

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "20px 20px 12px 8px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Chart header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          padding: "0 12px 16px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: 14,
              fontWeight: 600,
              color: C.textPrimary,
              marginBottom: 3,
            }}
          >
            {curve.regulationName}
          </div>
          <div
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              color: C.textMuted,
              letterSpacing: "0.03em",
            }}
          >
            {curve.metric} · {curve.unit} · {curve.confidence} confidence
          </div>
        </div>
        {curve.crossingDaysFromNow !== null && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 12px",
              borderRadius: 8,
              background: `${C.warning}0A`,
              border: `1px solid ${C.warning}20`,
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: C.warning,
                animation: "pulse 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 11,
                fontWeight: 600,
                color: C.warning,
              }}
            >
              BREACH IN {curve.crossingDaysFromNow}d
            </span>
          </div>
        )}
      </div>

      {/* Recharts */}
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart data={chartData}>
          <defs>
            <linearGradient id="fcBandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={C.accent} stopOpacity={0.12} />
              <stop offset="100%" stopColor={C.accent} stopOpacity={0.02} />
            </linearGradient>
            <filter id="fcLineGlow">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <CartesianGrid
            stroke={C.border}
            strokeOpacity={0.5}
            strokeDasharray="2 6"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tick={{
              fill: C.textMuted,
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
            axisLine={{ stroke: C.border, strokeOpacity: 0.3 }}
            tickLine={false}
            interval="preserveStartEnd"
            dy={6}
          />
          <YAxis
            tick={{
              fill: C.textMuted,
              fontSize: 10,
              fontFamily: "'IBM Plex Mono', monospace",
            }}
            axisLine={false}
            tickLine={false}
            width={42}
            dx={-4}
          />
          <Tooltip
            content={(props) => <ChartTooltip {...props} C={C} />}
            cursor={{
              stroke: C.textMuted,
              strokeWidth: 1,
              strokeOpacity: 0.15,
              strokeDasharray: "3 3",
            }}
          />

          {/* Confidence band (forecast region only) */}
          <Area
            dataKey="band"
            fill="url(#fcBandGradient)"
            stroke="none"
            animationDuration={1000}
            animationEasing="ease-out"
            isRange
          />

          {/* Threshold line */}
          <ReferenceLine
            y={curve.thresholdValue}
            stroke={C.critical}
            strokeDasharray="6 4"
            strokeOpacity={0.35}
            strokeWidth={1.5}
            label={{
              value: `Threshold ${curve.thresholdValue}${curve.unit}`,
              fill: C.critical,
              fontSize: 9,
              fontFamily: "'IBM Plex Mono', monospace",
              position: "right",
              offset: 6,
            }}
          />

          {/* "Today" marker */}
          {todayLabel && (
            <ReferenceLine
              x={todayLabel}
              stroke={C.textMuted}
              strokeDasharray="4 4"
              strokeOpacity={0.4}
              strokeWidth={1}
              label={{
                value: "Today",
                fill: C.textMuted,
                fontSize: 9,
                fontFamily: "'IBM Plex Mono', monospace",
                position: "top",
                offset: 8,
              }}
            />
          )}

          {/* P10 worst case — subtle dashed */}
          <Line
            type="monotone"
            dataKey="worstCase"
            stroke={C.critical}
            strokeWidth={1}
            strokeOpacity={0.2}
            strokeDasharray="3 3"
            dot={false}
            name="P10 (Worst)"
            animationDuration={900}
          />

          {/* P90 best case — subtle dashed */}
          <Line
            type="monotone"
            dataKey="bestCase"
            stroke={C.nominal}
            strokeWidth={1}
            strokeOpacity={0.2}
            strokeDasharray="3 3"
            dot={false}
            name="P90 (Best)"
            animationDuration={900}
          />

          {/* P50 nominal — main line */}
          <Line
            type="monotone"
            dataKey="nominal"
            stroke={C.accent}
            strokeWidth={2}
            dot={false}
            name="Nominal (P50)"
            animationDuration={1000}
            animationEasing="ease-out"
            style={{ filter: "url(#fcLineGlow)" }}
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 20,
          padding: "10px 0 2px",
        }}
      >
        {[
          { label: "Nominal (P50)", color: C.accent, dashed: false },
          { label: "Best (P90)", color: C.nominal, dashed: true },
          { label: "Worst (P10)", color: C.critical, dashed: true },
          { label: "Threshold", color: C.critical, dashed: true },
        ].map((item) => (
          <div
            key={item.label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <div
              style={{
                width: 14,
                height: 2,
                background: item.color,
                opacity: item.dashed ? 0.35 : 1,
                borderRadius: 1,
              }}
            />
            <span
              style={{
                fontFamily: "'IBM Plex Mono', monospace",
                fontSize: 9,
                color: C.textMuted,
              }}
            >
              {item.label}
            </span>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
