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
  Search,
  Activity,
  Zap,
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

// ─── Constants ───

const SEVERITY_CONFIG: Record<
  string,
  { color: string; bg: string; border: string }
> = {
  critical: {
    color: "text-[var(--accent-danger)]",
    bg: "bg-[var(--accent-danger)]/10",
    border: "border-[var(--accent-danger)/30]",
  },
  high: {
    color: "text-[var(--accent-warning)]",
    bg: "bg-[var(--accent-warning-soft)]",
    border: "border-amber-500/30",
  },
  medium: {
    color: "text-[var(--accent-primary)]",
    bg: "bg-[var(--accent-primary-soft)]",
    border: "border-[var(--accent-success)/30]",
  },
  low: {
    color: "text-[var(--text-tertiary)]",
    bg: "bg-[var(--surface-sunken)]0/10",
    border: "border-[var(--border-default)]/20",
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  loss_of_contact: "Loss of Contact",
  debris_generation: "Debris",
  cyber_incident: "Cyber",
  spacecraft_anomaly: "Anomaly",
  conjunction_event: "Conjunction",
  regulatory_breach: "Regulatory",
  nis2_significant_incident: "NIS2",
  other: "Other",
};

const WORKFLOW_STATES: Record<string, { label: string; color: string }> = {
  reported: { label: "Reported", color: "text-[var(--accent-warning)]" },
  triaged: { label: "Triaged", color: "text-[var(--accent-primary)]" },
  investigating: {
    label: "Investigating",
    color: "text-[var(--accent-warning)]",
  },
  mitigating: { label: "Mitigating", color: "text-orange-400" },
  resolved: { label: "Resolved", color: "text-[var(--accent-success)]" },
  closed: { label: "Closed", color: "text-[var(--text-tertiary)]" },
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
] as const;

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
  if (isOverdue) return "text-[var(--accent-danger)] animate-pulse";
  if (percentRemaining < 10) return "text-[var(--accent-danger)] animate-pulse";
  if (percentRemaining < 25) return "text-[var(--accent-danger)]";
  if (percentRemaining < 50) return "text-[var(--accent-warning)]";
  return "text-[var(--accent-success)]";
}

// ─── Component ───

