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
import GlassCard from "@/components/ui/GlassCard";

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
  { ssr: false, loading: () => <div className="h-8 w-16" /> },
);
const ComplianceScoreCard = dynamic(
  () => import("@/components/dashboard/ComplianceScoreCard"),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-24 h-24 rounded-full bg-[var(--surface-sunken)]" />
          <div className="flex-1 space-y-3">
            <div className="h-4 bg-[var(--surface-sunken)] rounded w-32" />
            <div className="h-8 bg-[var(--surface-sunken)] rounded w-20" />
            <div className="h-3 bg-[var(--surface-sunken)] rounded w-48" />
          </div>
        </div>
      </div>
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
      <Loader2 className="w-6 h-6 text-[var(--text-disabled)] animate-spin" />
    </div>
  );
}

// Border-top colors for each KPI card position
const KPI_TOP_COLORS = [
  "rgba(74, 98, 232, 0.4)", // Compliance Score — accent blue
  "rgba(90, 173, 255, 0.4)", // Articles — info blue
  "rgba(167, 139, 250, 0.4)", // Documents — purple
  "rgba(245, 166, 35, 0.4)", // Days — warning amber
];

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
      ? "text-[var(--status-success)]"
      : trend === "down"
        ? "text-[var(--status-danger)]"
        : "text-[var(--text-tertiary)]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: 0.1 + delay * 0.07,
        duration: 0.5,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className="
        relative overflow-hidden rounded-[var(--radius-lg)] p-6
        bg-[linear-gradient(135deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.01)_100%)]
        backdrop-blur-[24px] backdrop-saturate-[1.3]
        border border-[rgba(255,255,255,0.08)]
        shadow-[var(--shadow-lg),inset_0_1px_0_rgba(255,255,255,0.04)]
        hover:-translate-y-0.5 hover:shadow-[var(--shadow-xl)]
        hover:border-[rgba(255,255,255,0.10)]
        transition-all duration-[var(--duration-normal)] ease-[var(--ease-spring)]
        group
      "
      style={{
        borderTopColor: KPI_TOP_COLORS[delay] || KPI_TOP_COLORS[0],
        borderTopWidth: "2px",
      }}
    >
      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[12px] font-medium uppercase tracking-[0.03em] text-[var(--text-secondary)]">
          {label}
        </p>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" aria-hidden="true" />
            <span className="text-[11px] font-medium">{trendValue}</span>
            <span className="sr-only">
              Trend:{" "}
              {trend === "up"
                ? "increasing"
                : trend === "down"
                  ? "decreasing"
                  : "stable"}
            </span>
          </div>
        )}
      </div>

      {/* Hero number */}
      <p className="text-[48px] font-semibold text-[var(--text-primary)] leading-none tracking-[-0.03em] group-hover:[text-shadow:0_0_30px_rgba(232,232,237,0.05)]">
        {value}
      </p>

      {/* Sparkline */}
      {sparklineData && sparklineData.length > 0 && (
        <div className="mt-4">
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
      <h2 className="text-[15px] font-semibold text-[var(--text-primary)] tracking-[-0.005em]">
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
      <div className="w-12 h-12 rounded-full bg-[var(--bg-surface-3)] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6 text-[var(--text-tertiary)]" />
      </div>
      <h3 className="text-[14px] font-medium text-[var(--text-secondary)] mb-1">
        {title}
      </h3>
      <p className="text-[12px] text-[var(--text-tertiary)] mb-4 max-w-[240px]">
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
    critical:
      "bg-[var(--status-danger-bg)] text-[var(--status-danger)] border-[var(--status-danger-border)]",
    high: "bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]",
    medium:
      "bg-[var(--accent-primary-soft)] text-[var(--accent-300)] border-[rgba(74,98,232,0.15)]",
    low: "bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]",
  };

  const dotColors = {
    critical: "bg-[var(--status-danger)]",
    high: "bg-[var(--status-warning)]",
    medium: "bg-[var(--accent-400)]",
    low: "bg-[var(--status-success)]",
  };

  const dueDate = new Date(deadline.dueDate);
  const today = new Date();
  const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

  return (
    <div className="flex items-center gap-3 py-2.5">
      <div
        aria-hidden="true"
        className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[deadline.priority]}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text-secondary)] truncate">
          {deadline.title}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
          {daysUntil > 0
            ? t("common.days", { count: daysUntil })
            : t("common.overdue")}
        </p>
      </div>
      <span
        className={`text-[11px] font-medium tracking-[0.04em] px-2 py-0.5 rounded-[var(--radius-xs)] border ${priorityColors[deadline.priority]}`}
      >
        {t(`common.${deadline.priority}`)}
      </span>
    </div>
  );
}

