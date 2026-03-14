"use client";

import { useMemo } from "react";
import type { EphemerisColors } from "../../theme";
import type { ModuleScore, HistoryPoint } from "./types";
import { MODULE_LABELS } from "./types";

interface ModuleForecastTableProps {
  modules: Record<string, ModuleScore>;
  historyData: HistoryPoint[];
  C: EphemerisColors;
}

function scoreColor(score: number, C: EphemerisColors): string {
  if (score >= 85) return C.nominal;
  if (score >= 70) return C.watch;
  if (score >= 50) return C.warning;
  return C.critical;
}

function statusDot(status: string, C: EphemerisColors): string {
  switch (status) {
    case "NOMINAL":
    case "COMPLIANT":
      return C.nominal;
    case "WATCH":
    case "WARNING":
      return C.watch;
    case "NON_COMPLIANT":
    case "CRITICAL":
      return C.critical;
    default:
      return C.textMuted;
  }
}

/** Tiny inline sparkline (SVG) showing module score trend */
function Sparkline({
  data,
  color,
  width = 80,
  height = 28,
}: {
  data: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - 2 - ((v - min) / range) * (height - 4);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={0.7}
      />
    </svg>
  );
}

export default function ModuleForecastTable({
  modules,
  historyData,
  C,
}: ModuleForecastTableProps) {
  // Extract per-module history for sparklines
  const moduleHistory = useMemo(() => {
    const result: Record<string, number[]> = {};
    for (const key of Object.keys(modules)) {
      result[key] = historyData
        .filter((h) => h.moduleScores && typeof h.moduleScores === "object")
        .map((h) => {
          const ms = h.moduleScores as Record<string, { score: number }>;
          return ms[key]?.score ?? 0;
        })
        .filter((s) => s > 0);
    }
    return result;
  }, [modules, historyData]);

  const sorted = useMemo(
    () => Object.entries(modules).sort(([, a], [, b]) => a.score - b.score),
    [modules],
  );

  // Compute 30d trend from history
  const trend30d = useMemo(() => {
    const result: Record<string, number> = {};
    for (const [key] of sorted) {
      const hist = moduleHistory[key];
      if (hist && hist.length >= 2) {
        result[key] = hist[hist.length - 1]! - hist[0]!;
      } else {
        result[key] = 0;
      }
    }
    return result;
  }, [sorted, moduleHistory]);

  return (
    <div
      style={{
        background: C.bg,
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 70px 70px 90px 100px 90px",
          gap: 8,
          padding: "12px 18px",
          borderBottom: `1px solid ${C.border}`,
          background: C.sunken,
        }}
      >
        {["Module", "Score", "Status", "30d Trend", "Breach", "Trend"].map(
          (col) => (
            <span
              key={col}
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 9,
                fontWeight: 600,
                letterSpacing: "0.08em",
                color: C.textMuted,
                textTransform: "uppercase",
              }}
            >
              {col}
            </span>
          ),
        )}
      </div>

      {/* Rows */}
      {sorted.map(([key, mod]) => {
        const sColor = scoreColor(mod.score, C);
        const delta = trend30d[key] ?? 0;
        const trendArrow = delta > 0.5 ? "↑" : delta < -0.5 ? "↓" : "→";
        const trendColor =
          delta > 0.5 ? C.nominal : delta < -0.5 ? C.critical : C.textMuted;

        // Find nearest breach from module factors
        const nearestBreach = mod.factors
          .filter((f) => f.daysToThreshold !== null)
          .sort(
            (a, b) => (a.daysToThreshold ?? 999) - (b.daysToThreshold ?? 999),
          )[0];

        return (
          <div
            key={key}
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 70px 70px 90px 100px 90px",
              gap: 8,
              padding: "10px 18px",
              borderBottom: `1px solid ${C.border}`,
              alignItems: "center",
              transition: "background 0.1s ease",
            }}
          >
            {/* Module name */}
            <span
              style={{
                fontFamily: "'Inter', sans-serif",
                fontSize: 12,
                fontWeight: 500,
                color: C.textPrimary,
              }}
            >
              {MODULE_LABELS[key] ?? key}
            </span>

            {/* Score */}
            <span
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: sColor,
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {mod.score}
            </span>

            {/* Status dot + label */}
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: statusDot(mod.status, C),
                  flexShrink: 0,
                }}
              />
              <span
                style={{
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: 9,
                  color: C.textMuted,
                  letterSpacing: "0.04em",
                }}
              >
                {mod.status.slice(0, 3)}
              </span>
            </div>

            {/* 30d Trend */}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span
                style={{
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: 12,
                  fontWeight: 600,
                  color: trendColor,
                }}
              >
                {trendArrow}
              </span>
              <span
                style={{
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: 10,
                  color: trendColor,
                }}
              >
                {delta > 0 ? "+" : ""}
                {delta.toFixed(1)}
              </span>
            </div>

            {/* Breach timing */}
            <span
              style={{
                fontFamily:
                  "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: 11,
                fontWeight: nearestBreach ? 600 : 400,
                color: nearestBreach
                  ? nearestBreach.daysToThreshold! <= 90
                    ? C.critical
                    : C.warning
                  : C.textMuted,
              }}
            >
              {nearestBreach ? `${nearestBreach.daysToThreshold}d` : "—"}
            </span>

            {/* Sparkline */}
            <Sparkline data={moduleHistory[key] ?? []} color={sColor} />
          </div>
        );
      })}
    </div>
  );
}
