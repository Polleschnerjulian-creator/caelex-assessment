"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import dynamic from "next/dynamic";
import {
  BookOpen,
  Clock,
  Award,
  Flame,
  Trophy,
  BarChart3,
  Cpu,
  Loader2,
  AlertCircle,
  Lock,
  Target,
  TrendingUp,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Dynamic chart import ───

const RechartsBarChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } = mod;
      return function QuizChart({
        data,
      }: {
        data: Array<{ name: string; score: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data}>
              <XAxis
                dataKey="name"
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                domain={[0, 100]}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#0F172A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  color: "#fff",
                }}
              />
              <Bar dataKey="score" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    ),
  },
);

// ─── Types ───

interface ProgressData {
  enrollments: Array<{
    id: string;
    status: string;
    progressPercent: number;
    totalTimeSpent: number;
    quizAverage: number | null;
    course: {
      slug: string;
      title: string;
      category: string;
      level: string;
      estimatedMinutes: number;
    };
  }>;
  badges: Array<{
    id: string;
    badgeType: string;
    earnedAt: string;
    metadata: Record<string, unknown> | null;
  }>;
  stats: {
    coursesCompleted: number;
    totalTimeMinutes: number;
    avgQuizScore: number;
    badgesEarned: number;
    currentStreak: number;
  };
  quizScores: Array<{
    name: string;
    score: number;
  }>;
  simulationHistory: Array<{
    id: string;
    scenarioTitle: string;
    score: number;
    timeSpent: number;
    createdAt: string;
  }>;
}

// ─── Badge Config ───

const ALL_BADGES: Array<{
  type: string;
  label: string;
  description: string;
  color: string;
}> = [
  {
    type: "FIRST_LESSON",
    label: "First Lesson",
    description: "Complete your first lesson",
    color: "text-amber-400",
  },
  {
    type: "FIRST_COURSE",
    label: "First Course",
    description: "Complete your first course",
    color: "text-amber-400",
  },
  {
    type: "SPEED_DEMON",
    label: "Speed Demon",
    description: "Complete a lesson in under 2 minutes",
    color: "text-cyan-400",
  },
  {
    type: "PERFECT_QUIZ",
    label: "Perfect Quiz",
    description: "Score 100% on any quiz",
    color: "text-emerald-400",
  },
  {
    type: "SIMULATION_MASTER",
    label: "Sim Master",
    description: "Score 90%+ on a simulation",
    color: "text-purple-400",
  },
  {
    type: "STREAK_7",
    label: "7-Day Streak",
    description: "Learn for 7 days in a row",
    color: "text-orange-400",
  },
  {
    type: "STREAK_30",
    label: "30-Day Streak",
    description: "Learn for 30 days in a row",
    color: "text-red-400",
  },
  {
    type: "ALL_EU_SPACE_ACT",
    label: "EU Space Act",
    description: "Complete all EU Space Act courses",
    color: "text-blue-400",
  },
  {
    type: "ALL_NIS2",
    label: "NIS2 Complete",
    description: "Complete all NIS2 courses",
    color: "text-green-400",
  },
  {
    type: "CROSS_REGULATORY",
    label: "Cross-Reg",
    description: "Complete cross-regulatory course",
    color: "text-indigo-400",
  },
  {
    type: "JURISDICTION_EXPLORER",
    label: "Explorer",
    description: "Study 3+ jurisdictions",
    color: "text-teal-400",
  },
  {
    type: "COMPLIANCE_CHAMPION",
    label: "Champion",
    description: "Complete all available courses",
    color: "text-yellow-400",
  },
];

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400",
  ADVANCED: "bg-red-500/20 text-red-400",
  EXPERT: "bg-purple-500/20 text-purple-400",
};

// ─── Main Page ───

