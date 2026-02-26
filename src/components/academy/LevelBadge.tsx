"use client";

// Renders an uppercase pill badge with level-specific colors

type AcademyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

interface LevelBadgeProps {
  level: AcademyLevel;
  size?: "sm" | "md";
}

const LEVEL_STYLES: Record<AcademyLevel, string> = {
  BEGINNER: "bg-green-500/15 text-green-400 border-green-500/30",
  INTERMEDIATE: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  ADVANCED: "bg-red-500/15 text-red-400 border-red-500/30",
  EXPERT: "bg-purple-500/15 text-purple-400 border-purple-500/30",
};

const SIZE_STYLES: Record<"sm" | "md", string> = {
  sm: "px-1.5 py-0.5 text-micro",
  md: "px-2.5 py-1 text-caption",
};

export default function LevelBadge({ level, size = "sm" }: LevelBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center
        ${SIZE_STYLES[size]}
        ${LEVEL_STYLES[level]}
        rounded-lg border
        font-medium uppercase tracking-wide
        select-none
      `}
    >
      {level}
    </span>
  );
}
