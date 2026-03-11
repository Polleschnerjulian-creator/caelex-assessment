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
  Shield,
  ShieldCheck,
  Globe,
  Satellite,
  Lock,
  Leaf,
  FileWarning,
  Radio,
  Scale,
  Landmark,
  Flag,
  Crosshair,
  ArrowUpRight,
  Loader2,
  BarChart3,
  Zap,
  Grid3X3,
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

type ViewMode = "requirements" | "checklist" | "matrix";
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
  shortName: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  colorBg: string;
  requirementCount: number;
  description: string;
  assessmentPath?: string;
  modulePath?: string;
  category: "eu" | "international" | "national" | "export";
}

const REGULATIONS: RegulationConfig[] = [
  {
    id: "eu-space-act",
    name: "EU Space Act",
    shortName: "EU Space",
    icon: Shield,
    color: "text-blue-500",
    colorBg: "bg-blue-500/10",
    requirementCount: 119,
    description: "COM(2025) 335 — 119 articles across 9 compliance modules",
    assessmentPath: "/assessment/eu-space-act",
    modulePath: "/dashboard/tracker",
    category: "eu",
  },
  {
    id: "nis2",
    name: "NIS2 Directive",
    shortName: "NIS2",
    icon: Lock,
    color: "text-violet-500",
    colorBg: "bg-violet-500/10",
    requirementCount: 51,
    description:
      "EU 2022/2555 — Cybersecurity for space entities (essential/important)",
    assessmentPath: "/assessment/nis2",
    modulePath: "/dashboard/modules/nis2",
    category: "eu",
  },
  {
    id: "cybersecurity",
    name: "Cybersecurity",
    shortName: "Cyber",
    icon: ShieldCheck,
    color: "text-cyan-500",
    colorBg: "bg-cyan-500/10",
    requirementCount: 50,
    description: "EU Space Act Art. 74–95 + ENISA Space Controls",
    modulePath: "/dashboard/modules/cybersecurity",
    category: "eu",
  },
  {
    id: "debris",
    name: "Debris Mitigation",
    shortName: "Debris",
    icon: Satellite,
    color: "text-orange-500",
    colorBg: "bg-orange-500/10",
    requirementCount: 40,
    description:
      "EU Space Act Art. 58–73 — Collision avoidance, deorbit, passivation",
    modulePath: "/dashboard/modules/debris",
    category: "eu",
  },
  {
    id: "environmental",
    name: "Environmental",
    shortName: "Enviro",
    icon: Leaf,
    color: "text-emerald-500",
    colorBg: "bg-emerald-500/10",
    requirementCount: 16,
    description:
      "EU Space Act Art. 96–100 — Environmental Footprint Declaration (EFD)",
    modulePath: "/dashboard/modules/environmental",
    category: "eu",
  },
  {
    id: "insurance",
    name: "Insurance & Liability",
    shortName: "Insurance",
    icon: Scale,
    color: "text-amber-500",
    colorBg: "bg-amber-500/10",
    requirementCount: 50,
    description:
      "EU Space Act Art. 44–51 — Third-party liability across 22 jurisdictions",
    modulePath: "/dashboard/modules/insurance",
    category: "eu",
  },
  {
    id: "copuos",
    name: "COPUOS / IADC / ISO",
    shortName: "COPUOS",
    icon: Globe,
    color: "text-sky-500",
    colorBg: "bg-sky-500/10",
    requirementCount: 60,
    description:
      "LTS Guidelines 2019 + IADC Debris Mitigation + ISO 24113:2024",
    modulePath: "/dashboard/modules/copuos",
    category: "international",
  },
  {
    id: "export-control",
    name: "Export Control",
    shortName: "ITAR/EAR",
    icon: FileWarning,
    color: "text-red-500",
    colorBg: "bg-red-500/10",
    requirementCount: 60,
    description:
      "ITAR (22 CFR 120–130) + EAR (15 CFR 730–774) — DDTC/BIS licensing",
    modulePath: "/dashboard/modules/export-control",
    category: "export",
  },
  {
    id: "spectrum",
    name: "Spectrum / ITU",
    shortName: "Spectrum",
    icon: Radio,
    color: "text-pink-500",
    colorBg: "bg-pink-500/10",
    requirementCount: 50,
    description:
      "ITU Radio Regs + FCC Part 25 + Ofcom + BNetzA + WRC decisions",
    modulePath: "/dashboard/modules/spectrum",
    category: "international",
  },
  {
    id: "uk-space",
    name: "UK Space Industry Act",
    shortName: "UK Space",
    icon: Landmark,
    color: "text-indigo-500",
    colorBg: "bg-indigo-500/10",
    requirementCount: 45,
    description: "Space Industry Act 2018 + CAA licensing requirements",
    modulePath: "/dashboard/modules/uk-space",
    category: "national",
  },
  {
    id: "us-regulatory",
    name: "US Regulatory",
    shortName: "US Reg",
    icon: Flag,
    color: "text-rose-500",
    colorBg: "bg-rose-500/10",
    requirementCount: 50,
    description: "FCC Part 25 + FAA/AST Part 450 + NOAA Part 960 + ORBITS Act",
    modulePath: "/dashboard/modules/us-regulatory",
    category: "national",
  },
];

