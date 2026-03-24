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
  Shield,
  Globe,
  Satellite,
  Activity,
  ArrowUpRight,
  Sparkles,
  Target,
  Bell,
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
  { ssr: false, loading: () => <div className="h-8 w-16" /> },
);
const ComplianceScoreCard = dynamic(
  () => import("@/components/dashboard/ComplianceScoreCard"),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse rounded-2xl h-32 bg-white/10" />
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

// ─── Glass Panel Styles ───

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

const glassPanelDark: React.CSSProperties = {
  background: "rgba(255, 255, 255, 0.03)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderTop: "1px solid rgba(255, 255, 255, 0.09)",
  borderRadius: 16,
  boxShadow: "inset 0 1px 0 rgba(255, 255, 255, 0.03)",
  overflow: "hidden",
};

// ─── Helper Components ───

function ChartSkeleton() {
  return (
    <div className="h-[240px] w-full flex items-center justify-center">
      <Loader2 className="w-5 h-5 text-slate-400 dark:text-slate-600 animate-spin" />
    </div>
  );
}

function GlassPanel({
  children,
  className = "",
  style,
  animate = true,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  animate?: boolean;
  delay?: number;
}) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains("dark"));
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains("dark"));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const panelStyle = isDark ? glassPanelDark : glassPanel;

  if (!animate) {
    return (
      <div className={className} style={{ ...panelStyle, ...style }}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        delay: 0.05 + delay * 0.06,
        duration: 0.5,
        ease: [0.22, 0.61, 0.36, 1],
      }}
      className={className}
      style={{ ...panelStyle, ...style }}
    >
      {children}
    </motion.div>
  );
}

function KPIMetric({
  value,
  label,
  trend,
  trendValue,
  icon: Icon,
  sparkData,
  sparkColor,
  delay = 0,
}: {
  value: string | number;
  label: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon: React.ComponentType<{ className?: string }>;
  sparkData?: number[];
  sparkColor?: string;
  delay?: number;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-500"
      : trend === "down"
        ? "text-red-400"
        : "text-slate-400 dark:text-slate-500";

  return (
    <GlassPanel
      delay={delay}
      className="p-5 group hover:-translate-y-0.5 transition-transform duration-300"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="w-8 h-8 rounded-xl bg-white/50 dark:bg-white/[0.06] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-center">
          <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400" />
        </div>
        {trend && trendValue && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-3 h-3" />
            <span className="text-[11px] font-medium">{trendValue}</span>
          </div>
        )}
      </div>
      <p className="text-[32px] font-semibold text-slate-900 dark:text-white leading-none tracking-tight mb-1">
        {value}
      </p>
      <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {label}
      </p>
      {sparkData && sparkData.length > 0 && (
        <div className="mt-3">
          <Sparkline
            data={sparkData}
            color={sparkColor || CHART_COLORS.emerald}
            height={24}
          />
        </div>
      )}
    </GlassPanel>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[13px] font-semibold text-slate-700 dark:text-slate-200 tracking-[-0.01em] mb-3">
      {children}
    </h3>
  );
}

function QuickAction({
  icon: Icon,
  label,
  href,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  accent?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl bg-white/40 dark:bg-white/[0.03] border border-black/[0.04] dark:border-white/[0.06] hover:bg-white/70 dark:hover:bg-white/[0.06] transition-all duration-200 group/qa"
    >
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: accent || "rgba(16, 185, 129, 0.1)",
          color: accent ? accent.replace("0.1)", "0.8)") : "#10B981",
        }}
      >
        <Icon className="w-4 h-4 text-current" />
      </div>
      <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300 group-hover/qa:text-slate-900 dark:group-hover/qa:text-white transition-colors">
        {label}
      </span>
      <ArrowUpRight className="w-3 h-3 text-slate-400 dark:text-slate-500 ml-auto opacity-0 group-hover/qa:opacity-100 transition-opacity" />
    </Link>
  );
}

