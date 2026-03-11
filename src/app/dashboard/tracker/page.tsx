"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  Search,
  Check,
  Download,
  LayoutList,
  CheckSquare,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import {
  articles,
  Article,
  ArticleStatus as ArticleStatusType,
  ComplianceModule,
} from "@/data/articles";
import { checklistItems } from "@/data/checklists";
import { modules } from "@/data/modules";

// ─── Types ───

type RegulationId =
  | "all"
  | "eu-space-act"
  | "nis2"
  | "cybersecurity"
  | "debris"
  | "environmental"
  | "insurance"
  | "copuos"
  | "export-control"
  | "spectrum"
  | "uk-space"
  | "us-regulatory";

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

interface RegulationStatus {
  hasAssessment: boolean;
  score: number | null;
  lastAssessedAt: string | null;
  details?: {
    total: number;
    compliant: number;
    inProgress: number;
    underReview: number;
    notStarted: number;
  };
}

interface UnifiedStatusResponse {
  regulations: Record<string, RegulationStatus>;
  overallScore: number;
  assessedCount: number;
  totalRegulations: number;
}

// ─── Regulation Configs ───

interface RegulationConfig {
  id: RegulationId;
  name: string;
  abbrev: string;
  requirementCount: number;
  description: string;
  assessmentPath?: string;
  modulePath?: string;
  category: "EU" | "International" | "National" | "Export";
}

const REGULATIONS: RegulationConfig[] = [
  {
    id: "eu-space-act",
    name: "EU Space Act",
    abbrev: "ESA",
    requirementCount: 119,
    description: "COM(2025) 335",
    assessmentPath: "/assessment/eu-space-act",
    modulePath: "/dashboard/tracker",
    category: "EU",
  },
  {
    id: "nis2",
    name: "NIS2 Directive",
    abbrev: "NIS2",
    requirementCount: 51,
    description: "EU 2022/2555",
    assessmentPath: "/assessment/nis2",
    modulePath: "/dashboard/modules/nis2",
    category: "EU",
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    abbrev: "CYBER",
    requirementCount: 50,
    description: "ENISA Space Controls",
    modulePath: "/dashboard/modules/cybersecurity",
    category: "EU",
  },
  {
    id: "debris",
    name: "Debris Mitigation",
    abbrev: "DEBRIS",
    requirementCount: 40,
    description: "Art. 58–73",
    modulePath: "/dashboard/modules/debris",
    category: "EU",
  },
  {
    id: "environmental",
    name: "Environmental",
    abbrev: "ENV",
    requirementCount: 16,
    description: "Art. 96–100 EFD",
    modulePath: "/dashboard/modules/environmental",
    category: "EU",
  },
  {
    id: "insurance",
    name: "Insurance & Liability",
    abbrev: "INS",
    requirementCount: 50,
    description: "Art. 44–51",
    modulePath: "/dashboard/modules/insurance",
    category: "EU",
  },
  {
    id: "copuos",
    name: "COPUOS / IADC",
    abbrev: "COPUOS",
    requirementCount: 60,
    description: "LTS + ISO 24113",
    modulePath: "/dashboard/modules/copuos",
    category: "International",
  },
  {
    id: "spectrum",
    name: "Spectrum / ITU",
    abbrev: "ITU",
    requirementCount: 50,
    description: "Radio Regs + FCC Part 25",
    modulePath: "/dashboard/modules/spectrum",
    category: "International",
  },
  {
    id: "export-control",
    name: "Export Control",
    abbrev: "ITAR",
    requirementCount: 60,
    description: "ITAR + EAR",
    modulePath: "/dashboard/modules/export-control",
    category: "Export",
  },
  {
    id: "uk-space",
    name: "UK Space Industry Act",
    abbrev: "UKSA",
    requirementCount: 45,
    description: "SIA 2018 + CAA",
    modulePath: "/dashboard/modules/uk-space",
    category: "National",
  },
  {
    id: "us-regulatory",
    name: "US Regulatory",
    abbrev: "US",
    requirementCount: 50,
    description: "FCC + FAA + NOAA",
    modulePath: "/dashboard/modules/us-regulatory",
    category: "National",
  },
];

// ─── Status Config ───

const STATUS_CONFIG: Record<
  ArticleStatusType,
  { label: string; color: string }