const CATEGORY_LABELS: Record<string, string> = {
  eu: "European Union",
  international: "International Standards",
  national: "National Frameworks",
  export: "Export Control",
};

// ─── Status Config ───

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

// ─── Glass Panel ───

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
    const obs = new MutationObserver(() =>
      setIsDark(document.documentElement.classList.contains("dark")),
    );
    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => obs.disconnect();
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

// ─── Score Ring Component ───

function ScoreRing({
  score,
  size = 120,
  strokeWidth = 8,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color =
    score >= 75
      ? "#10B981"
      : score >= 50
        ? "#F59E0B"
        : score >= 25
          ? "#F97316"
          : "#EF4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-black/[0.04] dark:text-white/[0.06]"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[28px] font-bold text-slate-900 dark:text-white leading-none">
          {score}%
        </span>
        <span className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">
          Overall
        </span>
      </div>
    </div>
  );
}

// ─── Main Component ───

export default function TrackerPage() {
  const [selectedRegulation, setSelectedRegulation] =
    useState<RegulationId>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("requirements");
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
      <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-4 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-slate-400 dark:text-slate-500 animate-spin mx-auto mb-3" />
          <p className="text-[12px] text-slate-400 dark:text-slate-500">
            Loading compliance data...
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───
  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] overflow-y-auto">
      <div className="p-4 lg:p-5 space-y-4 max-w-[1500px] mx-auto">
        {/* ═══════════════════ HERO HEADER ═══════════════════ */}
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Score Panel */}
          <GlassPanel className="p-6 flex items-center gap-6 flex-shrink-0">
            <ScoreRing score={overallScore} />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500 mb-1">
                Unified Compliance
              </p>
              <h1 className="text-[22px] font-semibold text-slate-900 dark:text-white tracking-tight leading-tight">
                Regulatory Tracker
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {REGULATIONS.length} regulations · {totalReqs}+ requirements ·{" "}
                {unifiedStatus?.assessedCount ?? 0} assessed
              </p>
              <div className="flex items-center gap-3 mt-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                    {unifiedStatus?.assessedCount ?? 0}/{REGULATIONS.length}{" "}
                    Assessed
                  </span>
                </div>
              </div>
            </div>
          </GlassPanel>

          {/* Regulation Mini-Scores */}
          <GlassPanel className="p-4 flex-1">
            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 h-full">
              {REGULATIONS.map((reg) => {
                const status = unifiedStatus?.regulations[reg.id];
                const score = status?.score;
                const isSelected = selectedRegulation === reg.id;
                const Icon = reg.icon;
                return (
                  <button
                    key={reg.id}
                    onClick={() =>
                      setSelectedRegulation(isSelected ? "all" : reg.id)
                    }
                    className={`relative p-2.5 rounded-xl text-center transition-all duration-200 ${
                      isSelected
                        ? "bg-white/60 dark:bg-white/[0.08] ring-1 ring-blue-500/30 scale-[1.02]"
                        : "hover:bg-white/40 dark:hover:bg-white/[0.04]"
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-lg ${reg.colorBg} flex items-center justify-center mx-auto mb-1.5`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${reg.color}`} />
                    </div>
                    <p className="text-[15px] font-bold text-slate-800 dark:text-white leading-none mb-0.5">
                      {score != null ? `${score}%` : "—"}
                    </p>
                    <p className="text-[8px] text-slate-400 dark:text-slate-500 truncate">
                      {reg.shortName}
                    </p>
                    {!status?.hasAssessment && (
                      <div
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500"
                        title="Not assessed"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </GlassPanel>
        </div>

        {/* ═══════════════════ REGULATION TABS ═══════════════════ */}
        <GlassPanel
          className="px-4 py-2.5 flex items-center gap-1.5 overflow-x-auto"
          style={{ borderRadius: 14 }}
        >
          <button
            onClick={() => setSelectedRegulation("all")}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
              selectedRegulation === "all"
                ? "bg-white/60 dark:bg-white/[0.08] text-slate-800 dark:text-white"
                : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            }`}
          >
            All Regulations
          </button>
          {REGULATIONS.map((reg) => {
            const Icon = reg.icon;
            const score = unifiedStatus?.regulations[reg.id]?.score;
            return (
              <button
                key={reg.id}
                onClick={() => setSelectedRegulation(reg.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                  selectedRegulation === reg.id
                    ? "bg-white/60 dark:bg-white/[0.08] text-slate-800 dark:text-white"
                    : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
              >
                <Icon
                  className={`w-3 h-3 ${selectedRegulation === reg.id ? reg.color : ""}`}
                />
                {reg.shortName}
                {score != null && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      score >= 75
                        ? "bg-emerald-500/10 text-emerald-500"
                        : score >= 50
                          ? "bg-amber-500/10 text-amber-500"
                          : "bg-red-500/10 text-red-500"
                    }`}
                  >
                    {score}%
                  </span>
                )}
              </button>
            );
          })}
        </GlassPanel>

        {/* ═══════════════════ CONTENT ═══════════════════ */}
        {selectedRegulation === "all" ? (
          /* ─── ALL REGULATIONS OVERVIEW ─── */
          <div className="space-y-6">
            {(["eu", "international", "national", "export"] as const).map(
              (cat) => {
                const regs = REGULATIONS.filter((r) => r.category === cat);
                if (regs.length === 0) return null;
                return (
                  <div key={cat}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 mb-2.5 px-1">
                      {CATEGORY_LABELS[cat]}
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {regs.map((reg) => {
                        const status = unifiedStatus?.regulations[reg.id];
                        const score = status?.score;
                        const Icon = reg.icon;
                        return (
                          <GlassPanel
                            key={reg.id}
                            className="p-5 cursor-pointer hover:scale-[1.01] transition-transform duration-200"
                            style={
                              score != null && score >= 75
                                ? {
                                    border:
                                      "1px solid rgba(16, 185, 129, 0.15)",
                                  }
                                : undefined
                            }
                          >
                            <button
                              onClick={() => setSelectedRegulation(reg.id)}
                              className="w-full text-left"
                            >
                              <div className="flex items-start justify-between mb-3">
                                <div
                                  className={`w-10 h-10 rounded-xl ${reg.colorBg} flex items-center justify-center`}
                                >
                                  <Icon className={`w-5 h-5 ${reg.color}`} />
                                </div>
                                <div className="text-right">
                                  {score != null ? (
                                    <p
                                      className={`text-[22px] font-bold leading-none ${
                                        score >= 75
                                          ? "text-emerald-500"
                                          : score >= 50
                                            ? "text-amber-500"
                                            : "text-slate-700 dark:text-white"
                                      }`}
                                    >
                                      {score}%
                                    </p>
                                  ) : (
                                    <span className="text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                      Not Assessed
                                    </span>
                                  )}
                                </div>
                              </div>
                              <h3 className="text-[14px] font-semibold text-slate-800 dark:text-white mb-1">
                                {reg.name}
                              </h3>
                              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                                {reg.description}
                              </p>
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                                  {reg.requirementCount} requirements
                                </span>
                                <div className="flex items-center gap-2">
                                  {reg.assessmentPath &&
                                    !status?.hasAssessment && (
                                      <Link
                                        href={reg.assessmentPath}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center gap-1 text-[10px] font-medium text-blue-500 hover:text-blue-600"
                                      >
                                        <Zap size={10} /> Assess
                                      </Link>
                                    )}
                                  {reg.modulePath && (
                                    <Link
                                      href={reg.modulePath}
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center gap-1 text-[10px] font-medium text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                                    >
                                      Open <ArrowUpRight size={10} />
                                    </Link>
                                  )}
                                </div>
                              </div>
                              {/* Progress bar */}
                              {score != null && (
                                <div className="mt-3 h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-700 ${
                                      score >= 75
                                        ? "bg-emerald-500"
                                        : score >= 50
                                          ? "bg-amber-500"
                                          : "bg-orange-500"
                                    }`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              )}
                            </button>
                          </GlassPanel>
                        );
                      })}
                    </div>
                  </div>
                );
              },
            )}

            {/* ─── Matrix View (Quick Overview) ─── */}
            <GlassPanel className="p-5">
              <div className="flex items-center gap-2 mb-4">
                <Grid3X3 className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                  Compliance Matrix
                </h3>
              </div>
              <div className="grid grid-cols-6 lg:grid-cols-11 gap-1.5">
                {REGULATIONS.map((reg) => {
                  const score = unifiedStatus?.regulations[reg.id]?.score;
                  const bg =
                    score == null
                      ? "bg-slate-200/60 dark:bg-white/[0.04]"
                      : score >= 75
                        ? "bg-emerald-500"
                        : score >= 50
                          ? "bg-amber-500"
                          : score >= 25
                            ? "bg-orange-500"
                            : "bg-red-500";
                  return (
                    <button
                      key={reg.id}
                      onClick={() => setSelectedRegulation(reg.id)}
                      className="flex flex-col items-center gap-1"
                      title={`${reg.name}: ${score != null ? score + "%" : "Not assessed"}`}
                    >
                      <div
                        className={`w-full aspect-square rounded-lg ${bg} flex items-center justify-center transition-all hover:scale-105`}
                      >
                        <span className="text-[10px] font-bold text-white">
                          {score != null ? score : "—"}
                        </span>
                      </div>
                      <span className="text-[7px] text-slate-400 dark:text-slate-500 truncate w-full text-center">
                        {reg.shortName}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
                {[
                  { label: "75%+", color: "bg-emerald-500" },
                  { label: "50–74%", color: "bg-amber-500" },
                  { label: "25–49%", color: "bg-orange-500" },
                  { label: "<25%", color: "bg-red-500" },
                  { label: "N/A", color: "bg-slate-200 dark:bg-white/[0.06]" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded ${l.color}`} />
                    <span className="text-[9px] text-slate-400 dark:text-slate-500">
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </div>
        ) : selectedRegulation === "eu-space-act" ? (
          /* ─── EU SPACE ACT DETAILED TRACKER ─── */
          <div className="space-y-3">
            {/* Filter Bar */}
            <GlassPanel
              className="px-4 py-3 flex flex-wrap items-center gap-3"
              style={{ borderRadius: 14 }}
            >
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
                  className="bg-white/40 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-[12px] text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 w-[240px] focus:outline-none focus:border-blue-500/40 transition-all"
                />
              </div>
              <select
                value={moduleFilter}
                onChange={(e) =>
                  setModuleFilter(e.target.value as ComplianceModule | "all")
                }
                className="bg-white/40 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
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
                className="bg-white/40 dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.08] rounded-xl px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300 focus:outline-none"
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
              <span className="text-[11px] text-slate-400 dark:text-slate-500 hidden md:block">
                {filteredArticles.length} articles
              </span>
              <div
                className="flex rounded-xl overflow-hidden border border-black/[0.06] dark:border-white/[0.08]"
                role="tablist"
              >
                <button
                  role="tab"
                  aria-selected={viewMode === "requirements"}
                  onClick={() => setViewMode("requirements")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-all ${
                    viewMode === "requirements"
                      ? "bg-white/60 dark:bg-white/[0.08] text-slate-800 dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <LayoutList size={12} /> Articles
                </button>
                <button
                  role="tab"
                  aria-selected={viewMode === "checklist"}
                  onClick={() => setViewMode("checklist")}
                  className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium transition-all ${
                    viewMode === "checklist"
                      ? "bg-white/60 dark:bg-white/[0.08] text-slate-800 dark:text-white"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <CheckSquare size={12} /> Checklist
                </button>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11px] font-medium text-slate-500 dark:text-slate-400 hover:bg-white/40 dark:hover:bg-white/[0.04] transition-all"
              >
                <Download size={12} /> CSV
              </button>
            </GlassPanel>

            {/* Module Progress */}
            <div className="grid grid-cols-5 lg:grid-cols-10 gap-1.5">
              {modules.map((mod) => {
                const p = moduleProgress[mod.id] || { total: 0, compliant: 0 };
                const pct =
                  p.total > 0 ? Math.round((p.compliant / p.total) * 100) : 0;
                return (
                  <button
                    key={mod.id}
                    onClick={() =>
                      setModuleFilter(moduleFilter === mod.id ? "all" : mod.id)
                    }
                    className={`transition-all duration-200 ${moduleFilter === mod.id ? "scale-[1.03]" : "hover:scale-[1.02]"}`}
                  >
                    <GlassPanel
                      className="p-2.5 text-center"
                      style={
                        moduleFilter === mod.id
                          ? { border: "1px solid rgba(16, 185, 129, 0.3)" }
                          : undefined
                      }
                    >
                      <p className="text-[8px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {mod.number}
                      </p>
                      <p
                        className={`text-[17px] font-bold tracking-tight leading-none my-0.5 ${pct >= 75 ? "text-emerald-500" : pct > 0 ? "text-slate-700 dark:text-white" : "text-slate-300 dark:text-slate-600"}`}
                      >
                        {pct}%
                      </p>
                      <div className="mt-1 h-0.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </GlassPanel>
                  </button>
                );
              })}
            </div>

            {/* Articles View */}
            {viewMode === "requirements" ? (
              <div className="space-y-1.5">
                {Object.entries(groupedArticles).map(
                  ([group, groupArticles]) => (
                    <div key={group}>
                      <button
                        onClick={() => toggleGroupCollapse(group)}
                        aria-expanded={!collapsedGroups.has(group)}
                        className="flex items-center gap-2.5 w-full text-left py-3 px-1 mt-3 mb-1"
                      >
                        {collapsedGroups.has(group) ? (
                          <ChevronRight size={13} className="text-slate-400" />
                        ) : (
                          <ChevronDown size={13} className="text-slate-400" />
                        )}
                        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          {group}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 ml-auto">
                          {groupArticles.length}
                        </span>
                      </button>
                      {!collapsedGroups.has(group) && (
                        <div className="space-y-1.5">
                          {groupArticles.map((article) => {
                            const status =
                              articleStatuses[article.id]?.status ||
                              "not_started";
                            const cfg = STATUS_CONFIG[status];
                            const exp = expandedArticles.has(article.id);
                            return (
                              <GlassPanel
                                key={article.id}
                                style={
                                  exp
                                    ? {
                                        border:
                                          "1px solid rgba(59,130,246,0.2)",
                                      }
                                    : status === "compliant"
                                      ? {
                                          border:
                                            "1px solid rgba(16,185,129,0.15)",
                                        }
                                      : undefined
                                }
                              >
                                <button
                                  onClick={() =>
                                    toggleArticleExpand(article.id)
                                  }
                                  aria-expanded={exp}
                                  className="w-full px-4 py-3 flex items-center gap-3 text-left"
                                >
                                  <div
                                    className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${cfg.dot}`}
                                  />
                                  <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500 w-[50px] flex-shrink-0">
                                    Art. {article.number}
                                  </span>
                                  <span className="text-[12px] text-slate-800 dark:text-slate-200 flex-1 truncate">
                                    {article.title}
                                  </span>
                                  <span className="hidden md:inline text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/50 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-black/[0.04] dark:border-white/[0.06]">
                                    {article.moduleLabel}
                                  </span>
                                  <span
                                    className={`hidden lg:inline text-[9px] font-medium px-2 py-0.5 rounded-full ${COMPLIANCE_TYPE_COLORS[article.complianceType] || "bg-slate-500/10 text-slate-500"}`}
                                  >
                                    {article.complianceType.replace(/_/g, " ")}
                                  </span>
                                  <ChevronRight
                                    size={14}
                                    className={`text-slate-400 flex-shrink-0 transition-transform duration-200 ${exp ? "rotate-90" : ""}`}
                                  />
                                </button>
                                {exp && (
                                  <div className="px-4 pb-4">
                                    <div className="ml-[23px] pl-4 border-l-2 border-blue-500/20">
                                      <p className="text-[12px] text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                                        {article.summary}
                                      </p>
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
                                      {article.exemptions && (
                                        <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3 italic">
                                          {article.exemptions}
                                        </p>
                                      )}
                                      <div className="flex flex-wrap gap-1.5 pt-3 border-t border-black/[0.04] dark:border-white/[0.06]">
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
                                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-medium transition-all ${
                                                status === s
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
                  ),
                )}
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
              /* Checklist View */
              <div className="space-y-5">
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
                        <div className="flex items-center justify-between mb-2.5 px-1">
                          <div className="flex items-center gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                              {label}
                            </p>
                            <span className="text-[10px] text-slate-400 dark:text-slate-500">
                              {done}/{items.length}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-16 h-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.06] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          {items.map((item) => {
                            const isDone =
                              checklistStatuses[item.id]?.completed || false;
                            return (
                              <GlassPanel key={item.id}>
                                <div className="px-4 py-3 flex items-center gap-3.5">
                                  <button
                                    onClick={() =>
                                      toggleChecklist(item.id, !isDone)
                                    }
                                    className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all flex-shrink-0 ${
                                      isDone
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "border-slate-300 dark:border-slate-600 hover:border-emerald-500"
                                    }`}
                                  >
                                    {isDone && (
                                      <Check
                                        size={12}
                                        className="text-white"
                                        strokeWidth={3}
                                      />
                                    )}
                                  </button>
                                  <div className="flex-1 min-w-0">
                                    <p
                                      className={`text-[12px] leading-relaxed ${isDone ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-200"}`}
                                    >
                                      {item.requirement}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                                      {item.articles} · {item.moduleLabel}
                                    </p>
                                  </div>
                                  <span
                                    className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full flex-shrink-0 ${PRIORITY_COLORS[item.priority] || "bg-slate-500/10 text-slate-500"}`}
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
          </div>
        ) : (
          /* ─── OTHER REGULATION DETAIL VIEW ─── */
          (() => {
            const reg = REGULATIONS.find((r) => r.id === selectedRegulation)!;
            const status = unifiedStatus?.regulations[reg.id];
            const Icon = reg.icon;
            return (
              <div className="space-y-4">
                {/* Regulation Header */}
                <GlassPanel className="p-6">
                  <div className="flex items-start gap-5">
                    <div
                      className={`w-14 h-14 rounded-2xl ${reg.colorBg} flex items-center justify-center flex-shrink-0`}
                    >
                      <Icon className={`w-7 h-7 ${reg.color}`} />
                    </div>
                    <div className="flex-1">
                      <h2 className="text-[20px] font-semibold text-slate-900 dark:text-white tracking-tight mb-1">
                        {reg.name}
                      </h2>
                      <p className="text-[12px] text-slate-500 dark:text-slate-400 leading-relaxed mb-3">
                        {reg.description}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] px-2.5 py-1 rounded-full bg-white/50 dark:bg-white/[0.06] text-slate-500 dark:text-slate-400 border border-black/[0.04] dark:border-white/[0.06]">
                          {reg.requirementCount} Requirements
                        </span>
                        {status?.hasAssessment ? (
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                            Assessed · {status.score}%
                          </span>
                        ) : (
                          <span className="text-[10px] px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            Not Yet Assessed
                          </span>
                        )}
                        {status?.lastAssessedAt && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500">
                            Last:{" "}
                            {new Date(
                              status.lastAssessedAt,
                            ).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      {status?.score != null && (
                        <ScoreRing
                          score={status.score}
                          size={80}
                          strokeWidth={6}
                        />
                      )}
                    </div>
                  </div>
                </GlassPanel>

                {/* Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {reg.assessmentPath && (
                    <Link href={reg.assessmentPath}>
                      <GlassPanel className="p-4 hover:scale-[1.01] transition-transform duration-200 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-blue-500" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-white">
                              {status?.hasAssessment
                                ? "Re-Run Assessment"
                                : "Run Assessment"}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              Evaluate compliance level
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto" />
                        </div>
                      </GlassPanel>
                    </Link>
                  )}
                  {reg.modulePath && (
                    <Link href={reg.modulePath}>
                      <GlassPanel className="p-4 hover:scale-[1.01] transition-transform duration-200 cursor-pointer">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                            <BarChart3 className="w-5 h-5 text-emerald-500" />
                          </div>
                          <div>
                            <p className="text-[13px] font-semibold text-slate-800 dark:text-white">
                              Module Details
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500">
                              View full compliance module
                            </p>
                          </div>
                          <ArrowUpRight className="w-4 h-4 text-slate-400 ml-auto" />
                        </div>
                      </GlassPanel>
                    </Link>
                  )}
                  <GlassPanel className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
                        <Shield className="w-5 h-5 text-violet-500" />
                      </div>
                      <div>
                        <p className="text-[13px] font-semibold text-slate-800 dark:text-white">
                          Cross-References
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">
                          {reg.id === "nis2"
                            ? "Maps to EU Space Act Art. 74–95"
                            : reg.id === "copuos"
                              ? "Maps to EU Space Act Art. 58–72"
                              : reg.id === "cybersecurity"
                                ? "Overlaps with NIS2 Art. 20–27"
                                : "View regulation overlaps"}
                        </p>
                      </div>
                    </div>
                  </GlassPanel>
                </div>

                {/* Requirements Summary */}
                {!status?.hasAssessment && (
                  <GlassPanel className="p-8 text-center">
                    <div
                      className={`w-16 h-16 rounded-2xl ${reg.colorBg} flex items-center justify-center mx-auto mb-4`}
                    >
                      <Icon className={`w-8 h-8 ${reg.color}`} />
                    </div>
                    <h3 className="text-[16px] font-semibold text-slate-800 dark:text-white mb-2">
                      No Assessment Data Yet
                    </h3>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 max-w-md mx-auto mb-4">
                      Run the {reg.name} assessment to evaluate your compliance
                      against {reg.requirementCount} requirements and get a
                      detailed breakdown.
                    </p>
                    {reg.assessmentPath && (
                      <Link
                        href={reg.assessmentPath}
                        className="inline-flex items-center gap-2 bg-emerald-500 text-white font-medium text-[13px] px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20"
                      >
                        <Zap size={15} />
                        Start {reg.shortName} Assessment
                      </Link>
                    )}
                  </GlassPanel>
                )}
              </div>
            );
          })()
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}
