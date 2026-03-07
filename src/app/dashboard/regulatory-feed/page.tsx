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

// ─── Severity Config ───

const SEVERITY_CONFIG: Record<
  string,
  {
    icon: typeof AlertTriangle;
    color: string;
    bg: string;
    border: string;
    label: string;
  }
> = {
  CRITICAL: {
    icon: AlertTriangle,
    color: "text-[var(--accent-danger)]",
    bg: "bg-[var(--accent-danger)]/10",
    border: "border-[var(--accent-danger)/30]",
    label: "Critical",
  },
  HIGH: {
    icon: AlertCircle,
    color: "text-[var(--accent-warning)]",
    bg: "bg-[var(--accent-warning-soft)]",
    border: "border-amber-500/30",
    label: "High",
  },
  MEDIUM: {
    icon: Info,
    color: "text-[var(--accent-primary)]",
    bg: "bg-[var(--accent-info-soft)]0/10",
    border: "border-[var(--accent-primary)]/30",
    label: "Medium",
  },
  LOW: {
    icon: Info,
    color: "text-[var(--text-tertiary)]",
    bg: "bg-[var(--surface-sunken)]0/10",
    border: "border-[var(--border-default)]/20",
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
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-caption text-[var(--text-secondary)] uppercase tracking-wider mb-1">
            {t("regulatoryFeed.title")}
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)] mb-2">
            {t("regulatoryFeed.title")}
          </h1>
          <p className="text-body-lg text-[var(--text-secondary)]">
            {t("regulatoryFeed.subtitle")}
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <StatCard label={t("regulatoryFeed.totalUpdates")} value={total} />
          <StatCard
            label={t("regulatoryFeed.criticalUpdates")}
            value={criticalCount}
            accent="text-[var(--accent-danger)]"
          />
          <StatCard
            label={t("regulatoryFeed.highUpdates")}
            value={highCount}
            accent="text-[var(--accent-warning)]"
          />
          <StatCard
            label={t("regulatoryFeed.thisWeek")}
            value={thisWeekCount}
            accent="text-[var(--accent-primary)]"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          {/* Severity pills */}
          {SEVERITY_FILTERS.map((sev) => {
            const isActive = severityFilter === sev;
            return (
              <button
                key={sev}
                onClick={() => {
                  setSeverityFilter(sev);
                  setPage(1);
                }}
                className={`text-small px-3 py-1.5 rounded-full font-medium transition-all ${
                  isActive
                    ? "bg-[var(--accent-success-soft)]0/15 text-[var(--accent-primary)] border border-[var(--accent-success)/30]"
                    : "bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-transparent hover:bg-[var(--surface-sunken)]"
                }`}
              >
                {sev === "ALL"
                  ? t("regulatoryFeed.allSeverities")
                  : sev.charAt(0) + sev.slice(1).toLowerCase()}
              </button>
            );
          })}

          {/* Module filter dropdown */}
          <div className="relative ml-auto">
            <select
              value={moduleFilter}
              onChange={(e) => {
                setModuleFilter(e.target.value);
                setPage(1);
              }}
              className="text-small px-3 py-1.5 rounded-lg bg-[var(--surface-sunken)] text-[var(--text-secondary)] border border-[var(--border-default)] appearance-none pr-7 cursor-pointer"
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
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none"
            />
          </div>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2
              size={24}
              className="animate-spin text-[var(--text-tertiary)]"
            />
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
                    setExpandedId(expandedId === update.id ? null : update.id)
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="text-body px-4 py-2 rounded-lg bg-[var(--surface-sunken)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--surface-sunken)] transition-colors"
            >
              Previous
            </button>
            <span className="text-body text-[var(--text-secondary)] px-3">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="text-body px-4 py-2 rounded-lg bg-[var(--surface-sunken)] text-[var(--text-secondary)] disabled:opacity-30 hover:bg-[var(--surface-sunken)] transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </FeatureGate>
  );
}

// ─── Subcomponents ───

function StatCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4">
      <p className="text-caption text-[var(--text-secondary)] uppercase tracking-wider mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-semibold ${accent || "text-[var(--text-primary)]"}`}
      >
        {value}
      </p>
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
      className={`bg-[var(--surface-raised)] border rounded-xl overflow-hidden transition-all ${
        update.isRead
          ? "border-[var(--border-default)]"
          : `border-[var(--border-default)]`
      }`}
    >
      {/* Main row */}
      <button
        onClick={onToggle}
        className="w-full flex items-start gap-3 p-4 text-left hover:bg-[var(--surface-sunken)]:bg-[var(--surface-sunken)] transition-colors"
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
            <span className="text-micro font-mono text-[var(--text-tertiary)]">
              {update.celexNumber}
            </span>
            <span className="text-micro px-1.5 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)]">
              {DOC_TYPE_LABELS[update.documentType] || update.documentType}
            </span>
            {update.isRead && (
              <CheckCircle2
                size={12}
                className="text-[var(--accent-primary)]/50"
              />
            )}
          </div>
          <h3 className="text-body-lg font-medium text-[var(--text-primary)] line-clamp-2 leading-snug">
            {update.title}
          </h3>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <span className="text-caption text-[var(--text-tertiary)]">
              {formatDate(update.publishedAt)}
            </span>
            {update.affectedModules.map((mod) => (
              <span
                key={mod}
                className="text-micro px-1.5 py-0.5 rounded bg-[var(--accent-primary-soft)] text-[var(--accent-success)] font-medium"
              >
                {MODULE_LABELS[mod] || mod}
              </span>
            ))}
          </div>
        </div>

        {/* Expand indicator */}
        <ChevronDown
          size={16}
          className={`text-[var(--text-tertiary)] transition-transform flex-shrink-0 mt-1 ${
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
            <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)]">
              {/* Match Reason */}
              <div className="mb-3">
                <p className="text-caption font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                  {t("regulatoryFeed.matchReason")}
                </p>
                <p className="text-body text-[var(--text-secondary)]">
                  {update.matchReason}
                </p>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3">
                <a
                  href={update.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-small font-medium text-[var(--accent-primary)] hover:text-[var(--accent-primary)] transition-colors"
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
                    className="inline-flex items-center gap-1.5 text-small font-medium text-[var(--text-secondary)] hover:text-[var(--accent-primary)] transition-colors disabled:opacity-50"
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
  return (
    <div className="text-center py-20">
      <div className="w-16 h-16 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] flex items-center justify-center mx-auto mb-6">
        <Radio
          size={28}
          className="text-[var(--text-tertiary)]"
          strokeWidth={1.5}
        />
      </div>
      <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
        {t("regulatoryFeed.noUpdates")}
      </h3>
      <p className="text-body-lg text-[var(--text-secondary)] max-w-md mx-auto">
        {t("regulatoryFeed.noUpdatesDescription")}
      </p>
    </div>
  );
}
