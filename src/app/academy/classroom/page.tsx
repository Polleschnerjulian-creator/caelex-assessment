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
  Calendar,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface ClassroomData {
  id: string;
  name: string;
  description: string | null;
  code: string;
  semester: string | null;
  isActive: boolean;
  instructor: {
    id: string;
    name: string | null;
  };
  _count: {
    enrollments: number;
    assignedCourses: number;
  };
  myProgress?: number;
}

// ─── Main Page ───

export default function ClassroomPage() {
  const [classrooms, setClassrooms] = useState<ClassroomData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/academy/classrooms")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load classrooms");
        return r.json();
      })
      .then((data) => setClassrooms(data.classrooms ?? data))
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

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-display font-medium text-white mb-1">
            My Classrooms
          </h1>
          <p className="text-body-lg text-white/45">
            Collaborative learning spaces managed by instructors
          </p>
        </div>
        <Link
          href="/academy/classroom/join"
          className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-xl transition-all"
        >
          <Plus className="w-4 h-4" />
          Join Classroom
        </Link>
      </div>

      {/* Classroom Grid */}
      {classrooms.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {classrooms.map((classroom, i) => (
            <motion.div
              key={classroom.id}
              initial={false}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
            >
              <Link href={`/academy/classroom/${classroom.id}`}>
                <GlassCard className="p-5 h-full cursor-pointer group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center group-hover:bg-purple-500/20 transition-colors">
                      <GraduationCap className="w-5 h-5 text-purple-400" />
                    </div>
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

                  <h3 className="text-title font-medium text-white mb-1 group-hover:text-purple-400 transition-colors">
                    {classroom.name}
                  </h3>
                  {classroom.description && (
                    <p className="text-body text-white/45 mb-3 line-clamp-2">
                      {classroom.description}
                    </p>
                  )}

                  <div className="flex items-center gap-1.5 text-small text-white/40 mb-3">
                    <Users className="w-3.5 h-3.5" />
                    Instructor: {classroom.instructor.name ?? "Unknown"}
                  </div>

                  {/* Progress if available */}
                  {classroom.myProgress !== undefined && (
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-micro text-white/40">
                          My Progress
                        </span>
                        <span className="text-micro text-emerald-400">
                          {classroom.myProgress}%
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${classroom.myProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                    <div className="flex items-center gap-1.5 text-small text-white/40">
                      <Users className="w-3.5 h-3.5" />
                      {classroom._count.enrollments} members
                    </div>
                    <div className="flex items-center gap-1.5 text-small text-white/40">
                      <BookOpen className="w-3.5 h-3.5" />
                      {classroom._count.assignedCourses} courses
                    </div>
                    {classroom.semester && (
                      <div className="flex items-center gap-1.5 text-small text-white/40">
                        <Calendar className="w-3.5 h-3.5" />
                        {classroom.semester}
                      </div>
                    )}
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
            Join a classroom using a code from your instructor, or ask your
            organization administrator to create one.
          </p>
          <Link
            href="/academy/classroom/join"
            className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-body font-medium px-6 py-2.5 rounded-lg transition-all"
          >
            Join with Code
            <ChevronRight className="w-4 h-4" />
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
