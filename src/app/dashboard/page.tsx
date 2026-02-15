"use client";

import { Suspense, useState, useEffect, useCallback, useMemo } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  PlayCircle,
  CheckCircle,
  X,
  ClipboardList,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  FileText,
  Upload,
  BarChart3,
  Calendar,
  AlertTriangle,
  Clock,
  Zap,
  FileUp,
  FileBarChart,
  CalendarDays,
} from "lucide-react";
import { articles } from "@/data/articles";
import { modules } from "@/data/modules";
import dynamic from "next/dynamic";
import { useLanguage } from "@/components/providers/LanguageProvider";

// Dynamic imports for chart components (to avoid SSR issues with Recharts)
const ComplianceDonutChart = dynamic(
  () => import("@/components/dashboard/charts/ComplianceDonutChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const ModuleProgressChart = dynamic(
  () => import("@/components/dashboard/charts/ModuleProgressChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const ComplianceTimelineChart = dynamic(
  () => import("@/components/dashboard/charts/ComplianceTimelineChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const RegulatoryRadarChart = dynamic(
  () => import("@/components/dashboard/charts/RegulatoryRadarChart"),
  { ssr: false, loading: () => <ChartSkeleton /> },
);
const Sparkline = dynamic(
  () => import("@/components/dashboard/charts/Sparkline"),
  { ssr: false },
);
const ComplianceScoreCard = dynamic(
  () => import("@/components/dashboard/ComplianceScoreCard"),
  { ssr: false },
);
const GlobeWidget = dynamic(
  () => import("@/components/mission-control/GlobeWidget"),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] bg-white/5 rounded-xl animate-pulse" />
    ),
  },
);

// ─── Types ───

interface ArticleStatusData {
  status: string;
  notes: string | null;
  updatedAt: Date;
}

interface AuditLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  description?: string;
  timestamp: string;
}

interface Deadline {
  id: string;
  title: string;
  dueDate: string;
  module?: string;
  priority: "critical" | "high" | "medium" | "low";
}

// ─── Constants ───

const moduleRoutes: Record<string, string> = {
  authorization: "/dashboard/modules/authorization",
  registration: "/dashboard/modules/registration",
  environmental: "/dashboard/modules/environmental",
  cybersecurity: "/dashboard/modules/cybersecurity",
  debris: "/dashboard/modules/debris",
  insurance: "/dashboard/modules/insurance",
  supervision: "/dashboard/modules/supervision",
  regulatory: "/dashboard/modules/supervision",
};

const CHART_COLORS = {
  emerald: "#10B981",
  cyan: "#06B6D4",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#8B5CF6",
};

// ─── Demo Data ───

const DEMO_COMPLIANCE_SEGMENTS = [
  { name: "EU Regulations", value: 45, color: CHART_COLORS.emerald },
  { name: "US Regulations", value: 30, color: CHART_COLORS.cyan },
  { name: "International", value: 25, color: CHART_COLORS.green },
];

const DEMO_MODULE_PROGRESS = [
  {
    name: "Authorization",
    shortName: "Auth",
    progress: 78,
    status: "in-progress" as const,
  },
  {
    name: "Cybersecurity",
    shortName: "Cyber",
    progress: 65,
    status: "in-progress" as const,
  },
  {
    name: "Debris Mitigation",
    shortName: "Debris",
    progress: 45,
    status: "in-progress" as const,
  },
  {
    name: "Environmental",
    shortName: "Enviro",
    progress: 35,
    status: "at-risk" as const,
  },
  {
    name: "Insurance",
    shortName: "Insur",
    progress: 20,
    status: "at-risk" as const,
  },
  {
    name: "Registration",
    shortName: "Regist",
    progress: 15,
    status: "at-risk" as const,
  },
  {
    name: "Supervision",
    shortName: "Super",
    progress: 0,
    status: "not-started" as const,
  },
];

