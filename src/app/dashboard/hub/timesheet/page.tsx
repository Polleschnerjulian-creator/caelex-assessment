"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Clock,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  BarChart3,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

interface Project {
  id: string;
  name: string;
  color: string | null;
}

interface TaskOption {
  id: string;
  title: string;
  projectId: string;
}

interface TimeEntry {
  id: string;
  date: string;
  hours: number;
  description: string | null;
  project: { id: string; name: string; color: string | null };
  task: { id: string; title: string } | null;
  user: { id: string; name: string | null; image: string | null };
}

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatShortDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function HubTimesheetPage() {
  const today = new Date();
  const [weekStart, setWeekStart] = useState(() => getWeekStart(today));
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<TaskOption[]>([]);
  const [loading, setLoading] = useState(true);

  // New entry form
  const [showForm, setShowForm] = useState(false);
  const [formProjectId, setFormProjectId] = useState("");
  const [formTaskId, setFormTaskId] = useState("");
  const [formDate, setFormDate] = useState(formatDateKey(today));
  const [formHours, setFormHours] = useState("1");
  const [formDescription, setFormDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d;
  });

  const weekEnd = weekDays[6];
  const from = formatDateKey(weekStart);
  const to = formatDateKey(weekEnd);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [entriesRes, projectsRes, tasksRes] = await Promise.all([
        fetch(`/api/v1/hub/time-entries?from=${from}&to=${to}`, {
          headers: { ...csrfHeaders() },
        }),
        fetch("/api/v1/hub/projects", { headers: { ...csrfHeaders() } }),
        fetch("/api/v1/hub/tasks?take=500", { headers: { ...csrfHeaders() } }),
      ]);

      if (entriesRes.ok) {
        const data = await entriesRes.json();
        setEntries(data.entries ?? []);
      }
      if (projectsRes.ok) {
        const data = await projectsRes.json();
        setProjects(
          (data.projects ?? []).map(
            (p: { id: string; name: string; color: string | null }) => ({
              id: p.id,
              name: p.name,
              color: p.color,
            }),
          ),
        );
      }
      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(
          (data.tasks ?? []).map(
            (t: { id: string; title: string; project: { id: string } }) => ({
              id: t.id,
              title: t.title,
              projectId: t.project.id,
            }),
          ),
        );
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const prevWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToThisWeek = () => {
    setWeekStart(getWeekStart(today));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formProjectId || !formHours) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/v1/hub/time-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify({
          projectId: formProjectId,
          taskId: formTaskId || null,
          date: formDate,
          hours: parseFloat(formHours),
          description: formDescription || null,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        setFormProjectId("");
        setFormTaskId("");
        setFormHours("1");
        setFormDescription("");
        void fetchData();
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/hub/time-entries/${id}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // silent
    }
  };

  // Group entries by date
  const entriesByDate = new Map<string, TimeEntry[]>();
  for (const entry of entries) {
    const key = formatDateKey(new Date(entry.date));
    if (!entriesByDate.has(key)) entriesByDate.set(key, []);
    entriesByDate.get(key)!.push(entry);
  }

  // Calculate daily & weekly totals
  const dailyTotals = weekDays.map((d) => {
    const key = formatDateKey(d);
    const dayEntries = entriesByDate.get(key) ?? [];
    return dayEntries.reduce((s, e) => s + e.hours, 0);
  });
  const weeklyTotal = dailyTotals.reduce((s, h) => s + h, 0);

  // Project breakdown for the week
  const projectTotals = new Map<
    string,
    { name: string; color: string; hours: number }
  >();
  for (const entry of entries) {
    const existing = projectTotals.get(entry.project.id);
    if (existing) {
      existing.hours += entry.hours;
    } else {
      projectTotals.set(entry.project.id, {
        name: entry.project.name,
        color: entry.project.color ?? "#3B82F6",
        hours: entry.hours,
      });
    }
  }

  // Tasks filtered by selected project
  const filteredTasks = formProjectId
    ? tasks.filter((t) => t.projectId === formProjectId)
    : [];

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px]">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-[#f5f5f7] rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-[#f5f5f7] rounded-lg animate-pulse" />
        </div>
        <div className="bg-[#f5f5f7] rounded-2xl h-[400px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#1d1d1f]">Timesheet</h1>
          <p className="text-[14px] text-[#86868b] mt-1">
            Track hours per task &amp; project
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(true);
            setFormDate(formatDateKey(today));
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[13px] font-medium rounded-full transition-colors"
        >
          <Plus size={14} />
          Log Time
        </button>
      </div>

      {/* Week navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={prevWeek}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <ChevronLeft size={18} className="text-[#86868b]" />
          </button>
          <h2 className="text-[16px] font-semibold text-[#1d1d1f]">
            {formatShortDate(weekStart)} – {formatShortDate(weekEnd)}
          </h2>
          <button
            onClick={nextWeek}
            className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
          >
            <ChevronRight size={18} className="text-[#86868b]" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={goToThisWeek}
            className="px-3 py-1.5 text-[12px] font-medium text-[#1d1d1f] bg-white border border-[#e5e5ea] rounded-full hover:bg-[#f5f5f7] transition-colors"
          >
            This Week
          </button>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f5f5f7] rounded-full">
            <Clock size={14} className="text-[#86868b]" />
            <span className="text-[13px] font-semibold text-[#1d1d1f]">
              {weeklyTotal}h
            </span>
            <span className="text-[12px] text-[#86868b]">this week</span>
          </div>
        </div>
      </div>

      {/* Weekly bar chart */}
      <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
        <div className="flex items-end gap-3 h-[120px]">
          {weekDays.map((d, i) => {
            const key = formatDateKey(d);
            const isToday = key === formatDateKey(today);
            const maxHours = Math.max(...dailyTotals, 8);
            const height =
              dailyTotals[i] > 0
                ? Math.max((dailyTotals[i] / maxHours) * 100, 8)
                : 0;

            return (
              <div
                key={key}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-[11px] font-medium text-[#1d1d1f]">
                  {dailyTotals[i] > 0 ? `${dailyTotals[i]}h` : ""}
                </span>
                <div className="w-full flex items-end justify-center h-[80px]">
                  <div
                    className={`w-8 rounded-t-md transition-all ${
                      isToday ? "bg-[#1d1d1f]" : "bg-[#e5e5ea]"
                    }`}
                    style={{
                      height: `${height}%`,
                      minHeight: dailyTotals[i] > 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span
                  className={`text-[11px] ${
                    isToday ? "font-semibold text-[#1d1d1f]" : "text-[#86868b]"
                  }`}
                >
                  {WEEKDAYS[i]}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Entries list */}
        <div className="lg:col-span-2 space-y-3">
          {weekDays.map((d) => {
            const key = formatDateKey(d);
            const dayEntries = entriesByDate.get(key) ?? [];
            const dayTotal = dayEntries.reduce((s, e) => s + e.hours, 0);
            const isToday = key === formatDateKey(today);

            return (
              <div key={key}>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[12px] font-medium ${
                      isToday ? "text-[#1d1d1f]" : "text-[#86868b]"
                    }`}
                  >
                    {d.toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                    {isToday && (
                      <span className="ml-1.5 text-[10px] font-semibold bg-[#1d1d1f] text-white px-1.5 py-0.5 rounded-full">
                        TODAY
                      </span>
                    )}
                  </span>
                  {dayTotal > 0 && (
                    <span className="text-[12px] font-medium text-[#1d1d1f]">
                      {dayTotal}h
                    </span>
                  )}
                </div>

                {dayEntries.length > 0 ? (
                  <div className="space-y-1.5">
                    {dayEntries.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center gap-3 bg-white rounded-xl border border-[#e5e5ea] px-4 py-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] group"
                      >
                        <span
                          className="flex-shrink-0 w-2 h-2 rounded-full"
                          style={{
                            backgroundColor: entry.project.color ?? "#3B82F6",
                          }}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium text-[#1d1d1f]">
                              {entry.project.name}
                            </span>
                            {entry.task && (
                              <span className="text-[12px] text-[#86868b] truncate">
                                — {entry.task.title}
                              </span>
                            )}
                          </div>
                          {entry.description && (
                            <p className="text-[11px] text-[#86868b] mt-0.5 truncate">
                              {entry.description}
                            </p>
                          )}
                        </div>
                        <span className="flex-shrink-0 text-[14px] font-semibold text-[#1d1d1f] tabular-nums">
                          {entry.hours}h
                        </span>
                        <button
                          onClick={() => void handleDelete(entry.id)}
                          className="flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-50 transition-all"
                        >
                          <Trash2
                            size={14}
                            className="text-red-400 hover:text-red-500"
                          />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-[#fafafa] rounded-xl border border-dashed border-[#e5e5ea] px-4 py-2.5 text-center">
                    <span className="text-[12px] text-[#d1d1d6]">
                      No time logged
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Project breakdown */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e5e5ea] p-5 shadow-[0_2px_12px_rgba(0,0,0,0.04)]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 size={16} className="text-[#86868b]" />
              <h3 className="text-[14px] font-semibold text-[#1d1d1f]">
                By Project
              </h3>
            </div>
            {projectTotals.size > 0 ? (
              <div className="space-y-3">
                {Array.from(projectTotals.entries())
                  .sort((a, b) => b[1].hours - a[1].hours)
                  .map(([id, p]) => {
                    const pct =
                      weeklyTotal > 0
                        ? Math.round((p.hours / weeklyTotal) * 100)
                        : 0;
                    return (
                      <div key={id}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: p.color }}
                            />
                            <span className="text-[12px] font-medium text-[#1d1d1f]">
                              {p.name}
                            </span>
                          </div>
                          <span className="text-[12px] text-[#86868b]">
                            {p.hours}h ({pct}%)
                          </span>
                        </div>
                        <div className="h-1.5 bg-[#f5f5f7] rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: p.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-[12px] text-[#86868b] text-center py-4">
                No time logged this week
              </p>
            )}
          </div>
        </div>
      </div>

      {/* New entry modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4"
          >
            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              Log Time
            </h3>

            {/* Project */}
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                Project
              </label>
              <select
                value={formProjectId}
                onChange={(e) => {
                  setFormProjectId(e.target.value);
                  setFormTaskId("");
                }}
                className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                required
              >
                <option value="">Select project…</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Task (optional) */}
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                Task (optional)
              </label>
              <select
                value={formTaskId}
                onChange={(e) => setFormTaskId(e.target.value)}
                className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                disabled={!formProjectId}
              >
                <option value="">No task</option>
                {filteredTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Date + Hours row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                  required
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                  Hours
                </label>
                <input
                  type="number"
                  value={formHours}
                  onChange={(e) => setFormHours(e.target.value)}
                  min="0.25"
                  max="24"
                  step="0.25"
                  className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                  required
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                Description (optional)
              </label>
              <input
                type="text"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                maxLength={500}
                placeholder="What did you work on?"
                className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] placeholder:text-[#d1d1d6]"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-[13px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formProjectId}
                className="px-5 py-2 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[13px] font-medium rounded-full transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
