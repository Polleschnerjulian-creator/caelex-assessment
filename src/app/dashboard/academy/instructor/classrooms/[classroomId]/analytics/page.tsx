"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Users,
  Clock,
  Target,
  TrendingUp,
  BookOpen,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Dynamic chart ───

const CompletionBarChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } = mod;
      return function ChartComponent({
        data,
      }: {
        data: Array<{ name: string; completion: number; avgScore: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} barGap={4}>
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
              <Bar
                dataKey="completion"
                name="Completion %"
                fill="#10B981"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                dataKey="avgScore"
                name="Avg Quiz %"
                fill="#06B6D4"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="h-[220px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-white/20 animate-spin" />
      </div>
    ),
  },
);

// ─── Types ───

interface AnalyticsData {
  classroomName: string;
  stats: {
    totalStudents: number;
    avgCompletionRate: number;
    avgQuizScore: number;
    totalTimeHours: number;
  };
  courseCompletion: Array<{
    name: string;
    completion: number;
    avgScore: number;
  }>;
  timeDistribution: Array<{
    range: string;
    count: number;
  }>;
  engagementMetrics: {
    activeThisWeek: number;
    avgSessionMinutes: number;
    lessonsPerWeek: number;
    dropoffRate: number;
  };
}

// ─── Main Page ───

export default function ClassroomAnalyticsPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(
      `/api/academy/instructor/classrooms/${encodeURIComponent(classroomId)}/analytics`,
    )
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load analytics");
        return r.json();
      })
      .then((d) => setData(d.analytics ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [classroomId]);

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-body-lg text-white/70">
          {error ?? "Analytics not available"}
        </p>
        <Link
          href={`/dashboard/academy/instructor/classrooms/${classroomId}`}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-body px-5 py-2 rounded-lg transition-all"
        >
          Back to Classroom
        </Link>
      </div>
    );
  }

  const { stats, courseCompletion, timeDistribution, engagementMetrics } = data;

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-small text-white/40">
        <Link
          href="/dashboard/academy/instructor"
          className="hover:text-white/60 transition-colors"
        >
          Instructor
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link
          href={`/dashboard/academy/instructor/classrooms/${classroomId}`}
          className="hover:text-white/60 transition-colors"
        >
          {data.classroomName}
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white/60">Analytics</span>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-display font-medium text-white mb-1">
          Classroom Analytics
        </h1>
        <p className="text-body-lg text-white/45">{data.classroomName}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            value: stats.totalStudents,
            label: "Students",
            color: "text-white",
          },
          {
            icon: TrendingUp,
            value: `${stats.avgCompletionRate}%`,
            label: "Avg Completion",
            color: "text-emerald-400",
          },
          {
            icon: Target,
            value: `${stats.avgQuizScore}%`,
            label: "Avg Quiz Score",
            color: "text-cyan-400",
          },
          {
            icon: Clock,
            value: `${stats.totalTimeHours}h`,
            label: "Total Time",
            color: "text-amber-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
          >
            <GlassCard hover={false} className="p-5">
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

      {/* Course Completion Chart */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Completion Rates by Course
        </h2>
        <GlassCard hover={false} className="p-6">
          {courseCompletion.length > 0 ? (
            <CompletionBarChart data={courseCompletion} />
          ) : (
            <div className="h-[220px] flex items-center justify-center">
              <p className="text-body text-white/30">No data available</p>
            </div>
          )}
          <div className="flex items-center justify-center gap-6 mt-4 pt-3 border-t border-white/10">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-micro text-white/45">Completion %</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-cyan-500" />
              <span className="text-micro text-white/45">Avg Quiz Score</span>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Time Distribution + Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Spent Distribution */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Time Spent Distribution
          </h2>
          <GlassCard hover={false} className="p-5">
            {timeDistribution.length > 0 ? (
              <div className="space-y-3">
                {timeDistribution.map((item, i) => {
                  const maxCount = Math.max(
                    ...timeDistribution.map((t) => t.count),
                  );
                  const width =
                    maxCount > 0
                      ? Math.round((item.count / maxCount) * 100)
                      : 0;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-small text-white/50 w-24 flex-shrink-0">
                        {item.range}
                      </span>
                      <div className="flex-1 h-5 rounded bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded bg-emerald-500/50"
                          style={{ width: `${width}%` }}
                        />
                      </div>
                      <span className="text-small text-white/40 w-10 text-right">
                        {item.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Clock className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-small text-white/45">No data yet</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Student Engagement Metrics */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Engagement Metrics
          </h2>
          <GlassCard hover={false} className="p-5">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-body text-white/60">
                  Active this week
                </span>
                <span className="text-body font-medium text-white">
                  {engagementMetrics.activeThisWeek}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-body text-white/60">
                  Avg session length
                </span>
                <span className="text-body font-medium text-white">
                  {engagementMetrics.avgSessionMinutes}m
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <span className="text-body text-white/60">
                  Lessons per week
                </span>
                <span className="text-body font-medium text-white">
                  {engagementMetrics.lessonsPerWeek}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-body text-white/60">Drop-off rate</span>
                <span
                  className={`text-body font-medium ${
                    engagementMetrics.dropoffRate > 30
                      ? "text-red-400"
                      : engagementMetrics.dropoffRate > 15
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}
                >
                  {engagementMetrics.dropoffRate}%
                </span>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
