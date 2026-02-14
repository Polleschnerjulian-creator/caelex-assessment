"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  DollarSign,
  Activity,
  Users,
  Megaphone,
  Server,
  RefreshCw,
  Download,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Zap,
  Target,
  CreditCard,
  UserPlus,
  BarChart3,
  LineChart,
  Sparkles,
  Globe,
  FileText,
  Rocket,
} from "lucide-react";
import {
  LineChart as RechartsLineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
} from "recharts";

// ============================================================================
// TYPES
// ============================================================================

type TimeRange = "7d" | "30d" | "90d" | "12m";
type TabId =
  | "overview"
  | "revenue"
  | "product"
  | "customers"
  | "acquisition"
  | "infrastructure";

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color?: "emerald" | "blue" | "amber" | "red" | "purple";
  sparklineData?: number[];
  loading?: boolean;
}

interface AlertItem {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  description: string;
  timestamp: string;
  actionLabel?: string;
  actionHref?: string;
}

interface OverviewData {
  metrics: {
    organizations: { total: number; active: number; growth: number };
    users: { total: number; active: number; growth: number };
    revenue: { total: number; mrr: number; growth: number };
    engagement: {
      assessments: number;
      documents: number;
      topEvents: { type: string; count: number }[];
    };
  };
  trends: { dau: { date: string; value: number }[] };
}

interface RevenueData {
  metrics: {
    mrr: number;
    arr: number;
    arpu: number;
    ltv: number;
    churnRate: number;
    nrr: number;
    activeCustomers: number;
    newSubscriptions: number;
    churnedSubscriptions: number;
  };
  trends: {
    mrr: { date: string; mrr: number; invoices: number }[];
    period: { date: string; revenue: number }[];
  };
  breakdown: {
    plan: string;
    revenue: number;
    customers: number;
    percentage: number;
  }[];
}

interface ProductData {
  metrics: {
    assessments: {
      total: number;
      breakdown: { type: string; count: number; percentage: number }[];
    };
    engagement: {
      pageViews: number;
      avgSessionMinutes: number;
      spacecraftRegistered: number;
    };
    documents: { total: number; breakdown: { type: string; count: number }[] };
    workflows: {
      total: number;
      breakdown: { status: string; count: number }[];
    };
  };
  usage: {
    modules: { module: string; views: number }[];
    features: { feature: string; uses: number }[];
  };
  trends: { pageViews: { date: string; views: number; uniqueUsers: number }[] };
}

interface CustomersData {
  metrics: {
    total: number;
    paid: number;
    trial: number;
    free: number;
    newInPeriod: number;
    avgUsersPerOrg: number;
  };
  segments: {
    byPlan: { plan: string; count: number }[];
    bySize: { size: string; count: number }[];
  };
  funnel: { stage: string; count: number; rate: number }[];
  trends: { signups: { date: string; signups: number }[] };
  atRisk: {
    organization: string;
    score: number;
    trend: string;
    riskLevel: string;
  }[];
  topCustomers: {
    name: string;
    plan: string;
    mrr: number;
    users: number;
    assessments: number;
    documents: number;
    joinedAt: string;
  }[];
}

interface AcquisitionData {
  metrics: {
    totalVisits: number;
    totalSignups: number;
    totalConversions: number;
    conversionRate: number;
  };
  sources: {
    source: string;
    visits: number;
    color: string;
    percentage: number;
  }[];
  channels: { channel: string; visits: number; percentage: number }[];
  geography: {
    country: string;
    code: string;
    visits: number;
    percentage: number;
  }[];
  landingPages: { page: string; visits: number; percentage: number }[];
  campaigns: {
    campaign: string;
    source: string;
    medium: string;
    visits: number;
  }[];
  trends: { traffic: { date: string; visits: number; signups: number }[] };
}

interface InfrastructureData {
  metrics: {
    uptime: number;
    totalApiCalls: number;
    errorRate: number;
    avgResponseMs: number;
    p95ResponseMs: number;
  };
  health: { cpu: number; memory: number; disk: number; dbConnections: number };
  endpoints: {
    endpoint: string;
    calls: number;
    errors: number;
    avgMs: number;
    errorRate: number;
  }[];
  errors: { total: number; types: { type: string; count: number }[] };
  slowQueries: { endpoint: string; duration: number; timestamp: string }[];
  trends: {
    api: { time: string; calls: number; errors: number; avgMs: number }[];
    errors: { time: string; count: number }[];
  };
}

