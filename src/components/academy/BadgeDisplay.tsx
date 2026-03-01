"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Award,
  Rocket,
  GraduationCap,
  Zap,
  Target,
  Flame,
  Calendar,
  Satellite,
  Shield,
  Globe,
  Map,
  Trophy,
  type LucideIcon,
} from "lucide-react";

// ─── Types ───

type AcademyBadgeType =
  | "FIRST_LESSON"
  | "FIRST_COURSE"
  | "SPEED_DEMON"
  | "PERFECT_QUIZ"
  | "SIMULATION_MASTER"
  | "STREAK_7"
  | "STREAK_30"
  | "ALL_EU_SPACE_ACT"
  | "ALL_NIS2"
  | "CROSS_REGULATORY"
  | "JURISDICTION_EXPLORER"
  | "COMPLIANCE_CHAMPION";

interface BadgeDisplayProps {
  badgeType: AcademyBadgeType | string;
  earnedAt?: string;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  animate?: boolean;
}

interface BadgeMeta {
  icon: LucideIcon;
  label: string;
  criteria: string;
  color: string; // icon and glow color class
  glowColor: string; // shadow glow for earned state
}

// ─── Badge Metadata ───

const BADGE_META: Record<string, BadgeMeta> = {
  FIRST_LESSON: {
    icon: Rocket,
    label: "First Steps",
    criteria: "Complete your first lesson",
    color: "text-emerald-400",
    glowColor: "shadow-[0_0_20px_rgba(16,185,129,0.3)]",
  },
  FIRST_COURSE: {
    icon: GraduationCap,
    label: "Course Graduate",
    criteria: "Complete your first course",
    color: "text-blue-400",
    glowColor: "shadow-[0_0_20px_rgba(59,130,246,0.3)]",
  },
  SPEED_DEMON: {
    icon: Zap,
    label: "Speed Demon",
    criteria: "Complete a lesson in under 2 minutes",
    color: "text-amber-400",
    glowColor: "shadow-[0_0_20px_rgba(245,158,11,0.3)]",
  },
  PERFECT_QUIZ: {
    icon: Target,
    label: "Perfect Score",
    criteria: "Score 100% on any quiz",
    color: "text-purple-400",
    glowColor: "shadow-[0_0_20px_rgba(168,85,247,0.3)]",
  },
  SIMULATION_MASTER: {
    icon: Award,
    label: "Simulation Master",
    criteria: "Complete all 10 simulation scenarios",
    color: "text-red-400",
    glowColor: "shadow-[0_0_20px_rgba(239,68,68,0.3)]",
  },
  STREAK_7: {
    icon: Flame,
    label: "Week Warrior",
    criteria: "7 consecutive days with at least 1 completion",
    color: "text-orange-400",
    glowColor: "shadow-[0_0_20px_rgba(251,146,60,0.3)]",
  },
  STREAK_30: {
    icon: Calendar,
    label: "Monthly Marathon",
    criteria: "30 consecutive days with at least 1 completion",
    color: "text-rose-400",
    glowColor: "shadow-[0_0_20px_rgba(251,113,133,0.3)]",
  },
  ALL_EU_SPACE_ACT: {
    icon: Satellite,
    label: "EU Space Act Expert",
    criteria: "Complete all EU Space Act courses",
    color: "text-cyan-400",
    glowColor: "shadow-[0_0_20px_rgba(34,211,238,0.3)]",
  },
  ALL_NIS2: {
    icon: Shield,
    label: "NIS2 Specialist",
    criteria: "Complete all NIS2 courses",
    color: "text-indigo-400",
    glowColor: "shadow-[0_0_20px_rgba(129,140,248,0.3)]",
  },
  CROSS_REGULATORY: {
    icon: Globe,
    label: "Cross-Regulatory",
    criteria: "Complete courses in 3+ different categories",
    color: "text-teal-400",
    glowColor: "shadow-[0_0_20px_rgba(45,212,191,0.3)]",
  },
  JURISDICTION_EXPLORER: {
    icon: Map,
    label: "Jurisdiction Explorer",
    criteria: "Complete courses covering 5+ national jurisdictions",
    color: "text-sky-400",
    glowColor: "shadow-[0_0_20px_rgba(56,189,248,0.3)]",
  },
  COMPLIANCE_CHAMPION: {
    icon: Trophy,
    label: "Compliance Champion",
    criteria: "Earn all other badges",
    color: "text-amber-400",
    glowColor: "shadow-[0_0_24px_rgba(245,158,11,0.4)]",
  },
};

