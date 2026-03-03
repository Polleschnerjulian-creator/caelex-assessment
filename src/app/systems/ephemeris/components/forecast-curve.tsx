"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "../lib/use-in-view";

// ============================================================================
// DATA — Fuel depletion curve over 5 years (1825 days)
// ============================================================================

const FUEL_CURVE: [number, number][] = [
  [0, 58],
  [60, 55],
  [120, 51],
  [200, 46],
  [300, 39],
  [400, 30],
  [480, 22],
  [533, 15], // threshold crossing
  [600, 12],
  [750, 9.5],
  [900, 8],
  [1100, 7],
  [1350, 6.5],
  [1600, 6.2],
  [1825, 6],
];

// Confidence band: spreads wider over time
const CONFIDENCE_SPREAD: [number, number][] = [
  [0, 0],
  [200, 3],
  [400, 5],
  [600, 7],
  [900, 10],
  [1200, 13],
  [1825, 16],
];

const THRESHOLD_PCT = 15;
const CROSSING_DAY = 533;

// ============================================================================
// SVG MATH
// ============================================================================

const VB_W = 800;
const VB_H = 420;
const PAD = { left: 65, right: 25, top: 25, bottom: 50 };
const CHART_W = VB_W - PAD.left - PAD.right;
const CHART_H = VB_H - PAD.top - PAD.bottom;

function dayToX(day: number) {
  return PAD.left + (day / 1825) * CHART_W;
}

function pctToY(pct: number) {
  return PAD.top + CHART_H - (pct / 75) * CHART_H; // 0-75% range
}

function interpolate(points: [number, number][], day: number): number {
  if (day <= points[0]![0]) return points[0]![1];
  if (day >= points[points.length - 1]![0])
    return points[points.length - 1]![1];
  for (let i = 1; i < points.length; i++) {
    const [d0, v0] = points[i - 1]!;
    const [d1, v1] = points[i]!;
    if (day >= d0 && day <= d1) {
      const t = (day - d0) / (d1 - d0);
      return v0 + t * (v1 - v0);
    }
  }
  return points[0]![1];
}

function pointsToPath(points: [number, number][]): string {
  return points
    .map(
      ([d, v], i) =>
        `${i === 0 ? "M" : "L"}${dayToX(d).toFixed(1)},${pctToY(v).toFixed(1)}`,
    )
    .join(" ");
}

// Confidence band polygon: upper → lower (reversed)
function bandPath(): string {
  const steps = 30;
  const upper: string[] = [];
  const lower: string[] = [];

  for (let i = 0; i <= steps; i++) {
    const day = (i / steps) * 1825;
    const nominal = interpolate(FUEL_CURVE, day);
    const spread = interpolate(CONFIDENCE_SPREAD, day);
    upper.push(
      `${dayToX(day).toFixed(1)},${pctToY(Math.min(75, nominal + spread)).toFixed(1)}`,
    );
    lower.push(
      `${dayToX(day).toFixed(1)},${pctToY(Math.max(0, nominal - spread)).toFixed(1)}`,
    );
  }

  return `M${upper.join(" L")} L${lower.reverse().join(" L")} Z`;
}

// ============================================================================
// COMPONENT
// ============================================================================

