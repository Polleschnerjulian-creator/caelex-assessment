"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  FolderKanban,
  Users,
  Plus,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  Timer,
  ChevronRight,
} from "lucide-react";
import { TaskDetailDrawer } from "@/components/hub/TaskDetailDrawer";
import { PriorityIcon } from "@/components/hub/PriorityIcon";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface DashboardStatsData {
  totalProjects: number;
  activeProjects: number;
  openTasks: number;
  inProgress: number;
  completedThisWeek: number;
  totalTasks: number;
}

interface TaskItem {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  position: number;
  dueDate?: string | null;
  project: { id: string; name: string; color: string | null };
  assignee?: { id: string; name: string | null; image: string | null } | null;
  creator: { id: string; name: string | null; image: string | null } | null;
  taskLabels: { label: { id: string; name: string; color: string } }[];
  _count: { comments: number };
  updatedAt?: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  color: string;
  creator: { id: string; name: string | null; image: string | null };
}

interface TimeEntryItem {
  id: string;
  hours: number;
  description: string | null;
  project: { id: string; name: string; color: string | null };
  task: { id: string; title: string } | null;
}

interface Project {
  id: string;
  name: string;
  status: string;
  color: string | null;
  _count: { tasks: number };
  members: {
    user: { id: string; name: string | null; image: string | null };
  }[];
}

