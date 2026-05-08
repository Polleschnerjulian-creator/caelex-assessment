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
// Sprint UF9 — read-only enforcement for auditor persona.
import {
  ReadOnlyBanner,
  useIsReadOnlyPersona,
} from "@/components/dashboard/v2/ReadOnlyBanner";
// Sprint UF19 — inline evidence drawer per article. Lazy-fetches
// from /api/audit-center/evidence on first open so the page stays
// light even with 600+ articles in scope.
import { EvidenceDrawer } from "@/components/dashboard/v2/EvidenceDrawer";

// Sprint UF19 — Tracker uses kebab-case RegulationId for routing /
// filter chips. Evidence API uses the Prisma RegulationType enum
// (UPPER_SNAKE). Single mapping table here so the drawer can be
// dropped into any regulation surface without each one re-deriving
// the conversion. Returning null means "no evidence model exists for
// this regulation" → hide the drawer trigger.
function regulationIdToEvidenceType(regId: RegulationId): string | null {
  switch (regId) {
    case "eu-space-act":
      return "EU_SPACE_ACT";
    case "nis2":
      return "NIS2";
    case "cybersecurity":
      return "CYBERSECURITY";
    case "debris":
      return "DEBRIS";
    case "environmental":
      return "ENVIRONMENTAL";
    case "insurance":
      return "INSURANCE";
    case "uk-space":
      return "UK_SPACE_ACT";
    case "us-regulatory":
      return "US_REGULATORY";
    case "all":
    case "copuos":
    case "spectrum":
    case "export-control":
    default:
      // copuos / spectrum / export-control aren't in the
      // RegulationType enum (yet) — those modules track requirements
      // via their own tables. The drawer hides itself for these.
      return null;
  }
}

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
  // Sprint UF9 — read-only enforcement for auditor persona.
  // The tracker is one of the most-mutating pages in Comply
  // (any logged-in user can flip article statuses via the
  // status pills). For auditors that's a foot-gun: a stray
  // click changes the very state they're auditing.
  const isReadOnly = useIsReadOnlyPersona();

  // Sprint UF34 (P1-T3) — bulk-action selection set + busy-state.
  // Audit P1-T3: 51 NIS2 items = 51 individual clicks for "set all
  // to in_progress". Now: Cmd-K-style multi-select + bulk-toolbar.
  // Selection persists across regulation switches so user can
  // build a cross-regulation batch (e.g. "all 100 EU+NIS2 items
  // → under_review for the auditor sample-pull").
  const [selectedArticleIds, setSelectedArticleIds] = useState<Set<string>>(
    new Set(),
  );
  const [bulkBusy, setBulkBusy] = useState(false);

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

  // ─── Sprint UF42 (P1-T8) — Reset expandedArticles + selectedArticleIds
  // ─── + collapsedGroups when the operator switches regulation. Without
  // ─── this effect the Set persists across the regime swap, so e.g. an
  // ─── article id from the EU-Space-Act surface still flags as expanded
  // ─── on NIS2 (where the same id may map to a different article or
  // ─── nothing at all). The same logic for collapsedGroups: NIS2's
  // ─── group keys ("incident-handling", "risk-management") aren't
  // ─── meaningful on Cybersecurity. Cheaper to drop both Sets than to
  // ─── try a per-regulation namespacing scheme.
  useEffect(() => {
    setExpandedArticles(new Set());
    setSelectedArticleIds(new Set());
    setCollapsedGroups(new Set());
  }, [selectedRegulation]);

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
  // Sprint UF9 — both mutations short-circuit for read-only personas.
  // No optimistic state update, no fetch. The status pills also pass
  // `isReadOnly` down so they render disabled visually; this is the
  // belt-and-suspenders guard in case a pill bypasses the disabled
  // attribute (programmatic .click(), a11y keyboard activation, etc).
  const updateArticleStatus = useCallback(
    async (articleId: string, status: ArticleStatusType) => {
      if (isReadOnly) return;
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
    [isReadOnly],
  );

  // Sprint UF34 (P1-T3) — bulk-update + selection toggles.
  //
  // toggleArticleSelected: per-row checkbox. Only operates on
  // article IDs that exist in the current article catalog so we
  // don't accumulate stale IDs.
  // selectAllVisible / clearSelection: keyboard-friendly batch
  // operations against the current filtered view.
  // handleBulkStatusUpdate: POSTs to /api/tracker/bulk with the
  // existing endpoint (UF34 added auditor RBAC there). Optimistic
  // local state-update so the UI reflects instantly.
  const toggleArticleSelected = useCallback((articleId: string) => {
    setSelectedArticleIds((prev) => {
      const next = new Set(prev);
      if (next.has(articleId)) next.delete(articleId);
      else next.add(articleId);
      return next;
    });
  }, []);

  const selectAllFiltered = useCallback((visibleIds: string[]) => {
    setSelectedArticleIds((prev) => {
      const next = new Set(prev);
      for (const id of visibleIds) next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedArticleIds(new Set());
  }, []);

  const handleBulkStatusUpdate = useCallback(
    async (status: ArticleStatusType) => {
      if (isReadOnly || selectedArticleIds.size === 0 || bulkBusy) return;
      setBulkBusy(true);
      const ids = Array.from(selectedArticleIds);
      // Optimistic local update: each selected id flips to the
      // chosen status. Server ack via /api/tracker/bulk transactions
      // the upserts atomically.
      setArticleStatuses((prev) => {
        const next = { ...prev };
        const now = new Date();
        for (const id of ids) {
          next[id] = { ...next[id], status, updatedAt: now };
        }
        return next;
      });
      try {
        await fetch("/api/tracker/bulk", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: ids.map((articleId) => ({ articleId, status })),
          }),
        });
        clearSelection();
      } catch (e) {
        console.error("Error in bulk status update:", e);
      } finally {
        setBulkBusy(false);
      }
    },
    [isReadOnly, selectedArticleIds, bulkBusy, clearSelection],
  );

  // Sprint UF32 (P1-T1) — inline notes editor.
  // Audit P1-T1: schema has articleStatuses[id].notes but UI never
  // rendered or edited it. Compliance officers had no way to leave
  // "evidence pending from CISO ETA 2026-05-15" inline. This handler
  // PUTs to the existing /api/tracker/articles endpoint, which
  // already accepts an optional `notes` field (UpdateArticleStatusSchema
  // in lib/validations.ts:200+).
  //
  // Optimistic update so the textarea feels instant; debounced save
  // elsewhere via the editor's blur/save handler.
  const updateArticleNotes = useCallback(
    async (articleId: string, notes: string) => {
      if (isReadOnly) return;
      const status = articleStatuses[articleId]?.status || "not_started";
      setArticleStatuses((prev) => ({
        ...prev,
        [articleId]: {
          ...prev[articleId],
          status,
          notes,
          updatedAt: new Date(),
        },
      }));
      try {
        await fetch("/api/tracker/articles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ articleId, status, notes }),
        });
      } catch (e) {
        console.error("Error updating notes:", e);
      }
    },
    [isReadOnly, articleStatuses],
  );

  const toggleChecklist = useCallback(
    async (id: string, completed: boolean) => {
      if (isReadOnly) return;
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
    [isReadOnly],
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
          {/* Sprint UF9 — Read-only banner (auditor persona only).
              Renders nothing for operator/consultant/investor. */}
          <ReadOnlyBanner message="Article status pills are locked. You can browse, search, expand, and export all articles — but cannot flip statuses or check off requirements while in auditor mode." />

          {/* Header — Apple HIG: drop the uppercase "COMPLIANCE" overline,
              just title + subtitle. Inter font, -0.022em tracking, 28px. */}
          <header
            className="flex items-end justify-between mb-9 pb-5"
            style={{
              borderBottom: "0.5px solid rgba(255, 255, 255, 0.08)",
              fontFamily:
                'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif',
            }}
          >
            <div className="min-w-0">
              <h1
                className="text-[28px] font-semibold tracking-tight"
                style={{
                  color: "rgba(255, 255, 255, 0.96)",
                  letterSpacing: "-0.022em",
                  fontFamily:
                    'var(--font-inter), -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
                  lineHeight: 1.15,
                }}
              >
                Article Tracker
              </h1>
              <p
                className="mt-1.5 text-[14px]"
                style={{
                  color: "rgba(255, 255, 255, 0.55)",
                  letterSpacing: "-0.005em",
                }}
              >
                {unifiedStatus?.assessedCount ?? 0} of {REGULATIONS.length}{" "}
                regimes assessed · {totalReqs}+ requirements
              </p>
            </div>
            <ReadinessRing score={overallScore} />
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
                {/* Sprint UF34 (P1-T3) — Bulk-actions toolbar.
                    Renders only when ≥1 article is selected.
                    Sticky-feel via prominent emerald background.
                    Auditor mode hides the toolbar entirely (the
                    select-checkboxes are hidden too via isReadOnly,
                    so this never fires). */}
                {!isReadOnly && selectedArticleIds.size > 0 ? (
                  <BulkActionsToolbar
                    count={selectedArticleIds.size}
                    onApply={handleBulkStatusUpdate}
                    onClear={clearSelection}
                    busy={bulkBusy}
                  />
                ) : null}

                {/* Sprint UF34 — "Select all visible" affordance.
                    Only when there are filtered articles to act on
                    AND not in read-only persona. */}
                {!isReadOnly &&
                filteredArticles.length > 0 &&
                selectedArticleIds.size === 0 ? (
                  <button
                    type="button"
                    onClick={() =>
                      selectAllFiltered(filteredArticles.map((a) => a.id))
                    }
                    className="text-[12px] font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
                  >
                    Select all visible ({filteredArticles.length})
                  </button>
                ) : null}

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
                                  className="flex items-stretch"
                                  style={{
                                    borderBottom: "1px solid rgba(0,0,0,0.04)",
                                  }}
                                >
                                  {/* Sprint UF34 (P1-T3) — bulk-action
                                      checkbox column. Hidden in
                                      read-only persona. Click is
                                      stopped from propagating to
                                      avoid toggling row-expand
                                      (the row's main onClick). */}
                                  {!isReadOnly ? (
                                    <label
                                      onClick={(e) => e.stopPropagation()}
                                      className="flex items-center px-2 cursor-pointer"
                                      title="Select for bulk actions"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={selectedArticleIds.has(
                                          article.id,
                                        )}
                                        onChange={() =>
                                          toggleArticleSelected(article.id)
                                        }
                                        className="h-3.5 w-3.5 cursor-pointer rounded border-slate-400 accent-emerald-500"
                                        aria-label={`Select ${article.number} for bulk actions`}
                                      />
                                    </label>
                                  ) : null}
                                  <button
                                    onClick={() =>
                                      toggleArticleExpand(article.id)
                                    }
                                    aria-expanded={exp}
                                    className="flex-1 py-3 flex items-center gap-4 text-left group/row transition-colors"
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
                                              disabled={isReadOnly}
                                              title={
                                                isReadOnly
                                                  ? "Read-only — auditor mode prevents status changes"
                                                  : undefined
                                              }
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                updateArticleStatus(
                                                  article.id,
                                                  s,
                                                );
                                              }}
                                              className={`px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all ${
                                                status === s ? sc.color : ""
                                              } ${isReadOnly ? "cursor-not-allowed opacity-50" : ""}`}
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
                                      {/* Sprint UF19 — Evidence drawer
                                          per article. Lazy-fetches +
                                          shows attached evidence + R2
                                          download links. Only renders
                                          when this article's
                                          regulation has an evidence
                                          model in the schema. */}
                                      {(() => {
                                        const evidenceType =
                                          regulationIdToEvidenceType(
                                            selectedRegulation,
                                          );
                                        return evidenceType ? (
                                          <EvidenceDrawer
                                            articleId={article.id}
                                            regulationType={evidenceType}
                                          />
                                        ) : null;
                                      })()}

                                      {/* Sprint UF32 (P1-T1) — inline
                                          notes editor. Schema had
                                          notes-field since v1, UI
                                          never exposed it. CO can
                                          now leave context like
                                          "Evidence pending from CISO
                                          ETA 2026-05-15" right next
                                          to the article. read-only
                                          for auditor persona. */}
                                      <ArticleNotesEditor
                                        articleId={article.id}
                                        currentNotes={
                                          articleStatuses[article.id]?.notes ??
                                          null
                                        }
                                        onSave={updateArticleNotes}
                                        readOnly={isReadOnly}
                                      />
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
                                  disabled={isReadOnly}
                                  title={
                                    isReadOnly
                                      ? "Read-only — auditor mode prevents checklist changes"
                                      : undefined
                                  }
                                  onClick={() =>
                                    toggleChecklist(item.id, !isDone)
                                  }
                                  className={`mt-0.5 w-[18px] h-[18px] rounded flex items-center justify-center transition-all flex-shrink-0 ${
                                    isReadOnly
                                      ? "cursor-not-allowed opacity-50"
                                      : ""
                                  }`}
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

