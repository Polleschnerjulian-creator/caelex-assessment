"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
  BookOpen,
  Copy,
  Check,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface AvailableCourse {
  id: string;
  title: string;
  category: string;
  level: string;
}

// ─── Main Page ───

export default function CreateClassroomPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [semester, setSemester] = useState("");
  const [maxStudents, setMaxStudents] = useState(30);
  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(
    new Set(),
  );
  const [availableCourses, setAvailableCourses] = useState<AvailableCourse[]>(
    [],
  );
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load available courses
  useEffect(() => {
    fetch("/api/academy/courses")
      .then((r) => r.json())
      .then((data) => {
        const courses = data.courses ?? data;
        setAvailableCourses(
          Array.isArray(courses)
            ? courses.map((c: AvailableCourse) => ({
                id: c.id,
                title: c.title,
                category: c.category,
                level: c.level,
              }))
            : [],
        );
      })
      .catch(() => {})
      .finally(() => setCoursesLoading(false));
  }, []);

  const toggleCourse = (courseId: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) {
        next.delete(courseId);
      } else {
        next.add(courseId);
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/academy/classrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          semester: semester.trim() || null,
          maxStudents,
          courseIds: Array.from(selectedCourses),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to create classroom");
      }

      const data = await res.json();
      setCreatedCode(data.classroom?.code ?? data.code ?? null);
      setCreatedId(data.classroom?.id ?? data.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyCode = () => {
    if (createdCode) {
      navigator.clipboard.writeText(createdCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/academy/instructor"
        className="inline-flex items-center gap-2 text-small text-white/40 hover:text-white/60 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Instructor Panel
      </Link>

      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
        <GlassCard hover={false} className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-heading font-medium text-white">
                Create Classroom
              </h1>
              <p className="text-body text-white/45">
                Set up a new learning space for your students
              </p>
            </div>
          </div>

          {createdCode ? (
            <motion.div
              initial={false}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-6"
            >
              <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-title font-medium text-white mb-2">
                Classroom Created!
              </h2>
              <p className="text-body text-white/45 mb-6">
                Share this code with your students so they can join:
              </p>

              <div className="flex items-center justify-center gap-3 mb-6">
                <span className="text-display-sm font-mono font-bold text-emerald-400 tracking-[0.15em]">
                  {createdCode}
                </span>
                <button
                  onClick={handleCopyCode}
                  className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                  title="Copy code"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-white/45" />
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-3">
                <Link
                  href={`/academy/instructor/classrooms/${createdId}`}
                  className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-2.5 rounded-xl transition-all"
                >
                  Go to Classroom
                </Link>
                <Link
                  href="/academy/instructor"
                  className="text-body text-white/45 hover:text-white/70 transition-colors"
                >
                  Back to Dashboard
                </Link>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="classroom-name"
                  className="text-small text-white/60 block mb-2"
                >
                  Classroom Name *
                </label>
                <input
                  id="classroom-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Space Law 101 - Spring 2026"
                  maxLength={100}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="classroom-desc"
                  className="text-small text-white/60 block mb-2"
                >
                  Description
                </label>
                <textarea
                  id="classroom-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of this classroom..."
                  rows={3}
                  maxLength={500}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors resize-none"
                />
              </div>

              {/* Semester + Max Students */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="classroom-semester"
                    className="text-small text-white/60 block mb-2"
                  >
                    Semester
                  </label>
                  <input
                    id="classroom-semester"
                    type="text"
                    value={semester}
                    onChange={(e) => setSemester(e.target.value)}
                    placeholder="e.g., Spring 2026"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="classroom-max"
                    className="text-small text-white/60 block mb-2"
                  >
                    Max Students
                  </label>
                  <input
                    id="classroom-max"
                    type="number"
                    value={maxStudents}
                    onChange={(e) =>
                      setMaxStudents(
                        Math.max(1, Math.min(200, Number(e.target.value))),
                      )
                    }
                    min={1}
                    max={200}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-body-lg text-white focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Course Assignment */}
              <div>
                <label className="text-small text-white/60 block mb-2">
                  Assign Courses
                </label>
                {coursesLoading ? (
                  <div className="flex items-center gap-2 py-4 text-small text-white/40">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading courses...
                  </div>
                ) : availableCourses.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto rounded-xl border border-white/10 p-3">
                    {availableCourses.map((course) => {
                      const isSelected = selectedCourses.has(course.id);
                      return (
                        <button
                          key={course.id}
                          type="button"
                          onClick={() => toggleCourse(course.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all ${
                            isSelected
                              ? "bg-emerald-500/10 border border-emerald-500/20"
                              : "bg-white/[0.03] border border-transparent hover:bg-white/5"
                          }`}
                        >
                          <div
                            className={`w-5 h-5 rounded flex items-center justify-center border ${
                              isSelected
                                ? "bg-emerald-500 border-emerald-500"
                                : "border-white/20"
                            }`}
                          >
                            {isSelected && (
                              <Check className="w-3 h-3 text-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-body text-white/70 truncate">
                              {course.title}
                            </p>
                            <p className="text-micro text-white/35">
                              {course.category.replace(/_/g, " ")} ·{" "}
                              {course.level}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-small text-white/40 py-4">
                    No courses available
                  </p>
                )}
                {selectedCourses.size > 0 && (
                  <p className="text-micro text-emerald-400 mt-2">
                    {selectedCourses.size} course
                    {selectedCourses.size !== 1 ? "s" : ""} selected
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-small text-red-400">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!name.trim() || submitting}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {submitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <GraduationCap className="w-5 h-5" />
                )}
                {submitting ? "Creating..." : "Create Classroom"}
              </button>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