export default function IncidentsPage() {
  const { t } = useLanguage();
  const [incidents, setIncidents] = useState<IncidentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [expandedData, setExpandedData] = useState<IncidentDetail | null>(null);
  const [expandLoading, setExpandLoading] = useState(false);
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [, setTick] = useState(0);

  // Tick every second for countdown updates
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
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
      // The existing API returns incidents array; we transform to our summary format
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
    } catch {
      setIncidents([]);
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
      const [workflowRes, phasesRes] = await Promise.all([
        fetch(`/api/supervision/incidents/${incidentId}/workflow`),
        fetch(`/api/supervision/incidents/${incidentId}/nis2-phases`),
      ]);

      const incident = incidents.find((i) => i.id === incidentId);
      const workflow = workflowRes.ok ? await workflowRes.json() : null;
      const phasesData = phasesRes.ok ? await phasesRes.json() : null;

      if (incident && workflow) {
        setExpandedData({
          incident: {
            id: incident.id,
            incidentNumber: incident.incidentNumber,
            category: incident.category,
            severity: incident.severity,
            status: incident.workflowState,
            workflowState: incident.workflowState,
            title: incident.title,
            description: "",
            detectedAt: incident.detectedAt,
            detectedBy: "",
            resolvedAt: null,
            reportedToNCA: false,
            ncaReferenceNumber: null,
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
          affectedAssets: [],
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
        // Open draft in a new window using safe DOM methods (no document.write)
        const w = window.open("", "_blank", "width=800,height=600");
        if (w) {
          const doc = w.document;
          doc.open();
          // Build the document safely using DOM APIs
          const html = doc.createElement("html");
          const head = doc.createElement("head");
          const title = doc.createElement("title");
          title.textContent = data.title || "Draft Notification";
          const style = doc.createElement("style");
          style.textContent =
            "body{font-family:monospace;padding:24px;background:#0A0F1E;color:#E2E8F0;white-space:pre-wrap;line-height:1.6;}h1{color:#3B82F6;font-size:18px;}";
          head.appendChild(title);
          head.appendChild(style);

          const body = doc.createElement("body");
          const h1 = doc.createElement("h1");
          h1.textContent = data.title || "";
          const p = doc.createElement("p");
          p.style.color = "#94A3B8";
          p.style.fontSize = "12px";
          p.textContent = data.legalBasis || "";
          const hr = doc.createElement("hr");
          hr.style.borderColor = "#334155";
          hr.style.margin = "16px 0";
          const contentPre = doc.createElement("pre");
          contentPre.style.whiteSpace = "pre-wrap";
          contentPre.textContent = data.content || "";

          body.appendChild(h1);
          body.appendChild(p);
          body.appendChild(hr);
          body.appendChild(contentPre);
          html.appendChild(head);
          html.appendChild(body);
          doc.appendChild(html);
          doc.close();
        }
        // Refresh phases
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

  return (
    <FeatureGate module="incidents">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <p className="text-caption tracking-widest text-[var(--text-secondary)] uppercase mb-1">
            {t("incidents.mono")}
          </p>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {t("incidents.title")}
          </h1>
          <p className="text-body-lg text-[var(--text-secondary)] mt-1">
            {t("incidents.description")}
          </p>
        </div>

        {/* Urgent deadline alert */}
        <AnimatePresence>
          {hasUrgentDeadline && (
            <motion.div
              initial={false}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-[var(--accent-danger)]/10 border border-[var(--accent-danger)/30] rounded-xl p-4 flex items-center gap-3"
            >
              <div className="w-8 h-8 rounded-lg bg-[var(--accent-danger-soft)] flex items-center justify-center animate-pulse">
                <AlertTriangle
                  size={16}
                  className="text-[var(--accent-danger)]"
                />
              </div>
              <div>
                <p className="text-body font-medium text-[var(--accent-danger)]">
                  Critical Deadline Alert
                </p>
                <p className="text-small text-[var(--accent-danger)]/70">
                  One or more NIS2 reporting deadlines are less than 2 hours
                  away. Immediate action required.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: "Active Incidents",
              value: activeCount,
              icon: Activity,
              color: "text-[var(--accent-primary)]",
            },
            {
              label: "Critical Severity",
              value: criticalCount,
              icon: AlertTriangle,
              color: "text-[var(--accent-danger)]",
            },
            {
              label: "NIS2 Phases Due",
              value: incidents.reduce(
                (s, i) =>
                  s +
                  (i.nis2PhasesSummary?.total || 0) -
                  (i.nis2PhasesSummary?.submitted || 0),
                0,
              ),
              icon: Clock,
              color: "text-[var(--accent-warning)]",
            },
            {
              label: "Overdue Phases",
              value: overdueCount,
              icon: XCircle,
              color: "text-[var(--accent-danger)]",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl p-4"
            >
              <div className="flex items-center gap-2 mb-2">
                <stat.icon size={14} className={stat.color} />
                <span className="text-caption text-[var(--text-secondary)] uppercase tracking-wider">
                  {stat.label}
                </span>
              </div>
              <p className="text-2xl font-semibold text-[var(--text-primary)]">
                {stat.value}
              </p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1">
            <span className="text-caption text-[var(--text-secondary)] mr-1">
              Severity:
            </span>
            {SEVERITY_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setSeverityFilter(s)}
                className={`px-2.5 py-1 rounded-lg text-caption font-medium transition-colors ${
                  severityFilter === s
                    ? "bg-[var(--accent-success-soft)] text-[var(--accent-primary)] border border-[var(--accent-success)/30]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)] border border-transparent"
                }`}
              >
                {s === "ALL" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1 ml-4">
            <span className="text-caption text-[var(--text-secondary)] mr-1">
              Category:
            </span>
            {CATEGORY_FILTERS.map((c) => (
              <button
                key={c}
                onClick={() => setCategoryFilter(c)}
                className={`px-2.5 py-1 rounded-lg text-caption font-medium transition-colors ${
                  categoryFilter === c
                    ? "bg-[var(--accent-success-soft)] text-[var(--accent-primary)] border border-[var(--accent-success)/30]"
                    : "text-[var(--text-secondary)] hover:text-[var(--text-secondary)] border border-transparent"
                }`}
              >
                {c === "ALL" ? "All" : CATEGORY_LABELS[c] || c}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-20">
            <Loader2
              size={24}
              className="animate-spin text-[var(--text-tertiary)]"
            />
          </div>
        )}

        {/* Empty state */}
        {!loading && incidents.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-xl bg-[var(--surface-sunken)] border border-[var(--border-default)] flex items-center justify-center mb-4">
              <Shield
                size={28}
                className="text-[var(--text-tertiary)]"
                strokeWidth={1.5}
              />
            </div>
            <h3 className="text-subtitle font-medium text-[var(--text-secondary)] mb-1">
              No active incidents
            </h3>
            <p className="text-body text-[var(--text-secondary)]">
              All clear. No incidents require attention.
            </p>
          </div>
        )}

        {/* Incident list */}
        {!loading && incidents.length > 0 && (
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
                  className="bg-[var(--surface-raised)] border border-[var(--border-default)] rounded-xl overflow-hidden"
                >
                  {/* Row */}
                  <button
                    onClick={() => fetchExpanded(incident.id)}
                    className="w-full flex items-center gap-3 p-4 text-left hover:bg-[var(--surface-sunken)]:bg-[var(--surface-sunken)] transition-colors"
                  >
                    {/* Severity badge */}
                    <div
                      className={`w-2 h-8 rounded-full ${sev.bg} ${sev.border} border`}
                    />

                    {/* Number */}
                    <span className="text-small font-mono text-[var(--text-secondary)] w-28 shrink-0">
                      {incident.incidentNumber}
                    </span>

                    {/* Title */}
                    <span className="text-body text-[var(--text-primary)] font-medium flex-1 truncate">
                      {incident.title}
                    </span>

                    {/* Category tag */}
                    <span className="text-micro px-2 py-0.5 rounded bg-[var(--surface-sunken)] text-[var(--text-secondary)] shrink-0">
                      {CATEGORY_LABELS[incident.category] || incident.category}
                    </span>

                    {/* Workflow state */}
                    <span
                      className={`text-caption font-medium shrink-0 ${wf.color}`}
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
                                ? "bg-green-400"
                                : overdue
                                  ? "bg-red-400 animate-pulse"
                                  : i < (incident.nis2PhasesSummary?.total || 0)
                                    ? "bg-[var(--surface-sunken)]"
                                    : "bg-[var(--surface-sunken)]"
                            }`}
                          />
                        );
                      })}
                    </div>

                    {/* Countdown */}
                    {urgentMs !== null && urgentMs > 0 && (
                      <span
                        className={`text-caption shrink-0 ${getCountdownColor(
                          urgentMs > 0
                            ? (urgentMs / (72 * 60 * 60 * 1000)) * 100
                            : 0,
                          urgentMs <= 0,
                        )}`}
                      >
                        {formatCountdown(urgentMs)}
                      </span>
                    )}
                    {urgentMs !== null && urgentMs <= 0 && (
                      <span className="text-caption text-[var(--accent-danger)] animate-pulse shrink-0">
                        OVERDUE
                      </span>
                    )}

                    {/* Expand */}
                    {isExpanded ? (
                      <ChevronDown
                        size={14}
                        className="text-[var(--text-tertiary)] shrink-0"
                      />
                    ) : (
                      <ChevronRight
                        size={14}
                        className="text-[var(--text-tertiary)] shrink-0"
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
                        <div className="border-t border-[var(--border-default)] p-4 space-y-5">
                          {expandLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <Loader2
                                size={20}
                                className="animate-spin text-[var(--text-tertiary)]"
                              />
                            </div>
                          ) : expandedData ? (
                            <>
                              {/* Workflow track */}
                              <div>
                                <h4 className="text-caption tracking-widest text-[var(--text-secondary)] uppercase mb-3">
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
                                            className={`w-6 h-6 rounded-full flex items-center justify-center text-micro font-medium ${
                                              isActive
                                                ? "bg-[var(--accent-primary)] text-white ring-2 ring-[var(--border-focus)]/30"
                                                : isPast
                                                  ? "bg-[var(--accent-success-soft)] text-[var(--accent-success)] border border-[var(--accent-success)/30]"
                                                  : "bg-[var(--surface-sunken)] text-[var(--text-tertiary)] border border-[var(--border-default)]"
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
                                                ? "text-[var(--accent-primary)] font-medium"
                                                : "text-[var(--text-tertiary)]"
                                            }`}
                                          >
                                            {wfState?.label || state}
                                          </span>
                                        </div>
                                        {idx < STATE_ORDER.length - 1 && (
                                          <div
                                            className={`w-8 h-[2px] mx-1 mt-[-14px] ${
                                              isPast
                                                ? "bg-[var(--accent-success)]/40"
                                                : "bg-[var(--surface-sunken)]"
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
                                      (t) => (
                                        <button
                                          key={t.event}
                                          onClick={() =>
                                            handleAdvanceWorkflow(
                                              incident.id,
                                              t.event,
                                            )
                                          }
                                          disabled={
                                            actionLoading ===
                                            `workflow-${incident.id}-${t.event}`
                                          }
                                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-caption font-medium bg-[var(--accent-primary-soft)] text-[var(--accent-primary)] border border-[var(--accent-primary)/20] rounded-lg hover:bg-[var(--accent-success-soft)] transition-colors disabled:opacity-50"
                                        >
                                          {actionLoading ===
                                          `workflow-${incident.id}-${t.event}` ? (
                                            <Loader2
                                              size={12}
                                              className="animate-spin"
                                            />
                                          ) : (
                                            <Zap size={12} />
                                          )}
                                          {t.description || t.event}
                                        </button>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* NIS2 Phase tracker */}
                              {expandedData.nis2Phases.length > 0 && (
                                <div>
                                  <h4 className="text-caption tracking-widest text-[var(--text-secondary)] uppercase mb-3">
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
                                              ? "bg-[var(--accent-success)]/5 border-[var(--accent-success)]/20"
                                              : isOverdue
                                                ? "bg-[var(--accent-danger)]/5 border-[var(--accent-danger)]/20"
                                                : "bg-[var(--surface-raised)][0.02] border-[var(--border-default)]"
                                          }`}
                                        >
                                          {/* Status icon */}
                                          {isSubmitted ? (
                                            <CheckCircle2
                                              size={16}
                                              className="text-[var(--accent-success)] shrink-0"
                                            />
                                          ) : isOverdue ? (
                                            <AlertCircle
                                              size={16}
                                              className="text-[var(--accent-danger)] animate-pulse shrink-0"
                                            />
                                          ) : (
                                            <Clock
                                              size={16}
                                              className="text-[var(--text-tertiary)] shrink-0"
                                            />
                                          )}

                                          {/* Phase info */}
                                          <div className="flex-1 min-w-0">
                                            <p className="text-small font-medium text-[var(--text-primary)]">
                                              {phase.phaseName}
                                            </p>
                                            <p className="text-micro text-[var(--text-secondary)]">
                                              Due:{" "}
                                              {new Date(
                                                phase.deadline,
                                              ).toLocaleString()}
                                            </p>
                                          </div>

                                          {/* Countdown / status */}
                                          {isSubmitted ? (
                                            <span className="text-caption text-[var(--accent-success)] font-medium shrink-0">
                                              Submitted
                                            </span>
                                          ) : (
                                            <span
                                              className={`text-caption shrink-0 ${getCountdownColor(
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
                                                className="inline-flex items-center gap-1 px-2 py-1 text-micro font-medium text-[var(--text-secondary)] bg-[var(--surface-sunken)] border border-[var(--border-default)] rounded hover:bg-[var(--surface-sunken)] transition-colors disabled:opacity-50"
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
                                                className="inline-flex items-center gap-1 px-2 py-1 text-micro font-medium text-[var(--accent-success)] bg-[var(--accent-success)]/10 border border-[var(--accent-success)]/20 rounded hover:bg-[var(--accent-success-soft)] transition-colors disabled:opacity-50"
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
                              <div className="text-small text-[var(--text-secondary)]">
                                Detected:{" "}
                                {new Date(incident.detectedAt).toLocaleString()}{" "}
                                | Category:{" "}
                                {CATEGORY_LABELS[incident.category] ||
                                  incident.category}{" "}
                                | Severity: {incident.severity}
                              </div>
                            </>
                          ) : (
                            <p className="text-body text-[var(--text-secondary)] text-center py-4">
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
    </FeatureGate>
  );
}
