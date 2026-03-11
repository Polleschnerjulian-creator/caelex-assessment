"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
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
    color: "text-[#9CA3AF]",
  },
  in_progress: { label: "In Progress", color: "text-[#F59E0B]" },
  under_review: { label: "Under Review", color: "text-blue-500" },
  compliant: { label: "Compliant", color: "text-[#22C55E]" },
  not_applicable: { label: "N/A", color: "text-[#9CA3AF]" },
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: "text-[#EF4444]",
  HIGH: "text-[#F59E0B]",
  MEDIUM: "text-[#6B7280]",
  LOW: "text-[#9CA3AF]",
  CONDITIONAL: "text-[#22C55E]",
};

// ─── Color helpers ───

function scoreColor(score: number): string {
  if (score > 60) return "#22C55E";
  if (score > 30) return "#F59E0B";
  return "#EF4444";
}

function scoreTailwind(score: number): string {
  if (score > 60) return "text-[#22C55E]";
  if (score > 30) return "text-[#F59E0B]";
  return "text-[#EF4444]";
}

function barTailwind(score: number): string {
  if (score > 60) return "bg-[#22C55E]";
  if (score > 30) return "bg-[#F59E0B]";
  return "bg-[#EF4444]";
}

// ─── Readiness Ring (Fix #3) ───

function ReadinessRing({ score }: { score: number }) {
  const size = 80;
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = scoreColor(score);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0,0,0,0.04)"
          strokeWidth={strokeWidth}
          className="dark:stroke-white/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={mounted ? offset : circumference}
          strokeLinecap="round"
          style={{
            transition:
              "stroke-dashoffset 600ms cubic-bezier(0.4, 0.0, 0.2, 1.0)",
          }}
          className="motion-reduce:transition-none"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-[20px] font-semibold tabular-nums tracking-tight"
          style={{ color: "var(--cx-text-primary, #1A1A1A)" }}
        >
          {score}%
        </span>
      </div>
    </div>
  );
}

// ─── Progress Bar (Fix #6) ───

