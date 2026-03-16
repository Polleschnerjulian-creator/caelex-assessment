"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
  FileCheck,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  BarChart3,
  ShieldCheck,
  AlertTriangle,
  Link2,
  RefreshCw,
} from "lucide-react";

// ── Types ───────────────────────────────────────────────────────────────────

interface OverviewStats {
  totalEvidence: number;
  acceptedEvidence: number;
  pendingEvidence: number;
  rejectedEvidence: number;
}

interface RegulationCoverage {
  regulationType: string;
  totalRequirements: number;
  coveredRequirements: number;
  coveragePct: number;
}

interface RecentEvidence {
  id: string;
  title: string;
  status: string;
  regulationType: string;
  updatedAt: string;
}

interface GapCategory {
  category: string;
  gaps: number;
  total: number;
}

interface ChainIntegrity {
  verified: boolean;
  totalRecords: number;
  lastVerified: string;
}

interface DashboardData {
  overviewStats: OverviewStats;
  coverageByRegulation: RegulationCoverage[];
  recentEvidence: RecentEvidence[];
  gapsByCategory: GapCategory[];
  chainIntegrity: ChainIntegrity;
}

// ── Glass Styles ────────────────────────────────────────────────────────────

const glassPanel: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  overflow: "hidden",
};

const innerGlass: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 14,
  boxShadow:
    "0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
};

// ── Helpers ─────────────────────────────────────────────────────────────────

const REGULATION_LABELS: Record<string, string> = {
  EU_SPACE_ACT: "EU Space Act",
  NIS2: "NIS2 Directive",
  CYBERSECURITY: "Cybersecurity",
  DEBRIS: "Debris Mitigation",
  ENVIRONMENTAL: "Environmental",
  INSURANCE: "Insurance",
  AUTHORIZATION: "Authorization",
  REGISTRATION: "Registration",
  SUPERVISION: "Supervision",
  NATIONAL_SPACE_LAW: "National Space Law",
  UK_SPACE_ACT: "UK Space Act",
  US_REGULATORY: "US Regulatory",
  COPUOS_IADC: "COPUOS/IADC",
  ITU_SPECTRUM: "ITU/Spectrum",
  EXPORT_CONTROL: "Export Control",
};

function getRegulationLabel(type: string): string {
  return REGULATION_LABELS[type] || type.replace(/_/g, " ");
}

function getStatusBadge(status: string) {
  switch (status) {
    case "ACCEPTED":
      return {
        label: "Accepted",
        className: "bg-emerald-100 text-emerald-600",
      };
    case "SUBMITTED":
      return {
        label: "Submitted",
        className: "bg-amber-100 text-amber-500",
      };
    case "PENDING":
      return {
        label: "Pending",
        className: "bg-amber-100 text-amber-500",
      };
    case "REJECTED":
      return {
        label: "Rejected",
        className: "bg-red-100 text-red-500",
      };
    case "EXPIRED":
      return {
        label: "Expired",
        className: "bg-red-100 text-red-500",
      };
    case "DRAFT":
      return {
        label: "Draft",
        className: "bg-slate-100 text-slate-500",
      };
    default:
      return {
        label: status,
        className: "bg-slate-100 text-slate-500",
      };
  }
}

function getCoverageBarColor(pct: number): string {
  if (pct >= 80) return "bg-emerald-500";
  if (pct >= 50) return "bg-amber-500";
  return "bg-red-500";
}

