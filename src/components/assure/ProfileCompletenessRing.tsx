"use client";

import { motion } from "framer-motion";

// ─── Types ───

interface ProfileSection {
  name: string;
  completion: number;
  icon?: string;
}

interface ProfileCompletenessRingProps {
  sections: ProfileSection[];
}

// ─── Helpers ───

function getCompletionColor(pct: number): string {
  if (pct >= 80) return "#10B981";
  if (pct >= 50) return "#F59E0B";
  return "#EF4444";
}

function MiniRing({
  section,
  index,
}: {
  section: ProfileSection;
  index: number;
}) {
  const size = 56;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (section.completion / 100) * circumference;
  const color = getCompletionColor(section.completion);

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      className="flex flex-col items-center gap-1.5"
    >
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
            className="text-white/10"
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
            transition={{
              duration: 0.8,
              ease: "easeOut",
              delay: 0.2 + index * 0.08,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-caption font-semibold text-white">
            {section.completion}%
          </span>
        </div>
      </div>
      <span className="text-micro text-white/45 text-center max-w-[72px] leading-tight truncate">
        {section.name}
      </span>
    </motion.div>
  );
}

// ─── Component ───

export default function ProfileCompletenessRing({
  sections,
}: ProfileCompletenessRingProps) {
  const overallCompletion =
    sections.length > 0
      ? Math.round(
          sections.reduce((sum, s) => sum + s.completion, 0) / sections.length,
        )
      : 0;

  const mainSize = 100;
  const mainStroke = 6;
  const mainRadius = (mainSize - mainStroke) / 2;
  const mainCircumference = 2 * Math.PI * mainRadius;
  const mainOffset =
    mainCircumference - (overallCompletion / 100) * mainCircumference;
  const mainColor = getCompletionColor(overallCompletion);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Overall Ring */}
      <div className="relative">
        <svg
          width={mainSize}
          height={mainSize}
          className="transform -rotate-90"
        >
          <circle
            cx={mainSize / 2}
            cy={mainSize / 2}
            r={mainRadius}
            fill="none"
            stroke="currentColor"
            strokeWidth={mainStroke}
            className="text-white/10"
          />
          <motion.circle
            cx={mainSize / 2}
            cy={mainSize / 2}
            r={mainRadius}
            fill="none"
            stroke={mainColor}
            strokeWidth={mainStroke}
            strokeLinecap="round"
            strokeDasharray={mainCircumference}
            initial={{ strokeDashoffset: mainCircumference }}
            animate={{ strokeDashoffset: mainOffset }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-display-sm font-bold text-white">
            {overallCompletion}%
          </span>
          <span className="text-micro text-white/40 uppercase tracking-wider">
            Overall
          </span>
        </div>
      </div>

      {/* Section Rings */}
      <div className="flex flex-wrap justify-center gap-4">
        {sections.map((section, i) => (
          <MiniRing key={section.name} section={section} index={i} />
        ))}
      </div>
    </div>
  );
}
