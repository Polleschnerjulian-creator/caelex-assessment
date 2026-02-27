"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  PlayCircle,
  FileText,
  HelpCircle,
  Cpu,
  Briefcase,
  Beaker,
  Clock,
  Loader2,
  AlertCircle,
  Menu,
  X,
  Send,
  RotateCcw,
  Lock,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface LessonNav {
  id: string;
  slug: string;
  title: string;
  type: string;
  isCompleted: boolean;
  sortOrder: number;
}

interface ModuleNav {
  id: string;
  title: string;
  sortOrder: number;
  lessons: LessonNav[];
}

interface QuestionData {
  id: string;
  questionText: string;
  options: string[];
  correctIndex: number;
  explanation: string | null;
}

interface LessonDetail {
  id: string;
  slug: string;
  title: string;
  type: string;
  estimatedMinutes: number;
  content: {
    blocks?: Array<{
      type: string;
      content?: string;
      items?: string[];
      title?: string;
      code?: string;
      language?: string;
    }>;
  } | null;
  questions: QuestionData[];
  module: {
    id: string;
    title: string;
    course: {
      slug: string;
      title: string;
      modules: ModuleNav[];
    };
  };
  prevLesson: { slug: string; title: string } | null;
  nextLesson: { slug: string; title: string } | null;
  isCompleted: boolean;
}

// ─── Constants ───

const LESSON_TYPE_ICONS: Record<string, typeof FileText> = {
  THEORY: FileText,
  INTERACTIVE: PlayCircle,
  QUIZ: HelpCircle,
  SIMULATION: Cpu,
  CASE_STUDY: Briefcase,
  SANDBOX: Beaker,
};

// ─── Content Renderer ───