function DeadlineRow({
  deadline,
  t,
}: {
  deadline: Deadline;
  t: (key: string, params?: Record<string, string | number>) => string;
}) {
  const dotColors = {
    critical: "bg-red-500",
    high: "bg-amber-500",
    medium: "bg-blue-500",
    low: "bg-emerald-500",
  };
  const dueDate = new Date(deadline.dueDate);
  const daysUntil = Math.ceil((dueDate.getTime() - Date.now()) / 86400000);

  return (
    <div className="flex items-center gap-3 py-2.5 border-b border-black/[0.03] dark:border-white/[0.04] last:border-0">
      <div
        className={`w-2 h-2 rounded-full flex-shrink-0 ${dotColors[deadline.priority]}`}
      />
      <div className="flex-1 min-w-0">
        <p className="text-[12px] text-slate-700 dark:text-slate-300 truncate">
          {deadline.title}
        </p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          {daysUntil > 0 ? `${daysUntil} days` : "Overdue"}
        </p>
      </div>
      <span
        className={`text-[9px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full ${
          deadline.priority === "critical"
            ? "bg-red-500/10 text-red-500 border border-red-500/20"
            : deadline.priority === "high"
              ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              : deadline.priority === "medium"
                ? "bg-blue-500/10 text-blue-500 border border-blue-500/20"
                : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
        }`}
      >
        {deadline.priority}
      </span>
    </div>
  );
}

function RiskCell({ module, risk }: { module: string; risk: string }) {
  const colors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-red-500/50",
    medium: "bg-amber-500/50",
    low: "bg-emerald-500/50",
  };
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`w-9 h-9 rounded-lg ${colors[risk] || "bg-slate-500/20"} flex items-center justify-center`}
        title={`${module}: ${risk} risk`}
      >
        <span className="text-[9px] font-bold text-white">
          {module.slice(0, 2)}
        </span>
      </div>
      <span className="text-[9px] text-slate-400 dark:text-slate-500">
        {module}
      </span>
    </div>
  );
}

