"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Cpu,
  Clock,
  BarChart3,
  ChevronRight,
  Loader2,
  AlertCircle,
  Satellite,
  Shield,
  Scale,
  Trophy,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";

// ─── Types ───

interface ScenarioData {
  id: string;
  title: string;
  description: string;
  category: string;
  difficulty: string;
  estimatedMinutes: number;
  operatorProfile: string;
}

interface PastRunData {
  id: string;
  scenarioId: string;
  scenarioTitle: string;
  score: number;
  timeSpent: number;
  createdAt: string;
}

interface SimulationPageData {
  scenarios: ScenarioData[];
  pastRuns: PastRunData[];
}

// ─── Constants ───

const DIFFICULTY_COLORS: Record<string, string> = {
  BEGINNER: "bg-green-500/20 text-green-400 border-green-500/30",
  INTERMEDIATE: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  ADVANCED: "bg-red-500/20 text-red-400 border-red-500/30",
  EXPERT: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const CATEGORY_ICONS: Record<string, typeof Cpu> = {
  EU_SPACE_ACT: Satellite,
  NIS2: Shield,
  NATIONAL_SPACE_LAW: Scale,
};

// ─── Main Page ───

export default function SimulationsPage() {
  const [data, setData] = useState<SimulationPageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/academy/simulations")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load simulations");
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

  const scenarios = data?.scenarios ?? [];
  const pastRuns = data?.pastRuns ?? [];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-display font-medium text-white mb-1">
          Simulation Lab
        </h1>
        <p className="text-body-lg text-white/45">
          Practice compliance decision-making in realistic scenarios
        </p>
      </div>

      {/* Scenario Grid */}
      <div>
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
          Available Scenarios
        </h2>
        {scenarios.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scenarios.map((scenario, i) => {
              const CategoryIcon = CATEGORY_ICONS[scenario.category] ?? Cpu;
              const bestScore = pastRuns
                .filter((r) => r.scenarioId === scenario.id)
                .reduce((best, r) => Math.max(best, r.score), 0);

              return (
                <motion.div
                  key={scenario.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                >
                  <Link href={`/dashboard/academy/simulations/${scenario.id}`}>
                    <GlassCard className="p-5 h-full cursor-pointer group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                          <CategoryIcon className="w-5 h-5 text-emerald-400" />
                        </div>
                        <span
                          className={`text-micro uppercase px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[scenario.difficulty] ?? "bg-white/10 text-white/60 border-white/20"}`}
                        >
                          {scenario.difficulty}
                        </span>
                      </div>

                      <h3 className="text-title font-medium text-white mb-1.5 group-hover:text-emerald-400 transition-colors">
                        {scenario.title}
                      </h3>
                      <p className="text-body text-white/45 mb-4 line-clamp-2">
                        {scenario.description}
                      </p>

                      <div className="flex items-center gap-4 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-1.5 text-small text-white/40">
                          <Clock className="w-3.5 h-3.5" />
                          {scenario.estimatedMinutes}m
                        </div>
                        <div className="flex items-center gap-1.5 text-small text-white/40">
                          <Cpu className="w-3.5 h-3.5" />
                          {scenario.operatorProfile}
                        </div>
                        {bestScore > 0 && (
                          <div className="flex items-center gap-1.5 text-small text-emerald-400 ml-auto">
                            <Trophy className="w-3.5 h-3.5" />
                            Best: {bestScore}%
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <GlassCard hover={false} className="p-10 text-center">
            <Cpu className="w-12 h-12 text-white/15 mx-auto mb-3" />
            <p className="text-body-lg text-white/50">
              No simulation scenarios available yet
            </p>
            <p className="text-body text-white/30 mt-1">
              Check back soon for new scenarios
            </p>
          </GlassCard>
        )}
      </div>

      {/* Past Runs */}
      {pastRuns.length > 0 && (
        <div>
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/45 mb-4">
            Past Runs
          </h2>
          <GlassCard hover={false} className="divide-y divide-white/5">
            {pastRuns.slice(0, 10).map((run) => (
              <div key={run.id} className="flex items-center gap-4 px-5 py-3.5">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    run.score >= 80
                      ? "bg-emerald-500/20"
                      : run.score >= 60
                        ? "bg-amber-500/20"
                        : "bg-red-500/20"
                  }`}
                >
                  <span
                    className={`text-body font-semibold ${
                      run.score >= 80
                        ? "text-emerald-400"
                        : run.score >= 60
                          ? "text-amber-400"
                          : "text-red-400"
                    }`}
                  >
                    {run.score}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-body text-white/70 truncate">
                    {run.scenarioTitle}
                  </p>
                  <p className="text-micro text-white/35">
                    {new Date(run.createdAt).toLocaleDateString()} ·{" "}
                    {Math.round(run.timeSpent / 60)}m spent
                  </p>
                </div>
                <Link
                  href={`/dashboard/academy/simulations/${run.scenarioId}`}
                  className="text-small text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                >
                  Try Again <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ))}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