function getCoverageTextColor(pct: number): string {
  if (pct >= 80) return "text-emerald-600";
  if (pct >= 50) return "text-amber-500";
  return "text-red-500";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Component ───────────────────────────────────────────────────────────────

export default function EvidenceCoveragePage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/dashboard/evidence");
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] items-center justify-center">
        <div
          className="flex flex-col items-center gap-3 p-8"
          style={glassPanel}
        >
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading evidence data...</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] items-center justify-center">
        <div
          className="flex flex-col items-center gap-4 p-8"
          style={glassPanel}
        >
          <AlertTriangle className="w-8 h-8 text-red-500" />
          <p className="text-sm text-slate-500">
            {error || "Failed to load evidence data"}
          </p>
          <button
            onClick={fetchData}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const {
    overviewStats,
    coverageByRegulation,
    recentEvidence,
    gapsByCategory,
    chainIntegrity,
  } = data;

  const overallCoveragePct =
    overviewStats.totalEvidence > 0
      ? Math.round(
          (overviewStats.acceptedEvidence / overviewStats.totalEvidence) * 100,
        )
      : 0;

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-3 gap-3">
      {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
      <div className="flex flex-col w-[260px] shrink-0 p-5" style={glassPanel}>
        {/* Title */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-500/20">
            <FileCheck className="w-[18px] h-[18px] text-indigo-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-800 dark:text-white leading-tight">
              Evidence Coverage
            </h1>
            <p className="text-[11px] text-slate-400 leading-tight mt-0.5">
              ACE — Autonomous Compliance Evidence
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="space-y-3 flex-1">
          <div className="p-3 rounded-xl" style={innerGlass}>
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs text-slate-500">Total Evidence</span>
            </div>
            <p className="text-xl font-semibold text-slate-800 dark:text-white">
              {overviewStats.totalEvidence}
            </p>
          </div>

          <div className="p-3 rounded-xl" style={innerGlass}>
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="text-xs text-slate-500">Accepted</span>
            </div>
            <p className="text-xl font-semibold text-emerald-600">
              {overviewStats.acceptedEvidence}
            </p>
          </div>

          <div className="p-3 rounded-xl" style={innerGlass}>
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              <span className="text-xs text-slate-500">Pending</span>
            </div>
            <p className="text-xl font-semibold text-amber-500">
              {overviewStats.pendingEvidence}
            </p>
          </div>

          <div className="p-3 rounded-xl" style={innerGlass}>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
              <span className="text-xs text-slate-500">Coverage %</span>
            </div>
            <p className="text-xl font-semibold text-slate-800 dark:text-white">
              {overallCoveragePct}%
            </p>
          </div>

          {/* Chain Integrity Badge */}
          <div className="p-3 rounded-xl" style={innerGlass}>
            <div className="flex items-center gap-2 mb-1.5">
              <Link2 className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-xs text-slate-500">Chain Integrity</span>
            </div>
            {chainIntegrity.verified ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">
                <CheckCircle2 className="w-3 h-3" />
                Verified
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-500">
                <XCircle className="w-3 h-3" />
                Integrity Issue
              </span>
            )}
          </div>
        </div>

        {/* Retry Button */}
        <button
          onClick={fetchData}
          className="mt-4 flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
          style={innerGlass}
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh Data
        </button>
      </div>

      {/* ── Right Panel ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-5" style={glassPanel}>
        <div className="space-y-5">
          {/* Metrics Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0 }}
              className="p-4"
              style={innerGlass}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span className="text-xs text-slate-500">Total Evidence</span>
              </div>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {overviewStats.totalEvidence}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="p-4"
              style={innerGlass}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <span className="text-xs text-slate-500">Accepted</span>
              </div>
              <p className="text-2xl font-semibold text-emerald-600">
                {overviewStats.acceptedEvidence}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="p-4"
              style={innerGlass}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-500/20">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <span className="text-xs text-slate-500">Pending</span>
              </div>
              <p className="text-2xl font-semibold text-amber-500">
                {overviewStats.pendingEvidence}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="p-4"
              style={innerGlass}
            >
              <div className="flex items-center gap-2.5 mb-2">
                <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-500/20">
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <span className="text-xs text-slate-500">Coverage</span>
              </div>
              <p className="text-2xl font-semibold text-slate-800 dark:text-white">
                {overallCoveragePct}%
              </p>
            </motion.div>
          </div>

          {/* Coverage by Regulation Grid */}
          {coverageByRegulation.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                Coverage by Regulation
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {coverageByRegulation.map((reg, i) => (
                  <motion.div
                    key={reg.regulationType}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.25 + i * 0.04 }}
                    className="p-4"
                    style={innerGlass}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-sm font-medium text-slate-800 dark:text-white">
                        {getRegulationLabel(reg.regulationType)}
                      </h3>
                      <span
                        className={`text-sm font-semibold ${getCoverageTextColor(reg.coveragePct)}`}
                      >
                        {reg.coveragePct}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-slate-200/60 dark:bg-white/10 rounded-full">
                      <div
                        className={`h-full ${getCoverageBarColor(reg.coveragePct)} rounded-full transition-all duration-500`}
                        style={{ width: `${reg.coveragePct}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {reg.coveredRequirements} of {reg.totalRequirements}{" "}
                      requirements covered
                    </p>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Two-column: Recent Evidence + Gap Summary */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Recent Evidence */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="p-4"
              style={innerGlass}
            >
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                Recent Evidence
              </h2>
              {recentEvidence.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No evidence records yet
                </p>
              ) : (
                <div className="space-y-2.5">
                  {recentEvidence.map((item) => {
                    const badge = getStatusBadge(item.status);
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 py-2 border-b border-slate-200/50 dark:border-white/10 last:border-0"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 dark:text-white truncate">
                            {item.title}
                          </p>
                          <p className="text-xs text-slate-500">
                            {getRegulationLabel(item.regulationType)} &middot;{" "}
                            {formatDate(item.updatedAt)}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.className}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>

            {/* Gap Summary */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="p-4"
              style={innerGlass}
            >
              <h2 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                Gap Summary
              </h2>
              {gapsByCategory.length === 0 ? (
                <p className="text-sm text-slate-500 py-8 text-center">
                  No regulatory requirements configured
                </p>
              ) : (
                <div className="space-y-3">
                  {gapsByCategory.slice(0, 8).map((cat) => {
                    const coveredPct =
                      cat.total > 0
                        ? Math.round(((cat.total - cat.gaps) / cat.total) * 100)
                        : 0;
                    return (
                      <div key={cat.category}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm text-slate-500 capitalize">
                            {cat.category.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-slate-500">
                            {cat.gaps > 0 ? (
                              <span className="text-red-500">
                                {cat.gaps} gap{cat.gaps !== 1 ? "s" : ""}
                              </span>
                            ) : (
                              <span className="text-emerald-600">Complete</span>
                            )}
                            {" / "}
                            {cat.total} total
                          </span>
                        </div>
                        <div className="h-1.5 bg-slate-200/60 dark:bg-white/10 rounded-full">
                          <div
                            className={`h-full ${getCoverageBarColor(coveredPct)} rounded-full transition-all duration-500`}
                            style={{ width: `${coveredPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </div>

          {/* Chain Integrity Footer */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="p-4"
            style={innerGlass}
          >
            <div className="flex items-center gap-3">
              <Link2 className="w-4 h-4 text-slate-400" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-500">
                    Evidence Hash-Chain Integrity
                  </span>
                  {chainIntegrity.verified ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-600">
                      <CheckCircle2 className="w-3 h-3" />
                      Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-500">
                      <XCircle className="w-3 h-3" />
                      Integrity Issue
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  {chainIntegrity.totalRecords} hashed record
                  {chainIntegrity.totalRecords !== 1 ? "s" : ""} &middot; Last
                  verified {formatDate(chainIntegrity.lastVerified)}
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
