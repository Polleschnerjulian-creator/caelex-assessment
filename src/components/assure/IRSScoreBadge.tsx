"use client";

import { motion } from "framer-motion";

// ─── Types ───

interface IRSScoreBadgeProps {
  grade: string;
  size?: "sm" | "md" | "lg" | "xl";
  showLabel?: boolean;
}

// ─── Grade Color Mapping ───

function getGradeColors(grade: string): {
  bg: string;
  shadow: string;
  ring: string;
} {
  const letter = grade.toUpperCase().replace(/[+-]/g, "")[0];

  switch (letter) {
    case "A":
      return {
        bg: "bg-emerald-500",
        shadow: "shadow-emerald-500/30",
        ring: "ring-emerald-500/20",
      };
    case "B":
      return {
        bg: "bg-amber-500",
        shadow: "shadow-amber-500/30",
        ring: "ring-amber-500/20",
      };
    case "C":
      return {
        bg: "bg-orange-500",
        shadow: "shadow-orange-500/30",
        ring: "ring-orange-500/20",
      };
    case "D":
      return {
        bg: "bg-red-500",
        shadow: "shadow-red-500/30",
        ring: "ring-red-500/20",
      };
    default:
      return {
        bg: "bg-slate-500",
        shadow: "shadow-slate-500/30",
        ring: "ring-slate-500/20",
      };
  }
}

function getGradeLabel(grade: string): string {
  const letter = grade.toUpperCase().replace(/[+-]/g, "")[0];
  const modifier = grade.includes("+")
    ? "High"
    : grade.includes("-")
      ? "Low"
      : "";

  switch (letter) {
    case "A":
      return modifier ? `${modifier} Investment Ready` : "Investment Ready";
    case "B":
      return modifier ? `${modifier} Promising` : "Promising";
    case "C":
      return modifier ? `${modifier} Developing` : "Developing";
    case "D":
      return "Needs Improvement";
    default:
      return "Unrated";
  }
}

// ─── Size Mapping ───

const SIZE_MAP = {
  sm: {
    container: "w-10 h-10",
    text: "text-body-lg font-bold",
    label: "text-micro",
    ring: "ring-2",
  },
  md: {
    container: "w-16 h-16",
    text: "text-display-sm font-bold",
    label: "text-caption",
    ring: "ring-2",
  },
  lg: {
    container: "w-24 h-24",
    text: "text-display font-bold",
    label: "text-small",
    ring: "ring-[3px]",
  },
  xl: {
    container: "w-32 h-32",
    text: "text-display-lg font-bold",
    label: "text-body",
    ring: "ring-4",
  },
} as const;

// ─── Component ───

export default function IRSScoreBadge({
  grade,
  size = "md",
  showLabel = false,
}: IRSScoreBadgeProps) {
  const sizeConfig = SIZE_MAP[size];
  const colors = getGradeColors(grade);
  const label = getGradeLabel(grade);

  return (
    <div className="inline-flex flex-col items-center gap-2">
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
          ${sizeConfig.container} ${colors.bg}
          rounded-full flex items-center justify-center
          shadow-lg ${colors.shadow}
          ${sizeConfig.ring} ${colors.ring}
        `}
        role="img"
        aria-label={`Investment Readiness Score: ${grade} (${label})`}
      >
        <span
          className={`${sizeConfig.text} text-white leading-none select-none`}
        >
          {grade}
        </span>
      </motion.div>

      {showLabel && (
        <motion.span
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`${sizeConfig.label} text-white/45 font-medium`}
        >
          {label}
        </motion.span>
      )}
    </div>
  );
}
