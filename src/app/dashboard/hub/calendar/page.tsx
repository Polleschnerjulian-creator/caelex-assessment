"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock,
} from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

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

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  const day = new Date(year, month, 1).getDay();
  // Convert Sunday=0 to Monday-based (Mon=0)
  return day === 0 ? 6 : day - 1;
}

function formatDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getInitial(name: string | null) {
  return name ? name.charAt(0).toUpperCase() : "?";
}

export default function HubCalendarPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const lastDay = getDaysInMonth(year, month);
      const to = `${year}-${String(month + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const [tasksRes, timeRes] = await Promise.all([
        fetch(`/api/v1/hub/tasks?take=500`, {
          headers: { ...csrfHeaders() },
        }),
        fetch(`/api/v1/hub/time-entries?from=${from}&to=${to}`, {
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
    } catch {
      // silent — UI will show empty
    } finally {
      setLoading(false);
    }
  }, [year, month]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  // Group tasks by date key
  const tasksByDate = new Map<string, CalendarTask[]>();
  for (const task of tasks) {
    const d = new Date(task.dueDate);
    const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!tasksByDate.has(key)) tasksByDate.set(key, []);
    tasksByDate.get(key)!.push(task);
  }

  // Group time entries by date key
  const timeByDate = new Map<string, TimeEntry[]>();
  for (const entry of timeEntries) {
    const d = new Date(entry.date);
    const key = formatDateKey(d.getFullYear(), d.getMonth(), d.getDate());
    if (!timeByDate.has(key)) timeByDate.set(key, []);
    timeByDate.get(key)!.push(entry);
  }

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const todayKey = formatDateKey(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

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

  // Selected day details
  const selectedTasks = selectedDay ? (tasksByDate.get(selectedDay) ?? []) : [];
  const selectedTime = selectedDay ? (timeByDate.get(selectedDay) ?? []) : [];
  const selectedTotalHours = selectedTime.reduce((s, e) => s + e.hours, 0);

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
            Tasks &amp; time entries by date
          </p>
        </div>
        <button
          onClick={goToToday}
          className="px-4 py-2 text-[13px] font-medium text-[#1d1d1f] bg-white border border-[#e5e5ea] rounded-full hover:bg-[#f5f5f7] transition-colors"
        >
          Today
        </button>
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
            {/* Empty cells before first day */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[100px] border-r border-b border-[#e5e5ea] bg-[#fafafa]"
              />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const key = formatDateKey(year, month, day);
              const isToday = key === todayKey;
              const isSelected = key === selectedDay;
              const dayTasks = tasksByDate.get(key) ?? [];
              const dayTime = timeByDate.get(key) ?? [];
              const totalHours = dayTime.reduce((s, e) => s + e.hours, 0);

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(isSelected ? null : key)}
                  className={`min-h-[100px] border-r border-b border-[#e5e5ea] p-1.5 text-left transition-colors ${
                    isSelected
                      ? "bg-[#f0f0ff] ring-2 ring-inset ring-[#1d1d1f]"
                      : "bg-white hover:bg-[#fafafa]"
                  }`}
                >
                  {/* Day number */}
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[12px] font-medium ${
                      isToday ? "bg-[#1d1d1f] text-white" : "text-[#1d1d1f]"
                    }`}
                  >
                    {day}
                  </span>

                  {/* Task dots */}
                  <div className="mt-1 space-y-0.5">
                    {dayTasks.slice(0, 3).map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center gap-1 px-1 py-0.5 rounded text-[10px] truncate"
                        style={{
                          backgroundColor: `${t.project.color ?? "#3B82F6"}15`,
                        }}
                      >
                        <span
                          className="flex-shrink-0 w-1.5 h-1.5 rounded-full"
                          style={{
                            backgroundColor:
                              PRIORITY_COLORS[t.priority] ?? "#86868b",
                          }}
                        />
                        <span className="truncate text-[#1d1d1f]">
                          {t.title}
                        </span>
                      </div>
                    ))}
                    {dayTasks.length > 3 && (
                      <span className="text-[10px] text-[#86868b] px-1">
                        +{dayTasks.length - 3} more
                      </span>
                    )}
                  </div>

                  {/* Time indicator */}
                  {totalHours > 0 && (
                    <div className="mt-1 flex items-center gap-1 px-1 text-[10px] text-[#86868b]">
                      <Clock size={10} />
                      {totalHours}h
                    </div>
                  )}
                </button>
              );
            })}

            {/* Fill remaining cells */}
            {Array.from({
              length: (7 - ((firstDay + daysInMonth) % 7)) % 7,
            }).map((_, i) => (
              <div
                key={`tail-${i}`}
                className="min-h-[100px] border-r border-b border-[#e5e5ea] bg-[#fafafa]"
              />
            ))}
          </div>
        </div>

        {/* Side panel — selected day details */}
        <div className="lg:col-span-1">
          {selectedDay ? (
            <div className="space-y-4 sticky top-6">
              <h3 className="text-[15px] font-semibold text-[#1d1d1f]">
                {new Date(selectedDay + "T00:00:00").toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  },
                )}
              </h3>

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

              {selectedTasks.length === 0 && selectedTime.length === 0 && (
                <div className="text-center py-8">
                  <CalendarIcon
                    size={32}
                    className="mx-auto text-[#d1d1d6] mb-2"
                  />
                  <p className="text-[13px] text-[#86868b]">
                    Nothing scheduled
                  </p>
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
    </div>
  );
}
