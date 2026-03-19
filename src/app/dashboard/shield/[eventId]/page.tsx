"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  Shield,
  Clock,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  FileText,
  MessageSquare,
  Loader2,
  Send,
  X,
  ChevronDown,
  ChevronUp,
  Download,
  Copy,
  ClipboardCheck,
  Scale,
  Globe,
  Timer,
  CircleDot,
  Fuel,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { GlassMotion } from "@/components/ui/GlassMotion";
import { csrfHeaders } from "@/lib/csrf-client";

// ── Constants ────────────────────────────────────────────────────────────────

const TIER_COLORS: Record<string, string> = {
  EMERGENCY: "bg-red-500/20 text-red-400 border border-red-500/30",
  HIGH: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
  ELEVATED: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30",
  MONITOR: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
  INFORMATIONAL: "bg-slate-500/20 text-slate-400 border border-slate-500/30",
};

const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-500/20 text-blue-400",
  MONITORING: "bg-cyan-500/20 text-cyan-400",
  ASSESSMENT_REQUIRED: "bg-amber-500/20 text-amber-400",
  DECISION_MADE: "bg-purple-500/20 text-purple-400",
  MANEUVER_PLANNED: "bg-orange-500/20 text-orange-400",
  MANEUVER_EXECUTED: "bg-emerald-500/20 text-emerald-400",
  MANEUVER_VERIFIED: "bg-green-500/20 text-green-400",
  CLOSED: "bg-slate-500/20 text-slate-400",
};

const URGENCY_COLORS: Record<string, string> = {
  CRITICAL: "text-red-400",
  URGENT: "text-amber-400",
  ELEVATED: "text-yellow-400",
  ROUTINE: "text-green-400",
};

const CONFIDENCE_COLORS: Record<string, string> = {
  HIGH: "text-green-400",
  MEDIUM: "text-amber-400",
  LOW: "text-red-400",
};

type TabId =
  | "overview"
  | "compliance"
  | "decision"
  | "documentation"
  | "coordination";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Shield className="w-4 h-4" /> },
  {
    id: "compliance",
    label: "Compliance",
    icon: <Scale className="w-4 h-4" />,
  },
  {
    id: "decision",
    label: "Decision",
    icon: <Target className="w-4 h-4" />,
  },
  {
    id: "documentation",
    label: "Documentation",
    icon: <FileText className="w-4 h-4" />,
  },
  {
    id: "coordination",
    label: "Coordination",
    icon: <MessageSquare className="w-4 h-4" />,
  },
];

const DECISION_TYPES = [
  {
    value: "MANEUVER",
    label: "Maneuver",
    description: "Execute collision avoidance maneuver",
  },
  {
    value: "ACCEPT_RISK",
    label: "Accept Risk",
    description: "Accept current risk level",
  },
  {
    value: "MONITOR",
    label: "Monitor",
    description: "Continue monitoring without action",
  },
  {
    value: "COORDINATE",
    label: "Coordinate",
    description: "Coordinate with other operators",
  },
];

// ── Formatting Helpers ───────────────────────────────────────────────────────

function formatPc(pc: number): string {
  if (pc === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(pc)));
  const mantissa = pc / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTcaCountdown(tca: string): string {
  const diff = new Date(tca).getTime() - Date.now();
  if (diff < 0) return "TCA passed";
  const totalMinutes = Math.floor(diff / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours < 24) return `${hours}h ${minutes}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h ${minutes}m`;
}

// ── Chart Styling ────────────────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#E2E8F0",
};

const axisTick = { fill: "#94A3B8", fontSize: 11 };
const gridStroke = "rgba(255,255,255,0.1)";

// ── Dynamic Chart Components ─────────────────────────────────────────────────

const PcEvolutionChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        LineChart,
        Line,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function PcEvolutionChartInner({
        data,
      }: {
        data: Array<{ date: string; pc: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="date"
                tick={axisTick}
                tickFormatter={(v: string) => v.slice(0, 6)}
              />
              <YAxis
                tick={axisTick}
                scale="log"
                domain={["auto", "auto"]}
                tickFormatter={(v: number) => formatPc(v)}
                allowDataOverflow
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: any) => [formatPc(Number(value)), "Pc"]}
                labelFormatter={(label: any) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="pc"
                stroke="#10B981"
                strokeWidth={2}
                dot={{ fill: "#10B981", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const MissDistanceChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        LineChart,
        Line,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function MissDistanceChartInner({
        data,
      }: {
        data: Array<{ date: string; missDistance: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="date"
                tick={axisTick}
                tickFormatter={(v: string) => v.slice(0, 6)}
              />
              <YAxis
                tick={axisTick}
                tickFormatter={(v: number) => `${v.toFixed(0)}m`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: any) => [
                  `${Number(value).toFixed(0)}m`,
                  "Miss Distance",
                ]}
                labelFormatter={(label: any) => `Date: ${label}`}
              />
              <Line
                type="monotone"
                dataKey="missDistance"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ fill: "#3B82F6", r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

// ── Main Page Component ──────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ShieldEventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [event, setEvent] = useState<any>(null);
  const [factors, setFactors] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  // Decision form state
  const [decisionType, setDecisionType] = useState("MANEUVER");
  const [rationale, setRationale] = useState("");
  const [submittingDecision, setSubmittingDecision] = useState(false);
  const [decisionError, setDecisionError] = useState("");
  const [decisionSuccess, setDecisionSuccess] = useState("");

  // Documentation tab state
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState("");
  const [ncaLoading, setNcaLoading] = useState(false);
  const [ncaSuccess, setNcaSuccess] = useState("");
  const [ncaError, setNcaError] = useState("");
  const [expandedCdm, setExpandedCdm] = useState<string | null>(null);

  // Compliance tab state
  const [compliance, setCompliance] = useState<any>(null);
  const [complianceLoading, setComplianceLoading] = useState(false);

  // Coordination tab state
  const [copied, setCopied] = useState(false);
  const [coordNotes, setCoordNotes] = useState<
    Array<{ text: string; timestamp: Date }>
  >([]);
  const [newNote, setNewNote] = useState("");

  // Workflow action states
  const [showManeuverForm, setShowManeuverForm] = useState(false);
  const [fuelConsumedPct, setFuelConsumedPct] = useState("");
  const [maneuverNotes, setManeuverNotes] = useState("");
  const [showVerifyForm, setShowVerifyForm] = useState(false);
  const [verifyNotes, setVerifyNotes] = useState("");
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // ── Data Fetching ──────────────────────────────────────────────────────────

  const fetchEvent = useCallback(async () => {
    const res = await fetch(`/api/shield/events/${eventId}`);
    const data = await res.json();
    if (data.data) setEvent(data.data);
  }, [eventId]);

  useEffect(() => {
    fetchEvent().finally(() => setLoading(false));
  }, [fetchEvent]);

  // Fetch factors when decision tab selected
  useEffect(() => {
    if (activeTab === "decision" && !factors) {
      fetch(`/api/shield/events/${eventId}/factors`)
        .then((r) => r.json())
        .then((d) => {
          if (d.data) setFactors(d.data);
        });
    }
  }, [activeTab, eventId, factors]);

  // Fetch compliance intelligence when compliance tab selected
  useEffect(() => {
    if (activeTab === "compliance" && !compliance) {
      setComplianceLoading(true);
      fetch(`/api/shield/events/${eventId}/compliance`)
        .then((r) => r.json())
        .then((d) => setCompliance(d))
        .catch(() => setCompliance(null))
        .finally(() => setComplianceLoading(false));
    }
  }, [activeTab, eventId, compliance]);

  // ── Decision Submission ────────────────────────────────────────────────────

  const handleSubmitDecision = async () => {
    if (rationale.length < 10) {
      setDecisionError("Rationale must be at least 10 characters");
      return;
    }
    setSubmittingDecision(true);
    setDecisionError("");
    setDecisionSuccess("");

    try {
      const res = await fetch(`/api/shield/events/${eventId}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ decision: decisionType, rationale }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDecisionError(data.error || "Failed to submit decision");
      } else {
        setDecisionSuccess("Decision recorded successfully");
        setRationale("");
        // Refresh event data and clear factors cache
        setFactors(null);
        await fetchEvent();
      }
    } catch {
      setDecisionError("Network error. Please try again.");
    } finally {
      setSubmittingDecision(false);
    }
  };

  // ── Workflow Actions ───────────────────────────────────────────────────────

  const handleManeuverExecuted = async () => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const body: Record<string, unknown> = {};
      if (fuelConsumedPct) body.fuelConsumedPct = parseFloat(fuelConsumedPct);
      if (maneuverNotes) body.notes = maneuverNotes;

      const res = await fetch(
        `/api/shield/events/${eventId}/maneuver-executed`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...csrfHeaders() },
          body: JSON.stringify(body),
        },
      );
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to confirm maneuver execution");
      } else {
        setActionSuccess("Maneuver execution confirmed");
        setShowManeuverForm(false);
        setFuelConsumedPct("");
        setManeuverNotes("");
        await fetchEvent();
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleVerify = async (verified: boolean) => {
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const body: Record<string, unknown> = { verified };
      if (verifyNotes) body.notes = verifyNotes;

      const res = await fetch(`/api/shield/events/${eventId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to verify maneuver");
      } else {
        setActionSuccess(
          verified ? "Maneuver verified successfully" : "Verification failed",
        );
        setShowVerifyForm(false);
        setVerifyNotes("");
        await fetchEvent();
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleClose = async () => {
    if (closeReason.length < 5) {
      setActionError("Close reason must be at least 5 characters");
      return;
    }
    setActionLoading(true);
    setActionError("");
    setActionSuccess("");
    try {
      const res = await fetch(`/api/shield/events/${eventId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ reason: closeReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error || "Failed to close event");
      } else {
        setActionSuccess("Event closed successfully");
        setShowCloseForm(false);
        setCloseReason("");
        await fetchEvent();
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // ── Documentation Handlers ────────────────────────────────────────────────

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportError("");
    try {
      const res = await fetch(`/api/shield/events/${eventId}/report`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (!res.ok) throw new Error("Failed to generate report");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ca-report-${event?.conjunctionId ?? eventId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      fetchEvent(); // refresh to show reportGenerated=true
    } catch {
      setReportError("Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleNotifyNca = async () => {
    setNcaLoading(true);
    setNcaError("");
    setNcaSuccess("");
    try {
      const res = await fetch(`/api/shield/events/${eventId}/nca-notify`, {
        method: "POST",
        headers: csrfHeaders(),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to notify NCA");
      }
      setNcaSuccess("NCA notification sent successfully");
      await fetchEvent();
    } catch (err: any) {
      setNcaError(err.message || "Failed to notify NCA");
    } finally {
      setNcaLoading(false);
    }
  };

  // ── Coordination Handlers ───────────────────────────────────────────────

  const handleCopyEventSummary = () => {
    if (!event) return;
    const summary = [
      `Conjunction: ${event.conjunctionId}`,
      `Status: ${formatLabel(event.status)}`,
      `Risk Tier: ${event.riskTier}`,
      `TCA: ${new Date(event.tca).toISOString()}`,
      `Latest Pc: ${formatPc(event.latestPc)}`,
      `Miss Distance: ${event.latestMissDistance.toFixed(0)}m`,
      `NORAD IDs: ${event.noradId} ↔ ${event.threatNoradId}`,
      event.decision ? `Decision: ${event.decision}` : "Decision: Pending",
    ].join("\n");
    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    if (!event) return;
    const headers = [
      "CDM ID",
      "Date",
      "Pc",
      "Miss Distance (m)",
      "Relative Speed (m/s)",
      "Tier",
    ];
    const rows = event.cdmRecords.map((c: any) => [
      c.cdmId,
      new Date(c.creationDate).toISOString(),
      c.collisionProbability,
      c.missDistance,
      c.relativeSpeed ?? "",
      c.riskTier,
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.join(","))].join(
      "\n",
    );
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cdms-${event.conjunctionId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddNote = () => {
    if (!newNote.trim()) return;
    setCoordNotes((prev) => [
      { text: newNote.trim(), timestamp: new Date() },
      ...prev,
    ]);
    setNewNote("");
  };

  // ── Loading State ──────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertTriangle className="w-12 h-12 text-amber-400" />
        <p className="text-[var(--text-secondary)]">Event not found</p>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => router.push("/dashboard/shield")}
          icon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Shield
        </Button>
      </div>
    );
  }

  // ── Derived Data ───────────────────────────────────────────────────────────

  const cdmChartData = [...(event.cdmRecords || [])]
    .sort(
      (a: any, b: any) =>
        new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime(),
    )
    .map((c: any) => ({
      date: formatDate(c.creationDate),
      pc: c.collisionProbability,
      missDistance: c.missDistance,
    }));

  const cdmsSorted = [...(event.cdmRecords || [])].sort(
    (a: any, b: any) =>
      new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime(),
  );

  const latestCdm = cdmsSorted[0];

  const canShowDecisionForm =
    !event.decision &&
    event.status !== "CLOSED" &&
    event.status !== "MANEUVER_VERIFIED";

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Back Button + Header */}
      <GlassMotion>
        <div className="flex items-center gap-3 mb-2">
          <button
            onClick={() => router.push("/dashboard/shield")}
            className="p-2 rounded-lg hover:bg-[var(--fill-light)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-display-sm font-bold text-[var(--text-primary)]">
                {event.conjunctionId}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-small font-medium ${TIER_COLORS[event.riskTier] || ""}`}
              >
                {event.riskTier}
              </span>
              <span
                className={`px-2 py-0.5 rounded text-small font-medium ${STATUS_COLORS[event.status] || ""}`}
              >
                {formatLabel(event.status)}
              </span>
            </div>
            <p className="text-caption text-[var(--text-secondary)] mt-1">
              NORAD {event.noradId} vs {event.threatNoradId}
              {event.threatObjectName ? ` (${event.threatObjectName})` : ""}
            </p>
          </div>
        </div>

        {/* TCA Countdown */}
        <div className="flex items-center gap-2 mt-3 p-3 rounded-lg glass-surface">
          <Clock className="w-5 h-5 text-amber-400" />
          <span className="text-body text-[var(--text-secondary)]">
            Time to TCA:
          </span>
          <span className="text-heading font-bold text-[var(--text-primary)]">
            {formatTcaCountdown(event.tca)}
          </span>
          <span className="text-caption text-[var(--text-tertiary)] ml-2">
            ({formatDate(event.tca)})
          </span>
        </div>
      </GlassMotion>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 rounded-lg glass-surface">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-body font-medium transition-all duration-200 ${
              activeTab === tab.id
                ? "glass-elevated text-[var(--text-primary)]"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--fill-light)]"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          event={event}
          cdmChartData={cdmChartData}
          cdmsSorted={cdmsSorted}
          latestCdm={latestCdm}
        />
      )}

      {activeTab === "compliance" && (
        <ComplianceTab
          compliance={compliance}
          complianceLoading={complianceLoading}
          event={event}
        />
      )}

      {activeTab === "decision" && (
        <DecisionTab
          event={event}
          factors={factors}
          canShowDecisionForm={canShowDecisionForm}
          decisionType={decisionType}
          setDecisionType={setDecisionType}
          rationale={rationale}
          setRationale={setRationale}
          submittingDecision={submittingDecision}
          handleSubmitDecision={handleSubmitDecision}
          decisionError={decisionError}
          decisionSuccess={decisionSuccess}
          showManeuverForm={showManeuverForm}
          setShowManeuverForm={setShowManeuverForm}
          fuelConsumedPct={fuelConsumedPct}
          setFuelConsumedPct={setFuelConsumedPct}
          maneuverNotes={maneuverNotes}
          setManeuverNotes={setManeuverNotes}
          handleManeuverExecuted={handleManeuverExecuted}
          showVerifyForm={showVerifyForm}
          setShowVerifyForm={setShowVerifyForm}
          verifyNotes={verifyNotes}
          setVerifyNotes={setVerifyNotes}
          handleVerify={handleVerify}
          showCloseForm={showCloseForm}
          setShowCloseForm={setShowCloseForm}
          closeReason={closeReason}
          setCloseReason={setCloseReason}
          handleClose={handleClose}
          actionLoading={actionLoading}
          actionError={actionError}
          actionSuccess={actionSuccess}
        />
      )}

      {activeTab === "documentation" && (
        <div className="space-y-6">
          {/* Generate CA Report */}
          <GlassMotion>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>
                  <FileText className="w-4 h-4 inline mr-2" />
                  Collision Avoidance Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-body text-[var(--text-secondary)]">
                  Generate a comprehensive PDF report documenting this
                  conjunction event, CDM history, decisions taken, and
                  escalation timeline.
                </p>
                {event.reportGenerated && (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-small text-emerald-400 font-medium">
                      Report previously generated
                    </span>
                  </div>
                )}
                {reportError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-small text-red-400">
                    {reportError}
                  </div>
                )}
                <Button
                  variant="primary"
                  size="sm"
                  loading={generatingReport}
                  onClick={handleGenerateReport}
                  icon={<FileText className="w-4 h-4" />}
                >
                  Generate Report
                </Button>
              </CardContent>
            </Card>
          </GlassMotion>

          {/* NCA Notification */}
          <GlassMotion>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>
                  <Shield className="w-4 h-4 inline mr-2" />
                  National Competent Authority Notification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-body text-[var(--text-secondary)]">
                  Record that the NCA has been notified about this conjunction
                  event for regulatory compliance.
                </p>
                {event.ncaNotified ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-small text-emerald-400 font-medium">
                      NCA notified on{" "}
                      {event.ncaNotifiedAt
                        ? formatDate(event.ncaNotifiedAt)
                        : "N/A"}
                    </span>
                  </div>
                ) : (
                  <>
                    {ncaError && (
                      <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-small text-red-400">
                        {ncaError}
                      </div>
                    )}
                    {ncaSuccess && (
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-small text-emerald-400">
                        {ncaSuccess}
                      </div>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      loading={ncaLoading}
                      onClick={handleNotifyNca}
                      icon={<Send className="w-4 h-4" />}
                    >
                      Notify NCA
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </GlassMotion>

          {/* Raw CDM Archive */}
          <GlassMotion>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>
                  <Activity className="w-4 h-4 inline mr-2" />
                  Raw CDM Data Archive
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-body text-[var(--text-secondary)]">
                  {event.cdmRecords?.length ?? 0} CDM records received
                </p>
                {(event.cdmRecords || []).map((cdm: any) => (
                  <div
                    key={cdm.id}
                    className="rounded-lg glass-surface overflow-hidden"
                  >
                    <button
                      onClick={() =>
                        setExpandedCdm(expandedCdm === cdm.id ? null : cdm.id)
                      }
                      className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-[var(--fill-light)] transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span className="text-body text-[var(--text-primary)] font-mono">
                          CDM {cdm.cdmId} —{" "}
                          {new Date(cdm.creationDate).toLocaleDateString()}
                        </span>
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            cdm.source === "leolabs"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                          }`}
                        >
                          {cdm.source === "leolabs" ? "LeoLabs" : "Space-Track"}
                        </span>
                      </span>
                      {expandedCdm === cdm.id ? (
                        <ChevronUp className="w-4 h-4 text-[var(--text-secondary)]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[var(--text-secondary)]" />
                      )}
                    </button>
                    {expandedCdm === cdm.id && (
                      <pre className="mt-0 px-4 pb-4 pt-2 glass-surface text-xs text-slate-400 overflow-x-auto max-h-64 overflow-y-auto">
                        {JSON.stringify(cdm.rawCdm, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
                {(!event.cdmRecords || event.cdmRecords.length === 0) && (
                  <p className="text-body text-[var(--text-secondary)] text-center py-4">
                    No CDM records available.
                  </p>
                )}
              </CardContent>
            </Card>
          </GlassMotion>
        </div>
      )}

      {activeTab === "coordination" && (
        <div className="space-y-6">
          {/* Quick Actions */}
          <GlassMotion>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={handleCopyEventSummary}
                icon={
                  copied ? (
                    <ClipboardCheck className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )
                }
              >
                {copied ? "Copied!" : "Copy Event Summary"}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleExportCSV}
                icon={<Download className="w-4 h-4" />}
              >
                Export CDMs as CSV
              </Button>
            </div>
          </GlassMotion>

          {/* Communication Log */}
          <GlassMotion>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Coordination Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 text-small text-blue-400">
                  Notes are stored locally for this session. For permanent
                  records, generate a CA Report.
                </div>

                {/* Add Note Form */}
                <div className="space-y-2">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Add a coordination note..."
                    rows={3}
                    maxLength={2000}
                    className="w-full p-3 rounded-lg glass-surface border border-[var(--glass-border-subtle)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
                  />
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={!newNote.trim()}
                    onClick={handleAddNote}
                    icon={<Send className="w-4 h-4" />}
                  >
                    Add Note
                  </Button>
                </div>

                {/* Notes List */}
                {coordNotes.length > 0 ? (
                  <div className="space-y-3 pt-2 border-t border-[var(--separator)]">
                    {coordNotes.map((note, idx) => (
                      <div key={idx} className="p-3 rounded-lg glass-surface">
                        <p className="text-body text-[var(--text-primary)] whitespace-pre-wrap">
                          {note.text}
                        </p>
                        <p className="text-micro text-[var(--text-tertiary)] mt-2">
                          {note.timestamp.toLocaleString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-body text-[var(--text-secondary)] text-center py-4">
                    No coordination notes yet.
                  </p>
                )}
              </CardContent>
            </Card>
          </GlassMotion>
        </div>
      )}
    </div>
  );
}

// ── Compliance Tab ──────────────────────────────────────────────────────────

const COMPLIANCE_RISK_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const NCA_STATUS_COLORS: Record<string, string> = {
  overdue: "bg-red-500/20 text-red-400",
  due_soon: "bg-amber-500/20 text-amber-400",
  pending: "bg-blue-500/20 text-blue-400",
  completed: "bg-emerald-500/20 text-emerald-400",
  not_required: "bg-slate-500/20 text-slate-400",
};

function ComplianceTab({
  compliance,
  complianceLoading,
  event,
}: {
  compliance: any;
  complianceLoading: boolean;
  event: any;
}) {
  if (complianceLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mr-3" />
        <span className="text-[var(--text-secondary)]">
          Computing compliance assessment...
        </span>
      </div>
    );
  }

  if (!compliance?.assessment) {
    return (
      <GlassMotion>
        <Card variant="elevated">
          <CardContent className="py-12 text-center">
            <Scale className="w-8 h-8 text-[var(--text-tertiary)] mx-auto mb-3" />
            <p className="text-[var(--text-secondary)]">
              Compliance data not available. Ensure jurisdictions are configured
              in Shield settings.
            </p>
          </CardContent>
        </Card>
      </GlassMotion>
    );
  }

  const { assessment, timeline, maneuverImpact, jurisdictions } = compliance;

  return (
    <div className="space-y-6">
      {/* Compliance Risk Banner */}
      <GlassMotion>
        <div
          className={`flex items-center gap-4 px-5 py-4 rounded-xl border ${COMPLIANCE_RISK_COLORS[assessment.complianceRisk] || ""}`}
        >
          <Scale className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <span className="text-subtitle font-semibold uppercase tracking-wider">
                {assessment.complianceRisk} Compliance Risk
              </span>
              <span className="text-caption opacity-60">
                {jurisdictions?.length ?? 0} jurisdiction
                {jurisdictions?.length !== 1 ? "s" : ""} assessed
              </span>
            </div>
            <p className="text-body mt-0.5 opacity-80">{assessment.summary}</p>
          </div>
        </div>
      </GlassMotion>

      {/* NCA Reporting Requirements */}
      <GlassMotion>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>
              <Globe className="w-4 h-4 inline mr-2" />
              NCA Reporting Requirements
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assessment.reportingRequirements?.map((req: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg glass-surface"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-caption font-semibold px-2 py-0.5 rounded ${NCA_STATUS_COLORS[req.status] || ""}`}
                    >
                      {req.status === "overdue"
                        ? "OVERDUE"
                        : req.status === "due_soon"
                          ? "DUE SOON"
                          : req.status === "completed"
                            ? "DONE"
                            : req.status === "pending"
                              ? "PENDING"
                              : "N/A"}
                    </span>
                    <div>
                      <p className="text-body font-medium text-[var(--text-primary)]">
                        {req.authority}{" "}
                        <span className="text-[var(--text-tertiary)]">
                          ({req.jurisdiction})
                        </span>
                      </p>
                      <p className="text-caption text-[var(--text-secondary)]">
                        {req.isTriggered
                          ? req.triggerReason
                          : "Below reporting thresholds"}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {req.hoursRemaining !== null && req.isTriggered && (
                      <p
                        className={`text-body font-mono tabular-nums ${
                          req.isOverdue
                            ? "text-red-400"
                            : req.hoursRemaining < 24
                              ? "text-amber-400"
                              : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {req.isOverdue
                          ? "OVERDUE"
                          : `${Math.floor(req.hoursRemaining)}h remaining`}
                      </p>
                    )}
                    <p className="text-caption text-[var(--text-tertiary)]">
                      {req.legalBasis?.split(",")[0]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlassMotion>

      {/* Compliance Deadlines */}
      {assessment.deadlines?.length > 0 && (
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <Timer className="w-4 h-4 inline mr-2" />
                Compliance Deadlines
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border-subtle)]" />

                <div className="space-y-4">
                  {assessment.deadlines.map((dl: any, i: number) => (
                    <div key={i} className="flex gap-4 relative">
                      <div
                        className={`w-[23px] h-[23px] rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                          dl.isOverdue
                            ? "bg-red-500/30 border border-red-500/50"
                            : dl.hoursRemaining < 24
                              ? "bg-amber-500/30 border border-amber-500/50"
                              : "bg-[var(--fill-light)] border border-[var(--border-subtle)]"
                        }`}
                      >
                        <CircleDot
                          className={`w-3 h-3 ${
                            dl.isOverdue
                              ? "text-red-400"
                              : dl.hoursRemaining < 24
                                ? "text-amber-400"
                                : "text-[var(--text-tertiary)]"
                          }`}
                        />
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2">
                          <p className="text-body font-medium text-[var(--text-primary)]">
                            {dl.description}
                          </p>
                          {dl.isOverdue && (
                            <span className="text-micro font-semibold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400">
                              OVERDUE
                            </span>
                          )}
                        </div>
                        <p className="text-caption text-[var(--text-tertiary)]">
                          {new Date(dl.deadlineAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}{" "}
                          &middot; {dl.authority}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </GlassMotion>
      )}

      {/* Decision Impact Analysis */}
      <GlassMotion>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>
              <Target className="w-4 h-4 inline mr-2" />
              Decision Compliance Impact
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {assessment.decisionImpacts?.map((impact: any) => (
                <div
                  key={impact.decision}
                  className="p-4 rounded-lg glass-surface"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-body font-semibold text-[var(--text-primary)]">
                      {formatLabel(impact.decision)}
                    </span>
                    <span
                      className={`text-caption font-medium px-2 py-0.5 rounded ${
                        impact.riskLevel === "high"
                          ? "bg-red-500/20 text-red-400"
                          : impact.riskLevel === "medium"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-emerald-500/20 text-emerald-400"
                      }`}
                    >
                      {impact.riskLevel} risk
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {impact.complianceImplications
                      ?.slice(0, 3)
                      .map((imp: string, j: number) => (
                        <li
                          key={j}
                          className="text-caption text-[var(--text-secondary)] flex gap-2"
                        >
                          <span className="text-[var(--text-tertiary)] flex-shrink-0">
                            {imp.startsWith("WARNING") ? "⚠" : "•"}
                          </span>
                          {imp}
                        </li>
                      ))}
                  </ul>
                  {impact.ncaRequirements?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
                      {impact.ncaRequirements.map((req: string, k: number) => (
                        <p key={k} className="text-caption text-amber-400/80">
                          {req}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlassMotion>

      {/* Maneuver Impact (when applicable) */}
      {maneuverImpact && (
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <Fuel className="w-4 h-4 inline mr-2" />
                Maneuver Compliance Impact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Fuel impact */}
              <div
                className={`p-3 rounded-lg ${
                  maneuverImpact.fuelImpact.passivationBudgetAffected
                    ? "bg-red-500/10 border border-red-500/20"
                    : maneuverImpact.fuelImpact.eolDisposalBudgetAffected
                      ? "bg-amber-500/10 border border-amber-500/20"
                      : "glass-surface"
                }`}
              >
                <p className="text-body font-medium text-[var(--text-primary)] mb-1">
                  Fuel &amp; Passivation
                </p>
                <p className="text-caption text-[var(--text-secondary)]">
                  {maneuverImpact.fuelImpact.description}
                </p>
              </div>

              {/* Orbital lifetime */}
              <div className="p-3 rounded-lg glass-surface">
                <p className="text-body font-medium text-[var(--text-primary)] mb-1">
                  Orbital Lifetime (25-Year Rule)
                </p>
                <p className="text-caption text-[var(--text-secondary)]">
                  {maneuverImpact.orbitalLifetimeImpact.description}
                </p>
              </div>

              {/* Required post-maneuver actions */}
              {maneuverImpact.requiredActions?.length > 0 && (
                <div>
                  <p className="text-caption font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
                    Required Post-Maneuver Actions
                  </p>
                  <div className="space-y-2">
                    {maneuverImpact.requiredActions.map(
                      (action: any, i: number) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 p-2.5 rounded-lg glass-surface"
                        >
                          <CheckCircle className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-body text-[var(--text-primary)]">
                              {action.action}
                            </p>
                            <p className="text-caption text-[var(--text-tertiary)]">
                              {action.deadline} &middot; {action.legalBasis}
                            </p>
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </GlassMotion>
      )}

      {/* Compliance Timeline */}
      {timeline?.events?.length > 0 && (
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <Clock className="w-4 h-4 inline mr-2" />
                Compliance Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[var(--border-subtle)]" />
                <div className="space-y-3">
                  {timeline.events.map((evt: any, i: number) => (
                    <div key={i} className="flex gap-4 relative">
                      <div
                        className={`w-[23px] h-[23px] rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                          evt.completed
                            ? "bg-emerald-500/20 border border-emerald-500/40"
                            : evt.urgency === "critical"
                              ? "bg-red-500/20 border border-red-500/40"
                              : evt.urgency === "high"
                                ? "bg-amber-500/20 border border-amber-500/40"
                                : "bg-[var(--fill-light)] border border-[var(--border-subtle)]"
                        }`}
                      >
                        {evt.completed ? (
                          <CheckCircle className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <CircleDot
                            className={`w-3 h-3 ${
                              evt.urgency === "critical"
                                ? "text-red-400"
                                : evt.urgency === "high"
                                  ? "text-amber-400"
                                  : "text-[var(--text-tertiary)]"
                            }`}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p
                            className={`text-body font-medium ${evt.completed ? "text-[var(--text-tertiary)] line-through" : "text-[var(--text-primary)]"}`}
                          >
                            {evt.title}
                          </p>
                          {evt.jurisdiction && (
                            <span className="text-micro px-1.5 py-0.5 rounded bg-[var(--fill-light)] text-[var(--text-tertiary)]">
                              {evt.jurisdiction}
                            </span>
                          )}
                        </div>
                        <p className="text-caption text-[var(--text-tertiary)]">
                          {new Date(evt.timestamp).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {evt.description !== evt.title &&
                            ` — ${evt.description}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </GlassMotion>
      )}
    </div>
  );
}

// ── Overview Tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  event,
  cdmChartData,
  cdmsSorted,
  latestCdm,
}: {
  event: any;
  cdmChartData: Array<{ date: string; pc: number; missDistance: number }>;
  cdmsSorted: any[];
  latestCdm: any;
}) {
  return (
    <div className="space-y-6">
      {/* Key Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <GlassMotion>
          <Card variant="metric" className="border-t-emerald-500">
            <CardContent>
              <p className="text-caption text-[var(--text-secondary)] mb-1">
                Latest Pc
              </p>
              <p className="text-display-sm font-bold text-[var(--text-primary)] font-mono">
                {formatPc(event.latestPc)}
              </p>
            </CardContent>
          </Card>
        </GlassMotion>
        <GlassMotion>
          <Card variant="metric" className="border-t-red-500">
            <CardContent>
              <p className="text-caption text-[var(--text-secondary)] mb-1">
                Peak Pc
              </p>
              <p className="text-display-sm font-bold text-[var(--text-primary)] font-mono">
                {formatPc(event.peakPc)}
              </p>
            </CardContent>
          </Card>
        </GlassMotion>
        <GlassMotion>
          <Card variant="metric" className="border-t-blue-500">
            <CardContent>
              <p className="text-caption text-[var(--text-secondary)] mb-1">
                Miss Distance
              </p>
              <p className="text-display-sm font-bold text-[var(--text-primary)] font-mono">
                {event.latestMissDistance.toFixed(0)}m
              </p>
            </CardContent>
          </Card>
        </GlassMotion>
        <GlassMotion>
          <Card variant="metric" className="border-t-amber-500">
            <CardContent>
              <p className="text-caption text-[var(--text-secondary)] mb-1">
                Relative Speed
              </p>
              <p className="text-display-sm font-bold text-[var(--text-primary)] font-mono">
                {event.relativeSpeed
                  ? `${event.relativeSpeed.toFixed(1)} m/s`
                  : "N/A"}
              </p>
            </CardContent>
          </Card>
        </GlassMotion>
      </div>

      {/* Charts Row */}
      {cdmChartData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <GlassMotion>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Pc Evolution</CardTitle>
              </CardHeader>
              <CardContent>
                <PcEvolutionChart data={cdmChartData} />
              </CardContent>
            </Card>
          </GlassMotion>
          <GlassMotion>
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Miss Distance Evolution</CardTitle>
              </CardHeader>
              <CardContent>
                <MissDistanceChart data={cdmChartData} />
              </CardContent>
            </Card>
          </GlassMotion>
        </div>
      )}

      {/* CDM History Table */}
      <GlassMotion>
        <Card variant="elevated">
          <CardHeader>
            <CardTitle>CDM History ({cdmsSorted.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-body">
                <thead>
                  <tr className="border-b border-[var(--separator)]">
                    <th className="text-left py-2 px-3 text-caption font-medium text-[var(--text-secondary)]">
                      CDM ID
                    </th>
                    <th className="text-left py-2 px-3 text-caption font-medium text-[var(--text-secondary)]">
                      Date
                    </th>
                    <th className="text-right py-2 px-3 text-caption font-medium text-[var(--text-secondary)]">
                      Pc
                    </th>
                    <th className="text-right py-2 px-3 text-caption font-medium text-[var(--text-secondary)]">
                      Miss Distance (m)
                    </th>
                    <th className="text-center py-2 px-3 text-caption font-medium text-[var(--text-secondary)]">
                      Tier
                    </th>
                    <th className="text-center py-2 px-3 text-caption font-medium text-[var(--text-secondary)]">
                      Source
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {cdmsSorted.map((cdm: any) => (
                    <tr
                      key={cdm.id}
                      className="border-b border-[var(--separator)] last:border-b-0 hover:bg-[var(--fill-light)] transition-colors"
                    >
                      <td className="py-2 px-3 text-[var(--text-primary)] font-mono text-small">
                        {cdm.cdmId}
                      </td>
                      <td className="py-2 px-3 text-[var(--text-secondary)] text-small">
                        {formatDate(cdm.creationDate)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--text-primary)] font-mono text-small">
                        {formatPc(cdm.collisionProbability)}
                      </td>
                      <td className="py-2 px-3 text-right text-[var(--text-primary)] font-mono text-small">
                        {cdm.missDistance.toFixed(0)}
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-micro font-medium ${TIER_COLORS[cdm.riskTier] || ""}`}
                        >
                          {cdm.riskTier}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-center">
                        <span
                          className={`text-xs px-1.5 py-0.5 rounded ${
                            cdm.source === "leolabs"
                              ? "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                              : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                          }`}
                        >
                          {cdm.source === "leolabs" ? "LeoLabs" : "Space-Track"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {cdmsSorted.length === 0 && (
              <p className="text-body text-[var(--text-secondary)] text-center py-8">
                No CDM records yet.
              </p>
            )}
          </CardContent>
        </Card>
      </GlassMotion>

      {/* Threat Object + Event Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Threat Object Card */}
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <AlertTriangle className="w-4 h-4 inline mr-2" />
                Threat Object
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-caption text-[var(--text-secondary)]">
                    NORAD ID
                  </p>
                  <p className="text-body text-[var(--text-primary)] font-mono">
                    {event.threatNoradId}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-[var(--text-secondary)]">
                    Name
                  </p>
                  <p className="text-body text-[var(--text-primary)]">
                    {event.threatObjectName || "Unknown"}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-[var(--text-secondary)]">
                    Object Type
                  </p>
                  <p className="text-body text-[var(--text-primary)]">
                    {event.threatObjectType}
                  </p>
                </div>
                <div>
                  <p className="text-caption text-[var(--text-secondary)]">
                    Maneuverable
                  </p>
                  <p className="text-body text-[var(--text-primary)]">
                    {latestCdm?.sat2Maneuverable ?? "Unknown"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </GlassMotion>

        {/* Event Timeline */}
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <Activity className="w-4 h-4 inline mr-2" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              {event.escalationLog && event.escalationLog.length > 0 ? (
                <div className="space-y-0">
                  {event.escalationLog.map((entry: any, idx: number) => (
                    <div key={entry.id} className="flex gap-3 relative">
                      {/* Timeline line */}
                      {idx < event.escalationLog.length - 1 && (
                        <div className="absolute left-[9px] top-5 bottom-0 w-px bg-[var(--separator)]" />
                      )}
                      {/* Dot */}
                      <div
                        className={`w-[18px] h-[18px] rounded-full mt-0.5 flex-shrink-0 border-2 ${
                          TIER_COLORS[entry.newTier]
                            ? `border-current ${TIER_COLORS[entry.newTier].split(" ")[1]}`
                            : "border-slate-500 text-slate-400"
                        }`}
                        style={{
                          backgroundColor:
                            entry.newTier === "EMERGENCY"
                              ? "rgba(239,68,68,0.3)"
                              : entry.newTier === "HIGH"
                                ? "rgba(245,158,11,0.3)"
                                : entry.newTier === "ELEVATED"
                                  ? "rgba(234,179,8,0.3)"
                                  : entry.newTier === "MONITOR"
                                    ? "rgba(59,130,246,0.3)"
                                    : "rgba(100,116,139,0.3)",
                        }}
                      />
                      <div className="pb-4 flex-1">
                        <p className="text-small text-[var(--text-primary)]">
                          <span className="font-medium">
                            {formatLabel(entry.newStatus)}
                          </span>
                          {entry.previousStatus !== entry.newStatus && (
                            <span className="text-[var(--text-tertiary)]">
                              {" "}
                              (from {formatLabel(entry.previousStatus)})
                            </span>
                          )}
                        </p>
                        <p className="text-caption text-[var(--text-secondary)] mt-0.5">
                          {entry.triggeredBy.replace(/_/g, " ")}
                          {entry.details && (
                            <span className="block text-[var(--text-tertiary)] mt-0.5 truncate max-w-xs">
                              {entry.details}
                            </span>
                          )}
                        </p>
                        <p className="text-micro text-[var(--text-tertiary)] mt-0.5">
                          {formatDate(entry.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-body text-[var(--text-secondary)] text-center py-4">
                  No escalation history yet.
                </p>
              )}
            </CardContent>
          </Card>
        </GlassMotion>
      </div>
    </div>
  );
}

// ── Decision Tab ─────────────────────────────────────────────────────────────

function DecisionTab({
  event,
  factors,
  canShowDecisionForm,
  decisionType,
  setDecisionType,
  rationale,
  setRationale,
  submittingDecision,
  handleSubmitDecision,
  decisionError,
  decisionSuccess,
  showManeuverForm,
  setShowManeuverForm,
  fuelConsumedPct,
  setFuelConsumedPct,
  maneuverNotes,
  setManeuverNotes,
  handleManeuverExecuted,
  showVerifyForm,
  setShowVerifyForm,
  verifyNotes,
  setVerifyNotes,
  handleVerify,
  showCloseForm,
  setShowCloseForm,
  closeReason,
  setCloseReason,
  handleClose,
  actionLoading,
  actionError,
  actionSuccess,
}: {
  event: any;
  factors: any;
  canShowDecisionForm: boolean;
  decisionType: string;
  setDecisionType: (v: string) => void;
  rationale: string;
  setRationale: (v: string) => void;
  submittingDecision: boolean;
  handleSubmitDecision: () => void;
  decisionError: string;
  decisionSuccess: string;
  showManeuverForm: boolean;
  setShowManeuverForm: (v: boolean) => void;
  fuelConsumedPct: string;
  setFuelConsumedPct: (v: string) => void;
  maneuverNotes: string;
  setManeuverNotes: (v: string) => void;
  handleManeuverExecuted: () => void;
  showVerifyForm: boolean;
  setShowVerifyForm: (v: boolean) => void;
  verifyNotes: string;
  setVerifyNotes: (v: string) => void;
  handleVerify: (verified: boolean) => void;
  showCloseForm: boolean;
  setShowCloseForm: (v: boolean) => void;
  closeReason: string;
  setCloseReason: (v: string) => void;
  handleClose: () => void;
  actionLoading: boolean;
  actionError: string;
  actionSuccess: string;
}) {
  return (
    <div className="space-y-6">
      {/* Decision Factors Panel */}
      {factors ? (
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <Zap className="w-4 h-4 inline mr-2" />
                Decision Factors
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                {/* Urgency */}
                <div className="p-3 rounded-lg glass-surface">
                  <p className="text-caption text-[var(--text-secondary)] mb-1">
                    Urgency
                  </p>
                  <p
                    className={`text-subtitle font-bold ${URGENCY_COLORS[factors.urgency] || ""}`}
                  >
                    {factors.urgency}
                  </p>
                </div>

                {/* Pc Trend */}
                <div className="p-3 rounded-lg glass-surface">
                  <p className="text-caption text-[var(--text-secondary)] mb-1">
                    Pc Trend
                  </p>
                  <div className="flex items-center gap-2">
                    {factors.pcTrend?.direction === "INCREASING" && (
                      <TrendingUp className="w-4 h-4 text-red-400" />
                    )}
                    {factors.pcTrend?.direction === "DECREASING" && (
                      <TrendingDown className="w-4 h-4 text-green-400" />
                    )}
                    {factors.pcTrend?.direction === "STABLE" && (
                      <Minus className="w-4 h-4 text-blue-400" />
                    )}
                    {factors.pcTrend?.direction === "VOLATILE" && (
                      <Activity className="w-4 h-4 text-amber-400" />
                    )}
                    <span
                      className={`text-subtitle font-bold ${
                        factors.pcTrend?.direction === "INCREASING"
                          ? "text-red-400"
                          : factors.pcTrend?.direction === "DECREASING"
                            ? "text-green-400"
                            : factors.pcTrend?.direction === "STABLE"
                              ? "text-blue-400"
                              : "text-amber-400"
                      }`}
                    >
                      {factors.pcTrend?.direction}
                    </span>
                  </div>
                </div>

                {/* Miss Distance Trend */}
                <div className="p-3 rounded-lg glass-surface">
                  <p className="text-caption text-[var(--text-secondary)] mb-1">
                    Miss Distance Trend
                  </p>
                  <p className="text-subtitle font-bold text-[var(--text-primary)]">
                    {factors.missDistanceTrend}
                  </p>
                </div>

                {/* Data Confidence */}
                <div className="p-3 rounded-lg glass-surface">
                  <p className="text-caption text-[var(--text-secondary)] mb-1">
                    Data Confidence
                  </p>
                  <p
                    className={`text-subtitle font-bold ${CONFIDENCE_COLORS[factors.dataConfidence] || ""}`}
                  >
                    {factors.dataConfidence}
                  </p>
                </div>

                {/* CDM Count */}
                <div className="p-3 rounded-lg glass-surface">
                  <p className="text-caption text-[var(--text-secondary)] mb-1">
                    CDM Count
                  </p>
                  <p className="text-subtitle font-bold text-[var(--text-primary)]">
                    {factors.cdmCount}
                  </p>
                </div>

                {/* Threat Maneuverable */}
                <div className="p-3 rounded-lg glass-surface">
                  <p className="text-caption text-[var(--text-secondary)] mb-1">
                    Threat Maneuverable
                  </p>
                  <p className="text-subtitle font-bold text-[var(--text-primary)]">
                    {factors.threatManeuverable === true
                      ? "Yes"
                      : factors.threatManeuverable === false
                        ? "No"
                        : "Unknown"}
                  </p>
                </div>

                {/* Projected Pc at TCA */}
                <div className="p-3 rounded-lg glass-surface sm:col-span-2">
                  <p className="text-caption text-[var(--text-secondary)] mb-1">
                    Projected Pc at TCA
                  </p>
                  <p className="text-subtitle font-bold text-[var(--text-primary)] font-mono">
                    {factors.pcTrend?.projectedPcAtTca != null
                      ? formatPc(factors.pcTrend.projectedPcAtTca)
                      : "N/A"}
                  </p>
                </div>
              </div>

              {/* Recommendation — Full Width */}
              <div className="p-4 rounded-lg glass-surface border border-emerald-500/20">
                <p className="text-caption text-emerald-400 mb-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Advisory Recommendation
                </p>
                <p className="text-body-lg text-[var(--text-primary)]">
                  {factors.recommendation}
                </p>
              </div>
            </CardContent>
          </Card>
        </GlassMotion>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-emerald-400 mr-2" />
          <span className="text-body text-[var(--text-secondary)]">
            Computing decision factors...
          </span>
        </div>
      )}

      {/* Decision Form or Display */}
      {canShowDecisionForm ? (
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <Target className="w-4 h-4 inline mr-2" />
                Record Decision
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Decision Type Radio Buttons */}
              <div>
                <p className="text-body font-medium text-[var(--text-primary)] mb-3">
                  Decision Type
                </p>
                <div className="space-y-2">
                  {DECISION_TYPES.map((dt) => (
                    <label
                      key={dt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                        decisionType === dt.value
                          ? "glass-elevated border border-emerald-500/30"
                          : "glass-surface hover:bg-[var(--fill-light)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name="decisionType"
                        value={dt.value}
                        checked={decisionType === dt.value}
                        onChange={() => setDecisionType(dt.value)}
                        className="mt-0.5 accent-emerald-500"
                      />
                      <div>
                        <p className="text-body font-medium text-[var(--text-primary)]">
                          {dt.label}
                        </p>
                        <p className="text-caption text-[var(--text-secondary)]">
                          {dt.description}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Rationale */}
              <div>
                <label
                  htmlFor="rationale"
                  className="text-body font-medium text-[var(--text-primary)] block mb-2"
                >
                  Rationale
                </label>
                <textarea
                  id="rationale"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="Explain the reasoning for this decision (min 10 characters)..."
                  rows={4}
                  maxLength={2000}
                  className="w-full p-3 rounded-lg glass-surface border border-[var(--glass-border-subtle)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-emerald-500/50 transition-colors"
                />
                <p className="text-micro text-[var(--text-tertiary)] mt-1">
                  {rationale.length}/2000 characters
                </p>
              </div>

              {/* Error / Success */}
              {decisionError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-small text-red-400">
                  {decisionError}
                </div>
              )}
              {decisionSuccess && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-small text-emerald-400">
                  {decisionSuccess}
                </div>
              )}

              {/* Submit */}
              <Button
                variant="primary"
                size="lg"
                loading={submittingDecision}
                disabled={rationale.length < 10}
                onClick={handleSubmitDecision}
                icon={<Send className="w-4 h-4" />}
              >
                Submit Decision
              </Button>
            </CardContent>
          </Card>
        </GlassMotion>
      ) : event.decision ? (
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <CheckCircle className="w-4 h-4 inline mr-2" />
                Decision Recorded
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Decision Display */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-caption text-[var(--text-secondary)]">
                    Decision
                  </p>
                  <span
                    className={`inline-block mt-1 px-3 py-1 rounded text-body font-medium ${
                      event.decision === "MANEUVER"
                        ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                        : event.decision === "ACCEPT_RISK"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : event.decision === "MONITOR"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                    }`}
                  >
                    {formatLabel(event.decision)}
                  </span>
                </div>
                <div>
                  <p className="text-caption text-[var(--text-secondary)]">
                    Decided By
                  </p>
                  <p className="text-body text-[var(--text-primary)] mt-1">
                    {event.decisionBy || "Unknown"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-caption text-[var(--text-secondary)]">
                    Decided At
                  </p>
                  <p className="text-body text-[var(--text-primary)] mt-1">
                    {event.decisionAt ? formatDate(event.decisionAt) : "N/A"}
                  </p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-caption text-[var(--text-secondary)]">
                    Rationale
                  </p>
                  <p className="text-body text-[var(--text-primary)] mt-1 whitespace-pre-wrap">
                    {event.decisionRationale || "No rationale provided"}
                  </p>
                </div>
              </div>

              {/* Workflow Action Buttons */}
              {event.status !== "CLOSED" && (
                <div className="pt-4 border-t border-[var(--separator)] space-y-3">
                  <p className="text-caption font-medium text-[var(--text-secondary)]">
                    Workflow Actions
                  </p>

                  {/* Action Error / Success Messages */}
                  {actionError && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-small text-red-400">
                      {actionError}
                    </div>
                  )}
                  {actionSuccess && (
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-small text-emerald-400">
                      {actionSuccess}
                    </div>
                  )}

                  {/* Maneuver Execution Confirmation */}
                  {event.status === "MANEUVER_PLANNED" && (
                    <>
                      {!showManeuverForm ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowManeuverForm(true)}
                          icon={<Zap className="w-4 h-4" />}
                        >
                          Confirm Maneuver Execution
                        </Button>
                      ) : (
                        <div className="p-4 rounded-lg glass-surface space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-body font-medium text-[var(--text-primary)]">
                              Confirm Maneuver Execution
                            </p>
                            <button
                              onClick={() => setShowManeuverForm(false)}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className="text-caption text-[var(--text-secondary)] block mb-1">
                              Fuel Consumed (%, optional)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={fuelConsumedPct}
                              onChange={(e) =>
                                setFuelConsumedPct(e.target.value)
                              }
                              placeholder="e.g. 2.5"
                              className="w-full p-2 rounded-lg glass-surface border border-[var(--glass-border-subtle)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div>
                            <label className="text-caption text-[var(--text-secondary)] block mb-1">
                              Notes (optional)
                            </label>
                            <textarea
                              value={maneuverNotes}
                              onChange={(e) => setManeuverNotes(e.target.value)}
                              placeholder="Additional notes..."
                              rows={2}
                              maxLength={2000}
                              className="w-full p-2 rounded-lg glass-surface border border-[var(--glass-border-subtle)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <Button
                            variant="success"
                            size="sm"
                            loading={actionLoading}
                            onClick={handleManeuverExecuted}
                            icon={<CheckCircle className="w-4 h-4" />}
                          >
                            Confirm Execution
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {/* Maneuver Verification */}
                  {event.status === "MANEUVER_EXECUTED" && (
                    <>
                      {!showVerifyForm ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => setShowVerifyForm(true)}
                          icon={<CheckCircle className="w-4 h-4" />}
                        >
                          Verify Maneuver
                        </Button>
                      ) : (
                        <div className="p-4 rounded-lg glass-surface space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-body font-medium text-[var(--text-primary)]">
                              Post-Maneuver Verification
                            </p>
                            <button
                              onClick={() => setShowVerifyForm(false)}
                              className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div>
                            <label className="text-caption text-[var(--text-secondary)] block mb-1">
                              Verification Notes (optional)
                            </label>
                            <textarea
                              value={verifyNotes}
                              onChange={(e) => setVerifyNotes(e.target.value)}
                              placeholder="Notes on verification results..."
                              rows={2}
                              maxLength={2000}
                              className="w-full p-2 rounded-lg glass-surface border border-[var(--glass-border-subtle)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-emerald-500/50"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              loading={actionLoading}
                              onClick={() => handleVerify(true)}
                              icon={<CheckCircle className="w-4 h-4" />}
                            >
                              Verify Passed
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              loading={actionLoading}
                              onClick={() => handleVerify(false)}
                              icon={<X className="w-4 h-4" />}
                            >
                              Verify Failed
                            </Button>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Close Event */}
                  {!showCloseForm ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCloseForm(true)}
                      icon={<X className="w-4 h-4" />}
                    >
                      Close Event
                    </Button>
                  ) : (
                    <div className="p-4 rounded-lg glass-surface space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-body font-medium text-[var(--text-primary)]">
                          Close Event
                        </p>
                        <button
                          onClick={() => setShowCloseForm(false)}
                          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div>
                        <label className="text-caption text-[var(--text-secondary)] block mb-1">
                          Close Reason (required, min 5 characters)
                        </label>
                        <textarea
                          value={closeReason}
                          onChange={(e) => setCloseReason(e.target.value)}
                          placeholder="Reason for closing this event..."
                          rows={3}
                          maxLength={2000}
                          className="w-full p-2 rounded-lg glass-surface border border-[var(--glass-border-subtle)] text-body text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] resize-none focus:outline-none focus:border-emerald-500/50"
                        />
                      </div>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={actionLoading}
                        disabled={closeReason.length < 5}
                        onClick={handleClose}
                        icon={<X className="w-4 h-4" />}
                      >
                        Confirm Close
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </GlassMotion>
      ) : null}
    </div>
  );
}
