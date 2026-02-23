"use client";

import { motion } from "framer-motion";
import {
  Shield,
  TrendingUp,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import RRSGauge from "@/components/assure/RRSGauge";
import RRSComponentBreakdown from "@/components/assure/RRSComponentBreakdown";

// ─── Types ───

interface RRSFactor {
  name: string;
  maxPoints: number;
  earnedPoints: number;
}

interface RRSComponentScore {
  score: number;
  weight: number;
  factors: RRSFactor[];
}

interface RRSRecommendation {
  priority: "critical" | "high" | "medium" | "low";
  component: string;
  action: string;
  impact: string;
}

interface RRSResult {
  overallScore: number;
  grade: "A" | "B" | "C" | "D" | "F";
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

interface TrendPoint {
  date: string;
  overallScore: number;
}

interface RiskItem {
  component: string;
  factor: string;
  severity: "critical" | "high" | "medium" | "low";
  gap: number;
}

interface AssurePublicViewProps {
  data: {
    organizationName: string;
    score: RRSResult;
    granularity: "SUMMARY" | "COMPONENT" | "DETAILED";
    includes: {
      rrs: boolean;
      gapAnalysis: boolean;
      timeline: boolean;
      riskRegister: boolean;
      trend: boolean;
    };
    trendData?: TrendPoint[];
    riskItems?: RiskItem[];
  };
}

// ─── Helpers ───

const COMPONENT_LABELS: Record<string, string> = {
  authorizationReadiness: "Authorization Readiness",
  cybersecurityPosture: "Cybersecurity Posture",
  operationalCompliance: "Operational Compliance",
  jurisdictionalCoverage: "Multi-Jurisdictional Coverage",
  regulatoryTrajectory: "Regulatory Trajectory",
  governanceProcess: "Governance & Process",
};

function getStatusBadge(status: string): {
  label: string;
  color: string;
  icon: typeof CheckCircle;
} {
  switch (status) {
    case "compliant":
      return {
        label: "Compliant",
        color:
          "bg-green-50 text-green-700 border-green-200 dark:bg-green-500/10 dark:text-green-400 dark:border-green-500/20",
        icon: CheckCircle,
      };
    case "mostly_compliant":
      return {
        label: "Mostly Compliant",
        color:
          "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
        icon: CheckCircle,
      };
    case "partial":
      return {
        label: "Partial Compliance",
        color:
          "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
        icon: AlertTriangle,
      };
    default:
      return {
        label: "Not Assessed",
        color:
          "bg-slate-50 text-slate-600 border-slate-200 dark:bg-white/5 dark:text-white/50 dark:border-white/10",
        icon: Clock,
      };
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20";
    case "high":
      return "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20";
    case "medium":
      return "bg-yellow-50 text-yellow-600 border-yellow-200 dark:bg-yellow-500/10 dark:text-yellow-400 dark:border-yellow-500/20";
    default:
      return "bg-slate-50 text-slate-500 border-slate-200 dark:bg-white/5 dark:text-white/40 dark:border-white/10";
  }
}

// ─── Component ───

export default function AssurePublicView({ data }: AssurePublicViewProps) {
  const { organizationName, score, granularity, includes } = data;
  const statusInfo = getStatusBadge(score.status);
  const StatusIcon = statusInfo.icon;
  const computedDate = new Date(score.computedAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-navy-950">
      {/* Header */}
      <div className="bg-white dark:bg-navy-900 border-b border-slate-200 dark:border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-emerald-500" />
              <span className="text-caption uppercase tracking-widest text-emerald-600 dark:text-emerald-400 font-medium">
                Regulatory Readiness Report
              </span>
            </div>

            <h1 className="text-display font-semibold text-slate-900 dark:text-white mb-2">
              {organizationName}
            </h1>

            <div className="flex flex-wrap items-center gap-3 text-small text-slate-500 dark:text-white/45">
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border ${statusInfo.color}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </span>
              <span>Computed {computedDate}</span>
              <span>Methodology v{score.methodology.version}</span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-10 space-y-10">
        {/* RRS Score Section */}
        {includes.rrs && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-white/10 p-8 shadow-sm">
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Gauge */}
                <div className="flex-shrink-0">
                  <RRSGauge
                    score={score.overallScore}
                    grade={score.grade}
                    size={180}
                  />
                </div>

                {/* Summary stats */}
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-display-sm font-semibold text-slate-900 dark:text-white mb-2">
                    Regulatory Readiness Score
                  </h2>
                  <p className="text-body text-slate-500 dark:text-white/45 mb-6 max-w-md">
                    Composite score across 6 compliance dimensions covering EU
                    Space Act, NIS2, operational requirements, and governance
                    maturity.
                  </p>

                  {/* Component summary */}
                  {granularity !== "SUMMARY" && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {Object.entries(score.components).map(([key, comp]) => {
                        const label = COMPONENT_LABELS[key] || key;
                        const scoreColor =
                          comp.score >= 80
                            ? "text-green-600 dark:text-green-400"
                            : comp.score >= 60
                              ? "text-amber-600 dark:text-amber-400"
                              : "text-red-600 dark:text-red-400";

                        return (
                          <div
                            key={key}
                            className="bg-slate-50 dark:bg-white/5 rounded-lg p-3"
                          >
                            <div
                              className={`text-heading font-semibold ${scoreColor}`}
                            >
                              {comp.score}
                            </div>
                            <div className="text-micro text-slate-500 dark:text-white/40 mt-0.5 leading-tight">
                              {label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {/* Component Breakdown (COMPONENT + DETAILED) */}
        {includes.rrs &&
          (granularity === "COMPONENT" || granularity === "DETAILED") && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-caption uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 mb-4">
                Component Breakdown
              </h2>
              <RRSComponentBreakdown components={score.components} />
            </motion.section>
          )}

        {/* Gap Analysis (DETAILED only) */}
        {includes.gapAnalysis && granularity === "DETAILED" && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <h2 className="text-caption uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 mb-4">
              Gap Analysis
            </h2>
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6">
              {score.recommendations.length > 0 ? (
                <div className="space-y-3">
                  {score.recommendations.map((rec, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 dark:bg-white/5"
                    >
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded border text-micro font-medium flex-shrink-0 mt-0.5 ${getPriorityColor(rec.priority)}`}
                      >
                        {rec.priority.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-body text-slate-700 dark:text-white/70">
                          {rec.action}
                        </p>
                        <p className="text-small text-slate-400 dark:text-white/30 mt-0.5">
                          {rec.impact} &middot;{" "}
                          {COMPONENT_LABELS[rec.component] || rec.component}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body text-slate-500 dark:text-white/45 text-center py-6">
                  No significant gaps identified.
                </p>
              )}
            </div>
          </motion.section>
        )}

        {/* Trend Chart */}
        {includes.trend && data.trendData && data.trendData.length > 1 && (
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <h2 className="text-caption uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 mb-4">
              Score Trend
            </h2>
            <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-white/10 p-6">
              <div className="h-[200px] flex items-end gap-1">
                {data.trendData.map((point, i) => {
                  const barHeight = Math.max(
                    4,
                    (point.overallScore / 100) * 180,
                  );
                  const color =
                    point.overallScore >= 80
                      ? "bg-green-500"
                      : point.overallScore >= 60
                        ? "bg-amber-500"
                        : "bg-red-500";

                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-micro text-slate-400 dark:text-white/30">
                        {point.overallScore}
                      </span>
                      <motion.div
                        className={`w-full max-w-[40px] rounded-t ${color}`}
                        initial={{ height: 0 }}
                        animate={{ height: barHeight }}
                        transition={{
                          delay: i * 0.05,
                          duration: 0.5,
                          ease: "easeOut",
                        }}
                      />
                      <span className="text-micro text-slate-400 dark:text-white/30 truncate w-full text-center">
                        {new Date(point.date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}

        {/* Risk Register */}
        {includes.riskRegister &&
          data.riskItems &&
          data.riskItems.length > 0 && (
            <motion.section
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-caption uppercase tracking-[0.2em] text-slate-400 dark:text-white/40 mb-4">
                Risk Register
              </h2>
              <div className="bg-white dark:bg-navy-900 rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-white/10">
                      <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-4 pb-2 font-medium">
                        Severity
                      </th>
                      <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-4 pb-2 font-medium">
                        Component
                      </th>
                      <th className="text-left text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-4 pb-2 font-medium">
                        Factor
                      </th>
                      <th className="text-right text-micro uppercase tracking-wider text-slate-400 dark:text-white/40 p-4 pb-2 font-medium">
                        Gap
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.riskItems.map((item, i) => (
                      <tr
                        key={i}
                        className="border-b border-slate-50 dark:border-white/5 last:border-0"
                      >
                        <td className="p-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded border text-micro font-medium ${getPriorityColor(item.severity)}`}
                          >
                            {item.severity.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-4 text-small text-slate-600 dark:text-white/60">
                          {COMPONENT_LABELS[item.component] || item.component}
                        </td>
                        <td className="p-4 text-small text-slate-700 dark:text-white/70">
                          {item.factor}
                        </td>
                        <td className="p-4 text-right text-body font-medium text-red-500 dark:text-red-400">
                          -{item.gap} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.section>
          )}
      </div>

      {/* Footer */}
      <div className="border-t border-slate-200 dark:border-white/10 bg-white dark:bg-navy-900">
        <div className="max-w-4xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
                  <span className="text-white text-micro font-bold">C</span>
                </div>
                <span className="text-body font-medium text-slate-700 dark:text-white/70">
                  Powered by Caelex
                </span>
              </div>
              <span className="text-micro text-slate-400 dark:text-white/30">
                Assure &mdash; Regulatory Readiness Intelligence
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-micro text-slate-400 dark:text-white/30">
                This report is read-only and was generated automatically.
              </span>
              <a
                href="https://caelex.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-small text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
              >
                caelex.com
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