// ============================================================================
// API HOOKS
// ============================================================================

function useAnalyticsData<T>(
  endpoint: string,
  timeRange: TimeRange,
  isActive: boolean,
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!isActive) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/admin/analytics/${endpoint}?range=${timeRange}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch ${endpoint} data`);
      }
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      console.error(`[Analytics] Error fetching ${endpoint}:`, err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, timeRange, isActive]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

// ============================================================================
// COMPONENTS
// ============================================================================

function MetricCard({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = "emerald",
  sparklineData,
  loading,
}: MetricCardProps) {
  const colorClasses = {
    emerald: "bg-emerald-500/10 text-emerald-500",
    blue: "bg-blue-500/10 text-blue-500",
    amber: "bg-amber-500/10 text-amber-500",
    red: "bg-red-500/10 text-red-500",
    purple: "bg-purple-500/10 text-purple-500",
  };

  const trendIcon =
    change !== undefined ? (
      change > 0 ? (
        <ArrowUpRight size={14} className="text-emerald-500" />
      ) : change < 0 ? (
        <ArrowDownRight size={14} className="text-red-500" />
      ) : (
        <Minus size={14} className="text-white/50" />
      )
    ) : null;

  const changeColor =
    change !== undefined
      ? change > 0
        ? "text-emerald-500"
        : change < 0
          ? "text-red-500"
          : "text-white/50"
      : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-5 hover:border-white/10 transition-colors"
    >
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center`}
        >
          {icon}
        </div>
        {sparklineData && sparklineData.length > 0 && (
          <div className="w-20 h-8">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={sparklineData.map((v, i) => ({ v, i }))}>
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#10B981"
                  fill="#10B98120"
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <p className="text-[12px] text-white/50 uppercase tracking-wider mb-1">
        {title}
      </p>

      {loading ? (
        <div className="h-8 w-24 bg-white/5 animate-pulse rounded" />
      ) : (
        <p className="text-[28px] font-light text-white tracking-tight">
          {typeof value === "number" ? value.toLocaleString("de-DE") : value}
        </p>
      )}

      {change !== undefined && (
        <div className="flex items-center gap-1.5 mt-2">
          {trendIcon}
          <span className={`text-[12px] font-medium ${changeColor}`}>
            {change > 0 ? "+" : ""}
            {change}%
          </span>
          {changeLabel && (
            <span className="text-[11px] text-white/30">{changeLabel}</span>
          )}
        </div>
      )}
    </motion.div>
  );
}