const DEMO_TIMELINE_DATA = [
  { month: "Aug", overall: 10, eu: 12, us: 8, uk: 5 },
  { month: "Sep", overall: 18, eu: 20, us: 15, uk: 12 },
  { month: "Oct", overall: 28, eu: 30, us: 25, uk: 22 },
  { month: "Nov", overall: 35, eu: 38, us: 32, uk: 30 },
  { month: "Dec", overall: 42, eu: 45, us: 38, uk: 35 },
  { month: "Jan", overall: 48, eu: 52, us: 45, uk: 42 },
];

const DEMO_RADAR_DATA = [
  { category: "Auth", value: 75, fullMark: 100 },
  { category: "Cyber", value: 60, fullMark: 100 },
  { category: "Debris", value: 45, fullMark: 100 },
  { category: "Enviro", value: 35, fullMark: 100 },
  { category: "Insur", value: 20, fullMark: 100 },
  { category: "Export", value: 50, fullMark: 100 },
  { category: "Spectrum", value: 40, fullMark: 100 },
];

const DEMO_DEADLINES: Deadline[] = [
  {
    id: "1",
    title: "NIS2 Compliance Deadline",
    dueDate: "2024-10-17",
    module: "cybersecurity",
    priority: "critical",
  },
  {
    id: "2",
    title: "Space Debris Plan Submission",
    dueDate: "2024-11-30",
    module: "debris",
    priority: "high",
  },
  {
    id: "3",
    title: "Insurance Review",
    dueDate: "2024-12-15",
    module: "insurance",
    priority: "medium",
  },
  {
    id: "4",
    title: "Annual Registration Update",
    dueDate: "2025-01-31",
    module: "registration",
    priority: "low",
  },
  {
    id: "5",
    title: "Environmental Impact Report",
    dueDate: "2025-03-01",
    module: "environmental",
    priority: "medium",
  },
];

const DEMO_RISK_HEATMAP = [
  { module: "Auth", risk: "low" },
  { module: "Cyber", risk: "medium" },
  { module: "Debris", risk: "high" },
  { module: "Enviro", risk: "critical" },
  { module: "Insur", risk: "high" },
  { module: "Export", risk: "medium" },
  { module: "Spectrum", risk: "low" },
  { module: "Regist", risk: "medium" },
];

// ─── Helper Components ───

function ChartSkeleton() {
  return (
    <div className="h-[280px] w-full flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-white/20 animate-spin" />
    </div>
  );
}

function GlassCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl ${className}`}
    >
      {children}
    </motion.div>
  );
}

function KPICard({
  value,
  label,
  trend,
  trendValue,
  sparklineData,
  sparklineColor,
  delay = 0,
}: {
  value: string | number;
  label: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  sparklineData?: number[];
  sparklineColor?: string;
  delay?: number;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-green-400"
      : trend === "down"
        ? "text-red-400"
        : "text-white/40";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.1 }}
      className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-5 relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <p className="text-[32px] font-mono font-semibold text-white leading-none">
            {value}
          </p>
          <p className="text-[11px] font-mono uppercase tracking-wider text-white/50 mt-2">
            {label}
          </p>
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3.5 h-3.5" />
            <span className="text-[11px] font-mono">{trendValue}</span>
          </div>
        )}
      </div>
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-2">
          <Sparkline
            data={sparklineData}
            color={sparklineColor || CHART_COLORS.emerald}
            height={28}
          />
        </div>
      )}
    </motion.div>
  );
}

function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
        {title}
      </h2>
      {action}
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center">
      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-white/30" />
      </div>
      <h3 className="text-[14px] font-medium text-white/80 mb-1">{title}</h3>
      <p className="text-[12px] text-white/50 mb-4 max-w-[240px]">
        {description}
      </p>
      {action}
    </div>
  );
}

function DeadlineItem({
  deadline,
  t,
}: {
  deadline: Deadline;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const priorityColors = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };

  const dueDate = new Date(deadline.dueDate);
  const today = new Date();
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

  return (
    <div className="flex items-center gap-3 py-2">
      <div
        className={`w-2 h-2 rounded-full ${
          deadline.priority === "critical"
            ? "bg-red-500"
            : deadline.priority === "high"
              ? "bg-amber-500"
              : deadline.priority === "medium"
                ? "bg-emerald-500"
                : "bg-green-500"
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/80 truncate">{deadline.title}</p>
        <p className="text-[10px] text-white/40">
          {daysUntil > 0
            ? t("common.days", { count: daysUntil })
            : t("common.overdue")}
        </p>
      </div>
      <span
        className={`text-[9px] font-mono uppercase px-2 py-0.5 rounded border ${priorityColors[deadline.priority]}`}
      >
        {t(`common.${deadline.priority}`)}
      </span>
    </div>
  );
}

