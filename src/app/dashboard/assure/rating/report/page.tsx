"use client";

import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  Shield,
  AlertTriangle,
  BarChart3,
  FileText,
} from "lucide-react";
import Link from "next/link";
import GlassCard from "@/components/ui/GlassCard";
import RCRGradeBadge from "@/components/assure/RCRGradeBadge";
import RCROutlookIndicator from "@/components/assure/RCROutlookIndicator";
import RatingWatchBanner from "@/components/assure/RatingWatchBanner";
import PeerBenchmarkChart from "@/components/assure/PeerBenchmarkChart";
import RatingActionTimeline from "@/components/assure/RatingActionTimeline";

interface ComponentScore {
  component: string;
  weight: number;
  rawScore: number;
  adjustedScore: number;
  weightedScore: number;
  dataCompleteness: number;
  keyFindings: string[];
  risks: RiskItem[];
}

interface RiskItem {
  id: string;
  description: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  likelihood: "VERY_LIKELY" | "LIKELY" | "POSSIBLE" | "UNLIKELY";
  mitigationStatus: "UNADDRESSED" | "IN_PROGRESS" | "MITIGATED";
  regulatoryReference: string;
}

interface Rating {
  id: string;
  grade: string;
  previousGrade?: string;
  numericScore: number;
  outlook: "POSITIVE" | "STABLE" | "NEGATIVE" | "DEVELOPING";
  onWatch: boolean;
  watchReason?: string;
  confidence: number;
  validUntil: string;
  peerPercentile?: number;
  componentScores: ComponentScore[];
  riskRegister: RiskItem[];
  actionType: string;
  actionRationale?: string;
  computedAt: string;
  isPublished: boolean;
}

interface Benchmark {
  count: number;
  meanScore: number;
  medianScore: number;
  p25Score: number;
  p75Score: number;
  gradeDistribution: Record<string, number>;
}

const COMPONENT_LABELS: Record<string, string> = {
  authorizationReadiness: "Authorization Readiness",
  cybersecurityPosture: "Cybersecurity Posture",
  operationalCompliance: "Operational Compliance",
  jurisdictionalCoverage: "Multi-Jurisdictional Coverage",
  regulatoryTrajectory: "Regulatory Trajectory",
  governanceProcess: "Governance & Process",
};

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL:
    "bg-[var(--accent-danger)]/10 text-[var(--accent-danger)] border-[var(--accent-danger)]/20",
  HIGH: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  MEDIUM:
    "bg-[var(--accent-warning-soft)] text-[var(--accent-warning)] border-[var(--accent-warning)/20]",
  LOW: "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border-[var(--accent-primary)/20]",
};

function scoreColor(score: number): string {
  if (score >= 80) return "text-[var(--accent-primary)]";
  if (score >= 60) return "text-[var(--accent-warning)]";
  return "text-[var(--accent-danger)]";
}

function completenessBar(value: number): string {
  if (value >= 0.8) return "bg-[var(--accent-success-soft)]0";
  if (value >= 0.5) return "bg-[var(--accent-warning)]";
  return "bg-[var(--accent-danger)]";
}

