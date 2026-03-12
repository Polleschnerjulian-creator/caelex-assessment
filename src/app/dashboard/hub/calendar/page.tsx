"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Trash2,
  Pencil,
  X,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

// ─── Types ───────────────────────────────────────────────────────────────────

interface CalendarTask {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string;
  project: { id: string; name: string; color: string | null };
  assignee?: { id: string; name: string | null; image: string | null } | null;
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

// ─── Constants ───────────────────────────────────────────────────────────────

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const PRIORITY_COLORS: Record<string, string> = {
  URGENT: "#EF4444",
  HIGH: "#F59E0B",
  MEDIUM: "#3B82F6",
  LOW: "#86868b",
};

const STATUS_LABELS: Record<string, string> = {
  TODO: "To Do",
  IN_PROGRESS: "In Progress",
  IN_REVIEW: "In Review",
  DONE: "Done",
};

const EVENT_COLORS = [
  { value: "#3B82F6", label: "Blue" },
  { value: "#10B981", label: "Green" },
  { value: "#F59E0B", label: "Amber" },
  { value: "#EF4444", label: "Red" },
  { value: "#8B5CF6", label: "Purple" },
  { value: "#EC4899", label: "Pink" },
  { value: "#6B7280", label: "Gray" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getInitial(name: string | null) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function HubCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Event form
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formStartTime, setFormStartTime] = useState("");
  const [formEndTime, setFormEndTime] = useState("");
  const [formColor, setFormColor] = useState("#3B82F6");
  const [submitting, setSubmitting] = useState(false);

  // ─── Fetch ───────────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = getDaysInMonth(year, month);
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const [tasksRes, timeRes, eventsRes] = await Promise.all([
        fetch("/api/v1/hub/tasks?take=500", { headers: { ...csrfHeaders() } }),
        fetch(`/api/v1/hub/time-entries?from=${from}&to=${to}`, {
          headers: { ...csrfHeaders() },
        }),
        fetch(`/api/v1/hub/calendar-events?from=${from}&to=${to}`, {
          headers: { ...csrfHeaders() },
        }),
      ]);

      if (tasksRes.ok) {
        const data = await tasksRes.json();
        setTasks(
          (data.tasks ?? []).filter((t: CalendarTask) => t.dueDate != null),
        );
      }
      if (timeRes.ok) {
        const data = await timeRes.json();
        setTimeEntries(data.entries ?? []);
      }
      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEvents(data.events ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // ─── Group by date ───────────────────────────────────────────────────────

  const tasksByDate = new Map<string, CalendarTask[]>();
  for (const task of tasks) {
    const d = new Date(task.dueDate);
    const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!tasksByDate.has(key)) tasksByDate.set(key, []);
    tasksByDate.get(key)!.push(task);
  }

  const timeByDate = new Map<string, TimeEntry[]>();
  for (const entry of timeEntries) {
    const d = new Date(entry.date);
    const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!timeByDate.has(key)) timeByDate.set(key, []);
    timeByDate.get(key)!.push(entry);
  }

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const evt of events) {
    const d = new Date(evt.date);
    const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!eventsByDate.has(key)) eventsByDate.set(key, []);
    eventsByDate.get(key)!.push(evt);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  // ─── Navigation ──────────────────────────────────────────────────────────

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else {
      setMonth(month - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else {
      setMonth(month + 1);
    }
    setSelectedDay(null);
  };

  const goToToday = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth());
    setSelectedDay(todayKey);
  };

  // ─── Event CRUD ──────────────────────────────────────────────────────────

  const openCreateForm = (dateKey?: string) => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDescription("");
    setFormDate(
      dateKey ?? selectedDay ?? formatDateKey(year, month, today.getDate()),
    );
    setFormStartTime("");
    setFormEndTime("");
    setFormColor("#3B82F6");
    setShowEventForm(true);
  };

  const openEditForm = (evt: CalendarEvent) => {
    setEditingEvent(evt);
    setFormTitle(evt.title);
    setFormDescription(evt.description ?? "");
    const d = new Date(evt.date);
    setFormDate(formatDateKey(d.getFullYear(), d.getMonth(), d.getDate()));
    setFormStartTime(evt.startTime ?? "");
    setFormEndTime(evt.endTime ?? "");
    setFormColor(evt.color);
    setShowEventForm(true);
  };

  const handleSubmitEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        title: formTitle.trim(),
        description: formDescription.trim() || null,
        date: formDate,
        startTime: formStartTime || null,
        endTime: formEndTime || null,
        color: formColor,
      };

      const url = editingEvent
        ? `/api/v1/hub/calendar-events/${editingEvent.id}`
        : "/api/v1/hub/calendar-events";
      const method = editingEvent ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...csrfHeaders() },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowEventForm(false);
        void fetchData();
      }
    } catch {
      // silent
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/hub/calendar-events/${id}`, {
        method: "DELETE",
        headers: { ...csrfHeaders() },
      });
      if (res.ok) {
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      // silent
    }
  };

  // ─── Selected day data ───────────────────────────────────────────────────

  const selectedTasks = selectedDay ? (tasksByDate.get(selectedDay) ?? []) : [];
  const selectedTime = selectedDay ? (timeByDate.get(selectedDay) ?? []) : [];
  const selectedEvents = selectedDay
    ? (eventsByDate.get(selectedDay) ?? [])
    : [];
  const selectedTotalHours = selectedTime.reduce((s, e) => s + e.hours, 0);

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-[1400px]">
        <div className="space-y-2">
          <div className="h-8 w-32 bg-[#f5f5f7] rounded-lg animate-pulse" />
          <div className="h-4 w-48 bg-[#f5f5f7] rounded-lg animate-pulse" />
        </div>
        <div className="bg-[#f5f5f7] rounded-2xl h-[600px] animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[24px] font-bold text-[#1d1d1f]">Calendar</h1>
          <p className="text-[14px] text-[#86868b] mt-1">
            Shared team calendar — events, tasks &amp; time
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={goToToday}
            className="px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#e5e5ea] rounded-full hover:bg-[#f5f5f7] transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => openCreateForm()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[13px] font-medium rounded-full transition-colors"
          >
            <Plus size={14} />
            New Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar grid */}
        <div className="lg:col-span-3">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[20px] font-semibold text-[#1d1d1f]">
              {MONTHS[month]} {year}
            </h2>
            <div className="flex items-center gap-1">
              <button
                onClick={prevMonth}
                className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
              >
                <ChevronLeft size={18} className="text-[#86868b]" />
              </button>
              <button
                onClick={nextMonth}
                className="p-2 rounded-lg hover:bg-[#f5f5f7] transition-colors"
              >
                <ChevronRight size={18} className="text-[#86868b]" />
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1">
            {WEEKDAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[11px] font-medium text-[#86868b] py-2"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Day cells */}
          <div className="grid grid-cols-7 border-t border-l border-[#e5e5ea]">
            {/* Leading empty cells */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[110px] border-r border-b border-[#e5e5ea] bg-[#fafafa]"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = formatDateKey(year, month, day);
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;
              const dayTasks = tasksByDate.get(key) ?? [];
              const dayEvents = eventsByDate.get(key) ?? [];
              const dayTime = timeByDate.get(key) ?? [];
              const totalHours = dayTime.reduce((s, e) => s + e.hours, 0);
              const itemCount = dayEvents.length + dayTasks.length;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`min-h-[110px] border-r border-b border-[#e5e5ea] p-1.5 text-left transition-colors cursor-pointer group/cell ${
                    isSelected
                      ? "bg-[#f0f0ff] ring-2 ring-inset ring-[#1d1d1f]"
                      : "bg-white hover:bg-[#fafafa]"
                  }`}
                >
                  {/* Day number + add button */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium ${
                        isToday ? "bg-[#1d1d1f] text-white" : "text-[#1d1d1f]"
                      }`}
                    >
                      {day}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openCreateForm(key);
                      }}
                      className="w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover/cell:opacity-100 hover:bg-[#e5e5ea] transition-all"
                    >
                      <Plus size={12} className="text-[#86868b]" />
                    </button>
                  </div>

                  {/* Events */}
                  <div className="mt-1 space-y-0.5">
                    {dayEvents.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate"
                        style={{ backgroundColor: `${evt.color}20` }}
                      >
                        <span
                          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: evt.color }}
                        />
                        <span className="truncate text-[#1d1d1f] font-medium">
                          {evt.startTime ? `${evt.startTime} ` : ""}
                          {evt.title}
                        </span>
                      </div>
                    ))}

                    {/* Tasks */}
                    {dayTasks
                      .slice(0, 2 - Math.min(dayEvents.length, 2))
                      .map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate"
                          style={{
                            backgroundColor: `${t.project.color ?? "#3B82F6"}12`,
                          }}
                        >
                          <span
                            className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                            style={{
                              backgroundColor:
                                PRIORITY_COLORS[t.priority] ?? "#86868b",
                            }}
                          />
                          <span className="truncate text-[#86868b]">
                            {t.title}
                          </span>
                        </div>
                      ))}

                    {itemCount > 2 && (
                      <span className="text-[10px] text-[#86868b] px-1">
                        +{itemCount - 2} more
                      </span>
                    )}
                  </div>

                  {/* Time indicator */}
                  {totalHours > 0 && (
                    <div className="mt-0.5 flex items-center gap-1 px-1 text-[10px] text-[#86868b]">
                      <Clock size={9} />
                      {totalHours}h
                    </div>
                  )}
                </div>
              );
            })}

            {/* Trailing empty cells */}
            {Array.from({
              length: (7 - ((firstDay + daysInMonth) % 7)) % 7,
            }).map((_, i) => (
              <div
                key={`tail-${i}`}
                className="min-h-[110px] border-r border-b border-[#e5e5ea] bg-[#fafafa]"
              />
            ))}
          </div>
        </div>

        {/* ─── Side panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-1">
          {selectedDay ? (
            <div className="space-y-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                  {new Date(selectedDay + "T00:00:00").toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "long", day: "numeric" },
                  )}
                </h3>
                <button
                  onClick={() => openCreateForm(selectedDay)}
                  className="p-1.5 rounded-lg hover:bg-[#f5f5f7] transition-colors"
                  title="Add event"
                >
                  <Plus size={16} className="text-[#86868b]" />
                </button>
              </div>

              {/* Calendar Events */}
              {selectedEvents.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-medium text-[#86868b] uppercase tracking-wider mb-2">
                    Events ({selectedEvents.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedEvents.map((evt) => (
                      <div
                        key={evt.id}
                        className="bg-white rounded-xl border border-[#e5e5ea] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)] group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2 min-w-0 flex-1">
                            <span
                              className="flex-shrink-0 w-2.5 h-2.5 rounded-full mt-1"
                              style={{ backgroundColor: evt.color }}
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-medium text-[#1d1d1f]">
                                {evt.title}
                              </p>
                              {(evt.startTime || evt.endTime) && (
                                <p className="text-[11px] text-[#86868b] mt-0.5">
                                  {evt.startTime ?? ""}
                                  {evt.startTime && evt.endTime ? " – " : ""}
                                  {evt.endTime ?? ""}
                                </p>
                              )}
                              {!evt.startTime && !evt.endTime && (
                                <p className="text-[11px] text-[#86868b] mt-0.5">
                                  All day
                                </p>
                              )}
                              {evt.description && (
                                <p className="text-[11px] text-[#86868b] mt-1">
                                  {evt.description}
                                </p>
                              )}
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="w-4 h-4 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[8px] font-medium text-[#86868b]">
                                  {getInitial(evt.creator.name)}
                                </span>
                                <span className="text-[10px] text-[#b0b0b5]">
                                  {evt.creator.name}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Edit / Delete */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => openEditForm(evt)}
                              className="p-1 rounded hover:bg-[#f5f5f7]"
                              title="Edit"
                            >
                              <Pencil size={12} className="text-[#86868b]" />
                            </button>
                            <button
                              onClick={() => void handleDeleteEvent(evt.id)}
                              className="p-1 rounded hover:bg-red-50"
                              title="Delete"
                            >
                              <Trash2
                                size={12}
                                className="text-red-400 hover:text-red-500"
                              />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {selectedTasks.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-medium text-[#86868b] uppercase tracking-wider mb-2">
                    Tasks due ({selectedTasks.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTasks.map((t) => (
                      <div
                        key={t.id}
                        className="bg-white rounded-xl border border-[#e5e5ea] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="flex-shrink-0 w-2 h-2 rounded-full mt-1.5"
                            style={{
                              backgroundColor:
                                PRIORITY_COLORS[t.priority] ?? "#86868b",
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-[#1d1d1f] truncate">
                              {t.title}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-[11px] px-1.5 py-0.5 rounded-md"
                                style={{
                                  backgroundColor: `${t.project.color ?? "#3B82F6"}15`,
                                  color: t.project.color ?? "#3B82F6",
                                }}
                              >
                                {t.project.name}
                              </span>
                              <span className="text-[11px] text-[#86868b]">
                                {STATUS_LABELS[t.status] ?? t.status}
                              </span>
                            </div>
                            {t.assignee && (
                              <div className="flex items-center gap-1.5 mt-1.5">
                                <span className="w-4 h-4 rounded-full bg-[#f5f5f7] flex items-center justify-center text-[8px] font-medium text-[#86868b]">
                                  {getInitial(t.assignee.name)}
                                </span>
                                <span className="text-[11px] text-[#86868b]">
                                  {t.assignee.name}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Time entries */}
              {selectedTime.length > 0 && (
                <div>
                  <h4 className="text-[12px] font-medium text-[#86868b] uppercase tracking-wider mb-2">
                    Time logged ({selectedTotalHours}h)
                  </h4>
                  <div className="space-y-2">
                    {selectedTime.map((e) => (
                      <div
                        key={e.id}
                        className="bg-white rounded-xl border border-[#e5e5ea] p-3 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[13px] font-medium text-[#1d1d1f]">
                            {e.hours}h
                          </span>
                          <span className="text-[11px] text-[#86868b]">
                            {e.user.name}
                          </span>
                        </div>
                        {e.task && (
                          <p className="text-[11px] text-[#86868b] mt-1 truncate">
                            {e.task.title}
                          </p>
                        )}
                        {e.description && (
                          <p className="text-[11px] text-[#86868b] mt-1 truncate">
                            {e.description}
                          </p>
                        )}
                        <span
                          className="inline-block text-[10px] px-1.5 py-0.5 rounded-md mt-1.5"
                          style={{
                            backgroundColor: `${e.project.color ?? "#3B82F6"}15`,
                            color: e.project.color ?? "#3B82F6",
                          }}
                        >
                          {e.project.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {selectedEvents.length === 0 &&
                selectedTasks.length === 0 &&
                selectedTime.length === 0 && (
                  <div className="text-center py-8">
                    <CalendarIcon
                      size={32}
                      className="mx-auto text-[#d1d1d6] mb-2"
                    />
                    <p className="text-[13px] text-[#86868b] mb-3">
                      Nothing scheduled
                    </p>
                    <button
                      onClick={() => openCreateForm(selectedDay)}
                      className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#1d1d1f] hover:underline"
                    >
                      <Plus size={12} />
                      Add an event
                    </button>
                  </div>
                )}
            </div>
          ) : (
            <div className="text-center py-12">
              <CalendarIcon size={32} className="mx-auto text-[#d1d1d6] mb-3" />
              <p className="text-[13px] text-[#86868b]">
                Select a day to see details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ─── Event form modal ─────────────────────────────────────────────── */}
      {showEventForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <form
            onSubmit={(e) => void handleSubmitEvent(e)}
            className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4 relative"
          >
            <button
              type="button"
              onClick={() => setShowEventForm(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-[#f5f5f7]"
            >
              <X size={16} className="text-[#86868b]" />
            </button>

            <h3 className="text-[17px] font-semibold text-[#1d1d1f]">
              {editingEvent ? "Edit Event" : "New Event"}
            </h3>

            {/* Title */}
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                Title
              </label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                maxLength={200}
                placeholder="Meeting, Deadline, Reminder…"
                className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] placeholder:text-[#d1d1d6]"
                required
                autoFocus
              />
            </div>

            {/* Date */}
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

            {/* Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                  Start time
                </label>
                <input
                  type="time"
                  value={formStartTime}
                  onChange={(e) => setFormStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                  End time
                </label>
                <input
                  type="time"
                  value={formEndTime}
                  onChange={(e) => setFormEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f]"
                />
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1">
                Description (optional)
              </label>
              <textarea
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                maxLength={2000}
                rows={2}
                placeholder="Notes, location, agenda…"
                className="w-full px-3 py-2 text-[13px] text-[#1d1d1f] bg-[#f5f5f7] border border-[#e5e5ea] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1d1d1f] placeholder:text-[#d1d1d6] resize-none"
              />
            </div>

            {/* Color picker */}
            <div>
              <label className="block text-[12px] font-medium text-[#86868b] mb-1.5">
                Color
              </label>
              <div className="flex items-center gap-2">
                {EVENT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setFormColor(c.value)}
                    className={`w-7 h-7 rounded-full transition-all ${
                      formColor === c.value
                        ? "ring-2 ring-offset-2 ring-[#1d1d1f] scale-110"
                        : "hover:scale-105"
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEventForm(false)}
                className="px-4 py-2 text-[13px] font-medium text-[#86868b] hover:text-[#1d1d1f] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting || !formTitle.trim()}
                className="px-5 py-2 bg-[#1d1d1f] hover:bg-[#000000] text-white text-[13px] font-medium rounded-full transition-colors disabled:opacity-50"
              >
                {submitting ? "Saving…" : editingEvent ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
