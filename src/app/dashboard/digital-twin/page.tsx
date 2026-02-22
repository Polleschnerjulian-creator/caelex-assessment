"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers,
  Shield,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Target,
  Clock,
  FileCheck,
  DollarSign,
  Zap,
  BarChart3,
  GitBranch,
  Calendar,
  Play,
  Star,
  Trash2,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ScatterChart,
  Scatter,
  ZAxis,
  Cell,
} from "recharts";
import { useLanguage } from "@/components/providers/LanguageProvider";

// ============================================================================
// Types
// ============================================================================

type TabId = "overview" | "frameworks" | "risk" | "scenarios" | "timeline";

interface TwinState {
  score: {
    overall: number;
    grade: string;
    euSpaceAct: number;
    nis2: number | null;
    maturityLevel: number;
    maturityLabel: string;
  };
  modules: Array<{
    id: string;
    name: string;
    score: number;
    weight: number;
    status: string;
    trend: number;
    evidencePct: number;
    nextDeadline: string | null;
    articleRefs: string[];
  }>;
  evidence: {
    total: number;
    accepted: number;
    expired: number;
    completePct: number;
  };
  deadlines: {
    total: number;
    overdue: number;
    dueSoon: number;
    completed: number;
    healthScore: number;
  };
  incidents: {
    open: number;
    critical: number;
    mttrHours: number | null;
    ncaOverdue: number;
  };
  risk: { maxPenaltyExposure: number; estimatedRiskEur: number };
  velocity: {
    daily: number;
    sevenDay: number;
    thirtyDay: number;
    trend: string;
  };
  requirements: {
    total: number;
    compliant: number;
    partial: number;
    nonCompliant: number;
    notAssessed: number;
  };
  history: Array<{ date: string; score: number; isForecast?: boolean }>;
  forecast: Array<{ date: string; score: number; isForecast?: boolean }>;
  alerts: Array<{
    id: string;
    type: string;
    severity: string;
    title: string;
    description: string;
    link?: string;
  }>;
}

interface FrameworkData {
  frameworks: Array<{
    id: string;
    name: string;
    score: number;
    status: string;
    requirementsTotal: number;
    requirementsCompliant: number;
    evidencePct: number;
    lastAssessed: string | null;
  }>;
  radarData: Array<{ framework: string; score: number }>;
}

interface RiskEntry {
  id: string;
  name: string;
  readiness: number;
  criticality: number;
  financialExposure: number;
  maxPenalty: number;
  riskFactor: number;
  riskZone: string;
}

interface Scenario {
  id: string;
  name: string;
  scenarioType: string;
  baselineScore: number;
  projectedScore: number;
  scoreDelta: number;
  parameters: Record<string, unknown>;
  results: Record<string, unknown>;
  createdAt: string;
  isFavorite: boolean;
  isStale: boolean;
  regulationVersion: string | null;
}

interface TimelineEntry {
  id: string;
  title: string;
  date: string;
  type: string;
  priority: string;
  status: string;
  module?: string;
}

// ============================================================================
// Data Hooks
// ============================================================================

function useFetchData<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setError(json.error || "Failed to load data");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// Helper Components
// ============================================================================

function ScoreGauge({
  score,
  grade,
  size = 180,
}: {
  score: number;
  grade: string;
  size?: number;
}) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius * 0.75; // 270-degree arc
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  const gradeColor =
    grade === "A"
      ? "#22C55E"
      : grade === "B"
        ? "#3B82F6"
        : grade === "C"
          ? "#F59E0B"
          : grade === "D"
            ? "#F97316"
            : "#EF4444";

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-[135deg]">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * 0.25}
          strokeLinecap="round"
        />
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={gradeColor}
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeLinecap="round"
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.5, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-[42px] font-light text-slate-900 dark:text-white tracking-tight">
          {score}
        </span>
        <span
          className="text-heading font-semibold"
          style={{ color: gradeColor }}
        >
          {grade}
        </span>
      </div>
    </div>
  );
}

