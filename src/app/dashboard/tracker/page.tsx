"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Check,
  Download,
  Filter,
  LayoutList,
  CheckSquare,
  Shield,
  ArrowUpRight,
} from "lucide-react";
import {
  articles,
  Article,
  ArticleStatus as ArticleStatusType,
  ComplianceModule,
} from "@/data/articles";
import { checklistItems } from "@/data/checklists";
import { modules } from "@/data/modules";

type ViewMode = "articles" | "checklist";

interface ArticleStatusData {
  status: ArticleStatusType;
  notes: string | null;
  updatedAt: Date;
}

interface ChecklistStatusData {
  completed: boolean;
  notes: string | null;
  updatedAt: Date;
}

// ─── Glass Panel Styles ───

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

const glassPanelDark: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.04)",
  backdropFilter: "blur(40px) saturate(1.4)",
  WebkitBackdropFilter: "blur(40px) saturate(1.4)",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  borderRadius: 20,
  boxShadow:
    "0 8px 40px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.05)",
  overflow: "hidden",
};

// ─── Status Colors ───

const STATUS_CONFIG: Record<
  ArticleStatusType,
  { label: string; dot: string; bg: string; border: string; text: string }
> = {
  not_started: {
    label: "Not Started",
    dot: "bg-slate-300 dark:bg-slate-600",
    bg: "",
    border: "border-black/[0.04] dark:border-white/[0.06]",
    text: "text-slate-500 dark:text-slate-400",
  },
  in_progress: {
    label: "In Progress",
    dot: "bg-amber-500",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    text: "text-amber-600 dark:text-amber-400",
  },
  under_review: {
    label: "Under Review",
    dot: "bg-blue-500",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    text: "text-blue-600 dark:text-blue-400",
  },
  compliant: {
    label: "Compliant",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/5",
    border: "border-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  not_applicable: {
    label: "N/A",
    dot: "bg-slate-300 dark:bg-slate-700",
    bg: "bg-slate-500/5",
    border: "border-black/[0.03] dark:border-white/[0.04]",
    text: "text-slate-400 dark:text-slate-500",
  },
};

const COMPLIANCE_TYPE_COLORS: Record<string, string> = {
  mandatory_pre_activity: "bg-red-500/10 text-red-500 border border-red-500/15",
  mandatory_ongoing:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15",
  design_requirement:
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15",
  conditional:
    "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/15",
  informational: "bg-slate-500/10 text-slate-500 border border-slate-500/10",
  enforcement: "bg-violet-500/10 text-violet-500 border border-violet-500/15",
  scope_determination: "bg-red-500/10 text-red-500 border border-red-500/15",
  operational:
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/15",
  voluntary: "bg-slate-500/10 text-slate-500 border border-slate-500/10",
  monitoring: "bg-cyan-500/10 text-cyan-500 border border-cyan-500/15",
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-500/10 text-red-500 border border-red-500/20",
  HIGH: "bg-amber-500/10 text-amber-500 border border-amber-500/20",
  MEDIUM: "bg-slate-500/10 text-slate-500 border border-slate-500/10",
  LOW: "bg-slate-500/10 text-slate-400 border border-slate-500/10",
  CONDITIONAL:
    "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20",
};

// ─── Reusable Glass Panel Component ───

