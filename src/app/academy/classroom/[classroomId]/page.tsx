"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  BookOpen,
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  Trophy,
  Target,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface ClassroomDetailData {
  id: string;
  name: string;
  description: string | null;
  code: string;
  semester: string | null;
  isActive: boolean;
  instructor: {
    id: string;
    name: string | null;
    email: string | null;
  };
  assignedCourses: Array<{
    id: string;
    title: string;
    slug: string;
    category: string;
    level: string;
    estimatedMinutes: number;
    myProgress?: number;
  }>;
  members: Array<{
    id: string;
    name: string | null;
    progressPercent: number;
  }>;
  deadlines: Array<{
    id: string;
    title: string;
    dueDate: string;
    courseTitle: string;
  }>;
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400",
  ADVANCED: "bg-red-500/20 text-red-400",
  EXPERT: "bg-purple-500/20 text-purple-400",
};

// ─── Main Page ───

export default function ClassroomDetailPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;

  const [classroom, setClassroom] = useState<ClassroomDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`/api/academy/classrooms/${encodeURIComponent(classroomId)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load classroom");
        return r.json();
      })
      .then((data) => setClassroom(data.classroom ?? data))
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

  if (error || !classroom) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-body-lg text-white/70">
          {error ?? "Classroom not found"}
        </p>
        <Link
          href="/academy/classroom"
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-body px-5 py-2 rounded-lg transition-all"
        >
          Back to Classrooms
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-small text-white/40">
        <Link
          href="/academy/classroom"
          className="hover:text-white/60 transition-colors"
        >
          Classrooms
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white/60">{classroom.name}</span>
      </div>

      {/* Header */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
        <GlassCard hover={false} className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <GraduationCap className="w-7 h-7 text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-display-sm font-semibold text-white">
                  {classroom.name}
                </h1>
                {classroom.isActive ? (
                  <span className="text-micro uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    Active
                  </span>
                ) : (
                  <span className="text-micro uppercase px-2 py-0.5 rounded-full bg-white/10 text-white/40 border border-white/10">
                    Inactive
                  </span>
                )}
              </div>
              {classroom.description && (
                <p className="text-body text-white/45 mb-3">
                  {classroom.description}
                </p>
              )}
              <div className="flex items-center gap-6 text-small text-white/40">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  Instructor: {classroom.instructor.name ?? "Unknown"}
                </div>
                {classroom.semester && (
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-4 h-4" />
                    {classroom.semester}
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4" />
                  {classroom.members.length} members
                </div>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Assigned Courses */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Assigned Courses
        </h2>
        {classroom.assignedCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {classroom.assignedCourses.map((course, i) => (
              <motion.div
                key={course.id}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
              >
                <Link href={`/academy/courses/${course.slug}`}>
                  <GlassCard className="p-5 cursor-pointer group">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-body-lg font-medium text-white group-hover:text-emerald-400 transition-colors truncate">
                        {course.title}
                      </h3>
                      <span
                        className={`text-micro uppercase px-2 py-0.5 rounded-full flex-shrink-0 ${LEVEL_COLORS[course.level] ?? "bg-white/10 text-white/60"}`}
                      >
                        {course.level}
                      </span>
                    </div>
                    <p className="text-small text-white/40 mb-3">
                      {course.category.replace(/_/g, " ")} ·{" "}
                      {Math.round(course.estimatedMinutes / 60)}h
                    </p>
                    {course.myProgress !== undefined && (
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-micro text-white/40">
                            My Progress
                          </span>
                          <span className="text-micro text-emerald-400">
                            {course.myProgress}%
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${course.myProgress}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </GlassCard>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          <GlassCard hover={false} className="p-8 text-center">
            <BookOpen className="w-8 h-8 text-white/15 mx-auto mb-2" />
            <p className="text-body text-white/45">No courses assigned yet</p>
          </GlassCard>
        )}
      </div>

      {/* Deadlines + Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Deadlines */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Deadlines
          </h2>
          <GlassCard hover={false} className="p-5">
            {classroom.deadlines && classroom.deadlines.length > 0 ? (
              <div className="space-y-3">
                {classroom.deadlines.map((deadline) => {
                  const dueDate = new Date(deadline.dueDate);
                  const daysUntil = Math.ceil(
                    (dueDate.getTime() - Date.now()) / 86400000,
                  );
                  return (
                    <div
                      key={deadline.id}
                      className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
                    >
                      <div
                        className={`w-2 h-2 rounded-full ${
                          daysUntil <= 3
                            ? "bg-red-500"
                            : daysUntil <= 7
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                        }`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-small text-white/70 truncate">
                          {deadline.title}
                        </p>
                        <p className="text-micro text-white/35">
                          {deadline.courseTitle}
                        </p>
                      </div>
                      <span className="text-micro text-white/40">
                        {daysUntil > 0 ? `${daysUntil}d left` : "Overdue"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Clock className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-small text-white/45">No deadlines set</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Leaderboard */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Class Leaderboard
          </h2>
          <GlassCard hover={false} className="p-5">
            {classroom.members.length > 0 ? (
              <div className="space-y-2">
                {classroom.members
                  .sort((a, b) => b.progressPercent - a.progressPercent)
                  .map((member, i) => (
                    <div
                      key={member.id}
                      className="flex items-center gap-3 py-2"
                    >
                      <span
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-micro font-medium ${
                          i === 0
                            ? "bg-amber-500/20 text-amber-400"
                            : i === 1
                              ? "bg-slate-400/20 text-slate-300"
                              : i === 2
                                ? "bg-orange-800/20 text-orange-400"
                                : "bg-white/5 text-white/40"
                        }`}
                      >
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-small text-white/70 truncate">
                          {member.name ?? "Anonymous"}
                        </p>
                      </div>
                      <div className="w-24 flex-shrink-0">
                        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{
                              width: `${member.progressPercent}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-small text-white/50 w-10 text-right">
                        {member.progressPercent}%
                      </span>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Trophy className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-small text-white/45">No members yet</p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
