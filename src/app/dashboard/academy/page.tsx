"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSession } from "next-auth/react";
import {
  BookOpen,
  Clock,
  Award,
  Flame,
  Trophy,
  BarChart3,
  ChevronRight,
  Loader2,
  AlertCircle,
  PlayCircle,
  CheckCircle,
  Lock,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface EnrollmentData {
  id: string;
  status: string;
  progressPercent: number;
  totalTimeSpent: number;
  quizAverage: number | null;
  course: {
    slug: string;
    title: string;
    icon: string | null;
    category: string;
    level: string;
    estimatedMinutes: number;
  };
  currentLessonId: string | null;
}

interface BadgeData {
  id: string;
  badgeType: string;
  earnedAt: string;
  metadata: Record<string, unknown> | null;
}

interface ProgressData {
  enrollments: EnrollmentData[];
  badges: BadgeData[];
  stats: {
    coursesCompleted: number;
    totalTimeMinutes: number;
    avgQuizScore: number;
    badgesEarned: number;
    currentStreak: number;
  };
  recentActivity: Array<{
    id: string;
    lessonTitle: string;
    courseTitle: string;
    completedAt: string;
    score: number | null;
  }>;
}

// ─── Badge Config ───

const BADGE_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  FIRST_LESSON: {
    label: "First Lesson",
    icon: "star",
    color: "text-amber-400",
  },
  FIRST_COURSE: {
    label: "First Course",
    icon: "trophy",
    color: "text-amber-400",
  },
  SPEED_DEMON: { label: "Speed Demon", icon: "zap", color: "text-cyan-400" },
  PERFECT_QUIZ: {
    label: "Perfect Quiz",
    icon: "target",
    color: "text-emerald-400",
  },
  SIMULATION_MASTER: {
    label: "Sim Master",
    icon: "cpu",
    color: "text-purple-400",
  },
  STREAK_7: { label: "7-Day Streak", icon: "flame", color: "text-orange-400" },
  STREAK_30: { label: "30-Day Streak", icon: "flame", color: "text-red-400" },
  ALL_EU_SPACE_ACT: {
    label: "EU Space Act",
    icon: "shield",
    color: "text-blue-400",
  },
  ALL_NIS2: { label: "NIS2 Complete", icon: "lock", color: "text-green-400" },
  CROSS_REGULATORY: {
    label: "Cross-Reg",
    icon: "link",
    color: "text-indigo-400",
  },
  JURISDICTION_EXPLORER: {
    label: "Explorer",
    icon: "globe",
    color: "text-teal-400",
  },
  COMPLIANCE_CHAMPION: {
    label: "Champion",
    icon: "award",
    color: "text-yellow-400",
  },
};

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400",
  ADVANCED: "bg-red-500/20 text-red-400",
  EXPERT: "bg-purple-500/20 text-purple-400",
};

// ─── Main Page ───

