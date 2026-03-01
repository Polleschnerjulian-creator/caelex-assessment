"use client";

import { motion } from "framer-motion";

// ─── Types ───

interface RCRGradeBadgeProps {
  grade: string;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
}

// ─── Grade Color Mapping ───

function getGradeColor(grade: string): string {
  const g = grade.toUpperCase().replace(/[+-]/g, "");
  const suffix = grade.includes("+") ? "+" : grade.includes("-") ? "-" : "";
  const full = g + suffix;

  // AAA, AA+, AA, AA-
  if (g === "AAA" || g === "AA") return "bg-emerald-500";
  // A+, A, A-
  if (g === "A") return "bg-emerald-400";
  // BBB+, BBB, BBB-
  if (g === "BBB") return "bg-amber-500";
  // BB+, BB, BB-
  if (g === "BB") return "bg-amber-400";
  // B+, B, B-
  if (g === "B") return "bg-orange-500";
  // CCC+, CCC, CCC-
  if (g === "CCC") return "bg-red-500";
  // CC
  if (full === "CC") return "bg-red-600";
  // D
  if (full === "D") return "bg-red-800";

  return "bg-slate-500";
}

function getGradeShadow(grade: string): string {
  const g = grade.toUpperCase().replace(/[+-]/g, "");

  if (g === "AAA" || g === "AA") return "shadow-emerald-500/30";
  if (g === "A") return "shadow-emerald-400/30";
  if (g === "BBB") return "shadow-amber-500/30";
  if (g === "BB") return "shadow-amber-400/30";
  if (g === "B") return "shadow-orange-500/30";
  if (g === "CCC") return "shadow-red-500/30";
  if (g === "CC") return "shadow-red-600/30";
  if (g === "D") return "shadow-red-800/30";

  return "shadow-slate-500/30";
}

function getGradeLabel(grade: string): string {
  const g = grade.toUpperCase().replace(/[+-]/g, "");

  if (g === "AAA") return "Prime";
  if (g === "AA") return "Superior";
  if (g === "A") return "Strong";
  if (g === "BBB") return "Adequate";
  if (g === "BB") return "Speculative";
  if (g === "B") return "Vulnerable";
  if (g === "CCC") return "Substantial Risk";
  if (g === "CC") return "Very High Risk";
  if (g === "D") return "Default";

  return "Unrated";
}

// ─── Size Mapping ───

const SIZE_MAP = {
  sm: {
    container: "w-8 h-8",
    text: "text-small font-bold",
    label: "text-micro",
  },
  md: {
    container: "w-14 h-14",
    text: "text-body-lg font-bold",
    label: "text-caption",
  },
  lg: {
    container: "w-20 h-20",
    text: "text-display-sm font-bold",
    label: "text-small",
  },
  xl: {
    container: "w-[120px] h-[120px]",
    text: "text-display font-bold",
    label: "text-body",
  },
} as const;

// ─── Component ───

export default function RCRGradeBadge({
  grade,
  size = "md",
  showLabel = false,
}: RCRGradeBadgeProps) {
  const sizeConfig = SIZE_MAP[size];
  const bgColor = getGradeColor(grade);
  const shadow = getGradeShadow(grade);
  const label = getGradeLabel(grade);

  return (
    <div className="inline-flex flex-col items-center gap-1.5">
      <motion.div
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: "spring",
          stiffness: 260,
          damping: 20,
          delay: 0.1,
        }}
        className={`
          ${sizeConfig.container} ${bgColor}
          rounded-full flex items-center justify-center
          shadow-lg ${shadow}
        `}
        role="img"
        aria-label={`Credit rating: ${grade} (${label})`}
      >
        <span
          className={`${sizeConfig.text} text-white leading-none select-none`}
        >
          {grade}
        </span>
      </motion.div>

      {showLabel && (
        <motion.span
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${sizeConfig.label} text-slate-500 dark:text-white/45 font-medium`}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}
