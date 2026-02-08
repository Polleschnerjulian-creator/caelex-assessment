"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  ShieldCheck,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  AlertCircle,
  TrendingUp,
  Download,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  ExternalLink,
  BarChart3,
  Archive,
  Layers,
  ClipboardCheck,
  ArrowRight,
  X,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───

interface ModuleComplianceStatus {
  module: string;
  regulationType: string;
  totalRequirements: number;
  compliant: number;
  partial: number;
  nonCompliant: number;
  notAssessed: number;
  notApplicable: number;
  score: number;
  lastUpdated: string | null;
}

interface EvidenceCoverage {
  totalRequirements: number;
  withEvidence: number;
  percentage: number;
  byStatus: {
    draft: number;
    submitted: number;
    accepted: number;
    rejected: number;
    expired: number;
  };
}

interface ActionItem {
  regulationType: string;
  requirementId: string;
  title: string;
  severity: string;
  status: string;
  hasEvidence: boolean;
  modulePath: string;
}

interface AuditCenterOverview {
  complianceScore: number;
  modules: ModuleComplianceStatus[];
  evidenceCoverage: EvidenceCoverage;
  actionItems: ActionItem[];
  totalAuditEntries: number;
  recentActivityCount: number;
}

// ─── Config ───

const regulationColors: Record<
  string,
  { bg: string; text: string; label: string }
> = {
  EU_SPACE_ACT: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    label: "EU Space Act",
  },
  NIS2: { bg: "bg-cyan-500/10", text: "text-cyan-400", label: "NIS2" },
  CYBERSECURITY: {
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    label: "Cybersecurity",
  },
  DEBRIS: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    label: "Debris",
  },
  ENVIRONMENTAL: {
    bg: "bg-green-500/10",
    text: "text-green-400",
    label: "Environmental",
  },
  INSURANCE: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    label: "Insurance",
  },
  AUTHORIZATION: {
    bg: "bg-indigo-500/10",
    text: "text-indigo-400",
    label: "Authorization",
  },
};

// ─── Page ───

export default function AuditCenterPage() {
  return (
    <FeatureGate module="audit-center">
      <AuditCenterContent />
    </FeatureGate>
  );
}

