"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import { useLanguage } from "@/components/providers/LanguageProvider";
import {
  AlertTriangle,
  Shield,
  Clock,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertCircle,
  Activity,
  Zap,
  RefreshCw,
  Plus,
  X,
  Copy,
} from "lucide-react";

// ─── Types ───

interface NIS2Phase {
  phase: string;
  phaseName: string;
  deadline: string;
  status: string;
  submittedAt: string | null;
  referenceNumber: string | null;
  countdown: {
    totalMs: number;
    remainingMs: number;
    percentRemaining: number;
    isOverdue: boolean;
    isSubmitted: boolean;
  };
}

interface WorkflowInfo {
  currentState: string;
  stateName: string;
  stateColor: string;
  stateIcon: string;
  progress: number;
  availableTransitions: Array<{
    event: string;
    to: string;
    description: string;
  }>;
}

interface IncidentDetail {
  incident: {
    id: string;
    incidentNumber: string;
    category: string;
    severity: string;
    status: string;
    workflowState: string;
    title: string;
    description: string;
    detectedAt: string;
    detectedBy: string;
    resolvedAt: string | null;
    reportedToNCA: boolean;
    ncaReferenceNumber: string | null;
  };
  workflow: WorkflowInfo;
  nis2Phases: NIS2Phase[];
  affectedAssets: Array<{
    id: string;
    assetName: string;
    cosparId: string | null;
    noradId: string | null;
  }>;
}

interface IncidentSummary {
  id: string;
  incidentNumber: string;
  category: string;
  severity: string;
  workflowState: string;
  title: string;
  detectedAt: string;
  nis2PhasesSummary: {
    total: number;
    submitted: number;
    overdue: number;
    nextDeadline: string | null;
    nextPhase: string | null;
  };
  urgentDeadlineMs: number | null;
}

// ─── Glass Styles ───

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

// ─── Constants ───

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; dot: string }
> = {
  critical: { color: "text-red-500", bg: "bg-red-500/10", dot: "bg-red-500" },
  high: {
    color: "text-amber-500",
    bg: "bg-amber-500/10",
    dot: "bg-amber-500",
  },
  medium: {
    color: "text-indigo-500",
    bg: "bg-indigo-500/10",
    dot: "bg-indigo-500",
  },
  low: { color: "text-slate-400", bg: "bg-slate-400/10", dot: "bg-slate-400" },
};

const CATEGORY_LABELS: Record<string, string> = {
  loss_of_contact: "Loss of Contact",
  debris_generation: "Debris",
  cyber_incident: "Cyber",
  spacecraft_anomaly: "Anomaly",
  conjunction_event: "Conjunction",
  regulatory_breach: "Regulatory",
  nis2_significant_incident: "NIS2",
  nis2_near_miss: "NIS2 Near Miss",
  other: "Other",
};

const WORKFLOW_STATES: Record<string, { label: string; color: string }> = {
  reported: { label: "Reported", color: "text-amber-500" },
  triaged: { label: "Triaged", color: "text-indigo-500" },
  investigating: { label: "Investigating", color: "text-amber-500" },
  mitigating: { label: "Mitigating", color: "text-orange-400" },
  resolved: { label: "Resolved", color: "text-emerald-600" },
  closed: { label: "Closed", color: "text-slate-400" },
};

const STATE_ORDER = [
  "reported",
  "triaged",
  "investigating",
  "mitigating",
  "resolved",
  "closed",
];

const PHASE_NAMES: Record<string, string> = {
  early_warning: "Early Warning",
  notification: "Notification",
  intermediate_report: "Intermediate",
  final_report: "Final Report",
};

const SEVERITY_FILTERS = ["ALL", "critical", "high", "medium", "low"] as const;
const CATEGORY_FILTERS = [
  "ALL",
  "loss_of_contact",
  "debris_generation",
  "cyber_incident",
  "spacecraft_anomaly",
  "conjunction_event",
  "regulatory_breach",
  "nis2_near_miss",
] as const;

