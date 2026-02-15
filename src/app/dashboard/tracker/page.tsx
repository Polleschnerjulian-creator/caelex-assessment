"use client";

import { useState, useEffect, useMemo } from "react";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Check,
  Download,
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

const statusColors: Record<
  ArticleStatusType,
  { bg: string; border: string; dot: string }
> = {
  not_started: {
    bg: "bg-slate-50 dark:bg-white/[0.04]",
    border: "border-slate-200 dark:border-white/[0.1]",
    dot: "bg-slate-200 dark:bg-white/10 border-slate-300 dark:border-white/[0.1]",
  },
  in_progress: {
    bg: "bg-amber-50 dark:bg-amber-500/5",
    border: "border-amber-200 dark:border-amber-500/20",
    dot: "bg-amber-500 dark:bg-amber-500/60 border-amber-400 dark:border-amber-500/30",
  },
  under_review: {
    bg: "bg-emerald-50 dark:bg-emerald-400/5",
    border: "border-emerald-200 dark:border-emerald-400/20",
    dot: "bg-emerald-500 dark:bg-emerald-400/60 border-emerald-400 dark:border-emerald-400/30",
  },
  compliant: {
    bg: "bg-emerald-50 dark:bg-emerald-500/5",
    border: "border-emerald-200 dark:border-emerald-500/20",
    dot: "bg-emerald-500 dark:bg-emerald-500/60 border-emerald-400 dark:border-emerald-500/30",
  },
  not_applicable: {
    bg: "bg-slate-50 dark:bg-white/[0.01]",
    border: "border-slate-200 dark:border-white/10",
    dot: "bg-slate-200 dark:bg-white/5 border-slate-300 dark:border-white/10",
  },
};

const complianceTypeColors: Record<string, string> = {
  mandatory_pre_activity:
    "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400/60",
  mandatory_ongoing:
    "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400/60",
  design_requirement:
    "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400/60",
  conditional:
    "bg-yellow-100 dark:bg-yellow-500/10 text-yellow-700 dark:text-yellow-400/60",
  informational:
    "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/60",
  enforcement:
    "bg-purple-100 dark:bg-purple-500/10 text-purple-700 dark:text-purple-400/60",
  scope_determination:
    "bg-red-100 dark:bg-red-500/10 text-red-700 dark:text-red-400/60",
  operational:
    "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400/60",
  voluntary:
    "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/60",
  monitoring:
    "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/60",
};

