"use client";

import { TrendingUp, ArrowRight, TrendingDown, RefreshCw } from "lucide-react";

// ─── Types ───

interface RCROutlookIndicatorProps {
  outlook: "POSITIVE" | "STABLE" | "NEGATIVE" | "DEVELOPING";
}

// ─── Outlook Configuration ───

const OUTLOOK_CONFIG = {
  POSITIVE: {
    icon: TrendingUp,
    label: "Positive",
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-500/10",
    border: "border-green-200 dark:border-green-500/20",
  },
  STABLE: {
    icon: ArrowRight,
    label: "Stable",
    color: "text-slate-600 dark:text-slate-300",
    bg: "bg-slate-50 dark:bg-white/5",
    border: "border-slate-200 dark:border-white/10",
  },
  NEGATIVE: {
    icon: TrendingDown,
    label: "Negative",
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-500/10",
    border: "border-red-200 dark:border-red-500/20",
  },
  DEVELOPING: {
    icon: RefreshCw,
    label: "Developing",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-500/10",
    border: "border-amber-200 dark:border-amber-500/20",
  },
} as const;

// ─── Component ───

export default function RCROutlookIndicator({
  outlook,
}: RCROutlookIndicatorProps) {
  const config = OUTLOOK_CONFIG[outlook];
  const Icon = config.icon;

  return (
    <span
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border
        text-small font-medium
        ${config.bg} ${config.border} ${config.color}
      `}
      role="status"
      aria-label={`Outlook: ${config.label}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {config.label}
    </span>
  );
}
