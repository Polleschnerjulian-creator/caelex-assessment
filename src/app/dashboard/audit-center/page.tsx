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
  ExternalLink,
  BarChart3,
  Archive,
  Layers,
  X,
  Filter,
  Fingerprint,
} from "lucide-react";
import Link from "next/link";
import { csrfHeaders } from "@/lib/csrf-client";
import AttestationsTab from "./components/AttestationsTab";

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
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    label: "EU Space Act",
  },
  NIS2: {
    bg: "bg-blue-50",
    text: "text-blue-600",
    label: "NIS2",
  },
  CYBERSECURITY: {
    bg: "bg-violet-50",
    text: "text-violet-600",
    label: "Cybersecurity",
  },
  DEBRIS: {
    bg: "bg-amber-50",
    text: "text-amber-600",
    label: "Debris",
  },
  ENVIRONMENTAL: {
    bg: "bg-emerald-50",
    text: "text-emerald-600",
    label: "Environmental",
  },
  INSURANCE: {
    bg: "bg-green-50",
    text: "text-green-600",
    label: "Insurance",
  },
  AUTHORIZATION: {
    bg: "bg-indigo-50",
    text: "text-indigo-600",
    label: "Authorization",
  },
};

const defaultRegColor = {
  bg: "bg-slate-100",
  text: "text-slate-500",
  label: "",
};

// ─── Glass Styles (matching Documents / Generate2Page) ───

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

const glassPanelDarkClass =
  "dark:!bg-white/[0.04] dark:!backdrop-blur-[40px] dark:!border-white/[0.08] dark:![box-shadow:0_8px_40px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(255,255,255,0.05)]";
const innerGlassDarkClass =
  "dark:!bg-white/[0.03] dark:!border-white/[0.06] dark:![box-shadow:0_2px_8px_rgba(0,0,0,0.15)] dark:!backdrop-blur-none";

// ─── Sidebar Tab Definitions ───

type Tab = "evidence" | "attestations";

const sidebarTabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
  { id: "evidence", label: "Evidence", icon: <FileText size={16} /> },
  {
    id: "attestations",
    label: "Attestations",
    icon: <Fingerprint size={16} />,
  },
];

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

  // Tab
  const [activeTab, setActiveTab] = useState<Tab>("evidence");

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

  // Score color helper
  const scoreColor = (score: number) =>
    score >= 71
      ? "text-emerald-600"
      : score >= 31
        ? "text-amber-500"
        : "text-red-500";

  const progressColor = (score: number) =>
    score >= 71
      ? "bg-emerald-500"
      : score >= 31
        ? "bg-amber-500"
        : "bg-red-500";

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-white/[0.55]">
            Loading Audit Center...
          </p>
        </div>
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent">
        <div
          className={`rounded-2xl p-6 ${innerGlassDarkClass}`}
          style={innerGlass}
        >
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
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

  // ─── Render ───

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent p-3 gap-3">
      {/* ─── Left Panel — Sidebar ─── */}
      <div
        className={`w-[260px] shrink-0 flex flex-col ${glassPanelDarkClass}`}
        style={glassPanel}
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Audit Center
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Regulatory audit readiness
          </p>
        </div>

        {/* Tab Navigation */}
        <nav className="px-3 space-y-0.5">
          {sidebarTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-black/[0.06] dark:border-white/10" />

        {/* Stats Summary */}
        <div className="px-4 space-y-2 flex-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium px-1 mb-1.5">
            Overview
          </p>
          <SidebarStat
            icon={<TrendingUp size={14} />}
            label="Compliance Score"
            value={`${overview.complianceScore}%`}
            color={scoreColor(overview.complianceScore)}
          />
          <SidebarStat
            icon={<Archive size={14} />}
            label="Evidence Coverage"
            value={`${overview.evidenceCoverage.percentage}%`}
            color="text-blue-600"
          />
          <SidebarStat
            icon={<BarChart3 size={14} />}
            label="Audit Trail"
            value={overview.totalAuditEntries.toLocaleString()}
            color="text-violet-600"
          />
          <SidebarStat
            icon={<AlertTriangle size={14} />}
            label="Action Items"
            value={overview.actionItems.length}
            color={
              overview.actionItems.length > 0
                ? "text-amber-500"
                : "text-emerald-600"
            }
          />

          {/* Compliance Score Ring */}
          <div
            className={`mt-4 rounded-xl p-3 ${innerGlassDarkClass}`}
            style={innerGlass}
          >
            <div className="flex items-center gap-3">
              <ComplianceRing
                value={overview.complianceScore}
                size={44}
                color={scoreColor(overview.complianceScore)}
              />
              <div>
                <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                  Compliance
                </p>
                <p
                  className={`text-lg font-semibold ${scoreColor(overview.complianceScore)}`}
                >
                  {overview.complianceScore}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Refresh Button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={() => fetchOverview(true)}
            disabled={refreshing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing..." : "Refresh Data"}
          </button>
        </div>
      </div>

      {/* ─── Right Panel — Main Content ─── */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${glassPanelDarkClass}`}
        style={glassPanel}
      >
        {/* Error Banner */}
        {error && (
          <div className="mx-5 mt-4 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-500/10 rounded-xl border border-red-200 dark:border-red-500/20">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-sm text-red-600 dark:text-red-400 flex-1">
              {error}
            </p>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* ─── Attestations Tab Content ─── */}
        {activeTab === "attestations" && (
          <div className="flex-1 overflow-y-auto p-5">
            <AttestationsTab />
          </div>
        )}

        {/* ─── Evidence Tab Content ─── */}
        {activeTab === "evidence" && (
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* ─── Metrics Row ─── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Compliance Score */}
              <MetricCard
                icon={<TrendingUp size={15} />}
                iconColor="text-indigo-500"
                label="Compliance Score"
                value={`${overview.complianceScore}%`}
                sub={`Across ${overview.modules.length} modules`}
                progress={overview.complianceScore}
                progressColor={progressColor(overview.complianceScore)}
              />

              {/* Evidence Coverage */}
              <MetricCard
                icon={<Archive size={15} />}
                iconColor="text-blue-500"
                label="Evidence Coverage"
                value={`${overview.evidenceCoverage.percentage}%`}
                sub={`${overview.evidenceCoverage.withEvidence} of ${overview.evidenceCoverage.totalRequirements}`}
                progress={overview.evidenceCoverage.percentage}
                progressColor="bg-blue-500"
              />

              {/* Audit Trail */}
              <MetricCard
                icon={<BarChart3 size={15} />}
                iconColor="text-violet-500"
                label="Audit Trail"
                value={overview.totalAuditEntries.toLocaleString()}
                sub={
                  chainStatus
                    ? chainStatus.valid
                      ? `Chain verified (${chainStatus.checkedEntries})`
                      : "Integrity issue detected"
                    : `${overview.recentActivityCount} in last 30 days`
                }
                chainStatus={chainStatus}
              />

              {/* Action Items */}
              <MetricCard
                icon={<AlertTriangle size={15} />}
                iconColor="text-amber-500"
                label="Action Items"
                value={overview.actionItems.length.toString()}
                sub={
                  overview.actionItems.length > 0
                    ? "Require attention"
                    : "All up to date"
                }
                valueColor={
                  overview.actionItems.length > 0
                    ? "text-amber-500"
                    : "text-emerald-600"
                }
              />
            </div>

            {/* ─── Filter Bar ─── */}
            <div
              className={`flex items-center gap-2 flex-wrap p-2 rounded-xl ${innerGlassDarkClass}`}
              style={innerGlass}
            >
              <div className="flex items-center gap-1.5 text-[11px] tracking-wide font-medium text-slate-400 px-2">
                <Filter size={12} />
                Filter:
              </div>
              <FilterButton
                active={regulationFilter === "all"}
                onClick={() => setRegulationFilter("all")}
              >
                All
              </FilterButton>
              {overview.modules.map((m) => {
                const rc = regulationColors[m.regulationType] || {
                  ...defaultRegColor,
                  label: m.module,
                };
                return (
                  <FilterButton
                    key={m.regulationType}
                    active={regulationFilter === m.regulationType}
                    onClick={() => setRegulationFilter(m.regulationType)}
                  >
                    {rc.label}
                  </FilterButton>
                );
              })}
            </div>

            {/* ─── Module Compliance Overview ─── */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 px-1">
                <Layers size={15} className="text-slate-400" />
                Module Compliance ({filteredModules.length})
              </h3>

              <div
                className={`rounded-xl overflow-hidden ${innerGlassDarkClass}`}
                style={innerGlass}
              >
                {filteredModules.map((mod, idx) => {
                  const isExpanded = expandedModules.has(mod.module);
                  const rc = regulationColors[mod.regulationType] || {
                    ...defaultRegColor,
                    label: mod.module,
                  };

                  return (
                    <div
                      key={mod.module}
                      className={
                        idx > 0
                          ? "border-t border-black/[0.04] dark:border-white/5"
                          : ""
                      }
                    >
                      <button
                        onClick={() => toggleModuleExpand(mod.module)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/40 dark:hover:bg-white/5 transition-colors text-left"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md ${rc.bg} ${rc.text}`}
                          >
                            {rc.label}
                          </span>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">
                            {mod.module}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                          <span
                            className={`text-sm font-semibold ${scoreColor(mod.score)}`}
                          >
                            {mod.score}%
                          </span>
                          <span className="text-xs text-slate-400 hidden sm:inline">
                            {mod.compliant}/{mod.totalRequirements}
                          </span>
                          <motion.div
                            animate={{ rotate: isExpanded ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown size={14} className="text-slate-400" />
                          </motion.div>
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 pl-7">
                              {/* Status legend */}
                              <div className="flex gap-4 mb-3 flex-wrap">
                                {[
                                  {
                                    label: "Compliant",
                                    count: mod.compliant,
                                    color: "bg-emerald-500",
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
                                    color: "bg-slate-300",
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
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {s.count} {s.label}
                                      </span>
                                    </div>
                                  ))}
                              </div>

                              {/* Progress bar */}
                              <div className="h-1.5 bg-black/[0.04] dark:bg-white/10 rounded-full overflow-hidden flex">
                                {mod.totalRequirements > 0 && (
                                  <>
                                    <div
                                      className="h-full bg-emerald-500"
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
                                <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1">
                                  <Clock size={10} />
                                  Last updated:{" "}
                                  {new Date(
                                    mod.lastUpdated,
                                  ).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}

                {filteredModules.length === 0 && (
                  <div className="p-8 text-center">
                    <Shield className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-400">
                      No compliance modules found. Start an assessment to see
                      data here.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ─── Action Items ─── */}
            {filteredActions.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 px-1">
                  <AlertTriangle size={15} className="text-amber-500" />
                  Action Items ({filteredActions.length})
                </h3>

                <div
                  className={`rounded-xl overflow-hidden ${innerGlassDarkClass}`}
                  style={innerGlass}
                >
                  {filteredActions.slice(0, 20).map((item, idx) => {
                    const rc = regulationColors[item.regulationType] || {
                      ...defaultRegColor,
                      label: item.regulationType,
                    };
                    return (
                      <div
                        key={`${item.regulationType}-${item.requirementId}-${idx}`}
                        className={`flex items-center justify-between px-4 py-3 hover:bg-white/40 dark:hover:bg-white/5 transition-colors ${
                          idx > 0
                            ? "border-t border-black/[0.04] dark:border-white/5"
                            : ""
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${rc.bg} ${rc.text}`}
                          >
                            {rc.label}
                          </span>
                          <span className="text-xs font-medium font-mono text-slate-700 dark:text-slate-200">
                            {item.requirementId}
                          </span>
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-md flex-shrink-0 ${
                              item.status === "non_compliant"
                                ? "text-red-600 bg-red-50"
                                : "text-slate-500 bg-slate-100"
                            }`}
                          >
                            {item.status.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          {!item.hasEvidence && (
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-amber-50 text-amber-600">
                              No evidence
                            </span>
                          )}
                          <Link
                            href={item.modulePath}
                            className="p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-white/40 transition-all"
                          >
                            <ExternalLink size={13} />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                  {filteredActions.length > 20 && (
                    <div className="px-4 py-3 text-center border-t border-black/[0.04] dark:border-white/5">
                      <span className="text-xs text-slate-400">
                        + {filteredActions.length - 20} more items
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ─── Export Panel ─── */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 px-1">
                <Download size={15} className="text-slate-400" />
                Export & Verification
              </h3>

              <div
                className={`rounded-xl p-4 ${innerGlassDarkClass}`}
                style={innerGlass}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {[
                    {
                      label: "Audit Report",
                      sub: "PDF with full trail",
                      icon: FileText,
                      color: "text-indigo-500",
                      loading: exportingPdf,
                      onClick: handleExportPdf,
                    },
                    {
                      label: "Audit Trail",
                      sub: "CSV export",
                      icon: BarChart3,
                      color: "text-blue-500",
                      loading: exportingCsv,
                      onClick: handleExportCsv,
                    },
                    {
                      label: "Certificate",
                      sub: "Compliance cert",
                      icon: ShieldCheck,
                      color: "text-emerald-500",
                      loading: exportingCert,
                      onClick: handleExportCertificate,
                    },
                    {
                      label: "Verify Integrity",
                      sub: "Hash chain check",
                      icon: CheckCircle2,
                      color: "text-amber-500",
                      loading: verifyingChain,
                      onClick: handleVerifyChain,
                    },
                  ].map((btn) => (
                    <button
                      key={btn.label}
                      onClick={btn.onClick}
                      disabled={btn.loading}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/30 dark:bg-white/5 border border-black/[0.04] dark:border-white/5 hover:bg-white/50 dark:hover:bg-white/10 transition-all text-left disabled:opacity-50"
                    >
                      {btn.loading ? (
                        <Loader2
                          size={15}
                          className={`animate-spin ${btn.color}`}
                        />
                      ) : (
                        <btn.icon size={15} className={btn.color} />
                      )}
                      <div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                          {btn.label}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {btn.sub}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Evidence summary */}
                {overview.evidenceCoverage.byStatus.accepted +
                  overview.evidenceCoverage.byStatus.submitted >
                  0 && (
                  <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/5 flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-slate-400">Evidence:</span>
                    {overview.evidenceCoverage.byStatus.accepted > 0 && (
                      <span className="text-[11px] font-medium bg-emerald-50 text-emerald-600 rounded-md px-2 py-0.5">
                        {overview.evidenceCoverage.byStatus.accepted} accepted
                      </span>
                    )}
                    {overview.evidenceCoverage.byStatus.submitted > 0 && (
                      <span className="text-[11px] font-medium bg-indigo-50 text-indigo-600 rounded-md px-2 py-0.5">
                        {overview.evidenceCoverage.byStatus.submitted} submitted
                      </span>
                    )}
                    {overview.evidenceCoverage.byStatus.draft > 0 && (
                      <span className="text-[11px] font-medium bg-slate-100 text-slate-500 rounded-md px-2 py-0.5">
                        {overview.evidenceCoverage.byStatus.draft} draft
                      </span>
                    )}
                    {overview.evidenceCoverage.byStatus.rejected > 0 && (
                      <span className="text-[11px] font-medium bg-red-50 text-red-600 rounded-md px-2 py-0.5">
                        {overview.evidenceCoverage.byStatus.rejected} rejected
                      </span>
                    )}
                  </div>
                )}

                {/* Tamper-Evident Audit Trail */}
                <div className="mt-4 pt-3 border-t border-black/[0.04] dark:border-white/5">
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-50/50 dark:bg-emerald-500/[0.04] border border-emerald-200/40 dark:border-emerald-500/10">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Fingerprint
                        size={16}
                        className="text-emerald-600 dark:text-emerald-400"
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                          Tamper-Evident Audit Trail
                        </span>
                        <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          SHA-256
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                        All audit entries are timestamped with server-side UTC
                        timestamps and linked via SHA-256 hash chain. Each entry
                        references the previous hash, creating a tamper-evident
                        sequence of compliance events.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sidebar Stat Row ───

function SidebarStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-white/30 transition-colors">
      <span className="text-slate-400">{icon}</span>
      <span className="text-xs text-slate-500 dark:text-slate-400 flex-1">
        {label}
      </span>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Compliance Ring ───

function ComplianceRing({
  value,
  size,
  color,
}: {
  value: number;
  size: number;
  color: string;
}) {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  // Map text color to stroke color
  const strokeColor = color.includes("emerald")
    ? "#10b981"
    : color.includes("amber")
      ? "#f59e0b"
      : "#ef4444";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(0,0,0,0.06)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
    </svg>
  );
}

// ─── Metric Card ───

function MetricCard({
  icon,
  iconColor,
  label,
  value,
  sub,
  progress,
  progressColor,
  valueColor,
  chainStatus,
}: {
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: string;
  sub: string;
  progress?: number;
  progressColor?: string;
  valueColor?: string;
  chainStatus?: { valid: boolean; checkedEntries: number } | null;
}) {
  return (
    <div className={`rounded-xl p-4 ${innerGlassDarkClass}`} style={innerGlass}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{icon}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
          {label}
        </span>
      </div>
      <p
        className={`text-2xl font-semibold ${valueColor || "text-slate-800 dark:text-white"} leading-none tracking-tight`}
      >
        {value}
      </p>
      {progress !== undefined && progressColor && (
        <div className="h-1 bg-black/[0.04] dark:bg-white/10 rounded-full mt-3 overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${progressColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 1, ease: [0.22, 0.61, 0.36, 1] }}
          />
        </div>
      )}
      {chainStatus ? (
        <div
          className={`flex items-center gap-1 mt-2 text-[11px] ${chainStatus.valid ? "text-emerald-600" : "text-red-500"}`}
        >
          {chainStatus.valid ? (
            <CheckCircle2 size={11} />
          ) : (
            <AlertTriangle size={11} />
          )}
          {sub}
        </div>
      ) : (
        <p className="text-[11px] text-slate-400 mt-2">{sub}</p>
      )}
    </div>
  );
}

// ─── Filter Button ───

function FilterButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
        active
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          : "text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-white"
      }`}
    >
      {children}
    </button>
  );
}