function KPICard({
  title,
  value,
  subtitle,
  icon,
  color = "blue",
  trend,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ReactNode;
  color?: string;
  trend?: number;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-500/10 text-blue-500",
    purple: "bg-purple-500/10 text-purple-500",
    emerald: "bg-emerald-500/10 text-emerald-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
    rose: "bg-rose-500/10 text-rose-500",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 hover:border-slate-200 dark:hover:border-white/10 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-9 h-9 rounded-lg ${colorMap[color] || colorMap.blue} flex items-center justify-center`}
        >
          {icon}
        </div>
        {trend !== undefined && (
          <div className="flex items-center gap-1">
            {trend > 0 ? (
              <ArrowUpRight size={12} className="text-emerald-500" />
            ) : trend < 0 ? (
              <ArrowDownRight size={12} className="text-red-500" />
            ) : (
              <Minus size={12} className="text-slate-500 dark:text-white/45" />
            )}
            <span
              className={`text-caption font-medium ${trend > 0 ? "text-emerald-500" : trend < 0 ? "text-red-500" : "text-slate-500 dark:text-white/45"}`}
            >
              {trend > 0 ? "+" : ""}
              {trend}
            </span>
          </div>
        )}
      </div>
      <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-0.5">
        {title}
      </p>
      <p className="text-heading-lg font-light text-slate-900 dark:text-white tracking-tight">
        {value}
      </p>
      {subtitle && (
        <p className="text-caption text-slate-500 dark:text-white/45 mt-0.5">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 text-body font-medium rounded-lg transition-all ${
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-slate-500 dark:text-white/45 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/[0.03]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <RefreshCw size={24} className="animate-spin text-emerald-500" />
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Layers size={32} className="text-slate-300 dark:text-white/20 mb-3" />
      <p className="text-body-lg text-slate-900 dark:text-white mb-1">
        {title}
      </p>
      <p className="text-small text-slate-500 dark:text-white/45 max-w-md">
        {description}
      </p>
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500/10 text-red-400 border-red-500/20",
    high: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    medium: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    low: "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/45 border-slate-200 dark:border-white/10",
  };

  return (
    <span
      className={`text-micro px-2 py-0.5 rounded-full border font-medium ${colors[severity] || colors.low}`}
    >
      {severity}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    compliant: "bg-emerald-500/10 text-emerald-400",
    partial: "bg-amber-500/10 text-amber-400",
    non_compliant: "bg-red-500/10 text-red-400",
    not_started:
      "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/45",
    mostly_compliant: "bg-blue-500/10 text-blue-400",
  };

  const label = status
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <span
      className={`text-micro px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.not_started}`}
    >
      {label}
    </span>
  );
}

// ============================================================================
// Tab Components
// ============================================================================

function OverviewTab({ state }: { state: TwinState }) {
  const chartData = [
    ...state.history.map((p) => ({ ...p, type: "history" })),
    ...state.forecast.map((p) => ({ ...p, type: "forecast" })),
  ];

  return (
    <div className="space-y-6">
      {/* Trajectory Chart */}
      <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-subtitle font-medium text-slate-900 dark:text-white">
              Compliance Trajectory
            </h3>
            <p className="text-small text-slate-500 dark:text-white/45">
              12-month history + 90-day forecast
            </p>
          </div>
          <div className="flex items-center gap-4 text-caption">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-emerald-500 rounded" />
              <span className="text-slate-500 dark:text-white/45">History</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-0.5 bg-emerald-500/50 rounded border border-dashed border-emerald-500" />
              <span className="text-slate-500 dark:text-white/45">
                Forecast
              </span>
            </div>
          </div>
        </div>
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
              />
              <XAxis
                dataKey="date"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.slice(5)}
              />
              <YAxis
                domain={[0, 100]}
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{
                  background: "#0F172A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Area
                type="monotone"
                dataKey="score"
                stroke="#10B981"
                fill="url(#scoreGrad)"
                strokeWidth={2}
                strokeDasharray={undefined}
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Module Breakdown */}
      <div>
        <h3 className="text-subtitle font-medium text-slate-900 dark:text-white mb-3">
          Module Breakdown
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {state.modules.map((m) => (
            <div
              key={m.id}
              className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 hover:border-slate-200 dark:hover:border-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-body font-medium text-slate-900 dark:text-white">
                  {m.name}
                </span>
                <StatusBadge status={m.status} />
              </div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-display-sm font-light text-slate-900 dark:text-white">
                  {m.score}
                </span>
                {m.trend !== 0 && (
                  <span
                    className={`text-small flex items-center gap-0.5 ${m.trend > 0 ? "text-emerald-500" : "text-red-500"}`}
                  >
                    {m.trend > 0 ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {m.trend > 0 ? "+" : ""}
                    {m.trend}
                  </span>
                )}
              </div>
              <div className="w-full bg-slate-100 dark:bg-white/[0.06] rounded-full h-1.5 mb-2">
                <div
                  className={`h-1.5 rounded-full ${m.score >= 80 ? "bg-emerald-500" : m.score >= 50 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${m.score}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-caption text-slate-500 dark:text-white/45">
                <span>Weight: {Math.round(m.weight * 100)}%</span>
                {m.nextDeadline && (
                  <span>
                    Next: {new Date(m.nextDeadline).toLocaleDateString()}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alerts */}
      {state.alerts.length > 0 && (
        <div>
          <h3 className="text-subtitle font-medium text-slate-900 dark:text-white mb-3">
            Active Alerts
          </h3>
          <div className="space-y-2">
            {state.alerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                className={`flex items-start gap-3 p-3 rounded-lg border ${
                  alert.severity === "critical"
                    ? "bg-red-500/5 border-red-500/20"
                    : alert.severity === "high"
                      ? "bg-amber-500/5 border-amber-500/20"
                      : "bg-slate-50 dark:bg-white/[0.02] border-slate-100 dark:border-white/[0.06]"
                }`}
              >
                <AlertTriangle
                  size={16}
                  className={
                    alert.severity === "critical"
                      ? "text-red-500 mt-0.5"
                      : alert.severity === "high"
                        ? "text-amber-500 mt-0.5"
                        : "text-slate-500 dark:text-white/45 mt-0.5"
                  }
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-body font-medium text-slate-900 dark:text-white">
                      {alert.title}
                    </span>
                    <SeverityBadge severity={alert.severity} />
                  </div>
                  <p className="text-small text-slate-500 dark:text-white/45 mt-0.5">
                    {alert.description}
                  </p>
                </div>
                {alert.link && (
                  <a
                    href={alert.link}
                    className="text-caption text-emerald-400 hover:text-emerald-300 whitespace-nowrap flex items-center gap-0.5"
                  >
                    View <ChevronRight size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 text-center">
          <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-1">
            Requirements
          </p>
          <p className="text-heading-lg font-light text-slate-900 dark:text-white">
            {state.requirements.compliant}/{state.requirements.total}
          </p>
          <p className="text-caption text-slate-500 dark:text-white/45">
            covered
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 text-center">
          <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-1">
            Evidence Gaps
          </p>
          <p className="text-heading-lg font-light text-slate-900 dark:text-white">
            {state.evidence.total - state.evidence.accepted}
          </p>
          <p className="text-caption text-slate-500 dark:text-white/45">
            missing or expired
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 text-center">
          <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-1">
            Days Since Incident
          </p>
          <p className="text-heading-lg font-light text-slate-900 dark:text-white">
            {state.incidents.open === 0 ? "—" : state.incidents.open}
          </p>
          <p className="text-caption text-slate-500 dark:text-white/45">
            {state.incidents.open === 0 ? "no active" : "open"}
          </p>
        </div>
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-4 text-center">
          <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-1">
            30d Velocity
          </p>
          <p
            className={`text-heading-lg font-light ${state.velocity.thirtyDay > 0 ? "text-emerald-400" : state.velocity.thirtyDay < 0 ? "text-red-400" : "text-slate-900 dark:text-white"}`}
          >
            {state.velocity.thirtyDay > 0 ? "+" : ""}
            {state.velocity.thirtyDay}
          </p>
          <p className="text-caption text-slate-500 dark:text-white/45">
            pts/month
          </p>
        </div>
      </div>
    </div>
  );
}

function FrameworksTab() {
  const { data, loading } = useFetchData<FrameworkData>(
    "/api/digital-twin/frameworks",
  );

  if (loading) return <LoadingState />;
  if (!data || data.frameworks.length === 0)
    return (
      <EmptyState
        title="No Frameworks"
        description="Complete assessments to see framework comparison."
      />
    );

  return (
    <div className="space-y-6">
      {/* Radar Chart */}
      {data.radarData.length >= 3 && (
        <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-6">
          <h3 className="text-subtitle font-medium text-slate-900 dark:text-white mb-4">
            Framework Radar
          </h3>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={data.radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.08)" />
                <PolarAngleAxis
                  dataKey="framework"
                  tick={{ fontSize: 11, fill: "rgba(255,255,255,0.6)" }}
                />
                <PolarRadiusAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 10, fill: "rgba(255,255,255,0.3)" }}
                />
                <Radar
                  name="Score"
                  dataKey="score"
                  stroke="#10B981"
                  fill="#10B981"
                  fillOpacity={0.2}
                  strokeWidth={2}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h3 className="text-subtitle font-medium text-slate-900 dark:text-white">
            Framework Comparison
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <th className="text-left px-6 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Framework
                </th>
                <th className="text-center px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Score
                </th>
                <th className="text-center px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-center px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Requirements
                </th>
                <th className="text-center px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Last Assessed
                </th>
              </tr>
            </thead>
            <tbody>
              {data.frameworks.map((f) => (
                <tr
                  key={f.id}
                  className="border-b border-slate-100 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-3 text-body text-slate-900 dark:text-white font-medium">
                    {f.name}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`text-body-lg font-medium ${f.score >= 80 ? "text-emerald-400" : f.score >= 50 ? "text-amber-400" : "text-red-400"}`}
                    >
                      {f.score}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={f.status} />
                  </td>
                  <td className="px-4 py-3 text-center text-small text-slate-500 dark:text-white/45">
                    {f.requirementsCompliant}/{f.requirementsTotal}
                  </td>
                  <td className="px-4 py-3 text-center text-small text-slate-500 dark:text-white/45">
                    {f.lastAssessed
                      ? new Date(f.lastAssessed).toLocaleDateString()
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function RiskTab() {
  const { data, loading } = useFetchData<RiskEntry[]>("/api/digital-twin/risk");

  if (loading) return <LoadingState />;
  if (!data || data.length === 0)
    return (
      <EmptyState
        title="No Risk Data"
        description="Complete compliance assessments to view risk matrix."
      />
    );

  const riskColors: Record<string, string> = {
    critical: "#EF4444",
    high: "#F59E0B",
    medium: "#3B82F6",
    low: "#22C55E",
  };

  const totalExposure = data.reduce((sum, e) => sum + e.financialExposure, 0);

  return (
    <div className="space-y-6">
      {/* Bubble Chart */}
      <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-subtitle font-medium text-slate-900 dark:text-white">
              Risk Landscape
            </h3>
            <p className="text-small text-slate-500 dark:text-white/45">
              X: Readiness (score) | Y: Criticality (weight) | Size: Financial
              exposure
            </p>
          </div>
          <div className="flex items-center gap-3 text-micro">
            {["low", "medium", "high", "critical"].map((zone) => (
              <div key={zone} className="flex items-center gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: riskColors[zone] }}
                />
                <span className="text-slate-500 dark:text-white/45 capitalize">
                  {zone}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.04)"
              />
              <XAxis
                type="number"
                dataKey="readiness"
                domain={[0, 100]}
                name="Readiness"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Readiness →",
                  position: "bottom",
                  fill: "rgba(255,255,255,0.4)",
                  fontSize: 11,
                }}
              />
              <YAxis
                type="number"
                dataKey="criticality"
                domain={[0, 100]}
                name="Criticality"
                stroke="rgba(255,255,255,0.3)"
                tick={{ fontSize: 11 }}
                label={{
                  value: "Criticality →",
                  angle: -90,
                  position: "insideLeft",
                  fill: "rgba(255,255,255,0.4)",
                  fontSize: 11,
                }}
              />
              <ZAxis
                type="number"
                dataKey="financialExposure"
                range={[100, 1000]}
              />
              <Tooltip
                contentStyle={{
                  background: "#0F172A",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "8px",
                  fontSize: "12px",
                }}
              />
              <Scatter data={data} name="Modules">
                {data.map((entry) => (
                  <Cell
                    key={entry.id}
                    fill={riskColors[entry.riskZone] || riskColors.low}
                    fillOpacity={0.7}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Financial Exposure Table */}
      <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-white/[0.06]">
          <h3 className="text-subtitle font-medium text-slate-900 dark:text-white">
            Financial Exposure
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-white/[0.06]">
                <th className="text-left px-6 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Framework
                </th>
                <th className="text-right px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Max Penalty
                </th>
                <th className="text-center px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Score
                </th>
                <th className="text-center px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Risk Factor
                </th>
                <th className="text-right px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Adjusted Risk
                </th>
                <th className="text-center px-4 py-3 text-caption font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider">
                  Zone
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((entry) => (
                <tr
                  key={entry.id}
                  className="border-b border-slate-100 dark:border-white/[0.04] hover:bg-slate-50 dark:hover:bg-white/[0.02]"
                >
                  <td className="px-6 py-3 text-body text-slate-900 dark:text-white font-medium">
                    {entry.name}
                  </td>
                  <td className="px-4 py-3 text-right text-small text-slate-500 dark:text-white/45">
                    EUR {(entry.maxPenalty / 1_000_000).toFixed(1)}M
                  </td>
                  <td className="px-4 py-3 text-center text-body font-medium text-slate-900 dark:text-white">
                    {entry.readiness}
                  </td>
                  <td className="px-4 py-3 text-center text-small text-slate-500 dark:text-white/45">
                    {entry.riskFactor}%
                  </td>
                  <td
                    className="px-4 py-3 text-right text-body font-medium"
                    style={{ color: riskColors[entry.riskZone] }}
                  >
                    EUR {(entry.financialExposure / 1_000_000).toFixed(1)}M
                  </td>
                  <td className="px-4 py-3 text-center">
                    <SeverityBadge severity={entry.riskZone} />
                  </td>
                </tr>
              ))}
              <tr className="bg-slate-50 dark:bg-white/[0.03]">
                <td
                  className="px-6 py-3 text-body text-slate-900 dark:text-white font-semibold"
                  colSpan={4}
                >
                  Total Estimated Risk Exposure
                </td>
                <td className="px-4 py-3 text-right text-body-lg font-semibold text-amber-400">
                  EUR {(totalExposure / 1_000_000).toFixed(1)}M
                </td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ScenariosTab() {
  const {
    data: scenarios,
    loading,
    refetch,
  } = useFetchData<Scenario[]>("/api/digital-twin/scenarios");
  const [scenarioType, setScenarioType] = useState<string>("add_jurisdiction");
  const [name, setName] = useState("");
  const [params, setParams] = useState<Record<string, unknown>>({});
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [comparing, setComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const scenarioTypes: Array<{
    value: string;
    label: string;
    paramFields: Array<{
      key: string;
      label: string;
      type: string;
      options?: string[];
    }>;
  }> = [
    {
      value: "add_jurisdiction",
      label: "Add Jurisdiction",
      paramFields: [
        {
          key: "jurisdictionCode",
          label: "Jurisdiction",
          type: "select",
          options: ["FR", "UK", "BE", "NL", "LU", "AT", "DK", "DE", "IT", "NO"],
        },
      ],
    },
    {
      value: "change_operator_type",
      label: "Change Operator Type",
      paramFields: [
        {
          key: "newOperatorType",
          label: "New Type",
          type: "select",
          options: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
        },
        {
          key: "currentOperatorType",
          label: "Current Type",
          type: "select",
          options: ["SCO", "LO", "LSO", "ISOS", "CAP", "PDP", "TCO"],
        },
      ],
    },
    {
      value: "add_satellites",
      label: "Add Satellites",
      paramFields: [
        {
          key: "additionalSatellites",
          label: "Additional Satellites",
          type: "number",
        },
        {
          key: "currentFleetSize",
          label: "Current Fleet Size",
          type: "number",
        },
      ],
    },
    {
      value: "expand_operations",
      label: "Expand Operations",
      paramFields: [
        { key: "newMemberStates", label: "New Member States", type: "number" },
        {
          key: "groundInfra",
          label: "Ground Infrastructure",
          type: "checkbox",
        },
        { key: "satcom", label: "SATCOM Services", type: "checkbox" },
      ],
    },
    {
      value: "composite",
      label: "Composite (Multi-Change)",
      paramFields: [],
    },
  ];

  const currentScenario = scenarioTypes.find((s) => s.value === scenarioType);

  const handleRun = async () => {
    if (!name.trim()) return;
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/digital-twin/scenarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioType, name, parameters: params }),
      });
      const json = await res.json();
      if (json.success) {
        setResult(json.data.result);
        refetch();
      }
    } catch {
      // ignore
    } finally {
      setRunning(false);
    }
  };

  const handleDelete = async (id: string) => {
    await fetch(`/api/digital-twin/scenarios/${id}`, { method: "DELETE" });
    refetch();
  };

  const handleToggleFavorite = async (id: string, current: boolean) => {
    await fetch(`/api/digital-twin/scenarios/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isFavorite: !current }),
    });
    refetch();
  };

  const handleRecompute = async (id: string) => {
    await fetch("/api/digital-twin/scenarios/recompute", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scenarioId: id }),
    });
    refetch();
  };

  const handleCompare = async () => {
    if (selectedForCompare.length < 2) return;
    setComparing(true);
    setCompareResult(null);
    try {
      const res = await fetch("/api/digital-twin/scenarios/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarioIds: selectedForCompare }),
      });
      const json = await res.json();
      if (json.success) {
        setCompareResult(json.data);
      }
    } catch {
      // ignore
    } finally {
      setComparing(false);
    }
  };

  const toggleCompareSelection = (id: string) => {
    setSelectedForCompare((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length < 4
          ? [...prev, id]
          : prev,
    );
  };

  const filteredScenarios = scenarios?.filter(
    (s) => !showFavoritesOnly || s.isFavorite,
  );

  const simResult = result as SimulationResult | null;

  return (
    <div className="space-y-6">
      {/* Scenario Builder */}
      <div className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-6">
        <h3 className="text-subtitle font-medium text-slate-900 dark:text-white mb-4">
          Scenario Builder
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider block mb-1.5">
              Scenario Type
            </label>
            <select
              value={scenarioType}
              onChange={(e) => {
                setScenarioType(e.target.value);
                setParams({});
                setResult(null);
              }}
              className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-body text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
            >
              {scenarioTypes.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider block mb-1.5">
              Scenario Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Expand to Italy"
              className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-body text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-white/30 focus:outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* Dynamic Parameter Fields */}
        {currentScenario?.paramFields && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            {currentScenario.paramFields.map((field) => (
              <div key={field.key}>
                <label className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider block mb-1.5">
                  {field.label}
                </label>
                {field.type === "select" ? (
                  <select
                    value={(params[field.key] as string) || ""}
                    onChange={(e) =>
                      setParams({ ...params, [field.key]: e.target.value })
                    }
                    className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-body text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="">Select...</option>
                    {field.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : field.type === "number" ? (
                  <input
                    type="number"
                    value={(params[field.key] as number) || ""}
                    onChange={(e) =>
                      setParams({
                        ...params,
                        [field.key]: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-body text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                  />
                ) : field.type === "checkbox" ? (
                  <label className="flex items-center gap-2 mt-1.5">
                    <input
                      type="checkbox"
                      checked={(params[field.key] as boolean) || false}
                      onChange={(e) =>
                        setParams({ ...params, [field.key]: e.target.checked })
                      }
                      className="rounded border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/[0.05] text-emerald-500 focus:ring-emerald-500"
                    />
                    <span className="text-small text-slate-500 dark:text-white/45">
                      Include
                    </span>
                  </label>
                ) : null}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={handleRun}
          disabled={running || !name.trim()}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-100 dark:disabled:bg-white/10 disabled:text-slate-400 dark:disabled:text-white/30 text-white rounded-lg text-body font-medium transition-colors"
        >
          {running ? (
            <RefreshCw size={14} className="animate-spin" />
          ) : (
            <Play size={14} />
          )}
          {running ? "Running..." : "Run Simulation"}
        </button>
      </div>

      {/* Results */}
      {simResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-xl p-6"
        >
          <h3 className="text-subtitle font-medium text-slate-900 dark:text-white mb-4">
            Simulation Results
          </h3>

          {/* Score Comparison */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-slate-100 dark:bg-white/[0.03] rounded-xl">
              <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-1">
                Baseline
              </p>
              <p className="text-display font-light text-slate-900 dark:text-white">
                {simResult.baselineScore}
              </p>
            </div>
            <div className="text-center p-4 bg-slate-100 dark:bg-white/[0.03] rounded-xl">
              <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-1">
                Projected
              </p>
              <p className="text-display font-light text-blue-400">
                {simResult.projectedScore}
              </p>
            </div>
            <div className="text-center p-4 bg-slate-100 dark:bg-white/[0.03] rounded-xl">
              <p className="text-caption text-slate-500 dark:text-white/45 uppercase tracking-wider mb-1">
                Delta
              </p>
              <p
                className={`text-display font-light ${simResult.scoreDelta >= 0 ? "text-emerald-400" : "text-red-400"}`}
              >
                {simResult.scoreDelta >= 0 ? "+" : ""}
                {simResult.scoreDelta}
              </p>
            </div>
          </div>

          {/* Financial Impact */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg">
              <p className="text-caption text-slate-500 dark:text-white/45 mb-0.5">
                Current Exposure
              </p>
              <p className="text-body-lg text-slate-900 dark:text-white font-medium">
                EUR{" "}
                {(
                  simResult.financialImpact.currentExposure / 1_000_000
                ).toFixed(1)}
                M
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg">
              <p className="text-caption text-slate-500 dark:text-white/45 mb-0.5">
                Projected Exposure
              </p>
              <p className="text-body-lg text-amber-400 font-medium">
                EUR{" "}
                {(
                  simResult.financialImpact.projectedExposure / 1_000_000
                ).toFixed(1)}
                M
              </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-white/[0.02] rounded-lg">
              <p className="text-caption text-slate-500 dark:text-white/45 mb-0.5">
                Additional Risk
              </p>
              <p
                className={`text-body-lg font-medium ${simResult.financialImpact.delta >= 0 ? "text-red-400" : "text-emerald-400"}`}
              >
                {simResult.financialImpact.delta >= 0 ? "+" : ""}EUR{" "}
                {(simResult.financialImpact.delta / 1_000_000).toFixed(1)}M
              </p>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="p-4 bg-slate-50 dark:bg-white/[0.02] rounded-lg mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Info size={14} className="text-slate-500 dark:text-white/45" />
              <span className="text-small font-medium text-slate-900 dark:text-white">
                Risk Assessment
              </span>
              <SeverityBadge severity={simResult.riskAssessment.level} />
            </div>
            <p className="text-small text-slate-500 dark:text-white/45">
              {simResult.riskAssessment.summary}
            </p>
          </div>

          {/* New Requirements */}
          {simResult.newRequirements.length > 0 && (
            <div className="mb-4">
              <p className="text-small font-medium text-slate-900 dark:text-white mb-2">
                New Requirements ({simResult.newRequirements.length})
              </p>
              <div className="space-y-1.5">
                {simResult.newRequirements.map((req) => (
                  <div
                    key={req.id}
                    className="flex items-center gap-2 text-small"
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${req.type === "new" ? "bg-amber-500" : req.type === "removed" ? "bg-emerald-500" : "bg-blue-500"}`}
                    />
                    <span className="text-slate-700 dark:text-white/70">
                      {req.title}
                    </span>
                    <span className="text-slate-400 dark:text-white/30">
                      — {req.framework}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {simResult.recommendations.length > 0 && (
            <div>
              <p className="text-small font-medium text-slate-900 dark:text-white mb-2">
                Recommendations
              </p>
              <ul className="space-y-1">
                {simResult.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="text-small text-slate-500 dark:text-white/45 flex items-start gap-2"
                  >
                    <span className="text-emerald-500 mt-0.5">•</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </motion.div>
      )}

      {/* Comparison Result */}
      {compareResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 dark:bg-white/[0.03] border border-emerald-500/20 rounded-xl p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-subtitle font-medium text-slate-900 dark:text-white">
              Scenario Comparison
            </h3>
            <button
              onClick={() => {
                setCompareResult(null);
                setSelectedForCompare([]);
              }}
              className="text-small text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70"
            >
              Clear
            </button>
          </div>
          {(
            compareResult as {
              recommendation?: { bestScenarioName?: string; reason?: string };
            }
          ).recommendation && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg mb-4">
              <p className="text-small font-medium text-emerald-400 mb-1">
                Recommended:{" "}
                {
                  (
                    compareResult as {
                      recommendation: { bestScenarioName: string };
                    }
                  ).recommendation.bestScenarioName
                }
              </p>
              <p className="text-small text-slate-500 dark:text-white/45">
                {
                  (compareResult as { recommendation: { reason: string } })
                    .recommendation.reason
                }
              </p>
            </div>
          )}
          {(
            compareResult as {
              dimensions?: Array<{
                dimension: string;
                values: Array<{ scenarioId: string; label: string }>;
              }>;
            }
          ).dimensions && (
            <div className="overflow-x-auto">
              <table className="w-full text-small">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-white/10">
                    <th className="text-left py-2 text-slate-500 dark:text-white/45">
                      Dimension
                    </th>
                    {(
                      compareResult as { scenarios: Array<{ name: string }> }
                    ).scenarios?.map((s: { name: string }, i: number) => (
                      <th
                        key={i}
                        className="text-right py-2 text-slate-500 dark:text-white/45"
                      >
                        {s.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(
                    compareResult as {
                      dimensions: Array<{
                        dimension: string;
                        values: Array<{ label: string }>;
                      }>;
                    }
                  ).dimensions.map((dim, i) => (
                    <tr
                      key={i}
                      className="border-b border-slate-100 dark:border-white/5"
                    >
                      <td className="py-2 text-slate-700 dark:text-white/70">
                        {dim.dimension}
                      </td>
                      {dim.values.map((v, j) => (
                        <td
                          key={j}
                          className="py-2 text-right text-slate-900 dark:text-white"
                        >
                          {v.label}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </motion.div>
      )}

      {/* Saved Scenarios */}
      {!loading && filteredScenarios && filteredScenarios.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-subtitle font-medium text-slate-900 dark:text-white">
              Saved Scenarios
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
                className={`flex items-center gap-1.5 text-small px-3 py-1.5 rounded-lg transition-colors ${
                  showFavoritesOnly
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "text-slate-500 dark:text-white/45 hover:text-slate-700 dark:hover:text-white/70"
                }`}
              >
                <Star
                  size={12}
                  className={showFavoritesOnly ? "fill-amber-400" : ""}
                />
                Favorites
              </button>
              {selectedForCompare.length >= 2 && (
                <button
                  onClick={handleCompare}
                  disabled={comparing}
                  className="flex items-center gap-1.5 text-small px-3 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg hover:bg-blue-500/20 transition-colors disabled:opacity-50"
                >
                  {comparing ? (
                    <RefreshCw size={12} className="animate-spin" />
                  ) : (
                    <BarChart3 size={12} />
                  )}
                  Compare ({selectedForCompare.length})
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredScenarios.map((s) => (
              <div
                key={s.id}
                className={`bg-slate-50 dark:bg-white/[0.03] border rounded-xl p-4 transition-colors ${
                  selectedForCompare.includes(s.id)
                    ? "border-blue-500/40 bg-blue-500/5 dark:bg-blue-500/5"
                    : s.isStale
                      ? "border-amber-500/20"
                      : "border-slate-100 dark:border-white/[0.06] hover:border-slate-200 dark:hover:border-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedForCompare.includes(s.id)}
                      onChange={() => toggleCompareSelection(s.id)}
                      className="rounded border-slate-300 dark:border-white/20 bg-slate-50 dark:bg-white/[0.05] text-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-body font-medium text-slate-900 dark:text-white">
                      {s.name}
                    </span>
                    {s.isStale && (
                      <span className="text-micro px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                        STALE
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleToggleFavorite(s.id, s.isFavorite)}
                      className={`transition-colors ${
                        s.isFavorite
                          ? "text-amber-400"
                          : "text-slate-400 dark:text-white/30 hover:text-amber-400"
                      }`}
                    >
                      <Star
                        size={14}
                        className={s.isFavorite ? "fill-amber-400" : ""}
                      />
                    </button>
                    {s.isStale && (
                      <button
                        onClick={() => handleRecompute(s.id)}
                        className="text-slate-400 dark:text-white/30 hover:text-emerald-400 transition-colors"
                        title="Recompute with latest engine data"
                      >
                        <RefreshCw size={14} />
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="text-slate-400 dark:text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-small text-slate-500 dark:text-white/45">
                  <span className="capitalize">
                    {s.scenarioType.replace(/_/g, " ")}
                  </span>
                  <span>•</span>
                  <span
                    className={
                      s.scoreDelta >= 0 ? "text-emerald-400" : "text-red-400"
                    }
                  >
                    {s.scoreDelta >= 0 ? "+" : ""}
                    {s.scoreDelta} pts
                  </span>
                  <span>•</span>
                  <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface SimulationResult {
  baselineScore: number;
  projectedScore: number;
  scoreDelta: number;
  newRequirements: Array<{
    id: string;
    title: string;
    framework: string;
    type: string;
    impact?: string;
    description?: string;
  }>;
  financialImpact: {
    currentExposure: number;
    projectedExposure: number;
    delta: number;
  };
  riskAssessment: { level: string; summary: string };
  recommendations: string[];
  stepResults?: SimulationResult[];
  interactionEffects?: string[];
  steps?: Array<{
    name: string;
    result: SimulationResult;
    cumulativeScore: number;
  }>;
}

function TimelineTab() {
  const { data, loading } = useFetchData<TimelineEntry[]>(
    "/api/digital-twin/timeline",
  );

  if (loading) return <LoadingState />;
  if (!data || data.length === 0)
    return (
      <EmptyState
        title="No Timeline Events"
        description="Create deadlines, add evidence, and set milestones to populate your timeline."
      />
    );

  const priorityColors: Record<string, string> = {
    CRITICAL: "bg-red-500",
    HIGH: "bg-amber-500",
    MEDIUM: "bg-blue-500",
    LOW: "bg-slate-400 dark:bg-white/30",
  };

  const typeIcons: Record<string, typeof Clock> = {
    deadline: Clock,
    evidence_expiry: FileCheck,
    milestone: Target,
  };

  // Group by month
  const grouped: Record<string, TimelineEntry[]> = {};
  for (const entry of data) {
    const month = new Date(entry.date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
    });
    if (!grouped[month]) grouped[month] = [];
    grouped[month].push(entry);
  }

  return (
    <div className="space-y-6">
      {Object.entries(grouped).map(([month, entries]) => (
        <div key={month}>
          <h3 className="text-body font-medium text-slate-500 dark:text-white/45 uppercase tracking-wider mb-3">
            {month}
          </h3>
          <div className="space-y-2">
            {entries.map((entry) => {
              const Icon = typeIcons[entry.type] || Clock;
              return (
                <div
                  key={entry.id}
                  className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-lg hover:border-slate-200 dark:hover:border-white/10 transition-colors"
                >
                  <div
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityColors[entry.priority] || priorityColors.MEDIUM}`}
                  />
                  <Icon
                    size={14}
                    className="text-slate-500 dark:text-white/45 flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <span className="text-body text-slate-900 dark:text-white">
                      {entry.title}
                    </span>
                    {entry.module && (
                      <span className="text-caption text-slate-500 dark:text-white/45 ml-2">
                        ({entry.module})
                      </span>
                    )}
                  </div>
                  <span className="text-small text-slate-500 dark:text-white/45 flex-shrink-0">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                  <span
                    className={`text-micro px-2 py-0.5 rounded-full ${
                      entry.status === "COMPLETED"
                        ? "bg-emerald-500/10 text-emerald-400"
                        : entry.status === "OVERDUE"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-slate-50 dark:bg-white/5 text-slate-500 dark:text-white/45"
                    }`}
                  >
                    {entry.status.replace(/_/g, " ").toLowerCase()}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function DigitalTwinPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const { t } = useLanguage();
  const {
    data: twinState,
    loading,
    error,
    refetch,
  } = useFetchData<TwinState>("/api/digital-twin/overview");

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: t("digitalTwin.tabOverview"),
      icon: <BarChart3 size={14} />,
    },
    {
      id: "frameworks",
      label: t("digitalTwin.tabFrameworks"),
      icon: <Shield size={14} />,
    },
    {
      id: "risk",
      label: t("digitalTwin.tabRisk"),
      icon: <Target size={14} />,
    },
    {
      id: "scenarios",
      label: t("digitalTwin.tabScenarios"),
      icon: <GitBranch size={14} />,
    },
    {
      id: "timeline",
      label: t("digitalTwin.tabTimeline"),
      icon: <Calendar size={14} />,
    },
  ];

  const formatEur = (amount: number) => {
    if (amount >= 1_000_000) return `EUR ${(amount / 1_000_000).toFixed(1)}M`;
    if (amount >= 1_000) return `EUR ${(amount / 1_000).toFixed(0)}K`;
    return `EUR ${amount}`;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
            <Layers size={20} className="text-emerald-400" />
          </div>
          <div>
            <h1 className="text-heading-lg font-semibold text-slate-900 dark:text-white">
              {t("digitalTwin.title")}
            </h1>
            <p className="text-body text-slate-500 dark:text-white/45">
              {t("digitalTwin.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Hero KPIs */}
      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="text-center py-12">
          <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
          <p className="text-body-lg text-slate-900 dark:text-white mb-1">
            Failed to load data
          </p>
          <p className="text-small text-slate-500 dark:text-white/45 mb-4">
            {error}
          </p>
          <button
            onClick={refetch}
            className="text-small text-emerald-400 hover:text-emerald-300"
          >
            Retry
          </button>
        </div>
      ) : twinState ? (
        <>
          {/* Score Gauge + KPIs */}
          <div className="flex flex-col lg:flex-row gap-6 mb-8">
            <div className="flex items-center justify-center lg:justify-start">
              <ScoreGauge
                score={twinState.score.overall}
                grade={twinState.score.grade}
              />
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
              <KPICard
                title="Overall Score"
                value={String(twinState.score.overall)}
                icon={<BarChart3 size={16} />}
                color="blue"
                trend={twinState.velocity.sevenDay}
              />
              <KPICard
                title="Maturity Level"
                value={`L${twinState.score.maturityLevel}`}
                subtitle={twinState.score.maturityLabel}
                icon={<Layers size={16} />}
                color="purple"
              />
              <KPICard
                title="Evidence Coverage"
                value={`${twinState.evidence.completePct}%`}
                subtitle={`${twinState.evidence.accepted}/${twinState.evidence.total}`}
                icon={<FileCheck size={16} />}
                color={
                  twinState.evidence.completePct >= 80
                    ? "emerald"
                    : twinState.evidence.completePct >= 50
                      ? "amber"
                      : "red"
                }
              />
              <KPICard
                title="Deadline Health"
                value={`${twinState.deadlines.healthScore}%`}
                subtitle={
                  twinState.deadlines.overdue > 0
                    ? `${twinState.deadlines.overdue} overdue`
                    : "All on track"
                }
                icon={<Clock size={16} />}
                color={twinState.deadlines.overdue === 0 ? "emerald" : "red"}
              />
              <KPICard
                title="Risk Exposure"
                value={formatEur(twinState.risk.estimatedRiskEur)}
                subtitle={`Max: ${formatEur(twinState.risk.maxPenaltyExposure)}`}
                icon={<DollarSign size={16} />}
                color={
                  twinState.risk.estimatedRiskEur > 5_000_000
                    ? "red"
                    : twinState.risk.estimatedRiskEur > 1_000_000
                      ? "amber"
                      : "emerald"
                }
              />
              <KPICard
                title="Velocity"
                value={`${twinState.velocity.thirtyDay > 0 ? "+" : ""}${twinState.velocity.thirtyDay}pts/mo`}
                subtitle={twinState.velocity.trend}
                icon={
                  twinState.velocity.trend === "improving" ? (
                    <TrendingUp size={16} />
                  ) : twinState.velocity.trend === "declining" ? (
                    <TrendingDown size={16} />
                  ) : (
                    <Minus size={16} />
                  )
                }
                color={
                  twinState.velocity.trend === "improving"
                    ? "emerald"
                    : twinState.velocity.trend === "declining"
                      ? "red"
                      : "blue"
                }
              />
            </div>
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-white/[0.06]">
            {tabs.map((tab) => (
              <TabButton
                key={tab.id}
                active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
                icon={tab.icon}
                label={tab.label}
              />
            ))}
          </div>

          {/* Tab Content */}
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === "overview" && <OverviewTab state={twinState} />}
              {activeTab === "frameworks" && <FrameworksTab />}
              {activeTab === "risk" && <RiskTab />}
              {activeTab === "scenarios" && <ScenariosTab />}
              {activeTab === "timeline" && <TimelineTab />}
            </motion.div>
          </AnimatePresence>
        </>
      ) : null}
    </div>
  );
}
