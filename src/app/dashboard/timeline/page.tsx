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
  Filter,
  Download,
  X,
  Diamond,
} from "lucide-react";
import Card, { CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/dashboard/EmptyState";
import {
  deadlineColors,
  categoryMetadata,
  getDaysUntilDue,
  getDeadlineUrgency,
} from "@/data/timeline-deadlines";

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
  { id: "overview", label: "Overview", icon: <LayoutList size={18} /> },
  { id: "calendar", label: "Calendar", icon: <CalendarDays size={18} /> },
  {
    id: "mission-timeline",
    label: "Mission Timeline",
    icon: <GanttChartSquare size={18} />,
  },
  { id: "reminders", label: "Reminders", icon: <Bell size={18} /> },
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
  date: string; // ISO date string
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

// ─── Gantt Component ───

function MissionTimelineGantt() {
  const [phases] = useState<MissionPhase[]>(DEFAULT_MISSION_PHASES);
  const [hoveredPhase, setHoveredPhase] = useState<string | null>(null);
  const [hoveredMilestone, setHoveredMilestone] = useState<string | null>(null);

  // Calculate global time range from all phases
  const timeRange = useMemo(() => {
    const starts = phases.map((p) => new Date(p.startDate).getTime());
    const ends = phases.map((p) => new Date(p.endDate).getTime());
    const minTime = Math.min(...starts);
    const maxTime = Math.max(...ends);
    return { min: minTime, max: maxTime, span: maxTime - minTime };
  }, [phases]);

  // Generate year labels for the time axis
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

  // Helper: calculate bar position and width as percentages
  const getBarStyle = (startDate: string, endDate: string) => {
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    const left = ((start - timeRange.min) / timeRange.span) * 100;
    const width = ((end - start) / timeRange.span) * 100;
    return { left: `${left}%`, width: `${Math.max(width, 0.5)}%` };
  };

  // Helper: calculate milestone position
  const getMilestoneOffset = (date: string) => {
    const ts = new Date(date).getTime();
    return ((ts - timeRange.min) / timeRange.span) * 100;
  };

  // Color mapping for phases
  const phaseColors: Record<
    string,
    { bar: string; bg: string; text: string; border: string }
  > = {
    blue: {
      bar: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    amber: {
      bar: "bg-amber-500",
      bg: "bg-amber-500/10",
      text: "text-amber-400",
      border: "border-amber-500/30",
    },
    purple: {
      bar: "bg-purple-500",
      bg: "bg-purple-500/10",
      text: "text-purple-400",
      border: "border-purple-500/30",
    },
    emerald: {
      bar: "bg-emerald-500",
      bg: "bg-emerald-500/10",
      text: "text-emerald-400",
      border: "border-emerald-500/30",
    },
    slate: {
      bar: "bg-slate-500",
      bg: "bg-slate-500/10",
      text: "text-slate-400",
      border: "border-slate-500/30",
    },
  };

  const statusLabel = (status: MissionPhase["status"]) => {
    switch (status) {
      case "completed":
        return { text: "Completed", cls: "bg-emerald-500/20 text-emerald-400" };
      case "active":
        return { text: "Active", cls: "bg-emerald-500/20 text-emerald-400" };
      case "future":
        return { text: "Upcoming", cls: "bg-slate-500/20 text-slate-400" };
    }
  };

  // "Today" marker position
  const todayOffset = useMemo(() => {
    const now = Date.now();
    if (now < timeRange.min || now > timeRange.max) return null;
    return ((now - timeRange.min) / timeRange.span) * 100;
  }, [timeRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <GanttChartSquare size={20} />
          Mission Timeline
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm">
            <Download size={14} className="mr-1" />
            Export
          </Button>
          <Button size="sm">
            <Plus size={14} className="mr-1" />
            Add Phase
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 mb-6 text-xs text-slate-500 dark:text-white/50">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            Active
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            Completed
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm bg-slate-500" />
            Upcoming
          </div>
          <div className="flex items-center gap-1.5">
            <Diamond size={10} className="text-white/80" />
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
        <div className="hidden md:block">
          {/* Time axis */}
          <div className="relative h-8 mb-2 ml-48 border-b border-slate-200 dark:border-white/10">
            {yearLabels.map(({ year, offset }) => (
              <div
                key={year}
                className="absolute top-0 flex flex-col items-center"
                style={{ left: `${offset}%` }}
              >
                <div className="h-3 w-px bg-slate-300 dark:bg-white/20" />
                <span className="text-[10px] font-mono text-slate-500 dark:text-white/40 mt-0.5 -translate-x-1/2">
                  {year}
                </span>
              </div>
            ))}
            {/* Today marker on axis */}
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
                      className={`text-sm font-medium truncate ${hoveredPhase === phase.id ? "text-white" : "text-slate-700 dark:text-white/80"}`}
                    >
                      {phase.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`px-1.5 py-0.5 text-[10px] rounded-full ${sl.cls}`}
                      >
                        {sl.text}
                      </span>
                      <span className="text-[10px] text-slate-400 dark:text-white/40 font-mono">
                        {new Date(phase.startDate).getFullYear()}&ndash;
                        {new Date(phase.endDate).getFullYear()}
                      </span>
                    </div>
                  </div>

                  {/* Gantt bar area */}
                  <div className="flex-1 relative h-10 bg-slate-50 dark:bg-white/[0.02] rounded-lg border border-slate-100 dark:border-white/5">
                    {/* Year grid lines */}
                    {yearLabels.map(({ year, offset }) => (
                      <div
                        key={year}
                        className="absolute top-0 bottom-0 w-px bg-slate-100 dark:bg-white/5"
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
                      className={`absolute top-1.5 bottom-1.5 rounded-md ${colors.bar} ${
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
                                ? "text-white fill-white"
                                : "text-white/90 fill-white/90"
                            } drop-shadow-md transition-all`}
                          />
                          {/* Milestone tooltip */}
                          {hoveredMilestone === msKey && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 bg-slate-900 border border-white/10 rounded-lg shadow-xl text-xs whitespace-nowrap z-30 pointer-events-none">
                              <p className="font-medium text-white">
                                {ms.label}
                              </p>
                              <p className="text-white/50 font-mono text-[10px] mt-0.5">
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

        {/* Mobile stacked view */}
        <div className="md:hidden space-y-3">
          {phases.map((phase) => {
            const colors = phaseColors[phase.color] || phaseColors.slate;
            const sl = statusLabel(phase.status);

            return (
              <div
                key={phase.id}
                className={`rounded-lg border p-3 ${colors.border} ${colors.bg}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-slate-900 dark:text-white">
                    {phase.name}
                  </p>
                  <span
                    className={`px-2 py-0.5 text-[10px] rounded-full ${sl.cls}`}
                  >
                    {sl.text}
                  </span>
                </div>

                {/* Date range */}
                <p className="text-xs font-mono text-slate-500 dark:text-white/50 mb-2">
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
                <div className="relative h-2 bg-white/10 rounded-full overflow-hidden mb-2">
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
                        <span className="text-slate-700 dark:text-white/70">
                          {ms.label}
                        </span>
                        <span className="ml-auto font-mono text-slate-400 dark:text-white/40">
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
        <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/5 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-white/40">
          <span>
            {phases.length} phases &middot;{" "}
            {phases.reduce((acc, p) => acc + (p.milestones?.length || 0), 0)}{" "}
            milestones
          </span>
          <span className="font-mono">
            {new Date(timeRange.min).getFullYear()} &ndash;{" "}
            {new Date(timeRange.max).getFullYear()}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function TimelinePageContent() {
  const [activeStep, setActiveStep] = useState<Step>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [overdueDeadlines, setOverdueDeadlines] = useState<Deadline[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showDeadlineForm, setShowDeadlineForm] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string | null>(null);

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
        <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">
          {Math.abs(days)} days overdue
        </span>
      );
    }
    if (urgency === "due_soon") {
      return (
        <span className="px-2 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-400">
          {days === 0
            ? "Due today"
            : days === 1
              ? "Due tomorrow"
              : `${days} days left`}
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-500/20 text-emerald-400">
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

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(
        <div
          key={`empty-${i}`}
          className="h-24 bg-slate-50 dark:bg-white/[0.01]"
        />,
      );
    }

    // Add cells for each day
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
          className={`h-24 p-2 border-r border-b border-slate-200 dark:border-white/5 ${
            isToday ? "bg-emerald-500/10" : "bg-slate-50 dark:bg-white/[0.01]"
          }`}
        >
          <div
            className={`text-sm font-medium mb-1 ${isToday ? "text-emerald-400" : "text-slate-500 dark:text-white/60"}`}
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
                      ? "bg-red-500/20 text-red-300"
                      : event.priority === "CRITICAL"
                        ? "bg-orange-500/20 text-orange-300"
                        : "bg-emerald-500/20 text-emerald-300"
                    : "bg-purple-500/20 text-purple-300"
                }`}
                title={event.title}
              >
                {event.title}
              </div>
            ))}
            {dayEvents.length > 3 && (
              <div className="text-xs text-slate-400 dark:text-white/40">
                +{dayEvents.length - 3} more
              </div>
            )}
          </div>
        </div>,
      );
    }

    return days;
  };

  if (loading) {
    return (
      <div className="space-y-6" role="status" aria-live="polite">
        <div className="h-8 bg-slate-200 dark:bg-white/5 rounded w-1/3 animate-pulse" />
        <div className="h-64 bg-slate-200 dark:bg-white/5 rounded-xl animate-pulse" />
        <span className="sr-only">Loading timeline data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500 dark:text-white/60 mb-2">
            TIMELINE
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Timeline & Deadlines
          </h1>
          <p className="text-slate-500 dark:text-white/60 mt-1">
            Manage compliance deadlines and mission milestones
          </p>
        </div>
        <Button onClick={() => setShowDeadlineForm(true)}>
          <Plus size={16} className="mr-1" />
          Add Deadline
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className={`bg-white dark:bg-white/[0.02] ${stats.overdue > 0 ? "border-red-500/30" : ""}`}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${stats.overdue > 0 ? "bg-red-500/20" : "bg-slate-200 dark:bg-white/5"}`}
                >
                  <AlertTriangle
                    size={18}
                    className={
                      stats.overdue > 0
                        ? "text-red-400"
                        : "text-slate-400 dark:text-white/40"
                    }
                  />
                </div>
                <div>
                  <p
                    className={`text-2xl font-semibold ${stats.overdue > 0 ? "text-red-400" : "text-white"}`}
                  >
                    {stats.overdue}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Overdue
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Clock size={18} className="text-orange-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {stats.dueThisWeek}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    This Week
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <Calendar size={18} className="text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {stats.dueThisMonth}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    This Month
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white dark:bg-white/[0.02]">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 size={18} className="text-emerald-400" />
                </div>
                <div>
                  <p className="text-2xl font-semibold text-slate-900 dark:text-white">
                    {stats.completionRate}%
                  </p>
                  <p className="text-xs text-slate-500 dark:text-white/50">
                    Completed
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step Navigation */}
      <div
        className="flex items-center gap-2 p-1 bg-white dark:bg-white/[0.02] rounded-xl border border-slate-200 dark:border-white/5"
        role="tablist"
        aria-label="Timeline views"
      >
        {steps.map((step) => (
          <button
            key={step.id}
            role="tab"
            aria-selected={activeStep === step.id}
            aria-controls={`tabpanel-${step.id}`}
            onClick={() => setActiveStep(step.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg
              text-sm font-medium transition-all
              ${
                activeStep === step.id
                  ? "bg-slate-200 dark:bg-white/10 text-white"
                  : "text-slate-500 dark:text-white/50 hover:text-white/70 hover:bg-slate-200 dark:bg-white/5"
              }
            `}
          >
            <span aria-hidden="true">{step.icon}</span>
            <span className="hidden md:inline">{step.label}</span>
          </button>
        ))}
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeStep}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {/* Overview */}
          {activeStep === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Overdue Deadlines */}
              {overdueDeadlines.length > 0 && (
                <div className="lg:col-span-3">
                  <Card className="border-red-500/20 bg-red-500/5">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-red-400">
                        <AlertTriangle size={20} />
                        Overdue Deadlines
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {overdueDeadlines.map((deadline) => (
                        <div
                          key={deadline.id}
                          className="flex items-center justify-between bg-red-500/10 rounded-lg p-3"
                        >
                          <div className="flex items-center gap-3">
                            <div className="text-red-400">
                              {categoryIcons[deadline.category]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">
                                {deadline.title}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-white/50">
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
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => completeDeadline(deadline.id)}
                            >
                              Mark Done
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Upcoming Deadlines */}
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Clock size={20} />
                      Upcoming Deadlines
                    </CardTitle>
                    <button
                      onClick={() =>
                        setSelectedFilter(selectedFilter ? null : "filter")
                      }
                      aria-label="Filter deadlines"
                      className="p-2 hover:bg-slate-200 dark:bg-white/5 rounded-lg transition-colors"
                    >
                      <Filter
                        size={16}
                        className="text-slate-500 dark:text-white/60"
                        aria-hidden="true"
                      />
                    </button>
                  </CardHeader>
                  <CardContent>
                    {deadlines.length === 0 ? (
                      <EmptyState
                        icon={<Calendar size={28} />}
                        title="No deadlines set"
                        description="Create your first deadline to start tracking your compliance timeline."
                        actionLabel="Add Deadline"
                        onAction={() => setShowDeadlineForm(true)}
                      />
                    ) : (
                      <div className="space-y-3">
                        {deadlines.map((deadline) => (
                          <div
                            key={deadline.id}
                            className="flex items-center justify-between bg-white dark:bg-white/[0.02] rounded-lg p-3 hover:bg-slate-50 dark:bg-white/[0.04] transition-colors cursor-pointer"
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
                                <p className="font-medium text-slate-900 dark:text-white">
                                  {deadline.title}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-slate-500 dark:text-white/50">
                                    {new Date(
                                      deadline.dueDate,
                                    ).toLocaleDateString()}
                                  </span>
                                  {deadline.regulatoryRef && (
                                    <span className="text-xs text-slate-400 dark:text-white/40">
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
                  </CardContent>
                </Card>
              </div>

              {/* Categories Summary */}
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>By Category</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {categoryMetadata.map((cat) => {
                      const count = deadlines.filter(
                        (d) => d.category === cat.id,
                      ).length;
                      return (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-200 dark:bg-white/5 transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className="p-1.5 rounded"
                              style={{ backgroundColor: `${cat.color}20` }}
                            >
                              {categoryIcons[cat.id]}
                            </div>
                            <span className="text-sm text-slate-700 dark:text-white/80">
                              {cat.label}
                            </span>
                          </div>
                          <span className="text-sm font-medium text-slate-900 dark:text-white">
                            {count}
                          </span>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {activeStep === "calendar" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar size={20} />
                  {currentMonth.toLocaleString("default", {
                    month: "long",
                    year: "numeric",
                  })}
                </CardTitle>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.setMonth(currentMonth.getMonth() - 1),
                        ),
                      )
                    }
                    aria-label="Previous month"
                    className="p-2 hover:bg-slate-200 dark:bg-white/5 rounded-lg transition-colors"
                  >
                    <ChevronLeft
                      size={16}
                      className="text-slate-500 dark:text-white/60"
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    onClick={() => setCurrentMonth(new Date())}
                    className="px-3 py-1 text-xs bg-slate-200 dark:bg-white/5 hover:bg-slate-200 dark:bg-white/10 rounded-lg transition-colors"
                  >
                    Today
                  </button>
                  <button
                    onClick={() =>
                      setCurrentMonth(
                        new Date(
                          currentMonth.setMonth(currentMonth.getMonth() + 1),
                        ),
                      )
                    }
                    aria-label="Next month"
                    className="p-2 hover:bg-slate-200 dark:bg-white/5 rounded-lg transition-colors"
                  >
                    <ChevronRight
                      size={16}
                      className="text-slate-500 dark:text-white/60"
                      aria-hidden="true"
                    />
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                {/* Calendar Header */}
                <div className="grid grid-cols-7 border-b border-slate-200 dark:border-white/10 mb-1">
                  {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                    (day) => (
                      <div
                        key={day}
                        className="py-2 text-center text-xs font-medium text-slate-500 dark:text-white/50"
                      >
                        {day}
                      </div>
                    ),
                  )}
                </div>
                {/* Calendar Grid */}
                <div className="grid grid-cols-7 border-l border-t border-slate-200 dark:border-white/5">
                  {renderCalendar()}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mission Timeline (Gantt) */}
          {activeStep === "mission-timeline" && <MissionTimelineGantt />}

          {/* Reminders */}
          {activeStep === "reminders" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell size={20} />
                  Notification Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-white dark:bg-white/[0.02] rounded-lg p-4 border border-slate-200 dark:border-white/5">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-4">
                    Reminder Schedule
                  </h4>
                  <div className="space-y-3">
                    {[30, 14, 7, 3, 1].map((days) => (
                      <div
                        key={days}
                        className="flex items-center justify-between"
                      >
                        <span className="text-slate-700 dark:text-white/80">
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

                <div className="bg-white dark:bg-white/[0.02] rounded-lg p-4 border border-slate-200 dark:border-white/5">
                  <h4 className="font-medium text-slate-900 dark:text-white mb-4">
                    Notification Channels
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-white/80">
                        Email notifications
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
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-white/80">
                        In-app notifications
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
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-white/80">
                        Daily digest
                      </span>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className="w-11 h-6 bg-slate-200 dark:bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 dark:text-white/80">
                        Weekly summary
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
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button>Save Settings</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Add Deadline Modal */}
      {showDeadlineForm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div
            role="dialog"
            aria-label="Add new deadline"
            aria-modal="true"
            className="bg-white dark:bg-[#0a0a0b] border border-slate-200 dark:border-white/10 rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                Add New Deadline
              </h3>
              <button
                onClick={() => setShowDeadlineForm(false)}
                aria-label="Close dialog"
                className="p-2 hover:bg-slate-200 dark:bg-white/5 rounded-lg transition-colors"
              >
                <X
                  size={16}
                  className="text-slate-500 dark:text-white/60"
                  aria-hidden="true"
                />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={deadlineForm.title}
                  onChange={(e) =>
                    setDeadlineForm({ ...deadlineForm, title: e.target.value })
                  }
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="Deadline title"
                />
              </div>

              <div>
                <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
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
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white h-20 resize-none focus:outline-none focus:border-emerald-500/50"
                  placeholder="Optional description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
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
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
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
                    className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
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
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                >
                  {categoryMetadata.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-slate-500 dark:text-white/60 mb-1">
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
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-4 py-2.5 text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500/50"
                  placeholder="e.g., EU Space Act Art. 45"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() => setShowDeadlineForm(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={createDeadline}
                disabled={!deadlineForm.title || !deadlineForm.dueDate}
              >
                Create Deadline
              </Button>
            </div>
          </div>
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
