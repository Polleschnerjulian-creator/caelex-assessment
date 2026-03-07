"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  ArrowLeft,
  Info,
  BookOpen,
} from "lucide-react";
import dynamic from "next/dynamic";
import GlassCard from "@/components/ui/GlassCard";

// Dynamic imports for chart components
const RRSGauge = dynamic(() => import("@/components/assure/RRSGauge"), {
  ssr: false,
  loading: () => (
    <div className="w-[180px] h-[153px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-[var(--text-tertiary)] animate-spin" />
    </div>
  ),
});

const RRSComponentBreakdown = dynamic(
  () => import("@/components/assure/RRSComponentBreakdown"),
  {
    ssr: false,
    loading: () => (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="h-20 bg-[var(--surface-sunken)] rounded-xl animate-pulse"
          />
        ))}
      </div>
    ),
  },
);

const RRSTrendChart = dynamic(
  () => import("@/components/assure/RRSTrendChart"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[340px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-[var(--text-tertiary)] animate-spin" />
      </div>
    ),
  },
);

// ─── Types ───

interface RRSFactor {
  name: string;
  maxPoints: number;
  earnedPoints: number;
}

interface RRSComponentScore {
  score: number;
  weight: number;
  weightedScore: number;
  factors: RRSFactor[];
}

interface RRSRecommendation {
  priority: string;
  component: string;
  action: string;
  impact: string;
}

interface RRSData {
  overallScore: number;
  grade: string;
  status: string;
  components: {
    authorizationReadiness: RRSComponentScore;
    cybersecurityPosture: RRSComponentScore;
    operationalCompliance: RRSComponentScore;
    jurisdictionalCoverage: RRSComponentScore;
    regulatoryTrajectory: RRSComponentScore;
    governanceProcess: RRSComponentScore;
  };
  recommendations: RRSRecommendation[];
  methodology: {
    version: string;
    weights: Record<string, number>;
    description: string;
  };
  computedAt: string;
}

interface TrendDataPoint {
  date: string;
  overallScore: number;
  authorizationReadiness: number;
  cybersecurityPosture: number;
  operationalCompliance: number;
  jurisdictionalCoverage: number;
  regulatoryTrajectory: number;
  governanceProcess: number;
  [key: string]: number | string;
}

// ─── Constants ───

const COMPONENT_LABELS: Record<string, string> = {
  authorizationReadiness: "Authorization Readiness",
  cybersecurityPosture: "Cybersecurity Posture",
  operationalCompliance: "Operational Compliance",
  jurisdictionalCoverage: "Multi-Jurisdictional Coverage",
  regulatoryTrajectory: "Regulatory Trajectory",
  governanceProcess: "Governance & Process",
};

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border-[var(--accent-danger)]/10";
    case "high":
      return "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)] border-[var(--accent-warning)]";
    case "medium":
      return "bg-yellow-50 text-yellow-600 border-yellow-200";
    default:
      return "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border-[var(--border-default)]";
  }
}

// ─── Loading Skeleton ───

function ScoreSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading score details"
    >
      <div className="h-6 bg-[var(--surface-sunken)] rounded w-48" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="h-[260px] bg-[var(--surface-sunken)] rounded-xl" />
        <div className="lg:col-span-2 h-[260px] bg-[var(--surface-sunken)] rounded-xl" />
      </div>
      <div className="h-[340px] bg-[var(--surface-sunken)] rounded-xl" />
      <div className="h-[200px] bg-[var(--surface-sunken)] rounded-xl" />
      <span className="sr-only">Loading score details...</span>
    </div>
  );
}

// ─── Main Component ───