function RiskHeatmapCell({ module, risk }: { module: string; risk: string }) {
  const riskColors = {
    critical: "bg-red-500",
    high: "bg-red-500/60",
    medium: "bg-amber-500/60",
    low: "bg-green-500/60",
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-lg ${riskColors[risk as keyof typeof riskColors]} flex items-center justify-center mb-1`}
      >
        <span className="text-[10px] font-mono text-white/90 font-medium">
          {module.slice(0, 2)}
        </span>
      </div>
      <span className="text-[9px] text-white/40">{module}</span>
    </div>
  );
}

function QuickActionButton({
  icon: Icon,
  label,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 transition-all group"
    >
      <Icon className="w-5 h-5 text-white/60 group-hover:text-emerald-400 transition-colors" />
      <span className="text-[10px] text-white/50 group-hover:text-white/70 transition-colors">
        {label}
      </span>
    </Link>
  );
}

function ActivityItem({
  activity,
}: {
  activity: {
    action: string;
    entityType: string;
    description?: string;
    timestamp: string;
  };
}) {
  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    document: FileText,
    assessment: ClipboardList,
    compliance: CheckCircle,
    default: BarChart3,
  };
  const Icon = iconMap[activity.entityType] || iconMap.default;

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4 text-white/50" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-white/80 truncate">
          {activity.description || activity.action.replace(/_/g, " ")}
        </p>
        <p className="text-[10px] text-white/40 mt-0.5">
          {timeAgo(activity.timestamp)}
        </p>
      </div>
    </div>
  );
}

// ─── Main Dashboard Content ───

function DashboardContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const [articleStatuses, setArticleStatuses] = useState<
    Record<string, ArticleStatusData>
  >({});
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [selectedOperator, setSelectedOperator] = useState("");
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [documentCount, setDocumentCount] = useState(0);
  const [recentActivity, setRecentActivity] = useState<AuditLogEntry[]>([]);
  const [pendingAssessment, setPendingAssessment] = useState<{
    operatorType: string;
    completedAt: string;
  } | null>(null);

  const firstName = session?.user?.name?.split(" ")[0] || "there";
  const daysUntilEnforcement = Math.ceil(
    (new Date("2030-01-01").getTime() - Date.now()) / 86400000,
  );

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [articlesRes, docsRes, activityRes] = await Promise.all([
          fetch("/api/tracker/articles"),
          fetch("/api/documents/dashboard"),
          fetch("/api/audit?limit=10").catch(() => null),
        ]);

        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticleStatuses(data);
          setHasData(Object.keys(data).length > 0);
        }

        if (docsRes.ok) {
          const data = await docsRes.json();
          setDocumentCount(data.stats?.total ?? 0);
        }

        if (activityRes?.ok) {
          const data = await activityRes.json();
          setRecentActivity(data.logs || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Check for pending assessment
  useEffect(() => {
    try {
      const stored = localStorage.getItem("caelex-pending-assessment");
      if (stored) {
        setPendingAssessment(JSON.parse(stored));
      }
    } catch {}
  }, []);

  // Success toast from import
  useEffect(() => {
    if (searchParams.get("imported") === "true") {
      setShowSuccessToast(true);
      window.history.replaceState({}, "", "/dashboard");
      const timer = setTimeout(() => setShowSuccessToast(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [searchParams]);

  // Calculate stats
  const stats = useMemo(() => {
    let total = 0,
      compliant = 0,
      applicable = 0;
    for (const article of articles) {
      const status = articleStatuses[article.id]?.status;
      if (status && status !== "not_applicable") {
        applicable++;
        if (status === "compliant") compliant++;
      }
      total++;
    }
    return { total, compliant, applicable };
  }, [articleStatuses]);

  const progressPercent =
    stats.applicable > 0
      ? Math.round((stats.compliant / stats.applicable) * 100)
      : 0;

  // Calculate module progress
  const moduleProgress = useMemo(() => {
    const progress: Record<string, { total: number; compliant: number }> = {};
    for (const mod of modules) {
      progress[mod.id] = { total: 0, compliant: 0 };
    }
    for (const article of articles) {
      const status = articleStatuses[article.id]?.status;
      if (status && status !== "not_applicable" && progress[article.module]) {
        progress[article.module].total++;
        if (status === "compliant") progress[article.module].compliant++;
      }
    }
    return progress;
  }, [articleStatuses]);

  // Prepare chart data
  const complianceSegments = hasData
    ? [
        {
          name: "EU Regulations",
          value: progressPercent,
          color: CHART_COLORS.emerald,
        },
        {
          name: "US Regulations",
          value: Math.max(0, progressPercent - 15),
          color: CHART_COLORS.cyan,
        },
        {
          name: "International",
          value: Math.max(0, progressPercent - 25),
          color: CHART_COLORS.green,
        },
      ]
    : DEMO_COMPLIANCE_SEGMENTS;

  const moduleChartData = hasData
    ? modules.map((mod) => {
        const prog = moduleProgress[mod.id];
        const percent =
          prog.total > 0 ? Math.round((prog.compliant / prog.total) * 100) : 0;
        return {
          name: mod.name,
          shortName: mod.name.slice(0, 6),
          progress: percent,
          status:
            percent >= 75
              ? ("complete" as const)
              : percent > 0
                ? ("in-progress" as const)
                : ("not-started" as const),
        };
      })
    : DEMO_MODULE_PROGRESS;

  const radarData = hasData
    ? [
        {
          category: "Auth",
          value:
            moduleProgress.authorization?.total > 0
              ? Math.round(
                  (moduleProgress.authorization.compliant /
                    moduleProgress.authorization.total) *
                    100,
                )
              : 0,
          fullMark: 100,
        },
        {
          category: "Cyber",
          value:
            moduleProgress.cybersecurity?.total > 0
              ? Math.round(
                  (moduleProgress.cybersecurity.compliant /
                    moduleProgress.cybersecurity.total) *
                    100,
                )
              : 0,
          fullMark: 100,
        },
        {
          category: "Debris",
          value:
            moduleProgress.debris?.total > 0
              ? Math.round(
                  (moduleProgress.debris.compliant /
                    moduleProgress.debris.total) *
                    100,
                )
              : 0,
          fullMark: 100,
        },
        {
          category: "Enviro",
          value:
            moduleProgress.environmental?.total > 0
              ? Math.round(
                  (moduleProgress.environmental.compliant /
                    moduleProgress.environmental.total) *
                    100,
                )
              : 0,
          fullMark: 100,
        },
        {
          category: "Insur",
          value:
            moduleProgress.insurance?.total > 0
              ? Math.round(
                  (moduleProgress.insurance.compliant /
                    moduleProgress.insurance.total) *
                    100,
                )
              : 0,
          fullMark: 100,
        },
        {
          category: "Regist",
          value:
            moduleProgress.registration?.total > 0
              ? Math.round(
                  (moduleProgress.registration.compliant /
                    moduleProgress.registration.total) *
                    100,
                )
              : 0,
          fullMark: 100,
        },
        {
          category: "Super",
          value:
            moduleProgress.supervision?.total > 0
              ? Math.round(
                  (moduleProgress.supervision.compliant /
                    moduleProgress.supervision.total) *
                    100,
                )
              : 0,
          fullMark: 100,
        },
      ]
    : DEMO_RADAR_DATA;

  // Import handlers
  const handleImport = async () => {
    if (!selectedOperator) return;
    setImporting(true);
    try {
      const res = await fetch("/api/tracker/import-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ operatorType: selectedOperator }),
      });
      if (res.ok) {
        const articlesRes = await fetch("/api/tracker/articles");
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticleStatuses(data);
          setHasData(true);
        }
        setShowImportModal(false);
      }
    } catch (error) {
      console.error("Error importing assessment:", error);
    } finally {
      setImporting(false);
    }
  };

  const handleDismissPendingAssessment = () => {
    try {
      localStorage.removeItem("caelex-pending-assessment");
    } catch {}
    setPendingAssessment(null);
  };

  const handleImportFromLocalStorage = async () => {
    if (!pendingAssessment) return;
    setImporting(true);
    try {
      const res = await fetch("/api/tracker/import-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({ operatorType: pendingAssessment.operatorType }),
      });
      if (res.ok) {
        try {
          localStorage.removeItem("caelex-pending-assessment");
        } catch {}
        setPendingAssessment(null);
        const articlesRes = await fetch("/api/tracker/articles");
        if (articlesRes.ok) {
          const data = await articlesRes.json();
          setArticleStatuses(data);
          setHasData(true);
        }
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 5000);
      }
    } catch (error) {
      console.error("Error importing assessment:", error);
    } finally {
      setImporting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 lg:p-8 min-h-screen">
        <div className="animate-pulse space-y-6 max-w-[1400px]">
          <div className="h-8 bg-white/5 rounded w-1/3" />
          <div className="h-4 bg-white/5 rounded w-1/2" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-white/5 rounded-xl" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-[340px] bg-white/5 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 min-h-screen">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="bg-green-500/20 border border-green-500/30 rounded-lg px-4 py-3 flex items-center gap-3 shadow-xl backdrop-blur-sm">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <span className="text-[14px] text-white font-medium">
                {t("dashboard.assessmentImported")}
              </span>
              <button
                onClick={() => setShowSuccessToast(false)}
                className="text-white/50 hover:text-white/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px]">
        {/* Pending Assessment Banner */}
        {pendingAssessment && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5"
          >
            <div className="flex items-start gap-4">
              <ClipboardList className="w-5 h-5 text-emerald-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <h3 className="text-[14px] font-medium text-white mb-1">
                  {t("dashboard.assessmentResultsAvailable")}
                </h3>
                <p className="text-[13px] text-white/60">
                  {t("dashboard.importAssessmentDescription")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleImportFromLocalStorage}
                  disabled={importing}
                  className="bg-emerald-500 text-white text-[12px] font-medium px-4 py-2 rounded-lg hover:bg-emerald-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {importing ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : null}
                  {importing
                    ? t("common.importing")
                    : t("dashboard.importAssessment")}
                </button>
                <button
                  onClick={handleDismissPendingAssessment}
                  className="text-emerald-400 hover:text-emerald-300 p-1"
                >
                  <X size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <div className="mb-8">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-[28px] font-medium text-white mb-1"
          >
            {t("dashboard.welcomeBack", { name: firstName })}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[14px] text-white/60"
          >
            {t("dashboard.commandCenter")}
          </motion.p>
        </div>

        {/* Compliance Score Card */}
        <ComplianceScoreCard />

        {/* ROW 1: KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KPICard
            value={`${progressPercent}%`}
            label={t("dashboard.overallCompliance")}
            trend={progressPercent > 0 ? "up" : "neutral"}
            trendValue={progressPercent > 0 ? "+5%" : "—"}
            sparklineData={
              hasData
                ? [10, 15, 22, 28, 35, progressPercent]
                : [10, 18, 28, 35, 42, 48]
            }
            sparklineColor={CHART_COLORS.green}
            delay={0}
          />
          <KPICard
            value={hasData ? stats.applicable : "52"}
            label={t("dashboard.applicableArticles")}
            trend="neutral"
            sparklineData={[45, 48, 50, 51, 52, 52]}
            sparklineColor={CHART_COLORS.emerald}
            delay={1}
          />
          <KPICard
            value={documentCount}
            label={t("dashboard.documentsUploaded")}
            trend={documentCount > 0 ? "up" : "neutral"}
            trendValue={documentCount > 0 ? "+3" : "—"}
            sparklineData={[0, 2, 5, 8, 12, documentCount]}
            sparklineColor={CHART_COLORS.cyan}
            delay={2}
          />
          <KPICard
            value={daysUntilEnforcement}
            label={t("dashboard.daysTo2030")}
            trend="down"
            trendValue={t("dashboard.dailyTrend")}
            sparklineData={[1500, 1480, 1460, 1440, 1425, daysUntilEnforcement]}
            sparklineColor={CHART_COLORS.amber}
            delay={3}
          />
        </div>

        {/* No Data CTA */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/5 border border-dashed border-white/20 rounded-xl p-10 text-center mb-8"
          >
            <h2 className="text-[16px] font-medium text-white mb-2">
              {t("dashboard.importResults")}
            </h2>
            <p className="text-[13px] text-white/60 mb-6 max-w-md mx-auto">
              {t("dashboard.importDescription")}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/assessment"
                className="bg-emerald-500 text-white font-medium text-[13px] px-6 py-2.5 rounded-lg hover:bg-emerald-600 transition-all flex items-center gap-2"
              >
                <PlayCircle size={16} />
                {t("dashboard.runAssessmentAction")}
              </Link>
              <button
                onClick={() => setShowImportModal(true)}
                className="border border-white/20 text-white/70 font-medium text-[13px] px-6 py-2.5 rounded-lg hover:bg-white/5 transition-all"
              >
                {t("dashboard.alreadyRanIt")}
              </button>
            </div>
          </motion.div>
        )}

        {/* ROW 2: Compliance Overview + Module Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GlassCard className="p-6">
            <SectionHeader title={t("dashboard.complianceOverview")} />
            <ComplianceDonutChart
              data={complianceSegments}
              totalScore={hasData ? progressPercent : 48}
              isDemo={!hasData}
            />
          </GlassCard>

          <GlassCard className="p-6">
            <SectionHeader title={t("dashboard.moduleProgress")} />
            <ModuleProgressChart data={moduleChartData} isDemo={!hasData} />
          </GlassCard>
        </div>

        {/* ROW 3: Timeline + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <GlassCard className="p-6">
            <SectionHeader title={t("dashboard.complianceTimeline")} />
            <ComplianceTimelineChart
              data={DEMO_TIMELINE_DATA}
              isDemo={!hasData}
            />
          </GlassCard>

          <GlassCard className="p-6">
            <SectionHeader title={t("dashboard.regulatoryCoverage")} />
            <RegulatoryRadarChart data={radarData} isDemo={!hasData} />
          </GlassCard>
        </div>

        {/* ROW 4: Recent Activity */}
        <GlassCard className="p-6 mb-8">
          <SectionHeader
            title={t("dashboard.recentActivity")}
            action={
              <Link
                href="/dashboard/audit-center"
                className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                {t("common.viewAll")} <ChevronRight className="w-3 h-3" />
              </Link>
            }
          />
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-white/5">
              {recentActivity.slice(0, 5).map((activity) => (
                <ActivityItem key={activity.id} activity={activity} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BarChart3}
              title={t("dashboard.noActivityYet")}
              description={t("dashboard.startAssessment")}
              action={
                <Link
                  href="/assessment"
                  className="text-[12px] text-emerald-400 hover:text-emerald-300"
                >
                  {t("dashboard.runAssessmentAction")}
                </Link>
              }
            />
          )}
        </GlassCard>

        {/* ROW 5: 3D Mission Globe */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-white/40">
              {t("missionControl.title")}
            </h2>
          </div>
          <GlobeWidget />
        </div>

        {/* ROW 6: Deadlines, Risk Heatmap, Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upcoming Deadlines */}
          <GlassCard className="p-5">
            <SectionHeader title={t("dashboard.upcomingDeadlines")} />
            <div className="space-y-1">
              {DEMO_DEADLINES.slice(0, 5).map((deadline) => (
                <DeadlineItem key={deadline.id} deadline={deadline} t={t} />
              ))}
            </div>
            {!hasData && (
              <p className="text-[10px] text-amber-400/70 mt-3 text-center">
                {t("dashboard.sampleDeadlines")}
              </p>
            )}
          </GlassCard>

          {/* Risk Heatmap */}
          <GlassCard className="p-5">
            <SectionHeader title={t("dashboard.riskHeatmap")} />
            <div className="grid grid-cols-4 gap-3 mt-2">
              {DEMO_RISK_HEATMAP.map((item, i) => (
                <RiskHeatmapCell
                  key={i}
                  module={item.module}
                  risk={item.risk}
                />
              ))}
            </div>
            <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-white/5">
              {(["critical", "high", "medium", "low"] as const).map(
                (level, i) => (
                  <div key={level} className="flex items-center gap-1.5">
                    <div
                      className={`w-2.5 h-2.5 rounded ${
                        i === 0
                          ? "bg-red-500"
                          : i === 1
                            ? "bg-red-500/60"
                            : i === 2
                              ? "bg-amber-500/60"
                              : "bg-green-500/60"
                      }`}
                    />
                    <span className="text-[9px] text-white/40">
                      {t(`common.${level}`)}
                    </span>
                  </div>
                ),
              )}
            </div>
            {!hasData && (
              <p className="text-[10px] text-amber-400/70 mt-2 text-center">
                {t("dashboard.sampleData")}
              </p>
            )}
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard className="p-5">
            <SectionHeader title={t("dashboard.quickActions")} />
            <div className="grid grid-cols-2 gap-3 mt-1">
              <QuickActionButton
                icon={Zap}
                label={t("dashboard.runAssessmentAction")}
                href="/assessment"
              />
              <QuickActionButton
                icon={FileUp}
                label={t("dashboard.uploadDoc")}
                href="/dashboard/documents"
              />
              <QuickActionButton
                icon={FileBarChart}
                label={t("dashboard.generateReport")}
                href="/dashboard/tracker"
              />
              <QuickActionButton
                icon={CalendarDays}
                label={t("dashboard.viewTimeline")}
                href="/dashboard/timeline"
              />
            </div>
          </GlassCard>
        </div>

        {/* Import Modal */}
        <AnimatePresence>
          {showImportModal && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowImportModal(false)}
            >
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[#0A0A0B] border border-white/10 rounded-xl p-8 max-w-[400px] w-full shadow-2xl"
              >
                <h2 className="text-[18px] font-medium text-white mb-2">
                  {t("dashboard.selectOperatorType")}
                </h2>
                <p className="text-[13px] text-white/60 mb-6">
                  {t("dashboard.selectOperatorDescription")}
                </p>
                <select
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-white rounded-lg px-4 py-3 text-[14px] mb-6 focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">
                    {t("dashboard.selectOperatorPlaceholder")}
                  </option>
                  <option value="SCO">{t("dashboard.operatorSCO")}</option>
                  <option value="LO">{t("dashboard.operatorLO")}</option>
                  <option value="LSO">{t("dashboard.operatorLSO")}</option>
                  <option value="TCO">{t("dashboard.operatorTCO")}</option>
                  <option value="ISOS">{t("dashboard.operatorISOS")}</option>
                  <option value="PDP">{t("dashboard.operatorPDP")}</option>
                </select>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 border border-white/10 text-white/60 py-2.5 rounded-lg text-[13px] hover:bg-white/5 transition-all"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!selectedOperator || importing}
                    className="flex-1 bg-emerald-500 text-white py-2.5 rounded-lg font-medium text-[13px] hover:bg-emerald-600 transition-all disabled:opacity-50"
                  >
                    {importing ? t("common.importing") : t("common.import")}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// ─── Main Export ───

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="p-6 lg:p-8 min-h-screen">
          <div className="animate-pulse space-y-6 max-w-[1400px]">
            <div className="h-8 bg-white/5 rounded w-1/3" />
            <div className="h-4 bg-white/5 rounded w-1/2" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-white/5 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