function ActivityRow({
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
    default: Activity,
  };
  const Icon = iconMap[activity.entityType] || iconMap.default;
  const diff = Date.now() - new Date(activity.timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  const timeAgo =
    mins < 60 ? `${mins}m` : hours < 24 ? `${hours}h` : `${days}d`;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-black/[0.03] dark:border-white/[0.04] last:border-0">
      <div className="w-7 h-7 rounded-lg bg-white/50 dark:bg-white/[0.06] flex items-center justify-center flex-shrink-0">
        <Icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      </div>
      <p className="flex-1 text-[11px] text-slate-600 dark:text-slate-400 truncate">
        {activity.description || activity.action.replace(/_/g, " ")}
      </p>
      <span className="text-[10px] text-slate-400 dark:text-slate-500 flex-shrink-0">
        {timeAgo}
      </span>
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

  // Greeting based on time of day
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

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
      if (stored) setPendingAssessment(JSON.parse(stored));
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
    for (const mod of modules) progress[mod.id] = { total: 0, compliant: 0 };
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
  const handleImport = useCallback(async () => {
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
  }, [selectedOperator]);

  const handleDismissPendingAssessment = useCallback(() => {
    try {
      localStorage.removeItem("caelex-pending-assessment");
    } catch {}
    setPendingAssessment(null);
  }, []);

  const handleImportFromLocalStorage = useCallback(async () => {
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
  }, [pendingAssessment]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-4 overflow-hidden">
        <div className="animate-pulse space-y-4 h-full">
          <div className="h-10 bg-white/30 dark:bg-white/5 rounded-2xl w-1/3" />
          <div className="grid grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-32 bg-white/30 dark:bg-white/5 rounded-2xl"
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-3 flex-1">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-64 bg-white/30 dark:bg-white/5 rounded-2xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] overflow-y-auto">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 right-4 z-50"
          >
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur-xl">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              <span className="text-[13px] text-emerald-600 dark:text-emerald-400 font-medium">
                {t("dashboard.assessmentImported")}
              </span>
              <button
                onClick={() => setShowSuccessToast(false)}
                className="text-emerald-500 hover:text-emerald-600 ml-2"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 lg:p-5 space-y-4">
        {/* ─── Header: Greeting + Ambient Status ─── */}
        <div className="flex items-end justify-between">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 0.61, 0.36, 1] }}
          >
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mb-0.5">
              {greeting}, {firstName}
            </p>
            <h1 className="text-[28px] font-semibold text-slate-900 dark:text-white tracking-tight leading-none">
              {t("dashboard.commandCenter")}
            </h1>
          </motion.div>

          {/* Ambient status pills */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="hidden md:flex items-center gap-2"
          >
            {!hasData && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                <span className="text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  Demo Mode
                </span>
              </div>
            )}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/50 dark:bg-white/[0.04] border border-black/[0.04] dark:border-white/[0.06]">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {daysUntilEnforcement}d to enforcement
              </span>
            </div>
          </motion.div>
        </div>

        {/* ─── Pending Assessment Banner ─── */}
        {pendingAssessment && (
          <GlassPanel delay={0} className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <ClipboardList className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-[13px] font-semibold text-slate-800 dark:text-white">
                  {t("dashboard.assessmentResultsAvailable")}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("dashboard.importAssessmentDescription")}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={handleImportFromLocalStorage}
                  disabled={importing}
                  className="bg-blue-500 text-white text-[12px] font-medium px-4 py-2 rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {importing && <Loader2 size={12} className="animate-spin" />}
                  {importing
                    ? t("common.importing")
                    : t("dashboard.importAssessment")}
                </button>
                <button
                  onClick={handleDismissPendingAssessment}
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-1"
                >
                  <X size={14} />
                </button>
              </div>
            </div>
          </GlassPanel>
        )}

        {/* ─── ROW 1: KPI Metrics ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KPIMetric
            value={`${progressPercent}%`}
            label="Compliance Score"
            trend={progressPercent > 0 ? "up" : "neutral"}
            trendValue={progressPercent > 0 ? "+5%" : "—"}
            icon={Shield}
            sparkData={
              hasData
                ? [10, 15, 22, 28, 35, progressPercent]
                : [10, 18, 28, 35, 42, 48]
            }
            sparkColor={CHART_COLORS.green}
            delay={0}
          />
          <KPIMetric
            value={hasData ? stats.applicable : 52}
            label="Tracked Articles"
            trend="neutral"
            icon={FileText}
            sparkData={[45, 48, 50, 51, 52, 52]}
            sparkColor={CHART_COLORS.emerald}
            delay={1}
          />
          <KPIMetric
            value={documentCount}
            label="Documents"
            trend={documentCount > 0 ? "up" : "neutral"}
            trendValue={documentCount > 0 ? "+3" : "—"}
            icon={FileBarChart}
            sparkData={[0, 2, 5, 8, 12, documentCount]}
            sparkColor={CHART_COLORS.cyan}
            delay={2}
          />
          <KPIMetric
            value={daysUntilEnforcement}
            label="Days to 2030"
            trend="down"
            trendValue="-1/day"
            icon={Clock}
            sparkData={[1500, 1480, 1460, 1440, 1425, daysUntilEnforcement]}
            sparkColor={CHART_COLORS.amber}
            delay={3}
          />
        </div>

        {/* ─── No Data CTA ─── */}
        {!hasData && (
          <GlassPanel delay={4} className="p-6 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-3">
              <Sparkles className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-[15px] font-semibold text-slate-800 dark:text-white mb-1">
              {t("dashboard.importResults")}
            </h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-4 max-w-md mx-auto">
              {t("dashboard.importDescription")}
            </p>
            <div className="flex justify-center gap-3">
              <Link
                href="/assessment"
                className="bg-emerald-500 text-white font-medium text-[13px] px-5 py-2.5 rounded-xl hover:bg-emerald-600 transition-all flex items-center gap-2 shadow-lg shadow-emerald-500/20"
              >
                <PlayCircle size={15} />
                {t("dashboard.runAssessmentAction")}
              </Link>
              <button
                onClick={() => setShowImportModal(true)}
                className="border border-black/[0.08] dark:border-white/[0.1] text-slate-600 dark:text-slate-300 font-medium text-[13px] px-5 py-2.5 rounded-xl hover:bg-white/60 dark:hover:bg-white/[0.06] transition-all"
              >
                {t("dashboard.alreadyRanIt")}
              </button>
            </div>
          </GlassPanel>
        )}

        {/* ─── Compliance Score Card ─── */}
        <GlassPanel delay={5}>
          <ComplianceScoreCard />
        </GlassPanel>

        {/* ─── ROW 2: Charts — Donut + Module Progress ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <GlassPanel delay={6} className="p-5">
            <SectionLabel>{t("dashboard.complianceOverview")}</SectionLabel>
            <ComplianceDonutChart
              data={complianceSegments}
              totalScore={hasData ? progressPercent : 48}
              isDemo={!hasData}
            />
          </GlassPanel>
          <GlassPanel delay={7} className="p-5">
            <SectionLabel>{t("dashboard.moduleProgress")}</SectionLabel>
            <ModuleProgressChart data={moduleChartData} isDemo={!hasData} />
          </GlassPanel>
        </div>

        {/* ─── ROW 3: Timeline + Radar ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <GlassPanel delay={8} className="p-5">
            <SectionLabel>{t("dashboard.complianceTimeline")}</SectionLabel>
            <ComplianceTimelineChart
              data={DEMO_TIMELINE_DATA}
              isDemo={!hasData}
            />
          </GlassPanel>
          <GlassPanel delay={9} className="p-5">
            <SectionLabel>{t("dashboard.regulatoryCoverage")}</SectionLabel>
            <RegulatoryRadarChart data={radarData} isDemo={!hasData} />
          </GlassPanel>
        </div>

        {/* ─── ROW 4: Activity + Deadlines + Quick Actions ─── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Recent Activity */}
          <GlassPanel delay={10} className="p-5">
            <div className="flex items-center justify-between mb-3">
              <SectionLabel>{t("dashboard.recentActivity")}</SectionLabel>
              <Link
                href="/dashboard/audit-center"
                className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 flex items-center gap-0.5"
              >
                All <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {recentActivity.length > 0 ? (
              <div>
                {recentActivity.slice(0, 6).map((a) => (
                  <ActivityRow key={a.id} activity={a} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Activity className="w-8 h-8 text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {t("dashboard.noActivityYet")}
                </p>
              </div>
            )}
          </GlassPanel>

          {/* Deadlines + Risk */}
          <GlassPanel delay={11} className="p-5">
            <SectionLabel>{t("dashboard.upcomingDeadlines")}</SectionLabel>
            <div>
              {DEMO_DEADLINES.slice(0, 4).map((d) => (
                <DeadlineRow key={d.id} deadline={d} t={t} />
              ))}
            </div>

            {/* Mini Risk Heatmap */}
            <div className="mt-4 pt-4 border-t border-black/[0.04] dark:border-white/[0.06]">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-2.5">
                Risk Heatmap
              </p>
              <div className="grid grid-cols-4 gap-2">
                {DEMO_RISK_HEATMAP.map((item, i) => (
                  <RiskCell key={i} module={item.module} risk={item.risk} />
                ))}
              </div>
            </div>
          </GlassPanel>

          {/* Quick Actions */}
          <GlassPanel delay={12} className="p-5">
            <SectionLabel>{t("dashboard.quickActions")}</SectionLabel>
            <div className="space-y-2">
              <QuickAction
                icon={Zap}
                label="Run Assessment"
                href="/assessment"
                accent="rgba(16, 185, 129, 0.1)"
              />
              <QuickAction
                icon={FileUp}
                label="Upload Document"
                href="/dashboard/documents"
                accent="rgba(59, 130, 246, 0.1)"
              />
              <QuickAction
                icon={FileBarChart}
                label="Generate Report"
                href="/dashboard/generate"
                accent="rgba(139, 92, 246, 0.1)"
              />
              <QuickAction
                icon={CalendarDays}
                label="View Timeline"
                href="/dashboard/timeline"
                accent="rgba(245, 158, 11, 0.1)"
              />
              <QuickAction
                icon={Globe}
                label="Regulatory Feed"
                href="/dashboard/regulatory-feed"
                accent="rgba(6, 182, 212, 0.1)"
              />
              <QuickAction
                icon={Target}
                label="NCA Portal"
                href="/dashboard/nca-portal"
                accent="rgba(236, 72, 153, 0.1)"
              />
            </div>
          </GlassPanel>
        </div>

        {/* Bottom spacing */}
        <div className="h-4" />
      </div>

      {/* ─── Import Modal ─── */}
      <AnimatePresence>
        {showImportModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-6"
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
              className="max-w-[400px] w-full p-6"
              style={{
                ...glassPanelDark,
                background: "rgba(255,255,255,0.85)",
              }}
            >
              <h2 className="text-[17px] font-semibold text-slate-900 mb-1">
                {t("dashboard.selectOperatorType")}
              </h2>
              <p className="text-[12px] text-slate-500 mb-5">
                {t("dashboard.selectOperatorDescription")}
              </p>
              <select
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
                className="w-full bg-white/60 border border-black/10 text-slate-900 rounded-xl px-4 py-3 text-[13px] mb-5 focus:outline-none focus:border-blue-500"
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
                  className="flex-1 border border-black/10 text-slate-600 py-2.5 rounded-xl text-[13px] hover:bg-white/60 transition-all"
                >
                  {t("common.cancel")}
                </button>
                <button
                  onClick={handleImport}
                  disabled={!selectedOperator || importing}
                  className="flex-1 bg-blue-500 text-white py-2.5 rounded-xl font-medium text-[13px] hover:bg-blue-600 transition-all disabled:opacity-50"
                >
                  {importing ? t("common.importing") : t("common.import")}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Main Export ───

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:from-[#0f1729] dark:via-[#111d35] dark:to-[#0c1322] p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-white/30 dark:bg-white/5 rounded-2xl w-1/3" />
            <div className="grid grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="h-32 bg-white/30 dark:bg-white/5 rounded-2xl"
                />
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
