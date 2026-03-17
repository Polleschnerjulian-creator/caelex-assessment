"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  AlertTriangle,
  Loader2,
  TrendingUp,
  HelpCircle,
  Globe,
  FileText,
} from "lucide-react";
import Link from "next/link";
import DownloadReportButton from "./DownloadReportButton";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ─── Old (proposal-based) score types ───

interface ModuleScore {
  score: number;
  weight: number;
  weightedScore: number;
  status: "compliant" | "partial" | "non_compliant" | "not_started";
}

interface Recommendation {
  priority: "critical" | "high" | "medium" | "low";
  module: string;
  action: string;
  impact: string;
  estimatedEffort: "low" | "medium" | "high";
}

interface ComplianceScoreData {
  overall: number;
  grade: "A" | "B" | "C" | "D" | "F";
  status: string;
  breakdown: Record<string, ModuleScore>;
  recommendations: Recommendation[];
}

// ─── New enacted score types ───

interface EnactedModuleScore {
  id: string;
  name: string;
  weight: number;
  score: number;
  maxScore: number;
  enactedBasis: string;
  factors: Array<{
    name: string;
    earnedPoints: number;
    maxPoints: number;
    enactedRef: string;
    euSpaceActRef: string | null;
  }>;
}

interface EnactedScoreData {
  totalScore: number;
  grade: string;
  modules: EnactedModuleScore[];
  euSpaceActReadiness: number;
  disclaimer: string;
}

// ─── Constants ───

const gradeColors: Record<string, string> = {
  A: "from-emerald-500 to-emerald-600 text-white",
  B: "from-green-500 to-green-600 text-white",
  C: "from-amber-500 to-amber-600 text-white",
  D: "from-orange-500 to-orange-600 text-white",
  F: "from-red-500 to-red-600 text-white",
};

const gradeRingColors: Record<string, string> = {
  A: "text-[var(--accent-primary)]",
  B: "text-[var(--accent-success)]",
  C: "text-[var(--accent-warning)]",
  D: "text-orange-500",
  F: "text-[var(--accent-danger)]",
};

const moduleKeyMap: Record<string, string> = {
  authorization: "modules.authorization",
  debris: "modules.debris",
  cybersecurity: "modules.cybersecurity",
  insurance: "modules.insurance",
  environmental: "modules.environmental",
  reporting: "modules.reporting",
};

const statusBarColors: Record<string, string> = {
  compliant: "bg-[var(--accent-success-soft)]0",
  partial: "bg-[var(--accent-warning)]",
  non_compliant: "bg-[var(--accent-danger)]",
  not_started: "bg-[var(--fill-medium)]",
};

const priorityColors: Record<string, string> = {
  critical:
    "bg-[var(--accent-danger-soft)] text-[var(--accent-danger)] border-[var(--accent-danger)/30]",
  high: "bg-[var(--accent-warning)]/20 text-[var(--accent-warning)] border-amber-500/30",
  medium:
    "bg-[var(--accent-success-soft)] text-[var(--accent-primary)] border-[var(--accent-success)/30]",
  low: "bg-[var(--fill-medium)] text-[var(--text-secondary)] border-[var(--border-default)]",
};

/** Map enacted module score (0-100) to a status string for the bar color. */
function enactedScoreToStatus(score: number): string {
  if (score >= 75) return "compliant";
  if (score >= 40) return "partial";
  if (score > 0) return "non_compliant";
  return "not_started";
}

/** Color for the EU Space Act readiness ring based on percentage. */
function readinessColor(pct: number): string {
  if (pct >= 70) return "text-[var(--accent-success)]";
  if (pct >= 40) return "text-[var(--accent-warning)]";
  return "text-[var(--accent-danger)]";
}