export default function RatingReportPage() {
  const [rating, setRating] = useState<Rating | null>(null);
  const [history, setHistory] = useState<Rating[]>([]);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"severity" | "likelihood">("severity");

  const fetchData = useCallback(async () => {
    try {
      const [ratingRes, historyRes, benchmarkRes] = await Promise.all([
        fetch("/api/assure/rcr/current"),
        fetch("/api/assure/rcr/history?limit=20"),
        fetch("/api/assure/rcr/benchmark"),
      ]);

      if (ratingRes.ok) {
        const r = await ratingRes.json();
        setRating(r);
      }
      if (historyRes.ok) {
        const h = await historyRes.json();
        setHistory(h.ratings || h || []);
      }
      if (benchmarkRes.ok) {
        const b = await benchmarkRes.json();
        setBenchmark(b.benchmark || b);
      }
    } catch {
      setError("Failed to load rating report data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sortedRisks = rating?.riskRegister
    ? [...rating.riskRegister].sort((a, b) => {
        const sevOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        const likOrder = {
          VERY_LIKELY: 0,
          LIKELY: 1,
          POSSIBLE: 2,
          UNLIKELY: 3,
        };
        if (sortBy === "severity")
          return (sevOrder[a.severity] ?? 4) - (sevOrder[b.severity] ?? 4);
        return (likOrder[a.likelihood] ?? 4) - (likOrder[b.likelihood] ?? 4);
      })
    : [];

  if (loading) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px] mx-auto space-y-6">
        <div className="h-8 w-48 bg-[var(--surface-sunken)] rounded animate-pulse" />
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-64 bg-[var(--surface-sunken)] rounded-xl animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (error || !rating) {
    return (
      <div className="p-6 lg:p-10 max-w-[1200px] mx-auto">
        <Link
          href="/dashboard/assure/rating"
          className="inline-flex items-center gap-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white mb-6"
        >
          <ArrowLeft size={16} /> Back to Rating
        </Link>
        <GlassCard>
          <div className="p-12 text-center">
            <Shield
              size={48}
              className="mx-auto text-[var(--text-tertiary)] mb-4"
            />
            <h2 className="text-heading font-bold text-[var(--text-primary)] mb-2">
              {error || "No Rating Available"}
            </h2>
            <p className="text-body text-[var(--text-secondary)]">
              Compute your first rating to view the full report.
            </p>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-10 max-w-[1200px] mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/assure/rating"
            className="inline-flex items-center gap-2 text-body text-[var(--text-secondary)] hover:text-[var(--text-primary)]:text-white mb-2"
          >
            <ArrowLeft size={16} /> Back to Rating
          </Link>
          <h1 className="text-display-sm font-bold text-[var(--text-primary)]">
            Rating Report
          </h1>
        </div>
        {rating.id && (
          <a
            href={`/api/assure/rcr/report/${rating.id}/export`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-primary-hover)] text-white rounded-lg text-body font-medium transition-colors"
          >
            <Download size={16} /> Export PDF
          </a>
        )}
      </div>

      <RatingWatchBanner
        onWatch={rating.onWatch}
        watchReason={rating.watchReason}
      />

      {/* Rating Summary */}
      <motion.div initial={false} animate={{ opacity: 1, y: 0 }}>
        <GlassCard highlighted>
          <div className="p-6 flex items-center gap-8">
            <RCRGradeBadge grade={rating.grade} size="xl" showLabel />
            <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-caption text-[var(--text-secondary)]">
                  Numeric Score
                </p>
                <p
                  className={`text-display-sm font-bold ${scoreColor(rating.numericScore)}`}
                >
                  {rating.numericScore}
                </p>
              </div>
              <div>
                <p className="text-caption text-[var(--text-secondary)]">
                  Outlook
                </p>
                <div className="mt-1">
                  <RCROutlookIndicator outlook={rating.outlook} />
                </div>
              </div>
              <div>
                <p className="text-caption text-[var(--text-secondary)]">
                  Confidence
                </p>
                <p className="text-title font-bold text-[var(--text-primary)]">
                  {Math.round(rating.confidence * 100)}%
                </p>
              </div>
              <div>
                <p className="text-caption text-[var(--text-secondary)]">
                  Valid Until
                </p>
                <p className="text-body font-medium text-[var(--text-primary)]">
                  {new Date(rating.validUntil).toLocaleDateString("en-GB")}
                </p>
              </div>
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Component Breakdown */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <GlassCard>
          <div className="p-6">
            <h2 className="text-heading font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
              <BarChart3 size={20} className="text-[var(--accent-primary)]" />
              Component Breakdown
            </h2>
            <div className="space-y-4">
              {(rating.componentScores || []).map((comp) => (
                <div
                  key={comp.component}
                  className="border border-[var(--border-default)] rounded-lg p-4"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <h3 className="text-subtitle font-semibold text-[var(--text-primary)]">
                        {COMPONENT_LABELS[comp.component] || comp.component}
                      </h3>
                      <p className="text-caption text-[var(--text-secondary)]">
                        Weight: {Math.round(comp.weight * 100)}%
                      </p>
                    </div>
                    <div className="text-right">
                      <p
                        className={`text-title font-bold ${scoreColor(comp.adjustedScore)}`}
                      >
                        {comp.adjustedScore}/100
                      </p>
                      <p className="text-caption text-[var(--text-secondary)]">
                        Raw: {comp.rawScore}
                      </p>
                    </div>
                  </div>
                  {/* Progress bars */}
                  <div className="flex gap-4 mb-3">
                    <div className="flex-1">
                      <div className="flex justify-between text-caption text-[var(--text-secondary)] mb-1">
                        <span>Score</span>
                        <span>{comp.adjustedScore}%</span>
                      </div>
                      <div className="h-2 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${comp.adjustedScore >= 80 ? "bg-[var(--accent-success-soft)]0" : comp.adjustedScore >= 60 ? "bg-[var(--accent-warning)]" : "bg-[var(--accent-danger)]"}`}
                          style={{ width: `${comp.adjustedScore}%` }}
                        />
                      </div>
                    </div>
                    <div className="w-32">
                      <div className="flex justify-between text-caption text-[var(--text-secondary)] mb-1">
                        <span>Data</span>
                        <span>{Math.round(comp.dataCompleteness * 100)}%</span>
                      </div>
                      <div className="h-2 bg-[var(--surface-sunken)] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${completenessBar(comp.dataCompleteness)}`}
                          style={{
                            width: `${comp.dataCompleteness * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                  {comp.keyFindings.length > 0 && (
                    <ul className="text-small text-[var(--text-secondary)] space-y-1">
                      {comp.keyFindings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-[var(--accent-primary)] mt-0.5">
                            -
                          </span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>
      </motion.div>

      {/* Risk Register */}
      <motion.div
        initial={false}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <GlassCard>
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-heading font-bold text-[var(--text-primary)] flex items-center gap-2">
                <AlertTriangle
                  size={20}
                  className="text-[var(--accent-warning)]"
                />
                Risk Register ({sortedRisks.length})
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setSortBy("severity")}
                  className={`px-3 py-1 rounded text-small transition-colors ${sortBy === "severity" ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"}`}
                >
                  By Severity
                </button>
                <button
                  onClick={() => setSortBy("likelihood")}
                  className={`px-3 py-1 rounded text-small transition-colors ${sortBy === "likelihood" ? "bg-[var(--accent-primary-soft)] text-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-sunken)]"}`}
                >
                  By Likelihood
                </button>
              </div>
            </div>
            {sortedRisks.length === 0 ? (
              <p className="text-body text-[var(--text-secondary)] text-center py-8">
                No risks identified.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-small">
                  <thead>
                    <tr className="border-b border-[var(--border-default)]">
                      <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">
                        Risk
                      </th>
                      <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">
                        Severity
                      </th>
                      <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">
                        Likelihood
                      </th>
                      <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">
                        Mitigation
                      </th>
                      <th className="text-left py-2 px-3 text-[var(--text-secondary)] font-medium">
                        Ref
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedRisks.map((risk) => (
                      <tr
                        key={risk.id}
                        className="border-b border-[var(--border-subtle)]"
                      >
                        <td className="py-3 px-3 text-[var(--text-primary)] max-w-xs">
                          {risk.description}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-micro font-medium border ${SEVERITY_COLORS[risk.severity]}`}
                          >
                            {risk.severity}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[var(--text-secondary)]">
                          {risk.likelihood.replace("_", " ")}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`text-micro ${risk.mitigationStatus === "MITIGATED" ? "text-[var(--accent-primary)]" : risk.mitigationStatus === "IN_PROGRESS" ? "text-[var(--accent-warning)]" : "text-[var(--accent-danger)]"}`}
                          >
                            {risk.mitigationStatus.replace("_", " ")}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[var(--text-secondary)] text-micro">
                          {risk.regulatoryReference}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>

      {/* Rating Action */}
      {rating.actionRationale && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <GlassCard>
            <div className="p-6">
              <h2 className="text-heading font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <FileText size={20} className="text-[var(--accent-primary)]" />
                Rating Action
              </h2>
              <div className="flex items-center gap-4 mb-3">
                <span className="px-3 py-1 bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] rounded text-small font-medium">
                  {rating.actionType}
                </span>
                {rating.previousGrade && (
                  <span className="text-body text-[var(--text-secondary)]">
                    {rating.previousGrade} → {rating.grade}
                  </span>
                )}
              </div>
              <p className="text-body text-[var(--text-secondary)]">
                {rating.actionRationale}
              </p>
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Peer Comparison */}
      {benchmark && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <GlassCard>
            <div className="p-6">
              <h2 className="text-heading font-bold text-[var(--text-primary)] mb-4">
                Peer Comparison
              </h2>
              <PeerBenchmarkChart
                benchmark={benchmark}
                orgScore={rating.numericScore}
                orgGrade={rating.grade}
              />
            </div>
          </GlassCard>
        </motion.div>
      )}

      {/* Rating History */}
      {history.length > 0 && (
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <GlassCard>
            <div className="p-6">
              <h2 className="text-heading font-bold text-[var(--text-primary)] mb-4">
                Rating History
              </h2>
              <RatingActionTimeline actions={history} />
            </div>
          </GlassCard>
        </motion.div>
      )}
    </div>
  );
}