function RiskHeatmapCell({ module, risk }: { module: string; risk: string }) {
  const riskColors = {
    critical: "bg-[var(--status-danger)]",
    high: "bg-[rgba(232,84,84,0.5)]",
    medium: "bg-[rgba(245,166,35,0.5)]",
    low: "bg-[rgba(61,214,140,0.5)]",
  };

  return (
    <div className="flex flex-col items-center">
      <div
        className={`w-10 h-10 rounded-[var(--radius-sm)] ${riskColors[risk as keyof typeof riskColors]} flex items-center justify-center mb-1`}
        title={`${module}: ${risk} risk`}
      >
        <span className="text-[10px] text-[var(--text-primary)] font-medium">
          {module.slice(0, 2)}
        </span>
      </div>
      <span className="text-[10px] text-[var(--text-tertiary)]">{module}</span>
      <span className="sr-only">{risk} risk</span>
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
      className="flex flex-col items-center gap-2 p-3 rounded-[var(--radius-md)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.08)] transition-all duration-[var(--duration-fast)] ease-[var(--ease-out)] group"
    >
      <Icon className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[var(--accent-400)] transition-colors duration-[var(--duration-fast)]" />
      <span className="text-[10px] font-medium tracking-[0.02em] text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors duration-[var(--duration-fast)]">
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
    <div className="flex items-start gap-3 py-3 border-b border-[rgba(255,255,255,0.03)] last:border-0">
      <div
        className="w-8 h-8 rounded-[var(--radius-sm)] bg-[var(--bg-surface-3)] flex items-center justify-center flex-shrink-0"
        aria-hidden="true"
      >
        <Icon className="w-4 h-4 text-[var(--text-tertiary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text-secondary)] truncate">
          {activity.description || activity.action.replace(/_/g, " ")}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5">
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
      <div
        className="min-h-screen"
        role="status"
        aria-live="polite"
        aria-label="Loading dashboard"
      >
        <div className="space-y-6 max-w-[1360px]">
          <div className="h-8 animate-v2-skeleton rounded-[var(--radius-sm)] w-1/3" />
          <div className="h-4 animate-v2-skeleton rounded-[var(--radius-sm)] w-1/2" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-36 animate-v2-skeleton rounded-[var(--radius-lg)]"
              />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-[340px] animate-v2-skeleton rounded-[var(--radius-lg)]"
              />
            ))}
          </div>
          <span className="sr-only">Loading dashboard data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <div
              role="status"
              className="bg-[var(--accent-success-soft)] border border-[var(--accent-success)] rounded-[var(--v2-radius-md)] px-4 py-3 flex items-center gap-3 shadow-[var(--v2-shadow-md)]"
            >
              <CheckCircle
                className="w-5 h-5 text-[var(--accent-success)]"
                aria-hidden="true"
              />
              <span className="text-body-lg text-[var(--text-primary)] font-medium">
                {t("dashboard.assessmentImported")}
              </span>
              <button
                onClick={() => setShowSuccessToast(false)}
                aria-label="Dismiss notification"
                className="text-[var(--text-secondary)] hover:text-[var(--text-secondary)]"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-[1360px]">
        {/* Pending Assessment Banner */}
        {pendingAssessment && (
          <motion.div
            initial={false}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 bg-[var(--accent-primary-soft)] border border-[var(--accent-primary)/20] rounded-xl p-6"
          >
            <div className="flex items-start gap-4">
              <ClipboardList
                className="w-5 h-5 text-[var(--accent-primary)] mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-body-lg font-medium text-[var(--text-primary)] mb-1">
                  {t("dashboard.assessmentResultsAvailable")}
                </h3>
                <p className="text-body text-[var(--text-secondary)]">
                  {t("dashboard.importAssessmentDescription")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleImportFromLocalStorage}
                  disabled={importing}
                  className="bg-[var(--accent-primary)] text-white text-small font-medium px-4 py-2 rounded-lg hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50 flex items-center gap-2"
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
                  aria-label="Dismiss assessment notification"
                  className="text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)] p-1"
                >
                  <X size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 0.61, 0.36, 1] }}
          className="mb-10"
        >
          <h1 className="text-[32px] font-semibold text-[var(--text-primary)] tracking-[-0.02em] leading-tight mb-1">
            {t("dashboard.welcomeBack", { name: firstName })}
          </h1>
          <p className="text-[14px] text-[var(--text-tertiary)]">
            {t("dashboard.commandCenter")}
          </p>
        </motion.div>

        {/* Compliance Score Card */}
        <ComplianceScoreCard />

        {/* Demo Mode Banner */}
        {!hasData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.3 }}
            className="flex items-center gap-3 px-4 py-3 mb-6 rounded-[var(--radius-md)] bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)]"
          >
            <div className="w-2 h-2 rounded-full bg-[var(--status-warning)] animate-pulse" />
            <p className="text-[12px] text-[var(--status-warning)]">
              {t("dashboard.demoMode")}
            </p>
            <Link
              href="/assessment"
              className="ml-auto text-[12px] text-[var(--status-warning)] hover:text-[var(--text-primary)] underline underline-offset-2 transition-colors duration-[var(--duration-fast)]"
            >
              {t("dashboard.startAssessmentLink")}
            </Link>
          </motion.div>
        )}

        {/* ROW 1: KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
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
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              delay: 0.45,
              duration: 0.4,
              ease: [0.22, 0.61, 0.36, 1],
            }}
            className="bg-[var(--bg-surface-2)] border border-dashed border-[rgba(255,255,255,0.06)] rounded-[var(--radius-lg)] p-8 text-center mb-10"
          >
            <h2 className="text-[16px] font-semibold text-[var(--text-primary)] mb-2">
              {t("dashboard.importResults")}
            </h2>
            <p className="text-[13px] text-[var(--text-tertiary)] mb-6 max-w-md mx-auto">
              {t("dashboard.importDescription")}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/assessment"
                className="
                  bg-[var(--accent-500)] text-white font-medium text-[14px] px-6 py-2.5 rounded-[var(--radius-sm)]
                  shadow-[0_2px_8px_rgba(74,98,232,0.25),0_0_0_1px_rgba(74,98,232,0.3)]
                  hover:bg-[var(--accent-400)] hover:shadow-[0_4px_12px_rgba(74,98,232,0.35)]
                  transition-all duration-[var(--duration-fast)] flex items-center gap-2
                "
              >
                <PlayCircle size={16} aria-hidden="true" />
                {t("dashboard.runAssessmentAction")}
              </Link>
              <button
                onClick={() => setShowImportModal(true)}
                className="
                  border border-[rgba(255,255,255,0.08)] text-[var(--text-secondary)] font-medium text-[14px] px-6 py-2.5
                  rounded-[var(--radius-sm)] hover:bg-[rgba(255,255,255,0.04)] hover:border-[rgba(255,255,255,0.12)]
                  transition-all duration-[var(--duration-fast)]
                "
              >
                {t("dashboard.alreadyRanIt")}
              </button>
            </div>
          </motion.div>
        )}

        {/* ROW 2: Compliance Overview + Module Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <GlassCard hover={false} className="p-6">
            <SectionHeader title={t("dashboard.complianceOverview")} />
            <ComplianceDonutChart
              data={complianceSegments}
              totalScore={hasData ? progressPercent : 48}
              isDemo={!hasData}
            />
          </GlassCard>

          <GlassCard hover={false} className="p-6">
            <SectionHeader title={t("dashboard.moduleProgress")} />
            <ModuleProgressChart data={moduleChartData} isDemo={!hasData} />
          </GlassCard>
        </div>

        {/* ROW 3: Timeline + Radar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <GlassCard hover={false} className="p-6">
            <SectionHeader title={t("dashboard.complianceTimeline")} />
            <ComplianceTimelineChart
              data={DEMO_TIMELINE_DATA}
              isDemo={!hasData}
            />
          </GlassCard>

          <GlassCard hover={false} className="p-6">
            <SectionHeader title={t("dashboard.regulatoryCoverage")} />
            <RegulatoryRadarChart data={radarData} isDemo={!hasData} />
          </GlassCard>
        </div>

        {/* ROW 4: Recent Activity */}
        <GlassCard hover={false} className="p-6 mb-10">
          <SectionHeader
            title={t("dashboard.recentActivity")}
            action={
              <Link
                href="/dashboard/audit-center"
                className="text-[12px] text-[var(--accent-300)] hover:text-[var(--accent-200)] flex items-center gap-1 transition-colors duration-[var(--duration-fast)]"
              >
                {t("common.viewAll")}{" "}
                <ChevronRight className="w-4 h-4" aria-hidden="true" />
              </Link>
            }
          />
          {recentActivity.length > 0 ? (
            <div className="divide-y divide-[rgba(255,255,255,0.03)]">
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
                  className="text-small text-[var(--accent-primary)] hover:text-[var(--accent-primary-hover)]"
                >
                  {t("dashboard.runAssessmentAction")}
                </Link>
              }
            />
          )}
        </GlassCard>

        {/* ROW 5: Deadlines, Risk Heatmap, Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Upcoming Deadlines */}
          <GlassCard hover={false} className="p-6">
            <SectionHeader title={t("dashboard.upcomingDeadlines")} />
            <div className="space-y-1">
              {DEMO_DEADLINES.slice(0, 5).map((deadline) => (
                <DeadlineItem key={deadline.id} deadline={deadline} t={t} />
              ))}
            </div>
          </GlassCard>

          {/* Risk Heatmap */}
          <GlassCard hover={false} className="p-6">
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
            <div className="flex justify-center gap-4 mt-4 pt-3 border-t border-[rgba(255,255,255,0.04)]">
              {(["critical", "high", "medium", "low"] as const).map(
                (level, i) => (
                  <div key={level} className="flex items-center gap-1.5">
                    <div
                      aria-hidden="true"
                      className={`w-2.5 h-2.5 rounded-sm ${
                        i === 0
                          ? "bg-[var(--status-danger)]"
                          : i === 1
                            ? "bg-[rgba(232,84,84,0.5)]"
                            : i === 2
                              ? "bg-[rgba(245,166,35,0.5)]"
                              : "bg-[rgba(61,214,140,0.5)]"
                      }`}
                    />
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {t(`common.${level}`)}
                    </span>
                  </div>
                ),
              )}
            </div>
          </GlassCard>

          {/* Quick Actions */}
          <GlassCard hover={false} className="p-6">
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
              initial={false}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-6"
              onClick={() => setShowImportModal(false)}
            >
              <motion.div
                role="dialog"
                aria-label={t("dashboard.selectOperatorType")}
                aria-modal="true"
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-[var(--bg-surface-4)] border border-[rgba(255,255,255,0.08)] rounded-[var(--radius-2xl)] p-8 max-w-[400px] w-full shadow-[var(--shadow-xl)]"
              >
                <h2 className="text-heading font-medium text-[var(--text-primary)] mb-2">
                  {t("dashboard.selectOperatorType")}
                </h2>
                <p className="text-body text-[var(--text-secondary)] mb-6">
                  {t("dashboard.selectOperatorDescription")}
                </p>
                <label htmlFor="operator-type-select" className="sr-only">
                  {t("dashboard.selectOperatorType")}
                </label>
                <select
                  id="operator-type-select"
                  value={selectedOperator}
                  onChange={(e) => setSelectedOperator(e.target.value)}
                  className="w-full bg-[var(--surface-sunken)] border border-[var(--border-default)] text-[var(--text-primary)] rounded-lg px-4 py-3 text-body-lg mb-6 focus:outline-none focus:border-[var(--border-focus)]"
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
                    className="flex-1 border border-[var(--border-default)] text-[var(--text-secondary)] py-2.5 rounded-lg text-body hover:bg-[var(--surface-sunken)] transition-all"
                  >
                    {t("common.cancel")}
                  </button>
                  <button
                    onClick={handleImport}
                    disabled={!selectedOperator || importing}
                    className="flex-1 bg-[var(--accent-primary)] text-white py-2.5 rounded-lg font-medium text-body hover:bg-[var(--accent-primary-hover)] transition-all disabled:opacity-50"
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
        <div className="min-h-screen" role="status" aria-live="polite">
          <div className="animate-pulse space-y-6 max-w-[1360px]">
            <div className="h-8 bg-[var(--surface-sunken)] rounded w-1/3" />
            <div className="h-4 bg-[var(--surface-sunken)] rounded w-1/2" />
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-8">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-[var(--surface-sunken)] rounded-xl"
                />
              ))}
            </div>
            <span className="sr-only">Loading dashboard...</span>
          </div>
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
