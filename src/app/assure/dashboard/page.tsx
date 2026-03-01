"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  Building2,
  TrendingUp,
  ShieldAlert,
  FileText,
  FolderLock,
  BarChart3,
  ArrowRight,
  Activity,
} from "lucide-react";
import GlassCard from "@/components/ui/GlassCard";
import IRSScoreGauge from "@/components/assure/IRSScoreGauge";
import IRSScoreBadge from "@/components/assure/IRSScoreBadge";
import ProfileCompletenessRing from "@/components/assure/ProfileCompletenessRing";
import NextStepsCard from "@/components/assure/NextStepsCard";

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
  }>;
}

interface CompletenessData {
  overall: number;
  sections: Array<{ name: string; completion: number }>;
}

// ─── Quick Links ───

const QUICK_LINKS = [
  {
    href: "/assure/profile",
    icon: Building2,
    label: "Company Profile",
    color: "text-blue-400",
  },
  {
    href: "/assure/score",
    icon: TrendingUp,
    label: "IRS Score",
    color: "text-emerald-400",
  },
  {
    href: "/assure/risks",
    icon: ShieldAlert,
    label: "Risk Intelligence",
    color: "text-amber-400",
  },
  {
    href: "/assure/materials",
    icon: FileText,
    label: "Materials",
    color: "text-purple-400",
  },
  {
    href: "/assure/dataroom",
    icon: FolderLock,
    label: "Data Room",
    color: "text-cyan-400",
  },
  {
    href: "/assure/benchmarks",
    icon: BarChart3,
    label: "Benchmarks",
    color: "text-pink-400",
  },
];

// ─── Skeleton ───

function DashboardSkeleton() {
  return (
    <div
      className="animate-pulse space-y-8"
      role="status"
      aria-label="Loading dashboard"
    >
      <div className="h-10 bg-white/5 rounded-lg w-1/3" />
      <div className="h-5 bg-white/5 rounded w-1/2" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <div className="h-[320px] bg-white/5 rounded-xl" />
        <div className="h-[320px] bg-white/5 rounded-xl" />
        <div className="h-[320px] bg-white/5 rounded-xl" />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl" />
        ))}
      </div>
      <span className="sr-only">Loading dashboard...</span>
    </div>
  );
}

// ─── Component ───

export default function AssureDashboardPage() {
  const [score, setScore] = useState<ScoreData | null>(null);
  const [completeness, setCompleteness] = useState<CompletenessData | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [scoreRes, completenessRes] = await Promise.all([
          fetch("/api/assure/score/current").catch(() => null),
          fetch("/api/assure/profile/completeness").catch(() => null),
        ]);

        if (scoreRes?.ok) {
          const data = await scoreRes.json();
          setScore(data);
        }

        if (completenessRes?.ok) {
          const data = await completenessRes.json();
          setCompleteness(data);
        }
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
        setError("Failed to load some data.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  if (loading) {
    return <DashboardSkeleton />;
  }

  const displayScore = score?.score ?? 0;
  const displayGrade = score?.grade ?? "N/A";
  const improvements = score?.improvements ?? [];
  const sections = completeness?.sections ?? [];

  return (
    <div>
      {/* Header */}
      <div className="mb-10">
        <motion.h1
          initial={false}
          animate={{ opacity: 1 }}
          className="text-display font-bold text-white mb-2"
        >
          Assure Dashboard
        </motion.h1>
        <motion.p
          initial={false}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
          className="text-body-lg text-white/40"
        >
          Your investment readiness at a glance.
        </motion.p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-small text-amber-400">{error}</p>
        </div>
      )}

      {/* Main KPI Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
        {/* IRS Score */}
        <GlassCard
          hover={false}
          highlighted={displayScore >= 80}
          className="p-8"
        >
          <div className="flex flex-col items-center">
            <h2 className="text-caption uppercase tracking-[0.2em] text-white/40 mb-5">
              Investment Readiness Score
            </h2>
            <IRSScoreGauge
              score={displayScore}
              grade={displayGrade}
              size={240}
            />
            <div className="mt-4">
              <IRSScoreBadge grade={displayGrade} size="md" showLabel />
            </div>
          </div>
        </GlassCard>

        {/* Profile Completeness */}
        <GlassCard hover={false} className="p-8">
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/40 mb-5 text-center">
            Profile Completeness
          </h2>
          <ProfileCompletenessRing sections={sections} />
          <div className="mt-4 text-center">
            <Link
              href="/assure/profile"
              className="text-small text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1 transition-colors"
            >
              Complete Profile <ArrowRight size={12} />
            </Link>
          </div>
        </GlassCard>

        {/* Next Steps */}
        <div>
          <NextStepsCard steps={improvements.slice(0, 5)} />
        </div>
      </div>

      {/* Quick Links */}
      <div className="mb-10">
        <h2 className="text-caption uppercase tracking-[0.2em] text-white/40 mb-4">
          Quick Links
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {QUICK_LINKS.map((link, index) => {
            const Icon = link.icon;
            return (
              <motion.div
                key={link.href}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04 }}
              >
                <Link href={link.href}>
                  <GlassCard className="p-4 text-center">
                    <Icon size={20} className={`${link.color} mx-auto mb-2`} />
                    <span className="text-small text-white/60">
                      {link.label}
                    </span>
                  </GlassCard>
                </Link>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Score Components */}
      {score?.components && Object.keys(score.components).length > 0 && (
        <div className="mb-10">
          <h2 className="text-caption uppercase tracking-[0.2em] text-white/40 mb-4">
            Score Components
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {Object.entries(score.components).map(([key, value], index) => (
              <motion.div
                key={key}
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.04 }}
              >
                <GlassCard hover={false} className="p-4 text-center">
                  <p className="text-display-sm font-bold text-white">
                    {value}
                  </p>
                  <p className="text-micro text-white/30 uppercase tracking-wider mt-1 capitalize">
                    {key.replace(/_/g, " ")}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state for no score */}
      {!score && (
        <GlassCard hover={false} className="p-10 text-center">
          <Activity size={32} className="text-white/15 mx-auto mb-4" />
          <h3 className="text-heading font-semibold text-white mb-2">
            No Score Computed Yet
          </h3>
          <p className="text-body text-white/40 mb-6 max-w-md mx-auto">
            Complete your company profile and compute your Investment Readiness
            Score to see detailed analytics here.
          </p>
          <Link
            href="/assure/profile"
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-medium text-body px-6 py-2.5 rounded-lg transition-all inline-flex items-center gap-2"
          >
            Complete Profile
            <ArrowRight size={16} />
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