const DEFAULT_BADGE: BadgeMeta = {
  icon: Award,
  label: "Unknown Badge",
  criteria: "Badge details unavailable",
  color: "text-white/40",
  glowColor: "",
};

// ─── Size Config ───

const SIZE_CONFIG: Record<
  "sm" | "md" | "lg",
  { container: string; icon: string }
> = {
  sm: { container: "w-10 h-10", icon: "w-4 h-4" },
  md: { container: "w-14 h-14", icon: "w-6 h-6" },
  lg: { container: "w-20 h-20", icon: "w-8 h-8" },
};

// ─── Component ───

export default function BadgeDisplay({
  badgeType,
  earnedAt,
  size = "md",
  showTooltip = true,
  animate = false,
}: BadgeDisplayProps) {
  const [isHovered, setIsHovered] = useState(false);

  const meta = BADGE_META[badgeType] ?? DEFAULT_BADGE;
  const isEarned = !!earnedAt;
  const sizeConfig = SIZE_CONFIG[size];
  const Icon = meta.icon;

  const formattedDate = earnedAt
    ? new Date(earnedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const badgeElement = (
    <motion.div
      className="relative inline-flex"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      {...(animate && isEarned
        ? {
            initial: { scale: 0, rotate: -180 },
            animate: { scale: 1, rotate: 0 },
            transition: {
              type: "spring",
              stiffness: 260,
              damping: 20,
              delay: 0.1,
            },
          }
        : {})}
    >
      {/* Badge Circle */}
      <div
        className={`
          ${sizeConfig.container}
          rounded-full flex items-center justify-center
          transition-all duration-300
          ${
            isEarned
              ? `bg-white/[0.08] border-2 border-amber-500/40 ${meta.glowColor}`
              : "bg-white/[0.03] border-2 border-dashed border-white/10 opacity-40"
          }
        `}
      >
        <Icon
          className={`
            ${sizeConfig.icon}
            transition-colors duration-300
            ${isEarned ? meta.color : "text-white/30 grayscale"}
          `}
        />
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <AnimatePresence>
          {isHovered && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 4, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="
                absolute bottom-full left-1/2 -translate-x-1/2 mb-2.5
                z-50 pointer-events-none
              "
            >
              <div
                className="
                  bg-[#141414] border border-white/[0.08] rounded-lg
                  px-3 py-2.5 min-w-[180px] max-w-[220px]
                  shadow-[0_12px_40px_rgba(0,0,0,0.4)]
                "
              >
                <p className="text-small font-medium text-white mb-0.5">
                  {meta.label}
                </p>
                <p className="text-caption text-white/50 leading-relaxed">
                  {meta.criteria}
                </p>
                {isEarned && formattedDate && (
                  <p className="text-micro text-emerald-400/70 mt-1.5">
                    Earned {formattedDate}
                  </p>
                )}
                {!isEarned && (
                  <p className="text-micro text-white/25 mt-1.5">
                    Not yet earned
                  </p>
                )}

                {/* Tooltip arrow */}
                <div
                  className="
                    absolute top-full left-1/2 -translate-x-1/2
                    w-0 h-0
                    border-l-[6px] border-l-transparent
                    border-r-[6px] border-r-transparent
                    border-t-[6px] border-t-white/15
                  "
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </motion.div>
  );

  return badgeElement;
}
