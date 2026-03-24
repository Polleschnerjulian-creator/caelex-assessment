"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Radio,
  AlertTriangle,
  AlertCircle,
  Info,
  Loader2,
  ExternalLink,
  CheckCircle2,
  Eye,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ─── Types ───

interface RegulatoryUpdate {
  id: string;
  celexNumber: string;
  title: string;
  documentType: string;
  sourceUrl: string;
  publishedAt: string;
  severity: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  affectedModules: string[];
  matchReason: string;
  summary: string | null;
  createdAt: string;
  isRead: boolean;
}

// ─── Glass Styles ───

const glassPanelLight: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.55)",
  backdropFilter: "blur(24px) saturate(1.4)",
  WebkitBackdropFilter: "blur(24px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.45)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
  overflow: "hidden",
};

const glassPanelDark: React.CSSProperties = {
  background: "var(--glass-bg-2)",
  backdropFilter: "blur(var(--glass-blur-2))",
  WebkitBackdropFilter: "blur(var(--glass-blur-2))",
  border: "1px solid var(--glass-border-2)",
  borderRadius: 20,
  boxShadow: "var(--glass-shadow-2)",
  overflow: "hidden",
};

const innerGlassLight: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.45)",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
  border: "1px solid rgba(255, 255, 255, 0.5)",
  borderRadius: 14,
  boxShadow:
    "0 2px 8px rgba(0, 0, 0, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.5)",
};

const innerGlassDarkStyle: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: 14,
  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
};

// ─── Severity Config ───

const SEVERITY_CONFIG: Record<
  string,
  {
    icon: typeof AlertTriangle;
    color: string;
    bg: string;
    label: string;
  }
> = {
  CRITICAL: {
    icon: AlertTriangle,
    color: "text-red-500",
    bg: "bg-red-500/10",
    label: "Critical",
  },
  HIGH: {
    icon: AlertCircle,
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    label: "High",
  },
  MEDIUM: {
    icon: Info,
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    label: "Medium",
  },
  LOW: {
    icon: Info,
    color: "text-slate-400",
    bg: "bg-slate-400/10",
    label: "Low",
  },
};

const DOC_TYPE_LABELS: Record<string, string> = {
  REG_DEL: "Delegated Regulation",
  REG_IMPL: "Implementing Regulation",
  DIR_DEL: "Delegated Directive",
  DIR_IMPL: "Implementing Directive",
  DEC_IMPL: "Implementing Decision",
  UNKNOWN: "EU Act",
};

const MODULE_LABELS: Record<string, string> = {
  cybersecurity: "Cybersecurity",
  nis2: "NIS2",
  debris: "Debris",
  insurance: "Insurance",
  authorization: "Authorization",
  environmental: "Environmental",
  registration: "Registration",
  supervision: "Supervision",
};

const SEVERITY_FILTERS = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"] as const;

