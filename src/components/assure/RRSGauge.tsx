"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface RRSGaugeProps {
  score: number;
  grade: string;
  size?: number;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10B981"; // emerald-500
  if (score >= 60) return "#F59E0B"; // amber-500
  return "#EF4444"; // red-500
}

function getScoreGradientId(score: number): string {
  if (score >= 80) return "gauge-gradient-green";
  if (score >= 60) return "gauge-gradient-amber";
  return "gauge-gradient-red";
}

export default function RRSGauge({ score, grade, size = 200 }: RRSGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    // Animate the score number
    const duration = 1200;
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(score, Math.round(increment * step));
      setAnimatedScore(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [score]);

  const strokeWidth = size * 0.08;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Arc from 135deg to 405deg (270deg sweep)
  const startAngle = 135;
  const endAngle = 405;
  const totalSweep = endAngle - startAngle; // 270

  // Calculate arc path
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
  const fillAngle = startAngle + (score / 100) * totalSweep;
  const fillArcPath =
    score > 0 ? describeArc(center, center, radius, startAngle, fillAngle) : "";

  const color = getScoreColor(score);
  const gradientId = getScoreGradientId(score);

  // Determine status text
  const statusText =
    score >= 80
      ? "Compliant"
      : score >= 60
        ? "Mostly Compliant"
        : score > 0
          ? "Partial"
          : "Not Assessed";

  return (
    <div
      className="relative inline-flex flex-col items-center"
      role="img"
      aria-label={`Regulatory Readiness Score: ${score} out of 100, Grade ${grade}`}
    >
      <svg
        width={size}
        height={size * 0.85}
        viewBox={`0 0 ${size} ${size * 0.85}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient
            id="gauge-gradient-green"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#059669" />
            <stop offset="100%" stopColor="#34D399" />
          </linearGradient>
          <linearGradient
            id="gauge-gradient-amber"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#FBBF24" />
          </linearGradient>
          <linearGradient
            id="gauge-gradient-red"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#F87171" />
          </linearGradient>
          <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
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
          className="text-slate-200 dark:text-white/10"
        />

        {/* Filled arc with animation */}
        {score > 0 && (
          <motion.path
            d={fillArcPath}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            filter="url(#gauge-glow)"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
          />
        )}

        {/* Score number in center */}
        <text
          x={center}
          y={center - size * 0.02}
          textAnchor="middle"
          dominantBaseline="central"
          className="fill-slate-900 dark:fill-white"
          style={{
            fontSize: size * 0.28,
            fontWeight: 600,
            fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          }}
        >
          {animatedScore}
        </text>

        {/* Grade letter */}
        <text
          x={center}
          y={center + size * 0.18}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          style={{
            fontSize: size * 0.12,
            fontWeight: 700,
            fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
          }}
        >
          Grade {grade}
        </text>
      </svg>

      {/* Status label below */}
      <div className="mt-1 text-center">
        <span
          className="text-caption uppercase tracking-widest"
          style={{ color }}
        >
          {statusText}
        </span>
      </div>
    </div>
  );
}
