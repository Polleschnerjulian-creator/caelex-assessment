"use client";

import { useState, useEffect, useMemo } from "react";
import { csrfHeaders } from "@/lib/csrf-client";
import { motion, AnimatePresence } from "framer-motion";
import FeatureGate from "@/components/dashboard/FeatureGate";
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Plus,
  ChevronRight,
  ChevronLeft,
  Bell,
  FileText,
  Building2,
  Shield,
  Award,
  Rocket,
  Users,
  FileSignature,
  LayoutList,
  CalendarDays,
  GanttChartSquare,
  Download,
  X,
  Diamond,
} from "lucide-react";
import {
  deadlineColors,
  categoryMetadata,
  getDaysUntilDue,
  getDeadlineUrgency,
} from "@/data/timeline-deadlines";

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

// ─── Input style ───

const inputClass =
  "w-full bg-white/40 border border-black/[0.06] rounded-xl px-4 py-2.5 text-sm text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all";

const selectClass =
  "w-full bg-white/40 border border-black/[0.06] rounded-xl px-4 py-2.5 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500/40 transition-all appearance-none";

// ─── Types ───

type Step = "overview" | "calendar" | "mission-timeline" | "reminders";

interface Deadline {
  id: string;
  title: string;
  description: string | null;
  dueDate: string;
  category: string;
  priority: string;
  status: string;
  regulatoryRef: string | null;
  moduleSource: string | null;
  penaltyInfo: string | null;
}

interface DashboardStats {
  overdue: number;
  dueTodayTomorrow: number;
  dueThisWeek: number;
  dueThisMonth: number;
  total: number;
  completed: number;
  completionRate: number;
}

interface CalendarEvent {
  id: string;
  type: "deadline" | "milestone";
  title: string;
  date: string;
  category?: string;
  priority?: string;
  status: string;
}

const steps: { id: Step; label: string; icon: React.ReactNode }[] = [
  { id: "overview", label: "Overview", icon: <LayoutList size={16} /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays size={16} /> },
  {
    id: "mission-timeline",
    label: "Mission Timeline",
    icon: <GanttChartSquare size={16} />,
  },
  { id: "reminders", label: "Reminders", icon: <Bell size={16} /> },
];

const categoryIcons: Record<string, React.ReactNode> = {
  REGULATORY: <Building2 size={16} />,
  LICENSE: <FileText size={16} />,
  REPORTING: <FileText size={16} />,
  INSURANCE: <Shield size={16} />,
  CERTIFICATION: <Award size={16} />,
  MISSION: <Rocket size={16} />,
  INTERNAL: <Users size={16} />,
  CONTRACTUAL: <FileSignature size={16} />,
};

// ─── Mission Phase Types ───

interface MissionMilestone {
  label: string;
  date: string;
}

interface MissionPhase {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: "completed" | "active" | "future";
  color: string;
  milestones?: MissionMilestone[];
}

const DEFAULT_MISSION_PHASES: MissionPhase[] = [
  {
    id: "design",
    name: "Design & Development",
    startDate: "2024-01-01",
    endDate: "2029-12-31",
    status: "active",
    color: "blue",
    milestones: [
      { label: "PDR", date: "2025-06-01" },
      { label: "CDR", date: "2027-01-01" },
      { label: "FM Delivery", date: "2029-06-01" },
    ],
  },
  {
    id: "authorization",
    name: "Authorization",
    startDate: "2028-01-01",
    endDate: "2030-06-30",
    status: "future",
    color: "amber",
    milestones: [
      { label: "Application Submit", date: "2028-06-01" },
      { label: "Authorization Granted", date: "2030-01-01" },
    ],
  },
  {
    id: "launch",
    name: "Launch Campaign",
    startDate: "2030-01-01",
    endDate: "2030-12-31",
    status: "future",
    color: "purple",
    milestones: [
      { label: "Launch Readiness Review", date: "2030-03-01" },
      { label: "Launch", date: "2030-06-15" },
    ],
  },
  {
    id: "operations",
    name: "Operations",
    startDate: "2030-06-15",
    endDate: "2045-12-31",
    status: "future",
    color: "emerald",
    milestones: [
      { label: "IOD Complete", date: "2031-01-01" },
      { label: "Mid-Life Review", date: "2037-06-01" },
    ],
  },
  {
    id: "eol",
    name: "End of Life",
    startDate: "2045-01-01",
    endDate: "2050-12-31",
    status: "future",
    color: "slate",
    milestones: [
      { label: "Deorbit Start", date: "2046-01-01" },
      { label: "Disposal Complete", date: "2050-06-01" },
    ],
  },
];

