"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  GraduationCap,
  ChevronLeft,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

export default function JoinClassroomPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/academy/classrooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim().toUpperCase() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error ?? data.message ?? "Failed to join classroom",
        );
      }

      const data = await res.json();
      setSuccess(true);

      setTimeout(() => {
        router.push(
          `/academy/classroom/${data.classroomId ?? data.classroom?.id ?? ""}`,
        );
      }, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/academy/classroom"
        className="inline-flex items-center gap-2 text-small text-white/40 hover:text-white/60 transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Classrooms
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <GlassCard hover={false} className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-heading font-medium text-white">
                Join a Classroom
              </h1>
              <p className="text-body text-white/45">
                Enter the code provided by your instructor
              </p>
            </div>
          </div>

          {success ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <CheckCircle className="w-14 h-14 text-emerald-400 mx-auto mb-4" />
              <h2 className="text-title font-medium text-white mb-2">
                Successfully Joined!
              </h2>
              <p className="text-body text-white/45">
                Redirecting to your classroom...
              </p>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label
                  htmlFor="classroom-code"
                  className="text-small text-white/60 block mb-2"
                >
                  Classroom Code
                </label>
                <input
                  id="classroom-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g., ABCD-1234"
                  maxLength={20}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-display-sm font-mono text-white text-center uppercase tracking-[0.15em] placeholder:text-white/20 focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <p className="text-small text-red-400">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!code.trim() || loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <GraduationCap className="w-5 h-5" />
                )}
                {loading ? "Joining..." : "Join Classroom"}
              </button>

              <p className="text-small text-white/30 text-center">
                Ask your instructor for the classroom code. It is usually shared
                in your course materials or via email.
              </p>
            </form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
}
