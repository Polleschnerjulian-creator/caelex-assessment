"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import type { IRSPreviewResult } from "@/lib/assure/irs-preview-calculator";

// ─── Helpers ───

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981";
  if (score >= 60) return "#F59E0B";
  if (score >= 40) return "#F97316";
  return "#EF4444";
}

function getGradientId(score: number): string {
  if (score >= 80) return "live-gradient-green";
  if (score >= 60) return "live-gradient-amber";
  if (score >= 40) return "live-gradient-orange";
  return "live-gradient-red";
}

// ─── Component ───

interface LiveScoreWidgetProps {
  score: IRSPreviewResult;
}

export default function LiveScoreWidget({ score }: LiveScoreWidgetProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Animated counter: 1.4s duration
  useEffect(() => {
    const target = score.overallScore;
    const duration = 1400;
    const steps = 70;
    const increment = target / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(target, Math.round(increment * step));
      setAnimatedScore(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score.overallScore]);

  // SVG arc setup — size 140, 270-degree sweep
  const size = 140;
  const strokeWidth = size * 0.07;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const startAngle = 135;
  const endAngle = 405;
  const totalSweep = endAngle - startAngle;

  const polarToCartesian = (
    cx: number,
    cy: number,
    r: number,
    angleDeg: number,
  ) => {
    const rad = ((angleDeg - 90) * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const describeArc = (
    cx: number,
    cy: number,
    r: number,
    start: number,
    end: number,
  ) => {
    const startPt = polarToCartesian(cx, cy, r, start);
    const endPt = polarToCartesian(cx, cy, r, end);
    const sweep = end - start;
    const largeArc = sweep > 180 ? 1 : 0;
    return `M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`;
  };

  const bgArcPath = describeArc(center, center, radius, startAngle, endAngle);
  const fillAngle = startAngle + (score.overallScore / 100) * totalSweep;
  const fillArcPath =
    score.overallScore > 0
      ? describeArc(center, center, radius, startAngle, fillAngle)
      : "";

  const color = getScoreColor(score.overallScore);
  const gradientId = getGradientId(score.overallScore);

  return (
    <div className="glass-surface rounded-xl border border-white/10 p-5">
      {/* Score ring */}
      <div className="flex flex-col items-center">
        <div className="relative">
          <svg
            width={size}
            height={size * 0.85}
            viewBox={`0 0 ${size} ${size * 0.85}`}
            className="overflow-visible"
          >
            <defs>
              <linearGradient
                id="live-gradient-green"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#059669" />
                <stop offset="100%" stopColor="#34D399" />
              </linearGradient>
              <linearGradient
                id="live-gradient-amber"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#D97706" />
                <stop offset="100%" stopColor="#FBBF24" />
              </linearGradient>
              <linearGradient
                id="live-gradient-orange"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#EA580C" />
                <stop offset="100%" stopColor="#FB923C" />
              </linearGradient>
              <linearGradient
                id="live-gradient-red"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="0%"
              >
                <stop offset="0%" stopColor="#DC2626" />
                <stop offset="100%" stopColor="#F87171" />
              </linearGradient>
              <filter
                id="live-gauge-glow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Background arc */}
            <path
              d={bgArcPath}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              className="text-white/10"
            />

            {/* Filled arc */}
            {score.overallScore > 0 && (
              <motion.path
                d={fillArcPath}
                fill="none"
                stroke={`url(#${gradientId})`}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                filter="url(#live-gauge-glow)"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1.4, ease: "easeOut", delay: 0.2 }}
              />
            )}

            {/* Score number */}
            <text
              x={center}
              y={center - size * 0.05}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-white"
              style={{
                fontSize: size * 0.28,
                fontWeight: 600,
                fontFamily:
                  "ui-sans-serif, system-ui, -apple-system, sans-serif",
              }}
            >
              {animatedScore}
            </text>

            {/* Grade */}
            {score.grade && (
              <text
                x={center}
                y={center + size * 0.15}
                textAnchor="middle"
                dominantBaseline="central"
                fill={color}
                style={{
                  fontSize: size * 0.1,
                  fontWeight: 700,
                  fontFamily:
                    "ui-sans-serif, system-ui, -apple-system, sans-serif",
                }}
              >
                Grade {score.grade}
              </text>
            )}
          </svg>
        </div>

        {/* Grade label */}
        <span
          className="text-caption uppercase tracking-widest font-medium mt-1"
          style={{ color }}
        >
          {score.gradeLabel}
        </span>

        {/* Delta indicator */}
        {score.delta !== 0 && (
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-body font-semibold mt-1 ${
              score.delta > 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {score.delta > 0 ? `+${score.delta}` : score.delta}
          </motion.span>
        )}
      </div>

      {/* Component bars */}
      <div className="mt-5 space-y-3">
        {score.components.map((component) => (
          <div
            key={component.id}
            className={component.dataAvailable ? "" : "opacity-30"}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-small text-white/50">
                {component.label}
              </span>
              <span className="text-small text-white/70 font-medium">
                {component.score}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-emerald-500"
                initial={{ width: 0 }}
                animate={{ width: `${component.score}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
