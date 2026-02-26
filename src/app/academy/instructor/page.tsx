"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Users,
  BookOpen,
  Plus,
  ChevronRight,
  Loader2,
  AlertCircle,
  GraduationCap,
  BarChart3,
  TrendingUp,
  Clock,
  Activity,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface InstructorClassroom {
  id: string;
  name: string;
  semester: string | null;
  isActive: boolean;
  code: string;
  _count: {
    enrollments: number;
    assignedCourses: number;
  };
  avgProgress: number;
}

interface InstructorStats {
  totalStudents: number;
  totalClassrooms: number;
  avgCompletionRate: number;
  activeClassrooms: number;
}

interface RecentStudentActivity {
  id: string;
  studentName: string;
  action: string;
  courseTitle: string;
  timestamp: string;
}

interface InstructorData {
  classrooms: InstructorClassroom[];
  stats: InstructorStats;
  recentActivity: RecentStudentActivity[];
}

// ─── Main Page ───

export default function InstructorDashboardPage() {
  const [data, setData] = useState<InstructorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/academy/instructor")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load instructor data");
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
    totalStudents: 0,
    totalClassrooms: 0,
    avgCompletionRate: 0,
    activeClassrooms: 0,
  };
  const classrooms = data?.classrooms ?? [];
  const recentActivity = data?.recentActivity ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-display font-medium text-white mb-1">
            Instructor Panel
          </h1>
          <p className="text-body-lg text-white/45">
            Manage classrooms and track student progress
          </p>
        </div>
        <Link
          href="/academy/instructor/classrooms/new"
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Create Classroom
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: Users,
            value: stats.totalStudents,
            label: "Total Students",
            color: "text-white",
          },
          {
            icon: GraduationCap,
            value: stats.activeClassrooms,
            label: "Active Classrooms",
            color: "text-purple-400",
          },
          {
            icon: TrendingUp,
            value: `${stats.avgCompletionRate}%`,
            label: "Avg Completion",
            color: "text-emerald-400",
          },
          {
            icon: BookOpen,
            value: stats.totalClassrooms,
            label: "Total Classrooms",
            color: "text-cyan-400",
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

      {/* Classrooms */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          My Classrooms
        </h2>
        {classrooms.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classrooms.map((classroom, i) => (
              <motion.div
                key={classroom.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
              >
                <Link href={`/academy/instructor/classrooms/${classroom.id}`}>
                  <GlassCard className="p-5 cursor-pointer group">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-title font-medium text-white group-hover:text-purple-400 transition-colors">
                        {classroom.name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {classroom.isActive ? (
                          <span className="text-micro uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                            Active
                          </span>
                        ) : (
                          <span className="text-micro uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/40">
                            Inactive
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-small text-white/40 mb-3">
                      <span className="flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" />
                        {classroom._count.enrollments} students
                      </span>
                      <span className="flex items-center gap-1.5">
                        <BookOpen className="w-3.5 h-3.5" />
                        {classroom._count.assignedCourses} courses
                      </span>
                      {classroom.semester && <span>{classroom.semester}</span>}
                    </div>

                    {/* Avg progress */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-micro text-white/40">
                          Avg Progress
                        </span>
                        <span className="text-micro text-emerald-400">
                          {classroom.avgProgress}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{
                            width: `${classroom.avgProgress}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                      <span className="text-micro text-white/30 font-mono">
                        Code: {classroom.code}
                      </span>
                      <ChevronRight className="w-4 h-4 text-white/30 group-hover:text-purple-400 transition-colors" />
                    </div>
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} className="p-10 text-center">
            <GraduationCap className="w-12 h-12 text-white/15 mx-auto mb-4" />
            <h3 className="text-title font-medium text-white mb-2">
              No Classrooms Yet
            </h3>
            <p className="text-body text-white/45 mb-6 max-w-md mx-auto">
              Create your first classroom to start managing students and
              assigning courses.
            </p>
            <Link
              href="/academy/instructor/classrooms/new"
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-body font-medium px-6 py-2.5 rounded-lg transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Classroom
            </Link>
          </GlassCard>
        )}
      </div>

      {/* Recent Student Activity */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Recent Student Activity
        </h2>
        <GlassCard hover={false} className="p-5">
          {recentActivity.length > 0 ? (
            <div className="space-y-1">
              {recentActivity.slice(0, 10).map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center gap-3 py-2.5 border-b border-white/5 last:border-0"
                >
                  <Activity className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-small text-white/70">
                      <span className="text-white/90 font-medium">
                        {activity.studentName}
                      </span>{" "}
                      {activity.action}
                    </p>
                    <p className="text-micro text-white/35">
                      {activity.courseTitle}
                    </p>
                  </div>
                  <span className="text-micro text-white/30 flex-shrink-0">
                    {new Date(activity.timestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center">
              <Activity className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-small text-white/45">
                No student activity yet
              </p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