export default function AssureScorePage() {
  const [rrsData, setRrsData] = useState<RRSData | null>(null);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [trendPeriod, setTrendPeriod] = useState<"30d" | "90d" | "365d">("90d");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [methodologyOpen, setMethodologyOpen] = useState(false);

  const fetchScore = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/assure/score");
      if (res.ok) {
        const data = await res.json();
        setRrsData(data);
        setError(null);
      } else {
        setError("Unable to load RRS data.");
      }
    } catch {
      setError("Failed to connect to the server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchTrend = useCallback(async (period: "30d" | "90d" | "365d") => {
    try {
      const res = await fetch(`/api/assure/score/history?period=${period}`);
      if (res.ok) {
        const data = await res.json();
        setTrendData(data);
      }
    } catch {
      // Trend data is optional, fail silently
    }
  }, []);

  useEffect(() => {
    fetchScore();
  }, [fetchScore]);

  useEffect(() => {
    fetchTrend(trendPeriod);
  }, [trendPeriod, fetchTrend]);

  const handlePeriodChange = (period: "30d" | "90d" | "365d") => {
    setTrendPeriod(period);
  };

  if (loading) return <ScoreSkeleton />;

  if (error || !rrsData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-[var(--accent-danger-soft)]/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-[var(--accent-danger)]" />
        </div>
        <h2 className="text-title font-medium text-[var(--text-primary)] mb-2">
          {error || "Unable to load data"}
        </h2>
        <button
          onClick={() => {
            setLoading(true);
            fetchScore();
          }}
          className="text-small text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors mt-2"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb + Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/assure"
          className="inline-flex items-center gap-1 text-small text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Assure
        </Link>

        <div className="flex items-center justify-between">
          <div>
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 mb-1"
            >
              <Shield className="w-5 h-5 text-[var(--accent-primary)]" />
              <h1 className="text-display-sm font-medium text-[var(--text-primary)]">
                RRS Score Details
              </h1>
            </motion.div>
            <motion.p
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.05 }}
              className="text-body text-[var(--text-secondary)]"
            >
              Full breakdown of your Regulatory Readiness Score across all 6
              compliance dimensions.
            </motion.p>
          </div>

          <button
            onClick={() => fetchScore(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 bg-[var(--surface-sunken)] text-[var(--text-secondary)] text-small font-medium px-3 py-2 rounded-lg hover:bg-[var(--surface-sunken)] transition-all disabled:opacity-50"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* Score + Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gauge */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <GlassCard hover={false} highlighted className="p-6 h-full">
            <div className="flex flex-col items-center justify-center h-full">
              <RRSGauge
                score={rrsData.overallScore}
                grade={rrsData.grade}
                size={180}
              />
              <p className="text-micro text-[var(--text-tertiary)] mt-3">
                Methodology v{rrsData.methodology.version}
              </p>
            </div>
          </GlassCard>
        </motion.div>

        {/* Quick stats */}
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="lg:col-span-2"
        >
          <GlassCard hover={false} className="p-6 h-full">
            <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
              Score Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {Object.entries(rrsData.components).map(([key, comp]) => {
                const label = COMPONENT_LABELS[key] || key;
                const scoreColor =
                  comp.score >= 80
                    ? "text-[var(--accent-success)]"
                    : comp.score >= 60
                      ? "text-[var(--accent-warning)]"
                      : "text-[var(--accent-danger)]";

                return (
                  <div
                    key={key}
                    className="bg-[var(--surface-sunken)] rounded-xl p-4"
                  >
                    <div
                      className={`text-display-sm font-semibold ${scoreColor}`}
                    >
                      {comp.score}
                    </div>
                    <div className="text-micro text-[var(--text-secondary)] mt-1 leading-tight">
                      {label}
                    </div>
                    <div className="text-micro text-[var(--text-tertiary)] mt-0.5">
                      {Math.round(comp.weight * 100)}% weight &middot;{" "}
                      {comp.weightedScore} weighted
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 flex items-center gap-2 text-micro text-[var(--text-tertiary)]">
              <Info className="w-3.5 h-3.5" />
              Last computed{" "}
              {new Date(rrsData.computedAt).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Component Breakdown */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
          Component Breakdown
        </h2>
        <RRSComponentBreakdown components={rrsData.components} />
      </motion.div>

      {/* Trend Chart */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <GlassCard hover={false} className="p-6">
          <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
            Score Trend
          </h2>
          <RRSTrendChart
            data={trendData}
            period={trendPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </GlassCard>
      </motion.div>

      {/* Recommendations */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mb-8"
      >
        <GlassCard hover={false} className="p-6">
          <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)] mb-4">
            Recommendations
          </h2>

          {rrsData.recommendations.length > 0 ? (
            <div className="space-y-2">
              {rrsData.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg bg-[var(--surface-sunken)]"
                >
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded border text-micro font-medium flex-shrink-0 mt-0.5 ${getPriorityColor(rec.priority)}`}
                  >
                    {rec.priority.toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-body text-[var(--text-secondary)]">
                      {rec.action}
                    </p>
                    <p className="text-small text-[var(--text-tertiary)] mt-0.5">
                      {rec.impact} &middot;{" "}
                      {COMPONENT_LABELS[rec.component] || rec.component}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-body text-[var(--text-secondary)]">
                No recommendations at this time. Your compliance posture is
                strong.
              </p>
            </div>
          )}
        </GlassCard>
      </motion.div>

      {/* Methodology (Collapsible) */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <GlassCard hover={false} className="overflow-hidden">
          <button
            onClick={() => setMethodologyOpen(!methodologyOpen)}
            className="w-full flex items-center justify-between p-6 text-left"
            aria-expanded={methodologyOpen}
            aria-controls="methodology-content"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-5 h-5 text-[var(--text-tertiary)]" />
              <div>
                <h2 className="text-body-lg font-medium text-[var(--text-primary)]">
                  Methodology
                </h2>
                <p className="text-small text-[var(--text-tertiary)]">
                  How the Regulatory Readiness Score is computed
                </p>
              </div>
            </div>
            {methodologyOpen ? (
              <ChevronUp className="w-5 h-5 text-[var(--text-tertiary)]" />
            ) : (
              <ChevronDown className="w-5 h-5 text-[var(--text-tertiary)]" />
            )}
          </button>

          <AnimatePresence>
            {methodologyOpen && (
              <motion.div
                id="methodology-content"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                <div className="px-6 pb-6 border-t border-[var(--border-subtle)] pt-4">
                  <p className="text-body text-[var(--text-secondary)] mb-6 leading-relaxed">
                    {rrsData.methodology.description}
                  </p>

                  <h3 className="text-small font-medium text-[var(--text-secondary)] mb-3">
                    Component Weights
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                    {Object.entries(rrsData.methodology.weights).map(
                      ([key, weight]) => (
                        <div
                          key={key}
                          className="flex items-center justify-between bg-[var(--surface-sunken)] rounded-lg px-3 py-2"
                        >
                          <span className="text-small text-[var(--text-secondary)]">
                            {COMPONENT_LABELS[key] ||
                              key.replace(/([A-Z])/g, " $1").trim()}
                          </span>
                          <span className="text-body font-medium text-[var(--text-primary)]">
                            {Math.round((weight as number) * 100)}%
                          </span>
                        </div>
                      ),
                    )}
                  </div>

                  <h3 className="text-small font-medium text-[var(--text-secondary)] mb-3">
                    Grading Scale
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {[
                      {
                        grade: "A",
                        range: "90-100",
                        color:
                          "bg-[var(--accent-success-soft)] text-[var(--accent-success)] border-[var(--accent-success)]/10",
                      },
                      {
                        grade: "B",
                        range: "80-89",
                        color:
                          "bg-[var(--accent-success-soft)] text-[var(--accent-success)] border-[var(--accent-success)]",
                      },
                      {
                        grade: "C",
                        range: "70-79",
                        color:
                          "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)] border-[var(--accent-warning)]",
                      },
                      {
                        grade: "D",
                        range: "60-69",
                        color: "bg-orange-50 text-orange-700 border-orange-200",
                      },
                      {
                        grade: "F",
                        range: "0-59",
                        color:
                          "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border-[var(--accent-danger)]/10",
                      },
                    ].map((g) => (
                      <span
                        key={g.grade}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-small font-medium ${g.color}`}
                      >
                        <span className="font-bold">{g.grade}</span>
                        <span className="opacity-70">{g.range}</span>
                      </span>
                    ))}
                  </div>

                  <div className="mt-6 p-3 bg-[var(--surface-sunken)] rounded-lg">
                    <p className="text-micro text-[var(--text-tertiary)]">
                      The RRS is fully deterministic: identical input data
                      always produces the same score. No randomness or external
                      API calls are used. Scores are computed daily at 07:00 UTC
                      and historical snapshots are retained for trend analysis.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </motion.div>
    </div>
  );
}