export default function ForecastCurve() {
  const { ref, inView } = useInView({ threshold: 0.3 });
  const [progress, setProgress] = useState(0);
  const animating = useRef(false);

  // Animate drawing from left to right
  useEffect(() => {
    if (!inView || animating.current) return;
    animating.current = true;

    const duration = 2500;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      setProgress(t);
      if (t < 1) requestAnimationFrame(tick);
    }

    requestAnimationFrame(tick);
  }, [inView]);

  const curvePath = pointsToPath(FUEL_CURVE);
  const confidenceBand = bandPath();

  // Crossing point coords
  const crossX = dayToX(CROSSING_DAY);
  const crossY = pctToY(THRESHOLD_PCT);

  // How far the animation has progressed in days
  const currentDay = progress * 1825;
  const showCrossing = currentDay >= CROSSING_DAY;

  // Grid lines at 25%, 50%, 75%
  const gridLines = [0, 25, 50, 75];
  // X-axis labels at year marks
  const yearMarks = [
    { day: 0, label: "Today" },
    { day: 365, label: "Y1" },
    { day: 730, label: "Y2" },
    { day: 1095, label: "Y3" },
    { day: 1460, label: "Y4" },
    { day: 1825, label: "Y5" },
  ];

  return (
    <div ref={ref} className="w-full">
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        className="w-full h-auto"
        style={{ maxHeight: "480px" }}
      >
        <defs>
          {/* Curve gradient: emerald → amber → red */}
          <linearGradient id="curveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#10B981" />
            <stop offset="25%" stopColor="#10B981" />
            <stop offset="50%" stopColor="#F59E0B" />
            <stop offset="75%" stopColor="#EF4444" />
            <stop offset="100%" stopColor="#EF4444" />
          </linearGradient>

          {/* Glow filter */}
          <filter id="curveGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Clip mask for animation progress */}
          <clipPath id="progressClip">
            <rect x={PAD.left} y={0} width={CHART_W * progress} height={VB_H} />
          </clipPath>

          {/* Red pulse animation */}
          <radialGradient id="pulseGrad">
            <stop offset="0%" stopColor="#EF4444" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#EF4444" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* ── Background ── */}
        <rect width={VB_W} height={VB_H} fill="#F7F8FA" rx="8" />

        {/* ── Grid lines ── */}
        {gridLines.map((pct) => (
          <g key={pct}>
            <line
              x1={PAD.left}
              y1={pctToY(pct)}
              x2={VB_W - PAD.right}
              y2={pctToY(pct)}
              stroke="#E5E7EB"
              strokeWidth="0.5"
            />
            <text
              x={PAD.left - 10}
              y={pctToY(pct) + 4}
              fill="#4B5563"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="end"
            >
              {pct}%
            </text>
          </g>
        ))}

        {/* ── X-axis labels ── */}
        {yearMarks.map((m) => (
          <g key={m.day}>
            <line
              x1={dayToX(m.day)}
              y1={PAD.top}
              x2={dayToX(m.day)}
              y2={PAD.top + CHART_H}
              stroke="#E5E7EB"
              strokeWidth="0.5"
              strokeDasharray={m.day === 0 ? "0" : "2,4"}
            />
            <text
              x={dayToX(m.day)}
              y={PAD.top + CHART_H + 20}
              fill="#4B5563"
              fontSize="10"
              fontFamily="monospace"
              textAnchor="middle"
            >
              {m.label}
            </text>
          </g>
        ))}

        {/* ── Threshold line (Art. 70 — 15%) ── */}
        <line
          x1={PAD.left}
          y1={pctToY(THRESHOLD_PCT)}
          x2={VB_W - PAD.right}
          y2={pctToY(THRESHOLD_PCT)}
          stroke="#EF4444"
          strokeWidth="1"
          strokeDasharray="6,4"
          opacity="0.6"
        />
        <text
          x={VB_W - PAD.right - 2}
          y={pctToY(THRESHOLD_PCT) - 6}
          fill="#EF4444"
          fontSize="9"
          fontFamily="monospace"
          textAnchor="end"
          opacity="0.8"
        >
          Art. 70 Threshold
        </text>

        {/* ── Confidence band (clipped by progress) ── */}
        <g clipPath="url(#progressClip)">
          <path d={confidenceBand} fill="#10B981" opacity="0.06" />
        </g>

        {/* ── Main curve (clipped by progress) ── */}
        <g clipPath="url(#progressClip)" filter="url(#curveGlow)">
          <path
            d={curvePath}
            fill="none"
            stroke="url(#curveGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* ── Current position dot ── */}
        {progress > 0 && (
          <circle
            cx={dayToX(Math.min(currentDay, 1825))}
            cy={pctToY(interpolate(FUEL_CURVE, Math.min(currentDay, 1825)))}
            r="4"
            fill="#10B981"
            opacity={progress < 0.3 ? 1 : 0}
          >
            <animate
              attributeName="opacity"
              values="1;0.5;1"
              dur="2s"
              repeatCount="indefinite"
            />
          </circle>
        )}

        {/* ── Crossing point (red pulse) ── */}
        {showCrossing && (
          <g>
            {/* Pulse ring */}
            <circle cx={crossX} cy={crossY} r="12" fill="url(#pulseGrad)">
              <animate
                attributeName="r"
                values="8;16;8"
                dur="2s"
                repeatCount="indefinite"
              />
              <animate
                attributeName="opacity"
                values="0.6;0.15;0.6"
                dur="2s"
                repeatCount="indefinite"
              />
            </circle>
            {/* Core dot */}
            <circle cx={crossX} cy={crossY} r="4" fill="#EF4444" />
            {/* Label */}
            <rect
              x={crossX - 72}
              y={crossY - 30}
              width="144"
              height="18"
              rx="3"
              fill="#FFFFFF"
              stroke="#EF4444"
              strokeWidth="0.5"
              opacity="0.9"
            />
            <text
              x={crossX}
              y={crossY - 18}
              fill="#EF4444"
              fontSize="9.5"
              fontFamily="monospace"
              fontWeight="600"
              textAnchor="middle"
            >
              Day 533: Non-Compliant
            </text>
          </g>
        )}

        {/* ── Start value label ── */}
        {progress > 0.02 && (
          <text
            x={dayToX(0) + 8}
            y={pctToY(58) - 8}
            fill="#10B981"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="600"
          >
            58%
          </text>
        )}
      </svg>
    </div>
  );
}
