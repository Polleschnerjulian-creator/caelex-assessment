"use client";

import { motion } from "framer-motion";

// ─── Types ───

interface ProgressRingProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  label?: string;
}

// ─── Helpers ───

function getProgressColor(progress: number): string {
  if (progress < 33) return "#EF4444"; // red-500
  if (progress <= 66) return "#F59E0B"; // amber-500
  return "#10B981"; // emerald-500
}

function getProgressTextClass(progress: number): string {
  if (progress < 33) return "text-red-400";
  if (progress <= 66) return "text-amber-400";
  return "text-emerald-400";
}

// ─── Component ───

export default function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
  label,
}: ProgressRingProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (clampedProgress / 100) * circumference;
  const color = getProgressColor(clampedProgress);
  const textClass = getProgressTextClass(clampedProgress);

  return (
    <div className="inline-flex flex-col items-center gap-2">
      <div
        className="relative inline-flex items-center justify-center"
        role="progressbar"
        aria-valuenow={clampedProgress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label ?? `Progress: ${Math.round(clampedProgress)}%`}
      >
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          aria-hidden="true"
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            className="stroke-white/10 fill-none"
          />

          {/* Animated progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            className="fill-none"
            stroke={color}
            style={{
              strokeDasharray: circumference,
            }}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{
              duration: 1,
              ease: "easeOut",
              delay: 0.15,
            }}
          />
        </svg>

        {/* Center percentage text */}
        <motion.span
          className={`absolute font-semibold tabular-nums ${textClass} ${size >= 80 ? "text-body-lg" : "text-small"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.3 }}
        >
          {Math.round(clampedProgress)}%
        </motion.span>
      </div>

      {/* Label */}
      {label && (
        <span className="text-small text-white/45 text-center">{label}</span>
      )}
    </div>
  );
}
