"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  Users,
  ChevronDown,
  ChevronRight,
  CheckCircle,
  PlayCircle,
  FileText,
  HelpCircle,
  Cpu,
  Briefcase,
  Beaker,
  Lock,
  Loader2,
  AlertCircle,
  Satellite,
  Shield,
  Scale,
  Globe,
  Layers,
  Zap,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface LessonData {
  id: string;
  slug: string;
  title: string;
  type: string;
  sortOrder: number;
  estimatedMinutes: number;
  isCompleted?: boolean;
}

interface ModuleData {
  id: string;
  title: string;
  description: string | null;
  sortOrder: number;
  lessons: LessonData[];
}

interface CourseDetailData {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  icon: string | null;
  category: string;
  level: string;
  estimatedMinutes: number;
  isPublished: boolean;
  isPremium: boolean;
  modules: ModuleData[];
  _count: {
    enrollments: number;
  };
  enrollment?: {
    id: string;
    status: string;
    progressPercent: number;
    currentLessonId: string | null;
  } | null;
}

// ─── Constants ───

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400 border-green-500/30",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ADVANCED: "bg-red-500/20 text-red-400 border-red-500/30",
  EXPERT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const LESSON_TYPE_ICONS: Record<string, typeof FileText> = {
  THEORY: FileText,
  INTERACTIVE: PlayCircle,
  QUIZ: HelpCircle,
  SIMULATION: Cpu,
  CASE_STUDY: Briefcase,
  SANDBOX: Beaker,
};

const LESSON_TYPE_LABELS: Record<string, string> = {
  THEORY: "Theory",
  INTERACTIVE: "Interactive",
  QUIZ: "Quiz",
  SIMULATION: "Simulation",
  CASE_STUDY: "Case Study",
  SANDBOX: "Sandbox",
};

const CATEGORY_ICONS: Record<string, typeof BookOpen> = {
  EU_SPACE_ACT: Satellite,
  NIS2: Shield,
  NATIONAL_SPACE_LAW: Scale,
  CROSS_REGULATORY: Globe,
  FUNDAMENTALS: Layers,
  ADVANCED_TOPICS: Zap,
};

// ─── Main Page ───

