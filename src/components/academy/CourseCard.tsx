"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Clock,
  Users,
  Satellite,
  Shield,
  Scale,
  Globe,
  Layers,
  Zap,
  type LucideIcon,
} from "lucide-react";
import LevelBadge from "./LevelBadge";

// ─── Types ───

type AcademyLevel = "BEGINNER" | "INTERMEDIATE" | "ADVANCED" | "EXPERT";

interface CourseCardProps {
  course: {
    slug: string;
    title: string;
    subtitle?: string | null;
    icon?: string | null;
    category: string;
    level: AcademyLevel;
    estimatedMinutes: number;
    moduleCount: number;
    lessonCount: number;
    enrollmentCount: number;
    enrollment?: {
      status: string;
      progressPercent: number;
    } | null;
  };
}

// ─── Icon Mapping ───

const ICON_MAP: Record<string, LucideIcon> = {
  Satellite,
  Shield,
  Scale,
  Globe,
  Layers,
  Zap,
  BookOpen,
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  EU_SPACE_ACT: Satellite,
  NIS2: Shield,
  NATIONAL_SPACE_LAW: Scale,
  CROSS_REGULATORY: Globe,
  FUNDAMENTALS: Layers,
  ADVANCED_TOPICS: Zap,
};

function resolveIcon(iconName?: string | null, category?: string): LucideIcon {
  if (iconName && ICON_MAP[iconName]) return ICON_MAP[iconName];
  if (category && CATEGORY_ICONS[category]) return CATEGORY_ICONS[category];
  return BookOpen;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) return `${remaining}m`;
  if (remaining === 0) return `${hours}h`;
  return `${hours}h ${remaining}m`;
}

// ─── Component ───

export default function CourseCard({ course }: CourseCardProps) {
  const Icon = resolveIcon(course.icon, course.category);
  const isEnrolled = !!course.enrollment;

  return (
    <Link href={`/academy/courses/${course.slug}`}>
      <motion.div
        whileHover={{ scale: 1.02, y: -2 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="h-full"
      >
        <div
          className={`
            relative rounded-xl overflow-hidden h-full cursor-pointer group
            bg-white/[0.06] backdrop-blur-xl border border-white/10
            shadow-[0_8px_32px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.05)]
            hover:bg-white/10 hover:border-white/20
            hover:shadow-[0_20px_60px_rgba(0,0,0,0.3)]
            transition-all duration-500
            p-5 flex flex-col
          `}
        >
          {/* Header: Icon + Level Badge */}
          <div className="flex items-start justify-between mb-4">
            <div
              className="
                w-11 h-11 rounded-xl
                bg-emerald-500/10 border border-emerald-500/20
                flex items-center justify-center
                group-hover:bg-emerald-500/20 transition-colors
              "
            >
              <Icon className="w-5 h-5 text-emerald-400" />
            </div>
            <LevelBadge level={course.level} size="sm" />
          </div>

          {/* Category Label */}
          <p className="text-micro text-emerald-400/70 uppercase tracking-wider mb-1.5">
            {course.category.replace(/_/g, " ")}
          </p>

          {/* Title + Subtitle */}
          <h3 className="text-title font-medium text-white mb-1.5 group-hover:text-emerald-400 transition-colors">
            {course.title}
          </h3>
          {course.subtitle && (
            <p className="text-body text-white/45 mb-4 line-clamp-2">
              {course.subtitle}
            </p>
          )}

          {/* Progress Bar (enrolled only) */}
          {isEnrolled && course.enrollment && (
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-micro text-white/45">Progress</span>
                <span className="text-micro text-emerald-400 tabular-nums">
                  {Math.round(course.enrollment.progressPercent)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{
                    width: `${course.enrollment.progressPercent}%`,
                  }}
                />
              </div>
            </div>
          )}

          {/* Footer Meta */}
          <div className="flex items-center gap-4 pt-3 border-t border-white/5 mt-auto">
            <div className="flex items-center gap-1.5 text-small text-white/40">
              <Clock className="w-3.5 h-3.5" />
              {formatDuration(course.estimatedMinutes)}
            </div>
            <div className="flex items-center gap-1.5 text-small text-white/40">
              <Users className="w-3.5 h-3.5" />
              {course.enrollmentCount.toLocaleString()}
            </div>
            <div className="flex items-center gap-1.5 text-small text-white/40">
              <BookOpen className="w-3.5 h-3.5" />
              {course.moduleCount} modules
            </div>
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