// ─── Sidebar Stat Row ───

function StatRow({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between px-1 py-1.5">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-sm font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// ─── Gantt Component ───

function MissionTimelineGantt() {
  const [phases] = useState<MissionPhase[]>(DEFAULT_MISSION_PHASES);
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null);

  const timeRange = useMemo(() => {
    const starts = phases.map((p) => new Date(p.startDate).getTime());
    const ends = phases.map((p) => new Date(p.endDate).getTime());
    const minTime = Math.min(...starts);
    const maxTime = Math.max(...ends);
    return { min: minTime, max: maxTime, span: maxTime - minTime };
  }, [phases]);

  const yearLabels = useMemo(() => {
    const startYear = new Date(timeRange.min).getFullYear();
    const endYear = new Date(timeRange.max).getFullYear();
    const labels: { year: number; offset: number }[] = [];
    for (let y = startYear; y <= endYear; y++) {
      const ts = new Date(y, 0, 1).getTime();
      const offset = ((ts - timeRange.min) / timeRange.span) * 100;
      labels.push({ year: y, offset: Math.max(0, Math.min(100, offset)) });
    }
    return labels;
  }, [timeRange]);

  const getBarStyle = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const left = ((start - timeRange.min) / timeRange.span) * 100;
    const width = ((end - start) / timeRange.span) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  const getMilestoneOffset = (date: string) => {
    const ts = new Date(date).getTime();
    return ((ts - timeRange.min) / timeRange.span) * 100;
  };

  const phaseColors: Record<
    string,
    { bar: string; bg: string; text: string; border: string }
  > = {
    blue: {
      bar: "bg-blue-500",
      bg: "bg-blue-50",
      text: "text-blue-600",
      border: "border-blue-200",
    },
    amber: {
      bar: "bg-amber-500",
      bg: "bg-amber-50",
      text: "text-amber-600",
      border: "border-amber-200",
    },
    purple: {
      bar: "bg-purple-500",
      bg: "bg-purple-50",
      text: "text-purple-600",
      border: "border-purple-200",
    },
    emerald: {
      bar: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-600",
      border: "border-emerald-200",
    },
    slate: {
      bar: "bg-slate-400",
      bg: "bg-slate-50",
      text: "text-slate-500",
      border: "border-slate-200",
    },
  };

  const statusLabel = (status: MissionPhase["status"]) => {
    switch (status) {
      case "completed":
        return {
          text: "Completed",
          cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
        };
      case "active":
        return {
          text: "Active",
          cls: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
        };
      case "future":
        return {
          text: "Upcoming",
          cls: "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400",
        };
    }
  };

  const todayOffset = useMemo(() => {
    const now = Date.now();
    if (now < timeRange.min || now > timeRange.max) return null;
    return ((now - timeRange.min) / timeRange.span) * 100;
  }, [timeRange]);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-base font-semibold text-slate-800 dark:text-white flex items-center gap-2">
          <GanttChartSquare size={18} className="text-slate-400" />
          Mission Timeline
        </h3>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-white/50 transition-colors border border-black/[0.04] dark:border-white/5">
            <Download size={13} />
            Export
          </button>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 dark:bg-emerald-600 text-white hover:bg-slate-700 dark:hover:bg-emerald-500 transition-colors">
            <Plus size={13} />
            Add Phase
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 mb-5 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-blue-500" />
          Active
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-emerald-500" />
          Completed
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-slate-300" />
          Upcoming
        </div>
        <div className="flex items-center gap-1.5">
          <Diamond size={10} className="text-slate-500" />
          Milestone
        </div>
        {todayOffset !== null && (
          <div className="flex items-center gap-1.5">
            <span className="w-0.5 h-3 bg-red-500 rounded-full" />
            Today
          </div>
        )}
      </div>

      {/* Desktop Gantt view */}
      <div
        className={`hidden md:block ${innerGlassDarkClass}`}
        style={innerGlass}
      >
        <div className="p-4">
          {/* Time axis */}
          <div className="relative h-8 mb-2 ml-48 border-b border-black/[0.06] dark:border-white/5">
            {yearLabels.map(({ year, offset }) => (
              <div
                key={year}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${offset}%` }}
              >
                <div className="h-3 w-px bg-slate-300 dark:bg-white/10" />
                <span className="text-[10px] text-slate-400 mt-0.5 -translate-x-1/2">
                  {year}
                </span>
              </div>
            ))}
            {todayOffset !== null && (
              <div
                className="absolute top-0 bottom-0 w-px bg-red-500 z-10"
                style={{ left: `${todayOffset}%` }}
              />
            )}
          </div>

          {/* Phase rows */}
          <div className="space-y-2">
            {phases.map((phase) => {
              const colors = phaseColors[phase.color] || phaseColors.slate;
              const bar = getBarStyle(phase.startDate, phase.endDate);
              const sl = statusLabel(phase.status);

              return (
                <div
                  key={phase.id}
                  className="flex items-center group"
                  onMouseEnter={() => setHoveredPhase(phase.id)}
                  onMouseLeave={() => setHoveredPhase(null)}
                >
                  {/* Phase label */}
                  <div className="w-48 flex-shrink-0 pr-4">
                    <p
                      className={`text-sm font-medium truncate ${
                        hoveredPhase === phase.id
                          ? "text-slate-800 dark:text-white"
                          : "text-slate-500"
                      }`}
                    >
                      {phase.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded-full ${sl.cls}`}
                      >
                        {sl.text}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(phase.startDate).getFullYear()}&ndash;
                        {new Date(phase.endDate).getFullYear()}
                      </span>
                    </div>
                  </div>

                  {/* Gantt bar area */}
                  <div className="flex-1 relative h-10 bg-white/30 dark:bg-white/5 rounded-lg border border-black/[0.04] dark:border-white/5">
                    {/* Year grid lines */}
                    {yearLabels.map(({ year, offset }) => (
                      <div
                        key={year}
                        className="absolute top-0 bottom-0 w-px bg-slate-200/50 dark:bg-white/5"
                        style={{ left: `${offset}%` }}
                      />
                    ))}

                    {/* Today marker */}
                    {todayOffset !== null && (
                      <div
                        className="absolute top-0 bottom-0 w-px bg-red-500/60 z-10"
                        style={{ left: `${todayOffset}%` }}
                      />
                    )}

                    {/* Phase bar */}
                    <div
                      className={`absolute top-1.5 bottom-1.5 rounded-lg ${colors.bar} ${
                        hoveredPhase === phase.id
                          ? "opacity-100 shadow-lg"
                          : "opacity-80"
                      } transition-all duration-150`}
                      style={bar}
                    />

                    {/* Milestones */}
                    {phase.milestones?.map((ms) => {
                      const offset = getMilestoneOffset(ms.date);
                      const msKey = `${phase.id}-${ms.date}`;
                      return (
                        <div
                          key={msKey}
                          className="absolute top-1/2 -translate-y-1/2 z-20 group/ms"
                          style={{ left: `${offset}%` }}
                          onMouseEnter={() => setHoveredMilestone(msKey)}
                          onMouseLeave={() => setHoveredMilestone(null)}
                        >
                          <Diamond
                            size={12}
                            className={`-translate-x-1/2 ${
                              hoveredMilestone === msKey
                                ? "text-slate-800 fill-slate-800 dark:text-white dark:fill-white"
                                : "text-slate-600 fill-white/90 dark:text-white dark:fill-white/90"
                            } drop-shadow-md transition-all`}
                          />
                          {/* Milestone tooltip */}
                          {hoveredMilestone === msKey && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-800 dark:bg-slate-900 border border-black/[0.04] dark:border-white/10 rounded-lg shadow-xl text-xs whitespace-nowrap z-30 pointer-events-none">
                              <p className="font-medium text-white">
                                {ms.label}
                              </p>
                              <p className="text-slate-400 text-[10px] mt-0.5">
                                {new Date(ms.date).toLocaleDateString("en-US", {
                                  month: "short",
                                  year: "numeric",
                                })}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Mobile stacked view */}
      <div className="md:hidden space-y-3">
        {phases.map((phase) => {
          const colors = phaseColors[phase.color] || phaseColors.slate;
          const sl = statusLabel(phase.status);

          return (
            <div
              key={phase.id}
              className={`rounded-xl border p-3 ${colors.border} ${colors.bg}`}
              style={innerGlass}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-slate-800 dark:text-white">
                  {phase.name}
                </p>
                <span
                  className={`px-2 py-0.5 text-[10px] rounded-full ${sl.cls}`}
                >
                  {sl.text}
                </span>
              </div>

              {/* Date range */}
              <p className="text-xs text-slate-500 mb-2">
                {new Date(phase.startDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}{" "}
                &ndash;{" "}
                {new Date(phase.endDate).toLocaleDateString("en-US", {
                  month: "short",
                  year: "numeric",
                })}
              </p>

              {/* Mini progress bar */}
              <div className="relative h-2 bg-slate-200/50 dark:bg-white/10 rounded-full overflow-hidden mb-2">
                {(() => {
                  const now = Date.now();
                  const start = new Date(phase.startDate).getTime();
                  const end = new Date(phase.endDate).getTime();
                  const progress = Math.max(
                    0,
                    Math.min(100, ((now - start) / (end - start)) * 100),
                  );
                  return (
                    <div
                      className={`absolute inset-y-0 left-0 rounded-full ${colors.bar}`}
                      style={{
                        width: `${phase.status === "future" ? 0 : progress}%`,
                      }}
                    />
                  );
                })()}
              </div>

              {/* Milestones list */}
              {phase.milestones && phase.milestones.length > 0 && (
                <div className="space-y-1">
                  {phase.milestones.map((ms) => (
                    <div
                      key={ms.date}
                      className="flex items-center gap-2 text-xs"
                    >
                      <Diamond size={8} className={colors.text} />
                      <span className="text-slate-500">{ms.label}</span>
                      <span className="ml-auto text-slate-400">
                        {new Date(ms.date).toLocaleDateString("en-US", {
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary footer */}
      <div className="mt-5 pt-4 border-t border-black/[0.04] dark:border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-500">
        <span>
          {phases.length} phases &middot;{" "}
          {phases.reduce((acc, p) => acc + (p.milestones?.length || 0), 0)}{" "}
          milestones
        </span>
        <span>
          {new Date(timeRange.min).getFullYear()} &ndash;{" "}
          {new Date(timeRange.max).getFullYear()}
        </span>
      </div>
    </div>
  );
}

// ─── Main Page Content ───

function TimelinePageContent() {
  const [activeStep, setActiveStep] = useState<Step>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [overdueDeadlines, setOverdueDeadlines] = useState<Deadline[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [selectedPriorityFilter, setSelectedPriorityFilter] = useState<
    string | null
  >(null);

  // Form state
  const [deadlineForm, setDeadlineForm] = useState({
    title: "",
    description: "",
    dueDate: "",
    category: "REGULATORY",
    priority: "MEDIUM",
    regulatoryRef: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeStep === "calendar") {
      fetchCalendarData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep, currentMonth]);

  const fetchData = async () => {
    try {
      const [dashboardRes, deadlinesRes] = await Promise.all([
        fetch("/api/timeline"),
        fetch("/api/timeline/deadlines?status=active&limit=20"),
      ]);

      if (dashboardRes.ok) {
        const data = await dashboardRes.json();
        setStats(data.stats);
        setOverdueDeadlines(data.overdueDeadlines || []);
      }

      if (deadlinesRes.ok) {
        const data = await deadlinesRes.json();
        setDeadlines(data.deadlines || []);
      }
    } catch (error) {
      console.error("Error fetching timeline data:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarData = async () => {
    try {
      const month = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
      const res = await fetch(`/api/timeline/calendar?month=${month}`);
      if (res.ok) {
        const data = await res.json();
        setCalendarEvents(data.events || []);
      }
    } catch (error) {
      console.error("Error fetching calendar data:", error);
    }
  };

  const createDeadline = async () => {
    try {
      const res = await fetch("/api/timeline/deadlines", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(deadlineForm),
      });

      if (res.ok) {
        setShowDeadlineForm(false);
        setDeadlineForm({
          title: "",
          description: "",
          dueDate: "",
          category: "REGULATORY",
          priority: "MEDIUM",
          regulatoryRef: "",
        });
        fetchData();
      }
    } catch (error) {
      console.error("Error creating deadline:", error);
    }
  };

  const completeDeadline = async (id: string) => {
    try {
      const res = await fetch(`/api/timeline/deadlines/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({}),
      });

      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Error completing deadline:", error);
    }
  };

  const getStatusBadge = (deadline: Deadline) => {
    const urgency = getDeadlineUrgency(new Date(deadline.dueDate));
    const days = getDaysUntilDue(new Date(deadline.dueDate));

    if (urgency === "overdue") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
          {Math.abs(days)} days overdue
        </span>
      );
    }
    if (urgency === "due_soon") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
          {days === 0
            ? "Due today"
            : days === 1
              ? "Due tomorrow"
              : `${days} days left`}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
        {days} days left
      </span>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const color =
      deadlineColors.priority[
        priority as keyof typeof deadlineColors.priority
      ] || "#6b7280";
    return (
      <span
        className="px-2 py-0.5 text-xs rounded-full"
        style={{ backgroundColor: `${color}20`, color }}
      >
        {priority}
      </span>
    );
  };

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const renderCalendar = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDay = getFirstDayOfMonth(currentMonth);
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-24 bg-white/20 dark:bg-white/[0.02]"
        />,
      );
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const dayEvents = calendarEvents.filter((e) =>
        e.date.startsWith(dateStr),
      );
      const isToday =
        new Date().toDateString() === new Date(dateStr).toDateString();

      days.push(
        <div
          key={day}
          className={`h-24 p-2 border-r border-b border-black/[0.04] dark:border-white/5 ${
            isToday
              ? "bg-blue-50/80 dark:bg-blue-500/10"
              : "bg-white/20 dark:bg-white/[0.02]"
          }`}
        >
          <div
            className={`text-sm font-medium mb-1 ${isToday ? "text-blue-600 dark:text-blue-400" : "text-slate-500"}`}
          >
            {day}
          </div>
          <div className="space-y-1 overflow-y-auto max-h-16">
            {dayEvents.slice(0, 3).map((event) => (
              <div
                key={event.id}
                className={`text-xs px-1.5 py-0.5 rounded truncate ${
                  event.type === "deadline"
                    ? event.status === "OVERDUE"
                      ? "bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400"
                      : event.priority === "CRITICAL"
                        ? "bg-amber-100 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400"
                        : "bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400"
                    : "bg-purple-100 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400"
                }`}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-slate-400">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>,
      );
    }

    return days;
  };

  // ─── Loading State ───

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 dark:text-white/[0.55]">
            Loading timeline...
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-100 via-blue-50/40 to-slate-200 dark:bg-none dark:bg-transparent p-3 gap-3">
      {/* ─── Left Panel — Navigation + Stats + Filters ─── */}
      <div
        className={`w-[260px] shrink-0 flex flex-col ${glassPanelDarkClass}`}
        style={glassPanel}
      >
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Timeline
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Mission deadlines & milestones
          </p>
        </div>

        {/* View Navigation */}
        <nav className="px-3 space-y-0.5">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setActiveStep(step.id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeStep === step.id
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/40 dark:text-slate-400 dark:hover:text-white"
              }`}
            >
              {step.icon}
              {step.label}
            </button>
          ))}
        </nav>

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-black/[0.06] dark:border-white/10" />

        {/* Stats Summary */}
        {stats && (
          <div className="px-4 space-y-2">
            <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium px-1 mb-1.5">
              Quick Stats
            </p>
            <StatRow
              icon={<AlertTriangle size={14} />}
              label="Overdue"
              value={stats.overdue}
              color={stats.overdue > 0 ? "text-red-500" : "text-slate-400"}
            />
            <StatRow
              icon={<Clock size={14} />}
              label="Due Soon"
              value={stats.dueTodayTomorrow}
              color={
                stats.dueTodayTomorrow > 0 ? "text-amber-500" : "text-slate-400"
              }
            />
            <StatRow
              icon={<Calendar size={14} />}
              label="This Week"
              value={stats.dueThisWeek}
              color="text-slate-700 dark:text-slate-200"
            />
            <StatRow
              icon={<CalendarDays size={14} />}
              label="This Month"
              value={stats.dueThisMonth}
              color="text-slate-700 dark:text-slate-200"
            />

            {/* Completion Ring */}
            <div
              className={`mt-3 rounded-xl p-3 ${innerGlassDarkClass}`}
              style={innerGlass}
            >
              <div className="flex items-center gap-3">
                <div className="relative w-11 h-11">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 44 44">
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="rgba(0,0,0,0.06)"
                      strokeWidth="4"
                    />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke="#10b981"
                      strokeWidth="4"
                      strokeLinecap="round"
                      strokeDasharray={`${(stats.completionRate / 100) * 113} 113`}
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-600 dark:text-slate-300">
                    Completion Rate
                  </p>
                  <p className="text-lg font-semibold text-slate-800 dark:text-white">
                    {stats.completionRate}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="mx-5 my-3 border-t border-black/[0.06] dark:border-white/10" />

        {/* Filters */}
        <div className="px-4 space-y-3 flex-1">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400 font-medium px-1">
            Filters
          </p>

          {/* Category filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 px-1">
              Category
            </label>
            <select
              value={selectedCategoryFilter || ""}
              onChange={(e) =>
                setSelectedCategoryFilter(e.target.value || null)
              }
              className={selectClass}
            >
              <option value="">All Categories</option>
              {categoryMetadata.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority filter */}
          <div>
            <label className="block text-xs text-slate-500 mb-1 px-1">
              Priority
            </label>
            <select
              value={selectedPriorityFilter || ""}
              onChange={(e) =>
                setSelectedPriorityFilter(e.target.value || null)
              }
              className={selectClass}
            >
              <option value="">All Priorities</option>
              <option value="CRITICAL">Critical</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>
          </div>
        </div>

        {/* Add Deadline Button */}
        <div className="px-4 pb-4 pt-2">
          <button
            onClick={() => setShowDeadlineForm(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Add Deadline
          </button>
        </div>
      </div>

      {/* ─── Right Panel — Main Content ─── */}
      <div
        className={`flex-1 min-w-0 flex flex-col ${glassPanelDarkClass}`}
        style={glassPanel}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={activeStep}
            initial={false}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex-1 overflow-y-auto p-5"
          >
            {/* ─── Overview ─── */}
            {activeStep === "overview" && (
              <div className="space-y-5">
                {/* Overdue Deadlines */}
                {overdueDeadlines.length > 0 && (
                  <div
                    className="rounded-2xl p-4 border border-red-200 dark:border-red-500/20"
                    style={{
                      ...innerGlass,
                      background: "rgba(254, 226, 226, 0.5)",
                    }}
                  >
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-red-600 dark:text-red-400 mb-3">
                      <AlertTriangle size={16} />
                      Overdue Deadlines
                    </h3>
                    <div className="space-y-2">
                      {overdueDeadlines.map((deadline) => (
                        <div
                          key={deadline.id}
                          className="flex items-center justify-between bg-red-50/60 dark:bg-red-500/10 rounded-xl p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-red-500">
                              {categoryIcons[deadline.category]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-800 dark:text-white text-sm">
                                {deadline.title}
                              </p>
                              <p className="text-xs text-slate-500">
                                Due:{" "}
                                {new Date(
                                  deadline.dueDate,
                                ).toLocaleDateString()}
                                {deadline.regulatoryRef &&
                                  ` | ${deadline.regulatoryRef}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(deadline)}
                            <button
                              onClick={() => completeDeadline(deadline.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-white/50 dark:text-slate-300 dark:hover:bg-white/10 transition-colors"
                            >
                              Mark Done
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upcoming Deadlines */}
                <div
                  className={`rounded-2xl p-4 ${innerGlassDarkClass}`}
                  style={innerGlass}
                >
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-800 dark:text-white">
                      <Clock size={16} className="text-slate-400" />
                      Upcoming Deadlines
                    </h3>
                  </div>

                  {deadlines.length === 0 ? (
                    <div className="text-center py-12">
                      <Calendar
                        size={32}
                        className="mx-auto text-slate-300 mb-3"
                      />
                      <p className="text-sm font-medium text-slate-500 mb-1">
                        No deadlines set
                      </p>
                      <p className="text-xs text-slate-400 mb-4">
                        Create your first deadline to start tracking your
                        compliance timeline.
                      </p>
                      <button
                        onClick={() => setShowDeadlineForm(true)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 dark:bg-emerald-600 text-white text-sm font-medium hover:bg-slate-700 dark:hover:bg-emerald-500 transition-colors"
                      >
                        <Plus size={14} />
                        Add Deadline
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {deadlines
                        .filter((d) => {
                          const matchesCat =
                            !selectedCategoryFilter ||
                            d.category === selectedCategoryFilter;
                          const matchesPri =
                            !selectedPriorityFilter ||
                            d.priority === selectedPriorityFilter;
                          return matchesCat && matchesPri;
                        })
                        .map((deadline) => (
                          <div
                            key={deadline.id}
                            className="flex items-center justify-between bg-white/30 dark:bg-white/5 rounded-xl p-3 hover:bg-white/50 dark:hover:bg-white/10 transition-colors cursor-pointer border border-black/[0.04] dark:border-white/5"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="p-2 rounded-lg"
                                style={{
                                  backgroundColor: `${deadlineColors.category[deadline.category as keyof typeof deadlineColors.category] || "#6b7280"}20`,
                                }}
                              >
                                {categoryIcons[deadline.category]}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800 dark:text-white text-sm">
                                  {deadline.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500">
                                    {new Date(
                                      deadline.dueDate,
                                    ).toLocaleDateString()}
                                  </span>
                                  {deadline.regulatoryRef && (
                                    <span className="text-xs text-slate-400">
                                      | {deadline.regulatoryRef}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {getPriorityBadge(deadline.priority)}
                              {getStatusBadge(deadline)}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </div>

                {/* Categories Summary */}
                <div
                  className={`rounded-2xl p-4 ${innerGlassDarkClass}`}
                  style={innerGlass}
                >
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-white mb-3">
                    By Category
                  </h3>
                  <div className="space-y-1.5">
                    {categoryMetadata.map((cat) => {
                      const count = deadlines.filter(
                        (d) => d.category === cat.id,
                      ).length;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-white/40 dark:hover:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="p-1.5 rounded"
                              style={{ backgroundColor: `${cat.color}20` }}
                            >
                              {categoryIcons[cat.id]}
                            </div>
                            <span className="text-sm text-slate-500">
                              {cat.label}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-800 dark:text-white">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* ─── Calendar View ─── */}
            {activeStep === "calendar" && (
              <div
                className={`rounded-2xl p-4 ${innerGlassDarkClass}`}
                style={innerGlass}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-white">
                    <Calendar size={18} className="text-slate-400" />
                    {currentMonth.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    })}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() - 1,
                            1,
                          ),
                        )
                      }
                      aria-label="Previous month"
                      className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronLeft
                        size={16}
                        className="text-slate-500"
                        aria-hidden="true"
                      />
                    </button>
                    <button
                      onClick={() => setCurrentMonth(new Date())}
                      className="px-3 py-1 text-xs bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 rounded-lg transition-colors text-slate-600 dark:text-slate-300 font-medium"
                    >
                      Today
                    </button>
                    <button
                      onClick={() =>
                        setCurrentMonth(
                          new Date(
                            currentMonth.getFullYear(),
                            currentMonth.getMonth() + 1,
                            1,
                          ),
                        )
                      }
                      aria-label="Next month"
                      className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
                    >
                      <ChevronRight
                        size={16}
                        className="text-slate-500"
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </div>

                {/* Calendar Header */}
                <div className="grid grid-cols-7 border-b border-black/[0.04] dark:border-white/5 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs font-medium text-slate-500"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 border-l border-t border-black/[0.04] dark:border-white/5">
                  {renderCalendar()}
                </div>
              </div>
            )}

            {/* ─── Mission Timeline (Gantt) ─── */}
            {activeStep === "mission-timeline" && <MissionTimelineGantt />}

            {/* ─── Reminders ─── */}
            {activeStep === "reminders" && (
              <div className="space-y-5">
                {/* Reminder Schedule */}
                <div
                  className={`rounded-2xl p-4 ${innerGlassDarkClass}`}
                  style={innerGlass}
                >
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4 text-sm">
                    Reminder Schedule
                  </h3>
                  <div className="space-y-3">
                    {[30, 14, 7, 3, 1].map((days) => (
                      <div
                        key={days}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-slate-500">
                          {days === 1 ? "1 day before" : `${days} days before`}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Notification Channels */}
                <div
                  className={`rounded-2xl p-4 ${innerGlassDarkClass}`}
                  style={innerGlass}
                >
                  <h3 className="font-semibold text-slate-800 dark:text-white mb-4 text-sm">
                    Notification Channels
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: "Email notifications", defaultOn: true },
                      { label: "In-app notifications", defaultOn: true },
                      { label: "Daily digest", defaultOn: false },
                      { label: "Weekly summary", defaultOn: true },
                    ].map((channel) => (
                      <div
                        key={channel.label}
                        className="flex items-center justify-between"
                      >
                        <span className="text-sm text-slate-500">
                          {channel.label}
                        </span>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            defaultChecked={channel.defaultOn}
                          />
                          <div className="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end">
                  <button className="px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white text-sm font-medium transition-colors">
                    Save Settings
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ─── Add Deadline Modal ─── */}
      {showDeadlineForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            role="dialog"
            aria-label="Add new deadline"
            aria-modal="true"
            className="max-w-lg w-full max-h-[90vh] overflow-y-auto rounded-2xl p-6"
            style={{
              ...glassPanel,
              background: "rgba(255, 255, 255, 0.85)",
              backdropFilter: "blur(32px) saturate(1.4)",
              WebkitBackdropFilter: "blur(32px) saturate(1.4)",
            }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold text-slate-800 dark:text-white">
                Add New Deadline
              </h3>
              <button
                onClick={() => setShowDeadlineForm(false)}
                aria-label="Close dialog"
                className="p-2 hover:bg-white/50 dark:hover:bg-white/10 rounded-lg transition-colors"
              >
                <X size={16} className="text-slate-500" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Title *
                </label>
                <input
                  type="text"
                  value={deadlineForm.title}
                  onChange={(e) =>
                    setDeadlineForm({ ...deadlineForm, title: e.target.value })
                  }
                  className={inputClass}
                  placeholder="Deadline title"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Description
                </label>
                <textarea
                  value={deadlineForm.description}
                  onChange={(e) =>
                    setDeadlineForm({
                      ...deadlineForm,
                      description: e.target.value,
                    })
                  }
                  className={`${inputClass} h-20 resize-none`}
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Due Date *
                  </label>
                  <input
                    type="date"
                    value={deadlineForm.dueDate}
                    onChange={(e) =>
                      setDeadlineForm({
                        ...deadlineForm,
                        dueDate: e.target.value,
                      })
                    }
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Priority *
                  </label>
                  <select
                    value={deadlineForm.priority}
                    onChange={(e) =>
                      setDeadlineForm({
                        ...deadlineForm,
                        priority: e.target.value,
                      })
                    }
                    className={selectClass}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Category *
                </label>
                <select
                  value={deadlineForm.category}
                  onChange={(e) =>
                    setDeadlineForm({
                      ...deadlineForm,
                      category: e.target.value,
                    })
                  }
                  className={selectClass}
                >
                  {categoryMetadata.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1.5">
                  Regulatory Reference
                </label>
                <input
                  type="text"
                  value={deadlineForm.regulatoryRef}
                  onChange={(e) =>
                    setDeadlineForm({
                      ...deadlineForm,
                      regulatoryRef: e.target.value,
                    })
                  }
                  className={inputClass}
                  placeholder="e.g., EU Space Act Art. 45"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-white/50 dark:hover:bg-white/10 transition-colors border border-black/[0.06] dark:border-white/10"
                onClick={() => setShowDeadlineForm(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                onClick={createDeadline}
                disabled={!deadlineForm.title || !deadlineForm.dueDate}
              >
                Create Deadline
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default function TimelinePage() {
  return (
    <FeatureGate module="timeline">
      <TimelinePageContent />
    </FeatureGate>
  );
}