function ContentBlock({
  block,
}: {
  block: {
    type: string;
    content?: string;
    items?: string[];
    title?: string;
    code?: string;
    language?: string;
  };
}) {
  switch (block.type) {
    case "heading":
      return (
        <h2 className="text-heading font-semibold text-white mt-8 mb-4">
          {block.content}
        </h2>
      );
    case "subheading":
      return (
        <h3 className="text-title font-medium text-white/90 mt-6 mb-3">
          {block.content}
        </h3>
      );
    case "paragraph":
      return (
        <p className="text-body-lg text-white/60 leading-relaxed mb-4">
          {block.content}
        </p>
      );
    case "list":
      return (
        <ul className="space-y-2 mb-4 ml-4">
          {block.items?.map((item, i) => (
            <li
              key={i}
              className="text-body-lg text-white/60 flex items-start gap-2"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 mb-4">
          {block.title && (
            <p className="text-body font-medium text-emerald-400 mb-1">
              {block.title}
            </p>
          )}
          <p className="text-body text-white/60">{block.content}</p>
        </div>
      );
    case "code":
      return (
        <pre className="bg-black border border-white/10 rounded-xl p-5 mb-4 overflow-x-auto">
          <code className="text-small text-emerald-300 font-mono">
            {block.code ?? block.content}
          </code>
        </pre>
      );
    case "divider":
      return <hr className="border-white/10 my-8" />;
    default:
      return (
        <p className="text-body-lg text-white/60 leading-relaxed mb-4">
          {block.content}
        </p>
      );
  }
}

// ─── Quiz Component ───

function QuizView({
  questions,
  onComplete,
}: {
  questions: QuestionData[];
  onComplete: (score: number, answers: Record<string, number>) => void;
}) {
  const [currentQ, setCurrentQ] = useState(0);
  const [selected, setSelected] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const [showResults, setShowResults] = useState(false);

  const question = questions[currentQ];
  if (!question) return null;

  const handleSubmit = () => {
    setSubmitted(true);
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(currentQ + 1);
      setSubmitted(false);
    } else {
      // Calculate score
      let correct = 0;
      const answerMap: Record<string, number> = {};
      questions.forEach((q, i) => {
        answerMap[q.id] = selected[i] ?? -1;
        if (selected[i] === q.correctIndex) correct++;
      });
      const score = Math.round((correct / questions.length) * 100);
      setShowResults(true);
      onComplete(score, answerMap);
    }
  };

  if (showResults) {
    let correct = 0;
    questions.forEach((q, i) => {
      if (selected[i] === q.correctIndex) correct++;
    });
    const score = Math.round((correct / questions.length) * 100);

    return (
      <div className="max-w-2xl mx-auto py-8">
        <GlassCard hover={false} className="p-8 text-center">
          <div
            className={`w-20 h-20 rounded-full mx-auto mb-6 flex items-center justify-center ${
              score >= 80
                ? "bg-emerald-500/20 border-2 border-emerald-500/30"
                : score >= 60
                  ? "bg-amber-500/20 border-2 border-amber-500/30"
                  : "bg-red-500/20 border-2 border-red-500/30"
            }`}
          >
            <span
              className={`text-display-sm font-bold ${
                score >= 80
                  ? "text-emerald-400"
                  : score >= 60
                    ? "text-amber-400"
                    : "text-red-400"
              }`}
            >
              {score}%
            </span>
          </div>
          <h3 className="text-heading font-medium text-white mb-2">
            {score >= 80
              ? "Excellent!"
              : score >= 60
                ? "Good effort!"
                : "Keep studying!"}
          </h3>
          <p className="text-body text-white/45 mb-4">
            You got {correct} out of {questions.length} questions correct
          </p>
          <button
            onClick={() => {
              setCurrentQ(0);
              setSelected({});
              setSubmitted(false);
              setShowResults(false);
            }}
            className="inline-flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Try Again
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      {/* Progress */}
      <div className="flex items-center gap-3 mb-6">
        <span className="text-small text-white/45">
          Question {currentQ + 1} of {questions.length}
        </span>
        <div className="flex-1 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{
              width: `${((currentQ + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <GlassCard hover={false} className="p-6">
        <h3 className="text-title font-medium text-white mb-6">
          {question.questionText}
        </h3>

        <div className="space-y-3">
          {question.options.map((option, i) => {
            const isSelected = selected[currentQ] === i;
            const isCorrect = i === question.correctIndex;
            const showCorrect = submitted;

            return (
              <button
                key={i}
                onClick={() => {
                  if (!submitted) {
                    setSelected({ ...selected, [currentQ]: i });
                  }
                }}
                disabled={submitted}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  showCorrect
                    ? isCorrect
                      ? "bg-emerald-500/20 border-emerald-500/30 text-white"
                      : isSelected
                        ? "bg-red-500/20 border-red-500/30 text-white"
                        : "bg-white/5 border-white/10 text-white/50"
                    : isSelected
                      ? "bg-emerald-500/10 border-emerald-500/30 text-white"
                      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:border-white/20"
                }`}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={`w-6 h-6 rounded-full border flex items-center justify-center flex-shrink-0 text-micro ${
                      showCorrect
                        ? isCorrect
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : isSelected
                            ? "border-red-500 bg-red-500 text-white"
                            : "border-white/20 text-white/40"
                        : isSelected
                          ? "border-emerald-500 bg-emerald-500/20 text-emerald-400"
                          : "border-white/20 text-white/40"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </span>
                  <span className="text-body-lg">{option}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Explanation after submit */}
        {submitted && question.explanation && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <p className="text-small text-white/60">{question.explanation}</p>
          </motion.div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/10">
          <button
            onClick={() => {
              if (currentQ > 0) {
                setCurrentQ(currentQ - 1);
                setSubmitted(false);
              }
            }}
            disabled={currentQ === 0}
            className="text-body text-white/45 hover:text-white/70 disabled:opacity-30 transition-colors"
          >
            Previous
          </button>
          <div className="flex items-center gap-3">
            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={selected[currentQ] === undefined}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                Submit
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2 rounded-lg transition-all flex items-center gap-2"
              >
                {currentQ < questions.length - 1 ? "Next" : "See Results"}
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Simulation Placeholder ───

function SimulationView({ lessonId }: { lessonId: string }) {
  return (
    <div className="max-w-2xl mx-auto py-8 text-center">
      <GlassCard hover={false} className="p-10">
        <Cpu className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
        <h3 className="text-heading font-medium text-white mb-2">
          Compliance Simulation
        </h3>
        <p className="text-body text-white/45 mb-6">
          This simulation will guide you through real-world compliance
          decisions. You will play as a space operator and make regulatory
          choices.
        </p>
        <Link
          href={`/academy/simulations/${lessonId}`}
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-3 rounded-xl transition-all"
        >
          <PlayCircle className="w-5 h-5" />
          Launch Simulation
        </Link>
      </GlassCard>
    </div>
  );
}

// ─── Main Page ───

export default function LessonPage() {
  const params = useParams();
  const router = useRouter();
  const courseSlug = params.courseSlug as string;
  const lessonSlug = params.lessonSlug as string;

  const [lesson, setLesson] = useState<LessonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completing, setCompleting] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    setLoading(true);
    startTimeRef.current = Date.now();
    fetch(
      `/api/academy/lessons?lessonSlug=${encodeURIComponent(lessonSlug)}&courseSlug=${encodeURIComponent(courseSlug)}`,
    )
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load lesson");
        return r.json();
      })
      .then((data) => setLesson(data.lesson ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [courseSlug, lessonSlug]);

  const handleComplete = useCallback(
    async (score?: number, answers?: Record<string, number>) => {
      if (!lesson || completing) return;
      setCompleting(true);
      const timeSpent = Math.round((Date.now() - startTimeRef.current) / 1000);
      try {
        const res = await fetch(`/api/academy/lessons/${lesson.id}/complete`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            timeSpent,
            score: score ?? null,
            answers: answers ?? null,
          }),
        });
        if (res.ok) {
          setLesson((prev) => (prev ? { ...prev, isCompleted: true } : prev));
        }
      } catch (e) {
        console.error("Failed to mark complete:", e);
      } finally {
        setCompleting(false);
      }
    },
    [lesson, completing],
  );

  if (loading) {
    return (
      <div className="min-h-[600px] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center gap-4">
        <AlertCircle className="w-10 h-10 text-red-400" />
        <p className="text-body-lg text-white/70">
          {error ?? "Lesson not found"}
        </p>
        <Link
          href={`/academy/courses/${courseSlug}`}
          className="bg-emerald-500 hover:bg-emerald-600 text-white text-body px-5 py-2 rounded-lg transition-all"
        >
          Back to Course
        </Link>
      </div>
    );
  }

  const courseModules = lesson.module.course.modules ?? [];

  return (
    <div className="flex min-h-[calc(100vh-120px)] -m-6 lg:-m-10">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="lg:hidden fixed top-20 left-4 z-30 w-10 h-10 rounded-lg bg-[#141414] border border-white/10 flex items-center justify-center"
      >
        <Menu className="w-5 h-5 text-white/60" />
      </button>

      {/* Left Sidebar Navigation */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-40 w-72 bg-[#0a0a0a] border-r border-white/10 overflow-y-auto transition-transform lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/academy/courses/${courseSlug}`}
              className="flex items-center gap-2 text-small text-white/45 hover:text-white/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Course
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-white/45"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 className="text-small font-medium text-white/70 mb-4 truncate">
            {lesson.module.course.title}
          </h3>

          <div className="space-y-4">
            {courseModules
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((mod) => (
                <div key={mod.id}>
                  <p className="text-micro text-white/30 uppercase tracking-wider mb-2">
                    {mod.title}
                  </p>
                  <div className="space-y-0.5">
                    {mod.lessons
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((navLesson) => {
                        const isActive = navLesson.slug === lessonSlug;
                        const TypeIcon =
                          LESSON_TYPE_ICONS[navLesson.type] ?? FileText;
                        return (
                          <Link
                            key={navLesson.id}
                            href={`/academy/courses/${courseSlug}/learn/${navLesson.slug}`}
                            onClick={() => setSidebarOpen(false)}
                            className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-small transition-colors ${
                              isActive
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "text-white/50 hover:bg-white/5 hover:text-white/70 border border-transparent"
                            }`}
                          >
                            {navLesson.isCompleted ? (
                              <CheckCircle className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                            ) : (
                              <TypeIcon className="w-3.5 h-3.5 flex-shrink-0" />
                            )}
                            <span className="truncate">{navLesson.title}</span>
                          </Link>
                        );
                      })}
                  </div>
                </div>
              ))}
          </div>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 lg:px-10 py-4 border-b border-white/10 bg-white/[0.02] backdrop-blur-sm">
          <div className="flex items-center gap-3">
            {(() => {
              const TypeIcon = LESSON_TYPE_ICONS[lesson.type] ?? FileText;
              return <TypeIcon className="w-5 h-5 text-emerald-400" />;
            })()}
            <div>
              <h1 className="text-body-lg font-medium text-white">
                {lesson.title}
              </h1>
              <p className="text-micro text-white/40">{lesson.module.title}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-small text-white/40">
              <Clock className="w-3.5 h-3.5" />
              {lesson.estimatedMinutes}m
            </div>
            {lesson.isCompleted && (
              <div className="flex items-center gap-1.5 text-small text-emerald-400">
                <CheckCircle className="w-4 h-4" />
                Completed
              </div>
            )}
          </div>
        </div>

        {/* Lesson content */}
        <div className="flex-1 overflow-y-auto px-6 lg:px-10 py-8">
          {lesson.type === "THEORY" ||
          lesson.type === "CASE_STUDY" ||
          lesson.type === "INTERACTIVE" ? (
            <div className="max-w-3xl mx-auto">
              {lesson.content?.blocks?.map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}
              {(!lesson.content?.blocks ||
                lesson.content.blocks.length === 0) && (
                <div className="text-center py-16">
                  <FileText className="w-10 h-10 text-white/15 mx-auto mb-3" />
                  <p className="text-body text-white/45">
                    Content coming soon for this lesson.
                  </p>
                </div>
              )}
            </div>
          ) : lesson.type === "QUIZ" ? (
            <QuizView
              questions={lesson.questions}
              onComplete={(score, answers) => handleComplete(score, answers)}
            />
          ) : lesson.type === "SIMULATION" ? (
            <SimulationView lessonId={lesson.id} />
          ) : (
            <div className="max-w-3xl mx-auto">
              {lesson.content?.blocks?.map((block, i) => (
                <ContentBlock key={i} block={block} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom navigation bar */}
        <div className="flex items-center justify-between px-6 lg:px-10 py-4 border-t border-white/10 bg-white/[0.02] backdrop-blur-sm">
          {lesson.prevLesson ? (
            <Link
              href={`/academy/courses/${courseSlug}/learn/${lesson.prevLesson.slug}`}
              className="flex items-center gap-2 text-body text-white/50 hover:text-white/70 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">
                {lesson.prevLesson.title}
              </span>
              <span className="sm:hidden">Previous</span>
            </Link>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-3">
            {!lesson.isCompleted && lesson.type !== "QUIZ" && (
              <button
                onClick={() => handleComplete()}
                disabled={completing}
                className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {completing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                {completing ? "Saving..." : "Mark Complete"}
              </button>
            )}
          </div>

          {lesson.nextLesson ? (
            <Link
              href={`/academy/courses/${courseSlug}/learn/${lesson.nextLesson.slug}`}
              className="flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              <span className="hidden sm:inline">
                {lesson.nextLesson.title}
              </span>
              <span className="sm:hidden">Next</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          ) : (
            <Link
              href={`/academy/courses/${courseSlug}`}
              className="flex items-center gap-2 text-body text-emerald-400 hover:text-emerald-300 transition-colors"
            >
              Finish Course
              <CheckCircle className="w-4 h-4" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