export default function CourseDetailPage() {
  const params = useParams();
  const courseSlug = params.courseSlug as string;

  const [course, setCourse] = useState<CourseDetailData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    fetch(`/api/academy/courses?slug=${encodeURIComponent(courseSlug)}`)
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load course");
        return r.json();
      })
      .then((data) => {
        setCourse(data.course ?? data);
        // Expand first module by default
        if (data.course?.modules?.[0] || data.modules?.[0]) {
          const firstModule = data.course?.modules?.[0] ?? data.modules?.[0];
          if (firstModule) {
            setExpandedModules(new Set([firstModule.id]));
          }
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseSlug]);

  const handleEnroll = async () => {
    setEnrolling(true);
    try {
      const res = await fetch("/api/academy/enroll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId: course?.id }),
      });
      if (!res.ok) throw new Error("Failed to enroll");
      const data = await res.json();
      setCourse((prev) =>
        prev
          ? {
              ...prev,
              enrollment: {
                id: data.enrollment?.id ?? data.id,
                status: "ACTIVE",
                progressPercent: 0,
                currentLessonId: null,
              },
            }
          : prev,
      );
    } catch (e) {
      console.error("Enrollment error:", e);
    } finally {
      setEnrolling(false);
    }
  };

  const toggleModule = (moduleId: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-body-lg text-white/70">
          {error ?? "Course not found"}
        </p>
        <Link
          href="/academy/courses"
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-body px-5 py-2 rounded-lg transition-all"
        >
          Back to Courses
        </Link>
      </div>
    );
  }

  const CategoryIcon = CATEGORY_ICONS[course.category] ?? BookOpen;
  const totalLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.length,
    0,
  );
  const completedLessons = course.modules.reduce(
    (sum, m) => sum + m.lessons.filter((l) => l.isCompleted).length,
    0,
  );

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-small text-white/40">
        <Link
          href="/academy/courses"
          className="hover:text-white/60 transition-colors"
        >
          Courses
        </Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-white/60">{course.title}</span>
      </div>

      {/* Course Header */}
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <CategoryIcon className="w-7 h-7 text-emerald-400" />
              </div>
              <div>
                <p className="text-micro text-emerald-400 uppercase tracking-wider">
                  {course.category.replace(/_/g, " ")}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-micro uppercase px-2 py-0.5 rounded-full border ${LEVEL_COLORS[course.level] ?? "bg-white/10 text-white/60 border-white/20"}`}
                  >
                    {course.level}
                  </span>
                  {course.isPremium && (
                    <span className="text-micro uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      Premium
                    </span>
                  )}
                </div>
              </div>
            </div>

            <h1 className="text-display font-semibold text-white mb-3">
              {course.title}
            </h1>
            {course.subtitle && (
              <p className="text-body-lg text-white/60 mb-4">
                {course.subtitle}
              </p>
            )}
            {course.description && (
              <p className="text-body text-white/45 leading-relaxed mb-6">
                {course.description}
              </p>
            )}

            <div className="flex items-center gap-6 text-small text-white/45">
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                {Math.round(course.estimatedMinutes / 60)}h{" "}
                {course.estimatedMinutes % 60 > 0
                  ? `${course.estimatedMinutes % 60}m`
                  : ""}
              </div>
              <div className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4" />
                {course.modules.length} modules, {totalLessons} lessons
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                {course._count.enrollments} enrolled
              </div>
            </div>
          </motion.div>
        </div>

        {/* Progress / Enroll Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="lg:w-80 flex-shrink-0"
        >
          <GlassCard hover={false} className="p-6">
            {course.enrollment ? (
              <>
                {/* Progress Ring */}
                <div className="flex items-center justify-center mb-5">
                  <div className="relative w-28 h-28">
                    <svg
                      viewBox="0 0 120 120"
                      className="w-full h-full -rotate-90"
                    >
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="rgba(255,255,255,0.1)"
                        strokeWidth="8"
                      />
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="#10B981"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray={`${2 * Math.PI * 50}`}
                        strokeDashoffset={`${2 * Math.PI * 50 * (1 - course.enrollment.progressPercent / 100)}`}
                        className="transition-all duration-700"
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-display-sm font-semibold text-white">
                        {course.enrollment.progressPercent}%
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-small text-white/45 text-center mb-1">
                  {completedLessons} of {totalLessons} lessons completed
                </p>
                <Link
                  href={`/academy/courses/${course.slug}/learn`}
                  className="mt-4 w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body py-3 rounded-xl transition-all"
                >
                  <PlayCircle className="w-5 h-5" />
                  Continue Learning
                </Link>
              </>
            ) : (
              <>
                <div className="text-center mb-5">
                  <p className="text-display-sm font-semibold text-white mb-1">
                    Free
                  </p>
                  <p className="text-small text-white/45">
                    Enroll to start learning
                  </p>
                </div>
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {enrolling ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <BookOpen className="w-5 h-5" />
                  )}
                  {enrolling ? "Enrolling..." : "Enroll Now"}
                </button>
              </>
            )}
          </GlassCard>
        </motion.div>
      </div>

      {/* Module Accordion */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Course Content
        </h2>
        <div className="space-y-3">
          {course.modules
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((mod, modIndex) => {
              const isExpanded = expandedModules.has(mod.id);
              const modCompleted = mod.lessons.filter(
                (l) => l.isCompleted,
              ).length;

              return (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: modIndex * 0.06 }}
                >
                  <GlassCard hover={false} className="overflow-hidden">
                    <button
                      onClick={() => toggleModule(mod.id)}
                      className="w-full flex items-center gap-4 p-5 text-left hover:bg-white/5 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
                        <span className="text-small font-medium text-white/60">
                          {modIndex + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-body-lg font-medium text-white truncate">
                          {mod.title}
                        </h3>
                        <p className="text-small text-white/40">
                          {mod.lessons.length} lessons
                          {modCompleted > 0
                            ? ` · ${modCompleted} completed`
                            : ""}
                        </p>
                      </div>
                      <ChevronDown
                        className={`w-5 h-5 text-white/40 transition-transform ${
                          isExpanded ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-white/5 px-5 py-2">
                            {mod.lessons
                              .sort((a, b) => a.sortOrder - b.sortOrder)
                              .map((lesson) => {
                                const TypeIcon =
                                  LESSON_TYPE_ICONS[lesson.type] ?? FileText;
                                const isLocked = !course.enrollment;

                                return (
                                  <div
                                    key={lesson.id}
                                    className="flex items-center gap-3 py-3 border-b border-white/5 last:border-0"
                                  >
                                    {lesson.isCompleted ? (
                                      <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0" />
                                    ) : isLocked ? (
                                      <Lock className="w-4 h-4 text-white/20 flex-shrink-0" />
                                    ) : (
                                      <TypeIcon className="w-4 h-4 text-white/40 flex-shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                      {course.enrollment ? (
                                        <Link
                                          href={`/academy/courses/${course.slug}/learn/${lesson.slug}`}
                                          className="text-body text-white/70 hover:text-emerald-400 transition-colors truncate block"
                                        >
                                          {lesson.title}
                                        </Link>
                                      ) : (
                                        <span className="text-body text-white/50 truncate block">
                                          {lesson.title}
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-micro text-white/30 flex-shrink-0">
                                      {LESSON_TYPE_LABELS[lesson.type] ??
                                        lesson.type}
                                    </span>
                                    <span className="text-micro text-white/30 flex-shrink-0">
                                      {lesson.estimatedMinutes}m
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </GlassCard>
                </motion.div>
              );
            })}
        </div>
      </div>
    </div>
  );
}
