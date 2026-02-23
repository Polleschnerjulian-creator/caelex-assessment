"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Shield,
  TrendingUp,
  Share2,
  Package,
  ChevronRight,
  Loader2,
  BarChart3,
  ExternalLink,
  Clock,
  FileText,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import GlassCard from "@/components/ui/GlassCard";

// Dynamic import for the gauge (uses SVG animations)
const RRSGauge = dynamic(() => import("@/components/assure/RRSGauge"), {
  ssr: false,
  loading: () => (
    <div className="w-[200px] h-[170px] flex items-center justify-center">
      <Loader2 className="w-6 h-6 text-slate-300 dark:text-white/20 animate-spin" />
    </div>
  ),
});

// ─── Types ───

interface RRSComponentScore {
  score: number;
  weight: number;
  weightedScore: number;
  factors: Array<{
    name: string;
    maxPoints: number;
    earnedPoints: number;
  }>;
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
  recommendations: Array<{
    priority: string;
    component: string;
    action: string;
    impact: string;
  }>;
  computedAt: string;
}

interface QuickStat {
  label: string;
  value: string | number;
  icon: typeof Shield;
  color: string;
  href: string;
}

// ─── Constants ───

const COMPONENT_LABELS: Record<string, string> = {
  authorizationReadiness: "Authorization",
  cybersecurityPosture: "Cybersecurity",
  operationalCompliance: "Operations",
  jurisdictionalCoverage: "Jurisdictional",
  regulatoryTrajectory: "Trajectory",
  governanceProcess: "Governance",
};

// ─── Loading Skeleton ───

function AssureSkeleton() {
  return (
    <div
      className="animate-pulse space-y-6"
      role="status"
      aria-live="polite"
      aria-label="Loading Assure dashboard"
    >
      <div className="h-8 bg-slate-200 dark:bg-white/5 rounded w-64" />
      <div className="h-4 bg-slate-200 dark:bg-white/5 rounded w-96" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="lg:col-span-1 h-[300px] bg-slate-200 dark:bg-white/5 rounded-xl" />
        <div className="lg:col-span-2 h-[300px] bg-slate-200 dark:bg-white/5 rounded-xl" />
      </div>
      <div className="grid grid-cols-3 gap-5 mt-6">
        {[...Array(3)].map((_, i) => (
          <div
            key={i}
            className="h-24 bg-slate-200 dark:bg-white/5 rounded-xl"
          />
        ))}
      </div>
      <span className="sr-only">Loading Assure dashboard data...</span>
    </div>
  );
}

// ─── Main Component ───

