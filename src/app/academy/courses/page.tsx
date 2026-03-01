"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Clock,
  Users,
  Search,
  Loader2,
  AlertCircle,
  ChevronDown,
  Satellite,
  Shield,
  Scale,
  Globe,
  Layers,
  Zap,
  GraduationCap,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface CourseData {
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
  _count: {
    enrollments: number;
    modules: number;
  };
  enrollment?: {
    progressPercent: number;
    status: string;
  } | null;
}

// ─── Constants ───

const CATEGORIES = [
  { key: "ALL", label: "All Courses", icon: BookOpen },
  { key: "EU_SPACE_ACT", label: "EU Space Act", icon: Satellite },
  { key: "NIS2", label: "NIS2", icon: Shield },
  { key: "NATIONAL_SPACE_LAW", label: "National Law", icon: Scale },
  { key: "CROSS_REGULATORY", label: "Cross-Regulatory", icon: Globe },
  { key: "FUNDAMENTALS", label: "Fundamentals", icon: Layers },
  { key: "ADVANCED_TOPICS", label: "Advanced", icon: Zap },
] as const;

const LEVELS = [
  "ALL",
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "EXPERT",
] as const;

const LEVEL_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400 border-green-500/30",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ADVANCED: "bg-red-500/20 text-red-400 border-red-500/30",
  EXPERT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
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

export default function CourseCatalogPage() {
  const [courses, setCourses] = useState<CourseData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("ALL");
  const [activeLevel, setActiveLevel] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [showLevelDropdown, setShowLevelDropdown] = useState(false);

  useEffect(() => {
    fetch("/api/academy/courses")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load courses");
        return r.json();
      })
      .then((data) => setCourses(data.courses ?? data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredCourses = useMemo(() => {
    return courses.filter((course) => {
      if (activeCategory !== "ALL" && course.category !== activeCategory)
        return false;
      if (activeLevel !== "ALL" && course.level !== activeLevel) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          course.title.toLowerCase().includes(q) ||
          course.subtitle?.toLowerCase().includes(q) ||
          course.description?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [courses, activeCategory, activeLevel, searchQuery]);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-display font-medium text-white mb-1">
          Course Catalog
        </h1>
        <p className="text-body-lg text-white/45">
          {courses.length} courses available across all regulatory frameworks
        </p>
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input
            type="text"
            placeholder="Search courses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-body-lg text-white placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50 transition-colors"
          />
        </div>

        {/* Level filter dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowLevelDropdown(!showLevelDropdown)}
            className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-body-lg text-white/70 hover:border-white/20 transition-colors min-w-[160px]"
          >
            <GraduationCap className="w-4 h-4" />
            <span>{activeLevel === "ALL" ? "All Levels" : activeLevel}</span>
            <ChevronDown className="w-4 h-4 ml-auto" />
          </button>
          {showLevelDropdown && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={() => setShowLevelDropdown(false)}
              />
              <div className="absolute right-0 top-full mt-1 z-20 bg-[#141414] border border-white/10 rounded-xl py-1 min-w-[160px] shadow-xl">
                {LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => {
                      setActiveLevel(level);
                      setShowLevelDropdown(false);
                    }}
                    className={`w-full text-left px-4 py-2 text-body text-white/70 hover:bg-white/5 transition-colors ${
                      activeLevel === level ? "text-emerald-400 bg-white/5" : ""
                    }`}
                  >
                    {level === "ALL" ? "All Levels" : level}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-small font-medium whitespace-nowrap transition-all ${
              activeCategory === cat.key
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-white/5 text-white/50 border border-transparent hover:bg-white/10 hover:text-white/70"
            }`}
          >
            <cat.icon className="w-3.5 h-3.5" />
            {cat.label}
          </button>
        ))}
      </div>

      {/* Course Grid */}
      <AnimatePresence mode="popLayout">
        {filteredCourses.length > 0 ? (
          <motion.div
            layout
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
          >
            {filteredCourses.map((course, i) => {
              const CategoryIcon = CATEGORY_ICONS[course.category] ?? BookOpen;

              return (
                <motion.div
                  key={course.id}
                  layout
                  initial={false}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/academy/courses/${course.slug}`}>
                    <GlassCard className="p-5 h-full cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                          <CategoryIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div className="flex items-center gap-2">
                          {course.isPremium && (
                            <span className="text-micro uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                              Premium
                            </span>
                          )}
                          <span
                            className={`text-micro uppercase px-2 py-0.5 rounded-full border ${LEVEL_COLORS[course.level] ?? "bg-white/10 text-white/60 border-white/20"}`}
                          >
                            {course.level}
                          </span>
                        </div>
                      </div>

                      <p className="text-micro text-emerald-400/70 uppercase tracking-wider mb-1.5">
                        {course.category.replace(/_/g, " ")}
                      </p>
                      <h3 className="text-title font-medium text-white mb-1.5 group-hover:text-emerald-400 transition-colors">
                        {course.title}
                      </h3>
                      {course.subtitle && (
                        <p className="text-body text-white/45 mb-4 line-clamp-2">
                          {course.subtitle}
                        </p>
                      )}

                      {/* Progress bar if enrolled */}
                      {course.enrollment && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-micro text-white/45">
                              Progress
                            </span>
                            <span className="text-micro text-emerald-400">
                              {course.enrollment.progressPercent}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-emerald-500 transition-all"
                              style={{
                                width: `${course.enrollment.progressPercent}%`,
                              }}
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-4 pt-3 border-t border-white/5 mt-auto">
                        <div className="flex items-center gap-1.5 text-small text-white/40">
                          <Clock className="w-3.5 h-3.5" />
                          {Math.round(course.estimatedMinutes / 60)}h{" "}
                          {course.estimatedMinutes % 60 > 0
                            ? `${course.estimatedMinutes % 60}m`
                            : ""}
                        </div>
                        <div className="flex items-center gap-1.5 text-small text-white/40">
                          <Users className="w-3.5 h-3.5" />
                          {course._count.enrollments} enrolled
                        </div>
                        <div className="flex items-center gap-1.5 text-small text-white/40">
                          <BookOpen className="w-3.5 h-3.5" />
                          {course._count.modules} modules
                        </div>
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </motion.div>
        ) : (
          <motion.div
            initial={false}
            animate={{ opacity: 1 }}
            className="py-16 text-center"
          >
            <Search className="w-10 h-10 text-white/15 mx-auto mb-3" />
            <p className="text-body-lg text-white/50">No courses found</p>
            <p className="text-body text-white/30 mt-1">
              Try adjusting your filters or search query
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
