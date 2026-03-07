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
  ExternalLink,
  BarChart3,
  Archive,
  Layers,
  ClipboardCheck,
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
  { bg: string; text: string; border: string; label: string }
> = {
  EU_SPACE_ACT: {
    bg: "bg-[rgba(110,139,250,0.10)]",
    text: "text-[var(--module-eu-space-act)]",
    border: "border-[rgba(110,139,250,0.15)]",
    label: "EU Space Act",
  },
  NIS2: {
    bg: "bg-[rgba(90,173,255,0.10)]",
    text: "text-[var(--module-nis2)]",
    border: "border-[rgba(90,173,255,0.15)]",
    label: "NIS2",
  },
  CYBERSECURITY: {
    bg: "bg-[rgba(167,139,250,0.10)]",
    text: "text-[var(--module-cybersecurity)]",
    border: "border-[rgba(167,139,250,0.15)]",
    label: "Cybersecurity",
  },
  DEBRIS: {
    bg: "bg-[rgba(245,166,35,0.10)]",
    text: "text-[var(--module-debris)]",
    border: "border-[rgba(245,166,35,0.15)]",
    label: "Debris",
  },
  ENVIRONMENTAL: {
    bg: "bg-[rgba(69,217,176,0.10)]",
    text: "text-[var(--module-environmental)]",
    border: "border-[rgba(69,217,176,0.15)]",
    label: "Environmental",
  },
  INSURANCE: {
    bg: "bg-[rgba(61,214,140,0.10)]",
    text: "text-[var(--module-insurance)]",
    border: "border-[rgba(61,214,140,0.15)]",
    label: "Insurance",
  },
  AUTHORIZATION: {
    bg: "bg-[rgba(110,139,250,0.10)]",
    text: "text-[var(--module-eu-space-act)]",
    border: "border-[rgba(110,139,250,0.15)]",
    label: "Authorization",
  },
};

const defaultRegColor = {
  bg: "bg-[var(--fill-light)]",
  text: "text-[var(--text-tertiary)]",
  border: "border-[var(--separator-strong)]",
  label: "",
};