export default function AssureDashboardPage() {
  const [rrsData, setRrsData] = useState<RRSData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [shareCount, setShareCount] = useState(0);
  const [packageCount, setPackageCount] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [scoreRes, shareRes, pkgRes] = await Promise.all([
          fetch("/api/assure/score"),
          fetch("/api/assure/share").catch(() => null),
          fetch("/api/assure/dd-package").catch(() => null),
        ]);

        if (scoreRes.ok) {
          const data = await scoreRes.json();
          setRrsData(data);
        } else {
          setError("Unable to load RRS data. Please try again.");
        }

        if (shareRes?.ok) {
          const data = await shareRes.json();
          setShareCount(Array.isArray(data) ? data.length : 0);
        }

        if (pkgRes?.ok) {
          const data = await pkgRes.json();
          setPackageCount(Array.isArray(data) ? data.length : 0);
        }
      } catch (err) {
        setError("Failed to connect to the server.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) return <AssureSkeleton />;

  if (error || !rrsData) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mb-4">
          <AlertTriangle className="w-6 h-6 text-red-500 dark:text-red-400" />
        </div>
        <h2 className="text-title font-medium text-slate-900 dark:text-white mb-2">
          {error || "Unable to load data"}
        </h2>
        <p className="text-body text-slate-500 dark:text-white/45 mb-4">
          Make sure your organization profile is set up and compliance modules
          are configured.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="text-small text-emerald-500 hover:text-emerald-400 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Determine top recommendations
  const criticalRecs = rrsData.recommendations.filter(
    (r) => r.priority === "critical" || r.priority === "high",
  );

  // Quick stats
  const quickStats: QuickStat[] = [
    {
      label: "Detailed Score",
      value: "View Breakdown",
      icon: BarChart3,
      color: "text-emerald-500",
      href: "/dashboard/assure/score",
    },
    {
      label: "Share Links",
      value: shareCount,
      icon: Share2,
      color: "text-cyan-500",
      href: "/dashboard/assure/share",
    },
    {
      label: "DD Packages",
      value: packageCount,
      icon: Package,
      color: "text-purple-500",
      href: "/dashboard/assure/packages",
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 mb-1"
        >
          <Shield className="w-5 h-5 text-emerald-500" />
          <span className="text-caption uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-medium">
            Assure
          </span>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-display font-medium text-slate-900 dark:text-white mb-1"
        >
          Regulatory Readiness
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-body-lg text-slate-500 dark:text-white/45"
        >
          Your compliance posture at a glance. Share with investors, track
          progress, and generate DD packages.
        </motion.p>
      </div>

      {/* Main content: Gauge + Component overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Gauge card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <GlassCard hover={false} highlighted className="p-6 h-full">
            <div className="flex flex-col items-center justify-center h-full">
              <RRSGauge
                score={rrsData.overallScore}
                grade={rrsData.grade}
                size={200}
              />
              <div className="mt-4 text-center">
                <p className="text-micro text-slate-400 dark:text-white/30">
                  Last computed{" "}
                  {new Date(rrsData.computedAt).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </GlassCard>
        </motion.div>

        {/* Component quick view */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-2"
        >
          <GlassCard hover={false} className="p-6 h-full">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
                Component Scores
              </h2>
              <Link
                href="/dashboard/assure/score"
                className="text-caption text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-4">
              {Object.entries(rrsData.components).map(([key, comp], index) => {
                const label = COMPONENT_LABELS[key] || key;
                const scoreColor =
                  comp.score >= 80
                    ? "text-green-500 dark:text-green-400"
                    : comp.score >= 60
                      ? "text-amber-500 dark:text-amber-400"
                      : "text-red-500 dark:text-red-400";
                const barColor =
                  comp.score >= 80
                    ? "bg-green-500"
                    : comp.score >= 60
                      ? "bg-amber-500"
                      : "bg-red-500";

                return (
                  <motion.div
                    key={key}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.25 + index * 0.05 }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-small text-slate-700 dark:text-white/60 w-28 truncate">
                        {label}
                      </span>
                      <div className="flex-1 relative h-2 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          className={`absolute inset-y-0 left-0 rounded-full ${barColor}`}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${comp.score}%`,
                          }}
                          transition={{
                            duration: 0.8,
                            delay: 0.3 + index * 0.05,
                            ease: "easeOut",
                          }}
                        />
                      </div>
                      <span
                        className={`text-body font-semibold w-8 text-right ${scoreColor}`}
                      >
                        {comp.score}
                      </span>
                      <span className="text-micro text-slate-400 dark:text-white/30 w-10 text-right">
                        {Math.round(comp.weight * 100)}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Quick navigation cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {quickStats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + index * 0.08 }}
            >
              <Link href={stat.href}>
                <GlassCard className="p-5 group cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 dark:bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Icon className={`w-5 h-5 ${stat.color}`} />
                      </div>
                      <div>
                        <p className="text-body-lg font-semibold text-slate-800 dark:text-white">
                          {stat.value}
                        </p>
                        <p className="text-caption text-slate-500 dark:text-white/45">
                          {stat.label}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 dark:text-white/20 group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors" />
                  </div>
                </GlassCard>
              </Link>
            </motion.div>
          );
        })}
      </div>

      {/* Priority Recommendations */}
      {criticalRecs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <GlassCard hover={false} className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-caption uppercase tracking-[0.2em] text-slate-500 dark:text-white/45">
                Priority Actions
              </h2>
              <Link
                href="/dashboard/assure/score"
                className="text-caption text-emerald-500 hover:text-emerald-400 flex items-center gap-1 transition-colors"
              >
                View All
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-2">
              {criticalRecs.slice(0, 5).map((rec, i) => {
                const priorityColor =
                  rec.priority === "critical"
                    ? "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20"
                    : "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";

                return (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5"
                  >
                    <span
                      className={`inline-flex px-2 py-0.5 rounded border text-micro font-medium flex-shrink-0 mt-0.5 ${priorityColor}`}
                    >
                      {rec.priority.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="text-body text-slate-700 dark:text-white/70">
                        {rec.action}
                      </p>
                      <p className="text-small text-slate-400 dark:text-white/30 mt-0.5">
                        {rec.impact}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