function GlassPanel({
  children,
  className = "",
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
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
  return (
    <div
      className={className}
      style={{ ...(isDark ? glassPanelDark : glassPanel), ...style }}
    >
      {children}
    </div>
  );
}

// ─── Main Component ───

export default function TrackerPage() {
  const [viewMode, setViewMode] = useState<ViewMode>("articles");
  const [search, setSearch] = useState("");
  const [moduleFilter, setModuleFilter] = useState<ComplianceModule | "all">(
    "all",
  );
  const [statusFilter, setStatusFilter] = useState<ArticleStatusType | "all">(
    "all",
  );
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(
    new Set(),
  );
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(
    new Set(),
  );
  const [articleStatuses, setArticleStatuses] = useState<
    Record<string, ArticleStatusData>
  >({});
  const [checklistStatuses, setChecklistStatuses] = useState<
    Record<string, ChecklistStatusData>
  >({});
  const [loading, setLoading] = useState(true);

  // Fetch statuses on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, checklistRes] = await Promise.all([
          fetch("/api/tracker/articles"),
          fetch("/api/tracker/checklist"),
        ]);
        if (articlesRes.ok) setArticleStatuses(await articlesRes.json());
        if (checklistRes.ok) setChecklistStatuses(await checklistRes.json());
      } catch (error) {
        console.error("Error fetching tracker data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Filter articles
  const filteredArticles = useMemo(() => {
    return articles.filter((article) => {
      if (search) {
        const q = search.toLowerCase();
        const match =
          article.title.toLowerCase().includes(q) ||
          article.number.toLowerCase().includes(q) ||
          article.summary.toLowerCase().includes(q) ||
          article.operatorAction.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (moduleFilter !== "all" && article.module !== moduleFilter)
        return false;
      if (statusFilter !== "all") {
        const status = articleStatuses[article.id]?.status || "not_started";
        if (status !== statusFilter) return false;
      }
      return true;
    });
  }, [search, moduleFilter, statusFilter, articleStatuses]);

  // Group articles
  const groupedArticles = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    for (const article of filteredArticles) {
      const key = `${article.titleGroup} — ${article.titleName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(article);
    }
    return groups;
  }, [filteredArticles]);

  // Module progress
  const moduleProgress = useMemo(() => {
    const progress: Record<string, { total: number; compliant: number }> = {};
    for (const mod of modules) progress[mod.id] = { total: 0, compliant: 0 };
    progress["total"] = { total: 0, compliant: 0 };
    for (const article of articles) {
      const status = articleStatuses[article.id]?.status || "not_started";
      if (status === "not_applicable") continue;
      if (progress[article.module]) {
        progress[article.module].total++;
        if (status === "compliant") progress[article.module].compliant++;
      }
      progress["total"].total++;
      if (status === "compliant") progress["total"].compliant++;
    }
    return progress;
  }, [articleStatuses]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    const dist: Record<string, number> = {
      not_started: 0,
      in_progress: 0,
      under_review: 0,
      compliant: 0,
      not_applicable: 0,
    };
    for (const article of articles) {
      const status = articleStatuses[article.id]?.status || "not_started";
      dist[status] = (dist[status] || 0) + 1;
    }
    return dist;
  }, [articleStatuses]);

  // Mutations
  const updateArticleStatus = useCallback(
    async (articleId: string, status: ArticleStatusType) => {
      setArticleStatuses((prev) => ({
        ...prev,
        [articleId]: { ...prev[articleId], status, updatedAt: new Date() },
      }));
      try {
        await fetch("/api/tracker/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, status }),
        });
      } catch (error) {
        console.error("Error updating article status:", error);
      }
    },
    [],
  );

  const toggleChecklist = useCallback(
    async (checklistId: string, completed: boolean) => {
      setChecklistStatuses((prev) => ({
        ...prev,
        [checklistId]: {
          ...prev[checklistId],
          completed,
          updatedAt: new Date(),
        },
      }));
      try {
        await fetch("/api/tracker/checklist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklistId, completed }),
        });
      } catch (error) {
        console.error("Error updating checklist status:", error);
      }
    },
    [],
  );

  const toggleArticleExpand = useCallback((id: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleGroupCollapse = useCallback((group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  }, []);

  const handleExport = useCallback(() => {
    const csvHeaders = [
      "Article Number",
      "Title",
      "Status",
      "Module",
      "Compliance Type",
    ];
    const csvRows = filteredArticles.map((article) => {
      const status = articleStatuses[article.id]?.status || "not_started";
      return [
        `Art. ${article.number}`,
        `"${article.title.replace(/"/g, '""')}"`,
        status.replace(/_/g, " "),
        article.moduleLabel,
        article.complianceType.replace(/_/g, " "),
      ].join(",");
    });
    const csvContent = [csvHeaders.join(","), ...csvRows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-tracker-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredArticles, articleStatuses]);

  const totalPct =
    moduleProgress["total"]?.total > 0
      ? Math.round(
          (moduleProgress["total"].compliant / moduleProgress["total"].total) *
            100,
        )
      : 0;

  // Loading
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-4 overflow-hidden">
        <div className="animate-pulse space-y-4">
          <div className="h-10 bg-white/30 dark:bg-white/5 rounded-2xl w-1/3" />
          <div className="grid grid-cols-10 gap-2">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-white/30 dark:bg-white/5 rounded-2xl"
              />
            ))}
          </div>
          <div className="h-14 bg-white/30 dark:bg-white/5 rounded-2xl" />
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 bg-white/30 dark:bg-white/5 rounded-2xl"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] overflow-y-auto">
      <div className="p-4 lg:p-5 space-y-4 max-w-[1440px] mx-auto">
        {/* ─── Header ─── */}
        <div className="flex items-end justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
              Compliance Tracker
            </p>
            <h1 className="text-[26px] font-semibold text-slate-900 dark:text-white tracking-tight leading-none">
              EU Space Act
            </h1>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-1">
              {filteredArticles.length} of {articles.length} articles ·{" "}
              {totalPct}% compliant
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Status pills */}
            <div className="hidden lg:flex items-center gap-1.5">
              {(
                [
                  "compliant",
                  "in_progress",
                  "under_review",
                  "not_started",
                ] as ArticleStatusType[]
              ).map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]"
                >
                  <div
                    className={`w-1.5 h-1.5 rounded-full ${STATUS_CONFIG[s].dot}`}
                  />
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">
                    {statusDistribution[s] || 0}
                  </span>
                </div>
              ))}
            </div>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06] hover:bg-white/70 dark:hover:bg-white/[0.07] transition-all text-[11px] font-medium text-slate-600 dark:text-slate-300"
            >
              <Download size={13} />
              Export CSV
            </button>
          </div>
        </div>

        {/* ─── Module Progress Grid ─── */}
        <div className="grid grid-cols-5 lg:grid-cols-10 gap-2">
          {modules.map((mod) => {
            const prog = moduleProgress[mod.id] || { total: 0, compliant: 0 };
            const pct =
              prog.total > 0
                ? Math.round((prog.compliant / prog.total) * 100)
                : 0;
            const isActive = moduleFilter === mod.id;
            return (
              <button
                key={mod.id}
                onClick={() => setModuleFilter(isActive ? "all" : mod.id)}
                className={`relative group transition-all duration-200 ${isActive ? "scale-[1.03]" : "hover:scale-[1.02]"}`}
              >
                <GlassPanel
                  className="p-3 text-center"
                  style={
                    isActive
                      ? { border: "1px solid rgba(16, 185, 129, 0.3)" }
                      : undefined
                  }
                >
                  <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                    {mod.number}
                  </p>
                  <p
                    className={`text-[20px] font-bold tracking-tight leading-none mb-0.5 ${
                      pct >= 75
                        ? "text-emerald-500"
                        : pct > 0
                          ? "text-slate-700 dark:text-white"
                          : "text-slate-300 dark:text-slate-600"
                    }`}
                  >
                    {pct}%
                  </p>
                  <p className="text-[8px] text-slate-400 dark:text-slate-500 truncate">
                    {mod.shortName}
                  </p>
                  {/* Progress bar */}
                  <div className="mt-1.5 h-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </GlassPanel>
              </button>
            );
          })}
          {/* Total */}
          <button
            onClick={() => setModuleFilter("all")}
            className={`relative group transition-all duration-200 ${moduleFilter === "all" ? "scale-[1.03]" : "hover:scale-[1.02]"}`}
          >
            <GlassPanel
              className="p-3 text-center"
              style={
                moduleFilter === "all"
                  ? { border: "1px solid rgba(16, 185, 129, 0.3)" }
                  : undefined
              }
            >
              <p className="text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-0.5">
                ALL
              </p>
              <p
                className={`text-[20px] font-bold tracking-tight leading-none mb-0.5 ${
                  totalPct >= 75
                    ? "text-emerald-500"
                    : "text-slate-700 dark:text-white"
                }`}
              >
                {totalPct}%
              </p>
              <p className="text-[8px] text-slate-400 dark:text-slate-500">
                Total
              </p>
              <div className="mt-1.5 h-1 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${totalPct}%` }}
                />
              </div>
            </GlassPanel>
          </button>
        </div>

        {/* ─── Filter Bar ─── */}
        <GlassPanel
          className="px-4 py-3 flex flex-wrap items-center gap-3"
          style={{ borderRadius: 16 }}
        >
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500"
            />
            <input
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/40 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-[12px] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 w-[260px] focus:outline-none focus:border-blue-500/40 transition-all"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ArticleStatusType | "all")
            }
            className="bg-white/40 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="under_review">Under Review</option>
            <option value="compliant">Compliant</option>
            <option value="not_applicable">N/A</option>
          </select>

          <div className="flex-1" />

          {/* Results count */}
          <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:block">
            {filteredArticles.length} articles
          </span>

          {/* View Toggle */}
          <div
            className="flex rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08]"
            role="tablist"
          >
            <button
              role="tab"
              aria-selected={viewMode === "articles"}
              onClick={() => setViewMode("articles")}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-medium transition-all ${
                viewMode === "articles"
                  ? "bg-white/60 dark:bg-white/[0.08] text-slate-800 dark:text-white"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <LayoutList size={13} />
              Articles
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "checklist"}
              onClick={() => setViewMode("checklist")}
              className={`flex items-center gap-1.5 px-3.5 py-2 text-[11px] font-medium transition-all ${
                viewMode === "checklist"
                  ? "bg-white/60 dark:bg-white/[0.08] text-slate-800 dark:text-white"
                  : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <CheckSquare size={13} />
              Checklist
            </button>
          </div>
        </GlassPanel>

        {/* ─── Content ─── */}
        {viewMode === "articles" ? (
          <div className="space-y-2">
            {Object.entries(groupedArticles).map(([group, groupArticles]) => (
              <div key={group}>
                {/* Group Header */}
                <button
                  onClick={() => toggleGroupCollapse(group)}
                  aria-expanded={!collapsedGroups.has(group)}
                  className="flex items-center gap-2.5 w-full text-left py-3 px-1 mt-4 mb-1"
                >
                  {collapsedGroups.has(group) ? (
                    <ChevronRight
                      size={13}
                      className="text-slate-400 dark:text-slate-500"
                    />
                  ) : (
                    <ChevronDown
                      size={13}
                      className="text-slate-400 dark:text-slate-500"
                    />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                    {group}
                  </span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                    {groupArticles.length} articles
                  </span>
                </button>

                {/* Articles in Group */}
                {!collapsedGroups.has(group) && (
                  <div className="space-y-1.5">
                    {groupArticles.map((article) => {
                      const status =
                        articleStatuses[article.id]?.status || "not_started";
                      const config = STATUS_CONFIG[status];
                      const isExpanded = expandedArticles.has(article.id);

                      return (
                        <GlassPanel
                          key={article.id}
                          style={
                            isExpanded
                              ? { border: "1px solid rgba(59, 130, 246, 0.2)" }
                              : status === "compliant"
                                ? {
                                    border:
                                      "1px solid rgba(16, 185, 129, 0.15)",
                                  }
                                : undefined
                          }
                        >
                          {/* Row */}
                          <button
                            onClick={() => toggleArticleExpand(article.id)}
                            aria-expanded={isExpanded}
                            className="w-full px-4 py-3.5 flex items-center gap-3 text-left"
                          >
                            {/* Status Dot */}
                            <div
                              className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${config.dot}`}
                            />

                            {/* Article Number */}
                            <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 w-[55px] flex-shrink-0">
                              Art. {article.number}
                            </span>

                            {/* Title */}
                            <span className="text-[13px] text-slate-800 dark:text-slate-200 flex-1 truncate">
                              {article.title}
                            </span>

                            {/* Module Badge */}
                            <span className="hidden md:inline text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-black/[0.04] dark:border-white/[0.06]">
                              {article.moduleLabel}
                            </span>

                            {/* Compliance Type Badge */}
                            <span
                              className={`hidden lg:inline text-[9px] font-medium px-2 py-0.5 rounded-full ${
                                COMPLIANCE_TYPE_COLORS[
                                  article.complianceType
                                ] ||
                                "bg-slate-500/10 text-slate-500 border border-slate-500/10"
                              }`}
                            >
                              {article.complianceType.replace(/_/g, " ")}
                            </span>

                            {/* Status label (mobile) */}
                            <span
                              className={`text-[10px] font-medium ${config.text} hidden sm:inline md:hidden`}
                            >
                              {config.label}
                            </span>

                            {/* Chevron */}
                            <ChevronRight
                              size={14}
                              className={`text-slate-400 dark:text-slate-500 flex-shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                            />
                          </button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-0">
                              <div className="ml-[23px] pl-4 border-l-2 border-blue-500/20">
                                {/* Summary */}
                                <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                  {article.summary}
                                </p>

                                {/* Required Action */}
                                {article.operatorAction !== "None" && (
                                  <div className="mb-3 p-3 rounded-xl bg-amber-500/5 dark:bg-amber-500/[0.04] border border-amber-500/10">
                                    <p className="text-[9px] font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
                                      Required Action
                                    </p>
                                    <p className="text-[11px] text-slate-700 dark:text-slate-300 leading-relaxed">
                                      {article.operatorAction}
                                    </p>
                                  </div>
                                )}

                                {/* Applies To */}
                                <div className="flex flex-wrap gap-1.5 mb-3">
                                  {article.appliesTo.map((op) => (
                                    <span
                                      key={op}
                                      className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-black/[0.04] dark:border-white/[0.06]"
                                    >
                                      {op}
                                    </span>
                                  ))}
                                </div>

                                {/* Exemptions */}
                                {article.exemptions && (
                                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 italic">
                                    {article.exemptions}
                                  </p>
                                )}

                                {/* Status Selector */}
                                <div className="flex flex-wrap gap-1.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                                  {(
                                    [
                                      "not_started",
                                      "in_progress",
                                      "under_review",
                                      "compliant",
                                      "not_applicable",
                                    ] as ArticleStatusType[]
                                  ).map((s) => {
                                    const sc = STATUS_CONFIG[s];
                                    const isActive = status === s;
                                    return (
                                      <button
                                        key={s}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          updateArticleStatus(article.id, s);
                                        }}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                                          isActive
                                            ? `${sc.bg || "bg-white/50 dark:bg-white/[0.06]"} ${sc.text} border ${sc.border}`
                                            : "text-slate-400 dark:text-slate-500 border border-black/[0.04] dark:border-white/[0.06] hover:bg-white/40 dark:hover:bg-white/[0.04]"
                                        }`}
                                      >
                                        <div
                                          className={`w-1.5 h-1.5 rounded-full ${sc.dot}`}
                                        />
                                        {sc.label}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          )}
                        </GlassPanel>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}

            {filteredArticles.length === 0 && (
              <GlassPanel className="p-12 text-center">
                <Search className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                <p className="text-[13px] text-slate-500 dark:text-slate-400">
                  No articles match your filters
                </p>
                <button
                  onClick={() => {
                    setSearch("");
                    setModuleFilter("all");
                    setStatusFilter("all");
                  }}
                  className="text-[12px] text-blue-500 hover:text-blue-600 mt-2"
                >
                  Clear filters
                </button>
              </GlassPanel>
            )}
          </div>
        ) : (
          /* ─── Checklist View ─── */
          <div className="space-y-6">
            {(["pre_authorization", "ongoing", "end_of_life"] as const).map(
              (phase) => {
                const phaseItems = checklistItems.filter(
                  (item) => item.phase === phase,
                );
                const completedCount = phaseItems.filter(
                  (item) => checklistStatuses[item.id]?.completed,
                ).length;
                const phasePct =
                  phaseItems.length > 0
                    ? Math.round((completedCount / phaseItems.length) * 100)
                    : 0;
                const phaseLabel =
                  phase === "pre_authorization"
                    ? "Pre-Authorization"
                    : phase === "ongoing"
                      ? "Ongoing Operations"
                      : "End of Life";

                return (
                  <div key={phase}>
                    {/* Phase Header */}
                    <div className="flex items-center justify-between mb-3 mt-2 px-1">
                      <div className="flex items-center gap-2">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          {phaseLabel}
                        </p>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500">
                          {completedCount}/{phaseItems.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${phasePct}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                          {phasePct}%
                        </span>
                      </div>
                    </div>

                    {/* Items */}
                    <div className="space-y-1.5">
                      {phaseItems.map((item) => {
                        const isCompleted =
                          checklistStatuses[item.id]?.completed || false;

                        return (
                          <GlassPanel key={item.id}>
                            <div className="px-4 py-3.5 flex items-center gap-3.5">
                              {/* Checkbox */}
                              <button
                                onClick={() =>
                                  toggleChecklist(item.id, !isCompleted)
                                }
                                className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                  isCompleted
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                                }`}
                              >
                                {isCompleted && (
                                  <Check
                                    size={12}
                                    className="text-white"
                                    strokeWidth={3}
                                  />
                                )}
                              </button>

                              {/* Content */}
                              <div className="flex-1 min-w-0">
                                <p
                                  className={`text-[12px] leading-relaxed ${
                                    isCompleted
                                      ? "line-through text-slate-400 dark:text-slate-500"
                                      : "text-slate-800 dark:text-slate-200"
                                  }`}
                                >
                                  {item.requirement}
                                </p>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                  {item.articles} · {item.moduleLabel}
                                </p>
                              </div>

                              {/* Priority Badge */}
                              <span
                                className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${
                                  PRIORITY_COLORS[item.priority] ||
                                  "bg-slate-500/10 text-slate-500 border border-slate-500/10"
                                }`}
                              >
                                {item.priority}
                              </span>
                            </div>
                          </GlassPanel>
                        );
                      })}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>
    </div>
  );
}