function AlertCard({ alert }: { alert: AlertItem }) {
  const typeConfig = {
    warning: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
    },
    error: {
      bg: "bg-red-500/10",
      border: "border-red-500/20",
      icon: AlertTriangle,
      iconColor: "text-red-500",
    },
    info: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/20",
      icon: Sparkles,
      iconColor: "text-blue-500",
    },
  };

  const config = typeConfig[alert.type];
  const Icon = config.icon;

  return (
    <div className={`${config.bg} ${config.border} border rounded-lg p-4`}>
      <div className="flex items-start gap-3">
        <Icon size={18} className={config.iconColor} />
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-medium text-white">{alert.title}</p>
          <p className="text-[12px] text-white/50 mt-0.5">
            {alert.description}
          </p>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-[11px] text-white/30">{alert.timestamp}</span>
            {alert.actionLabel && (
              <button className="text-[11px] text-emerald-400 hover:text-emerald-300 font-medium">
                {alert.actionLabel} →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function TimeRangeSelector({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
}) {
  const options: { value: TimeRange; label: string }[] = [
    { value: "7d", label: "7 days" },
    { value: "30d", label: "30 days" },
    { value: "90d", label: "90 days" },
    { value: "12m", label: "12 months" },
  ];

  return (
    <div className="flex items-center gap-1 bg-white/[0.03] rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-[12px] font-medium rounded-md transition-colors ${
            value === opt.value
              ? "bg-white/10text-white"
              : "text-white/50 hover:text-white hover:bg-white/[0.05]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
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
      className={`flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium rounded-lg transition-all ${
        active
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-white/50 hover:text-white hover:bg-white/[0.03]"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <RefreshCw size={24} className="animate-spin text-emerald-500" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <AlertTriangle size={32} className="text-amber-500 mb-3" />
      <p className="text-[14px] text-white mb-1">Failed to load data</p>
      <p className="text-[12px] text-white/50">{message}</p>
    </div>
  );
}

// ============================================================================
// TAB CONTENT COMPONENTS
// ============================================================================

function ExecutiveSummaryTab({ timeRange }: { timeRange: TimeRange }) {
  const { data, loading, error } = useAnalyticsData<OverviewData>(
    "overview",
    timeRange,
    true,
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const metrics = data?.metrics;
  const trends = data?.trends;

  // Generate alerts based on real data
  const alerts: AlertItem[] = [];
  if (metrics && metrics.users.growth < 0) {
    alerts.push({
      id: "1",
      type: "warning",
      title: "User growth declined",
      description: `Active users decreased by ${Math.abs(metrics.users.growth)}% this period`,
      timestamp: "Current period",
      actionLabel: "View customers",
    });
  }
  if (metrics && metrics.revenue.growth > 10) {
    alerts.push({
      id: "2",
      type: "info",
      title: "Strong revenue growth",
      description: `Revenue increased by ${metrics.revenue.growth}% this period`,
      timestamp: "Current period",
    });
  }

  return (
    <div className="space-y-6">
      {/* Hero KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Monthly Recurring Revenue"
          value={`€${(metrics?.revenue.mrr || 0).toLocaleString("de-DE")}`}
          change={metrics?.revenue.growth}
          changeLabel="vs last period"
          icon={<DollarSign size={20} />}
          color="emerald"
        />
        <MetricCard
          title="Active Users"
          value={metrics?.users.active || 0}
          change={metrics?.users.growth}
          changeLabel="vs last period"
          icon={<Users size={20} />}
          color="blue"
        />
        <MetricCard
          title="Organizations"
          value={metrics?.organizations.total || 0}
          change={metrics?.organizations.growth}
          changeLabel="vs last period"
          icon={<Target size={20} />}
          color="purple"
        />
        <MetricCard
          title="Assessments Completed"
          value={metrics?.engagement.assessments || 0}
          icon={<FileText size={20} />}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DAU Trend */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-medium text-white">
                Daily Active Users
              </h3>
              <p className="text-[12px] text-white/50 mt-0.5">
                User engagement over time
              </p>
            </div>
          </div>
          <div className="h-[240px]">
            {trends?.dau && trends.dau.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends.dau}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    fill="#10B98120"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-white/30">
                <p className="text-[13px]">
                  No DAU data available for this period
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Top Events */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-[15px] font-medium text-white">Top Events</h3>
              <p className="text-[12px] text-white/50 mt-0.5">
                Most frequent user actions
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {metrics?.engagement.topEvents.slice(0, 8).map((event, i) => (
              <div key={event.type} className="flex items-center gap-4">
                <span className="text-[12px] text-white/50 w-32 truncate">
                  {event.type
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (l) => l.toUpperCase())}
                </span>
                <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all bg-emerald-500"
                    style={{
                      width: `${Math.min((event.count / (metrics.engagement.topEvents[0]?.count || 1)) * 100, 100)}%`,
                    }}
                  />
                </div>
                <span className="text-[12px] font-mono text-white w-16 text-right">
                  {event.count}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-4">
            Engagement Summary
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/50">
                Total Assessments
              </span>
              <span className="text-[14px] font-medium text-white">
                {metrics?.engagement.assessments || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/50">
                Documents Uploaded
              </span>
              <span className="text-[14px] font-medium text-white">
                {metrics?.engagement.documents || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-white/50">
                Active Organizations
              </span>
              <span className="text-[14px] font-medium text-white">
                {metrics?.organizations.active || 0}
              </span>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="lg:col-span-2 bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[15px] font-medium text-white">
              Alerts & Insights
            </h3>
            {alerts.length > 0 && (
              <span className="text-[11px] px-2 py-1 rounded-full bg-amber-500/10 text-amber-400 font-medium">
                {alerts.length} items
              </span>
            )}
          </div>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => (
                <AlertCard key={alert.id} alert={alert} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-white/30">
              <CheckCircle2 size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-[13px]">All metrics looking healthy</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function RevenueTab({ timeRange }: { timeRange: TimeRange }) {
  const { data, loading, error } = useAnalyticsData<RevenueData>(
    "revenue",
    timeRange,
    true,
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const metrics = data?.metrics;
  const trends = data?.trends;
  const breakdown = data?.breakdown || [];

  const planColors: Record<string, string> = {
    Enterprise: "#10B981",
    Professional: "#3B82F6",
    Starter: "#F59E0B",
    "Free Trial": "#6B7280",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="MRR"
          value={`€${(metrics?.mrr || 0).toLocaleString("de-DE")}`}
          icon={<DollarSign size={20} />}
          color="emerald"
        />
        <MetricCard
          title="ARR"
          value={`€${(metrics?.arr || 0).toLocaleString("de-DE")}`}
          icon={<TrendingUp size={20} />}
          color="blue"
        />
        <MetricCard
          title="ARPU"
          value={`€${(metrics?.arpu || 0).toFixed(2)}`}
          icon={<CreditCard size={20} />}
          color="purple"
        />
        <MetricCard
          title="Net Revenue Retention"
          value={`${metrics?.nrr || 0}%`}
          icon={<Target size={20} />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MRR Trend */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">MRR Trend</h3>
          <div className="h-[300px]">
            {trends?.mrr && trends.mrr.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trends.mrr}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                    tickFormatter={(v) => `€${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={
                      ((value: number) => [
                        `€${value.toLocaleString("de-DE")}`,
                        "MRR",
                      ]) as never
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="mrr"
                    fill="#10B98120"
                    stroke="none"
                  />
                  <Line
                    type="monotone"
                    dataKey="mrr"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-white/30">
                <p className="text-[13px]">No MRR data available</p>
              </div>
            )}
          </div>
        </div>

        {/* Revenue by Plan */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Revenue by Plan
          </h3>
          {breakdown.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={breakdown}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="revenue"
                      paddingAngle={2}
                    >
                      {breakdown.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={planColors[entry.plan] || "#6B7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0F172A",
                        border: "1px solid #1E293B",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                      formatter={
                        ((value: number) => [
                          `€${value.toLocaleString("de-DE")}`,
                          "Revenue",
                        ]) as never
                      }
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {breakdown.map((plan) => (
                  <div key={plan.plan} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: planColors[plan.plan] || "#6B7280",
                      }}
                    />
                    <span className="text-[11px] text-white/50">
                      {plan.plan}
                    </span>
                    <span className="text-[11px] font-mono text-white ml-auto">
                      {plan.customers}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full text-white/30">
              <p className="text-[13px]">No subscription data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Churn & Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <p className="text-[12px] text-white/50 uppercase tracking-wider mb-2">
            Churn Rate
          </p>
          <p className="text-[32px] font-light text-white">
            {metrics?.churnRate || 0}%
          </p>
          <p className="text-[12px] text-white/30 mt-2">
            {metrics?.churnedSubscriptions || 0} churned this period
          </p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <p className="text-[12px] text-white/50 uppercase tracking-wider mb-2">
            New Subscriptions
          </p>
          <p className="text-[32px] font-light text-emerald-400">
            {metrics?.newSubscriptions || 0}
          </p>
          <p className="text-[12px] text-white/30 mt-2">Added this period</p>
        </div>
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <p className="text-[12px] text-white/50 uppercase tracking-wider mb-2">
            Customer LTV
          </p>
          <p className="text-[32px] font-light text-white">
            €{(metrics?.ltv || 0).toLocaleString("de-DE")}
          </p>
          <p className="text-[12px] text-white/30 mt-2">
            Estimated lifetime value
          </p>
        </div>
      </div>
    </div>
  );
}

function ProductTab({ timeRange }: { timeRange: TimeRange }) {
  const { data, loading, error } = useAnalyticsData<ProductData>(
    "product",
    timeRange,
    true,
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const metrics = data?.metrics;
  const usage = data?.usage;
  const trends = data?.trends;

  const moduleColors = [
    "#10B981",
    "#3B82F6",
    "#8B5CF6",
    "#F59E0B",
    "#06B6D4",
    "#EC4899",
    "#EF4444",
    "#84CC16",
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Page Views"
          value={metrics?.engagement.pageViews || 0}
          icon={<Activity size={20} />}
          color="emerald"
        />
        <MetricCard
          title="Avg Session Duration"
          value={`${metrics?.engagement.avgSessionMinutes || 0} min`}
          icon={<Clock size={20} />}
          color="blue"
        />
        <MetricCard
          title="Assessments Completed"
          value={metrics?.assessments.total || 0}
          icon={<FileText size={20} />}
          color="purple"
        />
        <MetricCard
          title="Spacecraft Registered"
          value={metrics?.engagement.spacecraftRegistered || 0}
          icon={<Rocket size={20} />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Module Usage */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Module Usage
          </h3>
          {usage?.modules && usage.modules.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={usage.modules} layout="vertical">
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    type="number"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="module"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="views" radius={[0, 4, 4, 0]}>
                    {usage.modules.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={moduleColors[index % moduleColors.length]}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-white/30">
              <p className="text-[13px]">No module usage data available</p>
            </div>
          )}
        </div>

        {/* Page Views Trend */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Page Views Over Time
          </h3>
          {trends?.pageViews && trends.pageViews.length > 0 ? (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.pageViews}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="views"
                    stroke="#3B82F6"
                    fill="#3B82F620"
                    strokeWidth={2}
                  />
                  <Area
                    type="monotone"
                    dataKey="uniqueUsers"
                    stroke="#10B981"
                    fill="#10B98120"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-white/30">
              <p className="text-[13px]">No page view data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Assessment Breakdown */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-white mb-4">
          Assessment Breakdown
        </h3>
        {metrics?.assessments.breakdown &&
        metrics.assessments.breakdown.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.assessments.breakdown.map((assessment) => (
              <div
                key={assessment.type}
                className="bg-white/[0.03] rounded-lg p-4"
              >
                <p className="text-[13px] text-white/50">{assessment.type}</p>
                <p className="text-[28px] font-light text-white mt-1">
                  {assessment.count}
                </p>
                <p className="text-[12px] text-emerald-400">
                  {assessment.percentage}% of total
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-white/30">
            <BarChart3 size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">No assessment data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomersTab({ timeRange }: { timeRange: TimeRange }) {
  const { data, loading, error } = useAnalyticsData<CustomersData>(
    "customers",
    timeRange,
    true,
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const metrics = data?.metrics;
  const segments = data?.segments;
  const funnel = data?.funnel || [];
  const topCustomers = data?.topCustomers || [];

  const planColors: Record<string, string> = {
    Enterprise: "#10B981",
    Professional: "#3B82F6",
    Starter: "#F59E0B",
    "Free/Trial": "#6B7280",
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Customers"
          value={metrics?.total || 0}
          icon={<Users size={20} />}
          color="emerald"
        />
        <MetricCard
          title="New This Period"
          value={metrics?.newInPeriod || 0}
          icon={<UserPlus size={20} />}
          color="blue"
        />
        <MetricCard
          title="Paid Customers"
          value={metrics?.paid || 0}
          icon={<CreditCard size={20} />}
          color="purple"
        />
        <MetricCard
          title="Avg Users/Org"
          value={metrics?.avgUsersPerOrg || 0}
          icon={<Target size={20} />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plan Distribution */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Customers by Plan
          </h3>
          {segments?.byPlan && segments.byPlan.length > 0 ? (
            <>
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={segments.byPlan}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="count"
                      paddingAngle={2}
                    >
                      {segments.byPlan.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={planColors[entry.plan] || "#6B7280"}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        background: "#0F172A",
                        border: "1px solid #1E293B",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-4">
                {segments.byPlan.map((plan) => (
                  <div key={plan.plan} className="flex items-center gap-2">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: planColors[plan.plan] || "#6B7280",
                      }}
                    />
                    <span className="text-[11px] text-white/50">
                      {plan.plan}
                    </span>
                    <span className="text-[11px] font-mono text-white ml-auto">
                      {plan.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-white/30">
              <p className="text-[13px]">No plan data available</p>
            </div>
          )}
        </div>

        {/* Conversion Funnel */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Conversion Funnel
          </h3>
          {funnel.length > 0 ? (
            <div className="space-y-3">
              {funnel.map((stage, i) => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <span className="text-[12px] text-white/50 w-20">
                    {stage.stage}
                  </span>
                  <div className="flex-1 h-8 bg-white/5 rounded-lg overflow-hidden">
                    <div
                      className="h-full rounded-lg transition-all bg-gradient-to-r from-emerald-500 to-emerald-600"
                      style={{ width: `${stage.rate}%` }}
                    />
                  </div>
                  <span className="text-[12px] font-mono text-white w-12 text-right">
                    {stage.count}
                  </span>
                  <span className="text-[11px] text-white/30 w-10 text-right">
                    {stage.rate}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-white/30">
              <p className="text-[13px]">No funnel data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Top Customers */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-white mb-4">
          Top Customers by Activity
        </h3>
        {topCustomers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-white/[0.06]">
                  <th className="pb-3 text-[11px] text-white/50 font-medium">
                    Organization
                  </th>
                  <th className="pb-3 text-[11px] text-white/50 font-medium">
                    Plan
                  </th>
                  <th className="pb-3 text-[11px] text-white/50 font-medium text-right">
                    MRR
                  </th>
                  <th className="pb-3 text-[11px] text-white/50 font-medium text-right">
                    Users
                  </th>
                  <th className="pb-3 text-[11px] text-white/50 font-medium text-right">
                    Assessments
                  </th>
                  <th className="pb-3 text-[11px] text-white/50 font-medium text-right">
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody>
                {topCustomers.slice(0, 5).map((customer) => (
                  <tr
                    key={customer.name}
                    className="border-b border-white/[0.04]"
                  >
                    <td className="py-3 text-[13px] text-white">
                      {customer.name}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[11px] px-2 py-1 rounded-full ${
                          customer.plan === "enterprise"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : customer.plan === "professional"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-white/5 text-white/50"
                        }`}
                      >
                        {customer.plan}
                      </span>
                    </td>
                    <td className="py-3 text-[13px] text-white text-right font-mono">
                      €{customer.mrr}
                    </td>
                    <td className="py-3 text-[13px] text-white/50 text-right">
                      {customer.users}
                    </td>
                    <td className="py-3 text-[13px] text-white/50 text-right">
                      {customer.assessments}
                    </td>
                    <td className="py-3 text-[12px] text-white/30 text-right">
                      {customer.joinedAt}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-white/30">
            <Users size={32} className="mx-auto mb-2 opacity-50" />
            <p className="text-[13px]">No customer data available</p>
          </div>
        )}
      </div>
    </div>
  );
}

function AcquisitionTab({ timeRange }: { timeRange: TimeRange }) {
  const { data, loading, error } = useAnalyticsData<AcquisitionData>(
    "acquisition",
    timeRange,
    true,
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const metrics = data?.metrics;
  const sources = data?.sources || [];
  const channels = data?.channels || [];
  const geography = data?.geography || [];
  const trends = data?.trends;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Visits"
          value={metrics?.totalVisits || 0}
          icon={<Activity size={20} />}
          color="emerald"
        />
        <MetricCard
          title="Signups"
          value={metrics?.totalSignups || 0}
          icon={<UserPlus size={20} />}
          color="blue"
        />
        <MetricCard
          title="Conversion Rate"
          value={`${metrics?.conversionRate || 0}%`}
          icon={<Target size={20} />}
          color="purple"
        />
        <MetricCard
          title="Conversions"
          value={metrics?.totalConversions || 0}
          icon={<Zap size={20} />}
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Traffic Sources */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Traffic Sources
          </h3>
          {sources.length > 0 ? (
            <div className="space-y-3">
              {sources.slice(0, 8).map((source) => (
                <div key={source.source} className="flex items-center gap-4">
                  <span className="text-[12px] text-white/50 w-24 truncate">
                    {source.source}
                  </span>
                  <div className="flex-1 h-6 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${source.percentage}%`,
                        backgroundColor: source.color,
                      }}
                    />
                  </div>
                  <span className="text-[12px] font-mono text-white w-16 text-right">
                    {source.visits}
                  </span>
                  <span className="text-[11px] text-white/30 w-10 text-right">
                    {source.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-white/30">
              <p className="text-[13px]">No traffic source data available</p>
            </div>
          )}
        </div>

        {/* Traffic Trend */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Traffic Over Time
          </h3>
          {trends?.traffic && trends.traffic.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trends.traffic}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="rgba(255,255,255,0.06)"
                  />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#111111",
                      border: "1px solid rgba(255,255,255,0.1)",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="visits"
                    stroke="#3B82F6"
                    fill="#3B82F620"
                    strokeWidth={2}
                    name="Visits"
                  />
                  <Area
                    type="monotone"
                    dataKey="signups"
                    stroke="#10B981"
                    fill="#10B98120"
                    strokeWidth={2}
                    name="Signups"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-white/30">
              <p className="text-[13px]">No traffic trend data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Channels & Geography */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Attribution */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Channel Attribution
          </h3>
          {channels.length > 0 ? (
            <div className="space-y-4">
              {channels.map((channel) => (
                <div
                  key={channel.channel}
                  className="flex items-center justify-between"
                >
                  <span className="text-[13px] text-white/50">
                    {channel.channel}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] font-mono text-white">
                      {channel.visits}
                    </span>
                    <span className="text-[11px] text-white/30 w-10 text-right">
                      {channel.percentage}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-white/30">
              <p className="text-[13px]">No channel data available</p>
            </div>
          )}
        </div>

        {/* Geography */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-6">
            Top Countries
          </h3>
          {geography.length > 0 ? (
            <div className="space-y-3">
              {geography.slice(0, 6).map((country) => (
                <div key={country.code} className="flex items-center gap-4">
                  <Globe size={14} className="text-white/30" />
                  <span className="text-[13px] text-white flex-1">
                    {country.country}
                  </span>
                  <span className="text-[12px] font-mono text-white/50">
                    {country.visits}
                  </span>
                  <span className="text-[11px] text-white/30 w-10 text-right">
                    {country.percentage}%
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[150px] text-white/30">
              <p className="text-[13px]">No geographic data available</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfrastructureTab({ timeRange }: { timeRange: TimeRange }) {
  // Infrastructure uses different time ranges
  const infraRange = timeRange === "7d" || timeRange === "30d" ? "24h" : "7d";
  const { data, loading, error } = useAnalyticsData<InfrastructureData>(
    "infrastructure",
    infraRange as TimeRange,
    true,
  );

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const metrics = data?.metrics;
  const health = data?.health;
  const endpoints = data?.endpoints || [];
  const errors = data?.errors;
  const trends = data?.trends;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Uptime"
          value={`${metrics?.uptime || 0}%`}
          icon={<Server size={20} />}
          color="emerald"
        />
        <MetricCard
          title="Avg Response Time"
          value={`${metrics?.avgResponseMs || 0}ms`}
          icon={<Zap size={20} />}
          color="blue"
        />
        <MetricCard
          title="Error Rate"
          value={`${metrics?.errorRate || 0}%`}
          icon={<AlertTriangle size={20} />}
          color={metrics?.errorRate && metrics.errorRate > 1 ? "red" : "amber"}
        />
        <MetricCard
          title="API Calls"
          value={metrics?.totalApiCalls || 0}
          icon={<Activity size={20} />}
          color="purple"
        />
      </div>

      {/* API Performance Trend */}
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
        <h3 className="text-[15px] font-medium text-white mb-6">
          API Performance
        </h3>
        {trends?.api && trends.api.length > 0 ? (
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trends.api}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.06)"
                />
                <XAxis
                  dataKey="time"
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  axisLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 11 }}
                  axisLine={false}
                />
                <Tooltip
                  contentStyle={{
                    background: "#0F172A",
                    border: "1px solid #1E293B",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey="calls"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  name="API Calls"
                />
                <Bar
                  yAxisId="left"
                  dataKey="errors"
                  fill="#EF4444"
                  radius={[4, 4, 0, 0]}
                  name="Errors"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="avgMs"
                  stroke="#10B981"
                  strokeWidth={2}
                  dot={false}
                  name="Avg Response (ms)"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="flex items-center justify-center h-[300px] text-white/30">
            <p className="text-[13px]">No API performance data available</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* System Health */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-4">
            System Health
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {[
              { name: "CPU Usage", value: health?.cpu || 0, unit: "%" },
              { name: "Memory Usage", value: health?.memory || 0, unit: "%" },
              { name: "Disk Usage", value: health?.disk || 0, unit: "%" },
              {
                name: "DB Connections",
                value: health?.dbConnections || 0,
                unit: "",
              },
            ].map((metric) => (
              <div key={metric.name} className="bg-white/[0.03] rounded-lg p-4">
                <p className="text-[11px] text-white/50 uppercase tracking-wider">
                  {metric.name}
                </p>
                <p className="text-[24px] font-light text-white mt-1">
                  {metric.value}
                  {metric.unit}
                </p>
                {metric.unit === "%" && (
                  <div className="mt-2 h-1 bg-white/10rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        metric.value > 80
                          ? "bg-red-500"
                          : metric.value > 60
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${metric.value}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Top Endpoints */}
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-4">
            Top Endpoints
          </h3>
          {endpoints.length > 0 ? (
            <div className="space-y-3">
              {endpoints.slice(0, 6).map((endpoint) => (
                <div
                  key={endpoint.endpoint}
                  className="flex items-center justify-between p-3 bg-white/[0.03] rounded-lg"
                >
                  <span className="text-[12px] text-white truncate flex-1">
                    {endpoint.endpoint}
                  </span>
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] text-white/50">
                      {endpoint.calls} calls
                    </span>
                    <span className="text-[11px] font-mono text-emerald-400">
                      {endpoint.avgMs}ms
                    </span>
                    {endpoint.errorRate > 0 && (
                      <span className="text-[11px] text-red-400">
                        {endpoint.errorRate}% err
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-white/30">
              <p className="text-[13px]">No endpoint data available</p>
            </div>
          )}
        </div>
      </div>

      {/* Error Types */}
      {errors && errors.types.length > 0 && (
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-6">
          <h3 className="text-[15px] font-medium text-white mb-4">
            Error Distribution
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {errors.types.slice(0, 8).map((error) => (
              <div
                key={error.type}
                className="bg-red-500/10 border border-red-500/20 rounded-lg p-4"
              >
                <p className="text-[11px] text-red-400 truncate">
                  {error.type}
                </p>
                <p className="text-[20px] font-light text-white mt-1">
                  {error.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setLastUpdated(new Date());
    // Force re-render by updating key
    setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
      id: "overview",
      label: "Executive Summary",
      icon: <LayoutDashboard size={16} />,
    },
    { id: "revenue", label: "Revenue", icon: <DollarSign size={16} /> },
    { id: "product", label: "Product", icon: <Activity size={16} /> },
    { id: "customers", label: "Customers", icon: <Users size={16} /> },
    { id: "acquisition", label: "Acquisition", icon: <Megaphone size={16} /> },
    {
      id: "infrastructure",
      label: "Infrastructure",
      icon: <Server size={16} />,
    },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white">
      {/* Header */}
      <div className="border-b border-white/[0.06] bg-[#0A0A0B]/80 backdrop-blur-xl sticky top-0 z-20">
        <div className="max-w-[1600px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-[20px] font-medium text-white">
                CEO Analytics
              </h1>
              <p className="text-[12px] text-white/50 mt-0.5">
                Last updated:{" "}
                {lastUpdated.toLocaleTimeString("de-DE", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <TimeRangeSelector value={timeRange} onChange={setTimeRange} />
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <RefreshCw
                  size={14}
                  className={isRefreshing ? "animate-spin" : ""}
                />
                Refresh
              </button>
              <button
                onClick={() => {
                  const exportMap: Record<string, string> = {
                    overview: "aggregates",
                    revenue: "revenue",
                    product: "events",
                    customers: "customers",
                    acquisition: "events",
                    infrastructure: "events",
                  };
                  const exportType = exportMap[activeTab] || "events";
                  window.open(
                    `/api/admin/analytics/export?type=${exportType}&range=${timeRange}`,
                    "_blank",
                  );
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[13px] font-medium rounded-lg transition-colors"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
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
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1600px] mx-auto px-6 py-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${activeTab}-${timeRange}-${lastUpdated.getTime()}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "overview" && (
              <ExecutiveSummaryTab timeRange={timeRange} />
            )}
            {activeTab === "revenue" && <RevenueTab timeRange={timeRange} />}
            {activeTab === "product" && <ProductTab timeRange={timeRange} />}
            {activeTab === "customers" && (
              <CustomersTab timeRange={timeRange} />
            )}
            {activeTab === "acquisition" && (
              <AcquisitionTab timeRange={timeRange} />
            )}
            {activeTab === "infrastructure" && (
              <InfrastructureTab timeRange={timeRange} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