> = {
  not_started: {
    label: "Not Started",
    color: "text-slate-400 dark:text-slate-500",
  },
  in_progress: { label: "In Progress", color: "text-amber-500" },
  under_review: { label: "Under Review", color: "text-blue-500" },
  compliant: { label: "Compliant", color: "text-emerald-500" },
  not_applicable: { label: "N/A", color: "text-slate-400 dark:text-slate-600" },
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-500",
  HIGH: "text-amber-500",
  MEDIUM: "text-slate-500",
  LOW: "text-slate-400",
  CONDITIONAL: "text-emerald-500",
};

// ─── Score display ───

function ScoreValue({
  score,
  size = "md",
}: {
  score: number | null;
  size?: "sm" | "md" | "lg";
}) {
  if (score == null)
    return <span className="text-slate-300 dark:text-slate-600">—</span>;
  const color =
    score >= 75
      ? "text-emerald-500"
      : score >= 50
        ? "text-amber-500"
        : score >= 25
          ? "text-orange-500"
          : "text-red-500";
  const sizeClass =
    size === "lg"
      ? "text-[48px]"
      : size === "md"
        ? "text-[20px]"
        : "text-[13px]";
  return (
    <span
      className={`${color} ${sizeClass} font-semibold tabular-nums tracking-tight`}
    >
      {score}
      <span
        className={
          size === "lg"
            ? "text-[24px]"
            : size === "md"
              ? "text-[13px]"
              : "text-[10px]"
        }
      >
        %
      </span>
    </span>
  );
}

// ─── Thin progress bar ───