export default function ComplianceScoreCard() {
  const { t } = useLanguage();

  // Old proposal-based score (fallback)
  const [data, setData] = useState<ComplianceScoreData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // New enacted compliance score (primary)
  const [enactedScore, setEnactedScore] = useState<EnactedScoreData | null>(
    null,
  );
  const [enactedLoading, setEnactedLoading] = useState(true);

  // Fetch both scores in parallel
  useEffect(() => {
    async function fetchScores() {
      const [oldResult, enactedResult] = await Promise.allSettled([
        fetch("/api/dashboard/compliance-score").then((res) =>
          res.ok ? res.json() : null,
        ),
        fetch("/api/dashboard/enacted-compliance-score").then((res) =>
          res.ok ? res.json() : null,
        ),
      ]);

      // Old score
      if (oldResult.status === "fulfilled" && oldResult.value) {
        setData(oldResult.value);
      } else {
        setError(true);
      }
      setLoading(false);

      // Enacted score
      if (enactedResult.status === "fulfilled" && enactedResult.value) {
        setEnactedScore(enactedResult.value);
      }
      setEnactedLoading(false);
    }
    fetchScores();
  }, []);

  const isLoading = loading || enactedLoading;

  if (isLoading) {
    return (
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        className="glass-elevated rounded-[var(--radius-lg)] p-6 mb-8"
      >
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-[var(--text-tertiary)] animate-spin" />
        </div>
      </motion.div>
    );
  }

  // If we have neither score, hide entirely
  if (!enactedScore && (error || !data)) {
    return null;
  }

  // ─── Render: Enacted score is primary when available ───

  // Determine which values to display as primary
  const primaryScore = enactedScore?.totalScore ?? data?.overall ?? 0;
  const primaryGrade = enactedScore?.grade ?? data?.grade ?? "F";

  // Collect enacted basis labels for the subtitle
  const enactedBasisList = enactedScore
    ? [...new Set(enactedScore.modules.map((m) => m.enactedBasis))]
    : [];

  const topRecommendations = data?.recommendations?.slice(0, 3) ?? [];

  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1, y: 0 }}
      className="glass-elevated rounded-[var(--radius-lg)] p-6 mb-8"
    >
      {/* ─── Header ─── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[var(--accent-primary)]" />
          <h2 className="text-caption uppercase tracking-[0.2em] text-[var(--text-secondary)]">
            {enactedScore
              ? "Enacted Compliance Score"
              : t("dashboard.complianceScore")}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <DownloadReportButton />
          <Link
            href="/dashboard/compliance-methodology"
            className="flex items-center gap-1 text-caption text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <HelpCircle className="w-3 h-3" />
            <span>{t("dashboard.methodology")}</span>
          </Link>
          <div className="flex items-center gap-1 text-caption text-[var(--text-tertiary)]">
            <TrendingUp className="w-3 h-3" />
            <span>{t("dashboard.updatedLive")}</span>
          </div>
        </div>
      </div>

      {/* ─── Primary: Enacted compliance score (or fallback to old) ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_1fr] gap-8">
        {/* Left: Grade + Score */}
        <div className="flex items-center gap-5">
          <div className="relative">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${gradeColors[primaryGrade] || gradeColors.F} flex items-center justify-center shadow-lg`}
            >
              <span className="text-display font-medium leading-none">
                {primaryGrade}
              </span>
            </div>
            <svg
              className={`absolute inset-0 w-20 h-20 -rotate-90 ${gradeRingColors[primaryGrade] || gradeRingColors.F}`}
            >
              <circle
                cx="40"
                cy="40"
                r="36"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(primaryScore / 100) * 226} 226`}
                strokeLinecap="round"
                opacity={0.3}
              />
            </svg>
          </div>
          <div>
            <p className="text-[36px] font-semibold text-[var(--text-primary)] leading-none">
              {primaryScore}
            </p>
            <p className="text-caption text-[var(--text-secondary)] mt-1">
              {t("dashboard.outOf100")}
            </p>
            {enactedBasisList.length > 0 && (
              <p className="text-micro text-[var(--text-tertiary)] mt-1.5 leading-relaxed">
                Based on: {enactedBasisList.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Center: Module Breakdown */}
        <div className="space-y-2.5">
          {enactedScore
            ? // Enacted module breakdown (primary)
              enactedScore.modules.map((mod) => (
                <div key={mod.id} className="flex items-center gap-3">
                  <span className="text-caption text-[var(--text-secondary)] w-28 truncate">
                    {mod.name}
                  </span>
                  <div className="flex-1 h-1.5 bg-[var(--fill-medium)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${statusBarColors[enactedScoreToStatus(mod.score)]}`}
                      style={{ width: `${mod.score}%` }}
                    />
                  </div>
                  <span className="text-caption text-[var(--text-secondary)] w-8 text-right">
                    {mod.score}
                  </span>
                </div>
              ))
            : // Fallback: old proposal-based breakdown
              data &&
              Object.entries(data.breakdown).map(([key, mod]) => (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-caption text-[var(--text-secondary)] w-28 truncate">
                    {t(moduleKeyMap[key] || `modules.${key}`)}
                  </span>
                  <div className="flex-1 h-1.5 bg-[var(--fill-medium)] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${statusBarColors[mod.status]}`}
                      style={{ width: `${mod.score}%` }}
                    />
                  </div>
                  <span className="text-caption text-[var(--text-secondary)] w-8 text-right">
                    {mod.score}
                  </span>
                </div>
              ))}
        </div>

        {/* Right: Top Recommendations */}
        <div>
          <p className="text-micro font-medium uppercase tracking-wider text-[var(--text-secondary)] mb-2">
            {t("dashboard.topRecommendations")}
          </p>
          {topRecommendations.length > 0 ? (
            <div className="space-y-2">
              {topRecommendations.map((rec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-2 text-caption leading-snug"
                >
                  <span
                    className={`shrink-0 mt-0.5 text-[8px] uppercase px-1.5 py-0.5 rounded border ${priorityColors[rec.priority]}`}
                  >
                    {t(`common.${rec.priority}`)}
                  </span>
                  <span className="text-[var(--text-secondary)]">
                    {rec.action}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-caption text-[var(--accent-primary)]/70">
              <AlertTriangle className="w-3 h-3" />
              <span>{t("dashboard.allOnTrack")}</span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Secondary: EU Space Act Readiness (only shown when enacted score is available) ─── */}
      {enactedScore && (
        <div className="mt-6 pt-5 border-t border-[var(--border-default)]">
          <div className="flex items-center gap-4">
            {/* Mini ring for readiness */}
            <div className="relative flex-shrink-0">
              <svg
                width="44"
                height="44"
                className={`-rotate-90 ${readinessColor(enactedScore.euSpaceActReadiness)}`}
              >
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  opacity={0.15}
                />
                <circle
                  cx="22"
                  cy="22"
                  r="18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeDasharray={`${(enactedScore.euSpaceActReadiness / 100) * 113} 113`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <Globe className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-body font-semibold text-[var(--text-primary)]">
                  EU Space Act Readiness: {enactedScore.euSpaceActReadiness}%
                </p>
                <span className="text-micro px-1.5 py-0.5 rounded bg-[var(--fill-medium)] text-[var(--text-tertiary)] border border-[var(--border-default)]">
                  Proposal
                </span>
              </div>
              <p className="text-caption text-[var(--text-tertiary)] mt-0.5">
                COM(2025) 335 &middot; Legislative Proposal
              </p>
            </div>

            <Link
              href="/dashboard/modules/authorization"
              className="flex items-center gap-1 text-caption text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors flex-shrink-0"
            >
              <FileText className="w-3 h-3" />
              <span>Details</span>
            </Link>
          </div>

          {/* Disclaimer */}
          {enactedScore.disclaimer && (
            <p className="text-micro text-[var(--text-tertiary)] mt-3 leading-relaxed opacity-70">
              {enactedScore.disclaimer}
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
