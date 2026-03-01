"use client";

import { motion } from "framer-motion";

// ─── Types ───

interface ProfileSection {
  name: string;
  completion: number;
}

interface ProfileCompletionBarProps {
  sections: ProfileSection[];
}

// ─── Helpers ───

function getBarColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getTextColor(pct: number): string {
  if (pct >= 80) return "text-emerald-400";
  if (pct >= 50) return "text-amber-400";
  return "text-red-400";
}

// ─── Component ───

export default function ProfileCompletionBar({
  sections,
}: ProfileCompletionBarProps) {
  return (
    <div className="space-y-4">
      {sections.map((section, index) => (
        <motion.div
          key={section.name}
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
        >
          {/* Label row */}
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-body text-white/70 font-medium">
              {section.name}
            </span>
            <span
              className={`text-small font-semibold ${getTextColor(section.completion)}`}
            >
              {section.completion}%
            </span>
          </div>

          {/* Bar */}
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${section.completion}%` }}
              transition={{
                duration: 0.7,
                ease: "easeOut",
                delay: 0.1 + index * 0.05,
              }}
              className={`h-full rounded-full ${getBarColor(section.completion)}`}
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