export default function ProgressPage() {
  const [data, setData] = useState<ProgressData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  const earnedBadgeTypes = new Set(
    (data?.badges ?? []).map((b) => b.badgeType),
  );
  const quizScores = data?.quizScores ?? [];
  const simHistory = data?.simulationHistory ?? [];
  const totalCourses = enrollments.length;
  const completionRate =
    totalCourses > 0
      ? Math.round(
          (enrollments.filter((e) => e.status === "COMPLETED").length /
            totalCourses) *
            100,
        )
      : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-display font-medium text-white mb-1">
          My Progress
        </h1>
        <p className="text-body-lg text-white/45">
          Track your learning journey and achievements
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[
          {
            icon: BookOpen,
            value: totalCourses,
            label: "Total Courses",
            color: "text-white",
          },
          {
            icon: TrendingUp,
            value: `${completionRate}%`,
            label: "Completion Rate",
            color: "text-emerald-400",
          },
          {
            icon: Clock,
            value: `${Math.round(stats.totalTimeMinutes / 60)}h`,
            label: "Total Hours",
            color: "text-cyan-400",
          },
          {
            icon: Flame,
            value: stats.currentStreak,
            label: "Day Streak",
            color: "text-orange-400",
          },
          {
            icon: Award,
            value: stats.badgesEarned,
            label: "Badges",
            color: "text-purple-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <GlassCard hover={false} className="p-4">
              <stat.icon className={`w-5 h-5 ${stat.color} mb-2`} />
              <p className="text-display-sm font-semibold text-white leading-none">
                {stat.value}
              </p>
              <p className="text-micro text-white/40 uppercase tracking-wider mt-1">
                {stat.label}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Course Progress Table */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Course Progress
        </h2>
        <GlassCard hover={false} className="overflow-hidden">
          {enrollments.length > 0 ? (
            <div className="divide-y divide-white/5">
              {enrollments.map((enrollment) => (
                <div
                  key={enrollment.id}
                  className="flex items-center gap-4 px-5 py-4"
                >
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
                    <p className="text-small text-white/40">
                      {enrollment.course.category.replace(/_/g, " ")} ·{" "}
                      {enrollment.status === "COMPLETED" ? (
                        <span className="text-emerald-400">Completed</span>
                      ) : (
                        enrollment.status
                      )}
                    </p>
                  </div>
                  <div className="w-40 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-micro text-white/40">Progress</span>
                      <span className="text-micro text-emerald-400">
                        {enrollment.progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500 transition-all"
                        style={{
                          width: `${enrollment.progressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-small text-white/50">
                      {Math.round(enrollment.totalTimeSpent / 60)}m spent
                    </p>
                    {enrollment.quizAverage !== null && (
                      <p className="text-micro text-white/35">
                        Quiz avg: {enrollment.quizAverage}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <BookOpen className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-body text-white/45">No courses enrolled yet</p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Badges + Quiz Scores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Badge Collection */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Badge Collection
          </h2>
          <GlassCard hover={false} className="p-5">
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
              {ALL_BADGES.map((badge) => {
                const isEarned = earnedBadgeTypes.has(badge.type);
                return (
                  <div
                    key={badge.type}
                    className="flex flex-col items-center gap-2 py-2"
                    title={badge.description}
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center border transition-all ${
                        isEarned
                          ? "bg-white/10 border-white/20"
                          : "bg-white/[0.03] border-white/5 opacity-40"
                      }`}
                    >
                      {isEarned ? (
                        <Trophy className={`w-5 h-5 ${badge.color}`} />
                      ) : (
                        <Lock className="w-4 h-4 text-white/20" />
                      )}
                    </div>
                    <span
                      className={`text-micro text-center ${
                        isEarned ? "text-white/60" : "text-white/25"
                      }`}
                    >
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </div>

        {/* Quiz Score Chart */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Quiz Scores
          </h2>
          <GlassCard hover={false} className="p-5">
            {quizScores.length > 0 ? (
              <RechartsBarChart data={quizScores} />
            ) : (
              <div className="h-[200px] flex flex-col items-center justify-center">
                <Target className="w-8 h-8 text-white/15 mb-2" />
                <p className="text-small text-white/45">
                  No quiz scores recorded yet
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Simulation History */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Simulation History
        </h2>
        <GlassCard hover={false} className="overflow-hidden">
          {simHistory.length > 0 ? (
            <div className="divide-y divide-white/5">
              {simHistory.map((run) => (
                <div
                  key={run.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div
                    className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      run.score >= 80
                        ? "bg-emerald-500/20"
                        : run.score >= 60
                          ? "bg-amber-500/20"
                          : "bg-red-500/20"
                    }`}
                  >
                    <Cpu
                      className={`w-5 h-5 ${
                        run.score >= 80
                          ? "text-emerald-400"
                          : run.score >= 60
                            ? "text-amber-400"
                            : "text-red-400"
                      }`}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-white/70 truncate">
                      {run.scenarioTitle}
                    </p>
                    <p className="text-micro text-white/35">
                      {new Date(run.createdAt).toLocaleDateString()} ·{" "}
                      {Math.round(run.timeSpent / 60)}m
                    </p>
                  </div>
                  <span
                    className={`text-body font-semibold ${
                      run.score >= 80
                        ? "text-emerald-400"
                        : run.score >= 60
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {run.score}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Cpu className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-body text-white/45">No simulation runs yet</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