// Card top-border accent colors
const METRIC_BORDERS = [
  "rgba(74, 98, 232, 0.4)",
  "rgba(90, 173, 255, 0.4)",
  "rgba(167, 139, 250, 0.4)",
  "rgba(245, 166, 35, 0.4)",
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
      ? "text-[var(--status-success)]"
      : score >= 31
        ? "text-[var(--status-warning)]"
        : "text-[var(--status-danger)]";

  const progressGradient = (score: number) =>
    score >= 71
      ? "from-[var(--status-success)] to-[#5EEDAA]"
      : score >= 31
        ? "from-[var(--status-warning)] to-[#FFB84D]"
        : "from-[var(--status-danger)] to-[#F07070]";

  const progressGlow = (score: number) =>
    score >= 71
      ? "shadow-[0_0_8px_rgba(61,214,140,0.3)]"
      : score >= 31
        ? "shadow-[0_0_8px_rgba(245,166,35,0.3)]"
        : "shadow-[0_0_8px_rgba(232,84,84,0.3)]";

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-disabled)]" />
      </div>
    );
  }

  if (error && !overview) {
    return (
      <div className="space-y-4">
        <div className="bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-[var(--radius-md)] p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-danger)] flex-shrink-0" />
          <p className="text-[13px] text-[var(--status-danger)]">{error}</p>
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
    <div className="space-y-8">
      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[rgba(74,98,232,0.08)] flex items-center justify-center">
            <ClipboardCheck className="w-5 h-5 text-[var(--accent-400)]" />
          </div>
          <div>
            <h1 className="text-[22px] font-semibold text-[var(--text-primary)] tracking-[-0.015em]">
              Audit Center
            </h1>
            <p className="text-[13px] text-[var(--text-tertiary)]">
              Regulatory audit readiness at a glance
            </p>
          </div>
        </div>
        <button
          onClick={() => fetchOverview(true)}
          disabled={refreshing}
          className="
            flex items-center gap-2 px-4 py-2 text-[14px]
            text-[var(--text-secondary)] border border-[var(--fill-strong)]
            rounded-[var(--radius-sm)]
            hover:bg-[var(--fill-light)] hover:border-[var(--fill-heavy)] hover:text-[var(--text-primary)]
            transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
            disabled:opacity-50
          "
        >
          <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
          Refresh
        </button>
      </motion.div>

      {/* Error banner */}
      {error && (
        <div className="bg-[var(--status-danger-bg)] border border-[var(--status-danger-border)] rounded-[var(--radius-md)] p-4 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--status-danger)] flex-shrink-0" />
          <p className="text-[13px] text-[var(--status-danger)]">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-[var(--status-danger)] hover:text-[var(--text-primary)] transition-colors duration-[var(--duration-fast)]"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Metrics Row ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Compliance Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.1,
            duration: 0.5,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          className="glass-elevated rounded-[var(--radius-lg)] p-6 group hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-spring)]"
          style={{ borderTop: `2px solid ${METRIC_BORDERS[0]}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-[var(--accent-400)] opacity-70" />
            <span className="text-[12px] font-medium uppercase tracking-[0.03em] text-[var(--text-secondary)]">
              Compliance Score
            </span>
          </div>
          <p className="text-[48px] font-semibold text-[var(--text-primary)] leading-none tracking-[-0.03em] group-hover:[text-shadow:0_0_30px_rgba(232,232,237,0.05)]">
            {overview.complianceScore}%
          </p>
          <div
            className="h-1 bg-[var(--fill-medium)] rounded-full mt-4 overflow-hidden"
            style={{ boxShadow: "var(--shadow-inset)" }}
          >
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r ${progressGradient(overview.complianceScore)} ${progressGlow(overview.complianceScore)}`}
              initial={{ width: 0 }}
              animate={{ width: `${overview.complianceScore}%` }}
              transition={{
                duration: 1.2,
                ease: [0.22, 0.61, 0.36, 1],
                delay: 0.6,
              }}
            />
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-3">
            Across {overview.modules.length} modules
          </p>
        </motion.div>

        {/* Evidence Coverage */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.17,
            duration: 0.5,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          className="glass-elevated rounded-[var(--radius-lg)] p-6 group hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-spring)]"
          style={{ borderTop: `2px solid ${METRIC_BORDERS[1]}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <Archive className="w-4 h-4 text-[var(--status-info)] opacity-70" />
            <span className="text-[12px] font-medium uppercase tracking-[0.03em] text-[var(--text-secondary)]">
              Evidence Coverage
            </span>
          </div>
          <p className="text-[48px] font-semibold text-[var(--text-primary)] leading-none tracking-[-0.03em] group-hover:[text-shadow:0_0_30px_rgba(232,232,237,0.05)]">
            {overview.evidenceCoverage.percentage}%
          </p>
          <div
            className="h-1 bg-[var(--fill-medium)] rounded-full mt-4 overflow-hidden"
            style={{ boxShadow: "var(--shadow-inset)" }}
          >
            <motion.div
              className={`h-full rounded-full bg-gradient-to-r from-[var(--status-info)] to-[#7DC4FF] shadow-[0_0_8px_rgba(90,173,255,0.3)]`}
              initial={{ width: 0 }}
              animate={{ width: `${overview.evidenceCoverage.percentage}%` }}
              transition={{
                duration: 1.2,
                ease: [0.22, 0.61, 0.36, 1],
                delay: 0.7,
              }}
            />
          </div>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-3">
            {overview.evidenceCoverage.withEvidence} of{" "}
            {overview.evidenceCoverage.totalRequirements} requirements
          </p>
        </motion.div>

        {/* Audit Trail */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.24,
            duration: 0.5,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          className="glass-elevated rounded-[var(--radius-lg)] p-6 group hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-spring)]"
          style={{ borderTop: `2px solid ${METRIC_BORDERS[2]}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-[#A78BFA] opacity-70" />
            <span className="text-[12px] font-medium uppercase tracking-[0.03em] text-[var(--text-secondary)]">
              Audit Trail
            </span>
          </div>
          <p className="text-[48px] font-semibold text-[var(--text-primary)] leading-none tracking-[-0.03em] group-hover:[text-shadow:0_0_30px_rgba(232,232,237,0.05)]">
            {overview.totalAuditEntries.toLocaleString()}
          </p>
          {chainStatus ? (
            <div
              className={`flex items-center gap-1.5 mt-4 text-[12px] ${chainStatus.valid ? "text-[var(--status-success)]" : "text-[var(--status-danger)]"}`}
            >
              {chainStatus.valid ? (
                <CheckCircle2 size={13} />
              ) : (
                <AlertTriangle size={13} />
              )}
              {chainStatus.valid
                ? `Chain verified (${chainStatus.checkedEntries} entries)`
                : "Integrity issue detected"}
            </div>
          ) : (
            <p className="text-[12px] text-[var(--text-tertiary)] mt-4">
              {overview.recentActivityCount} entries in last 30 days
            </p>
          )}
        </motion.div>

        {/* Action Items */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.31,
            duration: 0.5,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          className="glass-elevated rounded-[var(--radius-lg)] p-6 group hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)] transition-all duration-[var(--duration-normal)] ease-[var(--ease-spring)]"
          style={{ borderTop: `2px solid ${METRIC_BORDERS[3]}` }}
        >
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-[var(--status-warning)] opacity-70" />
            <span className="text-[12px] font-medium uppercase tracking-[0.03em] text-[var(--text-secondary)]">
              Action Items
            </span>
          </div>
          <p
            className={`text-[48px] font-semibold leading-none tracking-[-0.03em] group-hover:[text-shadow:0_0_30px_rgba(232,232,237,0.05)] ${overview.actionItems.length > 0 ? "text-[var(--status-warning)]" : "text-[var(--status-success)]"}`}
          >
            {overview.actionItems.length}
          </p>
          <p className="text-[12px] text-[var(--text-tertiary)] mt-4">
            {overview.actionItems.length > 0
              ? "Require attention"
              : "All up to date"}
          </p>
        </motion.div>
      </div>

      {/* ─── Filter Bar ─── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.3 }}
        className="flex items-center gap-2 flex-wrap p-1 bg-[var(--fill-subtle)] rounded-[var(--radius-md)] border border-[var(--separator)]"
      >
        <div className="flex items-center gap-1.5 text-[11px] tracking-[0.04em] font-medium text-[var(--text-tertiary)] px-2">
          <Filter size={12} />
          Filter:
        </div>
        <button
          onClick={() => setRegulationFilter("all")}
          className={`px-3.5 py-1.5 rounded-[var(--radius-sm)] text-[13px] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
            regulationFilter === "all"
              ? "bg-[rgba(74,98,232,0.1)] text-[var(--accent-300)] font-medium shadow-[0_0_0_1px_rgba(74,98,232,0.2)]"
              : "text-[var(--text-secondary)] hover:bg-[var(--fill-light)] hover:text-[var(--text-primary)]"
          }`}
        >
          All
        </button>
        {overview.modules.map((m) => {
          const rc = regulationColors[m.regulationType] || {
            ...defaultRegColor,
            label: m.module,
          };
          const isActive = regulationFilter === m.regulationType;
          return (
            <button
              key={m.regulationType}
              onClick={() => setRegulationFilter(m.regulationType)}
              className={`px-3.5 py-1.5 rounded-[var(--radius-sm)] text-[13px] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] ${
                isActive
                  ? `${rc.bg} ${rc.text} font-medium shadow-[0_0_0_1px_var(--fill-strong)]`
                  : "text-[var(--text-secondary)] hover:bg-[var(--fill-light)] hover:text-[var(--text-primary)]"
              }`}
            >
              {rc.label}
            </button>
          );
        })}
      </motion.div>

      {/* ─── Module Compliance Overview ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="space-y-3"
      >
        <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em] flex items-center gap-2">
          <Layers size={18} className="text-[var(--text-tertiary)]" />
          Module Compliance ({filteredModules.length})
        </h2>

        {filteredModules.map((mod) => {
          const isExpanded = expandedModules.has(mod.module);
          const rc = regulationColors[mod.regulationType] || {
            ...defaultRegColor,
            label: mod.module,
          };

          return (
            <div
              key={mod.module}
              className={`
                rounded-[var(--radius-md)] overflow-hidden transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
                ${
                  isExpanded
                    ? "bg-[var(--fill-subtle)] shadow-[var(--shadow-sm)]"
                    : "border-b border-[var(--fill-subtle)]"
                }
              `}
            >
              <button
                onClick={() => toggleModuleExpand(mod.module)}
                className="w-full flex items-center justify-between px-4 py-3.5 hover:bg-[var(--fill-subtle)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] text-left group/row rounded-[var(--radius-md)] hover:translate-x-0.5"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span
                    className={`text-[11px] font-medium tracking-[0.04em] px-2.5 py-1 rounded-[var(--radius-xs)] border ${rc.bg} ${rc.text} ${rc.border}`}
                  >
                    {rc.label}
                  </span>
                  <span className="text-[14px] font-medium text-[var(--text-primary)]">
                    {mod.module}
                  </span>
                </div>
                <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                  <span
                    className={`text-[15px] font-semibold tracking-[-0.005em] ${scoreColor(mod.score)}`}
                  >
                    {mod.score}%
                  </span>
                  <span className="text-[13px] text-[var(--text-tertiary)] hidden sm:inline">
                    {mod.compliant}/{mod.totalRequirements}
                  </span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.3, ease: [0.34, 1.56, 0.64, 1] }}
                  >
                    <ChevronDown
                      size={16}
                      className="text-[var(--text-tertiary)]"
                    />
                  </motion.div>
                </div>
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 py-4 pl-8">
                      {/* Status legend */}
                      <div className="flex gap-4 mb-4 flex-wrap">
                        {[
                          {
                            label: "Compliant",
                            count: mod.compliant,
                            color: "bg-[var(--status-success)]",
                          },
                          {
                            label: "Partial",
                            count: mod.partial,
                            color: "bg-[var(--status-warning)]",
                          },
                          {
                            label: "Non-Compliant",
                            count: mod.nonCompliant,
                            color: "bg-[var(--status-danger)]",
                          },
                          {
                            label: "Not Assessed",
                            count: mod.notAssessed,
                            color: "bg-[var(--text-tertiary)]",
                          },
                          {
                            label: "N/A",
                            count: mod.notApplicable,
                            color: "bg-[var(--text-disabled)]",
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
                              <span className="text-[12px] text-[var(--text-secondary)]">
                                {s.count} {s.label}
                              </span>
                            </div>
                          ))}
                      </div>

                      {/* Progress bar */}
                      <div
                        className="h-1.5 bg-[var(--fill-medium)] rounded-full overflow-hidden flex"
                        style={{ boxShadow: "var(--shadow-inset)" }}
                      >
                        {mod.totalRequirements > 0 && (
                          <>
                            <div
                              className="h-full bg-[var(--status-success)]"
                              style={{
                                width: `${(mod.compliant / mod.totalRequirements) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-[var(--status-warning)]"
                              style={{
                                width: `${(mod.partial / mod.totalRequirements) * 100}%`,
                              }}
                            />
                            <div
                              className="h-full bg-[var(--status-danger)]"
                              style={{
                                width: `${(mod.nonCompliant / mod.totalRequirements) * 100}%`,
                              }}
                            />
                          </>
                        )}
                      </div>

                      {mod.lastUpdated && (
                        <div className="text-[11px] text-[var(--text-tertiary)] mt-3 flex items-center gap-1">
                          <Clock size={10} />
                          Last updated:{" "}
                          {new Date(mod.lastUpdated).toLocaleDateString()}
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
          <div className="glass-card rounded-[var(--radius-lg)] p-8 text-center">
            <Shield className="w-8 h-8 text-[var(--text-disabled)] mx-auto mb-2" />
            <p className="text-[13px] text-[var(--text-tertiary)]">
              No compliance modules found. Start an assessment to see data here.
            </p>
          </div>
        )}
      </motion.div>

      {/* ─── Action Items ─── */}
      {filteredActions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: 0.55,
            duration: 0.4,
            ease: [0.22, 0.61, 0.36, 1],
          }}
          className="space-y-3"
        >
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em] flex items-center gap-2">
            <AlertTriangle size={18} className="text-[var(--status-warning)]" />
            Action Items ({filteredActions.length})
          </h2>

          <div className="glass-card rounded-[var(--radius-lg)] divide-y divide-[var(--fill-subtle)] overflow-hidden">
            {filteredActions.slice(0, 20).map((item, idx) => {
              const rc = regulationColors[item.regulationType] || {
                ...defaultRegColor,
                label: item.regulationType,
              };
              return (
                <div
                  key={`${item.regulationType}-${item.requirementId}-${idx}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[var(--fill-subtle)] transition-all duration-[var(--duration-fast)]"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <span
                      className={`text-[11px] font-medium tracking-[0.04em] px-2.5 py-1 rounded-[var(--radius-xs)] border flex-shrink-0 ${rc.bg} ${rc.text} ${rc.border}`}
                    >
                      {rc.label}
                    </span>
                    <span className="text-[13px] font-medium font-mono tracking-[-0.02em] text-[var(--text-primary)]">
                      {item.requirementId}
                    </span>
                    <span
                      className={`text-[11px] font-medium tracking-[0.04em] px-2 py-0.5 rounded-[var(--radius-xs)] flex-shrink-0 ${
                        item.status === "non_compliant"
                          ? "text-[var(--status-danger)] bg-[var(--status-danger-bg)]"
                          : "text-[var(--text-tertiary)] bg-[var(--fill-light)]"
                      }`}
                    >
                      {item.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                    {!item.hasEvidence && (
                      <span className="text-[11px] font-medium tracking-[0.04em] px-2 py-0.5 rounded-[var(--radius-xs)] bg-[var(--status-warning-bg)] text-[var(--status-warning)] border border-[var(--status-warning-border)]">
                        No evidence
                      </span>
                    )}
                    <Link
                      href={item.modulePath}
                      className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--accent-400)] rounded-[var(--radius-xs)] hover:bg-[var(--fill-light)] transition-all duration-[var(--duration-fast)]"
                    >
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </div>
              );
            })}
            {filteredActions.length > 20 && (
              <div className="px-4 py-3 text-center">
                <span className="text-[12px] text-[var(--text-tertiary)]">
                  + {filteredActions.length - 20} more items
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Export Panel ─── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6, duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
        className="glass-card rounded-[var(--radius-lg)] p-6"
      >
        <div className="flex items-center gap-3 mb-5">
          <Download className="w-4 h-4 text-[var(--text-tertiary)]" />
          <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
            Export & Verification
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              label: "Audit Report",
              sub: "PDF with full trail",
              icon: FileText,
              color: "text-[var(--accent-400)]",
              loading: exportingPdf,
              onClick: handleExportPdf,
            },
            {
              label: "Audit Trail",
              sub: "CSV export",
              icon: BarChart3,
              color: "text-[var(--status-info)]",
              loading: exportingCsv,
              onClick: handleExportCsv,
            },
            {
              label: "Certificate",
              sub: "Compliance cert",
              icon: ShieldCheck,
              color: "text-[var(--status-success)]",
              loading: exportingCert,
              onClick: handleExportCertificate,
            },
            {
              label: "Verify Integrity",
              sub: "Hash chain check",
              icon: CheckCircle2,
              color: "text-[var(--status-warning)]",
              loading: verifyingChain,
              onClick: handleVerifyChain,
            },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.onClick}
              disabled={btn.loading}
              className="
                flex items-center gap-3 px-4 py-3
                glass-inset rounded-[var(--radius-md)]
                hover:bg-[var(--fill-light)] hover:border-[var(--fill-strong)]
                transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)]
                text-left disabled:opacity-50
              "
            >
              {btn.loading ? (
                <Loader2 size={16} className={`animate-spin ${btn.color}`} />
              ) : (
                <btn.icon size={16} className={btn.color} />
              )}
              <div>
                <div className="text-[13px] font-medium text-[var(--text-secondary)]">
                  {btn.label}
                </div>
                <div className="text-[11px] text-[var(--text-tertiary)]">
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
          <div className="mt-5 pt-4 border-t border-[var(--separator)] flex items-center gap-3 flex-wrap">
            <span className="text-[12px] text-[var(--text-tertiary)]">
              Evidence:
            </span>
            {overview.evidenceCoverage.byStatus.accepted > 0 && (
              <span className="text-[11px] font-medium bg-[var(--status-success-bg)] text-[var(--status-success)] border border-[var(--status-success-border)] rounded-[var(--radius-xs)] px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.accepted} accepted
              </span>
            )}
            {overview.evidenceCoverage.byStatus.submitted > 0 && (
              <span className="text-[11px] font-medium bg-[var(--accent-primary-soft)] text-[var(--accent-300)] border border-[rgba(74,98,232,0.15)] rounded-[var(--radius-xs)] px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.submitted} submitted
              </span>
            )}
            {overview.evidenceCoverage.byStatus.draft > 0 && (
              <span className="text-[11px] font-medium bg-[var(--fill-light)] text-[var(--text-tertiary)] border border-[var(--separator-strong)] rounded-[var(--radius-xs)] px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.draft} draft
              </span>
            )}
            {overview.evidenceCoverage.byStatus.rejected > 0 && (
              <span className="text-[11px] font-medium bg-[var(--status-danger-bg)] text-[var(--status-danger)] border border-[var(--status-danger-border)] rounded-[var(--radius-xs)] px-2 py-0.5">
                {overview.evidenceCoverage.byStatus.rejected} rejected
              </span>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