const CATEGORY_DEADLINE_HOURS: Record<string, number> = {
  spacecraft_anomaly: 24,
  loss_of_contact: 4,
  conjunction_event: 72,
  debris_generation: 4,
  cyber_incident: 4,
  regulatory_breach: 72,
  nis2_near_miss: 72,
  nis2_significant_incident: 24,
};

// ─── Helpers ───

function formatCountdown(ms: number): string {
  if (ms <= 0) return "OVERDUE";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  }
  return `${hours}h ${minutes}m`;
}

function getCountdownColor(
  percentRemaining: number,
  isOverdue: boolean,
): string {
  if (isOverdue) return "text-red-500 animate-pulse";
  if (percentRemaining < 10) return "text-red-500 animate-pulse";
  if (percentRemaining < 25) return "text-red-500";
  if (percentRemaining < 50) return "text-amber-500";
  return "text-emerald-600";
}

// ─── Page wrapper ───

export default function IncidentsPage() {
  return (
    <FeatureGate module="incidents">
      <IncidentsContent />
    </FeatureGate>
  );
}

// ─── Main Content ───

function IncidentsContent() {
  const { t } = useLanguage();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<IncidentDetail | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draftContent, setDraftContent] = useState<string | null>(null);
  const [draftPhase, setDraftPhase] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [, setTick] = useState(0);

  // Tick every second for countdown updates
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000); // Every minute — countdown shows hours/minutes
    return () => clearInterval(interval);
  }, []);

  const fetchIncidents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (severityFilter !== "ALL") params.set("severity", severityFilter);
      if (categoryFilter !== "ALL") params.set("category", categoryFilter);

      const res = await fetch(
        `/api/supervision/incidents?${params.toString()}`,
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      const summaries: IncidentSummary[] = (data.incidents || []).map(
        (inc: Record<string, unknown>) => ({
          id: inc.id,
          incidentNumber: inc.incidentNumber,
          category: inc.category,
          severity: inc.severity,
          workflowState: inc.workflowState || "reported",
          title: inc.title,
          detectedAt: inc.detectedAt,
          nis2PhasesSummary: inc.nis2PhasesSummary || {
            total: 0,
            submitted: 0,
            overdue: 0,
            nextDeadline: null,
            nextPhase: null,
          },
          urgentDeadlineMs: inc.urgentDeadlineMs ?? null,
        }),
      );
      setIncidents(summaries);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load incidents");
    } finally {
      setLoading(false);
    }
  }, [severityFilter, categoryFilter]);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  const fetchExpanded = async (incidentId: string) => {
    if (expandedId === incidentId) {
      setExpandedId(null);
      setExpandedData(null);
      return;
    }

    setExpandedId(incidentId);
    setExpandLoading(true);
    try {
      const [workflowRes, phasesRes, detailRes] = await Promise.all([
        fetch(`/api/supervision/incidents/${incidentId}/workflow`),
        fetch(`/api/supervision/incidents/${incidentId}/nis2-phases`),
        fetch(`/api/supervision/incidents/${incidentId}`),
      ]);

      const incident = incidents.find((i) => i.id === incidentId);
      const workflow = workflowRes.ok ? await workflowRes.json() : null;
      const phasesData = phasesRes.ok ? await phasesRes.json() : null;
      const detailData = detailRes.ok ? await detailRes.json() : null;
      const incidentDetail = detailData?.incident ?? detailData;

      if (incident && workflow) {
        setExpandedData({
          incident: {
            id: incident.id,
            incidentNumber: incident.incidentNumber,
            category: incident.category,
            severity: incident.severity,
            status: incidentDetail?.status ?? incident.workflowState,
            workflowState: incident.workflowState,
            title: incident.title,
            description: incidentDetail?.description ?? "",
            detectedAt: incident.detectedAt,
            detectedBy: incidentDetail?.detectedBy ?? "",
            resolvedAt: incidentDetail?.resolvedAt ?? null,
            reportedToNCA: incidentDetail?.reportedToNCA ?? false,
            ncaReferenceNumber: incidentDetail?.ncaReferenceNumber ?? null,
          },
          workflow: {
            currentState: workflow.currentState,
            stateName: workflow.stateName,
            stateColor: workflow.stateColor,
            stateIcon: workflow.stateIcon,
            progress:
              (STATE_ORDER.indexOf(workflow.currentState) /
                (STATE_ORDER.length - 1)) *
              100,
            availableTransitions: workflow.availableTransitions || [],
          },
          nis2Phases: (phasesData?.phases || []).map(
            (p: Record<string, unknown>) => ({
              phase: p.phase,
              phaseName: PHASE_NAMES[p.phase as string] || p.phase,
              deadline: p.deadline,
              status: p.status,
              submittedAt: (p as Record<string, unknown>).submittedAt || null,
              referenceNumber:
                (p as Record<string, unknown>).referenceNumber || null,
              countdown: p.countdown || {
                totalMs: 0,
                remainingMs: 0,
                percentRemaining: 0,
                isOverdue: false,
                isSubmitted: false,
              },
            }),
          ),
          affectedAssets: (incidentDetail?.affectedAssets ?? []).map(
            (a: Record<string, unknown>) => ({
              id: a.id ?? "",
              assetName: a.assetName ?? "",
              cosparId: a.cosparId ?? null,
              noradId: a.noradId ?? null,
            }),
          ),
        });
      }
    } catch {
      setExpandedData(null);
    } finally {
      setExpandLoading(false);
    }
  };

  const handleAdvanceWorkflow = async (incidentId: string, event: string) => {
    setActionLoading(`workflow-${incidentId}-${event}`);
    try {
      const res = await fetch(
        `/api/supervision/incidents/${incidentId}/workflow`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ event }),
        },
      );

      if (res.ok) {
        await fetchIncidents();
        if (expandedId === incidentId) {
          await fetchExpanded(incidentId);
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleGenerateDraft = async (incidentId: string, phase: string) => {
    setActionLoading(`draft-${incidentId}-${phase}`);
    try {
      const res = await fetch(
        `/api/supervision/incidents/${incidentId}/draft-notification`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase }),
        },
      );

      if (res.ok) {
        const data = await res.json();
        const content = data.content || data.draft || data.data?.draft || "";
        const fullDraft = [
          data.title ? `# ${data.title}` : "",
          data.legalBasis ? `\nLegal Basis: ${data.legalBasis}` : "",
          "\n---\n",
          content,
        ]
          .filter(Boolean)
          .join("\n");
        setDraftContent(fullDraft);
        setDraftPhase(phase);
        if (expandedId === incidentId) {
          await fetchExpanded(incidentId);
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  const handleSubmitPhase = async (incidentId: string, phase: string) => {
    setActionLoading(`submit-${incidentId}-${phase}`);
    try {
      const res = await fetch(
        `/api/supervision/incidents/${incidentId}/nis2-phases`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phase }),
        },
      );

      if (res.ok) {
        await fetchIncidents();
        if (expandedId === incidentId) {
          await fetchExpanded(incidentId);
        }
      }
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Stats ───
  const activeCount = incidents.filter(
    (i) => i.workflowState !== "closed",
  ).length;
  const criticalCount = incidents.filter(
    (i) => i.severity === "critical",
  ).length;
  const phasesDueCount = incidents.reduce(
    (s, i) =>
      s +
      (i.nis2PhasesSummary?.total || 0) -
      (i.nis2PhasesSummary?.submitted || 0),
    0,
  );
  const overdueCount = incidents.reduce(
    (sum, i) => sum + (i.nis2PhasesSummary?.overdue || 0),
    0,
  );
  const hasUrgentDeadline = incidents.some(
    (i) =>
      i.urgentDeadlineMs !== null &&
      i.urgentDeadlineMs < 2 * 60 * 60 * 1000 &&
      i.urgentDeadlineMs > 0,
  );

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={28} className="animate-spin text-indigo-500" />
          <p className="text-sm text-slate-500 dark:text-white/[0.55]">
            Loading incidents...
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent p-3 gap-3">
      {/* ─── Left Panel — Sidebar ─── */}
      <div className="w-[260px] shrink-0 flex flex-col glass-elevated rounded-[20px] overflow-hidden">
        {/* Title */}
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Incident Management
          </h2>
          <p className="text-xs text-slate-500 dark:text-white/[0.55] mt-0.5">
            NIS2 incident response
          </p>
        </div>

        {/* Stats */}
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          {[
            {
              label: "Active",
              value: activeCount,
              icon: Activity,
              color: "text-indigo-500",
            },
            {
              label: "Critical",
              value: criticalCount,
              icon: AlertTriangle,
              color: "text-red-500",
            },
            {
              label: "Phases Due",
              value: phasesDueCount,
              icon: Clock,
              color: "text-amber-500",
            },
            {
              label: "Overdue",
              value: overdueCount,
              icon: XCircle,
              color: "text-red-500",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="p-3 flex flex-col gap-1 glass-surface rounded-[14px]"
            >
              <div className="flex items-center gap-1.5">
                <stat.icon size={12} className={stat.color} />
                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-medium">
                  {stat.label}
                </span>
              </div>
              <p className="text-xl font-semibold text-slate-800 dark:text-white">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-black/[0.06] dark:border-white/10 my-1" />

        {/* Severity Filters */}
        <div className="px-4 pt-3 pb-1">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">
            Severity
          </p>
          <div className="space-y-0.5">
            {SEVERITY_FILTERS.map((s) => {
              const isActive = severityFilter === s;
              const sev = s !== "ALL" ? SEVERITY_CONFIG[s] : null;
              return (
                <button
                  key={s}
                  onClick={() => setSeverityFilter(s)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/30"
                  }`}
                >
                  {sev ? (
                    <span className={`w-2 h-2 rounded-full ${sev.dot}`} />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-500" />
                  )}
                  {s === "ALL"
                    ? "All Severities"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category Filters */}
        <div className="px-4 pt-3 pb-3 flex-1 overflow-y-auto">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-medium mb-2">
            Category
          </p>
          <div className="space-y-0.5">
            {CATEGORY_FILTERS.map((c) => {
              const isActive = categoryFilter === c;
              return (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all text-left ${
                    isActive
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-white/30"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${isActive ? "bg-indigo-500" : "bg-slate-300 dark:bg-slate-600"}`}
                  />
                  {c === "ALL" ? "All Categories" : CATEGORY_LABELS[c] || c}
                </button>
              );
            })}
          </div>
        </div>

        {/* Refresh */}
        <div className="px-4 pb-4">
          <button
            onClick={() => fetchIncidents()}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/30 transition-all glass-surface"
          >
            <RefreshCw size={13} />
            Refresh
          </button>
        </div>
      </div>

      {/* ─── Right Panel — Main Content ─── */}
      <div className="flex-1 flex flex-col min-w-0 glass-elevated rounded-[20px] overflow-hidden">
        {/* Header with Report Incident button */}
        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
              Active Incidents
            </h2>
            <p className="text-xs text-slate-500 dark:text-white/[0.55]">
              {incidents.length} incident{incidents.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-body font-medium transition-colors"
          >
            <Plus size={16} />
            Report Incident
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-5 space-y-4">
          {/* Urgent deadline alert */}
          <AnimatePresence>
            {hasUrgentDeadline && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{
                  ...innerGlass,
                  background: "rgba(239, 68, 68, 0.08)",
                  border: "1px solid rgba(239, 68, 68, 0.2)",
                }}
                className="p-4 flex items-center gap-3"
              >
                <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center animate-pulse">
                  <AlertTriangle size={16} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-red-500">
                    Critical Deadline Alert
                  </p>
                  <p className="text-xs text-red-500/70">
                    One or more NIS2 reporting deadlines are less than 2 hours
                    away. Immediate action required.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error state */}
          {error && (
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
              <p className="text-sm">{error}</p>
              <button
                onClick={() => {
                  setError(null);
                  fetchIncidents();
                }}
                className="mt-2 text-sm underline hover:text-red-300 transition-colors"
              >
                Erneut versuchen
              </button>
            </div>
          )}

          {/* Empty state */}
          {!error && incidents.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center mb-4 glass-surface">
                <Shield
                  size={28}
                  className="text-slate-400"
                  strokeWidth={1.5}
                />
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">
                No active incidents
              </h3>
              <p className="text-xs text-slate-400">
                All clear. No incidents require attention.
              </p>
            </div>
          )}

          {/* Incident list */}
          {incidents.length > 0 && (
            <div className="space-y-3">
              {incidents.map((incident) => {
                const sev =
                  SEVERITY_CONFIG[incident.severity] || SEVERITY_CONFIG.medium;
                const wf =
                  WORKFLOW_STATES[incident.workflowState] ||
                  WORKFLOW_STATES.reported;
                const isExpanded = expandedId === incident.id;
                const nowMs = Date.now();
                const urgentMs = incident.urgentDeadlineMs;

                return (
                  <div
                    key={incident.id}
                    className="glass-surface rounded-[14px]"
                  >
                    {/* Row */}
                    <button
                      onClick={() => fetchExpanded(incident.id)}
                      className="w-full flex items-center gap-3 p-4 text-left hover:bg-white/20 transition-colors rounded-[14px]"
                    >
                      {/* Severity badge */}
                      <div className={`w-2 h-8 rounded-full ${sev.dot}`} />

                      {/* Number */}
                      <span className="text-xs font-mono text-slate-500 w-28 shrink-0">
                        {incident.incidentNumber}
                      </span>

                      {/* Title */}
                      <span className="text-sm text-slate-800 dark:text-white font-medium flex-1 truncate">
                        {incident.title}
                      </span>

                      {/* Category tag */}
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white/30 text-slate-500 shrink-0">
                        {CATEGORY_LABELS[incident.category] ||
                          incident.category}
                      </span>

                      {/* Workflow state */}
                      <span
                        className={`text-[11px] font-medium shrink-0 ${wf.color}`}
                      >
                        {wf.label}
                      </span>

                      {/* NIS2 phase dots */}
                      <div className="flex items-center gap-1 shrink-0">
                        {[0, 1, 2, 3].map((i) => {
                          const submitted =
                            i < (incident.nis2PhasesSummary?.submitted || 0);
                          const overdue =
                            !submitted &&
                            i <
                              (incident.nis2PhasesSummary?.submitted || 0) +
                                (incident.nis2PhasesSummary?.overdue || 0);
                          return (
                            <div
                              key={i}
                              className={`w-2 h-2 rounded-full ${
                                submitted
                                  ? "bg-emerald-400"
                                  : overdue
                                    ? "bg-red-400 animate-pulse"
                                    : "bg-slate-300 dark:bg-slate-500"
                              }`}
                            />
                          );
                        })}
                      </div>

                      {/* Countdown */}
                      {urgentMs !== null && urgentMs > 0 && (
                        <span
                          className={`text-[11px] shrink-0 ${getCountdownColor(
                            urgentMs > 0
                              ? (urgentMs /
                                  ((CATEGORY_DEADLINE_HOURS[
                                    incident.category
                                  ] || 72) *
                                    60 *
                                    60 *
                                    1000)) *
                                  100
                              : 0,
                            urgentMs <= 0,
                          )}`}
                        >
                          {formatCountdown(urgentMs)}
                        </span>
                      )}
                      {urgentMs !== null && urgentMs <= 0 && (
                        <span className="text-[11px] text-red-500 animate-pulse shrink-0">
                          OVERDUE
                        </span>
                      )}

                      {/* Expand */}
                      {isExpanded ? (
                        <ChevronDown
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                      ) : (
                        <ChevronRight
                          size={14}
                          className="text-slate-400 shrink-0"
                        />
                      )}
                    </button>

                    {/* Expanded panel */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="border-t border-white/30 p-4 space-y-5">
                            {expandLoading ? (
                              <div className="flex items-center justify-center py-8">
                                <Loader2
                                  size={20}
                                  className="animate-spin text-slate-400"
                                />
                              </div>
                            ) : expandedData ? (
                              <>
                                {/* Workflow track */}
                                <div>
                                  <h4 className="text-[10px] tracking-widest text-slate-500 uppercase mb-3">
                                    Workflow Progress
                                  </h4>
                                  <div className="flex items-center gap-0">
                                    {STATE_ORDER.map((state, idx) => {
                                      const isActive =
                                        state ===
                                        expandedData.workflow.currentState;
                                      const isPast =
                                        STATE_ORDER.indexOf(
                                          expandedData.workflow.currentState,
                                        ) > idx;
                                      const wfState = WORKFLOW_STATES[state];

                                      return (
                                        <div
                                          key={state}
                                          className="flex items-center"
                                        >
                                          <div className="flex flex-col items-center">
                                            <div
                                              className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-medium ${
                                                isActive
                                                  ? "bg-indigo-500 text-white ring-2 ring-indigo-300/30"
                                                  : isPast
                                                    ? "bg-emerald-100 text-emerald-600 border border-emerald-300/30"
                                                    : "bg-slate-100 dark:bg-slate-700 text-slate-400 border border-slate-200 dark:border-slate-600"
                                              }`}
                                            >
                                              {isPast ? (
                                                <CheckCircle2 size={12} />
                                              ) : (
                                                idx + 1
                                              )}
                                            </div>
                                            <span
                                              className={`text-[9px] mt-1 ${
                                                isActive
                                                  ? "text-indigo-500 font-medium"
                                                  : "text-slate-400"
                                              }`}
                                            >
                                              {wfState?.label || state}
                                            </span>
                                          </div>
                                          {idx < STATE_ORDER.length - 1 && (
                                            <div
                                              className={`w-8 h-[2px] mx-1 mt-[-14px] ${
                                                isPast
                                                  ? "bg-emerald-400/40"
                                                  : "bg-slate-200 dark:bg-slate-600"
                                              }`}
                                            />
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Available actions */}
                                  {expandedData.workflow.availableTransitions
                                    .length > 0 && (
                                    <div className="flex gap-2 mt-3">
                                      {expandedData.workflow.availableTransitions.map(
                                        (tr) => (
                                          <button
                                            key={tr.event}
                                            onClick={() =>
                                              handleAdvanceWorkflow(
                                                incident.id,
                                                tr.event,
                                              )
                                            }
                                            disabled={
                                              actionLoading ===
                                              `workflow-${incident.id}-${tr.event}`
                                            }
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-medium bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 rounded-lg hover:bg-indigo-500/20 transition-colors disabled:opacity-50"
                                          >
                                            {actionLoading ===
                                            `workflow-${incident.id}-${tr.event}` ? (
                                              <Loader2
                                                size={12}
                                                className="animate-spin"
                                              />
                                            ) : (
                                              <Zap size={12} />
                                            )}
                                            {tr.description || tr.event}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                  )}
                                </div>

                                {/* NIS2 Phase tracker */}
                                {expandedData.nis2Phases.length > 0 && (
                                  <div>
                                    <h4 className="text-[10px] tracking-widest text-slate-500 uppercase mb-3">
                                      NIS2 Reporting Phases
                                    </h4>
                                    <div className="space-y-2">
                                      {expandedData.nis2Phases.map((phase) => {
                                        const deadlineMs = new Date(
                                          phase.deadline,
                                        ).getTime();
                                        const remainMs = Math.max(
                                          0,
                                          deadlineMs - nowMs,
                                        );
                                        const isOverdue =
                                          phase.countdown.isOverdue ||
                                          (!phase.countdown.isSubmitted &&
                                            nowMs > deadlineMs);
                                        const isSubmitted =
                                          phase.countdown.isSubmitted;
                                        const pctRemaining =
                                          phase.countdown.totalMs > 0
                                            ? Math.round(
                                                (remainMs /
                                                  phase.countdown.totalMs) *
                                                  100,
                                              )
                                            : 0;

                                        return (
                                          <div
                                            key={phase.phase}
                                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                                              isSubmitted
                                                ? "bg-emerald-500/5 border-emerald-500/20"
                                                : isOverdue
                                                  ? "bg-red-500/5 border-red-500/20"
                                                  : "bg-white/20 border-white/30"
                                            }`}
                                          >
                                            {/* Status icon */}
                                            {isSubmitted ? (
                                              <CheckCircle2
                                                size={16}
                                                className="text-emerald-600 shrink-0"
                                              />
                                            ) : isOverdue ? (
                                              <AlertCircle
                                                size={16}
                                                className="text-red-500 animate-pulse shrink-0"
                                              />
                                            ) : (
                                              <Clock
                                                size={16}
                                                className="text-slate-400 shrink-0"
                                              />
                                            )}

                                            {/* Phase info */}
                                            <div className="flex-1 min-w-0">
                                              <p className="text-xs font-medium text-slate-800 dark:text-white">
                                                {phase.phaseName}
                                              </p>
                                              <p className="text-[10px] text-slate-500">
                                                Due:{" "}
                                                {new Date(
                                                  phase.deadline,
                                                ).toLocaleString()}
                                              </p>
                                            </div>

                                            {/* Countdown / status */}
                                            {isSubmitted ? (
                                              <span className="text-[11px] text-emerald-600 font-medium shrink-0">
                                                Submitted
                                              </span>
                                            ) : (
                                              <span
                                                className={`text-[11px] shrink-0 ${getCountdownColor(
                                                  pctRemaining,
                                                  isOverdue,
                                                )}`}
                                              >
                                                {formatCountdown(remainMs)}
                                              </span>
                                            )}

                                            {/* Actions */}
                                            {!isSubmitted && (
                                              <div className="flex gap-1.5 shrink-0">
                                                <button
                                                  onClick={() =>
                                                    handleGenerateDraft(
                                                      incident.id,
                                                      phase.phase,
                                                    )
                                                  }
                                                  disabled={
                                                    actionLoading ===
                                                    `draft-${incident.id}-${phase.phase}`
                                                  }
                                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-500 bg-white/30 border border-white/40 rounded hover:bg-white/50 transition-colors disabled:opacity-50"
                                                >
                                                  {actionLoading ===
                                                  `draft-${incident.id}-${phase.phase}` ? (
                                                    <Loader2
                                                      size={10}
                                                      className="animate-spin"
                                                    />
                                                  ) : (
                                                    <FileText size={10} />
                                                  )}
                                                  Draft
                                                </button>
                                                <button
                                                  onClick={() =>
                                                    handleSubmitPhase(
                                                      incident.id,
                                                      phase.phase,
                                                    )
                                                  }
                                                  disabled={
                                                    actionLoading ===
                                                    `submit-${incident.id}-${phase.phase}`
                                                  }
                                                  className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 rounded hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
                                                >
                                                  {actionLoading ===
                                                  `submit-${incident.id}-${phase.phase}` ? (
                                                    <Loader2
                                                      size={10}
                                                      className="animate-spin"
                                                    />
                                                  ) : (
                                                    <CheckCircle2 size={10} />
                                                  )}
                                                  Submit
                                                </button>
                                              </div>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Details summary */}
                                <div className="text-xs text-slate-500">
                                  Detected:{" "}
                                  {new Date(
                                    incident.detectedAt,
                                  ).toLocaleString()}{" "}
                                  | Category:{" "}
                                  {CATEGORY_LABELS[incident.category] ||
                                    incident.category}{" "}
                                  | Severity: {incident.severity}
                                </div>
                              </>
                            ) : (
                              <p className="text-sm text-slate-500 text-center py-4">
                                Failed to load incident details.
                              </p>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