export default function RegulatoryFeedPage() {
  const { t } = useLanguage();
  const [updates, setUpdates] = useState<RegulatoryUpdate[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const glassPanel = isDark ? glassPanelDark : glassPanelLight;
  const innerGlass = isDark ? innerGlassDarkStyle : innerGlassLight;
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [moduleFilter, setModuleFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [markingRead, setMarkingRead] = useState<string | null>(null);

  const fetchUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "20",
      });
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (moduleFilter) params.set("module", moduleFilter);

      const res = await fetch(`/api/regulatory-feed?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setUpdates(data.updates || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setUpdates([]);
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, moduleFilter]);

  useEffect(() => {
    fetchUpdates();
  }, [fetchUpdates]);

  const handleMarkAsRead = async (updateId: string) => {
    setMarkingRead(updateId);
    try {
      const res = await fetch("/api/regulatory-feed", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updateId }),
      });
      if (res.ok) {
        setUpdates((prev) =>
          prev.map((u) => (u.id === updateId ? { ...u, isRead: true } : u)),
        );
      }
    } finally {
      setMarkingRead(null);
    }
  };

  // Stats
  const criticalCount = updates.filter((u) => u.severity === "CRITICAL").length;
  const highCount = updates.filter((u) => u.severity === "HIGH").length;
  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const thisWeekCount = updates.filter(
    (u) => new Date(u.publishedAt) >= oneWeekAgo,
  ).length;

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <FeatureGate module="regulatory-feed">
      <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent p-3 gap-3">
        {/* ─── Left Sidebar ─── */}
        <div
          className="flex flex-col w-[260px] flex-shrink-0"
          style={glassPanel}
        >
          <div className="p-5 pb-4">
            <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
              {t("regulatoryFeed.title")}
            </h1>
            <p className="text-small text-slate-500 dark:text-white/[0.55] mt-0.5">
              {t("regulatoryFeed.subtitle")}
            </p>
          </div>

          {/* Stats */}
          <div className="px-4 pb-4 space-y-2">
            <SidebarStat
              label={t("regulatoryFeed.totalUpdates")}
              value={total}
            />
            <SidebarStat
              label={t("regulatoryFeed.criticalUpdates")}
              value={criticalCount}
              accent="text-red-500"
            />
            <SidebarStat
              label={t("regulatoryFeed.highUpdates")}
              value={highCount}
              accent="text-amber-500"
            />
            <SidebarStat
              label={t("regulatoryFeed.thisWeek")}
              value={thisWeekCount}
              accent="text-indigo-500"
            />
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-slate-200/60 dark:border-white/10" />

          {/* Severity Filters */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-micro font-medium text-slate-400 uppercase tracking-wider mb-2">
              Severity
            </p>
            <div className="flex flex-col gap-1">
              {SEVERITY_FILTERS.map((sev) => {
                const isActive = severityFilter === sev;
                return (
                  <button
                    key={sev}
                    onClick={() => {
                      setSeverityFilter(sev);
                      setPage(1);
                    }}
                    className={`text-small px-3 py-1.5 rounded-lg font-medium text-left transition-all ${
                      isActive
                        ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                        : "text-slate-500 hover:bg-slate-100/60 dark:hover:bg-white/5"
                    }`}
                  >
                    {sev === "ALL"
                      ? t("regulatoryFeed.allSeverities")
                      : sev.charAt(0) + sev.slice(1).toLowerCase()}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Divider */}
          <div className="mx-4 border-t border-slate-200/60 dark:border-white/10" />

          {/* Module Filter */}
          <div className="px-4 pt-4 pb-3">
            <p className="text-micro font-medium text-slate-400 uppercase tracking-wider mb-2">
              Module
            </p>
            <div className="relative">
              <select
                value={moduleFilter}
                onChange={(e) => {
                  setModuleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full text-small px-3 py-2 rounded-lg bg-white/40 dark:bg-white/5 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-white/10 appearance-none pr-7 cursor-pointer transition-colors hover:bg-white/60 dark:hover:bg-white/10"
              >
                <option value="">{t("regulatoryFeed.filterByModule")}</option>
                {Object.entries(MODULE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={12}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
            </div>
          </div>

          {/* Spacer */}
          <div className="flex-1" />

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="p-4 border-t border-slate-200/60 dark:border-white/10">
              <div className="flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100/60 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-small text-slate-500">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100/60 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* ─── Right Panel ─── */}
        <div className="flex-1 flex flex-col min-w-0" style={glassPanel}>
          <div className="flex-1 overflow-y-auto p-5">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 size={24} className="animate-spin text-slate-400" />
              </div>
            ) : updates.length === 0 ? (
              <EmptyState t={t} />
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {updates.map((update) => (
                    <FeedItem
                      key={update.id}
                      update={update}
                      isExpanded={expandedId === update.id}
                      onToggle={() =>
                        setExpandedId(
                          expandedId === update.id ? null : update.id,
                        )
                      }
                      onMarkRead={() => handleMarkAsRead(update.id)}
                      markingRead={markingRead === update.id}
                      formatDate={formatDate}
                      t={t}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </div>
    </FeatureGate>
  );
}

// ─── Subcomponents ───

function SidebarStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  return (
    <div
      className="flex items-center justify-between px-3 py-2 rounded-lg"
      style={
        dark
          ? {
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.06)",
              borderRadius: 10,
            }
          : {
              background: "rgba(255, 255, 255, 0.3)",
              border: "1px solid rgba(255, 255, 255, 0.35)",
              borderRadius: 10,
            }
      }
    >
      <span className="text-small text-slate-500 dark:text-white/[0.55]">
        {label}
      </span>
      <span
        className={`text-body font-semibold ${accent || "text-slate-800 dark:text-white"}`}
      >
        {value}
      </span>
    </div>
  );
}

function FeedItem({
  update,
  isExpanded,
  onToggle,
  onMarkRead,
  markingRead,
  formatDate,
  t,
}: {
  update: RegulatoryUpdate;
  isExpanded: boolean;
  onToggle: () => void;
  onMarkRead: () => void;
  markingRead: boolean;
  formatDate: (d: string) => string;
  t: (key: string) => string;
}) {
  const config = SEVERITY_CONFIG[update.severity] || SEVERITY_CONFIG.LOW;
  const SeverityIcon = config.icon;

  return (
    <motion.div
      layout
      initial={false}
      animate={{ opacity: update.isRead ? 0.6 : 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      style={innerGlass}
      className="overflow-hidden"
    >
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-white/20 dark:hover:bg-white/5 transition-colors rounded-[14px]"
      >
        {/* Severity icon */}
        <div
          className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}
        >
          <SeverityIcon size={16} className={config.color} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className={`text-micro font-medium uppercase tracking-wider px-1.5 py-0.5 rounded ${config.bg} ${config.color}`}
            >
              {config.label}
            </span>
            <span className="text-micro font-mono text-slate-400">
              {update.celexNumber}
            </span>
            <span className="text-micro px-1.5 py-0.5 rounded bg-slate-100/60 dark:bg-white/10 text-slate-500">
              {DOC_TYPE_LABELS[update.documentType] || update.documentType}
            </span>
            {update.isRead && (
              <CheckCircle2 size={12} className="text-indigo-500/50" />
            )}
          </div>
          <h3 className="text-body-lg font-medium text-slate-800 dark:text-white line-clamp-2 leading-snug">
            {update.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-caption text-slate-400">
              {formatDate(update.publishedAt)}
            </span>
            {update.affectedModules.map((mod) => (
              <span
                key={mod}
                className="text-micro px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-medium"
              >
                {MODULE_LABELS[mod] || mod}
              </span>
            ))}
          </div>
        </div>

        {/* Expand indicator */}
        <ChevronDown
          size={16}
          className={`text-slate-400 transition-transform flex-shrink-0 mt-1 ${
            isExpanded ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 border-t border-slate-200/40 dark:border-white/10">
              {/* Match Reason */}
              <div className="mb-3">
                <p className="text-caption font-medium text-slate-500 uppercase tracking-wider mb-1">
                  {t("regulatoryFeed.matchReason")}
                </p>
                <p className="text-body text-slate-500 dark:text-white/[0.55]">
                  {update.matchReason}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <a
                  href={update.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-small font-medium text-indigo-500 hover:text-indigo-600 transition-colors"
                >
                  <ExternalLink size={12} />
                  {t("regulatoryFeed.viewOnEurLex")}
                </a>
                {!update.isRead && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead();
                    }}
                    disabled={markingRead}
                    className="inline-flex items-center gap-1.5 text-small font-medium text-slate-500 hover:text-indigo-500 transition-colors disabled:opacity-50"
                  >
                    {markingRead ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Eye size={12} />
                    )}
                    {t("regulatoryFeed.markAsRead")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function EmptyState({ t }: { t: (key: string) => string }) {
  const dark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-6"
          style={
            dark
              ? {
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  borderRadius: 14,
                }
              : {
                  background: "rgba(255, 255, 255, 0.3)",
                  border: "1px solid rgba(255, 255, 255, 0.35)",
                  borderRadius: 14,
                }
          }
        >
          <Radio size={28} className="text-slate-400" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-medium text-slate-800 dark:text-white mb-2">
          {t("regulatoryFeed.noUpdates")}
        </h3>
        <p className="text-body-lg text-slate-500 dark:text-white/[0.55] max-w-md mx-auto">
          {t("regulatoryFeed.noUpdatesDescription")}
        </p>
      </div>
    </div>
  );
}