const priorityColors: Record<string, string> = {
  CRITICAL: "bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-400",
  HIGH: "bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400/60",
  MEDIUM: "bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/70",
  LOW: "bg-slate-100 dark:bg-white/[0.04] text-slate-500 dark:text-white/60",
  CONDITIONAL:
    "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300/50",
};

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

        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticleStatuses(data);
        }

        if (checklistRes.ok) {
          const data = await checklistRes.json();
          setChecklistStatuses(data);
        }
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
      // Search filter
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesSearch =
          article.title.toLowerCase().includes(searchLower) ||
          article.number.toLowerCase().includes(searchLower) ||
          article.summary.toLowerCase().includes(searchLower) ||
          article.operatorAction.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Module filter
      if (moduleFilter !== "all" && article.module !== moduleFilter) {
        return false;
      }

      // Status filter
      if (statusFilter !== "all") {
        const status = articleStatuses[article.id]?.status || "not_started";
        if (status !== statusFilter) return false;
      }

      return true;
    });
  }, [search, moduleFilter, statusFilter, articleStatuses]);

  // Group articles by Title
  const groupedArticles = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    for (const article of filteredArticles) {
      const key = `${article.titleGroup} — ${article.titleName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(article);
    }
    return groups;
  }, [filteredArticles]);

  // Calculate progress per module
  const moduleProgress = useMemo(() => {
    const progress: Record<string, { total: number; compliant: number }> = {};
    for (const mod of modules) {
      progress[mod.id] = { total: 0, compliant: 0 };
    }
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

  // Update article status
  const updateArticleStatus = async (
    articleId: string,
    status: ArticleStatusType,
  ) => {
    // Optimistic update
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
  };

  // Toggle checklist item
  const toggleChecklist = async (checklistId: string, completed: boolean) => {
    setChecklistStatuses((prev) => ({
      ...prev,
      [checklistId]: { ...prev[checklistId], completed, updatedAt: new Date() },
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
  };

  const toggleArticleExpand = (id: string) => {
    setExpandedArticles((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGroupCollapse = (group: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };

  const handleExport = () => {
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
  };

  if (loading) {
    return (
      <div className="p-8" role="status" aria-live="polite">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-white/[0.05] rounded w-1/3" />
          <div className="h-4 bg-slate-200 dark:bg-white/[0.05] rounded w-1/2" />
          <div className="grid grid-cols-8 gap-2 mt-8">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 dark:bg-white/[0.04] rounded-lg"
              />
            ))}
          </div>
          <span className="sr-only">Loading compliance tracker...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8">
      <div className="max-w-[1400px]">
        {/* Header */}
        <div className="flex justify-between items-start mb-10">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/60 mb-3">
              COMPLIANCE TRACKER
            </p>
            <h1 className="text-[24px] font-medium text-slate-900 dark:text-white mb-1">
              EU Space Act
            </h1>
            <p className="text-[14px] text-slate-600 dark:text-white/70">
              Track compliance across all 119 articles and 7 modules
            </p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 border border-slate-300 dark:border-white/12 text-slate-700 dark:text-white/70 font-mono text-[11px] px-4 py-2 rounded-lg hover:border-slate-400 dark:hover:border-white/[0.1] hover:text-slate-900 dark:hover:text-white/70 transition-all"
          >
            <Download size={13} aria-hidden="true" />
            Export
          </button>
        </div>

        {/* Progress Overview */}
        <div className="grid grid-cols-4 lg:grid-cols-9 gap-2 mb-10">
          {modules.map((mod) => {
            const prog = moduleProgress[mod.id] || { total: 0, compliant: 0 };
            const pct =
              prog.total > 0
                ? Math.round((prog.compliant / prog.total) * 100)
                : 0;
            return (
              <div
                key={mod.id}
                className="bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 rounded-lg p-3 text-center"
              >
                <p className="font-mono text-[10px] text-slate-400 dark:text-white/30">
                  {mod.number}
                </p>
                <p className="font-mono text-[18px] font-semibold text-slate-900 dark:text-white">
                  {pct}%
                </p>
                <p className="font-mono text-[9px] text-slate-500 dark:text-white/60 mt-1">
                  {mod.shortName}
                </p>
              </div>
            );
          })}
          {/* Total */}
          <div className="bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/[0.08] rounded-lg p-3 text-center">
            <p className="font-mono text-[10px] text-slate-500 dark:text-white/60">
              ALL
            </p>
            <p className="font-mono text-[18px] font-semibold text-slate-900 dark:text-white">
              {moduleProgress["total"]?.total > 0
                ? Math.round(
                    (moduleProgress["total"].compliant /
                      moduleProgress["total"].total) *
                      100,
                  )
                : 0}
              %
            </p>
            <p className="font-mono text-[9px] text-slate-600 dark:text-white/70 mt-1">
              Total
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="sticky top-0 z-20 bg-white/90 dark:bg-black/90 backdrop-blur-sm flex flex-wrap items-center gap-3 py-4 mb-6 border-b border-slate-200 dark:border-white/10">
          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-white/60"
              aria-hidden="true"
            />
            <label htmlFor="article-search" className="sr-only">
              Search articles
            </label>
            <input
              id="article-search"
              type="text"
              placeholder="Search articles..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg pl-9 pr-4 py-2 text-[13px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-white/20 w-[280px] focus:border-slate-300 dark:focus:border-white/[0.12] focus:outline-none transition-all"
            />
          </div>

          {/* Module Filter */}
          <div className="flex gap-1">
            <button
              onClick={() => setModuleFilter("all")}
              className={`px-3 py-1 rounded-full font-mono text-[11px] border transition-all ${
                moduleFilter === "all"
                  ? "bg-slate-200 dark:bg-white/[0.08] text-slate-900 dark:text-white border-slate-300 dark:border-white/[0.12]"
                  : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/12 hover:text-slate-800 dark:hover:text-white/60"
              }`}
            >
              All
            </button>
            {modules.slice(0, 5).map((mod) => (
              <button
                key={mod.id}
                onClick={() => setModuleFilter(mod.id)}
                className={`px-3 py-1 rounded-full font-mono text-[11px] border transition-all ${
                  moduleFilter === mod.id
                    ? "bg-slate-200 dark:bg-white/[0.08] text-slate-900 dark:text-white border-slate-300 dark:border-white/[0.12]"
                    : "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/60 border-slate-200 dark:border-white/12 hover:text-slate-800 dark:hover:text-white/60"
                }`}
              >
                {mod.shortName}
              </button>
            ))}
          </div>

          {/* Status Filter */}
          <label htmlFor="status-filter" className="sr-only">
            Filter by status
          </label>
          <select
            id="status-filter"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ArticleStatusType | "all")
            }
            className="bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/12 rounded-lg px-3 py-2 text-[11px] text-slate-900 dark:text-white font-mono focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="under_review">Under Review</option>
            <option value="compliant">Compliant</option>
            <option value="not_applicable">N/A</option>
          </select>

          {/* Spacer */}
          <div className="flex-1" />

          {/* View Toggle */}
          <div
            className="flex border border-slate-200 dark:border-white/12 rounded-lg overflow-hidden"
            role="tablist"
            aria-label="View mode"
          >
            <button
              role="tab"
              aria-selected={viewMode === "articles"}
              aria-controls="view-articles"
              onClick={() => setViewMode("articles")}
              className={`px-4 py-2 font-mono text-[11px] transition-all ${
                viewMode === "articles"
                  ? "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-white/70 hover:text-slate-800 dark:hover:text-white/70"
              }`}
            >
              Articles
            </button>
            <button
              role="tab"
              aria-selected={viewMode === "checklist"}
              aria-controls="view-checklist"
              onClick={() => setViewMode("checklist")}
              className={`px-4 py-2 font-mono text-[11px] transition-all ${
                viewMode === "checklist"
                  ? "bg-slate-100 dark:bg-white/[0.06] text-slate-900 dark:text-white"
                  : "text-slate-600 dark:text-white/70 hover:text-slate-800 dark:hover:text-white/70"
              }`}
            >
              Checklist
            </button>
          </div>
        </div>

        {/* Content */}
        {viewMode === "articles" ? (
          <div>
            {Object.entries(groupedArticles).map(([group, groupArticles]) => (
              <div key={group} className="mb-6">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroupCollapse(group)}
                  aria-expanded={!collapsedGroups.has(group)}
                  className="flex items-center gap-3 mb-4 mt-8 w-full text-left"
                >
                  {collapsedGroups.has(group) ? (
                    <ChevronRight
                      size={14}
                      className="text-slate-500 dark:text-white/60"
                      aria-hidden="true"
                    />
                  ) : (
                    <ChevronDown
                      size={14}
                      className="text-slate-500 dark:text-white/60"
                      aria-hidden="true"
                    />
                  )}
                  <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-600 dark:text-white/60">
                    {group}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 dark:text-white/30 ml-auto">
                    {groupArticles.length} articles
                  </span>
                </button>

                {/* Articles */}
                {!collapsedGroups.has(group) && (
                  <div className="space-y-2">
                    {groupArticles.map((article) => {
                      const status =
                        articleStatuses[article.id]?.status || "not_started";
                      const colors = statusColors[status];
                      const isExpanded = expandedArticles.has(article.id);

                      return (
                        <div
                          key={article.id}
                          className={`${colors.bg} border ${
                            isExpanded
                              ? "border-slate-300 dark:border-white/[0.1]"
                              : colors.border
                          } rounded-lg transition-all duration-200 hover:border-slate-300 dark:hover:border-white/[0.08]`}
                        >
                          {/* Collapsed Row */}
                          <button
                            onClick={() => toggleArticleExpand(article.id)}
                            aria-expanded={isExpanded}
                            className="w-full px-5 py-4 flex items-center gap-4 text-left"
                          >
                            {/* Status Dot */}
                            <div
                              className={`w-3 h-3 rounded-full border ${colors.dot}`}
                              aria-hidden="true"
                            />
                            <span className="sr-only">
                              Status: {status.replace(/_/g, " ")}
                            </span>

                            {/* Article Number */}
                            <span className="font-mono text-[12px] text-slate-600 dark:text-white/70 w-[60px]">
                              Art. {article.number}
                            </span>

                            {/* Title */}
                            <span className="text-[14px] text-slate-900 dark:text-white flex-1">
                              {article.title}
                            </span>

                            {/* Module Badge */}
                            <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/70">
                              {article.moduleLabel}
                            </span>

                            {/* Compliance Type Badge */}
                            <span
                              className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
                                complianceTypeColors[article.complianceType] ||
                                "bg-slate-100 dark:bg-white/[0.05] text-slate-600 dark:text-white/60"
                              }`}
                            >
                              {article.complianceType.replace(/_/g, " ")}
                            </span>

                            {/* Chevron */}
                            {isExpanded ? (
                              <ChevronDown
                                size={16}
                                className="text-slate-400 dark:text-white/30"
                                aria-hidden="true"
                              />
                            ) : (
                              <ChevronRight
                                size={16}
                                className="text-slate-400 dark:text-white/30"
                                aria-hidden="true"
                              />
                            )}
                          </button>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="px-5 pb-6 pl-[76px]">
                              {/* Summary */}
                              <p className="text-[14px] text-slate-600 dark:text-white/60 leading-[1.7] mb-4">
                                {article.summary}
                              </p>

                              {/* Operator Action */}
                              {article.operatorAction !== "None" && (
                                <div className="mb-4">
                                  <p className="font-mono text-[10px] text-slate-400 dark:text-white/30 uppercase tracking-wider mb-1">
                                    REQUIRED ACTION
                                  </p>
                                  <p className="text-[13px] text-slate-700 dark:text-white/70">
                                    {article.operatorAction}
                                  </p>
                                </div>
                              )}

                              {/* Applies To */}
                              <div className="flex gap-2 mb-3">
                                {article.appliesTo.map((op) => (
                                  <span
                                    key={op}
                                    className="font-mono text-[9px] bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-white/70 px-2 py-0.5 rounded"
                                  >
                                    {op}
                                  </span>
                                ))}
                              </div>

                              {/* Exemptions */}
                              {article.exemptions && (
                                <p className="font-mono text-[11px] text-white/30 mb-4">
                                  {article.exemptions}
                                </p>
                              )}

                              {/* Status Selector */}
                              <div className="flex gap-2 pt-4 border-t border-white/10">
                                {(
                                  [
                                    "not_started",
                                    "in_progress",
                                    "under_review",
                                    "compliant",
                                    "not_applicable",
                                  ] as ArticleStatusType[]
                                ).map((s) => (
                                  <button
                                    key={s}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      updateArticleStatus(article.id, s);
                                    }}
                                    className={`px-3 py-1.5 rounded-lg font-mono text-[11px] border transition-all ${
                                      status === s
                                        ? `${statusColors[s].bg} ${statusColors[s].border}`
                                        : "border-white/12 text-white/70 hover:border-white/[0.1]"
                                    }`}
                                  >
                                    {s === "not_started"
                                      ? "Not Started"
                                      : s === "in_progress"
                                        ? "In Progress"
                                        : s === "under_review"
                                          ? "Under Review"
                                          : s === "compliant"
                                            ? "Compliant"
                                            : "N/A"}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Checklist View */
          <div>
            {(["pre_authorization", "ongoing", "end_of_life"] as const).map(
              (phase) => {
                const phaseItems = checklistItems.filter(
                  (item) => item.phase === phase,
                );
                const completedCount = phaseItems.filter(
                  (item) => checklistStatuses[item.id]?.completed,
                ).length;
                const phaseLabel =
                  phase === "pre_authorization"
                    ? "PRE-AUTHORIZATION"
                    : phase === "ongoing"
                      ? "ONGOING OPERATIONS"
                      : "END OF LIFE";

                return (
                  <div key={phase} className="mb-8">
                    <div className="flex items-center justify-between mb-4 mt-8">
                      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/60">
                        {phaseLabel}
                      </p>
                      <p className="font-mono text-[10px] text-white/30">
                        {completedCount}/{phaseItems.length} completed
                      </p>
                    </div>

                    <div className="space-y-2">
                      {phaseItems.map((item) => {
                        const isCompleted =
                          checklistStatuses[item.id]?.completed || false;

                        return (
                          <div
                            key={item.id}
                            className="bg-white/[0.015] border border-white/10 rounded-lg px-5 py-4 flex items-center gap-4"
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() =>
                                toggleChecklist(item.id, !isCompleted)
                              }
                              className={`w-[18px] h-[18px] rounded border flex items-center justify-center transition-all ${
                                isCompleted
                                  ? "bg-white border-white"
                                  : "border-white/[0.12] hover:border-white/[0.2]"
                              }`}
                            >
                              {isCompleted && (
                                <Check size={12} className="text-black" />
                              )}
                            </button>

                            {/* Content */}
                            <div className="flex-1">
                              <p
                                className={`text-[14px] ${
                                  isCompleted
                                    ? "line-through text-white/60"
                                    : "text-white"
                                }`}
                              >
                                {item.requirement}
                              </p>
                              <p className="font-mono text-[11px] text-white/60 mt-1">
                                {item.articles} · {item.moduleLabel}
                              </p>
                            </div>

                            {/* Priority Badge */}
                            <span
                              className={`font-mono text-[10px] uppercase px-2 py-0.5 rounded-full ${
                                priorityColors[item.priority] ||
                                "bg-white/[0.04] text-white/70"
                              }`}
                            >
                              {item.priority}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              },
            )}
          </div>
        )}
      </div>
    </div>
  );
}
