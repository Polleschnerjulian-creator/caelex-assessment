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

type TabId = "overview" | "decision" | "documentation" | "coordination";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <Shield className="w-4 h-4" /> },
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
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <FileText className="w-4 h-4 inline mr-2" />
                Documentation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-[var(--text-secondary)]">
                Coming in next update. This tab will include compliance report
                generation, NCA notification management, and Verity attestation
                integration.
              </p>
            </CardContent>
          </Card>
        </GlassMotion>
      )}

      {activeTab === "coordination" && (
        <GlassMotion>
          <Card variant="elevated">
            <CardHeader>
              <CardTitle>
                <MessageSquare className="w-4 h-4 inline mr-2" />
                Coordination
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-body text-[var(--text-secondary)]">
                Coming in next update. This tab will include inter-operator
                coordination messaging, Space-Track data sharing, and
                stakeholder notifications.
              </p>
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