function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`h-[3px] rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden ${className}`}
    >
      <div
        className={`h-full rounded-full transition-all duration-700 ${
          value >= 75
            ? "bg-emerald-500"
            : value >= 50
              ? "bg-amber-500"
              : value > 0
                ? "bg-orange-500"
                : "bg-transparent"
        }`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// ─── Main Component ───

export default function TrackerPage() {
  const [selectedRegulation, setSelectedRegulation] =
    useState<RegulationId>("all");
  const [euView, setEuView] = useState<"articles" | "checklist">("articles");
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
  const [unifiedStatus, setUnifiedStatus] =
    useState<UnifiedStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  // ─── Data Fetching ───
  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [articlesRes, checklistRes, unifiedRes] = await Promise.all([
          fetch("/api/tracker/articles"),
          fetch("/api/tracker/checklist"),
          fetch("/api/tracker/unified-status"),
        ]);
        if (articlesRes.ok) setArticleStatuses(await articlesRes.json());
        if (checklistRes.ok) setChecklistStatuses(await checklistRes.json());
        if (unifiedRes.ok) setUnifiedStatus(await unifiedRes.json());
      } catch (error) {
        console.error("Error fetching tracker data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ─── EU Space Act Computed Data ───
  const filteredArticles = useMemo(() => {
    return articles.filter((a) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !a.title.toLowerCase().includes(q) &&
          !a.number.toLowerCase().includes(q) &&
          !a.summary.toLowerCase().includes(q) &&
          !a.operatorAction.toLowerCase().includes(q)
        )
          return false;
      }
      if (moduleFilter !== "all" && a.module !== moduleFilter) return false;
      if (statusFilter !== "all") {
        const st = articleStatuses[a.id]?.status || "not_started";
        if (st !== statusFilter) return false;
      }
      return true;
    });
  }, [search, moduleFilter, statusFilter, articleStatuses]);

  const groupedArticles = useMemo(() => {
    const groups: Record<string, Article[]> = {};
    for (const a of filteredArticles) {
      const key = `${a.titleGroup} — ${a.titleName}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(a);
    }
    return groups;
  }, [filteredArticles]);

  const moduleProgress = useMemo(() => {
    const p: Record<string, { total: number; compliant: number }> = {};
    for (const m of modules) p[m.id] = { total: 0, compliant: 0 };
    p["total"] = { total: 0, compliant: 0 };
    for (const a of articles) {
      const s = articleStatuses[a.id]?.status || "not_started";
      if (s === "not_applicable") continue;
      if (p[a.module]) {
        p[a.module].total++;
        if (s === "compliant") p[a.module].compliant++;
      }
      p["total"].total++;
      if (s === "compliant") p["total"].compliant++;
    }
    return p;
  }, [articleStatuses]);

  // ─── Mutations ───
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
      } catch (e) {
        console.error("Error updating status:", e);
      }
    },
    [],
  );

  const toggleChecklist = useCallback(
    async (id: string, completed: boolean) => {
      setChecklistStatuses((prev) => ({
        ...prev,
        [id]: { ...prev[id], completed, updatedAt: new Date() },
      }));
      try {
        await fetch("/api/tracker/checklist", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ checklistId: id, completed }),
        });
      } catch (e) {
        console.error("Error updating checklist:", e);
      }
    },
    [],
  );

  const toggleArticleExpand = useCallback((id: string) => {
    setExpandedArticles((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const toggleGroupCollapse = useCallback((g: string) => {
    setCollapsedGroups((prev) => {
      const n = new Set(prev);
      n.has(g) ? n.delete(g) : n.add(g);
      return n;
    });
  }, []);

  const handleExport = useCallback(() => {
    const h = [
      "Article Number",
      "Title",
      "Status",
      "Module",
      "Compliance Type",
    ];
    const rows = filteredArticles.map((a) => {
      const s = articleStatuses[a.id]?.status || "not_started";
      return [
        `Art. ${a.number}`,
        `"${a.title.replace(/"/g, '""')}"`,
        s.replace(/_/g, " "),
        a.moduleLabel,
        a.complianceType.replace(/_/g, " "),
      ].join(",");
    });
    const blob = new Blob([[h.join(","), ...rows].join("\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `compliance-tracker-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [filteredArticles, articleStatuses]);

  const overallScore = unifiedStatus?.overallScore ?? 0;
  const totalReqs = REGULATIONS.reduce((s, r) => s + r.requirementCount, 0);

  // ─── Loading ───
  if (loading) {
    return (
      <div className="h-screen bg-[var(--bg-base,#f8fafc)] dark:bg-[#0B0F1A] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-slate-300 dark:text-slate-700 animate-spin" />
      </div>
    );
  }

  // ─── Render ───
  return (
    <div className="h-screen bg-[var(--bg-base,#f8fafc)] dark:bg-[#0B0F1A] overflow-y-auto">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
        {/* ═══ Header ═══ */}
        <header className="flex items-end justify-between mb-10">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-slate-400 dark:text-slate-600 mb-2">
              Compliance
            </p>
            <h1 className="text-[28px] font-semibold text-slate-900 dark:text-white tracking-tight leading-none">
              Regulatory Tracker
            </h1>
          </div>
          <div className="flex items-baseline gap-6">
            <div className="text-right">
              <ScoreValue score={overallScore} size="lg" />
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                {unifiedStatus?.assessedCount ?? 0} of {REGULATIONS.length}{" "}
                assessed · {totalReqs}+ requirements
              </p>
            </div>
          </div>
        </header>

        {/* ═══ Navigation ═══ */}
        <nav className="flex items-center gap-1 mb-8 border-b border-black/[0.06] dark:border-white/[0.06] pb-px overflow-x-auto">
          <button
            onClick={() => setSelectedRegulation("all")}
            className={`relative px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
              selectedRegulation === "all"
                ? "text-slate-900 dark:text-white"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            Overview
            {selectedRegulation === "all" && (
              <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-slate-900 dark:bg-white rounded-full" />
            )}
          </button>
          {REGULATIONS.map((reg) => {
            const score = unifiedStatus?.regulations[reg.id]?.score;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegulation(reg.id)}
                className={`relative flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium transition-colors whitespace-nowrap ${
                  selectedRegulation === reg.id
                    ? "text-slate-900 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                {reg.abbrev}
                {score != null && (
                  <span
                    className={`text-[11px] tabular-nums ${
                      score >= 75
                        ? "text-emerald-500"
                        : score >= 50
                          ? "text-amber-500"
                          : "text-slate-400 dark:text-slate-500"
                    }`}
                  >
                    {score}
                  </span>
                )}
                {selectedRegulation === reg.id && (
                  <div className="absolute bottom-0 left-4 right-4 h-[2px] bg-slate-900 dark:bg-white rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* ═══ Content ═══ */}
        {selectedRegulation === "all" ? (
          /* ─── Overview Table ─── */
          <div>
            <table className="w-full">
              <thead>
                <tr className="text-left text-[11px] font-medium uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">
                  <th className="pb-3 pl-0 font-medium">Regulation</th>
                  <th className="pb-3 font-medium hidden md:table-cell">
                    Category
                  </th>
                  <th className="pb-3 font-medium hidden lg:table-cell">
                    Reference
                  </th>
                  <th className="pb-3 font-medium text-right w-[80px]">
                    Score
                  </th>
                  <th className="pb-3 font-medium hidden sm:table-cell w-[140px]">
                    Progress
                  </th>
                  <th className="pb-3 font-medium text-right w-[60px]">Reqs</th>
                  <th className="pb-3 font-medium text-right w-[40px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {REGULATIONS.map((reg) => {
                  const status = unifiedStatus?.regulations[reg.id];
                  const score = status?.score;
                  return (
                    <tr
                      key={reg.id}
                      onClick={() => setSelectedRegulation(reg.id)}
                      className="group cursor-pointer transition-colors hover:bg-black/[0.015] dark:hover:bg-white/[0.02]"
                    >
                      <td className="py-4 pr-4">
                        <p className="text-[14px] font-medium text-slate-800 dark:text-slate-100 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                          {reg.name}
                        </p>
                      </td>
                      <td className="py-4 pr-4 hidden md:table-cell">
                        <span className="text-[12px] text-slate-400 dark:text-slate-500">
                          {reg.category}
                        </span>
                      </td>
                      <td className="py-4 pr-4 hidden lg:table-cell">
                        <span className="text-[12px] text-slate-400 dark:text-slate-600">
                          {reg.description}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <ScoreValue score={score ?? null} size="sm" />
                      </td>
                      <td className="py-4 px-4 hidden sm:table-cell">
                        {score != null ? (
                          <ProgressBar value={score} />
                        ) : (
                          <span className="text-[11px] text-slate-300 dark:text-slate-700">
                            not assessed
                          </span>
                        )}
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-[12px] tabular-nums text-slate-400 dark:text-slate-500">
                          {reg.requirementCount}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <ChevronRight
                          size={14}
                          className="text-slate-300 dark:text-slate-700 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition-colors inline-block"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Summary row */}
            <div className="mt-6 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
              <p className="text-[12px] text-slate-400 dark:text-slate-500">
                {REGULATIONS.length} regulatory frameworks · {totalReqs}+ total
                requirements
              </p>
              <div className="flex items-center gap-6 text-[12px] text-slate-400 dark:text-slate-500">
                <span>
                  <span className="text-emerald-500 font-medium">
                    {
                      Object.values(unifiedStatus?.regulations ?? {}).filter(
                        (r) => r.hasAssessment && (r.score ?? 0) >= 75,
                      ).length
                    }
                  </span>{" "}
                  compliant
                </span>
                <span>
                  <span className="text-amber-500 font-medium">
                    {
                      Object.values(unifiedStatus?.regulations ?? {}).filter(
                        (r) =>
                          r.hasAssessment &&
                          (r.score ?? 0) >= 25 &&
                          (r.score ?? 0) < 75,
                      ).length
                    }
                  </span>{" "}
                  in progress
                </span>
                <span>
                  <span className="text-slate-500 font-medium">
                    {REGULATIONS.length - (unifiedStatus?.assessedCount ?? 0)}
                  </span>{" "}
                  pending
                </span>
              </div>
            </div>
          </div>
        ) : selectedRegulation === "eu-space-act" ? (
          /* ─── EU Space Act ─── */
          <div>
            {/* Sub-header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setSelectedRegulation("all")}
                  className="text-[12px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  Overview
                </button>
                <ChevronRight
                  size={12}
                  className="text-slate-300 dark:text-slate-700"
                />
                <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
                  EU Space Act
                </span>
              </div>
              <div className="flex items-center gap-4">
                <ScoreValue
                  score={
                    unifiedStatus?.regulations["eu-space-act"]?.score ?? null
                  }
                  size="md"
                />
              </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-3 mb-6 pb-6 border-b border-black/[0.04] dark:border-white/[0.04]">
              <div className="relative">
                <Search
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600"
                />
                <input
                  type="text"
                  placeholder="Search articles..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded-lg pl-9 pr-4 py-2 text-[13px] text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 w-[260px] focus:outline-none focus:border-slate-300 dark:focus:border-slate-500 transition-colors"
                />
              </div>
              <select
                value={moduleFilter}
                onChange={(e) =>
                  setModuleFilter(e.target.value as ComplianceModule | "all")
                }
                className="bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-slate-600 dark:text-slate-400 focus:outline-none"
              >
                <option value="all">All Modules</option>
                {modules.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.shortName}
                  </option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as ArticleStatusType | "all")
                }
                className="bg-transparent border border-black/[0.06] dark:border-white/[0.06] rounded-lg px-3 py-2 text-[12px] text-slate-600 dark:text-slate-400 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                {(Object.keys(STATUS_CONFIG) as ArticleStatusType[]).map(
                  (s) => (
                    <option key={s} value={s}>
                      {STATUS_CONFIG[s].label}
                    </option>
                  ),
                )}
              </select>
              <div className="flex-1" />
              <span className="text-[12px] text-slate-400 dark:text-slate-500 tabular-nums hidden md:block">
                {filteredArticles.length} articles
              </span>
              <div
                className="flex rounded-lg overflow-hidden border border-black/[0.06] dark:border-white/[0.06]"
                role="tablist"
              >
                <button
                  role="tab"
                  aria-selected={euView === "articles"}
                  onClick={() => setEuView("articles")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    euView === "articles"
                      ? "bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <LayoutList size={13} /> Articles
                </button>
                <button
                  role="tab"
                  aria-selected={euView === "checklist"}
                  onClick={() => setEuView("checklist")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    euView === "checklist"
                      ? "bg-black/[0.04] dark:bg-white/[0.06] text-slate-700 dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <CheckSquare size={13} /> Checklist
                </button>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                <Download size={13} /> Export
              </button>
            </div>

            {/* Module bar */}
            <div className="flex gap-4 mb-6 overflow-x-auto pb-1">
              {modules.map((mod) => {
                const p = moduleProgress[mod.id] || { total: 0, compliant: 0 };
                const pct =
                  p.total > 0 ? Math.round((p.compliant / p.total) * 100) : 0;
                const isActive = moduleFilter === mod.id;
                return (
                  <button
                    key={mod.id}
                    onClick={() =>
                      setModuleFilter(moduleFilter === mod.id ? "all" : mod.id)
                    }
                    className={`flex-shrink-0 text-center transition-colors ${
                      isActive ? "opacity-100" : "opacity-50 hover:opacity-75"
                    }`}
                  >
                    <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">
                      {mod.number}
                    </p>
                    <p
                      className={`text-[16px] font-semibold tabular-nums ${
                        pct >= 75
                          ? "text-emerald-500"
                          : pct > 0
                            ? "text-slate-700 dark:text-white"
                            : "text-slate-300 dark:text-slate-700"
                      }`}
                    >
                      {pct}%
                    </p>
                    <ProgressBar value={pct} className="w-12 mt-1" />
                  </button>
                );
              })}
            </div>

            {/* Articles */}
            {euView === "articles" ? (
              <div>
                {Object.entries(groupedArticles).map(
                  ([group, groupArticles]) => (
                    <div key={group}>
                      <button
                        onClick={() => toggleGroupCollapse(group)}
                        aria-expanded={!collapsedGroups.has(group)}
                        className="flex items-center gap-2 w-full text-left py-3 mt-4 mb-1"
                      >
                        {collapsedGroups.has(group) ? (
                          <ChevronRight
                            size={12}
                            className="text-slate-400 dark:text-slate-600"
                          />
                        ) : (
                          <ChevronDown
                            size={12}
                            className="text-slate-400 dark:text-slate-600"
                          />
                        )}
                        <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                          {group}
                        </span>
                        <span className="text-[11px] text-slate-300 dark:text-slate-600 ml-auto tabular-nums">
                          {groupArticles.length}
                        </span>
                      </button>
                      {!collapsedGroups.has(group) && (
                        <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                          {groupArticles.map((article) => {
                            const status =
                              articleStatuses[article.id]?.status ||
                              "not_started";
                            const cfg = STATUS_CONFIG[status];
                            const exp = expandedArticles.has(article.id);
                            return (
                              <div key={article.id}>
                                <button
                                  onClick={() =>
                                    toggleArticleExpand(article.id)
                                  }
                                  aria-expanded={exp}
                                  className="w-full py-3 flex items-center gap-4 text-left group/row transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.01]"
                                >
                                  <div
                                    className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                      status === "compliant"
                                        ? "bg-emerald-500"
                                        : status === "in_progress"
                                          ? "bg-amber-500"
                                          : status === "under_review"
                                            ? "bg-blue-500"
                                            : "bg-slate-300 dark:bg-slate-700"
                                    }`}
                                  />
                                  <span className="text-[12px] text-slate-400 dark:text-slate-500 w-[48px] flex-shrink-0 tabular-nums">
                                    {article.number}
                                  </span>
                                  <span className="text-[13px] text-slate-700 dark:text-slate-200 flex-1 truncate">
                                    {article.title}
                                  </span>
                                  <span className="hidden md:inline text-[11px] text-slate-400 dark:text-slate-600">
                                    {article.moduleLabel}
                                  </span>
                                  <span
                                    className={`text-[11px] font-medium w-[80px] text-right ${cfg.color}`}
                                  >
                                    {cfg.label}
                                  </span>
                                  <ChevronRight
                                    size={14}
                                    className={`text-slate-300 dark:text-slate-700 flex-shrink-0 transition-transform duration-200 ${exp ? "rotate-90" : ""}`}
                                  />
                                </button>
                                {exp && (
                                  <div className="pb-4 pl-[70px] pr-4">
                                    <p className="text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                                      {article.summary}
                                    </p>
                                    {article.operatorAction !== "None" && (
                                      <div className="mb-3 py-2.5 px-3 border-l-2 border-amber-500/40 bg-amber-500/[0.03]">
                                        <p className="text-[11px] font-medium text-amber-600 dark:text-amber-400 mb-0.5">
                                          Required Action
                                        </p>
                                        <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed">
                                          {article.operatorAction}
                                        </p>
                                      </div>
                                    )}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                      {article.appliesTo.map((op) => (
                                        <span
                                          key={op}
                                          className="text-[10px] px-2 py-0.5 rounded text-slate-400 dark:text-slate-500 bg-black/[0.03] dark:bg-white/[0.03]"
                                        >
                                          {op}
                                        </span>
                                      ))}
                                    </div>
                                    {article.exemptions && (
                                      <p className="text-[12px] text-slate-400 dark:text-slate-500 mb-3 italic">
                                        {article.exemptions}
                                      </p>
                                    )}
                                    {/* Status selector */}
                                    <div className="flex flex-wrap gap-1.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.04]">
                                      {(
                                        Object.keys(
                                          STATUS_CONFIG,
                                        ) as ArticleStatusType[]
                                      ).map((s) => {
                                        const sc = STATUS_CONFIG[s];
                                        return (
                                          <button
                                            key={s}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              updateArticleStatus(
                                                article.id,
                                                s,
                                              );
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                              status === s
                                                ? `${sc.color} bg-black/[0.04] dark:bg-white/[0.06]`
                                                : "text-slate-400 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-400 hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
                                            }`}
                                          >
                                            {sc.label}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ),
                )}
                {filteredArticles.length === 0 && (
                  <div className="py-16 text-center">
                    <p className="text-[13px] text-slate-400 dark:text-slate-500">
                      No articles match your filters
                    </p>
                    <button
                      onClick={() => {
                        setSearch("");
                        setModuleFilter("all");
                        setStatusFilter("all");
                      }}
                      className="text-[12px] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 mt-2 underline underline-offset-2"
                    >
                      Clear filters
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* Checklist */
              <div className="space-y-8">
                {(["pre_authorization", "ongoing", "end_of_life"] as const).map(
                  (phase) => {
                    const items = checklistItems.filter(
                      (i) => i.phase === phase,
                    );
                    const done = items.filter(
                      (i) => checklistStatuses[i.id]?.completed,
                    ).length;
                    const pct =
                      items.length > 0
                        ? Math.round((done / items.length) * 100)
                        : 0;
                    const label =
                      phase === "pre_authorization"
                        ? "Pre-Authorization"
                        : phase === "ongoing"
                          ? "Ongoing Operations"
                          : "End of Life";
                    return (
                      <div key={phase}>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500">
                              {label}
                            </span>
                            <span className="text-[11px] text-slate-300 dark:text-slate-600 tabular-nums">
                              {done}/{items.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <ProgressBar value={pct} className="w-20" />
                            <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="divide-y divide-black/[0.03] dark:divide-white/[0.03]">
                          {items.map((item) => {
                            const isDone =
                              checklistStatuses[item.id]?.completed || false;
                            return (
                              <div
                                key={item.id}
                                className="py-3 flex items-start gap-3"
                              >
                                <button
                                  onClick={() =>
                                    toggleChecklist(item.id, !isDone)
                                  }
                                  className={`mt-0.5 w-[18px] h-[18px] rounded border-[1.5px] flex items-center justify-center transition-all flex-shrink-0 ${
                                    isDone
                                      ? "bg-emerald-500 border-emerald-500"
                                      : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-500"
                                  }`}
                                >
                                  {isDone && (
                                    <Check
                                      size={11}
                                      className="text-white"
                                      strokeWidth={3}
                                    />
                                  )}
                                </button>
                                <div className="flex-1 min-w-0">
                                  <p
                                    className={`text-[13px] leading-relaxed ${
                                      isDone
                                        ? "line-through text-slate-400 dark:text-slate-600"
                                        : "text-slate-700 dark:text-slate-200"
                                    }`}
                                  >
                                    {item.requirement}
                                  </p>
                                  <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-0.5">
                                    {item.articles} · {item.moduleLabel}
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-medium flex-shrink-0 ${PRIORITY_COLORS[item.priority] || "text-slate-400"}`}
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
        ) : (
          /* ─── Other Regulation Detail ─── */
          (() => {
            const reg = REGULATIONS.find((r) => r.id === selectedRegulation)!;
            const status = unifiedStatus?.regulations[reg.id];
            return (
              <div>
                {/* Breadcrumb */}
                <div className="flex items-center gap-3 mb-8">
                  <button
                    onClick={() => setSelectedRegulation("all")}
                    className="text-[12px] text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  >
                    Overview
                  </button>
                  <ChevronRight
                    size={12}
                    className="text-slate-300 dark:text-slate-700"
                  />
                  <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">
                    {reg.name}
                  </span>
                </div>

                {/* Regulation header */}
                <div className="flex items-start justify-between mb-8">
                  <div>
                    <h2 className="text-[22px] font-semibold text-slate-900 dark:text-white tracking-tight mb-1">
                      {reg.name}
                    </h2>
                    <p className="text-[13px] text-slate-400 dark:text-slate-500">
                      {reg.description} · {reg.requirementCount} requirements
                    </p>
                  </div>
                  <div className="text-right">
                    {status?.score != null ? (
                      <ScoreValue score={status.score} size="lg" />
                    ) : (
                      <span className="text-[13px] text-slate-400 dark:text-slate-500">
                        Not assessed
                      </span>
                    )}
                    {status?.lastAssessedAt && (
                      <p className="text-[11px] text-slate-400 dark:text-slate-600 mt-1">
                        Last assessed{" "}
                        {new Date(status.lastAssessedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mb-8">
                  {reg.assessmentPath && (
                    <Link
                      href={reg.assessmentPath}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[13px] font-medium hover:opacity-90 transition-opacity"
                    >
                      {status?.hasAssessment
                        ? "Re-run Assessment"
                        : "Run Assessment"}
                      <ArrowUpRight size={14} />
                    </Link>
                  )}
                  {reg.modulePath &&
                    reg.modulePath !== "/dashboard/tracker" && (
                      <Link
                        href={reg.modulePath}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-lg border border-black/[0.08] dark:border-white/[0.08] text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors"
                      >
                        View Module
                        <ArrowUpRight size={14} />
                      </Link>
                    )}
                </div>

                {/* Empty state */}
                {!status?.hasAssessment && (
                  <div className="py-20 text-center border border-dashed border-black/[0.06] dark:border-white/[0.06] rounded-lg">
                    <p className="text-[14px] text-slate-500 dark:text-slate-400 mb-1">
                      No assessment data yet
                    </p>
                    <p className="text-[12px] text-slate-400 dark:text-slate-600">
                      Run the assessment to evaluate compliance against{" "}
                      {reg.requirementCount} requirements
                    </p>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>
    </div>
  );
}
