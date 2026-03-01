"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  BarChart3,
  Trash2,
  Calendar,
  Copy,
  Check,
  Clock,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface StudentData {
  id: string;
  name: string | null;
  email: string | null;
  enrolledAt: string;
  progressPercent: number;
  totalTimeSpent: number;
  quizAverage: number | null;
}

interface CourseProgress {
  id: string;
  title: string;
  level: string;
  avgProgress: number;
  completionCount: number;
  totalStudents: number;
}

interface DeadlineData {
  id: string;
  title: string;
  dueDate: string;
  courseTitle: string;
}

interface ClassroomManageData {
  id: string;
  name: string;
  description: string | null;
  code: string;
  semester: string | null;
  isActive: boolean;
  maxStudents: number;
  students: StudentData[];
  courseProgress: CourseProgress[];
  deadlines: DeadlineData[];
}

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400",
  ADVANCED: "bg-red-500/20 text-red-400",
  EXPERT: "bg-purple-500/20 text-purple-400",
};

// ─── Main Page ───

export default function InstructorClassroomPage() {
  const params = useParams();
  const classroomId = params.classroomId as string;

  const [data, setData] = useState<ClassroomManageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingStudent, setRemovingStudent] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(
      `/api/academy/instructor/classrooms/${encodeURIComponent(classroomId)}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load classroom");
        return r.json();
      })
      .then((d) => setData(d.classroom ?? d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [classroomId]);

  const handleRemoveStudent = async (studentId: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this student from the classroom?",
      )
    )
      return;

    setRemovingStudent(studentId);
    try {
      const res = await fetch(
        `/api/academy/instructor/classrooms/${classroomId}/students/${studentId}`,
        { method: "DELETE" },
      );
      if (res.ok) {
        setData((prev) =>
          prev
            ? {
                ...prev,
                students: prev.students.filter((s) => s.id !== studentId),
              }
            : prev,
        );
      }
    } catch {
      console.error("Failed to remove student");
    } finally {
      setRemovingStudent(null);
    }
  };

  const handleCopyCode = () => {
    if (data?.code) {
      navigator.clipboard.writeText(data.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
          {error ?? "Classroom not found"}
        </p>
        <Link
          href="/academy/instructor"
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-body px-5 py-2 rounded-lg transition-all"
        >
          Back to Instructor Panel
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-small text-white/40">
        <Link
          href="/academy/instructor"
          className="hover:text-white/60 transition-colors"
        >
          Instructor
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white/60">{data.name}</span>
      </div>

      {/* Header */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
        <GlassCard hover={false} className="p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <GraduationCap className="w-7 h-7 text-purple-400" />
              </div>
              <div>
                <h1 className="text-display-sm font-semibold text-white mb-1">
                  {data.name}
                </h1>
                {data.description && (
                  <p className="text-body text-white/45 mb-2">
                    {data.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-small text-white/40">
                  {data.semester && (
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      {data.semester}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    {data.students.length} / {data.maxStudents} students
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                <span className="text-small font-mono text-white/60">
                  {data.code}
                </span>
                <button onClick={handleCopyCode} title="Copy code">
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-white/30 hover:text-white/60 transition-colors" />
                  )}
                </button>
              </div>
              <Link
                href={`/academy/instructor/classrooms/${classroomId}/analytics`}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-small text-white/60 hover:bg-white/10 hover:text-white/80 transition-all"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Link>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Student Roster */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Student Roster ({data.students.length})
        </h2>
        <GlassCard hover={false} className="overflow-hidden">
          {data.students.length > 0 ? (
            <div className="divide-y divide-white/5">
              {data.students.map((student) => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 px-5 py-3.5"
                >
                  <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
                    <span className="text-small font-medium text-white/60">
                      {(student.name ?? "?").charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-white/70 truncate">
                      {student.name ?? "Anonymous"}
                    </p>
                    <p className="text-micro text-white/30">
                      {student.email ?? ""} · Joined{" "}
                      {new Date(student.enrolledAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-micro text-white/40">Progress</span>
                      <span className="text-micro text-emerald-400">
                        {student.progressPercent}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{
                          width: `${student.progressPercent}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-small text-white/50">
                      {Math.round(student.totalTimeSpent / 60)}m
                    </p>
                    {student.quizAverage !== null && (
                      <p className="text-micro text-white/30">
                        Quiz: {student.quizAverage}%
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleRemoveStudent(student.id)}
                    disabled={removingStudent === student.id}
                    className="p-2 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-50"
                    title="Remove student"
                  >
                    {removingStudent === student.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center">
              <Users className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-body text-white/45">
                No students enrolled yet
              </p>
              <p className="text-small text-white/30 mt-1">
                Share the classroom code: {data.code}
              </p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Course Progress + Deadlines */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Course Progress Breakdown */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Course Progress
          </h2>
          {data.courseProgress.length > 0 ? (
            <div className="space-y-3">
              {data.courseProgress.map((course) => (
                <GlassCard key={course.id} hover={false} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-body font-medium text-white truncate">
                        {course.title}
                      </h3>
                      <span
                        className={`text-micro uppercase px-2 py-0.5 rounded-full ${LEVEL_COLORS[course.level] ?? "bg-white/10 text-white/60"}`}
                      >
                        {course.level}
                      </span>
                    </div>
                    <span className="text-small text-emerald-400">
                      {course.avgProgress}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden mb-2">
                    <div
                      className="h-full rounded-full bg-emerald-500"
                      style={{ width: `${course.avgProgress}%` }}
                    />
                  </div>
                  <p className="text-micro text-white/35">
                    {course.completionCount} of {course.totalStudents} completed
                  </p>
                </GlassCard>
              ))}
            </div>
          ) : (
            <GlassCard hover={false} className="p-8 text-center">
              <BookOpen className="w-8 h-8 text-white/15 mx-auto mb-2" />
              <p className="text-small text-white/45">No courses assigned</p>
            </GlassCard>
          )}
        </div>

        {/* Deadline Management */}
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Deadlines
          </h2>
          <GlassCard hover={false} className="p-5">
            {data.deadlines.length > 0 ? (
              <div className="space-y-3">
                {data.deadlines.map((deadline) => {
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
                        {dueDate.toLocaleDateString()}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="py-6 text-center">
                <Clock className="w-8 h-8 text-white/15 mx-auto mb-2" />
                <p className="text-small text-white/45">
                  No deadlines configured
                </p>
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
