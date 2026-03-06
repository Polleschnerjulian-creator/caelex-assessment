"use client";

// ---------------------------------------------------------------------------
// Results Panel – rich visualization of simulation results
// ---------------------------------------------------------------------------

import React, { useMemo } from "react";
import {
  Play,
  RotateCcw,
  Loader2,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
} from "lucide-react";
import type { SimulationResults, StepResult } from "./useScenarioSimulation";
import { BLOCK_DEFINITIONS } from "./block-definitions";
import { useEphemerisTheme, type EphemerisColors } from "../../theme";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const MONO_FONT = "'IBM Plex Mono', monospace";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface ResultsPanelProps {
  results: SimulationResults | null;
  isRunning: boolean;
  error: string | null;
  pipelineLength: number;
  onRun: () => void;
  onReset: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function blockNameForType(scenarioType: string): string {
  const def = BLOCK_DEFINITIONS.find((b) => b.scenarioType === scenarioType);
  return def?.name ?? scenarioType;
}

function severityColor(
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" | undefined,
  C: EphemerisColors,
): string {
  switch (severity) {
    case "LOW":
      return C.nominal;
    case "MEDIUM":
      return C.watch;
    case "HIGH":
      return C.warning;
    case "CRITICAL":
      return C.critical;
    default:
      return C.textMuted;
  }
}

function statusDotColor(status: string, C: EphemerisColors): string {
  switch (status) {
    case "COMPLIANT":
      return C.nominal;
    case "WARNING":
      return C.watch;
    case "NON_COMPLIANT":
      return C.critical;
    default:
      return C.textMuted;
  }
}

function formatUsd(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  return `$${value.toFixed(0)}`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Section header label in uppercase monospace */
function SectionLabel({
  children,
  C,
}: {
  children: React.ReactNode;
  C: EphemerisColors;
}) {
  return (
    <h3
      className="text-micro font-medium uppercase tracking-wider"
      style={{ color: C.textTertiary, fontFamily: MONO_FONT }}
    >
      {children}
    </h3>
  );
}

/** Themed card wrapper */
function SectionCard({
  children,
  C,
  className = "",
}: {
  children: React.ReactNode;
  C: EphemerisColors;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg p-3 space-y-2 ${className}`}
      style={{
        background: C.elevated,
        border: `1px solid ${C.border}`,
      }}
    >
      {children}
    </div>
  );
}

/** Delta badge with trend icon */
function DeltaBadge({
  delta,
  unit = "days",
  C,
}: {
  delta: number;
  unit?: string;
  C: EphemerisColors;
}) {
  if (delta > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-small font-medium"
        style={{ color: C.nominal, fontFamily: MONO_FONT }}
      >
        <TrendingUp className="h-3.5 w-3.5" />+{delta} {unit}
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span
        className="inline-flex items-center gap-1 text-small font-medium"
        style={{ color: C.critical, fontFamily: MONO_FONT }}
      >
        <TrendingDown className="h-3.5 w-3.5" />
        {delta} {unit}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1 text-small font-medium"
      style={{ color: C.textMuted, fontFamily: MONO_FONT }}
    >
      <Minus className="h-3.5 w-3.5" />0 {unit}
    </span>
  );
}

/** Severity badge pill */
function SeverityBadge({
  severity,
  C,
  size = "large",
}: {
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  C: EphemerisColors;
  size?: "large" | "small";
}) {
  const color = severityColor(severity, C);
  if (size === "small") {
    return (
      <span
        className="inline-block w-2 h-2 rounded-full flex-shrink-0"
        style={{ background: color }}
        title={severity}
      />
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-small font-semibold uppercase tracking-wide"
      style={{
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
        fontFamily: MONO_FONT,
      }}
    >
      <span
        className="inline-block w-2 h-2 rounded-full"
        style={{ background: color }}
      />
      {severity}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Compliance Timeline SVG Chart
// ---------------------------------------------------------------------------

function ComplianceTimeline({
  stepResults,
  C,
}: {
  stepResults: StepResult[];
  C: EphemerisColors;
}) {
  const { baselinePoints, projectedPoints } = useMemo(() => {
    // Merge all timelineProjection data, or synthesize from horizon deltas
    const merged: Array<{
      monthOffset: number;
      baselineScore: number;
      projectedScore: number;
    }> = [];

    // Check if any step has actual timeline projection data
    const hasProjectionData = stepResults.some(
      (s) => s.timelineProjection && s.timelineProjection.length > 0,
    );

    if (hasProjectionData) {
      // Use the last step's timelineProjection (most comprehensive)
      for (const step of stepResults) {
        if (step.timelineProjection) {
          for (const tp of step.timelineProjection) {
            const existing = merged.find(
              (m) => m.monthOffset === tp.monthOffset,
            );
            if (existing) {
              existing.projectedScore = Math.min(
                existing.projectedScore,
                tp.projectedScore,
              );
            } else {
              merged.push({ ...tp });
            }
          }
        }
      }
      merged.sort((a, b) => a.monthOffset - b.monthOffset);
    } else {
      // Synthesize 12-month projection from horizon deltas
      const totalDelta = stepResults.reduce(
        (sum, s) => sum + s.horizonDelta,
        0,
      );
      const baselineStart = stepResults[0]?.baselineHorizon ?? 90;
      for (let m = 0; m < 12; m++) {
        const baseScore = Math.max(
          0,
          Math.min(100, 70 + (baselineStart / 365) * 30 - m * 1.5),
        );
        const deltaEffect = (totalDelta / 365) * 30 * ((m + 1) / 12);
        const projScore = Math.max(0, Math.min(100, baseScore + deltaEffect));
        merged.push({
          monthOffset: m,
          baselineScore: Math.round(baseScore * 10) / 10,
          projectedScore: Math.round(projScore * 10) / 10,
        });
      }
    }

    if (merged.length === 0) {
      // Fallback: 12 flat points
      for (let m = 0; m < 12; m++) {
        merged.push({ monthOffset: m, baselineScore: 75, projectedScore: 75 });
      }
    }

    return {
      baselinePoints: merged.map((p) => ({
        x: p.monthOffset,
        y: p.baselineScore,
      })),
      projectedPoints: merged.map((p) => ({
        x: p.monthOffset,
        y: p.projectedScore,
      })),
    };
  }, [stepResults]);

  const W = 280;
  const H = 120;
  const PAD_L = 28;
  const PAD_R = 8;
  const PAD_T = 8;
  const PAD_B = 20;
  const chartW = W - PAD_L - PAD_R;
  const chartH = H - PAD_T - PAD_B;

  const xMax = Math.max(
    ...baselinePoints.map((p) => p.x),
    ...projectedPoints.map((p) => p.x),
    11,
  );
  const yMin = 0;
  const yMax = 100;

  function sx(x: number) {
    return PAD_L + (x / xMax) * chartW;
  }
  function sy(y: number) {
    return PAD_T + chartH - ((y - yMin) / (yMax - yMin)) * chartH;
  }

  const baselinePath = baselinePoints
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`,
    )
    .join(" ");

  const projectedPath = projectedPoints
    .map(
      (p, i) =>
        `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`,
    )
    .join(" ");

  // Fill area between baseline and projected when projected is below
  const fillParts: string[] = [];
  for (let i = 0; i < baselinePoints.length; i++) {
    if (projectedPoints[i] && projectedPoints[i].y < baselinePoints[i].y) {
      fillParts.push(
        `${i === 0 || (i > 0 && !(projectedPoints[i - 1] && projectedPoints[i - 1].y < baselinePoints[i - 1].y)) ? "M" : "L"}${sx(baselinePoints[i].x).toFixed(1)},${sy(baselinePoints[i].y).toFixed(1)}`,
      );
    }
  }

  // Build a proper fill polygon between the two lines for negative delta areas
  const fillPath = useMemo(() => {
    const segments: Array<{
      bPoints: Array<{ x: number; y: number }>;
      pPoints: Array<{ x: number; y: number }>;
    }> = [];
    let current: {
      bPoints: Array<{ x: number; y: number }>;
      pPoints: Array<{ x: number; y: number }>;
    } | null = null;

    for (let i = 0; i < baselinePoints.length; i++) {
      const bp = baselinePoints[i];
      const pp = projectedPoints[i];
      if (pp && pp.y < bp.y) {
        if (!current) {
          current = { bPoints: [], pPoints: [] };
          segments.push(current);
        }
        current.bPoints.push(bp);
        current.pPoints.push(pp);
      } else {
        current = null;
      }
    }

    return segments
      .map((seg) => {
        const forward = seg.bPoints
          .map(
            (p, i) =>
              `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`,
          )
          .join(" ");
        const backward = [...seg.pPoints]
          .reverse()
          .map((p) => `L${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`)
          .join(" ");
        return `${forward} ${backward} Z`;
      })
      .join(" ");
  }, [baselinePoints, projectedPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  // Find crossover point
  const crossover = useMemo(() => {
    for (let i = 1; i < baselinePoints.length; i++) {
      const prevDiff =
        (projectedPoints[i - 1]?.y ?? 0) - baselinePoints[i - 1].y;
      const currDiff = (projectedPoints[i]?.y ?? 0) - baselinePoints[i].y;
      if ((prevDiff >= 0 && currDiff < 0) || (prevDiff < 0 && currDiff >= 0)) {
        return {
          x: sx(baselinePoints[i].x),
          y: sy(baselinePoints[i].y),
        };
      }
    }
    return null;
  }, [baselinePoints, projectedPoints]); // eslint-disable-line react-hooks/exhaustive-deps

  // Determine projected line color
  const totalDelta =
    projectedPoints.length > 0
      ? projectedPoints[projectedPoints.length - 1].y -
        baselinePoints[baselinePoints.length - 1].y
      : 0;
  const projectedColor = totalDelta < 0 ? C.critical : C.accent;

  return (
    <SectionCard C={C}>
      <SectionLabel C={C}>Compliance Timeline</SectionLabel>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ maxWidth: W }}
      >
        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line
              x1={PAD_L}
              y1={sy(v)}
              x2={W - PAD_R}
              y2={sy(v)}
              stroke={C.border}
              strokeWidth={0.5}
            />
            <text
              x={PAD_L - 4}
              y={sy(v) + 3}
              textAnchor="end"
              fill={C.textMuted}
              fontSize={8}
              fontFamily={MONO_FONT}
            >
              {v}
            </text>
          </g>
        ))}

        {/* X-axis month labels */}
        {[0, 3, 6, 9, 11].map((m) => (
          <text
            key={m}
            x={sx(m)}
            y={H - 4}
            textAnchor="middle"
            fill={C.textMuted}
            fontSize={8}
            fontFamily={MONO_FONT}
          >
            M{m}
          </text>
        ))}

        {/* Fill area (negative delta) */}
        {fillPath && (
          <path d={fillPath} fill={`${C.critical}20`} stroke="none" />
        )}

        {/* Baseline (dashed) */}
        <path
          d={baselinePath}
          fill="none"
          stroke={C.nominal}
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.7}
        />

        {/* Projected (solid) */}
        <path
          d={projectedPath}
          fill="none"
          stroke={projectedColor}
          strokeWidth={2}
        />

        {/* Crossover dot */}
        {crossover && (
          <circle
            cx={crossover.x}
            cy={crossover.y}
            r={3.5}
            fill={C.warning}
            stroke={C.elevated}
            strokeWidth={1.5}
          />
        )}

        {/* Endpoint dots */}
        {baselinePoints.length > 0 && (
          <circle
            cx={sx(baselinePoints[baselinePoints.length - 1].x)}
            cy={sy(baselinePoints[baselinePoints.length - 1].y)}
            r={2.5}
            fill={C.nominal}
          />
        )}
        {projectedPoints.length > 0 && (
          <circle
            cx={sx(projectedPoints[projectedPoints.length - 1].x)}
            cy={sy(projectedPoints[projectedPoints.length - 1].y)}
            r={2.5}
            fill={projectedColor}
          />
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-1">
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-px"
            style={{
              background: C.nominal,
              borderTop: `1.5px dashed ${C.nominal}`,
            }}
          />
          <span
            className="text-micro"
            style={{ color: C.textTertiary, fontFamily: MONO_FONT }}
          >
            Baseline
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div
            className="w-4 h-0.5 rounded"
            style={{ background: projectedColor }}
          />
          <span
            className="text-micro"
            style={{ color: C.textTertiary, fontFamily: MONO_FONT }}
          >
            Projected
          </span>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Risk Heatmap
// ---------------------------------------------------------------------------

function RiskHeatmap({
  stepResults,
  C,
}: {
  stepResults: StepResult[];
  C: EphemerisColors;
}) {
  // Collect all module impacts across steps; also derive from affectedRegulations
  const modules = useMemo(() => {
    const moduleMap = new Map<
      string,
      {
        moduleKey: string;
        statusBefore: string;
        statusAfter: string;
        scoreDelta: number;
      }
    >();

    for (const step of stepResults) {
      // From moduleImpacts (if available)
      if (step.moduleImpacts) {
        for (const mi of step.moduleImpacts) {
          moduleMap.set(mi.moduleKey, mi);
        }
      }
      // Derive from affectedRegulations
      for (const reg of step.affectedRegulations) {
        const key = reg.regulationRef.split(".")[0] || reg.regulationRef;
        if (!moduleMap.has(key)) {
          moduleMap.set(key, {
            moduleKey: key,
            statusBefore: reg.statusBefore,
            statusAfter: reg.statusAfter,
            scoreDelta: 0,
          });
        }
      }
    }

    return Array.from(moduleMap.values());
  }, [stepResults]);

  if (modules.length === 0) return null;

  function cellColor(status: string): string {
    switch (status) {
      case "COMPLIANT":
        return C.nominal;
      case "WARNING":
        return C.watch;
      case "NON_COMPLIANT":
        return C.critical;
      default:
        return C.textMuted;
    }
  }

  return (
    <SectionCard C={C}>
      <SectionLabel C={C}>Risk Heatmap</SectionLabel>
      <div
        className="grid gap-1"
        style={{
          gridTemplateColumns: `repeat(${Math.min(modules.length, 8)}, 1fr)`,
        }}
      >
        {modules.map((mod) => (
          <div
            key={mod.moduleKey}
            className="flex flex-col items-center gap-0.5"
          >
            <div className="flex items-center gap-0.5">
              <div
                className="w-3.5 h-3.5 rounded-sm"
                style={{ background: `${cellColor(mod.statusBefore)}50` }}
                title={`Before: ${mod.statusBefore}`}
              />
              <span className="text-micro" style={{ color: C.textMuted }}>
                {"\u2192"}
              </span>
              <div
                className="w-3.5 h-3.5 rounded-sm"
                style={{ background: cellColor(mod.statusAfter) }}
                title={`After: ${mod.statusAfter}`}
              />
            </div>
            <span
              className="text-micro truncate max-w-[40px]"
              style={{
                color: C.textTertiary,
                fontFamily: MONO_FONT,
                fontSize: 7,
              }}
              title={mod.moduleKey}
            >
              {mod.moduleKey.length > 5
                ? mod.moduleKey.slice(0, 5)
                : mod.moduleKey}
            </span>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Cost Estimate Section
// ---------------------------------------------------------------------------

function CostEstimateSection({
  totalCostEstimate,
  C,
}: {
  totalCostEstimate: { fuelKg: number; financialUsd: number };
  C: EphemerisColors;
}) {
  if (totalCostEstimate.fuelKg === 0 && totalCostEstimate.financialUsd === 0) {
    return null;
  }

  return (
    <SectionCard C={C}>
      <SectionLabel C={C}>Cost Estimate</SectionLabel>
      <div className="flex items-center gap-4">
        {totalCostEstimate.fuelKg > 0 && (
          <div className="flex flex-col">
            <span
              className="text-micro"
              style={{ color: C.textTertiary, fontFamily: MONO_FONT }}
            >
              Fuel
            </span>
            <span
              className="text-body font-semibold"
              style={{ color: C.warning, fontFamily: MONO_FONT }}
            >
              {totalCostEstimate.fuelKg.toFixed(1)} kg
            </span>
          </div>
        )}
        {totalCostEstimate.financialUsd > 0 && (
          <div className="flex flex-col">
            <span
              className="text-micro"
              style={{ color: C.textTertiary, fontFamily: MONO_FONT }}
            >
              Financial
            </span>
            <span
              className="text-body font-semibold"
              style={{ color: C.warning, fontFamily: MONO_FONT }}
            >
              {formatUsd(totalCostEstimate.financialUsd)}
            </span>
          </div>
        )}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Step Breakdown (enhanced)
// ---------------------------------------------------------------------------

function StepBreakdown({
  stepResults,
  C,
}: {
  stepResults: StepResult[];
  C: EphemerisColors;
}) {
  if (stepResults.length <= 1) return null;

  // Compute max absolute delta for bar scaling
  const maxAbsDelta = Math.max(
    ...stepResults.map((s) => Math.abs(s.horizonDelta)),
    1,
  );

  // Compute cumulative deltas
  let cumulative = 0;

  return (
    <SectionCard C={C}>
      <SectionLabel C={C}>Step Breakdown</SectionLabel>
      <div className="space-y-2">
        {stepResults.map((step, idx) => {
          cumulative += step.horizonDelta;
          const barWidth = Math.abs(step.horizonDelta) / maxAbsDelta;
          const barColor =
            step.horizonDelta > 0
              ? C.nominal
              : step.horizonDelta < 0
                ? C.critical
                : C.textMuted;

          return (
            <div key={step.blockInstanceId} className="space-y-1">
              <div className="flex items-center gap-2">
                {/* Step number */}
                <span
                  className="text-micro w-4 text-right flex-shrink-0"
                  style={{ color: C.textMuted, fontFamily: MONO_FONT }}
                >
                  {idx + 1}.
                </span>

                {/* Severity dot */}
                <SeverityBadge
                  severity={step.severityLevel ?? "LOW"}
                  C={C}
                  size="small"
                />

                {/* Block name */}
                <span
                  className="text-small font-medium flex-1 truncate"
                  style={{ color: C.textSecondary }}
                >
                  {blockNameForType(step.scenarioType)}
                </span>

                {/* Delta */}
                <DeltaBadge delta={step.horizonDelta} C={C} />
              </div>

              {/* Before -> After horizon */}
              <div
                className="flex items-center gap-1 pl-8 text-micro"
                style={{ color: C.textTertiary, fontFamily: MONO_FONT }}
              >
                <span>{step.baselineHorizon}d</span>
                <span style={{ color: C.textMuted }}>{"\u2192"}</span>
                <span>{step.projectedHorizon}d</span>
              </div>

              {/* Cumulative delta bar */}
              <div className="pl-8 flex items-center gap-2">
                <div
                  className="h-1 rounded-full"
                  style={{
                    width: `${Math.max(barWidth * 100, 4)}%`,
                    background: barColor,
                    opacity: 0.7,
                  }}
                />
                <span
                  className="text-micro flex-shrink-0"
                  style={{ color: C.textMuted, fontFamily: MONO_FONT }}
                >
                  cum: {cumulative > 0 ? "+" : ""}
                  {cumulative}d
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ---------------------------------------------------------------------------
// Results Panel Component
// ---------------------------------------------------------------------------

export default function ResultsPanel({
  results,
  isRunning,
  error,
  pipelineLength,
  onRun,
  onReset,
}: ResultsPanelProps) {
  const C = useEphemerisTheme();

  // Compute confidence band text
  const confidenceText = useMemo(() => {
    if (!results) return null;
    const bands = results.stepResults
      .filter((s) => s.confidenceBand)
      .map((s) => s.confidenceBand!);
    if (bands.length === 0) return null;
    const avgOptimistic =
      bands.reduce((s, b) => s + b.optimistic, 0) / bands.length;
    const avgPessimistic =
      bands.reduce((s, b) => s + b.pessimistic, 0) / bands.length;
    const spread = Math.round(Math.abs(avgPessimistic - avgOptimistic) / 2);
    return spread > 0 ? `\u00B1${spread} days` : null;
  }, [results]);

  return (
    <aside className="w-full lg:w-[360px] flex-shrink-0">
      <div
        className="rounded-xl p-4 space-y-4 overflow-y-auto"
        style={{
          background: C.sunken,
          border: `1px solid ${C.border}`,
          maxHeight: "calc(100vh - 200px)",
        }}
      >
        {/* ── 1. Action Buttons ─────────────────────────────────────────── */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRun}
            disabled={isRunning || pipelineLength === 0}
            className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-small font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: C.accent,
              color: "#ffffff",
            }}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5" />
                Run Scenario
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-small font-medium transition-colors"
            style={{
              background: C.elevated,
              color: C.textSecondary,
              border: `1px solid ${C.border}`,
            }}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </button>
        </div>

        {/* ── Error Display ─────────────────────────────────────────────── */}
        {error && (
          <div
            className="rounded-lg p-3 flex items-start gap-2"
            style={{
              background: `${C.critical}15`,
              border: `1px solid ${C.critical}40`,
            }}
          >
            <AlertCircle
              className="h-4 w-4 mt-0.5 flex-shrink-0"
              style={{ color: C.critical }}
            />
            <p className="text-small" style={{ color: C.critical }}>
              {error}
            </p>
          </div>
        )}

        {/* ── Results ───────────────────────────────────────────────────── */}
        {results && (
          <>
            {/* ── 2. Impact Summary Card ────────────────────────────────── */}
            <SectionCard C={C}>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <SectionLabel C={C}>Impact Summary</SectionLabel>
                  <SeverityBadge severity={results.overallSeverity} C={C} />
                </div>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <div className="flex flex-col">
                  <span
                    className="text-micro"
                    style={{
                      color: C.textTertiary,
                      fontFamily: MONO_FONT,
                    }}
                  >
                    Horizon Delta
                  </span>
                  <DeltaBadge delta={results.totalHorizonDelta} C={C} />
                </div>

                {confidenceText && (
                  <div className="flex flex-col">
                    <span
                      className="text-micro"
                      style={{
                        color: C.textTertiary,
                        fontFamily: MONO_FONT,
                      }}
                    >
                      Confidence
                    </span>
                    <span
                      className="text-small font-medium"
                      style={{
                        color: C.textSecondary,
                        fontFamily: MONO_FONT,
                      }}
                    >
                      {confidenceText}
                    </span>
                  </div>
                )}

                {results.totalFuelDelta !== 0 && (
                  <div className="flex flex-col">
                    <span
                      className="text-micro"
                      style={{
                        color: C.textTertiary,
                        fontFamily: MONO_FONT,
                      }}
                    >
                      Fuel
                    </span>
                    <DeltaBadge delta={results.totalFuelDelta} unit="%" C={C} />
                  </div>
                )}
              </div>
            </SectionCard>

            {/* ── 3. Compliance Timeline SVG ────────────────────────────── */}
            <ComplianceTimeline stepResults={results.stepResults} C={C} />

            {/* ── 4. Risk Heatmap ───────────────────────────────────────── */}
            <RiskHeatmap stepResults={results.stepResults} C={C} />

            {/* ── 5. Cost Estimate ──────────────────────────────────────── */}
            <CostEstimateSection
              totalCostEstimate={results.totalCostEstimate}
              C={C}
            />

            {/* ── 6. Step Breakdown ─────────────────────────────────────── */}
            <StepBreakdown stepResults={results.stepResults} C={C} />

            {/* ── 7. Affected Regulations ───────────────────────────────── */}
            {results.allAffectedRegulations.length > 0 && (
              <SectionCard C={C}>
                <SectionLabel C={C}>Affected Regulations</SectionLabel>
                <ul className="space-y-1.5">
                  {results.allAffectedRegulations.map((reg) => (
                    <li
                      key={reg.regulationRef}
                      className="flex items-center gap-2 text-small"
                      style={{ color: C.textSecondary }}
                    >
                      <span
                        className="text-micro font-mono"
                        style={{
                          color: C.textTertiary,
                          fontFamily: MONO_FONT,
                        }}
                      >
                        {reg.regulationRef}
                      </span>
                      <span style={{ color: C.textMuted }}>{"\u2192"}</span>
                      <span className="flex items-center gap-1">
                        <span
                          style={{ color: statusDotColor(reg.statusBefore, C) }}
                        >
                          {"\u25CF"}
                        </span>
                        <span style={{ color: C.textMuted }}>{"\u2192"}</span>
                        <span
                          style={{ color: statusDotColor(reg.statusAfter, C) }}
                        >
                          {"\u25CF"}
                        </span>
                      </span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            )}

            {/* ── 8. Recommendation ─────────────────────────────────────── */}
            {results.finalRecommendation && (
              <SectionCard C={C}>
                <SectionLabel C={C}>Recommendation</SectionLabel>
                <p
                  className="text-small leading-relaxed"
                  style={{ color: C.textSecondary }}
                >
                  {results.finalRecommendation}
                </p>
              </SectionCard>
            )}
          </>
        )}

        {/* ── 9. Empty State ────────────────────────────────────────────── */}
        {!results && !error && !isRunning && (
          <div className="flex flex-col items-center py-8 text-center">
            <BarChart3
              className="h-8 w-8 mb-3"
              style={{ color: C.textMuted }}
            />
            <p className="text-small" style={{ color: C.textTertiary }}>
              {pipelineLength === 0
                ? "Add blocks to build a scenario"
                : "Click Run to simulate"}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