export default function AcademyDashboardPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const firstName = session?.user?.name?.split(" ")[0] || "there";

  useEffect(() => {
    fetch("/api/academy/progress")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load progress");
        return r.json();
      })
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-body-lg text-white/70">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-body px-5 py-2 rounded-lg transition-all"
        >
          Retry
        </button>
      </div>
    );
  }

  const stats = data?.stats ?? {
    coursesCompleted: 0,
    totalTimeMinutes: 0,
    avgQuizScore: 0,
    badgesEarned: 0,
    currentStreak: 0,
  };
  const enrollments = data?.enrollments ?? [];
  const badges = data?.badges ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const activeEnrollments = enrollments.filter((e) => e.status === "ACTIVE");

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-display font-medium text-white mb-1"
          >
            Welcome back, {firstName}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/45"
          >
            Continue your learning journey
          </motion.p>
        </div>
        {stats.currentStreak > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20"
          >
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-body font-medium text-orange-400">
              {stats.currentStreak} day streak
            </span>
          </motion.div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Trophy,
            value: stats.coursesCompleted,
            label: "Courses Completed",
            color: "text-emerald-400",
          },
          {
            icon: Clock,
            value: `${Math.round(stats.totalTimeMinutes / 60)}h`,
            label: "Total Time",
            color: "text-cyan-400",
          },
          {
            icon: BarChart3,
            value: stats.avgQuizScore > 0 ? `${stats.avgQuizScore}%` : "--",
            label: "Avg Quiz Score",
            color: "text-amber-400",
          },
          {
            icon: Award,
            value: stats.badgesEarned,
            label: "Badges Earned",
            color: "text-purple-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard hover={false} className="p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
              <p className="text-display-sm font-semibold text-white leading-none">
                {stat.value}
              </p>
              <p className="text-caption text-white/45 uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Continue Learning */}
      {activeEnrollments.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-caption uppercase tracking-[0.2em] text-white/45">
              Continue Learning
            </h2>
            <Link
              href="/dashboard/academy/courses"
              className="text-caption text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              All Courses <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeEnrollments.slice(0, 4).map((enrollment, i) => (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.08 }}
              >
                <Link
                  href={`/dashboard/academy/courses/${enrollment.course.slug}/learn`}
                >
                  <GlassCard className="p-5 cursor-pointer">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-6 h-6 text-emerald-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-body-lg font-medium text-white truncate">
                            {enrollment.course.title}
                          </h3>
                          <span
                            className={`text-micro uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${LEVEL_COLORS[enrollment.course.level] ?? "bg-white/10 text-white/60"}`}
                          >
                            {enrollment.course.level}
                          </span>
                        </div>
                        <p className="text-small text-white/45 mb-3">
                          {enrollment.course.category.replace(/_/g, " ")}
                        </p>
                        {/* Progress bar */}
                        <div className="flex items-center gap-3">
                          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                              style={{
                                width: `${enrollment.progressPercent}%`,
                              }}
                            />
                          </div>
                          <span className="text-small text-white/60 flex-shrink-0">
                            {enrollment.progressPercent}%
                          </span>
                        </div>
                      </div>
                      <PlayCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-1" />
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no enrollments */}
      {activeEnrollments.length === 0 && (
        <GlassCard hover={false} className="p-10 text-center">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-title font-medium text-white mb-2">
            Start Your Learning Journey
          </h3>
          <p className="text-body text-white/45 mb-6 max-w-md mx-auto">
            Browse our course catalog and enroll in your first course to begin
            mastering space regulatory compliance.
          </p>
          <Link
            href="/dashboard/academy/courses"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-body font-medium px-6 py-2.5 rounded-lg transition-all"
          >
            Browse Courses
            <ChevronRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      )}

      {/* Recent Activity + Badges */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Recent Activity
          </h2>
          <GlassCard hover={false} className="p-5">
            {recentActivity.length > 0 ? (
              <div className="space-y-1">
                {recentActivity.slice(0, 8).map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0"
                  >
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-small text-white/70 truncate">
                        {activity.lessonTitle}
                      </p>
                      <p className="text-micro text-white/35">
                        {activity.courseTitle}
                      </p>
                    </div>
                    {activity.score !== null && (
                      <span className="text-small text-emerald-400 flex-shrink-0">
                        {activity.score}%
                      </span>
                    )}
                    <span className="text-micro text-white/30 flex-shrink-0">
                      {new Date(activity.completedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Clock className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-small text-white/45">No activity yet</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Badge Showcase */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-caption uppercase tracking-[0.2em] text-white/45">
              Badges
            </h2>
            <Link
              href="/dashboard/academy/progress"
              className="text-caption text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <GlassCard hover={false} className="p-5">
            {badges.length > 0 ? (
              <div className="grid grid-cols-4 gap-3">
                {badges.map((badge) => {
                  const config = BADGE_CONFIG[badge.badgeType];
                  return (
                    <div
                      key={badge.id}
                      className="flex flex-col items-center gap-1.5 py-2"
                    >
                      <div
                        className={`w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center`}
                      >
                        <Award
                          className={`w-5 h-5 ${config?.color ?? "text-white/45"}`}
                        />
                      </div>
                      <span className="text-micro text-white/60 text-center">
                        {config?.label ?? badge.badgeType}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-8 text-center">
                <Lock className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-small text-white/45 mb-1">No badges yet</p>
                <p className="text-micro text-white/30">
                  Complete lessons and courses to earn badges
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
