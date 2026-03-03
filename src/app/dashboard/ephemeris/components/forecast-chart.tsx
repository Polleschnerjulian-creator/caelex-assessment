"use client";

import { useState } from "react";
import { TrendingDown, Calendar, AlertTriangle } from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

interface ForecastPoint {
  date: string;
  nominal: number;
  bestCase: number;
  worstCase: number;
  isHistorical: boolean;
}

interface ForecastCurveData {
  regulationRef: string;
  regulationName: string;
  metric: string;
  unit: string;
  thresholdValue: number;
  dataPoints: ForecastPoint[];
  crossingDate: string | null;
  crossingDaysFromNow: number | null;
  confidence: string;
}

interface ComplianceEventData {
  id: string;
  date: string;
  daysFromNow: number;
  regulationRef: string;
  regulationName: string;
  eventType: string;
  severity: string;
  description: string;
  recommendedAction: string;
}

interface ForecastChartProps {
  curves: ForecastCurveData[];
  events: ComplianceEventData[];
}

function severityColor(severity: string): string {
  switch (severity) {
    case "CRITICAL":
      return "text-red-400";
    case "HIGH":
      return "text-orange-400";
    case "MEDIUM":
      return "text-amber-400";
    default:
      return "text-white/40";
  }
}

export default function ForecastChart({ curves, events }: ForecastChartProps) {
  const [selectedCurve, setSelectedCurve] = useState<string | null>(
    curves[0]?.metric ?? null,
  );

  const curve = curves.find((c) => c.metric === selectedCurve);

  return (
    <div className="space-y-6">
      {/* Curve selector */}
      {curves.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          {curves.map((c) => (
            <button
              key={c.metric}
              onClick={() => setSelectedCurve(c.metric)}
              className={`px-3 py-1.5 rounded-lg text-small font-medium transition-colors ${
                selectedCurve === c.metric
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-white/[0.04] text-white/50 border border-white/[0.06] hover:text-white/70"
              }`}
            >
              {c.regulationName}
              {c.crossingDaysFromNow !== null && (
                <span className="ml-1.5 text-caption text-amber-400">
                  {c.crossingDaysFromNow}d
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Selected curve SVG chart */}
      {curve && <CurveChart curve={curve} />}

      {/* Compliance Events */}
      <div>
        <h3 className="text-heading font-semibold text-white mb-3">
          Compliance Events
        </h3>
        {events.length === 0 ? (
          <p className="text-body text-white/40">
            No compliance events forecasted.
          </p>
        ) : (
          <div className="space-y-2">
            {events.map((event) => (
              <GlassCard key={event.id} hover={false} className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <AlertTriangle
                      className={`w-4 h-4 mt-0.5 ${severityColor(event.severity)}`}
                    />
                    <div>
                      <p className="text-small font-medium text-white/80">
                        {event.regulationName}
                      </p>
                      <p className="text-caption text-white/40 mt-0.5">
                        {event.description}
                      </p>
                      <p className="text-caption text-white/30 mt-1">
                        {event.recommendedAction}
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <div
                      className={`text-body font-medium ${severityColor(event.severity)}`}
                    >
                      {event.daysFromNow}d
                    </div>
                    <div className="text-caption text-white/30">
                      {new Date(event.date).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Simple SVG Chart ───────────────────────────────────────────────────────

function CurveChart({ curve }: { curve: ForecastCurveData }) {
  const points = curve.dataPoints;
  if (points.length === 0) {
    return (
      <div className="text-center py-8 text-white/30 text-small">
        No data points available
      </div>
    );
  }

  const width = 800;
  const height = 300;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Calculate bounds
  const allValues = points.flatMap((p) => [p.nominal, p.bestCase, p.worstCase]);
  const minVal = Math.min(...allValues, curve.thresholdValue) * 0.95;
  const maxVal = Math.max(...allValues, curve.thresholdValue) * 1.05;
  const valRange = maxVal - minVal || 1;

  const scaleX = (i: number) =>
    padding.left + (i / Math.max(1, points.length - 1)) * chartW;
  const scaleY = (v: number) =>
    padding.top + chartH - ((v - minVal) / valRange) * chartH;

  // Build path strings
  const nominalPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(p.nominal)}`)
    .join(" ");

  const bestPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(p.bestCase)}`)
    .join(" ");

  const worstPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(p.worstCase)}`)
    .join(" ");

  // Confidence band (worst→best, closed polygon)
  const bandPath =
    points
      .map((p, i) => `${i === 0 ? "M" : "L"}${scaleX(i)},${scaleY(p.bestCase)}`)
      .join(" ") +
    " " +
    [...points]
      .reverse()
      .map((p, i) => {
        const idx = points.length - 1 - i;
        return `L${scaleX(idx)},${scaleY(p.worstCase)}`;
      })
      .join(" ") +
    " Z";

  const thresholdY = scaleY(curve.thresholdValue);

  // Historical/projected split
  const histIdx = points.findIndex((p) => !p.isHistorical);

  return (
    <GlassCard hover={false} className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-4 h-4 text-white/40" />
          <span className="text-small font-medium text-white/80">
            {curve.regulationName}
          </span>
          <span className="text-caption text-white/30">({curve.unit})</span>
        </div>
        {curve.crossingDaysFromNow !== null && (
          <div className="flex items-center gap-1.5 text-caption">
            <Calendar className="w-3 h-3 text-amber-400" />
            <span className="text-amber-400">
              Crosses in {curve.crossingDaysFromNow} days
            </span>
          </div>
        )}
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Confidence band */}
        <path d={bandPath} fill="rgba(16, 185, 129, 0.06)" />

        {/* Threshold line */}
        <line
          x1={padding.left}
          y1={thresholdY}
          x2={width - padding.right}
          y2={thresholdY}
          stroke="rgba(239, 68, 68, 0.4)"
          strokeDasharray="6,4"
          strokeWidth={1}
        />
        <text
          x={width - padding.right - 4}
          y={thresholdY - 6}
          textAnchor="end"
          fill="rgba(239, 68, 68, 0.5)"
          fontSize={10}
        >
          Threshold: {curve.thresholdValue}
          {curve.unit}
        </text>

        {/* Historical divider */}
        {histIdx > 0 && (
          <line
            x1={scaleX(histIdx)}
            y1={padding.top}
            x2={scaleX(histIdx)}
            y2={height - padding.bottom}
            stroke="rgba(255,255,255,0.1)"
            strokeDasharray="4,4"
            strokeWidth={1}
          />
        )}

        {/* Best/worst case lines */}
        <path
          d={bestPath}
          fill="none"
          stroke="rgba(16, 185, 129, 0.2)"
          strokeWidth={1}
        />
        <path
          d={worstPath}
          fill="none"
          stroke="rgba(239, 68, 68, 0.2)"
          strokeWidth={1}
        />

        {/* Nominal line */}
        <path
          d={nominalPath}
          fill="none"
          stroke="rgba(16, 185, 129, 0.8)"
          strokeWidth={2}
        />

        {/* Y axis labels */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
          const val = minVal + valRange * pct;
          const y = scaleY(val);
          return (
            <g key={pct}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={1}
              />
              <text
                x={padding.left - 8}
                y={y + 3}
                textAnchor="end"
                fill="rgba(255,255,255,0.25)"
                fontSize={10}
              >
                {val.toFixed(0)}
              </text>
            </g>
          );
        })}
      </svg>
    </GlassCard>
  );
}