function AuditCenterContent() {
  const [overview, setOverview] = useState<AuditCenterOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [regulationFilter, setRegulationFilter] = useState<string>("all");
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );

  // Exports
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingCert, setExportingCert] = useState(false);
  const [verifyingChain, setVerifyingChain] = useState(false);
  const [chainStatus, setChainStatus] = useState<{
    valid: boolean;
    checkedEntries: number;
  } | null>(null);

  const fetchOverview = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/audit-center");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load overview");
      }
      const data = await res.json();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const toggleModuleExpand = (module: string) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(module)) next.delete(module);
      else next.add(module);
      return next;
    });
  };

  // Export handlers
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await fetch("/api/audit-center/export", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ format: "pdf" }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate report");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Audit-Center-Report-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export PDF report",
      );
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      const res = await fetch("/api/audit/export?format=csv");
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Audit-Trail-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Failed to export audit trail");
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportCertificate = async () => {
    setExportingCert(true);
    try {
      const res = await fetch("/api/audit/certificate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate certificate");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Compliance-Certificate-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to export certificate",
      );
    } finally {
      setExportingCert(false);
    }
  };

  const handleVerifyChain = async () => {
    setVerifyingChain(true);
    try {
      const res = await fetch("/api/audit/verify");
      if (!res.ok) throw new Error("Verification failed");
      const data = await res.json();
      setChainStatus(data);
    } catch {
      setChainStatus({ valid: false, checkedEntries: 0 });
    } finally {
      setVerifyingChain(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-slate-400 dark:text-white/40" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="space-y-4">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!overview) return null;

  const filteredModules =
    regulationFilter === "all"
      ? overview.modules
      : overview.modules.filter((m) => m.regulationType === regulationFilter);

  const filteredActions =
    regulationFilter === "all"
      ? overview.actionItems
      : overview.actionItems.filter(
          (a) => a.regulationType === regulationFilter,
        );

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-blue-500 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-white">
              Audit Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-white/40">
              Regulatory audit readiness at a glance
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchOverview(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60 border border-slate-200 dark:border-white/10 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Metrics Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Compliance Score */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
              Compliance Score
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
            {overview.complianceScore}%
          </div>
          <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full mt-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${overview.complianceScore >= 80 ? "bg-green-500" : overview.complianceScore >= 50 ? "bg-amber-500" : "bg-red-500"}`}
              initial={{ width: 0 }}
              animate={{ width: `${overview.complianceScore}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <div className="text-[11px] text-slate-400 dark:text-white/30 mt-2">
            Across {overview.modules.length} modules
          </div>
        </div>

        {/* Evidence Coverage */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
              Evidence Coverage
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
            {overview.evidenceCoverage.percentage}%
          </div>
          <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full mt-3 overflow-hidden">
            <motion.div
              className="h-full bg-cyan-500 rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${overview.evidenceCoverage.percentage}%`,
              }}
              transition={{ duration: 0.8, ease: "easeOut", delay: 0.1 }}
            />
          </div>
          <div className="text-[11px] text-slate-400 dark:text-white/30 mt-2">
            {overview.evidenceCoverage.withEvidence} of{" "}
            {overview.evidenceCoverage.totalRequirements} requirements
          </div>
        </div>

        {/* Audit Trail */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-green-500 dark:text-green-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
              Audit Trail
            </span>
          </div>
          <div className="text-3xl font-mono font-bold text-slate-900 dark:text-white">
            {overview.totalAuditEntries.toLocaleString()}
          </div>
          {chainStatus ? (
            <div
              className={`flex items-center gap-1 mt-3 text-[11px] ${chainStatus.valid ? "text-green-400" : "text-red-400"}`}
            >
              {chainStatus.valid ? (
                <CheckCircle2 size={12} />
              ) : (
                <AlertTriangle size={12} />
              )}
              {chainStatus.valid
                ? `Chain verified (${chainStatus.checkedEntries} entries)`
                : "Integrity issue detected"}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 dark:text-white/30 mt-3">
              {overview.recentActivityCount} entries in last 30 days
            </div>
          )}
        </div>

        {/* Outstanding Items */}
        <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 dark:text-white/30">
              Action Items
            </span>
          </div>
          <div
            className={`text-3xl font-mono font-bold ${overview.actionItems.length > 0 ? "text-amber-400" : "text-green-400"}`}
          >
            {overview.actionItems.length}
          </div>
          <div className="text-[11px] text-slate-400 dark:text-white/30 mt-3">
            {overview.actionItems.length > 0
              ? "Require attention"
              : "All up to date"}
          </div>
        </div>
      </div>

      {/* ─── Filter Bar ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-white/30 mr-2">
          <Filter size={12} />
          Filter:
        </div>
        <button
          onClick={() => setRegulationFilter("all")}
          className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
            regulationFilter === "all"
              ? "bg-blue-500/10 text-blue-500 dark:text-blue-400"
              : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
          }`}
        >
          All
        </button>
        {overview.modules.map((m) => {
          const rc = regulationColors[m.regulationType] || {
            bg: "bg-slate-500/10",
            text: "text-slate-400",
            label: m.module,
          };
          return (
            <button
              key={m.regulationType}
              onClick={() => setRegulationFilter(m.regulationType)}
              className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                regulationFilter === m.regulationType
                  ? `${rc.bg} ${rc.text}`
                  : "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/40 hover:text-slate-700 dark:hover:text-white/60"
              }`}
            >
              {rc.label}
            </button>
          );
        })}
      </div>

      {/* ─── Module Compliance Overview ─── */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
          <Layers size={16} className="text-slate-400 dark:text-white/40" />
          Module Compliance ({filteredModules.length})
        </h2>

        {filteredModules.map((mod) => {
          const isExpanded = expandedModules.has(mod.module);
          const rc = regulationColors[mod.regulationType] || {
            bg: "bg-slate-500/10",
            text: "text-slate-400",
            label: mod.module,
          };

          return (
            <motion.div
              key={mod.module}
              layout
              className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleModuleExpand(mod.module)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors text-left"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`text-[10px] font-medium px-2 py-0.5 rounded ${rc.bg} ${rc.text}`}
                  >
                    {rc.label}
                  </span>
                  <span className="text-sm font-medium text-slate-900 dark:text-white">
                    {mod.module}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  {/* Score badge */}
                  <div
                    className={`text-sm font-mono font-bold ${mod.score >= 80 ? "text-green-400" : mod.score >= 50 ? "text-amber-400" : "text-red-400"}`}
                  >
                    {mod.score}%
                  </div>
                  {/* Requirement count */}
                  <span className="text-xs font-mono text-slate-400 dark:text-white/30 hidden sm:inline">
                    {mod.compliant}/{mod.totalRequirements}
                  </span>
                  {isExpanded ? (
                    <ChevronUp
                      size={16}
                      className="text-slate-400 dark:text-white/30"
                    />
                  ) : (
                    <ChevronDown
                      size={16}
                      className="text-slate-400 dark:text-white/30"
                    />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="border-t border-slate-100 dark:border-white/[0.06] px-5 py-4"
                  >
                    {/* Status bar */}
                    <div className="flex gap-2 mb-4">
                      {[
                        {
                          label: "Compliant",
                          count: mod.compliant,
                          color: "bg-green-500",
                        },
                        {
                          label: "Partial",
                          count: mod.partial,
                          color: "bg-amber-500",
                        },
                        {
                          label: "Non-Compliant",
                          count: mod.nonCompliant,
                          color: "bg-red-500",
                        },
                        {
                          label: "Not Assessed",
                          count: mod.notAssessed,
                          color: "bg-slate-400",
                        },
                        {
                          label: "N/A",
                          count: mod.notApplicable,
                          color: "bg-slate-300 dark:bg-slate-600",
                        },
                      ]
                        .filter((s) => s.count > 0)
                        .map((s) => (
                          <div
                            key={s.label}
                            className="flex items-center gap-1.5"
                          >
                            <div
                              className={`w-2 h-2 rounded-full ${s.color}`}
                            />
                            <span className="text-[10px] text-slate-500 dark:text-white/40">
                              {s.count} {s.label}
                            </span>
                          </div>
                        ))}
                    </div>

                    {/* Progress bar */}
                    <div className="h-2 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden flex">
                      {mod.totalRequirements > 0 && (
                        <>
                          <div
                            className="h-full bg-green-500"
                            style={{
                              width: `${(mod.compliant / mod.totalRequirements) * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-amber-500"
                            style={{
                              width: `${(mod.partial / mod.totalRequirements) * 100}%`,
                            }}
                          />
                          <div
                            className="h-full bg-red-500"
                            style={{
                              width: `${(mod.nonCompliant / mod.totalRequirements) * 100}%`,
                            }}
                          />
                        </>
                      )}
                    </div>

                    {mod.lastUpdated && (
                      <div className="text-[10px] text-slate-400 dark:text-white/25 mt-3 flex items-center gap-1">
                        <Clock size={10} />
                        Last updated:{" "}
                        {new Date(mod.lastUpdated).toLocaleDateString()}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {filteredModules.length === 0 && (
          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl p-8 text-center">
            <Shield className="w-8 h-8 text-slate-400/30 dark:text-white/10 mx-auto mb-2" />
            <p className="text-sm text-slate-500 dark:text-white/40">
              No compliance modules found. Start an assessment to see data here.
            </p>
          </div>
        )}
      </div>

      {/* ─── Action Items ─── */}
      {filteredActions.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-slate-900 dark:text-white flex items-center gap-2">
            <AlertTriangle size={16} className="text-amber-400" />
            Action Items ({filteredActions.length})
          </h2>

          <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl divide-y divide-slate-100 dark:divide-white/[0.04]">
            {filteredActions.slice(0, 20).map((item, idx) => {
              const rc = regulationColors[item.regulationType] || {
                bg: "bg-slate-500/10",
                text: "text-slate-400",
                label: item.regulationType,
              };
              return (
                <div
                  key={`${item.regulationType}-${item.requirementId}-${idx}`}
                  className="flex items-center justify-between px-5 py-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.01] transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.5 rounded ${rc.bg} ${rc.text} flex-shrink-0`}
                    >
                      {rc.label}
                    </span>
                    <span className="text-xs text-slate-700 dark:text-white/70 truncate">
                      {item.requirementId}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded flex-shrink-0 ${
                        item.status === "non_compliant"
                          ? "text-red-400 bg-red-500/10"
                          : "text-slate-400 bg-slate-500/10"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    {!item.hasEvidence && (
                      <span className="text-[10px] text-amber-400/60">
                        No evidence
                      </span>
                    )}
                    <Link
                      href={item.modulePath}
                      className="p-1 text-slate-400 dark:text-white/25 hover:text-blue-400 transition-colors"
                    >
                      <ExternalLink size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
            {filteredActions.length > 20 && (
              <div className="px-5 py-3 text-center">
                <span className="text-[11px] text-slate-400 dark:text-white/30">
                  + {filteredActions.length - 20} more items
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Export Panel ─── */}
      <div className="bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.08] rounded-xl p-6">
        <div className="flex items-center gap-3 mb-5">
          <Download className="w-4 h-4 text-slate-400 dark:text-white/40" />
          <h2 className="text-sm font-medium text-slate-900 dark:text-white">
            Export & Verification
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* PDF Report */}
          <button
            onClick={handleExportPdf}
            disabled={exportingPdf}
            className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl hover:border-blue-500/30 transition-colors text-left disabled:opacity-50"
          >
            {exportingPdf ? (
              <Loader2 size={16} className="animate-spin text-blue-400" />
            ) : (
              <FileText size={16} className="text-blue-400" />
            )}
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-white/70">
                Audit Report
              </div>
              <div className="text-[10px] text-slate-400 dark:text-white/25">
                PDF with full trail
              </div>
            </div>
          </button>

          {/* CSV Export */}
          <button
            onClick={handleExportCsv}
            disabled={exportingCsv}
            className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl hover:border-cyan-500/30 transition-colors text-left disabled:opacity-50"
          >
            {exportingCsv ? (
              <Loader2 size={16} className="animate-spin text-cyan-400" />
            ) : (
              <BarChart3 size={16} className="text-cyan-400" />
            )}
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-white/70">
                Audit Trail
              </div>
              <div className="text-[10px] text-slate-400 dark:text-white/25">
                CSV export
              </div>
            </div>
          </button>

          {/* Compliance Certificate */}
          <button
            onClick={handleExportCertificate}
            disabled={exportingCert}
            className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl hover:border-green-500/30 transition-colors text-left disabled:opacity-50"
          >
            {exportingCert ? (
              <Loader2 size={16} className="animate-spin text-green-400" />
            ) : (
              <ShieldCheck size={16} className="text-green-400" />
            )}
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-white/70">
                Certificate
              </div>
              <div className="text-[10px] text-slate-400 dark:text-white/25">
                Compliance cert
              </div>
            </div>
          </button>

          {/* Verify Chain */}
          <button
            onClick={handleVerifyChain}
            disabled={verifyingChain}
            className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl hover:border-amber-500/30 transition-colors text-left disabled:opacity-50"
          >
            {verifyingChain ? (
              <Loader2 size={16} className="animate-spin text-amber-400" />
            ) : (
              <CheckCircle2 size={16} className="text-amber-400" />
            )}
            <div>
              <div className="text-xs font-medium text-slate-700 dark:text-white/70">
                Verify Integrity
              </div>
              <div className="text-[10px] text-slate-400 dark:text-white/25">
                Hash chain check
              </div>
            </div>
          </button>
        </div>

        {/* Evidence summary */}
        {overview.evidenceCoverage.byStatus.accepted +
          overview.evidenceCoverage.byStatus.submitted >
          0 && (
          <div className="mt-5 pt-4 border-t border-slate-100 dark:border-white/[0.06] flex items-center gap-3 flex-wrap">
            <span className="text-[11px] text-slate-400 dark:text-white/30">
              Evidence:
            </span>
            {overview.evidenceCoverage.byStatus.accepted > 0 && (
              <span className="text-[10px] bg-green-500/10 text-green-400 rounded-md px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.accepted} accepted
              </span>
            )}
            {overview.evidenceCoverage.byStatus.submitted > 0 && (
              <span className="text-[10px] bg-blue-500/10 text-blue-400 rounded-md px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.submitted} submitted
              </span>
            )}
            {overview.evidenceCoverage.byStatus.draft > 0 && (
              <span className="text-[10px] bg-slate-500/10 text-slate-400 rounded-md px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.draft} draft
              </span>
            )}
            {overview.evidenceCoverage.byStatus.rejected > 0 && (
              <span className="text-[10px] bg-red-500/10 text-red-400 rounded-md px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.rejected} rejected
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
