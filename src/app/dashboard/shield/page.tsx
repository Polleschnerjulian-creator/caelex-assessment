"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  Shield,
  Activity,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Settings,
  BarChart3,
  Save,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { GlassMotion, GlassStagger } from "@/components/ui/GlassMotion";
import { motion } from "framer-motion";
import { glassItemVariants } from "@/components/ui/GlassMotion";
import { csrfHeaders } from "@/lib/csrf-client";

// ── Constants ────────────────────────────────────────────────────────────────

const LIMIT = 20;

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

const CHART_COLORS = [
  "#10B981",
  "#3B82F6",
  "#F59E0B",
  "#EF4444",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

const TIER_CHART_COLORS: Record<string, string> = {
  EMERGENCY: "#EF4444",
  HIGH: "#F59E0B",
  ELEVATED: "#EAB308",
  MONITOR: "#3B82F6",
  INFORMATIONAL: "#64748B",
};

const STATUS_LIST = [
  "",
  "NEW",
  "MONITORING",
  "ASSESSMENT_REQUIRED",
  "DECISION_MADE",
  "MANEUVER_PLANNED",
  "MANEUVER_EXECUTED",
  "MANEUVER_VERIFIED",
  "CLOSED",
];

const TIER_LIST = [
  "",
  "EMERGENCY",
  "HIGH",
  "ELEVATED",
  "MONITOR",
  "INFORMATIONAL",
];

// ── Formatting Helpers ───────────────────────────────────────────────────────

function formatPc(pc: number): string {
  if (pc === 0) return "0";
  const exp = Math.floor(Math.log10(Math.abs(pc)));
  const mantissa = pc / Math.pow(10, exp);
  return `${mantissa.toFixed(1)}e${exp}`;
}

function formatTcaCountdown(tca: string): string {
  const diff = new Date(tca).getTime() - Date.now();
  if (diff < 0) return "TCA passed";
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

function formatLabel(value: string): string {
  return value
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

// ── Dynamic Chart Components ─────────────────────────────────────────────────

const tooltipStyle = {
  backgroundColor: "#1E293B",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: "8px",
  color: "#E2E8F0",
};

const axisTick = { fill: "#94A3B8", fontSize: 11 };
const gridStroke = "rgba(255,255,255,0.1)";

const CdmsPerWeekChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function CdmsPerWeekChartInner({
        data,
      }: {
        data: Array<{ week: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="week"
                tick={axisTick}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const EventsByStatusChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderStatusLabel = (props: any) =>
        `${formatLabel(String(props.status ?? ""))} ${((Number(props.percent) || 0) * 100).toFixed(0)}%`;
      return function EventsByStatusChartInner({
        data,
      }: {
        data: Array<{ status: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={renderStatusLabel}
                labelLine={false}
              >
                {data.map((_: unknown, i: number) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const EventsByTierChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } = mod;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const renderTierLabel = (props: any) =>
        `${formatLabel(String(props.tier ?? ""))} ${((Number(props.percent) || 0) * 100).toFixed(0)}%`;
      return function EventsByTierChartInner({
        data,
      }: {
        data: Array<{ tier: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                dataKey="count"
                nameKey="tier"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={renderTierLabel}
                labelLine={false}
              >
                {data.map((entry: { tier: string }, i: number) => (
                  <Cell
                    key={i}
                    fill={
                      TIER_CHART_COLORS[entry.tier] ||
                      CHART_COLORS[i % CHART_COLORS.length]
                    }
                  />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
            </PieChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const DecisionBreakdownChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function DecisionBreakdownChartInner({
        data,
      }: {
        data: Array<{ decision: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="decision"
                tick={axisTick}
                tickFormatter={formatLabel}
              />
              <YAxis tick={axisTick} />
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              <Tooltip
                contentStyle={tooltipStyle}
                labelFormatter={(label: any) => formatLabel(String(label))}
              />
              <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const PcDistributionChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        BarChart,
        Bar,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function PcDistributionChartInner({
        data,
      }: {
        data: Array<{ label: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis dataKey="label" tick={axisTick} />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

const EventsTimelineChart = dynamic(
  () =>
    import("recharts").then((mod) => {
      const {
        AreaChart,
        Area,
        XAxis,
        YAxis,
        CartesianGrid,
        Tooltip,
        ResponsiveContainer,
      } = mod;
      return function EventsTimelineChartInner({
        data,
      }: {
        data: Array<{ date: string; count: number }>;
      }) {
        return (
          <ResponsiveContainer width="100%" height={250}>
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
              <XAxis
                dataKey="date"
                tick={axisTick}
                tickFormatter={(v: string) => v.slice(5)}
              />
              <YAxis tick={axisTick} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#06B6D4"
                fill="#06B6D4"
                fillOpacity={0.2}
              />
            </AreaChart>
          </ResponsiveContainer>
        );
      };
    }),
  { ssr: false },
);

// ── Main Component ───────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export default function ShieldPage() {
  const router = useRouter();

  // ── State ────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<
    "events" | "analytics" | "settings"
  >("events");
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [totalEvents, setTotalEvents] = useState(0);
  const [analytics, setAnalytics] = useState<any>(null);
  const [config, setConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">(
    "idle",
  );

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [tierFilter, setTierFilter] = useState("");
  const [noradSearch, setNoradSearch] = useState("");
  const [offset, setOffset] = useState(0);

  // LeoLabs integration
  const [leolabsKey, setLeolabsKey] = useState("");
  const [leolabsEnabled, setLeolabsEnabled] = useState(false);
  const [leolabsTestResult, setLeolabsTestResult] = useState<
    "idle" | "testing" | "success" | "error"
  >("idle");

  // ── Data Fetching ────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/shield/stats");
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
      }
    } catch {
      /* silently fail */
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set("limit", String(LIMIT));
      params.set("offset", String(offset));
      if (statusFilter) params.set("status", statusFilter);
      if (tierFilter) params.set("riskTier", tierFilter);
      if (noradSearch) params.set("noradId", noradSearch);

      const res = await fetch(`/api/shield/events?${params}`);
      if (res.ok) {
        const json = await res.json();
        setEvents(json.data ?? []);
        setTotalEvents(json.meta?.total ?? 0);
      }
    } catch {
      /* silently fail */
    }
  }, [offset, statusFilter, tierFilter, noradSearch]);

  const fetchAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch("/api/shield/analytics");
      if (res.ok) {
        const json = await res.json();
        setAnalytics(json.data);
      }
    } catch {
      /* silently fail */
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  const fetchConfig = useCallback(async () => {
    setConfigLoading(true);
    try {
      const res = await fetch("/api/shield/config");
      if (res.ok) {
        const json = await res.json();
        setConfig(json.data);
      }
    } catch {
      /* silently fail */
    } finally {
      setConfigLoading(false);
    }
  }, []);

  // Initial load: stats + events
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchStats(), fetchEvents()]).finally(() => setLoading(false));
  }, [fetchStats, fetchEvents]);

  // Load analytics when tab selected
  useEffect(() => {
    if (activeTab === "analytics" && !analytics) {
      fetchAnalytics();
    }
  }, [activeTab, analytics, fetchAnalytics]);

  // Load config when tab selected
  useEffect(() => {
    if (activeTab === "settings" && !config) {
      fetchConfig();
    }
  }, [activeTab, config, fetchConfig]);

  // Reset offset when filters change
  useEffect(() => {
    setOffset(0);
  }, [statusFilter, tierFilter, noradSearch]);

  // ── Config Save ──────────────────────────────────────────────────────────

  const saveConfig = async () => {
    if (!config) return;
    setSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/shield/config", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({
          emergencyPcThreshold: config.emergencyPcThreshold,
          highPcThreshold: config.highPcThreshold,
          elevatedPcThreshold: config.elevatedPcThreshold,
          monitorPcThreshold: config.monitorPcThreshold,
          notifyOnTier: config.notifyOnTier,
          emergencyEmailAll: config.emergencyEmailAll,
          autoCloseAfterTcaHours: config.autoCloseAfterTcaHours,
          ncaAutoNotify: config.ncaAutoNotify,
          ncaJurisdiction: config.ncaJurisdiction || null,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setConfig(json.data);
        setSaveStatus("success");
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  // ── LeoLabs Test ─────────────────────────────────────────────────────────

  const handleTestLeolabs = async () => {
    if (!leolabsKey) return;
    setLeolabsTestResult("testing");
    try {
      const res = await fetch("/api/shield/config/test-leolabs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...csrfHeaders(),
        },
        body: JSON.stringify({ apiKey: leolabsKey }),
      });
      if (res.ok) {
        setLeolabsTestResult("success");
      } else {
        setLeolabsTestResult("error");
      }
    } catch {
      setLeolabsTestResult("error");
    } finally {
      setTimeout(() => setLeolabsTestResult("idle"), 4000);
    }
  };

  // ── Refresh handler ──────────────────────────────────────────────────────

  const handleRefresh = () => {
    setLoading(true);
    Promise.all([fetchStats(), fetchEvents()]).finally(() => setLoading(false));
  };

  // ── Tab definitions ──────────────────────────────────────────────────────

  const tabs = [
    { key: "events" as const, label: "Events", icon: Activity },
    { key: "analytics" as const, label: "Analytics", icon: BarChart3 },
    { key: "settings" as const, label: "Settings", icon: Settings },
  ];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--glass-bg-surface,transparent)]">
      <GlassMotion>
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-display-sm font-bold text-white flex items-center gap-3">
              <Shield className="w-7 h-7 text-emerald-400" />
              Shield
            </h1>
            <p className="text-slate-400 text-body-lg mt-1">
              Conjunction Assessment & Collision Avoidance Compliance
            </p>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-6 p-1 glass-elevated rounded-lg w-fit">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`
                    flex items-center gap-2 px-4 py-2 rounded-md text-small font-medium
                    transition-all duration-200
                    ${
                      activeTab === tab.key
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
                    }
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* ── Tab: Events ─────────────────────────────────────────────── */}
          {activeTab === "events" && (
            <div className="space-y-6">
              {/* Stats Row */}
              {stats && (
                <GlassStagger className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-emerald-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Active Events
                        </p>
                        <p className="text-display-sm font-bold text-white">
                          {stats.activeEvents}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-red-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Emergency
                        </p>
                        <p className="text-display-sm font-bold text-red-400">
                          {stats.emergencyCount}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-amber-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">High</p>
                        <p className="text-display-sm font-bold text-amber-400">
                          {stats.highCount}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-yellow-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Elevated
                        </p>
                        <p className="text-display-sm font-bold text-yellow-400">
                          {stats.elevatedCount}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-blue-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Monitor
                        </p>
                        <p className="text-display-sm font-bold text-blue-400">
                          {stats.monitorCount}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                  <motion.div variants={glassItemVariants}>
                    <Card variant="metric" className="border-t-orange-500">
                      <CardContent>
                        <p className="text-caption text-slate-400 mb-1">
                          Overdue
                        </p>
                        <p className="text-display-sm font-bold text-orange-400">
                          {stats.overdueDecisions}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.div>
                </GlassStagger>
              )}

              {/* Filter Bar */}
              <Card variant="elevated" padding="md">
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 min-w-0">
                    <label className="block text-caption text-slate-400 mb-1">
                      Status
                    </label>
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full h-9 px-3 bg-[var(--fill-inset)] border border-[var(--border-subtle)] rounded-[var(--v2-radius-sm)] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/20"
                    >
                      <option value="">All Statuses</option>
                      {STATUS_LIST.filter(Boolean).map((s) => (
                        <option key={s} value={s}>
                          {formatLabel(s)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <label className="block text-caption text-slate-400 mb-1">
                      Risk Tier
                    </label>
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="w-full h-9 px-3 bg-[var(--fill-inset)] border border-[var(--border-subtle)] rounded-[var(--v2-radius-sm)] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/20"
                    >
                      <option value="">All Tiers</option>
                      {TIER_LIST.filter(Boolean).map((t) => (
                        <option key={t} value={t}>
                          {formatLabel(t)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 min-w-0">
                    <Input
                      label="NORAD ID"
                      placeholder="Search by NORAD ID..."
                      value={noradSearch}
                      onChange={(e) => setNoradSearch(e.target.value)}
                    />
                  </div>
                  <Button
                    variant="secondary"
                    size="md"
                    icon={<RefreshCw className="w-4 h-4" />}
                    onClick={handleRefresh}
                    loading={loading}
                  >
                    Refresh
                  </Button>
                </div>
              </Card>

              {/* Event Cards */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : events.length === 0 ? (
                <Card variant="elevated" padding="lg">
                  <div className="text-center py-12">
                    <Shield className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-body-lg text-slate-400">
                      No conjunction events yet
                    </p>
                    <p className="text-small text-slate-500 mt-1">
                      CDM polling is active. Events will appear here when
                      conjunction data is received.
                    </p>
                  </div>
                </Card>
              ) : (
                <GlassStagger className="space-y-3">
                  {events.map((event: any) => (
                    <motion.div key={event.id} variants={glassItemVariants}>
                      <Card
                        variant="interactive"
                        padding="md"
                        onClick={() =>
                          router.push(`/dashboard/shield/${event.id}`)
                        }
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e: React.KeyboardEvent) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            router.push(`/dashboard/shield/${event.id}`);
                          }
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          {/* Left: ID + badges */}
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="min-w-0">
                              <p className="text-body font-medium text-white truncate">
                                {event.conjunctionId}
                              </p>
                              <p className="text-caption text-slate-500 mt-0.5">
                                {event.noradId}{" "}
                                <span className="text-slate-600 mx-1">
                                  &rarr;
                                </span>{" "}
                                {event.threatNoradId}
                              </p>
                            </div>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-micro font-semibold uppercase ${
                                TIER_COLORS[event.riskTier] ??
                                TIER_COLORS.INFORMATIONAL
                              }`}
                            >
                              {event.riskTier}
                            </span>
                            <span
                              className={`shrink-0 px-2 py-0.5 rounded-full text-micro font-medium ${
                                STATUS_COLORS[event.status] ?? STATUS_COLORS.NEW
                              }`}
                            >
                              {formatLabel(event.status)}
                            </span>
                          </div>

                          {/* Right: Metrics */}
                          <div className="flex items-center gap-6 text-small">
                            <div className="text-right">
                              <p className="text-slate-500 text-micro uppercase">
                                TCA
                              </p>
                              <p className="text-slate-300 font-medium flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTcaCountdown(event.tca)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-500 text-micro uppercase">
                                Pc
                              </p>
                              <p className="text-slate-300 font-mono font-medium">
                                {formatPc(event.latestPc)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-slate-500 text-micro uppercase">
                                Miss Dist
                              </p>
                              <p className="text-slate-300 font-mono font-medium">
                                {event.latestMissDistance !== null &&
                                event.latestMissDistance !== undefined
                                  ? `${event.latestMissDistance.toFixed(0)}m`
                                  : "N/A"}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </motion.div>
                  ))}
                </GlassStagger>
              )}

              {/* Pagination */}
              {totalEvents > LIMIT && (
                <div className="flex items-center justify-between">
                  <p className="text-small text-slate-500">
                    Showing {offset + 1}
                    &ndash;
                    {Math.min(offset + LIMIT, totalEvents)} of {totalEvents}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={offset === 0}
                      onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                      icon={<ChevronLeft className="w-4 h-4" />}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={offset + LIMIT >= totalEvents}
                      onClick={() => setOffset(offset + LIMIT)}
                      icon={<ChevronRight className="w-4 h-4" />}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Tab: Analytics ──────────────────────────────────────────── */}
          {activeTab === "analytics" && (
            <div className="space-y-6">
              {analyticsLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : analytics ? (
                <>
                  {/* Summary Metrics */}
                  <GlassStagger className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <motion.div variants={glassItemVariants}>
                      <Card variant="metric" className="border-t-cyan-500">
                        <CardContent>
                          <p className="text-caption text-slate-400 mb-1">
                            Avg Response Time
                          </p>
                          <p className="text-display-sm font-bold text-white">
                            {analytics.avgResponseTimeHours !== null &&
                            analytics.avgResponseTimeHours !== undefined
                              ? `${analytics.avgResponseTimeHours.toFixed(1)}h`
                              : "N/A"}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div variants={glassItemVariants}>
                      <Card variant="metric" className="border-t-amber-500">
                        <CardContent>
                          <p className="text-caption text-slate-400 mb-1">
                            Total Fuel Consumed
                          </p>
                          <p className="text-display-sm font-bold text-white">
                            {analytics.totalFuelConsumedPct.toFixed(2)}%
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                    <motion.div variants={glassItemVariants}>
                      <Card variant="metric" className="border-t-purple-500">
                        <CardContent>
                          <p className="text-caption text-slate-400 mb-1">
                            Maneuvers (90d)
                          </p>
                          <p className="text-display-sm font-bold text-white">
                            {analytics.maneuverCount}
                          </p>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </GlassStagger>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card variant="elevated" padding="md">
                      <CardHeader>
                        <CardTitle>CDMs per Week</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.cdmsPerWeek.length > 0 ? (
                          <CdmsPerWeekChart data={analytics.cdmsPerWeek} />
                        ) : (
                          <p className="text-small text-slate-500 text-center py-8">
                            No CDM data available
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card variant="elevated" padding="md">
                      <CardHeader>
                        <CardTitle>Events by Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.eventsByStatus.length > 0 ? (
                          <EventsByStatusChart
                            data={analytics.eventsByStatus}
                          />
                        ) : (
                          <p className="text-small text-slate-500 text-center py-8">
                            No event data available
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card variant="elevated" padding="md">
                      <CardHeader>
                        <CardTitle>Events by Risk Tier</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.eventsByTier.length > 0 ? (
                          <EventsByTierChart data={analytics.eventsByTier} />
                        ) : (
                          <p className="text-small text-slate-500 text-center py-8">
                            No tier data available
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card variant="elevated" padding="md">
                      <CardHeader>
                        <CardTitle>Decision Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.decisionBreakdown.length > 0 ? (
                          <DecisionBreakdownChart
                            data={analytics.decisionBreakdown}
                          />
                        ) : (
                          <p className="text-small text-slate-500 text-center py-8">
                            No decisions recorded yet
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card variant="elevated" padding="md">
                      <CardHeader>
                        <CardTitle>Pc Distribution</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.pcDistribution.some(
                          (b: any) => b.count > 0,
                        ) ? (
                          <PcDistributionChart
                            data={analytics.pcDistribution}
                          />
                        ) : (
                          <p className="text-small text-slate-500 text-center py-8">
                            No Pc data available
                          </p>
                        )}
                      </CardContent>
                    </Card>

                    <Card variant="elevated" padding="md">
                      <CardHeader>
                        <CardTitle>Events Timeline (90d)</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {analytics.eventsTimeline.length > 0 ? (
                          <EventsTimelineChart
                            data={buildTimelineData(analytics.eventsTimeline)}
                          />
                        ) : (
                          <p className="text-small text-slate-500 text-center py-8">
                            No timeline data available
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </>
              ) : (
                <Card variant="elevated" padding="lg">
                  <div className="text-center py-12">
                    <BarChart3 className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-body-lg text-slate-400">
                      Failed to load analytics data
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}

          {/* ── Tab: Settings ──────────────────────────────────────────── */}
          {activeTab === "settings" && (
            <div className="space-y-6">
              {configLoading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
                </div>
              ) : config ? (
                <Card variant="elevated" padding="lg">
                  <CardHeader>
                    <CardTitle>Conjunction Assessment Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Pc Thresholds */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        Probability of Collision Thresholds
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Emergency Pc Threshold"
                          type="number"
                          step="any"
                          value={config.emergencyPcThreshold}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              emergencyPcThreshold:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          hint="Events with Pc above this are classified as EMERGENCY"
                        />
                        <Input
                          label="High Pc Threshold"
                          type="number"
                          step="any"
                          value={config.highPcThreshold}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              highPcThreshold: parseFloat(e.target.value) || 0,
                            })
                          }
                          hint="Events with Pc above this are classified as HIGH"
                        />
                        <Input
                          label="Elevated Pc Threshold"
                          type="number"
                          step="any"
                          value={config.elevatedPcThreshold}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              elevatedPcThreshold:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          hint="Events with Pc above this are classified as ELEVATED"
                        />
                        <Input
                          label="Monitor Pc Threshold"
                          type="number"
                          step="any"
                          value={config.monitorPcThreshold}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              monitorPcThreshold:
                                parseFloat(e.target.value) || 0,
                            })
                          }
                          hint="Events with Pc above this are classified as MONITOR"
                        />
                      </div>
                    </div>

                    {/* Notification Settings */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        Notification Settings
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[13px] font-medium text-[var(--text-primary)] mb-1">
                            Notify on Tier
                          </label>
                          <select
                            value={config.notifyOnTier}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                notifyOnTier: e.target.value,
                              })
                            }
                            className="w-full h-9 px-3 bg-[var(--fill-inset)] border border-[var(--border-subtle)] rounded-[var(--v2-radius-sm)] text-body text-[var(--text-primary)] focus:outline-none focus:border-[var(--accent-500)] focus:ring-2 focus:ring-[var(--accent-500)]/20"
                          >
                            {TIER_LIST.filter(Boolean).map((t) => (
                              <option key={t} value={t}>
                                {formatLabel(t)} and above
                              </option>
                            ))}
                          </select>
                          <p className="text-[12px] text-[var(--text-tertiary)] mt-1">
                            Minimum tier that triggers notifications
                          </p>
                        </div>
                        <div className="flex items-center gap-3 pt-5">
                          <input
                            type="checkbox"
                            id="emergencyEmailAll"
                            checked={config.emergencyEmailAll}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                emergencyEmailAll: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <label
                            htmlFor="emergencyEmailAll"
                            className="text-body text-[var(--text-primary)]"
                          >
                            Email all team members on Emergency events
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Auto-Close Settings */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        Event Lifecycle
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Auto-Close After TCA (hours)"
                          type="number"
                          min={1}
                          max={168}
                          value={config.autoCloseAfterTcaHours}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              autoCloseAfterTcaHours:
                                parseInt(e.target.value) || 24,
                            })
                          }
                          hint="Automatically close events this many hours after TCA"
                        />
                      </div>
                    </div>

                    {/* NCA Settings */}
                    <div>
                      <h3 className="text-body font-semibold text-white mb-3">
                        NCA (National Competent Authority)
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center gap-3 pt-5">
                          <input
                            type="checkbox"
                            id="ncaAutoNotify"
                            checked={config.ncaAutoNotify}
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                ncaAutoNotify: e.target.checked,
                              })
                            }
                            className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                          />
                          <label
                            htmlFor="ncaAutoNotify"
                            className="text-body text-[var(--text-primary)]"
                          >
                            Automatically notify NCA for Emergency events
                          </label>
                        </div>
                        <Input
                          label="NCA Jurisdiction"
                          placeholder="e.g., DE, FR, UK"
                          value={config.ncaJurisdiction ?? ""}
                          onChange={(e) =>
                            setConfig({
                              ...config,
                              ncaJurisdiction: e.target.value || null,
                            })
                          }
                          hint="ISO country code of the responsible NCA"
                        />
                      </div>
                    </div>

                    {/* LeoLabs Integration */}
                    <div>
                      <div className="flex items-center gap-3 mb-3">
                        <h3 className="text-body font-semibold text-white">
                          LeoLabs Integration
                        </h3>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                            leolabsEnabled
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}
                        >
                          {leolabsEnabled ? "Connected" : "Disabled"}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Input
                            label="LeoLabs API Key"
                            type="password"
                            placeholder="Enter your LeoLabs API key"
                            value={leolabsKey}
                            onChange={(e) => setLeolabsKey(e.target.value)}
                            hint="Your LeoLabs BYOK (Bring Your Own Key) API credential"
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={handleTestLeolabs}
                              loading={leolabsTestResult === "testing"}
                              disabled={!leolabsKey}
                            >
                              Test Connection
                            </Button>
                            {leolabsTestResult === "success" && (
                              <span className="flex items-center gap-1.5 text-small text-emerald-400">
                                <CheckCircle2 className="w-4 h-4" />
                                Connection successful
                              </span>
                            )}
                            {leolabsTestResult === "error" && (
                              <span className="flex items-center gap-1.5 text-small text-red-400">
                                <XCircle className="w-4 h-4" />
                                Connection failed
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 pt-1">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              id="leolabsEnabled"
                              checked={leolabsEnabled}
                              onChange={(e) =>
                                setLeolabsEnabled(e.target.checked)
                              }
                              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500/20"
                            />
                            <label
                              htmlFor="leolabsEnabled"
                              className="text-body text-[var(--text-primary)]"
                            >
                              Enable LeoLabs as CDM data source
                            </label>
                          </div>
                          <p className="text-small text-[var(--text-tertiary)]">
                            LeoLabs provides independent conjunction assessments
                            via BYOK integration. CDMs from LeoLabs will be
                            merged with Space-Track data and tagged with a
                            source badge.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Save Button */}
                    <div className="flex items-center gap-4 pt-4 border-t border-[var(--separator)]">
                      <Button
                        variant="primary"
                        size="md"
                        onClick={saveConfig}
                        loading={saving}
                        icon={<Save className="w-4 h-4" />}
                      >
                        Save Configuration
                      </Button>
                      {saveStatus === "success" && (
                        <span className="flex items-center gap-1.5 text-small text-emerald-400">
                          <CheckCircle2 className="w-4 h-4" />
                          Configuration saved successfully
                        </span>
                      )}
                      {saveStatus === "error" && (
                        <span className="flex items-center gap-1.5 text-small text-red-400">
                          <XCircle className="w-4 h-4" />
                          Failed to save configuration
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card variant="elevated" padding="lg">
                  <div className="text-center py-12">
                    <Settings className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-body-lg text-slate-400">
                      Failed to load configuration
                    </p>
                  </div>
                </Card>
              )}
            </div>
          )}
        </div>
      </GlassMotion>
    </div>
  );
}

// ── Timeline Data Helper ─────────────────────────────────────────────────────

function buildTimelineData(
  events: Array<{ createdAt: string }>,
): Array<{ date: string; count: number }> {
  const dayMap = new Map<string, number>();
  for (const e of events) {
    const day = new Date(e.createdAt).toISOString().slice(0, 10);
    dayMap.set(day, (dayMap.get(day) ?? 0) + 1);
  }
  return Array.from(dayMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }));
}
