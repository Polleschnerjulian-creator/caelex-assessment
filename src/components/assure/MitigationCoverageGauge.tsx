"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

// ─── Types ───

interface MitigationCoverageGaugeProps {
  total: number;
  mitigated: number;
  inProgress: number;
}

// ─── Component ───

export default function MitigationCoverageGauge({
  total,
  mitigated,
  inProgress,
}: MitigationCoverageGaugeProps) {
  const [animatedPct, setAnimatedPct] = useState(0);

  const coveragePct = total > 0 ? Math.round((mitigated / total) * 100) : 0;
  const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
  const unmitigated = Math.max(0, total - mitigated - inProgress);

  useEffect(() => {
    const duration = 1000;
    const steps = 50;
    const increment = coveragePct / steps;
    let current = 0;
    let step = 0;

    const timer = setInterval(() => {
      step++;
      current = Math.min(coveragePct, Math.round(increment * step));
      setAnimatedPct(current);
      if (step >= steps) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [coveragePct]);

  const size = 160;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  // Mitigated arc
  const mitigatedOffset = circumference - (coveragePct / 100) * circumference;
  // In Progress arc (starts after mitigated)
  const inProgressOffset =
    circumference - (inProgressPct / 100) * circumference;
  const inProgressRotation = (coveragePct / 100) * 360 - 90;

  return (
    <div className="inline-flex flex-col items-center gap-4">
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/5"
          />

          {/* In-progress arc (amber) */}
          {inProgressPct > 0 && (
            <motion.circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: inProgressOffset }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.5 }}
              style={{
                transformOrigin: "center",
                transform: `rotate(${inProgressRotation}deg)`,
              }}
            />
          )}

          {/* Mitigated arc (emerald) */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#10B981"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: mitigatedOffset }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
          />
        </svg>

        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-display-sm font-bold text-white">
            {animatedPct}%
          </span>
          <span className="text-micro text-white/40 uppercase tracking-wider">
            Covered
          </span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          <span className="text-micro text-white/50">
            Mitigated ({mitigated})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          <span className="text-micro text-white/50">
            In Progress ({inProgress})
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
          <span className="text-micro text-white/50">Open ({unmitigated})</span>
        </div>
      </div>
    </div>
  );
}