// ─── Sprint UF32 (P1-T1) — Article Notes Editor ─────────────────────────
//
// Inline notes input + save flow. Lives below the EvidenceDrawer in
// the expanded article body. Behaviour:
//
//   - "View notes" / "Add notes" button toggles the editor open
//   - When notes already exist, the button shows a green dot + count
//     hint, and clicking expands to read-only display + Edit button
//   - Edit mode: textarea + Save / Cancel. Saving calls onSave (which
//     PUTs to /api/tracker/articles with the existing endpoint).
//   - Read-only mode (auditor persona): shows existing notes plain;
//     no edit button, no textarea.
//   - Optimistic save: button shows "Saving…" briefly, error toast
//     via console.error if the PUT fails (silent UX fallback —
//     audit found Tracker doesn't have a global toast surface yet).

function ArticleNotesEditor({
  articleId,
  currentNotes,
  onSave,
  readOnly,
}: {
  articleId: string;
  currentNotes: string | null;
  onSave: (id: string, notes: string) => Promise<void>;
  readOnly: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentNotes ?? "");
  const [saving, setSaving] = useState(false);

  // Sync draft if external notes change (e.g. another tab updated).
  useEffect(() => {
    if (!editing) setDraft(currentNotes ?? "");
  }, [currentNotes, editing]);

  const hasNotes = Boolean(currentNotes && currentNotes.trim().length > 0);

  async function handleSave() {
    if (saving) return;
    setSaving(true);
    try {
      await onSave(articleId, draft.trim());
      setEditing(false);
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    setDraft(currentNotes ?? "");
    setEditing(false);
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[12px] font-medium transition ${
          hasNotes
            ? "border-emerald-500/20 bg-emerald-500/[0.04] text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-500/[0.08]"
            : "border-white/[0.06] bg-white/[0.02] text-slate-400 hover:border-white/[0.12] hover:bg-white/[0.04]"
        }`}
      >
        {hasNotes ? (
          <span
            className="h-1.5 w-1.5 rounded-full bg-emerald-400"
            aria-hidden
          />
        ) : null}
        {hasNotes ? "View notes" : readOnly ? "No notes" : "Add notes"}
      </button>

      {open ? (
        <div className="mt-2 rounded-xl border border-white/[0.05] bg-white/[0.012] p-3">
          {editing ? (
            <>
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value.slice(0, 5000))}
                rows={3}
                placeholder="Notes for this article (markdown OK). Visible to the whole org. Audit-logged on save."
                className="block w-full rounded-md border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[12px] leading-relaxed text-slate-100 placeholder-slate-600 focus:border-emerald-500/40 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10.5px] text-slate-500">
                  {draft.length} / 5000
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving}
                    className="rounded-md px-2.5 py-1 text-[11.5px] font-medium text-slate-400 transition hover:text-slate-200 disabled:opacity-40"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || draft === (currentNotes ?? "")}
                    className="rounded-md bg-emerald-500 px-3 py-1 text-[11.5px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
                  >
                    {saving ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              {hasNotes ? (
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-slate-300">
                  {currentNotes}
                </p>
              ) : (
                <p className="text-[11.5px] italic text-slate-500">
                  No notes yet for this article.
                </p>
              )}
              {!readOnly ? (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setEditing(true)}
                    className="rounded-md bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium text-slate-300 transition hover:bg-white/[0.08]"
                  >
                    {hasNotes ? "Edit" : "Add notes"}
                  </button>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}

// ─── Sprint UF34 (P1-T3) — Bulk Actions Toolbar ─────────────────────────
//
// Floats inside the filter bar. Visible only when ≥1 article is
// selected (the parent gates the render). Provides:
//
//   - "N selected" status pill (emerald)
//   - Status-target select (5 options matching STATUS_CONFIG)
//   - Apply button — fires onApply with the chosen status
//   - Clear button — empties the selection
//
// Audit P1-T3 said 51 NIS2 items = 51 individual clicks. Now: select
// all (or pick a subset), choose status, one apply. Mirrors Linear's
// project-board bulk actions pattern.

function BulkActionsToolbar({
  count,
  onApply,
  onClear,
  busy,
}: {
  count: number;
  onApply: (status: ArticleStatusType) => Promise<void>;
  onClear: () => void;
  busy: boolean;
}) {
  const [target, setTarget] = useState<ArticleStatusType>("in_progress");
  return (
    <div
      className="inline-flex items-center gap-2 rounded-lg px-3 py-1.5"
      style={{
        background: "rgba(16, 185, 129, 0.08)",
        boxShadow: "inset 0 0 0 0.5px rgba(16, 185, 129, 0.25)",
      }}
      role="toolbar"
      aria-label="Bulk-action toolbar"
    >
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500 px-2 py-0.5 text-[10.5px] font-semibold text-emerald-950">
        <CheckSquare size={11} />
        {count} selected
      </span>
      <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
        Set status to:
      </span>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value as ArticleStatusType)}
        disabled={busy}
        className="rounded-md border border-white/10 bg-white/40 dark:bg-white/[0.04] px-2 py-1 text-[12px] font-medium text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:opacity-50"
      >
        {(Object.keys(STATUS_CONFIG) as ArticleStatusType[]).map((s) => (
          <option key={s} value={s}>
            {STATUS_CONFIG[s].label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => onApply(target)}
        disabled={busy}
        className="rounded-md bg-emerald-500 px-3 py-1 text-[12px] font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:opacity-40"
      >
        {busy ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 size={11} className="animate-spin" />
            Applying…
          </span>
        ) : (
          "Apply"
        )}
      </button>
      <button
        type="button"
        onClick={onClear}
        disabled={busy}
        className="rounded-md px-2 py-1 text-[11.5px] font-medium text-slate-500 transition hover:text-slate-700 dark:hover:text-slate-300 disabled:opacity-40"
      >
        Clear
      </button>
    </div>
  );
}