function ProgressBar({ value }: { value: number }) {
  return (
    <div
      className="rounded-[2px] overflow-hidden"
      style={{
        width: 80,
        height: 4,
        background: "rgba(0,0,0,0.04)",
      }}
    >
      <div
        className={`h-full rounded-[2px] transition-all duration-700 ${barTailwind(value)}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

// Table header style constant (Fix #1)
const thClass = "pb-4 font-medium text-[12px] uppercase tracking-[0.05em]";
const thColor = { color: "var(--cx-text-tertiary, #9CA3AF)" };

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

  // Footer summary counts
  const compliantCount = Object.values(unifiedStatus?.regulations ?? {}).filter(
    (r) => r.hasAssessment && (r.score ?? 0) >= 75,
  ).length;
  const inProgressCount = Object.values(
    unifiedStatus?.regulations ?? {},
  ).filter(
    (r) => r.hasAssessment && (r.score ?? 0) >= 1 && (r.score ?? 0) < 75,
  ).length;
  const pendingCount = REGULATIONS.length - (unifiedStatus?.assessedCount ?? 0);

  // ─── Loading ───
  if (loading) {
    return (
      <div className="h-screen bg-[var(--bg-base,#f8fafc)] dark:bg-[#0B0F1A] flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-[#9CA3AF] animate-spin" />
      </div>
    );
  }

  // ─── Render ───
  return (
    <div
      className="h-screen overflow-y-auto"
      style={{
        background:
          "radial-gradient(ellipse at 20% 0%, rgba(232,93,58,0.03) 0%, transparent 50%), radial-gradient(ellipse at 80% 100%, rgba(59,130,246,0.03) 0%, transparent 50%), var(--bg-base, #F8F9FA)",
      }}
    >
      {/* Dark mode override */}
      <style>{`.dark .tracker-ambient { background: #0B0F1A !important; }`}</style>
      <div className="tracker-ambient h-full overflow-y-auto">
        <div className="max-w-[1400px] mx-auto px-6 lg:px-10 py-8">
          {/* ═══ Header (Fix #3: Readiness Ring) ═══ */}
          <header className="flex items-end justify-between mb-10">
            <div>
              <p
                className="text-[11px] font-medium uppercase tracking-[0.2em] mb-2"
                style={{ color: "var(--cx-text-tertiary, #9CA3AF)" }}
              >
                Compliance
              </p>
              <h1
                className="text-[28px] font-semibold tracking-tight leading-none"
                style={{ color: "var(--cx-text-primary, #1A1A1A)" }}
              >
                Regulatory Tracker
              </h1>
            </div>
            <div className="flex flex-col items-center">
              <ReadinessRing score={overallScore} />
              <p
                className="text-[13px] mt-2 text-center"
                style={{ color: "var(--cx-text-secondary, #6B7280)" }}
              >
                {unifiedStatus?.assessedCount ?? 0} of {REGULATIONS.length}{" "}
                assessed · {totalReqs}+ requirements
              </p>
            </div>
          </header>

          {/* ═══ Pill Tabs (Fix #4) ═══ */}
          <nav
            className="mb-8 overflow-x-auto"
            style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
          >
            <style>{`nav::-webkit-scrollbar { display: none; }`}</style>
            <div
              className="inline-flex items-center gap-[2px] p-[3px] rounded-[6px]"
              style={{ background: "var(--cx-bg-recessed, #F1F3F5)" }}
            >
              {/* Overview tab */}
              <button
                onClick={() => setSelectedRegulation("all")}
                className="px-[14px] py-[6px] text-[13px] font-medium rounded-[4px] whitespace-nowrap transition-all duration-200"
                style={
                  selectedRegulation === "all"
                    ? {
                        background: "var(--cx-bg-elevated, #FFFFFF)",
                        color: "var(--cx-text-primary, #1A1A1A)",
                        boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                      }
                    : {
                        color: "var(--cx-text-secondary, #6B7280)",
                      }
                }
              >
                Overview
              </button>

              {/* Regulation tabs */}
              {REGULATIONS.map((reg) => {
                const score = unifiedStatus?.regulations[reg.id]?.score;
                const isActive = selectedRegulation === reg.id;
                const hasScore = score != null && score > 0;
                return (
                  <button
                    key={reg.id}
                    onClick={() => setSelectedRegulation(reg.id)}
                    className="flex items-center gap-1.5 px-[14px] py-[6px] text-[13px] font-medium rounded-[4px] whitespace-nowrap transition-all duration-200"
                    style={
                      isActive
                        ? {
                            background: "var(--cx-bg-elevated, #FFFFFF)",
                            color: "var(--cx-text-primary, #1A1A1A)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          }
                        : { color: "var(--cx-text-secondary, #6B7280)" }
                    }
                  >
                    {reg.abbrev}
                    {score != null && (
                      <span
                        className="text-[11px] font-semibold tabular-nums rounded-full min-w-[18px] text-center"
                        style={
                          hasScore && isActive
                            ? {
                                background: scoreColor(score),
                                color: "#FFFFFF",
                                padding: "1px 6px",
                              }
                            : score === 0 || score == null
                              ? {
                                  color: "var(--cx-text-tertiary, #9CA3AF)",
                                  padding: "1px 6px",
                                }
                              : {
                                  background: "var(--cx-bg-recessed, #F1F3F5)",
                                  color: "var(--cx-text-secondary, #6B7280)",
                                  padding: "1px 6px",
                                }
                        }
                      >
                        {score}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* ═══ Content ═══ */}
          {selectedRegulation === "all" ? (
            /* ─── Overview Table ─── */
            <div>
              <table className="w-full border-collapse">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(0,0,0,0.12)",
                    }}
                  >
                    <th className={`${thClass} text-left pl-0`} style={thColor}>
                      Regulation
                    </th>
                    <th
                      className={`${thClass} text-left hidden md:table-cell`}
                      style={thColor}
                    >
                      Category
                    </th>
                    <th
                      className={`${thClass} text-left hidden lg:table-cell`}
                      style={thColor}
                    >
                      Reference
                    </th>
                    <th
                      className={`${thClass} text-right w-[70px]`}
                      style={thColor}
                    >
                      Score
                    </th>
                    <th
                      className={`${thClass} hidden sm:table-cell w-[120px]`}
                      style={thColor}
                    >
                      Progress
                    </th>
                    <th
                      className={`${thClass} text-right w-[60px]`}
                      style={thColor}
                    >
                      Reqs
                    </th>
                    <th className={`${thClass} w-[32px]`} style={thColor}></th>
                  </tr>
                </thead>
                <tbody>
                  {REGULATIONS.map((reg) => {
                    const status = unifiedStatus?.regulations[reg.id];
                    const score = status?.score;
                    const assessed = status?.hasAssessment ?? false;

                    return (
                      <tr
                        key={reg.id}
                        onClick={() => setSelectedRegulation(reg.id)}
                        className="group cursor-pointer"
                        style={{
                          height: 56,
                          borderBottom: "1px solid rgba(0,0,0,0.08)",
                          transition:
                            "background 0.15s ease, opacity 0.15s ease",
                          opacity: assessed ? 1 : 0.45,
                        }}
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "var(--cx-bg-hover, #F1F3F5)";
                          if (!assessed)
                            (e.currentTarget as HTMLElement).style.opacity =
                              "0.75";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLElement).style.background =
                            "";
                          if (!assessed)
                            (e.currentTarget as HTMLElement).style.opacity =
                              "0.45";
                        }}
                      >
                        <td className="pr-4">
                          <p
                            className="text-[14px] font-medium transition-colors"
                            style={{
                              color: "var(--cx-text-primary, #1A1A1A)",
                            }}
                          >
                            {reg.name}
                          </p>
                        </td>
                        <td className="pr-4 hidden md:table-cell">
                          {/* Fix #5: Category pill badges */}
                          <span
                            className="inline-flex items-center px-[10px] py-[2px] text-[12px] font-medium rounded-full"
                            style={{
                              background: "var(--cx-bg-recessed, #F1F3F5)",
                              color: "var(--cx-text-secondary, #6B7280)",
                            }}
                          >
                            {reg.category}
                          </span>
                        </td>
                        <td className="pr-4 hidden lg:table-cell">
                          <span
                            className="text-[12px]"
                            style={{
                              color: "var(--cx-text-tertiary, #9CA3AF)",
                            }}
                          >
                            {reg.description}
                          </span>
                        </td>
                        <td className="text-right">
                          {score != null ? (
                            <span
                              className={`text-[13px] font-semibold tabular-nums ${scoreTailwind(score)}`}
                            >
                              {score}%
                            </span>
                          ) : (
                            <span
                              className="text-[13px]"
                              style={{
                                color: "var(--cx-text-tertiary, #9CA3AF)",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="px-4 hidden sm:table-cell">
                          {score != null ? (
                            <ProgressBar value={score} />
                          ) : (
                            <span
                              className="text-[12px] italic"
                              style={{
                                color: "var(--cx-text-tertiary, #9CA3AF)",
                              }}
                            >
                              —
                            </span>
                          )}
                        </td>
                        <td className="text-right">
                          <span
                            className="text-[12px] tabular-nums"
                            style={{
                              color: "var(--cx-text-secondary, #6B7280)",
                            }}
                          >
                            {reg.requirementCount}
                          </span>
                        </td>
                        <td className="text-right pr-0">
                          <ChevronRight
                            size={14}
                            className="inline-block transition-all duration-150 group-hover:translate-x-[2px]"
                            style={{
                              color: "var(--cx-text-tertiary, #9CA3AF)",
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Fix #8: Footer with colored status dots */}
              <div
                className="mt-6 pt-6 flex items-center justify-between"
                style={{
                  borderTop: "1px solid rgba(0,0,0,0.08)",
                }}
              >
                <p
                  className="text-[12px]"
                  style={{ color: "var(--cx-text-secondary, #6B7280)" }}
                >
                  {REGULATIONS.length} regulatory frameworks · {totalReqs}+
                  total requirements
                </p>
                <div className="flex items-center gap-5 text-[12px]">
                  <span
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--cx-text-secondary, #6B7280)" }}
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: "#22C55E",
                      }}
                    />
                    <span className="font-medium" style={{ color: "#22C55E" }}>
                      {compliantCount}
                    </span>{" "}
                    compliant
                  </span>
                  <span
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--cx-text-secondary, #6B7280)" }}
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: "#F59E0B",
                      }}
                    />
                    <span className="font-medium" style={{ color: "#F59E0B" }}>
                      {inProgressCount}
                    </span>{" "}
                    in progress
                  </span>
                  <span
                    className="flex items-center gap-1.5"
                    style={{ color: "var(--cx-text-secondary, #6B7280)" }}
                  >
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 8,
                        height: 8,
                        background: "#9CA3AF",
                      }}
                    />
                    <span
                      className="font-medium"
                      style={{ color: "var(--cx-text-secondary, #6B7280)" }}
                    >
                      {pendingCount}
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
                    className="text-[12px] hover:underline"
                    style={{
                      color: "var(--cx-text-secondary, #6B7280)",
                    }}
                  >
                    Overview
                  </button>
                  <ChevronRight
                    size={12}
                    style={{ color: "var(--cx-text-tertiary, #9CA3AF)" }}
                  />
                  <span
                    className="text-[12px] font-medium"
                    style={{
                      color: "var(--cx-text-primary, #1A1A1A)",
                    }}
                  >
                    EU Space Act
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {(() => {
                    const s = unifiedStatus?.regulations["eu-space-act"]?.score;
                    return s != null ? (
                      <span
                        className={`text-[20px] font-semibold tabular-nums ${scoreTailwind(s)}`}
                      >
                        {s}%
                      </span>
                    ) : null;
                  })()}
                </div>
              </div>

              {/* Toolbar */}
              <div
                className="flex flex-wrap items-center gap-3 mb-6 pb-6"
                style={{
                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                }}
              >
                <div className="relative">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{
                      color: "var(--cx-text-tertiary, #9CA3AF)",
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Search articles..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="bg-transparent rounded-lg pl-9 pr-4 py-2 text-[13px] w-[260px] focus:outline-none transition-colors"
                    style={{
                      border: "1px solid rgba(0,0,0,0.06)",
                      color: "var(--cx-text-primary, #1A1A1A)",
                    }}
                  />
                </div>
                <select
                  value={moduleFilter}
                  onChange={(e) =>
                    setModuleFilter(e.target.value as ComplianceModule | "all")
                  }
                  className="bg-transparent rounded-lg px-3 py-2 text-[12px] focus:outline-none"
                  style={{
                    border: "1px solid rgba(0,0,0,0.06)",
                    color: "var(--cx-text-secondary, #6B7280)",
                  }}
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
                  className="bg-transparent rounded-lg px-3 py-2 text-[12px] focus:outline-none"
                  style={{
                    border: "1px solid rgba(0,0,0,0.06)",
                    color: "var(--cx-text-secondary, #6B7280)",
                  }}
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
                <span
                  className="text-[12px] tabular-nums hidden md:block"
                  style={{ color: "var(--cx-text-secondary, #6B7280)" }}
                >
                  {filteredArticles.length} articles
                </span>
                <div
                  className="inline-flex items-center gap-[2px] p-[3px] rounded-[6px]"
                  style={{
                    background: "var(--cx-bg-recessed, #F1F3F5)",
                  }}
                  role="tablist"
                >
                  <button
                    role="tab"
                    aria-selected={euView === "articles"}
                    onClick={() => setEuView("articles")}
                    className="flex items-center gap-1.5 px-[14px] py-[6px] text-[12px] font-medium rounded-[4px] transition-all duration-200"
                    style={
                      euView === "articles"
                        ? {
                            background: "var(--cx-bg-elevated, #FFFFFF)",
                            color: "var(--cx-text-primary, #1A1A1A)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          }
                        : {
                            color: "var(--cx-text-secondary, #6B7280)",
                          }
                    }
                  >
                    <LayoutList size={13} /> Articles
                  </button>
                  <button
                    role="tab"
                    aria-selected={euView === "checklist"}
                    onClick={() => setEuView("checklist")}
                    className="flex items-center gap-1.5 px-[14px] py-[6px] text-[12px] font-medium rounded-[4px] transition-all duration-200"
                    style={
                      euView === "checklist"
                        ? {
                            background: "var(--cx-bg-elevated, #FFFFFF)",
                            color: "var(--cx-text-primary, #1A1A1A)",
                            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
                          }
                        : {
                            color: "var(--cx-text-secondary, #6B7280)",
                          }
                    }
                  >
                    <CheckSquare size={13} /> Checklist
                  </button>
                </div>
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] transition-colors hover:opacity-70"
                  style={{ color: "var(--cx-text-secondary, #6B7280)" }}
                >
                  <Download size={13} /> Export
                </button>
              </div>

              {/* Module bar */}
              <div className="flex gap-4 mb-6 overflow-x-auto pb-1">
                {modules.map((mod) => {
                  const p = moduleProgress[mod.id] || {
                    total: 0,
                    compliant: 0,
                  };
                  const pct =
                    p.total > 0 ? Math.round((p.compliant / p.total) * 100) : 0;
                  const isActive = moduleFilter === mod.id;
                  return (
                    <button
                      key={mod.id}
                      onClick={() =>
                        setModuleFilter(
                          moduleFilter === mod.id ? "all" : mod.id,
                        )
                      }
                      className="flex-shrink-0 text-center transition-opacity"
                      style={{ opacity: isActive ? 1 : 0.45 }}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.opacity =
                            "0.75";
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive)
                          (e.currentTarget as HTMLElement).style.opacity =
                            "0.45";
                      }}
                    >
                      <p
                        className="text-[10px] font-medium uppercase tracking-wider mb-1"
                        style={{
                          color: "var(--cx-text-tertiary, #9CA3AF)",
                        }}
                      >
                        {mod.number}
                      </p>
                      <p
                        className={`text-[16px] font-semibold tabular-nums ${
                          pct >= 75 ? "text-[#22C55E]" : pct > 0 ? "" : ""
                        }`}
                        style={{
                          color:
                            pct >= 75
                              ? "#22C55E"
                              : pct > 0
                                ? "var(--cx-text-primary, #1A1A1A)"
                                : "var(--cx-text-tertiary, #9CA3AF)",
                        }}
                      >
                        {pct}%
                      </p>
                      <div
                        className="mt-1 rounded-[2px] overflow-hidden"
                        style={{
                          width: 48,
                          height: 4,
                          background: "rgba(0,0,0,0.04)",
                        }}
                      >
                        <div
                          className={`h-full rounded-[2px] transition-all duration-500 ${pct > 0 ? barTailwind(pct) : ""}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Articles / Checklist */}
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
                              style={{
                                color: "var(--cx-text-tertiary, #9CA3AF)",
                              }}
                            />
                          ) : (
                            <ChevronDown
                              size={12}
                              style={{
                                color: "var(--cx-text-tertiary, #9CA3AF)",
                              }}
                            />
                          )}
                          <span
                            className="text-[11px] font-medium uppercase tracking-[0.1em]"
                            style={{
                              color: "var(--cx-text-tertiary, #9CA3AF)",
                            }}
                          >
                            {group}
                          </span>
                          <span
                            className="text-[11px] ml-auto tabular-nums"
                            style={{
                              color: "var(--cx-text-tertiary, #9CA3AF)",
                            }}
                          >
                            {groupArticles.length}
                          </span>
                        </button>
                        {!collapsedGroups.has(group) && (
                          <div>
                            {groupArticles.map((article) => {
                              const status =
                                articleStatuses[article.id]?.status ||
                                "not_started";
                              const cfg = STATUS_CONFIG[status];
                              const exp = expandedArticles.has(article.id);
                              return (
                                <div
                                  key={article.id}
                                  style={{
                                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                                  }}
                                >
                                  <button
                                    onClick={() =>
                                      toggleArticleExpand(article.id)
                                    }
                                    aria-expanded={exp}
                                    className="w-full py-3 flex items-center gap-4 text-left group/row transition-colors"
                                    style={{ minHeight: 48 }}
                                    onMouseEnter={(e) => {
                                      (
                                        e.currentTarget as HTMLElement
                                      ).style.background =
                                        "var(--cx-bg-hover, #F1F3F5)";
                                    }}
                                    onMouseLeave={(e) => {
                                      (
                                        e.currentTarget as HTMLElement
                                      ).style.background = "";
                                    }}
                                  >
                                    <div
                                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                      style={{
                                        background:
                                          status === "compliant"
                                            ? "#22C55E"
                                            : status === "in_progress"
                                              ? "#F59E0B"
                                              : status === "under_review"
                                                ? "#3B82F6"
                                                : "#D1D5DB",
                                      }}
                                    />
                                    <span
                                      className="text-[12px] w-[48px] flex-shrink-0 tabular-nums"
                                      style={{
                                        color:
                                          "var(--cx-text-secondary, #6B7280)",
                                      }}
                                    >
                                      {article.number}
                                    </span>
                                    <span
                                      className="text-[13px] flex-1 truncate"
                                      style={{
                                        color:
                                          "var(--cx-text-primary, #1A1A1A)",
                                      }}
                                    >
                                      {article.title}
                                    </span>
                                    <span
                                      className="hidden md:inline text-[11px]"
                                      style={{
                                        color:
                                          "var(--cx-text-tertiary, #9CA3AF)",
                                      }}
                                    >
                                      {article.moduleLabel}
                                    </span>
                                    <span
                                      className={`text-[11px] font-medium w-[80px] text-right ${cfg.color}`}
                                    >
                                      {cfg.label}
                                    </span>
                                    <ChevronRight
                                      size={14}
                                      className={`flex-shrink-0 transition-all duration-150 group-hover/row:translate-x-[2px] ${exp ? "rotate-90" : ""}`}
                                      style={{
                                        color:
                                          "var(--cx-text-tertiary, #9CA3AF)",
                                      }}
                                    />
                                  </button>
                                  {exp && (
                                    <div className="pb-4 pl-[70px] pr-4">
                                      <p
                                        className="text-[13px] leading-relaxed mb-3"
                                        style={{
                                          color:
                                            "var(--cx-text-secondary, #6B7280)",
                                        }}
                                      >
                                        {article.summary}
                                      </p>
                                      {article.operatorAction !== "None" && (
                                        <div
                                          className="mb-3 py-2.5 px-3"
                                          style={{
                                            borderLeft:
                                              "2px solid rgba(245,158,11,0.4)",
                                            background: "rgba(245,158,11,0.03)",
                                          }}
                                        >
                                          <p className="text-[11px] font-medium text-[#F59E0B] mb-0.5">
                                            Required Action
                                          </p>
                                          <p
                                            className="text-[12px] leading-relaxed"
                                            style={{
                                              color:
                                                "var(--cx-text-secondary, #6B7280)",
                                            }}
                                          >
                                            {article.operatorAction}
                                          </p>
                                        </div>
                                      )}
                                      <div className="flex flex-wrap gap-1.5 mb-3">
                                        {article.appliesTo.map((op) => (
                                          <span
                                            key={op}
                                            className="text-[10px] px-2 py-0.5 rounded"
                                            style={{
                                              background: "rgba(0,0,0,0.03)",
                                              color:
                                                "var(--cx-text-tertiary, #9CA3AF)",
                                            }}
                                          >
                                            {op}
                                          </span>
                                        ))}
                                      </div>
                                      {article.exemptions && (
                                        <p
                                          className="text-[12px] italic mb-3"
                                          style={{
                                            color:
                                              "var(--cx-text-tertiary, #9CA3AF)",
                                          }}
                                        >
                                          {article.exemptions}
                                        </p>
                                      )}
                                      <div
                                        className="flex flex-wrap gap-1.5 pt-3"
                                        style={{
                                          borderTop:
                                            "1px solid rgba(0,0,0,0.04)",
                                        }}
                                      >
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
                                                status === s ? sc.color : ""
                                              }`}
                                              style={
                                                status === s
                                                  ? {
                                                      background:
                                                        "rgba(0,0,0,0.04)",
                                                    }
                                                  : {
                                                      color:
                                                        "var(--cx-text-tertiary, #9CA3AF)",
                                                    }
                                              }
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
                      <p
                        className="text-[13px]"
                        style={{
                          color: "var(--cx-text-secondary, #6B7280)",
                        }}
                      >
                        No articles match your filters
                      </p>
                      <button
                        onClick={() => {
                          setSearch("");
                          setModuleFilter("all");
                          setStatusFilter("all");
                        }}
                        className="text-[12px] mt-2 underline underline-offset-2"
                        style={{
                          color: "var(--cx-text-secondary, #6B7280)",
                        }}
                      >
                        Clear filters
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                /* Checklist */
                <div className="space-y-8">
                  {(
                    ["pre_authorization", "ongoing", "end_of_life"] as const
                  ).map((phase) => {
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
                            <span
                              className="text-[11px] font-medium uppercase tracking-[0.1em]"
                              style={{
                                color: "var(--cx-text-tertiary, #9CA3AF)",
                              }}
                            >
                              {label}
                            </span>
                            <span
                              className="text-[11px] tabular-nums"
                              style={{
                                color: "var(--cx-text-tertiary, #9CA3AF)",
                              }}
                            >
                              {done}/{items.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div
                              className="rounded-[2px] overflow-hidden"
                              style={{
                                width: 80,
                                height: 4,
                                background: "rgba(0,0,0,0.04)",
                              }}
                            >
                              <div
                                className={`h-full rounded-[2px] transition-all duration-500 ${pct > 0 ? barTailwind(pct) : ""}`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span
                              className="text-[11px] tabular-nums"
                              style={{
                                color: "var(--cx-text-secondary, #6B7280)",
                              }}
                            >
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div>
                          {items.map((item) => {
                            const isDone =
                              checklistStatuses[item.id]?.completed || false;
                            return (
                              <div
                                key={item.id}
                                className="py-3 flex items-start gap-3"
                                style={{
                                  borderBottom: "1px solid rgba(0,0,0,0.04)",
                                }}
                              >
                                <button
                                  onClick={() =>
                                    toggleChecklist(item.id, !isDone)
                                  }
                                  className="mt-0.5 w-[18px] h-[18px] rounded flex items-center justify-center transition-all flex-shrink-0"
                                  style={{
                                    border: isDone
                                      ? "1.5px solid #22C55E"
                                      : "1.5px solid #D1D5DB",
                                    background: isDone
                                      ? "#22C55E"
                                      : "transparent",
                                  }}
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
                                    className={`text-[13px] leading-relaxed ${isDone ? "line-through" : ""}`}
                                    style={{
                                      color: isDone
                                        ? "var(--cx-text-tertiary, #9CA3AF)"
                                        : "var(--cx-text-primary, #1A1A1A)",
                                    }}
                                  >
                                    {item.requirement}
                                  </p>
                                  <p
                                    className="text-[11px] mt-0.5"
                                    style={{
                                      color: "var(--cx-text-tertiary, #9CA3AF)",
                                    }}
                                  >
                                    {item.articles} · {item.moduleLabel}
                                  </p>
                                </div>
                                <span
                                  className={`text-[10px] font-medium flex-shrink-0 ${PRIORITY_COLORS[item.priority] || ""}`}
                                >
                                  {item.priority}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
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
                      className="text-[12px] hover:underline"
                      style={{
                        color: "var(--cx-text-secondary, #6B7280)",
                      }}
                    >
                      Overview
                    </button>
                    <ChevronRight
                      size={12}
                      style={{
                        color: "var(--cx-text-tertiary, #9CA3AF)",
                      }}
                    />
                    <span
                      className="text-[12px] font-medium"
                      style={{
                        color: "var(--cx-text-primary, #1A1A1A)",
                      }}
                    >
                      {reg.name}
                    </span>
                  </div>

                  {/* Regulation header */}
                  <div className="flex items-start justify-between mb-8">
                    <div>
                      <h2
                        className="text-[22px] font-semibold tracking-tight mb-1"
                        style={{
                          color: "var(--cx-text-primary, #1A1A1A)",
                        }}
                      >
                        {reg.name}
                      </h2>
                      <p
                        className="text-[13px]"
                        style={{
                          color: "var(--cx-text-secondary, #6B7280)",
                        }}
                      >
                        {reg.description} · {reg.requirementCount} requirements
                      </p>
                    </div>
                    <div className="text-right">
                      {status?.score != null ? (
                        <ReadinessRing score={status.score} />
                      ) : (
                        <span
                          className="text-[13px]"
                          style={{
                            color: "var(--cx-text-tertiary, #9CA3AF)",
                          }}
                        >
                          Not assessed
                        </span>
                      )}
                      {status?.lastAssessedAt && (
                        <p
                          className="text-[11px] mt-1"
                          style={{
                            color: "var(--cx-text-tertiary, #9CA3AF)",
                          }}
                        >
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
                        className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-[13px] font-medium hover:opacity-90 transition-opacity"
                        style={{
                          background: "var(--cx-text-primary, #1A1A1A)",
                          color: "#FFFFFF",
                        }}
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
                          className="flex items-center gap-2 px-4 py-2.5 rounded-[6px] text-[13px] font-medium transition-colors hover:opacity-80"
                          style={{
                            border: "1px solid rgba(0,0,0,0.08)",
                            color: "var(--cx-text-secondary, #6B7280)",
                          }}
                        >
                          View Module
                          <ArrowUpRight size={14} />
                        </Link>
                      )}
                  </div>

                  {/* Empty state */}
                  {!status?.hasAssessment && (
                    <div
                      className="py-20 text-center rounded-[6px]"
                      style={{
                        border: "1px dashed rgba(0,0,0,0.08)",
                      }}
                    >
                      <p
                        className="text-[14px] mb-1"
                        style={{
                          color: "var(--cx-text-secondary, #6B7280)",
                        }}
                      >
                        No assessment data yet
                      </p>
                      <p
                        className="text-[12px]"
                        style={{
                          color: "var(--cx-text-tertiary, #9CA3AF)",
                        }}
                      >
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
    </div>
  );
}
