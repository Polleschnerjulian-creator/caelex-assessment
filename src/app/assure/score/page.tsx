"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, Loader2, TrendingUp, History } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";
import GlassCard from "@/components/ui/GlassCard";
import IRSScoreGauge from "@/components/assure/IRSScoreGauge";
import IRSScoreBadge from "@/components/assure/IRSScoreBadge";

// ─── Types ───

interface ScoreData {
  score: number;
  grade: string;
  components: Record<string, number>;
  improvements?: Array<{
    action: string;
    impact: number;
    effort: string;
    component: string;
    priority: number;
  }>;
  computedAt?: string;
}

interface HistoryEntry {
  score: number;
  grade: string;
  computedAt: string;
}

// ─── Skeleton ───

function ScoreSkeleton() {
  return (
    <div className="animate-pulse space-y-8" role="status">
      <div className="h-10 bg-white/5 rounded-lg w-1/3" />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[400px] bg-white/5 rounded-xl" />
        <div className="h-[400px] bg-white/5 rounded-xl" />
      </div>
      <div className="h-[300px] bg-white/5 rounded-xl" />
      <span className="sr-only">Loading score...</span>
    </div>
  );
}

// ─── Component ───

export default function AssureScorePage() {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [computing, setComputing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchScore = async () => {
    try {
      const [currentRes, historyRes] = await Promise.all([
        fetch("/api/assure/score/current"),
        fetch("/api/assure/score/history").catch(() => null),
      ]);

      if (currentRes.ok) {
        setScore(await currentRes.json());
      }
      if (historyRes?.ok) {
        const data = await historyRes.json();
        setHistory(data.history || data || []);
      }
    } catch (err) {
      console.error("Failed to fetch score:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, []);

  const handleCompute = async () => {
    setComputing(true);
    setError(null);
    try {
      const res = await fetch("/api/assure/score/compute", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to compute score");
      }
      const data = await res.json();
      setScore(data);
      // Re-fetch history
      const historyRes = await fetch("/api/assure/score/history").catch(
        () => null,
      );
      if (historyRes?.ok) {
        const hData = await historyRes.json();
        setHistory(hData.history || hData || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Computation failed");
    } finally {
      setComputing(false);
    }
  };

  if (loading) return <ScoreSkeleton />;

  const displayScore = score?.score ?? 0;
  const displayGrade = score?.grade ?? "N/A";
  const components = score?.components ?? {};
  const improvements = score?.improvements ?? [];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-10">
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-display font-bold text-white mb-2"
          >
            Investment Readiness Score
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.05 }}
            className="text-body-lg text-white/40"
          >
            Your quantified readiness for investor due diligence.
          </motion.p>
        </div>
        <button
          onClick={handleCompute}
          disabled={computing}
          className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-5 py-2.5 rounded-lg transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {computing ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <RefreshCw size={16} />
          )}
          {computing ? "Computing..." : "Compute Score"}
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/20">
          <p className="text-small text-red-400">{error}</p>
        </div>
      )}

      {/* Score + Grade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <GlassCard
          hover={false}
          highlighted={displayScore >= 80}
          className="p-10"
        >
          <div className="flex flex-col items-center">
            <IRSScoreGauge
              score={displayScore}
              grade={displayGrade}
              size={280}
            />
            <div className="mt-6">
              <IRSScoreBadge grade={displayGrade} size="lg" showLabel />
            </div>
            {score?.computedAt && (
              <p className="text-micro text-white/25 mt-4">
                Last computed: {new Date(score.computedAt).toLocaleString()}
              </p>
            )}
          </div>
        </GlassCard>

        {/* Component Breakdown */}
        <GlassCard hover={false} className="p-6">
          <h2 className="text-heading font-semibold text-white mb-5">
            Score Components
          </h2>
          {Object.keys(components).length > 0 ? (
            <div className="space-y-4">
              {Object.entries(components)
                .sort(([, a], [, b]) => b - a)
                .map(([key, value], index) => (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-body text-white/70 capitalize font-medium">
                        {key.replace(/_/g, " ")}
                      </span>
                      <span
                        className={`text-body-lg font-bold ${
                          value >= 80
                            ? "text-emerald-400"
                            : value >= 60
                              ? "text-amber-400"
                              : "text-red-400"
                        }`}
                      >
                        {value}
                      </span>
                    </div>
                    <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        className={`h-full rounded-full ${
                          value >= 80
                            ? "bg-emerald-500"
                            : value >= 60
                              ? "bg-amber-500"
                              : "bg-red-500"
                        }`}
                        initial={{ width: 0 }}
                        animate={{ width: `${value}%` }}
                        transition={{
                          duration: 0.7,
                          delay: 0.1 + index * 0.05,
                        }}
                      />
                    </div>
                  </motion.div>
                ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-body text-white/30">
                No component data. Compute your score to see breakdowns.
              </p>
            </div>
          )}
        </GlassCard>
      </div>

      {/* Improvement Plan */}
      {improvements.length > 0 && (
        <GlassCard hover={false} className="p-6 mb-10">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={18} className="text-emerald-400" />
            <h2 className="text-heading font-semibold text-white">
              Improvement Plan
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 pb-2 pr-4">
                    #
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 pb-2 pr-4">
                    Action
                  </th>
                  <th className="text-center text-micro uppercase tracking-wider text-white/40 pb-2 px-4">
                    Impact
                  </th>
                  <th className="text-center text-micro uppercase tracking-wider text-white/40 pb-2 px-4">
                    Effort
                  </th>
                  <th className="text-left text-micro uppercase tracking-wider text-white/40 pb-2 pl-4">
                    Component
                  </th>
                </tr>
              </thead>
              <tbody>
                {improvements
                  .sort((a, b) => (b.impact || 0) - (a.impact || 0))
                  .map((item, index) => (
                    <motion.tr
                      key={index}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.03 }}
                      className="border-b border-white/5 last:border-0"
                    >
                      <td className="py-3 pr-4 text-small text-white/30">
                        {index + 1}
                      </td>
                      <td className="py-3 pr-4 text-body text-white/70">
                        {item.action}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-small font-bold text-emerald-400">
                          +{item.impact}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span
                          className={`text-micro uppercase font-medium px-2 py-0.5 rounded-full ${
                            item.effort === "low"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : item.effort === "medium"
                                ? "bg-amber-500/10 text-amber-400"
                                : "bg-red-500/10 text-red-400"
                          }`}
                        >
                          {item.effort}
                        </span>
                      </td>
                      <td className="py-3 pl-4 text-small text-white/40 capitalize">
                        {item.component?.replace(/_/g, " ")}
                      </td>
                    </motion.tr>
                  ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* History */}
      {history.length > 0 && (
        <GlassCard hover={false} className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <History size={18} className="text-white/40" />
            <h2 className="text-heading font-semibold text-white">
              Score History
            </h2>
          </div>

          <div className="space-y-2">
            {history.map((entry, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.03 }}
                className="flex items-center gap-4 p-3 rounded-lg bg-white/[0.02]"
              >
                <span
                  className={`text-body-lg font-bold w-12 text-center ${
                    entry.score >= 80
                      ? "text-emerald-400"
                      : entry.score >= 60
                        ? "text-amber-400"
                        : "text-red-400"
                  }`}
                >
                  {entry.score}
                </span>
                <span className="text-body text-white/50">{entry.grade}</span>
                <span className="text-small text-white/25 ml-auto">
                  {new Date(entry.computedAt).toLocaleDateString()}
                </span>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