interface DashboardData {
  stats: DashboardStatsData;
  recentTasks: TaskItem[];
  projects: Project[];
  myTasks: TaskItem[];
  overdueTasks: TaskItem[];
  todayEvents: CalendarEvent[];
  todayDueTasks: TaskItem[];
  timeEntriesToday: TimeEntryItem[];
  hoursToday: number;
  hoursThisWeek: number;
  weeklyByDay: Record<string, number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const STATUS_COLORS: Record<string, string> = {
  TODO: "bg-[#f5f5f7] text-[#86868b]",
  IN_PROGRESS: "bg-blue-50 text-blue-600",
  IN_REVIEW: "bg-amber-50 text-amber-600",
  DONE: "bg-green-50 text-green-600",
};

function getInitial(name: string | null) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

function relativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  if (isNaN(diffMs)) return "";
  const mins = Math.floor(diffMs / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

function daysOverdue(dueDateStr: string): number {
  const due = new Date(dueDateStr);
  due.setHours(23, 59, 59, 999);
  const diff = Date.now() - due.getTime();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HubDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Time log form
  const [logProjectId, setLogProjectId] = useState("");
  const [logHours, setLogHours] = useState("");
  const [logDesc, setLogDesc] = useState("");
  const [logSubmitting, setLogSubmitting] = useState(false);
  const [logSuccess, setLogSuccess] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/hub/dashboard", {
        headers: { ...csrfHeaders() },
      });
      if (!res.ok) throw new Error("Failed to load dashboard");
      const json = await res.json();
      setData(json as DashboardData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchDashboard();
  }, [fetchDashboard]);

  // Fetch members for task drawer
  const [members, setMembers] = useState<
    { id: string; name: string | null; image: string | null }[]
  >([]);
  useEffect(() => {
    async function loadMembers() {
      try {
        const res = await fetch("/api/v1/hub/members");
        if (!res.ok) return;
        const d = await res.json();
        setMembers(d.members ?? []);
      } catch {
        /* silent */
      }
    }
    void loadMembers();
  }, []);

  async function handleLogTime(e: React.FormEvent) {
    e.preventDefault();
    if (!logProjectId || !logHours) return;
    setLogSubmitting(true);
    try {
      const res = await fetch("/api/v1/hub/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          projectId: logProjectId,
          date: new Date().toISOString().split("T")[0],
          hours: parseFloat(logHours),
          description: logDesc.trim() || null,
        }),
      });
      if (res.ok) {
        setLogHours("");
        setLogDesc("");
        setLogSuccess(true);
        setTimeout(() => setLogSuccess(false), 2000);
        void fetchDashboard();
      }
    } catch {
      /* silent */
    } finally {
      setLogSubmitting(false);
    }
  }

  // ─── Loading ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px]">
        <div className="space-y-2">
          <div className="h-8 w-24 bg-[#f5f5f7] rounded-lg animate-pulse" />
          <div className="h-4 w-40 bg-[#f5f5f7] rounded-lg animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-[#f5f5f7] rounded-2xl h-[96px] animate-pulse"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3 bg-[#f5f5f7] rounded-2xl h-64 animate-pulse" />
          <div className="lg:col-span-2 bg-[#f5f5f7] rounded-2xl h-64 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4">
          <p className="text-[13px] text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────

  if (!data || (data.projects.length === 0 && data.recentTasks.length === 0)) {
    return (
      <div className="p-6 max-w-[1400px]">
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#f5f5f7] flex items-center justify-center mb-6">
            <FolderKanban size={32} className="text-[#1d1d1f]" />
          </div>
          <h2 className="text-[24px] font-bold text-[#1d1d1f] mb-2">
            Welcome to HUB
          </h2>
          <p className="text-[14px] text-[#86868b] mb-8 max-w-sm">
            Create your first project to get started
          </p>
          <Link
            href="/dashboard/hub/projects"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[15px] font-medium rounded-full transition-colors"
          >
            <FolderKanban size={16} />
            Create a Project
          </Link>
        </div>
      </div>
    );
  }

  const { stats } = data;

  // Set default project for time log
  if (!logProjectId && data.projects.length > 0) {
    setLogProjectId(data.projects[0].id);
  }

  // ─── Weekly chart data ─────────────────────────────────────────────────

  const weekDays: { label: string; key: string; hours: number }[] = [];
  const dayLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const now = new Date();
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - mondayOffset + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    weekDays.push({
      label: dayLabels[i],
      key,
      hours: data.weeklyByDay[key] ?? 0,
    });
  }
  const maxWeekHours = Math.max(...weekDays.map((d) => d.hours), 1);

  // ─── Render ────────────────────────────────────────────────────────────

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* ── Header + Quick Actions ─────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#1d1d1f]">HUB</h1>
          <p className="text-[14px] text-[#86868b] mt-1">Project Management</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/hub/tasks"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/dashboard/hub/tasks";
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-full transition-colors"
          >
            <Plus size={13} /> New Task
          </Link>
          <Link
            href="/dashboard/hub/calendar"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-full transition-colors"
          >
            <Calendar size={13} /> Calendar
          </Link>
          <Link
            href="/dashboard/hub/timesheet"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-[#f5f5f7] hover:bg-[#e8e8ed] rounded-full transition-colors"
          >
            <Clock size={13} /> Timesheet
          </Link>
        </div>
      </div>

      {/* ── Overdue Banner ─────────────────────────────────────────────── */}
      {data.overdueTasks.length > 0 && (
        <div className="bg-red-50 border border-red-100 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-[14px] font-semibold text-red-600">
              {data.overdueTasks.length} overdue{" "}
              {data.overdueTasks.length === 1 ? "task" : "tasks"}
            </span>
          </div>
          <div className="space-y-1.5">
            {data.overdueTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="flex items-center gap-3 px-3 py-2 bg-white/80 rounded-xl cursor-pointer hover:bg-white transition-colors"
              >
                <PriorityIcon
                  priority={
                    task.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW"
                  }
                  size={12}
                />
                <span className="text-[13px] text-[#1d1d1f] font-medium flex-1 truncate">
                  {task.title}
                </span>
                <span
                  className="text-[11px] px-1.5 py-0.5 rounded-md"
                  style={{
                    backgroundColor: `${task.project.color ?? "#3B82F6"}15`,
                    color: task.project.color ?? "#3B82F6",
                  }}
                >
                  {task.project.name}
                </span>
                <span className="text-[11px] text-red-500 font-medium">
                  {daysOverdue(task.dueDate!)}d overdue
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Stats Row ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: FolderKanban,
            value: stats.activeProjects,
            label: "Active Projects",
            sub: `${stats.totalProjects} total`,
          },
          {
            icon: ListTodo,
            value: stats.openTasks,
            label: "Open Tasks",
            sub: `${stats.totalTasks} total`,
          },
          {
            icon: Timer,
            value: stats.inProgress,
            label: "In Progress",
            sub: null,
          },
          {
            icon: CheckCircle2,
            value: stats.completedThisWeek,
            label: "Completed This Week",
            sub: null,
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]"
            >
              <Icon size={20} className="text-[#1d1d1f] mb-3" />
              <p className="text-[24px] font-bold text-[#1d1d1f] leading-none">
                {card.value}
              </p>
              <p className="text-[11px] text-[#86868b] uppercase tracking-wider mt-1">
                {card.label}
              </p>
              {card.sub && (
                <p className="text-[11px] text-[#86868b]/60 mt-0.5">
                  {card.sub}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Main Grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* ── Left Column (3/5) ─────────────────────────────────────────── */}
        <div className="lg:col-span-3 space-y-6">
          {/* My Tasks */}
          <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5ea] flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                My Tasks
              </h2>
              <Link
                href="/dashboard/hub/tasks"
                className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors flex items-center gap-0.5"
              >
                View all <ChevronRight size={12} />
              </Link>
            </div>

            {data.myTasks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px] text-[#86868b]">
                  No tasks assigned to you
                </p>
              </div>
            ) : (
              <div>
                {(["IN_PROGRESS", "IN_REVIEW", "TODO"] as const).map(
                  (status) => {
                    const filtered = data.myTasks.filter(
                      (t) => t.status === status,
                    );
                    if (filtered.length === 0) return null;
                    return (
                      <div key={status}>
                        <div className="px-5 py-2 bg-[#fafafa] border-b border-[#e5e5ea]">
                          <span
                            className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}
                          >
                            {STATUS_LABELS[status]}
                          </span>
                          <span className="text-[11px] text-[#86868b] ml-2">
                            {filtered.length}
                          </span>
                        </div>
                        {filtered.map((task) => (
                          <div
                            key={task.id}
                            onClick={() => setSelectedTaskId(task.id)}
                            className="flex items-center gap-3 px-5 py-3 border-b border-[#f5f5f7] hover:bg-[#f5f5f7] cursor-pointer transition-colors"
                          >
                            <PriorityIcon
                              priority={
                                task.priority as
                                  | "URGENT"
                                  | "HIGH"
                                  | "MEDIUM"
                                  | "LOW"
                              }
                              size={12}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-[13px] text-[#1d1d1f] font-medium truncate">
                                {task.title}
                              </p>
                            </div>
                            <span
                              className="text-[11px] px-1.5 py-0.5 rounded-md flex-shrink-0"
                              style={{
                                backgroundColor: `${task.project.color ?? "#3B82F6"}15`,
                                color: task.project.color ?? "#3B82F6",
                              }}
                            >
                              {task.project.name}
                            </span>
                            {task.dueDate && (
                              <span className="text-[11px] text-[#86868b] flex-shrink-0">
                                {new Date(task.dueDate).toLocaleDateString(
                                  "en-US",
                                  { month: "short", day: "numeric" },
                                )}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  },
                )}
              </div>
            )}
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5ea]">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                Recent Activity
              </h2>
            </div>
            {data.recentTasks.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[13px] text-[#86868b]">No recent activity</p>
              </div>
            ) : (
              <ul>
                {data.recentTasks.map((task, i) => (
                  <li
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className={`flex items-center gap-3 px-5 py-3 hover:bg-[#f5f5f7] cursor-pointer transition-colors ${i < data.recentTasks.length - 1 ? "border-b border-[#e5e5ea]" : ""}`}
                  >
                    <span
                      className="flex-shrink-0 w-2 h-2 rounded-full"
                      style={{
                        backgroundColor: task.project.color ?? "#3B82F6",
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1d1d1f] truncate">
                        {task.title}
                      </p>
                      <p className="text-[12px] text-[#86868b] truncate">
                        {task.project.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span
                        className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[task.status] ?? "bg-[#f5f5f7] text-[#86868b]"}`}
                      >
                        {STATUS_LABELS[task.status] ?? task.status}
                      </span>
                      {task.updatedAt && (
                        <span className="text-[11px] text-[#86868b]/60 tabular-nums w-12 text-right">
                          {relativeTime(task.updatedAt)}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* ── Right Column (2/5) ────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule */}
          <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5ea] flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                Today
              </h2>
              <Link
                href="/dashboard/hub/calendar"
                className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors flex items-center gap-0.5"
              >
                Calendar <ChevronRight size={12} />
              </Link>
            </div>

            {data.todayEvents.length === 0 &&
            data.todayDueTasks.length === 0 ? (
              <div className="px-5 py-8 text-center">
                <Calendar size={24} className="mx-auto text-[#d1d1d6] mb-2" />
                <p className="text-[13px] text-[#86868b]">
                  Nothing scheduled today
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#f5f5f7]">
                {/* Events */}
                {data.todayEvents.map((evt) => (
                  <div
                    key={evt.id}
                    className="flex items-start gap-3 px-5 py-3"
                  >
                    <span
                      className="flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1"
                      style={{ backgroundColor: evt.color }}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#1d1d1f]">
                        {evt.title}
                      </p>
                      <p className="text-[11px] text-[#86868b]">
                        {evt.startTime && evt.endTime
                          ? `${evt.startTime} – ${evt.endTime}`
                          : evt.startTime
                            ? evt.startTime
                            : "All day"}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Due tasks */}
                {data.todayDueTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="flex items-center gap-3 px-5 py-3 cursor-pointer hover:bg-[#f5f5f7] transition-colors"
                  >
                    <PriorityIcon
                      priority={
                        task.priority as "URGENT" | "HIGH" | "MEDIUM" | "LOW"
                      }
                      size={12}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1d1d1f] font-medium truncate">
                        {task.title}
                      </p>
                      <p className="text-[11px] text-[#86868b]">
                        Due today &middot; {task.project.name}
                      </p>
                    </div>
                    {task.assignee && (
                      <span className="w-5 h-5 rounded-full bg-[#f5f5f7] text-[10px] font-semibold text-[#1d1d1f] flex items-center justify-center flex-shrink-0">
                        {getInitial(task.assignee.name)}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Time Tracking */}
          <div className="bg-white rounded-2xl border border-[#e5e5ea] shadow-[0_2px_12px_rgba(0,0,0,0.04)] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#e5e5ea] flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                Time Tracking
              </h2>
              <Link
                href="/dashboard/hub/timesheet"
                className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors flex items-center gap-0.5"
              >
                Timesheet <ChevronRight size={12} />
              </Link>
            </div>

            <div className="px-5 py-4 space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-[#f5f5f7] rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#1d1d1f]">
                    {data.hoursToday.toFixed(1)}h
                  </p>
                  <p className="text-[11px] text-[#86868b]">Today</p>
                </div>
                <div className="bg-[#f5f5f7] rounded-xl p-3 text-center">
                  <p className="text-[20px] font-bold text-[#1d1d1f]">
                    {data.hoursThisWeek.toFixed(1)}h
                  </p>
                  <p className="text-[11px] text-[#86868b]">This Week</p>
                </div>
              </div>

              {/* Weekly mini chart */}
              <div className="flex items-end gap-1.5 h-16">
                {weekDays.map((d) => {
                  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
                  const isToday = d.key === todayKey;
                  const height =
                    d.hours > 0
                      ? Math.max(8, (d.hours / maxWeekHours) * 100)
                      : 4;
                  return (
                    <div
                      key={d.key}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <div
                        className={`w-full rounded-md transition-all ${isToday ? "bg-[#1d1d1f]" : d.hours > 0 ? "bg-[#86868b]/30" : "bg-[#f5f5f7]"}`}
                        style={{ height: `${height}%` }}
                        title={`${d.hours}h`}
                      />
                      <span
                        className={`text-[10px] ${isToday ? "text-[#1d1d1f] font-medium" : "text-[#86868b]"}`}
                      >
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Quick log form */}
              <form
                onSubmit={(e) => void handleLogTime(e)}
                className="space-y-2"
              >
                <p className="text-[12px] font-medium text-[#86868b] uppercase tracking-wider">
                  Quick Log
                </p>
                <div className="flex gap-2">
                  <select
                    value={logProjectId}
                    onChange={(e) => setLogProjectId(e.target.value)}
                    className="flex-1 bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg px-2.5 py-2 text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#1d1d1f]/30"
                  >
                    {data.projects.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.25"
                    min="0.25"
                    max="24"
                    value={logHours}
                    onChange={(e) => setLogHours(e.target.value)}
                    placeholder="Hours"
                    className="w-20 bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg px-2.5 py-2 text-[13px] text-[#1d1d1f] focus:outline-none focus:border-[#1d1d1f]/30"
                    required
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    placeholder="What did you work on?"
                    className="flex-1 bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg px-2.5 py-2 text-[13px] text-[#1d1d1f] placeholder:text-[#86868b]/50 focus:outline-none focus:border-[#1d1d1f]/30"
                  />
                  <button
                    type="submit"
                    disabled={logSubmitting || !logHours}
                    className="px-4 py-2 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[13px] font-medium rounded-lg transition-colors disabled:opacity-50"
                  >
                    {logSuccess ? "Logged!" : logSubmitting ? "..." : "Log"}
                  </button>
                </div>
              </form>

              {/* Today's entries */}
              {data.timeEntriesToday.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-[11px] text-[#86868b]">
                    Today&apos;s entries
                  </p>
                  {data.timeEntriesToday.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-center gap-2 text-[12px]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: entry.project.color ?? "#3B82F6",
                        }}
                      />
                      <span className="text-[#1d1d1f] font-medium">
                        {entry.hours}h
                      </span>
                      <span className="text-[#86868b] truncate flex-1">
                        {entry.description ?? entry.project.name}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Projects */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-[17px] font-semibold text-[#1d1d1f]">
                Projects
              </h2>
              <Link
                href="/dashboard/hub/projects"
                className="text-[12px] text-[#86868b] hover:text-[#1d1d1f] transition-colors flex items-center gap-0.5"
              >
                All <ChevronRight size={12} />
              </Link>
            </div>
            <div className="space-y-2">
              {data.projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/dashboard/hub/projects/${project.id}`}
                  className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-[#e5e5ea] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all group"
                >
                  <span
                    className="flex-shrink-0 w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor: project.color ?? "#3B82F6",
                    }}
                  />
                  <span className="flex-1 min-w-0 text-[13px] font-medium text-[#1d1d1f] truncate">
                    {project.name}
                  </span>
                  <span className="flex-shrink-0 flex items-center gap-1 text-[12px] text-[#86868b]">
                    <FolderKanban size={12} />
                    {project._count.tasks}
                  </span>
                  <span className="flex-shrink-0 flex items-center gap-1 text-[12px] text-[#86868b]">
                    <Users size={12} />
                    {project.members.length}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Task Detail Drawer ─────────────────────────────────────────── */}
      <TaskDetailDrawer
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onUpdated={() => void fetchDashboard()}
        onDeleted={() => void fetchDashboard()}
        members={members}
      />
    </div>
  );
}
