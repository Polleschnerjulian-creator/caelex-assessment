"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, BarChart3, AlertTriangle } from "lucide-react";

// ─── Types ───

interface DualScoreWidgetProps {
  selfAssessedScore: number; // 0-100
  verifiedScore: number; // 0-100
  acceptedEvidence: number;
  totalRequired: number;
  lastVerified?: string; // ISO date
  className?: string;
}

// ─── Animated Counter Hook ───

function useAnimatedCounter(target: number, duration = 1200): number {
  const [value, setValue] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const from = 0;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(from + (target - from) * eased));

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [target, duration]);

  return value;
}

// ─── Circular Progress Ring ───

function ProgressRing({
  progress,
  color,
  size = 72,
  strokeWidth = 5,
}: {
  progress: number;
  color: string;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg
      width={size}
      height={size}
      className="-rotate-90"
      viewBox={`0 0 ${size} ${size}`}
    >
      {/* Background ring */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-100 dark:text-white/5"
      />
      {/* Progress ring */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

// ─── Relative Time Formatter ───

function formatRelativeTime(isoDate: string): string {
  const now = new Date();
  const date = new Date(isoDate);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Main Widget ───

export default function DualScoreWidget({
  selfAssessedScore,
  verifiedScore,
  acceptedEvidence,
  totalRequired,
  lastVerified,
  className = "",
}: DualScoreWidgetProps) {
  const gap = Math.max(0, selfAssessedScore - verifiedScore);

  const animatedSelf = useAnimatedCounter(selfAssessedScore);
  const animatedVerified = useAnimatedCounter(verifiedScore);
  const animatedGap = useAnimatedCounter(gap);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={`bg-white border border-slate-200 dark:bg-white/5 dark:backdrop-blur-sm dark:border-[--glass-border-subtle] rounded-xl p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="w-4 h-4 text-cyan-400" />
        <h2 className="text-caption font-medium uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
          Compliance Verification
        </h2>
      </div>

      {/* Three Score Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {/* Self-Assessed Score */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <ProgressRing progress={selfAssessedScore} color="#10B981" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                {animatedSelf}
              </span>
            </div>
          </div>
          <p className="text-caption font-medium text-slate-700 dark:text-white/70 mb-0.5">
            Self-Assessed
          </p>
          <p className="text-micro text-slate-400 dark:text-white/30">
            Based on assessments
          </p>
        </div>

        {/* Verified Evidence Score */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <ProgressRing progress={verifiedScore} color="#06B6D4" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-semibold text-slate-900 dark:text-white">
                {animatedVerified}
              </span>
            </div>
          </div>
          <p className="text-caption font-medium text-slate-700 dark:text-white/70 mb-0.5">
            Verified
          </p>
          <p className="text-micro text-slate-400 dark:text-white/30">
            Based on evidence
          </p>
        </div>

        {/* Verification Gap */}
        <div className="flex flex-col items-center text-center">
          <div className="relative mb-3">
            <ProgressRing
              progress={gap}
              color={gap > 25 ? "#F59E0B" : gap > 10 ? "#FB923C" : "#10B981"}
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`text-2xl font-semibold ${
                  gap > 25
                    ? "text-amber-500"
                    : gap > 10
                      ? "text-orange-400"
                      : "text-emerald-500"
                }`}
              >
                {animatedGap}
              </span>
            </div>
          </div>
          <p className="text-caption font-medium text-slate-700 dark:text-white/70 mb-0.5">
            Verification Gap
          </p>
          <p className="text-micro text-slate-400 dark:text-white/30">
            {gap > 25
              ? "Evidence needed"
              : gap > 10
                ? "Partially verified"
                : "Well verified"}
          </p>
        </div>
      </div>

      {/* Bottom Stats Line */}
      <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-1.5 text-caption text-slate-400 dark:text-white/30">
          <BarChart3 className="w-3 h-3" />
          <span>
            <span className="text-slate-600 dark:text-white/60 font-medium">
              {acceptedEvidence}
            </span>{" "}
            accepted /{" "}
            <span className="text-slate-600 dark:text-white/60 font-medium">
              {totalRequired}
            </span>{" "}
            required
          </span>
        </div>
        {lastVerified && (
          <div className="flex items-center gap-1.5 text-caption text-slate-400 dark:text-white/30">
            <AlertTriangle className="w-3 h-3" />
            <span>Last verified: {formatRelativeTime(lastVerified)}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Usage in dashboard/page.tsx:
// import DualScoreWidget from "@/components/dashboard/DualScoreWidget";
// <DualScoreWidget selfAssessedScore={72} verifiedScore={45} acceptedEvidence={12} totalRequired={51} />
